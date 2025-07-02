import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVideoById, getUserVideoProgress, Video, saveReflectionResponse, getPopularVideos } from '../services/videoService';
import VideoPlayer from '../components/video/VideoPlayer';
import { useAuth } from '../context/AuthContext';
import VideoGrid from '../components/video/VideoGrid';
import { getRecommendedVideos } from '../services/videoService';
import { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { User } from '../models/User';

const VideoDetail: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [recommendedVideos, setRecommendedVideos] = useState<Video[]>([]);
  const [activePromptIndex, setActivePromptIndex] = useState<number | null>(null);
  const [promptResponses, setPromptResponses] = useState<Record<string, string>>({});

  // Fetch video data
  useEffect(() => {
    const fetchVideoData = async () => {
      if (!videoId) {
        setError('Video ID is missing');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Get video details
        const videoData = await getVideoById(videoId);
        
        if (!videoData) {
          setError('Video not found');
          setLoading(false);
          return;
        }
        
        setVideo(videoData);
        
        // Get user's progress for this video if logged in
        if (currentUser) {
          const progress = await getUserVideoProgress(currentUser.uid, videoId);
          
          if (progress) {
            setStartTime(progress.watchedSeconds);
            
            // Load saved reflection responses
            const responses: Record<string, string> = {};
            progress.reflectionResponses.forEach(response => {
              responses[response.promptId] = response.response;
            });
            setPromptResponses(responses);
          }
          
          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            
            // Get recommended videos based on user preferences
            const recommended = await getRecommendedVideos(userData, 4);
            // Filter out the current video
            setRecommendedVideos(recommended.filter(v => v.id !== videoId));
          } else {
            // If no user data, show popular videos
            const popular = await getPopularVideos(4);
            setRecommendedVideos(popular.filter(v => v.id !== videoId));
          }
        } else {
          // If not logged in, show popular videos
          const popular = await getPopularVideos(4);
          setRecommendedVideos(popular.filter(v => v.id !== videoId));
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching video data:', err);
        setError('Failed to load video data');
        setLoading(false);
      }
    };
    
    fetchVideoData();
  }, [videoId, currentUser]);

  // Handle video progress updates
  const handleProgress = (currentTime: number, duration: number) => {
    setCurrentTime(currentTime);
    
    // Check if any prompts should be shown based on video time
    if (video && video.prompts.length > 0) {
      const promptIndex = video.prompts.findIndex(prompt => 
        prompt.appearTime !== undefined && 
        Math.abs(currentTime - prompt.appearTime) < 1
      );
      
      if (promptIndex >= 0 && activePromptIndex !== promptIndex) {
        setActivePromptIndex(promptIndex);
      }
    }
  };

  // Handle reflection prompt responses
  const handlePromptResponse = async (promptId: string, response: string) => {
    if (!currentUser || !videoId) return;
    
    try {
      // Save response to Firestore
      await saveReflectionResponse(currentUser.uid, videoId, promptId, response);
      
      // Update local state
      setPromptResponses(prev => ({
        ...prev,
        [promptId]: response
      }));
    } catch (err) {
      console.error('Error saving reflection response:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-blue"></div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="text-red-500 mb-4">{error || 'Video not available'}</p>
        <button 
          onClick={() => navigate('/videos')}
          className="bg-primary-blue text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Back to Videos
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Video player and details */}
        <div className="lg:col-span-2">
          <div className="aspect-w-16 aspect-h-9 mb-4">
            <VideoPlayer 
              video={video} 
              startTime={startTime}
              onProgress={handleProgress}
            />
          </div>
          
          <h1 className="text-2xl font-bold mb-2">{video.title}</h1>
          
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-gray-600">{video.creator}</p>
              {video.creatorUrl && (
                <a 
                  href={video.creatorUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary-blue text-sm hover:underline"
                >
                  View Channel
                </a>
              )}
            </div>
            <div className="text-gray-500 text-sm">
              {video.viewCount || 0} views
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-2">Description</h2>
            <p className="text-gray-700 whitespace-pre-line">{video.description}</p>
          </div>
          
          {/* Skills and education */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-2">Skills Highlighted</h2>
              <div className="flex flex-wrap gap-2">
                {video.skillsHighlighted.map((skill, index) => (
                  <span 
                    key={index} 
                    className="bg-primary-mint text-gray-800 px-3 py-1 rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-2">Education Pathways</h2>
              <div className="flex flex-wrap gap-2">
                {video.educationRequired.map((education, index) => (
                  <span 
                    key={index} 
                    className="bg-primary-lavender text-gray-800 px-3 py-1 rounded-full text-sm"
                  >
                    {education}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          {/* Reflection prompts */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">Reflection Prompts</h2>
            
            {video.prompts.map((prompt, index) => (
              <div 
                key={prompt.id} 
                className={`mb-4 p-4 rounded-lg ${
                  activePromptIndex === index ? 'bg-primary-yellow' : 'bg-gray-100'
                }`}
              >
                <h3 className="font-medium mb-2">{prompt.question}</h3>
                <div className="space-y-2">
                  {prompt.options.map((option, optionIndex) => (
                    <label 
                      key={optionIndex} 
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input 
                        type="radio" 
                        name={`prompt-${prompt.id}`} 
                        value={option}
                        checked={promptResponses[prompt.id] === option}
                        onChange={() => handlePromptResponse(prompt.id, option)}
                        className="form-radio text-primary-blue"
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            
            {!currentUser && (
              <div className="text-center py-2 text-gray-500">
                <p>Sign in to save your reflections</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Recommended videos */}
        <div className="lg:col-span-1">
          <VideoGrid 
            videos={recommendedVideos} 
            title="Recommended Videos" 
            emptyMessage="Sign in to see personalized recommendations"
          />
        </div>
      </div>
    </div>
  );
};

export default VideoDetail; 