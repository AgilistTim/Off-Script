import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppStore } from '../stores/useAppStore';
import { useChatContext } from '../context/ChatContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Sparkles, 
  Bell, 
  X, 
  GraduationCap, 
  Target, 
  BookOpen, 
  Play,
  Zap,
  Crown,
  Rocket,
  Star,
  Users,
  TrendingUp,
  PoundSterling,
  ArrowRight,
  RefreshCw,
  Trash2,
  Loader2,
  Heart,
  Building,
  BarChart3,
  Shield,
  MapPin
} from 'lucide-react';
import { getVideoById } from '../services/videoService';
import VideoCard from '../components/video/VideoCard';
import CareerGuidancePanel from '../components/career-guidance/CareerGuidancePanel';
import CareerExplorationOverview from '../components/career-guidance/CareerExplorationOverview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { firestore } from '../services/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { CareerPathwayService } from '../services/careerPathwayService';
import { DashboardCareerCard } from '../services/dashboardCareerEnhancementService';
import { dashboardCareerEnhancer } from '../services/dashboardCareerEnhancer';
import type { CareerCard } from '../types/careerCard';
import UnifiedCareerCard from '../components/dashboard/UnifiedCareerCard';
import { CareerVoiceDiscussionModal } from '../components/career-guidance/CareerVoiceDiscussionModal';

// Notification component with street-art styling
interface NotificationProps {
  message: string;
  type: 'info' | 'success' | 'error';
  onDismiss: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, type, onDismiss }) => {
  useEffect(() => {
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [onDismiss]);
  
  const bgGradient = type === 'success' 
    ? 'bg-gradient-to-r from-acid-green/20 to-cyber-yellow/20 border-acid-green/50' 
    : type === 'error'
    ? 'bg-gradient-to-r from-neon-pink/20 to-sunset-orange/20 border-neon-pink/50'
    : 'bg-gradient-to-r from-electric-blue/20 to-neon-pink/20 border-electric-blue/50';
  
  const textColor = type === 'success'
    ? 'text-acid-green'
    : type === 'error'
    ? 'text-neon-pink'
    : 'text-electric-blue';
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      className={`fixed top-4 right-4 z-50 p-6 rounded-2xl shadow-2xl border-2 ${bgGradient} max-w-md backdrop-blur-lg`}
    >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gradient-to-br from-electric-blue to-neon-pink rounded-full flex items-center justify-center mr-3">
            <Bell size={16} className="text-primary-white" />
          </div>
          <p className={`${textColor} font-bold`}>{message}</p>
        </div>
        <button 
          onClick={onDismiss}
          className="ml-4 text-primary-white/60 hover:text-primary-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    </motion.div>
  );
};

// Video card wrapper for Dashboard that fetches video data
interface DashboardVideoCardProps {
  videoId: string;
}

const DashboardVideoCard: React.FC<DashboardVideoCardProps> = ({ videoId }) => {
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const videoData = await getVideoById(videoId);
        setVideo(videoData);
      } catch (error) {
        console.error('Error fetching video:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [videoId]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-electric-blue/10 to-neon-pink/10 rounded-2xl overflow-hidden animate-pulse h-48 border border-electric-blue/20"></div>
    );
  }

  if (!video) {
    return null;
  }

  return <VideoCard video={video} />;
};

