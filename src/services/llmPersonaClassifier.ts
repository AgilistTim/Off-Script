/**
 * LLM Persona Classifier Service
 * 
 * Uses LLM to parse natural language responses and extract persona evidence
 * for more accurate classification than keyword matching alone
 */

import { PersonaType } from './personaService';
import { OnboardingEvidence } from './naturalLanguageOnboardingService';

interface LLMClassificationPrompt {
  systemPrompt: string;
  userPrompt: string;
  responseSchema: any;
}

interface LLMEvidenceExtraction {
  evidence: Partial<OnboardingEvidence>;
  confidence: number;
  reasoning: string;
  suggestedFollowUp?: string;
}

interface LLMPersonaClassification {
  persona: PersonaType;
  confidence: number;
  reasoning: string;
  evidence: OnboardingEvidence;
  adaptationRecommendations: string[];
}

/**
 * Service that uses LLM to classify personas from natural language conversations
 */
export class LLMPersonaClassifier {

  /**
   * Extract evidence from natural language response using LLM analysis
   */
  async extractEvidenceFromResponse(
    response: string,
    stageId: string,
    currentEvidence: OnboardingEvidence
  ): Promise<LLMEvidenceExtraction> {
    const prompt = this.buildEvidenceExtractionPrompt(response, stageId, currentEvidence);
    
    // In a real implementation, you would call your LLM API here
    // For now, return a mock response that follows the pattern
    return this.mockLLMEvidenceExtraction(response, stageId);
  }

  /**
   * Classify persona based on complete conversation evidence using LLM
   */
  async classifyPersonaFromEvidence(evidence: OnboardingEvidence): Promise<LLMPersonaClassification> {
    const prompt = this.buildPersonaClassificationPrompt(evidence);
    
    // In a real implementation, you would call your LLM API here
    return this.mockLLMPersonaClassification(evidence);
  }

  /**
   * Build evidence extraction prompt for LLM
   */
  private buildEvidenceExtractionPrompt(
    response: string,
    stageId: string,
    currentEvidence: OnboardingEvidence
  ): LLMClassificationPrompt {
    const systemPrompt = `You are an expert career counselor analyzing young adults' responses to extract persona classification evidence.

CURRENT ONBOARDING STAGE: ${stageId}

EXTRACTION GOALS BY STAGE:
- rapport_name: Extract their name (first name only)
- life_stage: Classify their current situation (secondary_school, uni_college, graduate, working, neet, gap_year)
- career_direction: Determine career clarity (no_idea, few_ideas, one_goal) and extract specific career mentions
- confidence_assessment: Gauge confidence level (low, moderate, high, very_high)
- motivation_exploration: Identify motivation type (intrinsic, extrinsic, mixed)  
- goal_clarification: Understand their intent (discover, compare, plan)
- exploration_history: Assess exploration background (none, some, extensive)

CRITICAL EVIDENCE PATTERNS:
- UNCERTAINTY SIGNALS: "I don't know", "not sure", "maybe", hedging language
- CONFIDENCE SIGNALS: "definitely", "absolutely", "I'm sure", decisive language
- INTRINSIC MOTIVATION: passion, interest, enjoyment, fulfillment words
- EXTRINSIC MOTIVATION: money, security, family pressure, practical considerations
- ENGAGEMENT LEVEL: Length of response, detail sharing, questions asked back

RESPONSE FORMAT: Return structured JSON with:
{
  "evidence": {
    // Only include fields you can confidently extract from this response
    "name": "string (if extractable)",
    "lifeStage": "enum (if clear)",
    "careerDirection": "enum (if determinable)",
    "careerSpecifics": ["array of mentioned careers"],
    "confidenceLevel": "enum (if evident)",
    "motivation": "enum (if clear)",
    "userIntent": "enum (if evident)",
    "explorationHistory": "enum (if mentioned)"
  },
  "confidence": 0.85, // 0-1 confidence in extraction
  "reasoning": "Brief explanation of what patterns you detected",
  "suggestedFollowUp": "Optional follow-up question if more clarity needed"
}

PREVIOUS EVIDENCE COLLECTED:
${JSON.stringify(currentEvidence, null, 2)}

Analyze the response for patterns that indicate persona classification evidence. Be conservative - only extract evidence you're confident about.`;

    const userPrompt = `USER RESPONSE TO ANALYZE: "${response}"

Extract persona evidence from this response based on the current onboarding stage (${stageId}). Look for the specific evidence patterns outlined in the system prompt.`;

    return {
      systemPrompt,
      userPrompt,
      responseSchema: {
        type: "object",
        properties: {
          evidence: { type: "object" },
          confidence: { type: "number" },
          reasoning: { type: "string" },
          suggestedFollowUp: { type: "string" }
        }
      }
    };
  }

