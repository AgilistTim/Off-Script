/**
 * Career-Aware Voice Service
 * Manages interactions with the specialized ElevenLabs Career-Aware Discussion Agent
 * Provides rich context about specific careers, user profiles, and discussion history
 */

import { CareerDiscussionContext, CareerDiscussionService, CareerDiscussionContextBuilder } from '../types/careerDiscussionContext';
import { environmentConfig } from '../config/environment';
import careerPathwayService from './careerPathwayService';
import { getUserById, updateUserProfile } from './userService';
import { ConversationOverrideService } from './conversationOverrideService';

// ElevenLabs Career-Aware Agent Configuration
// Dynamic agent ID from environment configuration
const CAREER_AWARE_AGENT_NAME = 'OffScript Career-Aware Discussion Agent';

interface CareerDiscussionSession {
  sessionId: string;
  context: CareerDiscussionContext;
  startTime: Date;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  insights: {
    keyTopics: string[];
    userEngagement: number;
    careerConfidenceChange?: number;
    discoveredInterests?: string[];
    refinedGoals?: string[];
    identifiedSkills?: string[];
  };
  conversationOverrides?: any; // NEW: Store overrides for UI components
}

class CareerAwareVoiceService implements CareerDiscussionService {
  private activeSessions: Map<string, CareerDiscussionSession> = new Map();
  private elevenLabsApiKey: string | undefined;
  private conversationOverrideService: ConversationOverrideService;

  constructor() {
    this.elevenLabsApiKey = environmentConfig.elevenLabs.apiKey;
    this.conversationOverrideService = new ConversationOverrideService();
  }

