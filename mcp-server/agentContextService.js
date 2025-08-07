/**
 * Agent Context Service for ElevenLabs Integration
 * Formats career cards into structured agent prompts for context updates
 * 
 * Features:
 * - Converts career card arrays into readable agent context
 * - Handles both legacy and comprehensive career card schemas
 * - Provides error handling and validation
 * - Optimizes content for ElevenLabs prompt limits
 */

import { z } from 'zod';

// Simple logger for the service
const Logger = {
  info: (message, data = null) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] ${message}`, data ? data : '');
  },
  warn: (message, data = null) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] ${message}`, data ? data : '');
  },
  error: (message, data = null) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${message}`, data ? data : '');
  }
};

// Zod schema for career card validation
const CareerCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  confidence: z.number().optional(),
  description: z.string().optional(),
  averageSalary: z.object({
    entry: z.string(),
    experienced: z.string(),
    senior: z.string(),
  }).optional(),
  salaryRange: z.string().optional(),
  keySkills: z.array(z.string()).optional(),
  skillsRequired: z.array(z.string()).optional(),
  trainingPathways: z.array(z.string()).optional(),
  trainingPathway: z.string().optional(),
  nextSteps: z.array(z.string()).optional(),
  growthOutlook: z.string().optional(),
  marketOutlook: z.string().optional(),
  // Enhanced schema fields
  competencyRequirements: z.object({
    technicalSkills: z.array(z.string()).optional(),
    softSkills: z.array(z.string()).optional(),
    qualificationPathway: z.object({
      degrees: z.array(z.string()).optional(),
      alternativeRoutes: z.array(z.string()).optional(),
    }).optional(),
  }).optional(),
  compensationRewards: z.object({
    salaryRange: z.object({
      entry: z.number(),
      senior: z.number(),
      currency: z.string(),
    }).optional(),
  }).optional(),
  perplexityData: z.object({
    verifiedSalaryRanges: z.object({
      entry: z.object({
        min: z.number(),
        max: z.number(),
        currency: z.string(),
      }).optional(),
      senior: z.object({
        min: z.number(),
        max: z.number(),
        currency: z.string(),
      }).optional(),
    }).optional(),
    realTimeMarketDemand: z.object({
      growthRate: z.number(),
      competitionLevel: z.enum(['Low', 'Medium', 'High']),
    }).optional(),
  }).optional(),
}).strict(false); // Allow additional fields for backward compatibility

const CareerCardsArraySchema = z.array(CareerCardSchema);

/**
 * Service for formatting career cards into ElevenLabs agent context
 */
export class AgentContextService {
  
  /**
   * Main method to format career cards into agent context
   * @param {Array} careerCards - Array of career card objects
   * @param {string} userName - Optional user name for personalization
   * @param {string} contextType - Type of context ('new_cards', 'update', 'discussion')
   * @returns {string} Formatted context string for agent prompt
   */
  static formatCareerCardsContext(careerCards, userName = null, contextType = 'new_cards') {
    try {
      // Validate input
      const validationResult = CareerCardsArraySchema.safeParse(careerCards);
      if (!validationResult.success) {
        Logger.warn('Career cards validation failed, proceeding with available data', {
          errors: validationResult.error.errors.slice(0, 3) // Log first 3 errors
        });
      }

      if (!careerCards || careerCards.length === 0) {
        Logger.warn('No career cards provided for context formatting');
        return this.getEmptyContext(userName);
      }

      Logger.info(`Formatting ${careerCards.length} career cards for agent context`, {
        contextType,
        hasUserName: !!userName
      });

      // Build structured context
      const sections = [];

      // Header with timestamp and personalization
      const userPrefix = userName ? ` for ${userName}` : '';
      sections.push(`# CAREER DISCOVERIES${userPrefix}`);
      sections.push(`*Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}*`);
      sections.push('');

      // Context type instruction
      const contextInstruction = this.getContextInstruction(contextType);
      sections.push(`## CONTEXT: ${contextInstruction}`);
      sections.push('');

      // Primary pathway (highest confidence or first card)
      const primaryCard = this.selectPrimaryCard(careerCards);
      if (primaryCard) {
        sections.push('## PRIMARY CAREER RECOMMENDATION');
        sections.push(this.formatSingleCareerCard(primaryCard, true));
        sections.push('');
      }

      // Alternative pathways (up to 3 additional cards)
      const alternativeCards = careerCards
        .filter(card => card.id !== primaryCard?.id)
        .slice(0, 3);

      if (alternativeCards.length > 0) {
        sections.push('## ALTERNATIVE CAREER OPTIONS');
        alternativeCards.forEach((card, index) => {
          sections.push(`### ${index + 1}. ${card.title}`);
          sections.push(this.formatSingleCareerCard(card, false));
          sections.push('');
        });
      }

      // Conversation guidance for the agent
      sections.push('## AGENT CONVERSATION GUIDANCE');
      sections.push('- Reference specific career titles when discussing options with the user');
      sections.push('- Use the provided salary ranges and training information for concrete advice');
      sections.push('- Connect user interests and skills to relevant career elements listed above');
      sections.push('- Suggest specific next steps based on the career card recommendations');
      sections.push('- Be prepared to discuss both primary and alternative career options');
      
      if (this.hasEnhancedMarketData(careerCards)) {
        sections.push('- Note that salary and market data includes current verified intelligence');
      }

      const formattedContext = sections.join('\n');

      // Optimize for ElevenLabs context limits (~1500 characters recommended)
      const optimizedContext = this.optimizeContextLength(formattedContext, 1500);

      Logger.info('Career cards context formatted successfully', {
        originalLength: formattedContext.length,
        optimizedLength: optimizedContext.length,
        careerCount: careerCards.length,
        contextType
      });

      return optimizedContext;

    } catch (error) {
      Logger.error('Failed to format career cards context', error);
      return this.getErrorContext(userName, error.message);
    }
  }

  /**
   * Select the primary career card (highest confidence or first)
   * @param {Array} careerCards - Array of career cards
   * @returns {Object|null} Primary career card
   */
  static selectPrimaryCard(careerCards) {
    if (!careerCards || careerCards.length === 0) return null;

    // Find card with highest confidence
    const cardsWithConfidence = careerCards.filter(card => 
      typeof card.confidence === 'number' && !isNaN(card.confidence)
    );

    if (cardsWithConfidence.length > 0) {
      return cardsWithConfidence.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
    }

    // Fallback to first card
    return careerCards[0];
  }

  /**
   * Format a single career card for display
   * @param {Object} card - Career card object
   * @param {boolean} isPrimary - Whether this is the primary recommendation
   * @returns {string} Formatted career card
   */
  static formatSingleCareerCard(card, isPrimary = false) {
    const lines = [];

    // Title with confidence indicator
    const confidenceDisplay = card.confidence 
      ? ` (${Math.round(card.confidence * 100)}% match)` 
      : '';
    const primaryLabel = isPrimary ? '**[RECOMMENDED]** ' : '';
    lines.push(`${primaryLabel}**${card.title}**${confidenceDisplay}`);

    // Salary information
    const salary = this.extractSalaryInfo(card);
    if (salary) {
      lines.push(`- **Salary Range**: ${salary}`);
    }

    // Key skills
    const skills = this.extractSkillsInfo(card);
    if (skills) {
      lines.push(`- **Key Skills**: ${skills}`);
    }

    // Training pathway
    const training = this.extractTrainingInfo(card);
    if (training) {
      lines.push(`- **Training Required**: ${training}`);
    }

    // Market outlook
    const market = this.extractMarketInfo(card);
    if (market) {
      lines.push(`- **Market Outlook**: ${market}`);
    }

    // Next steps (limit to 2 most relevant)
    if (card.nextSteps && card.nextSteps.length > 0) {
      const steps = card.nextSteps.slice(0, 2).join(', ');
      lines.push(`- **Next Steps**: ${steps}`);
    }

    return lines.join('\n');
  }

  /**
   * Extract salary information from career card
   * @param {Object} card - Career card
   * @returns {string} Formatted salary range
   */
  static extractSalaryInfo(card) {
    // Priority 1: Enhanced Perplexity data
    if (card.perplexityData?.verifiedSalaryRanges) {
      const ranges = card.perplexityData.verifiedSalaryRanges;
      if (ranges.entry && ranges.senior) {
        return `£${ranges.entry.min}k-£${ranges.senior.max}k (verified data)`;
      }
    }

    // Priority 2: Comprehensive schema
    if (card.compensationRewards?.salaryRange) {
      const comp = card.compensationRewards.salaryRange;
      return `£${Math.round(comp.entry / 1000)}k-£${Math.round(comp.senior / 1000)}k`;
    }

    // Priority 3: Legacy fields
    if (card.averageSalary) {
      return `${card.averageSalary.entry} - ${card.averageSalary.senior}`;
    }

    if (card.salaryRange) {
      return card.salaryRange;
    }

    return null;
  }

  /**
   * Extract skills information from career card
   * @param {Object} card - Career card
   * @returns {string} Formatted skills list
   */
  static extractSkillsInfo(card) {
    const skills = [];

    // Comprehensive schema technical skills
    if (card.competencyRequirements?.technicalSkills?.length) {
      skills.push(...card.competencyRequirements.technicalSkills.slice(0, 4));
    }

    // Legacy skill fields
    if (card.keySkills?.length) {
      skills.push(...card.keySkills.slice(0, 4));
    }

    if (card.skillsRequired?.length) {
      skills.push(...card.skillsRequired.slice(0, 4));
    }

    // Remove duplicates and limit
    const uniqueSkills = [...new Set(skills)].slice(0, 4);
    return uniqueSkills.length > 0 ? uniqueSkills.join(', ') : null;
  }

  /**
   * Extract training information from career card
   * @param {Object} card - Career card
   * @returns {string} Formatted training pathway
   */
  static extractTrainingInfo(card) {
    // Comprehensive schema
    if (card.competencyRequirements?.qualificationPathway) {
      const pathway = card.competencyRequirements.qualificationPathway;
      const options = [];
      
      if (pathway.degrees?.length) {
        options.push(`Degree: ${pathway.degrees[0]}`);
      }
      
      if (pathway.alternativeRoutes?.length) {
        options.push(`Alternative: ${pathway.alternativeRoutes[0]}`);
      }
      
      if (options.length > 0) {
        return options.join(' | ');
      }
    }

    // Legacy fields
    if (card.trainingPathways?.length) {
      return card.trainingPathways.slice(0, 2).join(' or ');
    }

    if (card.trainingPathway) {
      return card.trainingPathway;
    }

    return null;
  }

  /**
   * Extract market information from career card
   * @param {Object} card - Career card
   * @returns {string} Formatted market outlook
   */
  static extractMarketInfo(card) {
    // Enhanced Perplexity market data
    if (card.perplexityData?.realTimeMarketDemand) {
      const market = card.perplexityData.realTimeMarketDemand;
      return `${market.growthRate > 0 ? 'Growing' : 'Stable'} (${market.competitionLevel} competition)`;
    }

    // Legacy fields
    if (card.growthOutlook) {
      return card.growthOutlook;
    }

    if (card.marketOutlook) {
      return card.marketOutlook;
    }

    return null;
  }

  /**
   * Check if career cards have enhanced market data
   * @param {Array} careerCards - Array of career cards
   * @returns {boolean} Whether enhanced data is available
   */
  static hasEnhancedMarketData(careerCards) {
    return careerCards.some(card => 
      card.perplexityData?.verifiedSalaryRanges || 
      card.perplexityData?.realTimeMarketDemand
    );
  }

  /**
   * Get context instruction based on type
   * @param {string} contextType - Context type
   * @returns {string} Context instruction
   */
  static getContextInstruction(contextType) {
    switch (contextType) {
      case 'new_cards':
        return 'New career recommendations generated for user discussion';
      case 'update':
        return 'Updated career information with latest market data';
      case 'discussion':
        return 'Career options for focused discussion and exploration';
      default:
        return 'Career information for user guidance';
    }
  }

  /**
   * Optimize context length for ElevenLabs limits
   * @param {string} context - Original context
   * @param {number} maxLength - Maximum allowed length
   * @returns {string} Optimized context
   */
  static optimizeContextLength(context, maxLength) {
    if (context.length <= maxLength) {
      return context;
    }

    Logger.warn('Optimizing context length for ElevenLabs limits', {
      originalLength: context.length,
      targetLength: maxLength
    });

    // Strategy: Keep header and primary card, truncate alternatives
    const lines = context.split('\n');
    let optimized = '';
    let inAlternatives = false;

    for (const line of lines) {
      if (line.includes('## ALTERNATIVE CAREER OPTIONS')) {
        inAlternatives = true;
      }

      if (!inAlternatives || optimized.length + line.length + 100 < maxLength) {
        optimized += line + '\n';
      } else if (!inAlternatives) {
        optimized += line + '\n';
      }
    }

    // Add truncation notice if needed
    if (optimized.length < context.length) {
      optimized += '\n*[Additional career options available for discussion]*';
    }

    return optimized.trim();
  }

  /**
   * Get empty context when no career cards provided
   * @param {string} userName - User name
   * @returns {string} Empty context message
   */
  static getEmptyContext(userName) {
    const userPrefix = userName ? ` for ${userName}` : '';
    return `# CAREER DISCOVERIES${userPrefix}\n*No career recommendations available at this time.*\n\nPlease continue the conversation to help identify interests and generate personalized career suggestions.`;
  }

  /**
   * Get error context when formatting fails
   * @param {string} userName - User name
   * @param {string} errorMessage - Error message
   * @returns {string} Error context message
   */
  static getErrorContext(userName, errorMessage) {
    const userPrefix = userName ? ` for ${userName}` : '';
    return `# CAREER DISCOVERIES${userPrefix}\n*Error loading career information.*\n\nPlease continue the conversation - I'll help identify interests and career possibilities through our discussion.`;
  }
}

export default AgentContextService;