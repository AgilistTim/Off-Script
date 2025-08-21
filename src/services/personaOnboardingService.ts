/**
 * PersonaOnboardingService - Orchestrates the complete persona-based onboarding workflow
 * 
 * This service integrates:
 * - PersonaService for classification
 * - GuestSessionService for state management
 * - ConversationOverrideService for persona-aware conversations
 * 
 * Workflow:
 * 1. Monitor conversation for persona analysis triggers
 * 2. Analyze conversation patterns and classify persona
 * 3. Update conversation overrides based on persona
 * 4. Progress user through onboarding stages
 */

import { personaService, PersonaType, PersonaProfile, PersonaClassification } from './personaService';
import { guestSessionService } from './guestSessionService';
import { conversationOverrideService } from './conversationOverrideService';

export interface OnboardingProgress {
  currentStage: string;
  personaType?: PersonaType;
  confidence?: number;
  nextSteps: string[];
  readyForClassification: boolean;
  shouldUpdateConversation: boolean;
}

export interface PersonaAnalysisResult {
  classification: PersonaClassification;
  recommendations: string[];
  conversationUpdated: boolean;
  nextStage: string;
}

/**
 * Main orchestration service for persona-based onboarding
 */
export class PersonaOnboardingService {

  /**
   * Initialize persona-based onboarding for a new session
   */
  initializeOnboarding(sessionId?: string): void {
    console.log('🎯 Initializing persona-based onboarding');
    
    // Ensure guest session is initialized
    if (!guestSessionService.getSessionId()) {
      console.log('📝 No session found, initializing new guest session');
      // Session will be auto-initialized by guestSessionService
    }
    
    // Set initial onboarding stage
    const currentStage = guestSessionService.getCurrentOnboardingStage();
    if (currentStage === 'initial') {
      guestSessionService.updateOnboardingStage('discovery');
      console.log('✅ Onboarding stage set to discovery');
    }
    
    console.log('🎯 Persona onboarding initialized:', {
      sessionId: guestSessionService.getSessionId(),
      stage: guestSessionService.getCurrentOnboardingStage()
    });
  }

  /**
   * Check if conversation is ready for persona analysis
   */
  shouldAnalyzePersona(): boolean {
    const shouldAnalyze = guestSessionService.shouldTriggerPersonaAnalysis();
    const currentStage = guestSessionService.getCurrentOnboardingStage();
    
    console.log('🤔 Checking if ready for persona analysis:', {
      shouldAnalyze,
      currentStage,
      hasExistingClassification: !!guestSessionService.getPersonaProfile()
    });
    
    return shouldAnalyze && !['journey_active', 'complete'].includes(currentStage);
  }

