/**
 * UnifiedVoiceContextService
 * 
 * Handles dynamic context injection for the Enhanced Single-Agent Architecture.
 * Extends the proven careerAwareVoiceService pattern to support three user scenarios:
 * 1. Guest users - basic discovery prompts
 * 2. Authenticated users - personalized with profile data
 * 3. Career deep-dive - user profile + specific career details
 */

import environmentConfig from '../config/environment';
import { User } from '../models/User';
import { getUserById } from './userService';
import { guestSessionService } from './guestSessionService';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
import { CareerCard } from '../types/careerCard';

// Cache for career card data to avoid repeated Firebase queries
interface CareerCardCache {
  userId: string;
  data: CareerCard[];
  timestamp: number;
  isGuest: boolean;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache for career cards

interface ContextInjectionResult {
  success: boolean;
  message: string;
  fallbackUsed: boolean;
}

export class UnifiedVoiceContextService {
  private elevenLabsApiKey: string;
  private careerCardCache: Map<string, CareerCardCache> = new Map();

  constructor() {
  
    this.elevenLabsApiKey = environmentConfig.elevenLabs?.apiKey || '';
    
    if (!this.elevenLabsApiKey) {
      console.warn('⚠️ ElevenLabs API key not configured for UnifiedVoiceContextService');
    }
  }

  /**
   * Unified career card retrieval for both guest and authenticated users
   * Implements caching to avoid repeated Firebase queries during conversation
   */
  public async getCareerCardsForContext(userId: string, isGuest: boolean = false): Promise<CareerCard[]> {
    try {
      const cacheKey = `${userId}_${isGuest}`;
      
      // Check cache first (following Firebase best practices)
      const cached = this.careerCardCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        console.log('🔍 Using cached career cards for context:', { userId, isGuest, count: cached.data.length });
        return cached.data;
      }

      console.log('🔍 Fetching career cards for context:', { userId, isGuest });
      
      let careerCards: CareerCard[] = [];

      if (isGuest) {
        // Guest users: retrieve from localStorage via guestSessionService
        try {
          const guestSession = guestSessionService.getGuestSession();
          careerCards = guestSession.careerCards || [];
          console.log('✅ Retrieved guest career cards:', careerCards.length);
        } catch (error) {
          console.warn('⚠️ Failed to retrieve guest career cards:', error);
          careerCards = [];
        }
      } else {
        // Registered users: query Firebase threadCareerGuidance collection
        try {
          // Import careerPathwayService to use existing getCurrentCareerCards method
          const { default: careerPathwayService } = await import('./careerPathwayService');
          careerCards = await careerPathwayService.getCurrentCareerCards(userId);
          console.log('✅ Retrieved Firebase career cards:', careerCards.length);
        } catch (error) {
          console.warn('⚠️ Failed to retrieve Firebase career cards:', error);
          // Try alternative: direct Firebase query as fallback
          careerCards = await this.fallbackFirebaseQuery(userId);
        }
      }

      // Validate and clean data
      careerCards = this.validateAndCleanCareerCards(careerCards);

      // Cache the result
      this.careerCardCache.set(cacheKey, {
        userId,
        data: careerCards,
        timestamp: Date.now(),
        isGuest
      });

      console.log(`✅ Career cards retrieved and cached: ${careerCards.length} cards for ${isGuest ? 'guest' : 'user'} ${userId}`);
      return careerCards;

    } catch (error) {
      console.error('❌ Error retrieving career cards for context:', error);
      
      // Return empty array with error handling (following Firebase best practices)
      return [];
    }
  }

  /**
   * Fallback Firebase query for career cards when main service fails
   */
  private async fallbackFirebaseQuery(userId: string): Promise<CareerCard[]> {
    try {
      console.log('🔄 Attempting fallback Firebase query for career cards');
      
      const guidanceQuery = query(
        collection(db, 'threadCareerGuidance'),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc'),
        limit(10) // Limit for performance
      );
      
      const guidanceSnapshot = await getDocs(guidanceQuery);
      const careerCards: CareerCard[] = [];
      
      for (const doc of guidanceSnapshot.docs) {
        const data = doc.data();
        if (data.guidance) {
          // Extract career cards from guidance structure
          if (data.guidance.primaryPathway) {
            careerCards.push(data.guidance.primaryPathway);
          }
          if (data.guidance.alternativePathways && Array.isArray(data.guidance.alternativePathways)) {
            careerCards.push(...data.guidance.alternativePathways);
          }
        }
      }
      
      console.log('✅ Fallback query retrieved:', careerCards.length);
      return careerCards;
      
    } catch (error) {
      console.error('❌ Fallback Firebase query failed:', error);
      return [];
    }
  }

