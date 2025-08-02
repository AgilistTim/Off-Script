import { User as FirebaseUser } from 'firebase/auth';
import { User, UserProfile } from '../models/User';
import { enhancedUserContextService, AgentContextPayload, UserContext } from './enhancedUserContextService';

interface AgentContext {
  greeting: string;
  systemPrompt: string;
  userContext: {
    name: string;
    isAuthenticated: boolean;
    profileSummary: string;
    careerFocus?: string;
  };
  // Enhanced context
  enhancedContext?: AgentContextPayload;
}

class AgentContextService {
  /**
   * Build agent context for personalized conversations
   * Enhanced version with deep context integration
   */
  async buildEnhancedAgentContext(
    user: FirebaseUser | null,
    agentType: 'exploration' | 'career-deep-dive',
    careerContext?: any
  ): Promise<AgentContext> {
    // Get enhanced context payload
    const enhancedContext = await enhancedUserContextService.buildAgentContext(
      user,
      agentType,
      careerContext
    );

    if (!user) {
      return {
        ...this.buildGuestContext(),
        enhancedContext
      };
    }

    const userContext = await enhancedUserContextService.getUserContext(user);
    return this.buildAuthenticatedContextWithEnhancement(user, userContext, agentType, careerContext, enhancedContext);
  }

  /**
   * Legacy method for backward compatibility
   */
  buildAgentContext(
    user: User | null,
    userProfile?: UserProfile,
    careerContext?: any
  ): AgentContext {
    if (!user) {
      return this.buildGuestContext();
    }

    return this.buildAuthenticatedContext(user, userProfile, careerContext);
  }

  /**
   * Build context for guest users
   */
  private buildGuestContext(): AgentContext {
    return {
      greeting: "Hi there! I'm here to help you explore career opportunities. What interests you?",
      systemPrompt: this.buildGuestSystemPrompt(),
      userContext: {
        name: "there",
        isAuthenticated: false,
        profileSummary: "Guest user exploring career opportunities"
      }
    };
  }

  /**
   * Build enhanced context for authenticated users
   */
  private buildAuthenticatedContextWithEnhancement(
    user: FirebaseUser,
    userContext: UserContext | null,
    agentType: 'exploration' | 'career-deep-dive',
    careerContext?: any,
    enhancedContext?: AgentContextPayload
  ): AgentContext {
    const userName = userContext?.name || user.displayName || "there";
    const greeting = enhancedContext?.personalizedGreeting || this.buildPersonalizedGreeting(userName, careerContext);
    const profileSummary = this.buildEnhancedProfileSummary(userContext);

    return {
      greeting,
      systemPrompt: this.buildEnhancedSystemPrompt(agentType, enhancedContext, userName, profileSummary, careerContext),
      userContext: {
        name: userName,
        isAuthenticated: true,
        profileSummary,
        careerFocus: careerContext?.title
      },
      enhancedContext
    };
  }

  /**
   * Build context for authenticated users (legacy)
   */
  private buildAuthenticatedContext(
    user: User,
    userProfile?: UserProfile,
    careerContext?: any
  ): AgentContext {
    const userName = userProfile?.displayName || user.displayName || "there";
    const greeting = this.buildPersonalizedGreeting(userName, careerContext);
    const profileSummary = this.buildProfileSummary(userProfile);

    return {
      greeting,
      systemPrompt: this.buildAuthenticatedSystemPrompt(userName, profileSummary, careerContext),
      userContext: {
        name: userName,
        isAuthenticated: true,
        profileSummary,
        careerFocus: careerContext?.title
      }
    };
  }

  /**
   * Build personalized greeting
   */
  private buildPersonalizedGreeting(userName: string, careerContext?: any): string {
    const greeting = `Welcome back ${userName}!`;
    
    if (careerContext && careerContext.title) {
      return `${greeting} I see you're interested in exploring ${careerContext.title}. What would you like to know more about?`;
    }
    
    return `${greeting} Let's continue exploring your career path. What's on your mind today?`;
  }

