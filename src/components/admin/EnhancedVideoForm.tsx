import React, { useState } from 'react';
import { X, Plus, Upload, AlertCircle, CheckCircle, Settings } from 'lucide-react';
import { toast } from 'react-hot-toast';
import enhancedVideoService from '../../services/enhancedVideoService';

// Simple YouTube URL validation
const validateYouTubeUrl = (url: string): { isValid: boolean; error?: string } => {
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: 'URL is required' };
  }

  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return { isValid: false, error: 'URL cannot be empty' };
  }

  const youtubePatterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /^https?:\/\/(www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
  ];

  const isValid = youtubePatterns.some(pattern => pattern.test(trimmedUrl));
  if (!isValid) {
    return { isValid: false, error: 'Please enter a valid YouTube URL' };
  }

  return { isValid: true };
};

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
  progress: any;
  result?: any;
}

interface ProcessingOptions {
  includeBumpups: boolean;
}

interface BumpupsOptions {
  prompt: string;
  model: string;
  language: string;
  output_format: string;
}

export const EnhancedVideoForm: React.FC<EnhancedVideoFormProps> = ({
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
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [bumpupsOptions, setBumpupsOptions] = useState<BumpupsOptions>({
    prompt: "Analyse this video for a youth career exploration platform for 16–20-year-olds. Return your output in clear markdown using the following exact structure with bullet lists:\n\n# Key Themes and Environments\n- (max 5 themes/environments)\n\n# Soft Skills Demonstrated\n- (max 5 soft skills)\n\n# Challenges Highlighted\n- (max 5 challenges)\n\n# Aspirational and Emotional Elements\n- Timestamp – Quotation or moment (max 5)\n\n# Suggested Hashtags\n- #hashtag1\n- #hashtag2\n(up to 10)\n\n# Recommended Career Paths\n- (max 3 career paths)\n\n# Reflective Prompts for Young Viewers\n- Prompt 1\n- Prompt 2\n- Prompt 3\n\nReturn only the structured markdown without additional commentary",
    model: "bump-1.0",
    language: "en",
    output_format: "markdown"
  });

  // Reset form state
  const resetForm = () => {
    setVideoUrl('');
    setCategory('');
    setBulkUrls('');
    setVideosToProcess([]);
    setValidationError(null);
    setIsProcessing(false);
    setBumpupsOptions({
      prompt: "Analyse this video for a youth career exploration platform for 16–20-year-olds. Return your output in clear markdown using the following exact structure with bullet lists:\n\n# Key Themes and Environments\n- (max 5 themes/environments)\n\n# Soft Skills Demonstrated\n- (max 5 soft skills)\n\n# Challenges Highlighted\n- (max 5 challenges)\n\n# Aspirational and Emotional Elements\n- Timestamp – Quotation or moment (max 5)\n\n# Suggested Hashtags\n- #hashtag1\n- #hashtag2\n(up to 10)\n\n# Recommended Career Paths\n- (max 3 career paths)\n\n# Reflective Prompts for Young Viewers\n- Prompt 1\n- Prompt 2\n- Prompt 3\n\nReturn only the structured markdown without additional commentary",
      model: "bump-1.0",
      language: "en",
      output_format: "markdown"
    });
    setShowAdvancedOptions(false);
  };

  // Validate URL in real-time
  const handleUrlChange = (url: string) => {
    setVideoUrl(url);
    setValidationError(null);
    
    if (url.trim()) {
      const validation = validateYouTubeUrl(url);
      if (!validation.isValid) {
        setValidationError(validation.error || 'Invalid URL');
      }
    }
  };

  // Handle changes to Bumpups options
  const handleBumpupsOptionChange = (field: keyof BumpupsOptions, value: string) => {
    setBumpupsOptions(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Process a single video
  const processSingleVideo = async () => {
    if (!videoUrl.trim() || !category.trim()) {
      toast.error('Please enter a valid URL and select a category');
      return;
    }

    const validation = validateYouTubeUrl(videoUrl);
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid YouTube URL');
      return;
    }

    setIsProcessing(true);

    try {
      toast.loading('📝 Analyzing and processing video...', { id: 'video-process' });
      
      const videoData = await enhancedVideoService.analyzeAndStoreVideo(videoUrl, category);
      
      toast.success('🎉 Video added successfully!', { id: 'video-process' });
      onVideoAdded(videoData);
      resetForm();
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`❌ Error: ${errorMessage}`, { id: 'video-process' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Process multiple videos
  const processBulkVideos = async () => {
    const validUrls = bulkUrls.split('\n').map(url => url.trim()).filter(url => url && validateYouTubeUrl(url).isValid);
    
    if (validUrls.length === 0) {
      toast.error('Please enter at least one valid YouTube URL');
      return;
    }

    if (!category.trim()) {
      toast.error('Please select a category');
      return;
    }

    setIsProcessing(true);
    const toProcess: VideoToProcess[] = validUrls.map((url, index) => ({
      url: url,
      category,
      id: `video-${index}`,
      status: 'pending',
      progress: null
    }));

    setVideosToProcess(toProcess);

    try {
      const results = await enhancedVideoService.batchAnalyzeVideos(validUrls, category);
      
      // Update progress for all videos
      setVideosToProcess(prev => 
        prev.map(video => ({
          ...video,
          status: 'completed',
          progress: { success: true }
        }))
      );

      toast.success(`🎉 Successfully processed ${results.length} video(s)!`);
      results.forEach(videoData => {
        onVideoAdded(videoData);
      });

      resetForm();
      onClose();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`❌ Error: ${errorMessage}`);
      
      // Mark all as failed
      setVideosToProcess(prev => 
        prev.map(video => ({
          ...video,
          status: 'failed',
          progress: { success: false, error: errorMessage }
        }))
      );
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
          {/* Mode Selector */}
          <div className="flex space-x-4 mb-6">
            <button
              className={`flex-1 py-2 rounded-md ${
                mode === 'single'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
              onClick={() => setMode('single')}
              disabled={isProcessing}
            >
              Single Video
            </button>
            <button
              className={`flex-1 py-2 rounded-md ${
                mode === 'bulk'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
              onClick={() => setMode('bulk')}
              disabled={isProcessing}
            >
              Bulk Import
            </button>
          </div>

          {/* Category Selector (common to both modes) */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              disabled={isProcessing}
              required
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Advanced Options Toggle */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              disabled={isProcessing}
            >
              <Settings size={16} className="mr-1" />
              {showAdvancedOptions ? 'Hide Advanced Options' : 'Show Advanced Options'}
            </button>
          </div>

          {/* Advanced Options Panel */}
          {showAdvancedOptions && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
              <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">
                Bumpups API Options
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Analysis Prompt
                </label>
                <textarea
                  value={bumpupsOptions.prompt}
                  onChange={(e) => handleBumpupsOptionChange('prompt', e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  rows={3}
                  disabled={isProcessing}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Model
                  </label>
                  <select
                    value={bumpupsOptions.model}
                    onChange={(e) => handleBumpupsOptionChange('model', e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={isProcessing}
                  >
                    <option value="bump-1.0">bump-1.0</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Language
                  </label>
                  <select
                    value={bumpupsOptions.language}
                    onChange={(e) => handleBumpupsOptionChange('language', e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={isProcessing}
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="pt">Portuguese</option>
                    <option value="ru">Russian</option>
                    <option value="ar">Arabic</option>
                    <option value="hi">Hindi</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Output Format
                  </label>
                  <select
                    value={bumpupsOptions.output_format}
                    onChange={(e) => handleBumpupsOptionChange('output_format', e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    disabled={isProcessing}
                  >
                    <option value="text">Text</option>
                    <option value="markdown">Markdown</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {mode === 'single' ? (
            /* Single Video Mode */
            <div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  YouTube URL *
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className={`w-full p-2 pr-10 border ${
                      validationError
                        ? 'border-red-500 dark:border-red-400'
                        : 'border-gray-300 dark:border-gray-600'
                    } rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                    disabled={isProcessing}
                    required
                  />
                  {validationError && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                </div>
                {validationError && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationError}</p>
                )}
              </div>

              <button
                onClick={processSingleVideo}
                disabled={isProcessing || !!validationError || !videoUrl || !category}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-md shadow-sm flex items-center justify-center"
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-5 w-5" />
                    Process Video
                  </>
                )}
              </button>
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