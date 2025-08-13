/**
 * Modern Conversation Override Service
 * Replaces legacy global agent PATCH with privacy-safe conversation overrides
 * Based on official ElevenLabs @elevenlabs/react documentation
 */

import { CareerDiscussionContext } from '../types/careerDiscussionContext';
import { getUserById } from './userService';
import careerPathwayService from './careerPathwayService';

interface ConversationOverrides {
  agent: {
    prompt: {
      prompt: string;
    };
    firstMessage: string;
    language?: string;
  };
  tts?: {
    voiceId?: string;
  };
  conversation?: {
    textOnly?: boolean;
  };
}

interface StartSessionOptions {
  agentId: string;
  userId?: string;
  connectionType: 'webrtc' | 'websocket';
  overrides: ConversationOverrides;
}

/**
 * Modern service that builds conversation overrides instead of global agent PATCH
 * This provides true per-session privacy isolation without cross-user contamination
 */
export class ConversationOverrideService {
  
  /**
   * Build career-specific conversation overrides
   * Replaces careerAwareVoiceService's global PATCH approach
   */
  async buildCareerOverrides(
    userId: string,
    careerCard: any,
    careerDiscussionContext?: CareerDiscussionContext
  ): Promise<ConversationOverrides> {
    console.log('🔒 Building career conversation overrides (privacy-safe):', {
      userId: userId.substring(0, 8) + '...',
      careerTitle: careerCard.title,
      hasContext: !!careerDiscussionContext
    });

    const userData = await getUserById(userId);
    if (!userData) {
      throw new Error(`User data not found for userId: ${userId}`);
    }

    // Build comprehensive career context prompt
    const contextPrompt = await this.buildCareerContextPrompt(userData, careerCard, careerDiscussionContext);
    
    // Build personalized first message
    const userName = (userData.careerProfile?.name || userData.displayName || 'there').trim();
    const firstMessage = `Hi ${userName}! I have all the details about your career path in ${careerCard.title}. What would you like to explore first about this career?`;

    return {
      agent: {
        prompt: {
          prompt: contextPrompt
        },
        firstMessage,
        language: "en"
      }
    };
  }

  /**
   * Build authenticated user conversation overrides
   * For general conversations without specific career focus
   */
  async buildAuthenticatedOverrides(userId: string): Promise<ConversationOverrides> {
    console.log('🔒 Building authenticated conversation overrides:', {
      userId: userId.substring(0, 8) + '...'
    });

    const userData = await getUserById(userId);
    if (!userData) {
      throw new Error(`User data not found for userId: ${userId}`);
    }

    const contextPrompt = await this.buildAuthenticatedContextPrompt(userData);
    const firstMessage = await this.buildPersonalizedFirstMessage(userData);

    return {
      agent: {
        prompt: {
          prompt: contextPrompt
        },
        firstMessage,
        language: "en"
      }
    };
  }

  /**
   * Build guest user conversation overrides
   */
  async buildGuestOverrides(topicTitle?: string): Promise<ConversationOverrides> {
    console.log('🔒 Building guest conversation overrides:', { topicTitle });

    const contextPrompt = this.buildGuestContextPrompt();
    const firstMessage = topicTitle
      ? `Let's explore ${topicTitle} together! I can help you understand this career path. What interests you most about it?`
      : "Hi I'm Sarah, an AI career counselor! What's your name and what career interests would you like to explore?";

    return {
      agent: {
        prompt: {
          prompt: contextPrompt
        },
        firstMessage,
        language: "en"
      }
    };
  }

  /**
   * Build comprehensive career context prompt (replaces legacy PATCH logic)
   */
  private async buildCareerContextPrompt(
    userData: any,
    careerCard: any,
    careerContext?: CareerDiscussionContext
  ): Promise<string> {
    const userName = userData.careerProfile?.name || userData.displayName || 'User';
    const userInterests = userData.careerProfile?.interests || [];
    const userSkills = userData.careerProfile?.skills || [];
    const userGoals = userData.careerProfile?.careerGoals || [];

    // Get structured career guidance for context
    let structuredGuidance;
    try {
      structuredGuidance = await careerPathwayService.getStructuredCareerGuidance(userData.uid);
    } catch (error) {
      console.warn('Could not fetch structured career guidance:', error);
      structuredGuidance = null;
    }

    return `You are an expert career counselor specializing in AI-powered career guidance for young adults.

CURRENT USER CONTEXT:
- Name: ${userName}
- Interests: ${userInterests.slice(0, 5).join(', ') || 'Being discovered through conversation'}
- Skills: ${userSkills.slice(0, 5).join(', ') || 'Being identified through discussion'}
- Career Goals: ${userGoals.slice(0, 3).join(', ') || 'Exploring career options'}

CAREER FOCUS: ${careerCard.title}
${careerCard.description ? `- Description: ${careerCard.description}` : ''}
${careerCard.location ? `- Location: ${careerCard.location}` : ''}
${careerCard.confidence ? `- Match Confidence: ${Math.round(careerCard.confidence * 100)}%` : ''}

${structuredGuidance ? `
CAREER PATHWAY CONTEXT:
- Primary Career: ${structuredGuidance.primaryCareer?.title || careerCard.title}
- Alternative Pathways: ${structuredGuidance.alternativePathways?.map(p => p.title).slice(0, 3).join(', ') || 'None identified yet'}
- Exploration Stage: ${structuredGuidance.explorationStage || 'Early exploration'}
` : ''}

PERSONALITY: Encouraging, authentic, practical, and supportive career counselor.

RESPONSE STYLE:
- Keep responses 30-60 words for voice conversations
- Be conversational and natural (this is voice, not text)
- Ask engaging follow-up questions about the specific career path
- Reference the user's interests and profile when relevant
- Provide specific, actionable career insights about ${careerCard.title}

MCP-ENHANCED TOOLS AVAILABLE (USE AGGRESSIVELY):
Use these tools early and often to maximize career card generation:

1. **analyze_conversation_for_careers** - Use IMMEDIATELY when user mentions ANY interests, activities, or career thoughts
2. **trigger_instant_insights** - Use early for immediate engagement and quick value delivery
3. **generate_career_recommendations** - Use as fallback if no career cards generated by exchange 3-4
4. **update_person_profile** - Use continuously to capture and refine user insights

STRATEGY: Prioritize career card generation within first 3-4 exchanges for maximum conversion impact.

⚠️ CRITICAL TOOL BEHAVIOR:
- NEVER claim tools have completed when they haven't
- NEVER invent fake career recommendations 
- WAIT for actual tool results before referencing career cards

🚨 CRITICAL PRIVACY PROTECTION:
- NEVER use names from previous conversations
- NEVER reference previous user details from other sessions
- ALWAYS treat this as a completely fresh session
- Only use information provided in the current session context

You already have context about ${userName}'s interest in ${careerCard.title}. Start by acknowledging what you know and ask what they'd like to explore first about this specific career.`;
  }

  /**
   * Build authenticated user context prompt
   */
  private async buildAuthenticatedContextPrompt(userData: any): Promise<string> {
    const userName = userData.careerProfile?.name || userData.displayName || 'User';
    const userInterests = userData.careerProfile?.interests || [];
    const userSkills = userData.careerProfile?.skills || [];
    const userGoals = userData.careerProfile?.careerGoals || [];

    return `You are an expert career counselor specializing in AI-powered career guidance for young adults.

CURRENT USER CONTEXT:
- Name: ${userName}
- Interests: ${userInterests.slice(0, 5).join(', ') || 'Being discovered through conversation'}
- Skills: ${userSkills.slice(0, 5).join(', ') || 'Being identified through discussion'}  
- Career Goals: ${userGoals.slice(0, 3).join(', ') || 'Exploring career options'}

PERSONALITY: Encouraging, authentic, practical, and supportive.

RESPONSE STYLE:
- Keep responses 30-60 words for voice conversations
- Be conversational and natural (this is voice, not text)
- Ask engaging follow-up questions
- Focus on immediate, actionable value
- Acknowledge user concerns genuinely

MCP-ENHANCED TOOLS AVAILABLE:
1. **analyze_conversation_for_careers** - Generate personalized career cards after 2-3 exchanges
2. **generate_career_recommendations** - Creates detailed UK career paths (takes 30-40 seconds)
3. **trigger_instant_insights** - Immediate analysis of user messages
4. **update_person_profile** - Extract interests, goals, skills, and personal qualities

🚨 CRITICAL PRIVACY PROTECTION:
- NEVER use names from previous conversations
- NEVER reference previous user details from other sessions
- ALWAYS treat this as a completely fresh session with ${userName}
- Only use information provided in the current session context

CONVERSATION FLOW:
1. Welcome ${userName} back personally
2. Ask what makes time fly for them or what they want to explore today
3. Use tools to provide personalized career insights based on their response`;
  }

