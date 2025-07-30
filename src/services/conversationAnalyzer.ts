// Simple conversation analyzer using OpenAI best practices from Context7
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { mcpBridgeService, MCPMessage, MCPAnalysisResult } from './mcpBridgeService';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, this should be server-side
});

// Zod schemas for structured responses (Context7 best practice)
const CareerInterestSchema = z.object({
  interest: z.string(),
  context: z.string(),
  confidence: z.number().min(0).max(1),
  extractedTerms: z.array(z.string())
});

const InterestsResponseSchema = z.object({
  interests: z.array(CareerInterestSchema)
});

// Updated interfaces to match existing components
export interface CareerInsight {
  id: string;
  type: 'interest' | 'skill' | 'preference' | 'pathway' | 'industry' | 'summary';
  title: string;
  description: string;
  confidence: number;
  extractedAt: Date;
  relatedTerms: string[];
  metadata?: {
    source?: string;
    personaType?: string;
    conversationContext?: string;
    location?: string;
  };
}

export interface PersonalityPreference {
  id: string;
  category: string;
  value: string;
  preference: string; // For backward compatibility
  strength: 'weak' | 'moderate' | 'strong'; // For backward compatibility
  confidence: number;
  extractedAt: Date;
}

export interface CareerProfile {
  interests: CareerInsight[];
  skills: CareerInsight[];
  preferences: PersonalityPreference[];
  suggestedPaths: CareerInsight[];
  industries: string[];
  totalInsights: number;
  conversationSummary: string;
  registrationTriggers: {
    timeThreshold?: boolean;
    insightThreshold?: boolean;
    engagementThreshold?: boolean;
    userInitiated?: boolean;
  };
}

export interface ConversationInterest {
  interest: string;
  context: string;
  confidence: number;
  extractedTerms: string[];
}

export interface CareerCardData {
  id: string;
  title: string;
  description: string;
  industry: string;
  averageSalary: {
    entry: string;
    experienced: string;
    senior: string;
  };
  growthOutlook: string;
  entryRequirements: string[];
  trainingPathways: string[];
  keySkills: string[];
  workEnvironment: string;
  nextSteps: string[];
  location: string;
  confidence: number;
  sourceData: string;
}

export class ConversationAnalyzer {
  private profile: CareerProfile;
  private useMCPEnhancement: boolean;

  constructor() {
    this.profile = this.createProfile();
    // Enable MCP enhancement if available and configured
    this.useMCPEnhancement = import.meta.env.VITE_ENABLE_MCP_ENHANCEMENT === 'true';
  }

  createProfile(): CareerProfile {
    return {
      interests: [],
      skills: [],
      preferences: [],
      suggestedPaths: [],
      industries: [],
      totalInsights: 0,
      conversationSummary: '',
      registrationTriggers: {}
    };
  }

  // Enhanced message analysis using Context7 best practices
  async analyzeMessage(message: string, conversationHistory: string[] = []): Promise<ConversationInterest[]> {
    try {
      // Build conversation context for better analysis
      const conversationContext = conversationHistory.length > 0 
        ? `Previous conversation context:\n${conversationHistory.join('\n')}\n\nLatest message: ${message}`
        : message;

      // Use structured output with Zod for reliable parsing
      // @ts-ignore - parse() is available at runtime but not yet in typings
      const completion = await (openai as any).chat.completions.parse({
        model: 'gpt-4o-2024-08-06', // Latest model as recommended by Context7
        messages: [
          {
            role: 'system',
            content: `You are an expert career counselor. Extract career-related interests from user messages using the full conversation context.
            
            Look for:
            - Activities they enjoy
            - Skills they mention or want to develop
            - Problems they want to solve
            - Work environment preferences
            - Values and motivations
            - Career stage and experience level
            - Industry interests
            
            Consider the ENTIRE conversation context to build a comprehensive understanding.
            Only return interests with confidence > 0.6.
            If the conversation reveals evolving interests, prioritize the most recent and specific mentions.`
          },
          {
            role: 'user',
            content: `Analyze this conversation for career interests:\n\n${conversationContext}`
          }
        ],
        response_format: zodResponseFormat(InterestsResponseSchema, 'career_interests'),
        temperature: 0.3,
        max_tokens: 800
      });

      const parsed = completion.choices[0]?.message?.parsed;
      if (!parsed) return [];

      // Filter and validate interests with type safety
      return parsed.interests
        .filter((interest): interest is ConversationInterest => 
          interest.confidence > 0.6 &&
          typeof interest.interest === 'string' &&
          typeof interest.context === 'string' &&
          Array.isArray(interest.extractedTerms)
        );
      
    } catch (error) {
      console.error('Error analyzing message:', error);
      return [];
    }
  }

