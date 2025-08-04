import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Removed window.ENV mock - using import.meta.env instead for Vite compatibility

// Mock import.meta.env for testing
vi.stubGlobal('import.meta', {
  env: {
    VITE_FIREBASE_API_KEY: 'test-vite-api-key',
    VITE_FIREBASE_AUTH_DOMAIN: 'test-vite-auth-domain',
    VITE_FIREBASE_PROJECT_ID: 'test-vite-project-id',
    VITE_FIREBASE_STORAGE_BUCKET: 'test-vite-storage-bucket',
    VITE_FIREBASE_MESSAGING_SENDER_ID: 'test-vite-sender-id',
    VITE_FIREBASE_APP_ID: 'test-vite-app-id',
    VITE_FIREBASE_MEASUREMENT_ID: 'test-vite-measurement-id',
    VITE_YOUTUBE_API_KEY: 'test-vite-youtube-key',
    VITE_RECAPTCHA_SITE_KEY: 'test-vite-recaptcha-key',
    VITE_BUMPUPS_API_KEY: 'test-vite-bumpups-key',
    MODE: 'test',
  }
}); 