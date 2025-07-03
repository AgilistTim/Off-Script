import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, getAllVideos, getVideosByCategory } from '../../services/videoService';
import { likeVideo, dislikeVideo, getPersonalizedRecommendations } from '../../services/userPreferenceService';
import SwipeableVideoCard from './SwipeableVideoCard';
import VideoAssessment from './VideoAssessment';
import { useAuth } from '../../context/AuthContext';
import { Search, Filter, Loader } from 'lucide-react';

interface InfiniteVideoFeedProps {
  category?: string;
  searchQuery?: string;
}

const InfiniteVideoFeed: React.FC<InfiniteVideoFeedProps> = ({ 
  category, 
  searchQuery = '' 
}) => {
  console.log('InfiniteVideoFeed component initializing');
  
  const { currentUser } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessmentVideo, setAssessmentVideo] = useState<Video | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(category || null);
  const observer = useRef<IntersectionObserver | null>(null);
  const VIDEOS_PER_PAGE = 5;
  
  const categories = [
    { id: null, name: 'All' },
    { id: 'technology', name: 'Technology & Digital' },
    { id: 'creative', name: 'Creative & Media' },
    { id: 'trades', name: 'Skilled Trades' },
    { id: 'business', name: 'Business & Entrepreneurship' },
    { id: 'healthcare', name: 'Healthcare & Wellbeing' },
    { id: 'sustainability', name: 'Sustainability & Environment' }
  ];

  // Fetch videos on component mount
  useEffect(() => {
    console.log('InfiniteVideoFeed useEffect for fetching videos triggered');
    
    const fetchVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let fetchedVideos: Video[];
        
        if (currentUser) {
          console.log('Fetching personalized recommendations for user:', currentUser.uid);
          // Get personalized recommendations if user is logged in
          fetchedVideos = await getPersonalizedRecommendations(currentUser.uid, 50);
        } else if (selectedCategory) {
          console.log('Fetching videos by category:', selectedCategory);
          // Get videos by category if category is selected
          fetchedVideos = await getVideosByCategory(selectedCategory);
        } else {
          console.log('Fetching all videos');
          // Get all videos
          fetchedVideos = await getAllVideos();
        }
        
        console.log('Fetched videos count:', fetchedVideos.length);
        setVideos(fetchedVideos);
        setFilteredVideos(fetchedVideos);
        setCurrentVideoIndex(0); // Reset to first video when new videos are fetched
        setLoading(false);
      } catch (err) {
        console.error('Error fetching videos:', err);
        setError('Failed to load videos');
        setLoading(false);
      }
    };
    
    fetchVideos();
  }, [currentUser, selectedCategory]);

  // Filter videos when search query changes
  useEffect(() => {
    if (videos.length === 0) return;
    
    let filtered = [...videos];
    
    // Apply search filter if search term exists
    if (localSearchQuery.trim() !== '') {
      const term = localSearchQuery.toLowerCase();
      filtered = filtered.filter(video => 
        video.title.toLowerCase().includes(term) ||
        video.description.toLowerCase().includes(term) ||
        video.creator.toLowerCase().includes(term) ||
        video.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }
    
    console.log('Filtering videos:', videos.length, '→', filtered.length, 'search:', localSearchQuery);
    setFilteredVideos(filtered);
    setCurrentVideoIndex(0); // Reset to first video when filtering
  }, [localSearchQuery, videos]);

  // Handle category change
  const handleCategoryChange = (categoryId: string | null) => {
    console.log('Category changed from', selectedCategory, 'to', categoryId);
    setSelectedCategory(categoryId);
    setCurrentVideoIndex(0); // Reset to first video when category changes
    setLocalSearchQuery(''); // Clear search when changing category
  };

  // Handle search change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearchQuery(e.target.value);
  };

  // Handle like
  const handleLike = async (video: Video) => {
    if (currentUser) {
      try {
        await likeVideo(currentUser.uid, video);
      } catch (error) {
        console.error('Error liking video:', error);
      }
    }
    
    // Move to next video
    handleNextVideo();
    
    // Show assessment after every 3 liked videos
    if (currentVideoIndex % 3 === 0 && video.prompts && video.prompts.length > 0) {
      setAssessmentVideo(video);
      setShowAssessment(true);
    }
  };

  // Handle dislike
  const handleDislike = async (video: Video) => {
    if (currentUser) {
      try {
        await dislikeVideo(currentUser.uid, video);
      } catch (error) {
        console.error('Error disliking video:', error);
      }
    }
    
    // Move to next video
    handleNextVideo();
  };

  // Handle rating without advancing video
  const handleRateLike = async (video: Video) => {
    if (currentUser) {
      try {
        await likeVideo(currentUser.uid, video);
        console.log('Video liked without advancing');
      } catch (error) {
        console.error('Error liking video:', error);
      }
    }
  };

  const handleRateDislike = async (video: Video) => {
    if (currentUser) {
      try {
        await dislikeVideo(currentUser.uid, video);
        console.log('Video disliked without advancing');
      } catch (error) {
        console.error('Error disliking video:', error);
      }
    }
  };

  // Handle video expand
  const handleVideoExpand = (video: Video) => {
    // Could implement additional tracking here
    console.log('Video expanded:', video.id);
  };

  // Handle next video
  const handleNextVideo = () => {
    if (currentVideoIndex < filteredVideos.length - 1) {
      setCurrentVideoIndex(prevIndex => prevIndex + 1);
    } else {
      // No more videos available
      console.log('Reached end of videos');
    }
  };

  // Handle previous video (for navigation)
  const handlePreviousVideo = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(prevIndex => prevIndex - 1);
    }
  };

  // Handle assessment completion
  const handleAssessmentComplete = () => {
    setShowAssessment(false);
    setAssessmentVideo(null);
  };

  if (loading) {
    console.log('Rendering loading state');
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-blue"></div>
      </div>
    );
  }

  if (error) {
    console.log('Rendering error state:', error);
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-primary-blue text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  console.log('Rendering InfiniteVideoFeed component');
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Search and filter */}
      <div className="mb-8 space-y-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search videos..."
            value={localSearchQuery}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue dark:bg-gray-700 dark:text-white"
          />
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
        
        {/* Categories */}
        <div className="flex overflow-x-auto pb-2 space-x-2">
          {categories.map((category) => (
            <button
              key={category.id || 'all'}
              onClick={() => handleCategoryChange(category.id)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                selectedCategory === category.id
                  ? 'bg-primary-blue text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Single video display - Tinder style */}
      <div className="flex justify-center items-center min-h-[70vh]">
        <AnimatePresence mode="wait">
          {filteredVideos.length > 0 && currentVideoIndex < filteredVideos.length && (
            <motion.div
              key={`${filteredVideos[currentVideoIndex].id}-${currentVideoIndex}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-lg"
            >
              <SwipeableVideoCard
                video={filteredVideos[currentVideoIndex]}
                onSwipeLeft={handleDislike}
                onSwipeRight={handleLike}
                onExpand={handleVideoExpand}
                onLike={handleRateLike}
                onDislike={handleRateDislike}
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        {filteredVideos.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              {localSearchQuery ? 'No videos found matching your search.' : 'No videos available for this category.'}
            </p>
            {localSearchQuery && (
              <button 
                onClick={() => setLocalSearchQuery('')}
                className="mt-4 px-4 py-2 bg-primary-blue text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Clear Search
              </button>
            )}
          </div>
        )}
        
        {currentVideoIndex >= filteredVideos.length && filteredVideos.length > 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You've seen all available videos!
            </p>
            <div className="space-x-4">
              <button 
                onClick={() => setCurrentVideoIndex(0)}
                className="px-4 py-2 bg-primary-blue text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Start Over
              </button>
              <button 
                onClick={() => {
                  setSelectedCategory(null);
                  setLocalSearchQuery('');
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                View All Videos
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Video counter and navigation */}
      {filteredVideos.length > 0 && currentVideoIndex < filteredVideos.length && (
        <div className="text-center mt-4 space-y-2">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {currentVideoIndex + 1} of {filteredVideos.length} videos
          </div>
          <div className="flex justify-center space-x-4">
            {currentVideoIndex > 0 && (
              <button 
                onClick={handlePreviousVideo}
                className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Previous
              </button>
            )}
            {currentVideoIndex < filteredVideos.length - 1 && (
              <button 
                onClick={handleNextVideo}
                className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Next
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Assessment modal */}
      <AnimatePresence>
        {showAssessment && assessmentVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <VideoAssessment
              video={assessmentVideo}
              onComplete={handleAssessmentComplete}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InfiniteVideoFeed; 