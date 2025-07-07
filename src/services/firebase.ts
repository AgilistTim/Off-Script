import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

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

    // If any window.ENV values are placeholders, check if we have real environment variables
    if (Object.values(windowConfig).some(isPlaceholder)) {
      console.log('Detected placeholder values in window.ENV, falling back to environment variables');
      
      // Try to use environment variables (only works in development)
      const envConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
      };

      // If we have real environment variables, use them
      if (envConfig.apiKey && !isPlaceholder(envConfig.apiKey)) {
        return envConfig;
      }
      
      // If we're in production and still have placeholders, show comprehensive error
      if (!validateConfig(envConfig)) {
        console.error('Firebase configuration error: No valid environment variables found.');
        console.error('Window ENV has placeholders and fallback env vars are also invalid.');
        console.error('This will cause Firebase initialization to fail.');
      }
      
      // Return the best available config - environment variables if valid, otherwise window config
      return validateConfig(envConfig) ? envConfig : windowConfig;
    }

    // Validate the window config before returning
    if (!validateConfig(windowConfig)) {
      console.warn('⚠️ Firebase configuration validation failed. The app may not function correctly.');
    }
    return windowConfig;
  }
  
  // Fallback to environment variables (for server-side or development)
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY_HERE",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "your-project-id",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "your-project.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:000000000000:web:your-app-id",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-YOUR-MEASUREMENT-ID",
  };
};

// Initialize Firebase
const app = initializeApp(getFirebaseConfig());

// Initialize Firestore with settings optimized for production
const isProduction = typeof window !== 'undefined' && 
  window.location.hostname !== 'localhost' && 
  window.location.hostname !== '127.0.0.1';

export const db = isProduction 
  ? initializeFirestore(app, {
      experimentalForceLongPolling: true, // Use long polling instead of WebSocket
      ignoreUndefinedProperties: true     // Ignore undefined properties to prevent errors
    })
  : getFirestore(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Analytics only in browser environment
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { analytics };
export default app;
