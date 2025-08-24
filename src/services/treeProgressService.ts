/**
 * TreeProgressService - Converts internal onboarding/persona data to customer-facing tree progress
 * 
 * Maps internal classifications and states to positive, growth-oriented tree visualization data
 * Integrates with persona, onboarding, and career discovery services
 */

import { guestSessionService } from './guestSessionService';
import { personaOnboardingService } from './personaOnboardingService';
import { conversationFlowManager } from './conversationFlowManager';
import { realTimePersonaAdaptationService } from './realTimePersonaAdaptationService';
import { 
  TreeProgressData, 
  TreeProgressStage, 
  CareerOpportunity, 
  ActionableBud, 
  Achievement 
} from '../components/ui/tree-progress-visualization';
import { CompactProgressData } from '../components/ui/compact-progress-indicator';

export interface TreeProgressUpdate {
  data: TreeProgressData;
  changeType: 'stage_progression' | 'opportunities_discovered' | 'actions_ready' | 'achievement_unlocked';
  description: string;
}

/**
 * Service for converting internal system state to customer-facing tree progress visualization
 */
export class TreeProgressService {
  private listeners: Array<(update: TreeProgressUpdate) => void> = [];
  private lastLoggedProgress: number | null = null;

  /**
   * Get current tree progress data based on system state
   */
  getCurrentTreeProgress(): TreeProgressData {

    // Get current onboarding stage and persona state
    const onboardingStage = guestSessionService.getCurrentOnboardingStage();
    const personaSummary = personaOnboardingService.getPersonaSummary();
    const adaptationState = realTimePersonaAdaptationService.getCurrentState();
    const guestSession = guestSessionService.getGuestSession();

    // Map internal stage to customer-facing stage
    const treeStage = this.mapInternalStageToTree(onboardingStage, personaSummary.type);

    // Generate opportunities from career cards
    const opportunities = this.generateOpportunitiesFromCareerCards(guestSession.careerCards || []);

    // Generate action steps from persona recommendations and available data
    const actionSteps = this.generateActionStepsFromInsights(
      personaSummary,
      adaptationState
    );

    // Generate achievements from completed milestones
    const achievements = this.generateAchievementsFromMilestones(guestSession);

    // Extract strength areas from persona and session data
    const strengthAreas = this.extractStrengthAreas(guestSession);

    // Generate next encouraging action
    const nextEncouragingAction = this.generateNextEncouragingAction(
      treeStage,
      personaSummary,
      adaptationState
    );

    const treeData: TreeProgressData = {
      stage: treeStage,
      opportunities,
      actionSteps,
      achievements,
      strengthAreas,
      nextEncouragingAction
    };

    // Only log when progress actually changes to reduce spam
    const currentProgress = Math.round(this.calculateStageProgress(treeStage.internal) * 100);
    if (this.lastLoggedProgress !== currentProgress) {
      console.log('🌳 Progress: ' + currentProgress + '% (' + treeStage.customerLabel + ')');
      this.lastLoggedProgress = currentProgress;
    }

    return treeData;
  }

  /**
   * Get compact progress data for space-constrained UI components
   */
  getCompactProgressData(): CompactProgressData {
    // **NEW: Use ConversationFlowManager for accurate progress**
    const currentPhase = conversationFlowManager.getCurrentPhase();
    
    return {
      stage: {
        customerLabel: currentPhase.description,
        encouragingMessage: this.getEncouragingMessage(currentPhase.phase, currentPhase.progress),
        progress: currentPhase.progress
      },
      stats: {
        opportunities: this.getOpportunityCount(),
        readyActions: this.getReadyActionCount(), 
        achievements: this.getAchievementCount(),
        strengths: this.getStrengthCount()
      },
      nextAction: this.getNextEncouragingAction(currentPhase.phase)
    };
  }