  /**
   * Build enhanced profile summary from user context
   */
  private buildEnhancedProfileSummary(userContext: UserContext | null): string {
    if (!userContext) {
      return "User has not yet completed their profile";
    }

    const parts: string[] = [];
    const insights = userContext.discoveredInsights;

    if (insights.interests.length > 0) {
      parts.push(`Interests: ${insights.interests.slice(0, 3).join(', ')}`);
    }

    if (insights.skills.length > 0) {
      parts.push(`Skills: ${insights.skills.slice(0, 3).join(', ')}`);
    }

    if (insights.careerGoals.length > 0) {
      parts.push(`Goals: ${insights.careerGoals.slice(0, 2).join(', ')}`);
    }

    parts.push(`Engagement: ${userContext.engagementLevel}`);
    parts.push(`Conversations: ${userContext.totalConversations}`);
    
    if (userContext.careerCardsGenerated > 0) {
      parts.push(`Career cards generated: ${userContext.careerCardsGenerated}`);
    }

    return parts.length > 0 ? parts.join(' | ') : "Profile in development";
  }

  /**
   * Build profile summary from user data (legacy)
   */
  private buildProfileSummary(userProfile?: UserProfile): string {
    if (!userProfile) {
      return "User has not yet completed their profile";
    }

    const parts: string[] = [];

    if (userProfile.interests && userProfile.interests.length > 0) {
      parts.push(`Interests: ${userProfile.interests.slice(0, 3).join(', ')}`);
    }

    if (userProfile.careerGoals && userProfile.careerGoals.length > 0) {
      parts.push(`Goals: ${userProfile.careerGoals.slice(0, 2).join(', ')}`);
    }

    if (userProfile.skills && userProfile.skills.length > 0) {
      parts.push(`Skills: ${userProfile.skills.slice(0, 3).join(', ')}`);
    }

    if (userProfile.school) {
      parts.push(`Education: ${userProfile.school}`);
    }

    return parts.length > 0 ? parts.join(' | ') : "Profile in development";
  }

  /**
   * Build system prompt for guest users
   */
  private buildGuestSystemPrompt(): string {
    return `You are an expert career counselor specializing in AI-powered career guidance for UK students and young professionals.

CONTEXT: This is a guest user exploring career opportunities without a registered account.

RESPONSE STYLE:
- Keep responses 30-60 words for voice conversations
- Be warm, encouraging, and welcoming
- Focus on general career exploration
- Ask engaging questions to understand their interests
- Provide broad, accessible career insights
- Encourage deeper exploration without pushing registration

Your goal is to provide valuable career guidance while naturally showcasing the benefits of creating an account for personalized experiences.`;
  }

  /**
   * Build enhanced system prompt for authenticated users
   */
  private buildEnhancedSystemPrompt(
    agentType: 'exploration' | 'career-deep-dive',
    enhancedContext: AgentContextPayload | undefined,
    userName: string,
    profileSummary: string,
    careerContext?: any
  ): string {
    const basePrompt = `You are an expert career counselor specializing in AI-powered career guidance for UK students and young professionals.

CONTEXT: This is ${userName}, a registered user with comprehensive profile data.
USER PROFILE: ${profileSummary}`;

    if (agentType === 'exploration') {
      return this.buildExplorationSystemPrompt(basePrompt, enhancedContext, userName, careerContext);
    } else {
      return this.buildCareerDeepDiveSystemPrompt(basePrompt, enhancedContext, userName, careerContext);
    }
  }

