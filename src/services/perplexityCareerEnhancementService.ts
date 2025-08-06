// Perplexity Career Enhancement Service - Premium feature for logged-in users
// Provides real-time, verified UK career data using Perplexity's search capabilities

import { mcpBridgeService, PerplexitySearchParams, PerplexitySearchResult } from './mcpBridgeService';
import { environmentConfig } from '../config/environment';
import { UnifiedVoiceContextService } from './unifiedVoiceContextService';

export interface EnhancedCareerData {
  verifiedSalary: {
    entry: { min: number; max: number; currency: 'GBP'; sources: string[] };
    mid: { min: number; max: number; currency: 'GBP'; sources: string[] };
    senior: { min: number; max: number; currency: 'GBP'; sources: string[] };
    byRegion: {
      london: { min: number; max: number };
      manchester: { min: number; max: number };
      birmingham: { min: number; max: number };
      scotland: { min: number; max: number };
    };
  };
  demandIndicators: {
    jobPostingVolume: number; // Last 30 days
    growthRate: number; // YoY percentage
    competitionLevel: 'Low' | 'Medium' | 'High';
    sources: string[];
  };
  verifiedEducation: {
    pathways: Array<{
      type: 'University' | 'Apprenticeship' | 'Professional' | 'Online';
      title: string;
      provider: string;
      duration: string;
      cost: { min: number; max: number; currency: 'GBP' };
      entryRequirements: string[];
      url: string;
      verified: boolean;
    }>;
    professionalBodies: Array<{
      name: string;
      certification: string;
      cost: number;
      renewalPeriod: string;
      url: string;
    }>;
  };
  industryIntelligence: {
    growthProjection: {
      nextYear: number; // % change
      fiveYear: number; // % change
      outlook: 'Excellent' | 'Good' | 'Stable' | 'Declining';
      factors: string[]; // Key growth drivers
      sources: string[];
    };
    emergingTrends: Array<{
      trend: string;
      impact: 'High' | 'Medium' | 'Low';
      timeframe: string;
      source: string;
    }>;
    automationRisk: {
      level: 'Low' | 'Medium' | 'High';
      timeline: string;
      mitigation: string[];
      source: string;
    };
  };
  currentOpportunities: {
    activeJobCount: number;
    topEmployers: Array<{
      name: string;
      openings: number;
      salaryRange: { min: number; max: number };
      benefits: string[];
    }>;
    skillsInDemand: Array<{
      skill: string;
      frequency: number; // % of job postings mentioning
      salaryPremium: number; // % increase over base
    }>;
  };
}

export interface CareerCardEnhancementStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: { completed: number; total: number };
  currentCard: string;
  estimatedCompletion: string;
  errors: string[];
}

export interface PerplexityEnhancedCareerCard {
  id: string;
  title: string;
  description: string;
  enhancement: {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    lastUpdated: string;
    sources: Array<{ title: string; url: string; date?: string }>;
    confidence: number;
  };
  enhancedData?: EnhancedCareerData;
  originalData: any; // Original career card data
}

class PerplexityCareerEnhancementService {
  private cache = new Map<string, { result: any; timestamp: number }>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Check if Perplexity enhancement is available
   */
  isEnhancementAvailable(): boolean {
    return environmentConfig.features.careerGuidance;
  }

