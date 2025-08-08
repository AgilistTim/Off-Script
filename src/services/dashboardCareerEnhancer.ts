// Dashboard Career Enhancer Service - Progressive enhancement for career cards
// Uses Perplexity for real-time UK market data while preserving existing functionality

import { toast } from 'react-hot-toast';
import { mcpBridgeService, PerplexitySearchParams, PerplexitySearchResult, PerplexityStructuredCareerData } from './mcpBridgeService';
import type { CareerCard, EnhancedCareerCard, VerifiedEnhancedCareerCard } from '../types/careerCard';
import { firestore } from './firebase';
import { doc, getDoc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { environmentConfig } from '../config/environment';

/**
 * Cache interface for enhanced career data with TTL
 */
interface CachedEnhancement {
  data: EnhancedCareerData;
  timestamp: number;
  staleAt: number;
  confidence: number;
}

// Type alias for enhanced career data (using the centralized CareerCard perplexityData structure)
type EnhancedCareerData = NonNullable<CareerCard['perplexityData']>;

/**
 * Firestore document structure for persisted enhanced career data
 */
interface FirestoreEnhancedCareer {
  careerTitle: string;
  enhancedData: EnhancedCareerData;
  confidence: number;
  createdAt: any; // Firestore Timestamp
  staleAt: any; // Firestore Timestamp
  source: 'perplexity';
  apiVersion: string;
}

/**
 * Service class for progressive enhancement of dashboard career cards
 * using Perplexity real-time UK market data
 */
export class DashboardCareerEnhancer {
  private cache = new Map<string, CachedEnhancement>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours for market data
  private readonly HIGH_CONFIDENCE_THRESHOLD = 0.8;
  private readonly FIRESTORE_COLLECTION = 'enhancedCareerCards';
  private readonly API_VERSION = '1.0';

  /**
   * Main enhancement method - progressive enhancement pattern
   * Shows basic cards immediately, enhances asynchronously
   */
  async enhanceDashboardCards(userCareerCards: CareerCard[]): Promise<EnhancedCareerCard[]> {
    console.log('🔍 DashboardCareerEnhancer: Starting enhancement for', userCareerCards.length, 'cards');

    // 1. Filter cards needing enhancement (check cache first, including Firestore)
    const uncachedCards = await this.filterCardsNeedingEnhancement(userCareerCards);
    
    if (uncachedCards.length === 0) {
      console.log('✅ All cards already enhanced or cached');
      return await this.applyExistingEnhancements(userCareerCards);
    }

    console.log('🔄 Need to enhance', uncachedCards.length, 'cards');

    // 2. Show loading toast for user feedback
    toast.loading('Updating career data with latest market intelligence...', { 
      id: 'enhancement',
      duration: Infinity // Keep until we update it
    });

    try {
      // 3. Batch enhance with Promise.allSettled for parallel processing
      const enhancementPromises = uncachedCards.map(card => 
        this.enhanceCardWithPerplexity(card.title)
      );
      
      const results = await Promise.allSettled(enhancementPromises);

      // 4. Process results and update cache
      const enhancedCards = await this.processEnhancementResults(results, uncachedCards, userCareerCards);

      // 5. Show success toast
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      toast.success(`Career data updated! Enhanced ${successCount}/${uncachedCards.length} cards`, { 
        id: 'enhancement' 
      });

      console.log('✅ Enhancement completed:', { 
        total: uncachedCards.length, 
        successful: successCount,
        failed: uncachedCards.length - successCount
      });

      return enhancedCards;

    } catch (error) {
      console.error('❌ Enhancement batch failed:', error);
      toast.error('Failed to update career data. Using cached information.', { 
        id: 'enhancement' 
      });
      
      // Graceful fallback to basic cards
      return await this.applyExistingEnhancements(userCareerCards);
    }
  }

  /**
   * Filter cards that need enhancement based on cache status
   */
  private async filterCardsNeedingEnhancement(cards: CareerCard[]): Promise<CareerCard[]> {
    const results = await Promise.all(
      cards.map(async (card) => {
        const cached = await this.getCachedEnhancement(card.title);
        
        // Enhance if no cache, cache is stale, or confidence is low
        const needsEnhancement = !cached || 
               Date.now() > cached.staleAt || 
               cached.confidence < this.HIGH_CONFIDENCE_THRESHOLD;
               
        return { card, needsEnhancement };
      })
    );
    
    return results.filter(result => result.needsEnhancement).map(result => result.card);
  }

  /**
   * Single comprehensive Perplexity call for career enhancement (JSON structured response)
   */
  private async enhanceCardWithPerplexity(careerTitle: string): Promise<{
    title: string;
    data: EnhancedCareerData;
    confidence: number;
  }> {
    console.log('🔍 Enhancing with structured Perplexity JSON:', careerTitle);

    try {
      // Use new structured JSON API call
      const result = await mcpBridgeService.searchStructuredCareerData(careerTitle);
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'No valid structured response from Perplexity');
      }

      // Convert structured Perplexity data to our EnhancedCareerData format
      const enhancedData = this.convertStructuredToEnhancedData(result.data);
      
      if (!enhancedData) {
        throw new Error('Unable to convert Perplexity data - critical salary information missing. Refusing to display potentially misleading career data.');
      }
      
      const confidence = this.calculateStructuredConfidence(result.data);

      // Cache the result
      await this.setCachedEnhancement(careerTitle, enhancedData, confidence);

      console.log('✅ Successfully enhanced with structured data:', careerTitle, { 
        confidence,
        hasEnhancedSalary: !!result.data.enhancedData?.verifiedSalary,
        hasEducationPathways: !!result.data.enhancedData?.currentEducationPathways?.length,
        sourcesCount: result.data.sources?.length || 0
      });

      return {
        title: careerTitle,
        data: enhancedData,
        confidence
      };

    } catch (error) {
      console.error('❌ Failed to enhance with structured Perplexity:', careerTitle, error);
      throw error;
    }
  }

  /**
   * Parse comprehensive Perplexity response into structured 10-section data
   */
  private parseComprehensiveResponse(response: PerplexitySearchResult, careerTitle: string): EnhancedCareerData | null {
    const content = response.response || '';
    const sources = response.sources?.map(s => s.url) || [];

    console.log('🔍 Parsing comprehensive response for:', careerTitle);

    const salaryData = this.extractSalaryData(content, sources);
    
    // If we can't extract salary data, don't return misleading enhanced data
    if (!salaryData) {
      console.error('❌ Could not extract valid salary data from text response - refusing to provide enhanced data');
      return null;
    }

    return {
      verifiedSalaryRanges: salaryData,
      realTimeMarketDemand: this.extractMarketDemandData(content, sources),
      currentEducationPathways: this.extractEducationData(content, sources),
      workEnvironmentDetails: this.extractWorkEnvironmentData(content),
      automationRiskAssessment: this.extractAutomationRiskData(content),
      industryGrowthProjection: this.extractGrowthProjectionData(content)
    };
  }

  /**
   * Extract salary data from response content
   */
  private extractSalaryData(content: string, sources: string[]): EnhancedCareerData['verifiedSalaryRanges'] | null {
    // Regex patterns to find £XX,XXX salary ranges
    const salaryRegex = /£([0-9,]+)(?:\s*-\s*£?([0-9,]+))?/g;
    const entryRegex = /entry\s*(?:level)?\s*:?\s*£([0-9,]+)(?:\s*-\s*£?([0-9,]+))?/gi;
    const midRegex = /(?:mid|experienced?|intermediate)\s*(?:level)?\s*:?\s*£([0-9,]+)(?:\s*-\s*£?([0-9,]+))?/gi;
    const seniorRegex = /senior\s*(?:level)?\s*:?\s*£([0-9,]+)(?:\s*-\s*£?([0-9,]+))?/gi;

    const parseAmount = (str: string): number => {
      return parseInt(str.replace(/,/g, ''), 10) || 0;
    };

    const extractRange = (regex: RegExp, content: string) => {
      const match = regex.exec(content);
      if (match) {
        const min = parseAmount(match[1]);
        const max = match[2] ? parseAmount(match[2]) : min + 10000;
        return { min, max };
      }
      return null;
    };

    const entry = extractRange(entryRegex, content);
    const mid = extractRange(midRegex, content);
    const senior = extractRange(seniorRegex, content);

    // If we can't extract salary data, don't make up fake ranges
    if (!entry || !mid || !senior) {
      console.error('❌ Unable to extract salary data from content - refusing to use fallback values');
      return null;
    }

    return {
      entry: { ...entry, currency: 'GBP', sources },
      mid: { ...mid, currency: 'GBP', sources },
      senior: { ...senior, currency: 'GBP', sources },
      byRegion: {
        london: { min: Math.round(entry.min * 1.2), max: Math.round(senior.max * 1.3) },
        manchester: { min: Math.round(entry.min * 0.9), max: Math.round(senior.max * 0.9) },
        birmingham: { min: Math.round(entry.min * 0.85), max: Math.round(senior.max * 0.85) },
        scotland: { min: Math.round(entry.min * 0.8), max: Math.round(senior.max * 0.8) }
      }
    };
  }

  /**
   * Extract market demand data from response content
   */
  private extractMarketDemandData(content: string, sources: string[]): EnhancedCareerData['realTimeMarketDemand'] {
    // Look for growth indicators
    const growthRegex = /(?:growth|increase|rising|demand)\s*(?:rate|by)?\s*:?\s*([0-9.]+)%/gi;
    const demandRegex = /(?:demand|competition|market)\s*(?:is|level)?\s*:?\s*(high|medium|low)/gi;
    const jobsRegex = /([0-9,]+)\s*(?:jobs?|positions?|openings?|postings?)/gi;

    const growthMatch = growthRegex.exec(content);
    const demandMatch = demandRegex.exec(content);
    const jobsMatch = jobsRegex.exec(content);

    const growthRate = growthMatch ? parseFloat(growthMatch[1]) : 5.0; // Default 5% growth
    const competitionLevel = demandMatch ? 
      (demandMatch[1].toLowerCase() as 'Low' | 'Medium' | 'High') : 'Medium';
    const jobPostingVolume = jobsMatch ? 
      parseInt(jobsMatch[1].replace(/,/g, ''), 10) : 1500; // Default estimate

    return {
      jobPostingVolume,
      growthRate,
      competitionLevel,
      sources
    };
  }

  /**
   * Extract education pathway data from response content
   */
  private extractEducationData(content: string, sources: string[]): EnhancedCareerData['currentEducationPathways'] {
    const pathways: EnhancedCareerData['currentEducationPathways'] = [];

    // Look for degree mentions
    if (content.toLowerCase().includes('degree') || content.toLowerCase().includes('university')) {
      pathways.push({
        type: 'University',
        title: 'Bachelor\'s Degree (relevant field)',
        provider: 'UK Universities',
        duration: '3-4 years',
        cost: { min: 9250, max: 27750, currency: 'GBP' },
        entryRequirements: ['A-levels or equivalent', 'UCAS application'],
        verified: true
      });
    }

    // Look for apprenticeship mentions
    if (content.toLowerCase().includes('apprentice')) {
      pathways.push({
        type: 'Apprenticeship',
        title: 'Higher Apprenticeship',
        provider: 'UK Apprenticeship Providers',
        duration: '2-4 years',
        cost: { min: 0, max: 0, currency: 'GBP' },
        entryRequirements: ['GCSEs or equivalent', 'Employer sponsorship'],
        verified: true
      });
    }

    // Look for professional qualifications
    if (content.toLowerCase().includes('certification') || content.toLowerCase().includes('professional')) {
      pathways.push({
        type: 'Professional',
        title: 'Professional Certification',
        provider: 'Industry Bodies',
        duration: '6-18 months',
        cost: { min: 500, max: 5000, currency: 'GBP' },
        entryRequirements: ['Relevant experience', 'Foundation knowledge'],
        verified: true
      });
    }

    return pathways.length > 0 ? pathways : [
      {
        type: 'University',
        title: 'Relevant Degree',
        provider: 'UK Universities',
        duration: '3-4 years',
        cost: { min: 9250, max: 27750, currency: 'GBP' },
        entryRequirements: ['A-levels or equivalent'],
        verified: false
      }
    ];
  }

  /**
   * Extract work environment data from response content
   */
  private extractWorkEnvironmentData(content: string): EnhancedCareerData['workEnvironmentDetails'] {
    const remoteRegex = /(?:remote|work\s*from\s*home|hybrid)/gi;
    const flexibilityRegex = /(?:flexible?|flexibility)\s*(?:working|hours)?/gi;
    const hoursRegex = /([0-9]+)\s*(?:hours?|hrs?)\s*(?:per\s*week|weekly)/gi;

    const remoteOptions = remoteRegex.test(content);
    const hasFlexibility = flexibilityRegex.test(content);
    const hoursMatch = hoursRegex.exec(content);

    const flexibilityLevel: 'High' | 'Medium' | 'Low' = 
      remoteOptions && hasFlexibility ? 'High' :
      remoteOptions || hasFlexibility ? 'Medium' : 'Low';

    const typicalHours = hoursMatch ? 
      `${hoursMatch[1]} hours/week` : '37-40 hours/week';

    return {
      remoteOptions,
      flexibilityLevel,
      typicalHours,
      workLifeBalance: flexibilityLevel === 'High' ? 'Good' : flexibilityLevel === 'Medium' ? 'Fair' : 'Variable',
      stressLevel: 'Medium' // Default - could be enhanced with more parsing
    };
  }

  /**
   * Extract automation risk data from response content
   */
  private extractAutomationRiskData(content: string): EnhancedCareerData['automationRiskAssessment'] {
    const riskRegex = /(?:automation|AI|artificial\s*intelligence)\s*(?:risk|threat|impact)\s*(?:is|level)?\s*:?\s*(high|medium|low)/gi;
    const timelineRegex = /(?:in|within|over)\s*(?:the\s*)?(?:next\s*)?([0-9]+)\s*(?:years?|decades?)/gi;

    const riskMatch = riskRegex.exec(content);
    const timelineMatch = timelineRegex.exec(content);

    const level: 'Low' | 'Medium' | 'High' = riskMatch ? 
      (riskMatch[1].toLowerCase() as 'Low' | 'Medium' | 'High') : 'Medium';
    
    const timeline = timelineMatch ? 
      `${timelineMatch[1]} years` : '5-10 years';

    const mitigationStrategies = [
      'Continuous learning and upskilling',
      'Focus on human-centric skills',
      'Embrace technology as a tool',
      'Develop critical thinking abilities'
    ];

    const futureSkillsNeeded = [
      'Digital literacy',
      'Data analysis',
      'Problem-solving',
      'Emotional intelligence',
      'Adaptability'
    ];

    return {
      level,
      timeline,
      mitigationStrategies,
      futureSkillsNeeded
    };
  }

  /**
   * Extract industry growth projection data from response content
   */
  private extractGrowthProjectionData(content: string): EnhancedCareerData['industryGrowthProjection'] {
    const growthRegex = /(?:growth|expand|increase)\s*(?:of|by)?\s*([0-9.]+)%/gi;
    const outlookRegex = /(?:outlook|projection|forecast)\s*(?:is|shows)?\s*:?\s*(excellent|good|stable|positive|declining|negative)/gi;

    const growthMatch = growthRegex.exec(content);
    const outlookMatch = outlookRegex.exec(content);

    const nextYear = growthMatch ? parseFloat(growthMatch[1]) : 3.5;
    const fiveYear = Math.round(nextYear * 3.5); // Rough 5-year projection

    const outlookText = outlookMatch ? outlookMatch[1].toLowerCase() : 'good';
    const outlook: 'Excellent' | 'Good' | 'Stable' | 'Declining' = 
      ['excellent', 'very good'].includes(outlookText) ? 'Excellent' :
      ['good', 'positive'].includes(outlookText) ? 'Good' :
      ['stable', 'steady'].includes(outlookText) ? 'Stable' : 'Declining';

    const factors = [
      'Digital transformation',
      'Skills shortage',
      'Industry innovation',
      'Economic growth',
      'Technology adoption'
    ];

    return {
      nextYear,
      fiveYear,
      outlook,
      factors
    };
  }

  /**
   * Calculate confidence score based on response quality
   */
  private calculateConfidence(response: PerplexitySearchResult, data: EnhancedCareerData): number {
    let confidence = 0.5; // Base confidence

    // Boost confidence based on data completeness
    if (data.verifiedSalaryRanges) confidence += 0.15;
    if (data.realTimeMarketDemand) confidence += 0.1;
    if (data.currentEducationPathways && data.currentEducationPathways.length > 0) confidence += 0.1;
    if (data.workEnvironmentDetails) confidence += 0.05;
    if (data.automationRiskAssessment) confidence += 0.05;
    if (data.industryGrowthProjection) confidence += 0.05;

    // Boost confidence based on sources
    const citationCount = response.sources?.length || 0;
    if (citationCount >= 3) confidence += 0.1;
    if (citationCount >= 5) confidence += 0.05;

    // Boost confidence based on content length (more detailed = higher confidence)
    const contentLength = response.response?.length || 0;
    if (contentLength > 1000) confidence += 0.05;
    if (contentLength > 2000) confidence += 0.05;

    return Math.min(confidence, 1.0); // Cap at 1.0
  }

  /**
   * Convert structured Perplexity data to our EnhancedCareerData format
   */
  private convertStructuredToEnhancedData(data: PerplexityStructuredCareerData): EnhancedCareerData | null {
    console.log('🔄 Converting structured Perplexity data to enhanced format');

    const salaryData = this.convertStructuredSalaryData(data);
    
    // If critical salary data is missing, don't return partial/misleading enhanced data
    if (!salaryData) {
      console.error('❌ Critical salary data missing - cannot provide enhanced career data without verified salary information');
      return null;
    }

    // Return only the Perplexity-specific enhanced data
    // The comprehensive career data will be handled separately in the career card structure
    return {
      verifiedSalaryRanges: salaryData,
      realTimeMarketDemand: this.convertStructuredMarketData(data),
      currentEducationPathways: this.convertStructuredEducationData(data),
      workEnvironmentDetails: this.convertStructuredWorkEnvironmentData(data),
      automationRiskAssessment: this.convertStructuredAutomationData(data),
      industryGrowthProjection: this.convertStructuredGrowthData(data),
      competencyRequirements: this.convertStructuredCompetencyData(data)
    };
  }

  /**
   * Convert structured salary data to our format
   */
  private convertStructuredSalaryData(data: PerplexityStructuredCareerData): EnhancedCareerData['verifiedSalaryRanges'] | null {
    const salaryData = data.enhancedData?.verifiedSalary || data.compensationRewards?.salaryRange;
    const sources = data.sources?.map(s => s.url) || [];

    if (!salaryData) {
      console.error('❌ No salary data available from Perplexity API - refusing to show misleading fallback data');
      return null; // Return null instead of fake data
    }

    // Parse string salary ranges like "£18,000 - £25,000"
    const parseRange = (rangeStr: string): { min: number; max: number } | null => {
      const matches = rangeStr.match(/£([0-9,]+)(?:\s*-\s*£?([0-9,]+))?/);
      if (matches) {
        const min = parseInt(matches[1].replace(/,/g, ''), 10);
        const max = matches[2] ? parseInt(matches[2].replace(/,/g, ''), 10) : min + 10000;
        return { min, max };
      }
      console.error('❌ Could not parse salary range:', rangeStr);
      return null; // Don't return fake salary data
    };

    const entry = parseRange(salaryData.entry);
    const experienced = parseRange(salaryData.experienced);
    const senior = parseRange(salaryData.senior);

    // If any salary parsing failed, don't provide misleading data
    if (!entry || !experienced || !senior) {
      console.error('❌ Failed to parse salary ranges from structured data');
      return null;
    }

    // Use regional data if available and parseable, otherwise calculate estimates from verified main salary data
    let byRegion;
    
    if (salaryData.byRegion) {
      const londonData = parseRange(salaryData.byRegion.london);
      const manchesterData = parseRange(salaryData.byRegion.manchester);
      const birminghamData = parseRange(salaryData.byRegion.birmingham);
      const scotlandData = parseRange(salaryData.byRegion.scotland);
      
      // Only use regional data if we can parse all regions, otherwise fall back to estimates
      if (londonData && manchesterData && birminghamData && scotlandData) {
        byRegion = {
          london: londonData,
          manchester: manchesterData,
          birmingham: birminghamData,
          scotland: scotlandData
        };
      } else {
        console.warn('⚠️ Some regional salary data could not be parsed, using estimates based on verified main salary data');
        byRegion = {
          london: { min: Math.round(entry.min * 1.2), max: Math.round(senior.max * 1.3) },
          manchester: { min: Math.round(entry.min * 0.9), max: Math.round(senior.max * 0.9) },
          birmingham: { min: Math.round(entry.min * 0.85), max: Math.round(senior.max * 0.85) },
          scotland: { min: Math.round(entry.min * 0.8), max: Math.round(senior.max * 0.8) }
        };
      }
    } else {
      // Calculate estimates from verified main salary data
      byRegion = {
        london: { min: Math.round(entry.min * 1.2), max: Math.round(senior.max * 1.3) },
        manchester: { min: Math.round(entry.min * 0.9), max: Math.round(senior.max * 0.9) },
        birmingham: { min: Math.round(entry.min * 0.85), max: Math.round(senior.max * 0.85) },
        scotland: { min: Math.round(entry.min * 0.8), max: Math.round(senior.max * 0.8) }
      };
    }

    return {
      entry: { ...entry, currency: 'GBP', sources },
      mid: { ...experienced, currency: 'GBP', sources },
      senior: { ...senior, currency: 'GBP', sources },
      byRegion
    };
  }

  /**
   * Convert structured market data to our format
   */
  private convertStructuredMarketData(data: PerplexityStructuredCareerData): EnhancedCareerData['realTimeMarketDemand'] {
    const marketData = data.enhancedData?.realTimeMarketDemand;
    const sources = data.sources?.map(s => s.url) || [];

    // Robust growth rate parsing that avoids concatenating year values (e.g. "30% (2024)")
    const parseGrowthRate = (input?: string | number): number => {
      if (typeof input === 'number' && !isNaN(input)) return input;
      if (typeof input !== 'string' || input.trim().length === 0) return 5.0;

      const str = input.trim();
      // Prefer a number explicitly marked with a % sign
      const percentMatch = str.match(/-?\d+(?:\.\d+)?(?=\s*%)/);
      if (percentMatch) {
        const val = parseFloat(percentMatch[0]);
        if (!isNaN(val)) return Math.max(-100, Math.min(200, val));
      }
      // Otherwise pick the first reasonable number token (skip likely years like 2024)
      const numberMatches = str.match(/-?\d+(?:\.\d+)?/g) || [];
      for (const token of numberMatches) {
        const val = parseFloat(token);
        if (!isNaN(val) && Math.abs(val) <= 200) {
          return val;
        }
      }
      // Last resort: strip non-numerics and clamp
      const fallback = parseFloat(str.replace(/[^0-9.-]/g, ''));
      if (!isNaN(fallback)) return Math.max(-100, Math.min(200, fallback));
      return 5.0;
    };

    return {
      jobPostingVolume: marketData?.jobPostingVolume || 1500,
      growthRate: parseGrowthRate(marketData?.growthRate),
      competitionLevel: (marketData?.competitionLevel as 'Low' | 'Medium' | 'High') || 'Medium',
      sources
    };
  }

  /**
   * Convert structured education data to our format
   */
  private convertStructuredEducationData(data: PerplexityStructuredCareerData): EnhancedCareerData['currentEducationPathways'] {
    const educationData = data.enhancedData?.currentEducationPathways || [];
    
    return educationData
      .map(pathway => {
        const cost = this.parseEducationCost(pathway.cost);
        // Only include pathways where we can parse valid cost data
        if (!cost) {
          console.warn('⚠️ Skipping education pathway due to unparseable cost:', pathway.title);
          return null;
        }
        
        return {
          type: pathway.type as 'University' | 'Apprenticeship' | 'Professional' | 'Online',
          title: pathway.title,
          provider: pathway.provider,
          duration: pathway.duration,
          cost,
          entryRequirements: pathway.entryRequirements || [],
          url: '',
          verified: pathway.verified || false
        };
      })
      .filter((pathway): pathway is NonNullable<typeof pathway> => pathway !== null);
  }

  /**
   * Parse education cost string to our cost format
   */
  private parseEducationCost(costStr: string): { min: number; max: number; currency: 'GBP' } | null {
    const matches = costStr.match(/£([0-9,]+)(?:\s*-\s*£?([0-9,]+))?/);
    if (matches) {
      const min = parseInt(matches[1].replace(/,/g, ''), 10);
      const max = matches[2] ? parseInt(matches[2].replace(/,/g, ''), 10) : min;
      return { min, max, currency: 'GBP' };
    }
    console.error('❌ Could not parse education cost from:', costStr, '- refusing to provide fake cost data');
    return null; // Don't provide fake cost data
  }

  /**
   * Convert structured work environment data to our format
   */
  private convertStructuredWorkEnvironmentData(data: PerplexityStructuredCareerData): EnhancedCareerData['workEnvironmentDetails'] {
    const workData = data.lifestyleFit;
    const culturalData = data.workEnvironmentCulture;

    return {
      remoteOptions: workData?.remoteOptions?.remoteWork || false,
      flexibilityLevel: workData?.workingHours?.flexibility?.includes('High') ? 'High' as const :
                       workData?.workingHours?.flexibility?.includes('Low') ? 'Low' as const : 'Medium' as const,
      typicalHours: workData?.workingHours?.typical || '37-40 hours per week',
      workLifeBalance: culturalData?.culturalNorms?.workLifeBalance || 'Good work-life balance',
      stressLevel: workData?.stressProfile?.intensity?.includes('High') ? 'High' as const :
                   workData?.stressProfile?.intensity?.includes('Low') ? 'Low' as const : 'Medium' as const
    };
  }

  /**
   * Convert structured automation data to our format
   */
  private convertStructuredAutomationData(data: PerplexityStructuredCareerData): EnhancedCareerData['automationRiskAssessment'] {
    const automationData = data.enhancedData?.automationRiskAssessment;

    return {
      level: (automationData?.level as 'Low' | 'Medium' | 'High') || 'Low',
      timeline: automationData?.timeline || '10+ years',
      mitigationStrategies: automationData?.mitigationStrategies || [],
      futureSkillsNeeded: automationData?.futureSkillsNeeded || []
    };
  }

  /**
   * Convert structured growth data to our format
   */
  private convertStructuredGrowthData(data: PerplexityStructuredCareerData): EnhancedCareerData['industryGrowthProjection'] {
    const growthData = data.enhancedData?.industryGrowthProjection;

    return {
      nextYear: parseFloat(growthData?.nextYear?.replace(/[^0-9.-]/g, '') || '3.0'),
      fiveYear: parseFloat(growthData?.fiveYear?.replace(/[^0-9.-]/g, '') || '15.0'),
      outlook: (growthData?.outlook as 'Excellent' | 'Good' | 'Stable' | 'Declining') || 'Good',
      factors: growthData?.factors || ['Digital transformation', 'Industry growth', 'Skills demand']
    };
  }

  /**
   * Convert structured competency requirements data to our format
   */
  private convertStructuredCompetencyData(data: PerplexityStructuredCareerData): EnhancedCareerData['competencyRequirements'] {
    const competencyData = data.competencyRequirements;

    return {
      technicalSkills: competencyData?.technicalSkills || [],
      softSkills: competencyData?.softSkills || [],
      tools: [], // Not available in Perplexity structured data
      certifications: [], // Not available in Perplexity structured data
      qualificationPathway: {
        degrees: competencyData?.qualificationPathway?.degrees || [],
        licenses: [], // Not available in Perplexity structured data
        alternativeRoutes: competencyData?.qualificationPathway?.alternativeRoutes || [],
        apprenticeships: competencyData?.qualificationPathway?.apprenticeships || [],
        bootcamps: competencyData?.qualificationPathway?.bootcamps || []
      },
      learningCurve: {
        timeToCompetent: competencyData?.learningCurve?.timeToCompetent || 'N/A',
        difficultyLevel: competencyData?.learningCurve?.difficultyLevel || 'N/A',
        prerequisites: competencyData?.learningCurve?.prerequisites || []
      }
    };
  }

  /**
   * Calculate confidence for structured data
   */
  private calculateStructuredConfidence(data: PerplexityStructuredCareerData): number {
    let confidence = 0.7; // Higher base confidence for structured data

    // Boost confidence based on data completeness
    if (data.enhancedData?.verifiedSalary) confidence += 0.1;
    if (data.enhancedData?.realTimeMarketDemand) confidence += 0.05;
    if (data.enhancedData?.currentEducationPathways?.length > 0) confidence += 0.05;
    if (data.enhancedData?.automationRiskAssessment) confidence += 0.05;
    if (data.enhancedData?.industryGrowthProjection) confidence += 0.05;
    if (data.competencyRequirements?.technicalSkills?.length > 0) confidence += 0.05;
    if (data.competencyRequirements?.softSkills?.length > 0) confidence += 0.05;

    // Boost confidence based on sources
    const sourceCount = data.sources?.length || 0;
    if (sourceCount >= 3) confidence += 0.05;
    if (sourceCount >= 5) confidence += 0.05;

    return Math.min(confidence, 1.0); // Cap at 1.0
  }

  /**
   * Process enhancement results and merge with original cards
   */
  private async processEnhancementResults(
    results: PromiseSettledResult<{ title: string; data: EnhancedCareerData; confidence: number }>[],
    uncachedCards: CareerCard[],
    allCards: CareerCard[]
  ): Promise<EnhancedCareerCard[]> {
    const enhancementMap = new Map<string, { data: EnhancedCareerData; confidence: number }>();

    // Process successful enhancements
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { title, data, confidence } = result.value;
        enhancementMap.set(title.toLowerCase(), { data, confidence });
      } else {
        const cardTitle = uncachedCards[index]?.title || 'Unknown';
        console.warn('❌ Enhancement failed for:', cardTitle, result.reason);
      }
    });

    // Apply enhancements to all cards
    const cardResults = await Promise.all(
      allCards.map(async (card) => {
        const enhancement = enhancementMap.get(card.title.toLowerCase()) || 
                           await this.getCachedEnhancement(card.title);

        if (enhancement) {
          // Transform the enhanced data to include the perplexityData field that Dashboard modal expects
          const transformedPerplexityData = this.transformToPerplexityDataFormat(enhancement.data);
          
          const enhancedCard: EnhancedCareerCard = {
            ...card,
            enhancement: {
              status: 'completed',
              lastUpdated: new Date().toISOString(),
              source: 'perplexity',
              confidence: enhancement.confidence,
              staleAt: new Date(Date.now() + this.CACHE_TTL).toISOString()
            },
            perplexityData: transformedPerplexityData
          };

          return enhancedCard;
        }

        return card as EnhancedCareerCard;
      })
    );

    return cardResults;
  }

  /**
   * Apply existing cached enhancements to cards
   */
  private async applyExistingEnhancements(cards: CareerCard[]): Promise<EnhancedCareerCard[]> {
    const results = await Promise.all(
      cards.map(async (card) => {
        const cached = await this.getCachedEnhancement(card.title);
        
        if (cached && Date.now() < cached.staleAt) {
          // Transform the enhanced data to include the perplexityData field that Dashboard modal expects
          const transformedPerplexityData = this.transformToPerplexityDataFormat(cached.data);
          
          return {
            ...card,
            enhancement: {
              status: 'completed',
              lastUpdated: new Date(cached.timestamp).toISOString(),
              source: 'perplexity',
              confidence: cached.confidence,
              staleAt: new Date(cached.staleAt).toISOString()
            },
            perplexityData: transformedPerplexityData
          } as EnhancedCareerCard;
        }

        return card as EnhancedCareerCard;
      })
    );

    return results;
  }

  /**
   * Transform enhanced data to the perplexityData format expected by Dashboard modal
   */
  private transformToPerplexityDataFormat(data: EnhancedCareerData): any {
    if (!data) return undefined;

    return {
      // Transform verified salary ranges to the expected format
      verifiedSalaryRanges: data.verifiedSalaryRanges ? {
        entry: {
          min: data.verifiedSalaryRanges.entry.min,
          max: data.verifiedSalaryRanges.entry.max,
          currency: data.verifiedSalaryRanges.entry.currency,
          sources: data.verifiedSalaryRanges.entry.sources || []
        },
        mid: {
          min: data.verifiedSalaryRanges.mid.min,
          max: data.verifiedSalaryRanges.mid.max,
          currency: data.verifiedSalaryRanges.mid.currency,
          sources: data.verifiedSalaryRanges.mid.sources || []
        },
        senior: {
          min: data.verifiedSalaryRanges.senior.min,
          max: data.verifiedSalaryRanges.senior.max,
          currency: data.verifiedSalaryRanges.senior.currency,
          sources: data.verifiedSalaryRanges.senior.sources || []
        },
        byRegion: data.verifiedSalaryRanges.byRegion
      } : undefined,

      // Transform real-time market demand
      realTimeMarketDemand: data.realTimeMarketDemand ? {
        jobPostingVolume: data.realTimeMarketDemand.jobPostingVolume,
        growthRate: data.realTimeMarketDemand.growthRate / 100, // Convert to decimal for Dashboard display
        competitionLevel: data.realTimeMarketDemand.competitionLevel
      } : undefined,

      // Transform work environment details
      workEnvironmentDetails: data.workEnvironmentDetails ? {
        remoteOptions: data.workEnvironmentDetails.remoteOptions || false,
        flexibilityLevel: data.workEnvironmentDetails.flexibilityLevel || 'Medium',
        typicalHours: data.workEnvironmentDetails.typicalHours || '37-42 hours/week',
        workLifeBalance: data.workEnvironmentDetails.workLifeBalance || 'Good',
        stressLevel: data.workEnvironmentDetails.stressLevel || 'Medium'
      } : {
        remoteOptions: true,
        flexibilityLevel: 'High',
        typicalHours: '37-42 hours/week',
        workLifeBalance: 'Good',
        stressLevel: 'Medium'
      },

      // Transform current education pathways
      currentEducationPathways: data.currentEducationPathways ? 
        data.currentEducationPathways.map(pathway => ({
          type: pathway.type,
          title: pathway.title,
          provider: pathway.provider,
          duration: pathway.duration,
          cost: {
            min: pathway.cost.min,
            max: pathway.cost.max
          },
          entryRequirements: pathway.entryRequirements || [],
          verified: pathway.verified
        })) : [],

      // Transform automation risk assessment
      automationRiskAssessment: data.automationRiskAssessment ? {
        level: data.automationRiskAssessment.level,
        timeline: data.automationRiskAssessment.timeline,
        mitigationStrategies: data.automationRiskAssessment.mitigationStrategies || [],
        futureSkillsNeeded: data.automationRiskAssessment.futureSkillsNeeded || []
      } : undefined,

      // Transform industry growth projection
      industryGrowthProjection: data.industryGrowthProjection ? {
        nextYear: data.industryGrowthProjection.nextYear,
        fiveYear: data.industryGrowthProjection.fiveYear,
        outlook: data.industryGrowthProjection.outlook,
        factors: data.industryGrowthProjection.factors || []
      } : undefined,

      // Transform competency requirements (for the Required section)
      competencyRequirements: data.competencyRequirements ? {
        technicalSkills: data.competencyRequirements.technicalSkills || [],
        softSkills: data.competencyRequirements.softSkills || [],
        tools: data.competencyRequirements.tools || [],
        certifications: data.competencyRequirements.certifications || [],
        qualificationPathway: data.competencyRequirements.qualificationPathway || {
          degrees: [],
          licenses: [],
          alternativeRoutes: [],
          apprenticeships: [],
          bootcamps: []
        },
        learningCurve: data.competencyRequirements.learningCurve || {
          timeToCompetent: 'N/A',
          difficultyLevel: 'N/A',
          prerequisites: []
        }
      } : undefined
    };
  }

  /**
   * Load enhanced data from Firestore
   */
  private async loadFromFirestore(careerTitle: string): Promise<CachedEnhancement | null> {
    try {
      const docKey = careerTitle.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const docRef = doc(firestore, this.FIRESTORE_COLLECTION, docKey);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data() as FirestoreEnhancedCareer;
      
      // Check if data is still valid
      const staleAt = data.staleAt?.toMillis?.() || data.staleAt;
      if (Date.now() > staleAt) {
        console.log('🕐 Firestore data expired for:', careerTitle);
        return null;
      }

      console.log('💾 Loaded from Firestore:', careerTitle, { confidence: data.confidence });
      
      return {
        data: data.enhancedData,
        timestamp: data.createdAt?.toMillis?.() || data.createdAt,
        staleAt,
        confidence: data.confidence
      };
    } catch (error) {
      console.warn('⚠️ Firestore read error for', careerTitle, ':', error);
      return null;
    }
  }

  /**
   * Save enhanced data to Firestore
   */
  private async saveToFirestore(careerTitle: string, data: EnhancedCareerData, confidence: number): Promise<void> {
    try {
      const docKey = careerTitle.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const docRef = doc(firestore, this.FIRESTORE_COLLECTION, docKey);
      
      const firestoreDoc: FirestoreEnhancedCareer = {
        careerTitle,
        enhancedData: data,
        confidence,
        createdAt: serverTimestamp(),
        staleAt: new Date(Date.now() + this.CACHE_TTL),
        source: 'perplexity',
        apiVersion: this.API_VERSION
      };

      await setDoc(docRef, firestoreDoc);
      console.log('💾 Saved to Firestore:', careerTitle, { confidence });
    } catch (error) {
      console.warn('⚠️ Firestore write error for', careerTitle, ':', error);
      // Don't throw - Firestore is supplementary to cache
    }
  }

  /**
   * Get cached enhancement data for a career title (checks memory cache first, then Firestore)
   */
  private async getCachedEnhancement(careerTitle: string): Promise<CachedEnhancement | null> {
    // First check memory cache
    const cached = this.cache.get(careerTitle.toLowerCase());
    if (cached) {
      // Check if cache is still valid
      if (Date.now() > cached.staleAt) {
        this.cache.delete(careerTitle.toLowerCase());
      } else {
        return cached;
      }
    }

    // If not in memory cache, check Firestore
    const firestoreData = await this.loadFromFirestore(careerTitle);
    if (firestoreData) {
      // Store in memory cache for faster access
      this.cache.set(careerTitle.toLowerCase(), firestoreData);
      return firestoreData;
    }

    return null;
  }

  /**
   * Set cached enhancement data for a career title (saves to both memory cache and Firestore)
   */
  private async setCachedEnhancement(careerTitle: string, data: EnhancedCareerData, confidence: number = 0.9): Promise<void> {
    const now = Date.now();
    const cacheData = {
      data,
      timestamp: now,
      staleAt: now + this.CACHE_TTL,
      confidence
    };

    // Store in memory cache immediately
    this.cache.set(careerTitle.toLowerCase(), cacheData);

    // Store in Firestore asynchronously (don't await to avoid blocking)
    this.saveToFirestore(careerTitle, data, confidence).catch(error => {
      console.warn('⚠️ Failed to save to Firestore:', error);
    });

    console.log('💾 Cached enhancement for:', careerTitle, { confidence, cacheSize: this.cache.size });
  }

  /**
   * Clear all cached data (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Enhancement cache cleared');
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): { size: number; entries: Array<{ title: string; confidence: number; age: number }> } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([title, cached]) => ({
      title,
      confidence: cached.confidence,
      age: Math.round((now - cached.timestamp) / (1000 * 60 * 60)) // Age in hours
    }));

    return { size: this.cache.size, entries };
  }

  /**
   * Check if enhancement features are available
   * (Compatibility method for old service interface)
   */
  isEnhancementAvailable(): boolean {
    return environmentConfig.features.careerGuidance;
  }

  /**
   * Batch enhance multiple career cards for a user with progress tracking
   * (Compatibility method for old service interface)
   */
  async batchEnhanceUserCareerCards(
    userId: string, 
    careerCards: CareerCard[],
    onProgress?: (status: {
      status: 'processing' | 'completed' | 'error';
      progress: { completed: number; total: number };
      currentCard: string;
      estimatedCompletion?: number;
      errors: string[];
    }) => void
  ): Promise<EnhancedCareerCard[]> {
    
    if (!this.isEnhancementAvailable()) {
      throw new Error('Career enhancement not available - check configuration');
    }

    console.log(`🚀 Starting enhanced batch processing for ${careerCards.length} career cards (User: ${userId})`);
    
    let errors: string[] = [];
    const startTime = Date.now();

    // Update initial status
    onProgress?.({
      status: 'processing',
      progress: { completed: 0, total: careerCards.length },
      currentCard: careerCards[0]?.title || 'Starting...',
      estimatedCompletion: Date.now() + (careerCards.length * 30000), // Estimate 30s per card
      errors
    });

    try {
      // Use the main enhancement method
      const enhancedCards = await this.enhanceDashboardCards(careerCards);
      
      // Final progress update
      onProgress?.({
        status: 'completed',
        progress: { completed: careerCards.length, total: careerCards.length },
        currentCard: 'Complete',
        errors
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Batch enhancement completed in ${Math.round(duration / 1000)}s for ${enhancedCards.length} cards`);
      
      return enhancedCards;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown enhancement error';
      errors.push(errorMessage);
      
      console.error('❌ Batch enhancement failed:', error);
      
      onProgress?.({
        status: 'error',
        progress: { completed: 0, total: careerCards.length },
        currentCard: 'Failed',
        errors
      });
      
      throw error;
    }
  }
}

// Export singleton instance for use across the application
export const dashboardCareerEnhancer = new DashboardCareerEnhancer();