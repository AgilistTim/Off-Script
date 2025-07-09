// Import Firebase Admin SDK
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin SDK with emulator
try {
  // Initialize without credentials to use emulator
  admin.initializeApp({
    projectId: 'offscript-8f6eb'
  });
  
  console.log('Initialized Firebase Admin for emulator');
  
  // Connect to the Firestore emulator
  admin.firestore().settings({
    host: 'localhost:8080',
    ssl: false
  });
  
  console.log('Connected to Firestore emulator at localhost:8080');
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
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