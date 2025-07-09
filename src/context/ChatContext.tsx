import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { 
  ChatMessage, 
  ChatThread as ChatThreadBase,
  ChatSummary,
  createThread, 
  createChatThreadInFirestore, 
  getUserChatThreads, 
  sendMessage as sendMessageToAssistant, 
  storeMessage, 
  getChatMessages,
  getVideoRecommendationsFromChat,
  deleteChatThread,
  updateChatThreadTitle,
  regenerateChatSummary,
  hasEnoughContentForSummary
} from '../services/chatService';
import { db, getFirebaseFunctionUrl } from '../services/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit, 
  getDocs, 
  DocumentData, 
  onSnapshot,
  Timestamp,
  doc,
  getDoc
} from 'firebase/firestore';

// OpenAI Assistant ID
const ASSISTANT_ID = 'asst_b6kBes7rHBC9gA4yJ9I5r5zm';

// Extend the ChatThread interface to include threadId
interface ChatThread extends ChatThreadBase {
  threadId: string;
}

interface ChatContextType {
  currentThread: ChatThread | null;
  messages: ChatMessage[];
  threads: ChatThread[];
  isLoading: boolean;
  isTyping: boolean;
  hasRecommendations: boolean;
  newRecommendations: boolean;
  currentSummary: ChatSummary | null;
  summaryUpdated: boolean;
  sendMessage: (message: string) => Promise<void>;
  createNewThread: () => Promise<string | undefined>;
  selectThread: (threadId: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  getRecommendedVideos: (limit?: number) => Promise<string[]>;
  clearNewRecommendationsFlag: () => void;
  clearSummaryUpdatedFlag: () => void;
  regenerateSummary: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [currentThread, setCurrentThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [hasRecommendations, setHasRecommendations] = useState<boolean>(false);
  const [newRecommendations, setNewRecommendations] = useState<boolean>(false);
  const [currentSummary, setCurrentSummary] = useState<ChatSummary | null>(null);
  const [summaryUpdated, setSummaryUpdated] = useState<boolean>(false);
  
  // Fetch user's chat threads
  const fetchThreads = useCallback(async () => {
    if (!currentUser) {
      setThreads([]);
      setIsLoading(false);
      return;
    }
    
    try {
      const userThreads = await getUserChatThreads(currentUser.uid);
      
      // Ensure all threads have a threadId property
      const processedThreads = userThreads.map(thread => ({
        ...thread,
        threadId: thread.threadId || ''
      }));
      
      setThreads(processedThreads);
      
      // If there's at least one thread and no current thread is selected,
      // select the first thread, but don't throw an error if it fails
      if (processedThreads.length > 0 && !currentThread) {
        try {
          const threadToSelect = processedThreads[0];
          setCurrentThread(threadToSelect);
          // Load messages for this thread
          const threadMessages = await getChatMessages(threadToSelect.id);
          setMessages(threadMessages);
          
          // Fetch the current summary for this thread
          await fetchThreadSummary(threadToSelect.id);
        } catch (error) {
          console.warn('Could not select initial thread:', error);
          // Don't rethrow, just continue
        }
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching chat threads:', error);
      setIsLoading(false);
    }
  }, [currentUser, currentThread]);
  
  // Load threads when user changes
  useEffect(() => {
    setIsLoading(true);
    fetchThreads();
  }, [currentUser, fetchThreads]);
  
  // Set up real-time listener for chat threads
  useEffect(() => {
    if (!currentUser) return;
    
    // Create a query for this user's chat threads
    const threadsRef = collection(db, 'chatThreads');
    const threadsQuery = query(
      threadsRef,
      where('userId', '==', currentUser.uid),
      orderBy('updatedAt', 'desc')
    );
    
    // Set up the listener
    const unsubscribe = onSnapshot(threadsQuery, (snapshot) => {
      const updatedThreads = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          title: data.title,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
          summary: data.summary,
          lastMessage: data.lastMessage,
          threadId: data.threadId
        } as ChatThread;
      });
      
      setThreads(updatedThreads);
    }, (error) => {
      console.error('Error in threads listener:', error);
    });
    
    // Clean up listener on unmount
    return () => unsubscribe();
  }, [currentUser]);
  
