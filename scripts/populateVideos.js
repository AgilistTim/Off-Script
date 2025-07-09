// Import Firebase modules
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';
import { config } from 'dotenv';

// Load environment variables
config();

// Firebase config
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

// Sample videos with real YouTube IDs related to AI, coding, and technology
const sampleVideos = [
  {
    title: "If I Wanted to Become a Software Engineer in 2025, This is What I'd Do",
    description: "Complete roadmap for becoming a software engineer in 2025, covering essential skills, technologies, and career paths.",
    sourceUrl: "https://www.youtube.com/watch?v=9bZkp7q19f0",
    sourceType: "youtube",
    sourceId: "9bZkp7q19f0",
    thumbnailUrl: "https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg",
    duration: 1800, // 30 minutes
    category: "Software Engineering",
    subcategory: "Career Development",
    tags: ["software engineering", "programming", "career advice", "2025", "tech skills"],
    skillsHighlighted: ["Python", "JavaScript", "React", "System Design"],
    educationRequired: ["Self-taught or Computer Science Degree"],
    viewCount: 250000,
    creator: "Sajjaad Khader",
    publicationDate: "2024-12-15T10:00:00Z",
    curatedDate: new Date().toISOString(),
    prompts: [],
    relatedContent: [],
    metadataStatus: "enriched"
  },
  {
    title: "Software Engineering Best Practices",
    description: "Essential best practices every software engineer should know to write clean, maintainable code.",
    sourceUrl: "https://www.youtube.com/watch?v=HmJInyS8JqI", 
    sourceType: "youtube",
    sourceId: "HmJInyS8JqI",
    thumbnailUrl: "https://i.ytimg.com/vi/HmJInyS8JqI/hqdefault.jpg",
    duration: 3600, // 60 minutes
    category: "Software Engineering",
    subcategory: "Best Practices",
    tags: ["clean code", "software architecture", "best practices", "engineering"],
    skillsHighlighted: ["Code Quality", "Architecture Design", "Testing"],
    educationRequired: ["Basic Programming Knowledge"],
    viewCount: 180000,
    creator: "Code Quality Experts",
    publicationDate: "2024-11-20T14:30:00Z",
    curatedDate: new Date().toISOString(),
    prompts: [],
    relatedContent: [],
    metadataStatus: "enriched"
  },
  {
    title: "Low-Code/No-Code AI Development",
    description: "Learn how to build AI applications without extensive coding using modern no-code platforms.",
    sourceUrl: "https://www.youtube.com/watch?v=aircAruvnKk",
    sourceType: "youtube", 
    sourceId: "aircAruvnKk",
    thumbnailUrl: "https://i.ytimg.com/vi/aircAruvnKk/hqdefault.jpg",
    duration: 1200, // 20 minutes
    category: "Artificial Intelligence",
    subcategory: "No-Code Development",
    tags: ["no-code", "AI", "machine learning", "automation"],
    skillsHighlighted: ["No-Code Platforms", "AI Tools", "Process Automation"],
    educationRequired: ["Basic Computer Literacy"],
    viewCount: 320000,
    creator: "No-Code Academy",
    publicationDate: "2024-10-05T16:45:00Z",
    curatedDate: new Date().toISOString(),
    prompts: [],
    relatedContent: [],
    metadataStatus: "enriched"
  },
  {
    title: "Building AI Assistants with Large Language Models",
    description: "Comprehensive guide to creating AI assistants using GPT-4 and other large language models.",
    sourceUrl: "https://www.youtube.com/watch?v=kCc8FmEb1nY",
    sourceType: "youtube",
    sourceId: "kCc8FmEb1nY", 
    thumbnailUrl: "https://i.ytimg.com/vi/kCc8FmEb1nY/hqdefault.jpg",
    duration: 1800, // 30 minutes
    category: "Artificial Intelligence",
    subcategory: "Large Language Models",
    tags: ["AI", "LLM", "chatbots", "GPT", "machine learning"],
    skillsHighlighted: ["Prompt Engineering", "AI Development", "Python"],
    educationRequired: ["Programming Experience", "AI Fundamentals"],
    viewCount: 150000,
    creator: "AI Academy",
    publicationDate: "2024-09-12T11:20:00Z",
    curatedDate: new Date().toISOString(),
    prompts: [],
    relatedContent: [],
    metadataStatus: "enriched"
  },
  {
    title: "Frontend Development in 2024: React, Vue, or Angular?",
    description: "Comparing the top frontend frameworks and choosing the right one for your career and projects.",
    sourceUrl: "https://www.youtube.com/watch?v=cuHDQhDhvPE",
    sourceType: "youtube",
    sourceId: "cuHDQhDhvPE",
    thumbnailUrl: "https://i.ytimg.com/vi/cuHDQhDhvPE/hqdefault.jpg",
    duration: 2400, // 40 minutes
    category: "Web Development",
    subcategory: "Frontend Frameworks",
    tags: ["React", "Vue", "Angular", "frontend", "JavaScript"],
    skillsHighlighted: ["React", "Vue.js", "Angular", "TypeScript"],
    educationRequired: ["JavaScript Fundamentals"],
    viewCount: 280000,
    creator: "Frontend Masters",
    publicationDate: "2024-08-30T09:15:00Z",
    curatedDate: new Date().toISOString(),
    prompts: [],
    relatedContent: [],
    metadataStatus: "enriched"
  },
  {
    title: "Data Science Career Path: From Beginner to Expert",
    description: "Complete roadmap for building a successful career in data science, including skills, tools, and opportunities.",
    sourceUrl: "https://www.youtube.com/watch?v=ua-CiDNNj30",
    sourceType: "youtube",
    sourceId: "ua-CiDNNj30",
    thumbnailUrl: "https://i.ytimg.com/vi/ua-CiDNNj30/hqdefault.jpg",
    duration: 2700, // 45 minutes
    category: "Data Science",
    subcategory: "Career Development", 
    tags: ["data science", "analytics", "Python", "SQL", "career"],
    skillsHighlighted: ["Python", "SQL", "Statistics", "Machine Learning"],
    educationRequired: ["Math/Statistics Background Helpful"],
    viewCount: 190000,
    creator: "Data Science Pros",
    publicationDate: "2024-07-18T13:40:00Z",
    curatedDate: new Date().toISOString(),
    prompts: [],
    relatedContent: [],
    metadataStatus: "enriched"
  }
];

async function populateVideos() {
  try {
    console.log('Starting to populate videos...');
    
    // Check if videos already exist
    const videosRef = collection(db, 'videos');
    const existingVideos = await getDocs(videosRef);
    
    if (existingVideos.size > 0) {
      console.log(`Found ${existingVideos.size} existing videos. Skipping population.`);
      return;
    }
    
    // Add sample videos
    for (const video of sampleVideos) {
      const docRef = await addDoc(videosRef, video);
      console.log(`Added video: ${video.title} with ID: ${docRef.id}`);
    }
    
    console.log(`Successfully populated ${sampleVideos.length} videos!`);
  } catch (error) {
    console.error('Error populating videos:', error);
  }
}

// Run the population
populateVideos(); 