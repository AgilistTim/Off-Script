import React, { useEffect, useRef, useState } from 'react';
import YouTube, { YouTubeEvent, YouTubePlayer as YTPlayer } from 'react-youtube';
import { useAuth } from '../../context/AuthContext';
import { saveVideoProgress, incrementVideoViewCount } from '../../services/videoService';

interface YouTubePlayerProps {
  videoId: string;
  onReady?: () => void;
  onStateChange?: (state: number) => void;
  onProgress?: (currentTime: number, duration: number) => void;
  startTime?: number;
  autoplay?: boolean;
  className?: string;
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  onReady,
  onStateChange,
  onProgress,
  startTime = 0,
  autoplay = false,
  className = ''
}) => {
  const { currentUser } = useAuth();
  const [player, setPlayer] = useState<YTPlayer | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  
  // Clear interval on component unmount
  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  // Handle player ready event
  const handleReady = (event: YouTubeEvent) => {
    setPlayer(event.target);
    
    // If startTime is provided, seek to that position
    if (startTime > 0) {
      event.target.seekTo(startTime, true);
    }
    
    // Call onReady callback if provided
    if (onReady) {
      onReady();
    }
  };

  // Handle player state change
  const handleStateChange = (event: YouTubeEvent) => {
    const state = event.data;
    
    // Call onStateChange callback if provided
    if (onStateChange) {
      onStateChange(state);
    }
    
    // Handle different player states
    switch (state) {
      case YouTube.PlayerState.PLAYING:
        setIsPlaying(true);
        
        // If this is the first time the video is played, increment view count
        if (!hasStarted && currentUser) {
          setHasStarted(true);
          incrementVideoViewCount(videoId).catch(console.error);
        }
        
        // Start tracking progress
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
        
        progressInterval.current = setInterval(() => {
          if (player && currentUser) {
            const currentTime = player.getCurrentTime();
            const duration = player.getDuration();
            
            // Save progress to Firestore every 5 seconds
            if (currentTime % 5 < 1) {
              saveVideoProgress({
                userId: currentUser.uid,
                videoId,
                watchedSeconds: currentTime,
                completed: currentTime / duration > 0.9, // Mark as completed if watched 90%
                reflectionResponses: []
              }).catch(console.error);
            }
            
            // Call onProgress callback if provided
            if (onProgress) {
              onProgress(currentTime, duration);
            }
          }
        }, 1000);
        break;
        
      case YouTube.PlayerState.PAUSED:
      case YouTube.PlayerState.ENDED:
        setIsPlaying(false);
        
        // Clear progress tracking interval
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
          progressInterval.current = null;
        }
        
        // Save current progress
        if (player && currentUser) {
          const currentTime = player.getCurrentTime();
          const duration = player.getDuration();
          
          saveVideoProgress({
            userId: currentUser.uid,
            videoId,
            watchedSeconds: currentTime,
            completed: state === YouTube.PlayerState.ENDED || currentTime / duration > 0.9,
            reflectionResponses: []
          }).catch(console.error);
        }
        break;
        
      default:
        break;
    }
  };

  return (
    <div className={`youtube-player-container ${className}`}>
      <YouTube
        videoId={videoId}
        opts={{
          height: '100%',
          width: '100%',
          playerVars: {
            autoplay: autoplay ? 1 : 0,
            modestbranding: 1,
            rel: 0,
            start: Math.floor(startTime)
          }
        }}
        onReady={handleReady}
        onStateChange={handleStateChange}
        className="youtube-player"
      />
    </div>
  );
};

export default YouTubePlayer; 