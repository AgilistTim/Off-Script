/**
 * StructuredOnboardingService - Implements the G1-G4 questionnaire flow
 * 
 * Follows the systematic questionnaire approach:
 * Q1: Current situation assessment
 * Q2: Career field specificity 
 * Q3: Branching based on Q2 (anxiety vs confidence)
 * Q4: Follow-up exploration
 * Q5: Previous career exploration activities
 * 
 * Maps to personas: G1 (Identity Diffusion) → G2 (Exploring) → G3 (Tentatively Decided) → G4 (Focused & Confident)
 */

import { guestSessionService } from './guestSessionService';
import { personaService } from './personaService';

export interface OnboardingQuestion {
  id: string;
  question: string;
  options?: string[];
  type: 'multiple_choice' | 'rating' | 'open_ended';
  required: boolean;
}

export interface OnboardingResponse {
  questionId: string;
  response: string | number;
  timestamp: Date;
}

export interface OnboardingState {
  currentQuestion: string | null;
  responses: OnboardingResponse[];
  stage: 'q1' | 'q2' | 'q2_details' | 'q3' | 'q4' | 'q5' | 'q6' | 'complete';
  tentativePersona: 'uncertain' | 'exploring' | 'decided' | null;
  hasSpecificCareer: boolean; // Track if user has one clear goal for conditional Q3/Q6
  isComplete: boolean;
}

export class StructuredOnboardingService {
  
  private readonly questions: Record<string, OnboardingQuestion> = {
    'q1_education_stage': {
      id: 'q1_education_stage',
      question: 'Which best describes your current situation?',
      options: [
        'In secondary school (GCSEs / A-Levels)',
        'In college or university',
        'Recently graduated',
        'Taking a gap year',
        'Working (part-time or full-time)',
        'Not currently in education or work'
      ],
      type: 'multiple_choice',
      required: true
    },
    
    'q2_career_direction': {
      id: 'q2_career_direction',
      question: 'Do you have a career or field in mind right now?',
      options: [
        'No idea yet',
        'A few ideas I\'m considering',
        'One clear goal'
      ],
      type: 'multiple_choice', 
      required: true
    },
    
    'q2_career_details': {
      id: 'q2_career_details',
      question: 'Could you tell me more about your career ideas? (Optional)',
      type: 'open_ended',
      required: false
    },
    
    'q3_confidence': {
      id: 'q3_confidence', 
      question: 'How confident are you that this career is right for you?',
      options: [
        'Not confident at all',
        'A little confident',
        'Fairly confident',
        'Very confident'
      ],
      type: 'multiple_choice',
      required: true
    },
    
    'q4_main_goal': {
      id: 'q4_main_goal',
      question: 'What are you hoping to get out of this tool?',
      options: [
        'Help me discover careers that might suit me',
        'Help me compare or narrow down my options',
        'Help me figure out the next steps toward my chosen career',
        'Just exploring for now'
      ],
      type: 'multiple_choice',
      required: true
    },
    
    'q5_exploration_done': {
      id: 'q5_exploration_done',
      question: 'Which of these have you already done to explore careers?',
      options: [
        'Researched online',
        'Spoken to a career adviser or mentor',
        'Taken a quiz or assessment',
        'Attended a career fair or event',
        'Tried work experience / internship / volunteering',
        'None of these yet'
      ],
      type: 'multiple_choice',
      required: false
    },
    
    'q6_motivation': {
      id: 'q6_motivation',
      question: 'What\'s the main reason you\'re interested in that career?',
      options: [
        'I\'m passionate about it / enjoy the subject',
        'I\'m good at it / it matches my skills',
        'It offers good prospects (salary, job security, etc.)',
        'Family / teachers encouraged it',
        'Not sure – it feels like a default choice'
      ],
      type: 'multiple_choice',
      required: false
    }
  };

  /**
   * Initialize structured onboarding flow
   */
  initializeStructuredFlow(): OnboardingState {
    console.log('🎯 Initializing structured onboarding flow');
    
    const initialState: OnboardingState = {
      currentQuestion: 'q1_education_stage',
      responses: [],
      stage: 'q1',
      tentativePersona: null,
      hasSpecificCareer: false,
      isComplete: false
    };

    this.saveOnboardingState(initialState);
    return initialState;
  }

