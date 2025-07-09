// Import Firebase Admin SDK
import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin SDK
try {
  // Initialize without credentials to use emulator
  admin.initializeApp({
    projectId: 'offscript-8f6eb'
  });
  
  console.log('Initialized Firebase Admin for emulator');
  
  // Connect to the Firestore emulator
  admin.firestore().settings({
    host: 'localhost:8080',
    ssl: false
  });
  
  console.log('Connected to Firestore emulator at localhost:8080');
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
  process.exit(1);
}

// Get Firestore instance
const db = admin.firestore();

// OpenAI Assistant API URL
const apiBaseUrl = process.env.VITE_OPENAI_ASSISTANT_API || 'http://localhost:5001/offscript-8f6eb/us-central1/openaiAssistant';

// OpenAI Assistant ID
const ASSISTANT_ID = 'asst_b6kBes7rHBC9gA4yJ9I5r5zm';

/**
 * Process chat content through the OpenAI Assistant API
 */
async function processChatWithOpenAI(threadId) {
  try {
    console.log(`Processing chat content for thread: ${threadId}`);
    
    // Call the API to generate a detailed summary
    const response = await axios.post(`${apiBaseUrl}/generateDetailedChatSummary`, {
      threadId,
      assistantId: ASSISTANT_ID
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('OpenAI API response received');
    
    // Extract useful information from the response
    const result = {
      summary: response.data.text || '',
      interests: response.data.interests || [],
      skills: response.data.skills || [],
      careerGoals: response.data.careerGoals || [],
      learningPaths: response.data.learningPaths || [],
      reflectiveQuestions: response.data.reflectiveQuestions || []
    };
    
    return result;
  } catch (error) {
    console.error('Error processing chat with OpenAI:', error);
    throw error;
  }
}

/**
 * Get chat messages for a thread
 */
async function getChatMessagesForThread(threadId) {
  try {
    const messagesRef = db.collection('chatThreads').doc(threadId).collection('messages');
    const messagesSnapshot = await messagesRef.orderBy('timestamp', 'asc').get();
    
    if (messagesSnapshot.empty) {
      console.log(`No messages found for thread ${threadId}`);
      return [];
    }
    
    return messagesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        content: data.content,
        role: data.role,
        timestamp: data.timestamp ? new Date(data.timestamp.seconds * 1000) : new Date()
      };
    });
  } catch (error) {
    console.error(`Error getting messages for thread ${threadId}:`, error);
    return [];
  }
}

/**
 * Get OpenAI thread ID from Firestore thread ID
 */
async function getOpenAIThreadId(firestoreThreadId) {
  try {
    const threadDoc = await db.collection('chatThreads').doc(firestoreThreadId).get();
    
    if (!threadDoc.exists) {
      throw new Error(`Thread ${firestoreThreadId} not found`);
    }
    
    const data = threadDoc.data();
    return data.threadId; // This is the OpenAI thread ID
  } catch (error) {
    console.error(`Error getting OpenAI thread ID for ${firestoreThreadId}:`, error);
    throw error;
  }
}

/**
 * Enhance chat summaries with OpenAI
 */
async function enhanceChatSummariesWithOpenAI() {
  try {
    console.log('Starting to enhance chat summaries with OpenAI...');
    
    // Get all chat summaries
    const summariesSnapshot = await db.collection('chatSummaries').get();
    
    if (summariesSnapshot.empty) {
      console.log('No chat summaries found');
      return;
    }
    
    console.log(`Found ${summariesSnapshot.size} chat summaries to enhance`);
    
    for (const doc of summariesSnapshot.docs) {
      const summaryData = doc.data();
      const summaryId = doc.id;
      
      // Skip already enhanced summaries
      if (summaryData.enriched === true) {
        console.log(`Skipping already enhanced chat summary: ${summaryId}`);
        continue;
      }
      
      console.log(`Enhancing chat summary: ${summaryId}`);
      
      try {
        // Get the OpenAI thread ID from the Firestore thread ID
        const firestoreThreadId = summaryData.threadId;
        const openAIThreadId = await getOpenAIThreadId(firestoreThreadId);
        
        if (!openAIThreadId) {
          console.log(`No OpenAI thread ID found for ${firestoreThreadId}, skipping`);
          continue;
        }
        
        // Process chat with OpenAI
        const enhancedData = await processChatWithOpenAI(openAIThreadId);
        
        // Update the chat summary with enhanced data
        await db.collection('chatSummaries').doc(summaryId).update({
          summary: enhancedData.summary || summaryData.summary,
          interests: [...new Set([...(summaryData.interests || []), ...enhancedData.interests])],
          skills: [...new Set([...(summaryData.skills || []), ...enhancedData.skills])],
          careerGoals: [...new Set([...(summaryData.careerGoals || []), ...enhancedData.careerGoals])],
          learningPaths: enhancedData.learningPaths || [],
          reflectiveQuestions: enhancedData.reflectiveQuestions || [],
          enriched: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Successfully enhanced chat summary: ${summaryId}`);
      } catch (error) {
        console.error(`Error enhancing chat summary ${summaryId}:`, error);
      }
    }
    
    console.log('Finished enhancing chat summaries with OpenAI');
    process.exit(0);
  } catch (error) {
    console.error('Error in enhanceChatSummariesWithOpenAI:', error);
    process.exit(1);
  }
}

// Execute the function
enhanceChatSummariesWithOpenAI(); 