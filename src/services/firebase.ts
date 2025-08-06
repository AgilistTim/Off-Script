/**
 * Firebase Service - Standard Initialization Pattern
 * 
 * Uses direct import.meta.env access for configuration
 * No async initialization needed - follows Firebase best practices
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getAnalytics, Analytics } from 'firebase/analytics';
import { firebaseConfig } from '../config/environment';

/**
 * Initialize Firebase App with standard synchronous pattern
 * This follows Firebase documentation best practices
 */
console.log('🔧 Initializing Firebase...');

// Validate Firebase configuration
if (!firebaseConfig.apiKey) {
  throw new Error('❌ Missing Firebase API key. Check environment variables.');
}

console.log('🔍 Environment check:', {
  MODE: import.meta.env.MODE,
  VITE_DISABLE_EMULATORS: import.meta.env.VITE_DISABLE_EMULATORS,
  isDevelopment: import.meta.env.MODE === 'development'
});

// Initialize Firebase app
export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);
console.log('🚀 Firebase app initialized');

/**
 * Initialize Firestore with proper settings and emulator support for development
 */
const isDev = import.meta.env.MODE === 'development';
const useEmulators = isDev && import.meta.env.VITE_DISABLE_EMULATORS !== 'true';

// Configure Firestore with proper serialization settings
export const firestore: Firestore = initializeFirestore(firebaseApp, {
  ignoreUndefinedProperties: true, // Prevent serialization errors from undefined values
});

if (useEmulators) {
  connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
  console.log('🧪 Connected to Firestore emulator on 127.0.0.1:8080');
} else {
  console.log('🔄 Connected to Firestore production database');
}

/**
 * Initialize Firebase Auth
 */
export const auth: Auth = getAuth(firebaseApp);
console.log('🔐 Firebase Auth initialized');

/**
 * Initialize Google Auth Provider
 */
export const googleProvider = new GoogleAuthProvider();

/**
 * Initialize Firebase Analytics (production only)
 */
export let analytics: Analytics | null = null;

if (typeof window !== 'undefined' && import.meta.env.MODE === 'production') {
  try {
    analytics = getAnalytics(firebaseApp);
    console.log('📊 Firebase Analytics initialized');
  } catch (error) {
    console.warn('⚠️ Firebase Analytics initialization failed:', error);
    analytics = null;
  }
}

/**
 * Legacy export names for backward compatibility
 * Use these standard exports instead of async getters
 */
export const db = firestore;

/**
 * Utility function to get the correct Firebase function URL
 */
export const getFirebaseFunctionUrl = (functionName: string): string => {
  const projectId = firebaseConfig.projectId || 'offscript-8f6eb';
  
  if (useEmulators) {
    return `http://127.0.0.1:5001/${projectId}/us-central1/${functionName}`;
  } else {
    return `https://us-central1-${projectId}.cloudfunctions.net/${functionName}`;
  }
};

console.log('✅ Firebase initialization complete');

/**
 * Default export for convenience
 */
export default firebaseApp;