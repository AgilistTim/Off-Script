import React from 'react';
import { Lightbulb, Zap, MessageCircle, TrendingUp, Sparkles } from 'lucide-react';
import EnhancedVideoGrid from '../components/video/EnhancedVideoGrid';

const VideosDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">
              🚀 Enhanced Career Video Experience
            </h1>
            <p className="text-xl opacity-90 mb-8 max-w-3xl mx-auto">
              Experience our AI-powered video pipeline that transforms YouTube career content into 
              interactive learning experiences with insights, engagement questions, and career guidance.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-12">
              <div className="bg-white bg-opacity-20 rounded-lg p-6">
                <Zap size={32} className="mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Smart Processing</h3>
                <p className="text-sm opacity-90">
                  Automatic YouTube metadata extraction and AI analysis
                </p>
              </div>
              
              <div className="bg-white bg-opacity-20 rounded-lg p-6">
                <Lightbulb size={32} className="mx-auto mb-3" />
                <h3 className="font-semibold mb-2">AI Insights</h3>
                <p className="text-sm opacity-90">
                  Career themes, skills analysis, and aspirational content
                </p>
              </div>
              
              <div className="bg-white bg-opacity-20 rounded-lg p-6">
                <MessageCircle size={32} className="mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Engagement</h3>
                <p className="text-sm opacity-90">
                  Reflective questions and interactive learning prompts
                </p>
              </div>
              
              <div className="bg-white bg-opacity-20 rounded-lg p-6">
                <TrendingUp size={32} className="mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Career Focus</h3>
                <p className="text-sm opacity-90">
                  Pathway mapping and youth-oriented career exploration
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Complete Video Processing Pipeline
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            From URL to enriched career experience in seconds
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Pipeline Steps */}
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-3 flex-shrink-0">
                <span className="text-blue-600 dark:text-blue-400 font-bold">1</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  📝 Smart URL Processing
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Paste any YouTube URL and our system automatically validates, extracts video ID, 
                  and prepares for analysis with real-time progress tracking.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-green-100 dark:bg-green-900 rounded-full p-3 flex-shrink-0">
                <span className="text-green-600 dark:text-green-400 font-bold">2</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  📊 YouTube Metadata Extraction
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Fetches comprehensive video data including title, description, channel info, 
                  view counts, duration, and high-quality thumbnails.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-purple-100 dark:bg-purple-900 rounded-full p-3 flex-shrink-0">
                <span className="text-purple-600 dark:text-purple-400 font-bold">3</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  🧠 AI Career Analysis
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Bumpups AI analyzes content for career themes, skills, aspirational elements, 
                  work environments, and generates reflective questions.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-orange-100 dark:bg-orange-900 rounded-full p-3 flex-shrink-0">
                <span className="text-orange-600 dark:text-orange-400 font-bold">4</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  💾 Firebase Storage & Enrichment
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Stores enriched data with extracted skills, career pathways, hashtags, 
                  and structured insights for optimal user experience.
                </p>
              </div>
            </div>
          </div>

          {/* Visual Pipeline */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg">
            <div className="text-center">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-6">
                Processing Pipeline Visualization
              </h3>
              
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">URL Input</span>
                    <Sparkles size={16} className="text-blue-500" />
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Real-time validation & progress tracking
                  </div>
                </div>
                
                <div className="text-gray-400">↓</div>
                
                <div className="bg-green-50 dark:bg-green-900 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">YouTube API</span>
                    <TrendingUp size={16} className="text-green-500" />
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Metadata extraction & validation
                  </div>
                </div>
                
                <div className="text-gray-400">↓</div>
                
                <div className="bg-purple-50 dark:bg-purple-900 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Bumpups AI</span>
                    <Lightbulb size={16} className="text-purple-500" />
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Career exploration analysis
                  </div>
                </div>
                
                <div className="text-gray-400">↓</div>
                
                <div className="bg-orange-50 dark:bg-orange-900 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Enhanced Video</span>
                    <MessageCircle size={16} className="text-orange-500" />
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Rich user experience ready
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Videos Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Enhanced Career Videos
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Explore our AI-analyzed career videos with rich insights and engagement features
          </p>
        </div>

        <EnhancedVideoGrid 
          showFilters={true}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg"
        />
      </div>

      {/* Coming Soon Features */}
      <div className="bg-gray-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">🚀 Coming Soon</h2>
            <p className="text-lg opacity-90">
              Exciting features to enhance your career exploration journey
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-700 rounded-lg p-6 text-center">
              <MessageCircle size={48} className="mx-auto mb-4 text-blue-400" />
              <h3 className="font-semibold mb-2">In-line Video Chat</h3>
              <p className="text-sm opacity-90">
                Interactive chat with AI while watching videos for real-time career guidance and Q&A
              </p>
            </div>

            <div className="bg-gray-700 rounded-lg p-6 text-center">
              <TrendingUp size={48} className="mx-auto mb-4 text-green-400" />
              <h3 className="font-semibold mb-2">Career Path Mapping</h3>
              <p className="text-sm opacity-90">
                Personalized career journey visualization based on your interests and video engagement
              </p>
            </div>

            <div className="bg-gray-700 rounded-lg p-6 text-center">
              <Lightbulb size={48} className="mx-auto mb-4 text-purple-400" />
              <h3 className="font-semibold mb-2">Smart Recommendations</h3>
              <p className="text-sm opacity-90">
                AI-powered video recommendations based on your career goals and viewing patterns
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideosDemo; 