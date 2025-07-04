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
  Upload,
  FileInput
} from 'lucide-react';
import { getAllVideos, Video, createVideo, updateVideo, deleteVideo, bulkImportVideos } from '../../services/videoService';
import { toast, Toaster } from 'react-hot-toast';

const AdminVideos: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState<boolean>(false);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [bulkImportUrls, setBulkImportUrls] = useState<string>('');
  const [bulkImportCategory, setBulkImportCategory] = useState<string>('');
  const [bulkImportResults, setBulkImportResults] = useState<{
    success: number;
    duplicates: number;
    failed: number;
    failedUrls: string[];
  } | null>(null);
  const [bulkImportLoading, setBulkImportLoading] = useState<boolean>(false);
  const [addVideoModalOpen, setAddVideoModalOpen] = useState<boolean>(false);
  const [bulkImportModalOpen, setBulkImportModalOpen] = useState<boolean>(false);
  const [editVideoModalOpen, setEditVideoModalOpen] = useState<boolean>(false);

  // Categories for filtering
  const categories = [
    'technology',
    'healthcare',
    'finance',
    'creative',
    'trades',
    'sustainability',
  ];

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const fetchedVideos = await getAllVideos();
      setVideos(fetchedVideos);
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

  // Handle add new video
  const handleAddVideo = () => {
    setCurrentVideo(null);
    setIsEditing(false);
    setShowAddModal(true);
    setError(null);
  };

  // Handle bulk import
  const handleBulkImport = () => {
    setBulkImportUrls('');
    setBulkImportCategory('');
    setBulkImportResults(null);
    setShowBulkImportModal(true);
    setError(null);
  };

  // Process bulk import
  const processBulkImport = async () => {
    if (!bulkImportUrls.trim()) {
      setError('Please enter at least one URL.');
      return;
    }

    setBulkImportLoading(true);
    setError(null);
    
    try {
      // Split by newline and filter out empty lines
      const urls = bulkImportUrls
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);
      
      if (urls.length === 0) {
        setError('No valid URLs found.');
        setBulkImportLoading(false);
        return;
      }
      
      // Process the URLs
      const results = await bulkImportVideos(urls, bulkImportCategory);
      setBulkImportResults(results);
      
      // Refresh videos list if any were successfully added
      if (results.success > 0) {
        await fetchVideos();
      }
    } catch (error) {
      console.error('Error processing bulk import:', error);
      setError('Failed to process bulk import. Please try again.');
    } finally {
      setBulkImportLoading(false);
    }
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
                <option key={category} value={category}>{category}</option>
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

  // Bulk Import Modal
  const BulkImportModal = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Bulk Import Videos
            </h2>
            <button
              onClick={() => setShowBulkImportModal(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {bulkImportResults ? (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900 p-4 rounded-md">
                  <h3 className="text-lg font-medium text-green-800 dark:text-green-200">Import Results</h3>
                  <ul className="mt-2 text-sm text-green-700 dark:text-green-300">
                    <li>Successfully imported: {bulkImportResults.success} videos</li>
                    <li>Duplicates skipped: {bulkImportResults.duplicates} videos</li>
                    <li>Failed imports: {bulkImportResults.failed} videos</li>
                  </ul>
                  
                  {bulkImportResults.failedUrls.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-green-800 dark:text-green-200">Failed URLs:</h4>
                      <ul className="mt-1 text-xs text-green-700 dark:text-green-300 max-h-32 overflow-y-auto">
                        {bulkImportResults.failedUrls.map((url, index) => (
                          <li key={index} className="truncate">{url}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => setShowBulkImportModal(false)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Video URLs (one per line)
                  </label>
                  <textarea
                    value={bulkImportUrls}
                    onChange={(e) => setBulkImportUrls(e.target.value)}
                    rows={10}
                    placeholder="https://www.youtube.com/watch?v=example1&#10;https://www.youtube.com/watch?v=example2&#10;https://vimeo.com/example3"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Paste YouTube, Vimeo, or other video URLs, one per line. Metadata will be automatically extracted.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Default Category (optional)
                  </label>
                  <select
                    value={bulkImportCategory}
                    onChange={(e) => setBulkImportCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Select a category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    If set, all imported videos will be assigned this category. You can edit individual videos later.
                  </p>
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
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowBulkImportModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    disabled={bulkImportLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={processBulkImport}
                    className="px-4 py-2 bg-primary-blue text-white rounded-md hover:bg-blue-600 flex items-center"
                    disabled={bulkImportLoading}
                  >
                    {bulkImportLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <FileInput size={18} className="mr-2" />
                        Import Videos
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
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
            onClick={handleBulkImport}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center"
            disabled={loading}
          >
            <FileInput className="w-4 h-4 mr-2" />
            Bulk Import
          </button>
          <button
            onClick={handleAddVideo}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center"
            disabled={loading}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Video
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
              <option key={category} value={category}>{category}</option>
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
              {filteredVideos.length > 0 ? (
                filteredVideos.map((video) => (
                  <tr key={video.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-16 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                          {video.thumbnailUrl && (
                            <img src={video.thumbnailUrl} alt={video.title} className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{video.title}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate">{video.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {video.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {video.sourceType.charAt(0).toUpperCase() + video.sourceType.slice(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {video.metadataStatus === 'enriched' ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center">
                          <Check size={12} className="mr-1" />
                          Enriched
                        </span>
                      ) : video.metadataStatus === 'failed' || video.enrichmentFailed ? (
                        <div className="flex flex-col gap-1">
                          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 flex items-center" title={video.enrichmentError}>
                            <X size={12} className="mr-1" />
                            Failed
                          </span>
                          <button 
                            onClick={async () => {
                              try {
                                await updateVideo(video.id, { 
                                  metadataStatus: 'pending',
                                  enrichmentFailed: false,
                                  enrichmentError: undefined
                                });
                                // Refresh the video list
                                fetchVideos();
                              } catch (error) {
                                console.error('Error retrying metadata extraction:', error);
                              }
                            }}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Retry
                          </button>
                        </div>
                      ) : video.metadataStatus === 'processing' ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 flex items-center">
                          <svg className="animate-spin h-3 w-3 mr-1" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 flex items-center">
                          <svg className="animate-spin h-3 w-3 mr-1" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {video.viewCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => window.open(`/videos/${video.id}`, '_blank')}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          title="View"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleEditVideo(video)}
                          className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteVideo(video.id)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No videos found matching your criteria.
                  </td>
                </tr>
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

      {/* Bulk Import Modal */}
      {showBulkImportModal && <BulkImportModal />}
    </div>
  );
};

export default AdminVideos; 