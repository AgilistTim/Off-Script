import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore as getFirestoreInstance, initializeFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth as getAuthInstance, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getAnalytics as getAnalyticsInstance, Analytics } from 'firebase/analytics';

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

// ✅ CLEAN ASYNC-ONLY Firebase instances
let firebaseApp: FirebaseApp | null = null;
let firestore: Firestore | null = null;
let auth: Auth | null = null;
let analytics: Analytics | null = null;

/**
 * ✅ CLEAN ASYNC-ONLY Firebase Initialization
 * No synchronous access, no module-level initialization
 */
export async function initFirebase(): Promise<void> {
  if (firebaseApp) return; // Already initialized
  
  console.log('🔧 Initializing Firebase...');
  
  // Build Firebase config from window.ENV
  const config = {
    apiKey: window.ENV?.VITE_FIREBASE_API_KEY,
    authDomain: window.ENV?.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: window.ENV?.VITE_FIREBASE_PROJECT_ID,
    storageBucket: window.ENV?.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: window.ENV?.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: window.ENV?.VITE_FIREBASE_APP_ID,
    measurementId: window.ENV?.VITE_FIREBASE_MEASUREMENT_ID,
  };
  
  // Validate required fields
  if (!config.apiKey || config.apiKey === 'undefined') {
    throw new Error(`🚨 Missing Firebase config: apiKey = "${config.apiKey}"
    
ENVIRONMENT STATUS:
- window.ENV exists: ${typeof window !== 'undefined' && !!window.ENV}
- Available keys: ${typeof window !== 'undefined' && window.ENV ? Object.keys(window.ENV).join(', ') : 'N/A'}

SOLUTION: Ensure window.ENV is loaded before calling initFirebase()`);
  }
  
  console.log('🔍 Environment check:', {
    MODE: import.meta.env.MODE,
    VITE_DISABLE_EMULATORS: import.meta.env.VITE_DISABLE_EMULATORS,
    isDevelopment: import.meta.env.MODE === 'development'
  });
  
  // Initialize Firebase app
  firebaseApp = initializeApp(config);
  console.log('🚀 Firebase app initialized');
  
  // Initialize Firestore
  const isDev = import.meta.env.MODE === 'development';
  const useEmulators = isDev && import.meta.env.VITE_DISABLE_EMULATORS !== 'true';
  
  if (useEmulators) {
    firestore = getFirestoreInstance(firebaseApp);
    connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
    console.log('🧪 Connected to Firestore emulator on 127.0.0.1:8080');
  } else {
    firestore = initializeFirestore(firebaseApp, {
      ignoreUndefinedProperties: true,
      experimentalForceLongPolling: true,
      experimentalAutoDetectLongPolling: false
    });
    console.log('🔄 Connected to Firestore production database');
  }
  
  // Initialize Auth
  auth = getAuthInstance(firebaseApp);
  console.log('🔐 Firebase Auth initialized');
  
  // Initialize Analytics (production only)
  if (typeof window !== 'undefined' && import.meta.env.MODE === 'production') {
    try {
      analytics = getAnalyticsInstance(firebaseApp);
      console.log('📊 Firebase Analytics initialized');
    } catch (error) {
      console.warn('⚠️ Firebase Analytics initialization failed:', error);
      analytics = null;
    }
  }
  
  console.log('✅ Firebase initialization complete');
}

/**
 * ✅ ASYNC-SAFE Firebase service getters
 * These automatically initialize Firebase if needed
 */
export async function getAuthSafe(): Promise<Auth> {
  if (!auth) await initFirebase();
  return auth!;
}

export async function getFirestoreSafe(): Promise<Firestore> {
  if (!firestore) await initFirebase();
  return firestore!;
}

export async function getAnalyticsSafe(): Promise<Analytics | null> {
  if (!analytics && !firebaseApp) await initFirebase();
  return analytics;
}

export async function getFirebaseAppSafe(): Promise<FirebaseApp> {
  if (!firebaseApp) await initFirebase();
  return firebaseApp!;
}

// Utility function to get the correct Firebase function URL
export const getFirebaseFunctionUrl = (functionName: string): string => {
  // Use hardcoded project ID since we can't access config before Firebase init
  const projectId = 'offscript-8f6eb';
  
  // Use emulator in development, production URL otherwise
  const useEmulators = import.meta.env.MODE === 'development' && 
                      import.meta.env.VITE_DISABLE_EMULATORS !== 'true';
  
  if (useEmulators) {
    return `http://127.0.0.1:5001/${projectId}/us-central1/${functionName}`;
  } else {
    return `https://us-central1-${projectId}.cloudfunctions.net/${functionName}`;
  }
};

// Initialize Google Auth Provider (this is stateless)
export const googleProvider = new GoogleAuthProvider();

// ❌ DEPRECATED EXPORTS - WILL THROW HELPFUL ERRORS
export const db = new Proxy({} as Firestore, {
  get(target, prop) {
    throw new Error(`🚨 DEPRECATED: Direct 'db.${String(prop)}' access detected!

PROBLEM: This synchronous access happens before Firebase is initialized.

SOLUTION: Use async pattern instead:
  
  // ❌ OLD: const result = await db.collection('users');
  // ✅ NEW: const firestore = await getFirestoreSafe();
  //         const result = await firestore.collection('users');

See migration guide for full details.`);
  }
});

export { auth as auth };  // Will throw error if accessed synchronously
export { analytics as analytics };  // Will throw error if accessed synchronously

// Legacy function exports - DEPRECATED
export const getFirebaseApp = () => {
  throw new Error('🚨 DEPRECATED: Use getFirebaseAppSafe() instead');
};

export const getFirestore = () => {
  throw new Error('🚨 DEPRECATED: Use getFirestoreSafe() instead');
};

export const getAuth = () => {
  throw new Error('🚨 DEPRECATED: Use getAuthSafe() instead');
};

export const getAnalytics = () => {
  throw new Error('🚨 DEPRECATED: Use getAnalyticsSafe() instead');
};

// Legacy exports for backwards compatibility
export const getFirebaseAnalytics = getAnalytics;

// Default export - will throw error if accessed
export default new Proxy({} as FirebaseApp, {
  get(target, prop) {
    throw new Error(`🚨 DEPRECATED: Direct default Firebase app access detected!

PROBLEM: This synchronous access happens before Firebase is initialized.

SOLUTION: Use async pattern instead:
  
  // ❌ OLD: import firebaseApp from './firebase';
  // ✅ NEW: import { getFirebaseAppSafe } from './firebase';
  //         const app = await getFirebaseAppSafe();

See migration guide for full details.`);
  }
});