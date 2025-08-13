/**
 * Comprehensive context interface for career-aware voice discussions
 * Provides rich context to the ElevenLabs Career-Aware Discussion Agent
 */

import { environmentConfig } from '../config/environment';

export interface CareerDiscussionContext {
  // New Career-Aware Agent Configuration
  agentConfig: {
    agentId: string; // Dynamic agent ID from environment configuration
    name: 'OffScript Career-Aware Discussion Agent';
    purpose: 'specific_career_discussion';
  };

  // Core Career Data
  careerFocus: {
    careerCard: any; // The specific career being discussed
    matchScore: number; // Confidence/match percentage
    rank?: number; // If this is an alternative (2, 3, 4, 5)
    isPrimary: boolean; // Whether this is the primary recommendation
    selectionReason: string; // Why this career was recommended
  };

  // User Profile Context  
  userContext: {
    // Core Profile
    profile: {
      interests: string[];
      careerGoals: string[];
      skills: string[];
      preferences?: {
        workEnvironment?: string[];
        workStyle?: string[];
        values?: string[];
      };
    };
    
    // Career Exploration Journey
    explorationHistory: {
      conversationCount: number;
      careerCardsGenerated: number;
      topInterestAreas: string[];
      careerStage: 'exploring' | 'narrowing' | 'deciding' | 'transitioning';
    };
    
    // Previous Discussion Context
    conversationSummary?: {
      summary: string; // "Career exploration conversation... Discussed 6 career paths"
      keyTopics: string[];
      messageCount: number;
      lastAnalysis?: Date;
    };
  };

  // Career Intelligence Context
  careerIntelligence: {
    // Primary career being discussed
    primaryPathway: any;
    
    // Alternative pathways for comparison
    alternativePathways: any[];
    
    // Match reasoning
    matchReasoning: {
      strengthMatches: string[]; // What aligns well
      growthAreas: string[]; // What user needs to develop
      personalityFit: string; // How this fits user's personality
      interestAlignment: string[]; // Specific interests that match
    };
  };

  // Discussion Configuration
  discussionConfig: {
    focusArea?: 'overview' | 'day_in_life' | 'salary' | 'progression' | 
                'skills' | 'training' | 'challenges' | 'comparison';
    comparisonTarget?: any; // If comparing with another career
    userQuestions?: string[]; // Pre-loaded questions user has expressed
    sessionGoal?: string; // What user wants to achieve in this discussion
  };

  // Technical Context
  technical: {
    sessionId: string;
    threadId?: string;
    timestamp: Date;
    platform: 'dashboard' | 'modal' | 'dedicated_page';
    deviceType: 'mobile' | 'desktop' | 'tablet';
  };
}

/**
 * Service interface for career-aware voice discussions
 */
export interface CareerDiscussionService {
  /**
   * Initialize a career discussion with comprehensive context
   */
  startCareerDiscussion(context: CareerDiscussionContext): Promise<{
    sessionId: string;
    agentResponse: string;
    contextLoaded: boolean;
  }>;

  /**
   * Add context during an ongoing discussion
   */
  enhanceDiscussion(sessionId: string, additionalContext: Partial<CareerDiscussionContext>): Promise<void>;

  /**
   * Switch focus to a different career for comparison
   */
  switchCareerFocus(sessionId: string, newCareer: any, compareWithCurrent?: boolean): Promise<void>;

  /**
   * Get discussion insights and recommendations
   */
  getDiscussionInsights(sessionId: string): Promise<{
    keyTopics: string[];
    userEngagement: number;
    recommendedNextSteps: string[];
    careerConfidenceChange?: number;
  }>;
}

/**
 * Builder for creating career discussion context
 */
export class CareerDiscussionContextBuilder {
  private context: Partial<CareerDiscussionContext> = {};

  static create(): CareerDiscussionContextBuilder {
    return new CareerDiscussionContextBuilder();
  }

