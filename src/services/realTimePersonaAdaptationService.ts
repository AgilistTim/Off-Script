/**
 * Real-Time Persona Adaptation Service
 * 
 * Manages dynamic persona adaptation during conversations by:
 * - Tracking persona classification changes in real-time
 * - Providing context injection for conversation adjustments
 * - Managing adaptive conversation recommendations
 * - Interfacing with conversation overrides when persona updates
 */

import { PersonaType, PersonaProfile } from './personaService';
import { ConversationEvidence } from './conversationEvidenceExtractor';
import { enhancedPersonaIntegration } from './enhancedPersonaIntegration';
import { guestSessionService } from './guestSessionService';

export interface PersonaAdaptationState {
  currentPersona: PersonaType;
  previousPersona?: PersonaType;
  confidence: number;
  adaptationContext: PersonaAdaptationContext;
  lastUpdateTimestamp: string;
  conversationStage: 'discovery' | 'classification' | 'tailored_guidance' | 'journey_active';
}

export interface PersonaAdaptationContext {
  evidenceInsights: any;
  conversationAdjustments: ConversationAdjustment[];
  stageProgressionNeeds: string[];
  nextRecommendedActions: string[];
}

export interface ConversationAdjustment {
  type: 'pace' | 'support_level' | 'questioning_style' | 'encouragement' | 'focus_area';
  from: string;
  to: string;
  reason: string;
  timestamp: string;
}

export interface PersonaChangeEvent {
  type: 'persona_updated' | 'confidence_changed' | 'stage_progressed' | 'evidence_strengthened';
  previousState: PersonaAdaptationState;
  newState: PersonaAdaptationState;
  trigger: string;
  recommendedActions: string[];
}

/**
 * Service for managing real-time persona adaptation during conversations
 */
export class RealTimePersonaAdaptationService {
  private currentState: PersonaAdaptationState | null = null;
  private changeListeners: Array<(event: PersonaChangeEvent) => void> = [];
  private adaptationHistory: PersonaChangeEvent[] = [];

  /**
   * Initialize persona adaptation tracking for a conversation
   */
  initializeAdaptation(initialPersona?: PersonaProfile): PersonaAdaptationState {
    const persona: PersonaType = initialPersona?.classification?.type || 'exploring_undecided';
    const stage = guestSessionService.getCurrentOnboardingStage() as any;
    
    this.currentState = {
      currentPersona: persona,
      confidence: initialPersona?.classification?.confidence || 0.6,
      adaptationContext: this.buildInitialAdaptationContext(persona, initialPersona),
      lastUpdateTimestamp: new Date().toISOString(),
      conversationStage: stage
    };

    console.log('🔄 Real-time persona adaptation initialized:', {
      persona: this.getPersonaDisplayName(persona),
      stage,
      confidence: Math.round(this.currentState.confidence * 100) + '%'
    });

    return this.currentState;
  }

  /**
   * Update persona state based on new evidence or classification
   */
  updatePersonaState(
    newPersonaProfile: PersonaProfile,
    evidence?: ConversationEvidence,
    trigger: string = 'evidence_update'
  ): PersonaChangeEvent | null {
    if (!this.currentState) {
      return null;
    }

    const previousState = { ...this.currentState };
    const newPersona = newPersonaProfile.classification.type;
    const newConfidence = newPersonaProfile.classification.confidence;
    const newStage = guestSessionService.getCurrentOnboardingStage() as any;

    // Check if there are significant changes warranting adaptation
    const personaChanged = newPersona !== this.currentState.currentPersona;
    const confidenceChanged = Math.abs(newConfidence - this.currentState.confidence) > 0.1;
    const stageChanged = newStage !== this.currentState.conversationStage;

    if (!personaChanged && !confidenceChanged && !stageChanged) {
      // No significant changes
      return null;
    }

    // Build new adaptation context
    const adaptationContext = this.buildAdaptationContext(
      newPersona,
      newPersonaProfile,
      evidence,
      previousState
    );

    // Update current state
    this.currentState = {
      currentPersona: newPersona,
      previousPersona: personaChanged ? this.currentState.currentPersona : this.currentState.previousPersona,
      confidence: newConfidence,
      adaptationContext,
      lastUpdateTimestamp: new Date().toISOString(),
      conversationStage: newStage
    };

    // Create change event
    const changeEvent: PersonaChangeEvent = {
      type: personaChanged ? 'persona_updated' : confidenceChanged ? 'confidence_changed' : 'stage_progressed',
      previousState,
      newState: this.currentState,
      trigger,
      recommendedActions: this.generateAdaptationRecommendations(previousState, this.currentState)
    };

    // Add to history
    this.adaptationHistory.push(changeEvent);

    // Notify listeners
    this.notifyChangeListeners(changeEvent);

    console.log('🔄 Persona adaptation state updated:', {
      change: changeEvent.type,
      from: personaChanged ? this.getPersonaDisplayName(previousState.currentPersona) : 'same',
      to: this.getPersonaDisplayName(newPersona),
      confidence: Math.round(newConfidence * 100) + '%',
      trigger,
      actions: changeEvent.recommendedActions.length
    });

    return changeEvent;
  }

