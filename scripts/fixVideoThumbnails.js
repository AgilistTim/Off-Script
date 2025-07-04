// Script to fix video thumbnails and reset failed videos
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import https from 'https';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Function to check if a URL is accessible
async function isUrlAccessible(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        console.log(`URL ${url} returned status ${res.statusCode}`);
        resolve(false);
      }
      res.destroy();
    }).on("error", (err) => {
      console.log(`Error checking URL ${url}: ${err.message}`);
      resolve(false);
    });
  });
}

// Function to get a valid YouTube thumbnail URL
async function getValidYouTubeThumbnail(videoId) {
  // Try different thumbnail qualities in order
  const thumbnailFormats = [
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/default.jpg`
  ];

  for (const url of thumbnailFormats) {
    console.log(`Checking thumbnail URL: ${url}`);
    if (await isUrlAccessible(url)) {
      console.log(`Found valid thumbnail: ${url}`);
      return url;
    }
  }
  
  // Default to hqdefault which almost always exists
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

// Function to extract YouTube ID from URL
function extractYouTubeId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Main function to fix video thumbnails and reset failed videos
async function fixVideos() {
  try {
    console.log('Starting video fix process...');
    
    // Get all videos
    const videosRef = collection(db, 'videos');
    const videosSnapshot = await getDocs(videosRef);
    
    console.log(`Found ${videosSnapshot.docs.length} videos in total`);
    
    let fixedCount = 0;
    let failedCount = 0;
    let resetCount = 0;
    
    // Process each video
    for (const videoDoc of videosSnapshot.docs) {
      try {
        const video = videoDoc.data();
        const videoId = videoDoc.id;
        let needsUpdate = false;
        const updates = {};
        
        // Check if this is a YouTube video
        if (video.sourceType === 'youtube' && video.sourceId) {
          // Check if thumbnail URL is valid
          if (!video.thumbnailUrl || !(await isUrlAccessible(video.thumbnailUrl))) {
            console.log(`Invalid thumbnail for video ${videoId}: ${video.thumbnailUrl}`);
            
            // Get valid thumbnail URL
            const validThumbnail = await getValidYouTubeThumbnail(video.sourceId);
            updates.thumbnailUrl = validThumbnail;
            needsUpdate = true;
            console.log(`Updated thumbnail for video ${videoId} to ${validThumbnail}`);
          }
        }
        
        // Force reset videos with 'failed' or 'pending' status to trigger reprocessing
        if (video.metadataStatus === 'failed' || video.enrichmentFailed || video.metadataStatus === 'pending') {
          console.log(`Resetting video ${videoId} with status: ${video.metadataStatus}`);
          updates.metadataStatus = 'pending';
          updates.enrichmentFailed = false;
          updates.enrichmentError = null;
          needsUpdate = true;
          resetCount++;
        }
        
        // Update the video if needed
        if (needsUpdate) {
          await updateDoc(doc(db, 'videos', videoId), updates);
          fixedCount++;
          console.log(`Updated video ${videoId}`);
        }
      } catch (error) {
        console.error(`Error processing video ${videoDoc.id}:`, error);
        failedCount++;
      }
    }
    
    console.log(`
Fix process completed:
- Fixed thumbnails/metadata: ${fixedCount} videos
- Reset failed videos: ${resetCount} videos
- Failed to process: ${failedCount} videos
    `);
    
  } catch (error) {
    console.error('Error in fix process:', error);
  }
}

// Run the fix function
fixVideos()
  .then(() => {
    console.log('Fix process completed. Exiting...');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 