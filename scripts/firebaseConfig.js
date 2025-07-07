// Shared Firebase configuration for all scripts
// This ensures consistent environment variable handling across all scripts

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(envVar => console.error(`  - ${envVar}`));
  console.error('\nPlease check your .env file and ensure all Firebase configuration variables are set.');
  console.error('You can copy env.example to .env and fill in your Firebase credentials.');
  process.exit(1);
}

// Firebase configuration from environment variables
export const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Admin credentials from environment variables
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@offscript.com';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Helper function to authenticate as admin
export async function authenticateAdmin() {
  try {
    console.log('🔐 Authenticating as admin...');
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log('✅ Admin authentication successful');
    return true;
  } catch (error) {
    console.error('❌ Admin authentication failed:', error.message);
    console.error('Please check your ADMIN_EMAIL and ADMIN_PASSWORD environment variables.');
    return false;
  }
}

// Log configuration status (without exposing sensitive data)
console.log('🔧 Firebase configuration loaded successfully');
console.log(`📁 Project ID: ${firebaseConfig.projectId}`);
console.log(`🔐 Admin email: ${ADMIN_EMAIL}`); 