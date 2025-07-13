import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppStore } from '../stores/useAppStore';
import { useChatContext } from '../context/ChatContext';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Sparkles, Bell, X, GraduationCap, Target, BookOpen, Play } from 'lucide-react';
import { getVideoById } from '../services/videoService';
import VideoCard from '../components/video/VideoCard';
import CareerGuidancePanel from '../components/career-guidance/CareerGuidancePanel';
import CareerExplorationOverview from '../components/career-guidance/CareerExplorationOverview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { db } from '../services/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

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

  const dismissNotification = () => {
    setNotification(null);
  };

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
  }, [fetchRecommendations]);

  const handleSelectExploration = async (threadId: string) => {
    await selectThread(threadId);
    setActiveTab('current-path');
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
        
        {/* Enhanced Personalized Guidance Section */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Personalized Guidance</CardTitle>
                  <CardDescription className="text-base">
                    AI-powered insights tailored to your career aspirations
                  </CardDescription>
                </div>
              </div>
              <Button asChild variant="outline">
                <Link to="/chat" className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Chat for more →</span>
                </Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b border-gray-200 px-3 md:px-6">
                <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 h-auto md:h-14 bg-gray-50 gap-1 md:gap-0 p-1">
                  <TabsTrigger 
                    value="overview"
                    className="flex items-center justify-center md:space-x-2 text-sm md:text-base py-3 md:py-0 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <Target className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="ml-2 md:ml-0">Overview</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="videos"
                    className="flex items-center justify-center md:space-x-2 text-sm md:text-base py-3 md:py-0 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <Play className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="ml-2 md:ml-0">Videos</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="current-path"
                    className="flex items-center justify-center md:space-x-2 text-sm md:text-base py-3 md:py-0 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <GraduationCap className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="ml-2 md:ml-0">Current Path</span>
                    {careerGuidance && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full ml-1"></div>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-3 md:p-6">
                <TabsContent value="overview" className="mt-0">
                  <CareerExplorationOverview onSelectExploration={handleSelectExploration} />
                </TabsContent>

                <TabsContent value="videos" className="mt-0">
                  <div className="space-y-4 md:space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
                          Recommended Videos
                        </h3>
                        <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 mt-1">
                          Curated content to support your career development
                        </p>
                      </div>
                      <Button 
                        onClick={fetchRecommendations} 
                        variant="outline"
                        disabled={loading}
                      >
                        {loading ? 'Loading...' : 'Refresh'}
                      </Button>
                    </div>
                    
                    {loading ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden animate-pulse h-48"></div>
                        ))}
                      </div>
                    ) : recommendedVideos.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        {recommendedVideos.map((videoId) => (
                          <DashboardVideoCard key={videoId} videoId={videoId} />
                        ))}
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="p-8 text-center">
                          <div className="space-y-4">
                            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <Play className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                              <CardTitle className="text-lg mb-2">Discover Learning Content</CardTitle>
                              <CardDescription className="mb-4">
                                Chat with our AI assistant to get personalized video recommendations based on your interests and career goals.
                              </CardDescription>
                              <Button asChild>
                                <Link to="/chat" className="inline-flex items-center">
                                  <MessageSquare className="w-4 w-4 mr-2" />
                                  Start Chatting
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="current-path" className="mt-0">
                  {careerGuidance ? (
                    <CareerGuidancePanel
                      guidance={careerGuidance}
                      onRefresh={refreshCareerGuidance}
                      isLoading={careerGuidanceLoading}
                    />
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <div className="space-y-4">
                          <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                            <GraduationCap className="h-6 w-6 text-gray-400" />
                          </div>
                          <div>
                            <CardTitle className="text-lg mb-2">No Career Path Selected</CardTitle>
                            <CardDescription className="mb-4">
                              Start exploring your career options in the Overview tab or chat with our AI to discover your ideal career path.
                            </CardDescription>
                            <div className="flex justify-center space-x-3">
                              <Button onClick={() => setActiveTab('overview')} variant="outline">
                                <Target className="w-4 h-4 mr-2" />
                                View Overview
                              </Button>
                              <Button asChild>
                                <Link to="/chat">
                                  <MessageSquare className="w-4 h-4 mr-2" />
                                  Start Exploring
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
