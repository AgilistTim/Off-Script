/**
 * ConversationEvidenceExtractor - Real-time conversation parsing for persona classification
 * 
 * Uses Compromise.js for fast, client-side NLP processing to extract evidence signals
 * from natural conversation without disrupting user experience.
 * 
 * Key Evidence Points:
 * - Life Stage: working, student, graduate, gap year, etc.
 * - Career Direction: none (uncertain), few (exploring), one (decided)  
 * - Confidence Level: low, medium, high indicators
 * - Motivation: intrinsic vs extrinsic signals
 */

import nlp from 'compromise';

export interface ConversationEvidence {
  // Life Stage Evidence
  lifeStage: {
    signals: LifeStageSignal[];
    confidence: number;
    lastDetected: string | null;
  };
  
  // Career Direction Evidence  
  careerDirection: {
    signals: CareerDirectionSignal[];
    confidence: number;
    specifics: string[]; // Actual career mentions
    lastDetected: string | null;
  };
  
  // Confidence Indicators
  confidenceLevel: {
    signals: ConfidenceSignal[];
    evidence: string[]; // Direct quotes showing confidence
    confidence: number;
    lastDetected: string | null;
  };
  
  // Motivation Signals
  motivation: {
    intrinsic: number; // 0-1 score for internal motivation
    extrinsic: number; // 0-1 score for external motivation  
    evidence: {
      intrinsic: string[];
      extrinsic: string[];
    };
    lastDetected: string | null;
  };
  
  // Engagement Patterns
  engagement: {
    questionAsking: number; // User asking questions
    detailSharing: number; // User volunteering information
    uncertainty: number;   // Expressions of uncertainty
    enthusiasm: number;    // Positive expressions
  };
  
  // Conversation Metadata
  messageCount: number;
  lastUpdated: string;
  processingTime: number; // Performance tracking
}

export type LifeStageSignal = 
  | 'secondary_school'
  | 'university' 
  | 'college'
  | 'graduate'
  | 'gap_year'
  | 'working'
  | 'unemployed'
  | 'part_time'
  | 'full_time';

export type CareerDirectionSignal = 
  | 'none'        // "No idea", "don't know"
  | 'few'         // "considering a few", "torn between"
  | 'one'         // "want to be", "planning to"
  | 'exploring';  // "looking into", "researching"

export type ConfidenceSignal = 
  | 'very_low'    // "no clue", "completely lost"
  | 'low'         // "not sure", "uncertain"  
  | 'medium'      // "think so", "probably"
  | 'high'        // "sure", "confident"
  | 'very_high';  // "absolutely", "definitely"

export interface EvidenceExtractionResult {
  evidence: ConversationEvidence;
  newSignals: string[];
  confidence: number;
  recommendedActions: string[];
}

/**
 * Main evidence extraction service
 */
export class ConversationEvidenceExtractor {
  private patterns: ExtractionPatterns;
  
  constructor() {
    this.patterns = new ExtractionPatterns();
  }

  /**
   * Extract evidence from a single message
   */
  extractFromMessage(
    message: string, 
    existingEvidence?: ConversationEvidence
  ): EvidenceExtractionResult {
    const startTime = performance.now();
    
    // Initialize or use existing evidence
    const evidence = existingEvidence || this.createEmptyEvidence();
    const newSignals: string[] = [];
    
    // Parse message with Compromise
    const doc = nlp(message.toLowerCase());
    
    // Extract different types of evidence
    this.extractLifeStageEvidence(doc, evidence, newSignals);
    this.extractCareerDirectionEvidence(doc, evidence, newSignals);
    this.extractConfidenceEvidence(doc, evidence, newSignals);
    this.extractMotivationEvidence(doc, evidence, newSignals);
    this.extractEngagementPatterns(doc, evidence);
    
    // Update metadata
    evidence.messageCount++;
    evidence.lastUpdated = new Date().toISOString();
    evidence.processingTime = performance.now() - startTime;
    
    // Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(evidence);
    
    // Generate recommendations
    const recommendedActions = this.generateRecommendations(evidence);
    
    console.log('🔍 Evidence extracted:', {
      messageCount: evidence.messageCount,
      processingTime: Math.round(evidence.processingTime) + 'ms',
      newSignals: newSignals.length,
      confidence: Math.round(overallConfidence * 100) + '%'
    });
    
    return {
      evidence,
      newSignals,
      confidence: overallConfidence,
      recommendedActions
    };
  }

