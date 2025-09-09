/**
 * PersonaService - Core service for persona-based onboarding
 * Implements evidence-based young adult career guidance personas:
 * - Uncertain & Unengaged
 * - Exploring & Undecided  
 * - Tentatively Decided
 * - Focused & Confident
 */

export type PersonaType = 'uncertain_unengaged' | 'exploring_undecided' | 'tentatively_decided' | 'focused_confident';

export interface PersonaClassification {
  type: PersonaType;
  confidence: number; // 0-1 confidence score
  triggers: ConversationTrigger[];
  timestamp: string;
  reasoning: string;
  stage: 'provisional' | 'confirmed'; // Provisional after 2-3 exchanges, confirmed after 4-5
  conversationEvidence?: any; // Optional: Evidence from natural language onboarding
}

export interface ConversationTrigger {
  type: 'language_pattern' | 'response_timing' | 'topic_engagement' | 'question_style' | 'decision_indicators';
  signal: string;
  weight: number; // Impact on classification (0-1)
  personaIndicator: PersonaType[];
  messageIndex: number; // Which message triggered this
  confidence: number;
}

export interface PersonaProfile {
  userId?: string;
  sessionId: string;
  classification: PersonaClassification;
  conversationAnalysis: ConversationAnalysis;
  journeyStage: 'discovery' | 'classification' | 'tailored_guidance' | 'journey_active';
  onboardingComplete: boolean;
  recommendations: PersonaTailoredRecommendations;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationAnalysis {
  messageCount: number;
  uncertaintySignals: number;
  engagementLevel: number; // 0-1 score
  decisionReadiness: number; // 0-1 score
  goalClarity: number; // 0-1 score
  topicEngagement: Record<string, number>; // topic -> engagement score
  responsePatterns: ResponsePattern[];
}

export interface ResponsePattern {
  pattern: string;
  frequency: number;
  personaRelevance: PersonaType[];
  lastSeen: string;
}

export interface PersonaTailoredRecommendations {
  conversationStyle: ConversationStyle;
  recommendedTools: string[];
  nextSteps: string[];
  focusAreas: string[];
  supportLevel: 'high' | 'moderate' | 'low';
}

export interface ConversationStyle {
  pace: 'slow' | 'moderate' | 'fast';
  depth: 'exploratory' | 'focused' | 'detailed';
  supportLevel: 'high' | 'moderate' | 'low';
  decisionPressure: 'none' | 'gentle' | 'direct';
  questionStyle: 'open_ended' | 'guided' | 'specific';
  encouragementLevel: 'high' | 'moderate' | 'low';
}

/**
 * Core PersonaService class
 */
export class PersonaService {
  
  /**
   * Analyze conversation history and classify user persona
   */
  async analyzeConversationForPersona(
    conversationHistory: Array<{role: string; content: string; timestamp: string}>,
    existingProfile?: PersonaProfile
  ): Promise<PersonaClassification> {
    console.log('🧠 Analyzing conversation for persona classification:', {
      messageCount: conversationHistory.length,
      hasExistingProfile: !!existingProfile
    });

    const analysis = this.analyzeConversationPatterns(conversationHistory);
    const triggers = this.detectClassificationTriggers(conversationHistory);
    
    // Calculate persona scores
    const personaScores = this.calculatePersonaScores(analysis, triggers);
    
    // Determine best match persona
    const topPersona = this.selectTopPersona(personaScores);
    const confidence = personaScores[topPersona];
    
    // Build reasoning
    const reasoning = this.buildClassificationReasoning(topPersona, triggers, analysis);
    
    // Determine stage (provisional vs confirmed)
    const stage = conversationHistory.length >= 4 && confidence > 0.7 ? 'confirmed' : 'provisional';
    
    const classification: PersonaClassification = {
      type: topPersona,
      confidence,
      triggers: triggers.filter(t => t.personaIndicator.includes(topPersona)),
      timestamp: new Date().toISOString(),
      reasoning,
      stage
    };
    
    console.log('✅ Persona classification complete:', {
      persona: topPersona,
      confidence: Math.round(confidence * 100) + '%',
      stage,
      triggerCount: classification.triggers.length
    });
    
    return classification;
  }

  /**
   * Analyze conversation patterns and extract signals
   */
  private analyzeConversationPatterns(conversationHistory: Array<{role: string; content: string}>): ConversationAnalysis {
    const userMessages = conversationHistory.filter(msg => msg.role === 'user');
    
    return {
      messageCount: userMessages.length,
      uncertaintySignals: this.countUncertaintySignals(userMessages),
      engagementLevel: this.calculateEngagementLevel(userMessages),
      decisionReadiness: this.calculateDecisionReadiness(userMessages),
      goalClarity: this.calculateGoalClarity(userMessages),
      topicEngagement: this.analyzeTopicEngagement(userMessages),
      responsePatterns: this.extractResponsePatterns(userMessages)
    };
  }