  /**
   * Get current onboarding state
   */
  getCurrentState(): OnboardingState {
    const session = guestSessionService.getGuestSession();
    return session.structuredOnboarding || this.initializeStructuredFlow();
  }

  /**
   * Get the current question that should be asked
   */
  getCurrentQuestion(): OnboardingQuestion | null {
    const state = this.getCurrentState();
    if (!state.currentQuestion || state.isComplete) {
      return null;
    }
    return this.questions[state.currentQuestion] || null;
  }

  /**
   * Submit response and advance to next question
   */
  submitResponse(questionId: string, response: string | number): OnboardingState {
    const state = this.getCurrentState();
    
    console.log('📝 Submitting onboarding response:', { questionId, response });
    
    // Add response
    const newResponse: OnboardingResponse = {
      questionId,
      response,
      timestamp: new Date()
    };
    
    state.responses.push(newResponse);
    
    // Determine next question based on flow logic
    const nextState = this.determineNextState(state, questionId, response);
    
    this.saveOnboardingState(nextState);
    
    // Update tree progress service with onboarding advancement
    this.notifyProgressAdvancement(nextState);
    
    return nextState;
  }

  /**
   * Determine next question/stage based on current response
   */
  private determineNextState(currentState: OnboardingState, questionId: string, response: string | number): OnboardingState {
    const newState = { ...currentState };
    
    switch (questionId) {
      case 'q1_education_stage':
        // Always go to Q2 (Career Direction)
        newState.currentQuestion = 'q2_career_direction';
        newState.stage = 'q2';
        break;
        
      case 'q2_career_direction':
        // Set persona based on career direction
        if (typeof response === 'number') {
          if (response === 0) { // "No idea yet"
            newState.tentativePersona = 'uncertain';
            newState.hasSpecificCareer = false;
            newState.currentQuestion = 'q4_main_goal'; // Skip Q3, go to Q4
            newState.stage = 'q4';
          } else if (response === 1) { // "A few ideas I'm considering"
            newState.tentativePersona = 'exploring';
            newState.hasSpecificCareer = false;
            // Offer optional details question
            newState.currentQuestion = 'q2_career_details';
            newState.stage = 'q2_details';
          } else if (response === 2) { // "One clear goal"
            newState.tentativePersona = 'decided';
            newState.hasSpecificCareer = true;
            // Offer optional details question
            newState.currentQuestion = 'q2_career_details';
            newState.stage = 'q2_details';
          }
        }
        break;
        
      case 'q2_career_details':
        // After optional details, branch based on hasSpecificCareer
        if (newState.hasSpecificCareer) {
          // Go to Q3 (confidence) for users with one clear goal
          newState.currentQuestion = 'q3_confidence';
          newState.stage = 'q3';
        } else {
          // Skip Q3, go straight to Q4 for users exploring multiple options
          newState.currentQuestion = 'q4_main_goal';
          newState.stage = 'q4';
        }
        break;
        
      case 'q3_confidence':
        // After confidence question, go to Q4 (main goal)
        newState.currentQuestion = 'q4_main_goal';
        newState.stage = 'q4';
        break;
        
      case 'q4_main_goal':
        // Always go to Q5 (exploration done)
        newState.currentQuestion = 'q5_exploration_done';
        newState.stage = 'q5';
        break;
        
      case 'q5_exploration_done':
        // Branch based on whether user has specific career for Q6 (motivation)
        if (newState.hasSpecificCareer) {
          newState.currentQuestion = 'q6_motivation';
          newState.stage = 'q6';
        } else {
          // Skip Q6, complete onboarding
          newState.currentQuestion = null;
          newState.stage = 'complete';
          newState.isComplete = true;
          this.finalizePersonaClassification(newState);
        }
        break;
        
      case 'q6_motivation':
        // Complete onboarding
        newState.currentQuestion = null;
        newState.stage = 'complete';
        newState.isComplete = true;
        this.finalizePersonaClassification(newState);
        break;
    }
    
    return newState;
  }

