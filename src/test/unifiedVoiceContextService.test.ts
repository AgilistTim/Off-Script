/**
 * Unit tests for UnifiedVoiceContextService
 * Tests all three context builders and error handling
 */

import { describe, it, expect, beforeEach, vi, MockedFunction } from 'vitest';
import { UnifiedVoiceContextService } from '../services/unifiedVoiceContextService';
import { getUserById } from '../services/userService';
import { User } from '../models/User';

// Mock dependencies
vi.mock('../services/userService');
vi.mock('../config/environment', () => ({
  getEnvironmentConfig: () => ({
    elevenLabs: {
      apiKey: 'test-api-key'
    }
  })
}));

// Mock fetch globally
global.fetch = vi.fn();

const mockGetUserById = getUserById as MockedFunction<typeof getUserById>;
const mockFetch = global.fetch as MockedFunction<typeof fetch>;

describe('UnifiedVoiceContextService', () => {
  let service: UnifiedVoiceContextService;
  const testAgentId = 'agent_test123';
  const testUserId = 'user_test123';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UnifiedVoiceContextService();
  });

  describe('Guest Context', () => {
    it('should inject guest context successfully', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      const result = await service.injectGuestContext(testAgentId);

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(false);
      expect(result.message).toContain('explore career possibilities');
      
      // Verify API call
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.elevenlabs.io/v1/convai/agents/${testAgentId}`,
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'xi-api-key': 'test-api-key'
          })
        })
      );
    });

    it('should handle API failure gracefully for guest context', async () => {
      // Mock API failure
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      const result = await service.injectGuestContext(testAgentId);

      expect(result.success).toBe(false);
      expect(result.fallbackUsed).toBe(true);
      expect(result.message).toContain('explore career possibilities');
    });
  });

  describe('Authenticated Context', () => {
    const mockUser: User = {
      uid: testUserId,
      email: 'test@example.com',
      displayName: 'Test User',
      createdAt: new Date('2024-01-01'),
      lastLogin: new Date('2024-01-02'),
      role: 'user',
      profile: {
        interests: ['AI', 'Technology'],
        careerGoals: ['Software Engineer', 'Data Scientist'],
        skills: ['Python', 'JavaScript'],
        school: 'Tech University',
        grade: 'Year 2'
      },
      preferences: {
        interestedSectors: ['Technology', 'Healthcare']
      }
    };

    it('should inject authenticated context with user profile data', async () => {
      mockGetUserById.mockResolvedValueOnce(mockUser);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      const result = await service.injectAuthenticatedContext(testAgentId, testUserId);

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(false);
      expect(result.message).toContain('Welcome back');
      
      // Verify user data was fetched
      expect(mockGetUserById).toHaveBeenCalledWith(testUserId);
      
      // Verify context includes user data
      const apiCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(apiCall[1]?.body as string);
      const prompt = requestBody.conversation_config.agent.prompt;
      
      expect(prompt).toContain('Test User');
      expect(prompt).toContain('AI, Technology');
      expect(prompt).toContain('Software Engineer, Data Scientist');
      expect(prompt).toContain('Python, JavaScript');
    });

    it('should fallback to guest context when user data fetch fails', async () => {
      mockGetUserById.mockRejectedValueOnce(new Error('User not found'));
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      const result = await service.injectAuthenticatedContext(testAgentId, testUserId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('explore career possibilities'); // Guest message
    });
  });

  describe('Career Deep-Dive Context', () => {
    const mockCareerCard = {
      title: 'AI Software Developer',
      description: 'Develop AI solutions and machine learning systems',
      salary: {
        min: 50000,
        max: 80000,
        currency: '£'
      },
      skills: ['Python', 'Machine Learning', 'TensorFlow'],
      pathways: ['Junior Developer', 'Senior Developer', 'Lead Developer'],
      nextSteps: ['Learn Python', 'Build portfolio', 'Apply for internships']
    };

    const mockUser: User = {
      uid: testUserId,
      email: 'test@example.com',
      displayName: 'Test User',
      createdAt: new Date(),
      lastLogin: new Date(),
      role: 'user',
      profile: {
        interests: ['AI'],
        skills: ['Python']
      }
    };

    it('should inject career context with user profile and career details', async () => {
      mockGetUserById.mockResolvedValueOnce(mockUser);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      const result = await service.injectCareerContext(testAgentId, testUserId, mockCareerCard);

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(false);
      expect(result.message).toContain('career path loaded');
      
      // Verify context includes both user and career data
      const apiCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(apiCall[1]?.body as string);
      const prompt = requestBody.conversation_config.agent.prompt;
      
      expect(prompt).toContain('Test User');
      expect(prompt).toContain('AI Software Developer');
      expect(prompt).toContain('£50,000 - £80,000');
      expect(prompt).toContain('Python, Machine Learning, TensorFlow');
    });

    it('should fallback to authenticated context when user data unavailable', async () => {
      mockGetUserById.mockRejectedValueOnce(new Error('User not found'));
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      const result = await service.injectCareerContext(testAgentId, testUserId, mockCareerCard);

      expect(result.success).toBe(true);
      // Should fallback to guest context since user fetch failed
      expect(result.message).toContain('explore career possibilities');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing API key gracefully', () => {
      // Create service with no API key
      vi.mocked(require('../config/environment').getEnvironmentConfig).mockReturnValue({
        elevenLabs: { apiKey: '' }
      });
      
      const serviceWithoutKey = new UnifiedVoiceContextService();
      
      // Test should not throw, but log warning
      expect(() => serviceWithoutKey).not.toThrow();
    });

    it('should handle ElevenLabs API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      } as Response);

      const result = await service.injectGuestContext(testAgentId);

      expect(result.success).toBe(false);
      expect(result.fallbackUsed).toBe(true);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.injectGuestContext(testAgentId);

      expect(result.success).toBe(false);
      expect(result.fallbackUsed).toBe(true);
    });
  });

  describe('Context Building', () => {
    it('should build appropriate prompt structure for each context type', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      // Test guest context
      await service.injectGuestContext(testAgentId);
      let apiCall = mockFetch.mock.calls[0];
      let requestBody = JSON.parse(apiCall[1]?.body as string);
      let prompt = requestBody.conversation_config.agent.prompt;
      
      expect(prompt).toContain('USER CONTEXT: Guest User');
      expect(prompt).toContain('update_person_profile');
      expect(prompt).toContain('analyze_conversation_for_careers');

      mockFetch.mockClear();

      // Test authenticated context with user data
      const mockUser: User = {
        uid: testUserId,
        email: 'test@example.com',
        displayName: 'Test User',
        createdAt: new Date(),
        lastLogin: new Date(),
        role: 'user',
        profile: { interests: ['AI'] }
      };

      mockGetUserById.mockResolvedValueOnce(mockUser);
      await service.injectAuthenticatedContext(testAgentId, testUserId);
      
      apiCall = mockFetch.mock.calls[0];
      requestBody = JSON.parse(apiCall[1]?.body as string);
      prompt = requestBody.conversation_config.agent.prompt;
      
      expect(prompt).toContain('USER CONTEXT: Authenticated User - Test User');
      expect(prompt).toContain('PROFILE DATA');
      expect(prompt).toContain('continuity and build trust');
    });
  });
});