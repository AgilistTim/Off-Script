import { ChatSummary } from './chatService';
import { getEnvironmentConfig } from '../config/environment';

const env = getEnvironmentConfig();

// Types for comprehensive career pathway data
export interface TrainingOption {
  title: string;
  level: string;
  duration: string;
  cost: string;
  fundingAvailable?: string;
  provider: string;
  description: string;
  link?: string;
  qualificationBody?: string;
}

export interface VolunteeringOpportunity {
  organization: string;
  role: string;
  description: string;
  location: string;
  link?: string;
  timeCommitment: string;
  skillsGained: string[];
  careerPathConnection: string;
}

export interface FundingOption {
  name: string;
  amount: string;
  eligibility: string[];
  description: string;
  link?: string;
  applicationDeadline?: string;
}

export interface CareerPathway {
  id: string;
  title: string;
  description: string;
  match: number; // 0-100 relevance score
  trainingOptions: TrainingOption[];
  volunteeringOpportunities: VolunteeringOpportunity[];
  fundingOptions: FundingOption[];
  nextSteps: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  reflectiveQuestions: string[];
  keyResources: {
    title: string;
    description: string;
    link?: string;
  }[];
  progressionPath: {
    stage: string;
    description: string;
    timeframe: string;
    requirements: string[];
  }[];
}

export interface ComprehensiveCareerGuidance {
  userProfile: {
    goals: string[];
    interests: string[];
    skills: string[];
    careerStage: 'exploring' | 'transitioning' | 'advancing';
  };
  primaryPathway: CareerPathway;
  alternativePathways: CareerPathway[];
  crossCuttingResources: {
    generalFunding: FundingOption[];
    careerSupport: {
      title: string;
      description: string;
      link?: string;
    }[];
  };
  generatedAt: Date;
  actionPlan: {
    thisWeek: string[];
    thisMonth: string[];
    next3Months: string[];
  };
}

export interface CareerExplorationSummary {
  threadId: string;
  threadTitle: string;
  primaryCareerPath: string;
  lastUpdated: Date;
  match: number;
  description: string;
}

interface ThreadCareerGuidance {
  id: string;
  threadId: string;
  userId: string;
  guidance: ComprehensiveCareerGuidance;
  createdAt: Date;
  updatedAt: Date;
}

class CareerPathwayService {
  
  /**
   * Generate comprehensive UK-specific career guidance based on user profile
   */
  async generateCareerGuidance(chatSummary: ChatSummary): Promise<ComprehensiveCareerGuidance> {
    try {
      console.log('🎯 Generating comprehensive career guidance for user');
      console.log('🎯 Chat summary:', chatSummary);
      
      // Extract user profile from chat summary
      const userProfile = this.extractUserProfile(chatSummary);
      console.log('🎯 Extracted user profile:', userProfile);
      
      // Generate career pathways using AI analysis
      const pathways = await this.generateCareerPathways(userProfile);
      console.log('🎯 Generated pathways:', pathways);
      
      // Get cross-cutting UK resources
      const crossCuttingResources = this.getCrossCuttingResources();
      
      // Create action plan
      const actionPlan = this.generateActionPlan(pathways[0], userProfile);
      
      const guidance = {
        userProfile,
        primaryPathway: pathways[0],
        alternativePathways: pathways.slice(1, 3),
        crossCuttingResources,
        generatedAt: new Date(),
        actionPlan
      };
      
      console.log('🎯 Generated comprehensive career guidance:', guidance);
      return guidance;
      
    } catch (error) {
      console.error('❌ Error generating career guidance:', error);
      throw new Error('Failed to generate comprehensive career guidance');
    }
  }

  /**
   * Generate and store thread-specific career guidance (with upsert logic)
   */
  async generateThreadCareerGuidance(threadId: string, userId: string, chatSummary: ChatSummary): Promise<ComprehensiveCareerGuidance> {
    try {
      console.log('🎯 Generating thread-specific career guidance for:', threadId, 'user:', userId);
      
      // Check if guidance already exists
      const existingGuidance = await this.getThreadCareerGuidance(threadId, userId);
      
      if (existingGuidance) {
        console.log('🔍 Existing career guidance found for thread:', threadId);
        
        // Check if summary has changed significantly to warrant regeneration
        const shouldRegenerate = this.shouldRegenerateGuidance(existingGuidance, chatSummary);
        
        if (!shouldRegenerate) {
          console.log('🎯 Using existing career guidance (no significant changes detected)');
          return existingGuidance;
        }
        
        console.log('🎯 Regenerating career guidance due to significant changes in conversation');
      }
      
      // Generate new career guidance
      const guidance = await this.generateCareerGuidance(chatSummary);
      console.log('🎯 Generated career guidance:', guidance);
      
      // Store in Firestore with thread association
      await this.storeThreadCareerGuidance(threadId, userId, guidance);
      console.log('🎯 Successfully stored thread-specific career guidance');
      
      return guidance;
      
    } catch (error) {
      console.error('❌ Error generating thread-specific career guidance:', error);
      throw new Error('Failed to generate thread-specific career guidance');
    }
  }

