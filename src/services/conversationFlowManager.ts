/**
 * ConversationFlowManager - Orchestrates the complete user journey
 * 
 * Manages the transition between:
 * Phase 1: Q1-Q6 Structured Onboarding (0% → 100% progress)
 * Phase 2: Career exploration and profile refinement
 */

import { guestSessionService } from './guestSessionService';
import { structuredOnboardingService } from './structuredOnboardingService';

export interface ConversationPhase {
  phase: 'onboarding' | 'career_conversation';
  progress: number; // 0-1
  description: string;
}

export class ConversationFlowManager {
  
  /**
   * Determine current conversation phase based on user state
   */
  getCurrentPhase(): ConversationPhase {
    const guestSession = guestSessionService.getGuestSession();
    const structuredOnboarding = guestSession.structuredOnboarding;
    
    // Check if user has completed structured onboarding
    if (structuredOnboarding?.isComplete) {
      return {
        phase: 'career_conversation',
        progress: 1.0, // 100% - onboarding complete, continuing to refine profile
        description: 'Profile complete - exploring career options'
      };
    }
    
    // Check for natural conversation completion based on message content analysis
    const messageCount = guestSession.conversationHistory.length;
    const userMessages = guestSession.conversationHistory.filter(msg => msg.role === 'user');
    
    // Detect if natural onboarding is complete based on evidence collected
    const hasNaturalEvidence = this.hasCollectedNaturalEvidence(userMessages);
    
    if (hasNaturalEvidence && messageCount >= 10) {
      // Natural conversation has gathered sufficient evidence
      return {
        phase: 'career_conversation', 
        progress: 1.0,
        description: 'Profile complete - exploring career options'
      };
    }
    
    // Calculate progress based on message count and evidence collection
    const responseCount = structuredOnboarding?.responses?.length || 0;
    const totalQuestions = 6;
    
    // Use natural conversation progress if no structured responses
    let progress: number;
    if (responseCount > 0) {
      progress = responseCount / totalQuestions;
    } else {
      // Estimate progress based on user message count (6-8 messages typically completes onboarding)
      progress = Math.min(userMessages.length / 6, 0.9); // Cap at 90% until completion detected
    }
    
    return {
      phase: 'onboarding',
      progress,
      description: `Building your profile (${userMessages.length}/6 steps)`
    };
  }

  /**
   * Analyze user messages to detect if natural onboarding evidence has been collected
   */
  private hasCollectedNaturalEvidence(userMessages: any[]): boolean {
    const allContent = userMessages.map(msg => msg.content.toLowerCase()).join(' ');
    
    // Check for key evidence indicators
    const hasName = userMessages.length > 0 && userMessages[0].content.length > 2;
    const hasWorkInfo = /work|job|employ|student|study|school|college|uni/i.test(allContent);
    const hasInterests = /enjoy|like|interest|passion|love|prefer/i.test(allContent);
    const hasSkills = /good at|skill|ability|confident|experience/i.test(allContent);
    const hasGoals = /want|goal|future|career|path|plan|hope|looking/i.test(allContent);
    
    const evidenceCount = [hasName, hasWorkInfo, hasInterests, hasSkills, hasGoals].filter(Boolean).length;
    
    // Natural onboarding complete if we have 4+ key evidence points
    return evidenceCount >= 4;
  }
  
  /**
   * Generate appropriate response based on current phase
   */
  generatePhaseAwareResponse(userMessage: string, messageCount: number): string {
    const currentPhase = this.getCurrentPhase();
    
    if (currentPhase.phase === 'onboarding') {
      return this.handleOnboardingPhase(userMessage, messageCount);
    } else {
      return this.handleCareerConversationPhase(userMessage, messageCount);
    }
  }
  
  /**
   * Handle Q1-Q6 structured onboarding phase
   */
  private handleOnboardingPhase(userMessage: string, messageCount: number): string {
    // First message - Initialize and welcome
    if (messageCount <= 1) {
      // ALWAYS use the required Sarah introduction message
      const welcomeMessage = "Hi, I'm Sarah an AI assistant. I'm here to help you think about careers and next steps. Lots of people feel unsure about their future — some have no idea where to start, some are weighing up different paths, and some already have a clear goal.\n\nTo make sure I can give you the most useful support, I'll ask a few quick questions about where you're at right now. There are no right or wrong answers — just tell me in your own words. By the end, I'll have a better idea whether you need help discovering options, narrowing down choices, or planning the next steps for a career you already have in mind.\n\nFirst up whats your name?";
      
      // Initialize structured onboarding for fresh users
      const guestSession = guestSessionService.getGuestSession();
      if (!guestSession.structuredOnboarding) {
        structuredOnboardingService.initializeStructuredFlow();
      }
      
      return welcomeMessage;
    }
    
    // Process structured question responses
    return this.processStructuredOnboardingResponse(userMessage);
  }
  
