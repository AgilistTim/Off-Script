import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { isPlaceholder } from './environment';

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
}); 