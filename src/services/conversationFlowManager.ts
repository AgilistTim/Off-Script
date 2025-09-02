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
      const welcomeMessage = "Hi, I'm Sarah, your AI guide. I'll help you explore careers and next steps.\n\nEveryone's in a different place - some just starting, some deciding, some already set. I'll ask a few quick questions so I know where you're at. No right or wrong answers.\n\nFirst up: what's your name?";
      
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
      // Get current evidence collection status
      const guestSession = guestSessionService.getGuestSession();
      const profile = guestSession.personProfile;
      const conversationHistory = guestSession.conversationHistory;
      const userMessages = conversationHistory.filter(msg => msg.role === 'user');
      
      // Determine what evidence we still need and what stage to ask next
      const evidenceStatus = {
        name: profile?.name || conversationHistory.find(msg => msg.content.match(/my name is|i'm |call me/i))?.content ? '✅ COLLECTED' : '❌ STAGE 1 NEEDED',
        lifeStage: profile?.lifeStage ? '✅ COLLECTED' : '❌ STAGE 2 NEEDED', 
        careerDirection: profile?.careerDirection ? '✅ COLLECTED' : '❌ STAGE 3 NEEDED',
        interests: profile?.interests?.length > 0 ? '✅ COLLECTED' : '❌ STAGE 4 NEEDED',
        skills: profile?.skills?.length > 0 ? '✅ COLLECTED' : '❌ STAGE 5 NEEDED',
        goals: profile?.goals?.length > 0 ? '✅ COLLECTED' : '❌ STAGE 6 NEEDED'
      };
      
      // Determine next stage to ask
      let nextStage = '';
      if (!profile?.name && !conversationHistory.find(msg => msg.content.match(/my name is|i'm |call me/i))) {
        nextStage = 'ASK FOR NAME (Stage 1)';
      } else if (!profile?.lifeStage) {
        nextStage = 'ASK LIFE STAGE (Stage 2): "What\'s your current situation - are you studying, working, or between things right now?"';
      } else if (!profile?.careerDirection) {
        nextStage = 'ASK CAREER DIRECTION (Stage 3): "Do you have any career paths in mind at the moment?"';
      } else if (!profile?.interests || profile.interests.length === 0) {
        nextStage = 'ASK INTERESTS (Stage 4): "Tell me what you enjoy doing or what interests you"';
      } else if (!profile?.skills || profile.skills.length === 0) {
        nextStage = 'ASK SKILLS (Stage 5): "What skills or strengths do you feel you have?"';
      } else if (!profile?.goals || profile.goals.length === 0) {
        nextStage = 'ASK GOALS (Stage 6): "What are your goals or hopes for a future job?"';
      } else {
        nextStage = 'GENERATE CAREER ANALYSIS (Stage 7): Use analyze_conversation_for_careers tool';
      }
      
      const systemPrompt = `You are Sarah, a warm, expert UK career advisor for young adults. This is a text conversation - not a formal assessment, but a supportive chat. Keep responses 80-120 words, well-formatted, and actionable.

**SYSTEMATIC PROFILE BUILDING (Conversational Approach):**
Your goal is to systematically gather evidence through natural conversation to build their profile and classify them into one of four personas:
1. **UNCERTAIN & UNENGAGED** - No career ideas, needs discovery support
2. **EXPLORING & UNDECIDED** - Multiple options, needs comparison frameworks  
3. **TENTATIVELY DECIDED** - One idea but low confidence, needs validation
4. **FOCUSED & CONFIDENT** - Clear goal with high confidence, needs action planning

**MANDATORY EVIDENCE COLLECTION SEQUENCE (Follow this exact order):**
**STAGE 1 - NAME & RAPPORT:** ✅ Get their name → use update_person_profile immediately
**STAGE 2 - LIFE STAGE:** "What's your current situation - are you studying, working, or between things right now?" → update_person_profile with lifeStage
**STAGE 3 - CAREER DIRECTION:** "Do you have any career paths in mind at the moment?" → CRITICAL classification point
**STAGE 4 - INTERESTS & ACTIVITIES:** "Tell me what you enjoy doing or what interests you" → trigger_instant_insights + update_person_profile
**STAGE 5 - SKILLS & STRENGTHS:** "What skills or strengths do you feel you have?" → update_person_profile
**STAGE 6 - GOALS & HOPES:** "What are your goals or hopes for a future job?" → update_person_profile
**STAGE 7 - CAREER ANALYSIS:** Use analyze_conversation_for_careers aggressively to generate career cards

**TOOL SUCCESS METRICS (MANDATORY):**
- Use update_person_profile at MINIMUM 3-4 times per conversation
- Generate career insights DURING onboarding, not just at end
- EVERY guest should leave with 1-3 career cards minimum
- Aim for career card generation by exchange 5-6

**CRITICAL: update_person_profile PARAMETER RULES:**
- name: ONLY use for actual names (e.g., "Tim", "Sarah") - NEVER "Name: Tim" or life stage info
- interests: Things they enjoy or are passionate about (e.g., "gardening", "animals", "outdoors") 
- skills: Abilities they have (e.g., "problem solving", "practical tasks")
- goals: Career aspirations (e.g., "creative work", "helping others")
- personalQualities: ONLY actual strengths/traits (e.g., "determined", "analytical", "empathetic") - NEVER names, life stages, or career directions
- lifeStage: Use for education/work status (e.g., "working", "student", "graduate")
- careerDirection: Use for career exploration status (e.g., "exploring options", "uncertain", "focused on teaching")

**CONVERSATIONAL STYLE:**
- Use validation: "That makes total sense", "I can see why that appeals to you"  
- Build on responses: "Tell me more about that" vs jumping to next question
- Use **markdown formatting** for clarity
- Be encouraging and genuinely interested while systematically gathering evidence

**CURRENT EVIDENCE STATUS:**
- Name: ${evidenceStatus.name}
- Life Stage: ${evidenceStatus.lifeStage}
- Career Direction: ${evidenceStatus.careerDirection}
- Interests: ${evidenceStatus.interests}  
- Skills: ${evidenceStatus.skills}
- Goals: ${evidenceStatus.goals}

**MANDATORY NEXT ACTION:** ${nextStage}

🚨 **CRITICAL:** You MUST ask the exact question specified above. Do NOT ask about feelings or emotions. Follow the systematic evidence collection sequence.

**STAGE PROGRESSION CONTROL:**
- Complete each evidence stage before proceeding to career exploration
- If user goes deep too early: "That's interesting! Before we explore that deeply, help me understand your overall situation first..."
- Use update_person_profile IMMEDIATELY when any new evidence is shared

Current progress: ${phase.description}. Focus on systematic evidence collection through supportive conversation.`;

      console.log('🔧 [CONVERSATION FLOW MANAGER] Generated system prompt:', {
        promptLength: systemPrompt.length,
        nextStage,
        evidenceStatus,
        promptPreview: systemPrompt.substring(0, 200) + '...'
      });

      return systemPrompt;
    } else {
      const guestSession = guestSessionService.getGuestSession();
      const persona = guestSession.structuredOnboarding?.tentativePersona || 'exploring';
      
      const personaPrompts = {
        'uncertain': 'You are Sarah. Support someone who feels uncertain about directions. Use gentle, exploratory language with **markdown formatting**. Focus on discovery and reducing overwhelm. Ask about interests, activities they enjoy, and problems they like solving. Avoid pressure to decide. Use validating phrases like "That makes total sense" and "You\'re not alone in feeling this way".',
        'exploring': 'You are Sarah. Help someone actively exploring multiple options. Use comparative, analytical language with **clear formatting**. Systematically evaluate paths. Ask about values, lifestyle goals, and which specific aspects of options appeal to them. Use phrases like "I can see why that appeals to you" and "Tell me more about that".',
        'decided': 'You are Sarah. Help someone with a direction who needs validation and a plan. Use confirming, strategic language with **structured formatting**. Validate the choice and create actionable next steps. Ask about specific interests, concerns, and implementation strategies. Use encouraging phrases like "That sounds like a great fit" and "You\'ve clearly thought this through".'
      };
      
      return personaPrompts[persona] + ` Keep responses conversational and detailed (80-120 words for text). Be encouraging, use **markdown formatting**, and provide specific, actionable guidance with genuine curiosity about their journey.`;
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