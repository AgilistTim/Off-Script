/**
 * EnhancedPersonaService - Evidence-based persona classification with real-time conversation analysis
 * 
 * Replaces LLM-based classification with deterministic rules based on extracted conversation evidence.
 * Integrates with existing PersonaService architecture while providing reliable classification.
 */

import { 
  conversationEvidenceExtractor, 
  ConversationEvidence, 
  EvidenceExtractionResult 
} from './conversationEvidenceExtractor';
import { 
  PersonaType, 
  PersonaClassification, 
  PersonaProfile,
  PersonaTailoredRecommendations,
  ConversationAnalysis,
  ConversationStyle,
  personaService 
} from './personaService';

export interface EnhancedPersonaResult {
  classification: PersonaClassification;
  evidence: ConversationEvidence;
  recommendations: PersonaRecommendations;
  confidenceFactors: ConfidenceFactors;
  nextSteps: string[];
}

export interface PersonaRecommendations {
  conversationStyle: ConversationStyle;
  focusAreas: string[];
  immediateActions: string[];
  toolSuggestions: string[];
}

export interface ConfidenceFactors {
  evidenceStrength: number; // 0-1 based on signal clarity
  messageCount: number;     // More messages = higher confidence
  consistency: number;      // Consistent signals = higher confidence
  specificity: number;      // Specific mentions = higher confidence
}

/**
 * Enhanced persona classification using evidence-based approach
 */
export class EnhancedPersonaService {

  /**
   * Analyze conversation and classify persona using evidence-based approach
   */
  async analyzeConversationForPersona(
    conversationHistory: Array<{role: 'user' | 'assistant', content: string}>,
    existingEvidence?: ConversationEvidence
  ): Promise<EnhancedPersonaResult> {
    console.log('🧠 Enhanced persona analysis starting:', {
      messageCount: conversationHistory.length,
      hasExistingEvidence: !!existingEvidence
    });

    // Extract evidence from conversation
    const extractionResult = conversationEvidenceExtractor.extractFromConversation(
      conversationHistory,
      existingEvidence
    );

    // Apply deterministic classification rules
    const classification = this.classifyPersonaFromEvidence(extractionResult.evidence);
    
    // Generate persona-specific recommendations
    const recommendations = this.generatePersonaRecommendations(
      classification.type, 
      extractionResult.evidence
    );

    // Calculate confidence factors
    const confidenceFactors = this.calculateConfidenceFactors(extractionResult.evidence);
    
    // Generate next steps
    const nextSteps = this.generateNextSteps(classification.type, extractionResult.evidence);

    const result: EnhancedPersonaResult = {
      classification,
      evidence: extractionResult.evidence,
      recommendations,
      confidenceFactors,
      nextSteps
    };

    console.log('✅ Enhanced persona analysis complete:', {
      persona: this.getPersonaDisplayName(classification.type),
      confidence: Math.round(classification.confidence * 100) + '%',
      stage: classification.stage,
      evidenceSignals: extractionResult.newSignals.length
    });

    return result;
  }

