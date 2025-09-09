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

  // Count meaningful extracted data
  const dataCount = Object.values(extractedData || {}).filter(Boolean).length;

  return (
    <div className={`bg-template-secondary/10 border border-black rounded-lg px-3 py-2 ${className}`}>
      {/* Compact header with inline progress */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="flex-shrink-0 w-5 h-5 bg-template-primary text-white rounded-full flex items-center justify-center text-xs">
            {currentStepIndex >= 0 && currentStepIndex < progressSteps.length 
              ? progressSteps[currentStepIndex].icon
              : <User className="w-3 h-3" />
            }
          </div>
          <h4 className="font-semibold text-black text-sm">
            {currentStepIndex >= 0 && currentStepIndex < progressSteps.length 
              ? progressSteps[currentStepIndex].userFriendlyTitle
              : 'Getting started'
            }
          </h4>
        </div>
        <span className="text-xs font-medium text-gray-600">
          {Math.max(0, currentStepIndex + 1)}/{progressSteps.length}
        </span>
      </div>

      {/* Compact progress bar */}
      <div className="flex items-center space-x-2">
        <div className="flex-1 bg-gray-200 rounded-full h-1 border border-black">
          <div 
            className="bg-template-primary h-full rounded-full transition-all duration-500 ease-in-out"
            style={{ 
              width: `${Math.max(0, (currentStepIndex + 1) / progressSteps.length * 100)}%` 
            }}
          />
        </div>
        
        {/* Compact extracted data indicator */}
        {dataCount > 0 && (
          <div className="flex items-center space-x-1 text-xs text-gray-600">
            <div className="w-2 h-2 bg-template-primary rounded-full animate-pulse"></div>
            <span>{dataCount} details</span>
          </div>
        )}
      </div>

      {/* Optional: Show most important extracted data inline */}
      {extractedData?.name && (
        <div className="mt-1 text-xs text-gray-600">
          <span className="font-medium">{extractedData.name}</span>
          {extractedData.education && <span> • {extractedData.education}</span>}
          {extractedData.careerCardsGenerated && extractedData.careerCardsGenerated > 0 && (
            <span> • {extractedData.careerCardsGenerated} opportunities</span>
          )}
        </div>
      )}
    </div>
  );
};

export default OnboardingProgress;