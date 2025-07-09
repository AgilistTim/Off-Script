import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Video } from '../../services/videoService';

interface VideoCardProps {
  video: Video;
  className?: string;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, className = '' }) => {
  const [thumbnailError, setThumbnailError] = useState(false);
  
  // Format video duration
  const formatDuration = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Generate a colored placeholder based on video title
  const generateColoredPlaceholder = (title: string): string => {
    if (!title) return 'https://placehold.co/600x400/e5e7eb/6b7280?text=Video';
    
    // Generate a color based on the title hash
    const colors = [
      { bg: 'e3f2fd', text: '1976d2' }, // Blue
      { bg: 'f3e5f5', text: '7b1fa2' }, // Purple  
      { bg: 'e8f5e8', text: '388e3c' }, // Green
      { bg: 'fff3e0', text: 'f57c00' }, // Orange
      { bg: 'fce4ec', text: 'c2185b' }, // Pink
      { bg: 'e0f2f1', text: '00796b' }, // Teal
    ];
    
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = ((hash << 5) - hash) + title.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    const colorIndex = Math.abs(hash) % colors.length;
    const { bg, text } = colors[colorIndex];
    
    // Get initials from title (up to 2 characters)
    const words = title.split(' ').filter(word => word.length > 0);
    const initials = words.length >= 2 
      ? words[0][0] + words[1][0] 
      : words[0] ? words[0].substring(0, 2) : 'V';
    
    return `https://placehold.co/600x400/${bg}/${text}?text=${encodeURIComponent(initials.toUpperCase())}`;
  };
  
  // Get the best available thumbnail URL with multiple fallbacks
  const getThumbnailUrl = (): string => {
    // If we've already had an error, use placeholder
    if (thumbnailError) {
      return generateColoredPlaceholder(video.title);
    }
    
    // If no thumbnail URL is provided or it's clearly a placeholder, generate a better one
    if (!video.thumbnailUrl || 
        video.thumbnailUrl.includes('placehold.co') ||
        video.thumbnailUrl === 'https://placehold.co/600x400?text=Video+Thumbnail') {
      
      // Try to generate YouTube thumbnail if we have a sourceId and it's YouTube
      if (video.sourceType === 'youtube' && video.sourceId && !video.sourceId.includes('example')) {
        return `https://i.ytimg.com/vi/${video.sourceId}/hqdefault.jpg`;
      }
      
      // Generate colored placeholder as fallback
      return generateColoredPlaceholder(video.title);
    }
    
    return video.thumbnailUrl;
  };
  
  // Handle thumbnail loading errors
  const handleThumbnailError = () => {
    if (!thumbnailError) {
      setThumbnailError(true);
    }
  };
  
  // Get display title with fallback
  const getDisplayTitle = (): string => {
    if (video.title && video.title !== 'Loading...' && video.title !== 'Untitled Video') {
      return video.title;
    }
    
    // Try to extract title from URL or use category
    if (video.sourceUrl && video.sourceUrl.includes('youtube.com')) {
      return 'YouTube Video';
    }
    
    return video.category ? `${video.category} Video` : 'Video';
  };
  
  // Get display creator with fallback
  const getDisplayCreator = (): string => {
    if (video.creator && video.creator !== 'Loading...' && video.creator !== 'Unknown creator') {
      return video.creator;
    }
    
    return 'Unknown Creator';
  };
  
  const displayTitle = getDisplayTitle();
  const displayCreator = getDisplayCreator();
  
  return (
    <Link to={`/videos/${video.id}`} className={`block ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="aspect-video bg-gray-200 dark:bg-gray-700 relative">
          <img 
            src={getThumbnailUrl()}
            alt={displayTitle} 
            className="w-full h-full object-cover"
            onError={handleThumbnailError}
            loading="lazy"
          />
          {video.duration > 0 && (
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
              {formatDuration(video.duration)}
            </div>
          )}
          
          {/* Category badge */}
          {video.category && (
            <div className="absolute top-2 left-2 bg-blue-500 bg-opacity-90 text-white text-xs px-2 py-1 rounded">
              {video.category}
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-medium text-gray-800 dark:text-white line-clamp-2 text-sm leading-tight">
            {displayTitle}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
            {displayCreator}
          </p>
          
          {/* View count and duration info */}
          <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
            {video.viewCount > 0 && (
              <span>{video.viewCount.toLocaleString()} views</span>
            )}
            {video.publicationDate && (
              <span>{new Date(video.publicationDate).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default VideoCard; 