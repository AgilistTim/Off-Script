import React, { useState, useEffect } from 'react';
import { Search, Filter, SortAsc, Grid, List, Lightbulb, TrendingUp } from 'lucide-react';
import CareerVideoCard from './CareerVideoCard';
import { EnhancedVideoData } from '../../services/enhancedVideoService';
import EnhancedVideoService from '../../services/enhancedVideoService';

interface EnhancedVideoGridProps {
  category?: string;
  limit?: number;
  showFilters?: boolean;
  className?: string;
}

const EnhancedVideoGrid: React.FC<EnhancedVideoGridProps> = ({
  category,
  limit,
  showFilters = true,
  className = ''
}) => {
  const [videos, setVideos] = useState<EnhancedVideoData[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<EnhancedVideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(category || '');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'ai-confidence'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAIOnly, setShowAIOnly] = useState(false);

  const videoService = new EnhancedVideoService();

  // Categories
  const categories = [
    'technology', 'healthcare', 'finance', 'creative', 'trades', 'sustainability', 'education', 'business'
  ];

  // Load videos
  useEffect(() => {
    loadVideos();
  }, [category]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      let videoData: EnhancedVideoData[];
      
      if (category) {
        videoData = await videoService.getVideosByCategory(category, false);
      } else {
        // Get all videos from multiple categories
        const allVideos = await Promise.all(
          categories.map(cat => videoService.getVideosByCategory(cat, false))
        );
        videoData = allVideos.flat();
      }

      setVideos(videoData);
      setFilteredVideos(videoData);
    } catch (err) {
      setError('Failed to load videos');
      console.error('Error loading videos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Extract all skills for filtering
  const allSkills = React.useMemo(() => {
    const skillsSet = new Set<string>();
    videos.forEach(video => {
      video.skillsHighlighted?.forEach(skill => skillsSet.add(skill));
    });
    return Array.from(skillsSet).sort();
  }, [videos]);

  // Apply filters
  useEffect(() => {
    let filtered = [...videos];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(video =>
        video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.skillsHighlighted?.some(skill => 
          skill.toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
        video.careerPathways?.some(pathway => 
          pathway.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(video => video.category === selectedCategory);
    }

    // Skills filter
    if (selectedSkills.length > 0) {
      filtered = filtered.filter(video =>
        selectedSkills.some(skill =>
          video.skillsHighlighted?.includes(skill)
        )
      );
    }

    // AI analysis filter
    if (showAIOnly) {
      filtered = filtered.filter(video => 
        video.aiAnalysis?.careerExplorationAnalysis && 
        video.analysisStatus === 'completed'
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return (b.viewCount || 0) - (a.viewCount || 0);
        case 'ai-confidence':
          return (b.aiAnalysis?.confidence || 0) - (a.aiAnalysis?.confidence || 0);
        case 'recent':
        default:
          return new Date(b.curatedDate).getTime() - new Date(a.curatedDate).getTime();
      }
    });

    // Apply limit
    if (limit) {
      filtered = filtered.slice(0, limit);
    }

    setFilteredVideos(filtered);
  }, [videos, searchTerm, selectedCategory, selectedSkills, sortBy, showAIOnly, limit]);

  // Handle video actions
  const handleVideoPlay = (video: EnhancedVideoData) => {
    // Navigate to video detail page or open player
    window.open(`/videos/${video.id}`, '_blank');
  };

  const handleVideoLike = (videoId: string) => {
    // Implement like functionality
    console.log('Like video:', videoId);
  };

  const handleVideoBookmark = (videoId: string) => {
    // Implement bookmark functionality
    console.log('Bookmark video:', videoId);
  };

  const handleVideoShare = (video: EnhancedVideoData) => {
    // Implement share functionality
    if (navigator.share) {
      navigator.share({
        title: video.title,
        text: `Check out this career video: ${video.title}`,
        url: video.sourceUrl,
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(video.sourceUrl);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={loadVideos}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {category ? `${category.charAt(0).toUpperCase() + category.slice(1)} Videos` : 'Career Videos'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {filteredVideos.length} videos • {filteredVideos.filter(v => v.aiAnalysis?.careerExplorationAnalysis).length} AI-analyzed
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}
          >
            <Grid size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search videos, skills, or career paths..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Skills Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Skills
              </label>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value && !selectedSkills.includes(e.target.value)) {
                    setSelectedSkills([...selectedSkills, e.target.value]);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Add skill filter...</option>
                {allSkills.map(skill => (
                  <option key={skill} value={skill}>{skill}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="recent">Most Recent</option>
                <option value="popular">Most Popular</option>
                <option value="ai-confidence">AI Confidence</option>
              </select>
            </div>

            {/* AI Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filter
              </label>
              <button
                onClick={() => setShowAIOnly(!showAIOnly)}
                className={`w-full px-3 py-2 rounded-md flex items-center justify-center text-sm ${
                  showAIOnly 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Lightbulb size={16} className="mr-2" />
                AI Analyzed Only
              </button>
            </div>
          </div>

          {/* Selected Skills */}
          {selectedSkills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedSkills.map(skill => (
                <span
                  key={skill}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                >
                  {skill}
                  <button
                    onClick={() => setSelectedSkills(selectedSkills.filter(s => s !== skill))}
                    className="ml-2 hover:text-blue-600"
                  >
                    ×
                  </button>
                </span>
              ))}
              <button
                onClick={() => setSelectedSkills([])}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}

      {/* AI Insights Banner */}
      {filteredVideos.some(v => v.aiAnalysis?.careerExplorationAnalysis) && (
        <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg p-4">
          <div className="flex items-center">
            <TrendingUp size={24} className="mr-3" />
            <div>
              <h3 className="font-semibold">🧠 AI-Powered Career Insights</h3>
              <p className="text-sm opacity-90">
                These videos include detailed career analysis, skill identification, and reflective questions to enhance your learning experience.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Video Grid */}
      {filteredVideos.length === 0 ? (
        <div className="text-center py-12">
          <Lightbulb size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No videos found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your filters or search terms.
          </p>
        </div>
      ) : (
        <div className={`${
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-6'
        }`}>
          {filteredVideos.map((video) => (
            <CareerVideoCard
              key={video.id}
              video={video}
              onPlay={handleVideoPlay}
              onLike={handleVideoLike}
              onBookmark={handleVideoBookmark}
              onShare={handleVideoShare}
              className={viewMode === 'list' ? 'md:flex md:h-64' : ''}
            />
          ))}
        </div>
      )}

      {/* Load More (if needed) */}
      {!limit && filteredVideos.length > 0 && filteredVideos.length < videos.length && (
        <div className="text-center">
          <button
            onClick={() => {
              // Implement load more functionality
              console.log('Load more videos');
            }}
            className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600"
          >
            Load More Videos
          </button>
        </div>
      )}
    </div>
  );
};

export default EnhancedVideoGrid; 