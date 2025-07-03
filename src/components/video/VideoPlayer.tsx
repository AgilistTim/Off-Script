import React from 'react';
import YouTubePlayer from './YouTubePlayer';
import { Video } from '../../services/videoService';
import './VideoPlayer.css';

interface VideoPlayerProps {
  video: Video;
  startTime?: number;
  autoplay?: boolean;
  onReady?: () => void;
  onProgress?: (currentTime: number, duration: number) => void;
  className?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  startTime = 0,
  autoplay = false,
  onReady,
  onProgress,
  className = ''
}) => {
  // Render different player based on video source type
  switch (video.sourceType) {
    case 'youtube':
      return (
        <div className={`video-container ${className}`}>
          <YouTubePlayer
            videoId={video.sourceId}
            firebaseVideoId={video.id}
            startTime={startTime}
            autoplay={autoplay}
            onReady={onReady}
            onProgress={onProgress}
            className="w-full h-full"
          />
        </div>
      );
      
    case 'vimeo':
      // TODO: Implement Vimeo player
      return (
        <div className={`vimeo-player-container ${className}`}>
          <p>Vimeo player not yet implemented</p>
          <p>Video ID: {video.sourceId}</p>
        </div>
      );
      
    case 'instagram':
      // TODO: Implement Instagram player
      return (
        <div className={`instagram-player-container ${className}`}>
          <p>Instagram player not yet implemented</p>
          <p>Video ID: {video.sourceId}</p>
        </div>
      );
      
    default:
      // Fallback to iframe for other sources
      return (
        <div className={`generic-player-container ${className}`}>
          <iframe
            src={video.sourceUrl}
            title={video.title}
            width="100%"
            height="100%"
            frameBorder="0"
            allowFullScreen
          />
        </div>
      );
  }
};

export default VideoPlayer; 