  /**
   * Detect specific triggers that indicate persona type
   */
  private detectClassificationTriggers(conversationHistory: Array<{role: string; content: string}>): ConversationTrigger[] {
    const triggers: ConversationTrigger[] = [];
    const userMessages = conversationHistory.filter(msg => msg.role === 'user');
    
    userMessages.forEach((message, index) => {
      const content = message.content.toLowerCase();
      
      // Uncertain & Unengaged patterns
      if (this.matchesUncertainUnengaged(content)) {
        triggers.push({
          type: 'language_pattern',
          signal: this.extractSignalPhrase(content, this.UNCERTAIN_UNENGAGED_PATTERNS),
          weight: 0.8,
          personaIndicator: ['uncertain_unengaged'],
          messageIndex: index,
          confidence: 0.8
        });
      }
      
      // Exploring & Undecided patterns  
      if (this.matchesExploringUndecided(content)) {
        triggers.push({
          type: 'language_pattern',
          signal: this.extractSignalPhrase(content, this.EXPLORING_UNDECIDED_PATTERNS),
          weight: 0.7,
          personaIndicator: ['exploring_undecided'],
          messageIndex: index,
          confidence: 0.7
        });
      }
      
      // Tentatively Decided patterns
      if (this.matchesTentativelyDecided(content)) {
        triggers.push({
          type: 'decision_indicators',
          signal: this.extractSignalPhrase(content, this.TENTATIVELY_DECIDED_PATTERNS),
          weight: 0.8,
          personaIndicator: ['tentatively_decided'],
          messageIndex: index,
          confidence: 0.8
        });
      }
      
      // Focused & Confident patterns
      if (this.matchesFocusedConfident(content)) {
        triggers.push({
          type: 'decision_indicators', 
          signal: this.extractSignalPhrase(content, this.FOCUSED_CONFIDENT_PATTERNS),
          weight: 0.9,
          personaIndicator: ['focused_confident'],
          messageIndex: index,
          confidence: 0.9
        });
      }
    });
    
    return triggers;
  }

  // Persona pattern matching
  private readonly UNCERTAIN_UNENGAGED_PATTERNS = [
    "i don't know what i want",
    "no idea what to do",
    "haven't thought about it much",
    "not really sure",
    "don't have any interests",
    "everything seems boring",
    "nothing really excites me",
    "just looking around",
    "not sure where to start",
    "haven't really considered"
  ];

  private readonly EXPLORING_UNDECIDED_PATTERNS = [
    "i've been looking at",
    "considering different options",
    "exploring various paths",
    "interested in several things",
    "torn between",
    "can't decide between",
    "weighing my options",
    "researching different careers",
    "trying to figure out",
    "comparing different paths"
  ];

  private readonly TENTATIVELY_DECIDED_PATTERNS = [
    "i think i want to",
    "pretty sure about",
    "leaning towards",
    "probably going to",
    "considering studying",
    "thinking about becoming",
    "interested in pursuing",
    "looking into",
    "want to learn more about",
    "seems like a good fit"
  ];

  private readonly FOCUSED_CONFIDENT_PATTERNS = [
    "i definitely want to",
    "i'm going to study",
    "my goal is to become",
    "i've decided to",
    "i'm committed to",
    "planning to pursue",
    "already started preparing",
    "know exactly what i want",
    "this is my path",
    "absolutely certain"
  ];

  // Pattern matching helpers
  private matchesUncertainUnengaged(content: string): boolean {
    return this.UNCERTAIN_UNENGAGED_PATTERNS.some(pattern => content.includes(pattern));
  }

  private matchesExploringUndecided(content: string): boolean {
    return this.EXPLORING_UNDECIDED_PATTERNS.some(pattern => content.includes(pattern));
  }

  private matchesTentativelyDecided(content: string): boolean {
    return this.TENTATIVELY_DECIDED_PATTERNS.some(pattern => content.includes(pattern));
  }

  private matchesFocusedConfident(content: string): boolean {
    return this.FOCUSED_CONFIDENT_PATTERNS.some(pattern => content.includes(pattern));
  }

  private extractSignalPhrase(content: string, patterns: string[]): string {
    const matchingPattern = patterns.find(pattern => content.includes(pattern));
    return matchingPattern || content.substring(0, 50);
  }

