import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, Firestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import { firebaseConfig, isProduction, isDevelopment } from '../config/environment';

// Add type declaration for window.ENV
declare global {
  interface Window {
    ENV?: {
      VITE_FIREBASE_API_KEY: string;
      VITE_FIREBASE_AUTH_DOMAIN: string;
      VITE_FIREBASE_PROJECT_ID: string;
      VITE_FIREBASE_STORAGE_BUCKET: string;
      VITE_FIREBASE_MESSAGING_SENDER_ID: string;
      VITE_FIREBASE_APP_ID: string;
      VITE_FIREBASE_MEASUREMENT_ID: string;
      VITE_YOUTUBE_API_KEY?: string;
      VITE_RECAPTCHA_SITE_KEY?: string;
      VITE_BUMPUPS_API_KEY?: string;
      VITE_BUMPUPS_PROXY_URL?: string;
    };
  }
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore - always connect to production database
const db: Firestore = initializeFirestore(app, {
  ignoreUndefinedProperties: true,     // Ignore undefined properties to prevent errors
  experimentalForceLongPolling: true,  // Force long polling instead of WebSockets to avoid CORS issues
  experimentalAutoDetectLongPolling: false  // Disable auto-detection since we're forcing long polling
});

console.log('🔄 Connected to Firestore production database');

// Utility function to get the correct Firebase function URL
export const getFirebaseFunctionUrl = (functionName: string): string => {
  const projectId = firebaseConfig.projectId || 'offscript-8f6eb';
  
  // Always use the deployed Firebase Functions URL
  // This ensures we use the actual Firebase Functions regardless of environment
  return `https://us-central1-${projectId}.cloudfunctions.net/${functionName}`;
};

export { db };
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Analytics if available
let analytics = null;
try {
  if (typeof window !== 'undefined' && isProduction) {
    analytics = getAnalytics(app);
    console.log('✅ Firebase Analytics initialized');
  }
} catch (error) {
  console.warn('⚠️ Firebase Analytics initialization failed:', error);
}

export const getFirebaseAnalytics = () => analytics;

export default app;