  // NEW: Analyze complete conversation for comprehensive career insights
  async analyzeFullConversation(messages: { role: 'user' | 'assistant'; content: string }[]): Promise<ConversationInterest[]> {
    try {
      if (messages.length === 0) return [];

      // Extract just user messages for career interest analysis
      const userMessages = messages
        .filter(msg => msg.role === 'user')
        .map(msg => msg.content);

      if (userMessages.length === 0) return [];

      const conversationText = userMessages.join('\n');
      console.log('🔬 Analyzing conversation text:', conversationText.substring(0, 100) + '...');

      // Use structured output with Zod for reliable parsing
      // @ts-ignore - parse() is available at runtime but not yet in typings
      const completion = await (openai as any).chat.completions.parse({
        model: 'gpt-4o-2024-08-06',
        messages: [
          {
            role: 'system',
            content: `You are an expert career counselor analyzing a complete conversation to extract comprehensive career insights.
            
            Extract ALL career-related information including:
            - Activities and hobbies they enjoy
            - Skills they have or want to develop
            - Work environment preferences (office, outdoor, flexible, etc.)
            - Values and motivations (helping people, problem-solving, etc.)
            - Industry interests mentioned
            - Career stage preferences
            - Educational background or interests
            
            Build a comprehensive profile from the ENTIRE conversation.
            Look for evolution in their thinking - if interests change or expand during the conversation, capture both earlier and later insights.
            Only return interests with confidence > 0.6.`
          },
          {
            role: 'user',
            content: `Analyze this complete conversation for comprehensive career insights:\n\n${conversationText}`
          }
        ],
        response_format: zodResponseFormat(InterestsResponseSchema, 'career_interests'),
        temperature: 0.2, // Lower temperature for more consistent analysis
        max_tokens: 1200
      });

      console.log('🔬 OpenAI response received');
      const parsed = completion.choices[0]?.message?.parsed;
      if (!parsed) {
        console.error('🔬 No parsed response from OpenAI');
        return [];
      }

      console.log('🔬 Parsed interests:', parsed.interests.length);

      // Filter and validate interests with type safety
      const validInterests = parsed.interests
        .filter((interest): interest is ConversationInterest => 
          interest.confidence > 0.6 &&
          typeof interest.interest === 'string' &&
          typeof interest.context === 'string' &&
          Array.isArray(interest.extractedTerms)
        );

      console.log('🔬 Valid interests after filtering:', validInterests.length);
      return validInterests;
      
    } catch (error) {
      console.error('❌ Error in analyzeFullConversation:', error);
      
      // Fallback to individual message analysis if full conversation fails
      if (messages.length > 0) {
        const lastMessage = messages.filter(msg => msg.role === 'user').pop();
        if (lastMessage) {
          console.log('🔄 Falling back to individual message analysis');
          return await this.analyzeMessage(lastMessage.content, []);
        }
      }
      
      return [];
    }
  }

  // Convert interests to insights for backward compatibility
  async analyzeInterests(messages: string[]): Promise<CareerInsight[]> {
    if (messages.length === 0) return [];
    
    const latestMessage = messages[messages.length - 1];
    const interests = await this.analyzeMessage(latestMessage, messages.slice(0, -1));
    
    return interests.map(interest => ({
      id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'interest' as const,
      title: interest.interest,
      description: interest.context,
      confidence: interest.confidence,
      extractedAt: new Date(),
      relatedTerms: interest.extractedTerms,
      metadata: {
        source: 'conversation_analysis'
      }
    }));
  }

