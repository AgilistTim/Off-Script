/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Firebase configuration (safe for client-side)
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID: string;
  
  // Public API keys (safe for client-side)
  readonly VITE_YOUTUBE_API_KEY: string;
  readonly VITE_RECAPTCHA_SITE_KEY: string;
  
  // API endpoints (safe for client-side)
  readonly VITE_BUMPUPS_PROXY_URL: string;
  readonly VITE_OPENAI_ASSISTANT_URL: string;
  
  // Development flags
  readonly VITE_DISABLE_EMULATORS: string;
  readonly VITE_APP_ENV: string;
  readonly VITE_DEBUG: string;
  
  // SECURITY NOTE: Sensitive API keys removed
  // VITE_OPENAI_API_KEY - handled server-side only
  // VITE_BUMPUPS_API_KEY - handled server-side only  
  // VITE_WEBSHARE_API_KEY - handled server-side only
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Extended window.ENV interface for runtime configuration
declare global {
  interface Window {
    ENV?: {
      // Firebase configuration
      VITE_FIREBASE_API_KEY: string;
      VITE_FIREBASE_AUTH_DOMAIN: string;
      VITE_FIREBASE_PROJECT_ID: string;
      VITE_FIREBASE_STORAGE_BUCKET: string;
      VITE_FIREBASE_MESSAGING_SENDER_ID: string;
      VITE_FIREBASE_APP_ID: string;
      VITE_FIREBASE_MEASUREMENT_ID: string;
      
      // Public API keys (safe for client-side)
      VITE_YOUTUBE_API_KEY?: string;
      VITE_RECAPTCHA_SITE_KEY?: string;
      
      // API endpoints
      VITE_BUMPUPS_PROXY_URL?: string;
      
      // SECURITY: Sensitive API keys excluded from runtime config
    };
  }
}
