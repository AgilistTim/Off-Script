// Import Firebase Admin SDK
import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fetch from 'node-fetch';
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

// BumpUps API proxy URL
const bumpupsProxyUrl = process.env.VITE_BUMPUPS_PROXY_URL || 'http://localhost:5001/offscript-8f6eb/us-central1/bumpupsProxy';

/**
 * Process chat content through the BumpUps API
 */
async function processChatWithBumpups(chatContent) {
  try {
    console.log(`Processing chat content...`);
    
    // For now, we'll mock the BumpUps API response
    // In production, you would call the actual API
    
    // Create a mock response based on the chat content
    const mockResponse = {
      output: `# Key Themes and Interests
- Artificial Intelligence and Machine Learning
- Software Engineering and Development
- Career Exploration in Tech
- Educational Technology
- Data Science and Analytics

# Soft Skills Demonstrated
- Analytical Thinking
- Problem-solving
- Communication
- Self-directed Learning
- Technical Curiosity

# Career Goals
- Building AI-powered applications
- Developing educational technology
- Creating data visualization tools
- Software engineering leadership
- Technical mentorship

# Suggested Hashtags
- #AIEnthusiast
- #SoftwareDevelopment
- #TechCareer
- #DataScience
- #MachineLearning
- #EducationalTech
- #CareerGrowth

# Recommended Learning Paths
- Machine Learning Engineering
- Full-Stack Development
- Data Science
- AI Application Development

# Reflective Questions
- What specific AI applications are you most interested in building?
- How do you see your software skills evolving in the next 2-3 years?
- What technical challenges are you most excited to tackle?`
    };
    
    console.log('BumpUps API response received (mocked)');
    
    // Extract useful information
    const result = {
      interests: extractInterestsFromOutput(mockResponse.output),
      skills: extractSkillsFromOutput(mockResponse.output),
      careerGoals: extractCareerGoalsFromOutput(mockResponse.output),
      learningPaths: extractLearningPathsFromOutput(mockResponse.output),
      reflectiveQuestions: extractReflectiveQuestionsFromOutput(mockResponse.output)
    };
    
    return result;
  } catch (error) {
    console.error('Error processing chat with BumpUps:', error);
    throw error;
  }
}

/**
 * Extract interests from output text
 */