  // Enhanced career card generation
  async generateCareerCard(interest: string, context: string): Promise<CareerCardData | null> {
    try {
      // Simple but effective prompt for career card generation
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-2024-08-06',
        messages: [
          {
            role: 'system',
            content: 'You are a UK career research specialist. Create comprehensive career information in JSON format.'
          },
          {
            role: 'user',
            content: `Create a comprehensive UK career card for interest: "${interest}" with context: "${context}".

            Generate detailed, realistic UK-specific information. For training pathways, provide specific course names, institutions, and qualifications that actually exist in the UK.

            Return JSON with:
            {
              "title": "Specific Career Title",
              "description": "Detailed 2-3 sentence overview of what this career involves",
              "industry": "Specific industry sector",
              "averageSalary": {"entry": "£XX,000", "experienced": "£XX,000", "senior": "£XX,000"},
              "growthOutlook": "Specific UK market outlook with growth percentage if possible",
              "entryRequirements": ["specific qualification", "years of experience", "essential skills"],
              "trainingPathways": [
                "Level 3 Diploma in [Specific Subject] - 1-2 years at UK colleges",
                "BSc/BA in [Specific Subject] at UK universities - 3 years",
                "[Specific] Apprenticeship - employer-funded, 2-4 years",
                "Professional Certificate in [Specific Area] - 6-12 months",
                "NVQ Level 2/3 in [Specific Subject] - workplace-based"
              ],
              "keySkills": ["specific technical skill", "specific soft skill", "industry-specific knowledge"],
              "workEnvironment": "Detailed description of typical work settings, hours, and conditions",
              "nextSteps": ["immediate actionable step", "short-term goal", "long-term career milestone"]
            }

            Make training pathways realistic and specific to UK education system. Include apprenticeships, university courses, professional certifications, and vocational qualifications where relevant.`
          }
        ],
        temperature: 0.2,
        max_tokens: 1500
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) return null;

      // Clean the response by removing markdown code blocks if present
      const cleanedContent = content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*$/gi, '')
        .trim();

      const cardData = JSON.parse(cleanedContent);
      
