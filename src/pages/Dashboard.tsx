import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
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

  const dismissNotification = () => {
    setNotification(null);
  };

  // Fetch migrated person profile
  const fetchMigratedPersonProfile = useCallback(async () => {
    if (!currentUser) return;
    
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
      }
    } catch (error) {
      console.error('Error loading migrated person profile:', error);
    }
  }, [currentUser]);

  // Fetch career card details for migrated cards
  const fetchMigratedCareerCard = useCallback(async (threadId: string) => {
    try {
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
    } catch (error) {
      console.error('Error loading migrated career card:', error);
      setNotification({
        message: 'Error loading career card details.',
        type: 'info'
      });
    }
  }, []);

  // Fetch video recommendations
  const fetchRecommendations = useCallback(async () => {
    if (!currentUser) return;
    
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchRecommendations();
    fetchMigratedPersonProfile();
  }, [fetchRecommendations, fetchMigratedPersonProfile]);

  const handleSelectExploration = async (threadId: string) => {
    try {
      // Check if this is a migrated career card (has compound key format)
      if (threadId.includes('_card_')) {
        // This is a migrated career exploration, fetch and show career card details
        await fetchMigratedCareerCard(threadId);
        return;
      }
      
      // Try to select the thread (this will work for normal chat-based explorations)
      await selectThread(threadId);
      setActiveTab('current-path');
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
        {migratedPersonProfile && (
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
                      Insights from your career exploration{migratedPersonProfile.isMigrated && ' (migrated from guest session)'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {migratedPersonProfile.interests && migratedPersonProfile.interests.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Interests</h4>
                      <div className="flex flex-wrap gap-1">
                        {migratedPersonProfile.interests.map((interest: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {migratedPersonProfile.goals && migratedPersonProfile.goals.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Goals</h4>
                      <div className="flex flex-wrap gap-1">
                        {migratedPersonProfile.goals.map((goal: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {goal}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {migratedPersonProfile.skills && migratedPersonProfile.skills.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Skills</h4>
                      <div className="flex flex-wrap gap-1">
                        {migratedPersonProfile.skills.map((skill: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {migratedPersonProfile.values && migratedPersonProfile.values.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Values</h4>
                      <div className="flex flex-wrap gap-1">
                        {migratedPersonProfile.values.map((value: string, index: number) => (
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
