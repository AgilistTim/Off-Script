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
  // Career card specific fields
  industry?: string;
  averageSalary?: {
    entry: string;
    experienced: string;
    senior: string;
  };
  growthOutlook?: string;
  requiredSkills?: string[];
  workEnvironment?: string;
  entryRequirements?: string[];
  trainingPathways?: string[];
  // Web search verification fields
  webSearchVerified?: boolean;
  requiresVerification?: boolean;
  citations?: string[];
  // Original pathway fields
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
   * Extract next steps array from either array or object format
   * Handles data structure changes during migration
   */
  private extractNextStepsArray(nextSteps: any): string[] {
    if (!nextSteps) return [];
    
    // If it's already an array, return it
    if (Array.isArray(nextSteps)) {
      return nextSteps;
    }
    
    // If it's an object with immediate/shortTerm/longTerm, combine them
    if (typeof nextSteps === 'object' && !Array.isArray(nextSteps)) {
      const combined: string[] = [];
      
      if (Array.isArray(nextSteps.immediate)) {
        combined.push(...nextSteps.immediate);
      }
      if (Array.isArray(nextSteps.shortTerm)) {
        combined.push(...nextSteps.shortTerm);
      }
      if (Array.isArray(nextSteps.longTerm)) {
        combined.push(...nextSteps.longTerm);
      }
      
      return combined;
    }
    
    // Fallback
    return [];
  }

  /**
   * Validate training pathways match the career title
   */
  private validateTrainingPathwayAlignment(careerTitle: string, trainingPathways: string[]): string[] {
    if (!trainingPathways || !Array.isArray(trainingPathways)) {
      return [];
    }

    const careerLower = careerTitle.toLowerCase();
    const validatedPathways: string[] = [];

    // Define career field keywords to training keywords mapping
    const careerTrainingMap: Record<string, string[]> = {
      // Tech/Software careers
      'software|developer|programming|tech|digital|web|app|game': ['programming', 'software', 'computer', 'digital', 'web', 'app', 'game', 'technology'],
      
      // Creative/Content careers  
      'content|writer|creative|design|media|fiction|storytelling': ['creative', 'writing', 'media', 'design', 'content', 'digital media', 'journalism', 'english'],
      
      // Food/Culinary careers
      'culinary|chef|cook|food|restaurant|hospitality': ['culinary', 'food', 'cooking', 'hospitality', 'chef', 'restaurant', 'catering'],
      
      // Healthcare careers
      'health|medical|nurse|care|therapy': ['health', 'medical', 'nursing', 'care', 'therapy', 'clinical'],
      
      // Business/Finance careers
      'business|finance|management|marketing|sales': ['business', 'management', 'finance', 'marketing', 'sales', 'accounting']
    };

    // Check each training pathway for alignment
    for (const pathway of trainingPathways) {
      const pathwayLower = pathway.toLowerCase();
      let isAligned = false;

      // Check if this pathway aligns with the career
      for (const [careerPattern, trainingKeywords] of Object.entries(careerTrainingMap)) {
        const careerRegex = new RegExp(careerPattern, 'i');
        
        if (careerRegex.test(careerLower)) {
          // Career matches this category, check if training pathway contains relevant keywords
          isAligned = trainingKeywords.some(keyword => pathwayLower.includes(keyword));
          if (isAligned) break;
        }
      }

      if (isAligned) {
        validatedPathways.push(pathway);
      } else {
        console.warn(`⚠️ Training pathway "${pathway}" doesn't align with career "${careerTitle}" - filtering out`);
      }
    }

    // If no pathways align, return generic career-appropriate suggestions
    if (validatedPathways.length === 0) {
      console.warn(`⚠️ No training pathways aligned with "${careerTitle}" - generating generic suggestions`);
      return this.generateGenericTrainingPathways(careerTitle);
    }

    return validatedPathways;
  }

  /**
   * Generate generic but career-appropriate training pathways
   */
  private generateGenericTrainingPathways(careerTitle: string): string[] {
    const careerLower = careerTitle.toLowerCase();
    
    if (careerLower.includes('software') || careerLower.includes('developer') || careerLower.includes('programming')) {
      return [
        'Computer Science degree from UK universities',
        'Software Development bootcamps',
        'Professional programming certifications'
      ];
    } else if (careerLower.includes('content') || careerLower.includes('writer') || careerLower.includes('creative')) {
      return [
        'Creative Writing or English Literature degree',
        'Digital Media and Content Creation courses',
        'Professional writing certifications'
      ];
    } else if (careerLower.includes('culinary') || careerLower.includes('chef') || careerLower.includes('food')) {
      return [
        'Professional Cookery apprenticeships',
        'Culinary Arts diplomas',
        'Food preparation certifications'
      ];
    } else {
      return [
        'Relevant degree programs (verify with UCAS)',
        'Professional certifications in this field',
        'Industry-specific training courses'
      ];
    }
  }

  /**
   * Convert training pathway strings to structured TrainingOption objects
   * Enhanced to preserve specific details from OpenAI-generated content
   */
  private convertTrainingPathwaysToOptions(trainingPathways: string[], careerTitle?: string): TrainingOption[] {
    if (!trainingPathways || !Array.isArray(trainingPathways)) {
      return [];
    }
    
    return trainingPathways.map((pathway, index) => {
      const title = pathway.trim();
      const lowerTitle = title.toLowerCase();
      
      // More sophisticated parsing to preserve OpenAI-generated details
      let level = 'Professional Training';
      let duration = '6-12 months';
      let cost = 'Varies';
      let provider = 'Various Institutions';
      let description = title;
      let fundingInfo = 'Various funding options available';
      
      // Advanced pattern matching for specific qualifications
      if (lowerTitle.includes('degree') || lowerTitle.includes('bachelor') || lowerTitle.includes('master')) {
        level = lowerTitle.includes('master') ? 'Masters Degree' : 'University Degree';
        duration = lowerTitle.includes('master') ? '1-2 years' : '3-4 years';
        cost = '£9,000-£27,000 per year';
        provider = 'UK Universities';
        fundingInfo = 'Student finance, scholarships, and grants available';
        if (!description.includes('skills') && !description.includes('qualifications')) {
          description = `${title} - Comprehensive university education providing theoretical knowledge and practical skills for career advancement.`;
        }
      } else if (lowerTitle.includes('apprentice')) {
        level = 'Apprenticeship';
        duration = lowerTitle.includes('higher') || lowerTitle.includes('degree') ? '3-4 years' : '1-3 years';
        cost = 'Employer funded';
        provider = 'Approved Training Providers';
        fundingInfo = 'Fully funded by employer';
        if (!description.includes('skills') && !description.includes('work-based')) {
          description = `${title} - Work-based learning combining practical experience with formal training.`;
        }
      } else if (lowerTitle.includes('nvq') || lowerTitle.includes('level 2') || lowerTitle.includes('level 3')) {
        level = lowerTitle.includes('level 3') ? 'Advanced Vocational' : 'Foundation Vocational';
        duration = '6-18 months';
        cost = '£1,000-£4,000';
        provider = 'Colleges & Training Centers';
        fundingInfo = 'Adult education funding available';
        if (!description.includes('skills') && !description.includes('workplace')) {
          description = `${title} - Practical vocational qualification demonstrating work-ready skills.`;
        }
      } else if (lowerTitle.includes('diploma') || lowerTitle.includes('btec') || lowerTitle.includes('hnd')) {
        level = lowerTitle.includes('higher') || lowerTitle.includes('hnd') ? 'Higher Diploma' : 'Diploma';
        duration = lowerTitle.includes('higher') ? '2-3 years' : '1-2 years';
        cost = '£2,000-£8,000';
        provider = 'Colleges & Universities';
        fundingInfo = 'Student finance and employer sponsorship available';
        if (!description.includes('skills') && !description.includes('industry')) {
          description = `${title} - Industry-focused qualification providing specialized knowledge and practical skills.`;
        }
      } else if (lowerTitle.includes('certificate') || lowerTitle.includes('course') || lowerTitle.includes('training')) {
        level = 'Professional Certificate';
        duration = lowerTitle.includes('short') ? '1-6 months' : '3-12 months';
        cost = '£500-£3,000';
        provider = 'Professional Bodies & Training Organizations';
        fundingInfo = 'Employer funding and professional development budgets';
        if (!description.includes('skills') && !description.includes('professional')) {
          description = `${title} - Professional development training to enhance specific career skills.`;
        }
      } else if (lowerTitle.includes('online') || lowerTitle.includes('distance')) {
        level = 'Online Learning';
        duration = '3-12 months';
        cost = '£200-£2,000';
        provider = 'Online Education Providers';
        fundingInfo = 'Flexible payment options available';
        if (!description.includes('skills') && !description.includes('flexible')) {
          description = `${title} - Flexible online learning designed for working professionals.`;
        }
      }
      
      // If OpenAI provided a detailed description, preserve it
      const originalDescription = description;
      if (title.length > 50 && title.includes(' - ')) {
        // Likely contains detailed info from OpenAI
        description = title;
      } else if (originalDescription === title) {
        // Add context if we only have a basic title
        description = `${title} - Gain the skills and qualifications needed for this career path.`;
      }
      
      return {
        title: title.split(' - ')[0].trim(), // Clean title without description
        level,
        duration,
        cost,
        provider,
        description,
        fundingAvailable: fundingInfo,
        qualificationBody: provider
      };
    });
  }
  
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
   * Save career cards generated during conversation for logged-in users
   */
  async saveCareerCardsFromConversation(userId: string, careerCards: any[]): Promise<void> {
    try {
      console.log('💾 Saving career cards from conversation for user:', userId, 'Cards:', careerCards.length);
      
      const { db } = await import('./firebase');
      const { doc, setDoc } = await import('firebase/firestore');
      
      const threadId = `conversation_${Date.now()}`;
      
      // Store ONLY in thread guidance format for live conversations
      // careerExplorations is reserved for migrated guest data only
      const guidanceData: ThreadCareerGuidance = {
        id: `${threadId}_guidance`,
        threadId,
        userId,
        guidance: {
          userProfile: {
            goals: careerCards.flatMap(card => {
              if (Array.isArray(card.nextSteps)) {
                return card.nextSteps;
              } else if (card.nextSteps) {
                return [card.nextSteps];
              }
              return [];
            }).slice(0, 3),
            interests: careerCards.flatMap(card => card.industry ? [card.industry] : []).slice(0, 3),
            skills: careerCards.flatMap(card => {
              if (Array.isArray(card.keySkills)) {
                return card.keySkills;
              } else if (card.keySkills) {
                return [card.keySkills];
              }
              return [];
            }).slice(0, 5),
            careerStage: 'exploring' as const
          },
          primaryPathway: {
            id: careerCards[0]?.id || `primary-${Date.now()}`,
            title: careerCards[0]?.title || 'Career Exploration',
            description: careerCards[0]?.description || 'Explore career opportunities',
            match: careerCards[0]?.confidence || 85,
            // Preserve original career card fields INCLUDING OpenAI web search data
            industry: careerCards[0]?.industry,
            averageSalary: careerCards[0]?.averageSalary,
            growthOutlook: careerCards[0]?.growthOutlook,
            requiredSkills: careerCards[0]?.keySkills || [],
            workEnvironment: careerCards[0]?.workEnvironment,
            entryRequirements: careerCards[0]?.entryRequirements || [],
            trainingPathways: this.validateTrainingPathwayAlignment(careerCards[0]?.title || '', careerCards[0]?.trainingPathways || []),
            // Preserve web search verification and citation data
            webSearchVerified: careerCards[0]?.webSearchVerified,
            requiresVerification: careerCards[0]?.requiresVerification,
            citations: careerCards[0]?.citations,
            trainingOptions: this.convertTrainingPathwaysToOptions(
              this.validateTrainingPathwayAlignment(careerCards[0]?.title || '', careerCards[0]?.trainingPathways || []),
              careerCards[0]?.title
            ),
            volunteeringOpportunities: [],
            fundingOptions: [],
            nextSteps: {
              immediate: Array.isArray(careerCards[0]?.nextSteps) ? careerCards[0].nextSteps.slice(0, 2) : ['Research this career field', 'Identify key skills needed'],
              shortTerm: ['Connect with professionals', 'Begin skill development'],
              longTerm: ['Gain relevant experience', 'Apply for opportunities']
            },
            reflectiveQuestions: [
              'What aspects of this career excite you most?',
              'How do your current skills align with this path?',
              'What additional training might you need?'
            ],
            keyResources: [
              {
                title: 'Career Research',
                description: 'Research this career field thoroughly'
              }
            ],
            progressionPath: [
              {
                stage: 'Exploration',
                description: 'Learn about the career and requirements',
                timeframe: '1-3 months',
                requirements: ['Research', 'Information gathering']
              }
            ]
          },
          alternativePathways: careerCards.slice(1).map(card => ({
            id: card.id || `alt-${Date.now()}`,
            title: card.title,
            description: card.description,
            match: card.confidence || 80,
            // Preserve original career card fields INCLUDING OpenAI web search data
            industry: card.industry,
            averageSalary: card.averageSalary,
            growthOutlook: card.growthOutlook,
            requiredSkills: card.keySkills || [],
            workEnvironment: card.workEnvironment,
            entryRequirements: card.entryRequirements || [],
            trainingPathways: this.validateTrainingPathwayAlignment(card.title || '', card.trainingPathways || []),
            // Preserve web search verification and citation data
            webSearchVerified: card.webSearchVerified,
            requiresVerification: card.requiresVerification,
            citations: card.citations,
            trainingOptions: this.convertTrainingPathwaysToOptions(
              this.validateTrainingPathwayAlignment(card.title || '', card.trainingPathways || []),
              card.title
            ),
            volunteeringOpportunities: [],
            fundingOptions: [],
            nextSteps: {
              immediate: Array.isArray(card.nextSteps) ? card.nextSteps.slice(0, 2) : ['Research this alternative path'],
              shortTerm: ['Explore requirements'],
              longTerm: ['Consider as backup option']
            },
            reflectiveQuestions: [
              'How does this compare to your primary choice?',
              'What unique opportunities does this offer?'
            ],
            keyResources: [
              {
                title: 'Alternative Career Path',
                description: 'Explore this as an alternative option'
              }
            ],
            progressionPath: [
              {
                stage: 'Consideration',
                description: 'Evaluate as alternative option',
                timeframe: '1-2 months',
                requirements: ['Research', 'Comparison with primary choice']
              }
            ]
          })),
          crossCuttingResources: {
            generalFunding: [],
            careerSupport: []
          },
          generatedAt: new Date(),
          actionPlan: {
            thisWeek: ['Research career requirements', 'Identify skill gaps'],
            thisMonth: ['Connect with professionals in the field', 'Begin skill development'],
            next3Months: ['Apply for relevant opportunities', 'Build portfolio']
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await setDoc(doc(db, 'threadCareerGuidance', guidanceData.id), guidanceData);
      
      console.log('✅ Successfully saved conversation career cards to threadCareerGuidance:', guidanceData.id);
      console.log('📊 Data flow: Live conversation → threadCareerGuidance (no dual storage)');
      
    } catch (error) {
      console.error('❌ Error saving conversation career cards:', error);
      throw error;
    }
  }

  /**
   * Enhance an existing career card with detailed OpenAI analysis
   */
  async enhanceCareerCardDetails(userId: string, cardId: string, careerTitle: string): Promise<boolean> {
    try {
      console.log('🔄 Enhancing career card details for:', careerTitle);
      
      const { ConversationAnalyzer } = await import('./conversationAnalyzer');
      const analyzer = new ConversationAnalyzer();
      
      // Generate enhanced career card data using OpenAI with web search
      const enhancedCard = await analyzer.generateCareerCard(careerTitle, `Detailed enhancement with current UK data for ${careerTitle} career path`);
      
      if (!enhancedCard) {
        console.warn('⚠️ Could not generate enhanced career details');
        return false;
      }
      
      console.log('✅ Generated enhanced career card:', enhancedCard.title);
      console.log('📊 Enhanced data includes:', {
        industry: !!enhancedCard.industry,
        salary: !!enhancedCard.averageSalary,
        skills: enhancedCard.keySkills?.length || 0,
        training: enhancedCard.trainingPathways?.length || 0,
        requirements: enhancedCard.entryRequirements?.length || 0
      });
      
      // Find and update the existing career guidance data
      const { db } = await import('./firebase');
      const { collection, query, where, getDocs, doc, updateDoc } = await import('firebase/firestore');
      
      // Query threadCareerGuidance to find documents containing this career card
      const guidanceQuery = query(
        collection(db, 'threadCareerGuidance'),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(guidanceQuery);
      let updated = false;
      
      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        let needsUpdate = false;
        
        // Check and update primary pathway
        if (data.guidance?.primaryPathway?.title === careerTitle) {
          data.guidance.primaryPathway = {
            ...data.guidance.primaryPathway,
            industry: enhancedCard.industry,
            averageSalary: enhancedCard.averageSalary,
            growthOutlook: enhancedCard.growthOutlook,
            requiredSkills: enhancedCard.keySkills || [],
            workEnvironment: enhancedCard.workEnvironment,
            entryRequirements: enhancedCard.entryRequirements || [],
            trainingPathways: enhancedCard.trainingPathways || [],
            trainingOptions: this.convertTrainingPathwaysToOptions(enhancedCard.trainingPathways || []),
            description: enhancedCard.description || data.guidance.primaryPathway.description,
            nextSteps: {
              ...data.guidance.primaryPathway.nextSteps,
              immediate: enhancedCard.nextSteps?.slice(0, 2) || data.guidance.primaryPathway.nextSteps.immediate
            }
          };
          needsUpdate = true;
        }
        
        // Check and update alternative pathways
        if (data.guidance?.alternativePathways) {
          data.guidance.alternativePathways = data.guidance.alternativePathways.map((pathway: any) => {
            if (pathway.title === careerTitle) {
              return {
                ...pathway,
                industry: enhancedCard.industry,
                averageSalary: enhancedCard.averageSalary,
                growthOutlook: enhancedCard.growthOutlook,
                requiredSkills: enhancedCard.keySkills || [],
                workEnvironment: enhancedCard.workEnvironment,
                entryRequirements: enhancedCard.entryRequirements || [],
                trainingPathways: enhancedCard.trainingPathways || [],
                trainingOptions: this.convertTrainingPathwaysToOptions(enhancedCard.trainingPathways || []),
                description: enhancedCard.description || pathway.description
              };
            }
            return pathway;
          });
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          data.updatedAt = new Date();
          await updateDoc(doc(db, 'threadCareerGuidance', docSnap.id), data);
          updated = true;
          console.log('✅ Updated career guidance document:', docSnap.id);
        }
      }
      
      if (updated) {
        console.log('🎉 Successfully enhanced career card details');
        return true;
      } else {
        console.warn('⚠️ No matching career card found to update');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Error enhancing career card details:', error);
      return false;
    }
  }

  /**
   * Retrieve career guidance for a specific thread
   */
  async getThreadCareerGuidance(threadId: string, userId: string): Promise<ComprehensiveCareerGuidance | null> {
    try {
      // Wait for authentication before making Firebase queries
      const { auth } = await import('./firebase');
      if (!auth.currentUser) {
        console.warn('❌ User not authenticated for threadCareerGuidance access');
        return null;
      }
      
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
      
      // Wait for authentication before making Firebase queries
      const { auth } = await import('./firebase');
      if (!auth.currentUser) {
        console.warn('❌ User not authenticated for careerExplorations access');
        return [];
      }
      
      const { db } = await import('./firebase');
      const { collection, query, where, orderBy, getDocs } = await import('firebase/firestore');
      
      const explorations: CareerExplorationSummary[] = [];

      // Get all career guidance from threadCareerGuidance (includes both live conversations and migrated data)
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
          const threadTitle = await this.getThreadTitle(data.threadId, userId);
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

      // Note: All career data (both live conversations and migrated) now stored in threadCareerGuidance

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
  private async getThreadTitle(threadId: string, userId: string): Promise<string | null> {
    try {
      // Wait for authentication before making Firebase queries
      const { auth } = await import('./firebase');
      if (!auth.currentUser) {
        console.warn('❌ User not authenticated for chatThreads access');
        return null;
      }
      
      const { db } = await import('./firebase');
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      
      // Query for the thread document where threadId field matches the OpenAI thread ID
      // and userId matches the current user (for proper permissions)
      const threadsQuery = query(
        collection(db, 'chatThreads'),
        where('threadId', '==', threadId),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(threadsQuery);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      // Get the first matching document
      const threadDoc = querySnapshot.docs[0];
      return threadDoc.data().title || 'Career Exploration';
      
    } catch (error) {
      console.error('Error getting thread title:', error);
      return null;
    }
  }

  // Note: getMigratedCareerCard removed - all cards now stored in threadCareerGuidance

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
      
      // Wait for authentication before making Firebase queries
      const { auth } = await import('./firebase');
      if (!auth.currentUser) {
        console.warn('❌ User not authenticated for getCurrentUserProfile access');
        return null;
      }
      
      const { db } = await import('./firebase');
      const { collection, query, where, orderBy, limit, getDocs, doc, getDoc } = await import('firebase/firestore');
      
      let profileData: any = null;
      
      // Try multiple data sources for profile information
      
      // 1. First try chat summaries (main source) - get ALL enriched summaries to combine
      try {
        // Get all enriched summaries for comprehensive profile
        const enrichedSummariesQuery = query(
          collection(db, 'chatSummaries'),
          where('userId', '==', userId),
          where('enriched', '==', true),
          orderBy('createdAt', 'desc'),
          limit(5) // Get last 5 enriched summaries to combine
        );
        
        let summariesSnapshot = await getDocs(enrichedSummariesQuery);
        console.log(`🔍 Found ${summariesSnapshot.size} enriched chat summaries for user ${userId}`);
        
        // If no enriched summaries, fall back to any summaries
        if (summariesSnapshot.empty) {
          const allSummariesQuery = query(
            collection(db, 'chatSummaries'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(5)
          );
          summariesSnapshot = await getDocs(allSummariesQuery);
          console.log(`🔍 Found ${summariesSnapshot.size} total chat summaries for user ${userId}`);
        }
        
        if (!summariesSnapshot.empty) {
          // Combine all summaries into comprehensive profile
          let allInterests: string[] = [];
          let allGoals: string[] = [];
          let allSkills: string[] = [];
          let latestSummary: any = null;
          
          summariesSnapshot.docs.forEach(doc => {
            const data = doc.data();
            allInterests = [...allInterests, ...(data.interests || [])];
            allGoals = [...allGoals, ...(data.careerGoals || [])];
            allSkills = [...allSkills, ...(data.skills || [])];
            
            if (!latestSummary) {
              latestSummary = data;
              console.log('🔍 Latest chat summary data:', {
                threadId: data.threadId,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
                interests: data.interests,
                careerGoals: data.careerGoals,
                skills: data.skills,
                summary: data.summary?.substring(0, 100) + '...'
              });
            }
          });
          
          profileData = {
            interests: [...new Set(allInterests)], // Remove duplicates
            goals: [...new Set(allGoals)],
            skills: [...new Set(allSkills)],
            values: [], // Not typically in chat summaries
            careerStage: 'exploring',
            workStyle: [], // Not typically in chat summaries
            source: 'combined_chat_summaries',
            lastUpdated: latestSummary?.createdAt?.toDate ? latestSummary.createdAt.toDate() : new Date()
          };
          console.log('✅ Found combined user profile from chat summaries:', {
            totalInterests: profileData.interests.length,
            totalGoals: profileData.goals.length,
            totalSkills: profileData.skills.length
          });
        } else {
          console.log('❌ No chat summaries found for user');
        }
      } catch (summaryError: any) {
        if (summaryError?.code === 'permission-denied') {
          console.warn('⚠️ Permission denied accessing chatSummaries (will try other sources)');
        } else {
          console.warn('⚠️ Error accessing chatSummaries:', summaryError);
        }
      }
      
      // 2. Fallback: Try user document directly
      if (!profileData) {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.interests || userData.careerGoals || userData.skills) {
              profileData = {
                interests: userData.interests || [],
                goals: userData.careerGoals || [],
                skills: userData.skills || [],
                values: userData.values || [],
                careerStage: userData.careerStage || 'exploring',
                workStyle: userData.workStyle || [],
                source: 'user_document',
                lastUpdated: userData.updatedAt?.toDate ? userData.updatedAt.toDate() : new Date()
              };
              console.log('✅ Found current user profile from user document');
            }
          }
        } catch (userError) {
          console.warn('⚠️ Error accessing user document:', userError);
        }
      }
      
      // 3. Fallback: Try thread career guidance for any profile data
      if (!profileData) {
        try {
          const guidanceQuery = query(
            collection(db, 'threadCareerGuidance'),
            where('userId', '==', userId),
            orderBy('updatedAt', 'desc'),
            limit(1)
          );
          
          const guidanceSnapshot = await getDocs(guidanceQuery);
          
          if (!guidanceSnapshot.empty) {
            const data = guidanceSnapshot.docs[0].data();
            const guidance = data.guidance;
            
            if (guidance) {
              // Extract profile-like data from career guidance
              const interests = guidance.alternativePathways?.map((p: any) => p.industry).filter(Boolean) || [];
              const skills = guidance.primaryPathway?.requiredSkills || [];
              
              profileData = {
                interests: [...new Set(interests)],
                goals: ['Find career path'], // Generic goal based on guidance
                skills: skills.slice(0, 5), // Limit to first 5 skills
                values: [],
                careerStage: 'exploring',
                workStyle: [],
                source: 'career_guidance',
                lastUpdated: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date()
              };
              console.log('✅ Found current user profile from career guidance');
            }
          }
        } catch (guidanceError) {
          console.warn('⚠️ Error accessing threadCareerGuidance:', guidanceError);
        }
      }
      
      if (profileData) {
        return {
          ...profileData,
          isCurrent: true
        };
      }
      
      console.log('No current profile data found for user');
      return null;
      
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
        careerGoals: [...new Set([
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
        totalGoals: combinedProfile.careerGoals.length,
        totalSkills: combinedProfile.skills.length
      });
      
      return combinedProfile;
      
    } catch (error) {
      console.error('Error getting combined user profile:', error);
      return null;
    }
  }

  /**
   * Get current career cards from thread guidance (unified storage for all cards)
   */
  async getCurrentCareerCards(userId: string): Promise<any[]> {
    try {
      console.log('🔍 CareerPathwayService: Getting current career cards for user:', userId);
      
      // Wait for authentication before making Firebase queries
      const { auth } = await import('./firebase');
      if (!auth.currentUser) {
        console.warn('❌ User not authenticated for getCurrentCareerCards access');
        return [];
      }
      
      const { db } = await import('./firebase');
      const { collection, query, where, orderBy, getDocs } = await import('firebase/firestore');
      
      const careerCards: any[] = [];
      
      // Get all career cards from threadCareerGuidance (both live conversations and migrated data)
      try {
        const guidanceQuery = query(
          collection(db, 'threadCareerGuidance'),
          where('userId', '==', userId),
          orderBy('updatedAt', 'desc')
        );
        
        const guidanceSnapshot = await getDocs(guidanceQuery);
        console.log('🔍 DEBUG getCurrentCareerCards: Found documents:', guidanceSnapshot.docs.length);
        
        for (const doc of guidanceSnapshot.docs) {
          const data = doc.data();
          console.log('🔍 DEBUG getCurrentCareerCards: Processing doc:', {
            id: doc.id,
            threadId: data.threadId,
            hasGuidance: !!data.guidance,
            hasPrimary: !!data.guidance?.primaryPathway,
            hasAlternatives: !!(data.guidance?.alternativePathways?.length),
            alternativeCount: data.guidance?.alternativePathways?.length || 0
          });
          
          if (data.guidance?.alternativePathways) {
            console.log('🔍 DEBUG: Processing', data.guidance.alternativePathways.length, 'alternative pathways');
            data.guidance.alternativePathways.forEach((pathway: any, index: number) => {
              const cardData = {
                id: `guidance-${doc.id}-alt-${index}`,
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
                trainingPathways: this.validateTrainingPathwayAlignment(pathway.title || '', pathway.trainingPathways || []),
                trainingOptions: this.convertTrainingPathwaysToOptions(
                  this.validateTrainingPathwayAlignment(pathway.title || '', pathway.trainingPathways || []),
                  pathway.title
                ),
                nextSteps: this.extractNextStepsArray(pathway.nextSteps) || [],
                confidence: pathway.match || 80,
                workEnvironment: pathway.workEnvironment || 'Office-based',
                entryRequirements: pathway.entryRequirements || [],
                location: 'UK',
                isCurrent: true,
                source: 'conversation_guidance',
                threadId: data.threadId,
                // Preserve web search verification and citation data
                webSearchVerified: pathway.webSearchVerified,
                requiresVerification: pathway.requiresVerification,
                citations: pathway.citations,
                // Store actual Firebase document ID and pathway info for deletion
                firebaseDocId: doc.id,
                pathwayType: 'alternative',
                pathwayIndex: index,
                // Debug info for troubleshooting
                _debug: {
                  docId: doc.id,
                  totalAlternatives: data.guidance?.alternativePathways?.length || 0,
                  pathwayTitle: pathway.title
                }
              };
              console.log('🔍 DEBUG: Adding alternative card:', cardData.title, 'with web search:', cardData.webSearchVerified);
              careerCards.push(cardData);
            });
          }
          
          // Also include primary pathway
          if (data.guidance?.primaryPathway) {
            console.log('🔍 DEBUG: Processing primary pathway');
            const primary = data.guidance.primaryPathway;
            const primaryCardData = {
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
              trainingPathways: this.validateTrainingPathwayAlignment(primary.title || '', primary.trainingPathways || []),
              trainingOptions: this.convertTrainingPathwaysToOptions(
                this.validateTrainingPathwayAlignment(primary.title || '', primary.trainingPathways || []),
                primary.title
              ),
              nextSteps: this.extractNextStepsArray(primary.nextSteps) || [],
              confidence: primary.match || 85,
              workEnvironment: primary.workEnvironment || 'Office-based',
              entryRequirements: primary.entryRequirements || [],
              location: 'UK',
              isCurrent: true,
              source: 'conversation_guidance',
              threadId: data.threadId,
              isPrimary: true,
              // Preserve web search verification and citation data
              webSearchVerified: primary.webSearchVerified,
              requiresVerification: primary.requiresVerification,
              citations: primary.citations,
              // Store actual Firebase document ID and pathway info for deletion
              firebaseDocId: doc.id,
              pathwayType: 'primary',
              // Debug info for troubleshooting
              _debug: {
                docId: doc.id,
                totalAlternatives: data.guidance?.alternativePathways?.length || 0,
                pathwayTitle: primary.title
              }
            };
            console.log('🔍 DEBUG: Adding primary card:', primaryCardData.title, 'with web search:', primaryCardData.webSearchVerified);
            careerCards.push(primaryCardData);
          }
        }
        
        console.log('✅ Found current career cards from thread guidance:', careerCards.length);
        if (careerCards.length > 0) {
          console.log('🔍 DEBUG: Career card titles:', careerCards.map(c => c.title));
          console.log('🔍 DEBUG: First card full data:', careerCards[0]);
        }
        
      } catch (guidanceError: any) {
        if (guidanceError?.code === 'permission-denied') {
          console.warn('⚠️ Permission denied accessing threadCareerGuidance (user may not have any career guidance yet)');
        } else if (guidanceError?.code === 'failed-precondition') {
          console.warn('⚠️ Firestore index still building for threadCareerGuidance (this is normal for new deployments)');
        } else {
          console.warn('⚠️ Error accessing threadCareerGuidance:', guidanceError);
        }
      }
      
      console.log('🔍 DEBUG: Final return - career cards:', careerCards.length);
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
      // Wait for authentication before making Firebase queries
      const { auth } = await import('./firebase');
      if (!auth.currentUser) {
        console.warn('❌ User not authenticated for deleteThreadCareerGuidance access');
        return;
      }
      
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
   * Delete a career card by its actual Firebase document ID and pathway info
   */
  async deleteCareerCardByFirebaseId(
    cardId: string, 
    firebaseDocId: string, 
    pathwayType: 'primary' | 'alternative', 
    pathwayIndex?: number,
    userId?: string
  ): Promise<void> {
    try {
      console.log('🗑️ Deleting career card:', { cardId, firebaseDocId, pathwayType, pathwayIndex });
      
      const { db } = await import('./firebase');
      const { doc, getDoc, updateDoc, deleteDoc } = await import('firebase/firestore');

      // Get the guidance document
      const guidanceRef = doc(db, 'threadCareerGuidance', firebaseDocId);
      const guidanceSnap = await getDoc(guidanceRef);

      if (!guidanceSnap.exists()) {
        console.warn('⚠️ Career guidance document not found:', firebaseDocId);
        return;
      }

      const guidanceData = guidanceSnap.data();
      if (userId && guidanceData.userId !== userId) {
        console.warn('⚠️ User does not own this career guidance');
        return;
      }

      if (pathwayType === 'primary') {
        // If deleting primary pathway, check if there are alternatives to promote
        if (guidanceData.guidance?.alternativePathways?.length > 0) {
          // Promote first alternative to primary
          const newPrimary = guidanceData.guidance.alternativePathways[0];
          const remainingAlternatives = guidanceData.guidance.alternativePathways.slice(1);
          
          await updateDoc(guidanceRef, {
            'guidance.primaryPathway': newPrimary,
            'guidance.alternativePathways': remainingAlternatives,
            updatedAt: new Date()
          });
          console.log('✅ Promoted alternative to primary and removed original primary');
        } else {
          // No alternatives left, delete entire document
          await deleteDoc(guidanceRef);
          console.log('✅ Deleted entire guidance document (no alternatives left)');
        }
      } else if (pathwayType === 'alternative' && typeof pathwayIndex === 'number') {
        // Remove specific alternative pathway
        const alternatives = guidanceData.guidance?.alternativePathways || [];
        
        console.log('🔍 Deletion Debug:', {
          requestedIndex: pathwayIndex,
          totalAlternatives: alternatives.length,
          alternativeTitles: alternatives.map((alt, idx) => `${idx}: ${alt.title || 'Untitled'}`),
          firebaseDocId
        });
        
        if (pathwayIndex >= 0 && pathwayIndex < alternatives.length) {
          const removedPathway = alternatives[pathwayIndex];
          alternatives.splice(pathwayIndex, 1);
          
          await updateDoc(guidanceRef, {
            'guidance.alternativePathways': alternatives,
            updatedAt: new Date()
          });
          console.log('✅ Removed alternative pathway:', removedPathway.title, 'at index:', pathwayIndex);
        } else {
          console.error('❌ Alternative pathway index out of range!', {
            requestedIndex: pathwayIndex,
            availableRange: `0-${alternatives.length - 1}`,
            totalAlternatives: alternatives.length,
            cardId,
            firebaseDocId
          });
          
          // Try to find the pathway by title instead
          const cardTitle = cardId.split('-').slice(-1)[0]; // Extract title from card ID
          const alternativeIndex = alternatives.findIndex(alt => 
            alt.title?.toLowerCase().includes('community') && 
            alt.title?.toLowerCase().includes('manager')
          );
          
          if (alternativeIndex >= 0) {
            console.log('🔄 Found pathway by title match, removing at index:', alternativeIndex);
            const removedPathway = alternatives[alternativeIndex];
            alternatives.splice(alternativeIndex, 1);
            
            await updateDoc(guidanceRef, {
              'guidance.alternativePathways': alternatives,
              updatedAt: new Date()
            });
            console.log('✅ Removed alternative pathway by title match:', removedPathway.title);
          } else {
            throw new Error(`Cannot find pathway to delete. Index ${pathwayIndex} out of range (0-${alternatives.length - 1})`);
          }
        }
      }

    } catch (error) {
      console.error('Error deleting career card by Firebase ID:', error);
      throw error;
    }
  }

  /**
   * Delete a career exploration document or a single migrated career card.
   *
   * Handles both standard thread-level explorations (document id === threadId)
   * and migrated guest-session cards whose ids follow the pattern
   *   `${explorationDocId}_card_${index}`.
   */
  async deleteCareerExplorationOrCard(threadId: string, userId: string): Promise<void> {
    try {
      const { db } = await import('./firebase');
      const { doc, deleteDoc, getDoc, updateDoc } = await import('firebase/firestore');

      // If this is a migrated card we need to surgically remove the card from the
      // parent exploration document (or delete the whole document if it was the
      // last remaining card).
      if (threadId.includes('_card_')) {
        const [explorationDocId, cardSuffix] = threadId.split('_card_');
        const cardIndex = Number.parseInt(cardSuffix, 10);

        // Defensive check for NaN
        if (Number.isNaN(cardIndex)) {
          console.warn('⚠️ Unable to parse card index from threadId:', threadId);
          return;
        }

        const explorationRef = doc(db, 'careerExplorations', explorationDocId);
        const explorationSnap = await getDoc(explorationRef);

        if (!explorationSnap.exists()) {
          console.warn('⚠️ Exploration document does not exist for id:', explorationDocId);
          return;
        }

        const explorationData = explorationSnap.data();
        if (explorationData.userId !== userId) {
          console.warn('⚠️ User does not own exploration, skipping delete');
          return;
        }

        const cards: any[] = Array.isArray(explorationData.careerCards)
          ? [...explorationData.careerCards]
          : [];

        // Remove requested card
        if (cardIndex >= 0 && cardIndex < cards.length) {
          cards.splice(cardIndex, 1);
        } else {
          console.warn('⚠️ Card index out of range for exploration', explorationDocId);
          return;
        }

        if (cards.length === 0) {
          // No cards left – delete entire document
          await deleteDoc(explorationRef);
          console.log('✅ Deleted empty careerExplorations doc:', explorationDocId);
        } else {
          // Update remaining cards and cardCount
          await updateDoc(explorationRef, {
            careerCards: cards,
            cardCount: cards.length,
            updatedAt: new Date()
          });
          console.log('✅ Removed card', cardIndex, 'from exploration', explorationDocId);
        }
      } else {
        // Standard exploration document
        const explorationRef = doc(db, 'careerExplorations', threadId);
        const explorationSnap = await getDoc(explorationRef);

        if (explorationSnap.exists() && explorationSnap.data().userId === userId) {
          await deleteDoc(explorationRef);
          console.log('✅ Deleted careerExplorations doc:', threadId);
        }
      }
    } catch (error) {
      console.error('Error deleting career exploration/card:', error);
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
      console.log('🎯 Attempting to generate AI career pathways for user profile:', {
        interests: userProfile.interests?.length || 0,
        skills: userProfile.skills?.length || 0,
        goals: userProfile.goals?.length || 0,
        careerStage: userProfile.careerStage
      });

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
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('🔴 Career pathways API error:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText.substring(0, 500)
        });
        throw new Error(`Failed to generate AI career pathways: ${response.status} ${response.statusText}`);
      }

      const aiResponse = await response.json();
      
      // Check if the response is successful and has data
      if (!aiResponse.success || !aiResponse.data) {
        console.error('🔴 Invalid career pathways API response:', aiResponse);
        throw new Error('Invalid response from career pathways API');
      }
      
      console.log('✅ Successfully generated AI career pathways');
      return this.transformAIResponseToPathways(aiResponse.data);
      
    } catch (error) {
      console.error('❌ AI pathway generation failed - no fallback to prevent irrelevant suggestions:', error);
      
      // Don't use fallback career pathways to avoid irrelevant suggestions
      // Return empty array instead of generic careers
      return [];
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
   * Transform AI response data into CareerPathway format
   */
  private transformAIResponseToPathways(aiData: any): CareerPathway[] {
    try {
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
      console.error('❌ Error transforming AI response:', error);
      return this.getCuratedCareerPathways({});
    }
  }

  /**
   * Get curated career pathways as fallback when AI generation fails
   */
  private getCuratedCareerPathways(userProfile: any): CareerPathway[] {
    console.log('🔄 Generating curated career pathways as fallback');

    // Determine likely career interest based on user profile
    const interests = userProfile.interests || [];
    const skills = userProfile.skills || [];
    const goals = userProfile.goals || [];
    
    // Define curated career pathways for common UK career areas
    const curatedPathways: CareerPathway[] = [
      {
        id: 'curated-digital-tech',
        title: 'Digital Technology & Software Development',
        description: 'Explore careers in coding, web development, and digital innovation',
        match: interests.some((i: string) => 
          ['technology', 'coding', 'programming', 'software', 'digital', 'AI', 'data', 'tech'].some(keyword => 
            i.toLowerCase().includes(keyword.toLowerCase())
          )
        ) ? 90 : 70,
        trainingOptions: [
          {
            title: 'Software Developer Apprenticeship',
            level: 'Level 4',
            duration: '18-24 months',
            cost: 'Free (funded)',
            provider: 'Various UK employers',
            description: 'Learn programming while earning a salary',
            link: 'https://www.apprenticeships.gov.uk'
          },
          {
            title: 'Full Stack Web Development Bootcamp',
            level: 'Intensive',
            duration: '12-16 weeks',
            cost: '£8,000-£12,000',
            provider: 'General Assembly, Le Wagon',
            description: 'Intensive coding bootcamp covering modern web technologies',
            link: 'https://www.prospects.ac.uk'
          }
        ],
        volunteeringOpportunities: [
          {
            organization: 'Code Club',
            role: 'Volunteer Coding Instructor',
            description: 'Teach coding to young people in schools and community centers',
            location: 'Various UK locations',
            link: 'https://codeclub.org',
            timeCommitment: '2-3 hours per week',
            skillsGained: ['Teaching', 'Communication', 'Technical skills'],
            careerPathConnection: 'Develops technical and communication skills valuable in tech careers'
          }
        ],
        fundingOptions: [
          {
            name: 'Advanced Learner Loan',
            amount: '£300-£10,000',
            eligibility: ['19+', 'UK resident', 'Level 3+ courses'],
            description: 'Government loan for adult education and training',
            link: 'https://www.gov.uk/advanced-learner-loan'
          }
        ],
        nextSteps: {
          immediate: ['Learn basic programming concepts', 'Choose a programming language', 'Practice coding daily'],
          shortTerm: ['Complete online tutorials', 'Build first project', 'Join coding community'],
          longTerm: ['Apply for apprenticeships or courses', 'Build portfolio', 'Network with professionals']
        },
        reflectiveQuestions: [
          'What type of technology problems would you enjoy solving?',
          'Do you prefer working independently or as part of a team?',
          'Are you interested in creating apps, websites, or working with data?'
        ],
        keyResources: [
          {
            title: 'Codecademy',
            description: 'Free online coding tutorials and exercises',
            link: 'https://www.codecademy.com'
          },
          {
            title: 'freeCodeCamp',
            description: 'Comprehensive free programming curriculum',
            link: 'https://www.freecodecamp.org'
          }
        ],
        progressionPath: [
          {
            stage: 'Beginner',
            description: 'Learn programming fundamentals through online resources',
            timeframe: '0-6 months',
            requirements: ['Basic computer skills', 'Self-motivation']
          },
          {
            stage: 'Developing',
            description: 'Complete formal training and build projects',
            timeframe: '6-18 months',
            requirements: ['Programming knowledge', 'Portfolio projects']
          },
          {
            stage: 'Professional',
            description: 'Secure junior developer role and continue learning',
            timeframe: '18+ months',
            requirements: ['Technical skills', 'Professional experience']
          }
        ]
      },
      {
        id: 'curated-healthcare',
        title: 'Healthcare & Social Care',
        description: 'Make a difference in people\'s lives through healthcare careers',
        match: interests.some((i: string) => 
          ['health', 'care', 'medical', 'nursing', 'therapy', 'mental health', 'wellbeing'].some(keyword => 
            i.toLowerCase().includes(keyword.toLowerCase())
          )
        ) ? 90 : 65,
        trainingOptions: [
          {
            title: 'Health and Social Care Level 3 Diploma',
            level: 'Level 3',
            duration: '12-18 months',
            cost: 'Free (16-18) or funded options available',
            provider: 'Local colleges',
            description: 'Foundation qualification for healthcare careers',
            link: 'https://find-postgraduate-study.ac.uk'
          },
          {
            title: 'Mental Health First Aid Training',
            level: 'Certificate',
            duration: '2 days',
            cost: '£200-£300',
            provider: 'Mental Health First Aid England',
            description: 'Learn to support people experiencing mental health issues',
            link: 'https://mhfaengland.org'
          }
        ],
        volunteeringOpportunities: [
          {
            organization: 'Age UK',
            role: 'Befriending Volunteer',
            description: 'Provide companionship and support to older adults',
            location: 'Various UK locations',
            link: 'https://www.ageuk.org.uk',
            timeCommitment: '2-4 hours per week',
            skillsGained: ['Empathy', 'Communication', 'Patience'],
            careerPathConnection: 'Develops essential interpersonal skills for healthcare careers'
          }
        ],
        fundingOptions: [
          {
            name: 'NHS Learning Support Fund',
            amount: '£1,000-£3,000',
            eligibility: ['Nursing students', 'Allied health students'],
            description: 'Financial support for healthcare training',
            link: 'https://www.gov.uk/nhs-bursaries'
          }
        ],
        nextSteps: {
          immediate: ['Research healthcare roles', 'Volunteer in care settings', 'Develop empathy skills'],
          shortTerm: ['Complete relevant qualifications', 'Gain hands-on experience', 'Build professional network'],
          longTerm: ['Apply for healthcare positions', 'Continue professional development', 'Specialize in chosen area']
        },
        reflectiveQuestions: [
          'What motivates you to help others?',
          'How do you handle emotionally challenging situations?',
          'Which aspect of healthcare interests you most?'
        ],
        keyResources: [
          {
            title: 'NHS Careers',
            description: 'Comprehensive guide to healthcare careers and training',
            link: 'https://www.healthcareers.nhs.uk'
          },
          {
            title: 'Skills for Care',
            description: 'Information about social care careers and training',
            link: 'https://www.skillsforcare.org.uk'
          }
        ],
        progressionPath: [
          {
            stage: 'Entry Level',
            description: 'Start with basic care qualifications and volunteer experience',
            timeframe: '0-12 months',
            requirements: ['Basic qualifications', 'DBS check', 'Compassionate nature']
          },
          {
            stage: 'Qualified',
            description: 'Complete professional training and gain employment',
            timeframe: '1-3 years',
            requirements: ['Professional qualification', 'Work experience', 'Registration']
          },
          {
            stage: 'Specialist',
            description: 'Develop expertise in chosen healthcare area',
            timeframe: '3+ years',
            requirements: ['Advanced qualifications', 'Specialist experience', 'Continuous development']
          }
        ]
      }
    ];

    // Return pathways sorted by match score
    return curatedPathways.sort((a, b) => b.match - a.match);
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