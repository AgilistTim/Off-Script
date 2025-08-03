import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
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
      VITE_BUMPUPS_PROXY_URL?: string;
      // SECURITY: Sensitive API keys excluded from runtime config
    };
  }
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize auth will be done after app initialization below

// Initialize Firestore - connect to emulator in development, production otherwise
let db: Firestore;

// Check if we're running in development mode and should use emulators
console.log('🔍 Environment check:', {
  MODE: import.meta.env.MODE,
  VITE_DISABLE_EMULATORS: import.meta.env.VITE_DISABLE_EMULATORS,
  isDevelopment: import.meta.env.MODE === 'development'
});

const useEmulators = import.meta.env.MODE === 'development' && 
                   import.meta.env.VITE_DISABLE_EMULATORS !== 'true';

if (useEmulators) {
  // Initialize Firestore with emulator settings
  db = getFirestore(app);
  
  // Connect to local emulator with explicit host and port
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  console.log('🧪 Connected to Firestore emulator on 127.0.0.1:8080');
} else {
  // Connect to production database
  db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    experimentalForceLongPolling: true,
    experimentalAutoDetectLongPolling: false
  });
  console.log('🔄 Connected to Firestore production database');
}

// Utility function to get the correct Firebase function URL
export const getFirebaseFunctionUrl = (functionName: string): string => {
  const projectId = firebaseConfig.projectId || 'offscript-8f6eb';
  
  // Use emulator in development, production URL otherwise
  if (useEmulators) {
    return `http://127.0.0.1:5001/${projectId}/us-central1/${functionName}`;
  } else {
    return `https://us-central1-${projectId}.cloudfunctions.net/${functionName}`;
  }
};

// Initialize auth after app setup
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { db, auth, googleProvider };

// Initialize Analytics if available
let analytics = null;
try {
  if (typeof window !== 'undefined' && isProduction()) {
    analytics = getAnalytics(app);
    console.log('✅ Firebase Analytics initialized');
  }
} catch (error) {
  console.warn('⚠️ Firebase Analytics initialization failed:', error);
}

export const getFirebaseAnalytics = () => analytics;

export default app;
