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
      
      // Extract user profile from chat summary
      const userProfile = this.extractUserProfile(chatSummary);
      
      // Generate career pathways using AI analysis
      const pathways = await this.generateCareerPathways(userProfile);
      
      // Get cross-cutting UK resources
      const crossCuttingResources = this.getCrossCuttingResources();
      
      // Create action plan
      const actionPlan = this.generateActionPlan(pathways[0], userProfile);
      
      return {
        userProfile,
        primaryPathway: pathways[0],
        alternativePathways: pathways.slice(1, 3),
        crossCuttingResources,
        generatedAt: new Date(),
        actionPlan
      };
      
    } catch (error) {
      console.error('Error generating career guidance:', error);
      throw new Error('Failed to generate comprehensive career guidance');
    }
  }

  /**
   * Generate and store thread-specific career guidance
   */
  async generateThreadCareerGuidance(threadId: string, userId: string, chatSummary: ChatSummary): Promise<ComprehensiveCareerGuidance> {
    try {
      console.log('🎯 Generating thread-specific career guidance for:', threadId);
      
      // Generate the career guidance
      const guidance = await this.generateCareerGuidance(chatSummary);
      
      // Store in Firestore with thread association
      await this.storeThreadCareerGuidance(threadId, userId, guidance);
      
      return guidance;
      
    } catch (error) {
      console.error('Error generating thread-specific career guidance:', error);
      throw new Error('Failed to generate thread-specific career guidance');
    }
  }

  /**
   * Store career guidance for a specific thread
   */
  private async storeThreadCareerGuidance(threadId: string, userId: string, guidance: ComprehensiveCareerGuidance): Promise<void> {
    try {
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
      
      await setDoc(doc(db, 'threadCareerGuidance', guidanceData.id), guidanceData);
      console.log('✅ Stored thread-specific career guidance');
      
    } catch (error) {
      console.error('Error storing thread career guidance:', error);
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
      const { db } = await import('./firebase');
      const { collection, query, where, orderBy, getDocs } = await import('firebase/firestore');
      
      const guidanceQuery = query(
        collection(db, 'threadCareerGuidance'),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(guidanceQuery);
      
      const explorations: CareerExplorationSummary[] = [];
      
      // Get thread titles for each exploration
      for (const doc of querySnapshot.docs) {
        const data = doc.data() as ThreadCareerGuidance;
        
        // Get thread title
        const threadTitle = await this.getThreadTitle(data.threadId);
        
        explorations.push({
          threadId: data.threadId,
          threadTitle: threadTitle || 'Career Exploration',
          primaryCareerPath: data.guidance.primaryPathway.title,
          lastUpdated: data.updatedAt,
          match: data.guidance.primaryPathway.match,
          description: data.guidance.primaryPathway.description
        });
      }
      
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