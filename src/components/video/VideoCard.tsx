import React from 'react';
import { Link } from 'react-router-dom';
import { Video } from '../../services/videoService';

interface VideoCardProps {
  video: Video;
  className?: string;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, className = '' }) => {
  // Format video duration (seconds to MM:SS)
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Format publication date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Link 
      to={`/videos/${video.id}`} 
      className={`video-card block rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 ${className}`}
    >
      <div className="relative">
        <img 
          src={video.thumbnailUrl} 
          alt={video.title} 
          className="w-full h-48 object-cover"
        />
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
          {formatDuration(video.duration)}
        </div>
      </div>
      <div className="p-4 bg-white">
        <h3 className="text-lg font-medium line-clamp-2 mb-1">{video.title}</h3>
        <p className="text-sm text-gray-600 mb-2">{video.creator}</p>
        <p className="text-xs text-gray-500 flex justify-between">
          <span>Added: {formatDate(video.curatedDate)}</span>
          <span>{video.viewCount || 0} views</span>
        </p>
      </div>
    </Link>
  );
};

export default VideoCard; 