function extractInterestsFromOutput(output) {
  const interests = new Set();
  
  // Look for key themes section as interests
  const themesRegex = /# Key Themes and Interests\s+((?:-\s*[^\n]+\s*)+)/i;
  const themesMatch = output.match(themesRegex);
  
  if (themesMatch && themesMatch[1]) {
    const themesList = themesMatch[1]
      .split('\n')
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(Boolean);
    
    themesList.forEach(theme => interests.add(theme));
  }
  
  // Also add from hashtags
  const hashtagsRegex = /# Suggested Hashtags\s+((?:-\s*[^\n]+\s*)+)/i;
  const hashtagsMatch = output.match(hashtagsRegex);
  
  if (hashtagsMatch && hashtagsMatch[1]) {
    const hashtagsList = hashtagsMatch[1]
      .split('\n')
      .map(line => line.replace(/^-\s*/, '').trim().replace(/^#/, ''))
      .filter(Boolean);
    
    hashtagsList.forEach(hashtag => interests.add(hashtag));
  }
  
  return Array.from(interests);
}

/**
 * Extract skills from output text
 */
function extractSkillsFromOutput(output) {
  const skills = new Set();
  
  // Look for skills section
  const softSkillsRegex = /# Soft Skills Demonstrated\s+((?:-\s*[^\n]+\s*)+)/i;
  const softSkillsMatch = output.match(softSkillsRegex);
  
  if (softSkillsMatch && softSkillsMatch[1]) {
    const skillsList = softSkillsMatch[1]
      .split('\n')
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(Boolean);
    
    skillsList.forEach(skill => skills.add(skill));
  }
  
  return Array.from(skills);
}

/**
 * Extract career goals from output text
 */
function extractCareerGoalsFromOutput(output) {
  const goals = new Set();
  
  // Look for career goals section
  const goalsRegex = /# Career Goals\s+((?:-\s*[^\n]+\s*)+)/i;
  const goalsMatch = output.match(goalsRegex);
  
  if (goalsMatch && goalsMatch[1]) {
    const goalsList = goalsMatch[1]
      .split('\n')
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(Boolean);
    
    goalsList.forEach(goal => goals.add(goal));
  }
  
  return Array.from(goals);
}

/**
 * Extract learning paths from output text
 */
function extractLearningPathsFromOutput(output) {
  const paths = new Set();
  
  // Look for learning paths section
  const pathsRegex = /# Recommended Learning Paths\s+((?:-\s*[^\n]+\s*)+)/i;
  const pathsMatch = output.match(pathsRegex);
  
  if (pathsMatch && pathsMatch[1]) {
    const pathsList = pathsMatch[1]
      .split('\n')
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(Boolean);
    
    pathsList.forEach(path => paths.add(path));
  }
  
  return Array.from(paths);
}

/**
 * Extract reflective questions from output text
 */
function extractReflectiveQuestionsFromOutput(output) {
  const questions = new Set();
  
  // Look for reflective questions section
  const questionsRegex = /# Reflective Questions\s+((?:-\s*[^\n]+\s*)+)/i;
  const questionsMatch = output.match(questionsRegex);
  
  if (questionsMatch && questionsMatch[1]) {
    const questionsList = questionsMatch[1]
      .split('\n')
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(Boolean);
    
    questionsList.forEach(question => questions.add(question));
  }
  
  return Array.from(questions);
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
 * Create a chat content summary for BumpUps processing
 */
function createChatContentSummary(messages) {
  // Extract user messages and assistant responses
  const userMessages = messages.filter(msg => msg.role === 'user').map(msg => msg.content);
  const assistantMessages = messages.filter(msg => msg.role === 'assistant').map(msg => msg.content);
  
  // Create a summary of the conversation
  let summary = "Chat Summary:\n\n";
  
  // Add user interests and topics
  summary += "User Interests and Topics Discussed:\n";
  userMessages.forEach((msg, index) => {
    summary += `- ${msg.substring(0, 100)}${msg.length > 100 ? '...' : ''}\n`;
  });
  
  // Add assistant insights
  summary += "\nAssistant Insights and Recommendations:\n";
  assistantMessages.forEach((msg, index) => {
    // Extract first 100 characters of each message
    summary += `- ${msg.substring(0, 100)}${msg.length > 100 ? '...' : ''}\n`;
  });
  
  return summary;
}

/**
 * Enrich chat summaries with BumpUps
 */
async function enrichChatSummariesWithBumpups() {
  try {
    console.log('Starting to enrich chat summaries with BumpUps...');
    
    // Get all chat summaries
    const summariesSnapshot = await db.collection('chatSummaries').get();
    
    if (summariesSnapshot.empty) {
      console.log('No chat summaries found');
      return;
    }
    
    console.log(`Found ${summariesSnapshot.size} chat summaries to enrich`);
    
    for (const doc of summariesSnapshot.docs) {
      const summaryData = doc.data();
      const summaryId = doc.id;
      
      console.log(`Enriching chat summary: ${summaryId}`);
      
      try {
        // Get chat messages for the thread
        const threadId = summaryData.threadId;
        const messages = await getChatMessagesForThread(threadId);
        
        if (messages.length === 0) {
          console.log(`No messages found for thread ${threadId}, skipping`);
          continue;
        }
        
        // Create a summary of the chat content
        const chatContentSummary = createChatContentSummary(messages);
        
        // Process chat with BumpUps
        const enrichedData = await processChatWithBumpups(chatContentSummary);
        
        // Update the chat summary with enriched data
        await db.collection('chatSummaries').doc(summaryId).update({
          interests: [...new Set([...(summaryData.interests || []), ...enrichedData.interests])],
          skills: [...new Set([...(summaryData.skills || []), ...enrichedData.skills])],
          careerGoals: [...new Set([...(summaryData.careerGoals || []), ...enrichedData.careerGoals])],
          learningPaths: enrichedData.learningPaths,
          reflectiveQuestions: enrichedData.reflectiveQuestions,
          enriched: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Successfully enriched chat summary: ${summaryId}`);
      } catch (error) {
        console.error(`Error enriching chat summary ${summaryId}:`, error);
      }
    }
    
    console.log('Finished enriching chat summaries with BumpUps');
    process.exit(0);
  } catch (error) {
    console.error('Error in enrichChatSummariesWithBumpups:', error);
    process.exit(1);
  }
}

// Execute the function
enrichChatSummariesWithBumpups(); 