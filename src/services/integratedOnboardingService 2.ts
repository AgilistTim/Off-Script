/**
 * Integrated Onboarding Service
 * 
 * Combines natural language onboarding with existing persona services
 * to provide a seamless onboarding experience
 */

import { naturalLanguageOnboardingService, OnboardingEvidence } from './naturalLanguageOnboardingService';
import { llmPersonaClassifier } from './llmPersonaClassifier';
import { personaOnboardingService } from './personaOnboardingService';
import { guestSessionService } from './guestSessionService';
import { PersonaType, PersonaClassification } from './personaService';

export interface IntegratedOnboardingProgress {
  currentStage: string;
  stageProgress: number; // 0-1
  evidenceCollected: OnboardingEvidence;
  personaClassification?: PersonaClassification;
  nextQuestion?: string;
  readyForTransition: boolean;
  conversationRecommendations: string[];
}

export interface OnboardingResponse {
  stageName: string;
  stageComplete: boolean;
  evidenceUpdated: boolean;
  nextQuestion?: string;
  personaClassified?: PersonaClassification;
  shouldTransitionToCareer: boolean;
  conversationGuidance: string[];
}

/**
 * Service that orchestrates natural language onboarding with persona classification
 */
export class IntegratedOnboardingService {

  /**
   * Initialize onboarding for new session
   */
  async initializeOnboarding(forceReset: boolean = false): Promise<IntegratedOnboardingProgress> {
    console.log('🎯 Initializing integrated natural language onboarding');

    // Initialize both systems
    personaOnboardingService.initializeOnboarding(undefined, forceReset);
    if (forceReset) {
      naturalLanguageOnboardingService.reset();
    }

    const progress = this.getCurrentProgress();
    
    console.log('✅ Integrated onboarding initialized:', {
      stage: progress.currentStage,
      hasEvidence: Object.keys(progress.evidenceCollected).length > 0,
      readyForTransition: progress.readyForTransition
    });

    return progress;
  }

  /**
   * Process user message and update onboarding state
   */
  async processUserMessage(
    message: string
  ): Promise<OnboardingResponse> {
    console.log('💬 Processing onboarding message:', message.substring(0, 50) + '...');

    const progress = this.getCurrentProgress();
    const currentStageId = this.getCurrentStageId(progress.currentStage);
    
    // Analyze response using natural language onboarding
    const analysis = naturalLanguageOnboardingService.analyzeResponse(message, currentStageId);
    
    // Also add to conversation history for existing persona service
    await personaOnboardingService.processConversationMessage('user', message);
    
    let personaClassification: PersonaClassification | undefined;
    let shouldTransitionToCareer = false;
    
    // Check if we should perform persona classification
    if (analysis.stageComplete) {
      naturalLanguageOnboardingService.completeStage(currentStageId);
    }
    
    // Check if ready for classification
    const updatedProgress = this.getCurrentProgress();
    if (updatedProgress.readyForTransition && !updatedProgress.personaClassification) {
      console.log('🧠 Ready for persona classification');
      
      try {
        // Perform enhanced persona classification
        personaClassification = await this.performPersonaClassification(updatedProgress.evidenceCollected);
        
        if (personaClassification) {
          // Update the persona onboarding service with classification
          await this.integrateClassificationWithExistingSystem(personaClassification);
          shouldTransitionToCareer = true;
        }
      } catch (error) {
        console.error('❌ Error during persona classification:', error);
      }
    }

    // Generate next question or transition
    const nextQuestion = shouldTransitionToCareer 
      ? undefined 
      : naturalLanguageOnboardingService.getNextQuestion(updatedProgress.evidenceCollected);

    const response: OnboardingResponse = {
      stageName: progress.currentStage,
      stageComplete: analysis.stageComplete,
      evidenceUpdated: Object.keys(analysis.evidence).length > 0,
      nextQuestion,
      personaClassified: personaClassification,
      shouldTransitionToCareer,
      conversationGuidance: this.generateConversationGuidance(updatedProgress, personaClassification)
    };

    console.log('✅ Onboarding message processed:', {
      stage: response.stageName,
      stageComplete: response.stageComplete,
      shouldTransition: response.shouldTransitionToCareer,
      hasPersona: !!response.personaClassified
    });

    return response;
  }

