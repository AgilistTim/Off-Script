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
  limit as firestoreLimit,
  deleteDoc,
  writeBatch
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
  learningPaths?: string[];
  reflectiveQuestions?: string[];
  enriched?: boolean;
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
    
    // Create the base message object
    const newMessage: any = {
      content: message,
      role,
      timestamp: serverTimestamp()
    };
    
    // Only add threadId and runId if they are defined
    if (threadId !== undefined) {
      newMessage.threadId = threadId;
    }
    
    if (runId !== undefined) {
      newMessage.runId = runId;
    }
    
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
 * Check if a thread has enough meaningful content for summary generation
 */
export const hasEnoughContentForSummary = async (firestoreThreadId: string): Promise<boolean> => {
  try {
    const messages = await getChatMessages(firestoreThreadId);
    
    // Filter to only user messages (actual user input)
    const userMessages = messages.filter(msg => msg.role === 'user');
    
    // Require at least 2 user messages with meaningful content
    if (userMessages.length < 2) {
      return false;
    }
    
    // Check if messages have substantial content (more than just greetings)
    const meaningfulMessages = userMessages.filter(msg => {
      const content = msg.content.toLowerCase().trim();
      // Skip very short messages, common greetings, or single words
      if (content.length < 20) return false;
      if (/^(hi|hello|hey|thanks|ok|yes|no|sure)$/i.test(content)) return false;
      return true;
    });
    
    // Require at least 1 meaningful message with combined length > 50 characters
    const totalLength = meaningfulMessages.reduce((sum, msg) => sum + msg.content.length, 0);
    return meaningfulMessages.length >= 1 && totalLength > 50;
    
  } catch (error) {
    console.error('Error checking thread content:', error);
    return false;
  }
};

/**
 * Generate a summary of the chat for user profiling (enhanced)
 */
