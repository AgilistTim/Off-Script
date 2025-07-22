import React, { useState, useEffect, useMemo } from 'react';
import { useChatContext } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import careerPathwayService, { CareerExplorationSummary, ComprehensiveCareerGuidance } from '../../services/careerPathwayService';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
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
  CheckCircle,
  ExternalLink,
  Play,
  Heart,
  Lightbulb
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
  const [careerGuidanceData, setCareerGuidanceData] = useState<Map<string, ComprehensiveCareerGuidance>>(new Map());
  const [loadingGuidance, setLoadingGuidance] = useState<Set<string>>(new Set());

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

  // Fetch comprehensive career guidance when a card is expanded
  const fetchCareerGuidance = async (threadId: string, exploration: any) => {
    if (careerGuidanceData.has(threadId) || loadingGuidance.has(threadId)) {
      return; // Already have data or currently loading
    }

    setLoadingGuidance(prev => new Set([...prev, threadId]));

    try {
      // Create a proper ChatSummary object from the exploration data
      const chatSummary = {
        id: `temp-${threadId}`,
        threadId: threadId,
        userId: currentUser?.uid || 'guest',
        summary: exploration.description || 'Career exploration conversation',
        interests: exploration.interests || [exploration.primaryCareerPath],
        careerGoals: exploration.goals || ['Explore career options'],
        skills: exploration.skills || [],
        createdAt: new Date()
      };

      const guidance = await careerPathwayService.generateCareerGuidance(chatSummary);
      if (guidance) {
        setCareerGuidanceData(prev => new Map(prev.set(threadId, guidance)));
      }
    } catch (error) {
      console.error('Failed to fetch career guidance:', error);
    } finally {
      setLoadingGuidance(prev => {
        const newSet = new Set(prev);
        newSet.delete(threadId);
        return newSet;
      });
    }
  };

  const toggleCardExpansion = async (threadId: string, exploration: any) => {
    const isCurrentlyExpanded = expandedCards.has(threadId);
    
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (isCurrentlyExpanded) {
        newSet.delete(threadId);
      } else {
        newSet.add(threadId);
        // Fetch guidance data when expanding
        fetchCareerGuidance(threadId, exploration);
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
                    onClick={() => toggleCardExpansion(exploration.threadId, exploration)}
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
                    <div className="p-6">
                      {loadingGuidance.has(exploration.threadId) ? (
                        <div className="text-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-blue-600" />
                          <p className="text-sm text-gray-600">Loading detailed career guidance...</p>
                        </div>
                      ) : (
                        <Tabs defaultValue="overview" className="w-full">
                          <TabsList className="grid w-full grid-cols-3 mb-6">
                            <TabsTrigger value="overview" className="flex items-center space-x-2">
                              <Target className="w-4 h-4" />
                              <span>Overview</span>
                            </TabsTrigger>
                            <TabsTrigger value="learning" className="flex items-center space-x-2">
                              <BookOpen className="w-4 h-4" />
                              <span>Learning</span>
                            </TabsTrigger>
                            <TabsTrigger value="action" className="flex items-center space-x-2">
                              <Play className="w-4 h-4" />
                              <span>Take Action</span>
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="overview" className="space-y-6">
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
                          </TabsContent>

                          <TabsContent value="learning" className="space-y-6">
                            {careerGuidanceData.has(exploration.threadId) ? (
                              (() => {
                                const guidance = careerGuidanceData.get(exploration.threadId)!;
                                const primaryPathway = guidance.primaryPathway;
                                
                                return (
                                  <>
                                    {/* Training & Education Options */}
                                    <div>
                                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <GraduationCap className="w-5 h-5 mr-2 text-blue-600" />
                                        Training & Education Options
                                      </h4>
                                      <p className="text-sm text-gray-600 mb-4">
                                        Courses and qualifications to build your skills
                                      </p>
                                      
                                      {primaryPathway.trainingOptions && primaryPathway.trainingOptions.length > 0 ? (
                                        <div className="grid gap-4">
                                          {primaryPathway.trainingOptions.map((training, index) => (
                                            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                                              <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                  <h5 className="font-semibold text-gray-900">{training.title}</h5>
                                                  <p className="text-sm text-gray-600 mt-1">{training.description}</p>
                                                  <div className="flex items-center mt-3 space-x-4 text-sm text-gray-500">
                                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">{training.level}</span>
                                                    <span className="flex items-center">
                                                      <Clock className="w-3 h-3 mr-1" />
                                                      {training.duration}
                                                    </span>
                                                    <span className="font-medium text-green-600">{training.cost}</span>
                                                  </div>
                                                  <div className="text-sm text-gray-600 mt-2">
                                                    <strong>Provider:</strong> {training.provider}
                                                  </div>
                                                  {training.fundingAvailable && (
                                                    <div className="text-sm text-green-600 font-medium mt-1">
                                                      💰 {training.fundingAvailable}
                                                    </div>
                                                  )}
                                                </div>
                                                {training.link && (
                                                  <Button size="sm" variant="outline" asChild>
                                                    <a href={training.link} target="_blank" rel="noopener noreferrer">
                                                      <ExternalLink className="w-3 h-3 mr-1" />
                                                      Learn More
                                                    </a>
                                                  </Button>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-center py-6 text-gray-500">
                                          <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                          <p>Training options are being researched for this career path.</p>
                                        </div>
                                      )}
                                    </div>

                                    {/* Gain Experience Section */}
                                    {primaryPathway.volunteeringOpportunities && primaryPathway.volunteeringOpportunities.length > 0 && (
                                      <div>
                                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                          <Heart className="w-5 h-5 mr-2 text-red-600" />
                                          Gain Experience
                                        </h4>
                                        <p className="text-sm text-gray-600 mb-4">
                                          Volunteering and work experience opportunities
                                        </p>
                                        
                                        <div className="grid gap-4">
                                          {primaryPathway.volunteeringOpportunities.map((opportunity, index) => (
                                            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                                              <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                  <h5 className="font-semibold text-gray-900">{opportunity.role}</h5>
                                                  <p className="text-sm text-gray-600 mt-1">{opportunity.description}</p>
                                                  <div className="flex items-center mt-3 space-x-4 text-sm text-gray-500">
                                                    <span className="flex items-center">
                                                      <MapPin className="w-3 h-3 mr-1" />
                                                      {opportunity.location}
                                                    </span>
                                                    <span className="flex items-center">
                                                      <Clock className="w-3 h-3 mr-1" />
                                                      {opportunity.timeCommitment}
                                                    </span>
                                                  </div>
                                                  <div className="text-sm text-gray-600 mt-2">
                                                    <strong>Organization:</strong> {opportunity.organization}
                                                  </div>
                                                  {opportunity.skillsGained && opportunity.skillsGained.length > 0 && (
                                                    <div className="mt-2">
                                                      <span className="text-xs font-medium text-gray-700">Skills gained:</span>
                                                      <div className="flex flex-wrap gap-1 mt-1">
                                                        {opportunity.skillsGained.map((skill, skillIndex) => (
                                                          <Badge key={skillIndex} variant="outline" className="text-xs">
                                                            {skill}
                                                          </Badge>
                                                        ))}
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                                {opportunity.link && (
                                                  <Button size="sm" asChild>
                                                    <a href={opportunity.link} target="_blank" rel="noopener noreferrer">
                                                      <ExternalLink className="w-3 h-3 mr-1" />
                                                      Apply
                                                    </a>
                                                  </Button>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Funding & Financial Support */}
                                    {((primaryPathway.fundingOptions && primaryPathway.fundingOptions.length > 0) || 
                                      (guidance.crossCuttingResources?.generalFunding && guidance.crossCuttingResources.generalFunding.length > 0)) && (
                                      <div>
                                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                          <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                                          Funding & Financial Support
                                        </h4>
                                        <p className="text-sm text-gray-600 mb-4">
                                          Available funding schemes and financial assistance
                                        </p>
                                        
                                        <div className="grid gap-4">
                                          {/* Primary pathway funding */}
                                          {primaryPathway.fundingOptions?.map((funding, index) => (
                                            <div key={`primary-${index}`} className="border border-gray-200 rounded-lg p-4 bg-white">
                                              <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                  <h5 className="font-semibold text-gray-900">{funding.name}</h5>
                                                  <p className="text-sm text-gray-600 mt-1">{funding.description}</p>
                                                  <div className="flex items-center mt-3 space-x-4 text-sm">
                                                    <span className="font-medium text-green-600 flex items-center">
                                                      <DollarSign className="w-3 h-3 mr-1" />
                                                      {funding.amount}
                                                    </span>
                                                  </div>
                                                  <div className="text-sm text-gray-600 mt-2">
                                                    <strong>Eligibility:</strong> {Array.isArray(funding.eligibility) ? funding.eligibility.join(', ') : funding.eligibility}
                                                  </div>
                                                </div>
                                                {funding.link && (
                                                  <Button size="sm" variant="outline" asChild>
                                                    <a href={funding.link} target="_blank" rel="noopener noreferrer">
                                                      <ExternalLink className="w-3 h-3 mr-1" />
                                                      Apply
                                                    </a>
                                                  </Button>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                          
                                          {/* General funding */}
                                          {guidance.crossCuttingResources?.generalFunding?.slice(0, 2).map((funding, index) => (
                                            <div key={`general-${index}`} className="border border-gray-200 rounded-lg p-4 bg-white">
                                              <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                  <h5 className="font-semibold text-gray-900">{funding.name}</h5>
                                                  <p className="text-sm text-gray-600 mt-1">{funding.description}</p>
                                                  <div className="flex items-center mt-3 space-x-4 text-sm">
                                                    <span className="font-medium text-green-600 flex items-center">
                                                      <DollarSign className="w-3 h-3 mr-1" />
                                                      {funding.amount}
                                                    </span>
                                                  </div>
                                                  <div className="text-sm text-gray-600 mt-2">
                                                    <strong>Eligibility:</strong> {Array.isArray(funding.eligibility) ? funding.eligibility.join(', ') : funding.eligibility}
                                                  </div>
                                                </div>
                                                {funding.link && (
                                                  <Button size="sm" variant="outline" asChild>
                                                    <a href={funding.link} target="_blank" rel="noopener noreferrer">
                                                      <ExternalLink className="w-3 h-3 mr-1" />
                                                      Apply
                                                    </a>
                                                  </Button>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                );
                              })()
                            ) : (
                              <div className="text-center py-8 text-gray-500">
                                <Lightbulb className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                <p>Loading learning resources...</p>
                              </div>
                            )}
                          </TabsContent>

                          <TabsContent value="action" className="space-y-6">
                            {careerGuidanceData.has(exploration.threadId) ? (
                              (() => {
                                const guidance = careerGuidanceData.get(exploration.threadId)!;
                                const actionPlan = guidance.actionPlan;
                                
                                return (
                                  <>
                                    {/* This Week - Quick Wins */}
                                    <div>
                                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <Clock className="w-5 h-5 mr-2 text-green-600" />
                                        This Week - Quick Wins
                                      </h4>
                                      <p className="text-sm text-gray-600 mb-4">
                                        Immediate actions you can take right now
                                      </p>
                                      
                                      <div className="space-y-3">
                                        {actionPlan?.thisWeek?.map((action, index) => (
                                          <div key={index} className="border border-green-200 rounded-lg p-4 bg-green-50">
                                            <div className="flex items-start">
                                              <CheckCircle className="w-5 h-5 mr-3 mt-0.5 text-green-600 flex-shrink-0" />
                                              <span className="text-sm font-medium text-gray-900">{action}</span>
                                            </div>
                                          </div>
                                        )) || (
                                          <p className="text-gray-500 text-sm">Action plan is being generated...</p>
                                        )}
                                      </div>
                                    </div>

                                    {/* This Month & Next 3 Months */}
                                    <div className="grid md:grid-cols-2 gap-6">
                                      <div>
                                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                          <Clock className="w-5 h-5 mr-2 text-blue-600" />
                                          This Month
                                        </h4>
                                        <div className="space-y-3">
                                          {actionPlan?.thisMonth?.map((action, index) => (
                                            <div key={index} className="flex items-start">
                                              <CheckCircle className="w-4 h-4 mr-3 mt-0.5 text-blue-600 flex-shrink-0" />
                                              <span className="text-sm text-gray-700">{action}</span>
                                            </div>
                                          )) || <div className="text-gray-500 text-sm">Monthly actions being planned...</div>}
                                        </div>
                                      </div>

                                      <div>
                                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                          <Clock className="w-5 h-5 mr-2 text-purple-600" />
                                          Next 3 Months
                                        </h4>
                                        <div className="space-y-3">
                                          {actionPlan?.next3Months?.map((action, index) => (
                                            <div key={index} className="flex items-start">
                                              <CheckCircle className="w-4 h-4 mr-3 mt-0.5 text-purple-600 flex-shrink-0" />
                                              <span className="text-sm text-gray-700">{action}</span>
                                            </div>
                                          )) || <div className="text-gray-500 text-sm">Long-term actions being planned...</div>}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Quick Access Resources */}
                                    <div>
                                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <Target className="w-5 h-5 mr-2 text-indigo-600" />
                                        Quick Access Resources
                                      </h4>
                                      <p className="text-sm text-gray-600 mb-4">
                                        Essential links to get started immediately
                                      </p>
                                      
                                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                        <Button variant="outline" size="sm" asChild>
                                          <a href="https://www.gov.uk/volunteering" target="_blank" rel="noopener noreferrer">
                                            <Users className="w-4 h-4 mr-2" />
                                            Find Volunteer Roles
                                          </a>
                                        </Button>
                                        <Button variant="outline" size="sm" asChild>
                                          <a href="https://find-postgraduate-study.ac.uk" target="_blank" rel="noopener noreferrer">
                                            <BookOpen className="w-4 h-4 mr-2" />
                                            University Courses
                                          </a>
                                        </Button>
                                        <Button variant="outline" size="sm" asChild>
                                          <a href="https://www.gov.uk/apprenticeships-guide" target="_blank" rel="noopener noreferrer">
                                            <GraduationCap className="w-4 h-4 mr-2" />
                                            Apprenticeships
                                          </a>
                                        </Button>
                                        <Button variant="outline" size="sm" asChild>
                                          <a href="https://nationalcareers.service.gov.uk" target="_blank" rel="noopener noreferrer">
                                            <Target className="w-4 h-4 mr-2" />
                                            Career Guidance
                                          </a>
                                        </Button>
                                        <Button variant="outline" size="sm" asChild>
                                          <a href="https://nationalcareers.service.gov.uk/explore-careers/job-sector" target="_blank" rel="noopener noreferrer">
                                            <Lightbulb className="w-4 h-4 mr-2" />
                                            Job Market Info
                                          </a>
                                        </Button>
                                        <Button variant="outline" size="sm" asChild>
                                          <a href="https://www.gov.uk/browse/working" target="_blank" rel="noopener noreferrer">
                                            <Briefcase className="w-4 h-4 mr-2" />
                                            Working in UK
                                          </a>
                                        </Button>
                                      </div>
                                    </div>
                                  </>
                                );
                              })()
                            ) : (
                              <div className="text-center py-8 text-gray-500">
                                <Play className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                <p>Loading action plan...</p>
                              </div>
                            )}
                          </TabsContent>
                        </Tabs>
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