  withCareer(career: any, isPrimary: boolean = true, matchScore: number = 0): this {
    this.context.careerFocus = {
      careerCard: career,
      matchScore,
      isPrimary,
      rank: isPrimary ? undefined : (career.rank || 2),
      selectionReason: isPrimary 
        ? `Your strongest match based on interests in ${career.interests?.slice(0, 2).join(', ')}`
        : `Alternative pathway ranked #${career.rank || 2} based on your profile`
    };
    return this;
  }

  withUserProfile(profile: any, explorationHistory?: any): this {
    this.context.userContext = {
      profile: {
        interests: profile.interests || [],
        careerGoals: profile.careerGoals || [],
        skills: profile.skills || [],
        preferences: profile.preferences,
        // PRESERVE USER NAME DATA - This was the missing piece!
        displayName: profile.displayName,
        careerProfile: profile.careerProfile,
        name: profile.name
      },
      explorationHistory: explorationHistory || {
        conversationCount: 1,
        careerCardsGenerated: 1,
        topInterestAreas: profile.interests?.slice(0, 3) || [],
        careerStage: 'exploring'
      }
    };
    return this;
  }

  withCareerIntelligence(primary: any, alternatives: any[] = []): this {
    this.context.careerIntelligence = {
      primaryPathway: primary,
      alternativePathways: alternatives,
      matchReasoning: {
        strengthMatches: primary.strengthMatches || [],
        growthAreas: primary.growthAreas || [],
        personalityFit: primary.personalityFit || 'Good alignment with your profile',
        interestAlignment: primary.interestAlignment || []
      }
    };
    return this;
  }

  withDiscussionFocus(focusArea: CareerDiscussionContext['discussionConfig']['focusArea']): this {
    this.context.discussionConfig = {
      ...this.context.discussionConfig,
      focusArea
    };
    return this;
  }

  withTechnicalContext(sessionId: string, platform: 'dashboard' | 'modal' | 'dedicated_page'): this {
    this.context.technical = {
      sessionId,
      timestamp: new Date(),
      platform,
      deviceType: window.innerWidth < 768 ? 'mobile' : 'desktop'
    };
    return this;
  }

  build(): CareerDiscussionContext {
    // Set default agent config
    if (!this.context.agentConfig) {
      this.context.agentConfig = {
        agentId: environmentConfig.elevenLabs.agentId,
        name: 'OffScript Career-Aware Discussion Agent',
        purpose: 'specific_career_discussion'
      };
    }

    // Validate required fields
    if (!this.context.careerFocus || !this.context.userContext || !this.context.technical) {
      throw new Error('Missing required context: careerFocus, userContext, and technical are required');
    }

    return this.context as CareerDiscussionContext;
  }
}

/**
 * Helper functions for context preparation
 */
export const CareerDiscussionHelpers = {
  /**
   * Prepare context from Firebase data
   */
  prepareFromFirebaseData: async (
    userId: string, 
    careerToDiscuss: any, 
    isPrimary: boolean = true
  ): Promise<CareerDiscussionContext> => {
    // This would integrate with our existing Firebase services
    // to gather user profile, conversation history, and career guidance
    const builder = CareerDiscussionContextBuilder.create();
    
    // Would call existing services:
    // - userService.getUserProfile(userId)
    // - careerPathwayService.getStructuredCareerGuidance(userId)
    // - chatService.getConversationSummary(userId)
    
    return builder
      .withCareer(careerToDiscuss, isPrimary)
      .withTechnicalContext(`session_${Date.now()}`, 'dashboard')
      .build();
  },

  /**
   * Create quick comparison context
   */
  createComparisonContext: (
    primaryCareer: any, 
    alternativeCareer: any, 
    userProfile: any
  ): CareerDiscussionContext => {
    return CareerDiscussionContextBuilder.create()
      .withCareer(alternativeCareer, false)
      .withUserProfile(userProfile)
      .withCareerIntelligence(primaryCareer, [alternativeCareer])
      .withDiscussionFocus('comparison')
      .withTechnicalContext(`comparison_${Date.now()}`, 'modal')
      .build();
  }
};