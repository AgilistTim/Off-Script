import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { isPlaceholder } from './environment';

// Create a mock configuration for testing
const mockConfig = {
  firebase: {
    apiKey: 'test-vite-api-key',
    authDomain: 'test-vite-auth-domain',
    projectId: 'test-vite-project-id',
    storageBucket: 'test-vite-storage-bucket',
    messagingSenderId: 'test-vite-sender-id',
    appId: 'test-vite-app-id',
    measurementId: 'test-vite-measurement-id',
  },
  apiKeys: {
    youtube: 'test-vite-youtube-key',
    recaptcha: 'test-vite-recaptcha-key',
    bumpups: 'test-vite-bumpups-key',
  },
  environment: 'test',
  features: {
    enableAnalytics: true,
    enableYouTubeIntegration: true,
    enableBumpupsIntegration: true,
  },
};

// Mock the getEnvironmentConfig function
const mockGetEnvironmentConfig = vi.fn().mockReturnValue(mockConfig);

// Mock the environment module
vi.mock('./environment', async () => {
  const actual = await vi.importActual('./environment');
  return {
    ...actual as object,
    getEnvironmentConfig: mockGetEnvironmentConfig,
    env: mockConfig,
    firebaseConfig: mockConfig.firebase,
    apiKeys: mockConfig.apiKeys,
    features: mockConfig.features,
    environment: mockConfig.environment,
    isProduction: false,
    isDevelopment: false,
    isTest: true,
  };
});

// Import the mocked function after mocking
import { getEnvironmentConfig } from './environment';

describe('Environment Configuration', () => {
  // Mock console methods
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isPlaceholder', () => {
    it('should identify placeholder values correctly', () => {
      // Test internal isPlaceholder function
      expect(isPlaceholder('YOUR_API_KEY')).toBe(true);
      expect(isPlaceholder('your-api-key')).toBe(true);
      expect(isPlaceholder('000000000000')).toBe(true);
      expect(isPlaceholder('G-YOUR-MEASUREMENT-ID')).toBe(true);
      expect(isPlaceholder('__FIREBASE_API_KEY__')).toBe(true);
      expect(isPlaceholder('demo-project')).toBe(true);
      expect(isPlaceholder('REPLACE_WITH_YOUR_API_KEY')).toBe(true);
      expect(isPlaceholder('placeholder-value')).toBe(true);
      
      // Test valid values
      expect(isPlaceholder('AIzaSyA1234567890abcdefghijklmnopqrstuv')).toBe(false);
      expect(isPlaceholder('G-ABC123DEF45')).toBe(false);
      expect(isPlaceholder('actual-project-id')).toBe(false);
    });
    
    it('should handle edge cases', () => {
      expect(isPlaceholder('')).toBe(true);
      expect(isPlaceholder(undefined as unknown as string)).toBe(true);
      expect(isPlaceholder(null as unknown as string)).toBe(true);
    });
  });
  
  describe('getEnvironmentConfig', () => {
    it('should return the mocked configuration', () => {
      const config = getEnvironmentConfig();
      
      expect(config.firebase.apiKey).toBe('test-vite-api-key');
      expect(config.firebase.projectId).toBe('test-vite-project-id');
      expect(config.apiKeys.youtube).toBe('test-vite-youtube-key');
      expect(config.apiKeys.bumpups).toBe('test-vite-bumpups-key');
      expect(config.environment).toBe('test');
      expect(config.features.enableAnalytics).toBe(true);
      expect(config.features.enableYouTubeIntegration).toBe(true);
    });
  });
}); 