  /**
   * Analyze conversation and update persona classification
   */
  async analyzePersonaFromConversation(): Promise<PersonaAnalysisResult | null> {
    if (!this.shouldAnalyzePersona()) {
      console.log('⏭️ Skipping persona analysis - conditions not met');
      return null;
    }

    console.log('🧠 Starting persona analysis...');

    try {
      // Get conversation history for analysis
      const conversationHistory = guestSessionService.getConversationForAnalysis();
      const existingProfile = guestSessionService.getPersonaProfile();

      console.log('📊 Analyzing conversation:', {
        messageCount: conversationHistory.length,
        hasExistingProfile: !!existingProfile
      });

      // Perform persona classification
      const classification = await personaService.analyzeConversationForPersona(
        conversationHistory,
        existingProfile
      );

      // Add analysis to history
      guestSessionService.addPersonaAnalysis(classification);

      console.log('✅ Persona analysis complete:', {
        type: personaService.getPersonaDisplayName(classification.type),
        confidence: Math.round(classification.confidence * 100) + '%',
        stage: classification.stage
      });

      // Generate recommendations
      const conversationAnalysis = {
        messageCount: conversationHistory.filter(msg => msg.role === 'user').length,
        uncertaintySignals: 0, // This would be calculated by personaService
        engagementLevel: 0.5,
        decisionReadiness: 0.5,
        goalClarity: 0.5,
        topicEngagement: {},
        responsePatterns: []
      };

      const recommendations = personaService.generatePersonaRecommendations(
        classification.type,
        conversationAnalysis
      );

      // Create or update persona profile
      const personaProfile: PersonaProfile = {
        sessionId: guestSessionService.getSessionId(),
        classification,
        conversationAnalysis,
        journeyStage: classification.stage === 'confirmed' ? 'tailored_guidance' : 'classification',
        onboardingComplete: false,
        recommendations,
        createdAt: existingProfile?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Update guest session with persona profile
      guestSessionService.setPersonaProfile(personaProfile);

      // Update onboarding stage based on classification confidence
      let nextStage: string;
      if (classification.stage === 'confirmed') {
        nextStage = 'tailored_guidance';
        guestSessionService.updateOnboardingStage('tailored_guidance');
      } else {
        nextStage = 'classification';
        guestSessionService.updateOnboardingStage('classification');
      }

      const result: PersonaAnalysisResult = {
        classification,
        recommendations: recommendations.nextSteps,
        conversationUpdated: false, // Will be updated if conversation overrides are applied
        nextStage
      };

      console.log('🎯 Persona profile updated:', {
        persona: personaService.getPersonaDisplayName(classification.type),
        stage: personaProfile.journeyStage,
        nextStage
      });

      return result;

    } catch (error) {
      console.error('❌ Error during persona analysis:', error);
      return null;
    }
  }

  /**
   * Update conversation overrides based on current persona classification
   */
  async updateConversationForPersona(): Promise<boolean> {
    try {
      console.log('🔄 Updating conversation overrides for persona...');
      
      const personaProfile = guestSessionService.getPersonaProfile();
      const currentStage = guestSessionService.getCurrentOnboardingStage();
      
      if (!personaProfile) {
        console.log('⚠️ No persona profile found, using stage-based overrides');
        return false;
      }

      console.log('🎭 Building persona-aware conversation overrides:', {
        persona: personaService.getPersonaDisplayName(personaProfile.classification.type),
        stage: currentStage,
        confidence: Math.round(personaProfile.classification.confidence * 100) + '%'
      });

      // The conversation overrides will be applied when the conversation starts
      // via conversationOverrideService.createPersonaAwareStartOptions()
      
      console.log('✅ Conversation prepared for persona-aware interaction');
      return true;

    } catch (error) {
      console.error('❌ Error updating conversation for persona:', error);
      return false;
    }
  }

  /**
   * Get current onboarding progress and recommendations
   */
  getOnboardingProgress(): OnboardingProgress {
    const currentStage = guestSessionService.getCurrentOnboardingStage();
    const personaProfile = guestSessionService.getPersonaProfile();
    const shouldAnalyze = guestSessionService.shouldTriggerPersonaAnalysis();
    const conversationHistory = guestSessionService.getConversationForAnalysis();
    const userMessageCount = conversationHistory.filter(msg => msg.role === 'user').length;

    let nextSteps: string[] = [];
    let readyForClassification = false;

    // Determine next steps based on current state
    if (!personaProfile && userMessageCount >= 2) {
      readyForClassification = true;
      nextSteps = [
        'Continue engaging in conversation to gather persona indicators',
        'Share interests, goals, or current situation for better classification',
        'Express how you approach decisions or challenges'
      ];
    } else if (personaProfile && personaProfile.classification.stage === 'provisional') {
      nextSteps = [
        'Continue conversation to confirm persona classification',
        'Share more specific details about career interests',
        'Discuss decision-making preferences and support needs'
      ];
    } else if (personaProfile && personaProfile.classification.stage === 'confirmed') {
      nextSteps = personaProfile.recommendations.nextSteps;
    } else {
      nextSteps = [
        'Share your name and what brings you to career exploration',
        'Discuss what activities or subjects you find engaging',
        'Talk about your current situation and future aspirations'
      ];
    }

    const progress: OnboardingProgress = {
      currentStage,
      personaType: personaProfile?.classification.type,
      confidence: personaProfile?.classification.confidence,
      nextSteps,
      readyForClassification,
      shouldUpdateConversation: shouldAnalyze || (personaProfile?.classification.stage === 'confirmed')
    };

    console.log('📊 Current onboarding progress:', {
      stage: currentStage,
      hasPersona: !!personaProfile,
      confidence: progress.confidence ? Math.round(progress.confidence * 100) + '%' : 'N/A',
      userMessages: userMessageCount,
      readyForClassification
    });

    return progress;
  }

  /**
   * Complete the onboarding process and transition to active journey
   */
  completeOnboarding(): boolean {
    const personaProfile = guestSessionService.getPersonaProfile();
    
    if (!personaProfile || personaProfile.classification.stage !== 'confirmed') {
      console.log('⚠️ Cannot complete onboarding - persona not confirmed');
      return false;
    }

    console.log('🎉 Completing persona-based onboarding:', {
      persona: personaService.getPersonaDisplayName(personaProfile.classification.type),
      confidence: Math.round(personaProfile.classification.confidence * 100) + '%'
    });

    // Update onboarding stage to complete
    guestSessionService.updateOnboardingStage('journey_active');
    
    // Mark onboarding as complete in persona profile
    const updatedProfile: PersonaProfile = {
      ...personaProfile,
      onboardingComplete: true,
      journeyStage: 'journey_active',
      updatedAt: new Date().toISOString()
    };
    
    guestSessionService.setPersonaProfile(updatedProfile);

    console.log('✅ Onboarding completed - user ready for persona-tailored journey');
    return true;
  }

  /**
   * Get persona-specific conversation starter options for ElevenLabs
   */
  async getPersonaAwareConversationOptions(agentId: string) {
    console.log('🎭 Getting persona-aware conversation options for agent:', agentId);
    
    const sessionId = guestSessionService.getSessionId();
    const options = await conversationOverrideService.createPersonaAwareStartOptions(
      agentId,
      sessionId
    );
    
    console.log('✅ Persona-aware conversation options ready:', {
      agentId,
      sessionId: sessionId.substring(0, 15) + '...',
      hasOverrides: !!options.overrides
    });
    
    return options;
  }

  /**
   * Reset onboarding (useful for testing or starting fresh)
   */
  resetOnboarding(): void {
    console.log('🔄 Resetting persona-based onboarding');
    guestSessionService.clearSession();
    console.log('✅ Onboarding reset complete');
  }

  /**
   * Get persona classification summary for debugging/display
   */
  getPersonaSummary(): { 
    hasPersona: boolean;
    type?: string;
    displayName?: string;
    description?: string;
    confidence?: string;
    stage?: string;
    recommendations?: string[];
  } {
    const personaProfile = guestSessionService.getPersonaProfile();
    
    if (!personaProfile) {
      return { hasPersona: false };
    }

    return {
      hasPersona: true,
      type: personaProfile.classification.type,
      displayName: personaService.getPersonaDisplayName(personaProfile.classification.type),
      description: personaService.getPersonaDescription(personaProfile.classification.type),
      confidence: Math.round(personaProfile.classification.confidence * 100) + '%',
      stage: personaProfile.classification.stage,
      recommendations: personaProfile.recommendations.nextSteps
    };
  }

  /**
   * Process conversation message and trigger persona analysis if needed
   */
  async processConversationMessage(
    role: 'user' | 'assistant',
    content: string
  ): Promise<{ analysisTriggered: boolean; result?: PersonaAnalysisResult }> {
    // Add message to conversation history first
    guestSessionService.addConversationMessage(role, content);
    
    // Only analyze on user messages
    if (role !== 'user') {
      return { analysisTriggered: false };
    }

    // Check if we should trigger analysis
    if (!this.shouldAnalyzePersona()) {
      return { analysisTriggered: false };
    }

    console.log('🎯 User message triggered persona analysis');
    
    // Perform analysis
    const result = await this.analyzePersonaFromConversation();
    
    if (result) {
      // Update conversation for new persona insights
      await this.updateConversationForPersona();
      
      return {
        analysisTriggered: true,
        result
      };
    }

    return { analysisTriggered: false };
  }
}

// Export singleton instance
export const personaOnboardingService = new PersonaOnboardingService();