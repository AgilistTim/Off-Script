/**
 * Career-Aware Voice Service
 * Manages interactions with the specialized ElevenLabs Career-Aware Discussion Agent
 * Provides rich context about specific careers, user profiles, and discussion history
 */

import { CareerDiscussionContext, CareerDiscussionService, CareerDiscussionContextBuilder } from '../types/careerDiscussionContext';
import { elevenLabs } from '../config/environment';
import careerPathwayService from './careerPathwayService';
import { getUserById } from './userService';

// ElevenLabs Career-Aware Agent Configuration
const CAREER_AWARE_AGENT_ID = 'agent_3301k1j5rqq1fp29fsg4278fmtsa';
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
  };
}

class CareerAwareVoiceService implements CareerDiscussionService {
  private activeSessions: Map<string, CareerDiscussionSession> = new Map();
  private elevenLabsApiKey: string | undefined;

  constructor() {
    this.elevenLabsApiKey = elevenLabs.apiKey;
  }

  /**
   * Initialize a career discussion with comprehensive context
   */
  async startCareerDiscussion(context: CareerDiscussionContext): Promise<{
    sessionId: string;
    agentResponse: string;
    contextLoaded: boolean;
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

      // Initialize conversation with context
      const response = await this.sendContextToAgent(context.agentConfig.agentId, contextPrompt);

      console.log('✅ Career discussion initialized successfully', {
        sessionId: session.sessionId,
        contextLoaded: true
      });

      return {
        sessionId: session.sessionId,
        agentResponse: response,
        contextLoaded: true
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
   * Send context to the ElevenLabs agent by updating agent configuration
   */
  private async sendContextToAgent(agentId: string, contextPrompt: string): Promise<string> {
    if (!this.elevenLabsApiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    console.log('📤 Sending context to agent:', {
      agentId,
      contextLength: contextPrompt.length,
      preview: contextPrompt.substring(0, 200) + '...'
    });

    try {
      // Update the agent's context via ElevenLabs API
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
                prompt: `You are an expert career counselor specializing in AI-powered career guidance.

${contextPrompt}

RESPONSE STYLE:
- Keep responses 30-60 words for voice conversations
- Be conversational and natural (this is voice, not text)
- Ask engaging follow-up questions about the specific career path
- Reference the user's interests and profile when relevant
- Provide specific, actionable career insights

You already have all the context about this user and career path. Start the conversation by acknowledging what you know and ask what they'd like to explore first about this specific career.`
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
      console.log('✅ Agent context updated successfully');

      return `Hi! I have all the details about your career path loaded. I can see how this aligns with your interests and background. What would you like to explore first about this career?`;

    } catch (error) {
      console.error('❌ Failed to send context to ElevenLabs agent:', error);
      
      // Fallback to basic response if API call fails
      return `Hi! I'm ready to discuss your career path. What aspect would you like to explore first?`;
    }
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
        skills: Array.isArray(rawProfile.skills) ? rawProfile.skills : []
      };
      
      console.log('🔍 Profile data processed:', {
        hasInterests: profileData.interests.length > 0,
        interestsCount: profileData.interests.length,
        firstFewInterests: profileData.interests.slice(0, 3),
        hasGoals: profileData.careerGoals.length > 0,
        hasSkills: profileData.skills.length > 0
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
}

// Export singleton instance
export const careerAwareVoiceService = new CareerAwareVoiceService();
export default careerAwareVoiceService;