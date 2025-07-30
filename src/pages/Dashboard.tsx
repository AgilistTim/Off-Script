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
  Trash2
} from 'lucide-react';
import { getVideoById } from '../services/videoService';
import VideoCard from '../components/video/VideoCard';
import CareerGuidancePanel from '../components/career-guidance/CareerGuidancePanel';
import CareerExplorationOverview from '../components/career-guidance/CareerExplorationOverview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { db } from '../services/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import careerPathwayService from '../services/careerPathwayService';

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
      <div className="flex items-center justify-between">
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

  // New state for current conversation data
  const [currentCareerCards, setCurrentCareerCards] = useState<any[]>([]);
  const [dataRefreshKey, setDataRefreshKey] = useState(0); // Force refresh trigger
  
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

  // Fetch current career cards from conversations
  const fetchCurrentCareerCards = useCallback(async () => {
    if (!currentUser || loading) return;
    
    try {
      const cards = await careerPathwayService.getCurrentCareerCards(currentUser.uid);
      setCurrentCareerCards(cards);
      console.log('✅ Loaded current career cards:', cards.length);
    } catch (error) {
      console.error('Error loading current career cards:', error);
    }
  }, [currentUser, loading]);

  // Enhanced method to check for migration completion and show appropriate notifications
  const checkForMigrationData = useCallback(async () => {
    if (!currentUser || loading) return;
    
    try {
      // Check if user has migration data that might not be immediately visible
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

  // Enhanced career card fetching with caching
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
      return;
    }

    try {
      // All career cards are now stored in threadCareerGuidance with full details
      // Try to get the career guidance data which contains the detailed information
      const careerGuidance = await careerPathwayService.getThreadCareerGuidance(threadId, currentUser.uid);
      
      if (careerGuidance?.primaryPathway) {
        // Use the primary pathway as the career card data
        const careerCard = careerGuidance.primaryPathway;
        
        // Cache the result
        setCareerCardCache(prev => new Map(prev.set(threadId, careerCard)));
        setSelectedCareerCard(careerCard);
        setShowCareerCardModal(true);
        console.log('✅ Loaded and cached career card details:', careerCard);
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

  // Delete career card function
  const deleteCareerCard = useCallback(async (cardId: string) => {
    if (!currentUser) return;

    try {
      // Find the career card to get its Firebase info
      const cardToDelete = currentCareerCards.find(card => card.id === cardId);
      if (!cardToDelete) {
        console.error('Career card not found for deletion:', cardId);
        return;
      }

      console.log('🗑️ Deleting career card:', cardToDelete);

      // Smart deletion based on card source
      if (cardToDelete.firebaseDocId && cardToDelete.pathwayType) {
        // Modern cards with Firebase metadata - use precise deletion
        console.log('🎯 Using Firebase-based deletion for current card');
        await careerPathwayService.deleteCareerCardByFirebaseId(
          cardId,
          cardToDelete.firebaseDocId,
          cardToDelete.pathwayType,
          cardToDelete.pathwayIndex,
          currentUser.uid
        );
      } else if (cardId.includes('_card_')) {
        // Migrated guest cards - delete from careerExplorations only
        console.log('🎯 Using legacy deletion methods for migrated card');
        await careerPathwayService.deleteCareerExplorationOrCard(cardToDelete.threadId || cardId, currentUser.uid);
        // NO threadCareerGuidance deletion for migrated cards
      } else {
        // Conversation-generated cards - delete from threadCareerGuidance only  
        console.log('🎯 Using thread guidance deletion for conversation card');
        await careerPathwayService.deleteThreadCareerGuidance(cardToDelete.threadId || cardId, currentUser.uid);
        // NO careerExplorations deletion for conversation cards
      }

      // Remove from cache and current cards
      setCareerCardCache(prev => {
        const newMap = new Map(prev);
        newMap.delete(cardId);
        return newMap;
      });

      setCurrentCareerCards(prev => prev.filter(card => card.id !== cardId));

      setNotification({
        message: 'Career card deleted successfully!',
        type: 'success'
      });

      // Close modal if the deleted card was selected
      if (selectedCareerCard?.id === cardId) {
        setShowCareerCardModal(false);
        setSelectedCareerCard(null);
      }

      // Refresh the career cards to reflect Firebase changes
      setTimeout(async () => {
        try {
          const updatedCards = await careerPathwayService.getCurrentCareerCards(currentUser.uid);
          setCurrentCareerCards(updatedCards);
        } catch (error) {
          console.error('Error refreshing career cards after deletion:', error);
        }
      }, 500);

    } catch (error) {
      console.error('Error deleting career card:', error);
      setNotification({
        message: 'Error deleting career card. Please try again.',
        type: 'error'
      });
    }
  }, [currentUser, selectedCareerCard, currentCareerCards]);

  // Fetch video recommendations
  const fetchRecommendations = useCallback(async () => {
    if (!currentUser || loading) return;
    
    try {
      // Fallback to popular videos if no personalized recommendations
      const videosRef = collection(db, 'videos');
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
      
      console.log('🔄 Dashboard: Starting data fetch...');
      setLoading(true);
      
      try {
        // Fetch all data in parallel
        const [
          videosResult,
          currentCards
        ] = await Promise.allSettled([
          // Fetch video recommendations
          (async () => {
            const videosRef = collection(db, 'videos');
            const videosQuery = query(videosRef, orderBy('views', 'desc'), limit(4));
            const videosSnapshot = await getDocs(videosQuery);
            return videosSnapshot.docs.map(doc => doc.id);
          })(),
          
          // Fetch current career cards
          careerPathwayService.getCurrentCareerCards(currentUser.uid)
        ]);
        
        // Only update state if component is still mounted
        if (!isMounted) return;
        
        // Process video recommendations
        if (videosResult.status === 'fulfilled') {
          setRecommendedVideos(videosResult.value);
        }
        
        // Process current career cards
        if (currentCards.status === 'fulfilled') {
          setCurrentCareerCards(currentCards.value);
          console.log('✅ Loaded current career cards:', currentCards.value.length);
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
                    {selectedCareerCard.isMigrated && (
                      <Badge className="mt-3 bg-gradient-to-r from-cyber-yellow to-acid-green text-primary-black font-bold">
                        FROM GUEST SESSION
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => deleteCareerCard(selectedCareerCard.id)}
                      className="w-10 h-10 bg-gradient-to-br from-neon-pink to-sunset-orange rounded-xl flex items-center justify-center hover:scale-110 transition-transform duration-200"
                      title="Delete Career Card"
                    >
                      <Trash2 className="h-5 w-5 text-primary-white" />
                    </button>
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
                  
                  {selectedCareerCard.averageSalary && (
                    <div className="bg-gradient-to-r from-electric-blue/20 to-neon-pink/20 rounded-2xl p-6 border border-electric-blue/30">
                      <h3 className="text-xl font-black text-acid-green mb-4 flex items-center">
                        <PoundSterling className="w-6 h-6 mr-2" />
                        SALARY BREAKDOWN
                      </h3>
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
        className="relative overflow-hidden rounded-2xl p-8 shadow-2xl border border-electric-blue/20 bg-gradient-to-br from-electric-blue/20 to-neon-pink/20 mb-8"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary-black/90 to-primary-black/70 backdrop-blur-sm" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-street font-black text-primary-white mb-3">
                CAREER COMMAND CENTER
              </h2>
              <p className="text-lg text-primary-white/80">
                Continue your career exploration and discover new opportunities
              </p>
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={refreshDashboard}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-cyber-yellow to-acid-green rounded-xl text-primary-black font-bold hover:scale-105 transition-transform duration-200"
                disabled={loading}
              >
                <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                <span>REFRESH</span>
              </button>
              <Link 
                to="/profile"
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-electric-blue to-neon-pink rounded-xl text-primary-white font-bold hover:scale-105 transition-transform duration-200"
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
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-electric-blue to-neon-pink rounded-xl flex items-center justify-center shadow-lg">
              <GraduationCap className="h-6 w-6 text-primary-white" />
            </div>
            <div>
              <h2 className="text-2xl font-street font-black text-primary-white">
                YOUR CAREER DISCOVERIES
              </h2>
              <p className="text-primary-white/70">
                {currentCareerCards.length} {currentCareerCards.length === 1 ? 'path' : 'paths'} explored
              </p>
            </div>
          </div>
          <CareerExplorationOverview 
            onSelectExploration={handleSelectExploration}
            currentCareerCards={currentCareerCards}
          />
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
  );
};

export default Dashboard;