  /**
   * Build persona classification prompt for LLM
   */
  private buildPersonaClassificationPrompt(evidence: OnboardingEvidence): LLMClassificationPrompt {
    const systemPrompt = `You are an expert career counselor classifying young adults into career decision personas based on conversation evidence.

PERSONA CLASSIFICATION MATRIX (G1-G4):

G1: UNCERTAIN & UNENGAGED
- Career Direction: No ideas or very few unclear ideas
- Confidence: Low or non-existent
- Engagement: Low uncertainty, may seem disengaged
- Support Needs: Discovery, confidence building, broad exploration
- Evidence Patterns: "I don't know", "no idea", minimal career mentions

G2: EXPLORING & UNDECIDED  
- Career Direction: Multiple ideas they're actively considering
- Confidence: Moderate, comfortable with exploration process
- Engagement: High, asking questions, actively researching
- Support Needs: Comparison frameworks, decision tools, structured exploration
- Evidence Patterns: Multiple career mentions, research activity, comparative language

G3: TENTATIVELY DECIDED
- Career Direction: One primary career direction
- Confidence: Low to moderate, some uncertainty/doubt
- Motivation: May be more extrinsic (family pressure, practical considerations)
- Support Needs: Validation, detailed pathway information, confidence building
- Evidence Patterns: Single career focus but uncertainty language

G4: FOCUSED & CONFIDENT
- Career Direction: Clear, specific career goal
- Confidence: High, decisive language
- Motivation: Often intrinsic (passion, genuine interest)
- Support Needs: Action planning, specific next steps, implementation guidance
- Evidence Patterns: Decisive language, clear goals, action-oriented

CLASSIFICATION LOGIC:
1. Start with career direction (none/few/one clear)
2. Layer in confidence level (low/moderate/high)
3. Consider motivation patterns (intrinsic vs extrinsic)
4. Factor in engagement and exploration history
5. Assign confidence score (70-90% range)

RESPONSE FORMAT:
{
  "persona": "one of: uncertain_unengaged, exploring_undecided, tentatively_decided, focused_confident",
  "confidence": 0.85, // 0.7-0.95 range
  "reasoning": "Clear explanation of why this persona fits the evidence",
  "evidence": { /* copy of input evidence */ },
  "adaptationRecommendations": [
    "Specific conversation style adaptations",
    "Question types to use",  
    "Support approaches to emphasize"
  ]
}

Classify based on evidence patterns, not assumptions. Be confident in your assessment while staying within the 70-95% confidence range.`;

    const userPrompt = `CONVERSATION EVIDENCE TO CLASSIFY:
${JSON.stringify(evidence, null, 2)}

Based on this evidence, classify this person into one of the four career decision personas (G1-G4). Use the classification matrix to determine the best fit.`;

    return {
      systemPrompt,
      userPrompt,
      responseSchema: {
        type: "object",
        properties: {
          persona: { type: "string" },
          confidence: { type: "number" },
          reasoning: { type: "string" },
          evidence: { type: "object" },
          adaptationRecommendations: { type: "array" }
        }
      }
    };
  }