  /**
   * Finalize persona classification based on all responses
   */
  private finalizePersonaClassification(state: OnboardingState): void {
    console.log('🎯 Finalizing persona classification based on Q1-Q6 structured responses');
    
    const responses = state.responses;
    const q1Response = responses.find(r => r.questionId === 'q1_education_stage')?.response as number;
    const q2Response = responses.find(r => r.questionId === 'q2_career_direction')?.response as number;
    const q3Response = responses.find(r => r.questionId === 'q3_confidence')?.response as number;
    const q4Response = responses.find(r => r.questionId === 'q4_main_goal')?.response as number;
    const q5Response = responses.find(r => r.questionId === 'q5_exploration_done')?.response as number;
    const q6Response = responses.find(r => r.questionId === 'q6_motivation')?.response as number;
    
    // Use tentative persona from Q2 as starting point
    let finalPersona = state.tentativePersona || 'uncertain';
    
    // Refine classification based on additional responses
    if (finalPersona === 'decided' && q3Response !== undefined) {
      // For users with "one clear goal", check confidence level
      if (q3Response <= 1) { // "Not confident at all" or "A little confident"
        finalPersona = 'exploring'; // Actually still exploring despite having an idea
      }
      // If q3Response >= 2 ("Fairly confident" or "Very confident"), keep as 'decided'
    }
    
    // Check motivation for decided users (Q6)
    if (finalPersona === 'decided' && q6Response !== undefined) {
      if (q6Response === 4) { // "Not sure – it feels like a default choice"
        finalPersona = 'exploring'; // Actually uncertain despite seeming decided
      }
    }
    
    console.log('✅ Final persona classification:', finalPersona, {
      q1_stage: q1Response,
      q2_direction: q2Response,
      q3_confidence: q3Response,
      q4_goal: q4Response,
      q5_exploration: q5Response,
      q6_motivation: q6Response
    });
    
    // Map to internal persona types
    const personaMapping = {
      'uncertain': 'uncertain_unengaged',
      'exploring': 'exploring_undecided',
      'decided': 'tentatively_decided' // Even confident decisions start as tentative until validated
    } as const;
    
    const internalPersonaType = personaMapping[finalPersona];
    
    // Store the classification in the session
    guestSessionService.updatePersonProfile({
      name: `Structured Assessment User`, // Placeholder name
      interests: [],
      skills: [],
      goals: [],
      values: [],
      workStyle: [internalPersonaType], // Store internal persona type in workStyle
      careerStage: this.mapPersonaToCareerStage(finalPersona),
      lastUpdated: new Date().toISOString()
    });
    
    // Update onboarding stage to classification
    guestSessionService.updateOnboardingStage('classification');
  }

  /**
   * Map persona to career stage for PersonProfile
   */
  private mapPersonaToCareerStage(persona: 'uncertain' | 'exploring' | 'decided'): string {
    const stageMap = {
      'uncertain': 'exploring', // Need to discover interests and options
      'exploring': 'researching', // Actively comparing and researching options
      'decided': 'deciding' // Have direction but validating and planning next steps
    };
    return stageMap[persona];
  }

  /**
   * Generate focus areas based on persona
   */
  private generateFocusAreas(persona: 'G1' | 'G2' | 'G3' | 'G4'): string[] {
    const focusAreasMap = {
      'G1': ['Self-discovery', 'Interest exploration', 'Reducing decision anxiety'],
      'G2': ['Option comparison', 'Information gathering', 'Decision-making skills'],
      'G3': ['Choice validation', 'Skill development planning', 'Path confirmation'],  
      'G4': ['Action planning', 'Goal setting', 'Implementation strategies']
    };
    
    return focusAreasMap[persona];
  }

  /**
   * Generate next steps based on persona
   */
  private generateNextSteps(persona: 'G1' | 'G2' | 'G3' | 'G4'): string[] {
    const nextStepsMap = {
      'G1': [
        'Complete interest and values assessments',
        'Explore broad career categories without pressure',
        'Talk to a career counselor or mentor'
      ],
      'G2': [
        'Research 2-3 specific career options in detail',
        'Conduct informational interviews',
        'Try job shadowing or volunteer work'
      ],
      'G3': [
        'Validate your choice through deeper research',
        'Connect with professionals in your chosen field', 
        'Develop a concrete action plan'
      ],
      'G4': [
        'Create a detailed timeline for your goals',
        'Start building relevant skills and experience',
        'Network actively in your chosen field'
      ]
    };
    
    return nextStepsMap[persona];
  }