  /**
   * Initialize a career discussion with comprehensive context
   */
  async startCareerDiscussion(context: CareerDiscussionContext): Promise<{
    sessionId: string;
    agentResponse: string;
    contextLoaded: boolean;
    conversationOverrides?: any;
  }> {
    try {
      console.log('🎯 Starting career-aware voice discussion...', {
        career: context.careerFocus.careerCard.title,
        isPrimary: context.careerFocus.isPrimary,
        matchScore: context.careerFocus.matchScore,
        userInterests: context.userContext.profile.interests.slice(0, 3)
      });

      // Validate ElevenLabs configuration
      if (!this.elevenLabsApiKey) {
        throw new Error('ElevenLabs API key not configured');
      }

      // Create session
      const session: CareerDiscussionSession = {
        sessionId: context.technical.sessionId,
        context,
        startTime: new Date(),
        conversationHistory: [],
        insights: {
          keyTopics: [],
          userEngagement: 0
        }
      };

      // Store session
      this.activeSessions.set(session.sessionId, session);

      // Prepare rich context prompt for the agent
      const contextPrompt = this.buildContextPrompt(context);

      // Build conversation overrides using the new comprehensive service with ALL Perplexity data
      // Extract the actual user ID from the session ID 
      const userId = context.technical.sessionId.split('_').pop(); // Extract user ID from session_timestamp_userId format
      
      if (!userId) {
        throw new Error('Invalid session ID format - cannot extract user ID');
      }
      
      // Use the new comprehensive ConversationOverrideService that includes ALL training data
      const overrides = await this.conversationOverrideService.buildCareerOverrides(
        userId,
        context.careerFocus.careerCard,
        context
      );
      
      // Build the agent response message
      const userData = context.userContext?.profile;
      const userName = (userData?.careerProfile?.name || userData?.displayName || 'there').trim();
      const agentResponse = `Hi ${userName}! I have all the details about your career path in ${context.careerFocus.careerCard.title}. What would you like to explore first about this career?`;

      // Store overrides in session for UI components to use
      session.conversationOverrides = overrides;

      console.log('✅ Career discussion initialized successfully', {
        sessionId: session.sessionId,
        contextLoaded: true
      });

      return {
        sessionId: session.sessionId,
        agentResponse,
        contextLoaded: true,
        conversationOverrides: overrides // NEW: Return overrides for UI
      };

    } catch (error) {
      console.error('❌ Failed to start career discussion:', error);
      throw new Error(`Failed to initialize career discussion: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build comprehensive context prompt for the agent
   */
  private buildContextPrompt(context: CareerDiscussionContext): string {
    const career = context.careerFocus.careerCard;
    const user = context.userContext.profile;
    
    return `
**CONTEXT LOADED FOR CAREER DISCUSSION**

**USER PROFILE:**
- Name: User (${context.userContext.explorationHistory.careerStage} career stage)
- Key Interests: ${user.interests.slice(0, 5).join(', ')}
- Career Goals: ${user.careerGoals.slice(0, 3).join(', ')}
- Current Skills: ${user.skills.slice(0, 5).join(', ')}
- Exploration History: ${context.userContext.explorationHistory.careerCardsGenerated} careers explored

**CAREER BEING DISCUSSED:**
- Title: ${career.title}
- Match Type: ${context.careerFocus.isPrimary ? 'PRIMARY RECOMMENDATION' : `ALTERNATIVE #${context.careerFocus.rank}`}
- Match Score: ${context.careerFocus.matchScore}% confidence
- Selection Reason: ${context.careerFocus.selectionReason}

**KEY CAREER DETAILS:**
- Description: ${career.description || 'Comprehensive career information available'}
- Salary Range: ${career.averageSalary ? `£${career.averageSalary.toLocaleString()}/year` : 'Salary data available'}
- Growth Outlook: ${career.growthOutlook || 'Industry trends available'}
- Key Skills Needed: ${career.keySkills?.slice(0, 4).join(', ') || 'Skills analysis available'}

**ALTERNATIVE CAREER OPTIONS (for comparison):**
${context.careerIntelligence?.alternativePathways?.slice(0, 3).map((alt, idx) => 
  `- ${alt.title} (Rank #${idx + 2}): ${alt.description?.substring(0, 80)}...`
).join('\n') || 'Alternative pathways available for comparison'}

**DISCUSSION FOCUS:**
${context.discussionConfig?.focusArea ? `Primary focus: ${context.discussionConfig.focusArea}` : 'Open career discussion'}

**USER'S INTEREST ALIGNMENT:**
${this.analyzeInterestAlignment(career, user.interests)}

---

You now have complete context about this specific career and the user's profile. Reference specific details from above in your responses. The user can ask about any aspect of this career, compare it with alternatives, or explore how it matches their unique interests and goals.

Ready to have an informed career discussion!
`;
  }

  /**
   * Analyze how user interests align with the career
   */
  private analyzeInterestAlignment(career: any, userInterests: string[]): string {
    const alignments: string[] = [];
    
    // Check for direct interest matches
    userInterests.forEach(interest => {
      if (career.title?.toLowerCase().includes(interest.toLowerCase()) ||
          career.description?.toLowerCase().includes(interest.toLowerCase()) ||
          career.keySkills?.some((skill: string) => 
            skill.toLowerCase().includes(interest.toLowerCase())
          )) {
        alignments.push(`✅ ${interest} aligns with ${career.title}`);
      }
    });

    return alignments.length > 0 
      ? alignments.join('\n')
      : `User interests (${userInterests.slice(0, 3).join(', ')}) connect to this career through various pathways`;
  }

  /**
   * Build conversation overrides instead of global agent PATCH (MODERN APPROACH)
   * Returns conversation overrides for privacy-safe per-session context
   */
  private async buildConversationOverrides(
    userId: string,
    contextPrompt: string,
    careerTitle: string,
    userData?: any
  ): Promise<{ overrides: any; agentResponse: string }> {
    console.log('🔒 Building conversation overrides (privacy-safe):', {
      userId: userId.substring(0, 8) + '...',
      contextLength: contextPrompt.length,
      careerTitle,
      approach: 'PER_SESSION_OVERRIDES',
      hasUserData: !!userData
    });

    // Extract user name from the properly preserved user data
    console.log('🔍 DEBUG: Extracting user name from userData:', {
      userData,
      name: userData?.name,
      careerProfileName: userData?.careerProfile?.name,
      displayName: userData?.displayName,
      fallback: 'there'
    });
    
    const userName = (
      userData?.name || 
      userData?.careerProfile?.name || 
      userData?.displayName || 
      'there'
    ).trim();
    
    console.log('🔍 DEBUG: Final userName extracted:', { userName });
    
    const fullPrompt = `You are an expert career counselor specializing in AI-powered career guidance.

${contextPrompt}

RESPONSE STYLE:
- Keep responses 30-60 words for voice conversations
- Be conversational and natural (this is voice, not text)
- Ask engaging follow-up questions about the specific career path
- Reference the user's interests and profile when relevant
- Provide specific, actionable career insights

🚨 CRITICAL PRIVACY PROTECTION:
- NEVER use names from previous conversations
- NEVER reference previous user details from other sessions
- ALWAYS treat this as a completely fresh session with ${userName}
- Only use information provided in the current session context

You already have all the context about this user and career path. Start the conversation by acknowledging what you know and ask what they'd like to explore first about this specific career.`;

    const firstMessage = `Hi ${userName}! I have all the details about your career path in ${careerTitle}. What would you like to explore first about this career?`;

    const overrides = {
      agent: {
        prompt: {
          prompt: fullPrompt
        },
        firstMessage,
        language: "en"
      }
    };

    console.log('✅ Conversation overrides built successfully (NO GLOBAL PATCH)');
    
    return {
      overrides,
      agentResponse: firstMessage
    };
  }

  /**
   * Enhance ongoing discussion with additional context
   */
  async enhanceDiscussion(sessionId: string, additionalContext: Partial<CareerDiscussionContext>): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Merge additional context
    session.context = {
      ...session.context,
      ...additionalContext
    };

    console.log('🔧 Enhanced discussion context', {
      sessionId,
      additionalKeys: Object.keys(additionalContext)
    });
  }

  /**
   * Switch career focus for comparison
   */
  async switchCareerFocus(sessionId: string, newCareer: any, compareWithCurrent: boolean = false): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const previousCareer = session.context.careerFocus.careerCard;

    // Update career focus
    session.context.careerFocus = {
      careerCard: newCareer,
      matchScore: newCareer.matchScore || 75,
      isPrimary: false,
      rank: newCareer.rank || 2,
      selectionReason: `Switching focus to explore ${newCareer.title}`
    };

    // Add comparison context if requested
    if (compareWithCurrent) {
      session.context.discussionConfig = {
        ...session.context.discussionConfig,
        focusArea: 'comparison',
        comparisonTarget: previousCareer
      };
    }

    console.log('🔄 Switched career focus', {
      sessionId,
      from: previousCareer.title,
      to: newCareer.title,
      compareMode: compareWithCurrent
    });
  }

