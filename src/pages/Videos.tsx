import React, { useState, useEffect } from 'react';
import { getAllVideos, Video, getVideosByCategory } from '../services/videoService';
import VideoGrid from '../components/video/VideoGrid';
import { useAuth } from '../context/AuthContext';

const Videos: React.FC = () => {
  const { currentUser } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const categories = [
    { id: 'technology', name: 'Technology & Digital' },
    { id: 'creative', name: 'Creative & Media' },
    { id: 'trades', name: 'Skilled Trades' },
    { id: 'business', name: 'Business & Entrepreneurship' },
    { id: 'healthcare', name: 'Healthcare & Wellbeing' }
  ];

  // Fetch all videos on component mount
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        console.log('Videos.tsx: Fetching all videos...');
        const allVideos = await getAllVideos();
        console.log('Videos.tsx: Fetched videos:', allVideos.length);
        console.log('Videos.tsx: First 3 videos:', allVideos.slice(0, 3).map(v => ({
          id: v.id,
          title: v.title,
          category: v.category,
          publicationDate: v.publicationDate,
          metadataStatus: v.metadataStatus
        })));
        setVideos(allVideos);
        setFilteredVideos(allVideos);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching videos:', err);
        setError('Failed to load videos');
        setLoading(false);
      }
    };
    
    fetchVideos();
  }, []);

  // Filter videos when category or search term changes
  useEffect(() => {
    if (videos.length === 0) return;
    
    let filtered = [...videos];
    
    // Apply category filter if selected
    if (selectedCategory) {
      filtered = filtered.filter(video => video.category === selectedCategory);
    }
    
    // Apply search filter if search term exists
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(video => 
        video.title.toLowerCase().includes(term) ||
        video.description.toLowerCase().includes(term) ||
        video.creator.toLowerCase().includes(term) ||
        video.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }
    
    console.log('Videos.tsx: Filtered videos:', filtered.length, 'from', videos.length, 'total');
    setFilteredVideos(filtered);
  }, [selectedCategory, searchTerm, videos]);

  // Handle category selection
  const handleCategoryChange = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
  };

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-blue"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Career Exploration Videos</h1>
      
      {/* Debug info */}
      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          <strong>Debug:</strong> Showing {filteredVideos.length} of {videos.length} total videos
          {selectedCategory && ` (filtered by category: ${selectedCategory})`}
          {searchTerm && ` (search: "${searchTerm}")`}
        </p>
      </div>
      
      {/* Search and filter */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-grow">
            <input
              type="text"
              placeholder="Search videos..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-blue"
            />
          </div>
        </div>
        
        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleCategoryChange(null)}
            className={`px-4 py-2 rounded-full ${
              selectedCategory === null
                ? 'bg-primary-blue text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All Categories
          </button>
          
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => handleCategoryChange(category.id)}
              className={`px-4 py-2 rounded-full ${
                selectedCategory === category.id
                  ? 'bg-primary-blue text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Videos grid */}
      <VideoGrid
        videos={filteredVideos}
        emptyMessage={
          searchTerm || selectedCategory
            ? "No videos match your filters"
            : "No videos available"
        }
      />
    </div>
  );
};

export default Videos; 