  // Fetch the chat summary for a thread
  const fetchThreadSummary = async (threadId: string) => {
    if (!currentUser) return null;
    
    try {
      // Query Firestore for the latest summary for this thread
      const summariesRef = collection(db, 'chatSummaries');
      const q = query(
        summariesRef,
        where('threadId', '==', threadId),
        orderBy('createdAt', 'desc'),
        firestoreLimit(1)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('No summary found for thread:', threadId);
        setCurrentSummary(null);
        return null;
      }
      
      const summaryDoc = snapshot.docs[0];
      const summaryData = summaryDoc.data();
      
      const summary: ChatSummary = {
        id: summaryDoc.id,
        threadId: summaryData.threadId,
        userId: summaryData.userId,
        summary: summaryData.summary || '',
        interests: summaryData.interests || [],
        careerGoals: summaryData.careerGoals || [],
        skills: summaryData.skills || [],
        createdAt: summaryData.createdAt?.toDate() || new Date(),
        learningPaths: summaryData.learningPaths || [],
        reflectiveQuestions: summaryData.reflectiveQuestions || [],
        enriched: summaryData.enriched || false
      };
      
      console.log('Fetched summary for thread:', threadId, summary);
      setCurrentSummary(summary);
      return summary;
    } catch (error) {
      console.error('Error fetching thread summary:', error);
      setCurrentSummary(null);
      return null;
    }
  };
  
  // Set up real-time listener for the current thread's summary
  useEffect(() => {
    if (!currentUser || !currentThread) return;
    
    // Create a query for this thread's summaries
    const summariesRef = collection(db, 'chatSummaries');
    const summariesQuery = query(
      summariesRef,
      where('threadId', '==', currentThread.id),
      orderBy('createdAt', 'desc'),
      firestoreLimit(1)
    );
    
    // Set up the listener
    const unsubscribe = onSnapshot(summariesQuery, async (snapshot) => {
      if (snapshot.empty) {
        console.log('No summary found in real-time listener');
        return;
      }
      
      const summaryDoc = snapshot.docs[0];
      const summaryData = summaryDoc.data();
      
      const summary: ChatSummary = {
        id: summaryDoc.id,
        threadId: summaryData.threadId,
        userId: summaryData.userId,
        summary: summaryData.summary || '',
        interests: summaryData.interests || [],
        careerGoals: summaryData.careerGoals || [],
        skills: summaryData.skills || [],
        createdAt: summaryData.createdAt?.toDate() || new Date(),
        learningPaths: summaryData.learningPaths || [],
        reflectiveQuestions: summaryData.reflectiveQuestions || [],
        enriched: summaryData.enriched || false
      };
      
      console.log('Real-time summary update:', summary);
      setCurrentSummary(summary);
      setSummaryUpdated(true);
      
      // Auto-update thread title based on summary
      try {
        await updateChatThreadTitle(currentThread.id, summary);
        // Refresh threads to show updated title
        fetchThreads();
      } catch (error) {
        console.error('Error updating chat thread title:', error);
      }
      
      // If the summary was enriched, check for recommendations
      if (summary.enriched) {
        getRecommendedVideos(1).then(videos => {
          setHasRecommendations(videos.length > 0);
          if (videos.length > 0) {
            setNewRecommendations(true);
          }
        }).catch(error => {
          console.error('Error checking for recommendations after summary update:', error);
        });
      }
    }, (error) => {
      console.error('Error in summary listener:', error);
    });
    
    // Clean up listener on unmount or when thread changes
    return () => unsubscribe();
  }, [currentUser, currentThread, fetchThreads]);
  
