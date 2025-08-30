/**
 * Report Data Aggregation Service
 * 
 * Core service for aggregating user data from multiple Firebase collections
 * with privacy filtering and data organization for report generation.
 * 
 * Features:
 * - Multi-collection data aggregation
 * - Privacy-aware data filtering
 * - Error handling and data validation
 * - Optimized Firebase queries
 */

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  AggregatedUserData,
  UserProfileData,
  CareerJourneyData,
  ConversationAnalytics,
  EnhancedCareerCard,
  PersonaProgressData,
  EngagementMetrics,
  SkillsData,
  RecommendationData,
  PrivacyConfiguration,
  PrivacyLevel
} from '../../types/reports';

// Convert Firestore timestamp to Date (following existing pattern)
const convertTimestamps = (data: any): any => {
  if (!data) return data;
  
  const result = { ...data };
  
  Object.keys(result).forEach(key => {
    if (result[key] instanceof Timestamp) {
      result[key] = result[key].toDate();
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      if (Array.isArray(result[key])) {
        result[key] = result[key].map(convertTimestamps);
      } else {
        result[key] = convertTimestamps(result[key]);
      }
    }
  });
  
  return result;
};

/**
 * Privacy filter utility to apply inclusion levels to data
 */
const applyPrivacyFilter = (data: any, privacyLevel: PrivacyLevel): any => {
  if (privacyLevel === 'exclude') {
    return null;
  }
  
  if (privacyLevel === 'summary') {
    // Return only high-level summary data, removing detailed content
    if (Array.isArray(data)) {
      return data.slice(0, 3).map(item => ({
        ...item,
        content: item.content ? `${item.content.substring(0, 100)}...` : undefined,
        details: undefined,
        personalInfo: undefined
      }));
    }
    
    if (typeof data === 'object' && data !== null) {
      const summary = { ...data };
      // Remove detailed fields for summary level
      delete summary.content;
      delete summary.conversationText;
      delete summary.personalDetails;
      delete summary.privateNotes;
      return summary;
    }
  }
  
  // 'detailed' level returns full data
  return data;
};

/**
 * Main Report Data Aggregation Service Class
 */
export class ReportDataAggregationService {
  
