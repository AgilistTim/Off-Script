// Dashboard Career Card Enhancement Service
// Enhances basic career cards from ElevenLabs/MCP with rich OpenAI web search data
// This service only operates on the dashboard - it doesn't interfere with chat card creation

import { conversationAnalyzer } from './conversationAnalyzer';
import { db } from './firebase';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { environmentConfig } from '../config/environment';
import { serializeForFirebase, validateFirebaseData, flattenNestedArraysForFirebase } from '../lib/utils';

export interface CareerCardEnhancementStatus {
  id: string;
  originalCard: any;
  enhancedCard: any | null;
  enhancementStatus: 'pending' | 'enhanced' | 'failed' | 'skipped';
  enhancedAt?: Date;
  enhancementSource: 'openai_web_search' | 'basic' | 'already_enhanced';
  errorMessage?: string;
}

export interface DashboardCareerCard {
  // Original card fields
  id: string;
  title: string;
  description: string;
  industry: string;
  confidence: number;
  
  // Firebase metadata for deletion/updates
  firebaseDocId?: string;
  pathwayType?: string;
  pathwayIndex?: number;
  threadId?: string;
  
  // Web search verification
  webSearchVerified?: boolean;
  
  // Enhancement metadata
  isEnhanced?: boolean;
  enhancementStatus?: 'pending' | 'enhanced' | 'failed' | 'skipped';
  enhancedAt?: string;
  enhancementSource?: string;
  lastEnhancementAttempt?: string;
  
  // Original basic data (preserved)
  originalData?: any;
  
  // Enhanced data (added by web search)
  enhancedSalary?: any;
  careerProgression?: string[];
  dayInTheLife?: string;
  industryTrends?: string[];
  topUKEmployers?: any[];
  professionalTestimonials?: any[];
  additionalQualifications?: any[];
  workLifeBalance?: any;
  inDemandSkills?: string[];
  professionalAssociations?: any[];
  enhancedSources?: string[];
}

class DashboardCareerEnhancementService {
  private enhancementQueue: Map<string, Promise<any>> = new Map();
  
  /**
   * Check if a career card needs enhancement
   */
  private needsEnhancement(card: any): boolean {
    // Skip if already enhanced
    if (card.isEnhanced || card.enhancedAt || card.webSearchVerified) {
      console.log(`🔍 Card "${card.title}" already enhanced, skipping`);
      return false;
    }
    
    // Skip if enhancement failed recently (within 24 hours)
    if (card.enhancementStatus === 'failed' && card.lastEnhancementAttempt) {
      const lastAttempt = new Date(card.lastEnhancementAttempt);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (lastAttempt > dayAgo) {
        console.log(`🔍 Card "${card.title}" failed enhancement recently, skipping`);
        return false;
      }
    }
    
    // Check if it's a basic card (likely from ElevenLabs/MCP)
    const hasWebSearchVerified = !!card.webSearchVerified;
    const hasEnhancedSources = !!card.enhancedSources;
    const isAlreadyEnhanced = !!card.isEnhanced;
    const hasTitle = !!card.title;
    const hasDescription = !!card.description;
    
    const isBasicCard = !hasWebSearchVerified && 
                       !hasEnhancedSources && 
                       !isAlreadyEnhanced &&
                       hasTitle && 
                       hasDescription;
    
    console.log(`🔍 Card "${card.title}" enhancement eligibility:`, {
      hasWebSearchVerified,
      hasEnhancedSources,
      isAlreadyEnhanced,
      hasTitle,
      hasDescription,
      needsEnhancement: isBasicCard
    });
    
    return isBasicCard;
  }
  
  /**
   * Enhance a single career card with OpenAI web search data
   */
  async enhanceCareerCard(originalCard: any): Promise<DashboardCareerCard> {
    try {
      console.log(`🚀 Starting enhancement for card: ${originalCard.title}`);
      
      // Prevent duplicate enhancement requests
      if (this.enhancementQueue.has(originalCard.id)) {
        console.log(`⏳ Enhancement already in progress for: ${originalCard.title}`);
        return await this.enhancementQueue.get(originalCard.id)!;
      }
      
      // Create enhancement promise
      const enhancementPromise = this.performEnhancement(originalCard);
      this.enhancementQueue.set(originalCard.id, enhancementPromise);
      
      try {
        const result = await enhancementPromise;
        return result;
      } finally {
        // Clean up queue
        this.enhancementQueue.delete(originalCard.id);
      }
      
    } catch (error) {
      console.error(`❌ Enhancement failed for card: ${originalCard.title}`, error);
      this.enhancementQueue.delete(originalCard.id);
      
      // Return original card with failure metadata
      return {
        ...originalCard,
        enhancementStatus: 'failed',
        enhancementSource: 'basic',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        lastEnhancementAttempt: new Date().toISOString()
      };
    }
  }
  