  /**
   * LEGACY: Calculate numerical progress based on stage, with structured onboarding override
   * This method is kept for backward compatibility but new code should use conversationFlowManager
   */
  private calculateStageProgress(stage: string): number {
    // First check if structured onboarding is active
    const guestSession = guestSessionService.getGuestSession();
    const structuredOnboarding = guestSession.structuredOnboarding;
    
    // Throttled progress logging - details logged in getCurrentTreeProgress when progress changes
    
    if (structuredOnboarding && structuredOnboarding.responses && structuredOnboarding.responses.length > 0) {
      // Use structured questionnaire progress only if user is actively using it
      return this.calculateStructuredOnboardingProgress(structuredOnboarding);
    }
    
    // If structured onboarding exists but has no responses, it means user is in tool-based conversation
    // Fall through to tool-based progress calculation
    
    // For conversations using tool-based approach (not structured onboarding)
    // Calculate progress based on conversation activity and career exploration
    const conversationHistory = guestSession.conversationHistory || [];
    const messageCount = conversationHistory.length;
    const userMessageCount = conversationHistory.filter(m => m && m.role === 'user').length;
    const hasCareerCards = guestSession.careerCards && guestSession.careerCards.length > 0;
    const hasPersonaProfile = !!guestSession.personaProfile;
    const isComplete = guestSession.onboardingStage === 'complete';
    
    // Safety logging (only when unexpected values found)
    if (structuredOnboarding && structuredOnboarding.responses?.length === 0 && userMessageCount > 0) {
      console.log('💭 Tool-based conversation detected (structured onboarding exists but unused):', {
        userMessages: userMessageCount,
        hasCards: hasCareerCards,
        hasPersona: hasPersonaProfile
      });
    }
    
    // Fresh accounts always start at 0%
    if (userMessageCount === 0 && !isComplete) {
      return 0.0;
    }
    
    // Progressive advancement based on conversation engagement and career exploration
    let progress = 0.0;
    
    // Initial engagement (10-30%)
    if (userMessageCount >= 1) progress = Math.max(progress, 0.1);   // 10% - Started conversation
    if (userMessageCount >= 2) progress = Math.max(progress, 0.2);   // 20% - Engaged in dialogue
    if (userMessageCount >= 3) progress = Math.max(progress, 0.3);   // 30% - Active participation
    
    // Career exploration phase (40-70%)
    if (userMessageCount >= 5) progress = Math.max(progress, 0.4);   // 40% - Sustained engagement
    if (hasCareerCards || userMessageCount >= 7) progress = Math.max(progress, 0.5);   // 50% - Career exploration
    if (hasPersonaProfile) progress = Math.max(progress, 0.6);        // 60% - Persona identified
    if (userMessageCount >= 10) progress = Math.max(progress, 0.7);  // 70% - Deep conversation
    
    // Completion phase (80-100%)
    if (userMessageCount >= 15 || (hasCareerCards && hasPersonaProfile)) {
      progress = Math.max(progress, 0.8);  // 80% - Comprehensive exploration
    }
    if (isComplete) progress = 1.0;  // 100% - Journey complete
    
    return Math.min(progress, 1.0);  // Cap at 100%
  }
  
  /**
   * Helper methods for new phase-aware progress system
   */
  private getEncouragingMessage(phase: 'onboarding' | 'career_conversation', progress: number): string {
    if (phase === 'onboarding') {
      if (progress < 0.2) return "Let's get to know you better!";
      if (progress < 0.4) return "Great start! Keep sharing.";
      return "Almost there! Just a few more questions.";
    } else {
      if (progress < 0.7) return "Exploring your career possibilities!";
      if (progress < 0.9) return "Discovering great matches for you!";
      return "Your personalized career journey is ready!";
    }
  }
  
  private getOpportunityCount(): number {
    const guestSession = guestSessionService.getGuestSession();
    const hasCareerCards = guestSession.careerCards && guestSession.careerCards.length > 0;
    const hasPersonaProfile = !!guestSession.personaProfile;
    const currentPhase = conversationFlowManager.getCurrentPhase();
    
    // Fresh users (no conversation yet) should show 0 opportunities
    if (currentPhase.phase === 'onboarding' && currentPhase.progress === 0) {
      return 0;
    }
    
    return hasCareerCards ? guestSession.careerCards.length : (hasPersonaProfile ? 2 : 1);
  }
  
  private getReadyActionCount(): number {
    const currentPhase = conversationFlowManager.getCurrentPhase();
    if (currentPhase.phase === 'onboarding') return 0;
    
    const guestSession = guestSessionService.getGuestSession();
    const userMessageCount = guestSession.conversationHistory?.filter(m => m.role === 'user').length || 0;
    return Math.min(Math.floor(userMessageCount / 3), 5); // 1 ready action per 3 user messages, max 5
  }
  