  // Analysis helpers
  private countUncertaintySignals(messages: Array<{content: string}>): number {
    const uncertaintyWords = ['maybe', 'not sure', 'i guess', 'possibly', 'perhaps', 'i think', 'probably', 'unclear'];
    return messages.reduce((count, msg) => {
      const content = msg.content.toLowerCase();
      return count + uncertaintyWords.filter(word => content.includes(word)).length;
    }, 0);
  }

  private calculateEngagementLevel(messages: Array<{content: string}>): number {
    if (messages.length === 0) return 0;
    
    const avgLength = messages.reduce((sum, msg) => sum + msg.content.length, 0) / messages.length;
    const questionCount = messages.filter(msg => msg.content.includes('?')).length;
    const excitementWords = messages.reduce((count, msg) => {
      const content = msg.content.toLowerCase();
      const excitement = ['exciting', 'love', 'passionate', 'interested', 'enjoy', 'fun'].filter(word => content.includes(word)).length;
      return count + excitement;
    }, 0);
    
    // Normalize to 0-1 score
    return Math.min(1, (avgLength / 100) * 0.3 + (questionCount / messages.length) * 0.4 + (excitementWords / messages.length) * 0.3);
  }

  private calculateDecisionReadiness(messages: Array<{content: string}>): number {
    const decisionWords = ['decided', 'sure', 'certain', 'definitely', 'committed', 'planning', 'going to'];
    const indecisionWords = ['unsure', 'confused', 'don\'t know', 'unclear', 'uncertain'];
    
    let score = 0;
    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      score += decisionWords.filter(word => content.includes(word)).length * 0.2;
      score -= indecisionWords.filter(word => content.includes(word)).length * 0.15;
    });
    
