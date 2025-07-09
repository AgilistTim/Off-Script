import { db } from './firebase';
import { 
  doc, 
  collection, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  Timestamp,
  limit as firestoreLimit
} from 'firebase/firestore';
import axios from 'axios';
import { getEnvironmentConfig } from '../config/environment';

// Get environment configuration
const env = getEnvironmentConfig();
const apiBaseUrl = env.apiEndpoints.openaiAssistant || '/api/openai';

// OpenAI Assistant ID
const ASSISTANT_ID = 'asst_b6kBes7rHBC9gA4yJ9I5r5zm';

// Message type definition
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  threadId?: string;
  runId?: string;
}

// Chat thread type definition
export interface ChatThread {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  summary?: string;
  lastMessage?: string;
  threadId: string; // OpenAI thread ID
}

// Chat summary type definition
export interface ChatSummary {
  id: string;
  threadId: string;
  userId: string;
  summary: string;
  interests: string[];
  careerGoals: string[];
  skills: string[];
  createdAt: Date;
}

/**
 * Create a new OpenAI thread
 */
export const createThread = async (): Promise<string> => {
  try {
    console.log('Creating thread with API URL:', apiBaseUrl);
    const response = await axios.post(`${apiBaseUrl}/createChatThread`, {}, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return response.data.threadId;
  } catch (error) {
    console.error('Error creating thread:', error);
    throw new Error('Failed to create chat thread');
  }
};

/**
 * Create a new chat thread in Firestore
 */
export const createChatThreadInFirestore = async (userId: string, threadId: string, title: string = 'New Conversation'): Promise<string> => {
  try {
    const chatThreadRef = collection(db, 'chatThreads');
    
    const newThread = {
      userId,
      threadId, // OpenAI thread ID
      title,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: ''
    };
    
    console.log('Creating Firestore thread with OpenAI threadId:', threadId);
    const docRef = await addDoc(chatThreadRef, newThread);
    return docRef.id;
  } catch (error) {
    console.error('Error creating chat thread in Firestore:', error);
    throw new Error('Failed to create chat thread in database');
  }
};

/**
 * Get chat threads for a user
 */
export const getUserChatThreads = async (userId: string): Promise<ChatThread[]> => {
  try {
    const chatThreadsRef = collection(db, 'chatThreads');
    const q = query(
      chatThreadsRef, 
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        title: data.title,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
        summary: data.summary,
        lastMessage: data.lastMessage,
        threadId: data.threadId // Ensure threadId is included
      };
    });
  } catch (error) {
    console.error('Error getting user chat threads:', error);
    throw new Error('Failed to retrieve chat threads');
  }
};

/**
 * Send a message to the OpenAI Assistant
 */
export const sendMessage = async (threadId: string, message: string): Promise<ChatMessage> => {
  try {
    const response = await axios.post(`${apiBaseUrl}/sendChatMessage`, {
      threadId,
      message,
      assistantId: ASSISTANT_ID
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw new Error('Failed to send message to assistant');
  }
};

/**
 * Store a message in Firestore
 */
export const storeMessage = async (
  firestoreThreadId: string, 
  message: string, 
  role: 'user' | 'assistant',
  threadId?: string,
  runId?: string
): Promise<string> => {
  try {
    const messagesRef = collection(db, 'chatThreads', firestoreThreadId, 'messages');
    
    const newMessage = {
      content: message,
      role,
      timestamp: serverTimestamp(),
      threadId,
      runId
    };
    
    const docRef = await addDoc(messagesRef, newMessage);
    
    // Update the last message and updated time on the thread
    await updateDoc(doc(db, 'chatThreads', firestoreThreadId), {
      lastMessage: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      updatedAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error storing message:', error);
    throw new Error('Failed to store message in database');
  }
};

/**
 * Get messages for a chat thread
 */
export const getChatMessages = async (firestoreThreadId: string): Promise<ChatMessage[]> => {
  try {
    const messagesRef = collection(db, 'chatThreads', firestoreThreadId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        content: data.content,
        role: data.role,
        timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(),
        threadId: data.threadId,
        runId: data.runId
      };
    });
  } catch (error) {
    console.error('Error getting chat messages:', error);
    throw new Error('Failed to retrieve chat messages');
  }
};

/**
 * Generate a summary of the chat for user profiling
 */
export const generateChatSummary = async (firestoreThreadId: string, userId: string): Promise<ChatSummary> => {
  try {
    // Get the OpenAI thread ID from the Firestore thread
    const threadDoc = await getDoc(doc(db, 'chatThreads', firestoreThreadId));
    
    if (!threadDoc.exists()) {
      throw new Error('Chat thread not found');
    }
    
    const threadData = threadDoc.data();
    const openAIThreadId = threadData.threadId;
    
    // Call the API to generate a summary
    const response = await axios.post(`${apiBaseUrl}/generateChatSummary`, {
      threadId: openAIThreadId,
      assistantId: ASSISTANT_ID
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const summary = response.data;
    
    // Store the summary in Firestore
    const summaryRef = collection(db, 'chatSummaries');
    
    const newSummary = {
      threadId: firestoreThreadId,
      userId,
      summary: summary.text,
      interests: summary.interests || [],
      careerGoals: summary.careerGoals || [],
      skills: summary.skills || [],
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(summaryRef, newSummary);
    
    // Update the thread with the summary
    await updateDoc(doc(db, 'chatThreads', firestoreThreadId), {
      summary: summary.text
    });
    
    return {
      id: docRef.id,
      threadId: firestoreThreadId,
      userId,
      summary: summary.text,
      interests: summary.interests || [],
      careerGoals: summary.careerGoals || [],
      skills: summary.skills || [],
      createdAt: new Date()
    };
  } catch (error) {
    console.error('Error generating chat summary:', error);
    throw new Error('Failed to generate chat summary');
  }
};

/**
 * Get video recommendations based on chat interactions
 */
export const getVideoRecommendationsFromChat = async (
  userId: string, 
  firestoreThreadId: string, 
  limitCount: number = 5
): Promise<string[]> => {
  try {
    // Get the latest chat summary or generate one if it doesn't exist
    const summariesRef = collection(db, 'chatSummaries');
    const q = query(
      summariesRef,
      where('threadId', '==', firestoreThreadId),
      orderBy('createdAt', 'desc'),
      firestoreLimit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    let summary;
    
    if (querySnapshot.empty) {
      // Generate a new summary
      summary = await generateChatSummary(firestoreThreadId, userId);
    } else {
      summary = {
        id: querySnapshot.docs[0].id,
        ...querySnapshot.docs[0].data()
      } as ChatSummary;
    }
    
    // Call the API to get video recommendations based on the summary
    const response = await axios.post(`${apiBaseUrl}/getVideoRecommendations`, {
      userId,
      interests: summary.interests,
      careerGoals: summary.careerGoals,
      skills: summary.skills,
      limit: limitCount
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return response.data.videoIds;
  } catch (error) {
    console.error('Error getting video recommendations from chat:', error);
    throw new Error('Failed to get video recommendations');
  }
}; 