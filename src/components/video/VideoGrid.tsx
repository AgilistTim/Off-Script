import React from 'react';
import VideoCard from './VideoCard';
import { Video } from '../../services/videoService';

interface VideoGridProps {
  videos: Video[];
  title?: string;
  emptyMessage?: string;
  className?: string;
}

const VideoGrid: React.FC<VideoGridProps> = ({
  videos,
  title,
  emptyMessage = 'No videos found',
  className = ''
}) => {
  return (
    <div className={`video-grid ${className}`}>
      {title && <h2 className="text-2xl font-semibold mb-4">{title}</h2>}
      
      {videos.length === 0 ? (
        <div className="text-center py-8 text-gray-500">{emptyMessage}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {videos.map(video => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoGrid; 