  /**
   * Perform the actual enhancement using ConversationAnalyzer
   */
  private async performEnhancement(originalCard: any): Promise<DashboardCareerCard> {
    try {
      console.log(`🔍 Enhancing career card with web search: ${originalCard.title}`);
      
      // Use the existing ConversationAnalyzer enhancement method
      const enhancedCard = await conversationAnalyzer.enhanceCareerCardWithWebSearch(originalCard);
      
      if (enhancedCard && enhancedCard.isEnhanced) {
        console.log(`✅ Successfully enhanced card: ${originalCard.title}`);
        
        const result: DashboardCareerCard = {
          ...enhancedCard,
          originalData: originalCard, // Preserve original
          enhancementStatus: 'enhanced',
          enhancementSource: 'openai_web_search',
          isEnhanced: true,
          enhancedAt: new Date().toISOString()
        };
        
        // Save enhancement to Firebase if we have the necessary metadata
        await this.saveEnhancementToFirebase(originalCard, result);
        
        return result;
      } else {
        console.warn(`⚠️ Enhancement returned no data for: ${originalCard.title}`);
        return {
          ...originalCard,
          enhancementStatus: 'skipped',
          enhancementSource: 'basic',
          lastEnhancementAttempt: new Date().toISOString()
        };
      }
      
    } catch (error) {
      console.error(`❌ Enhancement error for ${originalCard.title}:`, error);
      throw error;
    }
  }
  
