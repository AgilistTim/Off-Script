import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppStore } from '../stores/useAppStore';
import { useChatContext } from '../context/ChatContext';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Sparkles, Bell, X, GraduationCap, Target, BookOpen, Play, User } from 'lucide-react';
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

// Notification component
interface NotificationProps {
  message: string;
  type: 'info' | 'success';
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
  
  const bgColor = type === 'success' 
    ? 'bg-green-100 dark:bg-green-900/30 border-green-500' 
    : 'bg-blue-100 dark:bg-blue-900/30 border-blue-500';
  
  const textColor = type === 'success'
    ? 'text-green-800 dark:text-green-200'
    : 'text-blue-800 dark:text-blue-200';
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border-l-4 ${bgColor} max-w-md`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Bell size={18} className={`mr-2 ${textColor}`} />
          <p className={`${textColor}`}>{message}</p>
        </div>
        <button 
          onClick={onDismiss}
          className="ml-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X size={16} />
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
      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden animate-pulse h-48"></div>
    );
  }

  if (!video) {
    return null;
  }

  return <VideoCard video={video} />;
};

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
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
  const [notification, setNotification] = useState<{
    message: string;
    type: 'info' | 'success';
  } | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [recommendedVideos, setRecommendedVideos] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  
  // New state for migrated data
  const [migratedPersonProfile, setMigratedPersonProfile] = useState<any | null>(null);
  const [selectedCareerCard, setSelectedCareerCard] = useState<any | null>(null);
  const [showCareerCardModal, setShowCareerCardModal] = useState(false);

  // New state for current conversation data
  const [combinedPersonProfile, setCombinedPersonProfile] = useState<any | null>(null);
  const [currentCareerCards, setCurrentCareerCards] = useState<any[]>([]);
  const [dataRefreshKey, setDataRefreshKey] = useState(0); // Force refresh trigger

  // Handle migration completion from router state
  useEffect(() => {
    const locationState = location.state as any;
    if (locationState?.migrationComplete) {
      console.log('🎉 Migration detected, refreshing dashboard data...');
      
      // Clear location state to prevent repeated refreshes
      window.history.replaceState({}, document.title);
      
      // Force refresh all data by incrementing the refresh key
      setDataRefreshKey(prev => prev + 1);
      
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

  const dismissNotification = () => {
    setNotification(null);
  };

  // Fetch combined person profile (current + migrated)
  const fetchCombinedPersonProfile = useCallback(async () => {
    if (!currentUser || loading) return;
    
    try {
      const profile = await careerPathwayService.getCombinedUserProfile(currentUser.uid);
      if (profile) {
        // Update with user's actual name from registration
        const updatedProfile = {
          ...profile,
          name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
          email: currentUser.email
        };
        setCombinedPersonProfile(updatedProfile);
        console.log('✅ Loaded combined person profile:', updatedProfile);
      }
    } catch (error) {
      console.error('Error loading combined person profile:', error);
    }
  }, [currentUser, loading]);

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
      
      // If we have migrated profile but no visible career cards, show helpful notification
      const profile = await careerPathwayService.getCombinedUserProfile(currentUser.uid);
      if (profile?.hasMigratedData && !hasThreadCards && !hasMigratedCards) {
        setNotification({
          message: 'Your migrated career discoveries are being processed. They should appear within a few minutes. Try refreshing if they don\'t show up.',
          type: 'info'
        });
      }
    } catch (error) {
      console.warn('Could not check migration data status:', error);
    }
  }, [currentUser, loading]); // Removed state dependencies that cause infinite loops

  // Fetch migrated person profile (legacy - now using combined)
  const fetchMigratedPersonProfile = useCallback(async () => {
    if (!currentUser || loading) return;
    
    try {
      const profile = await careerPathwayService.getMigratedPersonProfile(currentUser.uid);
      if (profile) {
        // Update with user's actual name from registration
        const updatedProfile = {
          ...profile,
          name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
          email: currentUser.email
        };
        setMigratedPersonProfile(updatedProfile);
        console.log('✅ Loaded migrated person profile:', updatedProfile);
        
        // Check for migration notification (once per load)
        checkForMigrationData();
      }
    } catch (error) {
      console.error('Error loading migrated person profile:', error);
    }
  }, [currentUser, loading, checkForMigrationData]);

  // Enhanced career card fetching for both current and migrated
  const fetchCareerCardDetails = useCallback(async (threadId: string) => {
    if (!currentUser || loading) {
      return;
    }

    try {
      // Check if this is a migrated career card
      if (threadId.includes('_card_')) {
        const careerCard = await careerPathwayService.getMigratedCareerCard(threadId);
        if (careerCard) {
          setSelectedCareerCard(careerCard);
          setShowCareerCardModal(true);
          console.log('✅ Loaded migrated career card:', careerCard);
        } else {
          setNotification({
            message: 'Could not load career card details. This may be from an older migration.',
            type: 'info'
          });
        }
      } else {
        setNotification({
          message: 'This career discovery was from your conversation. Start a new conversation to explore it further!',
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
  }, [currentUser, loading]); // Removed currentCareerCards dependency

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
          combinedProfile,
          currentCards,
          migratedProfile
        ] = await Promise.allSettled([
          // Fetch video recommendations
          (async () => {
            const videosRef = collection(db, 'videos');
            const videosQuery = query(videosRef, orderBy('views', 'desc'), limit(4));
            const videosSnapshot = await getDocs(videosQuery);
            return videosSnapshot.docs.map(doc => doc.id);
          })(),
          
          // Fetch combined profile
          careerPathwayService.getCombinedUserProfile(currentUser.uid),
          
          // Fetch current career cards
          careerPathwayService.getCurrentCareerCards(currentUser.uid),
          
          // Fetch migrated profile
          careerPathwayService.getMigratedPersonProfile(currentUser.uid)
        ]);
        
        // Only update state if component is still mounted
        if (!isMounted) return;
        
        // Process video recommendations
        if (videosResult.status === 'fulfilled') {
          setRecommendedVideos(videosResult.value);
        }
        
        // Process combined profile
        if (combinedProfile.status === 'fulfilled' && combinedProfile.value) {
          const updatedProfile = {
            ...combinedProfile.value,
            name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
            email: currentUser.email
          };
          setCombinedPersonProfile(updatedProfile);
          console.log('✅ Loaded combined person profile:', updatedProfile);
        }
        
        // Process current career cards
        if (currentCards.status === 'fulfilled') {
          setCurrentCareerCards(currentCards.value);
          console.log('✅ Loaded current career cards:', currentCards.value.length);
        }
        
        // Process migrated profile
        if (migratedProfile.status === 'fulfilled' && migratedProfile.value) {
          const updatedProfile = {
            ...migratedProfile.value,
            name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
            email: currentUser.email
          };
          setMigratedPersonProfile(updatedProfile);
          console.log('✅ Loaded migrated person profile:', updatedProfile);
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

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to Your Career Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Please log in to access your personalized career guidance.
          </p>
          <Link 
            to="/login" 
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 lg:p-8">
      <AnimatePresence>
        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onDismiss={dismissNotification}
          />
        )}
      </AnimatePresence>

      {/* Career Card Modal */}
      <AnimatePresence>
        {showCareerCardModal && selectedCareerCard && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedCareerCard.title}
                    </h2>
                    {selectedCareerCard.isMigrated && (
                      <Badge variant="outline" className="mt-2">
                        From Guest Session
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCareerCardModal(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <p className="text-gray-600 dark:text-gray-300">
                    {selectedCareerCard.description}
                  </p>
                  
                  {selectedCareerCard.averageSalary && (
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        Average Salary
                      </h3>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Entry:</span><br/>
                          <span className="font-medium">{selectedCareerCard.averageSalary.entry}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Experienced:</span><br/>
                          <span className="font-medium">{selectedCareerCard.averageSalary.experienced}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Senior:</span><br/>
                          <span className="font-medium">{selectedCareerCard.averageSalary.senior}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {selectedCareerCard.keySkills && selectedCareerCard.keySkills.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        Key Skills
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedCareerCard.keySkills.map((skill: string, index: number) => (
                          <Badge key={index} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedCareerCard.trainingPathways && selectedCareerCard.trainingPathways.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        Training Pathways
                      </h3>
                      <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300">
                        {selectedCareerCard.trainingPathways.map((pathway: string, index: number) => (
                          <li key={index}>{pathway}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {selectedCareerCard.nextSteps && selectedCareerCard.nextSteps.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        Next Steps
                      </h3>
                      <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300">
                        {selectedCareerCard.nextSteps.map((step: string, index: number) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex justify-end">
                  <Button asChild>
                    <Link to="/chat">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Explore Further
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="text-center space-y-4">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white"
          >
            Your Career Journey
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-600 dark:text-gray-300"
          >
            Discover your potential and plan your path forward
          </motion.p>
        </div>
        
        {/* Person Profile Section */}
        {combinedPersonProfile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Your Profile</CardTitle>
                    <CardDescription>
                      Insights from your career exploration
                      {combinedPersonProfile.hasBothSources && ' (current conversations + guest session)'}
                      {combinedPersonProfile.hasCurrentData && !combinedPersonProfile.hasMigratedData && ' (from conversations)'}
                      {!combinedPersonProfile.hasCurrentData && combinedPersonProfile.hasMigratedData && ' (migrated from guest session)'}
                    </CardDescription>
                  </div>
                  {combinedPersonProfile.hasBothSources && (
                    <div className="flex space-x-2">
                      <Badge variant="default" className="text-xs">
                        Current Data
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Guest Session
                      </Badge>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {combinedPersonProfile.interests && combinedPersonProfile.interests.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Interests</h4>
                      <div className="flex flex-wrap gap-1">
                        {combinedPersonProfile.interests.map((interest: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {combinedPersonProfile.goals && combinedPersonProfile.goals.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Goals</h4>
                      <div className="flex flex-wrap gap-1">
                        {combinedPersonProfile.goals.map((goal: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {goal}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {combinedPersonProfile.skills && combinedPersonProfile.skills.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Skills</h4>
                      <div className="flex flex-wrap gap-1">
                        {combinedPersonProfile.skills.map((skill: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {combinedPersonProfile.values && combinedPersonProfile.values.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Values</h4>
                      <div className="flex flex-wrap gap-1">
                        {combinedPersonProfile.values.map((value: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {value}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
        
        {/* Career Exploration Overview - Simplified */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Your Career Discoveries</CardTitle>
                  <CardDescription>
                    Personalized career paths based on your conversations
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CareerExplorationOverview 
                onSelectExploration={handleSelectExploration}
                currentCareerCards={currentCareerCards}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Continue Exploring CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <Card className="p-8 bg-gradient-to-br from-blue-50 to-purple-50 border-0 shadow-lg">
            <div className="space-y-4">
              <Sparkles className="h-12 w-12 text-blue-600 mx-auto" />
              <h3 className="text-xl font-semibold text-gray-900">
                Ready to explore more?
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Continue your career conversation to discover more opportunities and get personalized guidance.
              </p>
              <Button size="lg" asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Link to="/chat">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Continue Conversation
                </Link>
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