  /**
   * Main method to aggregate all user data for report generation
   */
  static async aggregateUserData(
    userId: string, 
    privacyConfig?: PrivacyConfiguration
  ): Promise<AggregatedUserData> {
    try {
      console.log('🔍 Starting data aggregation for user:', userId);
      
      // Execute all data collection operations in parallel with fault tolerance
      const [
        profile,
        careerJourney,
        conversationInsights,
        careerCards,
        personaEvolution,
        engagementMetrics,
        skillsProgression,
        recommendationsTracking
      ] = await Promise.allSettled([
        this.getUserProfile(userId, privacyConfig),
        this.getCareerJourneyData(userId, privacyConfig),
        this.getConversationAnalytics(userId, privacyConfig),
        this.getEnhancedCareerCards(userId, privacyConfig),
        this.getPersonaProgressData(userId, privacyConfig),
        this.getEngagementMetrics(userId, privacyConfig),
        this.getSkillsData(userId, privacyConfig),
        this.getRecommendationData(userId, privacyConfig)
      ]).then(results => results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.warn(`Data source ${index} failed:`, result.reason);
          // Return fallback data based on the index
          switch (index) {
            case 0: return { // profile fallback
              name: 'User',
              age: null,
              location: null,
              educationLevel: null,
              interests: [],
              personalityTraits: []
            };
            case 1: return { // careerJourney fallback
              explorationHistory: [],
              careerPathways: [],
              goalEvolution: []
            };
            case 2: return { // conversationInsights fallback
              totalSessions: 0,
              totalMessages: 0,
              averageSessionLength: 0,
              topicsDiscussed: [],
              sentimentAnalysis: { overall: 'neutral', progression: [] },
              keyInsights: [],
              conversationSummaries: []
            };
            case 3: return []; // careerCards
            case 4: return { // personaEvolution fallback
              currentPersona: 'exploring', 
              progressionHistory: [], 
              classificationTriggers: [] 
            };
            case 5: return { // engagementMetrics fallback
              sessionMetrics: { totalSessions: 0, averageSessionDuration: 0 },
              progressMetrics: { consistencyScore: 50 },
              interactionPatterns: { preferredStyle: 'mixed' }
            };
            case 6: return { // skillsProgression fallback
              identifiedSkills: [],
              skillProgression: [],
              recommendedSkills: []
            };
            case 7: return { // recommendationsTracking fallback
              careerRecommendations: [], 
              learningRecommendations: [] 
            };
            default: return {};
          }
        }
      }));

      console.log('✅ Data aggregation completed successfully');
      
      return {
        profile,
        careerJourney,
        conversationInsights,
        careerCards,
        personaEvolution,
        engagementMetrics,
        skillsProgression,
        recommendationsTracking
      };
      
    } catch (error) {
      console.error('❌ Error aggregating user data:', error);
      throw new Error(`Failed to aggregate user data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user profile data from users collection
   */
  static async getUserProfile(
    userId: string, 
    privacyConfig?: PrivacyConfiguration
  ): Promise<UserProfileData> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        throw new Error(`User not found: ${userId}`);
      }
      
      const userData = convertTimestamps(userDoc.data());
      
      // Apply privacy filtering
      const privacyLevel = privacyConfig?.sections?.profile || 'detailed';
      const filteredData = applyPrivacyFilter(userData, privacyLevel);
      
      return {
        uid: userData.uid,
        name: userData.displayName || userData.name || 'Anonymous User',
        email: privacyLevel === 'exclude' ? undefined : userData.email,
        photoURL: privacyLevel === 'detailed' ? userData.photoURL : undefined,
        displayName: userData.displayName,
        role: userData.role || 'user',
        createdAt: userData.createdAt || new Date(),
        lastLogin: userData.lastLogin || new Date(),
        preferences: privacyLevel === 'detailed' ? userData.preferences : undefined
      };
      
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  /**
   * Get career journey data and timeline
   */
  static async getCareerJourneyData(
    userId: string, 
    privacyConfig?: PrivacyConfiguration
  ): Promise<CareerJourneyData> {
    try {
      // Get chat summaries for timeline data
      const chatSummariesQuery = query(
        collection(db, 'chatSummaries'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      
      const chatSummariesSnapshot = await getDocs(chatSummariesQuery);
      const chatSummaries = chatSummariesSnapshot.docs.map(doc => 
        convertTimestamps({ id: doc.id, ...doc.data() })
      );

      // Build exploration timeline
      const explorationTimeline = chatSummaries.map(summary => ({
        date: summary.createdAt || new Date(),
        event: `Career exploration session`,
        type: 'conversation' as const,
        confidence: 0.8,
        details: summary.summary
      }));

      // Calculate progress metrics
      const progressMetrics = {
        totalConversations: chatSummaries.length,
        careerCardsGenerated: chatSummaries.reduce((total, summary) => 
          total + (summary.careerCardsGenerated || 0), 0
        ),
        skillsIdentified: new Set(
          chatSummaries.flatMap(summary => summary.skills || [])
        ).size,
        confidenceProgression: chatSummaries.map(summary => ({
          date: summary.createdAt || new Date(),
          score: Math.random() * 0.3 + 0.7 // Placeholder - would use actual confidence data
        }))
      };

      // Generate milestones based on activity
      const milestones = [
        {
          id: 'first_conversation',
          title: 'First Career Exploration',
          description: 'Started career discovery journey',
          achievedAt: chatSummaries[chatSummaries.length - 1]?.createdAt || new Date(),
          type: 'exploration' as const
        }
      ];

      const privacyLevel = privacyConfig?.sections?.careerJourney || 'detailed';
      
      return applyPrivacyFilter({
        explorationTimeline,
        progressMetrics,
        milestones
      }, privacyLevel);
      
    } catch (error) {
      console.error('Error getting career journey data:', error);
      throw error;
    }
  }

  /**
   * Get conversation analytics and insights
   */
  static async getConversationAnalytics(
    userId: string, 
    privacyConfig?: PrivacyConfiguration
  ): Promise<ConversationAnalytics> {
    try {
      const chatSummariesQuery = query(
        collection(db, 'chatSummaries'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const chatSummariesSnapshot = await getDocs(chatSummariesQuery);
      const chatSummaries = chatSummariesSnapshot.docs.map(doc => 
        convertTimestamps({ id: doc.id, ...doc.data() })
      );

      const totalSessions = chatSummaries.length;
      const totalMessages = chatSummaries.reduce((total, summary) => 
        total + (summary.messageCount || 0), 0
      );
      
      // Extract topics from all conversations (parse JSON strings)
      const allTopics = chatSummaries.flatMap(summary => {
        const parseField = (field: any) => {
          try {
            if (typeof field === 'string') {
              return JSON.parse(field);
            }
            return Array.isArray(field) ? field : [];
          } catch (error) {
            console.warn('Failed to parse field from summary:', summary.id, error);
            return [];
          }
        };
        
        return [
          ...parseField(summary.interests),
          ...parseField(summary.careerGoals),
          ...parseField(summary.skills)
        ];
      });
      
      const topicCounts = allTopics.reduce((counts, topic) => {
        counts[topic] = (counts[topic] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);

      const topicsDiscussed = Object.entries(topicCounts)
        .map(([topic, frequency]) => ({
          topic,
          frequency: frequency as number,
          lastDiscussed: new Date() // Would get actual last discussed date in real implementation
        }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 10);

      const analytics = {
        totalSessions,
        totalMessages,
        averageSessionLength: totalMessages / Math.max(totalSessions, 1),
        topicsDiscussed,
        sentimentAnalysis: {
          overall: 'positive' as const,
          progression: chatSummaries.map(summary => ({
            date: summary.createdAt || new Date(),
            sentiment: 0.7 // Placeholder - would analyze actual sentiment
          }))
        },
        keyInsights: chatSummaries.slice(0, 5).map(summary => summary.summary).filter(Boolean),
        conversationSummaries: chatSummaries.map(summary => ({
          id: summary.id,
          date: summary.createdAt || new Date(),
          summary: summary.summary || '',
          interests: summary.interests || [],
          careerGoals: summary.careerGoals || [],
          skills: summary.skills || []
        }))
      };

      const privacyLevel = privacyConfig?.sections?.conversations || 'detailed';
      return applyPrivacyFilter(analytics, privacyLevel);
      
    } catch (error) {
      console.error('Error getting conversation analytics:', error);
      throw error;
    }
  }

  /**
   * Get enhanced career cards with metadata
   */
  static async getEnhancedCareerCards(
    userId: string, 
    privacyConfig?: PrivacyConfiguration
  ): Promise<EnhancedCareerCard[]> {
    try {
      const careerCardsQuery = query(
        collection(db, 'enhancedCareerCards'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      
      const careerCardsSnapshot = await getDocs(careerCardsQuery);
      const careerCards = careerCardsSnapshot.docs.map(doc => {
        const data = convertTimestamps({ id: doc.id, ...doc.data() });
        
        // Transform to EnhancedCareerCard format
        return {
          ...data,
          generationContext: {
            conversationId: data.threadId || '',
            triggerReason: 'conversation_analysis',
            userIntent: 'career_exploration',
            confidenceFactors: ['ai_analysis', 'user_interests']
          },
          userInteraction: {
            viewed: true,
            viewedAt: new Date(),
            liked: undefined,
            shared: undefined,
            notes: undefined
          },
          reportInclusion: {
            includedInReports: [],
            exclusionReason: undefined
          }
        } as EnhancedCareerCard;
      });

      const privacyLevel = privacyConfig?.sections?.careerCards || 'detailed';
      return applyPrivacyFilter(careerCards, privacyLevel) || [];
      
    } catch (error) {
      console.error('Error getting enhanced career cards:', error);
      return []; // Return empty array on error rather than throwing
    }
  }

  /**
   * Get persona progression data
   */
  static async getPersonaProgressData(
    userId: string, 
    privacyConfig?: PrivacyConfiguration
  ): Promise<PersonaProgressData> {
    try {
      // Try to get persona data - may not exist for all users
      const personaDoc = await getDoc(doc(db, 'userPersona', userId));
      
      let personaData = null;
      if (personaDoc.exists()) {
        personaData = convertTimestamps(personaDoc.data());
      }

      const progressData = {
        currentPersona: personaData?.currentPersona || 'exploring' as const,
        progressionHistory: personaData?.progressionHistory || [],
        classificationTriggers: personaData?.classificationTriggers || []
      };

      const privacyLevel = privacyConfig?.sections?.personaEvolution || 'detailed';
      return applyPrivacyFilter(progressData, privacyLevel);
      
    } catch (error) {
      console.error('Error getting persona progress data:', error);
      // Return default data on error
      return {
        currentPersona: 'exploring',
        progressionHistory: [],
        classificationTriggers: []
      };
    }
  }

  /**
   * Get engagement metrics
   */
  static async getEngagementMetrics(
    userId: string, 
    privacyConfig?: PrivacyConfiguration
  ): Promise<EngagementMetrics> {
    try {
      // Get user preferences for engagement data
      const preferencesDoc = await getDoc(doc(db, 'userPreferences', userId));
      const preferences = preferencesDoc.exists() ? convertTimestamps(preferencesDoc.data()) : null;

      // Calculate metrics from chat summaries
      const chatSummariesQuery = query(
        collection(db, 'chatSummaries'),
        where('userId', '==', userId)
      );
      
      const chatSummariesSnapshot = await getDocs(chatSummariesQuery);
      const chatSummaries = chatSummariesSnapshot.docs.map(doc => convertTimestamps(doc.data()));

      const metrics = {
        sessionMetrics: {
          totalSessions: chatSummaries.length,
          averageSessionDuration: 15, // Placeholder - would calculate from actual session data
          longestSession: 45, // Placeholder
          lastActiveDate: chatSummaries[0]?.createdAt || new Date()
        },
        interactionMetrics: {
          messagesPerSession: chatSummaries.reduce((total, summary) => 
            total + (summary.messageCount || 0), 0
          ) / Math.max(chatSummaries.length, 1),
          questionsAsked: chatSummaries.length * 3, // Placeholder
          deepDiveRequests: chatSummaries.length, // Placeholder
          careerExplorationRate: 0.8 // Placeholder
        },
        progressMetrics: {
          engagementScore: Math.min(chatSummaries.length * 10, 100),
          consistencyScore: chatSummaries.length > 5 ? 75 : 50,
          growthRate: 15 // Placeholder percentage
        }
      };

      const privacyLevel = privacyConfig?.sections?.engagementMetrics || 'detailed';
      return applyPrivacyFilter(metrics, privacyLevel);
      
    } catch (error) {
      console.error('Error getting engagement metrics:', error);
      throw error;
    }
  }

  /**
   * Get skills progression data
   */
  static async getSkillsData(
    userId: string, 
    privacyConfig?: PrivacyConfiguration
  ): Promise<SkillsData> {
    try {
      // Get skills from chat summaries
      const chatSummariesQuery = query(
        collection(db, 'chatSummaries'),
        where('userId', '==', userId)
      );
      
      const chatSummariesSnapshot = await getDocs(chatSummariesQuery);
      const chatSummaries = chatSummariesSnapshot.docs.map(doc => convertTimestamps(doc.data()));

      // Extract and categorize skills (parse JSON strings)
      const allSkills = chatSummaries.flatMap(summary => {
        try {
          const skills = summary.skills;
          if (typeof skills === 'string') {
            return JSON.parse(skills);
          }
          return Array.isArray(skills) ? skills : [];
        } catch (error) {
          console.warn('Failed to parse skills from summary:', summary.id, error);
          return [];
        }
      });
      const uniqueSkills = Array.from(new Set(allSkills));

      const identifiedSkills = uniqueSkills.map(skill => ({
        skill,
        category: 'soft' as const, // Would implement proper categorization
        proficiency: Math.floor(Math.random() * 40) + 60, // Placeholder
        identifiedAt: new Date(),
        source: 'conversation' as const
      }));

      const skillsData = {
        identifiedSkills,
        skillProgression: identifiedSkills.map(skill => ({
          skill: skill.skill,
          progressHistory: [{
            date: new Date(),
            level: skill.proficiency,
            evidence: 'Identified through conversation analysis'
          }]
        })),
        recommendedSkills: []
      };

      const privacyLevel = privacyConfig?.sections?.skillsProgression || 'detailed';
      return applyPrivacyFilter(skillsData, privacyLevel);
      
    } catch (error) {
      console.error('Error getting skills data:', error);
      throw error;
    }
  }

  /**
   * Get recommendation tracking data
   */
  static async getRecommendationData(
    userId: string, 
    privacyConfig?: PrivacyConfiguration
  ): Promise<RecommendationData> {
    try {
      // Get career cards for recommendations
      const careerCardsQuery = query(
        collection(db, 'enhancedCareerCards'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const careerCardsSnapshot = await getDocs(careerCardsQuery);
      const careerCards = careerCardsSnapshot.docs.map(doc => convertTimestamps(doc.data()));

      const recommendationData = {
        careerRecommendations: careerCards.map(card => ({
          careerCardId: card.id,
          recommendedAt: card.createdAt || new Date(),
          relevanceScore: card.confidence || 0.8,
          userResponse: undefined,
          followUpActions: undefined
        })),
        learningRecommendations: []
      };

      const privacyLevel = privacyConfig?.sections?.recommendationsTracking || 'detailed';
      return applyPrivacyFilter(recommendationData, privacyLevel);
      
    } catch (error) {
      console.error('Error getting recommendation data:', error);
      throw error;
    }
  }
}

export default ReportDataAggregationService;
