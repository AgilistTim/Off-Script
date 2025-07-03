import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Video, ReflectionPrompt, saveReflectionResponse } from '../../services/videoService';
import { useAuth } from '../../context/AuthContext';

interface VideoAssessmentProps {
  video: Video;
  onComplete: () => void;
}

const VideoAssessment: React.FC<VideoAssessmentProps> = ({ video, onComplete }) => {
  const { currentUser } = useAuth();
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get current prompt
  const currentPrompt = video.prompts && video.prompts.length > 0 
    ? video.prompts[currentPromptIndex] 
    : null;

  // Handle response selection
  const handleResponseSelect = async (promptId: string, response: string) => {
    // Update local state
    setResponses(prev => ({
      ...prev,
      [promptId]: response
    }));

    // Save to database if user is logged in
    if (currentUser) {
      try {
        await saveReflectionResponse(currentUser.uid, video.id, promptId, response);
      } catch (error) {
        console.error('Error saving response:', error);
      }
    }

    // Move to next prompt or complete
    if (currentPromptIndex < video.prompts.length - 1) {
      setCurrentPromptIndex(prev => prev + 1);
    } else {
      // All prompts answered
      setIsSubmitting(true);
      
      // Simulate a brief delay to show submission state
      setTimeout(() => {
        setIsSubmitting(false);
        onComplete();
      }, 1000);
    }
  };

  // If no prompts or no current prompt, show a message
  if (!video.prompts || video.prompts.length === 0 || !currentPrompt) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600 dark:text-gray-400">No reflection questions available for this video.</p>
        <button 
          onClick={onComplete}
          className="mt-4 px-4 py-2 bg-primary-blue text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-2xl mx-auto"
    >
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Reflect on what you've watched
      </h3>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Question {currentPromptIndex + 1} of {video.prompts.length}
      </p>
      
      <div className="mb-8">
        <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
          {currentPrompt.question}
        </h4>
        
        <div className="space-y-3">
          {currentPrompt.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleResponseSelect(currentPrompt.id, option)}
              disabled={isSubmitting}
              className={`w-full text-left p-4 rounded-lg border transition-all ${
                responses[currentPrompt.id] === option
                  ? 'border-primary-blue bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <span className="flex items-center">
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full mr-3 ${
                  responses[currentPrompt.id] === option
                    ? 'bg-primary-blue text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}>
                  {String.fromCharCode(65 + index)}
                </span>
                {option}
              </span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-4">
        <div 
          className="bg-primary-blue h-2.5 rounded-full transition-all duration-300" 
          style={{ width: `${((currentPromptIndex + 1) / video.prompts.length) * 100}%` }}
        />
      </div>
      
      {isSubmitting && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-blue"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Saving your responses...</p>
        </div>
      )}
    </motion.div>
  );
};

export default VideoAssessment; 