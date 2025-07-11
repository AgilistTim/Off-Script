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
 * Batch Video Processing Configuration
 */
const BATCH_CONFIG = {
  batchSize: 5, // Process 5 videos at a time to avoid rate limits
  delayBetweenBatches: 10000, // 10 seconds between batches
  delayBetweenVideos: 3000, // 3 seconds between individual videos
  maxRetries: 3,
  skipExistingAnalysis: true, // Skip videos that already have analysis
  reprocessFailed: true, // Re-process videos that previously failed
  dryRun: false, // Set to true to see what would be processed without actually doing it
  limit: null // Limit number of videos to process (null for no limit)
};

/**
 * Processing statistics
 */
class ProcessingStats {
  constructor() {
    this.total = 0;
    this.processed = 0;
    this.skipped = 0;
    this.failed = 0;
    this.withTranscripts = 0;
    this.withBumpupsOnly = 0;
    this.errors = [];
    this.startTime = Date.now();
  }

  addError(videoId, error) {
    this.errors.push({ videoId, error: error.message || error.toString() });
  }

  getReport() {
    const duration = Date.now() - this.startTime;
    return {
      duration: Math.round(duration / 1000) + 's',
      total: this.total,
      processed: this.processed,
      skipped: this.skipped,
      failed: this.failed,
      withTranscripts: this.withTranscripts,
      withBumpupsOnly: this.withBumpupsOnly,
      successRate: this.total > 0 ? Math.round((this.processed / this.total) * 100) + '%' : '0%',
      errors: this.errors
    };
  }
}

/**
 * Call Firebase Function to process video with transcript
 */