  /**
   * Get current onboarding progress
   */
  getCurrentProgress(): IntegratedOnboardingProgress {
    const nlProgress = naturalLanguageOnboardingService.getCurrentProgress();
    const existingProfile = guestSessionService.getPersonaProfile();
    
    return {
      currentStage: nlProgress.currentStage?.name || 'Rapport & Name',
      stageProgress: this.calculateStageProgress(),
      evidenceCollected: nlProgress.evidenceCollected,
      personaClassification: existingProfile?.classification,
      nextQuestion: naturalLanguageOnboardingService.getNextQuestion(nlProgress.evidenceCollected),
      readyForTransition: nlProgress.readyForClassification,
      conversationRecommendations: this.generateConversationRecommendations(nlProgress.evidenceCollected)
    };
  }

  /**
   * Perform persona classification using collected evidence
   */
  private async performPersonaClassification(evidence: OnboardingEvidence): Promise<PersonaClassification> {
    console.log('🎯 Performing integrated persona classification');

    // First, try deterministic rule-based classification
    const deterministicResult = naturalLanguageOnboardingService.classifyPersona(evidence);
    
    // Enhance with LLM analysis if available (fallback to deterministic)
    let finalClassification: PersonaClassification;
    
    try {
      // Try LLM enhancement for more nuanced analysis
      const llmResult = await llmPersonaClassifier.classifyPersonaFromEvidence(evidence);
      
      finalClassification = {
        type: llmResult.persona,
        confidence: llmResult.confidence,
        triggers: [], // LLM-based classification doesn't use traditional triggers
        timestamp: new Date().toISOString(),
        stage: 'confirmed',
        reasoning: `${llmResult.reasoning} (Enhanced with LLM analysis)`,
        conversationEvidence: evidence // Store the natural language evidence
      };
      
      console.log('✅ Enhanced LLM classification completed');
      
    } catch (error) {
      console.warn('⚠️ LLM classification failed, using deterministic approach:', error);
      
      // Fallback to deterministic classification
      finalClassification = {
        type: deterministicResult.persona,
        confidence: deterministicResult.confidence,
        stage: 'confirmed',
        reasoning: deterministicResult.reasoning,
        conversationEvidence: evidence,
        triggers: [],
        timestamp: new Date().toISOString()
      };
    }

    return finalClassification;
  }

  /**
   * Integrate classification with existing persona system
   */
  private async integrateClassificationWithExistingSystem(
    classification: PersonaClassification
  ): Promise<void> {
    console.log('🔗 Integrating classification with existing persona system');

    // Create persona profile using existing service structure
    const sessionId = guestSessionService.getSessionId();
    
    // Update guest session with new classification
    const existingSession = guestSessionService.getGuestSession();
    if (existingSession) {
      // Add natural language evidence to session
      (existingSession as any).naturalLanguageEvidence = classification.conversationEvidence;
    }

    // Trigger persona analysis in existing system to create full profile
    const analysisResult = await personaOnboardingService.analyzePersonaFromConversation();
    
    if (analysisResult) {
      // Override with our more accurate classification
      const personaProfile = guestSessionService.getPersonaProfile();
      if (personaProfile) {
        personaProfile.classification = classification;
        guestSessionService.setPersonaProfile(personaProfile);
      }

      // Update conversation overrides
      await personaOnboardingService.updateConversationForPersona();
      
      console.log('✅ Classification integrated with existing persona system');
    }
  }

  /**
   * Calculate overall stage progress
   */
  private calculateStageProgress(): number {
    const nlProgress = naturalLanguageOnboardingService.getCurrentProgress();
    const totalStages = 7; // Total number of onboarding stages
    const completedStages = nlProgress.completedStages.length;
    
    return completedStages / totalStages;
  }

  /**
   * Map stage names to IDs for natural language service
   */
  private getCurrentStageId(stageName: string): string {
    const stageMap: Record<string, string> = {
      'Rapport & Name': 'rapport_name',
      'Life Stage Discovery': 'life_stage',
      'Career Direction Exploration': 'career_direction',
      'Confidence Assessment': 'confidence_assessment',
      'Motivation Exploration': 'motivation_exploration',
      'Goal Clarification': 'goal_clarification',
      'Exploration History': 'exploration_history'
    };
    
    return stageMap[stageName] || 'rapport_name';
  }

