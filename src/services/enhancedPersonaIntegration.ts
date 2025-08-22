/**
 * EnhancedPersonaIntegration - Drop-in replacement for existing persona classification
 * 
 * Integrates the enhanced evidence-based persona system with the existing
 * personaOnboardingService architecture without breaking changes.
 */

import { enhancedPersonaService } from './enhancedPersonaService';
import { conversationEvidenceExtractor, ConversationEvidence } from './conversationEvidenceExtractor';
import { personaService, PersonaClassification } from './personaService';

/**
 * Enhanced analysis result that matches existing interface expectations
 */
export interface EnhancedAnalysisResult {
  classification: PersonaClassification;
  conversationEvidence?: ConversationEvidence;
  processingStats: {
    processingTime: number;
    signalsExtracted: number;
    confidenceFactors: any;
  };
}

/**
 * Integration service that provides enhanced persona analysis
 * while maintaining compatibility with existing PersonaService interface
 */
export class EnhancedPersonaIntegration {
  
  /**
   * Drop-in replacement for personaService.analyzeConversationForPersona()
   * 
   * This method signature matches the existing one but uses enhanced evidence-based analysis
   */
  async analyzeConversationForPersona(
    conversationHistory: Array<{role: 'user' | 'assistant', content: string}>,
    existingProfile?: any // Keep loose typing for compatibility
  ): Promise<PersonaClassification> {
    console.log('🚀 Enhanced persona analysis (drop-in replacement):', {
      messageCount: conversationHistory.length,
      hasExistingProfile: !!existingProfile
    });

    try {
      // Use enhanced service for analysis
      const result = await enhancedPersonaService.analyzeConversationForPersona(
        conversationHistory,
        existingProfile?.conversationEvidence
      );

      // Log enhanced insights for debugging
      console.log('📊 Enhanced persona insights:', {
        persona: result.classification.type,
        confidence: Math.round(result.classification.confidence * 100) + '%',
        stage: result.classification.stage,
        evidenceStrength: Math.round(result.confidenceFactors.evidenceStrength * 100) + '%',
        messageCount: result.evidence.messageCount,
        careerMentions: result.evidence.careerDirection.specifics.length,
        recommendations: result.recommendations.focusAreas.slice(0, 2)
      });

      // Store evidence for future use (backward compatible)
      (result.classification as any).conversationEvidence = result.evidence;
      (result.classification as any).recommendations = result.recommendations;
      (result.classification as any).nextSteps = result.nextSteps;

      return result.classification;

    } catch (error) {
      console.error('❌ Enhanced persona analysis failed, falling back to basic classification:', error);
      
      // Fallback to simple analysis if enhanced fails
      return this.createFallbackClassification(conversationHistory);
    }
  }

  /**
   * Analyze single message for real-time updates
   * (New method for enhanced capabilities)
   */
  async analyzeMessage(
    message: string,
    existingEvidence?: ConversationEvidence
  ): Promise<EnhancedAnalysisResult> {
    const startTime = performance.now();

    const extractionResult = conversationEvidenceExtractor.extractFromMessage(
      message,
      existingEvidence
    );

    // Quick classification if enough evidence
    let classification: PersonaClassification;
    
    if (extractionResult.confidence > 0.6) {
      const enhancedResult = await enhancedPersonaService.analyzeConversationForPersona(
        [{ role: 'user', content: message }],
        extractionResult.evidence
      );
      classification = enhancedResult.classification;
    } else {
      // Provisional classification
      classification = this.createProvisionalClassification(extractionResult.evidence);
    }

    const processingTime = performance.now() - startTime;

    console.log('⚡ Real-time message analysis:', {
      processingTime: Math.round(processingTime) + 'ms',
      newSignals: extractionResult.newSignals.length,
      confidence: Math.round(extractionResult.confidence * 100) + '%',
      provisionalPersona: classification.type
    });

    return {
      classification,
      conversationEvidence: extractionResult.evidence,
      processingStats: {
        processingTime,
        signalsExtracted: extractionResult.newSignals.length,
        confidenceFactors: {
          evidenceStrength: extractionResult.confidence,
          messageCount: extractionResult.evidence.messageCount,
          specificity: extractionResult.evidence.careerDirection.specifics.length
        }
      }
    };
  }

  /**
   * Get conversation recommendations based on current evidence
   */
  getConversationRecommendations(evidence: ConversationEvidence): string[] {
    const recommendations: string[] = [];
    
    // Career direction based recommendations
    if (evidence.careerDirection.signals.includes('none')) {
      recommendations.push('Ask about interests and hobbies');
      recommendations.push('Explore activities they enjoy');
      recommendations.push('Discuss subjects they find engaging');
    } else if (evidence.careerDirection.signals.includes('few')) {
      recommendations.push('Help compare their options');
      recommendations.push('Ask about decision criteria');
      recommendations.push('Explore pros and cons of each option');
    } else if (evidence.careerDirection.signals.includes('one')) {
      if (evidence.confidenceLevel.confidence < 0.5) {
        recommendations.push('Validate their choice gently');
        recommendations.push('Explore related career paths');
        recommendations.push('Ask about their motivation');
      } else {
        recommendations.push('Focus on next steps');
        recommendations.push('Discuss pathway requirements');
        recommendations.push('Connect to relevant opportunities');
      }
    }

    // Engagement based recommendations
    if (evidence.engagement.uncertainty > 0.4) {
      recommendations.push('Provide extra reassurance');
      recommendations.push('Use more structured questions');
      recommendations.push('Offer specific examples');
    }

    if (evidence.engagement.enthusiasm > 0.3) {
      recommendations.push('Build on their enthusiasm');
      recommendations.push('Dive deeper into areas of interest');
      recommendations.push('Connect to similar opportunities');
    }

    return recommendations;
  }

