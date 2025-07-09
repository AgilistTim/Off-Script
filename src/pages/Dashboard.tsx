import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppStore } from '../stores/useAppStore';
import { useChatContext } from '../context/ChatContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, MessageSquare, BookOpen, Award, Sparkles, Lightbulb, Target, Briefcase, Code, Bell, X } from 'lucide-react';
import { getVideoById } from '../services/videoService';
import VideoCard from '../components/video/VideoCard';

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
  const { userProgress } = useAppStore();
  const { 
    getRecommendedVideos, 
    currentSummary, 
    newRecommendations, 
    clearNewRecommendationsFlag,
    summaryUpdated,
    clearSummaryUpdatedFlag
  } = useChatContext();
  
  const [recommendedVideos, setRecommendedVideos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' } | null>(null);
  
  // Calculate stats
  const videosWatched = userProgress.videosWatched.length;
  const watchTimeHours = Math.floor(userProgress.totalWatchTime / 3600);
  const watchTimeMinutes = Math.floor((userProgress.totalWatchTime % 3600) / 60);
  const questsCompleted = userProgress.completedQuests.length;
  const pathsSelected = userProgress.selectedPaths.length;

  // Dismiss notification
  const dismissNotification = useCallback(() => {
    setNotification(null);
  }, []);

  // Handle new recommendations
  useEffect(() => {
    if (newRecommendations) {
      setNotification({
        message: "New video recommendations are available based on your recent chat!",
        type: 'success'
      });
      clearNewRecommendationsFlag();
      
      // Refresh recommendations
      fetchRecommendations();
    }
  }, [newRecommendations]);
  
  // Handle summary updates
  useEffect(() => {
    if (summaryUpdated) {
      setNotification({
        message: "Your career insights have been updated based on your recent conversations!",
        type: 'info'
      });
      clearSummaryUpdatedFlag();
    }
  }, [summaryUpdated]);

  // Fetch recommended videos
  const fetchRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      const videos = await getRecommendedVideos(4);
      setRecommendedVideos(videos);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  }, [getRecommendedVideos]);

  // Initial fetch of recommendations
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // Extract insights from the current summary
  const interests = currentSummary?.interests || [];
  const skills = currentSummary?.skills || [];
  const careerGoals = currentSummary?.careerGoals || [];
  const learningPaths = currentSummary?.learningPaths || [];
  const reflectiveQuestions = currentSummary?.reflectiveQuestions || [];
  const hasEnrichedData = currentSummary?.enriched && (
    interests.length > 0 || 
    skills.length > 0 || 
    careerGoals.length > 0 || 
    learningPaths.length > 0
  );

  return (
    <div className="max-w-6xl mx-auto">
      {/* Notification System */}
      <AnimatePresence>
        {notification && (
          <Notification 
            message={notification.message} 
            type={notification.type} 
            onDismiss={dismissNotification} 
          />
        )}
      </AnimatePresence>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
          Welcome back, {currentUser?.displayName || 'Explorer'}!
        </h1>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Video size={24} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Videos Watched</h3>
                <p className="text-2xl font-semibold text-gray-800 dark:text-white">{videosWatched}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <MessageSquare size={24} className="text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Watch Time</h3>
                <p className="text-2xl font-semibold text-gray-800 dark:text-white">
                  {watchTimeHours}h {watchTimeMinutes}m
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                <Award size={24} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Quests Completed</h3>
                <p className="text-2xl font-semibold text-gray-800 dark:text-white">{questsCompleted}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
                <BookOpen size={24} className="text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Paths Selected</h3>
                <p className="text-2xl font-semibold text-gray-800 dark:text-white">{pathsSelected}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* AI Recommendations Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Sparkles size={20} className="text-amber-500 mr-2" />
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Recommended For You</h2>
            </div>
            <div className="flex items-center">
              <button 
                onClick={fetchRecommendations} 
                className="mr-3 text-blue-600 dark:text-blue-400 hover:underline flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <Link to="/chat" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                Chat for more →
              </Link>
            </div>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden animate-pulse h-48"></div>
              ))}
            </div>
          ) : recommendedVideos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {recommendedVideos.map((videoId) => (
                <DashboardVideoCard key={videoId} videoId={videoId} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Chat with our AI assistant to get personalized video recommendations based on your interests and career goals.
              </p>
              <Link 
                to="/chat" 
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <MessageSquare size={16} className="mr-2" />
                Start Chatting
              </Link>
            </div>
          )}
        </div>
        
        {/* Your Career Insights - Only shown if we have enriched data */}
        {hasEnrichedData && (
          <motion.div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center mb-4">
              <Lightbulb size={20} className="text-amber-500 mr-2" />
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Your Career Insights</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {interests.length > 0 && (
                <motion.div 
                  className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <h3 className="flex items-center text-blue-700 dark:text-blue-400 font-medium mb-2">
                    <Sparkles size={16} className="mr-2" /> Your Interests
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {interests.slice(0, 8).map((interest, index) => (
                      <span key={index} className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full">
                        {interest}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
              
              {skills.length > 0 && (
                <motion.div 
                  className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <h3 className="flex items-center text-green-700 dark:text-green-400 font-medium mb-2">
                    <Code size={16} className="mr-2" /> Skills Identified
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {skills.slice(0, 8).map((skill, index) => (
                      <span key={index} className="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs px-2 py-1 rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
              
              {careerGoals.length > 0 && (
                <motion.div 
                  className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <h3 className="flex items-center text-purple-700 dark:text-purple-400 font-medium mb-2">
                    <Target size={16} className="mr-2" /> Career Goals
                  </h3>
                  <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
                    {careerGoals.slice(0, 3).map((goal, index) => (
                      <li key={index}>{goal}</li>
                    ))}
                  </ul>
                </motion.div>
              )}
              
              {learningPaths.length > 0 && (
                <motion.div 
                  className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <h3 className="flex items-center text-amber-700 dark:text-amber-400 font-medium mb-2">
                    <Briefcase size={16} className="mr-2" /> Recommended Learning Paths
                  </h3>
                  <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
                    {learningPaths.slice(0, 3).map((path, index) => (
                      <li key={index}>{path}</li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </div>
            
            {reflectiveQuestions.length > 0 && (
              <motion.div 
                className="mt-6 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <h3 className="text-gray-700 dark:text-gray-300 font-medium mb-2">Reflective Question</h3>
                <p className="text-gray-600 dark:text-gray-400 italic">
                  "{reflectiveQuestions[Math.floor(Math.random() * reflectiveQuestions.length)]}"
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
        
        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Quick Actions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/videos" className="flex items-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
              <Video size={20} className="text-blue-600 dark:text-blue-400 mr-3" />
              <span className="text-gray-700 dark:text-gray-200">Explore Videos</span>
            </Link>
            
            <Link to="/chat" className="flex items-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors">
              <MessageSquare size={20} className="text-green-600 dark:text-green-400 mr-3" />
              <span className="text-gray-700 dark:text-gray-200">Chat with AI</span>
            </Link>
            
            <Link to="/profile" className="flex items-center p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors">
              <Award size={20} className="text-purple-600 dark:text-purple-400 mr-3" />
              <span className="text-gray-700 dark:text-gray-200">View Progress</span>
            </Link>
          </div>
        </div>
        
        {/* Futurescape Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Your Futurescape</h2>
          
          {hasEnrichedData ? (
            <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Based on your conversations and interests, we've identified potential career paths that might interest you:
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {learningPaths.map((path, index) => (
                  <span key={index} className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm px-3 py-1 rounded-full shadow-sm">
                    {path}
                  </span>
                ))}
              </div>
              <Link to="/chat" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
                Continue exploring with AI chat →
              </Link>
            </div>
          ) : pathsSelected > 0 ? (
            <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-gray-700 dark:text-gray-300">
                Your career exploration journey is taking shape! Continue exploring videos and chatting with our AI to refine your path.
              </p>
            </div>
          ) : (
            <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-gray-700 dark:text-gray-300">
                Start exploring videos and chatting with our AI assistant to build your personalized career futurescape.
              </p>
              <Link to="/videos" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Start Exploring
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
