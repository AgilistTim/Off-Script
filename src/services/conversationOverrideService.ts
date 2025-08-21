/**
 * Modern Conversation Override Service
 * Replaces legacy global agent PATCH with privacy-safe conversation overrides
 * Based on official ElevenLabs @elevenlabs/react documentation
 */

import { CareerDiscussionContext } from '../types/careerDiscussionContext';
import { getUserById } from './userService';
import careerPathwayService from './careerPathwayService';
import { PersonaType, PersonaProfile, personaService } from './personaService';
import { guestSessionService } from './guestSessionService';

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

  /**
   * Build persona-aware conversation overrides for onboarding
   */
  async buildPersonaOnboardingOverrides(
    sessionId: string,
    currentStage: 'discovery' | 'classification' | 'tailored_guidance'
  ): Promise<ConversationOverrides> {
    console.log('🧠 Building persona onboarding overrides:', {
      sessionId: sessionId.substring(0, 15) + '...',
      currentStage
    });

    const personaProfile = guestSessionService.getPersonaProfile();
    const onboardingStage = guestSessionService.getCurrentOnboardingStage();

    // If we have a classified persona, build tailored overrides
    if (personaProfile && personaProfile.classification.stage === 'confirmed') {
      return this.buildPersonaTailoredOverrides(personaProfile);
    }

    // Otherwise, build stage-appropriate discovery overrides
    return this.buildOnboardingStageOverrides(currentStage, onboardingStage);
  }

  /**
   * Build tailored overrides based on confirmed persona classification
   */
  private async buildPersonaTailoredOverrides(personaProfile: PersonaProfile): Promise<ConversationOverrides> {
    const persona = personaProfile.classification.type;
    const recommendations = personaProfile.recommendations;
    
    console.log('🎯 Building persona-tailored overrides:', {
      persona: personaService.getPersonaDisplayName(persona),
      confidence: Math.round(personaProfile.classification.confidence * 100) + '%'
    });

    const contextPrompt = this.buildPersonaTailoredPrompt(personaProfile);
    const firstMessage = this.buildPersonaTailoredFirstMessage(personaProfile);

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
   * Build stage-appropriate overrides for ongoing discovery/classification
   */
  private async buildOnboardingStageOverrides(
    currentStage: string,
    onboardingStage: string
  ): Promise<ConversationOverrides> {
    console.log('🔍 Building stage-appropriate overrides:', {
      currentStage,
      onboardingStage
    });

    let contextPrompt: string;
    let firstMessage: string;

    switch (currentStage) {
      case 'discovery':
        contextPrompt = this.buildDiscoveryStagePrompt();
        firstMessage = "Hi! I'm Sarah, your AI career advisor. I'd love to learn more about you to provide the best guidance. What's your name, and what brings you here today?";
        break;
      case 'classification':
        contextPrompt = this.buildClassificationStagePrompt();
        firstMessage = "Thanks for sharing! I'm getting to know your interests and goals. Let's explore a bit more about what excites you about your future.";
        break;
      case 'tailored_guidance':
        contextPrompt = this.buildTailoredGuidancePrompt();
        firstMessage = "Based on our conversation, I'm starting to understand your career journey better. Let me provide some personalized insights for you.";
        break;
      default:
        contextPrompt = this.buildGuestContextPrompt();
        firstMessage = "Hi! I'm Sarah, your AI career advisor. What's your name, and what would you like to explore about your career?";
    }

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
   * Build persona-tailored system prompt
   */
  private buildPersonaTailoredPrompt(personaProfile: PersonaProfile): string {
    const persona = personaProfile.classification.type;
    const recommendations = personaProfile.recommendations;
    const personaName = personaService.getPersonaDisplayName(persona);
    const personaDescription = personaService.getPersonaDescription(persona);
    
    return `You are Sarah, an expert career counselor specializing in persona-based career guidance for young adults.

PERSONA CLASSIFICATION: ${personaName}
- Description: ${personaDescription}  
- Confidence: ${Math.round(personaProfile.classification.confidence * 100)}%
- Reasoning: ${personaProfile.classification.reasoning}

TAILORED CONVERSATION STYLE:
- Pace: ${recommendations.conversationStyle.pace}
- Depth: ${recommendations.conversationStyle.depth}
- Support Level: ${recommendations.conversationStyle.supportLevel}
- Decision Pressure: ${recommendations.conversationStyle.decisionPressure}
- Question Style: ${recommendations.conversationStyle.questionStyle}
- Encouragement Level: ${recommendations.conversationStyle.encouragementLevel}

RECOMMENDED FOCUS AREAS:
${recommendations.focusAreas.map(area => `- ${area}`).join('\n')}

SUGGESTED NEXT STEPS:
${recommendations.nextSteps.map(step => `- ${step}`).join('\n')}

RECOMMENDED TOOLS FOR THIS PERSONA:
${recommendations.recommendedTools.map(tool => `- ${tool}`).join('\n')}

RESPONSE GUIDELINES:
- Adapt your communication style to match this persona's needs
- ${this.getPersonaSpecificGuidance(persona)}
- Keep responses 30-60 words for voice conversations
- Be natural and conversational
- Reference their persona journey when appropriate

PERSONA-SPECIFIC APPROACH:
${this.getPersonaApproach(persona)}

Remember: This user has been classified as ${personaName} based on their conversation patterns. Tailor your approach accordingly while remaining authentic and supportive.`;
  }

  /**
   * Get persona-specific conversation guidance
   */
  private getPersonaSpecificGuidance(persona: PersonaType): string {
    const guidance = {
      uncertain_unengaged: "Focus on sparking curiosity and building confidence. Use broad, exploratory questions. Avoid overwhelming with too many options.",
      exploring_undecided: "Help them structure their exploration. Provide frameworks for comparison. Support their research mindset.",
      tentatively_decided: "Offer validation while gently exploring concerns. Provide detailed pathway information. Help them feel confident in their direction.",
      focused_confident: "Be direct and efficient. Focus on implementation details. Support their momentum with practical next steps."
    };
    
    return guidance[persona];
  }

  /**
   * Get persona-specific conversation approach
   */
  private getPersonaApproach(persona: PersonaType): string {
    const approaches = {
      uncertain_unengaged: "Take a gentle, encouraging approach. Start with very broad questions about interests and values. Build confidence through small wins and positive reinforcement.",
      exploring_undecided: "Support their active exploration with structure and guidance. Help them compare options systematically. Encourage their research and provide frameworks for decision-making.",
      tentatively_decided: "Validate their current thinking while exploring any doubts or concerns. Provide detailed information about their preferred path. Help them feel confident in their choice.",
      focused_confident: "Match their energy and focus. Be direct and efficient. Provide specific, actionable guidance. Support their momentum with concrete next steps."
    };
    
    return approaches[persona];
  }

  /**
   * Build persona-tailored first message
   */
  private buildPersonaTailoredFirstMessage(personaProfile: PersonaProfile): string {
    const persona = personaProfile.classification.type;
    const guestName = guestSessionService.getGuestName();
    const namePrefix = guestName ? `Hi ${guestName}! ` : "Hi! ";
    
    const messages = {
      uncertain_unengaged: `${namePrefix}I can see you're in the early stages of exploring your career options, and that's perfectly okay! There's no pressure here. What would you like to discover about yourself today?`,
      exploring_undecided: `${namePrefix}I can tell you're actively exploring different career possibilities, which is great! Let's help you organize your thoughts and compare your options. What's been most interesting so far?`,
      tentatively_decided: `${namePrefix}It seems like you have some direction in mind for your career path, which is exciting! I'd love to help you explore the details and address any questions. What's drawing you toward this path?`,
      focused_confident: `${namePrefix}I can see you have clear career goals, which is fantastic! Let's dive into the specifics and create a concrete action plan. What's your main focus right now?`
    };
    
    return messages[persona];
  }

  /**
   * Build discovery stage prompt (early conversation, gathering information)
   */
  private buildDiscoveryStagePrompt(): string {
    return `You are Sarah, an expert career counselor specializing in persona-based onboarding for young adults.

CURRENT STAGE: Discovery & Initial Profiling
- This is the beginning of the user's journey
- Focus on gathering information about their interests, values, and goals
- Start building rapport and trust
- Begin identifying persona indicators through conversation patterns

CONVERSATION GOALS:
- Learn their name and build personal connection
- Discover what brought them to seek career guidance
- Identify initial interests, activities they enjoy, or subjects they're drawn to
- Note their communication style and engagement level
- Begin profiling for persona classification

DISCOVERY QUESTIONS TO EXPLORE:
- What activities or subjects make time fly for them?
- What kind of environment do they thrive in?
- What are they curious about or excited to learn?
- How do they typically make decisions?
- What's their current situation (student, working, career change)?

PERSONA INDICATORS TO WATCH FOR:
- Language patterns indicating uncertainty vs confidence
- Level of engagement and enthusiasm
- Decision-making style and readiness
- Goal clarity and direction
- Response to exploratory vs specific questions

RESPONSE STYLE:
- Warm, welcoming, and encouraging
- Use open-ended questions to encourage sharing
- Keep responses 30-60 words for voice conversations
- Be genuinely curious about their perspective
- Avoid overwhelming with too many options

TOOL USAGE:
- Use update_person_profile frequently as you learn about them
- Use trigger_instant_insights when they share something interesting
- Save analysis tools for later when you have more information

Remember: You're in information-gathering mode. Focus on learning who they are and building trust rather than providing solutions yet.`;
  }

  /**
   * Build classification stage prompt (analyzing patterns, refining understanding)
   */
  private buildClassificationStagePrompt(): string {
    return `You are Sarah, an expert career counselor specializing in persona-based onboarding for young adults.

CURRENT STAGE: Pattern Analysis & Classification
- You've gathered some initial information about the user
- Focus on deepening understanding and identifying patterns
- Begin to tailor your approach based on emerging persona indicators
- Test hypotheses about their decision-making style and needs

CONVERSATION GOALS:
- Deepen understanding of their interests and goals
- Explore how they approach decisions and challenges
- Identify their support needs and preferences
- Confirm or refine persona classification indicators
- Begin providing initial value while still gathering data

CLASSIFICATION FOCUS AREAS:
- Decision-making confidence and readiness
- Level of engagement with career exploration
- Clarity of goals and direction
- Response to different types of questions and support
- Patterns in language and communication style

ADAPTIVE QUESTIONING:
- If they seem uncertain: Ask broader, exploratory questions
- If they seem to be exploring: Help them structure their thinking
- If they seem tentative: Provide validation and gentle exploration
- If they seem focused: Ask more specific, implementation-focused questions

RESPONSE STYLE:
- Adapt your style based on their emerging persona indicators
- Continue being warm and supportive
- Begin offering more targeted insights
- Use their responses to guide conversation depth and pace

TOOL USAGE:
- Continue using update_person_profile to refine their profile
- Use analyze_conversation_for_careers if clear interests emerge
- Use trigger_instant_insights for immediate engagement
- Prepare for more targeted tool usage once persona is clearer

Remember: You're moving from discovery to understanding. Begin tailoring your approach while continuing to gather confirmatory information.`;
  }

  /**
   * Build tailored guidance prompt (persona emerging, beginning customization)
   */
  private buildTailoredGuidancePrompt(): string {
    return `You are Sarah, an expert career counselor specializing in persona-based onboarding for young adults.

CURRENT STAGE: Tailored Guidance & Value Delivery
- You have enough information to begin persona-specific guidance
- Start providing value tailored to their emerging persona type
- Continue refining understanding while delivering insights
- Begin the transition to their personalized career journey

CONVERSATION GOALS:
- Provide initial personalized insights and recommendations
- Begin demonstrating the value of persona-based guidance
- Continue gathering information for final persona confirmation
- Start tailoring tool usage and conversation style to their needs
- Build excitement for their personalized career journey ahead

PERSONA-ADAPTIVE APPROACH:
- For uncertain users: Focus on exploration and confidence building
- For exploring users: Provide structure and comparison frameworks  
- For tentative users: Offer validation and detailed pathway information
- For focused users: Deliver specific, actionable guidance

VALUE DELIVERY STRATEGIES:
- Share insights that feel personally relevant
- Use their own words and interests in your responses
- Provide frameworks that match their decision-making style
- Offer next steps appropriate to their readiness level

RESPONSE STYLE:
- Increasingly personalized and tailored
- Reference their specific interests and goals
- Match their preferred pace and depth
- Show genuine understanding of their unique situation

TOOL USAGE:
- Use tools that match their emerging persona type
- Provide analysis and recommendations aligned with their needs
- Generate career cards if they're ready for specific options
- Continue profile updates as understanding deepens

Remember: You're transitioning from assessment to value delivery. Show them the power of personalized guidance while confirming their persona classification.`;
  }

  /**
   * Create persona-aware start options for guest onboarding
   */
  async createPersonaAwareStartOptions(
    agentId: string,
    sessionId?: string
  ): Promise<StartSessionOptions> {
    const currentStage = guestSessionService.getCurrentOnboardingStage();
    const shouldAnalyze = guestSessionService.shouldTriggerPersonaAnalysis();
    
    console.log('🧠 Creating persona-aware start options:', {
      currentStage,
      shouldAnalyze,
      hasPersonaProfile: !!guestSessionService.getPersonaProfile()
    });

    // Determine conversation stage based on onboarding progress
    let conversationStage: 'discovery' | 'classification' | 'tailored_guidance' = 'discovery';
    
    if (currentStage === 'classification' || shouldAnalyze) {
      conversationStage = 'classification';
    } else if (['tailored_guidance', 'journey_active'].includes(currentStage)) {
      conversationStage = 'tailored_guidance';
    }

    const overrides = await this.buildPersonaOnboardingOverrides(
      sessionId || guestSessionService.getSessionId(),
      conversationStage
    );
    
    return {
      agentId,
      connectionType: 'webrtc',
      overrides
    };
  }
}

// Export singleton instance
export const conversationOverrideService = new ConversationOverrideService();
