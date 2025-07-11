// This script populates the Firestore database with video data from CSV file
// Run with: node scripts/populateFromCSV.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate required environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_AUTH_DOMAIN'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    console.error('Please check your .env file and ensure all Firebase configuration variables are set.');
    process.exit(1);
  }
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Admin credentials
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@offscript.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Validate required environment variables
if (!ADMIN_PASSWORD) {
  console.error('❌ ADMIN_PASSWORD environment variable is required');
  console.log('💡 Set ADMIN_PASSWORD in your .env.local file');
  process.exit(1);
}

// Helper function to extract YouTube video ID from URL
function extractYouTubeId(url) {
  if (!url || !url.includes('youtube.com/watch?v=')) {
    return null;
  }
  const match = url.match(/[?&]v=([^&]*)/);
  return match ? match[1] : null;
}

// Helper function to categorize videos based on tags
function categorizeVideo(tags, title, summary) {
  const content = `${tags} ${title} ${summary}`.toLowerCase();
  
  if (content.includes('renewable') || content.includes('solar') || content.includes('wind') || 
      content.includes('sustainability') || content.includes('green') || content.includes('environmental')) {
    return 'sustainability';
  }
  
  if (content.includes('data') || content.includes('ai') || content.includes('tech') || 
      content.includes('software') || content.includes('ux') || content.includes('ui')) {
    return 'technology';
  }
  
  if (content.includes('music') || content.includes('film') || content.includes('creative') || 
      content.includes('sound') || content.includes('art') || content.includes('therapy')) {
    return 'creative';
  }
  
  if (content.includes('sport') || content.includes('analyst') || content.includes('trade')) {
    return 'trades';
  }
  
  if (content.includes('counsell') || content.includes('therapy') || content.includes('health') || 
      content.includes('psychology') || content.includes('occupational')) {
    return 'healthcare';
  }
  
  return 'business'; // Default category
}

// Helper function to estimate duration from summary (fallback)
function estimateDuration(summary) {
  // Most career videos are between 5-15 minutes
  return Math.floor(Math.random() * (900 - 300) + 300); // 5-15 minutes in seconds
}

// Helper function to parse CSV
function parseCSV(csvContent) {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',').map(header => header.trim());
  const videos = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV with proper handling of quoted fields
    const fields = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    
    if (fields.length >= 4 && fields[0] && fields[1]) {
      const title = fields[0].replace(/"/g, '');
      const link = fields[1].replace(/"/g, '');
      const published = fields[2].replace(/"/g, '');
      const summary = fields[3].replace(/"/g, '');
      const tags = fields[4] ? fields[4].replace(/"/g, '') : '';
      const relevancyScore = fields[5] ? fields[5].replace(/"/g, '') : '';
      
      const youtubeId = extractYouTubeId(link);
      if (youtubeId && title && summary) {
        videos.push({
          title,
          link,
          published,
          summary,
          tags,
          relevancyScore,
          youtubeId
        });
      }
    }
  }
  
  return videos;
}

// Convert CSV data to Firebase video format
function convertToFirebaseFormat(csvVideos) {
  return csvVideos.map((csvVideo, index) => {
    const category = categorizeVideo(csvVideo.tags, csvVideo.title, csvVideo.summary);
    
    return {
      title: csvVideo.title,
      description: csvVideo.summary,
      category: category,
      sourceType: 'youtube',
      sourceId: csvVideo.youtubeId,
      sourceUrl: csvVideo.link,
      thumbnailUrl: `https://img.youtube.com/vi/${csvVideo.youtubeId}/maxresdefault.jpg`,
      duration: estimateDuration(csvVideo.summary),
      creator: 'Various Career Channels',
      creatorUrl: '',
      publicationDate: csvVideo.published || '2024-01-01',
      curatedDate: new Date().toISOString(),
      tags: csvVideo.tags.split(',').map(tag => tag.trim().replace(/🌍|👩‍💻|👥|📍|🎓/g, '')).filter(tag => tag),
      skillsHighlighted: [],
      educationRequired: [],
      prompts: [
        {
          id: `prompt_${index}`,
          question: "What interests you most about this career?",
          options: ["Daily responsibilities", "Career progression", "Work environment", "Skills required"]
        }
      ],
      relatedContent: [],
      viewCount: Math.floor(Math.random() * 50000) + 1000 // Random view count between 1k-50k
    };
  });
}

// Function to authenticate as admin
async function authenticateAdmin() {
  try {
    console.log('🔐 Authenticating as admin...');
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Admin authentication successful');
    return true;
  } catch (error) {
    console.error('❌ Admin authentication failed:', error.message);
    return false;
  }
}

// Function to clear existing videos
async function clearExistingVideos() {
  try {
    console.log('🗑️ Clearing existing videos...');
    const videosRef = collection(db, 'videos');
    const snapshot = await getDocs(videosRef);
    
    const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(db, 'videos', docSnap.id)));
    await Promise.all(deletePromises);
    
    console.log(`✅ Cleared ${snapshot.size} existing videos`);
  } catch (error) {
    console.error('❌ Error clearing existing videos:', error);
    throw error;
  }
}

// Function to add videos to Firestore
async function addVideosFromCSV() {
  try {
    // Read CSV file
    const csvPath = path.join(process.cwd(), 'docs', 'Video Content - Sheet1.csv');
    console.log('📄 Reading CSV file:', csvPath);
    
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const csvVideos = parseCSV(csvContent);
    console.log(`📊 Parsed ${csvVideos.length} videos from CSV`);
    
    // Convert to Firebase format
    const firebaseVideos = convertToFirebaseFormat(csvVideos);
    console.log(`🔄 Converted ${firebaseVideos.length} videos to Firebase format`);
    
    // Add to Firebase
    const videosRef = collection(db, 'videos');
    
    for (let i = 0; i < firebaseVideos.length; i++) {
      const video = firebaseVideos[i];
      await addDoc(videosRef, video);
      console.log(`✅ Added video ${i + 1}/${firebaseVideos.length}: ${video.title}`);
    }
    
    console.log('🎉 All videos have been added successfully!');
    console.log(`📊 Total videos added: ${firebaseVideos.length}`);
    
    // Summary by category
    const categoryCount = {};
    firebaseVideos.forEach(video => {
      categoryCount[video.category] = (categoryCount[video.category] || 0) + 1;
    });
    
    console.log('\n📈 Videos by category:');
    Object.entries(categoryCount).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} videos`);
    });
    
  } catch (error) {
    console.error('❌ Error adding videos from CSV:', error);
    throw error;
  }
}

// Execute the function
console.log('🚀 Starting CSV video population script...');

// First authenticate, then clear existing videos, then add new ones
authenticateAdmin()
  .then(success => {
    if (!success) {
      console.error('❌ Cannot proceed without admin authentication');
      process.exit(1);
    }
    return clearExistingVideos();
  })
  .then(() => {
    return addVideosFromCSV();
  })
  .then(() => {
    console.log('✅ CSV video population complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error in CSV video population script:', error);
    process.exit(1);
  }); 