  /**
   * Classify persona using deterministic G1-G4 evidence-based rules
   */
  private classifyPersonaFromEvidence(evidence: ConversationEvidence): PersonaClassification {
    const rationale: string[] = [];
    let persona: PersonaType;
    let baseConfidence = 0.5;

    // Extract key signals
    const hasNoIdea = evidence.careerDirection.signals.includes('none');
    const hasFewIdeas = evidence.careerDirection.signals.includes('few');
    const hasOneIdea = evidence.careerDirection.signals.includes('one');
    const isExploring = evidence.careerDirection.signals.includes('exploring');
    
    const hasHighConfidence = evidence.confidenceLevel.signals.includes('high') || 
                              evidence.confidenceLevel.signals.includes('very_high');
    const hasLowConfidence = evidence.confidenceLevel.signals.includes('low') || 
                             evidence.confidenceLevel.signals.includes('very_low');
    
    const hasIntrinsicMotivation = evidence.motivation.intrinsic > evidence.motivation.extrinsic;
    const hasStrongMotivation = (evidence.motivation.intrinsic + evidence.motivation.extrinsic) > 0.4;

    // Step 1: Primary classification based on career direction (Q2 equivalent)
    if (hasNoIdea) {
      // G1: Uncertain & Unengaged
      persona = 'uncertain_unengaged';
      baseConfidence = 0.8;
      rationale.push('No current career ideas expressed');
      rationale.push('Needs discovery and exploration support');
      
    } else if (hasFewIdeas || isExploring) {
      // G2: Exploring & Undecided  
      persona = 'exploring_undecided';
      baseConfidence = 0.75;
      rationale.push('Considering multiple career options');
      rationale.push('In active exploration phase');
      
    } else if (hasOneIdea) {
      // G3 vs G4: Decide based on confidence and motivation
      if (hasLowConfidence || !hasStrongMotivation) {
        // G3: Tentatively Decided
        persona = 'tentatively_decided';
        baseConfidence = 0.7;
        rationale.push('Has career idea but lacks confidence or strong motivation');
        rationale.push('May need validation and alternative exploration');
        
      } else if (hasHighConfidence && hasIntrinsicMotivation) {
        // G4: Focused & Confident
        persona = 'focused_confident';
        baseConfidence = 0.85;
        rationale.push('Clear career goal with high confidence');
        rationale.push('Shows intrinsic motivation and commitment');
        
      } else {
        // Default to tentatively decided if mixed signals
        persona = 'tentatively_decided';
        baseConfidence = 0.65;
        rationale.push('Has career idea but mixed confidence/motivation signals');
      }
      
    } else {
      // Fallback: Infer from other signals
      if (evidence.engagement.uncertainty > 0.3) {
        persona = 'uncertain_unengaged';
        baseConfidence = 0.6;
        rationale.push('High uncertainty signals suggest exploration needed');
      } else if (evidence.careerDirection.specifics.length > 1) {
        persona = 'exploring_undecided';
        baseConfidence = 0.65;
        rationale.push('Multiple career mentions suggest exploration phase');
      } else {
        persona = 'exploring_undecided';
        baseConfidence = 0.6;
        rationale.push('Insufficient clear signals, defaulting to exploration');
      }
    }

    // Step 2: Confidence adjustments based on evidence strength
    if (evidence.careerDirection.confidence > 0.7) baseConfidence += 0.05;
    if (evidence.confidenceLevel.confidence > 0.7) baseConfidence += 0.05;
    if (evidence.messageCount > 5) baseConfidence += 0.05;
    if (evidence.careerDirection.specifics.length > 0) baseConfidence += 0.03;

    // Step 3: Determine stage based on evidence strength
    const stage = (baseConfidence > 0.75 && evidence.messageCount > 3) ? 'confirmed' : 'provisional';

    // Clamp confidence to realistic range
    const finalConfidence = Math.max(0.6, Math.min(0.95, baseConfidence));

    return {
      type: persona,
      confidence: finalConfidence,
      triggers: [], // Will be populated if needed for compatibility
      timestamp: new Date().toISOString(),
      reasoning: rationale.join('. '),
      stage
    };
  }

  /**
   * Generate persona-specific recommendations
   */
  private generatePersonaRecommendations(
    persona: PersonaType, 
    evidence: ConversationEvidence
  ): PersonaRecommendations {
    const baseRecommendations = this.getBaseRecommendationsForPersona(persona);
    
    // Adjust based on evidence
    if (evidence.engagement.uncertainty > 0.4) {
      baseRecommendations.conversationStyle.supportLevel = 'high';
      baseRecommendations.conversationStyle.decisionPressure = 'none';
    }
    
    if (evidence.engagement.enthusiasm > 0.3) {
      baseRecommendations.conversationStyle.pace = 'moderate';
      baseRecommendations.immediateActions.unshift('Leverage user enthusiasm');
    }
    
    if (evidence.careerDirection.specifics.length > 0) {
      baseRecommendations.immediateActions.unshift(
        `Explore mentioned careers: ${evidence.careerDirection.specifics.slice(0, 3).join(', ')}`
      );
    }

    return baseRecommendations;
  }

