/**
 * Enhanced Conversation Manager
 * 
 * Integrates the new objective-based conversation system with the existing infrastructure
 * Provides backward compatibility while enabling dynamic prompt optimization
 */

import { guestSessionService } from './guestSessionService';
import { promptCache } from './realtimePromptCache';
import { objectiveEvaluator } from './objectiveEvaluationEngine';
import { 
  ConversationState, 
  ConversationObjective, 
  ConversationTree
} from '../types/ConversationObjectives';
import { ConversationFlowManager } from './conversationFlowManager';

export interface EnhancedConversationPhase {
  currentObjectiveId: string;
  currentTreeId: string;
  phase: 'onboarding' | 'exploration' | 'analysis' | 'completed';
  progress: number;
  description: string;
  isObjectiveDriven: boolean;
  fallbackToLegacy: boolean;
}

export class EnhancedConversationManager {
  private static instance: EnhancedConversationManager;
  private legacyManager: ConversationFlowManager;
  
  // Feature flag for gradual rollout
  private readonly ENABLE_OBJECTIVE_SYSTEM = true;
  private readonly FALLBACK_ON_ERROR = true;

  private constructor() {
    this.legacyManager = new ConversationFlowManager();
  }

  public static getInstance(): EnhancedConversationManager {
    if (!EnhancedConversationManager.instance) {
      EnhancedConversationManager.instance = new EnhancedConversationManager();
    }
    return EnhancedConversationManager.instance;
  }

  /**
   * Get current conversation phase with objective system
   */
  public async getCurrentPhase(): Promise<EnhancedConversationPhase> {
    try {
      if (!this.ENABLE_OBJECTIVE_SYSTEM) {
        return this.getLegacyPhase();
      }

      const conversationState = await this.buildConversationState();
      
      // If no active tree/objective, start with default
      if (!conversationState.currentTreeId || !conversationState.currentObjectiveId) {
        await this.initializeDefaultFlow(conversationState);
      }

      const currentObjective = await promptCache.getObjective(conversationState.currentObjectiveId);
      if (!currentObjective) {
        console.warn('⚠️ [ENHANCED MANAGER] Objective not found, falling back to legacy');
        return this.getLegacyPhase();
      }

      return {
        currentObjectiveId: conversationState.currentObjectiveId,
        currentTreeId: conversationState.currentTreeId,
        phase: this.mapObjectiveCategoryToPhase(currentObjective.category),
        progress: this.calculateProgress(conversationState, currentObjective),
        description: this.generatePhaseDescription(currentObjective, conversationState),
        isObjectiveDriven: true,
        fallbackToLegacy: false
      };

    } catch (error) {
      console.error('❌ [ENHANCED MANAGER] Error getting current phase:', error);
      
      if (this.FALLBACK_ON_ERROR) {
        return this.getLegacyPhase();
      }
      throw error;
    }
  }

  /**
   * Generate system prompt using objective system
   */
  public async generateSystemPrompt(): Promise<string> {
    try {
      if (!this.ENABLE_OBJECTIVE_SYSTEM) {
        return this.legacyManager.getPhaseSystemPrompt();
      }

      const conversationState = await this.buildConversationState();
      
      if (!conversationState.currentObjectiveId) {
        await this.initializeDefaultFlow(conversationState);
      }

      const promptData = await promptCache.generateSystemPrompt(
        conversationState.currentObjectiveId,
        conversationState
      );

      if (!promptData) {
        console.warn('⚠️ [ENHANCED MANAGER] No prompt data, falling back to legacy');
        return this.legacyManager.getPhaseSystemPrompt();
      }

      console.log(`🎯 [ENHANCED MANAGER] Generated objective-driven prompt:`, {
        objectiveId: conversationState.currentObjectiveId,
        promptLength: promptData.systemPrompt.length,
        variableCount: Object.keys(promptData.dynamicVariables).length
      });

      return promptData.systemPrompt;

    } catch (error) {
      console.error('❌ [ENHANCED MANAGER] Error generating system prompt:', error);
      
      if (this.FALLBACK_ON_ERROR) {
        return this.legacyManager.getPhaseSystemPrompt();
      }
      throw error;
    }
  }