  /**
   * Extract evidence from conversation history
   */
  extractFromConversation(
    messages: Array<{role: 'user' | 'assistant', content: string}>,
    existingEvidence?: ConversationEvidence
  ): EvidenceExtractionResult {
    let evidence = existingEvidence || this.createEmptyEvidence();
    let allNewSignals: string[] = [];
    
    // Process only user messages for evidence
    const userMessages = messages.filter(msg => msg.role === 'user');
    
    for (const message of userMessages) {
      const result = this.extractFromMessage(message.content, evidence);
      evidence = result.evidence;
      allNewSignals.push(...result.newSignals);
    }
    
    const overallConfidence = this.calculateOverallConfidence(evidence);
    const recommendedActions = this.generateRecommendations(evidence);
    
    console.log('📊 Conversation evidence summary:', {
      userMessages: userMessages.length,
      totalSignals: allNewSignals.length,
      confidence: Math.round(overallConfidence * 100) + '%',
      topSignals: this.getTopSignals(evidence)
    });
    
    return {
      evidence,
      newSignals: allNewSignals,
      confidence: overallConfidence,
      recommendedActions
    };
  }

  /**
   * Extract life stage evidence (Q1 equivalent)
   */
  private extractLifeStageEvidence(
    doc: any, 
    evidence: ConversationEvidence, 
    newSignals: string[]
  ): void {
    const patterns = this.patterns.lifeStage;
    
    // Check for education patterns
    if (doc.has(patterns.university)) {
      this.addLifeStageSignal(evidence, 'university', newSignals, 'university education mentioned');
    }
    
    if (doc.has(patterns.secondarySchool)) {
      this.addLifeStageSignal(evidence, 'secondary_school', newSignals, 'secondary school mentioned');
    }
    
    if (doc.has(patterns.graduate)) {
      this.addLifeStageSignal(evidence, 'graduate', newSignals, 'recent graduate status');
    }
    
    // Check for work patterns
    if (doc.has(patterns.working)) {
      this.addLifeStageSignal(evidence, 'working', newSignals, 'currently working');
    }
    
    if (doc.has(patterns.unemployed)) {
      this.addLifeStageSignal(evidence, 'unemployed', newSignals, 'not currently working');
    }
    
    if (doc.has(patterns.gapYear)) {
      this.addLifeStageSignal(evidence, 'gap_year', newSignals, 'taking gap year');
    }
  }

  /**
   * Extract career direction evidence (Q2 equivalent)
   */
  private extractCareerDirectionEvidence(
    doc: any, 
    evidence: ConversationEvidence, 
    newSignals: string[]
  ): void {
    const patterns = this.patterns.careerDirection;
    
    // Check for "no idea" patterns
    if (doc.has(patterns.noIdea)) {
      this.addCareerDirectionSignal(evidence, 'none', newSignals, 'expressed no career ideas');
    }
    
    // Check for multiple options
    if (doc.has(patterns.multipleOptions)) {
      this.addCareerDirectionSignal(evidence, 'few', newSignals, 'considering multiple options');
      
      // Extract specific career mentions
      const careers = this.extractCareerMentions(doc);
      evidence.careerDirection.specifics.push(...careers);
    }
    
    // Check for single clear goal
    if (doc.has(patterns.singleGoal)) {
      this.addCareerDirectionSignal(evidence, 'one', newSignals, 'has single career goal');
    }
    
    // Check for exploration mode
    if (doc.has(patterns.exploring)) {
      this.addCareerDirectionSignal(evidence, 'exploring', newSignals, 'actively exploring careers');
    }
    
    // Extract specific career mentions
    const specificCareers = this.extractCareerMentions(doc);
    if (specificCareers.length > 0) {
      evidence.careerDirection.specifics.push(...specificCareers);
      newSignals.push(`career interests: ${specificCareers.join(', ')}`);
    }
  }

  /**
   * Extract confidence level evidence (Q3 equivalent)
   */
  private extractConfidenceEvidence(
    doc: any, 
    evidence: ConversationEvidence, 
    newSignals: string[]
  ): void {
    const patterns = this.patterns.confidence;
    
    if (doc.has(patterns.veryHigh)) {
      this.addConfidenceSignal(evidence, 'very_high', newSignals, 'very high confidence');
    } else if (doc.has(patterns.high)) {
      this.addConfidenceSignal(evidence, 'high', newSignals, 'high confidence');
    } else if (doc.has(patterns.medium)) {
      this.addConfidenceSignal(evidence, 'medium', newSignals, 'medium confidence');
    } else if (doc.has(patterns.low)) {
      this.addConfidenceSignal(evidence, 'low', newSignals, 'low confidence');
    } else if (doc.has(patterns.veryLow)) {
      this.addConfidenceSignal(evidence, 'very_low', newSignals, 'very low confidence');
    }
  }

