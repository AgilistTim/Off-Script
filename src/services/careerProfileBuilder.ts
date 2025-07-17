import { conversationAnalyzer, CareerProfile, CareerInsight } from './conversationAnalyzer';

// Enhanced career profile with analytics
export interface EnhancedCareerProfile extends CareerProfile {
  analyticsData: {
    conversationStartTime: Date;
    messageCount: number;
    userEngagementLevel: 'low' | 'medium' | 'high';
    topInterestCategories: string[];
    dominantPersonalityTraits: string[];
    careerReadinessScore: number;
    nextRecommendedActions: string[];
  };
  periodicSummaries: {
    id: string;
    summary: string;
    generatedAt: Date;
    insightCount: number;
  }[];
}

// Builder configuration
interface ProfileBuilderConfig {
  enablePeriodicSummaries: boolean;
  summaryIntervals: number[]; // Message counts when to generate summaries
  registrationPromptThreshold: number; // Readiness score threshold
  maxSummariesStored: number;
}

// Default configuration
const DEFAULT_CONFIG: ProfileBuilderConfig = {
  enablePeriodicSummaries: true,
  summaryIntervals: [6, 12, 20, 30], // Generate summaries at these message counts
  registrationPromptThreshold: 50,
  maxSummariesStored: 5
};

// Event types for the profile builder
export type ProfileBuilderEvent = 
  | { type: 'INSIGHT_DISCOVERED'; insight: CareerInsight }
  | { type: 'SUMMARY_GENERATED'; summary: string }
  | { type: 'REGISTRATION_READY'; readinessScore: number; reasons: string[] }
  | { type: 'PROFILE_UPDATED'; profile: EnhancedCareerProfile }
  | { type: 'ENGAGEMENT_THRESHOLD'; level: 'medium' | 'high' };

export type ProfileBuilderEventHandler = (event: ProfileBuilderEvent) => void;

class CareerProfileBuilder {
  private profile: EnhancedCareerProfile;
  private config: ProfileBuilderConfig;
  private eventHandlers: ProfileBuilderEventHandler[] = [];
  private messageCount: number = 0;
  private lastSummaryMessageCount: number = 0;

  constructor(config: Partial<ProfileBuilderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.profile = this.initializeProfile();
  }

  private initializeProfile(): EnhancedCareerProfile {
    const baseProfile = conversationAnalyzer.getCareerProfile();
    return {
      ...baseProfile,
      analyticsData: {
        conversationStartTime: new Date(),
        messageCount: 0,
        userEngagementLevel: 'low',
        topInterestCategories: [],
        dominantPersonalityTraits: [],
        careerReadinessScore: 0,
        nextRecommendedActions: []
      },
      periodicSummaries: []
    };
  }

  // Add event handler
  public addEventListener(handler: ProfileBuilderEventHandler) {
    this.eventHandlers.push(handler);
  }

  // Remove event handler
  public removeEventListener(handler: ProfileBuilderEventHandler) {
    this.eventHandlers = this.eventHandlers.filter(h => h !== handler);
  }

