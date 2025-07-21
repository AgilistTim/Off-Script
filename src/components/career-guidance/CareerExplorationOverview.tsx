import React, { useState, useEffect, useMemo } from 'react';
import { useChatContext } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import careerPathwayService, { CareerExplorationSummary } from '../../services/careerPathwayService';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Loader2, MessageSquare, ArrowRight, Clock, Star } from 'lucide-react';

interface CareerExplorationOverviewProps {
  onSelectExploration?: (threadId: string) => void;
  currentCareerCards?: any[]; // Add prop for current career cards
}

const CareerExplorationOverview: React.FC<CareerExplorationOverviewProps> = ({ 
  onSelectExploration, 
  currentCareerCards = [] 
}) => {
  const { careerExplorations } = useChatContext();
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [directExplorations, setDirectExplorations] = useState<CareerExplorationSummary[]>([]);

  useEffect(() => {
    const loadExplorations = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        if (!currentUser) {
          setIsLoading(false);
          return;
        }

        const explorations = await careerPathwayService.getUserCareerExplorations(currentUser.uid);
        setDirectExplorations(explorations);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load career explorations');
      } finally {
        setIsLoading(false);
      }
    };

    loadExplorations();
  }, [currentUser]);

  // Combine direct explorations with current career cards
  const allExplorations = useMemo(() => {
    const explorations = directExplorations.length > 0 ? directExplorations : careerExplorations;
    
    // Add current career cards as exploration items
    const currentCardExplorations = currentCareerCards.map(card => ({
      threadId: card.id,
      threadTitle: card.title,
      primaryCareerPath: card.title,
      lastUpdated: new Date(),
      match: card.confidence || 80,
      description: card.description,
      isCurrent: true,
      source: card.source
    }));
    
    // Combine and sort by last updated
    const combined = [...explorations, ...currentCardExplorations];
    return combined.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
  }, [directExplorations, careerExplorations, currentCareerCards]);

  const formatDate = (date: Date | any) => {
    const now = new Date();
    // Handle both Date objects and Firestore Timestamps
    const dateObj = date?.toDate ? date.toDate() : new Date(date);
    const diffTime = Math.abs(now.getTime() - dateObj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    
    return dateObj.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getMatchVariant = (match: number): "default" | "secondary" | "destructive" | "outline" => {
    if (match >= 90) return 'default';
    if (match >= 70) return 'secondary';
    return 'outline';
  };

  const getMatchColor = (match: number) => {
    if (match >= 90) return 'text-green-700';
    if (match >= 70) return 'text-yellow-700';
    return 'text-red-700';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-gray-600">Loading your career explorations...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6 text-center">
          <div className="text-red-600 mb-2">⚠️ Something went wrong</div>
          <p className="text-gray-600">{error}</p>
          <p className="text-sm text-gray-500 mt-2">Please try refreshing the page</p>
        </CardContent>
      </Card>
    );
  }

  if (allExplorations.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg mb-2">Start Your Career Journey</CardTitle>
              <CardDescription className="mb-4">
                Discover personalized career paths by chatting with our AI assistant about your interests, goals, and aspirations.
              </CardDescription>
              <Button asChild>
                <a href="/chat" className="inline-flex items-center">
                  Start Exploring <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Your Career Discoveries</h3>
          <p className="text-sm text-gray-500 mt-1">
            {allExplorations.length} career {allExplorations.length === 1 ? 'path' : 'paths'} discovered
          </p>
        </div>
      </div>
      
      <div className="grid gap-4">
        {allExplorations.map((exploration) => (
          <div
            key={exploration.threadId}
            className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer group"
            onClick={() => onSelectExploration?.(exploration.threadId)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                  {exploration.primaryCareerPath}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {exploration.threadTitle}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  {exploration.match}% match
                </div>
                {(exploration as any).isCurrent && (
                  <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    Current
                  </div>
                )}
              </div>
            </div>

            <p className="text-gray-700 text-sm mb-3 line-clamp-2">
              {exploration.description}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {formatDate(exploration.lastUpdated)}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                Click for details →
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CareerExplorationOverview; 