  /**
   * Mock LLM evidence extraction (replace with actual LLM call)
   */
  private async mockLLMEvidenceExtraction(
    response: string,
    stageId: string
  ): Promise<LLMEvidenceExtraction> {
    // This would be replaced with actual LLM API call
    const lowerResponse = response.toLowerCase();
    const evidence: Partial<OnboardingEvidence> = {};
    let confidence = 0.8;
    let reasoning = '';

    switch (stageId) {
      case 'rapport_name':
        const nameMatch = response.match(/(?:i'm|im|name is|call me|my name is)\s+([a-zA-Z]+)/i) ||
                         response.match(/^([a-zA-Z]+)$/);
        if (nameMatch) {
          evidence.name = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1).toLowerCase();
          reasoning = 'Extracted name from direct statement or single word response';
          confidence = 0.9;
        } else {
          reasoning = 'No clear name pattern detected in response';
          confidence = 0.3;
        }
        break;

      case 'career_direction':
        if (lowerResponse.includes('no idea') || lowerResponse.includes('don\'t know')) {
          evidence.careerDirection = 'no_idea';
          reasoning = 'Strong uncertainty language indicates no clear direction';
          confidence = 0.9;
        } else if (lowerResponse.includes('few') || lowerResponse.includes('several')) {
          evidence.careerDirection = 'few_ideas';
          reasoning = 'Multiple options mentioned, indicating active exploration';
          confidence = 0.85;
        } else {
          // Look for specific career mentions
          const careerWords = ['doctor', 'teacher', 'engineer', 'nurse', 'lawyer'];
          const mentions = careerWords.filter(word => lowerResponse.includes(word));
          if (mentions.length === 1) {
            evidence.careerDirection = 'one_goal';
            evidence.careerSpecifics = mentions;
            reasoning = 'Single specific career mentioned';
            confidence = 0.8;
          }
        }
        break;

      default:
        reasoning = 'Mock analysis - would use actual LLM for pattern recognition';
    }

    return {
      evidence,
      confidence,
      reasoning,
      suggestedFollowUp: confidence < 0.7 ? 'Could you tell me a bit more about that?' : undefined
    };
  }

  /**
   * Mock LLM persona classification (replace with actual LLM call)
   */
  private async mockLLMPersonaClassification(
    evidence: OnboardingEvidence
  ): Promise<LLMPersonaClassification> {
    // This would be replaced with actual LLM API call
    let persona: PersonaType = 'exploring_undecided';
    let confidence = 0.75;
    let reasoning = '';
    const adaptationRecommendations: string[] = [];

    // Simple classification logic for mock
    if (evidence.careerDirection === 'no_idea') {
      persona = 'uncertain_unengaged';
      confidence = 0.8;
      reasoning = 'No clear career direction indicates need for discovery and exploration support';
      adaptationRecommendations.push(
        'Use broad, non-pressured questions',
        'Focus on interests and values before careers',
        'Build confidence through small wins'
      );
    } else if (evidence.careerDirection === 'few_ideas') {
      persona = 'exploring_undecided';
      confidence = 0.85;
      reasoning = 'Multiple career options indicate active exploration phase';
      adaptationRecommendations.push(
        'Provide comparison frameworks',
        'Support structured decision-making',
        'Help organize thoughts and priorities'
      );
    } else if (evidence.careerDirection === 'one_goal' && evidence.confidenceLevel === 'low') {
      persona = 'tentatively_decided';
      confidence = 0.8;
      reasoning = 'Has direction but lacks confidence, needs validation';
      adaptationRecommendations.push(
        'Validate their choice while exploring doubts',
        'Provide detailed pathway information',
        'Address confidence concerns'
      );
    } else if (evidence.careerDirection === 'one_goal' && evidence.confidenceLevel === 'high') {
      persona = 'focused_confident';
      confidence = 0.9;
      reasoning = 'Clear direction with high confidence, ready for action planning';
      adaptationRecommendations.push(
        'Focus on implementation and next steps',
        'Provide specific, actionable guidance',
        'Support their momentum'
      );
    }

    return {
      persona,
      confidence,
      reasoning,
      evidence,
      adaptationRecommendations
    };
  }

  /**
   * Generate conversation adaptation based on persona classification
   */
  generateConversationAdaptation(persona: PersonaType): {
    questionStyle: string;
    pacing: string;
    supportLevel: string;
    focusAreas: string[];
  } {
    const adaptations = {
      uncertain_unengaged: {
        questionStyle: 'Open-ended, broad, non-pressuring',
        pacing: 'Slow and gentle, no rush to decide',
        supportLevel: 'High encouragement, confidence building',
        focusAreas: ['Values exploration', 'Interest discovery', 'Small wins']
      },
      exploring_undecided: {
        questionStyle: 'Structured comparison, analytical',
        pacing: 'Moderate, systematic exploration',
        supportLevel: 'Framework provision, decision support',
        focusAreas: ['Option comparison', 'Decision criteria', 'Research guidance']
      },
      tentatively_decided: {
        questionStyle: 'Validating but probing for concerns',
        pacing: 'Careful validation with deeper exploration',
        supportLevel: 'Confidence building, doubt addressing',
        focusAreas: ['Path validation', 'Concern exploration', 'Detailed planning']
      },
      focused_confident: {
        questionStyle: 'Direct, action-oriented, specific',
        pacing: 'Efficient, momentum-maintaining',
        supportLevel: 'Implementation focused, practical',
        focusAreas: ['Next steps', 'Skill development', 'Goal achievement']
      }
    };

    return adaptations[persona];
  }

  /**
   * Real LLM API call (placeholder - implement with your LLM service)
   */
  private async callLLMAPI(prompt: LLMClassificationPrompt): Promise<any> {
    // TODO: Implement actual LLM API call
    // This could be OpenAI, Claude, or any other LLM service
    throw new Error('LLM API integration not implemented yet');
  }
}

// Export singleton instance
export const llmPersonaClassifier = new LLMPersonaClassifier();