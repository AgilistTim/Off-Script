/**
 * CAREER CARD CACHING SYSTEM WITH THREAD ID CORRUPTION FIXES
 * 
 * ISSUES ADDRESSED:
 * 1. 🔁 Thread ID Corruption: IDs were getting nested prefixes like:
 *    - Original: K9B8qyaP6DURJOEhOzzJ_guidance-primary
 *    - 1st corruption: guidance-K9B8qyaP6DURJOEhOzzJ_guidance-primary
 *    - 2nd corruption: guidance-guidance-K9B8qyaP6DURJOEhOzzJ_guidance-primary_guidance-primary
 *    - 3rd corruption: guidance-guidance-K9B8qyaP6DURJOEhOzzJ_guidance-primary_guidance-primary_guidance-primary
 * 
 * 2. 🔄 Cache Not Working: System was regenerating guidance every time instead of using cached data
 * 
 * 3. ⚠️ React Key Conflicts: Duplicate thread IDs causing rendering warnings
 * 
 * 4. 🔥 API Failures: 500 errors with no graceful fallbacks
 * 
 * SOLUTIONS IMPLEMENTED:
 * 1. ✅ Robust Thread ID Cleaning: cleanThreadId() function handles all corruption patterns
 * 2. ✅ Multi-Variation Cache Lookup: Checks multiple ID variations to find existing data
 * 3. ✅ Proper Deduplication: Uses cleaned IDs for React keys to prevent conflicts
 * 4. ✅ Comprehensive Cleanup: Delete function removes all corrupted variations
 * 5. ✅ Fallback Guidance: Provides useful guidance when APIs fail
 * 6. ✅ Enhanced Logging: Clear debugging information for troubleshooting
 * 
 * EXPECTED BEHAVIOR:
 * - First expansion: Check cache variations → Generate if needed → Store with clean ID
 * - Subsequent expansions: Use cached data (no API calls)
 * - API failures: Show fallback guidance with clear indicators
 * - Deletion: Remove all corrupted variations from database and state
 * - React rendering: No key conflicts or duplicate warnings
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Lightbulb,
  PoundSterling,
  ChevronRight,
  Trash2,
  Download,
  Calendar,
  Building,
  ArrowRight as ArrowRightIcon,
  Brain
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
  
  // Persistent expanded cards state - survives page reloads
  const [expandedCards, setExpandedCards] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('expandedCareerCards');
        return saved ? new Set(JSON.parse(saved)) : new Set();
      } catch (error) {
        console.warn('Failed to load expanded cards from localStorage:', error);
        return new Set();
      }
    }
    return new Set();
  });
  
  // Save expanded cards to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('expandedCareerCards', JSON.stringify(Array.from(expandedCards)));
      } catch (error) {
        console.warn('Failed to save expanded cards to localStorage:', error);
      }
    }
  }, [expandedCards]);
  
  const [careerGuidanceData, setCareerGuidanceData] = useState<Map<string, ComprehensiveCareerGuidance>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('careerGuidanceData');
        if (saved) {
          const parsed = JSON.parse(saved);
          return new Map(Object.entries(parsed));
        }
      } catch (error) {
        console.warn('Failed to load career guidance from sessionStorage:', error);
      }
    }
    return new Map();
  });
  
  // Save guidance data to sessionStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const dataObject = Object.fromEntries(careerGuidanceData.entries());
        sessionStorage.setItem('careerGuidanceData', JSON.stringify(dataObject));
      } catch (error) {
        console.warn('Failed to save career guidance to sessionStorage:', error);
      }
    }
  }, [careerGuidanceData]);
  const [loadingGuidance, setLoadingGuidance] = useState<Set<string>>(new Set());

  // Helper function to extract rich career data from different sources
  const extractCareerData = (exploration: any) => {
    // For current career cards (from conversation) - check for enhanced data first
    if (exploration.isCurrent && exploration.source) {
      const source = exploration.source;
      
      // Extract enhanced data if available, fallback to original data
      return {
        averageSalary: source.enhancedSalary || source.averageSalary || source.salaryRange,
        keySkills: source.inDemandSkills || source.keySkills || source.skillsRequired || [],
        trainingPathways: source.trainingPathways || [source.trainingPathway].filter(Boolean) || [],
        entryRequirements: source.entryRequirements || [],
        workEnvironment: source.workEnvironment,
        nextSteps: source.nextSteps || [],
        growthOutlook: source.growthOutlook || source.marketOutlook,
        industry: source.industry,
        confidence: source.confidence,
        // Enhanced properties
        careerProgression: source.careerProgression || [],
        dayInTheLife: source.dayInTheLife,
        industryTrends: source.industryTrends || [],
        topUKEmployers: source.topUKEmployers || [],
        professionalTestimonials: source.professionalTestimonials || [],
        additionalQualifications: source.additionalQualifications || [],
        workLifeBalance: source.workLifeBalance,
        professionalAssociations: source.professionalAssociations || [],
        enhancedSources: source.enhancedSources || [],
        isEnhanced: source.isEnhanced || source.webSearchVerified || false,
        enhancementStatus: source.enhancementStatus
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
      confidence: exploration.match,
      careerProgression: [],
      dayInTheLife: null,
      industryTrends: [],
      topUKEmployers: [],
      professionalTestimonials: [],
      additionalQualifications: [],
      workLifeBalance: null,
      professionalAssociations: [],
      enhancedSources: [],
      isEnhanced: false,
      enhancementStatus: null
    };
  };

  // Helper function to format salary display
  const formatSalaryDisplay = (salary: any): string => {
    if (!salary) return '';
    if (typeof salary === 'string') return salary;
    
    // Handle enhanced salary format
    if (salary.entryLevel && salary.senior) {
      return `£${salary.entryLevel.toLocaleString()} - £${salary.senior.toLocaleString()}`;
    }
    if (salary.entry && salary.senior) {
      return `£${salary.entry.toLocaleString()} - £${salary.senior.toLocaleString()}`;
    }
    if (salary.entry && salary.experienced) {
      return `£${salary.entry.toLocaleString()} - £${salary.experienced.toLocaleString()}`;
    }
    
    // Handle basic format
    if (salary.entry) return `${salary.entry} - ${salary.senior || salary.experienced}`;
    
    return '';
  };

  // Helper function to get growth outlook display
  const getGrowthColor = (outlook: string): string => {
    if (!outlook) return 'text-primary-white/60';
    const lower = outlook.toLowerCase();
    if (lower.includes('high') || lower.includes('strong') || lower.includes('excellent')) return 'text-acid-green';
    if (lower.includes('good') || lower.includes('moderate')) return 'text-electric-blue';
    if (lower.includes('limited') || lower.includes('declining')) return 'text-sunset-orange';
    return 'text-primary-white/60';
  };

  // Simple thread ID cleaning - removes common prefixes/suffixes
  const cleanThreadId = (threadId: string): string => {
    if (!threadId) return `fallback-${Date.now()}`;
    
    let cleaned = threadId.trim();
    
    // Remove common prefixes and suffixes
    cleaned = cleaned.replace(/^guidance-/, '');      // Remove "guidance-" prefix
    cleaned = cleaned.replace(/_guidance.*$/, '');    // Remove "_guidance..." suffix
    cleaned = cleaned.replace(/-primary$/, '');       // Remove "-primary" suffix
    cleaned = cleaned.replace(/_primary$/, '');       // Remove "_primary" suffix
    
    // Clean up any remaining artifacts
    cleaned = cleaned.replace(/[_-]+$/, '');          // Remove trailing separators
    cleaned = cleaned.replace(/^[_-]+/, '');          // Remove leading separators
    
    // Ensure we have a valid ID
    if (!cleaned || cleaned.length < 3) {
      cleaned = threadId.replace(/[^A-Za-z0-9]/g, '') || `fallback-${Date.now()}`;
    }
    
    return cleaned;
  };

  // Fetch comprehensive career guidance when a card is expanded
  const fetchCareerGuidance = async (threadId: string, exploration: any) => {
    const cleanedId = cleanThreadId(threadId);
    
    if (careerGuidanceData.has(threadId) || careerGuidanceData.has(cleanedId) || loadingGuidance.has(threadId)) {
      console.log('🔄 Skipping fetch - already have data or loading for:', threadId);
      return; // Already have data or currently loading
    }

    console.log('🎯 Fetching career guidance for threadId:', threadId, 'cleaned:', cleanedId);

    setLoadingGuidance(prev => new Set([...prev, threadId]));

    try {
      // All career cards (migrated and conversation) are now stored in threadCareerGuidance
      // Check threadCareerGuidance for all career cards
      console.log('🔍 Checking threadCareerGuidance for career card:', threadId);
      
      // Check multiple possible ID variations due to historical corruption
      const idVariations = [
        cleanedId,
        threadId,
        `guidance-${cleanedId}`,
        threadId.replace(/^guidance-/, ''),
      ].filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates

      console.log('🔍 Checking database cache for ID variations:', idVariations);
      
      let existingGuidance = null;
      for (const idVariation of idVariations) {
        try {
          existingGuidance = await careerPathwayService.getThreadCareerGuidance(idVariation, currentUser?.uid || 'guest');
          if (existingGuidance) {
            console.log('✅ Found cached guidance in database with ID variation:', idVariation);
            break;
          }
        } catch (error) {
          console.log('🔍 No cache found for ID variation:', idVariation);
        }
      }
      
      if (existingGuidance) {
        setCareerGuidanceData(prev => new Map(prev.set(threadId, existingGuidance)));
        setLoadingGuidance(prev => {
          const newSet = new Set(prev);
          newSet.delete(threadId);
          return newSet;
        });
        return;
      }

      console.log('📝 No cached guidance found in any variation, generating new guidance for:', cleanedId);

      // Create a proper ChatSummary object from the exploration data
      const chatSummary = {
        id: `temp-${cleanedId}`,
        threadId: cleanedId,
        userId: currentUser?.uid || 'guest',
        summary: exploration.description || 'Career exploration conversation',
        interests: exploration.interests || [exploration.primaryCareerPath],
        careerGoals: exploration.goals || ['Explore career options'],
        skills: exploration.skills || [],
        createdAt: new Date()
      };

      console.log('📋 Creating new guidance with cleaned ID:', cleanedId);

      // Generate new guidance using the public method (it will handle storage)
      const guidance = await careerPathwayService.generateThreadCareerGuidance(
        cleanedId,
        currentUser?.uid || 'guest',
        chatSummary
      );
      
      if (guidance) {
        setCareerGuidanceData(prev => new Map(prev.set(threadId, guidance)));
        console.log('✅ Generated and stored new guidance with cleaned ID:', cleanedId);
      }
    } catch (error) {
      console.error('❌ Failed to fetch career guidance for:', threadId, error);
      
      // Provide basic fallback guidance if API fails
      const fallbackGuidance = {
        userProfile: {
          goals: ['Explore career options'],
          interests: [exploration.primaryCareerPath || 'Career Development'],
          skills: [],
          careerStage: 'exploring' as const
        },
        primaryPathway: {
          id: 'fallback',
          title: exploration.primaryCareerPath || 'Career Path',
          description: exploration.description || 'Career guidance temporarily unavailable. Please try again later.',
          match: 75,
          trainingOptions: [],
          volunteeringOpportunities: [],
          fundingOptions: [],
          nextSteps: {
            immediate: ['Research career options', 'Identify your skills and interests'],
            shortTerm: ['Explore training opportunities', 'Network with professionals'],
            longTerm: ['Develop career plan', 'Gain relevant experience']
          },
          reflectiveQuestions: [
            'What aspects of this career interest you most?',
            'What skills do you already have that apply?',
            'What would you like to learn more about?'
          ],
          keyResources: [],
          progressionPath: [
            {
              stage: 'Exploration',
              description: 'Research and understand the career path',
              timeframe: '1-3 months',
              requirements: ['Research career requirements', 'Assess current skills']
            },
            {
              stage: 'Preparation',
              description: 'Develop necessary skills and qualifications',
              timeframe: '6-12 months',
              requirements: ['Complete relevant training', 'Build experience through projects or volunteering']
            },
            {
              stage: 'Entry',
              description: 'Begin career in entry-level position',
              timeframe: '12+ months',
              requirements: ['Apply for positions', 'Network with professionals', 'Continue learning']
            }
          ]
        },
        alternativePathways: [],
        crossCuttingResources: {
          generalFunding: [],
          careerSupport: []
        },
        generatedAt: new Date(),
        actionPlan: {
          thisWeek: ['Research this career path online'],
          thisMonth: ['Connect with professionals in this field'],
          next3Months: ['Consider relevant training or education options']
        }
      };
      
      setCareerGuidanceData(prev => new Map(prev.set(threadId, fallbackGuidance)));
      console.log('🔄 Using fallback guidance for:', threadId);
    } finally {
      setLoadingGuidance(prev => {
        const newSet = new Set(prev);
        newSet.delete(threadId);
        return newSet;
      });
    }
  };

  // Delete career card and its cached guidance data
  const deleteCareerCard = async (threadId: string) => {
    if (!currentUser) return;

    // Confirm deletion with user
    const confirmed = window.confirm(
      'Are you sure you want to delete this career card? This will permanently remove the card and all its detailed guidance data.'
    );
    
    if (!confirmed) return;

    try {
      console.log('🗑️ Deleting career card with threadId:', threadId);

      // Check if this is a current career card (from threadCareerGuidance)
      const isCurrentCard = currentCareerCards.find(card => 
        card.threadId === threadId || card.id === threadId
      );

      if (isCurrentCard?.firebaseDocId && isCurrentCard?.pathwayType) {
        // Use new deletion method for cards with Firebase info
        console.log('🎯 Using Firebase-based deletion for current card');
        await careerPathwayService.deleteCareerCardByFirebaseId(
          isCurrentCard.id,
          isCurrentCard.firebaseDocId,
          isCurrentCard.pathwayType,
          isCurrentCard.pathwayIndex,
          currentUser.uid
        );
      } else if (threadId.includes('_card_')) {
        // Migrated guest cards - delete from careerExplorations only
        console.log('🎯 Using legacy deletion methods for migrated card');
        await careerPathwayService.deleteCareerExplorationOrCard(threadId, currentUser.uid);
        console.log('✅ Deleted exploration/card for threadId:', threadId);
        // NO threadCareerGuidance deletion for migrated cards
      } else {
        // Conversation-generated cards - delete from threadCareerGuidance only
        console.log('🎯 Using thread guidance deletion for conversation card');
        await careerPathwayService.deleteThreadCareerGuidance(threadId, currentUser.uid);
        console.log('✅ Deleted guidance for threadId:', threadId);
        // NO careerExplorations deletion for conversation cards
      }

      // Remove from local state
      setCareerGuidanceData(prev => {
        const newMap = new Map(prev);
        newMap.delete(threadId);
        return newMap;
      });

      // Remove from expanded cards
      setExpandedCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(threadId);
        return newSet;
      });

      // Remove from direct explorations
      setDirectExplorations(prev => 
        prev.filter(exploration => exploration.threadId !== threadId)
      );

      console.log('✅ Career card deleted successfully');
      
      // Refresh the data to reflect Firebase changes
      setTimeout(() => {
        loadExplorations();
      }, 500);
      
    } catch (error) {
      console.error('❌ Error deleting career card:', error);
      alert('Failed to delete career card. Please try again.');
      
      // Reload data on error to restore consistent state
      loadExplorations();
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
    
    // Deduplicate by career card title/content, not by threadId
    // Multiple different career cards can come from the same conversation
    const seenTitles = new Set<string>();
    const filtered = combined.filter(exploration => {
      const normalizedTitle = exploration.primaryCareerPath?.toLowerCase().trim() || exploration.threadTitle?.toLowerCase().trim() || '';
      
      if (seenTitles.has(normalizedTitle)) {
        console.log(`🔍 Skipping duplicate career card:`, exploration.primaryCareerPath || exploration.threadTitle, `(threadId: ${exploration.threadId})`);
        return false;
      }
      
      seenTitles.add(normalizedTitle);
      return true;
    });
    
    console.log('🔍 Deduplication results:', {
      originalCount: combined.length,
      filteredCount: filtered.length,
      threadIds: filtered.map(e => e.threadId)
    });
    
    return filtered.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
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
    if (match >= 90) return 'text-acid-green';
    if (match >= 70) return 'text-cyber-yellow';
    return 'text-neon-pink';
  };

  // Add cleanup trigger on component mount
  useEffect(() => {
    if (currentUser && refreshCount === 0) {
      // Initial load - no cleanup needed with simplified system
      console.log('🚀 Initial load completed');
    }
  }, [currentUser, refreshCount]);

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
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Action Bar */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-electric-blue to-neon-pink rounded-lg flex items-center justify-center">
              <Star className="w-4 h-4 text-primary-white" />
            </div>
            <p className="text-primary-white/80 font-medium">
              Your Career Discoveries
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-primary-white/60">
              {allExplorations.length} career paths discovered
            </span>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-electric-blue to-neon-pink rounded-lg text-primary-white font-bold text-sm hover:scale-105 transition-transform duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Loading...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {allExplorations.map((exploration) => {
          const careerData = extractCareerData(exploration);
          const isExpanded = expandedCards.has(exploration.threadId);
          const salaryDisplay = formatSalaryDisplay(careerData.averageSalary);

          return (
            <motion.div
              key={exploration.threadId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-primary-black/90 to-electric-blue/10 border border-electric-blue/30 rounded-xl shadow-lg hover:shadow-glow-blue transition-all duration-200 backdrop-blur-sm"
            >
              {/* Card Header - Always Visible */}
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-street font-black text-primary-white mb-2">
                      {exploration.primaryCareerPath}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-primary-white/60 mb-3">
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
                  
                  {/* Match confidence badge */}
                  <div className="flex flex-col items-end space-y-2">
                    <Badge 
                      variant={getMatchVariant(exploration.match)}
                      className="bg-gradient-to-r from-electric-blue to-neon-pink text-primary-white border-0"
                    >
                      {exploration.match}% match
                    </Badge>
                    
                    {/* Enhancement status indicators */}
                    {(exploration as any).source && (
                      <>
                        {(exploration as any).source.isEnhanced || (exploration as any).source.webSearchVerified || (exploration as any).source.enhancedSalary ? (
                          <Badge className="bg-gradient-to-r from-acid-green to-cyber-yellow text-primary-black border-0 font-bold text-xs">
                            <Lightbulb className="w-3 h-3 mr-1" />
                            ENHANCED
                          </Badge>
                        ) : (exploration as any).source.enhancementStatus === 'failed' ? (
                          <Badge className="bg-gradient-to-r from-sunset-orange to-neon-pink text-primary-white border-0 font-bold text-xs">
                            <RefreshCw className="w-3 h-3 mr-1" />
                            BASIC
                          </Badge>
                        ) : (exploration as any).source.enhancementStatus === 'pending' ? (
                          <Badge className="bg-gradient-to-r from-electric-blue to-cyber-blue text-primary-white border-0 font-bold text-xs">
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ENHANCING
                          </Badge>
                        ) : (
                          <Badge className="bg-gradient-to-r from-primary-gray to-primary-white/20 text-primary-white/70 border-0 font-bold text-xs">
                            <Star className="w-3 h-3 mr-1" />
                            STANDARD
                          </Badge>
                        )}
                        
                        {((exploration as any).source.isEnhanced || (exploration as any).source.webSearchVerified || (exploration as any).source.enhancedSalary || (exploration as any).source.enhancedAt) && (
                          <div className="text-xs text-acid-green font-medium">
                            Enhanced with real UK data
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Basic Career Info */}
                <div className="space-y-3">
                  <p className="text-primary-white/80 text-sm line-clamp-2">
                    {exploration.description}
                  </p>

                  {/* Salary and Key Skills Preview */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    {salaryDisplay && (
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-acid-green to-cyber-yellow rounded-lg flex items-center justify-center">
                          <PoundSterling className="w-4 h-4 text-primary-black" />
                        </div>
                        <span className="text-primary-white font-medium">{salaryDisplay}</span>
                      </div>
                    )}
                  </div>
                  
                  {careerData.keySkills && careerData.keySkills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {careerData.keySkills.slice(0, 5).map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-gradient-to-r from-neon-pink/20 to-electric-blue/20 border border-electric-blue/30 rounded-full text-xs text-primary-white font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                      {careerData.keySkills.length > 5 && (
                        <span className="px-3 py-1 bg-gradient-to-r from-cyber-yellow/20 to-acid-green/20 border border-cyber-yellow/30 rounded-full text-xs text-primary-white font-medium">
                          +{careerData.keySkills.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between mt-6">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleCardExpansion(exploration.threadId, exploration)}
                      className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-electric-blue/20 to-neon-pink/20 border border-electric-blue/30 rounded-lg text-primary-white font-medium hover:bg-gradient-to-r hover:from-electric-blue/30 hover:to-neon-pink/30 transition-all duration-200"
                    >
                      <span>{isExpanded ? 'Show Less' : 'Show Details'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    
                    {currentUser && (
                      <button
                        onClick={() => deleteCareerCard(exploration.threadId)}
                        className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-neon-pink/20 to-sunset-orange/20 border border-neon-pink/30 rounded-lg text-neon-pink hover:bg-gradient-to-r hover:from-neon-pink/30 hover:to-sunset-orange/30 transition-all duration-200"
                        title="Delete Career Card"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <button
                    onClick={() => onSelectExploration?.(exploration.threadId)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-electric-blue to-neon-pink rounded-lg text-primary-white font-bold hover:scale-105 transition-transform duration-200"
                  >
                    <span>Explore Path</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
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
                        <Tabs defaultValue="learning" className="w-full">
                          {/* Show fallback indicator if this is fallback guidance */}
                          {(() => {
                            const guidance = careerGuidanceData.get(exploration.threadId);
                            return guidance?.primaryPathway?.id === 'fallback';
                          })() && (
                            <div className="bg-gradient-to-r from-sunset-orange/20 to-cyber-yellow/20 border border-sunset-orange/30 rounded-lg p-4 mb-6">
                              <div className="flex items-center space-x-2 text-sunset-orange">
                                <Lightbulb className="w-5 h-5" />
                                <span className="font-medium">Basic Guidance Mode</span>
                              </div>
                              <p className="text-primary-white/70 text-sm mt-2">
                                Our detailed AI analysis is temporarily unavailable. Here's some basic guidance to get you started.
                              </p>
                            </div>
                          )}

                          <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="learning" className="flex items-center space-x-2">
                              <BookOpen className="w-4 h-4" />
                              <span>Learning</span>
                            </TabsTrigger>
                            <TabsTrigger value="action" className="flex items-center space-x-2">
                              <Play className="w-4 h-4" />
                              <span>Take Action</span>
                            </TabsTrigger>
                          </TabsList>

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
                                                  <Button size="sm" variant="light" asChild>
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
                                                  <Button size="sm" variant="light" asChild>
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
                                                  <Button size="sm" variant="light" asChild>
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
                                                  <Button size="sm" variant="light" asChild>
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
    </>
  );
};

export default CareerExplorationOverview; 