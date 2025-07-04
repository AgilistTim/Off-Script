// Script to fix video thumbnails and reset failed videos
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  // Add your Firebase config here - this will be filled in when running the script
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

// Function to get YouTube thumbnail URL with fallbacks
const getYouTubeThumbnailUrl = (videoId) => {
  // Use hqdefault.jpg which is more reliable than maxresdefault.jpg
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
};

// Function to extract YouTube ID from URL
const extractYouTubeId = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// Main function to fix videos
async function fixVideos() {
  try {
    console.log('Starting video fix script...');
    
    // Get all videos
    const videosRef = collection(db, 'videos');
    const videosSnapshot = await getDocs(videosRef);
    
    let fixedCount = 0;
    let resetCount = 0;
    
    // Process each video
    for (const videoDoc of videosSnapshot.docs) {
      const video = videoDoc.data();
      const videoId = videoDoc.id;
      const updates = {};
      let updated = false;
      
      // Fix YouTube thumbnails
      if (video.sourceType === 'youtube' && video.sourceId) {
        const newThumbnailUrl = getYouTubeThumbnailUrl(video.sourceId);
        if (video.thumbnailUrl !== newThumbnailUrl) {
          updates.thumbnailUrl = newThumbnailUrl;
          updated = true;
        }
      }
      
      // Extract YouTube ID if missing but URL is present
      if (!video.sourceId && video.sourceUrl && video.sourceUrl.includes('youtube')) {
        const youtubeId = extractYouTubeId(video.sourceUrl);
        if (youtubeId) {
          updates.sourceId = youtubeId;
          updates.thumbnailUrl = getYouTubeThumbnailUrl(youtubeId);
          updated = true;
        }
      }
      
      // Reset failed videos to pending
      if (video.metadataStatus === 'failed' || video.enrichmentFailed) {
        updates.metadataStatus = 'pending';
        updates.enrichmentFailed = false;
        updates.enrichmentError = '';
        resetCount++;
        updated = true;
      }
      
      // Update the document if changes were made
      if (updated) {
        await updateDoc(doc(db, 'videos', videoId), updates);
        fixedCount++;
        console.log(`Fixed video: ${videoId}`);
      }
    }
    
    console.log(`Fix complete. Fixed ${fixedCount} videos. Reset ${resetCount} failed videos.`);
  } catch (error) {
    console.error('Error fixing videos:', error);
  }
}

// Run the script
fixVideos().then(() => {
  console.log('Script completed.');
}); 