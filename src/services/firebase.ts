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
    };
  }
}

// Get Firebase configuration from environment variables or window.ENV
const getFirebaseConfig = () => {
  // Check if we're in a browser environment with window.ENV
  if (typeof window !== 'undefined' && window.ENV) {
    return {
      apiKey: window.ENV.VITE_FIREBASE_API_KEY,
      authDomain: window.ENV.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: window.ENV.VITE_FIREBASE_PROJECT_ID,
      storageBucket: window.ENV.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: window.ENV.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: window.ENV.VITE_FIREBASE_APP_ID,
      measurementId: window.ENV.VITE_FIREBASE_MEASUREMENT_ID,
    };
  }
  
  // Fallback to environment variables (for server-side or development)
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "***REMOVED***",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "***REMOVED***",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "***REMOVED***",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "***REMOVED***.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "***REMOVED***",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:***REMOVED***:web:b5eac19f0f81d6ef2c3dee",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "***REMOVED***",
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
