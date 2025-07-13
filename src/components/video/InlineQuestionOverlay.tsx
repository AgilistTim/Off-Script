import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, HelpCircle } from 'lucide-react';
import { InlineQuestion } from '../../services/inlineQuestionsService';

interface InlineQuestionOverlayProps {
  question: InlineQuestion;
  isVisible: boolean;
  onAnswer: (selectedOption: 'A' | 'B' | 'skip', responseTime: number) => void;
  onDismiss: () => void;
  autoHideDelay?: number; // Auto-hide after X seconds if no response
  position?: 'top' | 'center' | 'bottom';
  showTimer?: boolean;
}

const InlineQuestionOverlay: React.FC<InlineQuestionOverlayProps> = ({
  question,
  isVisible,
  onAnswer,
  onDismiss,
  autoHideDelay = 15, // 15 seconds default
  position = 'bottom',
  showTimer = true
}) => {
  const [startTime, setStartTime] = useState<number>(0);
  const [remainingTime, setRemainingTime] = useState<number>(autoHideDelay);
  const [isAnswering, setIsAnswering] = useState<boolean>(false);

  // Track when question appears for response time calculation
  useEffect(() => {
    if (isVisible) {
      setStartTime(Date.now());
      setRemainingTime(autoHideDelay);
    }
  }, [isVisible, autoHideDelay]);

  // Auto-hide countdown timer
  useEffect(() => {
    if (!isVisible || isAnswering) return;

    const interval = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          // Auto-skip when time runs out
          const responseTime = Date.now() - startTime;
          onAnswer('skip', responseTime);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, isAnswering, startTime, onAnswer]);

  // Handle answer selection
  const handleAnswer = (selectedOption: 'A' | 'B') => {
    if (isAnswering) return;
    
    setIsAnswering(true);
    const responseTime = Date.now() - startTime;
    
    // Small delay for visual feedback
    setTimeout(() => {
      onAnswer(selectedOption, responseTime);
      setIsAnswering(false);
    }, 300);
  };

  // Handle skip
  const handleSkip = () => {
    if (isAnswering) return;
    
    const responseTime = Date.now() - startTime;
    onAnswer('skip', responseTime);
  };

  // Position classes
  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'top-4 left-1/2 -translate-x-1/2';
      case 'center':
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
      case 'bottom':
      default:
        return 'bottom-20 left-1/2 -translate-x-1/2';
    }
  };

  // Progress bar percentage
  const progressPercentage = ((autoHideDelay - remainingTime) / autoHideDelay) * 100;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/20 z-40 pointer-events-none"
          />
          
          {/* Question Card */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 300,
              duration: 0.4 
            }}
            className={`absolute ${getPositionClasses()} z-50 w-full max-w-md px-4`}
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Progress Bar */}
              {showTimer && (
                <div className="w-full h-1 bg-gray-200 dark:bg-gray-700">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              )}

              {/* Header */}
              <div className="flex items-center justify-between p-4 pb-2">
                <div className="flex items-center gap-2">
                  <HelpCircle size={20} className="text-blue-500" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Quick Question
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  {showTimer && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Clock size={14} />
                      <span>{remainingTime}s</span>
                    </div>
                  )}
                  
                  <button
                    onClick={handleSkip}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    disabled={isAnswering}
                  >
                    <X size={16} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                  </button>
                </div>
              </div>

              {/* Question */}
              <div className="px-4 pb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {question.question}
                </h3>
                
                {question.context && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {question.context}
                  </p>
                )}

                {/* Answer Options */}
                <div className="space-y-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAnswer('A')}
                    disabled={isAnswering}
                    className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-200 ${
                      isAnswering 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                        A
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {question.optionA}
                      </span>
                    </div>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAnswer('B')}
                    disabled={isAnswering}
                    className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-200 ${
                      isAnswering 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm">
                        B
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {question.optionB}
                      </span>
                    </div>
                  </motion.button>
                </div>

                {/* Skip Button */}
                <div className="mt-4 text-center">
                  <button
                    onClick={handleSkip}
                    disabled={isAnswering}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Skip this question
                  </button>
                </div>

                {/* Question metadata for debugging */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-400 space-y-1">
                      <div>Type: {question.type}</div>
                      <div>Category: {question.category}</div>
                      <div>Importance: {question.importance}</div>
                      <div>Timestamp: {question.timestamp}s</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default InlineQuestionOverlay; 