  /**
   * Base recommendations for each persona type
   */
  private getBaseRecommendationsForPersona(persona: PersonaType): PersonaRecommendations {
    switch (persona) {
      case 'uncertain_unengaged':
        return {
          conversationStyle: {
            pace: 'slow',
            depth: 'exploratory',
            supportLevel: 'high',
            decisionPressure: 'none',
            questionStyle: 'open_ended',
            encouragementLevel: 'high'
          },
          focusAreas: [
            'Interest discovery',
            'Broad career exposure', 
            'Confidence building',
            'Skills identification'
          ],
          immediateActions: [
            'Ask about interests and hobbies',
            'Explore natural strengths',
            'Provide career overview without pressure',
            'Build engagement and curiosity'
          ],
          toolSuggestions: [
            'Interest discovery questionnaire',
            'Career exploration videos',
            'Personality insights',
            'Skills assessment'
          ]
        };

      case 'exploring_undecided':
        return {
          conversationStyle: {
            pace: 'moderate',
            depth: 'focused',
            supportLevel: 'moderate',
            decisionPressure: 'gentle',
            questionStyle: 'guided',
            encouragementLevel: 'moderate'
          },
          focusAreas: [
            'Option comparison',
            'Decision frameworks',
            'Reality testing',
            'Pros and cons analysis'
          ],
          immediateActions: [
            'Help compare career options',
            'Provide decision-making tools',
            'Share career reality insights',
            'Connect similar career paths'
          ],
          toolSuggestions: [
            'Career comparison matrix',
            'Decision-making framework',
            'Reality check interviews',
            'Pathway planning tools'
          ]
        };

      case 'tentatively_decided':
        return {
          conversationStyle: {
            pace: 'moderate',
            depth: 'detailed',
            supportLevel: 'moderate',
            decisionPressure: 'gentle',
            questionStyle: 'guided',
            encouragementLevel: 'moderate'
          },
          focusAreas: [
            'Choice validation',
            'Alternative exploration',
            'Confidence building',
            'Skill gap analysis'
          ],
          immediateActions: [
            'Validate career choice gently',
            'Explore related alternatives',
            'Build confidence through information',
            'Identify next steps'
          ],
          toolSuggestions: [
            'Career validation checklist',
            'Alternative career explorer',
            'Skill development plans',
            'Mentor connections'
          ]
        };

      case 'focused_confident':
        return {
          conversationStyle: {
            pace: 'fast',
            depth: 'focused',
            supportLevel: 'low',
            decisionPressure: 'direct',
            questionStyle: 'specific',
            encouragementLevel: 'low'
          },
          focusAreas: [
            'Action planning',
            'Skill development',
            'Pathway optimization',
            'Next step execution'
          ],
          immediateActions: [
            'Create action plan',
            'Identify skill requirements',
            'Map pathway steps',
            'Connect to opportunities'
          ],
          toolSuggestions: [
            'Action planning template',
            'Skill development tracker',
            'Pathway roadmap',
            'Opportunity finder'
          ]
        };
    }
  }