  // Emit event to all handlers
  private emitEvent(event: ProfileBuilderEvent) {
    this.eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in profile builder event handler:', error);
      }
    });
  }

  // Process a new conversation message
  public async processMessage(message: string, role: 'user' | 'assistant'): Promise<CareerInsight[]> {
    this.messageCount++;
    this.profile.analyticsData.messageCount = this.messageCount;

    // Update engagement level
    this.updateEngagementLevel();

    // Analyze the message for career insights
    const conversationInterests = await conversationAnalyzer.analyzeMessage(message, []);
    
    // Convert ConversationInterest to CareerInsight
    const newInsights: CareerInsight[] = conversationInterests.map(interest => ({
      id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'interest' as const,
      title: interest.interest,
      description: interest.context,
      confidence: interest.confidence,
      extractedAt: new Date(),
      relatedTerms: interest.extractedTerms,
      metadata: {
        source: 'conversation_analysis',
        conversationContext: message
      }
    }));
    
    // Update profile with latest data from analyzer
    this.updateProfileFromAnalyzer();

    // Emit events for new insights
    newInsights.forEach(insight => {
      this.emitEvent({ type: 'INSIGHT_DISCOVERED', insight });
    });

    // Check if we should generate a periodic summary
    if (this.shouldGenerateSummary()) {
      await this.generatePeriodicSummary();
    }

    // Check registration readiness
    this.checkRegistrationReadiness();

    // Update analytics
    this.updateAnalytics();

    // Emit profile update event
    this.emitEvent({ type: 'PROFILE_UPDATED', profile: this.profile });

    return newInsights;
  }

  // Update profile from the conversation analyzer
  private updateProfileFromAnalyzer() {
    const analyzerProfile = conversationAnalyzer.getCareerProfile();
    
    this.profile.interests = analyzerProfile.interests;
    this.profile.skills = analyzerProfile.skills;
    this.profile.preferences = analyzerProfile.preferences;
    this.profile.suggestedPaths = analyzerProfile.suggestedPaths;
    this.profile.industries = analyzerProfile.industries;
    this.profile.totalInsights = analyzerProfile.totalInsights;
    this.profile.conversationSummary = analyzerProfile.conversationSummary;
    this.profile.registrationTriggers = analyzerProfile.registrationTriggers;
  }

  // Update engagement level based on conversation patterns
  private updateEngagementLevel() {
    const currentLevel = this.profile.analyticsData.userEngagementLevel;
    let newLevel: 'low' | 'medium' | 'high' = 'low';

    const timeElapsed = Date.now() - this.profile.analyticsData.conversationStartTime.getTime();
    const minutes = timeElapsed / (1000 * 60);
    const messagesPerMinute = this.messageCount / Math.max(minutes, 0.5);

    if (this.messageCount >= 8 && messagesPerMinute >= 2) {
      newLevel = 'high';
    } else if (this.messageCount >= 4 && messagesPerMinute >= 1) {
      newLevel = 'medium';
    }

    if (newLevel !== currentLevel) {
      this.profile.analyticsData.userEngagementLevel = newLevel;
      if (newLevel !== 'low') {
        this.emitEvent({ type: 'ENGAGEMENT_THRESHOLD', level: newLevel });
      }
    }
  }

  // Check if we should generate a periodic summary
  private shouldGenerateSummary(): boolean {
    if (!this.config.enablePeriodicSummaries) return false;
    
    return this.config.summaryIntervals.some(interval => 
      this.messageCount >= interval && 
      this.lastSummaryMessageCount < interval
    );
  }

  // Generate a periodic summary
  private async generatePeriodicSummary() {
    try {
      const summary = await conversationAnalyzer.generatePeriodicSummary();
      
      if (summary) {
        const summaryData = {
          id: `summary-${Date.now()}`,
          summary,
          generatedAt: new Date(),
          insightCount: this.profile.totalInsights
        };

        // Add to summaries (keeping only the most recent ones)
        this.profile.periodicSummaries.unshift(summaryData);
        if (this.profile.periodicSummaries.length > this.config.maxSummariesStored) {
          this.profile.periodicSummaries = this.profile.periodicSummaries.slice(0, this.config.maxSummariesStored);
        }

        this.lastSummaryMessageCount = this.messageCount;
        
        this.emitEvent({ type: 'SUMMARY_GENERATED', summary });
      }
    } catch (error) {
      console.error('Error generating periodic summary:', error);
    }
  }

  // Check if ready for registration prompt
  private checkRegistrationReadiness() {
    const readiness = conversationAnalyzer.getRegistrationReadiness();
    
    if (readiness.score >= this.config.registrationPromptThreshold) {
      this.emitEvent({ 
        type: 'REGISTRATION_READY', 
        readinessScore: readiness.score, 
        reasons: readiness.reasons 
      });
    }
  }

  // Update analytics data
  private updateAnalytics() {
    const analytics = this.profile.analyticsData;
    
    // Update top interest categories
    const interestCounts = new Map<string, number>();
    this.profile.interests.forEach(interest => {
      interest.relatedTerms.forEach(term => {
        interestCounts.set(term, (interestCounts.get(term) || 0) + 1);
      });
    });
    
    analytics.topInterestCategories = Array.from(interestCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);

    // Update dominant personality traits
    const traitCounts = new Map<string, number>();
    this.profile.preferences.forEach(pref => {
      traitCounts.set(pref.preference, (traitCounts.get(pref.preference) || 0) + 
                     (pref.strength === 'strong' ? 3 : pref.strength === 'moderate' ? 2 : 1));
    });
    
    analytics.dominantPersonalityTraits = Array.from(traitCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([trait]) => trait);

    // Calculate career readiness score
    analytics.careerReadinessScore = this.calculateCareerReadinessScore();

    // Generate next recommended actions
    analytics.nextRecommendedActions = this.generateRecommendedActions();
  }

  // Calculate overall career readiness score
  private calculateCareerReadinessScore(): number {
    let score = 0;
    
    // Base score from insights
    score += Math.min(this.profile.totalInsights * 10, 50);
    
    // Bonus for variety
    if (this.profile.interests.length > 0) score += 10;
    if (this.profile.skills.length > 0) score += 10;
    if (this.profile.preferences.length > 0) score += 10;
    if (this.profile.suggestedPaths.length > 0) score += 15;
    
    // Engagement bonus
    if (this.profile.analyticsData.userEngagementLevel === 'high') score += 15;
    else if (this.profile.analyticsData.userEngagementLevel === 'medium') score += 10;
    
    return Math.min(score, 100);
  }

  // Generate recommended next actions
  private generateRecommendedActions(): string[] {
    const actions: string[] = [];
    
    if (this.profile.interests.length === 0) {
      actions.push("Share what activities you enjoy or find engaging");
    }
    
    if (this.profile.skills.length < 3) {
      actions.push("Discuss your strengths and abilities");
    }
    
    if (this.profile.preferences.length === 0) {
      actions.push("Explore your work environment preferences");
    }
    
    if (this.profile.suggestedPaths.length === 0 && this.profile.totalInsights >= 3) {
      actions.push("Discover potential career paths that match your profile");
    }
    
    if (this.profile.totalInsights >= 5) {
      actions.push("Consider creating an account to save your progress");
    }
    
    return actions.slice(0, 3); // Limit to top 3 recommendations
  }

  // Get current enhanced profile
  public getProfile(): EnhancedCareerProfile {
    return { ...this.profile };
  }

  // Get latest periodic summary
  public getLatestSummary(): string | null {
    return this.profile.periodicSummaries.length > 0 
      ? this.profile.periodicSummaries[0].summary 
      : null;
  }

  // Check if registration should be triggered
  public shouldTriggerRegistration(): boolean {
    return conversationAnalyzer.shouldTriggerRegistration();
  }

  // Get registration readiness details
  public getRegistrationReadiness(): { score: number; reasons: string[] } {
    return conversationAnalyzer.getRegistrationReadiness();
  }

  // Reset profile for new conversation
  public reset() {
    conversationAnalyzer.reset();
    this.profile = this.initializeProfile();
    this.messageCount = 0;
    this.lastSummaryMessageCount = 0;
    
    this.emitEvent({ type: 'PROFILE_UPDATED', profile: this.profile });
  }

  // Export profile data for account creation
  public exportForRegistration(): {
    careerProfile: CareerProfile;
    analyticsSnapshot: any;
    conversationSummaries: string[];
    registrationTriggers: any;
  } {
    return {
      careerProfile: {
        interests: this.profile.interests,
        skills: this.profile.skills,
        preferences: this.profile.preferences,
        suggestedPaths: this.profile.suggestedPaths,
        industries: this.profile.industries,
        totalInsights: this.profile.totalInsights,
        conversationSummary: this.profile.conversationSummary,
        registrationTriggers: this.profile.registrationTriggers
      },
      analyticsSnapshot: this.profile.analyticsData,
      conversationSummaries: this.profile.periodicSummaries.map(s => s.summary),
      registrationTriggers: this.profile.registrationTriggers
    };
  }

  // Load profile data (for registered users)
  public loadProfile(data: any) {
    if (data.careerProfile) {
      this.profile = {
        ...data.careerProfile,
        analyticsData: data.analyticsSnapshot || this.profile.analyticsData,
        periodicSummaries: data.conversationSummaries?.map((summary: string, index: number) => ({
          id: `loaded-${index}`,
          summary,
          generatedAt: new Date(),
          insightCount: 0
        })) || []
      };
      
      this.emitEvent({ type: 'PROFILE_UPDATED', profile: this.profile });
    }
  }
}

// Create and export the global profile builder instance
export const careerProfileBuilder = new CareerProfileBuilder();

// Hook for React components
export const useCareerProfileBuilder = () => {
  return {
    getProfile: () => careerProfileBuilder.getProfile(),
    processMessage: (message: string, role: 'user' | 'assistant') => 
      careerProfileBuilder.processMessage(message, role),
    addEventListener: (handler: ProfileBuilderEventHandler) => 
      careerProfileBuilder.addEventListener(handler),
    removeEventListener: (handler: ProfileBuilderEventHandler) => 
      careerProfileBuilder.removeEventListener(handler),
    shouldTriggerRegistration: () => careerProfileBuilder.shouldTriggerRegistration(),
    getRegistrationReadiness: () => careerProfileBuilder.getRegistrationReadiness(),
    exportForRegistration: () => careerProfileBuilder.exportForRegistration(),
    reset: () => careerProfileBuilder.reset()
  };
};

export default CareerProfileBuilder; 