  /**
   * Process user message and evaluate objective completion
   */
  public async processUserMessage(userMessage: string): Promise<{
    shouldTransition: boolean;
    nextObjectiveId?: string;
    evaluation: any | null;
    systemPrompt: string;
  }> {
    try {
      if (!this.ENABLE_OBJECTIVE_SYSTEM) {
        return {
          shouldTransition: false,
          systemPrompt: this.legacyManager.getPhaseSystemPrompt(),
          evaluation: null
        };
      }

      const conversationState = await this.buildConversationState();
      
      // Ensure state is properly initialized before processing
      if (!conversationState.currentObjectiveId || !conversationState.currentTreeId) {
        await this.initializeDefaultFlow(conversationState);
      }
      
      // Update state with latest user message
      conversationState.lastUserMessage = userMessage;
      conversationState.conversationHistory.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
        objectiveId: conversationState.currentObjectiveId
      });

      // Evaluate current objective (only if we have a valid objective ID)
      let evaluation: any = null;
      if (conversationState.currentObjectiveId) {
        evaluation = await objectiveEvaluator.evaluateObjective(
          conversationState.currentObjectiveId,
          conversationState,
          userMessage
        );
      }

      let shouldTransition = false;
      let nextObjectiveId: string | undefined;

      // Check if we should transition (only if evaluation was successful)
      if (evaluation && (evaluation.isComplete || evaluation.recommendedAction === 'transition' || evaluation.recommendedAction === 'escalate')) {
        console.log('🔄 [ENHANCED MANAGER] Triggering transition evaluation:', {
          currentObjective: conversationState.currentObjectiveId,
          evaluationResult: evaluation.recommendedAction,
          isComplete: evaluation.isComplete
        });

        const transitionDecision = await objectiveEvaluator.evaluateTransition(
          conversationState.currentObjectiveId,
          conversationState,
          userMessage
        );

        shouldTransition = transitionDecision.shouldTransition;
        nextObjectiveId = transitionDecision.targetObjectiveId || undefined;

        console.log('🎯 [ENHANCED MANAGER] Transition decision:', {
          shouldTransition,
          nextObjectiveId,
          reason: transitionDecision.reason
        });

        if (shouldTransition) {
          // Derive a fallback next objective if the tree didn't supply one
          let resolvedNext = nextObjectiveId;
          if (!resolvedNext) {
            const linearOrder = [
              'establish_rapport_collect_name',
              'discover_current_situation',
              'identify_concerns_goals',
              'explore_interests_strengths',
              'provide_pathways_guidance',
              'generate_career_cards',
              'follow_up_next_steps'
            ];

            const currentIndex = linearOrder.indexOf(conversationState.currentObjectiveId);
            if (currentIndex >= 0 && currentIndex < linearOrder.length - 1) {
              resolvedNext = linearOrder[currentIndex + 1];
            }
          }

          if (resolvedNext) {
            await this.transitionToObjective(resolvedNext, conversationState);
          } else {
            console.warn('⚠️ [ENHANCED MANAGER] Transition recommended but no next objective resolved; staying on current objective.');
          }
        }
      }

      // Generate system prompt for current or new objective
      const systemPrompt = await this.generateSystemPrompt();

      // Update guest session with new state
      await this.saveConversationState(conversationState);

      console.log(`🔄 [ENHANCED MANAGER] Processed message:`, {
        objectiveId: conversationState.currentObjectiveId,
        isComplete: evaluation?.isComplete || false,
        shouldTransition,
        nextObjectiveId,
        confidence: evaluation ? Math.round(evaluation.confidence * 100) : 0
      });