async function processVideoWithFunction(videoId, videoUrl, category = 'technology') {
  const functionUrl = process.env.NODE_ENV === 'production' 
    ? `https://us-central1-${process.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net/processVideoWithTranscript`
    : `http://127.0.0.1:5001/${process.env.VITE_FIREBASE_PROJECT_ID}/us-central1/processVideoWithTranscript`;

  console.log(`  📡 Calling function: ${functionUrl}`);
  
  const requestBody = {
    videoId,     // Include the Firestore document ID
    videoUrl,
    category
  };
  
  console.log(`  📤 Request body:`, JSON.stringify(requestBody, null, 2));

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Function call failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Update video record with analysis results
 */
async function updateVideoWithAnalysis(videoId, analysisData, transcriptData = null) {
  const updateData = {};

  // Add transcript data if available
  if (transcriptData && transcriptData.success) {
    updateData.transcript = {
      fullText: transcriptData.fullText,
      segments: transcriptData.segments || [],
      segmentCount: transcriptData.segmentCount || 0,
      extractedAt: admin.firestore.Timestamp.now()
    };
  }

  // Add AI analysis data
  if (analysisData) {
    updateData.aiAnalysis = {
      ...(updateData.aiAnalysis || {}),
      ...analysisData,
      analyzedAt: admin.firestore.Timestamp.now(),
      analysisType: 'career_exploration'
    };

    // Extract structured fields for recommendations
    if (analysisData.openaiAnalysis) {
      const openaiData = analysisData.openaiAnalysis;
      
      if (openaiData.careerInsights) {
        updateData.skillsHighlighted = openaiData.careerInsights.skillsHighlighted || [];
        updateData.careerPathways = openaiData.careerInsights.relatedCareerPaths || [];
        updateData.educationRequired = Array.isArray(openaiData.careerInsights.educationRequirements) 
          ? openaiData.careerInsights.educationRequirements 
          : [openaiData.careerInsights.educationRequirements].filter(Boolean);
      }

      if (openaiData.engagement) {
        updateData.hashtags = openaiData.engagement.hashtags || [];
        updateData.reflectiveQuestions = openaiData.engagement.reflectionQuestions || [];
      }

      if (openaiData.keyMoments) {
        updateData.keyThemes = openaiData.keyMoments
          .filter(moment => moment.type === 'skill' || moment.type === 'career-advice')
          .map(moment => moment.title || moment.description)
          .slice(0, 5);
      }
    }

    // Handle legacy bumpups analysis
    if (analysisData.careerInfo) {
      updateData.skillsHighlighted = updateData.skillsHighlighted || analysisData.careerInfo.skills || [];
      updateData.educationRequired = updateData.educationRequired || analysisData.careerInfo.education || [];
    }
  }

  // Update analysis status
  updateData.analysisStatus = 'completed';
  updateData.lastAnalyzed = admin.firestore.Timestamp.now();

  await db.collection('videos').doc(videoId).update(updateData);
  return updateData;
}

/**
 * Check if video needs processing
 */
function needsProcessing(video) {
  // Skip if configured to skip existing analysis and video has analysis
  if (BATCH_CONFIG.skipExistingAnalysis && video.analysisStatus === 'completed' && video.aiAnalysis) {
    return false;
  }

  // Re-process if configured to reprocess failed videos and video failed
  if (BATCH_CONFIG.reprocessFailed && video.analysisStatus === 'failed') {
    return true;
  }

  // Process if no analysis status or pending/analyzing
  return !video.analysisStatus || 
         video.analysisStatus === 'pending' || 
         video.analysisStatus === 'analyzing' ||
         !video.aiAnalysis;
}

/**
 * Process a single video
 */
async function processSingleVideo(video, stats) {
  const { id: videoId, sourceUrl, title } = video;
  const category = video.category || 'technology'; // Ensure category is not empty

  console.log(`\n📹 Processing: ${title || 'Untitled'} (${videoId})`);

  if (!sourceUrl) {
    console.log(`  ⚠️  No source URL found, skipping`);
    stats.skipped++;
    return;
  }

  if (BATCH_CONFIG.dryRun) {
    console.log(`  🔍 DRY RUN: Would process ${sourceUrl}`);
    stats.processed++;
    return;
  }

  let retries = 0;
  while (retries < BATCH_CONFIG.maxRetries) {
    try {
      // Call the processVideoWithTranscript function
      console.log(`  🚀 Attempt ${retries + 1}/${BATCH_CONFIG.maxRetries}`);
      const result = await processVideoWithFunction(videoId, sourceUrl, category);

      if (result.success) {
        console.log(`  ✅ Processing completed successfully`);
        
        // Count processing types
        if (result.stages?.transcripts?.success) {
          stats.withTranscripts++;
          console.log(`    📝 Transcript extracted (${result.stages.transcripts.segmentCount || 0} segments)`);
        } else if (result.stages?.bumpupsInsights?.success) {
          stats.withBumpupsOnly++;
          console.log(`    🎯 Bumpups analysis completed`);
        }

        if (result.stages?.openaiAnalysis?.success) {
          console.log(`    🤖 OpenAI analysis completed`);
        }

        stats.processed++;
        return;
      } else {
        throw new Error(result.error || 'Processing failed');
      }

    } catch (error) {
      retries++;
      console.log(`  ❌ Attempt ${retries} failed: ${error.message}`);
      
      if (retries >= BATCH_CONFIG.maxRetries) {
        console.log(`  💀 Max retries exceeded, marking as failed`);
        stats.failed++;
        stats.addError(videoId, error);
        
        // Update video to mark as failed
        try {
          await db.collection('videos').doc(videoId).update({
            analysisStatus: 'failed',
            enrichmentError: error.message,
            lastAnalyzed: admin.firestore.Timestamp.now()
          });
        } catch (updateError) {
          console.log(`  ⚠️  Failed to update error status: ${updateError.message}`);
        }
        return;
      } else {
        console.log(`  ⏳ Retrying in 5 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
}

/**
 * Get all videos that need processing
 */
async function getVideosToProcess() {
  console.log('📚 Fetching videos from Firestore...');
  
  const videosRef = db.collection('videos');
  const snapshot = await videosRef.get();
  
  if (snapshot.empty) {
    console.log('No videos found in database');
    return [];
  }

  const allVideos = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  console.log(`Found ${allVideos.length} total videos`);

  // Filter videos that need processing
  const videosToProcess = allVideos.filter(needsProcessing);
  console.log(`${videosToProcess.length} videos need processing`);

  // Prioritize videos without any analysis first
  videosToProcess.sort((a, b) => {
    const aHasAnalysis = a.analysisStatus === 'completed' && a.aiAnalysis;
    const bHasAnalysis = b.analysisStatus === 'completed' && b.aiAnalysis;
    
    if (aHasAnalysis && !bHasAnalysis) return 1;
    if (!aHasAnalysis && bHasAnalysis) return -1;
    return 0;
  });

  // Apply limit if specified
  if (BATCH_CONFIG.limit && videosToProcess.length > BATCH_CONFIG.limit) {
    const originalLength = videosToProcess.length;
    videosToProcess.splice(BATCH_CONFIG.limit);
    console.log(`🔢 Limited to ${BATCH_CONFIG.limit} videos (from ${originalLength})`);
  }

  return videosToProcess;
}

/**
 * Process videos in batches
 */
async function processBatch(videos, batchNumber, totalBatches, stats) {
  console.log(`\n🎬 Processing batch ${batchNumber}/${totalBatches} (${videos.length} videos)`);
  
  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    
    console.log(`\n--- Video ${((batchNumber - 1) * BATCH_CONFIG.batchSize) + i + 1}/${stats.total} ---`);
    
    await processSingleVideo(video, stats);
    
    // Add delay between videos in the same batch
    if (i < videos.length - 1) {
      console.log(`  ⏳ Waiting ${BATCH_CONFIG.delayBetweenVideos / 1000}s before next video...`);
      await new Promise(resolve => setTimeout(resolve, BATCH_CONFIG.delayBetweenVideos));
    }
  }
}

/**
 * Main batch processing function
 */
async function batchProcessVideos() {
  console.log('🚀 Starting batch video processing...');
  console.log('⚙️  Configuration:', BATCH_CONFIG);

  const stats = new ProcessingStats();
  
  try {
    // Get videos to process
    const videosToProcess = await getVideosToProcess();
    
    if (videosToProcess.length === 0) {
      console.log('✅ No videos need processing!');
      return;
    }

    stats.total = videosToProcess.length;

    // Split into batches
    const batches = [];
    for (let i = 0; i < videosToProcess.length; i += BATCH_CONFIG.batchSize) {
      batches.push(videosToProcess.slice(i, i + BATCH_CONFIG.batchSize));
    }

    console.log(`📦 Processing ${videosToProcess.length} videos in ${batches.length} batches`);

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      await processBatch(batches[i], i + 1, batches.length, stats);
      
      // Add delay between batches
      if (i < batches.length - 1) {
        console.log(`\n⏸️  Batch completed. Waiting ${BATCH_CONFIG.delayBetweenBatches / 1000}s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, BATCH_CONFIG.delayBetweenBatches));
      }
    }

  } catch (error) {
    console.error('💥 Batch processing error:', error);
    stats.addError('BATCH_ERROR', error);
  }

  // Final report
  console.log('\n📊 BATCH PROCESSING COMPLETE');
  console.log('=' .repeat(50));
  const report = stats.getReport();
  console.log(`Duration: ${report.duration}`);
  console.log(`Total videos: ${report.total}`);
  console.log(`Successfully processed: ${report.processed}`);
  console.log(`Skipped: ${report.skipped}`);
  console.log(`Failed: ${report.failed}`);
  console.log(`With transcripts: ${report.withTranscripts}`);
  console.log(`With Bumpups only: ${report.withBumpupsOnly}`);
  console.log(`Success rate: ${report.successRate}`);
  
  if (report.errors.length > 0) {
    console.log('\n❌ Errors:');
    report.errors.slice(0, 10).forEach(({ videoId, error }) => {
      console.log(`  ${videoId}: ${error}`);
    });
    if (report.errors.length > 10) {
      console.log(`  ... and ${report.errors.length - 10} more errors`);
    }
  }

  console.log('\n✨ Batch processing completed!');
  process.exit(0);
}

