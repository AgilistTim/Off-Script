import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore';
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
    };
  }
}

// Get Firebase configuration from environment variables or window.ENV
const getFirebaseConfig = () => {
  // Helper function to check if a value is a placeholder or invalid
  const isPlaceholder = (value: string) => {
    if (!value || typeof value !== 'string') return true;
    return value.includes('YOUR_') || 
           value.includes('your-') || 
           value === '000000000000' || 
           value.includes('G-YOUR-') || 
           value.includes('__FIREBASE_') ||
           value.includes('demo-') ||
           value.includes('REPLACE_WITH_') ||
           value.includes('placeholder');
  };

  // Helper function to validate critical Firebase config
  const validateConfig = (config: any) => {
    const required = ['apiKey', 'authDomain', 'projectId'];
    const missing = required.filter(key => !config[key] || isPlaceholder(config[key]));
    
    if (missing.length > 0) {
      console.error('❌ Firebase configuration error: Missing or invalid required fields:', missing);
      console.error('This usually means environment variables are not properly set.');
      console.error('For Render deployment: Check that all VITE_FIREBASE_* environment variables are set in your service settings.');
      console.error('For local development: Copy env.example to .env and fill in your Firebase credentials.');
      return false;
    }
    return true;
  };

  // PRIORITIZE ENVIRONMENT VARIABLES FIRST
  // Try to use environment variables (works in development)
  const envConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };

  // If we have valid environment variables, use them
  if (envConfig.apiKey && !isPlaceholder(envConfig.apiKey)) {
    console.log('Using environment variables for Firebase configuration');
    return envConfig;
  }

  // Check if we're in a browser environment with window.ENV
  if (typeof window !== 'undefined' && window.ENV) {
    const windowConfig = {
      apiKey: window.ENV.VITE_FIREBASE_API_KEY,
      authDomain: window.ENV.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: window.ENV.VITE_FIREBASE_PROJECT_ID,
      storageBucket: window.ENV.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: window.ENV.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: window.ENV.VITE_FIREBASE_APP_ID,
      measurementId: window.ENV.VITE_FIREBASE_MEASUREMENT_ID,
    };

    // If window.ENV values are not placeholders, use them
    if (!Object.values(windowConfig).some(isPlaceholder)) {
      console.log('Using window.ENV for Firebase configuration');
      return windowConfig;
    } else {
      console.warn('⚠️ window.ENV contains placeholder values, cannot use for Firebase configuration');
    }
  }
  
  // If we get here, we don't have valid configuration
  console.error('❌ No valid Firebase configuration found. The app will not function correctly.');
  
  // Return a dummy config that will fail gracefully
  return {
    apiKey: "MISSING_API_KEY",
    authDomain: "MISSING_AUTH_DOMAIN",
    projectId: "MISSING_PROJECT_ID",
    storageBucket: "MISSING_STORAGE_BUCKET",
    messagingSenderId: "MISSING_SENDER_ID",
    appId: "MISSING_APP_ID",
    measurementId: "MISSING_MEASUREMENT_ID",
  };
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with settings optimized for production
export const db = isProduction 
  ? initializeFirestore(app, {
      experimentalForceLongPolling: true, // Use long polling instead of WebSocket
      ignoreUndefinedProperties: true     // Ignore undefined properties to prevent errors
    })
  : getFirestore(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Analytics only in browser environment and if measurementId is available
let analytics;
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  try {
    analytics = getAnalytics(app);
    console.log('✅ Firebase Analytics initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Analytics:', error);
  }
}

export { analytics };
export default app;
