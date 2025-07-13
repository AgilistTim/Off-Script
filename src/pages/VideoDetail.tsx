import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVideoById } from '../services/videoService';
import { Video } from '../services/videoService';
import { ArrowLeft, ThumbsUp, ThumbsDown, Heart, Share } from 'react-feather';
import { useAuth } from '../context/AuthContext';
import VideoPlayer from '../components/video/VideoPlayer';
import NotFound from './NotFound';
import LoadingSpinner from '../components/LoadingSpinner';
import { likeVideo, dislikeVideo, getUserPreferences, UserPreference } from '../services/userPreferenceService';

const VideoDetail: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [userPreferences, setUserPreferences] = useState<UserPreference | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [actionLoading, setActionLoading] = useState<'like' | 'dislike' | null>(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Load user preferences and determine like/dislike status
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!currentUser || !video) return;
      
      try {
        const preferences = await getUserPreferences(currentUser.uid);
        setUserPreferences(preferences);
        
        if (preferences) {
          setIsLiked(preferences.likedVideos.includes(video.id));
          setIsDisliked(preferences.dislikedVideos.includes(video.id));
        }
      } catch (error) {
        console.error('Error loading user preferences:', error);
      }
    };

    loadUserPreferences();
  }, [currentUser, video]);

  // Handle like action
  const handleLike = async () => {
    if (!currentUser || !video || actionLoading) return;
    
    setActionLoading('like');
    try {
      await likeVideo(currentUser.uid, video);
      setIsLiked(true);
      setIsDisliked(false);
      
      // Update local preferences
      const updatedPreferences = await getUserPreferences(currentUser.uid);
      setUserPreferences(updatedPreferences);
    } catch (error) {
      console.error('Error liking video:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle dislike action
  const handleDislike = async () => {
    if (!currentUser || !video || actionLoading) return;
    
    setActionLoading('dislike');
    try {
      await dislikeVideo(currentUser.uid, video);
      setIsDisliked(true);
      setIsLiked(false);
      
      // Update local preferences
      const updatedPreferences = await getUserPreferences(currentUser.uid);
      setUserPreferences(updatedPreferences);
    } catch (error) {
      console.error('Error disliking video:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle share action
  const handleShare = async () => {
    if (!video) return;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: video.title,
          text: `Check out this career video: ${video.title}`,
          url: window.location.href,
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(window.location.href);
        // Could add a toast notification here
      }
    } catch (error) {
      console.error('Error sharing video:', error);
    }
  };

  useEffect(() => {
    const fetchVideo = async () => {
      if (!videoId) {
        setError('No video ID provided');
        setLoading(false);
        return;
      }

      try {
        console.log(`Fetching video with ID: ${videoId}`);
        const videoData = await getVideoById(videoId);
        
        if (!videoData) {
          console.log('Video not found');
          setNotFound(true);
          setLoading(false);
          return;
        }
        
        console.log('Video data:', videoData);
        setVideo(videoData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching video:', err);
        setError('Failed to load video');
        setLoading(false);
      }
    };

    setLoading(true);
    fetchVideo();
  }, [videoId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (notFound) {
    return <NotFound />;
  }

  if (error || !video) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Error</h2>
          <p className="text-gray-700 dark:text-gray-300">{error || 'Failed to load video'}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 flex items-center text-blue-600 dark:text-blue-400 hover:underline"
          >
            <ArrowLeft size={16} className="mr-1" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Videos
        </button>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main video content - larger on desktop */}
          <div className="xl:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              {/* Enhanced video player with better aspect ratio */}
              <div className="relative bg-black">
                <div className="aspect-w-16 aspect-h-9">
                  <VideoPlayer 
                    video={video} 
                    autoplay={false}
                    className="w-full h-full"
                  />
                </div>
              </div>
              
              {/* Video info and controls */}
              <div className="p-6">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  {video.title}
                </h1>
                
                {/* Video meta and action buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">{video.viewCount?.toLocaleString() || 0} views</span>
                    <span className="mx-2">•</span>
                    <span>{video.publicationDate ? new Date(video.publicationDate).toLocaleDateString() : 'Unknown date'}</span>
                    {video.duration > 0 && (
                      <>
                        <span className="mx-2">•</span>
                        <span>{Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}</span>
                      </>
                    )}
                  </div>
                  
                  {/* Action buttons */}
                  {currentUser && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleLike}
                        disabled={actionLoading === 'like'}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                          isLiked
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        } ${actionLoading === 'like' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <ThumbsUp size={18} className={isLiked ? 'fill-current' : ''} />
                        <span>Like</span>
                      </button>
                      
                      <button
                        onClick={handleDislike}
                        disabled={actionLoading === 'dislike'}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                          isDisliked
                            ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        } ${actionLoading === 'dislike' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <ThumbsDown size={18} className={isDisliked ? 'fill-current' : ''} />
                        <span>Dislike</span>
                      </button>
                      
                      <button
                        onClick={handleShare}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                      >
                        <Share size={18} />
                        <span>Share</span>
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Creator info */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg font-bold text-white">
                      {video.creator?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {video.creator || 'Unknown creator'}
                      </h3>
                      <div className="flex items-center gap-2 mb-3">
                        {video.category && (
                          <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs px-3 py-1 rounded-full font-medium">
                            {video.category}
                          </span>
                        )}
                      </div>
                      <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                        {video.description || 'No description available.'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sidebar - more compact on desktop */}
          <div className="xl:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Skills Highlighted</h2>
              <div className="flex flex-wrap gap-2 mb-6">
                {video.skillsHighlighted && video.skillsHighlighted.length > 0 ? (
                  video.skillsHighlighted.map((skill, index) => (
                    <span 
                      key={index} 
                      className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-sm px-3 py-1 rounded-full font-medium"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">No skills highlighted</span>
                )}
              </div>
              
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Education Pathways</h2>
              <div className="flex flex-wrap gap-2">
                {video.educationRequired && video.educationRequired.length > 0 ? (
                  video.educationRequired.map((education, index) => (
                    <span 
                      key={index} 
                      className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-sm px-3 py-1 rounded-full font-medium"
                    >
                      {education}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">No education pathways specified</span>
                )}
              </div>
            </div>

            {/* User engagement insight */}
            {currentUser && userPreferences && (
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Your Learning Journey
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Videos Liked:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {userPreferences.likedVideos.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Engagement Score:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {userPreferences.interactionScore || 0}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoDetail; 