  /**
   * Calculate confidence factors for transparency
   */
  private calculateConfidenceFactors(evidence: ConversationEvidence): ConfidenceFactors {
    // Evidence strength based on signal clarity
    const evidenceStrength = (
      evidence.lifeStage.confidence * 0.2 +
      evidence.careerDirection.confidence * 0.4 +
      evidence.confidenceLevel.confidence * 0.2 +
      ((evidence.motivation.intrinsic + evidence.motivation.extrinsic) / 2) * 0.2
    );

    // Consistency based on signal alignment
    const hasConsistentSignals = 
      (evidence.careerDirection.signals.length === 1) &&
      (evidence.confidenceLevel.signals.length <= 2);
    const consistency = hasConsistentSignals ? 0.8 : 0.5;

    // Specificity based on concrete mentions
    const specificity = Math.min(1, evidence.careerDirection.specifics.length * 0.3);

    return {
      evidenceStrength,
      messageCount: evidence.messageCount,
      consistency,
      specificity
    };
  }

  /**
   * Generate next steps based on persona and evidence
   */
  private generateNextSteps(persona: PersonaType, evidence: ConversationEvidence): string[] {
    const steps: string[] = [];
    
    switch (persona) {
      case 'uncertain_unengaged':
        steps.push('Continue with interest discovery questions');
        steps.push('Introduce broad career categories');
        steps.push('Build engagement through interactive content');
        break;
        
      case 'exploring_undecided':
        steps.push('Help narrow down options systematically');
        steps.push('Provide detailed career comparisons');
        steps.push('Offer decision-making frameworks');
        break;
        
      case 'tentatively_decided':
        steps.push('Gently validate current choice');
        steps.push('Explore related career paths');
        steps.push('Build confidence through detailed information');
        break;
        
      case 'focused_confident':
        steps.push('Move to action planning phase');
        steps.push('Provide specific pathway information');
        steps.push('Connect to relevant opportunities');
        break;
    }

    // Add evidence-specific steps
    if (evidence.careerDirection.specifics.length > 0) {
      steps.push(`Deep dive into: ${evidence.careerDirection.specifics[0]}`);
    }
    
    if (evidence.engagement.uncertainty > 0.4) {
      steps.push('Provide additional reassurance and support');
    }

    return steps;
  }

  /**
   * Get persona display name (compatibility with existing system)
   */
  private getPersonaDisplayName(persona: PersonaType): string {
    return personaService.getPersonaDisplayName(persona);
  }

  /**
   * Convert enhanced result to compatible PersonaProfile format
   */
  createPersonaProfile(
    sessionId: string,
    result: EnhancedPersonaResult,
    userId?: string
  ): PersonaProfile {
    const conversationAnalysis: ConversationAnalysis = {
      messageCount: result.evidence.messageCount,
      uncertaintySignals: result.evidence.engagement.uncertainty,
      engagementLevel: (result.evidence.engagement.detailSharing + result.evidence.engagement.questionAsking) / 2,
      decisionReadiness: result.evidence.careerDirection.confidence,
      goalClarity: result.evidence.careerDirection.specifics.length > 0 ? 0.8 : 0.3,
      topicEngagement: {},
      responsePatterns: []
    };

    const recommendations: PersonaTailoredRecommendations = {
      conversationStyle: result.recommendations.conversationStyle,
      focusAreas: result.recommendations.focusAreas,
      nextSteps: result.nextSteps,
      recommendedTools: result.recommendations.toolSuggestions,
      supportLevel: result.recommendations.conversationStyle.supportLevel
    };

    return {
      userId,
      sessionId,
      classification: result.classification,
      conversationAnalysis,
      journeyStage: this.mapPersonaToJourneyStage(result.classification.type),
      onboardingComplete: false,
      recommendations,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Map persona type to journey stage
   */
  private mapPersonaToJourneyStage(persona: PersonaType): 'discovery' | 'classification' | 'tailored_guidance' | 'journey_active' {
    switch (persona) {
      case 'uncertain_unengaged':
        return 'discovery';
      case 'exploring_undecided':
        return 'classification';
      case 'tentatively_decided':
        return 'tailored_guidance';
      case 'focused_confident':
        return 'journey_active';
      default:
        return 'discovery';
    }
  }
}

// Export singleton instance
export const enhancedPersonaService = new EnhancedPersonaService();