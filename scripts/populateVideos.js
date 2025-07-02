// This script populates the Firestore database with sample video data
// Run with: node scripts/populateVideos.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import dotenv from 'dotenv';

// Setup dotenv
dotenv.config();

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Sample videos data
const sampleVideos = [
  {
    title: "Web Development Career Path",
    description: "Learn about the different career paths in web development, from front-end to back-end and full-stack roles. This video covers the skills needed, salary expectations, and day-to-day responsibilities.",
    category: "Technology & Digital",
    subcategory: "Web Development",
    sourceType: "youtube",
    sourceId: "zXXKMSaS_5s", // This is a placeholder YouTube ID
    sourceUrl: "https://www.youtube.com/watch?v=zXXKMSaS_5s",
    thumbnailUrl: "https://img.youtube.com/vi/zXXKMSaS_5s/hqdefault.jpg",
    duration: 485, // 8:05 minutes
    creator: "Fireship",
    creatorUrl: "https://www.youtube.com/@Fireship",
    publicationDate: "2023-05-15",
    curatedDate: new Date().toISOString(),
    tags: ["web development", "career", "programming", "coding", "tech careers"],
    skillsHighlighted: ["HTML", "CSS", "JavaScript", "React", "Node.js"],
    educationRequired: ["Self-taught", "Bootcamp", "Computer Science Degree"],
    prompts: [
      {
        id: "prompt1",
        question: "Which web development path interests you most?",
        options: ["Front-end", "Back-end", "Full-stack", "Not sure yet"]
      },
      {
        id: "prompt2",
        question: "What's your biggest challenge in learning web development?",
        options: ["Time management", "Understanding concepts", "Finding resources", "Building projects"]
      }
    ],
    relatedContent: [],
    viewCount: 1250
  },
  {
    title: "Day in the Life of a Graphic Designer",
    description: "Follow along as a professional graphic designer shows their typical workday, from client meetings to creating designs and managing feedback. Get insights into the creative process and tools used.",
    category: "Creative & Media",
    subcategory: "Graphic Design",
    sourceType: "youtube",
    sourceId: "C8QJmI_V3j4", // This is a placeholder YouTube ID
    sourceUrl: "https://www.youtube.com/watch?v=C8QJmI_V3j4",
    thumbnailUrl: "https://img.youtube.com/vi/C8QJmI_V3j4/hqdefault.jpg",
    duration: 723, // 12:03 minutes
    creator: "Design Made Simple",
    creatorUrl: "https://www.youtube.com/@DesignMadeSimple",
    publicationDate: "2023-06-22",
    curatedDate: new Date().toISOString(),
    tags: ["graphic design", "creative career", "design", "adobe", "day in the life"],
    skillsHighlighted: ["Adobe Photoshop", "Adobe Illustrator", "Typography", "Color Theory", "Client Communication"],
    educationRequired: ["Design Degree", "Certificate Program", "Self-taught"],
    prompts: [
      {
        id: "prompt1",
        question: "Which design software would you like to learn more about?",
        options: ["Adobe Photoshop", "Adobe Illustrator", "Figma", "Sketch", "Other"]
      }
    ],
    relatedContent: [],
    viewCount: 876
  },
  {
    title: "Introduction to Plumbing: Essential Skills",
    description: "Learn the fundamental skills needed to start a career in plumbing. This video covers basic tools, common repairs, and the path to becoming a licensed plumber.",
    category: "Skilled Trades",
    subcategory: "Plumbing",
    sourceType: "youtube",
    sourceId: "JeZKZ1mUTNo", // This is a placeholder YouTube ID
    sourceUrl: "https://www.youtube.com/watch?v=JeZKZ1mUTNo",
    thumbnailUrl: "https://img.youtube.com/vi/JeZKZ1mUTNo/hqdefault.jpg",
    duration: 912, // 15:12 minutes
    creator: "Trades Academy",
    creatorUrl: "https://www.youtube.com/@TradesAcademy",
    publicationDate: "2023-03-10",
    curatedDate: new Date().toISOString(),
    tags: ["plumbing", "skilled trades", "vocational training", "apprenticeship"],
    skillsHighlighted: ["Pipe Fitting", "Blueprint Reading", "Problem Solving", "Hand Tools", "Customer Service"],
    educationRequired: ["Apprenticeship", "Vocational Training", "On-the-job Training"],
    prompts: [
      {
        id: "prompt1",
        question: "Are you interested in pursuing a plumbing apprenticeship?",
        options: ["Yes, definitely", "Maybe in the future", "No, just learning basics", "I'm already in one"]
      }
    ],
    relatedContent: [],
    viewCount: 532
  },
  {
    title: "How to Start Your Own Small Business",
    description: "A comprehensive guide to launching your own small business, covering business plans, funding options, legal requirements, and marketing strategies for new entrepreneurs.",
    category: "Business & Entrepreneurship",
    subcategory: "Small Business",
    sourceType: "youtube",
    sourceId: "KBCcDrG2NjM", // This is a placeholder YouTube ID
    sourceUrl: "https://www.youtube.com/watch?v=KBCcDrG2NjM",
    thumbnailUrl: "https://img.youtube.com/vi/KBCcDrG2NjM/hqdefault.jpg",
    duration: 1254, // 20:54 minutes
    creator: "Entrepreneur Academy",
    creatorUrl: "https://www.youtube.com/@EntrepreneurAcademy",
    publicationDate: "2023-07-05",
    curatedDate: new Date().toISOString(),
    tags: ["entrepreneurship", "small business", "startup", "business plan", "marketing"],
    skillsHighlighted: ["Business Planning", "Financial Management", "Marketing", "Leadership", "Problem Solving"],
    educationRequired: ["No formal education required", "Business courses helpful", "Mentorship recommended"],
    prompts: [
      {
        id: "prompt1",
        question: "What type of business are you interested in starting?",
        options: ["Service-based", "Product-based", "Online/Digital", "Not sure yet"]
      },
      {
        id: "prompt2",
        question: "What's your biggest concern about starting a business?",
        options: ["Funding", "Finding customers", "Legal requirements", "Work-life balance"]
      }
    ],
    relatedContent: [],
    viewCount: 1876
  },
  {
    title: "Nursing Career Paths and Specializations",
    description: "Explore the diverse career paths available in nursing, from hospital roles to specialized fields like pediatrics, oncology, and more. Learn about education requirements and certification processes.",
    category: "Healthcare & Wellbeing",
    subcategory: "Nursing",
    sourceType: "youtube",
    sourceId: "vT_hPv_RXhc", // This is a placeholder YouTube ID
    sourceUrl: "https://www.youtube.com/watch?v=vT_hPv_RXhc",
    thumbnailUrl: "https://img.youtube.com/vi/vT_hPv_RXhc/hqdefault.jpg",
    duration: 845, // 14:05 minutes
    creator: "Healthcare Careers",
    creatorUrl: "https://www.youtube.com/@HealthcareCareers",
    publicationDate: "2023-04-18",
    curatedDate: new Date().toISOString(),
    tags: ["nursing", "healthcare", "medical career", "specialization", "patient care"],
    skillsHighlighted: ["Patient Care", "Medical Knowledge", "Communication", "Critical Thinking", "Empathy"],
    educationRequired: ["Nursing Degree", "Certification", "Continuing Education"],
    prompts: [
      {
        id: "prompt1",
        question: "Which nursing specialization interests you most?",
        options: ["Emergency/Trauma", "Pediatrics", "Oncology", "Mental Health", "Other"]
      }
    ],
    relatedContent: [],
    viewCount: 945
  }
];

// Function to add videos to Firestore
async function addVideos() {
  try {
    const videosRef = collection(db, 'videos');
    
    for (const video of sampleVideos) {
      await addDoc(videosRef, video);
      console.log(`Added video: ${video.title}`);
    }
    
    console.log('All videos have been added successfully!');
  } catch (error) {
    console.error('Error adding videos:', error);
  }
}

// Execute the function
addVideos()
  .then(() => {
    console.log('Video population complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error in video population script:', error);
    process.exit(1);
  }); 