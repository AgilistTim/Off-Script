#!/usr/bin/env node

/**
 * Manual script to merge existing enhanced career data from enhancedCareerCards 
 * back to threadCareerGuidance collection for user-facing display
 */

// Use require instead of import for Node.js compatibility
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

// Initialize Firebase with the same config as the app
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

async function mergeEnhancedDataToThreadGuidance(careerTitle, enhancedData) {
  try {
    console.log(`🔄 Merging enhanced data for "${careerTitle}" back to threadCareerGuidance`);
    
    // Find threadCareerGuidance documents that contain this career title
    const threadGuidanceRef = collection(firestore, 'threadCareerGuidance');
    const guidanceSnapshot = await getDocs(threadGuidanceRef);
    
    let mergedCount = 0;
    
    for (const docSnap of guidanceSnapshot.docs) {
      const data = docSnap.data();
      let hasUpdates = false;
      const updates = {};
      
      // Check and update primary pathway
      if (data.guidance?.primaryPathway?.title?.toLowerCase() === careerTitle.toLowerCase()) {
        console.log(`🎯 Found matching primary pathway in doc ${docSnap.id}`);
        
        updates['guidance.primaryPathway'] = {
          ...data.guidance.primaryPathway,
          // Map enhanced data to the fields expected by user-facing components
          enhancedSalary: enhancedData.verifiedSalaryRanges,
          careerProgression: enhancedData.currentEducationPathways,
          dayInTheLife: enhancedData.workEnvironmentDetails,
          industryTrends: enhancedData.industryGrowthProjection,
          topUKEmployers: enhancedData.realTimeMarketDemand,
          professionalTestimonials: enhancedData.competencyRequirements,
          additionalQualifications: enhancedData.competencyRequirements?.qualificationPathway,
          workLifeBalance: enhancedData.workEnvironmentDetails,
          inDemandSkills: enhancedData.competencyRequirements?.technicalSkills,
          professionalAssociations: enhancedData.competencyRequirements?.softSkills,
          enhancedSources: enhancedData.sources || [],
          isEnhanced: true,
          enhancedAt: new Date(),
          enhancementSource: 'perplexity',
          enhancementStatus: 'enhanced'
        };
        hasUpdates = true;
      }
      
      // Check and update alternative pathways
      if (data.guidance?.alternativePathways?.length > 0) {
        const updatedAlternatives = data.guidance.alternativePathways.map((pathway) => {
          if (pathway.title?.toLowerCase() === careerTitle.toLowerCase()) {
            console.log(`🎯 Found matching alternative pathway in doc ${docSnap.id}`);
            return {
              ...pathway,
              // Map enhanced data to the fields expected by user-facing components
              enhancedSalary: enhancedData.verifiedSalaryRanges,
              careerProgression: enhancedData.currentEducationPathways,
              dayInTheLife: enhancedData.workEnvironmentDetails,
              industryTrends: enhancedData.industryGrowthProjection,
              topUKEmployers: enhancedData.realTimeMarketDemand,
              professionalTestimonials: enhancedData.competencyRequirements,
              additionalQualifications: enhancedData.competencyRequirements?.qualificationPathway,
              workLifeBalance: enhancedData.workEnvironmentDetails,
              inDemandSkills: enhancedData.competencyRequirements?.technicalSkills,
              professionalAssociations: enhancedData.competencyRequirements?.softSkills,
              enhancedSources: enhancedData.sources || [],
              isEnhanced: true,
              enhancedAt: new Date(),
              enhancementSource: 'perplexity',
              enhancementStatus: 'enhanced'
            };
          }
          return pathway;
        });
        
        // Check if any alternatives were updated
        const hasAlternativeUpdates = updatedAlternatives.some((pathway, index) => 
          pathway.isEnhanced && !data.guidance.alternativePathways[index].isEnhanced
        );
        
        if (hasAlternativeUpdates) {
          updates['guidance.alternativePathways'] = updatedAlternatives;
          hasUpdates = true;
        }
      }
      
      // Save updates if any were made
      if (hasUpdates) {
        updates.updatedAt = new Date();
        await updateDoc(doc(firestore, 'threadCareerGuidance', docSnap.id), updates);
        mergedCount++;
        console.log(`✅ Merged enhanced data to threadCareerGuidance document: ${docSnap.id}`);
      }
    }
    
    if (mergedCount > 0) {
      console.log(`🎉 Successfully merged enhanced data for "${careerTitle}" to ${mergedCount} threadCareerGuidance documents`);
    } else {
      console.log(`⚠️ No matching threadCareerGuidance documents found for "${careerTitle}"`);
    }
    
    return mergedCount;
    
  } catch (error) {
    console.error(`❌ Error merging enhanced data for "${careerTitle}":`, error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting enhanced career data merge process...');
    console.log('');
    
    // Get all enhanced career cards
    const enhancedCardsRef = collection(firestore, 'enhancedCareerCards');
    const enhancedSnapshot = await getDocs(enhancedCardsRef);
    
    let mergedCount = 0;
    const errors = [];
    
    for (const docSnap of enhancedSnapshot.docs) {
      try {
        const data = docSnap.data();
        const result = await mergeEnhancedDataToThreadGuidance(data.careerTitle, data.enhancedData);
        mergedCount += result;
      } catch (error) {
        const errorMsg = `Failed to merge ${docSnap.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }
    
    console.log('');
    console.log('📊 Merge Results:');
    console.log(`✅ Successfully merged: ${mergedCount} career cards`);
    console.log(`❌ Errors encountered: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('');
      console.log('🔍 Error Details:');
      errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    console.log('');
    console.log('🎉 Enhanced career data merge process completed!');
    console.log('');
    console.log('ℹ️  What this does:');
    console.log('   - Finds enhanced data stored in enhancedCareerCards collection');
    console.log('   - Merges it back to threadCareerGuidance for user-facing display');  
    console.log('   - Fixes the issue where users see incomplete enhanced data');
    console.log('');
    
    process.exit(errors.length > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

main();
