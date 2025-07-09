import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppStore } from '../stores/useAppStore';
import { useChatContext } from '../context/ChatContext';
import { motion } from 'framer-motion';
import { Video, MessageSquare, BookOpen, Award, Sparkles } from 'lucide-react';
import { getVideoById } from '../services/videoService';

// Define the VideoCard component
interface VideoCardProps {
  videoId: string;
}

const VideoCard: React.FC<VideoCardProps> = ({ videoId }) => {
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

  return (
    <Link to={`/video/${videoId}`} className="block">
      <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="aspect-video bg-gray-200 dark:bg-gray-700 relative">
          <img 
            src={video.thumbnailUrl} 
            alt={video.title} 
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = 'https://placehold.co/600x400?text=Video+Thumbnail';
            }}
          />
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
            {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
          </div>
        </div>
        <div className="p-3">
          <h3 className="font-medium text-gray-800 dark:text-white line-clamp-2 text-sm">{video.title}</h3>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{video.creator}</p>
        </div>
      </div>
    </Link>
  );
};

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { userProgress } = useAppStore();
  const { getRecommendedVideos } = useChatContext();
  const [recommendedVideos, setRecommendedVideos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Calculate stats
  const videosWatched = userProgress.videosWatched.length;
  const watchTimeHours = Math.floor(userProgress.totalWatchTime / 3600);
  const watchTimeMinutes = Math.floor((userProgress.totalWatchTime % 3600) / 60);
  const questsCompleted = userProgress.completedQuests.length;
  const pathsSelected = userProgress.selectedPaths.length;

  // Fetch recommended videos
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const videos = await getRecommendedVideos(4);
        setRecommendedVideos(videos);
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [getRecommendedVideos]);

  return (
    <div className="max-w-6xl mx-auto">
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
            <Link to="/chat" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Chat for more recommendations →
            </Link>
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
                <VideoCard key={videoId} videoId={videoId} />
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
        
        {/* Futurescape Preview (placeholder) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Your Futurescape</h2>
          
          {pathsSelected > 0 ? (
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
