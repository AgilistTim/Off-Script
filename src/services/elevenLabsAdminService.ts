/**
 * ElevenLabs Admin Service
 * 
 * Provides admin-specific functionality for managing ElevenLabs conversations,
 * retrieving audio data, searching transcripts, and generating analytics.
 */

import { 
  collection, 
  collectionGroup, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  getDoc, 
  doc, 
  QuerySnapshot, 
  DocumentData,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { environmentConfig } from '../config/environment';

// Helper function to safely convert various date formats to Date objects
function safeToDate(dateValue: any): Date {
  if (!dateValue) return new Date();
  
  // Firestore Timestamp
  if (dateValue && typeof dateValue.toDate === 'function') {
    return dateValue.toDate();
  }
  
  // ISO string
  if (typeof dateValue === 'string') {
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? new Date() : date;
  }
  
  // JavaScript Date object
  if (dateValue instanceof Date) {
    return dateValue;
  }
  
  // Timestamp in milliseconds
  if (typeof dateValue === 'number') {
    return new Date(dateValue);
  }
  
  // Firestore server timestamp (object with seconds/nanoseconds)
  if (dateValue && typeof dateValue === 'object' && dateValue.seconds) {
    return new Date(dateValue.seconds * 1000);
  }
  
  // Fallback to current date
  return new Date();
}

// Interfaces for admin data structures
export interface ConversationSummary {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
  lastMessage: string;
  lastMessageRole: 'user' | 'assistant';
  participants: string[];
  status: 'active' | 'completed' | 'archived';
  careerCardsGenerated?: number;
  hasAudio?: boolean;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  userId: string;
}

export interface ConversationSearchFilter {
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  messageRole?: 'user' | 'assistant';
  hasCareerCards?: boolean;
  status?: 'active' | 'completed' | 'archived';
}

export interface ConversationAnalytics {
  totalConversations: number;
  totalMessages: number;
  activeUsers: number;
  averageMessagesPerConversation: number;
  averageConversationLength: number; // in minutes
  mostActiveUsers: Array<{
    userId: string;
    userName?: string;
    userEmail?: string;
    conversationCount: number;
    messageCount: number;
    lastActivity: Date;
  }>;
  dailyConversationCounts: Array<{
    date: string;
    count: number;
  }>;
  careerCardMetrics: {
    totalGenerated: number;
    averagePerUser: number;
    popularCareers: Array<{
      title: string;
      count: number;
    }>;
  };
}

export interface AudioRetrievalResult {
  success: boolean;
  audioBlob?: Blob;
  audioUrl?: string;
  error?: string;
}

class ElevenLabsAdminService {
  private apiKey: string;

  constructor() {
    this.apiKey = environmentConfig.elevenLabs.apiKey || '';
    if (!this.apiKey) {
      console.warn('ElevenLabs API key not configured. Audio retrieval will not work.');
    }
  }

  /**
   * Get all conversations with user information for admin dashboard
   * Aggregates both voice (elevenLabsConversations) and text (chatThreads) conversations
   */
  async getAllConversations(limitCount: number = 100): Promise<ConversationSummary[]> {
    try {
      const conversations: ConversationSummary[] = [];

      // Get voice conversations from elevenLabsConversations
      const voiceConversationsRef = collection(db, 'elevenLabsConversations');
      const voiceQuery = query(
        voiceConversationsRef,
        orderBy('updatedAt', 'desc'),
        limit(limitCount)
      );

      const voiceQuerySnapshot = await getDocs(voiceQuery);

      for (const conversationDoc of voiceQuerySnapshot.docs) {
        const data = conversationDoc.data();
        
        // Get user information
        let userName = 'Unknown User';
        let userEmail = 'unknown@example.com';
        
        try {
          if (data.userId) {
            const userDoc = await getDoc(doc(db, 'users', data.userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              userName = userData.displayName || userData.name || 'Unknown User';
              userEmail = userData.email || 'unknown@example.com';
            }
          }
        } catch (userError) {
          console.warn(`Failed to get user data for ${data.userId}:`, userError);
        }

        conversations.push({
          id: conversationDoc.id,
          userId: data.userId || 'unknown',
          userName,
          userEmail,
          messageCount: data.messageCount || 0,
          createdAt: safeToDate(data.createdAt),
          updatedAt: safeToDate(data.updatedAt),
          lastMessage: data.lastMessage || '',
          lastMessageRole: data.lastMessageRole || 'user',
          participants: data.participants || [],
          status: data.status || 'active',
          careerCardsGenerated: data.careerCardsGenerated || 0,
          hasAudio: await this.checkAudioAvailable(conversationDoc.id)
        });
      }

      // Get text conversations from chatThreads
      const textThreadsRef = collection(db, 'chatThreads');
      const textQuery = query(
        textThreadsRef,
        orderBy('updatedAt', 'desc'),
        limit(limitCount)
      );

      const textQuerySnapshot = await getDocs(textQuery);

      for (const threadDoc of textQuerySnapshot.docs) {
        const data = threadDoc.data();
        
        // Get message count from messages subcollection
        const messagesRef = collection(db, 'chatThreads', threadDoc.id, 'messages');
        const messagesSnapshot = await getDocs(messagesRef);
        const messageCount = messagesSnapshot.size;

        // Get user information
        let userName = 'Unknown User';
        let userEmail = 'unknown@example.com';
        
        try {
          if (data.userId) {
            const userDoc = await getDoc(doc(db, 'users', data.userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              userName = userData.displayName || userData.name || 'Unknown User';
              userEmail = userData.email || 'unknown@example.com';
            }
          }
        } catch (userError) {
          console.warn(`Failed to get user data for ${data.userId}:`, userError);
        }

        conversations.push({
          id: threadDoc.id,
          userId: data.userId || 'unknown',
          userName,
          userEmail,
          messageCount: messageCount,
          createdAt: safeToDate(data.createdAt),
          updatedAt: safeToDate(data.updatedAt),
          lastMessage: data.lastMessage || '',
          lastMessageRole: 'user', // Default for text threads
          participants: [data.userId || 'unknown'],
          status: 'active', // Text threads are typically active
          careerCardsGenerated: 0, // Career cards are tracked separately in threadCareerGuidance
          hasAudio: false // Text threads don't have audio
        });
      }

      // Sort all conversations by most recent activity and limit results
      conversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      return conversations.slice(0, limitCount);

    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw new Error(`Failed to fetch conversations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get conversation transcript with all messages (supports both voice and text conversations)
   * Note: This supports both elevenLabsConversations and chatThreads
   */
  async getConversationTranscript(conversationId: string): Promise<ConversationMessage[]> {
    try {
      // First try voice conversations (elevenLabsConversations)
      try {
        const voiceMessagesRef = collection(db, 'elevenLabsConversations', conversationId, 'messages');
        const voiceQuery = query(voiceMessagesRef, orderBy('timestamp', 'asc'));
        const voiceMessagesSnapshot = await getDocs(voiceQuery);

        if (!voiceMessagesSnapshot.empty) {
          return voiceMessagesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              role: data.role,
              content: data.content,
              timestamp: safeToDate(data.timestamp),
              userId: data.userId
            };
          });
        }
      } catch (voiceError) {
        console.log('No voice conversation found, trying text conversation...');
      }

      // If no voice conversation found, try text conversations (chatThreads)
      const textMessagesRef = collection(db, 'chatThreads', conversationId, 'messages');
      const textQuery = query(textMessagesRef, orderBy('timestamp', 'asc'));
      const textMessagesSnapshot = await getDocs(textQuery);

      return textMessagesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          role: data.role,
          content: data.content,
          timestamp: safeToDate(data.timestamp),
          userId: data.userId || 'unknown'
        };
      });
    } catch (error) {
      console.error('Error getting conversation transcript:', error);
      throw new Error(`Failed to get transcript: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search conversations across all content using Firebase queries
   */
  async searchConversations(
    searchQuery: string, 
    filters: ConversationSearchFilter = {},
    limitCount: number = 50
  ): Promise<ConversationSummary[]> {
    try {
      // Search in message content using collectionGroup
      const messagesQuery = collectionGroup(db, 'messages');
      let q = query(messagesQuery);

      // Apply content search filter
      if (searchQuery.trim()) {
        // Firebase doesn't support full-text search, so we'll do prefix matching
        q = query(
          messagesQuery,
          where('content', '>=', searchQuery),
          where('content', '<=', searchQuery + '\uf8ff'),
          orderBy('content'),
          limit(limitCount)
        );
      }

      // Apply role filter if specified
      if (filters.messageRole) {
        q = query(q, where('role', '==', filters.messageRole));
      }

      const searchResults = await getDocs(q);
      const conversationIds = new Set<string>();

      // Extract unique conversation IDs from search results
      searchResults.docs.forEach(doc => {
        const conversationId = doc.ref.parent.parent?.id;
        if (conversationId) {
          conversationIds.add(conversationId);
        }
      });

      // Get full conversation details for matching conversations
      const conversations: ConversationSummary[] = [];
      
      for (const conversationId of conversationIds) {
        try {
          const conversationDoc = await getDoc(doc(db, 'elevenLabsConversations', conversationId));
          
          if (conversationDoc.exists()) {
            const data = conversationDoc.data();
            
            // Apply additional filters
            if (filters.userId && data.userId !== filters.userId) continue;
            if (filters.status && data.status !== filters.status) continue;
            if (filters.dateFrom && data.createdAt?.toDate() < filters.dateFrom) continue;
            if (filters.dateTo && data.createdAt?.toDate() > filters.dateTo) continue;

            // Get user information
            let userName = 'Unknown User';
            let userEmail = 'unknown@example.com';
            
            try {
              if (data.userId) {
                const userDoc = await getDoc(doc(db, 'users', data.userId));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  userName = userData.displayName || userData.name || 'Unknown User';
                  userEmail = userData.email || 'unknown@example.com';
                }
              }
            } catch (userError) {
              console.warn(`Failed to get user data for ${data.userId}:`, userError);
            }

            conversations.push({
              id: conversationDoc.id,
              userId: data.userId || 'unknown',
              userName,
              userEmail,
              messageCount: data.messageCount || 0,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              lastMessage: data.lastMessage || '',
              lastMessageRole: data.lastMessageRole || 'user',
              participants: data.participants || [],
              status: data.status || 'active',
              careerCardsGenerated: data.careerCardsGenerated || 0,
              hasAudio: await this.checkAudioAvailable(conversationDoc.id)
            });
          }
        } catch (convError) {
          console.warn(`Failed to get conversation ${conversationId}:`, convError);
        }
      }

      return conversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (error) {
      console.error('Error searching conversations:', error);
      throw new Error(`Failed to search conversations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get conversation audio from ElevenLabs API
   */
  async getConversationAudio(conversationId: string): Promise<AudioRetrievalResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'ElevenLabs API key not configured'
      };
    }

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`, {
        method: 'GET',
        headers: {
          'xi-api-key': this.apiKey,
          'Accept': 'audio/mpeg'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ElevenLabs API error:', response.status, errorText);
        return {
          success: false,
          error: `API error: ${response.status} - ${errorText}`
        };
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      return {
        success: true,
        audioBlob,
        audioUrl
      };
    } catch (error) {
      console.error('Error retrieving conversation audio:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if audio is available for a conversation
   */
  private async checkAudioAvailable(conversationId: string): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`, {
        method: 'HEAD',
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get comprehensive analytics for admin dashboard
   */
  async getConversationAnalytics(daysPeriod: number = 30): Promise<ConversationAnalytics> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysPeriod);

      // Get all conversations in the period
      const conversationsRef = collection(db, 'elevenLabsConversations');
      const conversationsQuery = query(
        conversationsRef,
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        orderBy('createdAt', 'desc')
      );

      const conversationsSnapshot = await getDocs(conversationsQuery);
      const conversations = conversationsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId || 'unknown',
          userName: data.userName || 'Unknown User',
          userEmail: data.userEmail || 'unknown@example.com',
          messageCount: data.messageCount || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastMessage: data.lastMessage || '',
          lastMessageRole: data.lastMessageRole || 'user',
          participants: data.participants || [],
          status: data.status || 'active',
          careerCardsGenerated: data.careerCardsGenerated || 0,
          hasAudio: false // We'll skip audio check for analytics for performance
        } as ConversationSummary;
      });

      // Calculate basic metrics
      const totalConversations = conversations.length;
      const totalMessages = conversations.reduce((sum, conv) => sum + (conv.messageCount || 0), 0);
      const uniqueUsers = new Set(conversations.map(conv => conv.userId)).size;
      const averageMessagesPerConversation = totalConversations > 0 ? totalMessages / totalConversations : 0;

      // Get user activity data
      const userActivity = new Map<string, {
        conversationCount: number;
        messageCount: number;
        lastActivity: Date;
        userName?: string;
        userEmail?: string;
      }>();

      for (const conv of conversations) {
        const userId = conv.userId;
        if (!userId) continue;

        const existing = userActivity.get(userId) || {
          conversationCount: 0,
          messageCount: 0,
          lastActivity: new Date(0)
        };

        existing.conversationCount += 1;
        existing.messageCount += conv.messageCount || 0;
        
        const convDate = conv.updatedAt || new Date();
        if (convDate > existing.lastActivity) {
          existing.lastActivity = convDate;
        }

        userActivity.set(userId, existing);
      }

      // Get user names for most active users
      const mostActiveUserIds = Array.from(userActivity.entries())
        .sort(([,a], [,b]) => b.conversationCount - a.conversationCount)
        .slice(0, 10)
        .map(([userId]) => userId);

      for (const userId of mostActiveUserIds) {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const activity = userActivity.get(userId)!;
            activity.userName = userData.displayName || userData.name || 'Unknown User';
            activity.userEmail = userData.email || 'unknown@example.com';
          }
        } catch (error) {
          console.warn(`Failed to get user data for ${userId}:`, error);
        }
      }

      const mostActiveUsers = Array.from(userActivity.entries())
        .sort(([,a], [,b]) => b.conversationCount - a.conversationCount)
        .slice(0, 10)
        .map(([userId, data]) => ({
          userId,
          userName: data.userName || 'Unknown User',
          userEmail: data.userEmail || 'unknown@example.com',
          conversationCount: data.conversationCount,
          messageCount: data.messageCount,
          lastActivity: data.lastActivity
        }));

      // Calculate daily conversation counts
      const dailyCounts = new Map<string, number>();
      conversations.forEach(conv => {
        const date = conv.createdAt?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0];
        dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1);
      });

      const dailyConversationCounts = Array.from(dailyCounts.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Career card metrics (placeholder - would need to implement career card tracking)
      const careerCardMetrics = {
        totalGenerated: conversations.reduce((sum, conv) => sum + (conv.careerCardsGenerated || 0), 0),
        averagePerUser: uniqueUsers > 0 ? conversations.reduce((sum, conv) => sum + (conv.careerCardsGenerated || 0), 0) / uniqueUsers : 0,
        popularCareers: [] // Would need to implement career card aggregation
      };

      return {
        totalConversations,
        totalMessages,
        activeUsers: uniqueUsers,
        averageMessagesPerConversation,
        averageConversationLength: 5, // Placeholder - would need actual duration tracking
        mostActiveUsers,
        dailyConversationCounts,
        careerCardMetrics
      };
    } catch (error) {
      console.error('Error generating conversation analytics:', error);
      throw new Error(`Failed to generate analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user-specific conversation data for enhanced user management
   * Aggregates both voice (elevenLabsConversations) and text (chatThreads/chatSummaries) data
   */
  async getUserConversationData(userId: string): Promise<{
    conversationCount: number;
    messageCount: number;
    lastActivity: Date | null;
    careerCardsGenerated: number;
    conversations: ConversationSummary[];
  }> {
    try {
      // Get voice conversations from elevenLabsConversations
      const voiceConversationsRef = collection(db, 'elevenLabsConversations');
      const voiceConversationsQuery = query(
        voiceConversationsRef,
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      );

      const voiceConversationsSnapshot = await getDocs(voiceConversationsQuery);
      const conversations: ConversationSummary[] = [];
      let totalMessages = 0;
      let totalCareerCards = 0;
      let lastActivity: Date | null = null;

      // Process voice conversations
      for (const conversationDoc of voiceConversationsSnapshot.docs) {
        const data = conversationDoc.data();
        
        const conversation: ConversationSummary = {
          id: conversationDoc.id,
          userId: data.userId || userId,
          userName: 'User', // Will be filled by caller if needed
          userEmail: '', // Will be filled by caller if needed
          messageCount: data.messageCount || 0,
          createdAt: safeToDate(data.createdAt),
          updatedAt: safeToDate(data.updatedAt),
          lastMessage: data.lastMessage || '',
          lastMessageRole: data.lastMessageRole || 'user',
          participants: data.participants || [],
          status: data.status || 'active',
          careerCardsGenerated: data.careerCardsGenerated || 0,
          hasAudio: await this.checkAudioAvailable(conversationDoc.id)
        };

        conversations.push(conversation);
        totalMessages += conversation.messageCount;
        totalCareerCards += conversation.careerCardsGenerated || 0;
        
        if (!lastActivity || conversation.updatedAt > lastActivity) {
          lastActivity = conversation.updatedAt;
        }
      }

      // Get text conversations from chatThreads
      const textThreadsRef = collection(db, 'chatThreads');
      const textThreadsQuery = query(
        textThreadsRef,
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      );

      const textThreadsSnapshot = await getDocs(textThreadsQuery);

      // Process text conversations
      for (const threadDoc of textThreadsSnapshot.docs) {
        const data = threadDoc.data();
        
        // Get message count from messages subcollection
        const messagesRef = collection(db, 'chatThreads', threadDoc.id, 'messages');
        const messagesSnapshot = await getDocs(messagesRef);
        const messageCount = messagesSnapshot.size;

        // Convert text thread to ConversationSummary format
        const conversation: ConversationSummary = {
          id: threadDoc.id,
          userId: data.userId || userId,
          userName: 'User', // Will be filled by caller if needed
          userEmail: '', // Will be filled by caller if needed
          messageCount: messageCount,
          createdAt: safeToDate(data.createdAt),
          updatedAt: safeToDate(data.updatedAt),
          lastMessage: data.lastMessage || '',
          lastMessageRole: 'user', // Default for text threads
          participants: [data.userId || userId],
          status: 'active', // Text threads are typically active
          careerCardsGenerated: 0, // Career cards are tracked separately in threadCareerGuidance
          hasAudio: false // Text threads don't have audio
        };

        conversations.push(conversation);
        totalMessages += messageCount;
        
        if (!lastActivity || conversation.updatedAt > lastActivity) {
          lastActivity = conversation.updatedAt;
        }
      }

      // Get career cards from threadCareerGuidance and chatSummaries
      const careerGuidanceRef = collection(db, 'threadCareerGuidance');
      const careerGuidanceQuery = query(
        careerGuidanceRef,
        where('userId', '==', userId)
      );

      const careerGuidanceSnapshot = await getDocs(careerGuidanceQuery);
      for (const guidanceDoc of careerGuidanceSnapshot.docs) {
        const data = guidanceDoc.data();
        if (data.guidance?.primaryPathway) totalCareerCards++;
        if (data.guidance?.alternativePathways?.length) {
          totalCareerCards += data.guidance.alternativePathways.length;
        }
      }

      // Sort conversations by most recent activity
      conversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      return {
        conversationCount: conversations.length,
        messageCount: totalMessages,
        lastActivity,
        careerCardsGenerated: totalCareerCards,
        conversations
      };
    } catch (error) {
      console.error('Error getting user conversation data:', error);
      throw new Error(`Failed to get user conversation data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export conversation data for a user (GDPR compliance)
   */
  async exportUserConversationData(userId: string): Promise<{
    user: { id: string; exportedAt: string };
    conversations: any[];
    messages: any[];
  }> {
    try {
      const userData = await this.getUserConversationData(userId);
      const allMessages: any[] = [];

      // Get all messages for all user conversations
      for (const conversation of userData.conversations) {
        const messages = await this.getConversationTranscript(conversation.id);
        allMessages.push(...messages.map(msg => ({
          ...msg,
          conversationId: conversation.id
        })));
      }

      return {
        user: {
          id: userId,
          exportedAt: new Date().toISOString()
        },
        conversations: userData.conversations,
        messages: allMessages
      };
    } catch (error) {
      console.error('Error exporting user conversation data:', error);
      throw new Error(`Failed to export user data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const elevenLabsAdminService = new ElevenLabsAdminService();
export default elevenLabsAdminService;