  /**
   * Get current conversation context injection for agent
   */
  getCurrentContextInjection(): string | null {
    if (!this.currentState) {
      return null;
    }

    const { currentPersona, confidence, adaptationContext, conversationStage } = this.currentState;
    
    return `[PERSONA CONTEXT UPDATE]
Current Classification: ${this.getPersonaDisplayName(currentPersona)} (${Math.round(confidence * 100)}% confidence)
Conversation Stage: ${conversationStage}
Key Adjustments Needed:
${adaptationContext.conversationAdjustments.map(adj => `- ${adj.type}: ${adj.from} → ${adj.to} (${adj.reason})`).join('\n')}

Stage Progression Needs:
${adaptationContext.stageProgressionNeeds.map(need => `- ${need}`).join('\n')}

Recommended Next Actions:
${adaptationContext.nextRecommendedActions.map(action => `- ${action}`).join('\n')}

Adapt your conversation style accordingly while maintaining natural flow.`;
  }

  /**
   * Get persona-specific conversation adjustments
   */
  getConversationAdjustments(): ConversationAdjustment[] {
    return this.currentState?.adaptationContext.conversationAdjustments || [];
  }

  /**
   * Get stage progression requirements
   */
  getStageProgressionNeeds(): string[] {
    return this.currentState?.adaptationContext.stageProgressionNeeds || [];
  }

