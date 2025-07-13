import { useState, useEffect, useCallback, useRef } from 'react';
import { InlineQuestion, inlineQuestionsService, generateInlineQuestions } from '../services/inlineQuestionsService';
import { Video } from '../services/videoService';
import { useAuth } from '../context/AuthContext';

interface VideoQuestionState {
  currentQuestion: InlineQuestion | null;
  isQuestionVisible: boolean;
  questionsAnswered: number;
  totalQuestions: number;
  questionHistory: Array<{
    question: InlineQuestion;
    answer: 'A' | 'B' | 'skip';
    responseTime: number;
    timestamp: number;
  }>;
}

interface UseVideoQuestionsProps {
  video: Video;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  enableQuestions?: boolean;
  questionSettings?: {
    maxQuestions?: number;
    minTimeBetweenQuestions?: number; // seconds
    autoGenerate?: boolean;
    questionTypes?: ('binary_choice' | 'preference' | 'career_direction' | 'skill_interest')[];
  };
}

interface UseVideoQuestionsReturn {
  questionState: VideoQuestionState;
  showQuestion: (question: InlineQuestion) => void;
  hideQuestion: () => void;
  answerQuestion: (selectedOption: 'A' | 'B' | 'skip', responseTime: number) => Promise<void>;
  generateQuestions: () => Promise<void>;
  resetQuestions: () => void;
  hasQuestionsForVideo: boolean;
  isGeneratingQuestions: boolean;
}

export const useVideoQuestions = ({
  video,
  isPlaying,
  currentTime,
  duration,
  enableQuestions = true,
  questionSettings = {}
}: UseVideoQuestionsProps): UseVideoQuestionsReturn => {
  const { currentUser } = useAuth();
  const {
    maxQuestions = 3,
    minTimeBetweenQuestions = 60,
    autoGenerate = true,
    questionTypes = ['career_direction', 'skill_interest', 'preference']
  } = questionSettings;

  // State
  const [questions, setQuestions] = useState<InlineQuestion[]>([]);
  const [questionState, setQuestionState] = useState<VideoQuestionState>({
    currentQuestion: null,
    isQuestionVisible: false,
    questionsAnswered: 0,
    totalQuestions: 0,
    questionHistory: []
  });
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [lastQuestionTime, setLastQuestionTime] = useState<number>(0);
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<Set<string>>(new Set());

  // Refs to track state across renders
  const questionsRef = useRef<InlineQuestion[]>([]);
  const currentQuestionRef = useRef<InlineQuestion | null>(null);
  const isQuestionVisibleRef = useRef<boolean>(false);

  // Update refs when state changes
  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  useEffect(() => {
    currentQuestionRef.current = questionState.currentQuestion;
    isQuestionVisibleRef.current = questionState.isQuestionVisible;
  }, [questionState.currentQuestion, questionState.isQuestionVisible]);

  // Load existing questions for the video
  useEffect(() => {
    const loadQuestions = async () => {
      if (!video.id || !enableQuestions) return;

      try {
        const existingQuestions = await inlineQuestionsService.getQuestionsForVideo(video.id);
        
        if (existingQuestions.length > 0) {
          setQuestions(existingQuestions);
          setQuestionState(prev => ({
            ...prev,
            totalQuestions: existingQuestions.length
          }));
        } else if (autoGenerate && currentUser) {
          // Auto-generate questions if none exist
          await generateQuestionsForVideo();
        }
      } catch (error) {
        console.error('Error loading questions for video:', error);
      }
    };

    loadQuestions();
  }, [video.id, enableQuestions, autoGenerate, currentUser]);

  // Question scheduling logic - check if we should show a question
  useEffect(() => {
    if (!isPlaying || !enableQuestions || questions.length === 0 || isQuestionVisibleRef.current) {
      return;
    }

    // Find the next question that should be shown
    const nextQuestion = questions.find(q => {
      // Check if question timing is right
      const isTimeToShow = currentTime >= q.timestamp && currentTime <= q.timestamp + 5; // 5 second window
      
      // Check if we haven't answered this question yet
      const notAnswered = !answeredQuestionIds.has(q.id);
      
      // Check if enough time has passed since last question
      const enoughTimePassed = currentTime - lastQuestionTime >= minTimeBetweenQuestions;
      
      // Check if we haven't exceeded max questions
      const withinMaxQuestions = questionState.questionsAnswered < maxQuestions;

      return isTimeToShow && notAnswered && enoughTimePassed && withinMaxQuestions;
    });

    if (nextQuestion) {
      showQuestion(nextQuestion);
    }
  }, [currentTime, isPlaying, questions, answeredQuestionIds, lastQuestionTime, questionState.questionsAnswered, minTimeBetweenQuestions, maxQuestions, enableQuestions]);

  // Show a specific question
  const showQuestion = useCallback((question: InlineQuestion) => {
    setQuestionState(prev => ({
      ...prev,
      currentQuestion: question,
      isQuestionVisible: true
    }));
    setLastQuestionTime(currentTime);
  }, [currentTime]);

  // Hide the current question
  const hideQuestion = useCallback(() => {
    setQuestionState(prev => ({
      ...prev,
      currentQuestion: null,
      isQuestionVisible: false
    }));
  }, []);

  // Answer a question
  const answerQuestion = useCallback(async (
    selectedOption: 'A' | 'B' | 'skip',
    responseTime: number
  ) => {
    const currentQuestion = currentQuestionRef.current;
    if (!currentQuestion || !currentUser) return;

    try {
      // Record the response
      await inlineQuestionsService.recordQuestionResponse(
        currentUser.uid,
        currentQuestion.id,
        selectedOption,
        responseTime,
        currentTime
      );

      // Update local state
      setAnsweredQuestionIds(prev => new Set([...prev, currentQuestion.id]));
      
      setQuestionState(prev => ({
        ...prev,
        questionsAnswered: prev.questionsAnswered + 1,
        questionHistory: [
          ...prev.questionHistory,
          {
            question: currentQuestion,
            answer: selectedOption,
            responseTime,
            timestamp: currentTime
          }
        ],
        currentQuestion: null,
        isQuestionVisible: false
      }));

      console.log(`✅ Answered question ${currentQuestion.id}: ${selectedOption} (${responseTime}ms)`);
    } catch (error) {
      console.error('Error recording question response:', error);
      hideQuestion();
    }
  }, [currentUser, currentTime, hideQuestion]);

  // Generate questions for the video
  const generateQuestionsForVideo = useCallback(async () => {
    if (!currentUser || isGeneratingQuestions) return;

    setIsGeneratingQuestions(true);
    try {
      console.log('🎯 Generating questions for video:', video.id);
      
      const newQuestions = await generateInlineQuestions(video, currentUser.uid, {
        questionCount: maxQuestions,
        questionTypes
      });

      setQuestions(newQuestions);
      setQuestionState(prev => ({
        ...prev,
        totalQuestions: newQuestions.length
      }));

      console.log(`✅ Generated ${newQuestions.length} questions for video ${video.id}`);
    } catch (error) {
      console.error('Error generating questions:', error);
    } finally {
      setIsGeneratingQuestions(false);
    }
  }, [video, currentUser, maxQuestions, questionTypes, isGeneratingQuestions]);

  // Reset all question state (useful when video changes or restarts)
  const resetQuestions = useCallback(() => {
    setQuestionState({
      currentQuestion: null,
      isQuestionVisible: false,
      questionsAnswered: 0,
      totalQuestions: questions.length,
      questionHistory: []
    });
    setAnsweredQuestionIds(new Set());
    setLastQuestionTime(0);
  }, [questions.length]);

  // Auto-reset when video changes
  useEffect(() => {
    resetQuestions();
  }, [video.id, resetQuestions]);

  return {
    questionState,
    showQuestion,
    hideQuestion,
    answerQuestion,
    generateQuestions: generateQuestionsForVideo,
    resetQuestions,
    hasQuestionsForVideo: questions.length > 0,
    isGeneratingQuestions
  };
};

