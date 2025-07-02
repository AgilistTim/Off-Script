// This script populates the Firestore database with sample video data
// Run with: node scripts/populateVideos.js

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

// Setup dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
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

// Sample video data
const sampleVideos = [
  {
    id: 'tech-software-dev',
    title: 'How I Became a Software Developer Without a Degree',
    description: `In this video, I share my journey from having no coding experience to becoming a professional software developer without a university degree. I discuss the learning resources I used, the projects I built, and how I landed my first job in the tech industry.

I also cover the challenges I faced, the skills that were most valuable, and advice for others looking to follow a similar path.`,
    category: 'technology',
    subcategory: 'software development',
    sourceType: 'youtube',
    sourceId: 'rqX8PFcOpxA',
    sourceUrl: 'https://www.youtube.com/watch?v=rqX8PFcOpxA',
    thumbnailUrl: 'https://img.youtube.com/vi/rqX8PFcOpxA/maxresdefault.jpg',
    duration: 765, // 12:45 in seconds
    creator: 'TechJourney',
    creatorUrl: 'https://www.youtube.com/c/TechJourney',
    publicationDate: '2023-05-15',
    curatedDate: new Date().toISOString(),
    tags: ['software development', 'career change', 'self-taught', 'coding', 'tech jobs'],
    skillsHighlighted: ['JavaScript', 'Problem Solving', 'Web Development', 'Self-Learning', 'Project Management'],
    educationRequired: ['Self-taught', 'Online courses', 'Coding bootcamp (optional)'],
    prompts: [
      {
        id: 'tech-prompt-1',
        question: 'Which aspect of the tech work environment shown in the video appeals to you most?',
        options: [
          'The collaborative team atmosphere',
          'The problem-solving challenges',
          'The creative aspects of building products',
          'The flexible work arrangements'
        ],
        appearTime: 300
      },
      {
        id: 'tech-prompt-2',
        question: 'How do you feel about the balance of technical and communication skills required in this role?',
        options: [
          'I prefer more technical, hands-on work',
          'I like the mix of technical and communication skills',
          'I\'d prefer more communication and less technical focus',
          'I\'m not sure this balance works for me'
        ],
        appearTime: 600
      }
    ],
    relatedContent: ['tech-data-science', 'tech-web-dev'],
    viewCount: 45000
  },
  {
    id: 'green-energy-tech',
    title: 'My Path to Becoming a Renewable Energy Technician',
    description: `Follow my journey from traditional electrician work to specializing in renewable energy systems. I explain the training I received, the certifications that matter most in this field, and what a typical day looks like installing and maintaining solar panels and wind turbines.

The video covers the growing demand for renewable energy technicians, salary expectations, and the satisfaction of working in a field that's making a positive environmental impact.`,
    category: 'trades',
    subcategory: 'renewable energy',
    sourceType: 'youtube',
    sourceId: 'ZO2rOP8IEQ',
    sourceUrl: 'https://www.youtube.com/watch?v=ZO2rOP8IEQ',
    thumbnailUrl: 'https://img.youtube.com/vi/ZO2rOP8IEQ/maxresdefault.jpg',
    duration: 512, // 8:32 in seconds
    creator: 'GreenFuture',
    creatorUrl: 'https://www.youtube.com/c/GreenFuture',
    publicationDate: '2023-06-22',
    curatedDate: new Date().toISOString(),
    tags: ['renewable energy', 'solar installation', 'electrician', 'green jobs', 'sustainability'],
    skillsHighlighted: ['Electrical Systems', 'Technical Installation', 'Problem Diagnosis', 'Safety Protocols', 'Physical Stamina'],
    educationRequired: ['Electrician certification', 'Renewable energy specialization', 'NABCEP certification (optional)'],
    prompts: [
      {
        id: 'green-prompt-1',
        question: 'What aspect of the hands-on work shown appeals to you most?',
        options: [
          'Solving practical problems',
          'Creating or fixing tangible things',
          'Working in different environments each day',
          'The technical knowledge and expertise'
        ],
        appearTime: 200
      },
      {
        id: 'green-prompt-2',
        question: 'How do you feel about the physical demands of this trade?',
        options: [
          'I enjoy physical work and staying active',
          'I\'m comfortable with moderate physical demands',
          'I\'d prefer less physically demanding work',
          'The physical aspects concern me'
        ],
        appearTime: 400
      }
    ],
    relatedContent: ['trades-electrician', 'green-sustainability'],
    viewCount: 28000
  },
  {
    id: 'healthcare-career-change',
    title: 'From Retail to Healthcare: My Career Change Story',
    description: `I share my personal experience transitioning from a decade in retail management to a fulfilling career as a healthcare administrator. Learn about the transferable skills that helped me make this change, the additional education I needed, and how I navigated the job search process.

I discuss the challenges and rewards of working in healthcare administration, including the impact on work-life balance and the satisfaction of contributing to patient care behind the scenes.`,
    category: 'healthcare',
    subcategory: 'administration',
    sourceType: 'youtube',
    sourceId: 'xC-c7E5PK0Y',
    sourceUrl: 'https://www.youtube.com/watch?v=xC-c7E5PK0Y',
    thumbnailUrl: 'https://img.youtube.com/vi/xC-c7E5PK0Y/maxresdefault.jpg',
    duration: 920, // 15:20 in seconds
    creator: 'HealthCareer',
    creatorUrl: 'https://www.youtube.com/c/HealthCareer',
    publicationDate: '2023-04-10',
    curatedDate: new Date().toISOString(),
    tags: ['healthcare administration', 'career change', 'medical office', 'patient care', 'professional development'],
    skillsHighlighted: ['Organization', 'Communication', 'Medical Terminology', 'Electronic Health Records', 'Compliance'],
    educationRequired: ['Associate\'s degree in Healthcare Administration', 'Medical office certification (optional)', 'On-the-job training'],
    prompts: [
      {
        id: 'health-prompt-1',
        question: 'Which aspect of patient care shown in the video resonates with you most?',
        options: [
          'Direct hands-on care and treatment',
          'Emotional support and relationship building',
          'Problem-solving and diagnosis',
          'Education and preventative care'
        ],
        appearTime: 350
      },
      {
        id: 'health-prompt-2',
        question: 'How do you feel about the emotional demands of healthcare work?',
        options: [
          'I find emotional connection fulfilling and meaningful',
          'I\'m comfortable balancing emotional engagement with boundaries',
          'I prefer roles with less emotional intensity',
          'I\'m concerned about emotional burnout'
        ],
        appearTime: 700
      }
    ],
    relatedContent: ['healthcare-nursing', 'business-admin'],
    viewCount: 37000
  },
  {
    id: 'digital-marketing-business',
    title: 'Starting My Own Digital Marketing Business',
    description: `In this video, I walk through how I established my digital marketing agency from scratch. I cover everything from identifying my niche and building a portfolio to finding my first clients and scaling the business.

I share insights on the digital marketing skills that are most in-demand, how I price my services, and the tools that have been essential for my success. I also discuss the realities of being self-employed in the creative industry.`,
    category: 'creative',
    subcategory: 'digital marketing',
    sourceType: 'youtube',
    sourceId: 'j3TeLsaKzAM',
    sourceUrl: 'https://www.youtube.com/watch?v=j3TeLsaKzAM',
    thumbnailUrl: 'https://img.youtube.com/vi/j3TeLsaKzAM/maxresdefault.jpg',
    duration: 615, // 10:15 in seconds
    creator: 'MarketingPro',
    creatorUrl: 'https://www.youtube.com/c/MarketingPro',
    publicationDate: '2023-07-05',
    curatedDate: new Date().toISOString(),
    tags: ['digital marketing', 'entrepreneurship', 'freelancing', 'social media', 'business startup'],
    skillsHighlighted: ['Social Media Strategy', 'Content Creation', 'SEO', 'Client Management', 'Analytics'],
    educationRequired: ['Marketing courses or degree', 'Digital certifications (Google, Meta)', 'Self-taught options available'],
    prompts: [
      {
        id: 'creative-prompt-1',
        question: 'Which part of the creative process shown in the video resonates with you most?',
        options: [
          'The initial concept and ideation phase',
          'The hands-on creation and development',
          'The refinement and perfecting of details',
          'The presentation and sharing of the final work'
        ],
        appearTime: 250
      },
      {
        id: 'creative-prompt-2',
        question: 'How important is creative freedom versus client direction in your ideal work environment?',
        options: [
          'I prefer complete creative freedom',
          'I like a balance of guidance and creative input',
          'I prefer clear direction with some creative flexibility',
          'I\'m comfortable following precise specifications'
        ],
        appearTime: 500
      }
    ],
    relatedContent: ['business-entrepreneur', 'creative-design'],
    viewCount: 52000
  },
  {
    id: 'construction-apprenticeship',
    title: 'Apprenticeship vs. University: My Experience in Construction',
    description: `I compare my journey through a construction apprenticeship with my friends who chose university paths. I break down the financial aspects, including earning while learning, avoiding student debt, and long-term earning potential in the construction industry.

The video also covers the day-to-day reality of apprenticeship training, the mentorship I received, and how I progressed to become a site supervisor. I discuss both the advantages and challenges of choosing a trade career path.`,
    category: 'trades',
    subcategory: 'construction',
    sourceType: 'youtube',
    sourceId: 'cAW0uy8eiCY',
    sourceUrl: 'https://www.youtube.com/watch?v=cAW0uy8eiCY',
    thumbnailUrl: 'https://img.youtube.com/vi/cAW0uy8eiCY/maxresdefault.jpg',
    duration: 848, // 14:08 in seconds
    creator: 'BuilderPath',
    creatorUrl: 'https://www.youtube.com/c/BuilderPath',
    publicationDate: '2023-03-18',
    curatedDate: new Date().toISOString(),
    tags: ['construction', 'apprenticeship', 'trades education', 'career comparison', 'building industry'],
    skillsHighlighted: ['Building Techniques', 'Blueprint Reading', 'Tool Proficiency', 'Project Planning', 'Team Coordination'],
    educationRequired: ['Construction apprenticeship', 'On-site training', 'Industry certifications'],
    prompts: [
      {
        id: 'construction-prompt-1',
        question: 'What aspect of the hands-on work shown appeals to you most?',
        options: [
          'Solving practical problems',
          'Creating or fixing tangible things',
          'Working in different environments each day',
          'The technical knowledge and expertise'
        ],
        appearTime: 300
      },
      {
        id: 'construction-prompt-2',
        question: 'How do you feel about the balance between practical training and classroom learning in apprenticeships?',
        options: [
          'I prefer mostly hands-on, practical training',
          'I like the mix of practical and classroom learning',
          'I\'d prefer more classroom theory before practical application',
          'I\'m not sure this learning style works for me'
        ],
        appearTime: 600
      }
    ],
    relatedContent: ['trades-plumbing', 'trades-electrical'],
    viewCount: 31000
  },
  {
    id: 'fintech-career',
    title: 'How I Broke Into the Finance Industry',
    description: `I share my journey from a non-finance background to working at a leading fintech company. The video covers the skills I needed to develop, the certifications that helped me stand out, and how the finance industry is evolving with technology.

I discuss various roles within fintech, from product management to compliance and data analysis, and provide insights into the work culture, compensation, and career progression opportunities.`,
    category: 'business',
    subcategory: 'fintech',
    sourceType: 'youtube',
    sourceId: 'KAU7ZzgDVK4',
    sourceUrl: 'https://www.youtube.com/watch?v=KAU7ZzgDVK4',
    thumbnailUrl: 'https://img.youtube.com/vi/KAU7ZzgDVK4/maxresdefault.jpg',
    duration: 712, // 11:52 in seconds
    creator: 'FinanceInsider',
    creatorUrl: 'https://www.youtube.com/c/FinanceInsider',
    publicationDate: '2023-08-02',
    curatedDate: new Date().toISOString(),
    tags: ['fintech', 'finance careers', 'banking', 'financial technology', 'business'],
    skillsHighlighted: ['Financial Analysis', 'Regulatory Knowledge', 'Data Interpretation', 'Product Development', 'Client Relations'],
    educationRequired: ['Finance or business degree (beneficial but not required)', 'Industry certifications', 'Technical skills training'],
    prompts: [
      {
        id: 'finance-prompt-1',
        question: 'Which business role or function shown in the video interests you most?',
        options: [
          'Strategic planning and leadership',
          'Marketing and customer acquisition',
          'Operations and process management',
          'Finance and resource allocation'
        ],
        appearTime: 280
      },
      {
        id: 'finance-prompt-2',
        question: 'How do you feel about the risk-reward balance of entrepreneurship versus employment?',
        options: [
          'I\'m excited by the potential rewards of taking risks',
          'I prefer a balance of stability with some opportunity for risk',
          'I value security and predictability in my career',
          'I\'m unsure how I feel about career-related risk'
        ],
        appearTime: 560
      }
    ],
    relatedContent: ['business-banking', 'technology-fintech'],
    viewCount: 43000
  }
];

// Function to add a video to Firestore
async function addVideo(videoData) {
  try {
    const videoRef = doc(db, 'videos', videoData.id);
    await setDoc(videoRef, {
      ...videoData,
      curatedDate: serverTimestamp()
    });
    console.log(`Added video: ${videoData.title}`);
  } catch (error) {
    console.error(`Error adding video ${videoData.title}:`, error);
  }
}

// Main function to populate videos
async function populateVideos() {
  console.log('Starting to populate videos...');
  
  for (const video of sampleVideos) {
    await addVideo(video);
  }
  
  console.log('Finished populating videos!');
  process.exit(0);
}

// Run the population script
populateVideos().catch(error => {
  console.error('Error in population script:', error);
  process.exit(1);
}); 