      return {
        shouldTransition,
        nextObjectiveId,
        evaluation,
        systemPrompt
      };

    } catch (error) {
      console.error('❌ [ENHANCED MANAGER] Error processing user message:', error);
      
      if (this.FALLBACK_ON_ERROR) {
        return {
          shouldTransition: false,
          systemPrompt: this.legacyManager.getPhaseSystemPrompt(),
          evaluation: null
        };
      }
      throw error;
    }
  }

  /**
   * Get dynamic variables for agent context
   */
  public async getDynamicVariables(): Promise<Record<string, string>> {
    try {
      if (!this.ENABLE_OBJECTIVE_SYSTEM) {
        return this.legacyManager.getDynamicVariablesForAgent();
      }

      const conversationState = await this.buildConversationState();
      
      // Ensure state is properly initialized
      if (!conversationState.currentObjectiveId || !conversationState.currentTreeId) {
        await this.initializeDefaultFlow(conversationState);
        await this.saveConversationState(conversationState);
      }
      
      const currentObjective = await promptCache.getObjective(conversationState.currentObjectiveId);
      
      if (!currentObjective) {
        return this.legacyManager.getDynamicVariablesForAgent();
      }

      return {
        current_objective: currentObjective.purpose,
        objective_category: currentObjective.category,
        exchange_count: conversationState.exchangeCount.toString(),
        data_collected: Object.keys(conversationState.dataCollected).join(', '),
        user_persona: conversationState.userPersona || 'unknown',
        progress_percent: Math.round(this.calculateProgress(conversationState, currentObjective) * 100).toString(),
        tree_id: conversationState.currentTreeId,
        completion_confidence: Math.round((conversationState.confidenceScores.overall || 0) * 100).toString()
      };

    } catch (error) {
      console.error('❌ [ENHANCED MANAGER] Error getting dynamic variables:', error);
      return this.legacyManager.getDynamicVariablesForAgent();
    }
  }

  /**
   * Check if career tools should be enabled for current objective
   */
  public async shouldEnableCareerTools(): Promise<boolean> {
    try {
      if (!this.ENABLE_OBJECTIVE_SYSTEM) {
        return this.legacyManager.shouldEnableCareerTools();
      }

      const conversationState = await this.buildConversationState();
      
      // Ensure state is properly initialized
      if (!conversationState.currentObjectiveId || !conversationState.currentTreeId) {
        await this.initializeDefaultFlow(conversationState);
        await this.saveConversationState(conversationState);
      }
      
      const currentObjective = await promptCache.getObjective(conversationState.currentObjectiveId);
      
      if (!currentObjective) {
        return this.legacyManager.shouldEnableCareerTools();
      }

      // Enable tools based on objective category
      return ['exploration', 'analysis'].includes(currentObjective.category) || 
             conversationState.exchangeCount >= 3;

    } catch (error) {
      console.error('❌ [ENHANCED MANAGER] Error checking tool enablement:', error);
      return this.legacyManager.shouldEnableCareerTools();
    }
  }

  /**
   * Build conversation state from guest session
   */
  private async buildConversationState(): Promise<ConversationState> {
    const guestSession = guestSessionService.getGuestSession();
    const personProfile: any = guestSession.personProfile || {};
    const conversationHistory = guestSession.conversationHistory || [];

    // Try to get existing state or create new one
    const existingState = (guestSession as any).objectiveState;
    
    if (existingState) {
      // Update with latest data
      existingState.exchangeCount = conversationHistory.filter(msg => msg.role === 'user').length;
      existingState.lastUserMessage = conversationHistory
        .filter(msg => msg.role === 'user')
        .slice(-1)[0]?.content || '';
      
      return existingState;
    }

    // Create new conversation state
    const newState: ConversationState = {
      currentObjectiveId: '', // Will be set by initializeDefaultFlow
      currentTreeId: '',      // Will be set by initializeDefaultFlow
      startTime: new Date(),
      completedObjectives: [],
      dataCollected: {
        name: personProfile.name || null,
        life_stage: personProfile.lifeStage || null,
        interests: personProfile.interests || [],
        skills: personProfile.skills || [],
        goals: personProfile.goals || [],
        career_direction: personProfile.careerDirection || null
      },
      confidenceScores: {},
      exchangeCount: conversationHistory.filter(msg => msg.role === 'user').length,
      userPersona: guestSession.structuredOnboarding?.tentativePersona,
      lastUserMessage: conversationHistory
        .filter(msg => msg.role === 'user')
        .slice(-1)[0]?.content || '',
      conversationHistory: conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        objectiveId: '' // Will be populated as we go
      })),
      objectiveTimings: {},
      transitionReasons: {}
    };

    return newState;
  }

  /**
   * Initialize default conversation flow
   */
  private async initializeDefaultFlow(state: ConversationState): Promise<void> {
    const defaultTree = await promptCache.getDefaultTree();
    
    if (!defaultTree) {
      throw new Error('No default conversation tree found');
    }

    state.currentTreeId = defaultTree.id;
    state.currentObjectiveId = defaultTree.rootObjectiveId;
    
    console.log(`🚀 [ENHANCED MANAGER] Initialized default flow:`, {
      treeId: defaultTree.id,
      rootObjective: defaultTree.rootObjectiveId
    });
  }

  /**
   * Transition to new objective
   */
  private async transitionToObjective(
    objectiveId: string, 
    state: ConversationState
  ): Promise<void> {
    const previousObjective = state.currentObjectiveId;
    
    // Mark previous objective as completed
    if (previousObjective && !state.completedObjectives.includes(previousObjective)) {
      state.completedObjectives.push(previousObjective);
    }

    // Update to new objective
    state.currentObjectiveId = objectiveId;
    state.transitionReasons[objectiveId] = `Completed ${previousObjective}`;

    console.log(`🔄 [ENHANCED MANAGER] Transitioned: ${previousObjective} → ${objectiveId}`);
  }

  /**
   * Save conversation state back to guest session
   */
  private async saveConversationState(state: ConversationState): Promise<void> {
    // Update guest session with objective state using the correct method
    guestSessionService.updateSession({
      ...(guestSessionService as any),
    } as any);
    
    // Sync data back to person profile
    if (state.dataCollected.name) {
      const profileUpdate = {
        name: state.dataCollected.name as string,
        lifeStage: state.dataCollected.life_stage as string,
        interests: Array.isArray(state.dataCollected.interests) ? state.dataCollected.interests as string[] : [],
        skills: Array.isArray(state.dataCollected.skills) ? state.dataCollected.skills as string[] : [],
        goals: Array.isArray(state.dataCollected.goals) ? state.dataCollected.goals as string[] : [],
        careerDirection: state.dataCollected.career_direction as string,
        values: [],
        workStyle: [],
        careerStage: 'exploring',
        lastUpdated: new Date().toISOString()
      };
      
      guestSessionService.updatePersonProfile(profileUpdate as any);
    }
  }

  /**
   * Get legacy phase for fallback
   */
  private getLegacyPhase(): EnhancedConversationPhase {
    const legacyPhase = this.legacyManager.getCurrentPhase();
    
    return {
      currentObjectiveId: 'legacy',
      currentTreeId: 'legacy',
      phase: legacyPhase.phase === 'career_conversation' ? 'exploration' : 'onboarding',
      progress: legacyPhase.progress,
      description: legacyPhase.description,
      isObjectiveDriven: false,
      fallbackToLegacy: true
    };
  }

  /**
   * Map objective category to conversation phase
   */
  private mapObjectiveCategoryToPhase(category: string): 'onboarding' | 'exploration' | 'analysis' | 'completed' {
    switch (category) {
      case 'onboarding':
        return 'onboarding';
      case 'exploration':
        return 'exploration';
      case 'analysis':
        return 'analysis';
      default:
        return 'onboarding';
    }
  }

  /**
   * Calculate overall progress through conversation tree
   */
  private calculateProgress(state: ConversationState, objective: ConversationObjective): number {
    // Progress based on completed objectives + current objective progress
    const totalObjectives = 6; // Number of objectives in default tree
    const completedCount = state.completedObjectives.length;
    
    // Add partial progress for current objective using averageExchanges from Firebase
    const targetExchanges = (objective as any).averageExchanges || 3; // Fallback to 3 if not available
    const currentProgress = Math.min(
      state.exchangeCount / targetExchanges, 
      1
    );
    
    return (completedCount + currentProgress) / totalObjectives;
  }

  /**
   * Generate phase description
   */
  private generatePhaseDescription(
    objective: ConversationObjective, 
    state: ConversationState
  ): string {
    const progress = Math.round(this.calculateProgress(state, objective) * 100);
    return `${objective.purpose} (${progress}% complete)`;
  }

  /**
   * Get cache performance stats
   */
  public getCacheStats() {
    return promptCache.getCacheStats();
  }

  /**
   * Force fallback to legacy system
   */
  public forceLegacyMode(): void {
    console.log('🔄 [ENHANCED MANAGER] Forced fallback to legacy mode');
    (this as any).ENABLE_OBJECTIVE_SYSTEM = false;
  }

  /**
   * Re-enable objective system
   */
  public enableObjectiveSystem(): void {
    console.log('🚀 [ENHANCED MANAGER] Re-enabled objective system');
    (this as any).ENABLE_OBJECTIVE_SYSTEM = true;
  }
}

// Export singleton instance
export const enhancedConversationManager = EnhancedConversationManager.getInstance();
