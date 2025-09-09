/**
 * Objective Evaluation Engine
 * 
 * Determines conversation flow, objective completion, and intelligent transitions
 * This is the brain that makes conversations feel natural while systematically gathering data
 */

import {
  ConversationObjective,
  ConversationTree,
  ConversationState,
  ConversationCondition
} from '../types/ConversationObjectives';
import { promptCache } from './realtimePromptCache';
import { guestSessionService } from './guestSessionService';

export interface ObjectiveEvaluation {
  isComplete: boolean;
  confidence: number;               // 0-1 scale
  missingData: string[];           // What data is still needed
  recommendedAction: 'continue' | 'transition' | 'repeat' | 'escalate';
  nextObjectiveId?: string;
  reasoning: string;               // Explanation of the decision
  dataQuality: number;             // 0-1 scale of collected data quality
}

export interface TransitionDecision {
  shouldTransition: boolean;
  targetObjectiveId: string | null;
  reason: 'completion' | 'timeout' | 'user_redirect' | 'low_engagement' | 'data_sufficient';
  confidence: number;
  preserveContext: boolean;        // Whether to maintain conversation context
}

export class ObjectiveEvaluationEngine {
  private static instance: ObjectiveEvaluationEngine;
  
  // Evaluation thresholds
  private readonly COMPLETION_CONFIDENCE_THRESHOLD = 0.8;
  private readonly MIN_DATA_QUALITY_THRESHOLD = 0.6;
  private readonly MAX_EXCHANGES_BEFORE_TIMEOUT = 8;
  private readonly MIN_EXCHANGES_BEFORE_EARLY_COMPLETION = 2;

  private constructor() {}

  public static getInstance(): ObjectiveEvaluationEngine {
    if (!ObjectiveEvaluationEngine.instance) {
      ObjectiveEvaluationEngine.instance = new ObjectiveEvaluationEngine();
    }
    return ObjectiveEvaluationEngine.instance;
  }

  /**
   * Evaluate if current objective is complete and determine next steps
   */
  public async evaluateObjective(
    objectiveId: string,
    conversationState: ConversationState,
    userMessage: string
  ): Promise<ObjectiveEvaluation> {
    const startTime = performance.now();
    
    try {
      const objective = await promptCache.getObjective(objectiveId);
      if (!objective) {
        throw new Error(`Objective not found: ${objectiveId}`);
      }

      // Analyze the latest user message for data extraction
      const extractedData = await this.extractDataFromMessage(userMessage, objective);
      
      // Update conversation state with new data
      this.updateConversationState(conversationState, extractedData);

      // Evaluate completion criteria
      const dataCompletion = this.evaluateDataCompletion(objective, conversationState);
      const confidenceScore = this.calculateConfidenceScore(objective, conversationState);
      const qualityScore = this.evaluateDataQuality(objective, conversationState);

      // Determine if objective is complete
      const isComplete = this.determineCompletion(
        objective, 
        conversationState, 
        dataCompletion, 
        confidenceScore, 
        qualityScore
      );

      // Recommend next action
      const recommendedAction = this.recommendAction(
        objective, 
        conversationState, 
        isComplete, 
        confidenceScore
      );

      // Find next objective if transitioning
      const nextObjectiveId = isComplete ? 
        await this.findNextObjective(objective, conversationState) : 
        undefined;

      const evaluation: ObjectiveEvaluation = {
        isComplete,
        confidence: confidenceScore,
        missingData: this.identifyMissingData(objective, conversationState),
        recommendedAction,
        nextObjectiveId,
        reasoning: this.generateReasoningExplanation(
          objective, 
          conversationState, 
          isComplete, 
          confidenceScore, 
          dataCompletion
        ),
        dataQuality: qualityScore
      };

      console.log(`🎯 [OBJECTIVE EVAL] Evaluated ${objectiveId}:`, {
        isComplete,
        confidence: Math.round(confidenceScore * 100),
        dataQuality: Math.round(qualityScore * 100),
        action: recommendedAction,
        timeMs: Math.round(performance.now() - startTime)
      });

      return evaluation;

    } catch (error) {
      console.error(`❌ [OBJECTIVE EVAL] Error evaluating objective ${objectiveId}:`, error);
      
      // Fallback evaluation
      return {
        isComplete: false,
        confidence: 0,
        missingData: ['unknown'],
        recommendedAction: 'continue',
        reasoning: `Evaluation error: ${error}`,
        dataQuality: 0
      };
    }
  }