export const generateChatSummary = async (firestoreThreadId: string, userId: string, forceGenerate: boolean = false): Promise<ChatSummary> => {
  try {
    // Check if thread has enough content for meaningful summary (unless forced)
    if (!forceGenerate) {
      const hasContent = await hasEnoughContentForSummary(firestoreThreadId);
      if (!hasContent) {
        throw new Error('Not enough meaningful conversation content for summary generation');
      }
    }

    // Get the OpenAI thread ID from the Firestore thread
    const threadDoc = await getDoc(doc(db, 'chatThreads', firestoreThreadId));
    
    if (!threadDoc.exists()) {
      throw new Error('Chat thread not found');
    }
    
    const threadData = threadDoc.data();
    const openAIThreadId = threadData.threadId;
    
    // Call the API to generate a summary with enhanced prompt
    const response = await axios.post(`${apiBaseUrl}/generateDetailedChatSummary`, {
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
      summary: summary.text || summary.summary || 'Career conversation in progress',
      interests: summary.interests || [],
      careerGoals: summary.careerGoals || [],
      skills: summary.skills || [],
      learningPaths: summary.learningPaths || [],
      reflectiveQuestions: summary.reflectiveQuestions || [],
      enriched: true,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(summaryRef, newSummary);
    
    // Update the thread with the summary
    await updateDoc(doc(db, 'chatThreads', firestoreThreadId), {
      summary: newSummary.summary
    });
    
    return {
      id: docRef.id,
      threadId: firestoreThreadId,
      userId,
      summary: newSummary.summary,
      interests: newSummary.interests,
      careerGoals: newSummary.careerGoals,
      skills: newSummary.skills,
      learningPaths: newSummary.learningPaths,
      reflectiveQuestions: newSummary.reflectiveQuestions,
      enriched: true,
      createdAt: new Date()
    };
  } catch (error) {
    console.error('Error generating chat summary:', error);
    throw new Error('Failed to generate chat summary');
  }
};

/**
 * Manually generate or regenerate a summary for a thread
 */
export const regenerateChatSummary = async (firestoreThreadId: string, userId: string): Promise<ChatSummary> => {
  try {
    // Delete any existing summaries for this thread
    const summariesRef = collection(db, 'chatSummaries');
    const existingSummariesQuery = query(summariesRef, where('threadId', '==', firestoreThreadId));
    const existingSummaries = await getDocs(existingSummariesQuery);
    
    const batch = writeBatch(db);
    existingSummaries.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    
    // Generate a new summary, forcing generation regardless of content length
    return await generateChatSummary(firestoreThreadId, userId, true);
  } catch (error) {
    console.error('Error regenerating chat summary:', error);
    throw new Error('Failed to regenerate chat summary');
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
      try {
        summary = await generateChatSummary(firestoreThreadId, userId);
      } catch (summaryError) {
        console.error('Error generating chat summary:', summaryError);
        // If we're using the emulator, we can't call the cloud function
        // So we'll create a mock summary
        if (window.location.hostname === 'localhost') {
          console.log('Using mock summary for local development');
          summary = {
            id: 'mock-summary',
            threadId: firestoreThreadId,
            userId: userId,
            summary: 'Mock summary for local development',
            interests: ['artificial intelligence', 'chatbots', 'vector storage', 'software'],
            careerGoals: ['build AI tools', 'create helpful AI assistants'],
            skills: ['coding', 'using AI assistants'],
            createdAt: new Date()
          };
        } else {
          throw summaryError;
        }
      }
    } else {
      const summaryData = querySnapshot.docs[0].data();
      summary = {
        id: querySnapshot.docs[0].id,
        threadId: firestoreThreadId,
        userId: userId,
        summary: summaryData.summary || '',
        interests: summaryData.interests || [],
        careerGoals: summaryData.careerGoals || [],
        skills: summaryData.skills || [],
        createdAt: summaryData.createdAt instanceof Timestamp ? summaryData.createdAt.toDate() : new Date()
      } as ChatSummary;
    }
    
    try {
      // Call the API to get video recommendations based on the summary
      const response = await axios.post(`${apiBaseUrl}/getVideoRecommendations`, {
        userId,
        interests: summary.interests || [],
        careerGoals: summary.careerGoals || [],
        skills: summary.skills || [],
        limit: limitCount
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      return response.data.videoIds;
    } catch (apiError) {
      console.error('Error calling recommendation API:', apiError);
      
      // If we're using the emulator, we can't call the cloud function
      // So we'll get videos directly from Firestore
      if (window.location.hostname === 'localhost') {
        console.log('Using direct Firestore query for local development');
        
        // Get videos that match interests or have highest view count
        const interests = summary.interests || [];
        
        let videosQuery;
        
        if (interests.length > 0) {
          // Try to match by category if we have interests
          videosQuery = query(
            collection(db, 'videos'),
            where('category', 'in', interests.slice(0, 10)),
            orderBy('viewCount', 'desc'),
            firestoreLimit(limitCount)
          );
        } else {
          // Otherwise just get popular videos
          videosQuery = query(
            collection(db, 'videos'),
            orderBy('viewCount', 'desc'),
            firestoreLimit(limitCount)
          );
        }
        
        const videosSnapshot = await getDocs(videosQuery);
        
        if (videosSnapshot.empty) {
          console.log('No videos found in emulator');
          return [];
        }
        
        const videoIds = videosSnapshot.docs.map(doc => doc.id);
        console.log('Found videos in emulator:', videoIds);
        return videoIds;
      } else {
        throw apiError;
      }
    }
  } catch (error) {
    console.error('Error getting video recommendations from chat:', error);
    throw new Error('Failed to get video recommendations');
  }
}; 

/**
 * Delete a chat thread and all associated data
 */
export const deleteChatThread = async (firestoreThreadId: string, userId: string): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    // 1. Delete all messages in the thread
    const messagesRef = collection(db, 'chatThreads', firestoreThreadId, 'messages');
    const messagesSnapshot = await getDocs(messagesRef);
    
    messagesSnapshot.docs.forEach(messageDoc => {
      batch.delete(messageDoc.ref);
    });
    
    // 2. Delete all summaries for this thread
    const summariesRef = collection(db, 'chatSummaries');
    const summariesQuery = query(summariesRef, where('threadId', '==', firestoreThreadId));
    const summariesSnapshot = await getDocs(summariesQuery);
    
    summariesSnapshot.docs.forEach(summaryDoc => {
      batch.delete(summaryDoc.ref);
    });
    
    // 3. Delete any video recommendations associated with this thread
    // (Note: This depends on how recommendations are stored - adjust as needed)
    const videoProgressRef = collection(db, 'videoProgress');
    const videoProgressQuery = query(
      videoProgressRef, 
      where('userId', '==', userId),
      where('threadId', '==', firestoreThreadId)
    );
    const videoProgressSnapshot = await getDocs(videoProgressQuery);
    
    videoProgressSnapshot.docs.forEach(progressDoc => {
      batch.delete(progressDoc.ref);
    });
    
    // 4. Delete the thread document itself
    const threadRef = doc(db, 'chatThreads', firestoreThreadId);
    batch.delete(threadRef);
    
    // Execute all deletions in a batch
    await batch.commit();
    
    console.log('Successfully deleted chat thread and all associated data:', firestoreThreadId);
  } catch (error) {
    console.error('Error deleting chat thread:', error);
    throw new Error('Failed to delete chat thread');
  }
};

/**
 * Generate a meaningful title from chat summary
 */
export const generateChatTitle = (summary: ChatSummary): string => {
  try {
    // Use interests and career goals to create a meaningful title
    const interests = summary.interests || [];
    const careerGoals = summary.careerGoals || [];
    const skills = summary.skills || [];
    
    // Priority order: career goals > interests > skills
    if (careerGoals.length > 0) {
      const primaryGoal = careerGoals[0];
      if (interests.length > 0) {
        return `Exploring ${primaryGoal} in ${interests[0]}`;
      }
      return `Career Path: ${primaryGoal}`;
    }
    
    if (interests.length > 0) {
      const primaryInterest = interests[0];
      if (interests.length > 1) {
        return `${primaryInterest} and ${interests[1]} Discussion`;
      }
      return `${primaryInterest} Exploration`;
    }
    
    if (skills.length > 0) {
      return `Developing ${skills[0]} Skills`;
    }
    
    // Fallback to a portion of the summary text
    if (summary.summary) {
      const words = summary.summary.split(' ').slice(0, 6);
      return words.join(' ') + (words.length === 6 ? '...' : '');
    }
    
    return 'Career Conversation';
  } catch (error) {
    console.error('Error generating chat title:', error);
    return 'Career Conversation';
  }
};

/**
 * Update chat thread title based on summary
 */
export const updateChatThreadTitle = async (firestoreThreadId: string, summary: ChatSummary): Promise<void> => {
  try {
    const newTitle = generateChatTitle(summary);
    
    // Check if title has actually changed to avoid unnecessary updates
    const threadDoc = await getDoc(doc(db, 'chatThreads', firestoreThreadId));
    if (threadDoc.exists()) {
      const currentTitle = threadDoc.data().title;
      if (currentTitle === newTitle) {
        console.log('Title unchanged, skipping update:', newTitle);
        return;
      }
    }
    
    // Only update the title, don't update updatedAt to prevent cascading listener updates
    await updateDoc(doc(db, 'chatThreads', firestoreThreadId), {
      title: newTitle
    });
    
    console.log('Updated chat thread title:', newTitle);
  } catch (error) {
    console.error('Error updating chat thread title:', error);
    throw new Error('Failed to update chat thread title');
  }
}; 