  /**
   * Get discussion insights
   */
  async getDiscussionInsights(sessionId: string): Promise<{
    keyTopics: string[];
    userEngagement: number;
    recommendedNextSteps: string[];
    careerConfidenceChange?: number;
  }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return {
      keyTopics: session.insights.keyTopics,
      userEngagement: session.insights.userEngagement,
      recommendedNextSteps: [
        'Explore specific training pathways',
        'Research top employers in this field',
        'Connect with professionals in this career',
        'Consider alternative pathways'
      ],
      careerConfidenceChange: session.insights.careerConfidenceChange
    };
  }

  /**
   * Helper: Create context from Firebase data
   */
  async createContextFromFirebaseData(
    userId: string, 
    careerToDiscuss: any, 
    isPrimary: boolean = true
  ): Promise<CareerDiscussionContext> {
    try {
      console.log('📋 Creating discussion context from Firebase data...', {
        userId,
        career: careerToDiscuss.title,
        isPrimary
      });

      // Get user profile data
      const userProfile = await getUserById(userId);
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Get career guidance data
      const guidanceData = await careerPathwayService.getStructuredCareerGuidance(userId);
      
      // Build context using the builder pattern - ensure safe array access
      const rawProfile = userProfile.profile || {};
      const profileData = {
        interests: Array.isArray(rawProfile.interests) ? rawProfile.interests : [],
        careerGoals: Array.isArray(rawProfile.careerGoals) ? rawProfile.careerGoals : [],
        skills: Array.isArray(rawProfile.skills) ? rawProfile.skills : [],
        // PRESERVE USER NAME DATA - This was the missing piece!
        displayName: userProfile.displayName,
        careerProfile: userProfile.careerProfile,
        name: userProfile.careerProfile?.name || userProfile.displayName
      };
      
      console.log('🔍 Profile data processed:', {
        hasInterests: profileData.interests.length > 0,
        interestsCount: profileData.interests.length,
        firstFewInterests: profileData.interests.slice(0, 3),
        hasGoals: profileData.careerGoals.length > 0,
        hasSkills: profileData.skills.length > 0,
        // DEBUG: Check if user name data is preserved
        userName: profileData.name,
        displayName: profileData.displayName,
        hasCareerProfile: !!profileData.careerProfile
      });
      
      const context = CareerDiscussionContextBuilder.create()
        .withCareer(careerToDiscuss, isPrimary, careerToDiscuss.matchScore || 85)
        .withUserProfile(profileData, {
          conversationCount: guidanceData.totalPathways,
          careerCardsGenerated: guidanceData.totalPathways,
          topInterestAreas: profileData.interests.slice(0, 3),
          careerStage: 'exploring'
        })
        .withCareerIntelligence(
          guidanceData.primaryPathway, 
          guidanceData.alternativePathways
        )
        .withTechnicalContext(`session_${Date.now()}_${userId}`, 'dashboard')
        .build();

      console.log('✅ Context created successfully', {
        sessionId: context.technical.sessionId,
        hasCareer: !!context.careerFocus.careerCard,
        hasProfile: !!context.userContext.profile,
        alternativesCount: context.careerIntelligence?.alternativePathways?.length || 0
      });

      return context;

    } catch (error) {
      console.error('❌ Failed to create context from Firebase data:', error);
      throw new Error(`Failed to create discussion context: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cleanup inactive sessions
   */
  cleanupInactiveSessions(): void {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    this.activeSessions.forEach((session, sessionId) => {
      if (session.startTime < oneHourAgo) {
        this.activeSessions.delete(sessionId);
        console.log('🧹 Cleaned up inactive session:', sessionId);
      }
    });
  }

  /**
   * Track a conversation message and analyze for insights
   */
  async trackConversationMessage(
    sessionId: string, 
    role: 'user' | 'assistant', 
    content: string
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      console.warn(`⚠️ Session ${sessionId} not found for message tracking`);
      return;
    }

    // Add message to conversation history
    const message = {
      role,
      content,
      timestamp: new Date()
    };
    
    session.conversationHistory.push(message);

    // Analyze user messages for insights
    if (role === 'user') {
      this.analyzeMessageForInsights(session, content);
    }

    console.log('💬 Tracked conversation message', {
      sessionId,
      role,
      messageLength: content.length,
      totalMessages: session.conversationHistory.length
    });
  }

  /**
   * Analyze user message for career insights (interests, goals, skills)
   */
  private analyzeMessageForInsights(session: CareerDiscussionSession, userMessage: string): void {
    const lowercaseMessage = userMessage.toLowerCase();

    // Extract potential interests
    const interestKeywords = [
      'interested in', 'love', 'enjoy', 'fascinated by', 'passionate about',
      'excited about', 'drawn to', 'curious about', 'like working with'
    ];
    
    // Extract potential goals
    const goalKeywords = [
      'want to', 'hope to', 'goal is', 'looking to', 'plan to',
      'aim to', 'would like to', 'dream of', 'aspire to'
    ];

    // Extract potential skills mentions
    const skillKeywords = [
      'experience with', 'skilled at', 'good at', 'know how to',
      'worked with', 'used', 'familiar with', 'background in'
    ];

    // Simple keyword extraction (in production, could use NLP)
    for (const keyword of interestKeywords) {
      if (lowercaseMessage.includes(keyword)) {
        const insight = this.extractInsightAfterKeyword(userMessage, keyword);
        if (insight && !session.insights.discoveredInterests?.includes(insight)) {
          session.insights.discoveredInterests = session.insights.discoveredInterests || [];
          session.insights.discoveredInterests.push(insight);
        }
      }
    }

    for (const keyword of goalKeywords) {
      if (lowercaseMessage.includes(keyword)) {
        const insight = this.extractInsightAfterKeyword(userMessage, keyword);
        if (insight && !session.insights.refinedGoals?.includes(insight)) {
          session.insights.refinedGoals = session.insights.refinedGoals || [];
          session.insights.refinedGoals.push(insight);
        }
      }
    }

    for (const keyword of skillKeywords) {
      if (lowercaseMessage.includes(keyword)) {
        const insight = this.extractInsightAfterKeyword(userMessage, keyword);
        if (insight && !session.insights.identifiedSkills?.includes(insight)) {
          session.insights.identifiedSkills = session.insights.identifiedSkills || [];
          session.insights.identifiedSkills.push(insight);
        }
      }
    }
  }

  /**
   * Extract meaningful text after a keyword
   */
  private extractInsightAfterKeyword(message: string, keyword: string): string | null {
    const keywordIndex = message.toLowerCase().indexOf(keyword);
    if (keywordIndex === -1) return null;

    const afterKeyword = message.substring(keywordIndex + keyword.length).trim();
    
    // Extract up to the first sentence or 100 characters
    const sentences = afterKeyword.split(/[.!?]/);
    const insight = sentences[0]?.trim();
    
    if (insight && insight.length > 3 && insight.length < 100) {
      return insight.charAt(0).toUpperCase() + insight.slice(1).toLowerCase();
    }
    
    return null;
  }

  /**
   * Save conversation insights to user profile
   */
  async saveInsightsToProfile(sessionId: string): Promise<{
    success: boolean;
    updatedFields: string[];
    error?: string;
  }> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Extract user ID from session ID (format: session_timestamp_userId)
      const userId = session.context.technical.sessionId.split('_')[2];
      
      if (!userId) {
        throw new Error('User ID not found in session context');
      }

      const insights = session.insights;
      const profileUpdates: any = {};
      const updatedFields: string[] = [];

      // Get current user profile to merge with new insights
      const currentUser = await getUserById(userId);
      const currentProfile = currentUser?.profile || {};

      // Add discovered interests
      if (insights.discoveredInterests && insights.discoveredInterests.length > 0) {
        const currentInterests = currentProfile.interests || [];
        const newInterests = [...new Set([...currentInterests, ...insights.discoveredInterests])];
        if (newInterests.length > currentInterests.length) {
          profileUpdates.interests = newInterests;
          updatedFields.push('interests');
        }
      }

      // Add refined goals
      if (insights.refinedGoals && insights.refinedGoals.length > 0) {
        const currentGoals = currentProfile.careerGoals || [];
        const newGoals = [...new Set([...currentGoals, ...insights.refinedGoals])];
        if (newGoals.length > currentGoals.length) {
          profileUpdates.careerGoals = newGoals;
          updatedFields.push('careerGoals');
        }
      }

      // Add identified skills
      if (insights.identifiedSkills && insights.identifiedSkills.length > 0) {
        const currentSkills = currentProfile.skills || [];
        const newSkills = [...new Set([...currentSkills, ...insights.identifiedSkills])];
        if (newSkills.length > currentSkills.length) {
          profileUpdates.skills = newSkills;
          updatedFields.push('skills');
        }
      }

      // Save to Firebase if there are updates
      if (Object.keys(profileUpdates).length > 0) {
        await updateUserProfile(userId, profileUpdates);
        
        console.log('✅ Saved conversation insights to user profile', {
          userId,
          sessionId,
          updatedFields,
          newInsights: {
            interests: insights.discoveredInterests?.length || 0,
            goals: insights.refinedGoals?.length || 0,
            skills: insights.identifiedSkills?.length || 0
          }
        });

        return {
          success: true,
          updatedFields
        };
      } else {
        console.log('ℹ️ No new insights to save to profile', { sessionId });
        return {
          success: true,
          updatedFields: []
        };
      }

    } catch (error) {
      console.error('❌ Failed to save insights to profile:', error);
      return {
        success: false,
        updatedFields: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get session insights summary
   */
  getSessionInsights(sessionId: string): {
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
    discoveredInsights: {
      interests: string[];
      goals: string[];
      skills: string[];
    };
    sessionDuration: number;
  } | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    const userMessages = session.conversationHistory.filter(m => m.role === 'user');
    const assistantMessages = session.conversationHistory.filter(m => m.role === 'assistant');
    const sessionDuration = Date.now() - session.startTime.getTime();

    return {
      totalMessages: session.conversationHistory.length,
      userMessages: userMessages.length,
      assistantMessages: assistantMessages.length,
      discoveredInsights: {
        interests: session.insights.discoveredInterests || [],
        goals: session.insights.refinedGoals || [],
        skills: session.insights.identifiedSkills || []
      },
      sessionDuration
    };
  }

  /**
   * Get active career discussion sessions for a user
   */
  getActiveSessions(userId: string): Array<{
    sessionId: string;
    career: string;
    startTime: Date;
    userEngagement: number;
  }> {
    const activeSessions: Array<{
      sessionId: string;
      career: string;
      startTime: Date;
      userEngagement: number;
    }> = [];

    for (const [sessionId, session] of this.activeSessions) {
      if (session.context.technical?.sessionId === userId) {
        activeSessions.push({
          sessionId,
          career: session.context.careerFocus?.careerCard?.title || 'Unknown Career',
          startTime: session.startTime,
          userEngagement: session.insights.userEngagement
        });
      }
    }

    return activeSessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  /**
   * Get conversation overrides for a session (for UI components)
   */
  getConversationOverrides(sessionId: string): any | null {
    const session = this.activeSessions.get(sessionId);
    return session?.conversationOverrides || null;
  }
}

// Export singleton instance
export const careerAwareVoiceService = new CareerAwareVoiceService();
export default careerAwareVoiceService;