  /**
   * Extract motivation evidence (Q6 equivalent)
   */
  private extractMotivationEvidence(
    doc: any, 
    evidence: ConversationEvidence, 
    newSignals: string[]
  ): void {
    const patterns = this.patterns.motivation;
    
    // Check for intrinsic motivation
    const intrinsicMatches = doc.match(patterns.intrinsic);
    if (intrinsicMatches.found) {
      evidence.motivation.intrinsic = Math.min(1, evidence.motivation.intrinsic + 0.3);
      const intrinsicText = intrinsicMatches.text();
      evidence.motivation.evidence.intrinsic.push(intrinsicText);
      newSignals.push(`intrinsic motivation: ${intrinsicText}`);
    }
    
    // Check for extrinsic motivation  
    const extrinsicMatches = doc.match(patterns.extrinsic);
    if (extrinsicMatches.found) {
      evidence.motivation.extrinsic = Math.min(1, evidence.motivation.extrinsic + 0.3);
      const extrinsicText = extrinsicMatches.text();
      evidence.motivation.evidence.extrinsic.push(extrinsicText);
      newSignals.push(`extrinsic motivation: ${extrinsicText}`);
    }
    
    if (intrinsicMatches.found || extrinsicMatches.found) {
      evidence.motivation.lastDetected = new Date().toISOString();
    }
  }

  /**
   * Extract engagement patterns for conversation style adaptation
   */
  private extractEngagementPatterns(
    doc: any, 
    evidence: ConversationEvidence
  ): void {
    // Question asking (high engagement)
    if (doc.has('#Question')) {
      evidence.engagement.questionAsking += 0.1;
    }
    
    // Detail sharing (good engagement)
    const wordCount = doc.text().split(' ').length;
    if (wordCount > 10) {
      evidence.engagement.detailSharing += 0.1;
    }
    
    // Uncertainty expressions (affects persona classification)
    if (doc.has('(not sure|uncertain|confused|lost|dont know)')) {
      evidence.engagement.uncertainty += 0.1;
    }
    
    // Enthusiasm (positive engagement)
    if (doc.has('(excited|love|passionate|amazing|great)')) {
      evidence.engagement.enthusiasm += 0.1;
    }
  }

  /**
   * Helper methods for adding signals
   */
  private addLifeStageSignal(
    evidence: ConversationEvidence, 
    signal: LifeStageSignal, 
    newSignals: string[], 
    description: string
  ): void {
    if (!evidence.lifeStage.signals.includes(signal)) {
      evidence.lifeStage.signals.push(signal);
      evidence.lifeStage.confidence = Math.min(1, evidence.lifeStage.confidence + 0.4);
      evidence.lifeStage.lastDetected = new Date().toISOString();
      newSignals.push(`life stage: ${description}`);
    }
  }

  private addCareerDirectionSignal(
    evidence: ConversationEvidence, 
    signal: CareerDirectionSignal, 
    newSignals: string[], 
    description: string
  ): void {
    if (!evidence.careerDirection.signals.includes(signal)) {
      evidence.careerDirection.signals.push(signal);
      evidence.careerDirection.confidence = Math.min(1, evidence.careerDirection.confidence + 0.4);
      evidence.careerDirection.lastDetected = new Date().toISOString();
      newSignals.push(`career direction: ${description}`);
    }
  }

  private addConfidenceSignal(
    evidence: ConversationEvidence, 
    signal: ConfidenceSignal, 
    newSignals: string[], 
    description: string
  ): void {
    if (!evidence.confidenceLevel.signals.includes(signal)) {
      evidence.confidenceLevel.signals.push(signal);
      evidence.confidenceLevel.confidence = Math.min(1, evidence.confidenceLevel.confidence + 0.3);
      evidence.confidenceLevel.lastDetected = new Date().toISOString();
      newSignals.push(`confidence: ${description}`);
    }
  }

  /**
   * Extract specific career mentions from text
   */
  private extractCareerMentions(doc: any): string[] {
    const careers: string[] = [];
    
    // Common career patterns
    const careerPatterns = [
      '#Job', // Teacher, doctor, etc.
      '(teacher|doctor|nurse|engineer|lawyer|designer|developer|programmer)',
      '(marketing|sales|finance|accounting|business|management)',
      '(tech|technology|software|coding|programming)',
      '(healthcare|medicine|nursing|therapy)',
      '(education|teaching|training)',
      '(arts|creative|design|music|writing)',
      '(science|research|laboratory|academic)'
    ];
    
    for (const pattern of careerPatterns) {
      const matches = doc.match(pattern);
      if (matches.found) {
        careers.push(...matches.out('array').map((m: string) => m.toLowerCase()));
      }
    }
    
    return [...new Set(careers)]; // Remove duplicates
  }