  /**
   * Generate conversation guidance based on current progress
   */
  private generateConversationGuidance(
    progress: IntegratedOnboardingProgress,
    classification?: PersonaClassification
  ): string[] {
    const guidance: string[] = [];

    if (classification) {
      // Post-classification guidance
      const adaptation = llmPersonaClassifier.generateConversationAdaptation(classification.type);
      guidance.push(
        `Adapt to ${classification.type} persona: ${adaptation.questionStyle}`,
        `Pacing: ${adaptation.pacing}`,
        `Support level: ${adaptation.supportLevel}`
      );
      guidance.push(...adaptation.focusAreas.map(area => `Focus: ${area}`));
      
    } else {
      // Pre-classification guidance
      const evidence = progress.evidenceCollected;
      
      if (!evidence.name) {
        guidance.push('Priority: Get their name for personalization');
      }
      
      if (!evidence.lifeStage) {
        guidance.push('Need: Current life situation (student/working/etc.)');
      }
      
      if (!evidence.careerDirection) {
        guidance.push('Critical: Career direction clarity (none/few/one goal)');
      }
      
      if (evidence.careerDirection === 'one_goal' && !evidence.confidenceLevel) {
        guidance.push('Follow-up: Assess confidence level in their career choice');
      }
      
      if (evidence.careerDirection && !evidence.motivation) {
        guidance.push('Explore: What motivates them (passion vs practical)');
      }
    }

    return guidance;
  }

  /**
   * Generate conversation recommendations based on evidence
   */
  private generateConversationRecommendations(evidence: OnboardingEvidence): string[] {
    const recommendations: string[] = [];
    
    // Evidence-based conversation adjustments
    if (evidence.confidenceLevel === 'low') {
      recommendations.push('Use extra validation and encouragement');
      recommendations.push('Avoid overwhelming with too many options');
    }
    
    if (evidence.careerDirection === 'no_idea') {
      recommendations.push('Focus on broad interest exploration');
      recommendations.push('Use gentle, non-pressuring questions');
    }
    
    if (evidence.careerDirection === 'few_ideas') {
      recommendations.push('Help structure their exploration');
      recommendations.push('Provide comparison frameworks');
    }
    
    if (evidence.motivation === 'intrinsic') {
      recommendations.push('Build on their passion and interests');
      recommendations.push('Focus on fulfillment and meaning');
    } else if (evidence.motivation === 'extrinsic') {
      recommendations.push('Address practical considerations');
      recommendations.push('Balance with helping find internal motivation');
    }
    
    return recommendations;
  }

  /**
   * Check if ready to transition to career conversation
   */
  isReadyForCareerTransition(): boolean {
    const progress = this.getCurrentProgress();
    return progress.readyForTransition && !!progress.personaClassification;
  }

  /**
   * Complete onboarding and transition to career guidance
   */
  async completeOnboarding(): Promise<boolean> {
    console.log('🎉 Completing integrated onboarding process');
    
    const success = personaOnboardingService.completeOnboarding();
    
    if (success) {
      // Update onboarding stage to indicate natural language completion
      guestSessionService.updateOnboardingStage('journey_active');
      console.log('✅ Integrated onboarding completed successfully');
    }
    
    return success;
  }

  /**
   * Reset entire onboarding system
   */
  reset(): void {
    console.log('🔄 Resetting integrated onboarding system');
    
    naturalLanguageOnboardingService.reset();
    personaOnboardingService.resetOnboarding();
    
    console.log('✅ Integrated onboarding reset complete');
  }

  /**
   * Get persona-aware conversation options for ElevenLabs
   */
  async getPersonaAwareConversationOptions(agentId: string) {
    return personaOnboardingService.getPersonaAwareConversationOptions(agentId);
  }

  /**
   * Get natural language onboarding summary for debugging
   */
  getOnboardingSummary(): {
    stage: string;
    progress: number;
    evidence: OnboardingEvidence;
    persona?: PersonaType;
    confidence?: number;
    recommendations: string[];
  } {
    const progress = this.getCurrentProgress();
    
    return {
      stage: progress.currentStage,
      progress: progress.stageProgress,
      evidence: progress.evidenceCollected,
      persona: progress.personaClassification?.type,
      confidence: progress.personaClassification?.confidence,
      recommendations: progress.conversationRecommendations
    };
  }
}

// Export singleton instance
export const integratedOnboardingService = new IntegratedOnboardingService();