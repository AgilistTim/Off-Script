import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { spawn } from 'child_process';
import { promisify } from 'util';

dotenv.config();

// Load .env.local if it exists
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envLocalPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  const envLocalContent = dotenv.parse(fs.readFileSync(envLocalPath));
  for (const key in envLocalContent) {
    process.env[key] = envLocalContent[key];
  }
}

// Read service account JSON using fs
const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = getFirestore();

// Rate limiting configuration
const RATE_LIMITING = {
  BATCH_SIZE: 5,           // Process 5 videos at a time
  DELAY_BETWEEN_BATCHES: 30000, // 30 seconds between batches
  DELAY_BETWEEN_REQUESTS: 3000,  // 3 seconds between individual requests
  MAX_RETRIES: 3,
  BACKOFF_MULTIPLIER: 2,
  IP_BLOCK_WAIT: 300000,   // 5 minutes if IP blocked
};

// Statistics tracking
const stats = {
  total: 0,
  processed: 0,
  successful: 0,
  failed: 0,
  noTranscript: 0,
  ipBlocked: 0,
  alreadyHasTranscript: 0,
  startTime: Date.now()
};

function extractVideoId(url) {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

async function callPythonScript(videoId) {
  return new Promise((resolve) => {
    const pythonPath = path.join(__dirname, '../venv/bin/python3');
    const scriptPath = path.join(__dirname, 'extractTranscriptsPython.py');
    
    const process = spawn(pythonPath, [scriptPath, videoId], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let output = '';
    let error = '';
    
    process.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      const errorChunk = data.toString();
      error += errorChunk;
      // Show real-time error messages from Python script
      if (errorChunk.trim()) {
        console.log(`      Python: ${errorChunk.trim()}`);
      }
    });
    
    // Set a timeout for the process (8 minutes to accommodate retries with exponential backoff)
    const timeout = setTimeout(() => {
      process.kill('SIGTERM');
      resolve({
        success: false,
        error: `Process timeout after 8 minutes. Last error output: ${error}`,
        errorType: 'TIMEOUT',
        segments: [],
        fullText: '',
        segmentCount: 0
      });
    }, 8 * 60 * 1000);
    
    process.on('close', (code) => {
      clearTimeout(timeout);
      
      if (code === 0 && output) {
        try {
          const result = JSON.parse(output);
          resolve(result);
        } catch (parseError) {
          resolve({
            success: false,
            error: `JSON parse error: ${parseError.message}`,
            errorType: 'PARSE_ERROR',
            segments: [],
            fullText: '',
            segmentCount: 0
          });
        }
      } else {
        const errorDetails = error || `Process exited with code ${code}`;
        // Try to parse error for type classification
        let errorType = 'PROCESS_ERROR';
        if (error.includes('IP') || error.toLowerCase().includes('blocked')) {
          errorType = 'IP_BLOCKED';
        } else if (error.toLowerCase().includes('transcript') || error.toLowerCase().includes('available')) {
          errorType = 'NO_TRANSCRIPT';
        }
        
        resolve({
          success: false,
          error: errorDetails,
          errorType: errorType,
          segments: [],
          fullText: '',
          segmentCount: 0
        });
      }
    });
    
    process.on('error', (err) => {
      clearTimeout(timeout);
      resolve({
        success: false,
        error: `Process error: ${err.message}`,
        errorType: 'PROCESS_ERROR',
        segments: [],
        fullText: '',
        segmentCount: 0
      });
    });
  });
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processVideo(video, index, batchIndex) {
  const videoId = extractVideoId(video.sourceUrl);
  if (!videoId) {
    console.log(`  [${index}] Could not extract video ID from URL: ${video.sourceUrl}`);
    stats.failed++;
    return { success: false, reason: 'Invalid video ID' };
  }

  // Check if transcript already exists
  if (video.transcript && video.transcript.fullText && video.transcript.fullText.trim() !== '') {
    console.log(`  [${index}] Transcript already exists for video: ${video.title || videoId}`);
    stats.alreadyHasTranscript++;
    return { success: true, reason: 'Already exists' };
  }

  console.log(`  [${index}] Processing: ${video.title || videoId} (${videoId})`);
  
  try {
    // Add delay between requests within a batch
    if (index > 0) {
      await delay(RATE_LIMITING.DELAY_BETWEEN_REQUESTS);
    }
    
    const result = await callPythonScript(videoId);
    
    if (result.success) {
      // Store transcript in Firestore
      await db.collection('videos').doc(video.id).update({
        transcript: {
          segments: result.segments,
          fullText: result.fullText,
          segmentCount: result.segmentCount,
          extractedAt: admin.firestore.FieldValue.serverTimestamp(),
          attempt: result.attempt || 1
        }
      });
      
      console.log(`  [${index}] ✅ Success: ${result.segmentCount} segments extracted`);
      stats.successful++;
      return { success: true, segmentCount: result.segmentCount };
      
    } else {
      console.log(`  [${index}] ❌ Failed: ${result.error}`);
      
      // Track specific error types
      if (result.errorType === 'IP_BLOCKED') {
        stats.ipBlocked++;
        console.log(`  [${index}] 🚫 IP blocked detected - will wait before continuing`);
        return { success: false, reason: 'IP blocked', shouldPause: true };
      } else if (result.errorType === 'NO_TRANSCRIPT') {
        stats.noTranscript++;
      } else {
        stats.failed++;
      }
      
      return { success: false, reason: result.error };
    }
    
  } catch (error) {
    console.log(`  [${index}] ❌ Error: ${error.message}`);
    stats.failed++;
    return { success: false, reason: error.message };
  }
}

async function processBatch(videos, batchIndex) {
  console.log(`\n📦 Processing batch ${batchIndex + 1} (${videos.length} videos)`);
  
  let shouldPause = false;
  
  for (let i = 0; i < videos.length; i++) {
    const result = await processVideo(videos[i], i + 1, batchIndex);
    stats.processed++;
    
    if (result.shouldPause) {
      shouldPause = true;
      break;
    }
  }
  
  // If IP blocked, wait longer
  if (shouldPause) {
    console.log(`\n⏸️  IP blocked detected. Waiting ${RATE_LIMITING.IP_BLOCK_WAIT / 1000} seconds before continuing...`);
    await delay(RATE_LIMITING.IP_BLOCK_WAIT);
  }
  
  return shouldPause;
}

function printStats() {
  const elapsed = (Date.now() - stats.startTime) / 1000;
  const rate = stats.processed / elapsed * 60; // per minute
  
  console.log(`\n📊 Statistics:`);
  console.log(`   Total videos: ${stats.total}`);
  console.log(`   Processed: ${stats.processed}/${stats.total} (${(stats.processed/stats.total*100).toFixed(1)}%)`);
  console.log(`   ✅ Successful: ${stats.successful}`);
  console.log(`   ❌ Failed: ${stats.failed}`);
  console.log(`   📝 No transcript: ${stats.noTranscript}`);
  console.log(`   🚫 IP blocked: ${stats.ipBlocked}`);
  console.log(`   ⏭️  Already exists: ${stats.alreadyHasTranscript}`);
  console.log(`   ⏱️  Processing rate: ${rate.toFixed(1)} videos/minute`);
  console.log(`   🕐 Elapsed time: ${Math.floor(elapsed/60)}m ${Math.floor(elapsed%60)}s`);
}

async function main() {
  try {
    console.log('🚀 Starting transcript extraction...');
    
    // Get all videos with YouTube URLs
    const videosSnapshot = await db.collection('videos').get();
    const videos = [];
    
    videosSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.sourceUrl) {
        videos.push({
          id: doc.id,
          ...data
        });
      }
    });
    
    if (videos.length === 0) {
      console.log('No videos with source URLs found');
      return;
    }
    
    stats.total = videos.length;
    console.log(`Found ${videos.length} videos with source URLs`);
    
    // Process videos in batches
    for (let i = 0; i < videos.length; i += RATE_LIMITING.BATCH_SIZE) {
      const batch = videos.slice(i, i + RATE_LIMITING.BATCH_SIZE);
      const batchIndex = Math.floor(i / RATE_LIMITING.BATCH_SIZE);
      
      const wasBlocked = await processBatch(batch, batchIndex);
      
      // Print progress
      printStats();
      
      // Wait between batches (unless it's the last batch)
      if (i + RATE_LIMITING.BATCH_SIZE < videos.length) {
        const waitTime = wasBlocked ? RATE_LIMITING.IP_BLOCK_WAIT : RATE_LIMITING.DELAY_BETWEEN_BATCHES;
        console.log(`\n⏳ Waiting ${waitTime / 1000} seconds before next batch...`);
        await delay(waitTime);
      }
    }
    
    console.log('\n✅ Transcript extraction completed!');
    printStats();
    
  } catch (error) {
    console.error('Error in main process:', error);
  }
}

main(); 