  /**
   * Generate conversation style based on persona
   */
  private generateConversationStyle(persona: 'G1' | 'G2' | 'G3' | 'G4'): string {
    const styleMap = {
      'G1': 'supportive_exploratory',
      'G2': 'comparative_analytical', 
      'G3': 'validating_confirmatory',
      'G4': 'action_focused'
    };
    
    return styleMap[persona];
  }

  /**
   * Save onboarding state to session
   */
  private saveOnboardingState(state: OnboardingState): void {
    const session = guestSessionService.getGuestSession();
    session.structuredOnboarding = state;
    guestSessionService.updateSession(session);
  }

  /**
   * Notify progress advancement
   */
  private notifyProgressAdvancement(state: OnboardingState): void {
    // Import dynamically to avoid circular dependency
    import('./treeProgressService').then(({ treeProgressService }) => {
      // Trigger progress update for question responses
      treeProgressService.triggerRealTimeUpdate('engagement_milestone');
      
      // If onboarding is complete, trigger final classification
      if (state.isComplete) {
        treeProgressService.triggerRealTimeUpdate('persona_classified');
      }
    });
  }

  /**
   * Get completion percentage
   */
  getCompletionPercentage(): number {
    const state = this.getCurrentState();
    if (state.isComplete) return 100;
    
    const totalQuestions = 6; // Q1-Q6 (some conditional)
    const completedQuestions = state.responses.length;
    return Math.round((completedQuestions / totalQuestions) * 100);
  }

  /**
   * Check if user should be prompted with structured questions
   */
  shouldPromptStructuredQuestion(): boolean {
    const state = this.getCurrentState();
    const session = guestSessionService.getGuestSession();
    
    // Only prompt if:
    // 1. Not already complete
    // 2. Have had some initial conversation (3+ messages)
    // 3. Don't already have a strong persona classification
    return (
      !state.isComplete &&
      session.conversationHistory.length >= 3 &&
      !session.personaProfile?.classification
    );
  }

  /**
   * Reset structured onboarding for existing users who want to restart
   */
  resetForExistingUser(): OnboardingState {
    console.log('🔄 Resetting structured onboarding for existing user');
    
    // Clear existing session data related to personas and onboarding
    guestSessionService.updateOnboardingStage('initial');
    
    // Initialize fresh structured flow
    return this.initializeStructuredFlow();
  }

  /**
   * Check if this is an existing user without structured onboarding
   */
  isExistingUserWithoutStructuredFlow(): boolean {
    const session = guestSessionService.getGuestSession();
    return (
      !session.structuredOnboarding && 
      session.conversationHistory.length > 0
    );
  }

  /**
   * Get structured prompt for current question
   */
  getStructuredPrompt(): string | null {
    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion) return null;
    
    const state = this.getCurrentState();
    const questionNumber = this.getQuestionNumber(state.stage);
    
    let prompt = `\n\n📋 **Career Assessment Question ${questionNumber}/6**\n\n`;
    prompt += `${currentQuestion.question}\n\n`;
    
    if (currentQuestion.options && currentQuestion.type === 'multiple_choice') {
      currentQuestion.options.forEach((option, index) => {
        prompt += `${index + 1}. ${option}\n`;
      });
      prompt += `\nPlease respond with the number (1-${currentQuestion.options.length}) that best matches your situation.`;
    } else {
      prompt += `Please share your thoughts in a few sentences.`;
    }
    
    return prompt;
  }

  /**
   * Get question number for progress indication
   */
  private getQuestionNumber(stage: OnboardingState['stage']): number {
    const stageNumbers = {
      'q1': 1,
      'q2': 2, 
      'q2_details': 2, // Still Q2 (optional details)
      'q3': 3,
      'q4': 4,
      'q5': 5,
      'q6': 6,
      'complete': 6
    };
    
    return stageNumbers[stage] || 1;
  }
}

// Export singleton instance
export const structuredOnboardingService = new StructuredOnboardingService();