// This script populates the Firestore database with real video data from documentation sources
// Run with: node scripts/populateRealVideos.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import dotenv from 'dotenv';

// Setup dotenv
dotenv.config();

// Firebase configuration - using the correct values
const firebaseConfig = {
  apiKey: "***REMOVED***",
  authDomain: "***REMOVED***",
  projectId: "***REMOVED***",
  storageBucket: "***REMOVED***.firebasestorage.app",
  messagingSenderId: "***REMOVED***",
  appId: "1:***REMOVED***:web:b5eac19f0f81d6ef2c3dee",
  measurementId: "***REMOVED***"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Admin credentials (should be set as environment variables in production)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@offscript.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Real videos from documentation sources
const realVideos = [
  {
    title: "Day in the Life of a Google Software Engineer",
    description: "Follow a Google software engineer through their daily routine working from home, including coding, meetings, and work-life balance.",
    category: "technology",
    sourceType: "youtube",
    sourceId: "a0glBQXOcl4",
    sourceUrl: "https://www.youtube.com/watch?v=a0glBQXOcl4",
    thumbnailUrl: "https://img.youtube.com/vi/a0glBQXOcl4/maxresdefault.jpg",
    duration: 480,
    creator: "Software Engineer Vlog",
    creatorUrl: "https://www.youtube.com/@SoftwareEngineerVlog",
    publicationDate: "2023-01-15",
    curatedDate: new Date().toISOString(),
    tags: ["software", "engineering", "tech", "programming", "google"],
    skillsHighlighted: ["coding", "problem solving", "teamwork"],
    educationRequired: ["Computer Science degree", "Coding bootcamp"],
    prompts: [
      {
        id: "prompt1",
        question: "What interests you most about software engineering?",
        options: ["Problem solving", "Creating products", "Working with teams", "Learning new technologies"]
      }
    ],
    relatedContent: [],
    viewCount: 15000
  },
  {
    title: "Day In The Life of an Instagram Software Engineer",
    description: "Experience what it's like to work as a software engineer at Instagram, from coding to team collaboration.",
    category: "technology",
    sourceType: "youtube",
    sourceId: "3YrjvaWlbFA",
    sourceUrl: "https://www.youtube.com/watch?v=3YrjvaWlbFA",
    thumbnailUrl: "https://img.youtube.com/vi/3YrjvaWlbFA/maxresdefault.jpg",
    duration: 360,
    creator: "Tech Career Insights",
    creatorUrl: "https://www.youtube.com/@TechCareerInsights",
    publicationDate: "2023-02-20",
    curatedDate: new Date().toISOString(),
    tags: ["software", "engineering", "instagram", "social media", "tech"],
    skillsHighlighted: ["coding", "system design", "collaboration"],
    educationRequired: ["Computer Science degree", "Software Engineering experience"],
    prompts: [
      {
        id: "prompt1",
        question: "Which tech company culture appeals to you most?",
        options: ["Large tech companies", "Startups", "Remote-first companies", "Traditional companies"]
      }
    ],
    relatedContent: [],
    viewCount: 45000
  },
  {
    title: "Day at Work: Mechanical Engineer",
    description: "Follow a mechanical engineer through their daily tasks, from CAD design to testing and problem-solving.",
    category: "trades",
    sourceType: "youtube",
    sourceId: "ocqceS7KlzE",
    sourceUrl: "https://www.youtube.com/watch?v=ocqceS7KlzE",
    thumbnailUrl: "https://img.youtube.com/vi/ocqceS7KlzE/maxresdefault.jpg",
    duration: 420,
    creator: "Engineering Careers",
    creatorUrl: "https://www.youtube.com/@EngineeringCareers",
    publicationDate: "2023-03-10",
    curatedDate: new Date().toISOString(),
    tags: ["engineering", "mechanical", "design", "manufacturing"],
    skillsHighlighted: ["CAD design", "problem solving", "technical drawing"],
    educationRequired: ["Mechanical Engineering degree"],
    prompts: [
      {
        id: "prompt1",
        question: "What aspect of mechanical engineering interests you most?",
        options: ["Design and innovation", "Manufacturing processes", "Testing and analysis", "Project management"]
      }
    ],
    relatedContent: [],
    viewCount: 28000
  },
  {
    title: "Day in the Life: Electrical Engineer",
    description: "See what an electrical engineer does on a typical day, from circuit design to testing and troubleshooting.",
    category: "trades",
    sourceType: "youtube",
    sourceId: "Va0F9_0T9R4",
    sourceUrl: "https://www.youtube.com/watch?v=Va0F9_0T9R4",
    thumbnailUrl: "https://img.youtube.com/vi/Va0F9_0T9R4/maxresdefault.jpg",
    duration: 380,
    creator: "STEM Careers",
    creatorUrl: "https://www.youtube.com/@STEMCareers",
    publicationDate: "2023-04-05",
    curatedDate: new Date().toISOString(),
    tags: ["electrical", "engineering", "circuits", "technology"],
    skillsHighlighted: ["circuit design", "troubleshooting", "technical analysis"],
    educationRequired: ["Electrical Engineering degree"],
    prompts: [
      {
        id: "prompt1",
        question: "Which area of electrical engineering appeals to you?",
        options: ["Power systems", "Electronics", "Control systems", "Telecommunications"]
      }
    ],
    relatedContent: [],
    viewCount: 22000
  },
  {
    title: "What Does a Chemical Engineer Do?",
    description: "Explore the diverse career opportunities and daily responsibilities of chemical engineers in various industries.",
    category: "healthcare",
    sourceType: "youtube",
    sourceId: "k-7B_YfHWXQ",
    sourceUrl: "https://www.youtube.com/watch?v=k-7B_YfHWXQ",
    thumbnailUrl: "https://img.youtube.com/vi/k-7B_YfHWXQ/maxresdefault.jpg",
    duration: 300,
    creator: "Science Careers",
    creatorUrl: "https://www.youtube.com/@ScienceCareers",
    publicationDate: "2023-05-12",
    curatedDate: new Date().toISOString(),
    tags: ["chemical", "engineering", "science", "industry"],
    skillsHighlighted: ["chemistry", "process design", "safety analysis"],
    educationRequired: ["Chemical Engineering degree"],
    prompts: [
      {
        id: "prompt1",
        question: "Which industry interests you for chemical engineering?",
        options: ["Pharmaceuticals", "Oil and gas", "Food processing", "Environmental"]
      }
    ],
    relatedContent: [],
    viewCount: 36000
  },
  {
    title: "Day in The Life: Healthcare Admin Professional",
    description: "Learn about the critical role healthcare administrators play in managing medical facilities and patient care coordination.",
    category: "healthcare",
    sourceType: "youtube",
    sourceId: "5W_OZJ_BUaI",
    sourceUrl: "https://www.youtube.com/watch?v=5W_OZJ_BUaI",
    thumbnailUrl: "https://img.youtube.com/vi/5W_OZJ_BUaI/maxresdefault.jpg",
    duration: 420,
    creator: "CareersOutThere",
    creatorUrl: "https://www.youtube.com/@CareersOutThere",
    publicationDate: "2023-06-18",
    curatedDate: new Date().toISOString(),
    tags: ["healthcare", "administration", "management", "medical"],
    skillsHighlighted: ["organization", "communication", "healthcare systems"],
    educationRequired: ["Healthcare Administration degree", "Business degree"],
    prompts: [
      {
        id: "prompt1",
        question: "What attracts you to healthcare administration?",
        options: ["Helping patients indirectly", "Managing operations", "Working with medical teams", "Healthcare policy"]
      }
    ],
    relatedContent: [],
    viewCount: 25000
  },
  {
    title: "What does a data analyst do on a daily basis?",
    description: "Explore the daily responsibilities of a data analyst, from data collection to analysis and reporting.",
    category: "business",
    sourceType: "youtube",
    sourceId: "EeSvvtwdyDo",
    sourceUrl: "https://www.youtube.com/watch?v=EeSvvtwdyDo",
    thumbnailUrl: "https://img.youtube.com/vi/EeSvvtwdyDo/maxresdefault.jpg",
    duration: 360,
    creator: "Data Science Careers",
    creatorUrl: "https://www.youtube.com/@DataScienceCareers",
    publicationDate: "2023-07-22",
    curatedDate: new Date().toISOString(),
    tags: ["data", "analytics", "business", "statistics"],
    skillsHighlighted: ["data analysis", "statistics", "visualization"],
    educationRequired: ["Statistics degree", "Data Science certification"],
    prompts: [
      {
        id: "prompt1",
        question: "What type of data analysis interests you most?",
        options: ["Business intelligence", "Market research", "Scientific analysis", "Financial analysis"]
      }
    ],
    relatedContent: [],
    viewCount: 42000
  },
  {
    title: "Behind the Scenes: A Day in the Life of a PE Teacher!",
    description: "Follow a physical education teacher through their day, from lesson planning to coaching and student engagement.",
    category: "creative",
    sourceType: "youtube",
    sourceId: "zWdLuMOR7CI",
    sourceUrl: "https://www.youtube.com/watch?v=zWdLuMOR7CI",
    thumbnailUrl: "https://img.youtube.com/vi/zWdLuMOR7CI/maxresdefault.jpg",
    duration: 480,
    creator: "Education Careers",
    creatorUrl: "https://www.youtube.com/@EducationCareers",
    publicationDate: "2023-08-05",
    curatedDate: new Date().toISOString(),
    tags: ["education", "teaching", "sports", "physical education"],
    skillsHighlighted: ["teaching", "sports coaching", "student engagement"],
    educationRequired: ["Education degree", "Teaching certification"],
    prompts: [
      {
        id: "prompt1",
        question: "What appeals to you about teaching physical education?",
        options: ["Working with young people", "Promoting fitness", "Coaching sports", "Curriculum development"]
      }
    ],
    relatedContent: [],
    viewCount: 18000
  }
];

// Function to check if videos already exist
async function checkExistingVideos() {
  try {
    const videosRef = collection(db, 'videos');
    const snapshot = await getDocs(videosRef);
    return snapshot.size;
  } catch (error) {
    console.error('Error checking existing videos:', error);
    return 0;
  }
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

// Function to add videos to Firestore
async function addVideos() {
  try {
    const existingCount = await checkExistingVideos();
    console.log(`Found ${existingCount} existing videos in database`);
    
    if (existingCount > 0) {
      console.log('Videos already exist. Skipping population to avoid duplicates.');
      console.log('If you want to re-populate, please clear the videos collection first.');
      return;
    }
    
    const videosRef = collection(db, 'videos');
    
    for (const video of realVideos) {
      await addDoc(videosRef, video);
      console.log(`✅ Added video: ${video.title}`);
    }
    
    console.log('🎉 All videos have been added successfully!');
    console.log(`📊 Total videos added: ${realVideos.length}`);
  } catch (error) {
    console.error('❌ Error adding videos:', error);
    throw error;
  }
}

// Execute the function
console.log('🚀 Starting video population script...');

// First authenticate, then add videos
authenticateAdmin()
  .then(success => {
    if (!success) {
      console.error('❌ Cannot proceed without admin authentication');
      process.exit(1);
    }
    return addVideos();
  })
  .then(() => {
    console.log('✅ Video population complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error in video population script:', error);
    process.exit(1);
  }); 