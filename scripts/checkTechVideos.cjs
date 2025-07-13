#!/usr/bin/env node

const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Check for service account key file first
let serviceAccountPath = path.resolve(__dirname, '../firebase-service-account.json');
let serviceAccount = null;

// Try to load from file
try {
  if (fs.existsSync(serviceAccountPath)) {
    serviceAccount = require(serviceAccountPath);
    console.log('✅ Using service account key file');
  }
} catch (error) {
  // Fallback to environment variables
}

try {
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    // Initialize with default credentials (useful for local development)
    console.log('🔧 Using default Firebase credentials...');
    admin.initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID
    });
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
  process.exit(1);
}

const db = admin.firestore();

/**
 * Check technology videos and their career analysis data
 */
async function checkTechVideos() {
  console.log('🔍 Checking technology videos and their career analysis data...\n');

  try {
    const videosRef = db.collection('videos');
    const snapshot = await videosRef.where('category', '==', 'technology').get();

    if (snapshot.empty) {
      console.log('❌ No technology videos found in database');
      return;
    }

    const techVideos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📊 Found ${techVideos.length} technology videos`);
    console.log('='.repeat(60));

    // Check each technology video
    techVideos.forEach((video, index) => {
      console.log(`\n${index + 1}. ${video.title || 'Untitled'}`);
      console.log(`   ID: ${video.id}`);
      console.log(`   Analysis Status: ${video.analysisStatus || 'unknown'}`);
      
      // Check career analysis data
      const aiAnalysis = video.aiAnalysis || {};
      const careerPathways = aiAnalysis.careerPathways || video.careerPathways || [];
      const skillsHighlighted = aiAnalysis.skillsHighlighted || video.skillsHighlighted || [];
      const keyThemes = aiAnalysis.keyThemes || [];
      const hashtags = aiAnalysis.hashtags || video.hashtags || [];
      
      console.log(`   Career Pathways: ${careerPathways.length > 0 ? careerPathways.slice(0, 3).join(', ') : 'None'}`);
      console.log(`   Skills: ${skillsHighlighted.length > 0 ? skillsHighlighted.slice(0, 3).join(', ') : 'None'}`);
      console.log(`   Key Themes: ${keyThemes.length > 0 ? keyThemes.slice(0, 2).join(', ') : 'None'}`);
      console.log(`   Hashtags: ${hashtags.length > 0 ? hashtags.slice(0, 3).join(', ') : 'None'}`);
      
      // Check if this video would be included in recommendations
      const isCompleted = video.analysisStatus === 'completed';
      const hasCareerData = careerPathways.length > 0 || skillsHighlighted.length > 0 || keyThemes.length > 0;
      
      console.log(`   ✅ Ready for recommendations: ${isCompleted && hasCareerData ? 'YES' : 'NO'}`);
      if (!isCompleted) console.log(`      - Missing: Analysis not completed`);
      if (!hasCareerData) console.log(`      - Missing: Career analysis data`);
    });

    // Summary
    const completedVideos = techVideos.filter(v => v.analysisStatus === 'completed');
    const videosWithCareerData = techVideos.filter(v => {
      const aiAnalysis = v.aiAnalysis || {};
      const careerPathways = aiAnalysis.careerPathways || v.careerPathways || [];
      const skillsHighlighted = aiAnalysis.skillsHighlighted || v.skillsHighlighted || [];
      const keyThemes = aiAnalysis.keyThemes || [];
      return careerPathways.length > 0 || skillsHighlighted.length > 0 || keyThemes.length > 0;
    });

    console.log('\n📈 TECHNOLOGY VIDEOS SUMMARY');
    console.log('='.repeat(40));
    console.log(`Total Technology Videos: ${techVideos.length}`);
    console.log(`Completed Analysis: ${completedVideos.length}`);
    console.log(`With Career Data: ${videosWithCareerData.length}`);
    console.log(`Ready for Recommendations: ${completedVideos.filter(v => {
      const aiAnalysis = v.aiAnalysis || {};
      const careerPathways = aiAnalysis.careerPathways || v.careerPathways || [];
      const skillsHighlighted = aiAnalysis.skillsHighlighted || v.skillsHighlighted || [];
      const keyThemes = aiAnalysis.keyThemes || [];
      return careerPathways.length > 0 || skillsHighlighted.length > 0 || keyThemes.length > 0;
    }).length}`);

    // Check for software-specific videos
    const softwareVideos = techVideos.filter(v => {
      const title = v.title?.toLowerCase() || '';
      const description = v.description?.toLowerCase() || '';
      return title.includes('software') || title.includes('programming') || title.includes('coding') || 
             title.includes('developer') || description.includes('software') || description.includes('programming');
    });

    console.log(`\n💻 Software Development Videos: ${softwareVideos.length}`);
    if (softwareVideos.length > 0) {
      softwareVideos.forEach(video => {
        console.log(`   - ${video.title || 'Untitled'} (${video.analysisStatus || 'unknown'})`);
      });
    }

  } catch (error) {
    console.error('Error checking technology videos:', error);
    process.exit(1);
  }
}

// Run the analysis
checkTechVideos()
  .then(() => {
    console.log('\n✨ Analysis complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  }); 