  /**
   * Store career guidance for a specific thread
   */
  private async storeThreadCareerGuidance(threadId: string, userId: string, guidance: ComprehensiveCareerGuidance): Promise<void> {
    try {
      console.log('🔍 CareerPathwayService: Storing career guidance for thread:', threadId, 'user:', userId);
      
      const { db } = await import('./firebase');
      const { doc, setDoc } = await import('firebase/firestore');
      
      const guidanceData: ThreadCareerGuidance = {
        id: `${threadId}_guidance`,
        threadId,
        userId,
        guidance,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log('🔍 CareerPathwayService: Storing guidance data:', guidanceData);
      
      await setDoc(doc(db, 'threadCareerGuidance', guidanceData.id), guidanceData);
      console.log('✅ Stored thread-specific career guidance with ID:', guidanceData.id);
      
    } catch (error) {
      console.error('❌ Error storing thread career guidance:', error);
      throw error;
    }
  }

  /**
   * Retrieve career guidance for a specific thread
   */
  async getThreadCareerGuidance(threadId: string, userId: string): Promise<ComprehensiveCareerGuidance | null> {
    try {
      const { db } = await import('./firebase');
      const { doc, getDoc } = await import('firebase/firestore');
      
      const guidanceDoc = await getDoc(doc(db, 'threadCareerGuidance', `${threadId}_guidance`));
      
      if (!guidanceDoc.exists()) {
        return null;
      }
      
      const data = guidanceDoc.data() as ThreadCareerGuidance;
      
      // Verify this guidance belongs to the requesting user
      if (data.userId !== userId) {
        console.warn('Unauthorized access to thread career guidance');
        return null;
      }
      
      return data.guidance;
      
    } catch (error) {
      console.error('Error retrieving thread career guidance:', error);
      return null;
    }
  }

  /**
   * Get all career explorations for a user (for overview panel)
   */
  async getUserCareerExplorations(userId: string): Promise<CareerExplorationSummary[]> {
    try {
      console.log('🔍 CareerPathwayService: Getting career explorations for user:', userId);
      
      const { db } = await import('./firebase');
      const { collection, query, where, orderBy, getDocs } = await import('firebase/firestore');
      
      const explorations: CareerExplorationSummary[] = [];

      // 1. Get thread-based career guidance (existing logic)
      try {
        const guidanceQuery = query(
          collection(db, 'threadCareerGuidance'),
          where('userId', '==', userId),
          orderBy('updatedAt', 'desc')
        );
        
        const guidanceSnapshot = await getDocs(guidanceQuery);
        console.log('🔍 CareerPathwayService: Found', guidanceSnapshot.size, 'thread career guidance documents');
        
        // Process thread-based explorations
        for (const doc of guidanceSnapshot.docs) {
          const data = doc.data() as ThreadCareerGuidance;
          console.log('🔍 CareerPathwayService: Processing thread:', data.threadId);
          
          // Get thread title
          const threadTitle = await this.getThreadTitle(data.threadId);
          console.log('🔍 CareerPathwayService: Thread title:', threadTitle);
          
          explorations.push({
            threadId: data.threadId,
            threadTitle: threadTitle || 'Career Exploration',
            primaryCareerPath: data.guidance.primaryPathway.title,
            lastUpdated: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(data.updatedAt),
            match: data.guidance.primaryPathway.match,
            description: data.guidance.primaryPathway.description
          });
        }
      } catch (threadError) {
        console.warn('⚠️ Error fetching thread-based career guidance (non-critical):', threadError);
      }

      // 2. Get migrated career explorations (from guest migration)
      try {
        const migratedQuery = query(
          collection(db, 'careerExplorations'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );
        
        const migratedSnapshot = await getDocs(migratedQuery);
        console.log('🔍 CareerPathwayService: Found', migratedSnapshot.size, 'migrated career exploration documents');
        
        // Process migrated explorations
        for (const doc of migratedSnapshot.docs) {
          const data = doc.data();
          console.log('🔍 CareerPathwayService: Processing migrated exploration:', data.title);
          
          // Create exploration summaries from migrated career cards
          if (data.careerCards && Array.isArray(data.careerCards) && data.careerCards.length > 0) {
            // For each career card, create a separate exploration entry
            data.careerCards.forEach((card: any, index: number) => {
              explorations.push({
                threadId: `${doc.id}_card_${index}`, // Create unique ID for each career card
                threadTitle: card.title, // Use actual career title instead of generic label
                primaryCareerPath: card.title,
                lastUpdated: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                match: card.confidence || 85, // Use confidence as match score
                description: card.description || `${card.title} - Career path discovered during your exploration session`
              });
            });
          } else {
            // Fallback for explorations without career cards
            explorations.push({
              threadId: doc.id,
              threadTitle: data.title || 'Career Exploration',
              primaryCareerPath: 'Career Discovery',
              lastUpdated: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
              match: 75,
              description: data.description || 'Career insights from your exploration'
            });
          }
        }
      } catch (migratedError: any) {
        // Handle specific Firestore errors
        if (migratedError?.code === 'failed-precondition') {
          console.warn('⚠️ Firestore index still building for careerExplorations (this is normal for new deployments)');
          console.warn('⚠️ Migration data will appear once indexes are ready (usually within a few minutes)');
        } else if (migratedError?.code === 'permission-denied') {
          console.warn('⚠️ Permission denied accessing careerExplorations (check Firestore rules)');
        } else {
          console.warn('⚠️ Error fetching migrated career explorations (non-critical):', migratedError);
        }
      }

      // Sort all explorations by date (newest first)
      explorations.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
      
      console.log('🔍 CareerPathwayService: Returning', explorations.length, 'explorations:', explorations);
      return explorations;
      
    } catch (error) {
      console.error('Error getting user career explorations:', error);
      return [];
    }
  }

  /**
   * Get thread title from Firestore
   */
  private async getThreadTitle(threadId: string): Promise<string | null> {
    try {
      const { db } = await import('./firebase');
      const { doc, getDoc } = await import('firebase/firestore');
      
      const threadDoc = await getDoc(doc(db, 'chatThreads', threadId));
      
      if (!threadDoc.exists()) {
        return null;
      }
      
      return threadDoc.data().title || 'Career Exploration';
      
    } catch (error) {
      console.error('Error getting thread title:', error);
      return null;
    }
  }

  /**
   * Get full migrated career card details by compound thread ID
   */
  async getMigratedCareerCard(compoundThreadId: string): Promise<any | null> {
    try {
      console.log('🔍 CareerPathwayService: Getting migrated career card:', compoundThreadId);
      
      // Parse compound thread ID to get document ID and card index
      const [docId, cardType, cardIndex] = compoundThreadId.split('_');
      
      if (cardType !== 'card' || !cardIndex) {
        console.warn('Invalid compound thread ID format:', compoundThreadId);
        return null;
      }
      
      const { db } = await import('./firebase');
      const { doc, getDoc } = await import('firebase/firestore');
      
      const explorationDoc = await getDoc(doc(db, 'careerExplorations', docId));
      
      if (!explorationDoc.exists()) {
        console.warn('Migration document not found:', docId);
        return null;
      }
      
      const data = explorationDoc.data();
      const cardIndexNum = parseInt(cardIndex, 10);
      
      if (!data.careerCards || !Array.isArray(data.careerCards) || cardIndexNum >= data.careerCards.length) {
        console.warn('Career card not found at index:', cardIndexNum);
        return null;
      }
      
      const careerCard = data.careerCards[cardIndexNum];
      console.log('✅ Found migrated career card:', careerCard.title);
      
      return {
        ...careerCard,
        isMigrated: true,
        migrationSource: 'guest_session',
        originalSessionId: data.migrationSource || 'unknown'
      };
      
    } catch (error) {
      console.error('Error getting migrated career card:', error);
      return null;
    }
  }

  /**
   * Get migrated person profile for a user
   */
  async getMigratedPersonProfile(userId: string): Promise<any | null> {
    try {
      console.log('🔍 CareerPathwayService: Getting migrated person profile for user:', userId);
      
      const { db } = await import('./firebase');
      const { collection, query, where, orderBy, limit, getDocs } = await import('firebase/firestore');
      
      // Look for the most recent migrated career exploration with person profile data
      const migratedQuery = query(
        collection(db, 'careerExplorations'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      
      const migratedSnapshot = await getDocs(migratedQuery);
      
      if (migratedSnapshot.empty) {
        console.log('No migrated data found for user');
        return null;
      }
      
      const doc = migratedSnapshot.docs[0];
      const data = doc.data();
      
      // Check if this migration includes person profile data
      if (data.personProfile) {
        console.log('✅ Found migrated person profile');
        return {
          ...data.personProfile,
          isMigrated: true,
          migrationSource: 'guest_session',
          migratedAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
        };
      }
      
      return null;
      
    } catch (error) {
      console.error('Error getting migrated person profile:', error);
      return null;
    }
  }

  /**
   * Get current user profile from their chat conversations
   */
  async getCurrentUserProfile(userId: string): Promise<any | null> {
    try {
      console.log('🔍 CareerPathwayService: Getting current user profile for user:', userId);
      
      const { db } = await import('./firebase');
      const { collection, query, where, orderBy, limit, getDocs } = await import('firebase/firestore');
      
      // Get the most recent chat summary with profile data
      const summaryQuery = query(
        collection(db, 'chatSummaries'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      
      const summarySnapshot = await getDocs(summaryQuery);
      
      if (summarySnapshot.empty) {
        console.log('No chat summaries found for user');
        return null;
      }
      
      const doc = summarySnapshot.docs[0];
      const data = doc.data();
      
      console.log('✅ Found current user profile from chat summary');
      return {
        interests: data.interests || [],
        goals: data.careerGoals || [],
        skills: data.skills || [],
        values: [], // Not typically in chat summaries
        careerStage: 'exploring',
        workStyle: [], // Not typically in chat summaries
        isCurrent: true,
        source: 'conversation',
        lastUpdated: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
      };
      
    } catch (error) {
      console.error('Error getting current user profile:', error);
      return null;
    }
  }

  /**
   * Get combined user profile (current + migrated)
   */
  async getCombinedUserProfile(userId: string): Promise<any | null> {
    try {
      console.log('🔍 CareerPathwayService: Getting combined user profile for user:', userId);
      
      const [currentProfile, migratedProfile] = await Promise.all([
        this.getCurrentUserProfile(userId),
        this.getMigratedPersonProfile(userId)
      ]);
      
      if (!currentProfile && !migratedProfile) {
        return null;
      }
      
      // Merge profiles, prioritizing current conversation data
      const combinedProfile = {
        interests: [...new Set([
          ...(currentProfile?.interests || []),
          ...(migratedProfile?.interests || [])
        ])],
        goals: [...new Set([
          ...(currentProfile?.goals || []),
          ...(migratedProfile?.goals || [])
        ])],
        skills: [...new Set([
          ...(currentProfile?.skills || []),
          ...(migratedProfile?.skills || [])
        ])],
        values: [...new Set([
          ...(currentProfile?.values || []),
          ...(migratedProfile?.values || [])
        ])],
        careerStage: currentProfile?.careerStage || migratedProfile?.careerStage || 'exploring',
        workStyle: [...new Set([
          ...(currentProfile?.workStyle || []),
          ...(migratedProfile?.workStyle || [])
        ])],
        hasBothSources: !!(currentProfile && migratedProfile),
        hasCurrentData: !!currentProfile,
        hasMigratedData: !!migratedProfile,
        lastUpdated: currentProfile?.lastUpdated || migratedProfile?.lastUpdated || new Date()
      };
      
      console.log('✅ Combined user profile created:', {
        currentData: !!currentProfile,
        migratedData: !!migratedProfile,
        totalInterests: combinedProfile.interests.length,
        totalGoals: combinedProfile.goals.length,
        totalSkills: combinedProfile.skills.length
      });
      
      return combinedProfile;
      
    } catch (error) {
      console.error('Error getting combined user profile:', error);
      return null;
    }
  }

  /**
   * Get current career cards from thread guidance 
   */
  async getCurrentCareerCards(userId: string): Promise<any[]> {
    try {
      console.log('🔍 CareerPathwayService: Getting current career cards for user:', userId);
      
      const { db } = await import('./firebase');
      const { collection, query, where, orderBy, getDocs } = await import('firebase/firestore');
      
      const careerCards: any[] = [];
      
      // Get career cards from thread guidance
      const guidanceQuery = query(
        collection(db, 'threadCareerGuidance'),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      );
      
      const guidanceSnapshot = await getDocs(guidanceQuery);
      
      for (const doc of guidanceSnapshot.docs) {
        const data = doc.data();
        
        if (data.guidance?.alternativePathways) {
          data.guidance.alternativePathways.forEach((pathway: any) => {
            careerCards.push({
              id: `guidance-${doc.id}-${pathway.title.toLowerCase().replace(/\s/g, '-')}`,
              title: pathway.title,
              description: pathway.description,
              industry: pathway.industry || 'Technology',
              averageSalary: pathway.averageSalary || {
                entry: '£25,000',
                experienced: '£35,000', 
                senior: '£50,000'
              },
              growthOutlook: pathway.growthOutlook || 'Growing demand',
              keySkills: pathway.requiredSkills || [],
              trainingPathways: pathway.trainingPathways || [],
              nextSteps: pathway.nextSteps || [],
              confidence: pathway.match || 80,
              workEnvironment: pathway.workEnvironment || 'Office-based',
              entryRequirements: pathway.entryRequirements || [],
              location: 'UK',
              isCurrent: true,
              source: 'conversation_guidance',
              threadId: data.threadId
            });
          });
        }
        
        // Also include primary pathway
        if (data.guidance?.primaryPathway) {
          const primary = data.guidance.primaryPathway;
          careerCards.push({
            id: `guidance-${doc.id}-primary`,
            title: primary.title,
            description: primary.description,
            industry: primary.industry || 'Technology',
            averageSalary: primary.averageSalary || {
              entry: '£25,000',
              experienced: '£35,000',
              senior: '£50,000'
            },
            growthOutlook: primary.growthOutlook || 'Growing demand',
            keySkills: primary.requiredSkills || [],
            trainingPathways: primary.trainingPathways || [],
            nextSteps: primary.nextSteps || [],
            confidence: primary.match || 85,
            workEnvironment: primary.workEnvironment || 'Office-based',
            entryRequirements: primary.entryRequirements || [],
            location: 'UK',
            isCurrent: true,
            source: 'conversation_guidance',
            threadId: data.threadId,
            isPrimary: true
          });
        }
      }
      
      console.log('✅ Found current career cards:', careerCards.length);
      return careerCards;
      
    } catch (error) {
      console.error('Error getting current career cards:', error);
      return [];
    }
  }

  /**
   * Delete career guidance for a specific thread
   */
  async deleteThreadCareerGuidance(threadId: string, userId: string): Promise<void> {
    try {
      const { db } = await import('./firebase');
      const { doc, deleteDoc, getDoc } = await import('firebase/firestore');
      
      const guidanceRef = doc(db, 'threadCareerGuidance', `${threadId}_guidance`);
      
      // Verify ownership before deletion
      const guidanceDoc = await getDoc(guidanceRef);
      if (guidanceDoc.exists() && guidanceDoc.data().userId === userId) {
        await deleteDoc(guidanceRef);
        console.log('✅ Deleted thread-specific career guidance');
      }
      
    } catch (error) {
      console.error('Error deleting thread career guidance:', error);
      throw error;
    }
  }

  /**
   * Determine if career guidance should be regenerated based on conversation changes
   */
  private shouldRegenerateGuidance(existingGuidance: ComprehensiveCareerGuidance, newSummary: ChatSummary): boolean {
    // If no existing guidance or missing user profile, regenerate
    if (!existingGuidance?.userProfile) return true;
    
    const existingProfile = existingGuidance.userProfile;
    const newProfile = this.extractUserProfile(newSummary);
    
    // Check if goals have changed significantly
    const goalChanges = this.arraysDifferSignificantly(existingProfile.goals || [], newProfile.goals || []);
    if (goalChanges) {
      console.log('🔄 Goals changed significantly, regenerating guidance');
      return true;
    }
    
    // Check if interests have changed significantly (more than 2 new interests)
    const interestChanges = this.arraysDifferSignificantly(existingProfile.interests || [], newProfile.interests || [], 2);
    if (interestChanges) {
      console.log('🔄 Interests changed significantly, regenerating guidance');
      return true;
    }
    
    // Check if career stage changed
    if (existingProfile.careerStage !== newProfile.careerStage) {
      console.log('🔄 Career stage changed, regenerating guidance');
      return true;
    }
    
    // Check if guidance is older than 7 days
    const guidanceAge = this.getGuidanceAge(existingGuidance.generatedAt);
    if (guidanceAge > 7) {
      console.log('🔄 Guidance is older than 7 days, regenerating');
      return true;
    }
    
    console.log('🎯 No significant changes detected, using existing guidance');
    return false;
  }

  /**
   * Check if two arrays differ significantly
   */
  private arraysDifferSignificantly(existing: string[], newArray: string[], threshold: number = 1): boolean {
    const existingSet = new Set(existing.map(item => item.toLowerCase()));
    const newSet = new Set(newArray.map(item => item.toLowerCase()));
    
    // Count new items not in existing array
    const newItems = [...newSet].filter(item => !existingSet.has(item));
    
    return newItems.length > threshold;
  }

  /**
   * Get age of guidance in days
   */
  private getGuidanceAge(generatedAt: Date | any): number {
    try {
      let date: Date;
      
      if (generatedAt instanceof Date) {
        date = generatedAt;
      } else if (generatedAt?.seconds) {
        // Firestore timestamp
        date = new Date(generatedAt.seconds * 1000);
      } else {
        // Fallback: assume it's very old to trigger regeneration
        return 30;
      }
      
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays;
    } catch (error) {
      console.error('Error calculating guidance age:', error);
      return 30; // Assume old to trigger regeneration
    }
  }

  /**
   * Extract structured user profile from chat summary
   */
  private extractUserProfile(chatSummary: ChatSummary) {
    const profile = {
      goals: chatSummary.careerGoals || [],
      interests: chatSummary.interests || [],
      skills: chatSummary.skills || [],
      careerStage: this.determineCareerStage(chatSummary)
    };
    
    console.log('📊 Extracted user profile:', profile);
    return profile;
  }

  /**
   * Determine career stage based on chat content
   */
  private determineCareerStage(chatSummary: ChatSummary): 'exploring' | 'transitioning' | 'advancing' {
    const summary = chatSummary.summary.toLowerCase();
    const goals = chatSummary.careerGoals.join(' ').toLowerCase();
    
    if (summary.includes('exploring') || summary.includes('unsure') || summary.includes('what career')) {
      return 'exploring';
    }
    if (summary.includes('change') || summary.includes('transition') || summary.includes('switch')) {
      return 'transitioning';
    }
    return 'advancing';
  }

  /**
   * Generate AI-powered career pathways with UK-specific resources
   */
  private async generateCareerPathways(userProfile: any): Promise<CareerPathway[]> {
    try {
      // Call OpenAI API through Firebase Function for comprehensive career pathway generation
      const response = await fetch(`${env.apiEndpoints.openaiAssistant}/generateCareerPathways`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userProfile,
          country: 'UK',
          includeSpecificResources: true,
          includeVolunteering: true,
          includeFunding: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI career pathways');
      }

      const aiResponse = await response.json();
      
      // Check if the response is successful and has data
      if (!aiResponse.success || !aiResponse.data) {
        throw new Error('Invalid response from career pathways API');
      }
      
      const aiData = aiResponse.data;
      
      // Transform the OpenAI response into CareerPathway format
      const primaryPathway: CareerPathway = {
        id: 'ai-generated-primary',
        title: aiData.primaryPathway?.title || 'AI-Generated Career Path',
        description: aiData.primaryPathway?.description || 'AI-generated career guidance',
        match: 95,
        trainingOptions: aiData.training?.map((t: any) => ({
          title: t.title,
          level: 'Various',
          duration: t.duration,
          cost: t.cost,
          provider: t.provider,
          description: t.description,
          link: t.link
        })) || [],
        volunteeringOpportunities: aiData.volunteering?.map((v: any) => ({
          organization: v.organization,
          role: v.title,
          description: v.description,
          location: v.location,
          link: v.link,
          timeCommitment: v.timeCommitment,
          skillsGained: v.benefits?.split(', ') || [],
          careerPathConnection: 'Directly relevant to your career goals'
        })) || [],
        fundingOptions: aiData.funding?.map((f: any) => ({
          name: f.title,
          amount: f.amount,
          eligibility: f.eligibility?.split(', ') || [],
          description: f.description,
          link: f.link
        })) || [],
        nextSteps: {
          immediate: aiData.primaryPathway?.requirements || [],
          shortTerm: aiData.primaryPathway?.progression?.slice(0, 2) || [],
          longTerm: aiData.primaryPathway?.progression?.slice(2) || []
        },
        reflectiveQuestions: [
          'How does this career path align with your personal values?',
          'What aspects of this field excite you most?',
          'Which skills would you like to develop further?'
        ],
        keyResources: aiData.resources?.map((r: any) => ({
          title: r.title,
          description: r.description,
          link: r.link
        })) || [],
        progressionPath: [
          {
            stage: 'Entry Level',
            description: 'Start with volunteering and basic training',
            timeframe: '0-6 months',
            requirements: ['Basic skills', 'Volunteer experience']
          },
          {
            stage: 'Developing',
            description: 'Complete formal training and gain experience',
            timeframe: '6-18 months',
            requirements: ['Relevant qualification', 'Practical experience']
          },
          {
            stage: 'Established',
            description: 'Secure employment and continue professional development',
            timeframe: '18+ months',
            requirements: ['Work experience', 'Ongoing training']
          }
        ]
      };
      
      return [primaryPathway];

    } catch (error) {
      console.warn('AI pathway generation failed, using curated pathways:', error);
      // Fallback to curated pathways based on user interests
      return this.getCuratedPathways(userProfile);
    }
  }

  /**
   * Enhance AI-generated pathways with verified UK resources
   */
  private enhanceWithUKResources(pathway: any, userProfile: any, isPrimary: boolean): CareerPathway {
    // Add UK-specific enhancements based on career field
    const ukResources = this.getUKResourcesForField(pathway.title);
    
    return {
      id: `pathway-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: pathway.title,
      description: pathway.description,
      match: isPrimary ? 95 : Math.floor(Math.random() * 20) + 70,
      trainingOptions: [
        ...pathway.trainingOptions || [],
        ...ukResources.training
      ],
      volunteeringOpportunities: [
        ...pathway.volunteeringOpportunities || [],
        ...ukResources.volunteering
      ],
      fundingOptions: [
        ...pathway.fundingOptions || [],
        ...ukResources.funding
      ],
      nextSteps: pathway.nextSteps || this.generateDefaultNextSteps(pathway.title),
      reflectiveQuestions: pathway.reflectiveQuestions || this.generateReflectiveQuestions(pathway.title),
      keyResources: ukResources.keyResources,
      progressionPath: pathway.progressionPath || this.generateProgressionPath(pathway.title)
    };
  }

  /**
   * Get curated UK career pathways as fallback
   */
  private getCuratedPathways(userProfile: any): CareerPathway[] {
    const primaryField = this.determinePrimaryField(userProfile);
    
    switch (primaryField) {
      case 'healthcare':
        return this.getHealthcarePathways();
      case 'technology':
        return this.getTechnologyPathways();
      case 'care':
        return this.getCarePathways();
      case 'creative':
        return this.getCreativePathways();
      case 'business':
        return this.getBusinessPathways();
      default:
        return this.getGeneralPathways();
    }
  }

  /**
   * Get care sector pathways (based on the user's example)
   */
  private getCarePathways(): CareerPathway[] {
    return [{
      id: 'care-elderly-creative',
      title: 'Elderly Care & Creative Therapy',
      description: 'Combining care work with creative activities to support elderly people\'s wellbeing and social engagement.',
      match: 95,
      trainingOptions: [
        {
          title: 'Level 2 Adult Social Care Certificate',
          level: 'Level 2',
          duration: '6-8 months',
          cost: 'Up to £1,540 funded',
          fundingAvailable: 'Learning & Development Support Scheme (Apr 2025–Mar 2026)',
          provider: 'City & Guilds, RoSPA, NCFE',
          description: 'Ofqual‑regulated qualification covering communications, safeguarding, and wellbeing',
          link: 'https://www.gov.uk/government/publications/adult-social-care-learning-development-support-scheme'
        },
        {
          title: 'Level 2 Preparing to Work in Adult Social Care',
          level: 'Level 2',
          duration: '6-12 weeks',
          cost: 'Free online',
          provider: 'Learndirect',
          description: 'Fully online certificate with optional placement opportunities',
          link: 'https://www.learndirect.com/courses/care-courses/preparing-to-work-in-adult-social-care-level-2'
        }
      ],
      volunteeringOpportunities: [
        {
          organization: 'NHS Trusts',
          role: 'Arts & Creative Care Volunteer',
          description: 'Arts sessions (singing, craft) for patients in hospital wards',
          location: 'Various NHS trusts across UK',
          timeCommitment: '2-4 hours per week',
          skillsGained: ['Patient interaction', 'Creative facilitation', 'Healthcare environment experience'],
          careerPathConnection: 'Direct pathway to healthcare and social care careers',
          link: 'https://www.nhsvolunteerresponders.org.uk'
        },
        {
          organization: 'Sue Ryder',
          role: 'Palliative & Bereavement Care Volunteer',
          description: 'Supporting people with life-limiting conditions and their families',
          location: 'Across the UK',
          timeCommitment: '3-6 hours per week',
          skillsGained: ['Emotional support', 'Communication', 'Empathy and resilience'],
          careerPathConnection: 'Experience in specialized care environments',
          link: 'https://www.sueryder.org/support-us/volunteer'
        },
        {
          organization: 'British Red Cross',
          role: 'Home from Hospital & Befriending Volunteer',
          description: 'Therapeutic care and befriending services for elderly people',
          location: 'Community-based across UK',
          timeCommitment: '2-4 hours per week',
          skillsGained: ['Community care', 'Independence support', 'Social interaction'],
          careerPathConnection: 'Foundation for community care roles',
          link: 'https://www.redcross.org.uk/get-involved/volunteer'
        }
      ],
      fundingOptions: [
        {
          name: 'Learning & Development Support Scheme',
          amount: 'Up to £1,540',
          eligibility: ['Working in adult social care', 'New entrants to the sector'],
          description: 'Government funding for adult social care qualifications',
          link: 'https://www.gov.uk/government/publications/adult-social-care-learning-development-support-scheme'
        }
      ],
      nextSteps: {
        immediate: [
          'Apply for NHS arts volunteer role at local trust',
          'Research Level 2 Adult Social Care Certificate providers in your area',
          'Visit local care homes to understand the environment'
        ],
        shortTerm: [
          'Enroll in funded Level 2 qualification',
          'Begin volunteering to gain experience',
          'Connect with current care workers for insights'
        ],
        longTerm: [
          'Complete qualification and gain certification',
          'Apply for paid positions in care settings',
          'Consider specializing in creative therapy or dementia care'
        ]
      },
      reflectiveQuestions: [
        'Which environment feels most enriching: hospital bedside, care home, or community centre?',
        'Do you prefer one-on-one conversations or facilitating group activities?',
        'How do you balance caregiving with maintaining your own wellbeing?',
        'What creative activities bring you the most joy to share with others?'
      ],
      keyResources: [
        {
          title: 'Skills for Care',
          description: 'UK adult social care sector skills development and career information',
          link: 'https://www.skillsforcare.org.uk'
        },
        {
          title: 'Care Quality Commission',
          description: 'Information about care standards and what good care looks like',
          link: 'https://www.cqc.org.uk'
        }
      ],
      progressionPath: [
        {
          stage: 'Volunteer & Explore',
          description: 'Gain experience through volunteering while researching career options',
          timeframe: '1-3 months',
          requirements: ['Volunteer application', 'Basic safeguarding training']
        },
        {
          stage: 'Formal Training',
          description: 'Complete Level 2 Adult Social Care Certificate',
          timeframe: '6-8 months',
          requirements: ['Course enrollment', 'Placement hours', 'Assessment completion']
        },
        {
          stage: 'Entry-level Position',
          description: 'Secure first paid role in care sector',
          timeframe: '8-12 months',
          requirements: ['Completed qualification', 'References from volunteering', 'DBS check']
        },
        {
          stage: 'Specialization',
          description: 'Develop expertise in specific areas like dementia care or creative therapy',
          timeframe: '2-3 years',
          requirements: ['Work experience', 'Additional training', 'Professional development']
        }
      ]
    }];
  }

  /**
   * Determine primary career field from user profile
   */
  private determinePrimaryField(userProfile: any): string {
    const combined = [...userProfile.goals, ...userProfile.interests].join(' ').toLowerCase();
    
    if (combined.includes('care') || combined.includes('elderly') || combined.includes('help')) return 'care';
    if (combined.includes('tech') || combined.includes('software') || combined.includes('coding')) return 'technology';
    if (combined.includes('health') || combined.includes('medical') || combined.includes('nurse')) return 'healthcare';
    if (combined.includes('creative') || combined.includes('art') || combined.includes('design')) return 'creative';
    if (combined.includes('business') || combined.includes('management') || combined.includes('finance')) return 'business';
    
    return 'general';
  }

  /**
   * Get UK resources for specific career fields
   */
  private getUKResourcesForField(field: string) {
    // This would be expanded with comprehensive UK-specific resources
    return {
      training: [],
      volunteering: [],
      funding: [],
      keyResources: []
    };
  }

  /**
   * Generate cross-cutting UK resources
   */
  private getCrossCuttingResources() {
    return {
      generalFunding: [
        {
          name: 'Apprenticeship Levy',
          amount: 'Full course fees + £4.81/hour minimum wage',
          eligibility: ['16+ years old', 'Living in England', 'Not in full-time education'],
          description: 'Government-funded apprenticeships across various sectors',
          link: 'https://www.gov.uk/apprenticeships-guide'
        },
        {
          name: 'Career Learning Pilots',
          amount: 'Varies by region',
          eligibility: ['Adults without Level 3 qualification', 'Specific regions'],
          description: 'Free courses to develop skills for career progression',
          link: 'https://www.gov.uk/guidance/free-courses-for-jobs'
        }
      ],
      careerSupport: [
        {
          title: 'National Career Service',
          description: 'Free career guidance, skills assessment, and job search support',
          link: 'https://nationalcareers.service.gov.uk'
        },
        {
          title: 'Job Centre Plus',
          description: 'Employment support, benefits advice, and local job opportunities',
          link: 'https://www.gov.uk/contact-jobcentre-plus'
        }
      ]
    };
  }

  /**
   * Generate action plan based on primary pathway
   */
  private generateActionPlan(primaryPathway: CareerPathway, userProfile: any) {
    return {
      thisWeek: [
        'Research and apply for one volunteer opportunity',
        'Identify local training providers for relevant qualifications',
        'Create a career exploration journal'
      ],
      thisMonth: [
        'Begin volunteering in your chosen field',
        'Attend information sessions for training courses',
        'Connect with professionals in your target career area'
      ],
      next3Months: [
        'Evaluate your volunteer experience and career fit',
        'Enroll in appropriate training or qualification course',
        'Develop a longer-term career development plan'
      ]
    };
  }

  /**
   * Generate default next steps for any career field
   */
  private generateDefaultNextSteps(careerField: string) {
    return {
      immediate: [
        `Research entry requirements for ${careerField}`,
        'Identify relevant volunteer opportunities',
        'Connect with professionals in the field'
      ],
      shortTerm: [
        'Begin relevant training or education',
        'Gain practical experience through volunteering',
        'Build professional network'
      ],
      longTerm: [
        'Complete necessary qualifications',
        'Apply for entry-level positions',
        'Plan career progression and specialization'
      ]
    };
  }

  /**
   * Generate reflective questions for career exploration
   */
  private generateReflectiveQuestions(careerField: string): string[] {
    return [
      `What aspects of ${careerField} excite you most?`,
      'How do your personal values align with this career path?',
      'What challenges in this field are you prepared to face?',
      'How does this career fit with your lifestyle goals?',
      'What first step can you take this week to explore further?'
    ];
  }

  /**
   * Generate career progression path
   */
  private generateProgressionPath(careerField: string) {
    return [
      {
        stage: 'Exploration',
        description: 'Research and gain initial exposure to the field',
        timeframe: '1-3 months',
        requirements: ['Information gathering', 'Informational interviews', 'Volunteer experience']
      },
      {
        stage: 'Foundation',
        description: 'Build basic skills and qualifications',
        timeframe: '6-12 months',
        requirements: ['Entry-level training', 'Practical experience', 'Skill development']
      },
      {
        stage: 'Entry',
        description: 'Secure first professional role',
        timeframe: '12-18 months',
        requirements: ['Completed training', 'Work experience', 'Professional references']
      },
      {
        stage: 'Development',
        description: 'Build expertise and advance in the field',
        timeframe: '2-5 years',
        requirements: ['Continuous learning', 'Professional development', 'Specialization']
      }
    ];
  }

  // Placeholder methods for other career fields
  private getHealthcarePathways(): CareerPathway[] { return []; }
  private getTechnologyPathways(): CareerPathway[] { return []; }
  private getCreativePathways(): CareerPathway[] { return []; }
  private getBusinessPathways(): CareerPathway[] { return []; }
  private getGeneralPathways(): CareerPathway[] { return []; }
}

export const careerPathwayService = new CareerPathwayService();
export default careerPathwayService; 