  // Set up real-time listener for messages in the current thread
  useEffect(() => {
    if (!currentThread) return;
    
    const messagesRef = collection(db, 'chatThreads', currentThread.id, 'messages');
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
    
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const updatedMessages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          content: data.content,
          role: data.role,
          timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(),
          threadId: data.threadId,
          runId: data.runId
        } as ChatMessage;
      });
      
      setMessages(updatedMessages);
    }, (error) => {
      console.error('Error in messages listener:', error);
    });
    
    return () => unsubscribe();
  }, [currentThread]);
  
  // Create a new thread
  const createNewThread = async () => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      
      // Create OpenAI thread
      const openAIThreadId = await createThread();
      console.log('Created OpenAI thread:', openAIThreadId);
      
      // Create Firestore thread
      const firestoreThreadId = await createChatThreadInFirestore(
        currentUser.uid, 
        openAIThreadId,
        'New Conversation'
      );
      
      console.log('Created Firestore thread:', firestoreThreadId, 'with OpenAI threadId:', openAIThreadId);
      
      // Create thread object immediately
      const newThread: ChatThread = {
        id: firestoreThreadId,
        threadId: openAIThreadId,
        userId: currentUser.uid,
        title: 'New Conversation',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setCurrentThread(newThread);
      
      // Clear messages and summary
      setMessages([]);
      setCurrentSummary(null);
      
      // Reset recommendations state for new thread
      setHasRecommendations(false);
      setNewRecommendations(false);
      
      setIsLoading(false);
      
      // Refresh threads list
      fetchThreads();
      
      return firestoreThreadId;
    } catch (error) {
      console.error('Error creating new thread:', error);
      setIsLoading(false);
      throw error;
    }
  };
  
  // Select a thread
  const selectThread = async (threadId: string) => {
    if (!currentUser) return;
    
    try {
      const thread = threads.find(t => t.id === threadId);
      if (!thread) {
        throw new Error('Thread not found');
      }
      
      // Ensure the thread has a valid OpenAI threadId
      if (!thread.threadId) {
        console.error('Thread is missing OpenAI threadId:', thread);
        throw new Error('Thread is missing OpenAI threadId');
      }
      
      console.log('Selected thread:', thread);
      setCurrentThread(thread);
      
      // Load messages (the real-time listener will handle this, but load immediately for faster UX)
      setIsLoading(true);
      const threadMessages = await getChatMessages(threadId);
      setMessages(threadMessages);
      
      // Fetch the thread summary
      await fetchThreadSummary(threadId);
      
      setIsLoading(false);
      
      // Check if this thread has recommendations
      try {
        const recommendations = await getVideoRecommendationsFromChat(currentUser.uid, threadId, 1);
        setHasRecommendations(recommendations.length > 0);
        setNewRecommendations(false); // Reset new recommendations flag when switching threads
      } catch (error) {
        console.error('Error checking for recommendations:', error);
        setHasRecommendations(false);
      }
    } catch (error) {
      console.error('Error selecting thread:', error);
      setIsLoading(false);
    }
  };
  
  // Send a message
  const sendMessage = async (message: string) => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    let threadToUse = currentThread;
    
    if (!threadToUse) {
      // Create a new thread if one doesn't exist
      try {
        setIsLoading(true);
        
        // Create OpenAI thread
        const openAIThreadId = await createThread();
        console.log('Created OpenAI thread:', openAIThreadId);
        
        // Create Firestore thread
        const firestoreThreadId = await createChatThreadInFirestore(
          currentUser.uid, 
          openAIThreadId,
          'New Conversation'
        );
        
        console.log('Created Firestore thread:', firestoreThreadId, 'with OpenAI threadId:', openAIThreadId);
        
        // Create a thread object directly instead of waiting for state update
        threadToUse = {
          id: firestoreThreadId,
          threadId: openAIThreadId,
          userId: currentUser.uid,
          title: 'New Conversation',
          createdAt: new Date(),
          updatedAt: new Date(),
          lastMessage: ''
        };
        
        // Update state
        setCurrentThread(threadToUse);
        setIsLoading(false);
        
        // Also fetch threads to update the list
        fetchThreads();
      } catch (error) {
        console.error('Error creating thread for message:', error);
        setIsLoading(false);
        throw new Error('Failed to create thread');
      }
    }
    
    // Double-check that we have a valid thread with OpenAI threadId
    if (!threadToUse || !threadToUse.threadId) {
      console.error('Thread or threadId is missing:', threadToUse);
      throw new Error('OpenAI thread ID is missing');
    }
    
    try {
      // Store user message in Firestore
      const threadId = threadToUse.id;
      const openAIThreadId = threadToUse.threadId;
      
      console.log('Sending message with OpenAI threadId:', openAIThreadId);
      
      await storeMessage(threadId, message, 'user', openAIThreadId);
      
      // Show typing indicator
      setIsTyping(true);
      
      // Send message to OpenAI Assistant
      const response = await sendMessageToAssistant(openAIThreadId, message);
      
      // Store assistant response in Firestore
      await storeMessage(
        threadId, 
        response.content, 
        'assistant', 
        openAIThreadId, 
        response.runId
      );
      
      setIsTyping(false);
      
      // The real-time listener will handle updating the messages state
      
      // Check if we should generate a summary and recommendations after each message
      try {
        // Check if thread has enough content for a meaningful summary
        const hasEnoughContent = await hasEnoughContentForSummary(threadId);
        
        if (hasEnoughContent && !currentSummary) {
          // Try to generate a summary if we don't have one and there's enough content
          try {
            await regenerateChatSummary(threadId, currentUser.uid);
            console.log('Auto-generated summary after message');
            // Fetch the newly generated summary
            await fetchThreadSummary(threadId);
          } catch (summaryError) {
            console.log('Summary generation skipped - not enough content yet:', summaryError instanceof Error ? summaryError.message : 'Unknown error');
          }
        } else {
          // Fetch the updated summary to refresh if it exists
          await fetchThreadSummary(threadId);
        }
        
        const recommendations = await getVideoRecommendationsFromChat(currentUser.uid, threadId, 1);
        const hasRecs = recommendations.length > 0;
        
        // Only set newRecommendations to true if we didn't have recommendations before
        // but now we do
        if (hasRecs && !hasRecommendations) {
          setNewRecommendations(true);
        }
        
        setHasRecommendations(hasRecs);
      } catch (error) {
        console.error('Error checking for recommendations:', error);
      }
      
      // Refresh threads to get updated lastMessage
      fetchThreads();
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      throw error;
    }
  };
  
  // Get recommended videos based on the current thread
  const getRecommendedVideos = async (limit: number = 5): Promise<string[]> => {
    if (!currentUser) return [];
    
    try {
      // If we have a current summary with interests, use it for personalized recommendations
      if (currentSummary && (currentSummary.interests.length > 0 || currentSummary.skills.length > 0)) {
        const { getPersonalizedRecommendations } = await import('../services/videoService');
        
        // Use the new personalized recommendations function
        const recommendedVideos = await getPersonalizedRecommendations(currentUser.uid, {
          limit,
          includeWatched: false,
          chatSummaryId: currentSummary.id
        });
        
        // If we got recommendations, return the IDs
        if (recommendedVideos.length > 0) {
          setHasRecommendations(true);
          return recommendedVideos.map(video => video.id);
        }
      }
      
      // If we don't have a summary or the personalized recommendations failed,
      // fall back to the video recommendations from chat
      
      // Use the utility function to get the correct URL
      const functionUrl = getFirebaseFunctionUrl('getVideoRecommendations');
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser.uid,
          interests: currentSummary?.interests || [],
          careerGoals: currentSummary?.careerGoals || [],
          skills: currentSummary?.skills || [],
          limit
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const videoIds = data.videoIds || [];
      
      if (videoIds.length > 0) {
        setHasRecommendations(true);
      }
      
      return videoIds;
    } catch (error) {
      console.error('Error getting video recommendations:', error);
      
      // If all else fails, try to get recommendations from the video service
      try {
        const { getRecommendedVideos, getPopularVideos } = await import('../services/videoService');
        
        // Try to get user data for recommendations
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnapshot = await getDoc(userDocRef);
        
        if (userDocSnapshot.exists()) {
          const userData = userDocSnapshot.data() as any;
          const videos = await getRecommendedVideos(userData, limit);
          return videos.map(video => video.id);
        } else {
          // Fall back to popular videos
          const videos = await getPopularVideos(limit);
          return videos.map(video => video.id);
        }
      } catch (fallbackError) {
        console.error('Error in fallback recommendations:', fallbackError);
        return [];
      }
    }
  };
  
  // Clear the new recommendations flag
  const clearNewRecommendationsFlag = () => {
    setNewRecommendations(false);
  };
  
  // Clear the summary updated flag
  const clearSummaryUpdatedFlag = () => {
    setSummaryUpdated(false);
  };

  // Delete a thread
  const deleteThread = async (threadId: string) => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      
      // If we're deleting the current thread, clear it first
      if (currentThread?.id === threadId) {
        setCurrentThread(null);
        setMessages([]);
        setCurrentSummary(null);
        setHasRecommendations(false);
        setNewRecommendations(false);
      }
      
      // Delete the thread and all associated data
      await deleteChatThread(threadId, currentUser.uid);
      
      // Refresh the threads list
      await fetchThreads();
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error deleting thread:', error);
      setIsLoading(false);
      throw error;
    }
  };

  // Regenerate the current thread's summary
  const regenerateSummary = async () => {
    if (!currentUser || !currentThread) return;

    try {
      setIsLoading(true);
      await regenerateChatSummary(currentThread.id, currentUser.uid);
      setSummaryUpdated(true); // Indicate that the summary was updated
      setIsLoading(false);
    } catch (error) {
      console.error('Error regenerating summary:', error);
      setIsLoading(false);
    }
  };
  
  const value: ChatContextType = {
    currentThread,
    messages,
    threads,
    isLoading,
    isTyping,
    hasRecommendations,
    newRecommendations,
    currentSummary,
    summaryUpdated,
    sendMessage,
    createNewThread,
    selectThread,
    deleteThread,
    getRecommendedVideos,
    clearNewRecommendationsFlag,
    clearSummaryUpdatedFlag,
    regenerateSummary
  };
  
  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}; 