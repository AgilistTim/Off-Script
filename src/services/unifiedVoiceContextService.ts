/**
 * UnifiedVoiceContextService
 * 
 * Handles dynamic context injection for the Enhanced Single-Agent Architecture.
 * Extends the proven careerAwareVoiceService pattern to support three user scenarios:
 * 1. Guest users - basic discovery prompts
 * 2. Authenticated users - personalized with profile data
 * 3. Career deep-dive - user profile + specific career details
 */

import { getEnvironmentConfig } from '../config/environment';
import { User } from '../models/User';
import { getUserById } from './userService';
import { guestSessionService } from './guestSessionService';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';

interface CareerCard {
  id?: string;
  title: string;
  description: string;
  salary?: {
    min: number;
    max: number;
    currency: string;
  };
  skills?: string[];
  pathways?: string[];
  nextSteps?: string[];
}

interface ContextInjectionResult {
  success: boolean;
  message: string;
  fallbackUsed: boolean;
}

export class UnifiedVoiceContextService {
  private elevenLabsApiKey: string;

  constructor() {
    const config = getEnvironmentConfig();
    this.elevenLabsApiKey = config.elevenLabs?.apiKey || '';
    
    if (!this.elevenLabsApiKey) {
      console.warn('⚠️ ElevenLabs API key not configured for UnifiedVoiceContextService');
    }
  }

  /**
   * Inject context for guest users - basic discovery and exploration
   */
  public async injectGuestContext(agentId: string): Promise<ContextInjectionResult> {
    const contextPrompt = this.buildGuestContext();
    return this.sendContextToAgent(agentId, contextPrompt, 'guest');
  }

  /**
   * Inject context for authenticated users with profile data
   */
  public async injectAuthenticatedContext(
    agentId: string, 
    userId: string
  ): Promise<ContextInjectionResult> {
    try {
      // Fetch user profile data
      const userData = await getUserById(userId);
      const contextPrompt = await this.buildAuthenticatedContext(userData);
      return this.sendContextToAgent(agentId, contextPrompt, 'authenticated');
    } catch (error) {
      console.error('❌ Failed to fetch user data for context injection:', error);
      // Fallback to guest context if user data unavailable
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
  private buildGuestContext(): string {
    // Check if guest has a captured name
    const guestName = guestSessionService.getGuestName();
    const nameContext = guestName ? 
      `- Guest name: ${guestName} (use naturally in conversation)` : 
      '- No name captured yet (consider asking for their name early in conversation)';
    
    // Get guest session metrics
    const engagementMetrics = guestSessionService.getEngagementMetrics();
    const guestSession = guestSessionService.getGuestSession();
    
    return `USER CONTEXT: Guest User
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
  }

  /**
   * Build personalized context for authenticated users with profile data
   */
  private async buildAuthenticatedContext(userData: User | null): Promise<string> {
    if (!userData) {
      return this.buildGuestContext();
    }

    const profile = userData.profile;
    const preferences = userData.preferences;
    
    // Get enhanced user engagement data
    const engagementData = await this.getUserEngagementData(userData.uid);
    const careerProfileName = userData.careerProfile?.name || userData.displayName;
    
    let contextPrompt = `USER CONTEXT: Authenticated User - ${careerProfileName || 'User'}
- Account created: ${userData.createdAt?.toLocaleDateString() || 'Recently'}
- User type: ${userData.role || 'user'}
- Total conversations: ${engagementData.conversationCount}
- Career cards generated: ${engagementData.careerCardsGenerated}
- Last active: ${userData.lastLogin?.toLocaleDateString() || 'Recently'}
- Engagement level: ${engagementData.engagementLevel}

PROFILE DATA:`;

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

CONVERSATION GOALS:
- Use their preferred name (${careerProfileName}) naturally in conversation
- Reference their existing profile data to show continuity and build trust
- Explore new areas or deepen understanding of their interests
- Use extract_and_update_profile tool to enhance their profile with new insights  
- Use explore_career_opportunities tool for personalized career analysis
- Provide increasingly personalized career guidance based on their ${engagementData.conversationCount} previous conversations
- Support their evolving career exploration journey

PERSONA: Trusted career advisor who knows them, their growth journey, and their ${engagementData.careerCardsGenerated} previous career explorations`;

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
    let baseContext = userData ? await this.buildAuthenticatedContext(userData) : this.buildGuestContext();
    
    let careerSection = `

CAREER FOCUS: ${careerCard.title}
- Description: ${careerCard.description}`;

    if (careerCard.salary) {
      careerSection += `\n- Salary Range: ${careerCard.salary.currency}${careerCard.salary.min?.toLocaleString()} - ${careerCard.salary.currency}${careerCard.salary.max?.toLocaleString()}`;
    }

    if (careerCard.skills?.length) {
      careerSection += `\n- Required Skills: ${careerCard.skills.join(', ')}`;
    }

    if (careerCard.pathways?.length) {
      careerSection += `\n- Career Pathways: ${careerCard.pathways.join(', ')}`;
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
}

// Export singleton instance
export const unifiedVoiceContextService = new UnifiedVoiceContextService();