  /**
   * Build system prompt for exploration agent
   */
  private buildExplorationSystemPrompt(
    basePrompt: string,
    enhancedContext: AgentContextPayload | undefined,
    userName: string,
    careerContext?: any
  ): string {
    let prompt = basePrompt;

    if (enhancedContext) {
      prompt += `
CONVERSATION BACKGROUND: ${enhancedContext.background}
USER INSIGHTS: ${JSON.stringify(enhancedContext.userInsights, null, 2)}`;
      
      if (enhancedContext.recommendations.length > 0) {
        prompt += `
CONVERSATION RECOMMENDATIONS: ${enhancedContext.recommendations.join('; ')}`;
      }
    }

    prompt += `

ROLE: General Career Exploration Agent
FOCUS: Broad career discovery, interest identification, skill assessment

RESPONSE STYLE:
- Keep responses 30-60 words for voice conversations
- Be conversational, warm, and encouraging
- Focus on discovering new interests and opportunities
- Ask open-ended questions to explore different career areas
- Reference their known interests and build on them
- Suggest diverse career paths and industries
- Use tools to generate career cards when sufficient context is gathered

GUIDANCE:
- Help users explore various career options without being overly focused on one path
- Encourage experimentation with different interests and skills
- Generate career cards when you have enough information about their interests
- Reference their conversation history and progress naturally`;

    return prompt;
  }

  /**
   * Build system prompt for career deep-dive agent
   */
  private buildCareerDeepDiveSystemPrompt(
    basePrompt: string,
    enhancedContext: AgentContextPayload | undefined,
    userName: string,
    careerContext?: any
  ): string {
    let prompt = basePrompt;

    if (careerContext) {
      prompt += `
CAREER FOCUS: Deep dive discussion about ${careerContext.title}`;
      
      if (careerContext.industry) {
        prompt += ` in ${careerContext.industry}`;
      }
    }

    if (enhancedContext) {
      prompt += `
CONVERSATION BACKGROUND: ${enhancedContext.background}
USER INSIGHTS: ${JSON.stringify(enhancedContext.userInsights, null, 2)}`;
    }

    prompt += `

ROLE: Career Deep-Dive Specialist Agent
FOCUS: Detailed exploration of specific career paths, skills, and opportunities

RESPONSE STYLE:
- Keep responses 30-60 words for voice conversations
- Be specific, detailed, and practical
- Focus on the particular career or industry being discussed
- Provide actionable insights about career progression, requirements, and opportunities
- Reference their background and how it relates to this specific career
- Dive deep into day-to-day responsibilities, required skills, and growth paths

GUIDANCE:
- Provide detailed information about the specific career being discussed
- Connect their existing skills and interests to this career path
- Discuss practical next steps for entering or advancing in this field
- Address specific questions about work environment, salary, progression, etc.
- Help them understand if this career aligns with their goals and preferences`;

    return prompt;
  }

  /**
   * Build system prompt for authenticated users (legacy)
   */
  private buildAuthenticatedSystemPrompt(
    userName: string,
    profileSummary: string,
    careerContext?: any
  ): string {
    let prompt = `You are an expert career counselor specializing in AI-powered career guidance for UK students and young professionals.

CONTEXT: This is ${userName}, a registered user with profile data.
USER PROFILE: ${profileSummary}`;

    if (careerContext) {
      prompt += `
CAREER FOCUS: Currently exploring ${careerContext.title}`;
      
      if (careerContext.industry) {
        prompt += ` in ${careerContext.industry}`;
      }
    }

    prompt += `

RESPONSE STYLE:
- Keep responses 30-60 words for voice conversations
- Be conversational and natural (this is voice, not text)
- Reference their profile and interests when relevant
- Provide specific, actionable career insights
- Build on previous conversations and known preferences
- Ask follow-up questions that advance their career exploration

Use their name naturally in conversation and reference their known interests and goals to create a personalized experience.`;

    return prompt;
  }

  /**
   * Get agent ID based on enhanced context and intended use
   */
  getEnhancedAgentId(
    agentType: 'exploration' | 'career-deep-dive',
    user: FirebaseUser | null = null,
    careerContext?: any
  ): string {
    if (agentType === 'career-deep-dive') {
      // Career deep-dive uses the unified agent with career context injection
      return 'agent_3301k1j5rqq1fp29fsg4278fmtsa';
    } else {
      // Exploration uses the same unified agent with basic context injection
      return 'agent_3301k1j5rqq1fp29fsg4278fmtsa';
    }
  }

