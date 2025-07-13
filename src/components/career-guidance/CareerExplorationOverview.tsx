import React, { useState, useEffect } from 'react';
import { useChatContext } from '../../context/ChatContext';
import { CareerExplorationSummary } from '../../services/careerPathwayService';

interface CareerExplorationOverviewProps {
  onSelectExploration?: (threadId: string) => void;
}

const CareerExplorationOverview: React.FC<CareerExplorationOverviewProps> = ({ onSelectExploration }) => {
  const { getUserCareerExplorations, careerExplorations } = useChatContext();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadExplorations = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await getUserCareerExplorations();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load career explorations');
      } finally {
        setIsLoading(false);
      }
    };

    loadExplorations();
  }, [getUserCareerExplorations]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getMatchColor = (match: number) => {
    if (match >= 90) return 'text-green-600 bg-green-50';
    if (match >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading your career explorations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-red-200">
        <div className="text-center">
          <div className="text-red-600 mb-2">⚠️ Error</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (careerExplorations.length === 0) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="text-center">
          <div className="text-gray-400 mb-2">🌟</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Start Your Career Journey</h3>
          <p className="text-gray-600">
            You haven't explored any career paths yet. Start a conversation in AI Chat to discover your potential career paths!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Your Career Explorations</h2>
        <span className="text-sm text-gray-500">{careerExplorations.length} exploration{careerExplorations.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid gap-4">
        {careerExplorations.map((exploration) => (
          <div
            key={exploration.threadId}
            className={`p-4 bg-white rounded-lg shadow-sm border border-gray-200 transition-all duration-200 ${
              onSelectExploration ? 'cursor-pointer hover:shadow-md hover:border-blue-300' : ''
            }`}
            onClick={() => onSelectExploration?.(exploration.threadId)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {exploration.threadTitle}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getMatchColor(exploration.match)}`}>
                    {exploration.match}% match
                  </span>
                </div>
                <p className="text-blue-600 font-medium mb-2">{exploration.primaryCareerPath}</p>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {exploration.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Explored on {formatDate(exploration.lastUpdated)}
                  </span>
                  {onSelectExploration && (
                    <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
                      View Details →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CareerExplorationOverview; 