  /**
   * Check if persona classification should be updated
   */
  shouldUpdateClassification(
    currentPersona: string,
    evidence: ConversationEvidence,
    lastUpdateMessageCount: number
  ): boolean {
    // Update if we have new evidence and enough confidence
    const hasNewEvidence = evidence.messageCount > lastUpdateMessageCount;
    const hasStrongEvidence = evidence.careerDirection.confidence > 0.6 || 
                             evidence.confidenceLevel.confidence > 0.6;
    const hasEnoughMessages = evidence.messageCount >= 2;

    return hasNewEvidence && hasStrongEvidence && hasEnoughMessages;
  }

  /**
   * Get persona-specific conversation adjustments
   */
  getPersonaConversationAdjustments(persona: string, evidence: ConversationEvidence): any {
    const baseAdjustments = {
      pace: 'moderate',
      supportLevel: 'medium',
      questionStyle: 'balanced',
      encouragementLevel: 'medium'
    };

    switch (persona) {
      case 'uncertain_unengaged':
        return {
          ...baseAdjustments,
          pace: 'patient',
          supportLevel: 'high',
          questionStyle: 'open_exploration',
          encouragementLevel: 'high'
        };

      case 'exploring_undecided':
        return {
          ...baseAdjustments,
          questionStyle: 'comparison_focused',
          focusPrompts: [
            'Help them compare options',
            'Provide decision frameworks',
            'Ask about decision criteria'
          ]
        };

      case 'tentatively_decided':
        return {
          ...baseAdjustments,
          questionStyle: 'validation_focused',
          focusPrompts: [
            'Validate their choice gently',
            'Explore confidence levels',
            'Discuss alternatives carefully'
          ]
        };

      case 'focused_confident':
        return {
          ...baseAdjustments,
          pace: 'fast',
          supportLevel: 'low',
          questionStyle: 'action_oriented',
          focusPrompts: [
            'Focus on next steps',
            'Discuss pathway requirements',
            'Provide specific guidance'
          ]
        };

      default:
        return baseAdjustments;
    }
  }

  /**
   * Create fallback classification for error cases
   */
  private createFallbackClassification(
    conversationHistory: Array<{role: 'user' | 'assistant', content: string}>
  ): PersonaClassification {
    const userMessages = conversationHistory.filter(msg => msg.role === 'user');
    
    return {
      type: 'exploring_undecided', // Safe default
      confidence: 0.6, // Conservative confidence
      triggers: [],
      timestamp: new Date().toISOString(),
      reasoning: `Fallback classification based on ${userMessages.length} messages`,
      stage: 'provisional'
    };
  }

  /**
   * Create provisional classification for quick analysis
   */
  private createProvisionalClassification(evidence: ConversationEvidence): PersonaClassification {
    let persona = 'exploring_undecided';
    let confidence = 0.6;

    if (evidence.careerDirection.signals.includes('none')) {
      persona = 'uncertain_unengaged';
      confidence = 0.7;
    } else if (evidence.careerDirection.signals.includes('one') && 
               evidence.confidenceLevel.signals.includes('high')) {
      persona = 'focused_confident';
      confidence = 0.8;
    } else if (evidence.careerDirection.signals.includes('one')) {
      persona = 'tentatively_decided';
      confidence = 0.65;
    }

    return {
      type: persona as any,
      confidence,
      triggers: [],
      timestamp: new Date().toISOString(),
      reasoning: 'Provisional classification from limited evidence',
      stage: 'provisional'
    };
  }

  /**
   * Get evidence summary for debugging
   */
  getEvidenceSummary(evidence: ConversationEvidence): any {
    return {
      messageCount: evidence.messageCount,
      lifeStage: evidence.lifeStage.signals[0] || 'unknown',
      careerDirection: {
        primary: evidence.careerDirection.signals[0] || 'unknown',
        specifics: evidence.careerDirection.specifics.slice(0, 3),
        confidence: Math.round(evidence.careerDirection.confidence * 100) + '%'
      },
      confidenceLevel: {
        primary: evidence.confidenceLevel.signals[0] || 'unknown',
        confidence: Math.round(evidence.confidenceLevel.confidence * 100) + '%'
      },
      motivation: {
        intrinsic: Math.round(evidence.motivation.intrinsic * 100) + '%',
        extrinsic: Math.round(evidence.motivation.extrinsic * 100) + '%',
        dominant: evidence.motivation.intrinsic > evidence.motivation.extrinsic ? 'intrinsic' : 'extrinsic'
      },
      engagement: {
        uncertainty: Math.round(evidence.engagement.uncertainty * 100) + '%',
        enthusiasm: Math.round(evidence.engagement.enthusiasm * 100) + '%',
        detailSharing: Math.round(evidence.engagement.detailSharing * 100) + '%'
      }
    };
  }
}

// Export singleton instance  
export const enhancedPersonaIntegration = new EnhancedPersonaIntegration();