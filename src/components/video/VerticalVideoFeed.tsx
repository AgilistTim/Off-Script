import React, { useState, useEffect, useCallback } from 'react';
import { Video, getAllVideos, getVideosByCategory } from '../../services/videoService';
import { likeVideo, dislikeVideo, getPersonalizedRecommendations, getUserPreferences } from '../../services/userPreferenceService';
import { useAuth } from '../../context/AuthContext';
import { Search, ThumbsUp, ThumbsDown, Play, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

interface VerticalVideoFeedProps {
  category?: string;
  searchQuery?: string;
}

const VerticalVideoFeed: React.FC<VerticalVideoFeedProps> = ({
  category,
  searchQuery = ''
}) => {
  const { currentUser } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(category || null);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());
  const [dislikedVideos, setDislikedVideos] = useState<Set<string>>(new Set());
  const [expandedVideos, setExpandedVideos] = useState<Set<string>>(new Set());

  // Categories for filtering
  const categories = [
    { id: null, name: 'All' },
    { id: 'technology', name: 'Technology & Digital' },
    { id: 'creative', name: 'Creative & Media' },
    { id: 'trades', name: 'Skilled Trades' },
    { id: 'business', name: 'Business & Entrepreneurship' },
    { id: 'healthcare', name: 'Healthcare & Wellbeing' },
    { id: 'sustainability', name: 'Sustainability & Environment' }
  ];

  // Fetch videos when component mounts or category changes
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let fetchedVideos: Video[];
        
        if (selectedCategory) {
          console.log('Fetching videos by category:', selectedCategory);
          fetchedVideos = await getVideosByCategory(selectedCategory, 50);
        } else if (currentUser) {
          console.log('Fetching personalized recommendations for user:', currentUser.uid);
          fetchedVideos = await getPersonalizedRecommendations(currentUser.uid, 50);
        } else {
          console.log('Fetching all videos');
          fetchedVideos = await getAllVideos(50);
        }
        
        console.log('Fetched videos count:', fetchedVideos.length);
        setVideos(fetchedVideos);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching videos:', err);
        setError('Failed to load videos');
        setLoading(false);
      }
    };

    fetchVideos();
  }, [currentUser, selectedCategory]);

  // Filter videos when search query or videos change
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
        video.tags.some(tag => tag.toLowerCase().includes(term)) ||
        video.category.toLowerCase().includes(term)
      );
    }
    
    console.log('Filtering videos:', videos.length, '→', filtered.length, 'search:', localSearchQuery);
    setFilteredVideos(filtered);
  }, [localSearchQuery, videos]);

  // Load user preferences when component mounts
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (currentUser) {
        try {
          const preferences = await getUserPreferences(currentUser.uid);
          if (preferences) {
            // Initialize liked videos
            if (preferences.likedVideos && preferences.likedVideos.length > 0) {
              setLikedVideos(new Set(preferences.likedVideos));
            }
            
            // Initialize disliked videos
            if (preferences.dislikedVideos && preferences.dislikedVideos.length > 0) {
              setDislikedVideos(new Set(preferences.dislikedVideos));
            }
            
            console.log('Loaded user preferences:', 
              preferences.likedVideos?.length || 0, 'liked videos,', 
              preferences.dislikedVideos?.length || 0, 'disliked videos');
          }
        } catch (error) {
          console.error('Error loading user preferences:', error);
        }
      }
    };
    
    loadUserPreferences();
  }, [currentUser]);

  // Handle category change
  const handleCategoryChange = (categoryId: string | null) => {
    console.log('Category changed from', selectedCategory, 'to', categoryId);
    setSelectedCategory(categoryId);
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
        setLikedVideos(prev => new Set([...prev, video.id]));
        setDislikedVideos(prev => {
          const newSet = new Set(prev);
          newSet.delete(video.id);
          return newSet;
        });
      } catch (error) {
        console.error('Error liking video:', error);
      }
    } else {
      // Temporary visual feedback for non-logged-in users
      setLikedVideos(prev => new Set([...prev, video.id]));
      setDislikedVideos(prev => {
        const newSet = new Set(prev);
        newSet.delete(video.id);
        return newSet;
      });
      
      // Show login prompt (you could replace this with a modal or redirect)
      console.log('User not logged in, showing feedback but not saving preference');
    }
  };

  // Handle dislike
  const handleDislike = async (video: Video) => {
    if (currentUser) {
      try {
        await dislikeVideo(currentUser.uid, video);
        setDislikedVideos(prev => new Set([...prev, video.id]));
        setLikedVideos(prev => {
          const newSet = new Set(prev);
          newSet.delete(video.id);
          return newSet;
        });
      } catch (error) {
        console.error('Error disliking video:', error);
      }
    } else {
      // Temporary visual feedback for non-logged-in users
      setDislikedVideos(prev => new Set([...prev, video.id]));
      setLikedVideos(prev => {
        const newSet = new Set(prev);
        newSet.delete(video.id);
        return newSet;
      });
      
      // Show login prompt (you could replace this with a modal or redirect)
      console.log('User not logged in, showing feedback but not saving preference');
    }
  };

  // Handle video expand/collapse
  const toggleVideoExpand = (videoId: string) => {
    setExpandedVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-blue"></div>
      </div>
    );
  }

  if (error) {
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Search and filter */}
      <div className="mb-8 space-y-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search career videos..."
            value={localSearchQuery}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue dark:bg-gray-700 dark:text-white"
          />
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
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

      {/* Video grid - vertical infinite scroll */}
      <div className="space-y-6">
        {filteredVideos.length === 0 && !loading ? (
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
        ) : (
          filteredVideos.map((video, index) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
            >
              {/* Video thumbnail */}
              <div className="relative">
                <img 
                  src={video.thumbnailUrl} 
                  alt={video.title}
                  className="w-full h-48 sm:h-64 object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://via.placeholder.com/640x360?text=Video+Thumbnail';
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toggleVideoExpand(video.id)}
                    className="bg-white bg-opacity-90 rounded-full p-4 hover:bg-opacity-100 transition-all"
                  >
                    <Play size={32} className="text-primary-blue" />
                  </button>
                </div>
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-sm px-2 py-1 rounded">
                  {formatDuration(video.duration)}
                </div>
              </div>

              {/* Video info */}
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {video.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {video.creator}
                </p>
                <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-3">
                  {video.description}
                </p>
                
                {/* Tags and category */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {video.tags.slice(0, 3).map((tag, tagIndex) => (
                    <span 
                      key={tagIndex} 
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                  <span className="px-2 py-1 bg-primary-blue/10 text-primary-blue rounded-full text-sm">
                    {video.category}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleDislike(video)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                        dislikedVideos.has(video.id)
                          ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
                          : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-red-900 dark:hover:text-red-400'
                      }`}
                    >
                      <ThumbsDown size={16} />
                      <span className="text-sm">Pass</span>
                    </button>
                    <button
                      onClick={() => handleLike(video)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                        likedVideos.has(video.id)
                          ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                          : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-green-900 dark:hover:text-green-400'
                      }`}
                    >
                      <ThumbsUp size={16} />
                      <span className="text-sm">Like</span>
                    </button>
                  </div>
                  <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                    <Eye size={16} className="mr-1" />
                    {video.viewCount || 0} views
                  </div>
                </div>

                {/* Expanded video player */}
                {expandedVideos.has(video.id) && (
                  <div className="mt-4 aspect-video bg-black rounded-lg overflow-hidden">
                    <iframe
                      src={`https://www.youtube.com/embed/${video.sourceId}?autoplay=1`}
                      title={video.title}
                      className="w-full h-full"
                      frameBorder="0"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Load more message */}
      {filteredVideos.length > 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Showing {filteredVideos.length} career videos
        </div>
      )}

      {/* Login prompt for non-logged-in users */}
      {!currentUser && filteredVideos.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <div className="mb-4 sm:mb-0">
              <h3 className="font-medium text-gray-800 dark:text-white">
                Sign in to save your preferences
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Create an account to get personalized career recommendations based on videos you like
              </p>
            </div>
            <div className="flex space-x-3">
              <a 
                href="/register" 
                className="px-4 py-2 bg-primary-blue text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Sign Up
              </a>
              <a 
                href="/login" 
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Log In
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerticalVideoFeed; 