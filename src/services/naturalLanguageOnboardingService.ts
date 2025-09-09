/**
 * Natural Language Onboarding Service
 * 
 * Implements evidence-based persona classification through conversational onboarding
 * using the 6-stage natural language question framework
 */

import { guestSessionService } from './guestSessionService';
import { PersonaType } from './personaService';

export interface OnboardingStage {
  id: string;
  name: string;
  intent: string;
  required: boolean;
  completed: boolean;
  evidence?: any;
}

export interface OnboardingEvidence {
  name?: string;
  lifeStage?: 'secondary_school' | 'uni_college' | 'graduate' | 'working' | 'neet' | 'gap_year';
  careerDirection?: 'no_idea' | 'few_ideas' | 'one_goal';
  careerSpecifics?: string[];
  confidenceLevel?: 'low' | 'moderate' | 'high' | 'very_high';
  motivation?: 'intrinsic' | 'extrinsic' | 'mixed';
  userIntent?: 'discover' | 'compare' | 'plan';
  explorationHistory?: 'none' | 'some' | 'extensive';
}

export interface ClassificationResult {
  persona: PersonaType;
  confidence: number;
  reasoning: string;
  evidence: OnboardingEvidence;
}

/**
 * Service for managing natural language onboarding flow with evidence collection
 */
export class NaturalLanguageOnboardingService {
  
  private readonly stages: OnboardingStage[] = [
    {
      id: 'rapport_name',
      name: 'Rapport & Name',
      intent: 'Build trust and get their name',
      required: true,
      completed: false
    },
    {
      id: 'life_stage',
      name: 'Life Stage Discovery',
      intent: 'Understand current situation (student, working, gap year)',
      required: true,
      completed: false
    },
    {
      id: 'career_direction',
      name: 'Career Direction Exploration',
      intent: 'Discover if they have no ideas, few ideas, or one clear direction',
      required: true,
      completed: false
    },
    {
      id: 'confidence_assessment',
      name: 'Confidence Assessment',
      intent: 'Gauge confidence level in their career direction (if they have career ideas)',
      required: false, // Only required if they mentioned careers
      completed: false
    },
    {
      id: 'motivation_exploration',
      name: 'Motivation Exploration',
      intent: 'Understand intrinsic vs extrinsic motivation patterns',
      required: false,
      completed: false
    },
    {
      id: 'goal_clarification',
      name: 'Goal Clarification',
      intent: 'Understand what they want from this conversation',
      required: true,
      completed: false
    },
    {
      id: 'exploration_history',
      name: 'Exploration History',
      intent: 'Understand their career exploration background',
      required: false,
      completed: false
    }
  ];

  /**
   * Get current onboarding progress
   */
  getCurrentProgress(): {
    currentStage: OnboardingStage | null;
    completedStages: OnboardingStage[];
    requiredStagesComplete: boolean;
    evidenceCollected: OnboardingEvidence;
    readyForClassification: boolean;
  } {
    const sessionId = guestSessionService.getSessionId();
    const evidence = this.getCollectedEvidence(sessionId);
    const completedStages = this.stages.filter(stage => stage.completed);
    const requiredStages = this.stages.filter(stage => stage.required);
    const requiredComplete = requiredStages.every(stage => stage.completed);
    
    // Determine current stage
    let currentStage = this.stages.find(stage => !stage.completed);
    
    // Skip confidence assessment if no career direction mentioned
    if (currentStage?.id === 'confidence_assessment' && !evidence.careerDirection) {
      currentStage = this.stages.find(stage => stage.id === 'motivation_exploration');
    }
    
    const readyForClassification = this.isReadyForClassification(evidence);
    
    return {
      currentStage: currentStage || null,
      completedStages,
      requiredStagesComplete: requiredComplete,
      evidenceCollected: evidence,
      readyForClassification
    };
  }