      return {
        id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...cardData,
        location: 'UK',
        confidence: 0.85,
        sourceData: interest
      };

    } catch (error) {
      console.error('Error generating career card:', error);
      return null;
    }
  }

  // Process conversation for insights and cards
  async processConversationForInsights(
    userMessage: string,
    conversationHistory: string[] = []
  ): Promise<{ interests: ConversationInterest[]; careerCards: CareerCardData[] }> {
    try {
      // Build full conversation context including the new message
      const fullConversation = [
        ...conversationHistory.map(msg => ({ role: 'user' as const, content: msg })),
        { role: 'user' as const, content: userMessage }
      ];

      // Use full conversation analysis for comprehensive insights
      const interests = await this.analyzeFullConversation(fullConversation);
      const careerCards: CareerCardData[] = [];
      
      // Generate unique career cards for high-confidence interests
      const processedInterests = new Set<string>();
      
      for (const interest of interests) {
        if (interest.confidence > 0.7) {
          // Create a unique key for this interest to avoid duplicates
          const interestKey = interest.interest.toLowerCase().trim();
          
          if (!processedInterests.has(interestKey)) {
            const card = await this.generateCareerCard(interest.interest, interest.context);
            if (card) {
              careerCards.push(card);
              processedInterests.add(interestKey);
            }
            // Rate limiting to avoid API throttling
            await new Promise(resolve => setTimeout(resolve, 150));
          }
        }
      }

      console.log(`✅ Processed conversation: ${interests.length} interests found, ${careerCards.length} unique career cards generated`);
      
      return { interests, careerCards };
    } catch (error) {
      console.error('Error processing conversation:', error);
      return { interests: [], careerCards: [] };
    }
  }

  // Convert CareerCardData to CareerInsight for existing components
  convertCardToInsight(card: CareerCardData): CareerInsight {
    return {
      id: card.id,
      type: 'pathway',
      title: card.title,
      description: card.description,
      confidence: card.confidence,
      extractedAt: new Date(),
      relatedTerms: card.keySkills.slice(0, 3),
      metadata: {
        source: 'openai_research',
        location: card.location,
        conversationContext: card.sourceData
      }
    };
  }

  // Legacy compatibility methods
  getCareerProfile(): CareerProfile {
    return this.profile;
  }

  updateProfile(updates: Partial<CareerProfile>): void {
    this.profile = { ...this.profile, ...updates };
  }

  async generatePeriodicSummary(): Promise<string> {
    return "Career exploration summary based on conversation analysis.";
  }

  getRegistrationReadiness(): { score: number; reasons: string[] } {
    const score = this.profile.totalInsights >= 3 ? 0.8 : 0.3;
    const reasons = this.profile.totalInsights >= 3 
      ? ['Sufficient career insights discovered', 'Good engagement level', 'Ready for personalized recommendations']
      : ['Building career profile', 'Discovering interests', 'Continue exploring'];
    return { score, reasons };
  }

  shouldTriggerRegistration(): boolean {
    return this.profile.totalInsights >= 3;
  }

  /**
   * Enhanced conversation analysis that optionally uses MCP server
   */
  async analyzeConversationWithMCP(
    messages: { role: 'user' | 'assistant'; content: string }[],
    userId?: string
  ): Promise<ConversationInterest[]> {
    if (this.useMCPEnhancement && mcpBridgeService.isServerConnected()) {
      try {
        console.log('🔬 Using MCP-enhanced conversation analysis');
        
        // Convert messages to MCP format
        const mcpMessages: MCPMessage[] = messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));

        // Analyze with MCP server
        const mcpResult: MCPAnalysisResult = await mcpBridgeService.analyzeConversation(mcpMessages, userId);
        
        if (mcpResult.success && mcpResult.analysis) {
          // Convert MCP results to ConversationInterest format
          const interests: ConversationInterest[] = mcpResult.analysis.detectedInterests.map((interest, index) => ({
            interest,
            context: `Detected from MCP conversation analysis`,
            confidence: mcpResult.analysis!.confidence,
            extractedTerms: [interest.toLowerCase().replace(/[^a-z0-9]/g, '')]
          }));

          console.log('✅ MCP analysis completed', {
            interestsFound: interests.length,
            confidence: mcpResult.analysis.confidence,
            careerCards: mcpResult.analysis.careerCards?.length || 0
          });

          return interests;
        } else {
          console.warn('⚠️ MCP analysis failed, falling back to standard analysis:', mcpResult.error);
        }
      } catch (error) {
        console.warn('⚠️ MCP analysis error, falling back to standard analysis:', error);
      }
    }

    // Fallback to standard analysis
    console.log('🔬 Using standard conversation analysis');
    return await this.analyzeStandardConversation(messages, userId);
  }

  /**
   * Standard conversation analysis (fallback method)
   */
  private async analyzeStandardConversation(
    messages: { role: 'user' | 'assistant'; content: string }[],
    userId?: string
  ): Promise<ConversationInterest[]> {
    try {
      // Use the new full conversation analysis method
      return await this.analyzeFullConversation(messages);
    } catch (error) {
      console.error('❌ Standard conversation analysis failed:', error);
      
      // Final fallback: analyze just the last user message if available
      const lastUserMessage = messages
        .filter(msg => msg.role === 'user')
        .pop();
      
      if (lastUserMessage) {
        return await this.analyzeMessage(lastUserMessage.content, []);
      }
      
      return [];
    }
  }

  /**
   * Enhanced career card generation using MCP if available
   */
  async generateCareerCardsWithMCP(interests: ConversationInterest[], userId?: string): Promise<CareerCardData[]> {
    if (this.useMCPEnhancement && mcpBridgeService.isServerConnected() && interests.length > 0) {
      try {
        console.log('🎯 Using MCP-enhanced career insights generation');
        
        const interestNames = interests.map(i => i.interest);
        const mcpResult = await mcpBridgeService.generateCareerInsights(interestNames);
        
        if (mcpResult.success && mcpResult.insights) {
          // Convert MCP insights to CareerCardData format
          const careerCards: CareerCardData[] = mcpResult.insights.map((insight, index) => ({
            id: `mcp-card-${Date.now()}-${index}`,
            title: `${insight.field} Career Path`,
            description: `Explore opportunities in ${insight.field}`,
            industry: insight.field,
            averageSalary: insight.salaryData,
            growthOutlook: insight.marketOutlook.growth,
            entryRequirements: insight.pathways.slice(0, 3),
            trainingPathways: insight.pathways,
            keySkills: insight.skills,
            workEnvironment: `${insight.marketOutlook.demand} with ${insight.marketOutlook.competition}`,
            nextSteps: insight.nextSteps,
            location: 'UK',
            confidence: 0.9, // High confidence from MCP server
            sourceData: insight.field
          }));

          console.log('✅ MCP career cards generated', { cardsCreated: careerCards.length });
          return careerCards;
        }
      } catch (error) {
        console.warn('⚠️ MCP career cards generation failed, using fallback:', error);
      }
    }

    // Fallback to standard generation
    console.log('🎯 Using standard career card generation');
    const careerCards: CareerCardData[] = [];
    
    for (const interest of interests) {
      if (interest.confidence > 0.7) {
        const card = await this.generateCareerCard(interest.interest, interest.context);
        if (card) careerCards.push(card);
      }
    }
    
    return careerCards;
  }

  reset(): void {
    this.profile = this.createProfile();
  }
}

// Export singleton instance for backward compatibility
export const conversationAnalyzer = new ConversationAnalyzer(); 