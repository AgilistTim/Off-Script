// This script populates the Firestore database with initial data
// Run with: node scripts/populateFirestore.js

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  serverTimestamp 
} = require('firebase/firestore');
require('dotenv').config();

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

// Sample data for sectors
const sectors = [
  {
    id: 'tech',
    name: 'Technology & AI',
    description: 'Build the digital future with AI, data science, and software development',
    iconUrl: 'https://example.com/tech-icon.svg',
    imageUrl: 'https://example.com/tech-image.jpg',
    careers: [
      'Data Scientist', 
      'AI Specialist', 
      'Software Developer', 
      'Cybersecurity Analyst'
    ]
  },
  {
    id: 'green-energy',
    name: 'Green Energy & Sustainability',
    description: 'Lead the UK\'s net-zero transition in renewable energy',
    iconUrl: 'https://example.com/energy-icon.svg',
    imageUrl: 'https://example.com/energy-image.jpg',
    careers: [
      'Wind Turbine Technician', 
      'Solar Installer', 
      'Energy Analyst', 
      'Environmental Engineer'
    ]
  },
  {
    id: 'healthcare',
    name: 'Healthcare & Life Sciences',
    description: 'Support the NHS and growing healthcare technology sector',
    iconUrl: 'https://example.com/healthcare-icon.svg',
    imageUrl: 'https://example.com/healthcare-image.jpg',
    careers: [
      'Nurse Practitioner', 
      'Healthcare Assistant', 
      'Medical Technology', 
      'Health Data Analyst'
    ]
  },
  {
    id: 'fintech',
    name: 'FinTech & Digital Finance',
    description: 'Join London\'s thriving financial technology ecosystem',
    iconUrl: 'https://example.com/fintech-icon.svg',
    imageUrl: 'https://example.com/fintech-image.jpg',
    careers: [
      'Fintech Engineer', 
      'Blockchain Developer', 
      'Financial Analyst', 
      'Risk Assessor'
    ]
  },
  {
    id: 'skilled-trades',
    name: 'Skilled Trades & Manufacturing',
    description: 'Build and maintain the infrastructure powering modern Britain',
    iconUrl: 'https://example.com/trades-icon.svg',
    imageUrl: 'https://example.com/trades-image.jpg',
    careers: [
      'Electrician', 
      'Plumber', 
      'HVAC Technician', 
      'Advanced Manufacturing'
    ]
  },
  {
    id: 'creative',
    name: 'Creative & Digital Media',
    description: 'Thrive in the UK\'s world-leading creative industries',
    iconUrl: 'https://example.com/creative-icon.svg',
    imageUrl: 'https://example.com/creative-image.jpg',
    careers: [
      'Content Creator', 
      'Digital Designer', 
      'Video Producer', 
      'UX/UI Designer'
    ]
  }
];

// Sample data for careers
const careers = [
  {
    id: 'data-scientist',
    title: 'Data Scientist',
    description: 'Analyze and interpret complex data to help organizations make better decisions',
    salaryRange: {
      min: 45000,
      max: 90000,
      currency: 'GBP'
    },
    educationRequirements: [
      'Bachelor\'s degree in Computer Science, Statistics, or related field',
      'Master\'s degree preferred',
      'Certifications in data science or machine learning'
    ],
    skills: [
      'Python',
      'R',
      'SQL',
      'Machine Learning',
      'Data Visualization',
      'Statistical Analysis'
    ],
    dayInLife: 'Data scientists typically start their day reviewing analytics reports and checking model performance. They spend most of their time cleaning data, building models, and collaborating with cross-functional teams to implement data-driven solutions.',
    growthPotential: 'Data scientists can advance to senior data scientist, lead data scientist, or data science manager roles. With experience, they may move into chief data officer positions.',
    sectorId: 'tech',
    videoUrls: [
      'https://example.com/data-scientist-day-in-life.mp4',
      'https://example.com/data-scientist-career-path.mp4'
    ]
  },
  {
    id: 'software-developer',
    title: 'Software Developer',
    description: 'Design, build, and maintain software applications and systems',
    salaryRange: {
      min: 35000,
      max: 85000,
      currency: 'GBP'
    },
    educationRequirements: [
      'Bachelor\'s degree in Computer Science or related field',
      'Coding bootcamp certification',
      'Self-taught with portfolio'
    ],
    skills: [
      'JavaScript',
      'Python',
      'Java',
      'React',
      'Node.js',
      'Git'
    ],
    dayInLife: 'Software developers typically start their day with stand-up meetings to discuss progress and blockers. They spend most of their time writing code, reviewing pull requests, debugging issues, and collaborating with team members.',
    growthPotential: 'Software developers can advance to senior developer, tech lead, or software architect roles. With additional skills, they may move into engineering management or CTO positions.',
    sectorId: 'tech',
    videoUrls: [
      'https://example.com/software-developer-day-in-life.mp4',
      'https://example.com/software-developer-career-path.mp4'
    ]
  },
  {
    id: 'nurse-practitioner',
    title: 'Nurse Practitioner',
    description: 'Provide advanced nursing care and treatment to patients',
    salaryRange: {
      min: 38000,
      max: 65000,
      currency: 'GBP'
    },
    educationRequirements: [
      'Bachelor\'s degree in Nursing',
      'Master\'s degree in Advanced Nursing Practice',
      'Nursing and Midwifery Council (NMC) registration'
    ],
    skills: [
      'Patient Assessment',
      'Diagnostic Testing',
      'Treatment Planning',
      'Prescription Management',
      'Patient Education',
      'Electronic Health Records'
    ],
    dayInLife: 'Nurse practitioners typically start their day reviewing patient charts and preparing for appointments. They spend their time examining patients, diagnosing conditions, prescribing medications, and collaborating with physicians and other healthcare professionals.',
    growthPotential: 'Nurse practitioners can advance to specialized roles in areas like pediatrics, geriatrics, or mental health. They may also move into clinical leadership, education, or healthcare administration.',
    sectorId: 'healthcare',
    videoUrls: [
      'https://example.com/nurse-practitioner-day-in-life.mp4',
      'https://example.com/nurse-practitioner-career-path.mp4'
    ]
  }
];

// Function to populate sectors
async function populateSectors() {
  console.log('Populating sectors...');
  
  for (const sector of sectors) {
    const sectorRef = doc(db, 'sectors', sector.id);
    
    await setDoc(sectorRef, {
      ...sector,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log(`Added sector: ${sector.name}`);
  }
  
  console.log('Sectors population complete!');
}

// Function to populate careers
async function populateCareers() {
  console.log('Populating careers...');
  
  for (const career of careers) {
    const careerRef = doc(db, 'careers', career.id);
    
    await setDoc(careerRef, {
      ...career,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log(`Added career: ${career.title}`);
  }
  
  console.log('Careers population complete!');
}

// Main function to populate all data
async function populateAllData() {
  try {
    await populateSectors();
    await populateCareers();
    
    console.log('All data has been successfully populated!');
    process.exit(0);
  } catch (error) {
    console.error('Error populating data:', error);
    process.exit(1);
  }
}

// Run the population script
populateAllData(); 