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
  
    this.elevenLabsApiKey = environmentConfig.elevenLabs?.apiKey || '';
    
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
      const personalizedFirstMessage = await this.generatePersonalizedFirstMessage(userData);
      return this.sendPersonalizedContextToAgent(agentId, contextPrompt, personalizedFirstMessage, 'authenticated');
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
   * Generate personalized first message for authenticated users
   */
  public async generatePersonalizedFirstMessage(userData: User | null): Promise<string> {
    if (!userData) {
      return "Hi I'm Sarah an AI assistant, nice to meet you, whats your name?";
    }

    const engagementData = await this.getUserEngagementData(userData.uid);
    const careerProfileName = userData.careerProfile?.name || userData.displayName || 'there';
    
    // Get discovered interests for continuity
    const discoveredInsights = await this.getDiscoveredInsights(userData.uid);
    
    if (engagementData.conversationCount === 0) {
      // First conversation for authenticated user
      return `Hi ${careerProfileName}! Welcome to OffScript. I'm Sarah, your AI career advisor. I'm excited to start your personalized career journey together. What's on your mind about your career today?`;
    } else if (engagementData.conversationCount >= 5) {
      // Highly engaged returning user
      const topInterests = discoveredInsights.interests?.slice(0, 2).join(' and ') || 'your career interests';
      return `Welcome back, ${careerProfileName}! Great to continue our career exploration. I remember we've discussed ${topInterests}, and you've generated ${engagementData.careerCardsGenerated} career pathways. Ready to dive deeper or explore something new?`;
    } else {
      // Engaged returning user
      if (discoveredInsights.interests?.length > 0) {
        const mainInterest = discoveredInsights.interests[0];
        return `Hi ${careerProfileName}! Welcome back. I remember your interest in ${mainInterest}. Ready to explore more career opportunities today?`;
      } else {
        return `Welcome back, ${careerProfileName}! Ready to continue discovering your career path? What would you like to explore today?`;
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
      return this.buildGuestContext();
    }

    const profile = userData.profile;
    const preferences = userData.preferences;
    
    // Get enhanced user engagement data
    const engagementData = await this.getUserEngagementData(userData.uid);
    const careerProfileName = userData.careerProfile?.name || userData.displayName;
    
    // Get discovered insights for context continuity
    const discoveredInsights = await this.getDiscoveredInsights(userData.uid);
    
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