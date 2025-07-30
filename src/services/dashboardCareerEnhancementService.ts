// Dashboard Career Card Enhancement Service
// Enhances basic career cards from ElevenLabs/MCP with rich OpenAI web search data
// This service only operates on the dashboard - it doesn't interfere with chat card creation

import { conversationAnalyzer } from './conversationAnalyzer';
import { db } from './firebase';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getEnvironmentConfig } from '../config/environment';

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
      // Only save if we have Firebase metadata (firebaseDocId)
      if (!originalCard.firebaseDocId) {
        console.log(`⚠️ No Firebase metadata for card ${originalCard.title}, skipping save`);
        return;
      }
      
      console.log(`💾 Saving enhancement to Firebase for: ${originalCard.title}`);
      
      const docRef = doc(db, 'threadCareerGuidance', originalCard.firebaseDocId);
      
      // Check if document exists first
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.warn(`⚠️ Firebase document not found: ${originalCard.firebaseDocId}`);
        return;
      }
      
      const currentData = docSnapshot.data();
      
      // Update the specific pathway that was enhanced
      const pathwayType = originalCard.pathwayType || 'primaryPathway';
      const updatePath = `guidance.${pathwayType}`;
      
      const enhancementData = {
        // Preserve all original data
        ...currentData.guidance?.[pathwayType],
        
        // Add enhanced fields
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
        
        // Enhancement metadata
        isEnhanced: true,
        enhancedAt: serverTimestamp(),
        enhancementSource: 'openai_web_search',
        enhancementStatus: 'enhanced'
      };
      
      await updateDoc(docRef, {
        [`guidance.${pathwayType}`]: enhancementData,
        lastEnhanced: serverTimestamp()
      });
      
      console.log(`✅ Saved enhancement for: ${originalCard.title}`);
      
    } catch (error) {
      console.error(`❌ Failed to save enhancement to Firebase:`, error);
      // Don't throw - enhancement was successful, saving is just a bonus
    }
  }
  
  /**
   * Enhance multiple career cards (batch processing)
   */
  async enhanceCareerCards(cards: any[]): Promise<DashboardCareerCard[]> {
    console.log(`🚀 Starting batch enhancement for ${cards.length} cards`);
    
    // Check environment configuration first
    try {
      const env = getEnvironmentConfig();
      const hasOpenAI = !!env.apiKeys?.openai;
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
}

// Export singleton instance
export const dashboardCareerEnhancementService = new DashboardCareerEnhancementService();

export default DashboardCareerEnhancementService;