  /**
   * Get question variants for current stage
   */
  getCurrentStageQuestions(): string[] {
    const progress = this.getCurrentProgress();
    const currentStage = progress.currentStage;
    
    if (!currentStage) {
      return ["What would you like to explore about your career today?"];
    }

    return this.getQuestionVariants(currentStage.id, progress.evidenceCollected);
  }

  /**
   * Get flexible question variants for each stage
   */
  private getQuestionVariants(stageId: string, evidence: OnboardingEvidence): string[] {
    const variants: Record<string, string[]> = {
      rapport_name: [
        "Hi I'm Sarah an AI assistant, together we will explore what you enjoy and discover career pathways that might be perfect for you. What name can I use?",
        "Hello! I'm Sarah, and together we'll explore what you enjoy and discover career pathways that might be perfect for you. What would you like me to call you?",
        "Hi there! I'm Sarah, together we will explore what you enjoy and discover career pathways. What's your name?",
        "Welcome! I'm Sarah, and together we'll explore what you enjoy to discover career pathways that might be perfect for you. What should I call you?",
        "Hello! I'm Sarah. Together we will explore what you enjoy and discover career pathways. What name would you like me to use?"
      ],
      
      life_stage: [
        "Can you tell me what you're doing at the moment — are you in school, college, uni, working, or something else?",
        "What stage of education or work are you currently at?",
        "Where are you right now in terms of studies or job — GCSEs, A-levels, university, just graduated, gap year, working?",
        "What's your current situation — are you studying, working, or taking time out?",
        "Which best describes you right now — still in school, studying further, recently finished, or in work?"
      ],
      
      career_direction: [
        "Do you have any career paths in mind right now, or are you still figuring things out?",
        "When you think about your future career, do you feel you've got a clear goal, a few ideas, or no idea yet?",
        "What careers, if any, are you considering at the moment?",
        "Do you already know what you want to do, or are you still undecided?",
        "Are there any jobs or fields you're aiming for, or is it still wide open?"
      ],
      
      confidence_assessment: [
        "How confident do you feel that this choice is right for you?",
        "Do you feel sure about this career, or is there still some doubt?",
        "Would you say you're set on this path, or just testing it out?",
        "Are you satisfied with this choice, or still questioning it?",
        "How certain are you that this career fits you?"
      ],
      
      goal_clarification: [
        "What would you most like help with here — discovering new options, narrowing down, or planning your next steps?",
        "What's the main thing you'd like this tool to do for you right now?",
        "Are you hoping to get inspiration, compare choices, or figure out how to reach your goal?",
        "What problem do you want us to help solve — finding direction, choosing between paths, or moving forward?",
        "Why did you come to Offscript today — to explore, to decide, or to plan?"
      ],
      
      exploration_history: [
        "What have you done so far to look into careers — like research, talking to advisers, or work experience?",
        "Have you tried anything already to explore jobs or courses?",
        "Can you tell me about any steps you've taken to figure this out?",
        "What kind of career exploration have you done up to now?",
        "Have you done any research, events, or internships related to careers?"
      ],
      
      motivation_exploration: [
        "What's the main reason this career appeals to you?",
        "Why did you pick this path?",
        "What excites you most about this choice?",
        "Who or what influenced you to choose this career?",
        "Is it more about passion, skills, security, or expectations?"
      ]
    };

    return variants[stageId] || ["Can you tell me more about that?"];
  }

  /**
   * Process user response and update evidence
   */
  analyzeResponse(response: string, currentStageId: string): {
    evidence: Partial<OnboardingEvidence>;
    stageComplete: boolean;
    suggestedFollowUp?: string;
  } {
    const analysis = this.extractEvidenceFromResponse(response, currentStageId);
    
    // Update the stage as completed if we got useful evidence
    const stageComplete = this.isStageComplete(currentStageId, analysis.evidence);
    
    // Store evidence in session
    if (Object.keys(analysis.evidence).length > 0) {
      this.updateCollectedEvidence(analysis.evidence);
    }
    
    return {
      evidence: analysis.evidence,
      stageComplete,
      suggestedFollowUp: analysis.suggestedFollowUp
    };
  }

