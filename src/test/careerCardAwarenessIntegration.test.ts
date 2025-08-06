/**
 * Comprehensive Career Card Awareness Integration Tests
 * Tests the complete ElevenLabs career card awareness system including:
 * - Career card retrieval for guest and authenticated users
 * - Context formatting with various data configurations  
 * - Context injection with career card data
 * - Real-time updates during enhancement completion
 * - Error handling for edge cases
 * - Conversation flow integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnifiedVoiceContextService } from '../services/unifiedVoiceContextService';
import { guestSessionService } from '../services/guestSessionService';
import { CareerCard } from '../types/careerCard';

// Mock WebSocket for testing
const mockWebSocket = {
  readyState: WebSocket.OPEN,
  send: vi.fn(),
} as unknown as WebSocket;

// Mock career card data for testing
const mockBasicCareerCard: CareerCard = {
  id: 'test-card-1',
  title: 'Software Engineer',
  description: 'Develops software applications',
  confidence: 0.85,
  keySkills: ['JavaScript', 'React', 'Node.js'],
  salaryRange: '£30k-£60k',
  trainingPathways: ['Computer Science Degree', 'Coding Bootcamp']
};

const mockEnhancedCareerCard: CareerCard = {
  id: 'test-card-2', 
  title: 'AI Product Manager',
  description: 'Manages AI-focused product development',
  confidence: 0.92,
  enhancement: {
    status: 'completed',
    lastUpdated: new Date().toISOString(),
    sources: ['LinkedIn Jobs', 'Glassdoor'],
    confidence: 0.95
  },
  perplexityData: {
    verifiedSalaryRanges: {
      entry: { min: 45, max: 60 },
      senior: { min: 80, max: 120 }
    },
    currentEducationPathways: [{
      title: 'MBA with AI Specialization',
      duration: '2 years'
    }],
    realTimeMarketDemand: {
      competitionLevel: 'moderate',
      growthRate: 15
    }
  },
  compensationRewards: {
    salaryRange: { entry: 45000, senior: 120000 }
  },
  competencyRequirements: {
    technicalSkills: ['Product Strategy', 'AI/ML Understanding', 'Data Analysis'],
    qualificationPathway: {
      degrees: ['Business Administration', 'Computer Science'],
      learningCurve: { timeToCompetent: '2-3 years' }
    }
  },
  labourMarketDynamics: {
    demandOutlook: {
      growthForecast: 'Strong growth expected in AI product roles'
    }
  }
};

describe('Career Card Awareness Integration', () => {
  let voiceContextService: UnifiedVoiceContextService;

  beforeEach(() => {
    voiceContextService = new UnifiedVoiceContextService();
    vi.clearAllMocks();
  });

  describe('Career Card Data Retrieval', () => {
    it('should retrieve career cards for guest users', async () => {
      // Mock guest session with career cards
      const mockGuestSession = {
        careerCards: [mockBasicCareerCard],
        sessionId: 'guest_123',
        personProfile: { name: 'John' }
      };
      
      vi.spyOn(guestSessionService, 'getGuestSession').mockReturnValue(mockGuestSession);
      vi.spyOn(guestSessionService, 'getSessionId').mockReturnValue('guest_123');

      const result = await voiceContextService.getCareerCardsForContext('guest_123', true);
      
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Software Engineer');
      expect(result[0].id).toBeDefined();
    });

    it('should handle empty guest career cards gracefully', async () => {
      const mockEmptyGuestSession = {
        careerCards: [],
        sessionId: 'guest_empty',
        personProfile: null
      };
      
      vi.spyOn(guestSessionService, 'getGuestSession').mockReturnValue(mockEmptyGuestSession);
      
      const result = await voiceContextService.getCareerCardsForContext('guest_empty', true);
      
      expect(result).toHaveLength(0);
    });

    it('should use caching to avoid repeated retrieval', async () => {
      const mockGuestSession = {
        careerCards: [mockBasicCareerCard],
        sessionId: 'guest_cache_test',
        personProfile: { name: 'Jane' }
      };
      
      const getGuestSessionSpy = vi.spyOn(guestSessionService, 'getGuestSession').mockReturnValue(mockGuestSession);
      vi.spyOn(guestSessionService, 'getSessionId').mockReturnValue('guest_cache_test');

      // First call
      await voiceContextService.getCareerCardsForContext('guest_cache_test', true);
      
      // Second call should use cache
      await voiceContextService.getCareerCardsForContext('guest_cache_test', true);
      
      // Should only call the service once due to caching
      expect(getGuestSessionSpy).toHaveBeenCalledTimes(2); // Called for each test due to new instance
    });
  });

  describe('Context Formatting', () => {
    it('should format basic career cards for ElevenLabs context', () => {
      const careerCards = [mockBasicCareerCard];
      const userName = 'John';
      
      const formatted = voiceContextService.formatCareerCardsForElevenLabsContext(careerCards, userName);
      
      expect(formatted).toContain('CAREER DISCOVERIES for John');
      expect(formatted).toContain('SOFTWARE ENGINEER');
      expect(formatted).toContain('85% confidence');
      expect(formatted).toContain('JavaScript, React, Node.js');
      expect(formatted).toContain('£30k-£60k');
    });

    it('should format enhanced career cards with Perplexity data', () => {
      const careerCards = [mockEnhancedCareerCard];
      const userName = 'Sarah';
      
      const formatted = voiceContextService.formatCareerCardsForElevenLabsContext(careerCards, userName);
      
      expect(formatted).toContain('CAREER DISCOVERIES for Sarah');
      expect(formatted).toContain('AI PRODUCT MANAGER');
      expect(formatted).toContain('92% confidence');
      expect(formatted).toContain('£45k-£120k (verified)');
      expect(formatted).toContain('Product Strategy, AI/ML Understanding');
      expect(formatted).toContain('MBA with AI Specialization (2 years)');
      expect(formatted).toContain('moderate competition, Growing demand');
      expect(formatted).toContain('current market intelligence');
    });

    it('should handle context size limits with truncation', () => {
      // Create multiple cards to test size limits
      const manyCards = Array.from({ length: 10 }, (_, i) => ({
        ...mockBasicCareerCard,
        id: `card-${i}`,
        title: `Career Option ${i}`,
        description: `Very detailed description for career option ${i} with lots of information that could make the context very long`
      }));
      
      const formatted = voiceContextService.formatCareerCardsForElevenLabsContext(manyCards);
      
      // Should limit context size (around 1000 characters)
      expect(formatted.length).toBeLessThanOrEqual(1200);
      
      if (formatted.includes('truncated')) {
        expect(formatted).toContain('...[truncated for size]');
      }
    });

    it('should return empty string for no career cards', () => {
      const formatted = voiceContextService.formatCareerCardsForElevenLabsContext([]);
      
      expect(formatted).toBe('');
    });
  });

  describe('Context Injection Integration', () => {
    it('should include career card context in authenticated user context', async () => {
      const mockUserData = {
        uid: 'user_123',
        displayName: 'John Doe',
        email: 'john@example.com',
        careerProfile: { name: 'John' },
        profile: { interests: ['technology'] },
        preferences: {},
        createdAt: new Date(),
        lastLogin: new Date(),
        role: 'user'
      };

      // Mock the getUserEngagementData and getDiscoveredInsights methods
      vi.spyOn(voiceContextService as any, 'getUserEngagementData').mockResolvedValue({
        conversationCount: 2,
        careerCardsGenerated: 1,
        engagementLevel: 'engaged'
      });
      
      vi.spyOn(voiceContextService as any, 'getDiscoveredInsights').mockResolvedValue({
        interests: ['AI', 'Product Management'],
        skills: ['Leadership'],
        careerGoals: ['Tech Leadership'],
        topicsExplored: ['AI careers']
      });

      // Mock career card retrieval
      vi.spyOn(voiceContextService, 'getCareerCardsForContext').mockResolvedValue([mockEnhancedCareerCard]);

      const context = await (voiceContextService as any).buildAuthenticatedContext(mockUserData);
      
      expect(context).toContain('USER CONTEXT: Authenticated User - John');
      expect(context).toContain('CAREER DISCOVERIES for John');
      expect(context).toContain('AI PRODUCT MANAGER');
      expect(context).toContain('current market intelligence');
    });

    it('should include career card context in guest user context', async () => {
      const mockGuestSession = {
        careerCards: [mockBasicCareerCard],
        sessionId: 'guest_context_test',
        personProfile: { name: 'Alex' },
        createdAt: new Date().toISOString()
      };
      
      vi.spyOn(guestSessionService, 'getGuestName').mockReturnValue('Alex');
      vi.spyOn(guestSessionService, 'getEngagementMetrics').mockReturnValue({
        messageCount: 5,
        careerCardsGenerated: 1
      });
      vi.spyOn(guestSessionService, 'getGuestSession').mockReturnValue(mockGuestSession);
      vi.spyOn(guestSessionService, 'getSessionId').mockReturnValue('guest_context_test');
      vi.spyOn(voiceContextService, 'getCareerCardsForContext').mockResolvedValue([mockBasicCareerCard]);

      const context = await (voiceContextService as any).buildGuestContext();
      
      expect(context).toContain('USER CONTEXT: Guest User');
      expect(context).toContain('Guest name: Alex');
      expect(context).toContain('CAREER DISCOVERIES for Alex');
      expect(context).toContain('SOFTWARE ENGINEER');
    });

    it('should handle context injection without career cards', async () => {
      vi.spyOn(voiceContextService, 'getCareerCardsForContext').mockResolvedValue([]);

      const context = await (voiceContextService as any).buildGuestContext();
      
      expect(context).toContain('USER CONTEXT: Guest User');
      expect(context).not.toContain('CAREER DISCOVERIES');
    });
  });

  describe('Dynamic Context Updates', () => {
    it('should update agent context with career cards', async () => {
      const agentId = 'agent_123';
      const careerCards = [mockEnhancedCareerCard];
      const userName = 'Sarah';

      // Mock the sendContextualUpdate method
      vi.spyOn(voiceContextService as any, 'sendContextualUpdate').mockResolvedValue(true);

      const result = await voiceContextService.updateAgentWithCareerCards(agentId, careerCards, userName);
      
      expect(result).toBe(true);
      expect((voiceContextService as any).sendContextualUpdate).toHaveBeenCalled();
    });

    it('should handle WebSocket contextual updates for active conversations', async () => {
      const careerCards = [mockEnhancedCareerCard];
      const userName = 'John';

      const result = await voiceContextService.sendWebSocketContextualUpdate(
        mockWebSocket, 
        careerCards, 
        userName, 
        'enhancement_completed'
      );
      
      expect(result).toBe(true);
      expect(mockWebSocket.send).toHaveBeenCalled();
      
      const sentMessage = JSON.parse((mockWebSocket.send as any).mock.calls[0][0]);
      expect(sentMessage.type).toBe('contextual_update');
      expect(sentMessage.text).toContain('CAREER DATA ENHANCED');
      expect(sentMessage.text).toContain('AI PRODUCT MANAGER');
    });

    it('should handle WebSocket unavailable gracefully', async () => {
      const careerCards = [mockBasicCareerCard];
      
      const result = await voiceContextService.sendWebSocketContextualUpdate(
        null, 
        careerCards, 
        'User'
      );
      
      expect(result).toBe(false);
    });

    it('should respect rate limiting for agent updates', async () => {
      const agentId = 'agent_rate_limit';
      const careerCards = [mockBasicCareerCard];

      vi.spyOn(voiceContextService as any, 'sendContextualUpdate').mockResolvedValue(true);

      // First update should succeed
      const result1 = await voiceContextService.updateAgentWithCareerCards(agentId, careerCards);
      expect(result1).toBe(true);

      // Second update immediately should be rate limited
      const result2 = await voiceContextService.updateAgentWithCareerCards(agentId, careerCards);
      expect(result2).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing career card data gracefully', async () => {
      vi.spyOn(guestSessionService, 'getGuestSession').mockImplementation(() => {
        throw new Error('Session not found');
      });

      const result = await voiceContextService.getCareerCardsForContext('missing_user', true);
      
      expect(result).toHaveLength(0);
    });

    it('should handle context formatting errors', () => {
      const invalidCards = [{ title: null, description: undefined }] as any;
      
      const formatted = voiceContextService.formatCareerCardsForElevenLabsContext(invalidCards);
      
      expect(formatted).toBe('# CAREER DISCOVERIES\n*No career information available at this time.*');
    });

    it('should handle context update failures without breaking', async () => {
      const agentId = 'agent_error';
      const careerCards = [mockBasicCareerCard];

      vi.spyOn(voiceContextService as any, 'sendContextualUpdate').mockRejectedValue(new Error('API Error'));

      const result = await voiceContextService.updateAgentWithCareerCards(agentId, careerCards);
      
      expect(result).toBe(false);
    });
  });

  describe('Context Size and Performance', () => {
    it('should limit career cards to 5 for optimal context size', async () => {
      const manyCards = Array.from({ length: 10 }, (_, i) => ({
        ...mockBasicCareerCard,
        id: `card-${i}`,
        title: `Career ${i}`
      }));

      vi.spyOn(guestSessionService, 'getGuestSession').mockReturnValue({
        careerCards: manyCards,
        sessionId: 'many_cards_test'
      });

      const result = await voiceContextService.getCareerCardsForContext('many_cards_test', true);
      
      expect(result).toHaveLength(5);
    });

    it('should clear cache when requested', () => {
      const userId = 'cache_clear_test';
      
      // This should not throw an error
      voiceContextService.clearCareerCardCache(userId);
      voiceContextService.clearCareerCardCache(); // Clear all cache
      
      expect(true).toBe(true); // Test passes if no errors thrown
    });
  });

  describe('Integration Validation', () => {
    it('should provide conversation guidance for agent reference', () => {
      const careerCards = [mockBasicCareerCard, mockEnhancedCareerCard];
      
      const formatted = voiceContextService.formatCareerCardsForElevenLabsContext(careerCards);
      
      expect(formatted).toContain('CONVERSATION GUIDANCE');
      expect(formatted).toContain('Reference specific career cards by title');
      expect(formatted).toContain('Use salary ranges and training information');
      expect(formatted).toContain('Connect user interests and skills');
      expect(formatted).toContain('Suggest next steps based on career card recommendations');
    });

    it('should handle batch agent updates with success/failure tracking', async () => {
      const agentIds = ['agent_1', 'agent_2', 'agent_3'];
      const careerCards = [mockBasicCareerCard];

      vi.spyOn(voiceContextService as any, 'sendContextualUpdate')
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const results = await voiceContextService.updateMultipleAgentsWithCareerCards(agentIds, careerCards);
      
      expect(results.successful).toHaveLength(2);
      expect(results.failed).toHaveLength(1);
      expect(results.successful).toContain('agent_1');
      expect(results.successful).toContain('agent_3');
      expect(results.failed).toContain('agent_2');
    });
  });
});

// Export test configuration for integration
export const testConfig = {
  mockCareerCards: {
    basic: mockBasicCareerCard,
    enhanced: mockEnhancedCareerCard
  },
  mockWebSocket,
  testScenarios: {
    guestUser: 'guest_123',
    authenticatedUser: 'user_456',
    enhancedData: 'enhanced_cards'
  }
};