  /**
   * Validate and clean career card data for context injection
   */
  private validateAndCleanCareerCards(cards: any[]): CareerCard[] {
    return cards
      .filter((card): card is CareerCard => {
        // Basic validation - must have title
        return card && typeof card.title === 'string' && card.title.trim().length > 0;
      })
      .map((card: CareerCard) => ({
        ...card,
        // Ensure required fields have fallback values
        id: card.id || `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: card.title.trim(),
        description: card.description || '',
        confidence: typeof card.confidence === 'number' ? card.confidence : undefined
      }))
      .slice(0, 5); // Limit to 5 most relevant for context size optimization
  }

  /**
   * Clear career card cache (useful for testing or when data changes)
   */
  public clearCareerCardCache(userId?: string): void {
    if (userId) {
      // Clear specific user cache
      const keysToDelete = Array.from(this.careerCardCache.keys()).filter(key => key.startsWith(userId));
      keysToDelete.forEach(key => this.careerCardCache.delete(key));
      console.log(`🧹 Cleared career card cache for user: ${userId}`);
    } else {
      // Clear all cache
      this.careerCardCache.clear();
      console.log('🧹 Cleared all career card cache');
    }
  }

  /**
   * Update ElevenLabs agent with enhanced career card data for real-time context modification
   * Uses WebSocket contextual updates for live conversation enhancement
   */
  public async updateAgentWithCareerCards(
    agentId: string, 
    careerCards: CareerCard[], 
    userName?: string,
    contextType: 'enhancement_completed' | 'cards_updated' | 'new_cards' = 'enhancement_completed'
  ): Promise<boolean> {
    try {
      console.log(`🔄 Updating ElevenLabs agent ${agentId} with ${careerCards.length} career cards`);

      // Rate limiting to prevent excessive updates
      const rateLimitKey = `agent_update_${agentId}`;
      const lastUpdate = this.lastUpdateTimestamps.get(rateLimitKey);
      const now = Date.now();
      
      if (lastUpdate && (now - lastUpdate) < this.RATE_LIMIT_MS) {
        console.log(`⏳ Rate limit: Skipping update for agent ${agentId} (last update ${now - lastUpdate}ms ago)`);
        return false;
      }

      // Format career cards for contextual update
      const formattedContext = this.formatCareerCardsForElevenLabsContext(careerCards, userName);
      
      if (!formattedContext) {
        console.log('📝 No career card context to update');
        return false;
      }

      // Create contextual update message
      const updateMessage = this.buildContextualUpdateMessage(formattedContext, contextType);
      
      // Send contextual update via ElevenLabs API
      const success = await this.sendContextualUpdate(agentId, updateMessage);
      
      if (success) {
        // Update rate limiting timestamp
        this.lastUpdateTimestamps.set(rateLimitKey, now);
        
        // Clear cache to ensure fresh data on next retrieval
        this.clearCareerCardCache(userName || agentId);
        
        console.log(`✅ Successfully updated agent ${agentId} with enhanced career context`);
        return true;
      } else {
        console.log(`❌ Failed to update agent ${agentId} with career context`);
        return false;
      }

    } catch (error) {
      console.error('❌ Error updating agent with career cards:', error);
      return false;
    }
  }

  /**
   * Send contextual update to ElevenLabs agent via WebSocket API
   */
  private async sendContextualUpdate(agentId: string, message: string): Promise<boolean> {
    try {
      // For this implementation, we'll use the ElevenLabs REST API for contextual updates
      // In a production environment, you might want to use WebSocket for real-time updates
      
      const apiUrl = `https://api.elevenlabs.io/v1/convai/agents/${agentId}/context`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenLabsApiKey,
        },
        body: JSON.stringify({
          type: 'contextual_update',
          text: message
        })
      });

      if (response.ok) {
        console.log('✅ Contextual update sent successfully');
        return true;
      } else {
        // For graceful fallback, we'll use the dynamic variables API if contextual updates aren't available
        console.log('⚠️ Contextual update API not available, attempting dynamic variables fallback');
        return await this.sendDynamicVariablesUpdate(agentId, message);
      }

    } catch (error) {
      console.error('❌ Error sending contextual update:', error);
      // Graceful fallback for network errors
      return false;
    }
  }

  /**
   * Fallback method using agent prompt update (same as initial context injection)
   */
  private async sendDynamicVariablesUpdate(agentId: string, message: string): Promise<boolean> {
    try {
      console.log('🔄 Using agent prompt update fallback for context update');
      
      // Validate inputs before making API call
      if (!agentId || !agentId.trim()) {
        console.error('❌ Agent ID is missing or empty');
        return false;
      }
      
      if (!this.elevenLabsApiKey) {
        console.error('❌ ElevenLabs API key is missing');
        return false;
      }
      
      if (!message || !message.trim()) {
        console.error('❌ Context message is missing or empty');
        return false;
      }
      
      console.log('📝 Preparing agent context update:', {
        agentId,
        messageLength: message.length,
        apiKeyPresent: !!this.elevenLabsApiKey
      });
      
      // Use the proper ElevenLabs API with both Authorization headers as per Context7 docs
      const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.elevenLabsApiKey}`,
          'xi-api-key': this.elevenLabsApiKey
        },
        body: JSON.stringify({
          conversation_config: {
            agent: {
              prompt: {
                prompt: `You are an expert career counselor specializing in AI-powered career guidance.

${message}

RESPONSE STYLE:
- Keep responses 30-60 words for voice conversations
- Be conversational and natural (this is voice, not text)
- Reference specific career cards by name when discussing them
- Use salary ranges and training information from the career cards
- Provide specific, actionable career insights

You have detailed career card information above. Reference specific career cards by title and provide concrete details from them.`,
                tool_ids: [
                  'tool_1201k1nmz5tyeav9h3rejbs6xds1', // analyze_conversation_for_careers
                  'tool_6401k1nmz60te5cbmnvytjtdqmgv', // generate_career_recommendations  
                  'tool_5401k1nmz66eevwswve1q0rqxmwj', // trigger_instant_insights
                  'tool_8501k1nmz6bves9syexedj36520r'  // update_person_profile
                ]
              }
            }
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Successfully updated agent ${agentId} prompt with career context via ElevenLabs API`, {
          agentId,
          responseStatus: response.status,
          hasResult: !!result
        });
        return true;
      } else {
        const errorText = await response.text();
        console.error(`❌ Agent prompt update failed:`, {
          agentId,
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          headers: Object.fromEntries(response.headers.entries()),
          url: response.url
        });
        
        // Try alternative approach for 404 errors 
        if (response.status === 404) {
          console.log('💡 Agent not found (404) - attempting conversation override approach...');
          return await this.scheduleContextForNextConversation(agentId, message);
        }
        
        return false;
      }
      
    } catch (error) {
      console.error('❌ Error with agent prompt update fallback:', error);
      return false;
    }
  }

  /**
   * Store context to be used in next conversation (fallback approach)
   */
  private async scheduleContextForNextConversation(agentId: string, message: string): Promise<boolean> {
    try {
      console.log('📝 Scheduling enhanced context for next conversation start', {
        agentId,
        contextLength: message.length,
        preview: message.substring(0, 150) + '...'
      });
      
      // Store the enhanced context in session storage or similar mechanism
      // This will be picked up when the next conversation starts
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const contextKey = `elevenlabs_agent_context_${agentId}`;
        window.sessionStorage.setItem(contextKey, message);
        console.log('✅ Context scheduled for next conversation start via sessionStorage');
        return true;
      }
      
      // Fallback: log the context for manual verification
      console.log('⚠️ SessionStorage not available, context will be logged for reference:', {
        agentId,
        contextPreview: message.substring(0, 200) + '...'
      });
      
      return true; // Still return true as this is better than complete failure
    } catch (error) {
      console.error('❌ Error scheduling context for next conversation:', error);
      return false;
    }
  }

  /**
   * Build contextual update message based on enhancement type
   */
  private buildContextualUpdateMessage(careerContext: string, contextType: string): string {
    const timestamp = new Date().toLocaleTimeString();
    
    switch (contextType) {
      case 'enhancement_completed':
        return `[${timestamp}] CAREER DATA ENHANCED: Perplexity enhancement completed with verified market data.\n\n${careerContext}`;
      
      case 'cards_updated':
        return `[${timestamp}] CAREER CARDS UPDATED: Career recommendations have been refined.\n\n${careerContext}`;
      
      case 'new_cards':
        return `[${timestamp}] NEW CAREER DISCOVERIES: Additional career pathways identified.\n\n${careerContext}`;
      
      default:
        return `[${timestamp}] CAREER CONTEXT UPDATE:\n\n${careerContext}`;
    }
  }

  // Rate limiting properties
  private lastUpdateTimestamps: Map<string, number> = new Map();
  private readonly RATE_LIMIT_MS = 2000; // 2 seconds minimum between updates

  /**
   * Send real-time contextual update via WebSocket for active conversations
   * Uses ElevenLabs WebSocket API for immediate context modification
   */
  public async sendWebSocketContextualUpdate(
    websocket: WebSocket | null, 
    careerCards: CareerCard[], 
    userName?: string,
    contextType: 'enhancement_completed' | 'cards_updated' | 'new_cards' = 'enhancement_completed'
  ): Promise<boolean> {
    try {
      if (!websocket || websocket.readyState !== WebSocket.OPEN) {
        console.log('⚠️ WebSocket not available for real-time update');
        return false;
      }

      // Format career cards for contextual update
      const formattedContext = this.formatCareerCardsForElevenLabsContext(careerCards, userName);
      
      if (!formattedContext) {
        console.log('📝 No career card context for WebSocket update');
        return false;
      }

      // Create contextual update message with WebSocket format
      const contextualUpdateMessage = {
        type: 'contextual_update',
        text: this.buildContextualUpdateMessage(formattedContext, contextType)
      };

      console.log('🔄 Sending real-time contextual update via WebSocket');
      
      // Send contextual update via WebSocket
      websocket.send(JSON.stringify(contextualUpdateMessage));
      
      console.log('✅ Real-time contextual update sent via WebSocket');
      return true;

    } catch (error) {
      console.error('❌ Error sending WebSocket contextual update:', error);
      return false;
    }
  }

  /**
   * Update agent context with enhanced career cards (batch update for multiple agents)
   */
  public async updateMultipleAgentsWithCareerCards(
    agentIds: string[], 
    careerCards: CareerCard[], 
    userName?: string
  ): Promise<{ successful: string[], failed: string[] }> {
    const results = { successful: [] as string[], failed: [] as string[] };
    
    console.log(`🔄 Updating ${agentIds.length} agents with career card data`);

    // Process updates with rate limiting consideration
    for (const agentId of agentIds) {
      try {
        const success = await this.updateAgentWithCareerCards(agentId, careerCards, userName);
        if (success) {
          results.successful.push(agentId);
        } else {
          results.failed.push(agentId);
        }
        
        // Small delay between updates to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Failed to update agent ${agentId}:`, error);
        results.failed.push(agentId);
      }
    }
    
    console.log(`✅ Agent updates completed: ${results.successful.length} successful, ${results.failed.length} failed`);
    return results;
  }

  /**
   * Format career cards for ElevenLabs context injection
   * Converts complex CareerCard data into concise, conversation-friendly format
   * Following ElevenLabs best practices for context formatting
   */
  public formatCareerCardsForElevenLabsContext(careerCards: CareerCard[], userName?: string): string {
    try {
      if (!careerCards || careerCards.length === 0) {
        return '';
      }

      console.log(`🎨 Formatting ${careerCards.length} career cards for ElevenLabs context`);

      // Build context sections following ElevenLabs best practices
      const sections: string[] = [];

      // Header with user personalization
      const userPrefix = userName ? ` for ${userName}` : '';
      sections.push(`# CAREER DISCOVERIES${userPrefix}`);
      sections.push(`*Updated: ${new Date().toLocaleDateString()}*`);
      sections.push('');

      // Primary pathway (highest confidence card)
      const primaryCard = careerCards
        .filter(card => card.confidence !== undefined)
        .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0] || careerCards[0];

      if (primaryCard) {
        sections.push('## PRIMARY PATHWAY');
        sections.push(this.formatSingleCareerCard(primaryCard, true));
        sections.push('');
      }

      // Alternative pathways (remaining cards)
      const alternativeCards = careerCards.filter(card => card.id !== primaryCard?.id).slice(0, 3);
      if (alternativeCards.length > 0) {
        sections.push('## ALTERNATIVE PATHWAYS');
        alternativeCards.forEach((card, index) => {
          sections.push(`### ${index + 1}. ${card.title}`);
          sections.push(this.formatSingleCareerCard(card, false));
          sections.push('');
        });
      }

      // Conversation guidance
      sections.push('## CONVERSATION GUIDANCE');
      sections.push('- Reference specific career cards by title when discussing options');
      sections.push('- Use salary ranges and training information to provide concrete advice');
      sections.push('- Connect user interests and skills to relevant career elements');
      sections.push('- Suggest next steps based on career card recommendations');
      if (this.hasEnhancedData(careerCards)) {
        sections.push('- Mention that data includes current market intelligence');
      }

      const formattedContext = sections.join('\n');
      
      // Context size optimization - limit to ~1000 characters for ElevenLabs
      if (formattedContext.length > 1000) {
        console.log('⚠️ Context size optimization: truncating for ElevenLabs limits');
        return this.truncateContext(formattedContext, 1000);
      }

      console.log(`✅ Formatted career context: ${formattedContext.length} characters`);
      return formattedContext;

    } catch (error) {
      console.error('❌ Error formatting career cards for context:', error);
      return '# CAREER DISCOVERIES\n*No career information available at this time.*';
    }
  }

  /**
   * Format a single career card for context display
   */
  private formatSingleCareerCard(card: CareerCard, isPrimary: boolean): string {
    const lines: string[] = [];

    // Title with confidence
    const confidenceDisplay = card.confidence ? ` (${Math.round(card.confidence * 100)}% confidence)` : '';
    const primaryLabel = isPrimary ? '**[PRIMARY]** ' : '';
    lines.push(`${primaryLabel}**${card.title}**${confidenceDisplay}`);

    // Salary information (prioritize enhanced data)
    const salaryInfo = this.extractSalaryInformation(card);
    if (salaryInfo) {
      lines.push(`- **Salary Range**: ${salaryInfo}`);
    }

    // Key skills
    const skills = this.extractSkillsInformation(card);
    if (skills) {
      lines.push(`- **Key Skills**: ${skills}`);
    }

    // Training/education pathway
    const training = this.extractTrainingInformation(card);
    if (training) {
      lines.push(`- **Training Path**: ${training}`);
    }

    // Market insights (from Perplexity enhancement if available)
    const marketInfo = this.extractMarketInformation(card);
    if (marketInfo) {
      lines.push(`- **Market Outlook**: ${marketInfo}`);
    }

    return lines.join('\n');
  }

  /**
   * Extract salary information, prioritizing enhanced Perplexity data
   */
  private extractSalaryInformation(card: CareerCard): string {
    // Priority 1: Enhanced Perplexity salary data
    if (card.perplexityData?.verifiedSalaryRanges) {
      const ranges = card.perplexityData.verifiedSalaryRanges;
      if (ranges.entry && ranges.senior) {
        return `£${ranges.entry.min}k-£${ranges.senior.max}k (verified)`;
      }
    }

    // Priority 2: Comprehensive schema compensation
    if (card.compensationRewards?.salaryRange) {
      const comp = card.compensationRewards.salaryRange;
      return `£${Math.round(comp.entry / 1000)}k-£${Math.round(comp.senior / 1000)}k`;
    }

    // Priority 3: Legacy salary fields
    if (card.averageSalary) {
      return `${card.averageSalary.entry} - ${card.averageSalary.senior}`;
    }

    if (card.salaryRange) {
      return card.salaryRange;
    }

    return '';
  }

  /**
   * Extract skills information
   */
  private extractSkillsInformation(card: CareerCard): string {
    const allSkills: string[] = [];

    // Comprehensive schema technical skills
    if (card.competencyRequirements?.technicalSkills?.length) {
      allSkills.push(...card.competencyRequirements.technicalSkills.slice(0, 3));
    }

    // Legacy skill fields
    if (card.keySkills?.length) {
      allSkills.push(...card.keySkills.slice(0, 3));
    }
    if (card.skillsRequired?.length) {
      allSkills.push(...card.skillsRequired.slice(0, 3));
    }

    // Remove duplicates and limit
    const uniqueSkills = [...new Set(allSkills)].slice(0, 3);
    return uniqueSkills.length > 0 ? uniqueSkills.join(', ') : '';
  }

  /**
   * Extract training/education information
   */
  private extractTrainingInformation(card: CareerCard): string {
    // Enhanced Perplexity education data
    if (card.perplexityData?.currentEducationPathways?.length) {
      const pathway = card.perplexityData.currentEducationPathways[0];
      return `${pathway.title} (${pathway.duration})`;
    }

    // Comprehensive schema qualification pathway
    if (card.competencyRequirements?.qualificationPathway?.degrees?.length) {
      const degree = card.competencyRequirements.qualificationPathway.degrees[0];
      const timeToCompetent = card.competencyRequirements?.learningCurve?.timeToCompetent || '';
      return timeToCompetent ? `${degree} (${timeToCompetent})` : degree;
    }

    // Legacy training fields
    if (card.trainingPathways?.length) {
      return card.trainingPathways[0];
    }
    if (card.trainingPathway) {
      return card.trainingPathway;
    }

    return '';
  }

  /**
   * Extract market information from enhanced data
   */
  private extractMarketInformation(card: CareerCard): string {
    // Enhanced Perplexity market data
    if (card.perplexityData?.realTimeMarketDemand) {
      const demand = card.perplexityData.realTimeMarketDemand;
      return `${demand.competitionLevel} competition, ${demand.growthRate > 0 ? 'Growing' : 'Stable'} demand`;
    }

    // Comprehensive schema labor market dynamics
    if (card.labourMarketDynamics?.demandOutlook) {
      return card.labourMarketDynamics.demandOutlook.growthForecast;
    }

    // Legacy fields
    if (card.growthOutlook) {
      return card.growthOutlook;
    }
    if (card.marketOutlook) {
      return card.marketOutlook;
    }

    return '';
  }

  /**
   * Check if career cards contain enhanced Perplexity data
   */
  private hasEnhancedData(cards: CareerCard[]): boolean {
    return cards.some(card => 
      card.enhancement?.status === 'completed' || 
      card.perplexityData !== undefined
    );
  }

  /**
   * Truncate context to fit ElevenLabs size limits while preserving structure
   */
  private truncateContext(context: string, maxLength: number): string {
    if (context.length <= maxLength) return context;

    // Split by sections and keep most important parts
    const lines = context.split('\n');
    const truncatedLines: string[] = [];
    let currentLength = 0;

    // Always keep header
    for (const line of lines) {
      if (currentLength + line.length + 1 > maxLength) {
        truncatedLines.push('...[truncated for size]');
        break;
      }
      truncatedLines.push(line);
      currentLength += line.length + 1; // +1 for newline
    }

    return truncatedLines.join('\n');
  }

  /**
   * Inject context for guest users - basic discovery and exploration
   * SECURITY: Always reset agent to clean state first
   */
  public async injectGuestContext(agentId: string): Promise<ContextInjectionResult> {
    try {
      // SECURITY: Always reset agent to clean state first
      console.log('🧹 Resetting agent to clean state before guest context injection...');
      await this.resetAgentToCleanState(agentId);
      
      const contextPrompt = await this.buildGuestContext();
      return this.sendContextToAgent(agentId, contextPrompt, 'guest');
    } catch (error) {
      console.error('❌ Failed to inject guest context:', error);
      // Even guest context failed - ensure clean state
      await this.resetAgentToCleanState(agentId);
      return {
        success: false,
        message: `Failed to inject guest context: ${error instanceof Error ? error.message : 'Unknown error'}`,
        fallbackUsed: true
      };
    }
  }

  /**
   * Inject context for authenticated users with profile data
   * SECURITY: Always reset agent to clean state first to prevent data leakage
   */
  public async injectAuthenticatedContext(
    agentId: string, 
    userId: string
  ): Promise<ContextInjectionResult> {
    try {
      // SECURITY: Always reset agent to clean state first
      console.log('🧹 Resetting agent to clean state before context injection...');
      await this.resetAgentToCleanState(agentId);
      
      // Fetch user profile data
      const userData = await getUserById(userId);
      const contextPrompt = await this.buildAuthenticatedContext(userData);
      const personalizedFirstMessage = await this.generatePersonalizedFirstMessage(userData);
      return this.sendPersonalizedContextToAgent(agentId, contextPrompt, personalizedFirstMessage, 'authenticated');
    } catch (error) {
      console.error('❌ Failed to fetch user data for context injection:', error);
      // SECURITY: Reset to clean state and use neutral guest context
      console.log('🔒 SECURITY: Resetting to clean guest context due to authenticated context failure');
      await this.resetAgentToCleanState(agentId);
      return this.injectGuestContext(agentId);
    }
  }

  /**
   * Inject context for career deep-dive with user profile + career details
   */
  public async injectCareerContext(
    agentId: string,
    userId: string,
    careerCard: CareerCard
  ): Promise<ContextInjectionResult> {
    try {
      // Fetch user profile data
      const userData = await getUserById(userId);
      const contextPrompt = await this.buildCareerContext(userData, careerCard);
      return this.sendContextToAgent(agentId, contextPrompt, 'career_deep_dive');
    } catch (error) {
      console.error('❌ Failed to fetch user data for career context injection:', error);
      // Fallback to authenticated context without career details
      return this.injectAuthenticatedContext(agentId, userId);
    }
  }

  /**
   * Build basic discovery context for guest users
   */
  private async buildGuestContext(): Promise<string> {
    // Check if guest has a captured name
    const guestName = guestSessionService.getGuestName();
    const nameContext = guestName ? 
      `- Guest name: ${guestName} (use naturally in conversation)` : 
      '- No name captured yet (consider asking for their name early in conversation)';
    
    // Get guest session metrics
    const engagementMetrics = guestSessionService.getEngagementMetrics();
    const guestSession = guestSessionService.getGuestSession();
    
    // Get guest career cards for context
    const guestSessionId = guestSessionService.getSessionId();
    const careerCards = await this.getCareerCardsForContext(guestSessionId, true);
    const careerCardContext = this.formatCareerCardsForElevenLabsContext(careerCards, guestName || undefined);
    
    let contextPrompt = `USER CONTEXT: Guest User
${nameContext}
- Conversation messages: ${engagementMetrics.messageCount}
- Career cards generated: ${engagementMetrics.careerCardsGenerated}
- Session started: ${guestSession.createdAt ? new Date(guestSession.createdAt).toLocaleDateString() : 'Just now'}
- Profile data: ${guestSession.personProfile ? 'Some insights captured' : 'Not yet captured'}
- Focus on discovery, engagement, and building confidence

CONVERSATION GOALS:
- Help them identify interests, skills, and career aspirations
- Use extract_and_update_profile tool to capture name and insights during conversation
- Generate career recommendations using explore_career_opportunities tool
- Build trust and encourage account creation for deeper exploration

PERSONA: Warm, encouraging career guide who helps young adults discover their potential`;

    // Add career card context if available
    if (careerCardContext) {
      contextPrompt += `\n\n${careerCardContext}`;
    }

    return contextPrompt;
  }

  /**
   * Generate personalized first message for authenticated users
   */
  public async generatePersonalizedFirstMessage(userData: User | null): Promise<string> {
    if (!userData) {
      return "Hi I'm Sarah an AI assistant, what's your name?";
    }

    const engagementData = await this.getUserEngagementData(userData.uid);
    const careerProfileName = userData.careerProfile?.name || userData.displayName || 'there';
    
    // Get discovered interests for continuity
    const discoveredInsights = await this.getDiscoveredInsights(userData.uid);
    
    if (engagementData.conversationCount === 0) {
      // First conversation for authenticated user
      return `Welcome back ${careerProfileName}! I'm Sarah, your AI career advisor. What's on your mind about your career today?`;
    } else if (engagementData.conversationCount >= 5) {
      // Highly engaged returning user
      const topInterests = discoveredInsights.interests?.slice(0, 2).join(' and ') || 'your career interests';
      return `Welcome back ${careerProfileName}! Great to continue our career exploration. I remember we've discussed ${topInterests}, and you've generated ${engagementData.careerCardsGenerated} career pathways. Ready to dive deeper or explore something new?`;
    } else {
      // Engaged returning user
      if (discoveredInsights.interests?.length > 0) {
        const mainInterest = discoveredInsights.interests[0];
        return `Welcome back ${careerProfileName}! I remember your interest in ${mainInterest}. Ready to explore more career opportunities today?`;
      } else {
        return `Welcome back ${careerProfileName}! Ready to continue discovering your career path? What would you like to explore today?`;
      }
    }
  }

  /**
   * Get user's discovered insights for personalization
   */
  private async getDiscoveredInsights(userId: string): Promise<{
    interests: string[];
    skills: string[];
    careerGoals: string[];
    topicsExplored: string[];
  }> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          interests: userData.discoveredInsights?.interests || [],
          skills: userData.discoveredInsights?.skills || [],
          careerGoals: userData.discoveredInsights?.careerGoals || [],
          topicsExplored: userData.topicsExplored || []
        };
      }
    } catch (error) {
      console.warn('Could not get discovered insights:', error);
    }
    
    return { interests: [], skills: [], careerGoals: [], topicsExplored: [] };
  }

  /**
   * Build personalized context for authenticated users with profile data
   */
  private async buildAuthenticatedContext(userData: User | null): Promise<string> {
    if (!userData) {
      return await this.buildGuestContext();
    }

    const profile = userData.profile;
    const preferences = userData.preferences;
    
    // Get enhanced user engagement data
    const engagementData = await this.getUserEngagementData(userData.uid);
    const careerProfileName = userData.careerProfile?.name || userData.displayName;
    
    // Get discovered insights for context continuity
    const discoveredInsights = await this.getDiscoveredInsights(userData.uid);
    
    // Get current career cards for context
    const careerCards = await this.getCareerCardsForContext(userData.uid, false);
    const careerCardContext = this.formatCareerCardsForElevenLabsContext(careerCards, careerProfileName);
    
    let contextPrompt = `USER CONTEXT: Authenticated User - ${careerProfileName || 'User'}
- Account created: ${userData.createdAt?.toLocaleDateString() || 'Recently'}
- User type: ${userData.role || 'user'}
- Total conversations: ${engagementData.conversationCount}
- Career cards generated: ${engagementData.careerCardsGenerated}
- Last active: ${userData.lastLogin?.toLocaleDateString() || 'Recently'}
- Engagement level: ${engagementData.engagementLevel}

HISTORICAL CONTEXT & CONTINUITY:`;

    // Add discovered insights for continuity
    if (discoveredInsights.interests?.length > 0) {
      contextPrompt += `\n- Previously explored interests: ${discoveredInsights.interests.join(', ')}`;
    }
    if (discoveredInsights.skills?.length > 0) {
      contextPrompt += `\n- Skills identified: ${discoveredInsights.skills.join(', ')}`;
    }
    if (discoveredInsights.careerGoals?.length > 0) {
      contextPrompt += `\n- Career goals discussed: ${discoveredInsights.careerGoals.join(', ')}`;
    }
    if (discoveredInsights.topicsExplored?.length > 0) {
      contextPrompt += `\n- Topics previously explored: ${discoveredInsights.topicsExplored.join(', ')}`;
    }

    // Add engagement-specific context
    if (engagementData.conversationCount === 0) {
      contextPrompt += `\n- This is ${careerProfileName}'s first session - focus on discovery and building their initial profile`;
    } else if (engagementData.conversationCount >= 5) {
      contextPrompt += `\n- Highly engaged user - build on existing exploration to go deeper or discover new areas`;
    } else {
      contextPrompt += `\n- Returning user - reference previous insights to show continuity and build trust`;
    }

    if (engagementData.careerCardsGenerated === 0) {
      contextPrompt += `\n- No career cards generated yet - perfect opportunity to create their first personalized recommendations`;
    } else {
      contextPrompt += `\n- Career pathways already explored: ${engagementData.careerCardsGenerated} cards generated - build on their existing exploration`;
    }

    contextPrompt += `\n\nPROFILE DATA:`;

    // Include career profile data if available
    if (userData.careerProfile) {
      if (userData.careerProfile.name) {
        contextPrompt += `\n- Preferred name: ${userData.careerProfile.name}`;
      }
      if (userData.careerProfile.interests?.length) {
        contextPrompt += `\n- Career interests: ${userData.careerProfile.interests.join(', ')}`;
      }
      if (userData.careerProfile.goals?.length) {
        contextPrompt += `\n- Career goals: ${userData.careerProfile.goals.join(', ')}`;
      }
      if (userData.careerProfile.skills?.length) {
        contextPrompt += `\n- Skills: ${userData.careerProfile.skills.join(', ')}`;
      }
      if (userData.careerProfile.values?.length) {
        contextPrompt += `\n- Values: ${userData.careerProfile.values.join(', ')}`;
      }
      if (userData.careerProfile.workStyle?.length) {
        contextPrompt += `\n- Work style: ${userData.careerProfile.workStyle.join(', ')}`;
      }
      if (userData.careerProfile.careerStage) {
        contextPrompt += `\n- Career stage: ${userData.careerProfile.careerStage}`;
      }
    }

    // Legacy profile data
    if (profile) {
      if (profile.interests?.length) {
        contextPrompt += `\n- General interests: ${profile.interests.join(', ')}`;
      }
      if (profile.careerGoals?.length) {
        contextPrompt += `\n- General goals: ${profile.careerGoals.join(', ')}`;
      }
      if (profile.skills?.length) {
        contextPrompt += `\n- Additional skills: ${profile.skills.join(', ')}`;
      }
      if (profile.school) {
        contextPrompt += `\n- School: ${profile.school}`;
      }
      if (profile.grade) {
        contextPrompt += `\n- Grade: ${profile.grade}`;
      }
    }

    if (preferences?.interestedSectors?.length) {
      contextPrompt += `\n- Interested sectors: ${preferences.interestedSectors.join(', ')}`;
    }

    contextPrompt += `

PERSONALIZATION STRATEGY:
- Use "${careerProfileName}" naturally throughout conversation (not every response, but when it feels natural)
- ${engagementData.conversationCount > 0 ? `Reference previous insights to show continuity: "I remember you mentioned..." or "Building on what we discovered about your interest in..."` : 'Focus on discovery and building their initial career profile'}
- ${engagementData.careerCardsGenerated > 0 ? `Connect new discoveries to their existing ${engagementData.careerCardsGenerated} career pathways` : 'Create their first career cards - this is an exciting milestone!'}
- Reference their authentication status as investment in their career future
- Build trust through personalized recognition and continuity

CONVERSATION GOALS:
- Use their preferred name (${careerProfileName}) naturally in conversation
- ${discoveredInsights.interests?.length > 0 ? `Build on previously explored interests: ${discoveredInsights.interests.slice(0, 3).join(', ')}` : 'Discover their initial career interests and profile'}
- Use extract_and_update_profile tool to enhance their growing profile with new insights  
- Use explore_career_opportunities tool for increasingly personalized career analysis
- ${engagementData.conversationCount > 0 ? `Provide sophisticated guidance building on their ${engagementData.conversationCount} previous conversations` : 'Start their personalized career journey with comprehensive discovery'}
- Support their evolving career exploration journey with continuity and growth

ENHANCED PERSONA: 
You're not just an AI - you're ${careerProfileName}'s trusted career advisor who:
- ${engagementData.conversationCount > 0 ? `Remembers their journey and builds on previous conversations` : `Is excited to start their career discovery journey`}
- ${engagementData.careerCardsGenerated > 0 ? `Celebrates their progress and ${engagementData.careerCardsGenerated} career pathways discovered` : `Will help them generate their first career recommendations`}
- Provides increasingly sophisticated guidance as their profile grows
- Understands their unique career development path and shows genuine investment in their future

RESPONSE STYLE:
- 30-60 words for voice conversations
- Natural, conversational tone with personalized touches
- ${discoveredInsights.interests?.length > 0 ? `Reference their history when relevant: "Last time we talked about..." or "Building on your interest in ${discoveredInsights.interests[0]}..."` : 'Focus on discovery and building rapport'}
- Show investment in their long-term career growth
- Ask follow-ups that build on known interests/goals

TOOL USAGE STRATEGY:
1. **Early in conversation**: Use update_person_profile to capture new insights and build on existing profile
2. **After 2-3 exchanges**: Use analyze_conversation_for_careers${engagementData.careerCardsGenerated === 0 ? ' (especially important - their first career card generation!)' : ' to generate additional career pathways'}
3. **When specific interests emerge**: Use generate_career_recommendations with their historical context for deeper personalization
4. **For instant insights**: Use trigger_instant_insights when they show excitement about topics`;

    // Add career card context if available
    if (careerCardContext) {
      contextPrompt += `\n\n${careerCardContext}`;
    }

    return contextPrompt;
  }

  /**
   * Helper method to get user engagement data
   */
  private async getUserEngagementData(userId: string): Promise<{
    conversationCount: number;
    careerCardsGenerated: number;
    engagementLevel: string;
  }> {
    try {
      // Get user document for engagement metrics
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Get conversation count from conversations collection
        let conversationCount = 0;
        try {
          const conversationsQuery = query(
            collection(db, 'conversations'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
          );
          const conversationsSnapshot = await getDocs(conversationsQuery);
          conversationCount = conversationsSnapshot.size;
        } catch (convError) {
          console.warn('Could not get conversation count:', convError);
          conversationCount = userData.totalConversations || 0;
        }

        // Get career cards count
        const careerCardsGenerated = userData.careerCardsGenerated || 0;
        
        // Determine engagement level
        let engagementLevel = 'new';
        if (conversationCount >= 5 && careerCardsGenerated >= 3) {
          engagementLevel = 'highly_engaged';
        } else if (conversationCount >= 2 || careerCardsGenerated >= 1) {
          engagementLevel = 'engaged';
        }

        return {
          conversationCount,
          careerCardsGenerated,
          engagementLevel
        };
      }
    } catch (error) {
      console.warn('Could not get user engagement data:', error);
    }

    // Fallback data
    return {
      conversationCount: 0,
      careerCardsGenerated: 0,
      engagementLevel: 'new'
    };
  }

  /**
   * Build comprehensive context for career deep-dive discussions
   */
  private async buildCareerContext(userData: User | null, careerCard: CareerCard): Promise<string> {
    let baseContext = userData ? await this.buildAuthenticatedContext(userData) : await this.buildGuestContext();
    
    let careerSection = `

CAREER FOCUS: ${careerCard.title}
- Description: ${careerCard.description}`;

    if (careerCard.compensationRewards?.salaryRange) {
      const salary = careerCard.compensationRewards.salaryRange;
      careerSection += `\n- Salary Range: ${salary.currency}${salary.entry?.toLocaleString()} - ${salary.currency}${salary.senior?.toLocaleString()}`;
    }

    if (careerCard.competencyRequirements?.technicalSkills?.length || careerCard.keySkills?.length) {
      const skills = careerCard.competencyRequirements?.technicalSkills || careerCard.keySkills || [];
      careerSection += `\n- Required Skills: ${skills.join(', ')}`;
    }

    if (careerCard.trainingPathways?.length) {
      careerSection += `\n- Career Pathways: ${careerCard.trainingPathways.join(', ')}`;
    }

    if (careerCard.nextSteps?.length) {
      careerSection += `\n- Next Steps: ${careerCard.nextSteps.join(', ')}`;
    }

    careerSection += `

CONVERSATION GOALS:
- Discuss this specific career path in detail
- Connect career requirements to user's interests and background
- Address questions about day-to-day work, challenges, growth opportunities
- Provide actionable advice for pursuing this career
- Help them understand if this career aligns with their goals

PERSONA: Expert career counselor with deep knowledge of this specific field`;

    return baseContext + careerSection;
  }

  /**
   * Send personalized context and first message to agent (for authenticated users)
   */
  private async sendPersonalizedContextToAgent(
    agentId: string, 
    contextPrompt: string, 
    firstMessage: string,
    contextType: 'authenticated' | 'career_deep_dive'
  ): Promise<ContextInjectionResult> {
    if (!this.elevenLabsApiKey) {
      console.error('❌ ElevenLabs API key not available for context injection');
      return {
        success: false,
        message: 'ElevenLabs API key not configured',
        fallbackUsed: true
      };
    }

    console.log('📤 Injecting personalized context to agent:', {
      agentId,
      contextType,
      contextLength: contextPrompt.length,
      firstMessage: firstMessage.substring(0, 100) + '...',
      preview: contextPrompt.substring(0, 200) + '...'
    });

    try {
      // Update the agent's context and first message via ElevenLabs PATCH API
      const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenLabsApiKey
        },
        body: JSON.stringify({
          conversation_config: {
            agent: {
              first_message: firstMessage,
              prompt: {
                prompt: `You are an expert career counselor specializing in AI-powered career guidance for young adults.

${contextPrompt}

MCP-ENHANCED TOOLS AVAILABLE:
Use these tools strategically during conversation to provide real-time career insights:

1. **analyze_conversation_for_careers** - Trigger when user mentions interests, activities, or career thoughts
   - Use after 2-3 exchanges to generate personalized career cards
   - Example: "Let me analyze what you've shared to find some personalized opportunities..."

2. **generate_career_recommendations** - Use when user expresses specific interests
   - Generates detailed UK career paths with salary data
   - Example: "Based on your interest in [field], let me create some targeted recommendations..."

3. **trigger_instant_insights** - Use for immediate analysis of user messages
   - Provides instant career matching based on latest response
   - Use when user shows excitement about specific topics

4. **update_person_profile** - Extract and update user profile insights from conversation
   - Extract interests, goals, skills, and personal qualities (e.g., "creative", "analytical", "organized")
   - Use throughout conversation as you discover qualities about the user
   - Personal qualities should be positive traits that build confidence

CONVERSATION FLOW:
1. Start with understanding what makes time fly for them
2. Throughout conversation, use "update_person_profile" as you discover interests, skills, goals, and personal qualities
3. After 2-3 meaningful exchanges, use "analyze_conversation_for_careers"  
4. When specific interests emerge, use "generate_career_recommendations"
5. Use "trigger_instant_insights" for real-time analysis of exciting topics

TIMING:
- Use "update_person_profile" early and often when you detect user traits
- Extract personal qualities from how users describe their approach, thinking style, or behaviors
- Examples of personal qualities to extract: creative, analytical, organized, collaborative, innovative, detail-oriented, strategic, empathetic, resilient, adaptable
- Trigger analysis tools after gathering enough context
- Don't over-analyze - let conversation flow naturally
- Use tools when they add genuine value to the conversation

Remember: The tools generate visual career cards that appear automatically in the UI. Reference these when they're created!

${this.getContextAwareInstruction(contextType)}`,
                tool_ids: [
                  'tool_1201k1nmz5tyeav9h3rejbs6xds1', // analyze_conversation_for_careers
                  'tool_6401k1nmz60te5cbmnvytjtdqmgv', // generate_career_recommendations  
                  'tool_5401k1nmz66eevwswve1q0rqxmwj', // trigger_instant_insights
                  'tool_8501k1nmz6bves9syexedj36520r'  // update_person_profile
                ]
              }
            }
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ ElevenLabs API error:', response.status, errorText);
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Personalized agent context and first message injected successfully:', contextType);

      return {
        success: true,
        message: this.getSuccessMessage(contextType),
        fallbackUsed: false
      };

    } catch (error) {
      console.error('❌ CRITICAL: Personalized context injection failed:', {
        agentId,
        contextType,
        error: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: false,
        message: `Failed to inject personalized context: ${error instanceof Error ? error.message : 'Unknown error'}`,
        fallbackUsed: false
      };
    }
  }

  /**
   * Send context to ElevenLabs agent via PATCH API
   * Based on careerAwareVoiceService.sendContextToAgent pattern
   */
  private async sendContextToAgent(
    agentId: string, 
    contextPrompt: string, 
    contextType: 'guest' | 'authenticated' | 'career_deep_dive'
  ): Promise<ContextInjectionResult> {
    if (!this.elevenLabsApiKey) {
      console.error('❌ ElevenLabs API key not configured');
      return {
        success: false,
        message: 'API key not configured',
        fallbackUsed: true
      };
    }

    console.log('📤 Injecting context to unified agent:', {
      agentId,
      contextType,
      contextLength: contextPrompt.length,
      preview: contextPrompt.substring(0, 200) + '...'
    });

    try {
      // Update the agent's context via ElevenLabs PATCH API
      const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenLabsApiKey
        },
        body: JSON.stringify({
          conversation_config: {
            agent: {
              prompt: {
                prompt: `You are an expert career counselor specializing in AI-powered career guidance for young adults.

${contextPrompt}

RESPONSE STYLE:
- Keep responses 30-60 words for voice conversations
- Be conversational and natural (this is voice, not text)
- Ask engaging follow-up questions
- Reference user context when relevant to build trust and continuity
- Provide specific, actionable career insights
- Encourage exploration and build confidence

MCP-ENHANCED TOOLS AVAILABLE:
Use these tools strategically during conversation to provide real-time career insights:

1. **analyze_conversation_for_careers** - Trigger when user mentions interests, activities, or career thoughts
   - Use after 2-3 exchanges to generate personalized career cards
   - WAIT for tool completion before referencing results
   - Example: "Let me analyze what you've shared to find some personalized opportunities..."

2. **generate_career_recommendations** - Use when user expresses specific interests
   - Generates detailed UK career paths with salary data
   - CRITICAL: This tool takes 30-40 seconds to complete - acknowledge the wait time
   - NEVER claim to have "found career paths" until tool actually completes
   - Example: "I'm analyzing your interests to create personalized career cards - this will take about 30 seconds..."

3. **trigger_instant_insights** - Use for immediate analysis of user messages
   - Provides instant career matching based on latest response
   - Use when user shows excitement about specific topics

4. **update_person_profile** - Extract and update user profile insights from conversation
   - Extract interests, goals, skills, and personal qualities (e.g., "creative", "analytical", "organized")
   - Use throughout conversation as you discover qualities about the user
   - Personal qualities should be positive traits that build confidence

⚠️ CRITICAL TOOL BEHAVIOR:
- NEVER claim tools have completed when they haven't
- NEVER invent fake career recommendations 
- WAIT for actual tool results before referencing career cards
- When tool completes, visual career cards will appear in the UI automatically

CONVERSATION FLOW:
1. Start with understanding what makes time fly for them
2. Throughout conversation, use "update_person_profile" as you discover interests, skills, goals, and personal qualities
3. After 2-3 meaningful exchanges, use "analyze_conversation_for_careers"  
4. When specific interests emerge, use "generate_career_recommendations"
5. Use "trigger_instant_insights" for real-time analysis of exciting topics

TIMING:
- Use "update_person_profile" early and often when you detect user traits
- Extract personal qualities from how users describe their approach, thinking style, or behaviors
- Examples of personal qualities to extract: creative, analytical, organized, collaborative, innovative, detail-oriented, strategic, empathetic, resilient, adaptable
- Trigger analysis tools after gathering enough context
- Don't over-analyze - let conversation flow naturally
- Use tools when they add genuine value to the conversation

Remember: The tools generate visual career cards that appear automatically in the UI. Reference these when they're created!

${this.getContextAwareInstruction(contextType)}`,
                tool_ids: [
                  'tool_1201k1nmz5tyeav9h3rejbs6xds1', // analyze_conversation_for_careers
                  'tool_6401k1nmz60te5cbmnvytjtdqmgv', // generate_career_recommendations  
                  'tool_5401k1nmz66eevwswve1q0rqxmwj', // trigger_instant_insights
                  'tool_8501k1nmz6bves9syexedj36520r'  // update_person_profile
                ]
              }
            }
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ ElevenLabs API error:', response.status, errorText);
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Unified agent context injected successfully:', contextType);

      return {
        success: true,
        message: this.getSuccessMessage(contextType),
        fallbackUsed: false
      };

    } catch (error) {
      // Detailed error logging instead of silent fallbacks
      console.error('❌ CRITICAL: Context injection failed completely for unified agent:', {
        agentId,
        contextType,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        apiKeyPresent: !!this.elevenLabsApiKey,
        apiKeyLength: this.elevenLabsApiKey?.length || 0,
        contextLength: contextPrompt.length
      });
      
      // Log the exact payload that failed for debugging
      console.error('❌ Failed payload structure:', {
        url: `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenLabsApiKey ? `${this.elevenLabsApiKey.substring(0, 8)}...` : 'MISSING'
        },
        payloadStructure: {
          conversation_config: {
            agent: {
              prompt: {
                prompt: `<${contextPrompt.length} characters>`,
                tool_ids: ['tool_1201k1nmz5tyeav9h3rejbs6xds1', '...3 more tools']
              }
            }
          }
        }
      });
      
      return {
        success: false,
        message: `Context injection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        fallbackUsed: true
      };
    }
  }

  /**
   * Get context-aware instruction based on user type
   */
  private getContextAwareInstruction(contextType: 'guest' | 'authenticated' | 'career_deep_dive'): string {
    switch (contextType) {
      case 'guest':
        return 'Begin by introducing yourself and asking about their interests and goals. Focus on discovery and exploration.';
      case 'authenticated':
        return 'Begin by acknowledging what you know about them and ask what they\'d like to explore today.';
      case 'career_deep_dive':
        return 'Begin by acknowledging the specific career context and ask what they\'d like to explore about this career path.';
      default:
        return 'Begin by introducing yourself and asking about their interests and goals.';
    }
  }

  /**
   * Get success message based on context type
   */
  private getSuccessMessage(contextType: string): string {
    switch (contextType) {
      case 'guest':
        return 'Hi! I\'m here to help you explore career possibilities. What interests you or what would you like to discover about your future?';
      case 'authenticated':
        return 'Welcome back! I can see your profile and interests. What would you like to explore about your career journey today?';
      case 'career_deep_dive':
        return 'I have all the details about this career path loaded, along with your background. What aspect would you like to explore first?';
      default:
        return 'Hi! I\'m ready to help with your career exploration. What would you like to discuss?';
    }
  }

  /**
   * Get fallback message when context injection fails
   */
  private getFallbackMessage(contextType: string): string {
    switch (contextType) {
      case 'guest':
        return 'Hi! I\'m here to help you explore career possibilities. What interests you?';
      case 'authenticated':
        return 'Welcome back! What would you like to explore about your career journey today?';
      case 'career_deep_dive':
        return 'I\'m ready to discuss this career path with you. What would you like to know?';
      default:
        return 'Hi! How can I help with your career exploration today?';
    }
  }

  /**
   * SECURITY: Reset agent to clean, neutral state
   * This prevents user data leakage between sessions
   */
  private async resetAgentToCleanState(agentId: string): Promise<void> {
    try {
      const cleanFirstMessage = "Hi I'm Sarah an AI assistant, what's your name?";
      
      const cleanSystemPrompt = `You are an expert career counselor specializing in AI-powered career guidance for young adults.

PERSONALITY: Encouraging, authentic, practical, and supportive.

RESPONSE STYLE:
- Keep responses 30-60 words for voice conversations
- Be conversational and natural (this is voice, not text)
- Ask engaging follow-up questions
- Focus on immediate, actionable value
- Acknowledge user concerns genuinely

MCP-ENHANCED TOOLS AVAILABLE:
Use these tools strategically during conversation to provide real-time career insights:

1. **analyze_conversation_for_careers** - Trigger when user mentions interests, activities, or career thoughts
   - Use after 2-3 exchanges to generate personalized career cards
   - WAIT for tool completion before referencing results
   - Example: "Let me analyze what you've shared to find some personalized opportunities..."

2. **generate_career_recommendations** - Use when user expresses specific interests
   - Generates detailed UK career paths with salary data
   - CRITICAL: This tool takes 30-40 seconds to complete - acknowledge the wait time
   - NEVER claim to have "found career paths" until tool actually completes
   - Example: "I'm analyzing your interests to create personalized career cards - this will take about 30 seconds..."

3. **trigger_instant_insights** - Use for immediate analysis of user messages
   - Provides instant career matching based on latest response
   - Use when user shows excitement about specific topics

4. **update_person_profile** - Extract and update user profile insights from conversation
   - Extract interests, goals, skills, and personal qualities (e.g., "creative", "analytical", "organized")
   - Use throughout conversation as you discover qualities about the user
   - Personal qualities should be positive traits that build confidence

⚠️ CRITICAL TOOL BEHAVIOR:
- NEVER claim tools have completed when they haven't
- NEVER invent fake career recommendations 
- WAIT for actual tool results before referencing career cards
- When tool completes, visual career cards will appear in the UI automatically

CONVERSATION FLOW:
1. Start with understanding what makes time fly for them
2. Throughout conversation, use "update_person_profile" as you discover interests, skills, goals, and personal qualities
3. After 2-3 meaningful exchanges, use "analyze_conversation_for_careers"  
4. When specific interests emerge, use "generate_career_recommendations"
5. Use "trigger_instant_insights" for real-time analysis of exciting topics

TIMING:
- Use "update_person_profile" early and often when you detect user traits
- Extract personal qualities from how users describe their approach, thinking style, or behaviors
- Examples of personal qualities to extract: creative, analytical, organized, collaborative, innovative, detail-oriented, strategic, empathetic, resilient, adaptable
- Trigger analysis tools after gathering enough context
- Don't over-analyze - let conversation flow naturally
- Use tools when they add genuine value to the conversation

Remember: The tools generate visual career cards that appear automatically in the UI. Reference these when they're created!

IMPORTANT: Do not reference any specific user names, personal goals, or previous conversation history. This is a fresh session.`;

      const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenLabsApiKey
        },
        body: JSON.stringify({
          conversation_config: {
            agent: {
              first_message: cleanFirstMessage,
              prompt: {
                prompt: cleanSystemPrompt,
                tool_ids: [
                  'tool_1201k1nmz5tyeav9h3rejbs6xds1', // analyze_conversation_for_careers
                  'tool_6401k1nmz60te5cbmnvytjtdqmgv', // generate_career_recommendations  
                  'tool_5401k1nmz66eevwswve1q0rqxmwj', // trigger_instant_insights
                  'tool_8501k1nmz6bves9syexedj36520r'  // update_person_profile
                ]
              }
            }
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to reset agent to clean state:', response.status, errorText);
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      console.log('✅ Agent reset to clean state successfully');
    } catch (error) {
      console.error('❌ CRITICAL: Failed to reset agent to clean state:', error);
      // Don't throw - let the calling method handle the failure
    }
  }
}

// Export singleton instance
export const unifiedVoiceContextService = new UnifiedVoiceContextService();