  /**
   * Extract evidence from natural language response using keyword patterns
   */
  private extractEvidenceFromResponse(response: string, stageId: string): {
    evidence: Partial<OnboardingEvidence>;
    suggestedFollowUp?: string;
  } {
    const lowerResponse = response.toLowerCase();
    const evidence: Partial<OnboardingEvidence> = {};
    let suggestedFollowUp: string | undefined;

    switch (stageId) {
      case 'rapport_name':
        // Extract name - look for common name patterns
        const nameMatch = response.match(/(?:i'm|im|name is|call me|my name is)\s+([a-zA-Z]+)/i) ||
                         response.match(/^([a-zA-Z]+)$/) ||  // Single word response
                         response.match(/([a-zA-Z]+)/); // First word with letters
        if (nameMatch) {
          evidence.name = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1).toLowerCase();
        }
        break;

      case 'life_stage':
        if (lowerResponse.includes('school') || lowerResponse.includes('gcse') || lowerResponse.includes('a-level')) {
          evidence.lifeStage = 'secondary_school';
        } else if (lowerResponse.includes('uni') || lowerResponse.includes('college') || lowerResponse.includes('student')) {
          evidence.lifeStage = 'uni_college';
        } else if (lowerResponse.includes('graduate') || lowerResponse.includes('just finished') || lowerResponse.includes('recently finished')) {
          evidence.lifeStage = 'graduate';
        } else if (lowerResponse.includes('working') || lowerResponse.includes('job') || lowerResponse.includes('work')) {
          evidence.lifeStage = 'working';
        } else if (lowerResponse.includes('gap year') || lowerResponse.includes('taking time')) {
          evidence.lifeStage = 'gap_year';
        } else if (lowerResponse.includes('neet') || lowerResponse.includes('between things')) {
          evidence.lifeStage = 'neet';
        }
        break;

      case 'career_direction':
        // Look for specific career mentions
        const careerKeywords = ['doctor', 'teacher', 'engineer', 'nurse', 'lawyer', 'designer', 'developer', 'programmer', 'marketing', 'business', 'finance', 'psychology', 'medicine', 'education', 'technology', 'arts', 'music', 'sports'];
        const mentionedCareers: string[] = [];
        
        careerKeywords.forEach(keyword => {
          if (lowerResponse.includes(keyword)) {
            mentionedCareers.push(keyword);
          }
        });
        
        if (lowerResponse.includes('no idea') || lowerResponse.includes('don\'t know') || lowerResponse.includes('figuring out') || lowerResponse.includes('lost')) {
          evidence.careerDirection = 'no_idea';
        } else if (lowerResponse.includes('few') || lowerResponse.includes('several') || lowerResponse.includes('multiple') || mentionedCareers.length > 1) {
          evidence.careerDirection = 'few_ideas';
          evidence.careerSpecifics = mentionedCareers;
        } else if (mentionedCareers.length === 1 || lowerResponse.includes('want to be') || lowerResponse.includes('planning to')) {
          evidence.careerDirection = 'one_goal';
          evidence.careerSpecifics = mentionedCareers;
        }
        break;

      case 'confidence_assessment':
        if (lowerResponse.includes('very confident') || lowerResponse.includes('absolutely') || lowerResponse.includes('100%') || lowerResponse.includes('certain')) {
          evidence.confidenceLevel = 'very_high';
        } else if (lowerResponse.includes('confident') || lowerResponse.includes('sure') || lowerResponse.includes('pretty confident')) {
          evidence.confidenceLevel = 'high';
        } else if (lowerResponse.includes('not sure') || lowerResponse.includes('maybe') || lowerResponse.includes('think so') || lowerResponse.includes('doubt')) {
          evidence.confidenceLevel = 'low';
        } else if (lowerResponse.includes('somewhat') || lowerResponse.includes('moderately') || lowerResponse.includes('fairly')) {
          evidence.confidenceLevel = 'moderate';
        }
        break;

      case 'motivation_exploration':
        const intrinsicKeywords = ['love', 'passion', 'enjoy', 'excited', 'interested', 'fascinating', 'fulfilling'];
        const extrinsicKeywords = ['money', 'salary', 'parents', 'family', 'stable', 'secure', 'practical', 'pays well'];
        
        const intrinsicCount = intrinsicKeywords.filter(keyword => lowerResponse.includes(keyword)).length;
        const extrinsicCount = extrinsicKeywords.filter(keyword => lowerResponse.includes(keyword)).length;
        
        if (intrinsicCount > extrinsicCount) {
          evidence.motivation = 'intrinsic';
        } else if (extrinsicCount > intrinsicCount) {
          evidence.motivation = 'extrinsic';
        } else if (intrinsicCount > 0 && extrinsicCount > 0) {
          evidence.motivation = 'mixed';
        }
        break;

      case 'goal_clarification':
        if (lowerResponse.includes('discover') || lowerResponse.includes('explore') || lowerResponse.includes('find') || lowerResponse.includes('inspiration')) {
          evidence.userIntent = 'discover';
        } else if (lowerResponse.includes('compare') || lowerResponse.includes('narrow') || lowerResponse.includes('decide') || lowerResponse.includes('choose')) {
          evidence.userIntent = 'compare';
        } else if (lowerResponse.includes('next steps') || lowerResponse.includes('plan') || lowerResponse.includes('how to') || lowerResponse.includes('apply')) {
          evidence.userIntent = 'plan';
        }
        break;

      case 'exploration_history':
        if (lowerResponse.includes('nothing') || lowerResponse.includes('no') || lowerResponse.includes('haven\'t')) {
          evidence.explorationHistory = 'none';
        } else if (lowerResponse.includes('research') || lowerResponse.includes('adviser') || lowerResponse.includes('career quiz')) {
          evidence.explorationHistory = 'some';
        } else if (lowerResponse.includes('internship') || lowerResponse.includes('work experience') || lowerResponse.includes('mentoring') || lowerResponse.includes('job shadowing')) {
          evidence.explorationHistory = 'extensive';
        }
        break;
    }

    return { evidence, suggestedFollowUp };
  }

  /**
   * Check if stage is complete based on evidence
   */
  private isStageComplete(stageId: string, evidence: Partial<OnboardingEvidence>): boolean {
    switch (stageId) {
      case 'rapport_name':
        return !!evidence.name;
      case 'life_stage':
        return !!evidence.lifeStage;
      case 'career_direction':
        return !!evidence.careerDirection;
      case 'confidence_assessment':
        return !!evidence.confidenceLevel;
      case 'motivation_exploration':
        return !!evidence.motivation;
      case 'goal_clarification':
        return !!evidence.userIntent;
      case 'exploration_history':
        return !!evidence.explorationHistory;
      default:
        return false;
    }
  }

  /**
   * Store evidence in session storage
   */
  private updateCollectedEvidence(newEvidence: Partial<OnboardingEvidence>): void {
    const sessionId = guestSessionService.getSessionId();
    const currentEvidence = this.getCollectedEvidence(sessionId);
    const updatedEvidence = { ...currentEvidence, ...newEvidence };
    
    // Store in guest session (you might want to use a more specific method)
    const session = guestSessionService.getGuestSession();
    if (session) {
      (session as any).onboardingEvidence = updatedEvidence;
    }
  }

  /**
   * Get collected evidence from session
   */
  private getCollectedEvidence(sessionId: string): OnboardingEvidence {
    const session = guestSessionService.getGuestSession();
    return (session as any)?.onboardingEvidence || {};
  }

  /**
   * Check if enough evidence is collected for persona classification
   */
  private isReadyForClassification(evidence: OnboardingEvidence): boolean {
    // Minimum required evidence: name, life stage, and career direction
    return !!(evidence.name && evidence.lifeStage && evidence.careerDirection);
  }

  /**
   * Classify persona based on collected evidence using deterministic rules
   */
  classifyPersona(evidence: OnboardingEvidence): ClassificationResult {
    console.log('🎯 Classifying persona based on evidence:', evidence);
    
    let persona: PersonaType = 'exploring_undecided';
    let confidence = 0.7; // Default confidence
    let reasoning = '';

    // Apply G1-G4 classification matrix based on evidence
    if (evidence.careerDirection === 'no_idea' || 
        (evidence.careerDirection === 'few_ideas' && evidence.confidenceLevel === 'low')) {
      // G1: Uncertain & Unengaged
      persona = 'uncertain_unengaged';
      confidence = evidence.explorationHistory === 'none' ? 0.85 : 0.75;
      reasoning = 'User has no clear career direction and shows uncertainty patterns. Needs discovery support.';
      
    } else if (evidence.careerDirection === 'few_ideas' && 
               (!evidence.confidenceLevel || evidence.confidenceLevel === 'moderate')) {
      // G2: Exploring & Undecided  
      persona = 'exploring_undecided';
      confidence = evidence.explorationHistory === 'some' ? 0.85 : 0.75;
      reasoning = 'User is actively exploring multiple career options. Needs comparison frameworks.';
      
    } else if (evidence.careerDirection === 'one_goal' && 
               (evidence.confidenceLevel === 'low' || evidence.confidenceLevel === 'moderate')) {
      // G3: Tentatively Decided
      persona = 'tentatively_decided';
      confidence = evidence.motivation === 'extrinsic' ? 0.8 : 0.75;
      reasoning = 'User has one career idea but shows uncertainty. May need validation and pathway details.';
      
    } else if (evidence.careerDirection === 'one_goal' && 
               (evidence.confidenceLevel === 'high' || evidence.confidenceLevel === 'very_high')) {
      // G4: Focused & Confident
      persona = 'focused_confident';
      confidence = evidence.motivation === 'intrinsic' ? 0.9 : 0.8;
      reasoning = 'User has clear career goal with high confidence. Ready for action planning.';
    }

    // Adjust confidence based on additional evidence factors
    if (evidence.motivation === 'intrinsic') confidence += 0.05;
    if (evidence.explorationHistory === 'extensive') confidence += 0.1;
    if (evidence.userIntent === 'plan' && persona === 'focused_confident') confidence += 0.05;
    
    // Cap confidence at 0.95
    confidence = Math.min(confidence, 0.95);

    console.log('✅ Persona classification complete:', {
      persona,
      confidence: Math.round(confidence * 100) + '%',
      reasoning
    });

    return {
      persona,
      confidence,
      reasoning,
      evidence
    };
  }

  /**
   * Get next recommended question based on current evidence and stage
   */
  getNextQuestion(evidence: OnboardingEvidence): string {
    const progress = this.getCurrentProgress();
    const questions = this.getCurrentStageQuestions();
    
    // Return random question from current stage variants
    return questions[Math.floor(Math.random() * questions.length)];
  }

  /**
   * Mark stage as complete and progress to next
   */
  completeStage(stageId: string): void {
    const stage = this.stages.find(s => s.id === stageId);
    if (stage) {
      stage.completed = true;
    }
  }

  /**
   * Reset onboarding progress
   */
  reset(): void {
    this.stages.forEach(stage => {
      stage.completed = false;
    });
    
    // Clear evidence from session
    const session = guestSessionService.getGuestSession();
    if (session) {
      delete (session as any).onboardingEvidence;
    }
  }

  /**
   * Get conversation control phrases for stage management
   */
  getStageControlPhrases(): string[] {
    return [
      "That sounds fascinating! Before we explore that deeply, I'd love to understand {missing_stage} so I can give you the best guidance.",
      "I love hearing about that! Quick question first though - {stage_question}",
      "That's really valuable insight. I want to make sure I understand your full situation first...",
      "Great point! Let me ask one more thing about your overall situation...",
      "That's interesting! Help me understand {missing_evidence} first..."
    ];
  }
}

// Export singleton instance
export const naturalLanguageOnboardingService = new NaturalLanguageOnboardingService();