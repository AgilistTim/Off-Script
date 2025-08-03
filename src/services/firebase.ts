import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, initializeFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getAnalytics, Analytics } from 'firebase/analytics';
import { firebaseConfig, isProduction, isDevelopment, initializeEnvironment, isEnvironmentInitialized } from '../config/environment';

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
 * Get the Firebase app instance (lazy-initialized with environment waiting)
 */
const getApp = async (): Promise<FirebaseApp> => {
  if (!_app) {
    console.log('🔍 Environment check:', {
      MODE: import.meta.env.MODE,
      VITE_DISABLE_EMULATORS: import.meta.env.VITE_DISABLE_EMULATORS,
      isDevelopment: import.meta.env.MODE === 'development'
    });
    
    // Wait for environment initialization before creating Firebase app
    if (!isEnvironmentInitialized()) {
      console.log('⏳ Waiting for environment initialization...');
      await initializeEnvironment();
      console.log('✅ Environment initialization complete');
    }
    
    _app = initializeApp(firebaseConfig);
    console.log('🚀 Firebase app initialized');
  }
  return _app;
};

/**
 * Get the Firestore database instance (lazy-initialized)
 */
const getDb = async (): Promise<Firestore> => {
  if (!_db) {
    const app = await getApp();
    
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
const getAuthInstance = async (): Promise<Auth> => {
  if (!_auth) {
    const app = await getApp();
    _auth = getAuth(app);
    console.log('🔐 Firebase Auth initialized');
  }
  return _auth;
};

/**
 * Get the Firebase Analytics instance (lazy-initialized)
 */
const getAnalyticsInstance = async (): Promise<Analytics | null> => {
  if (_analytics === undefined) {
    try {
      if (typeof window !== 'undefined' && isProduction()) {
        const app = await getApp();
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
// Async-aware Firebase service exports
export const db = new Proxy({} as Firestore, {
  get(target, prop) {
    // For sync access, we need to handle async initialization gracefully
    const dbPromise = getDb();
    
    // If accessing a method, return a wrapper that waits for initialization
    if (typeof prop === 'string') {
      return async function(...args: any[]) {
        const dbInstance = await dbPromise;
        const method = dbInstance[prop as keyof Firestore];
        if (typeof method === 'function') {
          return (method as any).apply(dbInstance, args);
        }
        return method;
      };
    }
    
    // For property access, we can't wait, so trigger initialization in background
    dbPromise.catch(console.error);
    return undefined;
  }
});

export const auth = new Proxy({} as Auth, {
  get(target, prop) {
    const authPromise = getAuthInstance();
    
    if (typeof prop === 'string') {
      return async function(...args: any[]) {
        const authInstance = await authPromise;
        const method = authInstance[prop as keyof Auth];
        if (typeof method === 'function') {
          return (method as any).apply(authInstance, args);
        }
        return method;
      };
    }
    
    authPromise.catch(console.error);
    return undefined;
  }
});

export const analytics = new Proxy({} as Analytics | null, {
  get(target, prop) {
    const analyticsPromise = getAnalyticsInstance();
    
    if (typeof prop === 'string') {
      return async function(...args: any[]) {
        const analyticsInstance = await analyticsPromise;
        if (!analyticsInstance) return undefined;
        const method = (analyticsInstance as any)[prop];
        if (typeof method === 'function') {
          return method.apply(analyticsInstance, args);
        }
        return method;
      };
    }
    
    analyticsPromise.catch(console.error);
    return undefined;
  }
});

// Export the Google Auth Provider and helper function
export { googleProvider };

// Legacy export for backwards compatibility  
export const getFirebaseAnalytics = getAnalyticsInstance;

// Export the app getter for advanced use cases
export const getFirebaseApp = getApp;

// Default export is the lazy-loaded app
export default new Proxy({} as FirebaseApp, {
  get(target, prop) {
    const appPromise = getApp();
    
    if (typeof prop === 'string') {
      return async function(...args: any[]) {
        const appInstance = await appPromise;
        const method = (appInstance as any)[prop];
        if (typeof method === 'function') {
          return method.apply(appInstance, args);
        }
        return method;
      };
    }
    
    appPromise.catch(console.error);
    return undefined;
  }
});