  /**
   * Subscribe to persona changes
   */
  onPersonaChange(listener: (event: PersonaChangeEvent) => void): () => void {
    this.changeListeners.push(listener);
    return () => {
      const index = this.changeListeners.indexOf(listener);
      if (index > -1) {
        this.changeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get adaptation history for debugging
   */
  getAdaptationHistory(): PersonaChangeEvent[] {
    return [...this.adaptationHistory];
  }

  /**
   * Get current state
   */
  getCurrentState(): PersonaAdaptationState | null {
    return this.currentState ? { ...this.currentState } : null;
  }

  /**
   * Reset adaptation state (for new conversations)
   */
  reset(): void {
    this.currentState = null;
    this.adaptationHistory = [];
    console.log('🔄 Persona adaptation state reset');
  }

  // Private helper methods

  private buildInitialAdaptationContext(persona: PersonaType, profile?: PersonaProfile): PersonaAdaptationContext {
    return {
      evidenceInsights: profile ? this.extractEvidenceInsights(profile) : {},
      conversationAdjustments: [],
      stageProgressionNeeds: this.getStageProgressionNeeds(),
      nextRecommendedActions: this.getPersonaRecommendations(persona)
    };
  }

  private buildAdaptationContext(
    newPersona: PersonaType,
    newProfile: PersonaProfile,
    evidence?: ConversationEvidence,
    previousState?: PersonaAdaptationState
  ): PersonaAdaptationContext {
    const evidenceInsights = evidence ? enhancedPersonaIntegration.getEvidenceSummary(evidence) : {};
    const conversationAdjustments = this.calculateConversationAdjustments(newPersona, previousState);
    const stageProgressionNeeds = this.calculateStageProgressionNeeds(newProfile, evidence);
    const nextRecommendedActions = this.getPersonaRecommendations(newPersona);

    return {
      evidenceInsights,
      conversationAdjustments,
      stageProgressionNeeds,
      nextRecommendedActions
    };
  }

  private calculateConversationAdjustments(
    newPersona: PersonaType,
    previousState?: PersonaAdaptationState
  ): ConversationAdjustment[] {
    if (!previousState || newPersona === previousState.currentPersona) {
      return [];
    }

    const adjustments: ConversationAdjustment[] = [];
    const timestamp = new Date().toISOString();
    const personaAdjustments = enhancedPersonaIntegration.getPersonaConversationAdjustments(newPersona, {} as any);
    const prevPersonaAdjustments = enhancedPersonaIntegration.getPersonaConversationAdjustments(previousState.currentPersona, {} as any);

    // Compare and create adjustments
    if (personaAdjustments.pace !== prevPersonaAdjustments.pace) {
      adjustments.push({
        type: 'pace',
        from: prevPersonaAdjustments.pace,
        to: personaAdjustments.pace,
        reason: `Persona changed from ${this.getPersonaDisplayName(previousState.currentPersona)} to ${this.getPersonaDisplayName(newPersona)}`,
        timestamp
      });
    }

    if (personaAdjustments.supportLevel !== prevPersonaAdjustments.supportLevel) {
      adjustments.push({
        type: 'support_level',
        from: prevPersonaAdjustments.supportLevel,
        to: personaAdjustments.supportLevel,
        reason: `Support needs changed with persona update`,
        timestamp
      });
    }

    return adjustments;
  }

  private calculateStageProgressionNeeds(profile: PersonaProfile, evidence?: ConversationEvidence): string[] {
    const needs: string[] = [];
    const currentStage = guestSessionService.getCurrentOnboardingStage();

    // Determine what evidence is still needed based on current stage
    if (currentStage === 'discovery') {
      needs.push('Complete basic information gathering (name, situation, career direction)');
    }
    
    if (currentStage === 'classification' && evidence) {
      if (!evidence.confidenceLevel.signals.length) {
        needs.push('Assess confidence level in career direction');
      }
      if (evidence.motivation.intrinsic + evidence.motivation.extrinsic < 0.3) {
        needs.push('Explore motivation patterns (what drives their interest)');
      }
    }

    return needs;
  }

  private generateAdaptationRecommendations(previous: PersonaAdaptationState, current: PersonaAdaptationState): string[] {
    const recommendations: string[] = [];
    
    if (current.currentPersona !== previous.currentPersona) {
      recommendations.push(`Adapt conversation style to ${this.getPersonaDisplayName(current.currentPersona)} approach`);
      recommendations.push(`Update questioning strategy based on new persona classification`);
    }

    if (current.confidence > previous.confidence + 0.1) {
      recommendations.push(`Confidence increased - can provide more specific guidance`);
    } else if (current.confidence < previous.confidence - 0.1) {
      recommendations.push(`Confidence decreased - provide more support and validation`);
    }

    if (current.conversationStage !== previous.conversationStage) {
      recommendations.push(`Stage progressed to ${current.conversationStage} - adjust content depth accordingly`);
    }

    return recommendations;
  }

  private extractEvidenceInsights(profile: PersonaProfile): any {
    const evidence = (profile.classification as any)?.conversationEvidence;
    return evidence ? enhancedPersonaIntegration.getEvidenceSummary(evidence) : {};
  }

  private getPersonaRecommendations(persona: PersonaType): string[] {
    // Basic recommendations based on persona type
    const recommendations = {
      uncertain_unengaged: [
        'Use broad, exploratory questions',
        'Focus on building confidence and engagement',
        'Provide gentle encouragement and support'
      ],
      exploring_undecided: [
        'Help structure their exploration process',
        'Provide comparison frameworks',
        'Support their research mindset'
      ],
      tentatively_decided: [
        'Offer validation for their current direction',
        'Explore any doubts or concerns gently',
        'Provide detailed pathway information'
      ],
      focused_confident: [
        'Be direct and efficient in communication',
        'Focus on specific, actionable next steps',
        'Support their momentum with concrete guidance'
      ]
    };

    return recommendations[persona] || recommendations.exploring_undecided;
  }

  private getPersonaDisplayName(persona: PersonaType): string {
    const displayNames = {
      uncertain_unengaged: 'Uncertain & Unengaged',
      exploring_undecided: 'Exploring & Undecided',
      tentatively_decided: 'Tentatively Decided',
      focused_confident: 'Focused & Confident'
    };
    return displayNames[persona] || 'Unknown';
  }

  private notifyChangeListeners(event: PersonaChangeEvent): void {
    this.changeListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in persona change listener:', error);
      }
    });
  }
}

// Export singleton instance
export const realTimePersonaAdaptationService = new RealTimePersonaAdaptationService();