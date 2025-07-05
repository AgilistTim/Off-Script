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
  // Helper function to check if a value is a placeholder
  const isPlaceholder = (value: string) => {
    return value.includes('YOUR_') || value.includes('your-') || value === '000000000000' || value.includes('G-YOUR-') || value.includes('__FIREBASE_');
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

    // If any window.ENV values are placeholders, fall back to environment variables
    if (Object.values(windowConfig).some(isPlaceholder)) {
      console.log('Detected placeholder values in window.ENV, falling back to environment variables');
      return {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY || windowConfig.apiKey,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || windowConfig.authDomain,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || windowConfig.projectId,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || windowConfig.storageBucket,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || windowConfig.messagingSenderId,
        appId: import.meta.env.VITE_FIREBASE_APP_ID || windowConfig.appId,
        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || windowConfig.measurementId,
      };
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
