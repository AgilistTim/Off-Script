import { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from './firebase';

// Enhanced user context types
export interface UserContext {
  // Basic Identity
  uid: string;
  name: string;
  email: string | null;
  accountType: 'registered' | 'guest';
  
  // Conversation History
  previousSessions: ConversationSummary[];
  totalConversations: number;
  lastActiveDate: Date;
  
  // Discovered Profile (from conversations)
  discoveredInsights: DiscoveredInsights;
  
  // Progress Tracking
  careerCardsGenerated: number;
  topicsExplored: string[];
  engagementLevel: 'new' | 'exploring' | 'focused';
  
  // Agent Context History
  lastAgentUsed: 'exploration' | 'career-deep-dive' | null;
  agentSwitchHistory: AgentSwitchEvent[];
}

export interface ConversationSummary {
  id: string;
  timestamp: Date;
  duration: number; // in minutes
  messageCount: number;
  agentType: 'exploration' | 'career-deep-dive';
  mainTopics: string[];
  insights: DiscoveredInsights;
  careerCardsCreated: number;
}

export interface DiscoveredInsights {
  interests: string[];
  skills: string[];
  careerGoals: string[];
  workPreferences: WorkPreferences;
  confidence: number; // 0-1 overall confidence in the insights
}

export interface WorkPreferences {
  workStyle?: string;
  teamSize?: string;
  industry?: string;
  location?: string;
  remoteWork?: boolean;
  travelWillingness?: string;
}

export interface AgentSwitchEvent {
  timestamp: Date;
  fromAgent: 'exploration' | 'career-deep-dive' | null;
  toAgent: 'exploration' | 'career-deep-dive';
  reason: string;
  context?: any;
}

export interface GuestSessionContext {
  sessionId: string;
  startTime: Date;
  lastActivity: Date;
  discoveredInsights: DiscoveredInsights;
  conversationCount: number;
  agentInteractions: {
    exploration: number;
    careerDeepDive: number;
  };
}

export interface AgentContextPayload {
  personalizedGreeting: string;
  background: string;
  sessionType: 'exploration' | 'deep-dive';
  userInsights: DiscoveredInsights;
  conversationHistory: ConversationSummary[];
  recommendations: string[];
}

export class EnhancedUserContextService {
  
  /**
   * Get comprehensive user context for agent interactions
   */
  async getUserContext(user: FirebaseUser | null): Promise<UserContext | null> {
    if (!user) return null;

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Create new user context for first-time users
        return await this.createUserContext(user);
      }

      const userData = userDoc.data();
      
      // Get recent conversation history
      const conversationHistory = await this.getRecentConversations(user.uid, 10);
      
      // Calculate engagement level
      const engagementLevel = this.calculateEngagementLevel(userData, conversationHistory);
      
      const userContext: UserContext = {
        uid: user.uid,
        name: userData.careerProfile?.name || user.displayName || userData.displayName || 'User',
        email: user.email,
        accountType: 'registered',
        previousSessions: conversationHistory,
        totalConversations: conversationHistory.length,
        lastActiveDate: new Date(userData.lastLogin?.toDate?.() || Date.now()),
        discoveredInsights: userData.discoveredInsights || {
          interests: [],
          skills: [],
          careerGoals: [],
          workPreferences: {},
          confidence: 0
        },
        careerCardsGenerated: userData.careerCardsGenerated || 0,
        topicsExplored: userData.topicsExplored || [],
        engagementLevel,
        lastAgentUsed: userData.lastAgentUsed || null,
        agentSwitchHistory: userData.agentSwitchHistory || []
      };

      return userContext;
    } catch (error) {
      console.error('Error fetching user context:', error);
      return null;
    }
  }

  /**
   * Create initial user context for new users
   */
  private async createUserContext(user: FirebaseUser): Promise<UserContext> {
    const newUserContext: UserContext = {
      uid: user.uid,
      name: user.displayName || 'User',
      email: user.email,
      accountType: 'registered',
      previousSessions: [],
      totalConversations: 0,
      lastActiveDate: new Date(),
      discoveredInsights: {
        interests: [],
        skills: [],
        careerGoals: [],
        workPreferences: {},
        confidence: 0
      },
      careerCardsGenerated: 0,
      topicsExplored: [],
      engagementLevel: 'new',
      lastAgentUsed: null,
      agentSwitchHistory: []
    };

    // Save to Firebase
    await this.saveUserContext(user.uid, newUserContext);
    
    return newUserContext;
  }

  /**
   * Get guest session context (no personal data stored)
   */
  getGuestSessionContext(sessionId: string): GuestSessionContext {
    // For guests, we only track session data in memory/localStorage
    const sessionData = this.getLocalSessionData(sessionId);
    
    return {
      sessionId,
      startTime: sessionData.startTime || new Date(),
      lastActivity: new Date(),
      discoveredInsights: sessionData.insights || {
        interests: [],
        skills: [],
        careerGoals: [],
        workPreferences: {},
        confidence: 0
      },
      conversationCount: sessionData.conversationCount || 0,
      agentInteractions: sessionData.agentInteractions || {
        exploration: 0,
        careerDeepDive: 0
      }
    };
  }

  /**
   * Build agent-specific context for conversation initialization
   */
  async buildAgentContext(
    user: FirebaseUser | null,
    agentType: 'exploration' | 'career-deep-dive',
    careerFocus?: any
  ): Promise<AgentContextPayload> {
    
    if (!user) {
      // Guest user context
      return this.buildGuestAgentContext(agentType);
    }

    const userContext = await this.getUserContext(user);
    if (!userContext) {
      return this.buildGuestAgentContext(agentType);
    }

    return this.buildAuthenticatedAgentContext(userContext, agentType, careerFocus);
  }

  /**
   * Build agent context for guest users
   */
  private buildGuestAgentContext(agentType: 'exploration' | 'career-deep-dive'): AgentContextPayload {
    if (agentType === 'exploration') {
      return {
        personalizedGreeting: "Hi there! I'm here to help you explore career options and discover what interests you.",
        background: "No previous conversation history available.",
        sessionType: 'exploration',
        userInsights: {
          interests: [],
          skills: [],
          careerGoals: [],
          workPreferences: {},
          confidence: 0
        },
        conversationHistory: [],
        recommendations: [
          "Start by sharing what activities or subjects interest you",
          "Tell me about any work experience or skills you have",
          "Describe what you're looking for in a career"
        ]
      };
    } else {
      return {
        personalizedGreeting: "Hello! Let's dive deeper into specific career options that might interest you.",
        background: "Limited context available for career-focused discussion.",
        sessionType: 'deep-dive',
        userInsights: {
          interests: [],
          skills: [],
          careerGoals: [],
          workPreferences: {},
          confidence: 0
        },
        conversationHistory: [],
        recommendations: [
          "Share what specific career or industry interests you",
          "Tell me about your background and experience",
          "Let me know what questions you have about this career path"
        ]
      };
    }
  }

  /**
   * Build agent context for authenticated users
   */
  private buildAuthenticatedAgentContext(
    userContext: UserContext,
    agentType: 'exploration' | 'career-deep-dive',
    careerFocus?: any
  ): AgentContextPayload {
    
    const { name, discoveredInsights, previousSessions, engagementLevel } = userContext;
    
    if (agentType === 'exploration') {
      const greeting = this.buildExplorationGreeting(name, discoveredInsights, engagementLevel);
      const background = this.buildExplorationBackground(discoveredInsights, previousSessions);
      
      return {
        personalizedGreeting: greeting,
        background,
        sessionType: 'exploration',
        userInsights: discoveredInsights,
        conversationHistory: previousSessions,
        recommendations: this.getExplorationRecommendations(discoveredInsights, engagementLevel)
      };
    } else {
      const greeting = this.buildCareerDeepDiveGreeting(name, careerFocus, discoveredInsights);
      const background = this.buildCareerDeepDiveBackground(careerFocus, discoveredInsights, previousSessions);
      
      return {
        personalizedGreeting: greeting,
        background,
        sessionType: 'deep-dive',
        userInsights: discoveredInsights,
        conversationHistory: previousSessions,
        recommendations: this.getCareerDeepDiveRecommendations(careerFocus, discoveredInsights)
      };
    }
  }

  /**
   * Save conversation results and update user context
   */
  async updateUserContextAfterConversation(
    userId: string,
    conversationData: {
      duration: number;
      messageCount: number;
      agentType: 'exploration' | 'career-deep-dive';
      newInsights: DiscoveredInsights;
      careerCardsCreated: number;
      topics: string[];
    }
  ): Promise<void> {
    try {
      const userDocRef = doc(db, 'users', userId);
      
      // Create conversation summary
      const conversationSummary: ConversationSummary = {
        id: `conv_${Date.now()}`,
        timestamp: new Date(),
        duration: conversationData.duration,
        messageCount: conversationData.messageCount,
        agentType: conversationData.agentType,
        mainTopics: conversationData.topics,
        insights: conversationData.newInsights,
        careerCardsCreated: conversationData.careerCardsCreated
      };

      // Save conversation to separate collection
      await setDoc(
        doc(db, 'conversations', conversationSummary.id), 
        {
          ...conversationSummary,
          userId,
          timestamp: serverTimestamp()
        }
      );

      // Update user document with aggregated data
      const userDoc = await getDoc(userDocRef);
      const currentData = userDoc.data() || {};
      
      const updatedInsights = this.mergeInsights(
        currentData.discoveredInsights || { interests: [], skills: [], careerGoals: [], workPreferences: {}, confidence: 0 },
        conversationData.newInsights
      );

      await updateDoc(userDocRef, {
        discoveredInsights: updatedInsights,
        careerCardsGenerated: (currentData.careerCardsGenerated || 0) + conversationData.careerCardsCreated,
        topicsExplored: [...new Set([...(currentData.topicsExplored || []), ...conversationData.topics])],
        lastAgentUsed: conversationData.agentType,
        lastLogin: serverTimestamp()
      });

    } catch (error) {
      console.error('Error updating user context after conversation:', error);
    }
  }

  /**
   * Track agent switching for analytics
   */
  async trackAgentSwitch(
    userId: string,
    fromAgent: 'exploration' | 'career-deep-dive' | null,
    toAgent: 'exploration' | 'career-deep-dive',
    reason: string,
    context?: any
  ): Promise<void> {
    try {
      const switchEvent: AgentSwitchEvent = {
        timestamp: new Date(),
        fromAgent,
        toAgent,
        reason,
        context
      };

      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      const currentData = userDoc.data() || {};
      
      const updatedSwitchHistory = [
        ...(currentData.agentSwitchHistory || []),
        switchEvent
      ].slice(-10); // Keep only last 10 switches

      await updateDoc(userDocRef, {
        agentSwitchHistory: updatedSwitchHistory,
        lastAgentUsed: toAgent
      });

    } catch (error) {
      console.error('Error tracking agent switch:', error);
    }
  }

  // Private helper methods
  private async getRecentConversations(userId: string, limitCount: number = 10): Promise<ConversationSummary[]> {
    try {
      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          timestamp: data.timestamp?.toDate() || new Date()
        } as ConversationSummary;
      });
    } catch (error) {
      console.error('Error fetching recent conversations:', error);
      return [];
    }
  }

  private calculateEngagementLevel(userData: any, conversationHistory: ConversationSummary[]): 'new' | 'exploring' | 'focused' {
    const totalConversations = conversationHistory.length;
    const totalCareerCards = userData.careerCardsGenerated || 0;
    const topicsCount = (userData.topicsExplored || []).length;
    
    if (totalConversations === 0) return 'new';
    if (totalConversations < 3 || totalCareerCards === 0) return 'exploring';
    if (totalConversations >= 3 && (totalCareerCards > 2 || topicsCount > 5)) return 'focused';
    
    return 'exploring';
  }

  private buildExplorationGreeting(name: string, insights: DiscoveredInsights, engagementLevel: 'new' | 'exploring' | 'focused'): string {
    if (engagementLevel === 'new') {
      return `Hi ${name}! Welcome to your career exploration journey. I'm excited to help you discover what interests you!`;
    }
    
    const topInterests = insights.interests.slice(0, 2).join(' and ');
    if (engagementLevel === 'exploring') {
      return `Welcome back, ${name}! ${topInterests ? `Last time we explored ${topInterests}. ` : ''}What would you like to discover today?`;
    }
    
    return `Hi ${name}! You've been making great progress in your career exploration. ${topInterests ? `Building on your interests in ${topInterests}, ` : ''}what new areas shall we explore?`;
  }

  private buildExplorationBackground(insights: DiscoveredInsights, previousSessions: ConversationSummary[]): string {
    const interestCount = insights.interests.length;
    const skillCount = insights.skills.length;
    const sessionCount = previousSessions.length;
    
    if (sessionCount === 0) {
      return "This is our first conversation. I'm here to help you explore career options and discover your interests.";
    }
    
    return `Previous conversations: ${sessionCount}. Discovered interests: ${interestCount}. Identified skills: ${skillCount}. Ready to continue exploring!`;
  }

  private buildCareerDeepDiveGreeting(name: string, careerFocus: any, insights: DiscoveredInsights): string {
    if (careerFocus) {
      return `Hi ${name}! Let's dive deep into ${careerFocus.title || 'this career path'}. I have your background and interests ready to make this discussion really valuable.`;
    }
    
    const topInterests = insights.interests.slice(0, 2).join(' and ');
    return `Hi ${name}! ${topInterests ? `Based on your interests in ${topInterests}, ` : ''}let's explore specific career paths in detail.`;
  }

  private buildCareerDeepDiveBackground(careerFocus: any, insights: DiscoveredInsights, previousSessions: ConversationSummary[]): string {
    const context = [`User has ${insights.interests.length} identified interests`, `${insights.skills.length} recognized skills`];
    
    if (careerFocus) {
      context.push(`Focusing on: ${careerFocus.title}`);
    }
    
    if (previousSessions.length > 0) {
      context.push(`${previousSessions.length} previous conversation sessions`);
    }
    
    return context.join('. ');
  }

  private getExplorationRecommendations(insights: DiscoveredInsights, engagementLevel: 'new' | 'exploring' | 'focused'): string[] {
    if (engagementLevel === 'new') {
      return [
        "Share what activities or subjects genuinely interest you",
        "Tell me about any work experience, projects, or skills you have",
        "Describe what you value in work (helping others, creativity, problem-solving, etc.)"
      ];
    }
    
    const recommendations = [];
    
    if (insights.interests.length < 3) {
      recommendations.push("Let's discover more areas that interest you");
    }
    
    if (insights.skills.length < 3) {
      recommendations.push("Tell me about more of your skills and experiences");
    }
    
    if (insights.careerGoals.length === 0) {
      recommendations.push("What are you hoping to achieve in your career?");
    }
    
    if (recommendations.length === 0) {
      recommendations.push("Ready to generate some personalized career recommendations?");
    }
    
    return recommendations;
  }

  private getCareerDeepDiveRecommendations(careerFocus: any, insights: DiscoveredInsights): string[] {
    return [
      "Ask specific questions about day-to-day responsibilities",
      "Explore required skills and qualifications",
      "Discuss career progression and growth opportunities",
      "Learn about work environment and company culture",
      "Understand salary expectations and job market outlook"
    ];
  }

  private mergeInsights(existing: DiscoveredInsights, newInsights: DiscoveredInsights): DiscoveredInsights {
    return {
      interests: [...new Set([...existing.interests, ...newInsights.interests])],
      skills: [...new Set([...existing.skills, ...newInsights.skills])],
      careerGoals: [...new Set([...existing.careerGoals, ...newInsights.careerGoals])],
      workPreferences: { ...existing.workPreferences, ...newInsights.workPreferences },
      confidence: Math.max(existing.confidence, newInsights.confidence)
    };
  }

  private async saveUserContext(userId: string, context: UserContext): Promise<void> {
    try {
      const userDocRef = doc(db, 'users', userId);
      await setDoc(userDocRef, {
        uid: context.uid,
        displayName: context.name,
        email: context.email,
        discoveredInsights: context.discoveredInsights,
        careerCardsGenerated: context.careerCardsGenerated,
        topicsExplored: context.topicsExplored,
        lastAgentUsed: context.lastAgentUsed,
        agentSwitchHistory: context.agentSwitchHistory,
        // Preserve career profile with name if it exists
        careerProfile: context.name !== (context.name || 'User') ? { 
          name: context.name,
          lastUpdated: new Date().toLocaleDateString()
        } : undefined,
        lastLogin: serverTimestamp(),
        createdAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error saving user context:', error);
    }
  }

  private getLocalSessionData(sessionId: string): any {
    try {
      const sessionData = localStorage.getItem(`guest_session_${sessionId}`);
      return sessionData ? JSON.parse(sessionData) : {};
    } catch {
      return {};
    }
  }
}

// Export singleton instance
export const enhancedUserContextService = new EnhancedUserContextService();