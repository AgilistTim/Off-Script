import React, { useState, useRef } from 'react';
import { Play, Heart, Share2, BookmarkPlus, Clock, Users, TrendingUp, MessageCircle, ExternalLink, Lightbulb, Target, Briefcase } from 'lucide-react';
import { EnhancedVideoData } from '../../services/enhancedVideoService';

interface CareerVideoCardProps {
  video: EnhancedVideoData;
  onPlay?: (video: EnhancedVideoData) => void;
  onLike?: (videoId: string) => void;
  onBookmark?: (videoId: string) => void;
  onShare?: (video: EnhancedVideoData) => void;
  className?: string;
}

const CareerVideoCard: React.FC<CareerVideoCardProps> = ({
  video,
  onPlay,
  onLike,
  onBookmark,
  onShare,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'engage'>('overview');
  const [showInsights, setShowInsights] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Format duration
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Format view count
  const formatViewCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M views`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K views`;
    }
    return `${count} views`;
  };

  // Parse career analysis for insights
  const parseCareerInsights = () => {
    const analysis = video.aiAnalysis?.careerExplorationAnalysis || '';
    
    // Extract sections
    const themes = analysis.match(/## 1\. Key Career Themes\n(.*?)(?=##|$)/s)?.[1]?.trim() || '';
    const aspirational = analysis.match(/## 2\. Emotional and Aspirational Elements\n(.*?)(?=##|$)/s)?.[1]?.trim() || '';
    const skills = analysis.match(/## 3\. Relevant Soft Skills\n(.*?)(?=##|$)/s)?.[1]?.trim() || '';
    const environment = analysis.match(/## 4\. Work Environment & Challenges\n(.*?)(?=##|$)/s)?.[1]?.trim() || '';
    const quotes = analysis.match(/## 5\. Quotable Moments\n(.*?)(?=##|$)/s)?.[1]?.trim() || '';
    const questions = analysis.match(/## 6\. Reflective Questions\n(.*?)(?=##|$)/s)?.[1]?.trim() || '';
    const pathways = analysis.match(/## 7\. OffScript Career Pathways\n(.*?)(?=##|$)/s)?.[1]?.trim() || '';

    return { themes, aspirational, skills, environment, quotes, questions, pathways };
  };

  const insights = parseCareerInsights();

  // Extract reflective questions for engagement
  const getReflectiveQuestions = (): string[] => {
    const questionSection = insights.questions;
    const questions = questionSection.match(/\d+\.\s*(.+?)(?=\d+\.|$)/g) || [];
    return questions.map(q => q.replace(/^\d+\.\s*/, '').trim()).slice(0, 3);
  };

  const reflectiveQuestions = getReflectiveQuestions();

  return (
    <div 
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Video Thumbnail & Play Button */}
      <div className="relative group cursor-pointer" onClick={() => onPlay?.(video)}>
        <div className="aspect-video bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
          {video.thumbnailUrl ? (
            <img 
              src={video.thumbnailUrl} 
              alt={video.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play size={48} className="text-gray-400" />
            </div>
          )}
          
          {/* Play Button Overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="bg-white bg-opacity-90 rounded-full p-4">
              <Play size={32} className="text-gray-800 ml-1" />
            </div>
          </div>

          {/* Duration */}
          {video.youtubeMetadata?.duration && (
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded">
              {formatDuration(video.youtubeMetadata.duration)}
            </div>
          )}

          {/* AI Analysis Badge */}
          {video.aiAnalysis?.careerExplorationAnalysis && (
            <div className="absolute top-2 left-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
              <Lightbulb size={12} className="mr-1" />
              AI Analyzed
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title & Channel */}
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 mb-1">
            {video.title}
          </h3>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <span>{video.youtubeMetadata?.channelTitle || video.creator}</span>
            <span className="mx-2">•</span>
            <span>{formatViewCount(video.viewCount || 0)}</span>
          </div>
        </div>

        {/* Skills & Career Pathways */}
        <div className="mb-3">
          <div className="flex flex-wrap gap-1 mb-2">
            {video.skillsHighlighted?.slice(0, 3).map((skill, index) => (
              <span
                key={index}
                className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full"
              >
                {skill}
              </span>
            ))}
          </div>
          
          {video.careerPathways && video.careerPathways.length > 0 && (
            <div className="flex items-center text-xs text-gray-600 dark:text-gray-400 mb-2">
              <Target size={12} className="mr-1" />
              <span>{video.careerPathways.slice(0, 2).join(', ')}</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-3">
          <nav className="flex space-x-4">
            {['overview', 'insights', 'engage'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab === 'overview' && 'Overview'}
                {tab === 'insights' && 'AI Insights'}
                {tab === 'engage' && 'Questions'}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[120px]">
          {activeTab === 'overview' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                {video.description}
              </p>
              
              {video.tags && video.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {video.tags.slice(0, 4).map((tag, index) => (
                    <span
                      key={index}
                      className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {video.hashtags && video.hashtags.length > 0 && (
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  {video.hashtags.slice(0, 3).join(' ')}
                </div>
              )}
            </div>
          )}

          {activeTab === 'insights' && video.aiAnalysis?.careerExplorationAnalysis && (
            <div className="space-y-3 text-sm">
              {insights.aspirational && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1 flex items-center">
                    <TrendingUp size={14} className="mr-1" />
                    Why This Matters
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 line-clamp-3">
                    {insights.aspirational.split('\n')[0].replace(/^-\s*/, '')}
                  </p>
                </div>
              )}

              {insights.skills && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1 flex items-center">
                    <Briefcase size={14} className="mr-1" />
                    Skills Demonstrated
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 line-clamp-2">
                    {insights.skills.split('\n')[0].replace(/^-\s*/, '')}
                  </p>
                </div>
              )}

              {video.aiAnalysis.confidence && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  AI Confidence: {video.aiAnalysis.confidence}%
                </div>
              )}
            </div>
          )}

          {activeTab === 'engage' && (
            <div className="space-y-3">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                💭 Reflect on these questions while watching:
              </div>
              
              {reflectiveQuestions.length > 0 ? (
                <div className="space-y-2">
                  {reflectiveQuestions.map((question, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {question}
                      </p>
                      {/* Future: Add inline chat/response capability here */}
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
                        <MessageCircle size={12} className="mr-1" />
                        <span>💬 Chat feature coming soon!</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  💡 Interactive questions will appear here after AI analysis
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onLike?.(video.id)}
              className="flex items-center space-x-1 text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors"
            >
              <Heart size={16} />
              <span className="text-sm">{video.youtubeMetadata?.likeCount ? formatViewCount(video.youtubeMetadata.likeCount) : 'Like'}</span>
            </button>

            <button
              onClick={() => onBookmark?.(video.id)}
              className="flex items-center space-x-1 text-gray-600 dark:text-gray-400 hover:text-blue-500 transition-colors"
            >
              <BookmarkPlus size={16} />
              <span className="text-sm">Save</span>
            </button>

            <button
              onClick={() => onShare?.(video)}
              className="flex items-center space-x-1 text-gray-600 dark:text-gray-400 hover:text-green-500 transition-colors"
            >
              <Share2 size={16} />
              <span className="text-sm">Share</span>
            </button>
          </div>

          <button
            onClick={() => window.open(video.sourceUrl, '_blank')}
            className="flex items-center space-x-1 text-gray-600 dark:text-gray-400 hover:text-blue-500 transition-colors"
          >
            <ExternalLink size={14} />
            <span className="text-xs">Watch on YouTube</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CareerVideoCard; 