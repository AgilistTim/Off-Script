/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID: string;
  readonly VITE_YOUTUBE_API_KEY: string;
  readonly VITE_RECAPTCHA_SITE_KEY: string;
  readonly VITE_BUMPUPS_API_KEY: string;
  readonly VITE_BUMPUPS_PROXY_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

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
    VITE_BUMPUPS_PROXY_URL?: string;
  };
}