  /**
   * Calculate overall confidence in evidence
   */
  private calculateOverallConfidence(evidence: ConversationEvidence): number {
    const weights = {
      lifeStage: 0.2,
      careerDirection: 0.4,
      confidenceLevel: 0.2,
      motivation: 0.2
    };
    
    return (
      evidence.lifeStage.confidence * weights.lifeStage +
      evidence.careerDirection.confidence * weights.careerDirection +
      evidence.confidenceLevel.confidence * weights.confidenceLevel +
      (evidence.motivation.intrinsic + evidence.motivation.extrinsic) / 2 * weights.motivation
    );
  }

  /**
   * Generate recommendations based on current evidence
   */
  private generateRecommendations(evidence: ConversationEvidence): string[] {
    const recommendations: string[] = [];
    
    if (evidence.careerDirection.signals.includes('none')) {
      recommendations.push('Focus on interest discovery questions');
      recommendations.push('Use broader exploration approach');
    }
    
    if (evidence.careerDirection.signals.includes('few')) {
      recommendations.push('Help with option comparison');
      recommendations.push('Provide decision-making frameworks');
    }
    
    if (evidence.careerDirection.signals.includes('one')) {
      if (evidence.confidenceLevel.signals.includes('low') || evidence.confidenceLevel.signals.includes('very_low')) {
        recommendations.push('Validate career choice');
        recommendations.push('Explore alternatives gently');
      } else {
        recommendations.push('Focus on action steps');
        recommendations.push('Provide pathway information');
      }
    }
    
    if (evidence.engagement.uncertainty > 0.3) {
      recommendations.push('Increase support and reassurance');
      recommendations.push('Use more structured guidance');
    }
    
    return recommendations;
  }

  /**
   * Get top signals for debugging
   */
  private getTopSignals(evidence: ConversationEvidence): any {
    return {
      lifeStage: evidence.lifeStage.signals[0] || 'none',
      careerDirection: evidence.careerDirection.signals[0] || 'none',
      confidence: evidence.confidenceLevel.signals[0] || 'none',
      motivation: evidence.motivation.intrinsic > evidence.motivation.extrinsic ? 'intrinsic' : 'extrinsic'
    };
  }

  /**
   * Create empty evidence structure
   */
  private createEmptyEvidence(): ConversationEvidence {
    return {
      lifeStage: {
        signals: [],
        confidence: 0,
        lastDetected: null
      },
      careerDirection: {
        signals: [],
        confidence: 0,
        specifics: [],
        lastDetected: null
      },
      confidenceLevel: {
        signals: [],
        evidence: [],
        confidence: 0,
        lastDetected: null
      },
      motivation: {
        intrinsic: 0,
        extrinsic: 0,
        evidence: {
          intrinsic: [],
          extrinsic: []
        },
        lastDetected: null
      },
      engagement: {
        questionAsking: 0,
        detailSharing: 0,
        uncertainty: 0,
        enthusiasm: 0
      },
      messageCount: 0,
      lastUpdated: new Date().toISOString(),
      processingTime: 0
    };
  }
}

/**
 * Pattern definitions for evidence extraction
 */
class ExtractionPatterns {
  lifeStage = {
    university: '(university|uni|college|studying|student|degree|bachelor|masters|phd)',
    secondarySchool: '(school|gcse|gcses|a level|a levels|sixth form|high school)',
    graduate: '(graduated|graduate|just finished|recently finished|degree|diploma)',
    working: '(working|job|employed|work at|work for|career|full time|part time)',
    unemployed: '(unemployed|not working|looking for work|job hunting|between jobs)',
    gapYear: '(gap year|taking time|break before|year off|traveling|travelling)'
  };

  careerDirection = {
    noIdea: '(no idea|dont know|no clue|not sure|clueless|lost|confused about career)',
    multipleOptions: '(considering|thinking about|torn between|few ideas|several options|multiple|choice between)',
    singleGoal: '(want to be|going to be|plan to|decided on|set on|goal is|dream is)',
    exploring: '(exploring|looking into|researching|finding out|investigating|learning about)'
  };

  confidence = {
    veryHigh: '(absolutely|definitely|completely sure|certain|positive|no doubt)',
    high: '(sure|confident|pretty sure|quite sure|fairly confident)',
    medium: '(think so|probably|maybe|might|could be|possibly)',
    low: '(not sure|uncertain|not really sure|dont think|not confident)',
    veryLow: '(no clue|completely lost|no idea|totally confused|really dont know)'
  };

  motivation = {
    intrinsic: '(love|passionate|enjoy|interested|fascinated|excited about|care about|meaningful|fulfilling)',
    extrinsic: '(money|salary|pay|security|stable|benefits|prestige|status|family wants|expected to)'
  };
}

// Export singleton instance
export const conversationEvidenceExtractor = new ConversationEvidenceExtractor();