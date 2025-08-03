import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, initializeFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getAnalytics, Analytics } from 'firebase/analytics';
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

// Lazy initialization singletons
let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;
let _analytics: Analytics | null = null;

/**
 * Get the Firebase app instance (lazy-initialized)
 */
const getApp = (): FirebaseApp => {
  if (!_app) {
    console.log('🔍 Environment check:', {
      MODE: import.meta.env.MODE,
      VITE_DISABLE_EMULATORS: import.meta.env.VITE_DISABLE_EMULATORS,
      isDevelopment: import.meta.env.MODE === 'development'
    });
    
    _app = initializeApp(firebaseConfig);
    console.log('🚀 Firebase app initialized');
  }
  return _app;
};

/**
 * Get the Firestore database instance (lazy-initialized)
 */
const getDb = (): Firestore => {
  if (!_db) {
    const app = getApp();
    
    const useEmulators = import.meta.env.MODE === 'development' && 
                        import.meta.env.VITE_DISABLE_EMULATORS !== 'true';

    if (useEmulators) {
      // Initialize Firestore with emulator settings
      _db = getFirestore(app);
      
      // Connect to local emulator with explicit host and port
      connectFirestoreEmulator(_db, '127.0.0.1', 8080);
      console.log('🧪 Connected to Firestore emulator on 127.0.0.1:8080');
    } else {
      // Connect to production database
      _db = initializeFirestore(app, {
        ignoreUndefinedProperties: true,
        experimentalForceLongPolling: true,
        experimentalAutoDetectLongPolling: false
      });
      console.log('🔄 Connected to Firestore production database');
    }
  }
  return _db;
};

/**
 * Get the Firebase Auth instance (lazy-initialized)
 */
const getAuthInstance = (): Auth => {
  if (!_auth) {
    const app = getApp();
    _auth = getAuth(app);
    console.log('🔐 Firebase Auth initialized');
  }
  return _auth;
};

/**
 * Get the Firebase Analytics instance (lazy-initialized)
 */
const getAnalyticsInstance = (): Analytics | null => {
  if (_analytics === undefined) {
    try {
      if (typeof window !== 'undefined' && isProduction()) {
        const app = getApp();
        _analytics = getAnalytics(app);
        console.log('✅ Firebase Analytics initialized');
      } else {
        _analytics = null;
      }
    } catch (error) {
      console.warn('⚠️ Firebase Analytics initialization failed:', error);
      _analytics = null;
    }
  }
  return _analytics;
};

// Utility function to get the correct Firebase function URL
export const getFirebaseFunctionUrl = (functionName: string): string => {
  const projectId = firebaseConfig.projectId || 'offscript-8f6eb';
  
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
const googleProvider = new GoogleAuthProvider();

// Export lazy-loaded instances using Proxies
export const db = new Proxy({} as Firestore, {
  get(target, prop) {
    const dbInstance = getDb();
    const value = dbInstance[prop as keyof Firestore];
    return typeof value === 'function' ? value.bind(dbInstance) : value;
  }
});

export const auth = new Proxy({} as Auth, {
  get(target, prop) {
    const authInstance = getAuthInstance();
    const value = authInstance[prop as keyof Auth];
    return typeof value === 'function' ? value.bind(authInstance) : value;
  }
});

export const analytics = new Proxy({} as Analytics | null, {
  get(target, prop) {
    const analyticsInstance = getAnalyticsInstance();
    if (!analyticsInstance) return undefined;
    const value = (analyticsInstance as any)[prop];
    return typeof value === 'function' ? value.bind(analyticsInstance) : value;
  }
});

// Export the Google Auth Provider and helper function
export { googleProvider };

// Legacy export for backwards compatibility
export const getFirebaseAnalytics = () => getAnalyticsInstance();

// Export the app getter for advanced use cases
export const getFirebaseApp = () => getApp();

// Default export is the lazy-loaded app
export default new Proxy({} as FirebaseApp, {
  get(target, prop) {
    const appInstance = getApp();
    const value = (appInstance as any)[prop];
    return typeof value === 'function' ? value.bind(appInstance) : value;
  }
});