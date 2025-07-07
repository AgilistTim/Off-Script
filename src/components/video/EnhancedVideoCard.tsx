import React, { useState, useEffect } from 'react';
import { Clock, Eye, ThumbsUp, MessageCircle, Tag, Calendar, User, BookOpen, DollarSign, Briefcase, Sparkles, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import type { EnhancedVideoData } from '../../services/enhancedVideoService';

interface EnhancedVideoCardProps {
  video: EnhancedVideoData;
  showFullDetails?: boolean;
  onVideoClick?: (video: EnhancedVideoData) => void;
}

const EnhancedVideoCard: React.FC<EnhancedVideoCardProps> = ({ 
  video, 
  showFullDetails = false, 
  onVideoClick 
}) => {
  const [expanded, setExpanded] = useState(showFullDetails);
  const [activeTab, setActiveTab] = useState<'overview' | 'timestamps' | 'career'>('overview');

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatTimestamp = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const createTimestampUrl = (timestamp: number): string => {
    return `${video.sourceUrl}&t=${Math.floor(timestamp)}s`;
  };

  const getAnalysisStatusBadge = () => {
    const statusConfig = {
      'pending': { color: 'bg-yellow-100 text-yellow-800', text: 'Analysis Pending' },
      'analyzing': { color: 'bg-blue-100 text-blue-800', text: 'Analyzing...' },
      'completed': { color: 'bg-green-100 text-green-800', text: 'Analysis Complete' },
      'failed': { color: 'bg-red-100 text-red-800', text: 'Analysis Failed' }
    };

    const config = statusConfig[video.analysisStatus];
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.text}
        {video.analysisStatus === 'completed' && video.aiAnalysis && (
          <Sparkles className="w-3 h-3 ml-1" />
        )}
      </span>
    );
  };

  const getCareerStageBadge = () => {
    const stageConfig = {
      'entry-level': { color: 'bg-green-100 text-green-800', icon: '🌱' },
      'mid-level': { color: 'bg-blue-100 text-blue-800', icon: '🚀' },
      'senior': { color: 'bg-purple-100 text-purple-800', icon: '👑' },
      'any': { color: 'bg-gray-100 text-gray-800', icon: '📚' }
    };

    const config = stageConfig[video.careerStage];
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        <span className="mr-1">{config.icon}</span>
        {video.careerStage === 'any' ? 'All Levels' : video.careerStage.charAt(0).toUpperCase() + video.careerStage.slice(1)}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
      {/* Video Header */}
      <div className="relative">
        <img 
          src={video.thumbnailUrl} 
          alt={video.title}
          className="w-full h-48 object-cover cursor-pointer"
          onClick={() => onVideoClick?.(video)}
        />
        
        {/* Duration overlay */}
        {video.youtubeMetadata?.duration && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm font-medium">
            {formatDuration(video.youtubeMetadata.duration)}
          </div>
        )}

        {/* Analysis status */}
        <div className="absolute top-2 left-2">
          {getAnalysisStatusBadge()}
        </div>

        {/* Career stage */}
        <div className="absolute top-2 right-2">
          {getCareerStageBadge()}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title and Description */}
        <h3 
          className="font-semibold text-lg text-gray-900 mb-2 cursor-pointer hover:text-blue-600 line-clamp-2"
          onClick={() => onVideoClick?.(video)}
        >
          {video.title}
        </h3>

        {/* Channel and Stats */}
        {video.youtubeMetadata && (
          <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
            <div className="flex items-center space-x-1">
              <User className="w-4 h-4" />
              <span>{video.youtubeMetadata.channelTitle}</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Eye className="w-4 h-4" />
                <span>{formatNumber(video.youtubeMetadata.viewCount)}</span>
              </div>
              {video.youtubeMetadata.likeCount > 0 && (
                <div className="flex items-center space-x-1">
                  <ThumbsUp className="w-4 h-4" />
                  <span>{formatNumber(video.youtubeMetadata.likeCount)}</span>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>{new Date(video.youtubeMetadata.publishedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Skills and Education */}
        {(video.skillsHighlighted.length > 0 || video.educationRequired.length > 0) && (
          <div className="mb-3 space-y-2">
            {video.skillsHighlighted.length > 0 && (
              <div>
                <div className="flex items-center space-x-1 mb-1">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Skills:</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {video.skillsHighlighted.slice(0, 4).map((skill, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                      {skill}
                    </span>
                  ))}
                  {video.skillsHighlighted.length > 4 && (
                    <span className="px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded-full">
                      +{video.skillsHighlighted.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {video.educationRequired.length > 0 && (
              <div>
                <div className="flex items-center space-x-1 mb-1">
                  <BookOpen className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">Education:</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {video.educationRequired.map((edu, index) => (
                    <span key={index} className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
                      {edu}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Salary Range */}
        {video.salaryRange && (
          <div className="mb-3">
            <div className="flex items-center space-x-1">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Salary Range:</span>
              <span className="text-sm text-gray-600">
                {video.salaryRange.currency === 'GBP' ? '£' : '$'}
                {video.salaryRange.min.toLocaleString()} - {video.salaryRange.currency === 'GBP' ? '£' : '$'}
                {video.salaryRange.max.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Quick Summary */}
        {video.aiAnalysis?.summary?.short && (
          <div className="mb-3">
            <p className="text-sm text-gray-600 line-clamp-2">
              {video.aiAnalysis.summary.short}
            </p>
          </div>
        )}

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-center w-full py-2 text-sm text-blue-600 hover:text-blue-800 border-t border-gray-100"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-1" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-1" />
              Show More
            </>
          )}
        </button>

        {/* Expanded Content */}
        {expanded && video.aiAnalysis && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            {/* Tabs */}
            <div className="flex space-x-1 mb-4">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  activeTab === 'overview' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('timestamps')}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  activeTab === 'timestamps' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Timestamps ({video.aiAnalysis.timestamps?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('career')}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  activeTab === 'career' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Career Info
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-3">
                {video.aiAnalysis.summary?.detailed && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Detailed Summary</h4>
                    <p className="text-sm text-gray-600">{video.aiAnalysis.summary.detailed}</p>
                  </div>
                )}

                {video.aiAnalysis.summary?.keyPoints && video.aiAnalysis.summary.keyPoints.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Key Points</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {video.aiAnalysis.summary.keyPoints.map((point, index) => (
                        <li key={index} className="text-sm text-gray-600">{point}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                  <span>Analysis Confidence: {video.aiAnalysis.confidence}%</span>
                  <span>Analyzed: {new Date(video.aiAnalysis.analyzedAt).toLocaleDateString()}</span>
                </div>
              </div>
            )}

            {activeTab === 'timestamps' && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {video.aiAnalysis.timestamps && video.aiAnalysis.timestamps.length > 0 ? (
                  video.aiAnalysis.timestamps.map((timestamp, index) => (
                    <div key={index} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
                      <a
                        href={createTimestampUrl(timestamp.time)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        <Clock className="w-4 h-4" />
                        <span>{formatTimestamp(timestamp.time)}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{timestamp.title}</p>
                        {timestamp.description && (
                          <p className="text-xs text-gray-600 mt-1">{timestamp.description}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No timestamps available</p>
                )}
              </div>
            )}

            {activeTab === 'career' && (
              <div className="space-y-3">
                {video.aiAnalysis.careerInfo?.skills && video.aiAnalysis.careerInfo.skills.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Required Skills</h4>
                    <div className="flex flex-wrap gap-1">
                      {video.aiAnalysis.careerInfo.skills.map((skill, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {video.aiAnalysis.careerInfo?.responsibilities && video.aiAnalysis.careerInfo.responsibilities.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Responsibilities</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {video.aiAnalysis.careerInfo.responsibilities.map((resp, index) => (
                        <li key={index} className="text-sm text-gray-600">{resp}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {video.aiAnalysis.careerInfo?.education && video.aiAnalysis.careerInfo.education.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Education Requirements</h4>
                    <div className="flex flex-wrap gap-1">
                      {video.aiAnalysis.careerInfo.education.map((edu, index) => (
                        <span key={index} className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
                          {edu}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {video.aiAnalysis.careerInfo?.advice && video.aiAnalysis.careerInfo.advice.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Career Advice</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {video.aiAnalysis.careerInfo.advice.map((advice, index) => (
                        <li key={index} className="text-sm text-gray-600">{advice}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {video.aiAnalysis.careerInfo?.salary && video.aiAnalysis.careerInfo.salary !== 'Not specified' && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Salary Information</h4>
                    <p className="text-sm text-gray-600">{video.aiAnalysis.careerInfo.salary}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer with category and tags */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Tag className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600 capitalize">{video.category}</span>
            </div>
            
            <a
              href={video.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm"
            >
              <span>Watch on YouTube</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedVideoCard; 