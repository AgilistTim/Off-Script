import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { 
  ChatMessage, 
  ChatThread as ChatThreadBase,
  createThread, 
  createChatThreadInFirestore, 
  getUserChatThreads, 
  sendMessage as sendMessageToAssistant, 
  storeMessage, 
  getChatMessages,
  getVideoRecommendationsFromChat
} from '../services/chatService';

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
  sendMessage: (message: string) => Promise<void>;
  createNewThread: () => Promise<string | undefined>;
  selectThread: (threadId: string) => Promise<void>;
  getRecommendedVideos: (limit?: number) => Promise<string[]>;
  clearNewRecommendationsFlag: () => void;
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
  
  // Load messages for the current thread
  const loadMessages = async () => {
    if (!currentThread) return;
    
    try {
      setIsLoading(true);
      const threadMessages = await getChatMessages(currentThread.id);
      setMessages(threadMessages);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading messages:', error);
      setIsLoading(false);
    }
  };
  
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
      
      // Get the thread details
      const newThreads = await getUserChatThreads(currentUser.uid);
      
      // Process threads to ensure threadId is set
      const processedThreads = newThreads.map(thread => {
        return {
          ...thread,
          threadId: thread.threadId || ''
        } as ChatThread;
      });
      
      setThreads(processedThreads);
      
      // Find and set the current thread
      const newThread = processedThreads.find(t => t.id === firestoreThreadId);
      if (newThread) {
        // Ensure the OpenAI threadId is set
        newThread.threadId = openAIThreadId;
        setCurrentThread(newThread);
        console.log('Set current thread:', newThread);
      } else {
        // If thread not found in the fetched threads, create a new one with the known IDs
        const fallbackThread: ChatThread = {
          id: firestoreThreadId,
          threadId: openAIThreadId,
          userId: currentUser.uid,
          title: 'New Conversation',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        setCurrentThread(fallbackThread);
        console.log('Set fallback thread:', fallbackThread);
      }
      
      // Clear messages
      setMessages([]);
      
      // Reset recommendations state for new thread
      setHasRecommendations(false);
      setNewRecommendations(false);
      
      setIsLoading(false);
      
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
      
      // Load messages
      setIsLoading(true);
      const threadMessages = await getChatMessages(threadId);
      setMessages(threadMessages);
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
      
      // Add message to state
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        content: message,
        role: 'user',
        timestamp: new Date(),
        threadId: openAIThreadId
      };
      
      setMessages(prev => [...prev, userMessage]);
      
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
      
      // Add assistant response to state
      const assistantMessage: ChatMessage = {
        id: response.id,
        content: response.content,
        role: 'assistant',
        timestamp: response.timestamp,
        threadId: openAIThreadId,
        runId: response.runId
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
      
      // Check for recommendations after each message
      try {
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
  
  // Get video recommendations based on chat
  const getRecommendedVideos = async (limit: number = 5): Promise<string[]> => {
    if (!currentUser || !currentThread) {
      return [];
    }
    
    try {
      const recommendations = await getVideoRecommendationsFromChat(
        currentUser.uid,
        currentThread.id,
        limit
      );
      
      // Update state based on whether we have recommendations
      setHasRecommendations(recommendations.length > 0);
      
      return recommendations;
    } catch (error) {
      console.error('Error getting video recommendations:', error);
      return [];
    }
  };
  
  // Clear the new recommendations flag
  const clearNewRecommendationsFlag = () => {
    setNewRecommendations(false);
  };
  
  const value: ChatContextType = {
    currentThread,
    messages,
    threads,
    isLoading,
    isTyping,
    hasRecommendations,
    newRecommendations,
    sendMessage,
    createNewThread,
    selectThread,
    getRecommendedVideos,
    clearNewRecommendationsFlag
  };
  
  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}; 