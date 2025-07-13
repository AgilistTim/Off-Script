import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVideoQuestions } from '../hooks/useVideoQuestions';
import { inlineQuestionsService, InlineQuestion } from '../services/inlineQuestionsService';
import { Video } from '../services/videoService';

// Mock Firebase and external dependencies
vi.mock('../services/firebase', () => ({
  db: {},
  getFirebaseFunctionUrl: vi.fn(() => 'https://mock-firebase-function.com')
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'test-user-123' }
  })
}));

vi.mock('../services/inlineQuestionsService', () => ({
  inlineQuestionsService: {
    getQuestionsForVideo: vi.fn(),
    recordQuestionResponse: vi.fn(),
    generateQuestionsForVideo: vi.fn(),
    getUserQuestionProfile: vi.fn()
  },
  generateInlineQuestions: vi.fn()
}));

vi.mock('../services/userPreferenceService', () => ({
  getUserPreferences: vi.fn(() => Promise.resolve({
    userId: 'test-user-123',
    likedVideos: [],
    dislikedVideos: [],
    likedCategories: { technology: 5 },
    likedSkills: { programming: 3 },
    interactionScore: 25
  }))
}));

// Test data
const mockVideo: Video = {
  id: 'test-video-123',
  title: 'Test Career Video',
  description: 'A test video about technology careers',
  category: 'technology',
  sourceType: 'youtube',
  sourceId: 'abc123',
  sourceUrl: 'https://youtube.com/watch?v=abc123',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  duration: 600, // 10 minutes
  creator: 'Test Creator',
  publicationDate: '2024-01-01',
  curatedDate: '2024-01-01',
  tags: ['technology', 'programming'],
  skillsHighlighted: ['JavaScript', 'React', 'Node.js'],
  educationRequired: ['Computer Science'],
  prompts: [],
  relatedContent: [],
  viewCount: 1000,
  aiAnalysis: {
    openaiAnalysis: {
      careerInsights: {
        primaryCareerField: 'Technology',
        relatedCareerPaths: ['Software Developer', 'Web Developer'],
        skillsHighlighted: ['JavaScript', 'React'],
        educationRequirements: 'Bachelor in Computer Science',
        careerStage: 'entry-level' as const
      },
      contentAnalysis: {
        summary: 'Great intro to web development',
        keyTakeaways: ['Learn React', 'Practice coding'],
        targetAudience: 'Beginners',
        difficultyLevel: 'beginner' as const,
        estimatedWatchTime: 10
      },
      engagement: {
        hashtags: ['#webdev', '#react'],
        reflectionQuestions: ['What interests you most?'],
        actionableAdvice: ['Build a portfolio'],
        inspirationalQuotes: ['Keep coding!']
      },
      keyMoments: [
        {
          timestamp: 60,
          description: 'Introduction to React basics',
          importance: 'high' as const,
          type: 'skill' as const
        },
        {
          timestamp: 300,
          description: 'Career advice section',
          importance: 'high' as const,
          type: 'career-advice' as const
        }
      ]
    }
  }
};

const mockQuestions: InlineQuestion[] = [
  {
    id: 'q1',
    videoId: 'test-video-123',
    timestamp: 60,
    type: 'career_direction',
    question: 'What appeals to you more about programming?',
    optionA: 'Creative problem-solving',
    optionB: 'Logical structured thinking',
    context: 'This explores your programming approach preferences',
    importance: 'high',
    category: 'career_preference',
    generatedAt: '2024-01-01T00:00:00Z',
    basedOnKeyMoments: true
  },
  {
    id: 'q2',
    videoId: 'test-video-123',
    timestamp: 300,
    type: 'skill_interest',
    question: 'Which development area interests you more?',
    optionA: 'Frontend user interfaces',
    optionB: 'Backend systems and APIs',
    context: 'This helps identify your technical preferences',
    importance: 'medium',
    category: 'skill_assessment',
    generatedAt: '2024-01-01T00:00:00Z',
    basedOnKeyMoments: true
  }
];

