// This file is loaded by index.html to provide environment variables to the app
// For security reasons, we don't include actual API keys here - they should be injected at runtime
window.ENV = {
  VITE_FIREBASE_API_KEY: "__FIREBASE_API_KEY__",
  VITE_FIREBASE_AUTH_DOMAIN: "__FIREBASE_AUTH_DOMAIN__",
  VITE_FIREBASE_PROJECT_ID: "__FIREBASE_PROJECT_ID__",
  VITE_FIREBASE_STORAGE_BUCKET: "__FIREBASE_STORAGE_BUCKET__",
  VITE_FIREBASE_MESSAGING_SENDER_ID: "__FIREBASE_MESSAGING_SENDER_ID__",
  VITE_FIREBASE_APP_ID: "__FIREBASE_APP_ID__",
  VITE_FIREBASE_MEASUREMENT_ID: "__FIREBASE_MEASUREMENT_ID__"
}; 