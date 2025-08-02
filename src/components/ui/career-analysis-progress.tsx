import React, { useState, useEffect } from 'react';
import { MCPProgressUpdate } from '../../services/progressAwareMCPService';

interface CareerAnalysisProgressProps {
  isVisible: boolean;
  onComplete?: () => void;
  onError?: (error: string) => void;
  enableEnhancement?: boolean;
  progressUpdate?: MCPProgressUpdate | null;
}

interface ProgressStage {
  key: string;
  label: string;
  icon: string;
  description: string;
}

const PROGRESS_STAGES: ProgressStage[] = [
  {
    key: 'initializing',
    label: 'Initializing',
    icon: '🚀',
    description: 'Starting conversation analysis...'
  },
  {
    key: 'analyzing',
    label: 'Analyzing',
    icon: '🔍',
    description: 'Identifying your interests and skills...'
  },
  {
    key: 'generating_cards',
    label: 'Generating',
    icon: '🎯',
    description: 'Creating personalized career recommendations...'
  },
  {
    key: 'enhancing_cards',
    label: 'Enhancing',
    icon: '✨',
    description: 'Adding real-time market intelligence...'
  },
  {
    key: 'completed',
    label: 'Complete',
    icon: '✅',
    description: 'Your career analysis is ready!'
  }
];

export const CareerAnalysisProgress: React.FC<CareerAnalysisProgressProps> = ({
  isVisible,
  onComplete,
  onError,
  enableEnhancement = false,
  progressUpdate
}) => {
  const [currentUpdate, setCurrentUpdate] = useState<MCPProgressUpdate | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [estimatedCompletion, setEstimatedCompletion] = useState<number | null>(null);

  // Filter stages based on whether enhancement is enabled
  const activeStages = enableEnhancement 
    ? PROGRESS_STAGES 
    : PROGRESS_STAGES.filter(stage => stage.key !== 'enhancing_cards');

  useEffect(() => {
    if (isVisible && !startTime) {
      const now = Date.now();
      setStartTime(now);
      
      // Set estimated completion time
      const estimatedDuration = enableEnhancement ? 90000 : 60000; // 90s or 60s
      setEstimatedCompletion(now + estimatedDuration);
    }
  }, [isVisible, startTime, enableEnhancement]);

  // Update local state when progressUpdate prop changes
  useEffect(() => {
    if (progressUpdate) {
      setCurrentUpdate(progressUpdate);
    }
  }, [progressUpdate]);

  useEffect(() => {
    if (currentUpdate?.stage === 'completed') {
      setTimeout(() => onComplete?.(), 1500); // Small delay to show completion
    } else if (currentUpdate?.stage === 'error') {
      setTimeout(() => onError?.(currentUpdate.details?.error || 'Analysis failed'), 1000);
    }
  }, [currentUpdate, onComplete, onError]);



  const getCurrentStageIndex = () => {
    if (!currentUpdate) return 0;
    return activeStages.findIndex(stage => stage.key === currentUpdate.stage);
  };

  const getTimeRemaining = () => {
    if (!estimatedCompletion || !currentUpdate) return null;
    
    const now = Date.now();
    const remaining = Math.max(0, estimatedCompletion - now);
    return Math.ceil(remaining / 1000);
  };

  const formatTimeRemaining = (seconds: number | null) => {
    if (!seconds || seconds <= 0) return null;
    
    if (seconds < 60) {
      return `~${seconds}s remaining`;
    } else {
      const minutes = Math.ceil(seconds / 60);
      return `~${minutes}m remaining`;
    }
  };

  if (!isVisible) return null;

  const currentStageIndex = getCurrentStageIndex();
  const timeRemaining = getTimeRemaining();
  const progress = currentUpdate?.progress || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Analyzing Your Career Path
          </h3>
          {enableEnhancement && (
            <div className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full inline-block">
              ✨ Premium Enhancement Enabled
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>{currentUpdate?.message || 'Starting analysis...'}</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          {timeRemaining && (
            <div className="text-xs text-gray-500 mt-1 text-center">
              {formatTimeRemaining(timeRemaining)}
            </div>
          )}
        </div>

        {/* Stage Indicators */}
        <div className="space-y-3">
          {activeStages.map((stage, index) => {
            const isCompleted = index < currentStageIndex;
            const isCurrent = index === currentStageIndex;
            const isUpcoming = index > currentStageIndex;
            
            return (
              <div 
                key={stage.key}
                className={`flex items-center p-3 rounded-lg transition-all duration-300 ${
                  isCompleted ? 'bg-green-50 border border-green-200' :
                  isCurrent ? 'bg-blue-50 border border-blue-200 shadow-sm' :
                  'bg-gray-50 border border-gray-100'
                }`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  isCompleted ? 'bg-green-500 text-white' :
                  isCurrent ? 'bg-blue-500 text-white animate-pulse' :
                  'bg-gray-300 text-gray-600'
                }`}>
                  {isCompleted ? '✓' : stage.icon}
                </div>
                
                <div className="ml-3 flex-1">
                  <div className={`font-medium text-sm ${
                    isCompleted ? 'text-green-700' :
                    isCurrent ? 'text-blue-700' :
                    'text-gray-500'
                  }`}>
                    {stage.label}
                  </div>
                  <div className={`text-xs ${
                    isCompleted ? 'text-green-600' :
                    isCurrent ? 'text-blue-600' :
                    'text-gray-400'
                  }`}>
                    {isCurrent && currentUpdate?.message ? currentUpdate.message : stage.description}
                  </div>
                </div>

                {isCurrent && (
                  <div className="flex-shrink-0">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Details */}
        {currentUpdate?.details && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-600">
              {currentUpdate.stage === 'generating_cards' && currentUpdate.details.cardCount && (
                <span>Generated {currentUpdate.details.cardCount} career recommendations</span>
              )}
              {currentUpdate.stage === 'enhancing_cards' && currentUpdate.details.enhancedCount && (
                <span>Enhanced {currentUpdate.details.enhancedCount} cards with market data</span>
              )}
              {currentUpdate.stage === 'completed' && (
                <div>
                  <span className="font-medium text-green-600">
                    {currentUpdate.details.type === 'enhanced' ? 'Premium Analysis' : 'Standard Analysis'} Complete
                  </span>
                  {currentUpdate.details.cardCount && (
                    <span className="block">{currentUpdate.details.cardCount} personalized career cards ready</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error State */}
        {currentUpdate?.stage === 'error' && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm text-red-700">
              ❌ Analysis failed: {currentUpdate.details?.error || 'Unknown error'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CareerAnalysisProgress;