  // (duplicate older evaluateTransition removed)

  /**
   * Extract structured data from user message based on objective needs
   */
  private async extractDataFromMessage(
    message: string, 
    objective: ConversationObjective
  ): Promise<Record<string, any>> {
    const extractedData: Record<string, any> = {};
    const lowercaseMessage = message.toLowerCase();

    // Extract data based on what the objective needs (use Firebase structure)
    const dataPointsRaw = (objective as any).dataPoints ?? '[]';
    let dataPoints: string[] = [];
    try {
      dataPoints = typeof dataPointsRaw === 'string' ? JSON.parse(dataPointsRaw) : dataPointsRaw;
    } catch {
      dataPoints = String(dataPointsRaw)
        .replace(/[\[\]\"']/g, '')
        .split(/\s*,\s*/)
        .filter(Boolean);
      console.warn('⚠️ [OBJECTIVE EVAL] Non-JSON dataPoints tolerated during extraction:', { objectiveId: (objective as any).id, dataPointsRaw });
    }
    
    for (const dataPoint of dataPoints) {
      switch (dataPoint) {
        case 'name':
          // Flexible name extraction from message
          const nameMatch = message.match(/(?:my name is|i'm|call me)\s+([a-zA-Z]+)/i) || 
                           message.match(/^([a-zA-Z]+)$/i) || // Just the name alone
                           message.match(/(?:it's|its)\s+([a-zA-Z]+)/i);
          if (nameMatch) {
            extractedData.name = nameMatch[1];
          }
          break;

        case 'life_stage':
          if (/\b(student|studying|school|college|university|uni)\b/i.test(message)) {
            extractedData.life_stage = 'student';
          } else if (/\b(work|working|job|employed|career)\b/i.test(message)) {
            extractedData.life_stage = 'working';
          } else if (/\b(graduate|graduated|finished|completed)\b/i.test(message)) {
            extractedData.life_stage = 'graduate';
          } else if (/\b(between|looking|searching|unemployed|gap)\b/i.test(message)) {
            extractedData.life_stage = 'between_opportunities';
          }
          break;

        case 'career_direction':
          if (/\b(no idea|don't know|not sure|uncertain|confused)\b/i.test(message)) {
            extractedData.career_direction = 'uncertain';
          } else if (/\b(few ideas|options|considering|thinking about|exploring)\b/i.test(message)) {
            extractedData.career_direction = 'exploring';
          } else if (/\b(want to|planning|decided|focused on|definitely)\b/i.test(message)) {
            extractedData.career_direction = 'decided';
          }
          break;

        case 'interests':
          const interestKeywords = this.extractInterestKeywords(message);
          if (interestKeywords.length > 0) {
            extractedData.interests = interestKeywords;
          }
          break;

        case 'skills':
          const skillKeywords = this.extractSkillKeywords(message);
          if (skillKeywords.length > 0) {
            extractedData.skills = skillKeywords;
          }
          break;

        case 'work_satisfaction':
          if (/\b(love|enjoy|like|great|good|satisfied)\b/i.test(message)) {
            extractedData.work_satisfaction = 'positive';
          } else if (/\b(hate|dislike|boring|terrible|awful|stressed)\b/i.test(message)) {
            extractedData.work_satisfaction = 'negative';
          } else if (/\b(okay|fine|alright|mixed|some good|some bad)\b/i.test(message)) {
            extractedData.work_satisfaction = 'mixed';
          }
          break;

        case 'goals':
          const goalKeywords = this.extractGoalKeywords(message);
          if (goalKeywords.length > 0) {
            extractedData.goals = goalKeywords;
          }
          break;
      }
    }

    // Calculate confidence for each extracted data point
    Object.keys(extractedData).forEach(key => {
      extractedData[`${key}_confidence`] = this.calculateDataConfidence(
        key, 
        extractedData[key], 
        message
      );
    });

    return extractedData;
  }

  /**
   * Extract interest keywords from user message
   */
  private extractInterestKeywords(message: string): string[] {
    const interests: string[] = [];
    const lowercaseMessage = message.toLowerCase();

    // Technology interests
    if (/\b(coding|programming|tech|computer|software|apps)\b/i.test(message)) {
      interests.push('technology');
    }

    // Creative interests
    if (/\b(art|design|creative|music|writing|photography)\b/i.test(message)) {
      interests.push('creative');
    }

    // People interests
    if (/\b(people|helping|teaching|social|communication)\b/i.test(message)) {
      interests.push('people-focused');
    }

    // Analytical interests
    if (/\b(math|science|analysis|data|research|problem solving)\b/i.test(message)) {
      interests.push('analytical');
    }

    // Practical interests
    if (/\b(hands.on|building|making|practical|mechanical)\b/i.test(message)) {
      interests.push('practical');
    }

    // Business interests
    if (/\b(business|entrepreneurship|leadership|management|sales)\b/i.test(message)) {
      interests.push('business');
    }

    return interests;
  }

  /**
   * Extract skill keywords from user message
   */
  private extractSkillKeywords(message: string): string[] {
    const skills: string[] = [];

    if (/\b(good at|skilled|talented|strong|confident).{0,20}(communicat|speak|present)/i.test(message)) {
      skills.push('communication');
    }

    if (/\b(good at|skilled|talented|strong|confident).{0,20}(lead|manag|organiz)/i.test(message)) {
      skills.push('leadership');
    }

    if (/\b(good at|skilled|talented|strong|confident).{0,20}(problem|solv|think|analy)/i.test(message)) {
      skills.push('problem-solving');
    }

    if (/\b(good at|skilled|talented|strong|confident).{0,20}(creat|design|art)/i.test(message)) {
      skills.push('creativity');
    }

    if (/\b(good at|skilled|talented|strong|confident).{0,20}(tech|comput|program)/i.test(message)) {
      skills.push('technical');
    }

    return skills;
  }

  /**
   * Extract goal keywords from user message
   */
  private extractGoalKeywords(message: string): string[] {
    const goals: string[] = [];

    if (/\b(help|impact|difference|contribute|serve)\b/i.test(message)) {
      goals.push('make-impact');
    }

    if (/\b(money|salary|financial|earn|income)\b/i.test(message)) {
      goals.push('financial-security');
    }

    if (/\b(balance|flexible|family|time|freedom)\b/i.test(message)) {
      goals.push('work-life-balance');
    }

    if (/\b(learn|grow|develop|challenge|skill)\b/i.test(message)) {
      goals.push('personal-growth');
    }

    if (/\b(create|build|innovate|invent|start)\b/i.test(message)) {
      goals.push('creativity-innovation');
    }

    return goals;
  }

  /**
   * Calculate confidence score for extracted data
   */
  private calculateDataConfidence(key: string, value: any, originalMessage: string): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence for explicit statements
    if (/\b(my name is|i'm|call me)\b/i.test(originalMessage) && key === 'name') {
      confidence = 0.95;
    }

    // Treat single-token name replies (e.g., "Tim") as high-confidence name disclosures
    if (key === 'name' && /^[A-Za-z]+$/.test(originalMessage.trim())) {
      confidence = Math.max(confidence, 0.9);
    }

    // Higher confidence for clear sentiment
    if (key === 'work_satisfaction' && /\b(love|hate|definitely|absolutely)\b/i.test(originalMessage)) {
      confidence = 0.9;
    }

    // Lower confidence for inferred data
    if (Array.isArray(value) && value.length === 1) {
      confidence = 0.7; // Single inferred interest/skill
    } else if (Array.isArray(value) && value.length > 1) {
      confidence = 0.8; // Multiple indicators
    }

    // Boost confidence for longer, detailed responses
    if (originalMessage.length > 50) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Update conversation state with newly extracted data
   */
  private updateConversationState(
    state: ConversationState, 
    extractedData: Record<string, any>
  ): void {
    Object.entries(extractedData).forEach(([key, value]) => {
      if (key.endsWith('_confidence')) {
        state.confidenceScores[key.replace('_confidence', '')] = value as number;
      } else {
        state.dataCollected[key] = value;
      }
    });

    state.exchangeCount++;
  }

  /**
   * Evaluate how much of the required data has been collected
   */
  private evaluateDataCompletion(
    objective: ConversationObjective, 
    state: ConversationState
  ): number {
    // Use Firebase structure
    const dataPointsRaw2 = (objective as any).dataPoints ?? '[]';
    let required: string[] = [];
    try {
      required = typeof dataPointsRaw2 === 'string' ? JSON.parse(dataPointsRaw2) : dataPointsRaw2;
    } catch {
      required = String(dataPointsRaw2)
        .replace(/[\[\]\"']/g, '')
        .split(/\s*,\s*/)
        .filter(Boolean);
    }
    const collected = Object.keys(state.dataCollected);
    
    const completedData = required.filter(dataPoint => 
      collected.includes(dataPoint) && state.dataCollected[dataPoint] !== null
    );

    return completedData.length / required.length;
  }

  /**
   * Calculate overall confidence score for the objective
   */
  private calculateConfidenceScore(
    objective: ConversationObjective, 
    state: ConversationState
  ): number {
    // Use Firebase structure
    const dataPointsRaw3 = (objective as any).dataPoints ?? '[]';
    let requiredData: string[] = [];
    try {
      requiredData = typeof dataPointsRaw3 === 'string' ? JSON.parse(dataPointsRaw3) : dataPointsRaw3;
    } catch {
      requiredData = String(dataPointsRaw3)
        .replace(/[\[\]\"']/g, '')
        .split(/\s*,\s*/)
        .filter(Boolean);
    }
    let totalConfidence = 0;
    let dataPointsWithConfidence = 0;

    requiredData.forEach(dataPoint => {
      if (state.confidenceScores[dataPoint] !== undefined) {
        totalConfidence += state.confidenceScores[dataPoint];
        dataPointsWithConfidence++;
      }
    });

    if (dataPointsWithConfidence === 0) return 0;

    const averageConfidence = totalConfidence / dataPointsWithConfidence;
    
    // Adjust based on completion progress
    const completionRate = this.evaluateDataCompletion(objective, state);
    
    return averageConfidence * completionRate;
  }

  /**
   * Evaluate quality of collected data
   */
  private evaluateDataQuality(
    objective: ConversationObjective, 
    state: ConversationState
  ): number {
    let qualityScore = 0;
    let dataPoints = 0;

    Object.entries(state.dataCollected).forEach(([key, value]) => {
      dataPoints++;
      
      // Quality based on data richness
      if (Array.isArray(value)) {
        qualityScore += Math.min(value.length / 3, 1); // More items = higher quality
      } else if (typeof value === 'string') {
        qualityScore += value.length > 3 ? 0.8 : 0.4; // Longer responses = higher quality
      } else {
        qualityScore += 0.6; // Basic data point
      }
    });

    return dataPoints > 0 ? qualityScore / dataPoints : 0;
  }

  /**
   * Determine if objective is complete based on all factors
   */
  private determineCompletion(
    objective: ConversationObjective,
    state: ConversationState,
    dataCompletion: number,
    confidenceScore: number,
    qualityScore: number
  ): boolean {
    // Allow early completion for simple objectives (e.g., just collecting a name)
    try {
      const dataPointsRaw = (objective as any).dataPoints ?? '[]';
      let required: string[] = [];
      try {
        required = typeof dataPointsRaw === 'string' ? JSON.parse(dataPointsRaw) : dataPointsRaw;
      } catch {
        required = String(dataPointsRaw)
          .replace(/[\[\]\"']/g, '')
          .split(/\s*,\s*/)
          .filter(Boolean);
      }

      if (required.length <= 1 && dataCompletion >= 1.0 && confidenceScore >= 0.7 && state.exchangeCount >= 1) {
        return true;
      }
    } catch {}

    // Must meet minimum exchange requirement (use Firebase structure)
    const minExchanges = (objective as any).averageExchanges || 3;
    if (state.exchangeCount < minExchanges) {
      return false;
    }

    // Must meet confidence threshold (use Firebase structure)
    const confidenceThreshold = ((objective as any).successRate || 80) / 100; // Convert percentage to decimal
    if (confidenceScore < confidenceThreshold) {
      return false;
    }

    // Must have collected required data
    if (dataCompletion < 1.0) {
      return false;
    }

    // Must meet minimum quality threshold
    if (qualityScore < this.MIN_DATA_QUALITY_THRESHOLD) {
      return false;
    }

    return true;
  }

  /**
   * Recommend next action based on evaluation
   */
  private recommendAction(
    objective: ConversationObjective,
    state: ConversationState,
    isComplete: boolean,
    confidenceScore: number
  ): 'continue' | 'transition' | 'repeat' | 'escalate' {
    if (isComplete) {
      return 'transition';
    }

    const maxExchanges = (objective as any).averageExchanges ? Math.ceil((objective as any).averageExchanges * 1.5) : 8;
    if (state.exchangeCount >= maxExchanges) {
      return 'escalate'; // Need to force progress
    }

    if (confidenceScore < 0.3 && state.exchangeCount >= 3) {
      return 'repeat'; // Try different approach
    }

    return 'continue';
  }

  /**
   * Find the next objective based on completion and tree structure
   */
  private async findNextObjective(
    currentObjective: ConversationObjective, 
    state: ConversationState
  ): Promise<string | null> {
    // Get the conversation tree to understand flow
    const tree = await promptCache.getTree(state.currentTreeId);
    if (!tree) {
      return currentObjective.transitions.onSuccess;
    }

    // Check tree routing for conditional logic
    const routing = tree.routing[currentObjective.id];
    if (!routing) {
      return currentObjective.transitions.onSuccess;
    }

    // Evaluate conditions if present
    if (routing.conditions) {
      for (const condition of routing.conditions) {
        if (this.evaluateCondition(condition, state)) {
          // Condition met, follow this path
          return routing.success;
        }
      }
    }

    return routing.success || currentObjective.transitions.onSuccess;
  }

  /**
   * Detect if user is redirecting conversation to different topic
   */
  private detectUserRedirect(
    message: string, 
    currentObjective: ConversationObjective
  ): { isRedirect: boolean; suggestedObjectiveId: string | null; confidence: number } {
    const lowercaseMessage = message.toLowerCase();

    // Strong redirect signals
    if (/\b(actually|wait|but|instead|change topic|talk about)\b/i.test(message)) {
      // Analyze what they want to talk about instead
      if (/\b(career|job|work|future)\b/i.test(message)) {
        return {
          isRedirect: true,
          suggestedObjectiveId: 'career_exploration', // Would need to be defined
          confidence: 0.8
        };
      }
    }

    return {
      isRedirect: false,
      suggestedObjectiveId: null,
      confidence: 0
    };
  }

  /**
   * Calculate engagement score based on conversation patterns
   */
  private calculateEngagementScore(state: ConversationState): number {
    const recentMessages = state.conversationHistory.slice(-3);
    let engagementScore = 0.5; // Base score

    recentMessages.forEach(msg => {
      if (msg.role === 'user') {
        // Longer messages = higher engagement
        if (msg.content.length > 50) engagementScore += 0.2;
        else if (msg.content.length < 10) engagementScore -= 0.3;

        // Question marks = engagement
        if (msg.content.includes('?')) engagementScore += 0.1;

        // Very short responses = disengagement
        if (['ok', 'yeah', 'sure', 'fine'].includes(msg.content.toLowerCase().trim())) {
          engagementScore -= 0.4;
        }
      }
    });

    return Math.max(0, Math.min(1, engagementScore));
  }

  /**
   * Find objective to recover from low engagement
   */
  private async findEngagementRecoveryObjective(
    state: ConversationState
  ): Promise<string | null> {
    // Look for objectives tagged with 'engagement_recovery'
    // For now, return a generic re-engagement objective
    return 'reengagement_check'; // Would need to be defined
  }

  /**
   * Evaluate condition for tree routing
   */
  private evaluateCondition(condition: ConversationCondition, state: ConversationState): boolean {
    const { type, field, operator, value } = condition;

    let fieldValue: any;
    
    switch (type) {
      case 'persona':
        fieldValue = state.userPersona;
        break;
      case 'messageCount':
        fieldValue = state.exchangeCount;
        break;
      case 'dataPresent':
        fieldValue = state.dataCollected[field];
        break;
      case 'confidence':
        fieldValue = state.confidenceScores[field];
        break;
      case 'userInput':
        fieldValue = state.lastUserMessage;
        break;
      default:
        return false;
    }

    // Evaluate based on operator
    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(value);
      case 'greaterThan':
        return typeof fieldValue === 'number' && fieldValue > value;
      case 'lessThan':
        return typeof fieldValue === 'number' && fieldValue < value;
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      default:
        return false;
    }
  }

  /**
   * Identify what data is still missing for objective completion
   */
  private identifyMissingData(
    objective: ConversationObjective, 
    state: ConversationState
  ): string[] {
    // Use Firebase structure
    const dataPointsStr = (objective as any).dataPoints || '[]';
    const required = typeof dataPointsStr === 'string' ? JSON.parse(dataPointsStr) : dataPointsStr;
    const collected = Object.keys(state.dataCollected);
    
    return required.filter(dataPoint => 
      !collected.includes(dataPoint) || state.dataCollected[dataPoint] === null
    );
  }

  /**
   * Generate human-readable explanation of evaluation decision
   */
  private generateReasoningExplanation(
    objective: ConversationObjective,
    state: ConversationState,
    isComplete: boolean,
    confidenceScore: number,
    dataCompletion: number
  ): string {
    if (isComplete) {
      return `Objective completed successfully. Collected ${Math.round(dataCompletion * 100)}% of required data with ${Math.round(confidenceScore * 100)}% confidence after ${state.exchangeCount} exchanges.`;
    }

    const missingData = this.identifyMissingData(objective, state);
    const reasons: string[] = [];

    const minExchanges = (objective as any).averageExchanges || 3;
    const confidenceThreshold = ((objective as any).successRate || 80) / 100;
    
    if (state.exchangeCount < minExchanges) {
      reasons.push(`Need ${minExchanges - state.exchangeCount} more exchanges`);
    }

    if (confidenceScore < confidenceThreshold) {
      reasons.push(`Confidence too low (${Math.round(confidenceScore * 100)}% < ${Math.round(confidenceThreshold * 100)}%)`);
    }

    if (missingData.length > 0) {
      reasons.push(`Missing data: ${missingData.join(', ')}`);
    }

    return `Objective incomplete: ${reasons.join('; ')}.`;
  }

  /**
   * Evaluate whether to transition from current objective to next one
   */
  public async evaluateTransition(
    currentObjectiveId: string,
    conversationState: ConversationState,
    userMessage: string
  ): Promise<TransitionDecision> {
    try {
      const objective = await promptCache.getObjective(currentObjectiveId);
      if (!objective) {
        return {
          shouldTransition: false,
          targetObjectiveId: null,
          reason: 'completion',
          confidence: 0,
          preserveContext: true
        };
      }

      // Get the current objective evaluation
      const evaluation = await this.evaluateObjective(currentObjectiveId, conversationState, userMessage);
      
      // Check if objective is complete or if action is escalate/transition
      const shouldTransition = evaluation.isComplete || 
                               evaluation.recommendedAction === 'transition' || 
                               evaluation.recommendedAction === 'escalate';

      if (!shouldTransition) {
        return {
          shouldTransition: false,
          targetObjectiveId: null,
          reason: 'completion',
          confidence: evaluation.confidence,
          preserveContext: true
        };
      }

      // Find next objective ID from conversation tree
      const nextObjectiveId = await this.findNextObjectiveFromTree(currentObjectiveId, conversationState);
      
      return {
        shouldTransition: true,
        targetObjectiveId: nextObjectiveId,
        reason: evaluation.isComplete ? 'completion' : 'user_redirect',
        confidence: evaluation.confidence,
        preserveContext: true
      };

    } catch (error) {
      console.error('❌ [OBJECTIVE EVAL] Error evaluating transition:', error);
      return {
        shouldTransition: false,
        targetObjectiveId: null,
        reason: 'completion',
        confidence: 0,
        preserveContext: true
      };
    }
  }

  /**
   * Find next objective from conversation tree transitions
   */
  private async findNextObjectiveFromTree(
    currentObjectiveId: string, 
    conversationState: ConversationState
  ): Promise<string | null> {
    try {
      const tree = await promptCache.getTree(conversationState.currentTreeId);
      if (!tree) {
        return null;
      }

      // Prefer explicit transitions array when available
      if (Array.isArray((tree as any).transitions)) {
        const transition = (tree as any).transitions.find((t: any) => t.from === currentObjectiveId);
        if (transition) {
          if (transition.conditions && transition.conditions.length > 0) {
            const conditionMet = transition.conditions.some((condition: any) => 
              this.evaluateCondition(condition, conversationState)
            );
            if (conditionMet) return transition.to;
          } else {
            return transition.to;
          }
        }
      }

      // Also support routing map structure: tree.routing[currentObjectiveId].success
      if ((tree as any).routing && (tree as any).routing[currentObjectiveId]) {
        const route = (tree as any).routing[currentObjectiveId];
        if (!route.conditions || route.conditions.some((c: any) => this.evaluateCondition(c, conversationState))) {
          if (route.success) return route.success;
        }
      }

      // Fallback to objective's own onSuccess transition if defined
      try {
        const currentObjective = await promptCache.getObjective(currentObjectiveId);
        if (currentObjective && (currentObjective as any).transitions?.onSuccess) {
          return (currentObjective as any).transitions.onSuccess;
        }
      } catch {}

      // Final fallback: linear order list
      const objectiveList = ['establish_rapport_collect_name', 'discover_current_situation', 'identify_concerns_goals', 'explore_interests_strengths', 'generate_career_cards'];
      const currentIndex = objectiveList.indexOf(currentObjectiveId);
      
      if (currentIndex >= 0 && currentIndex < objectiveList.length - 1) {
        return objectiveList[currentIndex + 1];
      }

      return null;
    } catch (error) {
      console.error('❌ [OBJECTIVE EVAL] Error finding next objective:', error);
      return null;
    }
  }

  // (duplicate newer evaluateCondition with non-matching types removed)
}

// Export singleton instance
export const objectiveEvaluator = ObjectiveEvaluationEngine.getInstance();
