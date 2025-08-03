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

// Firebase instances - initialized only after environment is ready
let firebaseApp: FirebaseApp | null = null;
let firestore: Firestore | null = null;
let firebaseAuth: Auth | null = null;
let firebaseAnalytics: Analytics | null = null;
let isFirebaseInitialized = false;

/**
 * Wait for window.ENV to be available
 */
const waitForEnvironment = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // If window.ENV is already available, resolve immediately
    if (typeof window !== 'undefined' && window.ENV && window.ENV.VITE_FIREBASE_API_KEY) {
      resolve(true);
      return;
    }
    
    // Otherwise, poll for window.ENV with timeout
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds total (50 * 100ms)
    
    const checkEnv = () => {
      if (typeof window !== 'undefined' && window.ENV && window.ENV.VITE_FIREBASE_API_KEY) {
        resolve(true);
      } else if (attempts >= maxAttempts) {
        console.error('❌ window.ENV not available after timeout');
        resolve(false);
      } else {
        attempts++;
        setTimeout(checkEnv, 100); // Check every 100ms
      }
    };
    
    checkEnv();
  });
};

/**
 * Initialize Firebase with environment variables
 * Must be called before any Firebase services are used
 */
export const initFirebase = async (): Promise<void> => {
  if (isFirebaseInitialized) {
    return; // Already initialized
  }
  
  console.log('🔧 Initializing Firebase...');
  
  // Wait for window.ENV to be available
  const envReady = await waitForEnvironment();
  
  if (!envReady || !window.ENV) {
    throw new Error('Environment variables not available - cannot initialize Firebase');
  }
  
  console.log('🔍 Environment check:', {
    MODE: import.meta.env.MODE,
    VITE_DISABLE_EMULATORS: import.meta.env.VITE_DISABLE_EMULATORS,
    isDevelopment: import.meta.env.MODE === 'development'
  });
  
  // Build Firebase config from window.ENV
  const config = {
    apiKey: window.ENV.VITE_FIREBASE_API_KEY,
    authDomain: window.ENV.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: window.ENV.VITE_FIREBASE_PROJECT_ID,
    storageBucket: window.ENV.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: window.ENV.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: window.ENV.VITE_FIREBASE_APP_ID,
    measurementId: window.ENV.VITE_FIREBASE_MEASUREMENT_ID,
  };
  
  // Validate required fields
  if (!config.apiKey || config.apiKey === 'undefined') {
    throw new Error(`Invalid Firebase API key: ${config.apiKey}`);
  }
  
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
  firebaseAuth = getAuthInstance(firebaseApp);
  console.log('🔐 Firebase Auth initialized');
  
  // Initialize Analytics (production only)
  if (typeof window !== 'undefined' && import.meta.env.MODE === 'production') {
    try {
      firebaseAnalytics = getAnalyticsInstance(firebaseApp);
      console.log('📊 Firebase Analytics initialized');
    } catch (error) {
      console.warn('⚠️ Firebase Analytics initialization failed:', error);
      firebaseAnalytics = null;
    }
  }
  
  isFirebaseInitialized = true;
  console.log('✅ Firebase initialization complete');
};

/**
 * Safe Firebase service getters - require initialization first
 */
const ensureInitialized = () => {
  if (!isFirebaseInitialized) {
    throw new Error('Firebase not initialized. Call initFirebase() first.');
  }
};

export const getFirebaseApp = (): FirebaseApp => {
  ensureInitialized();
  return firebaseApp!;
};

export const getFirestore = (): Firestore => {
  ensureInitialized();
  return firestore!;
};

export const getAuth = (): Auth => {
  ensureInitialized();
  return firebaseAuth!;
};

export const getAnalytics = (): Analytics | null => {
  ensureInitialized();
  return firebaseAnalytics;
};

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

// Simple exports - no Proxy magic, just direct access to initialized instances
export const db = new Proxy({} as Firestore, {
  get(target, prop) {
    const dbInstance = getFirestore();
    const value = dbInstance[prop as keyof Firestore];
    return typeof value === 'function' ? value.bind(dbInstance) : value;
  }
});

export const auth = new Proxy({} as Auth, {
  get(target, prop) {
    const authInstance = getAuth();
    const value = authInstance[prop as keyof Auth];
    return typeof value === 'function' ? value.bind(authInstance) : value;
  }
});

export const analytics = new Proxy({} as Analytics | null, {
  get(target, prop) {
    const analyticsInstance = getAnalytics();
    if (!analyticsInstance) return undefined;
    const value = (analyticsInstance as any)[prop];
    return typeof value === 'function' ? value.bind(analyticsInstance) : value;
  }
});

// Legacy exports for backwards compatibility
export const getFirebaseAnalytics = getAnalytics;

// Default export
export default new Proxy({} as FirebaseApp, {
  get(target, prop) {
    const appInstance = getFirebaseApp();
    const value = (appInstance as any)[prop];
    return typeof value === 'function' ? value.bind(appInstance) : value;
  }
});