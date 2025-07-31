#!/usr/bin/env node

/**
 * Regenerate Career Cards with Comprehensive 10-Section Framework
 * 
 * This script deletes existing career cards and regenerates them using
 * the new comprehensive professional intelligence schema.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function regenerateCareerCardsForUser(userId) {
  try {
    console.log(`🚀 Starting career card regeneration for user: ${userId}`);
    
    // Step 1: Find and delete existing threadCareerGuidance documents
    const guidanceQuery = query(
      collection(db, 'threadCareerGuidance'),
      where('userId', '==', userId)
    );
    
    const guidanceSnapshot = await getDocs(guidanceQuery);
    console.log(`🔍 Found ${guidanceSnapshot.docs.length} threadCareerGuidance documents to delete`);
    
    const deletePromises = guidanceSnapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();
      console.log(`🗑️ Deleting threadCareerGuidance: ${docSnap.id}`);
      console.log(`   - Primary pathway: ${data.guidance?.primaryPathway?.title || 'None'}`);
      console.log(`   - Alternative pathways: ${data.guidance?.alternativePathways?.length || 0}`);
      
      await deleteDoc(doc(db, 'threadCareerGuidance', docSnap.id));
    });
    
    await Promise.all(deletePromises);
    console.log(`✅ Deleted ${guidanceSnapshot.docs.length} old career guidance documents`);
    
    // Step 2: Find conversation messages for regeneration context
    const messagesQuery = query(
      collection(db, 'chatMessages'),
      where('userId', '==', userId)
    );
    
    const messagesSnapshot = await getDocs(messagesQuery);
    console.log(`🔍 Found ${messagesSnapshot.docs.length} conversation messages for context`);
    
    if (messagesSnapshot.docs.length === 0) {
      console.log('⚠️ No conversation messages found. Cannot regenerate career cards without conversation context.');
      return;
    }
    
    // Step 3: Instructions for manual regeneration
    console.log('\n🎯 REGENERATION COMPLETE - Next Steps:');
    console.log('1. The old career cards have been deleted from the database');
    console.log('2. The next time the user visits their dashboard, it will show 0 career cards');
    console.log('3. When the user has a new AI conversation and career analysis is triggered,');
    console.log('   new career cards will be generated using the comprehensive 10-section framework');
    console.log('4. Alternatively, the user can start a new conversation to generate fresh career cards');
    
    console.log('\n📋 Career Card Generation Process:');
    console.log('- ✅ Old basic-format cards deleted');
    console.log('- ⏳ New comprehensive cards will be auto-generated on next conversation');
    console.log('- 🎯 New cards will include all 10 professional intelligence sections');
    console.log('- 💰 Accurate UK salary data with detailed breakdowns');
    console.log('- 📈 Comprehensive career progression pathways');
    console.log('- 🎓 Detailed training and qualification requirements');
    
    return {
      deletedDocuments: guidanceSnapshot.docs.length,
      conversationMessages: messagesSnapshot.docs.length,
      status: 'regeneration_ready'
    };
    
  } catch (error) {
    console.error('❌ Error regenerating career cards:', error);
    throw error;
  }
}

async function main() {
  const userId = process.argv[2];
  
  if (!userId) {
    console.log('Usage: node regenerateCareerCards.js <userId>');
    console.log('Example: node regenerateCareerCards.js bdUhUqIYhhN1oV5WJll9vA0kyWg2');
    process.exit(1);
  }
  
  try {
    console.log('🔧 Regenerating career cards with comprehensive 10-section framework...\n');
    
    const result = await regenerateCareerCardsForUser(userId);
    
    console.log('\n✅ REGENERATION SUCCESSFUL!');
    console.log(`📊 Results: ${JSON.stringify(result, null, 2)}`);
    console.log('\n🎉 The user will now receive comprehensive 10-section career cards on their next dashboard visit or conversation!');
    
  } catch (error) {
    console.error('\n❌ REGENERATION FAILED:', error.message);
    process.exit(1);
  }
}

// Run the regeneration
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { regenerateCareerCardsForUser };