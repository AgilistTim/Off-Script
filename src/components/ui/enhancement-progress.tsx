// Enhancement Progress Component - Shows Perplexity career enhancement progress
import React from 'react';
import { Card } from './card';

export interface EnhancementProgressProps {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: { completed: number; total: number };
  currentCard: string;
  estimatedCompletion: string;
  errors: string[];
  onDismiss?: () => void;
}

export const EnhancementProgress: React.FC<EnhancementProgressProps> = ({
  status,
  progress,
  currentCard,
  estimatedCompletion,
  errors,
  onDismiss
}) => {
  const progressPercentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  if (status === 'completed' && errors.length === 0) {
    return (
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 p-6 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-green-900">Enhancement Complete!</h3>
              <p className="text-sm text-green-700">
                Your career cards have been enhanced with the latest UK market data
              </p>
            </div>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-green-600 hover:text-green-800 p-1"
              aria-label="Dismiss"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </Card>
    );
  }

  if (status === 'failed' || errors.length > 0) {
    return (
      <Card className="bg-gradient-to-r from-red-50 to-pink-50 border-red-200 p-6 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-red-900">Enhancement Failed</h3>
              <p className="text-sm text-red-700">
                Some career cards couldn't be enhanced. Your original cards are still available.
              </p>
              {errors.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-red-600 cursor-pointer">View errors ({errors.length})</summary>
                  <ul className="text-xs text-red-600 mt-1 list-disc list-inside">
                    {errors.slice(0, 3).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {errors.length > 3 && <li>...and {errors.length - 3} more</li>}
                  </ul>
                </details>
              )}
            </div>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-red-600 hover:text-red-800 p-1"
              aria-label="Dismiss"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </Card>
    );
  }

  if (status === 'processing' || status === 'queued') {
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 p-6 mb-4">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <div className="animate-spin h-8 w-8 border-3 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-blue-900">
                {status === 'queued' ? 'Queued for Enhancement' : 'Enhancing Your Career Cards'}
              </h3>
              <span className="text-sm font-medium text-blue-700">
                {progress.completed}/{progress.total}
              </span>
            </div>
            
            <p className="text-sm text-blue-700 mb-3">
              {status === 'queued' 
                ? 'We\'re gathering the latest UK market data to supercharge your career insights...'
                : `Currently enhancing: ${currentCard}`
              }
            </p>
            
            {/* Progress bar */}
            <div className="w-full bg-blue-100 rounded-full h-3 mb-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            
            <div className="flex justify-between text-xs text-blue-600">
              <span>Progress: {Math.round(progressPercentage)}%</span>
              <span>Est. completion: {estimatedCompletion}</span>
            </div>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-blue-100 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Premium Enhancement</span>
          </div>
          <p className="text-xs text-blue-700 mt-1">
            We're searching job boards, government sources, and educational institutions for the most current UK career data.
          </p>
        </div>
      </Card>
    );
  }

  return null;
};

export default EnhancementProgress;