  /**
   * Save enhancement data back to Firebase
   */
  private async saveEnhancementToFirebase(originalCard: any, enhancedCard: DashboardCareerCard): Promise<void> {
    try {
      console.log('🔍 ENHANCEMENT DEBUG - Starting saveEnhancementToFirebase');
      console.log('🔍 ENHANCEMENT DEBUG - Original card:', {
        title: originalCard.title,
        firebaseDocId: originalCard.firebaseDocId,
        pathwayType: originalCard.pathwayType,
        pathwayIndex: originalCard.pathwayIndex
      });
      console.log('🔍 ENHANCEMENT DEBUG - Enhanced card data:', {
        title: enhancedCard.title,
        isEnhanced: enhancedCard.isEnhanced,
        enhancementStatus: enhancedCard.enhancementStatus,
        hasEnhancedSalary: !!enhancedCard.enhancedSalary,
        hasCareerProgression: !!enhancedCard.careerProgression,
        hasDayInTheLife: !!enhancedCard.dayInTheLife,
        hasIndustryTrends: !!enhancedCard.industryTrends
      });

      // Only save if we have Firebase metadata (firebaseDocId)
      if (!originalCard.firebaseDocId) {
        console.log(`⚠️ No Firebase metadata for card ${originalCard.title}, skipping save`);
        return;
      }
      
      console.log(`💾 ENHANCEMENT DEBUG - Saving enhancement to Firebase for: ${originalCard.title}`);
      console.log(`🔍 ENHANCEMENT DEBUG - Firebase document ID: ${originalCard.firebaseDocId}`);
      
      const docRef = doc(db, 'threadCareerGuidance', originalCard.firebaseDocId);
      
      // Check if document exists first
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.warn(`⚠️ ENHANCEMENT DEBUG - Firebase document not found: ${originalCard.firebaseDocId}`);
        return;
      }
      
      const currentData = docSnapshot.data();
      console.log('🔍 ENHANCEMENT DEBUG - Current Firebase data structure:', {
        hasGuidance: !!currentData.guidance,
        hasPrimaryPathway: !!currentData.guidance?.primaryPathway,
        hasAlternativePathways: !!currentData.guidance?.alternativePathways,
        alternativePathwaysCount: currentData.guidance?.alternativePathways?.length || 0,
        lastEnhanced: currentData.lastEnhanced
      });
      
      // Update the specific pathway that was enhanced
      // Map pathwayType correctly: 'primary' -> 'primaryPathway', 'alternative' -> 'alternativePathways'
      const cardPathwayType = originalCard.pathwayType || 'primary';
      const pathwayIndex = originalCard.pathwayIndex;
      
      console.log(`🔍 ENHANCEMENT DEBUG - Saving enhancement for ${cardPathwayType} pathway`, {
        cardPathwayType,
        pathwayIndex,
        hasIndex: typeof pathwayIndex === 'number'
      });
      
      if (cardPathwayType === 'primary') {
        console.log('🔍 ENHANCEMENT DEBUG - Processing primary pathway enhancement');
        
        // Update primary pathway
        const enhancementData = {
          // Preserve all original data from primaryPathway
          ...currentData.guidance?.primaryPathway,
          
          // Add enhanced fields (for backward compatibility)
          enhancedSalary: enhancedCard.enhancedSalary,
          careerProgression: enhancedCard.careerProgression,
          dayInTheLife: enhancedCard.dayInTheLife,
          industryTrends: enhancedCard.industryTrends,
          topUKEmployers: enhancedCard.topUKEmployers,
          professionalTestimonials: enhancedCard.professionalTestimonials,
          additionalQualifications: enhancedCard.additionalQualifications,
          workLifeBalance: enhancedCard.workLifeBalance,
          inDemandSkills: enhancedCard.inDemandSkills,
          professionalAssociations: enhancedCard.professionalAssociations,
          enhancedSources: enhancedCard.enhancedSources,
          
          // Map to comprehensive schema for career modal compatibility
          ...this.transformEnhancedFieldsToComprehensiveSchema(enhancedCard),
          
          // Enhancement metadata (use Date.now() instead of serverTimestamp() for arrays)
          isEnhanced: true,
          enhancedAt: new Date(),
          enhancementSource: 'openai_web_search',
          enhancementStatus: 'enhanced'
        };
        
        console.log('🔍 ENHANCEMENT DEBUG - Primary pathway enhancement data prepared:', {
          title: enhancementData.title,
          isEnhanced: enhancementData.isEnhanced,
          hasEnhancedSalary: !!enhancementData.enhancedSalary,
          hasCompensationRewards: !!enhancementData.compensationRewards,
          hasLabourMarketDynamics: !!enhancementData.labourMarketDynamics
        });
        
        // Flatten nested arrays and serialize data for Firebase compatibility
        console.log('🔍 ENHANCEMENT DEBUG - Starting data preparation for Firebase');
        const flattenedData = flattenNestedArraysForFirebase(enhancementData);
        console.log('🔍 ENHANCEMENT DEBUG - Data after flattening:', {
          hasEnhancedSalary: !!flattenedData.enhancedSalary,
          hasCompensationRewards: !!flattenedData.compensationRewards,
          hasLabourMarketDynamics: !!flattenedData.labourMarketDynamics
        });
        
        const serializedData = serializeForFirebase(flattenedData);
        console.log('🔍 ENHANCEMENT DEBUG - Data after serialization:', {
          hasEnhancedSalary: !!serializedData.enhancedSalary,
          hasCompensationRewards: !!serializedData.compensationRewards,
          hasLabourMarketDynamics: !!serializedData.labourMarketDynamics,
          dataType: typeof serializedData,
          isObject: typeof serializedData === 'object'
        });
        
        // Validate data before saving
        const validation = validateFirebaseData(serializedData);
        if (!validation.isValid) {
          console.error('❌ ENHANCEMENT DEBUG - Primary pathway data validation failed:', validation.errors);
          throw new Error(`Invalid primary pathway data for Firebase: ${validation.errors.join(', ')}`);
        }
        
        console.log('✅ ENHANCEMENT DEBUG - Primary pathway data validation passed');

        console.log('🔍 ENHANCEMENT DEBUG - About to call updateDoc with data:', {
          'guidance.primaryPathway': typeof serializedData,
          lastEnhanced: 'serverTimestamp'
        });
        
        await updateDoc(docRef, {
          'guidance.primaryPathway': serializedData,
          lastEnhanced: serverTimestamp()
        });
        
        console.log('✅ ENHANCEMENT DEBUG - Primary pathway enhancement saved successfully to Firebase');
        
      } else if (cardPathwayType === 'alternative' && typeof pathwayIndex === 'number') {
        console.log('🔍 ENHANCEMENT DEBUG - Processing alternative pathway enhancement');
        
        // Update specific alternative pathway by index
        const alternativePathways = currentData.guidance?.alternativePathways || [];
        
        if (pathwayIndex >= 0 && pathwayIndex < alternativePathways.length) {
          const updatedAlternatives = [...alternativePathways];
          
          updatedAlternatives[pathwayIndex] = {
            // Preserve all original data from this alternative pathway
            ...alternativePathways[pathwayIndex],
            
            // Add enhanced fields (for backward compatibility)
            enhancedSalary: enhancedCard.enhancedSalary,
            careerProgression: enhancedCard.careerProgression,
            dayInTheLife: enhancedCard.dayInTheLife,
            industryTrends: enhancedCard.industryTrends,
            topUKEmployers: enhancedCard.topUKEmployers,
            professionalTestimonials: enhancedCard.professionalTestimonials,
            additionalQualifications: enhancedCard.additionalQualifications,
            workLifeBalance: enhancedCard.workLifeBalance,
            inDemandSkills: enhancedCard.inDemandSkills,
            professionalAssociations: enhancedCard.professionalAssociations,
            enhancedSources: enhancedCard.enhancedSources,
            
            // Map to comprehensive schema for career modal compatibility
            ...this.transformEnhancedFieldsToComprehensiveSchema(enhancedCard),
            
            // Enhancement metadata (use Date.now() instead of serverTimestamp() for arrays)
            isEnhanced: true,
            enhancedAt: new Date(),
            enhancementSource: 'openai_web_search',
            enhancementStatus: 'enhanced'
          };
          
          console.log('🔍 ENHANCEMENT DEBUG - Alternative pathway enhancement data prepared:', {
            pathwayIndex,
            title: updatedAlternatives[pathwayIndex].title,
            isEnhanced: updatedAlternatives[pathwayIndex].isEnhanced,
            hasEnhancedSalary: !!updatedAlternatives[pathwayIndex].enhancedSalary
          });
          
          // Flatten nested arrays and serialize data for Firebase compatibility
          const flattenedAlternatives = flattenNestedArraysForFirebase(updatedAlternatives);
          const serializedAlternatives = serializeForFirebase(flattenedAlternatives);
          
          // Validate data before saving
          const validation = validateFirebaseData(serializedAlternatives);
          if (!validation.isValid) {
            console.error('❌ ENHANCEMENT DEBUG - Alternative pathway data validation failed:', validation.errors);
            throw new Error(`Invalid alternative pathway data for Firebase: ${validation.errors.join(', ')}`);
          }
          
          console.log('✅ ENHANCEMENT DEBUG - Alternative pathway data validation passed');

          await updateDoc(docRef, {
            'guidance.alternativePathways': serializedAlternatives,
            lastEnhanced: serverTimestamp()
          });
          
          console.log('✅ ENHANCEMENT DEBUG - Alternative pathway enhancement saved successfully to Firebase');
          
        } else {
          console.warn(`⚠️ ENHANCEMENT DEBUG - Invalid pathway index: ${pathwayIndex} for ${alternativePathways.length} alternatives`);
        }
      } else {
        console.warn(`⚠️ ENHANCEMENT DEBUG - Invalid pathway type or index: ${cardPathwayType}, ${pathwayIndex}`);
      }
      
      console.log('✅ ENHANCEMENT DEBUG - saveEnhancementToFirebase completed successfully');
      
    } catch (error) {
      console.error('❌ ENHANCEMENT DEBUG - Error in saveEnhancementToFirebase:', error);
      console.error('❌ ENHANCEMENT DEBUG - Error details:', {
        message: error.message,
        stack: error.stack,
        originalCard: originalCard.title,
        enhancedCard: enhancedCard.title
      });
      throw error;
    }
  }
  
  /**
   * Enhance multiple career cards (batch processing)
   */
  async enhanceCareerCards(cards: any[]): Promise<DashboardCareerCard[]> {
    console.log(`🚀 Starting batch enhancement for ${cards.length} cards`);
    
    // Check environment configuration first
    try {
    
      const hasOpenAI = !!environmentConfig.apiKeys?.openai;
      console.log(`🔍 Environment check - OpenAI API available: ${hasOpenAI}`);
      
      if (!hasOpenAI) {
        console.warn('⚠️ OpenAI API key not available - enhancement will be skipped');
        return cards.map(card => ({
          ...card,
          enhancementStatus: 'skipped' as const,
          enhancementSource: 'no_api_key' as any,
          errorMessage: 'OpenAI API key not configured'
        }));
      }
    } catch (envError) {
      console.error('❌ Environment configuration error:', envError);
      return cards.map(card => ({
        ...card,
        enhancementStatus: 'failed' as const,
        enhancementSource: 'basic' as any,
        errorMessage: 'Environment configuration error'
      }));
    }
    
    const results: DashboardCareerCard[] = [];
    
    for (const card of cards) {
      try {
        if (this.needsEnhancement(card)) {
          console.log(`🔍 Enhancing card: ${card.title}`);
          const enhancedCard = await this.enhanceCareerCard(card);
          results.push(enhancedCard);
          
          // Rate limiting to avoid API throttling
          await new Promise(resolve => setTimeout(resolve, 200));
        } else {
          console.log(`⏭️ Skipping enhancement for: ${card.title} (already enhanced or not eligible)`);
          // Card doesn't need enhancement, return as-is
          results.push({
            ...card,
            enhancementStatus: card.enhancementStatus || 'skipped',
            enhancementSource: card.enhancementSource || 'already_enhanced'
          });
        }
      } catch (error) {
        console.error(`❌ Failed to enhance card ${card.title}:`, error);
        
        // Add failed card with error status
        results.push({
          ...card,
          enhancementStatus: 'failed',
          enhancementSource: 'basic',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          lastEnhancementAttempt: new Date().toISOString()
        });
      }
    }
    
    console.log(`✅ Batch enhancement completed. Enhanced: ${results.filter(c => c.enhancementStatus === 'enhanced').length}/${cards.length}`);
    
    return results;
  }
  
  /**
   * Get enhancement statistics for debugging
   */
  getEnhancementStats(cards: DashboardCareerCard[]): {
    total: number;
    enhanced: number;
    pending: number;
    failed: number;
    skipped: number;
    alreadyEnhanced: number;
  } {
    const stats = {
      total: cards.length,
      enhanced: 0,
      pending: 0,
      failed: 0,
      skipped: 0,
      alreadyEnhanced: 0
    };
    
    cards.forEach(card => {
      switch (card.enhancementStatus) {
        case 'enhanced':
          stats.enhanced++;
          break;
        case 'pending':
          stats.pending++;
          break;
        case 'failed':
          stats.failed++;
          break;
        case 'skipped':
          stats.skipped++;
          break;
        default:
          if (card.isEnhanced || card.webSearchVerified) {
            stats.alreadyEnhanced++;
          } else {
            stats.skipped++;
          }
      }
    });
    
    return stats;
  }

  /**
   * Transform enhanced fields from OpenAI web search to comprehensive 10-section schema
   * Maps fields like enhancedSalary, industryTrends to compensationRewards, labourMarketDynamics etc.
   */
  private transformEnhancedFieldsToComprehensiveSchema(enhancedCard: DashboardCareerCard): any {
    const comprehensiveFields: any = {};

    // Map enhancedSalary to compensationRewards schema
    if (enhancedCard.enhancedSalary) {
      const salary = enhancedCard.enhancedSalary;
      if (salary.entry || salary.experienced || salary.senior) {
        // Extract numeric values from strings like "£35,000 - £45,000"
        const extractSalaryNumber = (salaryStr: string): number => {
          if (!salaryStr) return 0;
          const match = salaryStr.replace(/[,£]/g, '').match(/\d+/);
          return match ? parseInt(match[0]) : 0;
        };

        comprehensiveFields.compensationRewards = {
          salaryRange: {
            entry: extractSalaryNumber(salary.entry),
            mid: extractSalaryNumber(salary.experienced),
            senior: extractSalaryNumber(salary.senior),
            exceptional: Math.round(extractSalaryNumber(salary.senior) * 1.3), // Estimate exceptional as 30% higher than senior
            currency: 'GBP'
          },
          variablePay: {
            bonuses: "Performance-based (market data)",
            commissions: "None",
            equity: "Possible in startups",
            profitShare: "Varies by company"
          },
          nonFinancialBenefits: {
            pension: "Standard employer contribution",
            healthcare: "Private healthcare options",
            leavePolicy: "25+ days annual leave",
            professionalDevelopment: "Training budgets",
            perks: ["Remote work", "Flexible hours", "Professional development"]
          }
        };
      }
    }

    // Map industryTrends to labourMarketDynamics schema
    if (enhancedCard.industryTrends && enhancedCard.industryTrends.length > 0) {
      comprehensiveFields.labourMarketDynamics = {
        demandOutlook: {
          growthForecast: enhancedCard.industryTrends[0] || "Growing demand",
          timeHorizon: "5-10 years",
          regionalHotspots: ["London", "Manchester", "Edinburgh", "Bristol"]
        },
        supplyProfile: {
          talentScarcity: "Moderate",
          competitionLevel: "High",
          barriers: ["Technical skills", "Experience requirements"]
        },
        economicSensitivity: {
          recessionImpact: "Moderate",
          techDisruption: "Low",
          cyclicalPatterns: "Stable growth"
        }
      };
    }

    // Map inDemandSkills to competencyRequirements schema
    if (enhancedCard.inDemandSkills && enhancedCard.inDemandSkills.length > 0) {
      const skills = Array.isArray(enhancedCard.inDemandSkills) 
        ? enhancedCard.inDemandSkills 
        : [enhancedCard.inDemandSkills];

      comprehensiveFields.competencyRequirements = {
        technicalSkills: skills.slice(0, 5),
        softSkills: ["Problem-solving", "Communication", "Analytical thinking", "Leadership"],
        tools: skills.filter(skill => 
          typeof skill === 'string' && (
            skill.toLowerCase().includes('python') || 
            skill.toLowerCase().includes('sql') ||
            skill.toLowerCase().includes('tableau') ||
            skill.toLowerCase().includes('excel')
          )
        ),
        certifications: enhancedCard.professionalAssociations?.map(assoc => 
          typeof assoc === 'object' ? assoc.certification : assoc
        ) || [],
        qualificationPathway: {
          degrees: ["Bachelor's degree in relevant field", "Master's degree (preferred)"],
          licenses: [],
          alternativeRoutes: ["Online courses", "Professional certifications"],
          apprenticeships: ["Digital apprenticeships", "Technology apprenticeships"],
          bootcamps: ["Industry-specific bootcamps"]
        },
        learningCurve: {
          timeToCompetent: "1-3 years",
          difficultyLevel: "Medium to High",
          prerequisites: ["Basic technical knowledge", "Problem-solving skills"]
        }
      };
    }

    // Map topUKEmployers to workEnvironmentCulture schema
    if (enhancedCard.topUKEmployers && enhancedCard.topUKEmployers.length > 0) {
      comprehensiveFields.workEnvironmentCulture = {
        typicalEmployers: enhancedCard.topUKEmployers.slice(0, 3).map(emp => 
          typeof emp === 'object' ? emp.name : emp
        ),
        teamStructures: ["Cross-functional teams", "Agile teams", "Project-based teams"],
        culturalNorms: {
          pace: "Fast-paced",
          formality: "Informal to business casual",
          decisionMaking: "Data-driven and collaborative",
          diversityInclusion: "High emphasis"
        },
        physicalContext: ["Office", "Remote", "Hybrid"]
      };
    }

    // Map workLifeBalance to lifestyleFit schema
    if (enhancedCard.workLifeBalance) {
      const wlb = enhancedCard.workLifeBalance;
      comprehensiveFields.lifestyleFit = {
        workingHours: {
          typical: typeof wlb === 'object' ? (wlb.typical_hours || "40 hours/week") : "40 hours/week",
          flexibility: "High",
          shiftWork: false,
          onCall: false
        },
        remoteOptions: {
          remoteWork: true,
          hybridOptions: true,
          travelRequirements: {
            frequency: "Rare",
            duration: "Short",
            international: false
          }
        },
        stressProfile: {
          intensity: typeof wlb === 'object' ? (wlb.stress_level || "Moderate") : "Moderate",
          volatility: "Low",
          emotionalLabour: "Low"
        },
        workLifeBoundaries: {
          flexibility: typeof wlb === 'object' ? (wlb.flexibility || "High") : "High",
          autonomy: "High",
          predictability: "Moderate"
        }
      };
    }

    return comprehensiveFields;
  }
}

// Export singleton instance
export const dashboardCareerEnhancementService = new DashboardCareerEnhancementService();

export default DashboardCareerEnhancementService;