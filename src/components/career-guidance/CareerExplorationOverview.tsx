import React, { useState, useEffect, useMemo } from 'react';
import { useChatContext } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import careerPathwayService, { CareerExplorationSummary } from '../../services/careerPathwayService';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Loader2, 
  MessageSquare, 
  ArrowRight, 
  Clock, 
  Star, 
  RefreshCw,
  DollarSign,
  TrendingUp,
  Briefcase,
  GraduationCap,
  MapPin,
  Users,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Target,
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [refreshCount, setRefreshCount] = useState(0);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Helper function to extract rich career data from different sources
  const extractCareerData = (exploration: any) => {
    // For current career cards (from conversation)
    if (exploration.isCurrent && exploration.source) {
      return {
        averageSalary: exploration.source.averageSalary || exploration.source.salaryRange,
        keySkills: exploration.source.keySkills || exploration.source.skillsRequired || [],
        trainingPathways: exploration.source.trainingPathways || [exploration.source.trainingPathway].filter(Boolean) || [],
        entryRequirements: exploration.source.entryRequirements || [],
        workEnvironment: exploration.source.workEnvironment,
        nextSteps: exploration.source.nextSteps || [],
        growthOutlook: exploration.source.growthOutlook || exploration.source.marketOutlook,
        industry: exploration.source.industry,
        confidence: exploration.source.confidence
      };
    }
    
    // For migrated career cards (try to extract from description/stored data)
    return {
      averageSalary: null,
      keySkills: [],
      trainingPathways: [],
      entryRequirements: [],
      workEnvironment: null,
      nextSteps: [],
      growthOutlook: null,
      industry: null,
      confidence: exploration.match
    };
  };

  // Helper function to format salary display
  const formatSalaryDisplay = (salary: any): string => {
    if (!salary) return '';
    if (typeof salary === 'string') return salary;
    if (salary.entry) return `${salary.entry} - ${salary.senior || salary.experienced}`;
    return '';
  };

  // Helper function to get growth outlook display
  const getGrowthColor = (outlook: string): string => {
    if (!outlook) return 'text-gray-600';
    const lower = outlook.toLowerCase();
    if (lower.includes('high') || lower.includes('strong') || lower.includes('excellent')) return 'text-green-600';
    if (lower.includes('good') || lower.includes('moderate')) return 'text-blue-600';
    if (lower.includes('limited') || lower.includes('declining')) return 'text-orange-600';
    return 'text-gray-600';
  };

  const toggleCardExpansion = (threadId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(threadId)) {
        newSet.delete(threadId);
      } else {
        newSet.add(threadId);
      }
      return newSet;
    });
  };

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
      
      // If no migrated career cards found but we expected them, show retry option
      const hasMigratedCards = explorations.some(exp => exp.threadId.includes('_card_'));
      if (!hasMigratedCards && refreshCount === 0) {
        console.log('🔄 No migrated career cards found on first load - they may still be processing');
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load career explorations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExplorations();
  }, [currentUser, refreshCount]);

  const handleRefresh = () => {
    setRefreshCount(prev => prev + 1);
    loadExplorations();
  };

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
      source: card // Pass the full card data as source
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
              <div className="flex gap-3 justify-center">
                <Button asChild>
                  <a href="/chat" className="inline-flex items-center">
                    Start Exploring <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="inline-flex items-center"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {isLoading ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
              {refreshCount > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  If your career discoveries don't appear, they may still be processing. Try again in a few minutes.
                </p>
              )}
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
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          className="inline-flex items-center"
        >
          {isLoading ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 h-3 w-3" />
          )}
          {isLoading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>
      
      <div className="grid gap-4">
        {allExplorations.map((exploration) => {
          const careerData = extractCareerData(exploration);
          const isExpanded = expandedCards.has(exploration.threadId);
          const salaryDisplay = formatSalaryDisplay(careerData.averageSalary);

          return (
            <motion.div
              key={exploration.threadId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
            >
              {/* Card Header - Always Visible */}
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {exploration.primaryCareerPath}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                      {careerData.industry && (
                        <div className="flex items-center">
                          <Briefcase className="w-4 h-4 mr-1" />
                          <span>{careerData.industry}</span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span>UK</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>{formatDate(exploration.lastUpdated)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-medium">
                      {exploration.match}% match
                    </div>
                    {(exploration as any).isCurrent && (
                      <div className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-medium">
                        Live
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-700 text-sm mb-4 line-clamp-2">
                  {exploration.description}
                </p>

                {/* Quick Info Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Salary */}
                  {salaryDisplay && (
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Salary Range</div>
                        <div className="text-sm font-medium text-gray-900">{salaryDisplay}</div>
                      </div>
                    </div>
                  )}

                  {/* Growth Outlook */}
                  {careerData.growthOutlook && (
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Growth Outlook</div>
                        <div className={`text-sm font-medium ${getGrowthColor(careerData.growthOutlook)}`}>
                          {careerData.growthOutlook}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Skills Count */}
                  {careerData.keySkills.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Star className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Key Skills</div>
                        <div className="text-sm font-medium text-gray-900">
                          {careerData.keySkills.length} identified
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Top Skills Preview */}
                {careerData.keySkills.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {careerData.keySkills.slice(0, 5).map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {careerData.keySkills.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{careerData.keySkills.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleCardExpansion(exploration.threadId)}
                    className="flex items-center space-x-2"
                  >
                    <span>{isExpanded ? 'Show Less' : 'Show Details'}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onSelectExploration?.(exploration.threadId)}
                    className="flex items-center space-x-2"
                  >
                    <span>Explore Path</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Expandable Details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-gray-100 bg-gray-50"
                  >
                    <div className="p-6 space-y-6">
                      {/* Detailed Salary Breakdown */}
                      {careerData.averageSalary && typeof careerData.averageSalary === 'object' && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                            <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                            Salary Progression
                          </h4>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-3 bg-white rounded-lg border">
                              <div className="text-xs text-gray-500 mb-1">Entry Level</div>
                              <div className="text-lg font-bold text-gray-900">
                                {careerData.averageSalary.entry}
                              </div>
                            </div>
                            <div className="text-center p-3 bg-white rounded-lg border">
                              <div className="text-xs text-gray-500 mb-1">Experienced</div>
                              <div className="text-lg font-bold text-gray-900">
                                {careerData.averageSalary.experienced}
                              </div>
                            </div>
                            <div className="text-center p-3 bg-white rounded-lg border">
                              <div className="text-xs text-gray-500 mb-1">Senior Level</div>
                              <div className="text-lg font-bold text-gray-900">
                                {careerData.averageSalary.senior}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* All Key Skills */}
                      {careerData.keySkills.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                            <Star className="w-4 h-4 mr-2 text-purple-600" />
                            Required Skills
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {careerData.keySkills.map((skill, index) => (
                              <Badge key={index} variant="secondary">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Training Pathways */}
                      {careerData.trainingPathways.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                            <GraduationCap className="w-4 h-4 mr-2 text-blue-600" />
                            Training Pathways
                          </h4>
                          <ul className="space-y-2">
                            {careerData.trainingPathways.map((pathway, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-gray-700">{pathway}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Entry Requirements */}
                      {careerData.entryRequirements.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                            <BookOpen className="w-4 h-4 mr-2 text-orange-600" />
                            Entry Requirements
                          </h4>
                          <ul className="space-y-2">
                            {careerData.entryRequirements.map((requirement, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <Target className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-gray-700">{requirement}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Work Environment */}
                      {careerData.workEnvironment && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                            <Users className="w-4 h-4 mr-2 text-indigo-600" />
                            Work Environment
                          </h4>
                          <p className="text-sm text-gray-700 bg-white p-3 rounded-lg border">
                            {careerData.workEnvironment}
                          </p>
                        </div>
                      )}

                      {/* Next Steps */}
                      {careerData.nextSteps.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                            <ArrowRight className="w-4 h-4 mr-2 text-green-600" />
                            Next Steps
                          </h4>
                          <ul className="space-y-2">
                            {careerData.nextSteps.map((step, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-gray-700">{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default CareerExplorationOverview; 