import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getEnvironmentConfig, isPlaceholder } from './environment';

describe('Environment Configuration', () => {
  // Save original window.ENV
  const originalWindowENV = window.ENV;
  
  // Mock console methods
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  
  afterEach(() => {
    // Restore window.ENV after each test
    window.ENV = originalWindowENV;
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
    it('should prioritize Vite environment variables when valid', () => {
      // Both window.ENV and import.meta.env are mocked in setup.ts with different values
      // Vite values should be preferred
      const config = getEnvironmentConfig();
      
      expect(config.firebase.apiKey).toBe('test-vite-api-key');
      expect(config.firebase.projectId).toBe('test-vite-project-id');
      expect(config.apiKeys.youtube).toBe('test-vite-youtube-key');
      expect(config.apiKeys.bumpups).toBe('test-vite-bumpups-key');
      expect(config.environment).toBe('test');
    });
    
    it('should fall back to window.ENV when Vite environment variables are invalid', () => {
      // Mock import.meta.env with invalid values
      vi.mock('import.meta.env', () => ({
        VITE_FIREBASE_API_KEY: 'YOUR_API_KEY',
        VITE_FIREBASE_PROJECT_ID: 'YOUR_PROJECT_ID',
        MODE: 'test',
      }));
      
      const config = getEnvironmentConfig();
      
      expect(config.firebase.apiKey).toBe('test-api-key');
      expect(config.firebase.projectId).toBe('test-project-id');
      expect(config.apiKeys.youtube).toBe('test-youtube-key');
    });
    
    it('should set feature flags correctly based on available API keys', () => {
      const config = getEnvironmentConfig();
      
      expect(config.features.enableAnalytics).toBe(true);
      expect(config.features.enableYouTubeIntegration).toBe(true);
      expect(config.features.enableBumpupsIntegration).toBe(true);
    });
    
    it('should disable features when API keys are missing', () => {
      // Mock window.ENV with missing API keys
      window.ENV = {
        ...originalWindowENV,
        VITE_YOUTUBE_API_KEY: undefined,
        VITE_BUMPUPS_API_KEY: undefined,
      } as any;
      
      // Mock import.meta.env with missing API keys
      vi.mock('import.meta.env', () => ({
        VITE_FIREBASE_API_KEY: 'test-vite-api-key',
        VITE_FIREBASE_AUTH_DOMAIN: 'test-vite-auth-domain',
        VITE_FIREBASE_PROJECT_ID: 'test-vite-project-id',
        VITE_FIREBASE_STORAGE_BUCKET: 'test-vite-storage-bucket',
        VITE_FIREBASE_MESSAGING_SENDER_ID: 'test-vite-sender-id',
        VITE_FIREBASE_APP_ID: 'test-vite-app-id',
        VITE_FIREBASE_MEASUREMENT_ID: 'test-vite-measurement-id',
        MODE: 'test',
      }));
      
      const config = getEnvironmentConfig();
      
      expect(config.features.enableYouTubeIntegration).toBe(false);
      expect(config.features.enableBumpupsIntegration).toBe(false);
    });
    
    it('should return fallback values when no valid configuration is found', () => {
      // Mock both window.ENV and import.meta.env with invalid values
      window.ENV = {
        VITE_FIREBASE_API_KEY: 'YOUR_API_KEY',
        VITE_FIREBASE_PROJECT_ID: 'YOUR_PROJECT_ID',
      } as any;
      
      vi.mock('import.meta.env', () => ({
        VITE_FIREBASE_API_KEY: 'YOUR_API_KEY',
        VITE_FIREBASE_PROJECT_ID: 'YOUR_PROJECT_ID',
        MODE: 'test',
      }));
      
      const config = getEnvironmentConfig();
      
      expect(config.firebase.apiKey).toBe('MISSING_API_KEY');
      expect(config.features.enableAnalytics).toBe(false);
      expect(config.features.enableYouTubeIntegration).toBe(false);
      expect(config.features.enableBumpupsIntegration).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });
}); 