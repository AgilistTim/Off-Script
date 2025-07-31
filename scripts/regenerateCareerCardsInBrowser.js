/**
 * Browser Console Script: Regenerate Career Cards with Comprehensive Framework
 * 
 * INSTRUCTIONS:
 * 1. Open your dashboard in the browser while logged in
 * 2. Open Developer Tools (F12)
 * 3. Go to Console tab
 * 4. Copy and paste this entire script
 * 5. Press Enter to execute
 * 
 * This will delete your old basic career cards and trigger regeneration
 * with the comprehensive 10-section professional framework.
 */

async function regenerateCareerCards() {
  try {
    console.log('🚀 Starting career card regeneration with comprehensive framework...');
    
    // Import Firebase services from the existing app
    const { db } = await import('/src/services/firebase.ts');
    const { collection, query, where, getDocs, deleteDoc, doc } = await import('firebase/firestore');
    const { getAuth } = await import('firebase/auth');
    
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.error('❌ No user logged in. Please log in first.');
      return;
    }
    
    console.log(`🔍 Regenerating career cards for user: ${currentUser.uid}`);
    
    // Step 1: Delete existing threadCareerGuidance documents
    const guidanceQuery = query(
      collection(db, 'threadCareerGuidance'),
      where('userId', '==', currentUser.uid)
    );
    
    const guidanceSnapshot = await getDocs(guidanceQuery);
    console.log(`🗑️ Found ${guidanceSnapshot.docs.length} career guidance documents to delete`);
    
    let deletedCount = 0;
    for (const docSnap of guidanceSnapshot.docs) {
      const data = docSnap.data();
      console.log(`   Deleting: ${docSnap.id}`);
      console.log(`     - Primary: ${data.guidance?.primaryPathway?.title || 'None'}`);
      console.log(`     - Alternatives: ${data.guidance?.alternativePathways?.length || 0}`);
      
      await deleteDoc(doc(db, 'threadCareerGuidance', docSnap.id));
      deletedCount++;
    }
    
    console.log(`✅ Deleted ${deletedCount} old career guidance documents`);
    
    // Step 2: Clear any cached career explorations (legacy format)
    try {
      const explorationsQuery = query(
        collection(db, 'careerExplorations'),
        where('userId', '==', currentUser.uid)
      );
      
      const explorationsSnapshot = await getDocs(explorationsQuery);
      console.log(`🗑️ Found ${explorationsSnapshot.docs.length} legacy career explorations to delete`);
      
      for (const docSnap of explorationsSnapshot.docs) {
        await deleteDoc(doc(db, 'careerExplorations', docSnap.id));
      }
      
      if (explorationsSnapshot.docs.length > 0) {
        console.log(`✅ Deleted ${explorationsSnapshot.docs.length} legacy career exploration documents`);
      }
    } catch (error) {
      console.log('ℹ️ No legacy career explorations found (this is normal)');
    }
    
    console.log('\n🎯 REGENERATION COMPLETE!');
    console.log('📋 What happens next:');
    console.log('1. Your old basic career cards have been deleted');
    console.log('2. Refresh your dashboard - it will show 0 career cards initially');
    console.log('3. Start a new AI conversation about your career interests');
    console.log('4. When career analysis triggers, new comprehensive cards will be generated');
    console.log('5. The new cards will include all 10 professional intelligence sections:');
    console.log('   ✅ Role Fundamentals');
    console.log('   ✅ Competency Requirements');
    console.log('   ✅ Compensation & Rewards');
    console.log('   ✅ Career Trajectory');
    console.log('   ✅ Labour-Market Dynamics');
    console.log('   ✅ Work Environment & Culture');
    console.log('   ✅ Lifestyle Fit');
    console.log('   ✅ Cost & Risk of Entry');
    console.log('   ✅ Values & Impact');
    console.log('   ✅ Transferability & Future-Proofing');
    
    // Force a page refresh to clear any cached data
    console.log('\n🔄 Refreshing page to clear cached data...');
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
    return {
      deletedGuidanceDocuments: deletedCount,
      status: 'regeneration_complete',
      nextSteps: 'Start a new AI conversation to generate comprehensive career cards'
    };
    
  } catch (error) {
    console.error('❌ Error during regeneration:', error);
    return {
      status: 'error',
      error: error.message
    };
  }
}

// Execute the regeneration
console.log('🎯 Career Card Regeneration Script Loaded');
console.log('▶️ Executing regeneration...');
regenerateCareerCards().then(result => {
  console.log('🎉 Regeneration result:', result);
}).catch(error => {
  console.error('💥 Regeneration failed:', error);
});