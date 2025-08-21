/**
 * OnboardingProgress Component
 * Shows user-friendly progress through the structured onboarding flow
 */

import React from 'react';
import { Check, User, Search, Lightbulb, Target, MessageCircle } from 'lucide-react';

export type OnboardingStage = 
  | 'initial' 
  | 'discovery' 
  | 'classification' 
  | 'tailored_guidance' 
  | 'journey_active' 
  | 'complete';

export interface OnboardingProgressProps {
  currentStage: OnboardingStage;
  extractedData?: {
    name?: string;
    education?: string;
    careerDirection?: string;
    careerCardsGenerated?: number;
  };
  className?: string;
}

interface ProgressStep {
  key: OnboardingStage;
  title: string;
  description: string;
  icon: React.ReactNode;
  userFriendlyTitle: string;
}

const progressSteps: ProgressStep[] = [
  {
    key: 'initial',
    title: 'Getting Started',
    description: 'Welcome and introduction',
    icon: <MessageCircle className="w-4 h-4" />,
    userFriendlyTitle: 'Getting to know you'
  },
  {
    key: 'discovery',
    title: 'Personal Discovery',
    description: 'Learning about your background and interests',
    icon: <User className="w-4 h-4" />,
    userFriendlyTitle: 'Getting more detailed'
  },
  {
    key: 'classification',
    title: 'Exploring Ideas',
    description: 'Understanding your career direction and goals',
    icon: <Search className="w-4 h-4" />,
    userFriendlyTitle: 'Exploring ideas'
  },
  {
    key: 'tailored_guidance',
    title: 'Career Insights',
    description: 'Generating personalized career opportunities',
    icon: <Lightbulb className="w-4 h-4" />,
    userFriendlyTitle: 'Presenting opportunities'
  },
  {
    key: 'journey_active',
    title: 'Personalized Journey',
    description: 'Refining recommendations based on your feedback',
    icon: <Target className="w-4 h-4" />,
    userFriendlyTitle: 'Building on feedback'
  },
  {
    key: 'complete',
    title: 'Journey Ready',
    description: 'Your personalized career pathway is complete',
    icon: <Check className="w-4 h-4" />,
    userFriendlyTitle: 'Ready to explore'
  }
];

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  currentStage,
  extractedData,
  className = ''
}) => {
  const getCurrentStepIndex = () => {
    return progressSteps.findIndex(step => step.key === currentStage);
  };

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className={`bg-white border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_#000000] ${className}`}>
      {/* Header */}
      <div className="mb-4">
        <h3 className="font-bold text-lg text-black mb-1">
          Your Career Discovery Journey
        </h3>
        <p className="text-sm text-gray-600">
          {currentStepIndex >= 0 && currentStepIndex < progressSteps.length 
            ? progressSteps[currentStepIndex].userFriendlyTitle
            : 'Getting started'
          }
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2 border border-black">
            <div 
              className="bg-template-primary h-full rounded-full transition-all duration-500 ease-in-out border-r border-black"
              style={{ 
                width: `${Math.max(0, (currentStepIndex + 1) / progressSteps.length * 100)}%` 
              }}
            />
          </div>
          <span className="text-sm font-medium text-gray-700 min-w-[60px]">
            {Math.max(0, currentStepIndex + 1)} / {progressSteps.length}
          </span>
        </div>
      </div>

      {/* Current Step Details */}
      {currentStepIndex >= 0 && currentStepIndex < progressSteps.length && (
        <div className="mb-4 p-3 bg-template-secondary/20 rounded-lg border border-black">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-template-primary text-white rounded-full flex items-center justify-center border-2 border-black">
              {progressSteps[currentStepIndex].icon}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-black text-sm">
                {progressSteps[currentStepIndex].title}
              </h4>
              <p className="text-xs text-gray-600">
                {progressSteps[currentStepIndex].description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Extracted Data Preview */}
      {extractedData && Object.keys(extractedData).length > 0 && (
        <div className="border-t border-gray-200 pt-3">
          <h4 className="font-medium text-black text-sm mb-2">What we've learned about you:</h4>
          <div className="space-y-1">
            {extractedData.name && (
              <div className="flex items-center text-xs text-gray-700">
                <User className="w-3 h-3 mr-2 text-template-primary" />
                <span className="font-medium">Name:</span>
                <span className="ml-1">{extractedData.name}</span>
              </div>
            )}
            {extractedData.education && (
              <div className="flex items-center text-xs text-gray-700">
                <Search className="w-3 h-3 mr-2 text-template-primary" />
                <span className="font-medium">Education:</span>
                <span className="ml-1">{extractedData.education}</span>
              </div>
            )}
            {extractedData.careerDirection && (
              <div className="flex items-center text-xs text-gray-700">
                <Target className="w-3 h-3 mr-2 text-template-primary" />
                <span className="font-medium">Career focus:</span>
                <span className="ml-1">{extractedData.careerDirection}</span>
              </div>
            )}
            {extractedData.careerCardsGenerated && extractedData.careerCardsGenerated > 0 && (
              <div className="flex items-center text-xs text-gray-700">
                <Lightbulb className="w-3 h-3 mr-2 text-template-primary" />
                <span className="font-medium">Career ideas:</span>
                <span className="ml-1">{extractedData.careerCardsGenerated} opportunities found</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingProgress;