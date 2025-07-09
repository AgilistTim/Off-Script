// Import Firebase Admin SDK
import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';

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

/**
 * Create a mock chat thread and summary for testing
 */
async function createMockChatSummary() {
  try {
    console.log('Creating mock chat thread and summary...');
    
    // Create a mock user if one doesn't exist
    const testUserId = 'test-user-' + uuidv4().substring(0, 8);
    
    // Create a mock thread
    const threadRef = await db.collection('chatThreads').add({
      userId: testUserId,
      threadId: 'mock-openai-thread-' + uuidv4().substring(0, 8),
      title: 'Mock Career Conversation',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastMessage: 'I want to explore careers in technology and design.'
    });
    
    const threadId = threadRef.id;
    console.log(`Created mock thread with ID: ${threadId}`);
    
    // Add mock messages to the thread
    const messagesCollection = threadRef.collection('messages');
    
    await messagesCollection.add({
      content: 'Hi, I want to explore careers in technology and design.',
      role: 'user',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    await messagesCollection.add({
      content: 'That\'s great! Technology and design are exciting fields with many opportunities. Could you tell me more about your specific interests or skills?',
      role: 'assistant',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    await messagesCollection.add({
      content: 'I enjoy coding and creating visual designs. I\'m particularly interested in web development and UI/UX design.',
      role: 'user',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    await messagesCollection.add({
      content: 'Web development and UI/UX design are excellent areas to focus on! They complement each other well. What kind of experience do you have so far?',
      role: 'assistant',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    await messagesCollection.add({
      content: 'I\'ve been learning HTML, CSS, and JavaScript. I\'ve also used Figma for some design projects. I\'m hoping to work on projects that combine coding and design.',
      role: 'user',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('Added mock messages to the thread');
    
    // Create a mock summary
    const summaryRef = await db.collection('chatSummaries').add({
      threadId: threadId,
      userId: testUserId,
      summary: 'The user is interested in careers that combine technology and design, specifically web development and UI/UX design. They have experience with HTML, CSS, JavaScript, and Figma, and want to work on projects that blend coding and design skills.',
      interests: [
        'Web Development',
        'UI/UX Design',
        'Front-end Development',
        'Visual Design',
        'Interactive Design'
      ],
      careerGoals: [
        'Become a Front-end Developer',
        'Work on projects combining coding and design',
        'Develop user-friendly web applications'
      ],
      skills: [
        'HTML',
        'CSS',
        'JavaScript',
        'Figma',
        'Visual Design'
      ],
      learningPaths: [
        'Front-end Development Specialization',
        'UI/UX Design Certification',
        'Full-stack Web Development',
        'Interactive Design Portfolio Building'
      ],
      reflectiveQuestions: [
        'What specific aspects of UI/UX design are you most drawn to?',
        'Have you considered how your coding skills could enhance your design work?',
        'What kind of projects would you like to build that combine your interests?',
        'How do you see the relationship between good design and effective code?'
      ],
      enriched: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Created mock summary with ID: ${summaryRef.id}`);
    
    // Create a second mock thread with different interests
    const threadRef2 = await db.collection('chatThreads').add({
      userId: testUserId,
      threadId: 'mock-openai-thread-' + uuidv4().substring(0, 8),
      title: 'Mock Data Science Conversation',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastMessage: 'I\'m interested in data science and machine learning.'
    });
    
    const threadId2 = threadRef2.id;
    console.log(`Created second mock thread with ID: ${threadId2}`);
    
    // Add mock messages to the second thread
    const messagesCollection2 = threadRef2.collection('messages');
    
    await messagesCollection2.add({
      content: 'I\'m interested in data science and machine learning.',
      role: 'user',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    await messagesCollection2.add({
      content: 'That\'s a fascinating field! Data science and machine learning are growing rapidly. What aspects interest you the most?',
      role: 'assistant',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    await messagesCollection2.add({
      content: 'I enjoy analyzing data and finding patterns. I\'m particularly interested in predictive modeling and AI applications in healthcare.',
      role: 'user',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('Added mock messages to the second thread');
    
    // Create a mock summary for the second thread
    const summaryRef2 = await db.collection('chatSummaries').add({
      threadId: threadId2,
      userId: testUserId,
      summary: 'The user is interested in data science and machine learning, with a focus on predictive modeling and AI applications in healthcare. They enjoy analyzing data and finding patterns.',
      interests: [
        'Data Science',
        'Machine Learning',
        'Artificial Intelligence',
        'Healthcare Technology',
        'Predictive Modeling'
      ],
      careerGoals: [
        'Work in healthcare AI',
        'Develop predictive models',
        'Analyze complex datasets'
      ],
      skills: [
        'Data Analysis',
        'Pattern Recognition',
        'Statistics',
        'Programming'
      ],
      learningPaths: [
        'Data Science Specialization',
        'Machine Learning Engineering',
        'Healthcare Analytics',
        'AI Ethics and Applications'
      ],
      reflectiveQuestions: [
        'What specific healthcare problems would you like to solve with AI?',
        'How do you see the ethical considerations in healthcare AI evolving?',
        'What kinds of data are you most interested in working with?',
        'How might you combine your interest in patterns with real-world applications?'
      ],
      enriched: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Created second mock summary with ID: ${summaryRef2.id}`);
    
    console.log('Successfully created mock chat data for testing');
    process.exit(0);
  } catch (error) {
    console.error('Error creating mock chat summary:', error);
    process.exit(1);
  }
}

// Execute the function
createMockChatSummary(); 