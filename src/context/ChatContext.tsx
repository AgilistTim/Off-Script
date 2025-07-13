import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
import careerPathwayService, { ComprehensiveCareerGuidance, CareerExplorationSummary } from '../services/careerPathwayService';

// OpenAI Assistant ID
const ASSISTANT_ID = 'asst_b6kBes7rHBC9gA4yJ9I5r5zm';

// Debounce delay constants
const CAREER_GUIDANCE_DEBOUNCE_MS = 3000; // 3 second delay
const VIDEO_RECOMMENDATIONS_DEBOUNCE_MS = 2000; // 2 second delay
const SUMMARY_REFRESH_DEBOUNCE_MS = 5000; // 5 second delay

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
  careerGuidance: ComprehensiveCareerGuidance | null;
  careerGuidanceLoading: boolean;
  careerGuidanceError: string | null;
  careerExplorations: CareerExplorationSummary[];
  sendMessage: (message: string) => Promise<void>;
  createNewThread: () => Promise<string | undefined>;
  selectThread: (threadId: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  getRecommendedVideos: (limit?: number) => Promise<string[]>;
  generateCareerGuidance: () => Promise<void>;
  refreshCareerGuidance: () => Promise<void>;
  getUserCareerExplorations: () => Promise<CareerExplorationSummary[]>;
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
  const [careerGuidance, setCareerGuidance] = useState<ComprehensiveCareerGuidance | null>(null);
  const [careerGuidanceLoading, setCareerGuidanceLoading] = useState<boolean>(false);
  const [careerGuidanceError, setCareerGuidanceError] = useState<string | null>(null);
  const [careerExplorations, setCareerExplorations] = useState<CareerExplorationSummary[]>([]);
  
  // Refs for debouncing and caching
  const careerGuidanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const videoRecommendationsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const summaryRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCareerGuidanceGeneratedRef = useRef<{ threadId: string; summaryId: string } | null>(null);
  const lastVideoRecommendationsRef = useRef<{ threadId: string; summaryId: string; hasRecommendations: boolean } | null>(null);
  const isGeneratingGuidanceRef = useRef<boolean>(false);
  const hasSelectedInitialThreadRef = useRef<boolean>(false);
  
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
      if (processedThreads.length > 0 && !hasSelectedInitialThreadRef.current) {
        try {
          const threadToSelect = processedThreads[0];
          setCurrentThread(threadToSelect);
          hasSelectedInitialThreadRef.current = true;
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
  }, [currentUser]);
  
  // Load threads when user changes
  useEffect(() => {
    setIsLoading(true);
    hasSelectedInitialThreadRef.current = false; // Reset when user changes
    fetchThreads();
  }, [currentUser, fetchThreads]);
  
  // Set up real-time listener for chat threads
  useEffect(() => {
    if (!currentUser) return;
    
    console.log('Setting up real-time listener for chat threads for user:', currentUser.uid);
    
    // Create a query for this user's chat threads
    const threadsRef = collection(db, 'chatThreads');
    const threadsQuery = query(
      threadsRef,
      where('userId', '==', currentUser.uid),
      orderBy('updatedAt', 'desc')
    );
    
    // Set up the listener
    const unsubscribe = onSnapshot(threadsQuery, (snapshot) => {
      console.log('Real-time threads update received:', snapshot.size, 'threads');
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
    return () => {
      console.log('Cleaning up real-time listener for chat threads');
      unsubscribe();
    };
  }, [currentUser]);

  // Auto-generate career guidance when summary is updated (debounced)
  const debouncedGenerateCareerGuidance = useCallback((summary: ChatSummary) => {
    if (careerGuidanceTimeoutRef.current) {
      clearTimeout(careerGuidanceTimeoutRef.current);
    }
    
    careerGuidanceTimeoutRef.current = setTimeout(async () => {
      if (!currentUser || !currentThread || isGeneratingGuidanceRef.current) return;
      
      console.log('🎯 ChatContext: Debounced career guidance generation triggered');
      console.log('🎯 ChatContext: Summary:', summary);
      console.log('🎯 ChatContext: Current thread:', currentThread.id);
      console.log('🎯 ChatContext: Current user:', currentUser.uid);
      
      // Check if we already generated guidance for this thread and summary
      const lastGenerated = lastCareerGuidanceGeneratedRef.current;
      if (lastGenerated && lastGenerated.threadId === currentThread.id && lastGenerated.summaryId === summary.id) {
        console.log('🎯 ChatContext: Career guidance already generated for this thread and summary');
        return;
      }
      
      try {
        isGeneratingGuidanceRef.current = true;
        setCareerGuidanceLoading(true);
        setCareerGuidanceError(null);
        
        console.log('🎯 ChatContext: Calling generateThreadCareerGuidance');
        const guidance = await careerPathwayService.generateThreadCareerGuidance(
          currentThread.id,
          currentUser.uid,
          summary
        );
        
        console.log('🎯 ChatContext: Generated career guidance successfully:', guidance);
        setCareerGuidance(guidance);
        
        // Update the last generated reference
        lastCareerGuidanceGeneratedRef.current = { threadId: currentThread.id, summaryId: summary.id };
        
      } catch (error) {
        console.error('❌ ChatContext: Error in debounced career guidance generation:', error);
        setCareerGuidanceError(error instanceof Error ? error.message : 'Failed to generate career guidance');
      } finally {
        setCareerGuidanceLoading(false);
        isGeneratingGuidanceRef.current = false;
      }
    }, 2000);
  }, [currentUser, currentThread]);

  // Debounced video recommendations check
  const debouncedCheckVideoRecommendations = useCallback((summary: ChatSummary) => {
    if (videoRecommendationsTimeoutRef.current) {
      clearTimeout(videoRecommendationsTimeoutRef.current);
    }
    
    videoRecommendationsTimeoutRef.current = setTimeout(() => {
      if (!currentThread || !summary.enriched) return;
      
      // Check if we already checked recommendations for this thread+summary combination
      const lastRecommendations = lastVideoRecommendationsRef.current;
      
      if (lastRecommendations && 
          lastRecommendations.threadId === currentThread.id && 
          lastRecommendations.summaryId === summary.id) {
        console.log('Video recommendations already checked for this thread+summary combination, skipping');
        return;
      }
      
      console.log('Checking video recommendations with debounce');
      getRecommendedVideos(1).then(videos => {
        const hasRecs = videos.length > 0;
        
        // Only set newRecommendations to true if we didn't have recommendations before
        if (hasRecs && !hasRecommendations) {
          setNewRecommendations(true);
        }
        
        setHasRecommendations(hasRecs);
        
        // Update cache
        lastVideoRecommendationsRef.current = {
          threadId: currentThread.id,
          summaryId: summary.id,
          hasRecommendations: hasRecs
        };
      }).catch(error => {
        console.error('Error checking for recommendations after summary update:', error);
      });
    }, VIDEO_RECOMMENDATIONS_DEBOUNCE_MS);
  }, [currentThread, hasRecommendations]);

  // Debounced summary refresh and recommendations check
  const debouncedRefreshSummaryAndRecommendations = useCallback((threadId: string) => {
    if (summaryRefreshTimeoutRef.current) {
      clearTimeout(summaryRefreshTimeoutRef.current);
    }
    
    summaryRefreshTimeoutRef.current = setTimeout(async () => {
      if (!currentUser) return;
      
      try {
        console.log('Refreshing summary and checking recommendations with debounce');
        
        // Check if thread has enough content for a meaningful summary
        const hasEnoughContent = await hasEnoughContentForSummary(threadId);
        
        if (hasEnoughContent && !currentSummary) {
          // Try to generate a summary if we don't have one and there's enough content
          try {
            await regenerateChatSummary(threadId, currentUser.uid);
            console.log('Auto-generated summary after message');
          } catch (summaryError) {
            console.log('Summary generation skipped - not enough content yet:', summaryError instanceof Error ? summaryError.message : 'Unknown error');
          }
        }
        
                 // Always fetch the latest summary (real-time listener will handle this, but fetch for immediate feedback)
         try {
           await fetchThreadSummary(threadId);
         } catch (error) {
           console.error('Error fetching thread summary:', error);
         }
        
        // Check for recommendations with smart caching
        try {
          const recommendations = await getVideoRecommendationsFromChat(currentUser.uid, threadId, 1);
          const hasRecs = recommendations.length > 0;
          
          // Only set newRecommendations to true if we didn't have recommendations before
          if (hasRecs && !hasRecommendations) {
            setNewRecommendations(true);
          }
          
          setHasRecommendations(hasRecs);
        } catch (error) {
          console.error('Error checking for recommendations:', error);
        }
      } catch (error) {
        console.error('Error in debounced summary refresh:', error);
      }
         }, SUMMARY_REFRESH_DEBOUNCE_MS);
   }, [currentUser, currentSummary, hasRecommendations]);

  // Auto-generate career guidance when summary is available (with smart caching)
  useEffect(() => {
    if (currentSummary && currentThread && 
        (currentSummary.interests.length > 0 || currentSummary.careerGoals.length > 0) &&
        !careerGuidance && !careerGuidanceLoading && !isGeneratingGuidanceRef.current) {
      debouncedGenerateCareerGuidance(currentSummary);
    }
  }, [currentSummary, currentThread, careerGuidance, careerGuidanceLoading, debouncedGenerateCareerGuidance]);
  
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
    
    console.log('Setting up real-time listener for summary for thread:', currentThread.id);
    
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
        // Don't call fetchThreads here - let the real-time threads listener handle the update
      } catch (error) {
        console.error('Error updating chat thread title:', error);
      }
      
      // Check for recommendations with debouncing and caching
      debouncedCheckVideoRecommendations(summary);
    }, (error) => {
      console.error('Error in summary listener:', error);
    });
    
    // Clean up listener on unmount or when thread changes
    return () => {
      console.log('Cleaning up real-time listener for summary');
      unsubscribe();
    };
  }, [currentUser, currentThread, debouncedCheckVideoRecommendations]);
  
  // Set up real-time listener for messages in the current thread
  useEffect(() => {
    if (!currentThread) return;
    
    console.log('Setting up real-time listener for messages in thread:', currentThread.id);
    
    const messagesRef = collection(db, 'chatThreads', currentThread.id, 'messages');
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
    
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      console.log('Real-time messages update received:', snapshot.size, 'messages');
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
    
    return () => {
      console.log('Cleaning up real-time listener for messages');
      unsubscribe();
    };
  }, [currentThread]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (careerGuidanceTimeoutRef.current) {
        clearTimeout(careerGuidanceTimeoutRef.current);
      }
      if (videoRecommendationsTimeoutRef.current) {
        clearTimeout(videoRecommendationsTimeoutRef.current);
      }
      if (summaryRefreshTimeoutRef.current) {
        clearTimeout(summaryRefreshTimeoutRef.current);
      }
    };
  }, []);
  
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
      
      // Clear career guidance for new thread
      setCareerGuidance(null);
      setCareerGuidanceError(null);
      
      // Reset recommendations state for new thread
      setHasRecommendations(false);
      setNewRecommendations(false);
      
      // Clear caches for new thread
      lastCareerGuidanceGeneratedRef.current = null;
      lastVideoRecommendationsRef.current = null;
      
      setIsLoading(false);
      
      // Don't call fetchThreads here - let the real-time threads listener handle updates
      
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
      
      // Clear caches when switching threads
      lastCareerGuidanceGeneratedRef.current = null;
      lastVideoRecommendationsRef.current = null;
      
      // Load messages (the real-time listener will handle this, but load immediately for faster UX)
      setIsLoading(true);
      const threadMessages = await getChatMessages(threadId);
      setMessages(threadMessages);
      
      // Fetch the thread summary
      await fetchThreadSummary(threadId);
      
      // Load thread-specific career guidance if it exists
      try {
        const threadGuidance = await careerPathwayService.getThreadCareerGuidance(threadId, currentUser.uid);
        setCareerGuidance(threadGuidance);
        setCareerGuidanceError(null);
      } catch (error) {
        console.error('Error loading thread career guidance:', error);
        setCareerGuidance(null);
        setCareerGuidanceError(null);
      }
      
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
        
        // Don't call fetchThreads here - let the real-time threads listener handle updates
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
      
      // Check if we should generate a summary (debounced to avoid frequent calls)
      debouncedRefreshSummaryAndRecommendations(threadId);
      
      // Don't call fetchThreads here - let the real-time threads listener handle updates
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      throw error;
    }
  };
  
  // Get recommended videos based on the current thread
  const getRecommendedVideos = useCallback(async (limit: number = 5): Promise<string[]> => {
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
      // fall back to the NEW personalized video recommendations with semantic scoring
      
      // Use the utility function to get the correct URL for the NEW function
      const functionUrl = getFirebaseFunctionUrl('getPersonalizedVideoRecommendations');
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser.uid,
          limit,
          includeWatched: false,
          chatSummaryId: currentSummary?.id || null
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
  }, [currentUser, currentSummary]);
  
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
        // Clear career guidance when deleting current thread
        setCareerGuidance(null);
        setCareerGuidanceError(null);
      }
      
      // Delete the thread and all associated data
      await deleteChatThread(threadId, currentUser.uid);
      
      // Delete thread-specific career guidance
      try {
        await careerPathwayService.deleteThreadCareerGuidance(threadId, currentUser.uid);
      } catch (error) {
        console.error('Error deleting thread career guidance:', error);
      }
      
      // Don't call fetchThreads here - let the real-time threads listener handle the removal
      
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

  // Generate career guidance
  const generateCareerGuidance = async () => {
    if (!currentThread || !currentSummary || !currentUser) return;
    
    console.log('🎯 ChatContext: Starting career guidance generation');
    console.log('🎯 ChatContext: Current thread:', currentThread.id);
    console.log('🎯 ChatContext: Current summary:', currentSummary);
    console.log('🎯 ChatContext: Current user:', currentUser.uid);
    
    try {
      setCareerGuidanceLoading(true);
      setCareerGuidanceError(null);
      
      const guidance = await careerPathwayService.generateThreadCareerGuidance(
        currentThread.id,
        currentUser.uid,
        currentSummary
      );
      
      console.log('🎯 ChatContext: Generated career guidance:', guidance);
      setCareerGuidance(guidance);
      
    } catch (error) {
      console.error('❌ ChatContext: Error generating career guidance:', error);
      setCareerGuidanceError(error instanceof Error ? error.message : 'Failed to generate career guidance');
    } finally {
      setCareerGuidanceLoading(false);
    }
  };

  // Refresh career guidance (thread-specific)
  const refreshCareerGuidance = async () => {
    if (!currentUser || !currentSummary || !currentThread) return;

    setCareerGuidanceLoading(true);
    setCareerGuidanceError(null);

    try {
      const refreshedGuidance = await careerPathwayService.generateThreadCareerGuidance(
        currentThread.id, 
        currentUser.uid, 
        currentSummary
      );
      setCareerGuidance(refreshedGuidance);
      console.log('Refreshed thread-specific career guidance:', refreshedGuidance);
    } catch (error) {
      setCareerGuidanceError(error instanceof Error ? error.message : 'Failed to refresh career guidance');
      console.error('Error refreshing career guidance:', error);
    } finally {
      setCareerGuidanceLoading(false);
    }
  };

  // Get user's career explorations
  const getUserCareerExplorations = async (): Promise<CareerExplorationSummary[]> => {
    if (!currentUser) return [];

    try {
      const explorations = await careerPathwayService.getUserCareerExplorations(currentUser.uid);
      setCareerExplorations(explorations);
      return explorations;
    } catch (error) {
      console.error('Error getting user career explorations:', error);
      return [];
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
    careerGuidance,
    careerGuidanceLoading,
    careerGuidanceError,
    careerExplorations,
    sendMessage,
    createNewThread,
    selectThread,
    deleteThread,
    getRecommendedVideos,
    generateCareerGuidance,
    refreshCareerGuidance,
    getUserCareerExplorations,
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