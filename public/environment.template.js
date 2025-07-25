// Template file for environment variables
// This file is copied to environment.js during Docker build and placeholders are replaced at runtime
window.ENV = {
  // Firebase configuration
  VITE_FIREBASE_API_KEY: '__FIREBASE_API_KEY__',
  VITE_FIREBASE_AUTH_DOMAIN: '__FIREBASE_AUTH_DOMAIN__',
  VITE_FIREBASE_PROJECT_ID: '__FIREBASE_PROJECT_ID__',
  VITE_FIREBASE_STORAGE_BUCKET: '__FIREBASE_STORAGE_BUCKET__',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '__FIREBASE_MESSAGING_SENDER_ID__',
  VITE_FIREBASE_APP_ID: '__FIREBASE_APP_ID__',
  VITE_FIREBASE_MEASUREMENT_ID: '__FIREBASE_MEASUREMENT_ID__',
  
  // API Keys (client-safe only)
  VITE_YOUTUBE_API_KEY: '__YOUTUBE_API_KEY__',
  VITE_RECAPTCHA_SITE_KEY: '__RECAPTCHA_SITE_KEY__',
  
  // API Endpoints (URLs are safe to expose)
  VITE_BUMPUPS_PROXY_URL: '__BUMPUPS_PROXY_URL__',
  VITE_OPENAI_ASSISTANT_URL: '__OPENAI_ASSISTANT_URL__',
}; 