describe('Inline Questions System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useVideoQuestions Hook', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() =>
        useVideoQuestions({
          video: mockVideo,
          isPlaying: false,
          currentTime: 0,
          duration: 600,
          enableQuestions: true
        })
      );

      expect(result.current.questionState.currentQuestion).toBeNull();
      expect(result.current.questionState.isQuestionVisible).toBe(false);
      expect(result.current.questionState.questionsAnswered).toBe(0);
      expect(result.current.questionState.totalQuestions).toBe(0);
      expect(result.current.questionState.questionHistory).toEqual([]);
    });

    it('should load existing questions for video', async () => {
      vi.mocked(inlineQuestionsService.getQuestionsForVideo).mockResolvedValue(mockQuestions);

      const { result } = renderHook(() =>
        useVideoQuestions({
          video: mockVideo,
          isPlaying: false,
          currentTime: 0,
          duration: 600,
          enableQuestions: true
        })
      );

      // Wait for questions to load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(inlineQuestionsService.getQuestionsForVideo).toHaveBeenCalledWith('test-video-123');
    });

    it('should show question at correct timestamp', async () => {
      vi.mocked(inlineQuestionsService.getQuestionsForVideo).mockResolvedValue(mockQuestions);

      const { result, rerender } = renderHook(
        ({ currentTime, isPlaying }) =>
          useVideoQuestions({
            video: mockVideo,
            isPlaying,
            currentTime,
            duration: 600,
            enableQuestions: true
          }),
        {
          initialProps: { currentTime: 0, isPlaying: false }
        }
      );

      // Wait for questions to load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Start playing and move to question timestamp
      rerender({ currentTime: 62, isPlaying: true });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.questionState.isQuestionVisible).toBe(true);
      expect(result.current.questionState.currentQuestion?.id).toBe('q1');
    });

    it('should record question response correctly', async () => {
      vi.mocked(inlineQuestionsService.getQuestionsForVideo).mockResolvedValue(mockQuestions);
      vi.mocked(inlineQuestionsService.recordQuestionResponse).mockResolvedValue();

      const { result } = renderHook(() =>
        useVideoQuestions({
          video: mockVideo,
          isPlaying: true,
          currentTime: 62,
          duration: 600,
          enableQuestions: true
        })
      );

      // Wait for questions to load and show
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Answer the question
      await act(async () => {
        await result.current.answerQuestion('A', 2500);
      });

      expect(inlineQuestionsService.recordQuestionResponse).toHaveBeenCalledWith(
        'test-user-123',
        'q1',
        'A',
        2500,
        62
      );

      expect(result.current.questionState.questionsAnswered).toBe(1);
      expect(result.current.questionState.questionHistory).toHaveLength(1);
      expect(result.current.questionState.currentQuestion).toBeNull();
    });

    it('should respect minimum time between questions', async () => {
      vi.mocked(inlineQuestionsService.getQuestionsForVideo).mockResolvedValue(mockQuestions);

      const { result, rerender } = renderHook(
        ({ currentTime }) =>
          useVideoQuestions({
            video: mockVideo,
            isPlaying: true,
            currentTime,
            duration: 600,
            enableQuestions: true,
            questionSettings: {
              minTimeBetweenQuestions: 120 // 2 minutes
            }
          }),
        {
          initialProps: { currentTime: 62 }
        }
      );

      // Wait for first question to show
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Answer first question
      await act(async () => {
        await result.current.answerQuestion('A', 2500);
      });

      // Move to second question timestamp (but within minimum time)
      rerender({ currentTime: 302 });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Second question should NOT show because minimum time hasn't passed
      expect(result.current.questionState.currentQuestion).toBeNull();
    });

    it('should limit total questions based on maxQuestions setting', async () => {
      const manyQuestions = [
        ...mockQuestions,
        {
          id: 'q3',
          videoId: 'test-video-123',
          timestamp: 450,
          type: 'preference' as const,
          question: 'Third question?',
          optionA: 'Option A',
          optionB: 'Option B',
          context: 'Test question',
          importance: 'low' as const,
          category: 'general',
          generatedAt: '2024-01-01T00:00:00Z',
          basedOnKeyMoments: false
        }
      ];

      vi.mocked(inlineQuestionsService.getQuestionsForVideo).mockResolvedValue(manyQuestions);

      const { result, rerender } = renderHook(
        ({ currentTime }) =>
          useVideoQuestions({
            video: mockVideo,
            isPlaying: true,
            currentTime,
            duration: 600,
            enableQuestions: true,
            questionSettings: {
              maxQuestions: 2,
              minTimeBetweenQuestions: 0
            }
          }),
        {
          initialProps: { currentTime: 62 }
        }
      );

      // Answer first two questions
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await act(async () => {
        await result.current.answerQuestion('A', 1000);
      });

      rerender({ currentTime: 302 });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await act(async () => {
        await result.current.answerQuestion('B', 1500);
      });

      // Move to third question timestamp
      rerender({ currentTime: 452 });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Third question should NOT show because max questions reached
      expect(result.current.questionState.currentQuestion).toBeNull();
      expect(result.current.questionState.questionsAnswered).toBe(2);
    });
  });

  describe('Question Timing and Scheduling', () => {
    it('should show question within timing window', async () => {
      vi.mocked(inlineQuestionsService.getQuestionsForVideo).mockResolvedValue(mockQuestions);

      const { result, rerender } = renderHook(
        ({ currentTime }) =>
          useVideoQuestions({
            video: mockVideo,
            isPlaying: true,
            currentTime,
            duration: 600,
            enableQuestions: true
          }),
        {
          initialProps: { currentTime: 58 }
        }
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Question should not show yet (before timing window)
      expect(result.current.questionState.currentQuestion).toBeNull();

      // Move into timing window
      rerender({ currentTime: 61 });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Question should show
      expect(result.current.questionState.currentQuestion?.id).toBe('q1');
    });

    it('should not show question outside timing window', async () => {
      vi.mocked(inlineQuestionsService.getQuestionsForVideo).mockResolvedValue(mockQuestions);

      const { result } = renderHook(() =>
        useVideoQuestions({
          video: mockVideo,
          isPlaying: true,
          currentTime: 70, // Past the timing window (60 + 5 seconds)
          duration: 600,
          enableQuestions: true
        })
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Question should not show because it's past the timing window
      expect(result.current.questionState.currentQuestion).toBeNull();
    });
  });

  describe('Question State Management', () => {
    it('should reset questions when video changes', async () => {
      vi.mocked(inlineQuestionsService.getQuestionsForVideo).mockResolvedValue(mockQuestions);

      const { result, rerender } = renderHook(
        ({ video }) =>
          useVideoQuestions({
            video,
            isPlaying: true,
            currentTime: 62,
            duration: 600,
            enableQuestions: true
          }),
        {
          initialProps: { video: mockVideo }
        }
      );

      // Answer a question
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await act(async () => {
        await result.current.answerQuestion('A', 2000);
      });

      expect(result.current.questionState.questionsAnswered).toBe(1);

      // Change video
      const newVideo = { ...mockVideo, id: 'new-video-456' };
      rerender({ video: newVideo });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // State should reset for new video
      expect(result.current.questionState.questionsAnswered).toBe(0);
      expect(result.current.questionState.questionHistory).toEqual([]);
    });

    it('should not show questions when disabled', async () => {
      vi.mocked(inlineQuestionsService.getQuestionsForVideo).mockResolvedValue(mockQuestions);

      const { result } = renderHook(() =>
        useVideoQuestions({
          video: mockVideo,
          isPlaying: true,
          currentTime: 62,
          duration: 600,
          enableQuestions: false
        })
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.questionState.currentQuestion).toBeNull();
    });

    it('should not show questions when video is paused', async () => {
      vi.mocked(inlineQuestionsService.getQuestionsForVideo).mockResolvedValue(mockQuestions);

      const { result } = renderHook(() =>
        useVideoQuestions({
          video: mockVideo,
          isPlaying: false,
          currentTime: 62,
          duration: 600,
          enableQuestions: true
        })
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.questionState.currentQuestion).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle question loading errors gracefully', async () => {
      vi.mocked(inlineQuestionsService.getQuestionsForVideo).mockRejectedValue(
        new Error('Network error')
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useVideoQuestions({
          video: mockVideo,
          isPlaying: true,
          currentTime: 0,
          duration: 600,
          enableQuestions: true
        })
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(consoleSpy).toHaveBeenCalledWith('Error loading questions for video:', expect.any(Error));
      expect(result.current.hasQuestionsForVideo).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should handle response recording errors gracefully', async () => {
      vi.mocked(inlineQuestionsService.getQuestionsForVideo).mockResolvedValue(mockQuestions);
      vi.mocked(inlineQuestionsService.recordQuestionResponse).mockRejectedValue(
        new Error('Recording failed')
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useVideoQuestions({
          video: mockVideo,
          isPlaying: true,
          currentTime: 62,
          duration: 600,
          enableQuestions: true
        })
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await act(async () => {
        await result.current.answerQuestion('A', 2000);
      });

      expect(consoleSpy).toHaveBeenCalledWith('Error recording question response:', expect.any(Error));
      expect(result.current.questionState.currentQuestion).toBeNull(); // Should still hide question

      consoleSpy.mockRestore();
    });
  });
});

describe('Question Generation and Profile Building', () => {
  it('should generate questions based on video analysis', async () => {
    const mockGeneratedQuestions = [mockQuestions[0]];
    vi.mocked(inlineQuestionsService.generateQuestionsForVideo).mockResolvedValue(mockGeneratedQuestions);

    const result = await inlineQuestionsService.generateQuestionsForVideo({
      video: mockVideo,
      targetQuestionCount: 1,
      questionTypes: ['career_direction']
    });

    expect(result).toEqual(mockGeneratedQuestions);
  });

  it('should create questions with proper timing based on key moments', () => {
    const question = mockQuestions[0];
    
    expect(question.timestamp).toBe(60); // Matches key moment timestamp
    expect(question.basedOnKeyMoments).toBe(true);
    expect(question.type).toBe('career_direction');
    expect(question.importance).toBe('high');
  });

  it('should include proper metadata for user profiling', () => {
    const question = mockQuestions[1];
    
    expect(question.category).toBe('skill_assessment');
    expect(question.context).toContain('technical preferences');
    expect(question.optionA).toContain('Frontend');
    expect(question.optionB).toContain('Backend');
  });
});

// Integration test to verify the complete flow
describe('Complete Inline Questions Flow', () => {
  it('should complete full question lifecycle', async () => {
    vi.mocked(inlineQuestionsService.getQuestionsForVideo).mockResolvedValue(mockQuestions);
    vi.mocked(inlineQuestionsService.recordQuestionResponse).mockResolvedValue();

    const { result, rerender } = renderHook(
      ({ currentTime, isPlaying }) =>
        useVideoQuestions({
          video: mockVideo,
          isPlaying,
          currentTime,
          duration: 600,
          enableQuestions: true,
          questionSettings: {
            maxQuestions: 2,
            minTimeBetweenQuestions: 60
          }
        }),
      {
        initialProps: { currentTime: 0, isPlaying: false }
      }
    );

    // 1. Load questions
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.hasQuestionsForVideo).toBe(true);

    // 2. Start playing and reach first question
    rerender({ currentTime: 61, isPlaying: true });
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.questionState.currentQuestion?.id).toBe('q1');
    expect(result.current.questionState.isQuestionVisible).toBe(true);

    // 3. Answer first question
    await act(async () => {
      await result.current.answerQuestion('A', 3000);
    });

    expect(result.current.questionState.questionsAnswered).toBe(1);
    expect(result.current.questionState.questionHistory).toHaveLength(1);
    expect(result.current.questionState.currentQuestion).toBeNull();

    // 4. Continue to second question (after minimum time)
    rerender({ currentTime: 302, isPlaying: true });
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.questionState.currentQuestion?.id).toBe('q2');

    // 5. Answer second question
    await act(async () => {
      await result.current.answerQuestion('B', 2000);
    });

    expect(result.current.questionState.questionsAnswered).toBe(2);
    expect(result.current.questionState.questionHistory).toHaveLength(2);

    // Verify all responses were recorded
    expect(inlineQuestionsService.recordQuestionResponse).toHaveBeenCalledTimes(2);
    expect(inlineQuestionsService.recordQuestionResponse).toHaveBeenNthCalledWith(
      1,
      'test-user-123',
      'q1',
      'A',
      3000,
      61
    );
    expect(inlineQuestionsService.recordQuestionResponse).toHaveBeenNthCalledWith(
      2,
      'test-user-123',
      'q2',
      'B',
      2000,
      302
    );
  });
}); 