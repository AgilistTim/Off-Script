import React, { useState, useRef, useEffect } from 'react';
import { motion, PanInfo, useAnimation } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Play, Maximize2, Minimize2 } from 'lucide-react';
import { Video } from '../../services/videoService';
import VideoPlayer from './VideoPlayer';

// Placeholder image URL
const PLACEHOLDER_THUMBNAIL = 'https://placehold.co/600x400?text=Video+Thumbnail';

interface SwipeableVideoCardProps {
  video: Video;
  onSwipeLeft: (video: Video) => void;
  onSwipeRight: (video: Video) => void;
  onExpand: (video: Video) => void;
  onLike?: (video: Video) => void;
  onDislike?: (video: Video) => void;
}

const SwipeableVideoCard: React.FC<SwipeableVideoCardProps> = ({
  video,
  onSwipeLeft,
  onSwipeRight,
  onExpand,
  onLike,
  onDislike
}) => {
  console.log('SwipeableVideoCard rendering for video:', video.title);
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [thumbnailError, setThumbnailError] = useState(false);
  const [userPreference, setUserPreference] = useState<'like' | 'dislike' | null>(null);
  const controls = useAnimation();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('SwipeableVideoCard mounted for video:', video.title);
    return () => {
      console.log('SwipeableVideoCard unmounted for video:', video.title);
    };
  }, [video.title]);

  // Format video duration (seconds to MM:SS)
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    console.log('Drag ended with offset:', info.offset.x);
    setIsDragging(false);
    const threshold = 100; // minimum distance required for a swipe
    
    if (Math.abs(info.offset.x) < threshold) {
      console.log('Drag threshold not met, resetting position');
      // Reset position if not swiped far enough
      controls.start({ x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } });
      return;
    }
    
    // Determine swipe direction
    if (info.offset.x > 0) {
      console.log('Swiped right (like)');
      // Swiped right (like)
      controls.start({ 
        x: window.innerWidth, 
        opacity: 0,
        transition: { duration: 0.3 }
      });
      onSwipeRight(video);
    } else {
      console.log('Swiped left (dislike)');
      // Swiped left (dislike)
      controls.start({ 
        x: -window.innerWidth, 
        opacity: 0,
        transition: { duration: 0.3 }
      });
      onSwipeLeft(video);
    }
  };

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(true);
    setDragPosition({ x: info.offset.x, y: info.offset.y });
    
    // Calculate rotation based on drag distance
    const rotationFactor = 0.05;
    const rotation = info.offset.x * rotationFactor;
    
    // Calculate opacity reduction as card is dragged
    const maxOpacityChange = 0.5;
    const opacityFactor = Math.min(Math.abs(info.offset.x) / 200, maxOpacityChange);
    const opacity = 1 - opacityFactor;
    
    controls.start({
      x: info.offset.x,
      rotate: rotation,
      opacity
    });
  };

  const handleClickExpand = () => {
    if (!isDragging) {
      console.log('Video expand clicked, current state:', isExpanded);
      if (isExpanded) {
        setIsExpanded(false);
      } else {
        setIsExpanded(true);
        onExpand(video);
      }
    }
  };

  // Handle button clicks for rating (doesn't advance video)
  const handleRatingButtonClick = (direction: 'like' | 'dislike', e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`Rating button clicked: ${direction}`);
    
    setUserPreference(direction);
    
    if (direction === 'like' && onLike) {
      onLike(video);
    } else if (direction === 'dislike' && onDislike) {
      onDislike(video);
    }
    
    // Show brief visual feedback
    setTimeout(() => {
      setUserPreference(null);
    }, 2000);
  };

  // Handle swipe gestures (advances to next video)
  const handleSwipeButtonClick = (direction: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`Swipe button clicked: ${direction}`);
    
    if (direction === 'left') {
      controls.start({ 
        x: -window.innerWidth, 
        opacity: 0,
        transition: { duration: 0.3 }
      });
      onSwipeLeft(video);
    } else {
      controls.start({ 
        x: window.innerWidth, 
        opacity: 0,
        transition: { duration: 0.3 }
      });
      onSwipeRight(video);
    }
  };

  const handleImageError = () => {
    console.log('Thumbnail failed to load:', video.thumbnailUrl);
    setThumbnailError(true);
  };

  return (
    <motion.div
      ref={cardRef}
      className={`w-full mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden ${
        isExpanded ? 'max-w-4xl' : 'max-w-lg'
      }`}
      animate={controls}
      drag={!isExpanded ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      onDrag={handleDrag}
      initial={{ x: 0, opacity: 1 }}
      whileTap={{ scale: isExpanded ? 1 : 0.98 }}
      layout
      transition={{ duration: 0.3 }}
    >
      <div 
        className="cursor-pointer" 
        onClick={handleClickExpand}
      >
        {isExpanded ? (
          <div className="relative">
            <div className="w-full aspect-video bg-black">
              <VideoPlayer video={video} autoplay={true} className="w-full h-full" />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
              className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-opacity z-10"
            >
              <Minimize2 size={16} />
            </button>
          </div>
        ) : (
          <div className="relative">
            <img 
              src={thumbnailError ? PLACEHOLDER_THUMBNAIL : video.thumbnailUrl} 
              alt={video.title}
              className="w-full aspect-video object-cover"
              onError={handleImageError}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
              <div className="bg-white bg-opacity-80 rounded-full p-4">
                <Play size={32} className="text-primary-blue" />
              </div>
            </div>
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
              {formatDuration(video.duration)}
            </div>
            <div className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 text-white rounded-full">
              <Maximize2 size={16} />
            </div>
          </div>
        )}
        
        <div className="p-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1 line-clamp-2">{video.title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{video.creator}</p>
          
          {isExpanded && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-4">
              {video.description}
            </p>
          )}
          
          <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
            <span>{video.viewCount || 0} views</span>
            <div className="flex gap-2">
              {video.tags.slice(0, 2).map((tag, index) => (
                <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                  {tag}
                </span>
              ))}
              <span className="px-2 py-1 bg-primary-blue/10 text-primary-blue rounded-full">
                {video.category}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Rating buttons - rate without advancing video */}
      <div className="flex justify-between p-4 border-t border-gray-200 dark:border-gray-700">
        <button 
          onClick={(e) => handleRatingButtonClick('dislike', e)}
          className={`p-3 rounded-full transition-colors ${
            userPreference === 'dislike' 
              ? 'bg-red-500 text-white' 
              : 'bg-gray-100 dark:bg-gray-700 text-red-500 hover:bg-red-100 dark:hover:bg-red-900'
          }`}
        >
          <ThumbsDown size={20} />
        </button>
        <button 
          onClick={(e) => handleRatingButtonClick('like', e)}
          className={`p-3 rounded-full transition-colors ${
            userPreference === 'like' 
              ? 'bg-green-500 text-white' 
              : 'bg-gray-100 dark:bg-gray-700 text-green-500 hover:bg-green-100 dark:hover:bg-green-900'
          }`}
        >
          <ThumbsUp size={20} />
        </button>
      </div>
      
      {/* Swipe indicators that appear when dragging - only show when not expanded */}
      {!isExpanded && (
        <>
          <motion.div 
            className="absolute top-4 left-4 bg-red-500 text-white p-2 rounded-full"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: isDragging && dragPosition.x < -20 ? 1 : 0,
              scale: isDragging && dragPosition.x < -20 ? 1 : 0.8
            }}
          >
            <ThumbsDown size={24} />
          </motion.div>
          
          <motion.div 
            className="absolute top-4 right-4 bg-green-500 text-white p-2 rounded-full"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: isDragging && dragPosition.x > 20 ? 1 : 0,
              scale: isDragging && dragPosition.x > 20 ? 1 : 0.8
            }}
          >
            <ThumbsUp size={24} />
          </motion.div>
        </>
      )}
    </motion.div>
  );
};

export default SwipeableVideoCard; 