  private getAchievementCount(): number {
    const guestSession = guestSessionService.getGuestSession();
    const structuredOnboarding = guestSession.structuredOnboarding;
    
    let achievements = 0;
    if (structuredOnboarding?.responses && structuredOnboarding.responses.length > 0) achievements += 1; // Started assessment
    if (structuredOnboarding?.isComplete) achievements += 1; // Completed assessment
    if (guestSession.careerCards && guestSession.careerCards.length > 0) achievements += 1; // Career exploration
    
    return achievements;
  }
  
  private getStrengthCount(): number {
    const guestSession = guestSessionService.getGuestSession();
    const personaProfile = guestSession.personaProfile;
    const currentPhase = conversationFlowManager.getCurrentPhase();
    
    // Fresh users (no conversation yet) should show 0 strengths
    if (currentPhase.phase === 'onboarding' && currentPhase.progress === 0) {
      return 0;
    }
    
    // Base strengths from starting engagement  
    let strengths = 1; // Default: curious (reduced from 2)
    
    // Add strengths based on conversation depth
    const userMessageCount = guestSession.conversationHistory?.filter(m => m.role === 'user').length || 0;
    if (userMessageCount >= 2) strengths += 1; // engaged in conversation
    if (userMessageCount >= 5) strengths += 1; // communicative
    if (userMessageCount >= 10) strengths += 1; // highly engaged
    if (personaProfile) strengths += 1; // self-aware
    
    return Math.min(strengths, 8); // Cap at 8 strengths
  }
  
  private getNextEncouragingAction(phase: 'onboarding' | 'career_conversation'): string {
    if (phase === 'onboarding') {
      return "Continue sharing about your situation";
    } else {
      const actions = [
        "Explore career recommendations",
        "Discuss your interests further",
        "Validate career options",
        "Plan next steps"
      ];
      return actions[Math.floor(Math.random() * actions.length)];
    }
  }

  /**
   * Calculate progress based on structured questionnaire completion
   */
  private calculateStructuredOnboardingProgress(structuredOnboarding: any): number {
    if (structuredOnboarding.isComplete) {
      return 1.0; // 100% when complete
    }
    
    // Calculate progress based on completed responses
    const totalQuestions = 6; // Q1-Q6 in the structured flow (some conditional)
    const completedResponses = structuredOnboarding.responses?.length || 0;
    
    // Start at 0%, increment by 20% for each completed question
    const progress = completedResponses / totalQuestions;
    
    // Progress logging handled in main method to reduce verbosity
    
    return Math.max(0, Math.min(1, progress)); // Clamp between 0-1
  }

  /**
   * Map internal onboarding stage and persona to customer-facing tree stage
   * CRITICAL: This ensures real-time progression during conversations
   */
  private mapInternalStageToTree(onboardingStage: string, personaType?: string): TreeProgressStage {
    // Base mapping from onboarding stage
    const baseStageMapping: Record<string, string> = {
      'initial': 'seed',
      'name_collected': 'sprouting',
      'situation_understood': 'sapling',
      'direction_explored': 'young_tree',
      'persona_classified': 'branching',
      'careers_discovered': 'budding',
      'actions_identified': 'fruiting'
    };

    // Enhanced mapping based on persona type for more nuanced progression
    let treeStageInternal = baseStageMapping[onboardingStage] || 'seed';

    // Get current session state for more dynamic progression
    const guestSession = guestSessionService.getGuestSession();
    const messageCount = guestSession.engagementMetrics?.messageCount || 0;
    const hasCareerCards = guestSession.careerCards && guestSession.careerCards.length > 0;

    // Check if structured onboarding is active - if so, map based on questionnaire progress
    const structuredOnboarding = guestSession.structuredOnboarding;
    
    if (structuredOnboarding) {
      if (structuredOnboarding.isComplete) {
        // Structured onboarding is complete - move to career exploration
        treeStageInternal = 'branching';
      } else {
        // During structured onboarding, advance stage based on question completion
        const responseCount = structuredOnboarding.responses?.length || 0;
        if (responseCount === 0) {
          treeStageInternal = 'seed'; // Just started
        } else if (responseCount <= 2) {
          treeStageInternal = 'sprouting'; // Early questions answered
        } else if (responseCount <= 4) {
          treeStageInternal = 'sapling'; // Most questions answered
        } else {
          treeStageInternal = 'young_tree'; // Almost complete
        }
      }
    } else {
      // Legacy dynamic progression for non-structured flows
      if (messageCount >= 3 && treeStageInternal === 'seed') {
        treeStageInternal = 'sprouting'; // User is engaging
      }
      
      if (messageCount >= 5 && treeStageInternal === 'sprouting') {
        treeStageInternal = 'sapling'; // Sustained engagement
      }
      
      if (hasCareerCards && treeStageInternal === 'sapling') {
        treeStageInternal = 'young_tree'; // Career exploration happening
      }
    }

    // Adjust based on persona confidence and type
    if (personaType) {
      const personaSummary = personaOnboardingService.getPersonaSummary();
      const confidence = typeof personaSummary.confidence === 'number' ? personaSummary.confidence : 0;

      if (onboardingStage === 'direction_explored' && confidence > 0.7) {
        treeStageInternal = 'branching'; // Move faster if high confidence
      }
      
      if (onboardingStage === 'persona_classified' && confidence > 0.8) {
        treeStageInternal = 'budding'; // Move to action-ready state
      }
    }

    return this.getCustomerFacingStage(treeStageInternal);
  }