  /**
   * Build guest context prompt
   */
  private buildGuestContextPrompt(): string {
    return `You are an expert career counselor specializing in AI-powered career guidance for young adults.

PERSONALITY: Encouraging, authentic, practical, and supportive.

RESPONSE STYLE:
- Keep responses 30-60 words for voice conversations
- Be conversational and natural (this is voice, not text)
- Ask engaging follow-up questions
- Focus on immediate, actionable value

MCP-ENHANCED TOOLS AVAILABLE (USE AGGRESSIVELY):
1. **analyze_conversation_for_careers** - PRIMARY TOOL: Use immediately when ANY interests mentioned
2. **trigger_instant_insights** - Use early for immediate engagement and value
3. **generate_career_recommendations** - FALLBACK: Use if no career cards by exchange 4
4. **update_person_profile** - Use immediately when name/interests captured

TOOL STRATEGY: Be MORE AGGRESSIVE with career card generation. Every guest should leave with valuable career insights.

CONVERSATION FLOW (ENHANCED FOR CAREER CARDS):
1. Get their name and build rapport (use update_person_profile immediately)
2. Ask what makes time fly for them (use trigger_instant_insights for quick value)
3. AGGRESSIVELY use analyze_conversation_for_careers after ANY interest mention
4. ENSURE at least 1 career card generated within 3-4 exchanges
5. Use fallback tools if no career cards by exchange 4

🚨 CRITICAL PRIVACY PROTECTION:
- This is a completely fresh session with a new user
- Don't reference any previous conversations or user data
- Only use information provided in the current session`;
  }

  /**
   * Build personalized first message for authenticated users
   */
  private async buildPersonalizedFirstMessage(userData: any): Promise<string> {
    const userName = (userData.careerProfile?.name || userData.displayName || 'there').trim();
    const interests = userData.careerProfile?.interests || [];
    
    if (interests.length > 0) {
      const topInterests = interests.slice(0, 2).join(' and ');
      return `Welcome back ${userName}! I remember your interest in ${topInterests}. What would you like to explore about your career journey today?`;
    } else {
      return `Welcome back ${userName}! What's been on your mind about your career lately? What would you like to explore today?`;
    }
  }

  /**
   * Create complete startSession options for career discussions
   */
  async createCareerStartOptions(
    agentId: string,
    userId: string,
    careerCard: any,
    careerContext?: CareerDiscussionContext
  ): Promise<StartSessionOptions> {
    const overrides = await this.buildCareerOverrides(userId, careerCard, careerContext);
    
    return {
      agentId,
      userId,
      connectionType: 'webrtc',
      overrides
    };
  }

  /**
   * Create complete startSession options for general authenticated conversations
   */
  async createAuthenticatedStartOptions(
    agentId: string,
    userId: string
  ): Promise<StartSessionOptions> {
    const overrides = await this.buildAuthenticatedOverrides(userId);
    
    return {
      agentId,
      userId,
      connectionType: 'webrtc',
      overrides
    };
  }

  /**
   * Create complete startSession options for guest conversations
   */
  async createGuestStartOptions(
    agentId: string,
    topicTitle?: string
  ): Promise<StartSessionOptions> {
    const overrides = await this.buildGuestOverrides(topicTitle);
    
    return {
      agentId,
      connectionType: 'webrtc',
      overrides
    };
  }
}

// Export singleton instance
export const conversationOverrideService = new ConversationOverrideService();