    return Math.max(0, Math.min(1, score));
  }

  private calculateGoalClarity(messages: Array<{content: string}>): number {
    const clarityIndicators = ['want to become', 'goal is', 'planning to', 'studying', 'career in', 'work as'];
    const vagueIndicators = ['something in', 'not sure what', 'any kind of', 'whatever'];
    
    let score = 0;
    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      score += clarityIndicators.filter(phrase => content.includes(phrase)).length * 0.3;
      score -= vagueIndicators.filter(phrase => content.includes(phrase)).length * 0.2;
    });
    
    return Math.max(0, Math.min(1, score));
  }

  private analyzeTopicEngagement(messages: Array<{content: string}>): Record<string, number> {
    // This would analyze engagement with different career topics
    // For now, return empty object - can be enhanced later
    return {};
  }

  private extractResponsePatterns(messages: Array<{content: string}>): ResponsePattern[] {
    // Extract common response patterns - can be enhanced later
    return [];
  }

  /**
   * Calculate scores for each persona type based on analysis and triggers
   */
  private calculatePersonaScores(analysis: ConversationAnalysis, triggers: ConversationTrigger[]): Record<PersonaType, number> {
    const scores: Record<PersonaType, number> = {
      uncertain_unengaged: 0,
      exploring_undecided: 0,
      tentatively_decided: 0,
      focused_confident: 0
    };

    // Base scoring from analysis
    if (analysis.uncertaintySignals > 2 && analysis.engagementLevel < 0.3) {
      scores.uncertain_unengaged += 0.6;
    }
    
    if (analysis.engagementLevel > 0.5 && analysis.decisionReadiness < 0.5) {
      scores.exploring_undecided += 0.6;
    }
    
    if (analysis.decisionReadiness > 0.4 && analysis.decisionReadiness < 0.8 && analysis.goalClarity > 0.3) {
      scores.tentatively_decided += 0.6;
    }
    
    if (analysis.decisionReadiness > 0.7 && analysis.goalClarity > 0.6) {
      scores.focused_confident += 0.7;
    }

    // Add trigger-based scoring
    triggers.forEach(trigger => {
      trigger.personaIndicator.forEach(persona => {
        scores[persona] += trigger.weight * trigger.confidence;
      });
    });

    // Normalize scores
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore > 0) {
      Object.keys(scores).forEach(persona => {
        scores[persona as PersonaType] = scores[persona as PersonaType] / maxScore;
      });
    }

    return scores;
  }

  /**
   * Select the top persona based on scores
   */
  private selectTopPersona(scores: Record<PersonaType, number>): PersonaType {
    let topPersona: PersonaType = 'uncertain_unengaged';
    let maxScore = 0;
    
    Object.entries(scores).forEach(([persona, score]) => {
      if (score > maxScore) {
        maxScore = score;
        topPersona = persona as PersonaType;
      }
    });
    
    return topPersona;
  }

  /**
   * Build human-readable reasoning for classification
   */
  private buildClassificationReasoning(
    persona: PersonaType, 
    triggers: ConversationTrigger[], 
    analysis: ConversationAnalysis
  ): string {
    const personaTriggers = triggers.filter(t => t.personaIndicator.includes(persona));
    const topTrigger = personaTriggers.sort((a, b) => b.confidence - a.confidence)[0];
    
    const reasoningMap = {
      uncertain_unengaged: `User shows low engagement and high uncertainty. Key indicator: "${topTrigger?.signal || 'general uncertainty patterns'}"`,
      exploring_undecided: `User is actively exploring but hasn't made decisions. Key indicator: "${topTrigger?.signal || 'exploration patterns'}"`,
      tentatively_decided: `User has some direction but seeking validation. Key indicator: "${topTrigger?.signal || 'tentative decision patterns'}"`,
      focused_confident: `User demonstrates clear goals and confidence. Key indicator: "${topTrigger?.signal || 'confident decision patterns'}"`
    };
    
    return reasoningMap[persona];
  }

  /**
   * Generate persona-tailored recommendations
   */
  generatePersonaRecommendations(persona: PersonaType, analysis: ConversationAnalysis): PersonaTailoredRecommendations {
    const recommendationMap: Record<PersonaType, PersonaTailoredRecommendations> = {
      uncertain_unengaged: {
        conversationStyle: {
          pace: 'slow',
          depth: 'exploratory',
          supportLevel: 'high',
          decisionPressure: 'none',
          questionStyle: 'open_ended',
          encouragementLevel: 'high'
        },
        recommendedTools: ['trigger_instant_insights', 'update_person_profile'],
        nextSteps: ['Explore broad interests', 'Identify values', 'Discover strengths'],
        focusAreas: ['Self-discovery', 'Interest exploration', 'Confidence building'],
        supportLevel: 'high'
      },
      
      exploring_undecided: {
        conversationStyle: {
          pace: 'moderate',
          depth: 'focused',
          supportLevel: 'moderate',
          decisionPressure: 'none',
          questionStyle: 'guided',
          encouragementLevel: 'moderate'
        },
        recommendedTools: ['analyze_conversation_for_careers', 'generate_career_recommendations'],
        nextSteps: ['Compare specific options', 'Research career details', 'Identify decision criteria'],
        focusAreas: ['Option comparison', 'Decision framework', 'Practical exploration'],
        supportLevel: 'moderate'
      },
      
      tentatively_decided: {
        conversationStyle: {
          pace: 'moderate',
          depth: 'detailed',
          supportLevel: 'moderate',
          decisionPressure: 'gentle',
          questionStyle: 'specific',
          encouragementLevel: 'moderate'
        },
        recommendedTools: ['generate_career_recommendations', 'analyze_conversation_for_careers'],
        nextSteps: ['Validate career choice', 'Explore pathway details', 'Address concerns'],
        focusAreas: ['Validation', 'Pathway planning', 'Skill development'],
        supportLevel: 'moderate'
      },
      
      focused_confident: {
        conversationStyle: {
          pace: 'fast',
          depth: 'detailed',
          supportLevel: 'low',
          decisionPressure: 'direct',
          questionStyle: 'specific',
          encouragementLevel: 'low'
        },
        recommendedTools: ['generate_career_recommendations'],
        nextSteps: ['Create action plan', 'Identify next steps', 'Connect with resources'],
        focusAreas: ['Implementation', 'Skill building', 'Network development'],
        supportLevel: 'low'
      }
    };

    return recommendationMap[persona];
  }

  /**
   * Get persona-friendly display name
   */
  getPersonaDisplayName(persona: PersonaType): string {
    const displayNames = {
      uncertain_unengaged: 'Uncertain & Unengaged',
      exploring_undecided: 'Exploring & Undecided', 
      tentatively_decided: 'Tentatively Decided',
      focused_confident: 'Focused & Confident'
    };
    
    return displayNames[persona];
  }

  /**
   * Get persona description
   */
  getPersonaDescription(persona: PersonaType): string {
    const descriptions = {
      uncertain_unengaged: 'Still discovering interests and career possibilities. Benefits from exploration and encouragement.',
      exploring_undecided: 'Actively exploring multiple options but hasn\'t committed to a direction. Needs comparison and guidance.',
      tentatively_decided: 'Has some direction but seeks validation and detailed information. Benefits from confirmation and pathway details.',
      focused_confident: 'Clear about goals and ready for action. Needs specific guidance and implementation support.'
    };
    
    return descriptions[persona];
  }
}

// Export singleton instance
export const personaService = new PersonaService();