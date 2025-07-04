import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVideoById } from '../services/videoService';
import { Video } from '../services/videoService';
import { ArrowLeft } from 'react-feather';
import { useAuth } from '../context/AuthContext';
import VideoPlayer from '../components/video/VideoPlayer';
import NotFound from './NotFound';
import LoadingSpinner from '../components/LoadingSpinner';

const VideoDetail: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

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
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-8">
            <div className="aspect-w-16 aspect-h-9">
              <VideoPlayer video={video} />
            </div>
            
            <div className="p-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{video.title}</h1>
              
              <div className="flex flex-wrap items-center justify-between mb-4">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <span>{video.viewCount || 0} views</span>
                  <span className="mx-2">•</span>
                  <span>{video.publicationDate ? new Date(video.publicationDate).toLocaleDateString() : 'Unknown date'}</span>
                  {video.duration > 0 && (
                    <>
                      <span className="mx-2">•</span>
                      <span>{Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="border-t border-b border-gray-200 dark:border-gray-700 py-4 mb-4">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-lg font-bold text-gray-600 dark:text-gray-300">
                    {video.creator?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="ml-3">
                    <h3 className="font-medium text-gray-900 dark:text-white">{video.creator || 'Unknown creator'}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {video.category && <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs px-2 py-1 rounded-full">{video.category}</span>}
                    </p>
                  </div>
                </div>
                
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                  {video.description || 'No description available.'}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
            <h2 className="text-lg font-semibold mb-4">Skills Highlighted</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {video.skillsHighlighted && video.skillsHighlighted.length > 0 ? (
                video.skillsHighlighted.map((skill, index) => (
                  <span 
                    key={index} 
                    className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs px-2 py-1 rounded-full"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-gray-500 dark:text-gray-400">No skills highlighted</span>
              )}
            </div>
            
            <h2 className="text-lg font-semibold mb-2">Education Pathways</h2>
            <div className="flex flex-wrap gap-2">
              {video.educationRequired && video.educationRequired.length > 0 ? (
                video.educationRequired.map((education, index) => (
                  <span 
                    key={index} 
                    className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-xs px-2 py-1 rounded-full"
                  >
                    {education}
                  </span>
                ))
              ) : (
                <span className="text-gray-500 dark:text-gray-400">No education pathways specified</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoDetail; 