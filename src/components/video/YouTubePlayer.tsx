import React, { useEffect, useRef, useState } from 'react';
import YouTube, { YouTubeEvent, YouTubePlayer as YTPlayer } from 'react-youtube';
import { useAuth } from '../../context/AuthContext';
import { saveVideoProgress, incrementVideoViewCount, getVideoById, Video } from '../../services/videoService';
import { useVideoQuestions } from '../../hooks/useVideoQuestions';
import InlineQuestionOverlay from './InlineQuestionOverlay';

interface YouTubePlayerProps {
  videoId: string;
  firebaseVideoId: string;
  onReady?: () => void;
  onStateChange?: (state: number) => void;
  onProgress?: (currentTime: number, duration: number) => void;
  startTime?: number;
  autoplay?: boolean;
  className?: string;
  enableInlineQuestions?: boolean;
  questionSettings?: {
    maxQuestions?: number;
    minTimeBetweenQuestions?: number;
    autoGenerate?: boolean;
    questionTypes?: ('binary_choice' | 'preference' | 'career_direction' | 'skill_interest')[];
  };
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  firebaseVideoId,
  onReady,
  onStateChange,
  onProgress,
  startTime = 0,
  autoplay = false,
  className = '',
  enableInlineQuestions = true,
  questionSettings = {}
}) => {
  const { currentUser } = useAuth();
  const [player, setPlayer] = useState<YTPlayer | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [video, setVideo] = useState<Video | null>(null);
  
  // Load video data for questions system
  useEffect(() => {
    const loadVideo = async () => {
      if (!firebaseVideoId || !enableInlineQuestions) return;
      
      try {
        const videoData = await getVideoById(firebaseVideoId);
        if (videoData) {
          setVideo(videoData);
        }
      } catch (error) {
        console.error('Error loading video data for questions:', error);
      }
    };

    loadVideo();
  }, [firebaseVideoId, enableInlineQuestions]);

  // Initialize questions system
  const {
    questionState,
    answerQuestion,
    resetQuestions,
    hasQuestionsForVideo,
    isGeneratingQuestions
  } = useVideoQuestions({
    video: video || {} as Video,
    isPlaying,
    currentTime,
    duration,
    enableQuestions: enableInlineQuestions && !!video,
    questionSettings
  });
  
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
    
    // Get video duration
    const videoDuration = event.target.getDuration();
    setDuration(videoDuration);
    
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
          incrementVideoViewCount(firebaseVideoId).catch(console.error);
        }
        
        // Start tracking progress
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
        
        progressInterval.current = setInterval(() => {
          if (player && currentUser) {
            const currentVideoTime = player.getCurrentTime();
            const videoDuration = player.getDuration();
            
            // Update local state for questions system
            setCurrentTime(currentVideoTime);
            setDuration(videoDuration);
            
            // Save progress to Firestore every 5 seconds
            if (currentVideoTime % 5 < 1) {
              saveVideoProgress({
                userId: currentUser.uid,
                videoId: firebaseVideoId,
                watchedSeconds: currentVideoTime,
                completed: currentVideoTime / videoDuration > 0.9, // Mark as completed if watched 90%
                reflectionResponses: []
              }).catch(console.error);
            }
            
            // Call onProgress callback if provided
            if (onProgress) {
              onProgress(currentVideoTime, videoDuration);
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
          const currentVideoTime = player.getCurrentTime();
          const videoDuration = player.getDuration();
          
          saveVideoProgress({
            userId: currentUser.uid,
            videoId: firebaseVideoId,
            watchedSeconds: currentVideoTime,
            completed: state === YouTube.PlayerState.ENDED || currentVideoTime / videoDuration > 0.9,
            reflectionResponses: []
          }).catch(console.error);
        }
        break;
        
      default:
        break;
    }
  };

  // Handle question answer
  const handleQuestionAnswer = async (selectedOption: 'A' | 'B' | 'skip', responseTime: number) => {
    await answerQuestion(selectedOption, responseTime);
  };

  // Handle question dismiss
  const handleQuestionDismiss = () => {
    // For now, treat dismiss as skip
    if (questionState.currentQuestion) {
      handleQuestionAnswer('skip', 0);
    }
  };

  return (
    <div className={`youtube-player-container relative w-full h-full ${className}`}>
      <YouTube
        videoId={videoId}
        opts={{
          height: '100%',
          width: '100%',
          playerVars: {
            autoplay: autoplay ? 1 : 0,
            modestbranding: 1,
            rel: 0,
            start: Math.floor(startTime),
            controls: 1,
            showinfo: 0,
            iv_load_policy: 3,
            cc_load_policy: 0,
            disablekb: 0,
            enablejsapi: 1,
            origin: window.location.origin,
            playsinline: 1,
            fs: 1, // Allow fullscreen
            hl: 'en', // Set language to English
            color: 'red' // Use red progress bar
          }
        }}
        onReady={handleReady}
        onStateChange={handleStateChange}
        onError={(event: YouTubeEvent) => {
          console.error('YouTube player error:', event.data);
        }}
        className="youtube-player w-full h-full"
        iframeClassName="w-full h-full"
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      
      {/* Inline Questions Overlay */}
      {enableInlineQuestions && questionState.currentQuestion && (
        <InlineQuestionOverlay
          question={questionState.currentQuestion}
          isVisible={questionState.isQuestionVisible}
          onAnswer={handleQuestionAnswer}
          onDismiss={handleQuestionDismiss}
          position="bottom"
          showTimer={true}
          autoHideDelay={15}
        />
      )}

      {/* Question Generation Indicator (Development only) */}
      {process.env.NODE_ENV === 'development' && isGeneratingQuestions && (
        <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm z-30">
          Generating questions...
        </div>
      )}

      {/* Questions Debug Info (Development only) */}
      {process.env.NODE_ENV === 'development' && enableInlineQuestions && video && (
        <div className="absolute top-4 left-4 bg-black/50 text-white p-2 rounded text-xs z-30">
          <div>Questions: {questionState.totalQuestions}</div>
          <div>Answered: {questionState.questionsAnswered}</div>
          <div>Has Questions: {hasQuestionsForVideo ? 'Yes' : 'No'}</div>
          <div>Time: {Math.floor(currentTime)}s / {Math.floor(duration)}s</div>
          {questionState.currentQuestion && (
            <div>Next Q: {questionState.currentQuestion.timestamp}s</div>
          )}
        </div>
      )}
    </div>
  );
};

export default YouTubePlayer; 