const Dashboard: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const location = useLocation();
  const { 
    currentThread, 
    currentSummary, 
    careerGuidance,
    careerGuidanceLoading,
    careerGuidanceError,
    refreshCareerGuidance,
    selectThread 
  } = useChatContext();
  
  const [searchParams] = useSearchParams();
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [recommendedVideos, setRecommendedVideos] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  
  // New state for migrated data
  const [selectedCareerCard, setSelectedCareerCard] = useState<any | null>(null);
  const [showCareerCardModal, setShowCareerCardModal] = useState(false);

  // New state for structured career guidance
  const [structuredGuidance, setStructuredGuidance] = useState<{
    primaryPathway: any | null;
    alternativePathways: any[];
    totalPathways: number;
  }>({ primaryPathway: null, alternativePathways: [], totalPathways: 0 });
  const [showAllAlternatives, setShowAllAlternatives] = useState(false);
  const [dataRefreshKey, setDataRefreshKey] = useState(0); // Force refresh trigger

  // Voice discussion modal state
  const [voiceDiscussionModal, setVoiceDiscussionModal] = useState<{
    isOpen: boolean;
    careerData: any | null;
    discussionContext: any | null;
    sessionId: string | null;
    isPrimary: boolean;
  }>({
    isOpen: false,
    careerData: null,
    discussionContext: null,
    sessionId: null,
    isPrimary: true
  });

  // Comparison modal state
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [comparisonModalData, setComparisonModalData] = useState<{
    alternative: any | null;
    primary: any | null;
  }>({
    alternative: null,
    primary: null
  });
  
  // Cache for career card details to reduce API calls
  const [careerCardCache, setCareerCardCache] = useState<Map<string, any>>(new Map());
  
  // Clear message after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const dismissNotification = () => {
    setNotification(null);
  };

  // Handle migration completion from router state
  useEffect(() => {
    const locationState = location.state as any;
    if (locationState?.migrationComplete) {
      console.log('🎉 Migration detected, refreshing dashboard data...');
      
      // Clear location state to prevent repeated refreshes
      window.history.replaceState({}, document.title);
      
      // Add small delay to allow Firebase indexing to complete after migration
      setTimeout(() => {
        // Force refresh all data by incrementing the refresh key
        setDataRefreshKey(prev => prev + 1);
        console.log('🔄 Delayed dashboard refresh triggered after migration');
      }, 1000); // 1 second delay for Firebase indexing
      
      // Show welcome notification
      if (locationState.showWelcome && locationState.migrationResult) {
        const { dataTransferred } = locationState.migrationResult;
        let welcomeMessage = 'Welcome! ';
        
        if (dataTransferred.careerCards > 0) {
          welcomeMessage += `Your ${dataTransferred.careerCards} career discoveries have been saved. `;
        }
        if (dataTransferred.conversationMessages > 0) {
          welcomeMessage += `Your conversation history has been preserved. `;
        }
        
        setNotification({
          message: welcomeMessage,
          type: 'success'
        });
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
          setNotification(null);
        }, 5000);
      }
    }
  }, [location.state]);



  // Enhanced method to check for migration completion and show appropriate notifications
  const checkForMigrationData = useCallback(async () => {
    if (!currentUser || loading) return;
    
    try {
      // Check if user has migration data that might not be immediately visible
      const careerPathwayService = new CareerPathwayService();
      const explorations = await careerPathwayService.getUserCareerExplorations(currentUser.uid);
      
      // Get current career cards count directly to avoid dependency
      const currentCards = await careerPathwayService.getCurrentCareerCards(currentUser.uid);
      const hasThreadCards = currentCards.length > 0;
      const hasMigratedCards = explorations.some(exp => exp.threadId.includes('_card_'));
      
      // Check if user has migrated data but no visible career cards
      if (explorations.length > 0 && !hasThreadCards && !hasMigratedCards) {
        setNotification({
          message: 'Your migrated career discoveries are being processed. They should appear within a few minutes. Try refreshing if they don\'t show up.',
          type: 'info'
        });
      }
    } catch (error) {
      console.warn('Could not check migration data status:', error);
    }
  }, [currentUser, loading]); // Removed state dependencies that cause infinite loops

  // ❌ REMOVED: Infinite loop enhancement checker - data is already enhanced

  // Enhanced career card fetching with caching and progressive enhancement
  const fetchCareerCardDetails = useCallback(async (threadId: string) => {
    if (!currentUser || loading) {
      return;
    }

    // Check cache first
    if (careerCardCache.has(threadId)) {
      const cachedCard = careerCardCache.get(threadId);
      setSelectedCareerCard(cachedCard);
      setShowCareerCardModal(true);
      console.log('✅ Loaded cached career card:', cachedCard);
      
      // Still trigger enhancement if card isn't already enhanced
      if (!cachedCard.enhancement?.status || cachedCard.enhancement.status !== 'completed') {
        console.log('🔄 Cached card needs enhancement, triggering progressive enhancement...');
        
        // Convert CareerPathway to CareerCard format for enhancement
        const cachedCardForEnhancement: CareerCard = {
          ...cachedCard,
          nextSteps: cachedCard.nextSteps ? [
            ...(cachedCard.nextSteps.immediate || []),
            ...(cachedCard.nextSteps.shortTerm || []),
            ...(cachedCard.nextSteps.longTerm || [])
          ] : undefined
        };
        
        dashboardCareerEnhancer.enhanceDashboardCards([cachedCardForEnhancement])
          .then(enhancedCards => {
            if (enhancedCards[0] && enhancedCards[0].enhancement?.status === 'completed') {
              console.log('✅ Enhanced cached card with real-time data');
              setSelectedCareerCard(enhancedCards[0]);
              // Update cache with enhanced data
              setCareerCardCache(prev => new Map(prev.set(threadId, enhancedCards[0])));
            }
          })
          .catch(error => console.warn('⚠️ Enhancement failed for cached card:', error));
      }
      return;
    }

    try {
      // All career cards are now stored in threadCareerGuidance with full details
      // Try to get the career guidance data which contains the detailed information
              const careerPathwayService = new CareerPathwayService();
        const careerGuidance = await careerPathwayService.getThreadCareerGuidance(threadId, currentUser.uid);
      
      if (careerGuidance?.primaryPathway) {
        // Use the primary pathway as the career card data
        const careerCard = careerGuidance.primaryPathway;
        
        // Cache the basic result and show immediately (non-blocking)
        setCareerCardCache(prev => new Map(prev.set(threadId, careerCard)));
        setSelectedCareerCard(careerCard);
        setShowCareerCardModal(true);
        console.log('✅ Loaded and cached career card details:', careerCard);

        // NEW: Trigger progressive enhancement after basic card is displayed
        console.log('🚀 Starting progressive enhancement with Perplexity real-time data...');
        
        // Convert CareerPathway to CareerCard format for enhancement
        const careerCardForEnhancement: CareerCard = {
          ...careerCard,
          // Handle nextSteps conversion from CareerPathway format to CareerCard format
          nextSteps: careerCard.nextSteps ? [
            ...(careerCard.nextSteps.immediate || []),
            ...(careerCard.nextSteps.shortTerm || []),
            ...(careerCard.nextSteps.longTerm || [])
          ] : undefined
        };
        
        dashboardCareerEnhancer.enhanceDashboardCards([careerCardForEnhancement])
          .then(enhancedCards => {
            if (enhancedCards[0] && enhancedCards[0].enhancement?.status === 'completed') {
              console.log('✅ Successfully enhanced career card with real-time UK market data');
              setSelectedCareerCard(enhancedCards[0]);
              // Update cache with enhanced data
              setCareerCardCache(prev => new Map(prev.set(threadId, enhancedCards[0])));
              
              // CRITICAL FIX: Update structuredGuidance state to reflect enhanced data
              setStructuredGuidance(prev => ({
                ...prev,
                primaryPathway: {
                  ...prev.primaryPathway,
                  ...enhancedCards[0],
                  isEnhanced: true,
                  perplexityData: enhancedCards[0].perplexityData,
                  enhancement: enhancedCards[0].enhancement
                }
              }));
              
              console.log('🔍 DASHBOARD DEBUG - Updated structuredGuidance with enhanced data:', {
                hasPrimary: !!enhancedCards[0],
                primaryTitle: enhancedCards[0].title,
                primaryIsEnhanced: true,
                primaryHasEnhancedSalary: !!enhancedCards[0].perplexityData?.verifiedSalaryRanges,
                primaryHasPerplexityData: !!enhancedCards[0].perplexityData,
                enhancementStatus: enhancedCards[0].enhancement?.status
              });
            }
          })
          .catch(error => {
            console.warn('⚠️ Enhancement failed, but basic card functionality preserved:', error);
            // Enhancement failure doesn't break the user experience
            // Basic card remains functional
          });
      } else {
        setNotification({
          message: 'Could not load career card details. The data may still be processing.',
          type: 'info'
        });
      }
    } catch (error) {
      console.error('Error loading career card:', error);
      setNotification({
        message: 'Error loading career card details.',
        type: 'info'
      });
    }
  }, [currentUser, loading, careerCardCache]); // Added careerCardCache dependency

  // AI Discussion Handlers - Enhanced with Career-Aware Voice Service
  const handleAskAIAboutPrimary = async () => {
    if (!currentUser || !structuredGuidance.primaryPathway) return;
    
    try {
      console.log('🤖 Starting AI discussion about primary pathway:', structuredGuidance.primaryPathway.title);
      
      // Import the career-aware voice service
      const { careerAwareVoiceService } = await import('../services/careerAwareVoiceService');
      
      // Create rich context for the primary pathway discussion
      const context = await careerAwareVoiceService.createContextFromFirebaseData(
        currentUser.uid,
        structuredGuidance.primaryPathway,
        true // isPrimary
      );
      
      // Start the career-aware discussion
      const result = await careerAwareVoiceService.startCareerDiscussion(context);
      
      console.log('✅ Career discussion initialized:', result);
      
      // Open voice discussion modal
      setVoiceDiscussionModal({
        isOpen: true,
        careerData: structuredGuidance.primaryPathway,
        discussionContext: context,
        sessionId: result.sessionId,
        isPrimary: true
      });
      
    } catch (error) {
      console.error('❌ Failed to start AI discussion:', error);
      setNotification({
        message: 'Failed to start AI discussion. Please try again.',
        type: 'error'
      });
    }
  };

  const handleAskAIAboutAlternative = async (pathway: any) => {
    if (!currentUser) return;
    
    try {
      console.log('🤖 Starting AI discussion about alternative pathway:', pathway.title);
      
      // Import the career-aware voice service
      const { careerAwareVoiceService } = await import('../services/careerAwareVoiceService');
      
      // Create rich context for the alternative pathway discussion
      const context = await careerAwareVoiceService.createContextFromFirebaseData(
        currentUser.uid,
        pathway,
        false // isPrimary
      );
      
      // Start the career-aware discussion
      const result = await careerAwareVoiceService.startCareerDiscussion(context);
      
      console.log('✅ Alternative career discussion initialized:', result);
      
      // Open voice discussion modal
      setVoiceDiscussionModal({
        isOpen: true,
        careerData: pathway,
        discussionContext: context,
        sessionId: result.sessionId,
        isPrimary: false
      });
      
    } catch (error) {
      console.error('❌ Failed to start alternative AI discussion:', error);
      setNotification({
        message: 'Failed to start AI discussion. Please try again.',
        type: 'error'
      });
    }
  };

  const handleCompareToPrimary = async (pathway: any) => {
    if (!currentUser || !structuredGuidance.primaryPathway) return;
    
    try {
      console.log('⚖️ Starting AI comparison:', pathway.title, 'vs', structuredGuidance.primaryPathway.title);
      
      // Import the career-aware voice service
      const { careerAwareVoiceService } = await import('../services/careerAwareVoiceService');
      
      // Create comparison context
      const context = await careerAwareVoiceService.createContextFromFirebaseData(
        currentUser.uid,
        pathway,
        false // isPrimary
      );
      
      // Enhance with comparison focus
      await careerAwareVoiceService.enhanceDiscussion(context.technical.sessionId, {
        discussionConfig: {
          focusArea: 'comparison',
          comparisonTarget: structuredGuidance.primaryPathway
        }
      });
      
      // Start the comparison discussion
      const result = await careerAwareVoiceService.startCareerDiscussion(context);
      
      console.log('✅ Career comparison discussion initialized:', result);
      
      // Open comparison voice discussion modal
      setComparisonModalData({
        alternative: pathway,
        primary: structuredGuidance.primaryPathway
      });
      setShowComparisonModal(true);
      
      setNotification({
        message: `⚖️ AI comparison ready: ${pathway.title} vs ${structuredGuidance.primaryPathway.title}!`,
        type: 'success'
      });
      
    } catch (error) {
      console.error('❌ Failed to start comparison discussion:', error);
      setNotification({
        message: 'Failed to start comparison discussion. Please try again.',
        type: 'error'
      });
    }
  };

  const handleExplorePrimary = () => {
    if (structuredGuidance.primaryPathway) {
      // Open the career card modal for detailed view
      setSelectedCareerCard(structuredGuidance.primaryPathway);
      setShowCareerCardModal(true);
    }
  };

  // Voice discussion modal handlers
  const handleCloseVoiceDiscussion = () => {
    setVoiceDiscussionModal({
      isOpen: false,
      careerData: null,
      discussionContext: null,
      sessionId: null,
      isPrimary: true
    });
  };

  // Comparison modal handlers
  const handleCloseComparisonModal = () => {
    setShowComparisonModal(false);
    setComparisonModalData({
      alternative: null,
      primary: null
    });
  };

  // Fetch video recommendations
  const fetchRecommendations = useCallback(async () => {
    if (!currentUser || loading) return;
    
    try {
      // Get Firestore instance safely
  
      
      // Fallback to popular videos if no personalized recommendations
      const videosRef = collection(firestore, 'videos');
      const videosQuery = query(videosRef, orderBy('views', 'desc'), limit(4));
      const videosSnapshot = await getDocs(videosQuery);
      const fallbackVideos = videosSnapshot.docs.map(doc => doc.id);
      
      setRecommendedVideos(fallbackVideos);
      
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setNotification({
        message: 'Unable to load video recommendations',
        type: 'info'
      });
    }
  }, [currentUser, loading]);

  // Stable data fetch on mount and when dataRefreshKey changes
  useEffect(() => {
    if (!currentUser) return;
    
    let isMounted = true; // Prevent state updates if component unmounts
    
    const fetchAllData = async () => {
      if (loading) return; // Prevent concurrent calls
      
      // Check if we already have cached data (unless forced refresh)
      const hasExistingData = structuredGuidance.totalPathways > 0 && recommendedVideos.length > 0;
      if (hasExistingData && dataRefreshKey === 0) {
        console.log('✅ Dashboard: Using cached data, skipping fetch');
        return;
      }
      
      console.log('🔄 Dashboard: Starting data fetch...', { 
        hasExistingData, 
        dataRefreshKey, 
        forcedRefresh: dataRefreshKey > 0 
      });
      setLoading(true);
      
      try {
        // Fetch all data in parallel
        const [
          videosResult,
          currentCardsResult
        ] = await Promise.allSettled([
          // Fetch video recommendations
          (async () => {
        
            const videosRef = collection(firestore, 'videos');
            const videosQuery = query(videosRef, orderBy('views', 'desc'), limit(4));
            const videosSnapshot = await getDocs(videosQuery);
            return videosSnapshot.docs.map(doc => doc.id);
          })(),
          
          // Fetch structured career guidance data
          (async () => {
            console.log('🔍 DASHBOARD DEBUG - Starting structured career guidance fetch for user:', currentUser.uid);
            
            // Force refresh to ensure we get the latest data including enhancements
            const careerPathwayService = new CareerPathwayService();
        const structuredData = await careerPathwayService.forceRefreshStructuredGuidance(currentUser.uid);
            console.log('🔍 DASHBOARD DEBUG - Service returned structured data:', {
              hasPrimary: !!structuredData.primaryPathway,
              primaryTitle: structuredData.primaryPathway?.title,
              primaryIsEnhanced: structuredData.primaryPathway?.isEnhanced,
              primaryHasEnhancedSalary: !!structuredData.primaryPathway?.enhancedSalary,
              primaryHasPerplexityData: !!structuredData.primaryPathway?.perplexityData,
              primaryHasCompensationRewards: !!structuredData.primaryPathway?.compensationRewards,
              alternativesCount: structuredData.alternativePathways.length,
              totalPathways: structuredData.totalPathways
            });
            
            // Debug primary pathway data structure
            if (structuredData.primaryPathway) {
              console.log('🔍 DASHBOARD DEBUG - Primary pathway detailed structure:', {
                title: structuredData.primaryPathway.title,
                isEnhanced: structuredData.primaryPathway.isEnhanced,
                enhancedAt: structuredData.primaryPathway.enhancedAt,
                enhancementSource: structuredData.primaryPathway.enhancementSource,
                hasEnhancedSalary: !!structuredData.primaryPathway.enhancedSalary,
                hasCompensationRewards: !!structuredData.primaryPathway.compensationRewards,
                hasLabourMarketDynamics: !!structuredData.primaryPathway.labourMarketDynamics,
                hasCareerProgression: !!structuredData.primaryPathway.careerProgression,
                hasDayInTheLife: !!structuredData.primaryPathway.dayInTheLife,
                hasIndustryTrends: !!structuredData.primaryPathway.industryTrends,
                enhancedSalaryType: typeof structuredData.primaryPathway.enhancedSalary,
                compensationRewardsType: typeof structuredData.primaryPathway.compensationRewards,
                hasPerplexityData: !!structuredData.primaryPathway.perplexityData,
                perplexityDataKeys: structuredData.primaryPathway.perplexityData ? Object.keys(structuredData.primaryPathway.perplexityData) : [],
                compensationRewardsKeys: structuredData.primaryPathway.compensationRewards ? Object.keys(structuredData.primaryPathway.compensationRewards) : []
              });
              
              // Check if enhanced data is actually present
              if (structuredData.primaryPathway.enhancedSalary) {
                console.log('🔍 DASHBOARD DEBUG - Enhanced salary data found:', structuredData.primaryPathway.enhancedSalary);
              } else {
                console.log('⚠️ DASHBOARD DEBUG - No enhanced salary data found in primary pathway');
              }
              
              if (structuredData.primaryPathway.compensationRewards) {
                console.log('🔍 DASHBOARD DEBUG - Compensation rewards data found:', structuredData.primaryPathway.compensationRewards);
              } else {
                console.log('⚠️ DASHBOARD DEBUG - No compensation rewards data found in primary pathway');
              }
            }
            
            // Debug alternative pathways
            if (structuredData.alternativePathways.length > 0) {
              console.log('🔍 DASHBOARD DEBUG - Alternative pathways structure:', 
                structuredData.alternativePathways.map((pathway, index) => ({
                  index,
                  title: pathway.title,
                  isEnhanced: pathway.isEnhanced,
                  hasEnhancedSalary: !!pathway.enhancedSalary,
                  hasCompensationRewards: !!pathway.compensationRewards
                }))
              );
            }
            
            if (structuredData.totalPathways === 0) {
              console.log('🔄 DASHBOARD DEBUG - No career guidance found on first load - they may still be processing');
              return structuredData;
            }
            
            console.log('✅ DASHBOARD DEBUG - Structured career guidance loaded successfully');
            return structuredData;
          })()
        ]);
        
        // Only update state if component is still mounted
        if (!isMounted) return;
        
        // Process video recommendations
        if (videosResult.status === 'fulfilled') {
          setRecommendedVideos(videosResult.value);
        }
        
        // Process structured career guidance
        if (currentCardsResult.status === 'fulfilled') {
          const guidanceData = currentCardsResult.value;
          setStructuredGuidance(guidanceData);
          console.log('✅ Loaded structured career guidance:', guidanceData.totalPathways, 'pathways');
          
          // Force clear all caches to ensure fresh data
          if (guidanceData.totalPathways > 0) {
            const careerPathwayService = new CareerPathwayService();
            careerPathwayService.clearAllCaches();
          }
          
          // Show success notification if we have career paths
          if (guidanceData.totalPathways > 0) {
            const hasRichData = guidanceData.primaryPathway?.isEnhanced || guidanceData.primaryPathway?.dayInTheLife;
            setNotification({
              message: hasRichData 
                ? `✨ Enhanced career intelligence loaded: ${guidanceData.primaryPathway?.title} + ${guidanceData.alternativePathways.length} alternatives with comprehensive UK data!`
                : `Loaded your career guidance: ${guidanceData.primaryPathway?.title} + ${guidanceData.alternativePathways.length} alternatives!`,
              type: 'success'
            });
          }
        } else if (currentCardsResult.status === 'rejected') {
          console.error('❌ Failed to load structured career guidance:', currentCardsResult.reason);
          setNotification({
            message: 'Error loading career guidance. Please try refreshing.',
            type: 'error'
          });
        }
        
        console.log('✅ Dashboard: All data fetched successfully');
        
      } catch (error) {
        console.error('❌ Dashboard: Error in data fetch:', error);
        if (isMounted) {
          setNotification({
            message: 'Error loading dashboard data. Please try refreshing.',
            type: 'info'
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchAllData();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [currentUser, dataRefreshKey]); // Only depend on stable values

  const handleSelectExploration = async (threadId: string) => {
    try {
      await fetchCareerCardDetails(threadId);
    } catch (error) {
      console.log('Thread not found, likely a migrated career exploration:', threadId);
      
      // For other types of migrated explorations, show a notification
      setNotification({
        message: 'This career discovery was from your guest session. Start a new conversation to explore it further!',
        type: 'info'
      });
    }
  };

  const refreshDashboard = () => {
    // Clear all caches first
    const careerPathwayService = new CareerPathwayService();
    careerPathwayService.clearAllCaches();
    
    setDataRefreshKey(prev => prev + 1);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-black via-primary-black to-electric-blue/10 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-electric-blue to-neon-pink rounded-full flex items-center justify-center mx-auto mb-8 shadow-glow-blue">
            <Crown className="w-12 h-12 text-primary-white" />
          </div>
          <h1 className="text-4xl font-street font-black text-transparent bg-clip-text bg-gradient-to-r from-electric-blue via-neon-pink to-cyber-yellow mb-6">
            CAREER COMMAND CENTER*
          </h1>
          <p className="text-xl text-primary-white/70 mb-8 max-w-md mx-auto">
            Access your personalized career intelligence dashboard
          </p>
          <Link 
            to="/auth/login" 
            className="inline-flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-electric-blue via-neon-pink to-cyber-yellow rounded-xl text-primary-black font-black text-lg hover:scale-105 transition-transform duration-200 shadow-glow-blue"
          >
            <Zap className="w-6 h-6" />
            <span>ACCESS DASHBOARD</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-primary-black via-primary-black to-electric-blue/10 pt-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <AnimatePresence>
        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onDismiss={dismissNotification}
          />
        )}
      </AnimatePresence>

      {/* Career Card Modal with street-art styling */}
      <AnimatePresence>
        {showCareerCardModal && selectedCareerCard && (
          <div className="fixed inset-0 bg-primary-black/80 backdrop-blur-lg flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="bg-gradient-to-br from-primary-black to-electric-blue/20 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-electric-blue/30"
            >
              <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-street font-black text-transparent bg-clip-text bg-gradient-to-r from-electric-blue to-neon-pink">
                      {selectedCareerCard.title}
                    </h2>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedCareerCard.isMigrated && (
                        <Badge className="bg-gradient-to-r from-cyber-yellow to-acid-green text-primary-black font-bold">
                          FROM GUEST SESSION
                        </Badge>
                      )}
                      
                      {/* Enhancement status badges */}
                      {selectedCareerCard.enhancement?.status === 'completed' ? (
                        <Badge className="bg-gradient-to-r from-acid-green to-cyber-yellow text-primary-black font-bold">
                          <Sparkles className="w-3 h-3 mr-1" />
                          ENHANCED WITH REAL UK DATA
                        </Badge>
                      ) : selectedCareerCard.enhancement?.status === 'failed' ? (
                        <Badge className="bg-gradient-to-r from-sunset-orange to-neon-pink text-primary-white font-bold">
                          <RefreshCw className="w-3 h-3 mr-1" />
                          ENHANCEMENT FAILED
                        </Badge>
                      ) : selectedCareerCard.enhancement?.status === 'pending' ? (
                        <Badge className="bg-gradient-to-r from-electric-blue to-cyber-blue text-primary-white font-bold">
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ENHANCING WITH PERPLEXITY...
                        </Badge>
                      ) : selectedCareerCard.isEnhanced || selectedCareerCard.webSearchVerified ? (
                        <Badge className="bg-gradient-to-r from-acid-green to-cyber-yellow text-primary-black font-bold">
                          <Sparkles className="w-3 h-3 mr-1" />
                          ENHANCED WITH REAL UK DATA
                        </Badge>
                      ) : (
                        <Badge className="bg-gradient-to-r from-primary-gray to-primary-white/20 text-primary-white/70 font-bold">
                          <Star className="w-3 h-3 mr-1" />
                          STANDARD CARD
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowCareerCardModal(false)}
                      className="w-10 h-10 bg-gradient-to-br from-neon-pink to-electric-blue rounded-xl flex items-center justify-center hover:scale-110 transition-transform duration-200"
                    >
                      <X className="h-5 w-5 text-primary-white" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <p className="text-xl text-primary-white/90 leading-relaxed">
                    {selectedCareerCard.description}
                  </p>
                  
                  {(selectedCareerCard.perplexityData?.verifiedSalaryRanges || selectedCareerCard.compensationRewards?.salaryRange || selectedCareerCard.averageSalary) && (
                    <div className="bg-gradient-to-r from-electric-blue/20 to-neon-pink/20 rounded-2xl p-6 border border-electric-blue/30">
                      <h3 className="text-xl font-black text-acid-green mb-4 flex items-center">
                        <PoundSterling className="w-6 h-6 mr-2" />
                        {selectedCareerCard.perplexityData?.verifiedSalaryRanges ? 'VERIFIED UK SALARY RANGES' : 'SALARY BREAKDOWN'}
                      </h3>
                      {(selectedCareerCard.perplexityData?.verifiedSalaryRanges || selectedCareerCard.compensationRewards?.salaryRange) ? (
                        <>
                          {(() => {
                            // Get salary data from either perplexityData or compensationRewards
                            const salaryData = selectedCareerCard.perplexityData?.verifiedSalaryRanges || 
                                             selectedCareerCard.compensationRewards?.salaryRange;
                            if (!salaryData) return null;
                            
                            return (
                              <div className="grid grid-cols-3 gap-6 mb-4">
                                <div className="text-center">
                                  <div className="text-primary-white/60 font-bold mb-2">ENTRY LEVEL</div>
                                  <div className="text-2xl font-black text-electric-blue">
                                    £{(salaryData.entry?.min || salaryData.entry).toLocaleString()}-{(salaryData.entry?.max || salaryData.entry).toLocaleString()}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-primary-white/60 font-bold mb-2">MID LEVEL</div>
                                  <div className="text-2xl font-black text-neon-pink">
                                    £{(salaryData.mid?.min || salaryData.mid).toLocaleString()}-{(salaryData.mid?.max || salaryData.mid).toLocaleString()}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-primary-white/60 font-bold mb-2">SENIOR LEVEL</div>
                                  <div className="text-2xl font-black text-cyber-yellow">
                                    £{(salaryData.senior?.min || salaryData.senior).toLocaleString()}-{(salaryData.senior?.max || salaryData.senior).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                          {(selectedCareerCard.perplexityData?.verifiedSalaryRanges?.byRegion || selectedCareerCard.compensationRewards?.salaryRange?.byRegion) && (
                            <div className="mt-4 pt-4 border-t border-electric-blue/30">
                              <h4 className="text-lg font-bold text-primary-white/80 mb-3">Regional Variations</h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                {(() => {
                                  const byRegion = selectedCareerCard.perplexityData?.verifiedSalaryRanges?.byRegion || 
                                                 selectedCareerCard.compensationRewards?.salaryRange?.byRegion;
                                  if (!byRegion) return null;
                                  
                                  return Object.entries(byRegion).map(([region, range]) => {
                                    const { min, max } = range as { min: number; max: number };
                                    return (
                                      <div key={region} className="text-center bg-primary-black/40 rounded-lg p-3">
                                        <div className="text-primary-white/60 font-bold mb-1 capitalize">{region}</div>
                                        <div className="text-primary-white font-bold">£{min.toLocaleString()}-{max.toLocaleString()}</div>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="grid grid-cols-3 gap-6">
                          <div className="text-center">
                            <div className="text-primary-white/60 font-bold mb-2">ENTRY</div>
                            <div className="text-2xl font-black text-electric-blue">{selectedCareerCard.averageSalary.entry}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-primary-white/60 font-bold mb-2">EXPERIENCED</div>
                            <div className="text-2xl font-black text-neon-pink">{selectedCareerCard.averageSalary.experienced}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-primary-white/60 font-bold mb-2">SENIOR</div>
                            <div className="text-2xl font-black text-cyber-yellow">{selectedCareerCard.averageSalary.senior}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {selectedCareerCard.keySkills && selectedCareerCard.keySkills.length > 0 && (
                    <div>
                      <h3 className="text-xl font-black text-neon-pink mb-4 flex items-center">
                        <Star className="w-6 h-6 mr-2" />
                        KEY SKILLS
                      </h3>
                      <div className="flex flex-wrap gap-3">
                        {selectedCareerCard.keySkills.map((skill: string, index: number) => (
                          <motion.span
                            key={index}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className="px-4 py-2 bg-gradient-to-r from-electric-blue to-neon-pink rounded-full text-primary-white font-bold shadow-lg hover:scale-105 transition-transform duration-200"
                          >
                            {skill}
                          </motion.span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedCareerCard.trainingPathways && selectedCareerCard.trainingPathways.length > 0 && (
                    <div>
                      <h3 className="text-xl font-black text-cyber-yellow mb-4 flex items-center">
                        <GraduationCap className="w-6 h-6 mr-2" />
                        TRAINING PATHWAYS
                      </h3>
                      <ul className="space-y-3">
                        {selectedCareerCard.trainingPathways.map((pathway: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <ArrowRight className="w-5 h-5 text-electric-blue mr-3 mt-1 flex-shrink-0" />
                            <span className="text-primary-white/90">{pathway}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Enhanced sections - only show if card has Perplexity data */}
                  {selectedCareerCard.perplexityData && (
                    <>
                      {selectedCareerCard.careerProgression && selectedCareerCard.careerProgression.length > 0 && (
                        <div className="bg-gradient-to-r from-neon-pink/20 to-cyber-yellow/20 rounded-2xl p-6 border border-neon-pink/30">
                          <h3 className="text-xl font-black text-neon-pink mb-4 flex items-center">
                            <TrendingUp className="w-6 h-6 mr-2" />
                            CAREER PROGRESSION
                          </h3>
                          <div className="space-y-3">
                            {selectedCareerCard.careerProgression.map((step: string, index: number) => (
                              <div key={index} className="flex items-start">
                                <div className="w-8 h-8 bg-gradient-to-br from-neon-pink to-cyber-yellow rounded-full flex items-center justify-center mr-3 mt-1 text-primary-black font-bold text-sm">
                                  {index + 1}
                                </div>
                                <span className="text-primary-white/90">{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {selectedCareerCard.workLifeBalance && (
                        <div className="bg-gradient-to-r from-electric-blue/20 to-acid-green/20 rounded-2xl p-6 border border-electric-blue/30">
                          <h3 className="text-xl font-black text-electric-blue mb-4 flex items-center">
                            <Heart className="w-6 h-6 mr-2" />
                            WORK-LIFE BALANCE
                          </h3>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {selectedCareerCard.workLifeBalance.typical_hours && (
                              <div>
                                <span className="text-primary-white/60 font-bold">Hours:</span>
                                <div className="text-primary-white/90">{selectedCareerCard.workLifeBalance.typical_hours}</div>
                              </div>
                            )}
                            {selectedCareerCard.workLifeBalance.flexibility && (
                              <div>
                                <span className="text-primary-white/60 font-bold">Flexibility:</span>
                                <div className="text-primary-white/90">{selectedCareerCard.workLifeBalance.flexibility}</div>
                              </div>
                            )}
                            {selectedCareerCard.workLifeBalance.stress_level && (
                              <div>
                                <span className="text-primary-white/60 font-bold">Stress Level:</span>
                                <div className="text-primary-white/90">{selectedCareerCard.workLifeBalance.stress_level}</div>
                              </div>
                            )}
                            {selectedCareerCard.workLifeBalance.job_satisfaction && (
                              <div>
                                <span className="text-primary-white/60 font-bold">Satisfaction:</span>
                                <div className="text-primary-white/90">{selectedCareerCard.workLifeBalance.job_satisfaction}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {selectedCareerCard.industryTrends && selectedCareerCard.industryTrends.length > 0 && (
                        <div className="bg-gradient-to-r from-cyber-yellow/20 to-sunset-orange/20 rounded-2xl p-6 border border-cyber-yellow/30">
                          <h3 className="text-xl font-black text-cyber-yellow mb-4 flex items-center">
                            <TrendingUp className="w-6 h-6 mr-2" />
                            INDUSTRY TRENDS
                          </h3>
                          <ul className="space-y-2">
                            {selectedCareerCard.industryTrends.map((trend: string, index: number) => (
                              <li key={index} className="flex items-start">
                                <ArrowRight className="w-4 h-4 text-cyber-yellow mr-2 mt-1 flex-shrink-0" />
                                <span className="text-primary-white/90 text-sm">{trend}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {selectedCareerCard.topUKEmployers && selectedCareerCard.topUKEmployers.length > 0 && (
                        <div className="bg-gradient-to-r from-acid-green/20 to-electric-blue/20 rounded-2xl p-6 border border-acid-green/30">
                          <h3 className="text-xl font-black text-acid-green mb-4 flex items-center">
                            <Building className="w-6 h-6 mr-2" />
                            TOP UK EMPLOYERS
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {selectedCareerCard.topUKEmployers.map((employer: any, index: number) => (
                              <div key={index} className="bg-primary-black/40 rounded-lg p-4">
                                <h4 className="font-bold text-primary-white mb-2">{employer.name}</h4>
                                <p className="text-primary-white/70 text-sm mb-2">{employer.knownFor}</p>
                                {employer.typical_salary && (
                                  <div className="text-acid-green font-medium text-sm">{employer.typical_salary}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Real-time Market Demand */}
                      {selectedCareerCard.perplexityData.realTimeMarketDemand && (
                        <div className="bg-gradient-to-r from-electric-blue/20 to-cyber-blue/20 rounded-2xl p-6 border border-electric-blue/30">
                          <h3 className="text-xl font-black text-electric-blue mb-4 flex items-center">
                            <BarChart3 className="w-6 h-6 mr-2" />
                            REAL-TIME MARKET DEMAND
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center bg-primary-black/40 rounded-lg p-4">
                              <div className="text-primary-white/60 font-bold mb-2">Job Postings (30 days)</div>
                              <div className="text-2xl font-black text-electric-blue">
                                {selectedCareerCard.perplexityData.realTimeMarketDemand.jobPostingVolume.toLocaleString()}
                              </div>
                            </div>
                            <div className="text-center bg-primary-black/40 rounded-lg p-4">
                              <div className="text-primary-white/60 font-bold mb-2">Growth Rate (YoY)</div>
                              <div className="text-2xl font-black text-acid-green">
                                {(selectedCareerCard.perplexityData.realTimeMarketDemand.growthRate * 100).toFixed(1)}%
                              </div>
                            </div>
                            <div className="text-center bg-primary-black/40 rounded-lg p-4">
                              <div className="text-primary-white/60 font-bold mb-2">Competition Level</div>
                              <div className="text-2xl font-black text-neon-pink">
                                {selectedCareerCard.perplexityData.realTimeMarketDemand.competitionLevel}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Work Environment Details */}
                      {selectedCareerCard.perplexityData.workEnvironmentDetails && (
                        <div className="bg-gradient-to-r from-acid-green/20 to-cyber-yellow/20 rounded-2xl p-6 border border-acid-green/30">
                          <h3 className="text-xl font-black text-acid-green mb-4 flex items-center">
                            <Heart className="w-6 h-6 mr-2" />
                            WORK ENVIRONMENT & LIFESTYLE
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="bg-primary-black/40 rounded-lg p-4 text-center">
                              <div className="text-primary-white/60 font-bold mb-2">Remote Work</div>
                              <div className="text-primary-white font-bold">
                                {selectedCareerCard.perplexityData.workEnvironmentDetails.remoteOptions ? 'Available' : 'Not Available'}
                              </div>
                            </div>
                            <div className="bg-primary-black/40 rounded-lg p-4 text-center">
                              <div className="text-primary-white/60 font-bold mb-2">Flexibility</div>
                              <div className="text-primary-white font-bold">
                                {selectedCareerCard.perplexityData.workEnvironmentDetails.flexibilityLevel}
                              </div>
                            </div>
                            <div className="bg-primary-black/40 rounded-lg p-4 text-center">
                              <div className="text-primary-white/60 font-bold mb-2">Typical Hours</div>
                              <div className="text-primary-white font-bold">
                                {selectedCareerCard.perplexityData.workEnvironmentDetails.typicalHours}
                              </div>
                            </div>
                            <div className="bg-primary-black/40 rounded-lg p-4 text-center">
                              <div className="text-primary-white/60 font-bold mb-2">Stress Level</div>
                              <div className="text-primary-white font-bold">
                                {selectedCareerCard.perplexityData.workEnvironmentDetails.stressLevel}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Current Education Pathways */}
                      {selectedCareerCard.perplexityData.currentEducationPathways && selectedCareerCard.perplexityData.currentEducationPathways.length > 0 && (
                        <div className="bg-gradient-to-r from-cyber-yellow/20 to-sunset-orange/20 rounded-2xl p-6 border border-cyber-yellow/30">
                          <h3 className="text-xl font-black text-cyber-yellow mb-4 flex items-center">
                            <BookOpen className="w-6 h-6 mr-2" />
                            CURRENT TRAINING PATHWAYS
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {selectedCareerCard.perplexityData.currentEducationPathways.map((pathway, index) => (
                              <div key={index} className="bg-primary-black/40 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-bold text-primary-white">{pathway.title}</h4>
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                                    pathway.verified ? 'bg-acid-green text-primary-black' : 'bg-primary-gray text-primary-white'
                                  }`}>
                                    {pathway.verified ? 'VERIFIED' : 'UNVERIFIED'}
                                  </span>
                                </div>
                                <p className="text-primary-white/70 text-sm mb-2">{pathway.provider}</p>
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-primary-white/60">{pathway.duration}</span>
                                  <span className="text-acid-green font-bold">
                                    £{pathway.cost.min.toLocaleString()}-{pathway.cost.max.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Automation Risk Assessment */}
                      {selectedCareerCard.perplexityData.automationRiskAssessment && (
                        <div className="bg-gradient-to-r from-neon-pink/20 to-sunset-orange/20 rounded-2xl p-6 border border-neon-pink/30">
                          <h3 className="text-xl font-black text-neon-pink mb-4 flex items-center">
                            <Shield className="w-6 h-6 mr-2" />
                            AUTOMATION RISK ASSESSMENT
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-primary-white/60 font-bold">Risk Level:</span>
                                <span className={`px-3 py-1 rounded-full font-bold text-sm ${
                                  selectedCareerCard.perplexityData.automationRiskAssessment.level === 'Low' ? 'bg-acid-green text-primary-black' :
                                  selectedCareerCard.perplexityData.automationRiskAssessment.level === 'Medium' ? 'bg-cyber-yellow text-primary-black' :
                                  'bg-neon-pink text-primary-white'
                                }`}>
                                  {selectedCareerCard.perplexityData.automationRiskAssessment.level}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-primary-white/60 font-bold">Timeline:</span>
                                <span className="text-primary-white font-bold">
                                  {selectedCareerCard.perplexityData.automationRiskAssessment.timeline}
                                </span>
                              </div>
                            </div>
                            {selectedCareerCard.perplexityData.automationRiskAssessment.futureSkillsNeeded.length > 0 && (
                              <div>
                                <h4 className="text-primary-white/80 font-bold mb-2">Future Skills Needed:</h4>
                                <div className="flex flex-wrap gap-2">
                                  {selectedCareerCard.perplexityData.automationRiskAssessment.futureSkillsNeeded.map((skill, index) => (
                                    <span key={index} className="px-3 py-1 bg-electric-blue/20 text-electric-blue rounded-full text-sm font-bold">
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Industry Growth Projection */}
                      {selectedCareerCard.perplexityData.industryGrowthProjection && (
                        <div className="bg-gradient-to-r from-electric-blue/20 to-acid-green/20 rounded-2xl p-6 border border-electric-blue/30">
                          <h3 className="text-xl font-black text-electric-blue mb-4 flex items-center">
                            <TrendingUp className="w-6 h-6 mr-2" />
                            INDUSTRY GROWTH PROJECTION
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="text-center bg-primary-black/40 rounded-lg p-4">
                              <div className="text-primary-white/60 font-bold mb-2">Next Year</div>
                              <div className="text-2xl font-black text-acid-green">
                                {(selectedCareerCard.perplexityData.industryGrowthProjection.nextYear * 100).toFixed(1)}%
                              </div>
                            </div>
                            <div className="text-center bg-primary-black/40 rounded-lg p-4">
                              <div className="text-primary-white/60 font-bold mb-2">5-Year Outlook</div>
                              <div className="text-2xl font-black text-cyber-yellow">
                                {(selectedCareerCard.perplexityData.industryGrowthProjection.fiveYear * 100).toFixed(1)}%
                              </div>
                            </div>
                            <div className="text-center bg-primary-black/40 rounded-lg p-4">
                              <div className="text-primary-white/60 font-bold mb-2">Overall Outlook</div>
                              <div className="text-2xl font-black text-neon-pink">
                                {selectedCareerCard.perplexityData.industryGrowthProjection.outlook}
                              </div>
                            </div>
                          </div>
                          {selectedCareerCard.perplexityData.industryGrowthProjection.factors.length > 0 && (
                            <div>
                              <h4 className="text-primary-white/80 font-bold mb-2">Key Growth Drivers:</h4>
                              <ul className="space-y-2">
                                {selectedCareerCard.perplexityData.industryGrowthProjection.factors.map((factor, index) => (
                                  <li key={index} className="flex items-start">
                                    <ArrowRight className="w-4 h-4 text-electric-blue mr-2 mt-1 flex-shrink-0" />
                                    <span className="text-primary-white/90 text-sm">{factor}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  
                  {selectedCareerCard.nextSteps && selectedCareerCard.nextSteps.length > 0 && (
                    <div>
                      <h3 className="text-xl font-black text-acid-green mb-4 flex items-center">
                        <Target className="w-6 h-6 mr-2" />
                        NEXT STEPS
                      </h3>
                      <ul className="space-y-3">
                        {selectedCareerCard.nextSteps.map((step: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <ArrowRight className="w-5 h-5 text-neon-pink mr-3 mt-1 flex-shrink-0" />
                            <span className="text-primary-white/90">{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                <div className="mt-8 flex justify-center">
                  <Link 
                    to="/chat"
                    className="inline-flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-electric-blue via-neon-pink to-cyber-yellow rounded-xl text-primary-black font-black text-lg hover:scale-105 transition-transform duration-200 shadow-glow-blue"
                  >
                    <MessageSquare className="w-6 h-6" />
                    <span>EXPLORE FURTHER</span>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Voice Discussion Modal */}
      <CareerVoiceDiscussionModal
        isOpen={voiceDiscussionModal.isOpen}
        onClose={handleCloseVoiceDiscussion}
        careerData={voiceDiscussionModal.careerData}
        discussionContext={voiceDiscussionModal.discussionContext}
        sessionId={voiceDiscussionModal.sessionId || ''}
        isPrimary={voiceDiscussionModal.isPrimary}
      />

      {/* Welcome Header with street-art styling */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h1 className="text-6xl font-street font-black text-transparent bg-clip-text bg-gradient-to-r from-electric-blue via-neon-pink to-cyber-yellow mb-4 animate-glow-pulse">
          DASHBOARD
        </h1>
        <p className="text-xl text-primary-white/80 font-medium">
          Welcome back, {currentUser.displayName || currentUser.email?.split('@')[0] || 'User'}!
        </p>
      </motion.div>

      {/* Welcome Section with Profile Link */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6 }}
        className="relative overflow-visible rounded-2xl p-6 sm:p-8 shadow-2xl border border-electric-blue/20 bg-gradient-to-br from-electric-blue/20 to-neon-pink/20 mb-8"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary-black/90 to-primary-black/70 backdrop-blur-sm" />
        <div className="relative">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-1">
            <div>
              <h2 className="text-3xl font-street font-black text-primary-white mb-3">
                CAREER COMMAND CENTER
              </h2>
              <p className="text-lg text-primary-white/80">
                Continue your career exploration and discover new opportunities
              </p>
            </div>
            <div className="flex flex-col xs:flex-row gap-3 sm:flex-row sm:space-x-4 w-full sm:w-auto">
              <button 
                onClick={refreshDashboard}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-cyber-yellow to-acid-green rounded-xl text-primary-black font-bold hover:scale-105 transition-transform duration-200"
                disabled={loading}
              >
                <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                <span>REFRESH</span>
              </button>
              <Link 
                to="/profile"
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-electric-blue to-neon-pink rounded-xl text-primary-white font-bold hover:scale-105 transition-transform duration-200"
              >
                <Crown className="h-5 w-5" />
                <span>VIEW PROFILE</span>
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Career Exploration Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="relative overflow-hidden rounded-2xl p-8 shadow-2xl border border-electric-blue/20 bg-gradient-to-br from-neon-pink/20 to-cyber-yellow/20 mb-8"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary-black/90 to-primary-black/70 backdrop-blur-sm" />
        <div className="relative">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-electric-blue to-neon-pink rounded-xl flex items-center justify-center shadow-lg">
              <GraduationCap className="h-6 w-6 text-primary-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-street font-black text-primary-white">
                YOUR CAREER DISCOVERIES
              </h2>
              <p className="text-primary-white/70">
                {structuredGuidance.totalPathways} {structuredGuidance.totalPathways === 1 ? 'path' : 'paths'} discovered
                {structuredGuidance.primaryPathway?.isEnhanced && (
                  <span className="ml-2 text-acid-green">• Enhanced with real UK data</span>
                )}
                {structuredGuidance.primaryPathway?.perplexityData && (
                  <span className="ml-2 text-electric-blue">• Perplexity Data Available</span>
                )}
              </p>
            </div>
            <Button
              onClick={async () => {
                console.log('🔄 Manual refresh triggered');
                if (currentUser) {
                  const careerPathwayService = new CareerPathwayService();
        const freshData = await careerPathwayService.forceRefreshStructuredGuidance(currentUser.uid);
                  setStructuredGuidance(freshData);
                  setNotification({
                    message: '🔄 Career data refreshed!',
                    type: 'info'
                  });
                }
              }}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto bg-primary-black/60 border-electric-blue/50 text-electric-blue hover:bg-electric-blue/20 whitespace-nowrap"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>
          
          {/* 🎯 UNIFIED CAREER CARDS: All careers treated equally */}
          {(() => {
            // Create flattened array of all careers
            const allCareers = [];
            
            // Add primary career first
            if (structuredGuidance.primaryPathway) {
              allCareers.push({
                ...structuredGuidance.primaryPathway,
                isPrimary: true
              });
            }
            
            // Add all alternative careers
            structuredGuidance.alternativePathways.forEach(career => {
              allCareers.push({
                ...career,
                isPrimary: false
              });
            });

            if (allCareers.length === 0) {
              return (
                <div className="text-center py-12">
                  <p className="text-primary-white/70">No career guidance available yet. Start a conversation to discover your career paths!</p>
                </div>
              );
            }

            return (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-primary-white mb-2">
                    Your Career Discoveries
                  </h2>
                  <p className="text-primary-white/70">
                    {allCareers.length} pathway{allCareers.length !== 1 ? 's' : ''} discovered • Enhanced with real UK data
                  </p>
                </div>
                
                {/* Grid of Career Cards */}
                <div className="grid grid-cols-1 gap-6">
                  {allCareers.map((career, index) => (
                    <UnifiedCareerCard
                      key={career.title || index}
                      career={career}
                      onAskAI={() => {
                        if (career.isPrimary) {
                          handleAskAIAboutPrimary();
                        } else {
                          handleAskAIAboutAlternative(career);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </motion.div>

      {/* Continue Exploring CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="text-center"
      >
        <div className="relative overflow-hidden rounded-2xl p-12 shadow-2xl border border-electric-blue/20 bg-gradient-to-br from-cyber-yellow/20 to-acid-green/20">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-black/90 to-primary-black/70 backdrop-blur-sm" />
          <div className="relative space-y-6">
            <div className="w-16 h-16 bg-gradient-to-br from-electric-blue to-neon-pink rounded-full flex items-center justify-center mx-auto shadow-glow-blue">
              <Sparkles className="h-8 w-8 text-primary-white" />
            </div>
            <h3 className="text-3xl font-street font-black text-transparent bg-clip-text bg-gradient-to-r from-electric-blue to-neon-pink">
              READY TO EXPLORE MORE?
            </h3>
            <p className="text-xl text-primary-white/80 max-w-2xl mx-auto">
              Continue your career conversation to discover more opportunities and get personalized guidance
            </p>
            <Link 
              to="/chat"
              className="inline-flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-electric-blue via-neon-pink to-cyber-yellow rounded-xl text-primary-black font-black text-lg hover:scale-105 transition-transform duration-200 shadow-glow-blue"
            >
              <MessageSquare className="w-6 h-6" />
              <span>CONTINUE CONVERSATION</span>
            </Link>
          </div>
        </div>
      </motion.div>
      </div>
    </div>

    {/* Career Voice Discussion Modal */}
    <CareerVoiceDiscussionModal
      isOpen={voiceDiscussionModal.isOpen}
      onClose={handleCloseVoiceDiscussion}
      careerData={voiceDiscussionModal.careerData}
      discussionContext={voiceDiscussionModal.discussionContext}
      sessionId={voiceDiscussionModal.sessionId}
      isPrimary={voiceDiscussionModal.isPrimary}
    />

    {/* Comparison Modal */}
    {showComparisonModal && comparisonModalData.alternative && comparisonModalData.primary && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Career Comparison</h2>
            <button
              onClick={handleCloseComparisonModal}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary Career */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">Primary Recommendation</h3>
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">{comparisonModalData.primary.title}</h4>
                <p className="text-sm text-gray-600">{comparisonModalData.primary.description}</p>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">{Math.round((comparisonModalData.primary.confidence || 0.95) * 100)}% match</span>
                </div>
              </div>
            </div>

            {/* Alternative Career */}
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-800 mb-3">Alternative Option</h3>
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">{comparisonModalData.alternative.title}</h4>
                <p className="text-sm text-gray-600">{comparisonModalData.alternative.description}</p>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">{Math.round((comparisonModalData.alternative.confidence || 0.80) * 100)}% match</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={handleCloseComparisonModal}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close Comparison
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default Dashboard;