  /**
   * Process user responses to structured onboarding questions
   */
  private processStructuredOnboardingResponse(userMessage: string): string {
    const currentQuestion = structuredOnboardingService.getCurrentQuestion();
    
    if (!currentQuestion) {
      return "Let me continue with the assessment to understand your career situation better.";
    }
    
    // Handle multiple choice questions
    if (currentQuestion.type === 'multiple_choice' && currentQuestion.options) {
      const numberMatch = userMessage.match(/^(\d+)\.?\s*/);
      if (numberMatch) {
        const responseIndex = parseInt(numberMatch[1]) - 1;
        if (responseIndex >= 0 && responseIndex < currentQuestion.options.length) {
          try {
            const newState = structuredOnboardingService.submitResponse(currentQuestion.id, responseIndex);
            
            // Check if onboarding is complete → PHASE TRANSITION
            if (newState.isComplete) {
              const persona = newState.tentativePersona || 'exploring';
              return this.generatePhaseTransitionMessage(persona);
            } else {
              // Continue with next question
              const nextPrompt = structuredOnboardingService.getStructuredPrompt();
              return nextPrompt ? `Thank you! ${nextPrompt}` : "Thank you for that response. Let me continue with the assessment.";
            }
          } catch (error) {
            console.error('❌ Error processing structured response:', error);
            return "I had trouble processing that. Could you please select one of the numbered options?";
          }
        } else {
          return `Please choose a number between 1 and ${currentQuestion.options.length} from the options I provided.`;
        }
      } else {
        return "Please respond with just the number (1, 2, 3, etc.) that best describes your situation.";
      }
    }
    
    // Handle optional open-ended questions
    else if (currentQuestion.type === 'open_ended') {
      if (userMessage.trim().length < 3) {
        return "Could you provide a bit more detail? This helps me understand your situation better.";
      }
      
      try {
        const newState = structuredOnboardingService.submitResponse(currentQuestion.id, userMessage);
        
        if (newState.isComplete) {
          const persona = newState.tentativePersona || 'exploring';
          return this.generatePhaseTransitionMessage(persona);
        } else {
          const nextPrompt = structuredOnboardingService.getStructuredPrompt();
          return nextPrompt ? `Thank you for sharing. ${nextPrompt}` : "Thanks! Let me continue with the assessment.";
        }
      } catch (error) {
        console.error('❌ Error processing open-ended response:', error);
        return "Thank you for sharing. Let me continue with the next part of the assessment.";
      }
    }
    
    return "Let me continue with the assessment to understand your situation better.";
  }
  
  /**
   * Generate transition message when onboarding completes
   */
  private generatePhaseTransitionMessage(persona: 'uncertain' | 'exploring' | 'decided'): string {
    console.log('🎯 PHASE TRANSITION: Onboarding → Career Conversation', { persona });
    
    const baseTransition = "Perfect! We've built your initial profile, and we'll continue to refine it as we move on to exploring your options.";
    
    const personaSpecificFollowUp = {
      'uncertain': " Let's discover career paths that might spark your interest without any pressure. What activities or subjects do you find yourself naturally drawn to?",
      'exploring': " Now let's dive into possibilities that align with your interests and help you compare them effectively. Tell me about what genuinely interests you.",
      'decided': " Let's validate and deepen your understanding of this path while exploring strategic alternatives. Tell me more about what draws you to your career interest."
    };
    
    return baseTransition + (personaSpecificFollowUp[persona] || personaSpecificFollowUp['exploring']);
  }
  
  /**
   * Handle persona-tailored career conversation phase  
   */
  private handleCareerConversationPhase(userMessage: string, messageCount: number): string {
    const guestSession = guestSessionService.getGuestSession();
    const persona = guestSession.structuredOnboarding?.tentativePersona || 'exploring';
    
    return this.generatePersonaTailoredResponse(userMessage, persona, messageCount);
  }
  
  /**
   * Generate persona-specific career conversation responses
   */
  private generatePersonaTailoredResponse(userMessage: string, persona: 'uncertain' | 'exploring' | 'decided', messageCount: number): string {
    console.log('🎭 Generating persona-tailored response:', { persona, messageCount });
    
    if (persona === 'uncertain') {
      // G1: Gentle exploration, reduce overwhelm, discovery-focused
      const uncertainResponses = [
        "That's totally normal - many people feel this way! Let's explore what naturally interests you without any pressure to decide anything.",
        "No worries at all about not knowing yet. Let's start by discovering what activities make you lose track of time.",
        "Perfect! Being open is actually a strength. Tell me about moments when you feel most engaged - what were you doing?",
        "That's interesting! What kinds of problems or challenges do you find yourself naturally wanting to solve?",
        "Great insight! When you're not thinking about careers at all, what do you enjoy doing most?"
      ];
      return uncertainResponses[Math.floor(Math.random() * uncertainResponses.length)];
    }
    
    else if (persona === 'exploring') {
      // G2: Comparative analysis, structured exploration, option evaluation
      const exploringResponses = [
        "Great! Having options is exciting. Let's dive into each possibility and see what resonates most with you.",
        "That's excellent - you're taking a thoughtful approach. Tell me more about the options you're considering and what draws you to each.",
        "Perfect! Let's systematically explore each direction and help you compare them effectively. What's most important to you in a career?",
        "Interesting! Let's dig deeper into these possibilities. What specific aspects of each option appeal to you?",
        "That gives me good insights! How do these different paths align with your values and lifestyle goals?"
      ];
      return exploringResponses[Math.floor(Math.random() * exploringResponses.length)];
    }
    
    else if (persona === 'decided') {
      // G3/G4: Validation, strategic planning, next steps focus
      const decidedResponses = [
        "Excellent clarity! Let's validate this direction and create a strategic plan to achieve your goals.",
        "That's fantastic that you have direction. Let's explore this path deeply and identify the best next steps for you.",
        "Great! Let's dive into this career choice and make sure it aligns perfectly with your strengths and interests.",
        "Perfect! Now let's get strategic about this path. What specific aspects of this career most excite you?",
        "Wonderful! Let's validate this choice and explore how to position yourself strongly in this field."
      ];
      return decidedResponses[Math.floor(Math.random() * decidedResponses.length)];
    }
    
    return "Tell me more about what interests you and I'll provide personalized guidance based on your unique situation.";
  }
  