  /**
   * Get customer-facing stage information with positive framing
   */
  private getCustomerFacingStage(internalStage: string): TreeProgressStage {
    const stageMapping: Record<string, TreeProgressStage> = {
      'seed': {
        internal: 'seed',
        customerLabel: 'Starting Your Journey',
        encouragingMessage: 'Every great career begins with curiosity - you\'re in the perfect place to discover what excites you!',
        subtitle: 'Planting seeds of possibility',
        visualTheme: 'curious-exploration'
      },
      'sprouting': {
        internal: 'sprouting',
        customerLabel: 'Growing Understanding',
        encouragingMessage: 'Great! We\'re building your foundation and learning what makes you unique.',
        subtitle: 'Your potential is taking root',
        visualTheme: 'curious-exploration'
      },
      'sapling': {
        internal: 'sapling',
        customerLabel: 'Exploring Possibilities',
        encouragingMessage: 'You\'re thoughtfully discovering areas that match your interests and values.',
        subtitle: 'Branching out with confidence',
        visualTheme: 'broad-growth'
      },
      'young_tree': {
        internal: 'young_tree',
        customerLabel: 'Building Your Vision',
        encouragingMessage: 'You\'re developing clarity about your strengths and direction - excellent progress!',
        subtitle: 'Growing stronger every day',
        visualTheme: 'broad-growth'
      },
      'branching': {
        internal: 'branching',
        customerLabel: 'Discovering Opportunities',
        encouragingMessage: 'Look at all these exciting possibilities opening up for you!',
        subtitle: 'Multiple paths await your exploration',
        visualTheme: 'focused-development'
      },
      'budding': {
        internal: 'budding',
        customerLabel: 'Preparing for Action',
        encouragingMessage: 'You\'re ready to make things happen - your next steps are crystal clear!',
        subtitle: 'Action opportunities blooming',
        visualTheme: 'focused-development'
      },
      'fruiting': {
        internal: 'fruiting',
        customerLabel: 'Achieving Your Goals',
        encouragingMessage: 'Amazing progress! You\'re turning insights into real achievements!',
        subtitle: 'Celebrating your growth and success',
        visualTheme: 'confident-action'
      }
    };
    
    return stageMapping[internalStage] || stageMapping.seed;
  }

  /**
   * Generate career opportunities from career cards
   */
  private generateOpportunitiesFromCareerCards(careerCards: any[]): CareerOpportunity[] {
    return careerCards.map((card, index) => ({
      id: card.id || `opportunity-${index}`,
      title: card.title || card.career || 'Career Opportunity',
      strength: Math.min(1, (card.match_score || 0.5) + 0.2), // Boost strength slightly
      actionSteps: this.generateActionStepsFromCareerCard(card),
      discovered: true
    }));
  }

  /**
   * Generate action steps from a specific career card
   */
  private generateActionStepsFromCareerCard(careerCard: any): ActionableBud[] {
    const steps: ActionableBud[] = [];
    
    // Generate steps from career card data
    if (careerCard.skills && careerCard.skills.length > 0) {
      steps.push({
        id: `skill-${careerCard.id}-1`,
        action: `Develop ${careerCard.skills[0]} skills`,
        type: 'skill',
        readiness: 0.8,
        completed: false
      });
    }

    if (careerCard.educationLevel) {
      steps.push({
        id: `education-${careerCard.id}`,
        action: `Explore ${careerCard.educationLevel} programs`,
        type: 'education',
        readiness: 0.6,
        completed: false
      });
    }

    if (careerCard.nextSteps && careerCard.nextSteps.length > 0) {
      steps.push({
        id: `action-${careerCard.id}`,
        action: careerCard.nextSteps[0],
        type: 'experience',
        readiness: 0.9,
        completed: false
      });
    }

    return steps;
  }

