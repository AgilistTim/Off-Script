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
  console.log('💡 To fix this:');
  console.log('  1. Download service account key from Firebase Console');
  console.log('  2. Save as firebase-service-account.json in project root');
  console.log('  3. Or run: firebase login and use Firebase emulator');
  process.exit(1);
}

const db = admin.firestore();

/**
 * Analyze processing status of all videos
 */
async function checkProcessingStatus() {
  console.log('📊 Analyzing video processing status...\n');

  try {
    const videosRef = db.collection('videos');
    const snapshot = await videosRef.get();

    if (snapshot.empty) {
      console.log('No videos found in database');
      return;
    }

    const videos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Initialize counters
    const stats = {
      total: videos.length,
      byStatus: {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        unknown: 0
      },
      byAnalysisType: {
        withTranscripts: 0,
        withOpenAI: 0,
        withBumpups: 0,
        noAnalysis: 0
      },
      byDataEnrichment: {
        hasSkills: 0,
        hasCareerPathways: 0,
        hasHashtags: 0,
        hasReflectiveQuestions: 0,
        hasKeyThemes: 0,
        fullyEnriched: 0
      },
      categories: {},
      recentlyProcessed: [],
      needsProcessing: []
    };

    // Analyze each video
    videos.forEach(video => {
      // Analysis status
      const status = video.analysisStatus || 'unknown';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      // Analysis type
      if (video.transcript && video.transcript.fullText) {
        stats.byAnalysisType.withTranscripts++;
      }
      if (video.aiAnalysis?.openaiAnalysis) {
        stats.byAnalysisType.withOpenAI++;
      }
      if (video.aiAnalysis && !video.aiAnalysis.openaiAnalysis) {
        stats.byAnalysisType.withBumpups++;
      }
      if (!video.aiAnalysis) {
        stats.byAnalysisType.noAnalysis++;
      }

      // Data enrichment
      if (video.skillsHighlighted && video.skillsHighlighted.length > 0) {
        stats.byDataEnrichment.hasSkills++;
      }
      if (video.careerPathways && video.careerPathways.length > 0) {
        stats.byDataEnrichment.hasCareerPathways++;
      }
      if (video.hashtags && video.hashtags.length > 0) {
        stats.byDataEnrichment.hasHashtags++;
      }
      if (video.reflectiveQuestions && video.reflectiveQuestions.length > 0) {
        stats.byDataEnrichment.hasReflectiveQuestions++;
      }
      if (video.keyThemes && video.keyThemes.length > 0) {
        stats.byDataEnrichment.hasKeyThemes++;
      }

      // Check if fully enriched for recommendations
      const hasRequiredFields = video.skillsHighlighted?.length > 0 &&
                               video.category &&
                               (video.hashtags?.length > 0 || video.careerPathways?.length > 0);
      if (hasRequiredFields) {
        stats.byDataEnrichment.fullyEnriched++;
      }

      // Categories
      const category = video.category || 'uncategorized';
      stats.categories[category] = (stats.categories[category] || 0) + 1;

      // Recently processed (last 24 hours)
      if (video.lastAnalyzed) {
        const lastAnalyzed = video.lastAnalyzed.toDate ? video.lastAnalyzed.toDate() : new Date(video.lastAnalyzed);
        const hoursAgo = (Date.now() - lastAnalyzed.getTime()) / (1000 * 60 * 60);
        if (hoursAgo < 24) {
          stats.recentlyProcessed.push({
            id: video.id,
            title: video.title || 'Untitled',
            hoursAgo: Math.round(hoursAgo * 10) / 10
          });
        }
      }

      // Needs processing
      if (!video.analysisStatus || 
          video.analysisStatus === 'pending' || 
          video.analysisStatus === 'analyzing' ||
          !video.aiAnalysis) {
        stats.needsProcessing.push({
          id: video.id,
          title: video.title || 'Untitled',
          status: video.analysisStatus || 'unknown',
          sourceUrl: video.sourceUrl
        });
      }
    });

    // Display results
    console.log('📈 PROCESSING STATUS REPORT');
    console.log('='.repeat(50));
    console.log(`Total Videos: ${stats.total}`);
    console.log('');

    console.log('📊 Analysis Status:');
    Object.entries(stats.byStatus).forEach(([status, count]) => {
      const percentage = Math.round((count / stats.total) * 100);
      console.log(`  ${status.padEnd(12)}: ${count.toString().padStart(3)} (${percentage}%)`);
    });
    console.log('');

    console.log('🔬 Analysis Types:');
    Object.entries(stats.byAnalysisType).forEach(([type, count]) => {
      const percentage = Math.round((count / stats.total) * 100);
      console.log(`  ${type.padEnd(20)}: ${count.toString().padStart(3)} (${percentage}%)`);
    });
    console.log('');

    console.log('💎 Data Enrichment for Recommendations:');
    Object.entries(stats.byDataEnrichment).forEach(([field, count]) => {
      const percentage = Math.round((count / stats.total) * 100);
      console.log(`  ${field.padEnd(20)}: ${count.toString().padStart(3)} (${percentage}%)`);
    });
    console.log('');

    console.log('📂 Categories:');
    const sortedCategories = Object.entries(stats.categories)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    sortedCategories.forEach(([category, count]) => {
      console.log(`  ${category.padEnd(20)}: ${count}`);
    });
    console.log('');

    if (stats.recentlyProcessed.length > 0) {
      console.log('🕐 Recently Processed (Last 24h):');
      stats.recentlyProcessed
        .sort((a, b) => a.hoursAgo - b.hoursAgo)
        .slice(0, 10)
        .forEach(video => {
          console.log(`  ${video.hoursAgo}h ago: ${video.title} (${video.id})`);
        });
      console.log('');
    }

    if (stats.needsProcessing.length > 0) {
      console.log('⏳ Videos Needing Processing:');
      console.log(`Total: ${stats.needsProcessing.length}`);
      if (stats.needsProcessing.length <= 20) {
        stats.needsProcessing.forEach(video => {
          console.log(`  [${video.status}] ${video.title} (${video.id})`);
        });
      } else {
        console.log('Sample:');
        stats.needsProcessing.slice(0, 10).forEach(video => {
          console.log(`  [${video.status}] ${video.title} (${video.id})`);
        });
        console.log(`  ... and ${stats.needsProcessing.length - 10} more`);
      }
      console.log('');
    }

    // Recommendations readiness
    const recommendationReadiness = Math.round((stats.byDataEnrichment.fullyEnriched / stats.total) * 100);
    console.log('🎯 RECOMMENDATION ENGINE READINESS');
    console.log('='.repeat(50));
    console.log(`Videos ready for recommendations: ${stats.byDataEnrichment.fullyEnriched}/${stats.total} (${recommendationReadiness}%)`);
    
    if (recommendationReadiness < 80) {
      console.log('');
      console.log('💡 RECOMMENDATIONS:');
      if (stats.needsProcessing.length > 0) {
        console.log(`  • Run batch processing on ${stats.needsProcessing.length} pending videos`);
      }
      if (stats.byDataEnrichment.hasSkills < stats.byDataEnrichment.fullyEnriched) {
        console.log('  • Focus on extracting skills data from video analysis');
      }
      if (stats.byDataEnrichment.hasCareerPathways < stats.byDataEnrichment.fullyEnriched) {
        console.log('  • Improve career pathway extraction from transcripts');
      }
    } else {
      console.log('✅ Your video library is well-prepared for the recommendation engine!');
    }

  } catch (error) {
    console.error('Error analyzing processing status:', error);
  }
}

// Command line help
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log(`
📊 Video Processing Status Checker

Usage: node checkProcessingStatus.js

This script analyzes the current state of video processing in your database,
providing insights into:
- Analysis completion status
- Data enrichment for recommendations  
- Recently processed videos
- Videos still needing processing
- Category distribution

No arguments required - just run to get a full report.
  `);
  process.exit(0);
}

// Run the analysis
checkProcessingStatus()
  .then(() => {
    console.log('\n✨ Analysis complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }); 