// Hook specifically for manual question triggers (e.g., testing or admin)
export const useManualQuestionTrigger = (video: Video) => {
  const { currentUser } = useAuth();

  const triggerQuestionAt = useCallback(async (
    timestamp: number,
    questionType: 'career_direction' | 'skill_interest' | 'preference' = 'career_direction'
  ) => {
    if (!currentUser) return null;

    try {
      // Generate a single question for this timestamp
      const questions = await generateInlineQuestions(video, currentUser.uid, {
        questionCount: 1,
        questionTypes: [questionType]
      });

      if (questions.length > 0) {
        // Override the timestamp to the desired time
        const question = { ...questions[0], timestamp };
        return question;
      }
    } catch (error) {
      console.error('Error triggering manual question:', error);
    }

    return null;
  }, [video, currentUser]);

  return { triggerQuestionAt };
};

// Utility hook for question analytics
export const useQuestionAnalytics = (video: Video) => {
  const [analytics, setAnalytics] = useState<{
    totalQuestions: number;
    averageResponseTime: number;
    completionRate: number;
    popularChoices: Record<string, { optionA: number; optionB: number; skip: number }>;
  } | null>(null);

  useEffect(() => {
    // This could fetch analytics from a Firebase Function
    // For now, it's a placeholder for future implementation
    setAnalytics({
      totalQuestions: 0,
      averageResponseTime: 0,
      completionRate: 0,
      popularChoices: {}
    });
  }, [video.id]);

  return analytics;
}; 