  /**
   * Get dynamic variables for ElevenLabs agent override
   */
  getDynamicVariablesForAgent(): Record<string, string> {
    const phase = this.getCurrentPhase();
    const guestSession = guestSessionService.getGuestSession();
    const persona = guestSession.structuredOnboarding?.tentativePersona;
    
    return {
      current_phase: phase.phase,
      progress_description: phase.description,
      user_persona: persona || 'unknown',
      progress_percent: Math.round(phase.progress * 100).toString()
    };
  }
  
  /**
   * Get phase-appropriate system prompt for agent override
   */
  getPhaseSystemPrompt(): string {
    const phase = this.getCurrentPhase();
    
    if (phase.phase === 'onboarding') {
      return `You are a professional career advisor conducting a personalized assessment. Your role is to guide the user through structured questions to understand their career situation. Be patient, encouraging, and focus ONLY on the assessment questions - do not provide career advice until the assessment is complete. Current progress: ${phase.description}.`;
    } else {
      const guestSession = guestSessionService.getGuestSession();
      const persona = guestSession.structuredOnboarding?.tentativePersona || 'exploring';
      
      const personaPrompts = {
        'uncertain': 'You are a supportive career advisor helping someone who feels uncertain about career directions. Use gentle, exploratory language. Focus on discovery and reducing overwhelm. Ask about interests, activities they enjoy, and problems they like solving. Avoid pressure to make decisions.',
        'exploring': 'You are a career advisor helping someone actively exploring multiple career options. Use comparative, analytical language. Help them systematically evaluate different paths. Ask about values, lifestyle goals, and what specific aspects of different careers appeal to them.',
        'decided': 'You are a career advisor helping someone who has career direction but needs validation and strategic planning. Use confirming, strategic language. Help them validate their choice and create actionable next steps. Ask about specific interests, concerns, and implementation strategies.'
      };
      
      return personaPrompts[persona] + ` Always be encouraging and provide specific, actionable guidance.`;
    }
  }
  
  /**
   * Check if career analysis tools should be enabled
   * Enable tools progressively during natural conversation onboarding
   */
  shouldEnableCareerTools(): boolean {
    const phase = this.getCurrentPhase();
    const guestSession = guestSessionService.getGuestSession();
    const messageCount = guestSession.conversationHistory.length;
    const userMessages = guestSession.conversationHistory.filter(msg => msg.role === 'user');
    
    // Always enable tools in career conversation phase
    if (phase.phase === 'career_conversation') {
      return true;
    }
    
    // During onboarding, enable tools progressively:
    // - update_person_profile: Enable after 2+ user messages (name + basic info)
    // - analyze_conversation_for_careers: Enable after 4+ messages (interests mentioned)
    if (phase.phase === 'onboarding') {
      // Enable profile tools early for profile building
      if (userMessages.length >= 2) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if specific tool should be enabled based on conversation progress
   */
  shouldEnableSpecificTool(toolName: string): boolean {
    const guestSession = guestSessionService.getGuestSession();
    const userMessages = guestSession.conversationHistory.filter(msg => msg.role === 'user');
    const allContent = userMessages.map(msg => msg.content.toLowerCase()).join(' ');
    
    switch (toolName) {
      case 'update_person_profile':
        // Enable profile updates early and aggressively
        return userMessages.length >= 1;
      
      case 'analyze_conversation_for_careers':
        // Enable career analysis after interests/skills are mentioned
        const hasCareerContent = /work|job|career|skill|interest|enjoy|good at|want|goal/i.test(allContent);
        return userMessages.length >= 3 && hasCareerContent;
      
      case 'generate_career_recommendations':
        // Enable recommendations after substantial profile building
        return userMessages.length >= 5;
        
      default:
        return this.shouldEnableCareerTools();
    }
  }
}

// Export singleton instance
export const conversationFlowManager = new ConversationFlowManager();