// Command line argument handling
const args = process.argv.slice(2);
if (args.includes('--dry-run')) {
  BATCH_CONFIG.dryRun = true;
  console.log('🔍 DRY RUN MODE ENABLED');
}
if (args.includes('--reprocess-all')) {
  BATCH_CONFIG.skipExistingAnalysis = false;
  console.log('🔄 REPROCESS ALL MODE ENABLED');
}
const limitIndex = args.indexOf('--limit');
if (limitIndex !== -1 && args[limitIndex + 1]) {
  BATCH_CONFIG.limit = parseInt(args[limitIndex + 1], 10);
  console.log(`🔢 LIMIT MODE ENABLED: Processing max ${BATCH_CONFIG.limit} videos`);
}
if (args.includes('--help')) {
  console.log(`
🎬 Batch Video Processing Script

Usage: node batchProcessVideos.js [options]

Options:
  --dry-run           Show what would be processed without actually processing
  --reprocess-all     Process all videos, even those with existing analysis
  --limit <number>    Limit the number of videos to process (useful for testing)
  --help              Show this help message

Configuration:
  - Batch size: ${BATCH_CONFIG.batchSize} videos per batch
  - Delay between batches: ${BATCH_CONFIG.delayBetweenBatches / 1000}s
  - Delay between videos: ${BATCH_CONFIG.delayBetweenVideos / 1000}s
  - Max retries: ${BATCH_CONFIG.maxRetries}
  - Skip existing analysis: ${BATCH_CONFIG.skipExistingAnalysis}
  `);
  process.exit(0);
}

// Start processing
batchProcessVideos().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
}); 