/**
 * Text Conversation Context Service
 * 
 * Provides user context injection for OpenAI text conversations to ensure
 * registered users maintain their journey context across new chat threads.
 */

import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { db } from './firebase';
import { getUserById } from './userService';

export interface UserContextPayload {
  userProfile: {
    name: string;
    interests: string[];
    careerGoals: string[];
    skills: string[];
    workPreferences: any;
  };
  conversationHistory: {
    recentSummaries: string[];
    totalConversations: number;
    keyInsights: string[];
  };
  careerExploration: {
    careerCards: any[];
    careerGoals: string[];
    explorationStage: string;
  };
  contextPrompt: string;
}

export class TextConversationContextService {
  
  /**
   * Build comprehensive user context for text conversations
   */
  async buildUserContext(userId: string): Promise<UserContextPayload | null> {
    try {
      console.log('🔍 Building user context for text conversation:', userId);
      
      // Get user profile data
      const userData = await getUserById(userId);
      if (!userData) {
        console.warn('No user data found for context building');
        return null;
      }

      // Get recent chat summaries
      const recentSummaries = await this.getRecentChatSummaries(userId, 5);
      
      // Get career cards/guidance
      const careerExploration = await this.getCareerExploration(userId);
      
      // Build user profile context
      const userProfile = {
        name: userData.careerProfile?.name || userData.displayName || 'User',
        interests: userData.profile?.interests || [],
        careerGoals: userData.profile?.careerGoals || [],
        skills: userData.profile?.skills || [],
        workPreferences: userData.preferences || {}
      };

      // Build conversation history context
      const conversationHistory = {
        recentSummaries: recentSummaries.map(s => s.summary || ''),
        totalConversations: recentSummaries.length,
        keyInsights: this.extractKeyInsights(recentSummaries)
      };

      // Build comprehensive context prompt
      const contextPrompt = this.buildContextPrompt(userProfile, conversationHistory, careerExploration);

      const contextPayload: UserContextPayload = {
        userProfile,
        conversationHistory,
        careerExploration,
        contextPrompt
      };

      console.log('✅ User context built successfully:', {
        userName: userProfile.name,
        interests: userProfile.interests.length,
        careerGoals: userProfile.careerGoals.length,
        recentConversations: conversationHistory.totalConversations,
        careerCards: careerExploration.careerCards.length,
        contextLength: contextPrompt.length
      });

      return contextPayload;
    } catch (error) {
      console.error('❌ Error building user context:', error);
      return null;
    }
  }

  /**
   * Get recent chat summaries for context
   */
  private async getRecentChatSummaries(userId: string, limitCount: number = 5): Promise<any[]> {
    try {
      const summariesRef = collection(db, 'chatSummaries');
      const summariesQuery = query(
        summariesRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const summariesSnapshot = await getDocs(summariesQuery);
      return summariesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.warn('Could not fetch chat summaries for context:', error);
      return [];
    }
  }

  /**
   * Get career exploration data for context
   */
  private async getCareerExploration(userId: string): Promise<any> {
    try {
      // Get career guidance from threadCareerGuidance
      const guidanceRef = collection(db, 'threadCareerGuidance');
      const guidanceQuery = query(
        guidanceRef,
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc'),
        limit(3)
      );

      const guidanceSnapshot = await getDocs(guidanceQuery);
      const careerCards: any[] = [];
      const careerGoals: string[] = [];

      guidanceSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.guidance?.primaryPathway) {
          careerCards.push({
            title: data.guidance.primaryPathway.title,
            description: data.guidance.primaryPathway.description,
            type: 'primary'
          });
        }
        if (data.guidance?.alternativePathways) {
          data.guidance.alternativePathways.forEach((pathway: any) => {
            careerCards.push({
              title: pathway.title,
              description: pathway.description,
              type: 'alternative'
            });
          });
        }
        if (data.guidance?.careerGoals) {
          careerGoals.push(...data.guidance.careerGoals);
        }
      });

      return {
        careerCards,
        careerGoals: [...new Set(careerGoals)], // Remove duplicates
        explorationStage: careerCards.length > 0 ? 'exploring_options' : 'initial_discovery'
      };
    } catch (error) {
      console.warn('Could not fetch career exploration data:', error);
      return {
        careerCards: [],
        careerGoals: [],
        explorationStage: 'initial_discovery'
      };
    }
  }

  /**
   * Extract key insights from conversation summaries
   */
  private extractKeyInsights(summaries: any[]): string[] {
    const insights: string[] = [];
    
    summaries.forEach(summary => {
      if (summary.interests?.length > 0) {
        insights.push(`Interested in: ${summary.interests.join(', ')}`);
      }
      if (summary.careerGoals?.length > 0) {
        insights.push(`Career goals: ${summary.careerGoals.join(', ')}`);
      }
      if (summary.skills?.length > 0) {
        insights.push(`Skills: ${summary.skills.join(', ')}`);
      }
    });

    return [...new Set(insights)]; // Remove duplicates
  }

  /**
   * Build comprehensive context prompt for OpenAI assistant
   */
  private buildContextPrompt(
    userProfile: any, 
    conversationHistory: any, 
    careerExploration: any
  ): string {
    const contextSections: string[] = [];

    // User profile section
    if (userProfile.name) {
      contextSections.push(`USER PROFILE:
Name: ${userProfile.name}`);
      
      if (userProfile.interests.length > 0) {
        contextSections.push(`Interests: ${userProfile.interests.join(', ')}`);
      }
      
      if (userProfile.careerGoals.length > 0) {
        contextSections.push(`Career Goals: ${userProfile.careerGoals.join(', ')}`);
      }
      
      if (userProfile.skills.length > 0) {
        contextSections.push(`Skills: ${userProfile.skills.join(', ')}`);
      }
    }

    // Conversation history section
    if (conversationHistory.totalConversations > 0) {
      contextSections.push(`\nCONVERSATION HISTORY:
Previous conversations: ${conversationHistory.totalConversations}
Key insights from past discussions: ${conversationHistory.keyInsights.join('; ')}`);
    }

    // Career exploration section
    if (careerExploration.careerCards.length > 0) {
      contextSections.push(`\nCAREER EXPLORATION:
Exploration stage: ${careerExploration.explorationStage}
Career paths explored: ${careerExploration.careerCards.map((card: any) => card.title).join(', ')}`);
      
      if (careerExploration.careerGoals.length > 0) {
        contextSections.push(`Career goals from exploration: ${careerExploration.careerGoals.join(', ')}`);
      }
    }

    // Instructions for assistant behavior
    const instructions = `
CONTEXT INSTRUCTIONS:
This is a returning user who has an established career exploration journey. Use their profile, interests, previous conversations, and career exploration progress to provide personalized guidance. Do not ask basic onboarding questions they've already answered. Continue their journey where they left off and reference their previous discussions and career exploration when relevant.

If this is their first message in a new conversation, acknowledge their return and briefly reference their journey so far before asking how you can help them continue their career exploration.`;

    contextSections.push(instructions);

    return contextSections.join('\n');
  }

  /**
   * Build guest context for users without accounts
   */
  buildGuestContext(): string {
    return `
USER PROFILE:
New user starting their career exploration journey.

CONTEXT INSTRUCTIONS:
This is a new user who hasn't started their career exploration yet. Begin with a warm welcome and guide them through discovering their interests, skills, and career goals. Use an exploratory approach to help them understand their career options.`;
  }
}

export const textConversationContextService = new TextConversationContextService();
export default textConversationContextService;
