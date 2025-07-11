// Import Firebase Admin SDK
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin SDK
try {
  // Check for service account key file first
  const serviceAccountPath = resolve(__dirname, '../firebase-service-account.json');
  let serviceAccount = null;
  
  try {
    if (readFileSync(serviceAccountPath)) {
      serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
      console.log('✅ Using service account key file');
    }
  } catch (error) {
    // Service account file not found, use environment variables or default credentials
  }
  
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    // Use environment variables or default credentials
    console.log('🔧 Using environment variables for Firebase initialization');
    admin.initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'offscript-8f6eb'
    });
  }
  
  console.log('✅ Firebase Admin initialized successfully');
  
  // For development with emulator (optional)
  if (process.env.USE_FIRESTORE_EMULATOR === 'true') {
    admin.firestore().settings({
      host: 'localhost:8080',
      ssl: false
    });
    console.log('🔧 Connected to Firestore emulator at localhost:8080');
  }
  
} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error);
  console.log('💡 To fix this:');
  console.log('  1. Set VITE_FIREBASE_PROJECT_ID in your .env.local file, or');
  console.log('  2. Download service account key and save as firebase-service-account.json, or');
  console.log('  3. Ensure you are authenticated with Firebase CLI');
  process.exit(1);
}

// Get Firestore instance
const db = admin.firestore();

// Sample videos related to AI, coding, and technology
const sampleVideos = [
  {
    title: "Building AI Assistants with Large Language Models",
    description: "Learn how to create powerful AI assistants using the latest large language models like GPT-4.",
    sourceUrl: "https://www.youtube.com/watch?v=example1",
    sourceType: "youtube",
    sourceId: "example1",
    thumbnailUrl: "https://i.ytimg.com/vi/example1/hqdefault.jpg",
    duration: 1800, // 30 minutes
    category: "artificial intelligence",
    subcategory: "large language models",
    tags: ["AI", "LLM", "chatbots", "GPT"],
    skillsHighlighted: ["prompt engineering", "AI development", "Python"],
    educationRequired: ["Bachelor's in Computer Science", "AI Certification"],
    viewCount: 5000,
    creator: "AI Academy",
    metadataStatus: "enriched"
  },
  {
    title: "Vector Storage for AI Applications",
    description: "A deep dive into vector databases and how they power semantic search in modern AI applications.",
    sourceUrl: "https://www.youtube.com/watch?v=example2",
    sourceType: "youtube",
    sourceId: "example2",
    thumbnailUrl: "https://i.ytimg.com/vi/example2/hqdefault.jpg",
    duration: 2400, // 40 minutes
    category: "vector storage",
    subcategory: "databases",
    tags: ["vector database", "embeddings", "semantic search", "AI"],
    skillsHighlighted: ["database design", "Python", "machine learning"],
    educationRequired: ["Bachelor's in Computer Science"],
    viewCount: 3500,
    creator: "Database Experts",
    metadataStatus: "enriched"
  },
  {
    title: "Building Chatbots with Modern Frameworks",
    description: "Step-by-step guide to creating interactive chatbots using modern JavaScript frameworks.",
    sourceUrl: "https://www.youtube.com/watch?v=example3",
    sourceType: "youtube",
    sourceId: "example3",
    thumbnailUrl: "https://i.ytimg.com/vi/example3/hqdefault.jpg",
    duration: 1500, // 25 minutes
    category: "chatbots",
    subcategory: "development",
    tags: ["chatbots", "JavaScript", "React", "Node.js"],
    skillsHighlighted: ["JavaScript", "React", "API integration"],
    educationRequired: ["Web Development Bootcamp"],
    viewCount: 4200,
    creator: "Web Dev Mastery",
    metadataStatus: "enriched"
  },
  {
    title: "Low-Code/No-Code AI Development",
    description: "How to build AI applications without extensive coding using low-code and no-code platforms.",
    sourceUrl: "https://www.youtube.com/watch?v=example4",
    sourceType: "youtube",
    sourceId: "example4",
    thumbnailUrl: "https://i.ytimg.com/vi/example4/hqdefault.jpg",
    duration: 1200, // 20 minutes
    category: "low-code/no-code",
    subcategory: "AI development",
    tags: ["low-code", "no-code", "AI", "automation"],
    skillsHighlighted: ["workflow automation", "business logic", "AI integration"],
    educationRequired: ["None required"],
    viewCount: 6800,
    creator: "No-Code Academy",
    metadataStatus: "enriched"
  },
  {
    title: "Software Engineering Best Practices",
    description: "Essential best practices every software engineer should follow for clean, maintainable code.",
    sourceUrl: "https://www.youtube.com/watch?v=example5",
    sourceType: "youtube",
    sourceId: "example5",
    thumbnailUrl: "https://i.ytimg.com/vi/example5/hqdefault.jpg",
    duration: 3600, // 60 minutes
    category: "software",
    subcategory: "engineering",
    tags: ["software engineering", "clean code", "best practices", "code review"],
    skillsHighlighted: ["code organization", "testing", "documentation"],
    educationRequired: ["Computer Science Degree", "Software Engineering Experience"],
    viewCount: 8500,
    creator: "Code Quality Experts",
    metadataStatus: "enriched"
  }
];

// Function to add videos to Firestore
async function addVideosToFirestore() {
  try {
    console.log('Starting to add sample videos to Firestore...');
    
    for (const video of sampleVideos) {
      // Add timestamp
      const videoWithTimestamp = {
        ...video,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Add to Firestore
      const docRef = await db.collection('videos').add(videoWithTimestamp);
      console.log(`Added video with ID: ${docRef.id}`);
      
      // Create embeddings for the video
      await createEmbeddingForVideo(docRef.id, videoWithTimestamp);
    }
    
    console.log('Successfully added all sample videos to Firestore!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding videos to Firestore:', error);
    process.exit(1);
  }
}

// Function to create embedding for a video
async function createEmbeddingForVideo(videoId, videoData) {
  try {
    console.log(`Creating embedding for video ${videoId}...`);
    
    // Generate text representation of the video for embedding
    const videoText = [
      `Title: ${videoData.title || ''}`,
      `Description: ${videoData.description || ''}`,
      `Category: ${videoData.category || ''}`,
      `Subcategory: ${videoData.subcategory || ''}`,
      `Tags: ${(videoData.tags || []).join(', ')}`,
      `Skills: ${(videoData.skillsHighlighted || []).join(', ')}`,
      `Education: ${(videoData.educationRequired || []).join(', ')}`,
      `Duration: ${videoData.duration || 0} seconds`
    ].join('\n');
    
    // For demo purposes, create a simple mock embedding (normally you'd call OpenAI API)
    const mockEmbedding = Array(1536).fill(0).map(() => Math.random() * 2 - 1);
    
    // Store the embedding in Firestore
    const embeddingData = {
      videoId,
      embedding: mockEmbedding,
      contentType: 'metadata',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      version: 'text-embedding-3-small'
    };
    
    await db.collection('videoEmbeddings').doc(`${videoId}_metadata`).set(embeddingData);
    console.log(`Created embedding for video ${videoId}`);
    
    return embeddingData;
  } catch (error) {
    console.error(`Error creating embedding for video ${videoId}:`, error);
    return null;
  }
}

// Execute the function
addVideosToFirestore(); 