  /**
   * Get agent ID based on context (legacy method for backward compatibility)
   */
  getRecommendedAgentId(
    user: User | null,
    careerContext?: any,
    conversationDepth: number = 0
  ): string {
    if (!user) {
      // Guest users get the unified agent with basic discovery context
      return 'agent_3301k1j5rqq1fp29fsg4278fmtsa';
    }

    if (careerContext && careerContext.title && conversationDepth > 5) {
      // Deep career discussions use same agent with enhanced career context
      return 'agent_3301k1j5rqq1fp29fsg4278fmtsa';
    }

    // General authenticated users get same agent with user profile context
    return 'agent_3301k1j5rqq1fp29fsg4278fmtsa';
  }

  /**
   * Track conversation completion and update user context
   */
  async trackConversationCompletion(
    user: FirebaseUser | null,
    conversationData: {
      agentType: 'exploration' | 'career-deep-dive';
      duration: number;
      messageCount: number;
      newInsights: any;
      careerCardsCreated: number;
      topics: string[];
    }
  ): Promise<void> {
    if (!user) {
      // For guest users, store in local storage
      this.trackGuestConversation(conversationData);
      return;
    }

    // For authenticated users, update Firebase
    await enhancedUserContextService.updateUserContextAfterConversation(
      user.uid,
      conversationData
    );
  }

  /**
   * Track agent switching for analytics
   */
  async trackAgentSwitch(
    user: FirebaseUser | null,
    fromAgent: 'exploration' | 'career-deep-dive' | null,
    toAgent: 'exploration' | 'career-deep-dive',
    reason: string,
    context?: any
  ): Promise<void> {
    if (!user) {
      console.log('🔄 Guest agent switch:', { fromAgent, toAgent, reason });
      return;
    }

    await enhancedUserContextService.trackAgentSwitch(
      user.uid,
      fromAgent,
      toAgent,
      reason,
      context
    );
  }

  /**
   * Send context to ElevenLabs agent via API
   */
  async sendContextToAgent(
    agentId: string,
    context: AgentContext,
    apiKey: string
  ): Promise<boolean> {
    if (!apiKey) {
      console.warn('⚠️ No ElevenLabs API key available for context update');
      return false;
    }

    try {
      console.log('📤 Sending context to agent:', {
        agentId,
        userName: context.userContext.name,
        isAuthenticated: context.userContext.isAuthenticated,
        careerFocus: context.userContext.careerFocus
      });

      const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          conversation_config: {
            agent: {
              prompt: context.systemPrompt
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('✅ Agent context updated successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to send context to agent:', error);
      return false;
    }
  }

  /**
   * Build welcome message that can be used as first message
   */
  buildWelcomeMessage(context: AgentContext): string {
    return context.greeting;
  }

  /**
   * Track guest conversation in local storage
   */
  private trackGuestConversation(conversationData: {
    agentType: 'exploration' | 'career-deep-dive';
    duration: number;
    messageCount: number;
    newInsights: any;
    careerCardsCreated: number;
    topics: string[];
  }): void {
    try {
      const sessionId = `guest_${Date.now()}`;
      const guestData = {
        sessionId,
        timestamp: new Date().toISOString(),
        ...conversationData
      };
      
      // Store in localStorage for potential account creation later
      const existingData = localStorage.getItem('guest_conversations') || '[]';
      const conversations = JSON.parse(existingData);
      conversations.push(guestData);
      
      // Keep only last 10 conversations
      if (conversations.length > 10) {
        conversations.splice(0, conversations.length - 10);
      }
      
      localStorage.setItem('guest_conversations', JSON.stringify(conversations));
      console.log('📝 Guest conversation tracked:', guestData);
    } catch (error) {
      console.error('Failed to track guest conversation:', error);
    }
  }
}

// Export singleton instance
export const agentContextService = new AgentContextService();
export default agentContextService;