  /**
   * Generate action steps from persona recommendations and session data
   */
  private generateActionStepsFromInsights(
    personaSummary: any,
    adaptationState: any
  ): ActionableBud[] {
    const steps: ActionableBud[] = [];

    // Add persona-specific recommendations
    if (personaSummary.hasPersona) {
      const personaSteps = this.getPersonaSpecificActionSteps(personaSummary.type);
      steps.push(...personaSteps);
    }

    // Add adaptation-specific recommendations
    if (adaptationState) {
      const adaptationSteps = this.getAdaptationActionSteps(adaptationState);
      steps.push(...adaptationSteps);
    }

    return steps;
  }

  /**
   * Get persona-specific action steps with positive framing
   * CRITICAL: Never expose internal persona classifications to users
   */
  private getPersonaSpecificActionSteps(personaType: string): ActionableBud[] {
    // Map internal classifications to customer-facing action recommendations
    const getCustomerFacingActions = (internalType: string): ActionableBud[] => {
      switch (internalType) {
        case 'uncertain_unengaged':
        case 'exploring_undecided':
          return [
            {
              id: 'explore-interests-deep',
              action: 'Discover what genuinely interests you',
              type: 'experience',
              readiness: 0.9,
              completed: false
            },
            {
              id: 'compare-options',
              action: 'Explore different career possibilities',
              type: 'skill',
              readiness: 0.8,
              completed: false
            }
          ];
        
        case 'tentatively_decided':
          return [
            {
              id: 'validate-choice',
              action: 'Research your chosen career path',
              type: 'education',
              readiness: 0.9,
              completed: false
            },
            {
              id: 'skill-development',
              action: 'Identify key skills to develop',
              type: 'skill',
              readiness: 0.8,
              completed: false
            }
          ];
        
        case 'focused_confident':
          return [
            {
              id: 'take-action',
              action: 'Take your first concrete step',
              type: 'experience',
              readiness: 0.95,
              completed: false
            },
            {
              id: 'network-build',
              action: 'Connect with professionals in your field',
              type: 'experience',
              readiness: 0.85,
              completed: false
            }
          ];
        
        default:
          return [
            {
              id: 'general-exploration',
              action: 'Continue exploring your career interests',
              type: 'experience',
              readiness: 0.7,
              completed: false
            }
          ];
      }
    };

    return getCustomerFacingActions(personaType);
  }

  /**
   * Get adaptation-specific action steps
   */
  private getAdaptationActionSteps(adaptationState: any): ActionableBud[] {
    const steps: ActionableBud[] = [];

    if (adaptationState.adaptationContext?.nextRecommendedActions) {
      adaptationState.adaptationContext.nextRecommendedActions.forEach((action: string, index: number) => {
        steps.push({
          id: `adaptation-${index}`,
          action: action,
          type: 'skill',
          readiness: 0.7,
          completed: false
        });
      });
    }

    return steps;
  }

  /**
   * Generate achievements from completed milestones
   */
  private generateAchievementsFromMilestones(guestSession: any): Achievement[] {
    const achievements: Achievement[] = [];

    // Achievement for completing profile information
    if (guestSession.profileData?.name) {
      achievements.push({
        id: 'profile-started',
        title: 'Profile Created',
        description: 'You\'ve shared your background and started your journey',
        type: 'milestone',
        completedAt: new Date().toISOString(),
        celebrated: true
      });
    }

    // Achievement for career cards generated
    if (guestSession.careerCards && guestSession.careerCards.length > 0) {
      achievements.push({
        id: 'careers-discovered',
        title: 'Careers Discovered',
        description: `You've discovered ${guestSession.careerCards.length} potential career paths`,
        type: 'insight',
        completedAt: new Date().toISOString(),
        celebrated: false
      });
    }

    // Achievement for conversation engagement
    const messageCount = guestSession.engagementMetrics?.messageCount || 0;
    
    if (messageCount > 5) {
      achievements.push({
        id: 'engagement-champion',
        title: 'Conversation Explorer',
        description: `You've shared ${messageCount} messages in our conversation`,
        type: 'insight',
        completedAt: new Date().toISOString(),
        celebrated: false
      });
    }

    return achievements;
  }