  /**
   * Batch enhance multiple career cards for a user (premium feature)
   */
  async batchEnhanceUserCareerCards(
    userId: string, 
    careerCards: any[],
    onProgress?: (status: CareerCardEnhancementStatus) => void
  ): Promise<PerplexityEnhancedCareerCard[]> {
    
    if (!this.isEnhancementAvailable()) {
      throw new Error('Perplexity enhancement not available - check API key configuration');
    }

    console.log(`🚀 Starting premium Perplexity enhancement for ${careerCards.length} career cards (User: ${userId})`);
    
    const enhancedCards: PerplexityEnhancedCareerCard[] = [];
    let errors: string[] = [];

    // Update initial status
    onProgress?.({
      status: 'processing',
      progress: { completed: 0, total: careerCards.length },
      currentCard: careerCards[0]?.title || 'Starting...',
      estimatedCompletion: this.estimateCompletion(careerCards.length),
      errors
    });

    for (let i = 0; i < careerCards.length; i++) {
      const card = careerCards[i];
      
      try {
        console.log(`🔍 Enhancing card ${i + 1}/${careerCards.length}: ${card.title}`);
        
        // Update progress
        onProgress?.({
          status: 'processing',
          progress: { completed: i, total: careerCards.length },
          currentCard: card.title,
          estimatedCompletion: this.estimateCompletion(careerCards.length - i),
          errors
        });

        // Comprehensive enhancement for this card
        const enhancedData = await this.enhanceCareerCardComprehensively(card.title);
        
        const enhancedCard: PerplexityEnhancedCareerCard = {
          id: card.id,
          title: card.title,
          description: card.description,
          enhancement: {
            status: 'completed',
            lastUpdated: new Date().toISOString(),
            sources: enhancedData.sources || [],
            confidence: enhancedData.confidence || 0.9
          },
          enhancedData: enhancedData.data,
          originalData: card
        };
        
        enhancedCards.push(enhancedCard);
        
        // Rate limiting between comprehensive searches (Perplexity has rate limits)
        if (i < careerCards.length - 1) {
          await this.delay(3000); // 3 second delay between comprehensive searches
        }
        
      } catch (error) {
        console.error(`❌ Failed to enhance ${card.title}:`, error);
        errors.push(`${card.title}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // Keep original card if enhancement fails
        enhancedCards.push({
          id: card.id,
          title: card.title,
          description: card.description,
          enhancement: {
            status: 'failed',
            lastUpdated: new Date().toISOString(),
            sources: [],
            confidence: 0
          },
          originalData: card
        });
      }
    }

    // Final status update
    onProgress?.({
      status: 'completed',
      progress: { completed: careerCards.length, total: careerCards.length },
      currentCard: 'Enhancement completed',
      estimatedCompletion: '0 minutes',
      errors
    });

    console.log(`✅ Premium enhancement completed: ${enhancedCards.length} cards processed, ${errors.length} errors`);
    
    // Trigger ElevenLabs context update for enhanced cards
    await this.triggerEnhancementContextUpdate(userId, enhancedCards);
    
    return enhancedCards;
  }

  /**
   * Comprehensive enhancement for a single career card
   */
  private async enhanceCareerCardComprehensively(careerTitle: string): Promise<{
    data?: EnhancedCareerData;
    sources: Array<{ title: string; url: string; date?: string }>;
    confidence: number;
  }> {
    
    console.log(`🔍 Starting comprehensive enhancement for: ${careerTitle}`);

    // Execute multiple targeted searches in parallel for efficiency
    const searchPromises = [
      this.searchCareerMarketData(careerTitle),
      this.searchEducationPathways(careerTitle),
      this.searchIndustryGrowth(careerTitle),
      this.searchCurrentOpportunities(careerTitle)
    ];

    try {
      const [marketData, educationData, growthData, opportunitiesData] = await Promise.all(searchPromises);
      
      // Combine all sources
      const allSources = [
        ...(marketData.sources || []),
        ...(educationData.sources || []),
        ...(growthData.sources || []),
        ...(opportunitiesData.sources || [])
      ];

      // Calculate overall confidence based on successful searches
      const successfulSearches = [marketData, educationData, growthData, opportunitiesData]
        .filter(result => result.success).length;
      const confidence = successfulSearches / 4; // 0.0 to 1.0

      // Synthesize enhanced data from all search results
      const enhancedData = await this.synthesizeEnhancedData(
        careerTitle,
        { marketData, educationData, growthData, opportunitiesData }
      );

      console.log(`✅ Comprehensive enhancement completed for ${careerTitle}:`, {
        sourcesFound: allSources.length,
        confidence,
        successfulSearches
      });

      return {
        data: enhancedData,
        sources: allSources,
        confidence
      };

    } catch (error) {
      console.error(`❌ Comprehensive enhancement failed for ${careerTitle}:`, error);
      throw error;
    }
  }

  /**
   * Search for career market data (salary, demand, trends)
   */
  private async searchCareerMarketData(careerTitle: string): Promise<PerplexitySearchResult> {
    const cacheKey = `market-${careerTitle}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const params: PerplexitySearchParams = {
      query: `${careerTitle} UK salary 2024 entry level experienced senior job market trends demand growth rate job postings`,
      search_domain_filter: [
        'indeed.co.uk', 'reed.co.uk', 'glassdoor.co.uk', 
        'totaljobs.com', 'ons.gov.uk', 'prospects.ac.uk',
        'payscale.com', 'salaryexpert.com'
      ],
      search_recency_filter: 'month', // Recent data for accuracy
      return_related_questions: true,
      showThinking: false
    };

    const result = await mcpBridgeService.searchWithPerplexity(params);
    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Search for education and training pathways
   */
  private async searchEducationPathways(careerTitle: string): Promise<PerplexitySearchResult> {
    const cacheKey = `education-${careerTitle}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const params: PerplexitySearchParams = {
      query: `${careerTitle} UK training courses qualifications apprenticeships university degrees professional certifications 2024 costs duration entry requirements providers`,
      search_domain_filter: [
        'ucas.com', 'gov.uk', 'apprenticeships.gov.uk',
        'findamasters.com', 'hotcourses.com', 'prospects.ac.uk',
        'coursera.org', 'futurelearn.com'
      ],
      search_recency_filter: 'month',
      return_related_questions: true
    };

    const result = await mcpBridgeService.searchWithPerplexity(params);
    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Search for industry growth and future outlook
   */
  private async searchIndustryGrowth(careerTitle: string): Promise<PerplexitySearchResult> {
    const cacheKey = `growth-${careerTitle}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const params: PerplexitySearchParams = {
      query: `${careerTitle} industry growth outlook UK employment projections job market forecast automation impact future trends 2024 2025`,
      search_domain_filter: [
        'ons.gov.uk', 'gov.uk', 'prospects.ac.uk',
        'ft.com', 'bbc.co.uk', 'theguardian.com',
        'economist.com', 'mckinsey.com'
      ],
      search_recency_filter: 'year', // Broader timeframe for trends
      return_related_questions: true
    };

    const result = await mcpBridgeService.searchWithPerplexity(params);
    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Search for current job opportunities and employers
   */
  private async searchCurrentOpportunities(careerTitle: string): Promise<PerplexitySearchResult> {
    const cacheKey = `opportunities-${careerTitle}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const params: PerplexitySearchParams = {
      query: `${careerTitle} UK jobs 2024 current openings top employers hiring skills in demand salary ranges benefits active recruitment`,
      search_domain_filter: [
        'indeed.co.uk', 'reed.co.uk', 'glassdoor.co.uk',
        'totaljobs.com', 'cv-library.co.uk', 'monster.co.uk',
        'linkedin.com'
      ],
      search_recency_filter: 'week', // Very recent for current opportunities
      return_related_questions: true
    };

    const result = await mcpBridgeService.searchWithPerplexity(params);
    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Synthesize enhanced data from all search results
   */
  private async synthesizeEnhancedData(
    careerTitle: string,
    searchResults: {
      marketData: PerplexitySearchResult;
      educationData: PerplexitySearchResult;
      growthData: PerplexitySearchResult;
      opportunitiesData: PerplexitySearchResult;
    }
  ): Promise<EnhancedCareerData> {
    
    // This service is deprecated in favor of the new structured JSON approach
    // Refusing to return misleading placeholder data
    console.error('❌ DEPRECATED: perplexityCareerEnhancementService should not be used - use structured JSON API instead');
    throw new Error('This service returns misleading placeholder data and has been deprecated. Use the new structured JSON API approach in dashboardCareerEnhancer.ts instead.');
    
    /* REMOVED MISLEADING PLACEHOLDER DATA - this was attaching real source URLs to completely fabricated salary figures
     * The following commented code shows what was removed:
     * - Fake salary ranges (£18k-£60k) attached to real source URLs
     * - Fake job posting volumes (0) with real sources
     * - Fake market outlooks ('Medium', 'Stable') presented as verified data
     * - Generic automation risk assessments with no real analysis
     * 
     * This violated user trust and could have seriously misled career decisions.
     * The new structured JSON API approach provides real, verified data instead.
     */
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`📦 Using cached result for: ${key}`);
      return cached.result;
    }
    return null;
  }

  private setCache(key: string, result: any): void {
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Utility methods
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private estimateCompletion(remainingCards: number): string {
    const estimatedMinutes = Math.ceil((remainingCards * 3) / 60); // 3 seconds per card
    return estimatedMinutes <= 1 ? '< 1 minute' : `${estimatedMinutes} minutes`;
  }

  /**
   * Trigger ElevenLabs context update for enhanced career cards
   */
  private async triggerEnhancementContextUpdate(
    userId: string, 
    enhancedCards: PerplexityEnhancedCareerCard[]
  ): Promise<void> {
    try {
      console.log(`🎯 Triggering ElevenLabs context update for ${enhancedCards.length} enhanced career cards`);
      
      // Create UnifiedVoiceContextService instance
      const voiceContextService = new UnifiedVoiceContextService();
      
      // Get user data for context personalization
      const { getUserById } = await import('./userService');
      const userData = await getUserById(userId);
      const userName = userData?.careerProfile?.name || userData?.displayName;
      
      // Convert enhanced cards to CareerCard format for context update
      const careerCards = enhancedCards.map(enhancedCard => ({
        id: enhancedCard.id,
        title: enhancedCard.title,
        description: enhancedCard.description,
        confidence: enhancedCard.enhancement?.confidence || 0.8,
        enhancement: enhancedCard.enhancement,
        perplexityData: enhancedCard.enhancedData,
        // Add enhanced data fields for context formatting
        compensationRewards: enhancedCard.enhancedData?.verifiedSalary,
        competencyRequirements: enhancedCard.enhancedData?.verifiedEducation,
        labourMarketDynamics: enhancedCard.enhancedData?.industryIntelligence
      }));
      
      // Trigger context update with enhanced career data
      // Note: Since we don't have active agent IDs in background processing,
      // this prepares the context for future conversations
      // In a production environment, you might maintain a registry of active agents
      
      // Clear caches to ensure fresh data for next context retrieval
      voiceContextService.clearCareerCardCache(userId);
      
      // Also clear the structured career guidance cache used by Dashboard
      const { careerPathwayService } = await import('./careerPathwayService');
      careerPathwayService.clearStructuredGuidanceCache(userId);
      
      console.log(`✅ ElevenLabs context update triggered for user ${userId} with ${careerCards.length} enhanced cards`);
      console.log('📝 Enhanced context will be available for next voice conversation');
      
    } catch (error) {
      console.error('❌ Error triggering ElevenLabs context update:', error);
      // Don't throw - this shouldn't break the enhancement process
    }
  }
}

// DEPRECATED SERVICE - DO NOT USE
// This service has been replaced by dashboardCareerEnhancer.ts with structured JSON API
// export const perplexityCareerEnhancementService = new PerplexityCareerEnhancementService();