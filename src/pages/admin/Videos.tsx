import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  X, 
  Check, 
  Upload
} from 'lucide-react';
import { getAllVideos, Video, createVideo, updateVideo, deleteVideo } from '../../services/videoService';
import enhancedVideoService, { EnhancedVideoData } from '../../services/enhancedVideoService';
import { toast, Toaster } from 'react-hot-toast';
import EnhancedVideoForm from '../../components/admin/EnhancedVideoForm';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { VIDEO_CATEGORIES, getCategoryName, getCategoryColor } from '../../data/categories';

const AdminVideos: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEnhancedForm, setShowEnhancedForm] = useState<boolean>(false);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [addVideoModalOpen, setAddVideoModalOpen] = useState<boolean>(false);
  const [editVideoModalOpen, setEditVideoModalOpen] = useState<boolean>(false);

  // Categories for filtering (using centralized config)
  const categories = VIDEO_CATEGORIES;

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      
      // Fetch videos from both services
      const standardVideos = await getAllVideos();
      
      // Fetch all videos from Firestore directly to ensure we get both types
      const videosRef = collection(db, 'videos');
      const videosSnapshot = await getDocs(videosRef);
      
      const allVideos = videosSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || 'Untitled Video',
          description: data.description || '',
          category: data.category || '',
          sourceType: data.sourceType || 'youtube',
          sourceId: data.sourceId || '',
          sourceUrl: data.sourceUrl || '',
          thumbnailUrl: data.thumbnailUrl || '',
          duration: data.duration || 0,
          creator: data.creator || data.youtubeMetadata?.channelTitle || '',
          creatorUrl: data.creatorUrl || '',
          publicationDate: data.publicationDate || data.youtubeMetadata?.publishedAt || data.curatedDate || new Date().toISOString(),
          curatedDate: data.curatedDate || new Date().toISOString(),
          tags: data.tags || [],
          skillsHighlighted: data.skillsHighlighted || [],
          educationRequired: data.educationRequired || [],
          prompts: data.prompts || [],
          relatedContent: data.relatedContent || [],
          viewCount: data.viewCount || 0,
          metadataStatus: data.metadataStatus || data.analysisStatus || 'pending',
          enrichmentFailed: data.enrichmentFailed || (data.analysisStatus === 'failed'),
          enrichmentError: data.enrichmentError || '',
          aiAnalysis: data.aiAnalysis || null
        } as Video;
      });
      
      // Remove duplicates by ID
      const uniqueVideos = allVideos.filter((video, index, self) =>
        index === self.findIndex((v) => v.id === video.id)
      );
      
      setVideos(uniqueVideos);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching videos:', error);
      setLoading(false);
      setError('Failed to fetch videos. Please try again.');
    }
  };

  // Filter videos based on search term and category
  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         video.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? video.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  // Handle edit video
  const handleEditVideo = (video: Video) => {
    setCurrentVideo(video);
    setIsEditing(true);
    setShowAddModal(true);
  };

  // Handle delete video
  const handleDeleteVideo = async (videoId: string) => {
    if (window.confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      try {
        await deleteVideo(videoId);
        setVideos(videos.filter(video => video.id !== videoId));
      } catch (error) {
        console.error('Error deleting video:', error);
        setError('Failed to delete video. Please try again.');
      }
    }
  };

  // Handle add new video (Enhanced)
  const handleAddVideo = () => {
    setShowEnhancedForm(true);
    setError(null);
  };

  // Handle add new video (Legacy)
  const handleAddVideoLegacy = () => {
    setCurrentVideo(null);
    setIsEditing(false);
    setShowAddModal(true);
    setError(null);
  };

  // Handle video added callback
  const handleVideoAdded = (videoData: any) => {
    // Add the new video to the local state
    setVideos(prev => [...prev, videoData]);
    
    // Refresh the videos list to ensure we have the latest data
    setTimeout(() => {
      fetchVideos();
    }, 2000);
  };

  // Add a function to retry all failed videos
  const retryAllFailedVideos = async () => {
    try {
      setLoading(true);
      const failedVideos = videos.filter(video => 
        video.metadataStatus === 'failed' || video.enrichmentFailed
      );
      
      if (failedVideos.length === 0) {
        toast('No failed videos to retry', { icon: 'ℹ️' });
        setLoading(false);
        return;
      }
      
      let successCount = 0;
      let errorCount = 0;
      
      // Process each failed video
      for (const video of failedVideos) {
        try {
          await updateVideo(video.id, {
            metadataStatus: 'pending',
            enrichmentFailed: false,
            enrichmentError: undefined
          });
          successCount++;
        } catch (error) {
          console.error(`Error retrying video ${video.id}:`, error);
          errorCount++;
        }
      }
      
      // Refresh the video list
      await fetchVideos();
      
      // Show toast message
      toast.success(`Retried ${successCount} videos successfully. ${errorCount > 0 ? `Failed to retry ${errorCount} videos.` : ''}`);
    } catch (error) {
      console.error('Error retrying failed videos:', error);
      toast.error('Failed to retry videos. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Video form component
  const VideoForm = () => {
    const [formData, setFormData] = useState<Partial<Video>>(
      currentVideo || {
        title: '',
        description: '',
        category: '',
        sourceType: 'youtube',
        sourceId: '',
        sourceUrl: '',
        thumbnailUrl: '',
        duration: 0,
        creator: '',
        tags: [],
        skillsHighlighted: [],
        educationRequired: [],
        prompts: [],
        relatedContent: [],
        viewCount: 0
      }
    );

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const validateForm = () => {
      const errors: Record<string, string> = {};
      
      if (!formData.title?.trim()) errors.title = 'Title is required';
      if (!formData.description?.trim()) errors.description = 'Description is required';
      if (!formData.category?.trim()) errors.category = 'Category is required';
      if (!formData.sourceId?.trim()) errors.sourceId = 'Source ID is required';
      if (!formData.creator?.trim()) errors.creator = 'Creator name is required';
      
      setFormErrors(errors);
      return Object.keys(errors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData({
        ...formData,
        [name]: value
      });
      
      // Clear error for this field if it exists
      if (formErrors[name]) {
        setFormErrors({
          ...formErrors,
          [name]: ''
        });
      }
    };

    const extractYouTubeId = (url: string): string | null => {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
    };

    const handleSourceUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const url = e.target.value;
      setFormData({
        ...formData,
        sourceUrl: url
      });
      
      // Try to extract YouTube ID if it's a YouTube URL
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const youtubeId = extractYouTubeId(url);
        if (youtubeId) {
          setFormData({
            ...formData,
            sourceUrl: url,
            sourceId: youtubeId,
            sourceType: 'youtube'
          });
        }
      }
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!validateForm()) return;
      
      setSubmitLoading(true);
      setError(null);
      
      try {
        if (isEditing && currentVideo) {
          await updateVideo(currentVideo.id, formData as Partial<Video>);
          
          // Update the video in the local state
          setVideos(videos.map(video => 
            video.id === currentVideo.id ? { ...video, ...formData } as Video : video
          ));
        } else {
          // Create new video
          const newVideoId = await createVideo(formData as Omit<Video, 'id'>);
          
          // Add the new video to the local state
          const newVideo = {
            id: newVideoId,
            ...formData
          } as Video;
          
          setVideos([...videos, newVideo]);
        }
        
        setShowAddModal(false);
      } catch (error) {
        console.error('Error saving video:', error);
        setError('Failed to save video. Please try again.');
      } finally {
        setSubmitLoading(false);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Title
          </label>
          <input
            type="text"
            name="title"
            value={formData.title || ''}
            onChange={handleChange}
            className={`w-full px-3 py-2 border ${formErrors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white`}
            required
          />
          {formErrors.title && (
            <p className="mt-1 text-sm text-red-500">{formErrors.title}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            rows={4}
            className={`w-full px-3 py-2 border ${formErrors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white`}
            required
          />
          {formErrors.description && (
            <p className="mt-1 text-sm text-red-500">{formErrors.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              name="category"
              value={formData.category || ''}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${formErrors.category ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white`}
              required
            >
              <option value="">Select a category</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            {formErrors.category && (
              <p className="mt-1 text-sm text-red-500">{formErrors.category}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Source Type
            </label>
            <select
              name="sourceType"
              value={formData.sourceType || 'youtube'}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              required
            >
              <option value="youtube">YouTube</option>
              <option value="vimeo">Vimeo</option>
              <option value="instagram">Instagram</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Video URL
          </label>
          <input
            type="url"
            name="sourceUrl"
            value={formData.sourceUrl || ''}
            onChange={handleSourceUrlChange}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            For YouTube videos, we'll automatically extract the video ID
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Source ID (e.g. YouTube Video ID)
            </label>
            <input
              type="text"
              name="sourceId"
              value={formData.sourceId || ''}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${formErrors.sourceId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white`}
              required
            />
            {formErrors.sourceId && (
              <p className="mt-1 text-sm text-red-500">{formErrors.sourceId}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Duration (seconds)
            </label>
            <input
              type="number"
              name="duration"
              value={formData.duration || 0}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Creator Name
          </label>
          <input
            type="text"
            name="creator"
            value={formData.creator || ''}
            onChange={handleChange}
            className={`w-full px-3 py-2 border ${formErrors.creator ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white`}
            required
          />
          {formErrors.creator && (
            <p className="mt-1 text-sm text-red-500">{formErrors.creator}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tags (comma separated)
          </label>
          <input
            type="text"
            name="tags"
            value={Array.isArray(formData.tags) ? formData.tags.join(', ') : ''}
            onChange={(e) => {
              const tagsArray = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
              setFormData({
                ...formData,
                tags: tagsArray
              });
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Skills Highlighted (comma separated)
          </label>
          <input
            type="text"
            name="skillsHighlighted"
            value={Array.isArray(formData.skillsHighlighted) ? formData.skillsHighlighted.join(', ') : ''}
            onChange={(e) => {
              const skillsArray = e.target.value.split(',').map(skill => skill.trim()).filter(skill => skill);
              setFormData({
                ...formData,
                skillsHighlighted: skillsArray
              });
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => setShowAddModal(false)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            disabled={submitLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary-blue text-white rounded-md hover:bg-blue-600 flex items-center"
            disabled={submitLoading}
          >
            {submitLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isEditing ? 'Updating...' : 'Saving...'}
              </>
            ) : (
              <>
                {isEditing ? 'Update Video' : 'Add Video'}
              </>
            )}
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Videos</h1>
        <div className="flex space-x-2">
          {videos.some(video => video.metadataStatus === 'failed' || video.enrichmentFailed) && (
            <button
              onClick={retryAllFailedVideos}
              className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 flex items-center"
              disabled={loading}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry All Failed
            </button>
          )}
          <button
            onClick={handleAddVideoLegacy}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 flex items-center"
            disabled={loading}
          >
            <Plus className="w-4 h-4 mr-2" />
            Manual Add
          </button>
          <button
            onClick={handleAddVideo}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center"
            disabled={loading}
          >
            <Upload className="w-4 h-4 mr-2" />
            🚀 Smart Add Video
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
          <button 
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search videos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <div className="relative md:w-64">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white appearance-none"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
                <div className="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Video
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Source
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Metadata Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Views
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center">
                    <div className="flex justify-center">
                      <svg className="animate-spin h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  </td>
                </tr>
              ) : filteredVideos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500 dark:text-gray-400">
                    No videos found. {searchTerm || selectedCategory ? 'Try adjusting your filters.' : ''}
                  </td>
                </tr>
              ) : (
                filteredVideos.map((video, index) => {
                  // Generate a unique key using both ID and index to avoid duplicates
                  const uniqueKey = `${video.id}-${index}`;
                  
                  return (
                    <tr key={uniqueKey} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="p-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-16 w-24 relative">
                            <img 
                              src={video.thumbnailUrl} 
                              alt={video.title}
                              className="h-full w-full object-cover rounded"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'https://placehold.co/600x400?text=No+Image';
                              }}
                            />
                            {video.metadataStatus === 'pending' && (
                              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {video.title}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                              {video.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {getCategoryName(video.category)}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {video.creator || 'Unknown'}
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {(video.metadataStatus === 'enriched' || 
                            video.analysisStatus === 'completed') ? (
                            <Check className="h-5 w-5 text-green-500" />
                          ) : (video.metadataStatus === 'failed' || 
                              video.analysisStatus === 'failed' || 
                              video.enrichmentFailed) ? (
                            <X className="h-5 w-5 text-red-500" />
                          ) : (
                            <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          )}
                          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                            {(video.metadataStatus === 'enriched' || 
                              video.analysisStatus === 'completed') ? 'Enriched' : 
                             (video.metadataStatus === 'failed' || 
                              video.analysisStatus === 'failed' || 
                              video.enrichmentFailed) ? 'Failed' : 'Processing'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {video.viewCount || 0}
                      </td>
                      <td className="p-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => window.open(`/videos/${video.id}`, '_blank')}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleEditVideo(video)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteVideo(video.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Video Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                {isEditing ? 'Edit Video' : 'Add New Video'}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <VideoForm />
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Video Form */}
      <EnhancedVideoForm
        isOpen={showEnhancedForm}
        onClose={() => setShowEnhancedForm(false)}
        onVideoAdded={handleVideoAdded}
      />
    </div>
  );
};

export default AdminVideos; 