  /**
   * Extract strength areas from session data and persona
   */
  private extractStrengthAreas(guestSession: any): string[] {
    const strengths: string[] = [];

    // Extract from persona profile if available
    if (guestSession.personaProfile?.recommendations?.focusAreas) {
      strengths.push(...guestSession.personaProfile.recommendations.focusAreas.slice(0, 3));
    }

    // Extract from person profile if available
    if (guestSession.personProfile?.values) {
      strengths.push(...guestSession.personProfile.values.slice(0, 2));
    }

    // Fallback to default strengths based on persona type
    if (strengths.length === 0) {
      const personaSummary = personaOnboardingService.getPersonaSummary();
      if (personaSummary.hasPersona) {
        strengths.push('Self-awareness', 'Growth mindset', 'Career exploration');
      }
    }

    return strengths;
  }

  /**
   * Generate encouraging next action based on current state
   */
  private generateNextEncouragingAction(
    stage: TreeProgressStage,
    personaSummary: any,
    adaptationState: any
  ): string | undefined {
    // Stage-based encouragements
    const stageActions: Record<string, string> = {
      'seed': 'Tell me about what interests you most!',
      'sprouting': 'Share more about your background and goals',
      'sapling': 'Explore the career areas that excite you',
      'young_tree': 'Let\'s discover specific opportunities for you',
      'branching': 'Choose a career path to explore in detail',
      'budding': 'Take your first concrete step forward',
      'fruiting': 'Celebrate your progress and plan your next milestone!'
    };

    let action = stageActions[stage.internal];

    // Personalize based on persona
    if (personaSummary.hasPersona && adaptationState?.adaptationContext?.nextRecommendedActions) {
      const adaptationActions = adaptationState.adaptationContext.nextRecommendedActions;
      if (adaptationActions.length > 0) {
        action = adaptationActions[0]; // Use most relevant recommendation
      }
    }

    return action;
  }

  /**
   * Subscribe to progress updates
   */
  onProgressUpdate(listener: (update: TreeProgressUpdate) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify listeners of progress changes
   */
  private notifyProgressUpdate(update: TreeProgressUpdate): void {
    this.listeners.forEach(listener => {
      try {
        listener(update);
      } catch (error) {
        console.error('Error in tree progress listener:', error);
      }
    });
  }

  /**
   * Trigger progress update when system state changes
   */
  checkForProgressUpdates(): void {
    const currentData = this.getCurrentTreeProgress();
    
    // This would be called by other services when significant changes occur
    const update: TreeProgressUpdate = {
      data: currentData,
      changeType: 'stage_progression',
      description: `Progress updated to ${currentData.stage.customerLabel}`
    };

    this.notifyProgressUpdate(update);
  }

  /**
   * CRITICAL: Trigger real-time progress updates during conversations
   * Call this method when conversation events occur to ensure live updates
   */
  triggerRealTimeUpdate(eventType: 'message_sent' | 'career_cards_generated' | 'persona_classified' | 'engagement_milestone'): void {
    // Real-time update triggered (reduced logging)
    
    const currentData = this.getCurrentTreeProgress();
    
    // Determine change type based on event
    let changeType: 'stage_progression' | 'opportunities_discovered' | 'actions_ready' | 'achievement_unlocked' = 'stage_progression';
    let description = '';
    
    switch (eventType) {
      case 'message_sent':
        changeType = 'stage_progression';
        description = `Conversation progressing: ${currentData.stage.customerLabel}`;
        break;
      case 'career_cards_generated':
        changeType = 'opportunities_discovered';
        description = `New career opportunities discovered: ${currentData.opportunities.length} paths available`;
        break;
      case 'persona_classified':
        changeType = 'actions_ready';
        description = `Personalized recommendations ready: ${currentData.actionSteps.filter(a => a.readiness > 0.7).length} action steps`;
        break;
      case 'engagement_milestone':
        changeType = 'achievement_unlocked';
        description = `Engagement milestone reached: ${currentData.achievements.length} achievements unlocked`;
        break;
    }
    
    const update: TreeProgressUpdate = {
      data: currentData,
      changeType,
      description
    };

    this.notifyProgressUpdate(update);
  }
}

// Export singleton instance
export const treeProgressService = new TreeProgressService();