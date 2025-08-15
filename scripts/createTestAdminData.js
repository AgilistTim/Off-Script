/**
 * Script to create test data for admin dashboard
 * Run with: node scripts/createTestAdminData.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('../serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'offscript-8f6eb'
  });
}

const db = admin.firestore();

async function createTestConversations() {
  console.log('🔄 Creating test conversations...');
  
  const testUsers = [
    { id: 'test-user-1', name: 'Alice Johnson', email: 'alice@example.com' },
    { id: 'test-user-2', name: 'Bob Smith', email: 'bob@example.com' },
    { id: 'test-user-3', name: 'Carol Davis', email: 'carol@example.com' }
  ];
  
  // Create test users first
  for (const user of testUsers) {
    await db.collection('users').doc(user.id).set({
      displayName: user.name,
      email: user.email,
      role: 'user',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      careerCardsGenerated: Math.floor(Math.random() * 10) + 1
    });
  }
  
  // Create test conversations
  for (let i = 0; i < 15; i++) {
    const user = testUsers[Math.floor(Math.random() * testUsers.length)];
    const conversationId = `test-conv-${Date.now()}-${i}`;
    const messageCount = Math.floor(Math.random() * 20) + 5;
    const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Last 30 days
    
    // Create conversation document
    await db.collection('elevenLabsConversations').doc(conversationId).set({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      conversationId,
      createdAt: admin.firestore.Timestamp.fromDate(createdAt),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date(createdAt.getTime() + Math.random() * 3600000)),
      messageCount,
      participants: [user.id, 'elevenlabs_agent'],
      status: Math.random() > 0.8 ? 'completed' : 'active',
      lastMessage: 'This is a test conversation message...',
      lastMessageRole: Math.random() > 0.5 ? 'user' : 'assistant',
      careerCardsGenerated: Math.floor(Math.random() * 5),
      hasAudio: Math.random() > 0.3
    });
    
    // Create test messages
    for (let j = 0; j < Math.min(messageCount, 5); j++) {
      await db.collection('elevenLabsConversations').doc(conversationId).collection('messages').add({
        role: j % 2 === 0 ? 'user' : 'assistant',
        content: `Test message ${j + 1} in conversation ${conversationId}`,
        timestamp: admin.firestore.Timestamp.fromDate(new Date(createdAt.getTime() + j * 60000)),
        userId: j % 2 === 0 ? user.id : 'elevenlabs_agent',
        createdAt: admin.firestore.Timestamp.fromDate(new Date(createdAt.getTime() + j * 60000))
      });
    }
  }
  
  console.log('✅ Created 15 test conversations');
}

async function createTestCareerCards() {
  console.log('🔄 Creating test career cards...');
  
  const careers = [
    { title: 'Software Developer', industry: 'Technology', confidence: 85 },
    { title: 'Digital Marketing Specialist', industry: 'Marketing', confidence: 78 },
    { title: 'Data Analyst', industry: 'Technology', confidence: 82 },
    { title: 'Healthcare Assistant', industry: 'Healthcare', confidence: 76 },
    { title: 'Project Manager', industry: 'Business', confidence: 88 },
    { title: 'UX Designer', industry: 'Design', confidence: 80 },
    { title: 'Financial Advisor', industry: 'Finance', confidence: 84 }
  ];
  
  const testUsers = [
    { id: 'test-user-1', name: 'Alice Johnson' },
    { id: 'test-user-2', name: 'Bob Smith' },
    { id: 'test-user-3', name: 'Carol Davis' }
  ];
  
  for (let i = 0; i < 20; i++) {
    const user = testUsers[Math.floor(Math.random() * testUsers.length)];
    const career = careers[Math.floor(Math.random() * careers.length)];
    const threadId = `test-thread-${Date.now()}-${i}`;
    const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    
    await db.collection('threadCareerGuidance').doc(`${threadId}_guidance`).set({
      id: `${threadId}_guidance`,
      threadId,
      userId: user.id,
      userName: user.name,
      guidance: {
        userProfile: {
          goals: ['Explore career options', 'Find meaningful work'],
          interests: [career.industry.toLowerCase(), 'innovation', 'growth'],
          skills: ['communication', 'problem-solving', 'teamwork'],
          careerStage: 'exploring'
        },
        primaryPathway: {
          id: `primary-${Date.now()}-${i}`,
          title: career.title,
          description: `A comprehensive look at the ${career.title} role, including responsibilities, requirements, and growth opportunities.`,
          industry: career.industry,
          confidence: career.confidence,
          match: career.confidence,
          keySkills: ['Technical skills', 'Communication', 'Problem-solving'],
          salaryRange: '£30,000 - £60,000',
          nextSteps: ['Build relevant skills', 'Network with professionals', 'Apply for entry-level positions']
        },
        alternativePathways: careers.slice(0, 2).map((alt, idx) => ({
          id: `alt-${Date.now()}-${i}-${idx}`,
          title: alt.title,
          description: `Alternative career path: ${alt.title}`,
          industry: alt.industry,
          confidence: alt.confidence - 10,
          match: alt.confidence - 10
        }))
      },
      createdAt: admin.firestore.Timestamp.fromDate(createdAt),
      updatedAt: admin.firestore.Timestamp.fromDate(createdAt)
    });
  }
  
  console.log('✅ Created 20 test career cards');
}

async function createTestData() {
  try {
    console.log('🚀 Starting test data creation for admin dashboard...');
    
    await createTestConversations();
    await createTestCareerCards();
    
    console.log('✅ Test data creation completed successfully!');
    console.log('📊 You should now see data in the admin dashboard:');
    console.log('   - 15 test conversations');
    console.log('   - 20 career cards');
    console.log('   - 3 test users with engagement metrics');
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  }
}

// Run the script
createTestData().then(() => {
  console.log('🏁 Script completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
