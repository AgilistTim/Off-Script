import React, { useState } from 'react';
import { X, Plus, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import VideoProcessingService, { type VideoProcessingProgress, type ProcessedVideoResult } from '../../services/videoProcessingService';

interface EnhancedVideoFormProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoAdded: (videoData: any) => void;
  categories: string[];
}

interface VideoToProcess {
  url: string;
  category: string;
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: VideoProcessingProgress | null;
  result?: ProcessedVideoResult;
}

const EnhancedVideoForm: React.FC<EnhancedVideoFormProps> = ({
  isOpen,
  onClose,
  onVideoAdded,
  categories
}) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [category, setCategory] = useState('');
  const [bulkUrls, setBulkUrls] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [videosToProcess, setVideosToProcess] = useState<VideoToProcess[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const videoProcessingService = new VideoProcessingService();

  // Reset form state
  const resetForm = () => {
    setVideoUrl('');
    setCategory('');
    setBulkUrls('');
    setVideosToProcess([]);
    setValidationError(null);
    setIsProcessing(false);
  };

  // Validate URL in real-time
  const handleUrlChange = (url: string) => {
    setVideoUrl(url);
    setValidationError(null);
    
    if (url.trim()) {
      const validation = videoProcessingService.validateYouTubeUrl(url);
      if (!validation.isValid) {
        setValidationError(validation.error || 'Invalid URL');
      }
    }
  };

  // Process a single video
  const processSingleVideo = async () => {
    if (!videoUrl.trim() || !category.trim()) {
      toast.error('Please enter a valid URL and select a category');
      return;
    }

    const validation = videoProcessingService.validateYouTubeUrl(videoUrl);
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid YouTube URL');
      return;
    }

    setIsProcessing(true);

    try {
      const result = await videoProcessingService.processVideoWithToasts(videoUrl, category);
      
      if (result.success && result.videoData) {
        onVideoAdded(result.videoData);
        toast.success('🎉 Video added successfully!');
        resetForm();
        onClose();
      } else {
        toast.error(`Failed to process video: ${result.error}`);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  // Process multiple videos
  const processBulkVideos = async () => {
    if (!bulkUrls.trim() || !category.trim()) {
      toast.error('Please enter URLs and select a category');
      return;
    }

    const urls = bulkUrls.split('\n').map(url => url.trim()).filter(url => url);
    if (urls.length === 0) {
      toast.error('No valid URLs found');
      return;
    }

    setIsProcessing(true);

    // Initialize videos to process
    const initialVideos: VideoToProcess[] = urls.map((url, index) => ({
      url,
      category,
      id: `video-${index}`,
      status: 'pending',
      progress: null
    }));

    setVideosToProcess(initialVideos);

    try {
      let overallProgressToast = toast.loading('📊 Starting bulk video processing...', { duration: Infinity });

      const results = await videoProcessingService.processMultipleVideos(
        urls,
        category,
        (completed, total, currentVideo) => {
          // Update overall progress
          toast.dismiss(overallProgressToast);
          overallProgressToast = toast.loading(
            `🔄 Processing ${completed}/${total} videos${currentVideo ? `: ${currentVideo}` : ''}`,
            { duration: Infinity }
          );
        },
        (url, progress) => {
          // Update individual video progress
          setVideosToProcess(prev => prev.map(video => 
            video.url === url 
              ? { 
                  ...video, 
                  status: progress.step === 'completed' ? 'completed' : 
                         progress.step === 'failed' ? 'failed' : 'processing',
                  progress 
                }
              : video
          ));
        }
      );

      toast.dismiss(overallProgressToast);

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      if (successful > 0) {
        toast.success(`✅ ${successful} videos processed successfully!`);
        // Add successful videos to the list
        results.forEach(result => {
          if (result.success && result.videoData) {
            onVideoAdded(result.videoData);
          }
        });
      }

      if (failed > 0) {
        toast.error(`❌ ${failed} videos failed to process`);
      }

      if (successful === results.length) {
        // All successful - close modal
        setTimeout(() => {
          resetForm();
          onClose();
        }, 2000);
      }

    } catch (error) {
      toast.error('Bulk processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            🎬 Add Videos with AI Analysis
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            disabled={isProcessing}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Mode Selection */}
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setMode('single')}
              className={`px-4 py-2 rounded-md flex items-center ${
                mode === 'single'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
              disabled={isProcessing}
            >
              <Plus size={16} className="mr-2" />
              Single Video
            </button>
            <button
              onClick={() => setMode('bulk')}
              className={`px-4 py-2 rounded-md flex items-center ${
                mode === 'bulk'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
              disabled={isProcessing}
            >
              <Upload size={16} className="mr-2" />
              Bulk Import
            </button>
          </div>

          {mode === 'single' ? (
            // Single Video Mode
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  YouTube Video URL
                </label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className={`w-full px-3 py-2 border ${
                    validationError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white`}
                  disabled={isProcessing}
                />
                {validationError && (
                  <p className="mt-1 text-sm text-red-500 flex items-center">
                    <AlertCircle size={16} className="mr-1" />
                    {validationError}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  📊 We'll automatically extract metadata and analyze content with AI
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  disabled={isProcessing}
                >
                  <option value="">Select a category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  onClick={processSingleVideo}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isProcessing || !videoUrl.trim() || !category.trim() || !!validationError}
                >
                  {isProcessing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Plus size={16} className="mr-2" />
                      Add Video
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            // Bulk Import Mode
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  YouTube Video URLs (one per line)
                </label>
                <textarea
                  value={bulkUrls}
                  onChange={(e) => setBulkUrls(e.target.value)}
                  rows={8}
                  placeholder="https://www.youtube.com/watch?v=example1&#10;https://www.youtube.com/watch?v=example2&#10;https://www.youtube.com/watch?v=example3"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  disabled={isProcessing}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  🧠 Each video will be analyzed with AI for career exploration insights
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category for all videos
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  disabled={isProcessing}
                >
                  <option value="">Select a category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Processing Progress */}
              {videosToProcess.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Processing Progress
                  </h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {videosToProcess.map((video) => (
                      <div key={video.id} className="flex items-center space-x-3 text-sm">
                        <div className="flex-shrink-0">
                          {video.status === 'completed' && (
                            <CheckCircle size={16} className="text-green-500" />
                          )}
                          {video.status === 'failed' && (
                            <AlertCircle size={16} className="text-red-500" />
                          )}
                          {video.status === 'processing' && (
                            <svg className="animate-spin h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          )}
                          {video.status === 'pending' && (
                            <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 dark:text-white truncate">
                            {video.url}
                          </p>
                          {video.progress && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {video.progress.message}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  onClick={processBulkVideos}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isProcessing || !bulkUrls.trim() || !category.trim()}
                >
                  {isProcessing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing Videos...
                    </>
                  ) : (
                    <>
                      <Upload size={16} className="mr-2" />
                      Process All Videos
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedVideoForm; 