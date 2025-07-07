import { toast } from 'react-hot-toast';
import EnhancedVideoService, { type EnhancedVideoData } from './enhancedVideoService';
import YouTubeService from './youtubeService';
import BumpupsService from './bumpupsService';

export interface VideoProcessingProgress {
  step: 'validating' | 'extracting_metadata' | 'ai_analysis' | 'storing' | 'completed' | 'failed';
  message: string;
  progress: number; // 0-100
  videoId?: string;
  error?: string;
}

export interface ProcessedVideoResult {
  success: boolean;
  videoData?: EnhancedVideoData;
  error?: string;
  videoId?: string;
}

export type ProgressCallback = (progress: VideoProcessingProgress) => void;

class VideoProcessingService {
  private enhancedVideoService: EnhancedVideoService;
  private youtubeService: YouTubeService;
  private bumpupsService: BumpupsService;

  constructor() {
    this.enhancedVideoService = new EnhancedVideoService();
    this.youtubeService = new YouTubeService();
    this.bumpupsService = new BumpupsService();
  }

  /**
   * Process a single video URL with real-time progress updates
   */
  async processVideo(
    url: string, 
    category: string, 
    onProgress?: ProgressCallback
  ): Promise<ProcessedVideoResult> {
    const updateProgress = (progress: VideoProcessingProgress) => {
      onProgress?.(progress);
    };

    try {
      // Step 1: Validate URL
      updateProgress({
        step: 'validating',
        message: 'Validating video URL...',
        progress: 10
      });

      const videoId = this.youtubeService.extractVideoId(url);
      if (!videoId) {
        throw new Error('Invalid YouTube URL format');
      }

      // Step 2: Extract YouTube metadata
      updateProgress({
        step: 'extracting_metadata',
        message: 'Extracting video metadata from YouTube...',
        progress: 30,
        videoId
      });

      const youtubeData = await this.youtubeService.getVideoMetadata(url);
      if (!youtubeData) {
        throw new Error('Could not fetch video metadata from YouTube');
      }

      // Create initial video record
      const initialVideoData: EnhancedVideoData = {
        id: videoId,
        title: youtubeData.title,
        description: youtubeData.description.substring(0, 500),
        category: category,
        tags: youtubeData.tags,
        thumbnailUrl: youtubeData.thumbnails.maxres || youtubeData.thumbnails.high,
        sourceUrl: url,
        sourceId: videoId,
        sourceType: 'youtube',
        youtubeMetadata: {
          channelTitle: youtubeData.channelTitle,
          channelId: youtubeData.channelId,
          publishedAt: youtubeData.publishedAt,
          duration: parseInt(youtubeData.duration),
          viewCount: youtubeData.viewCount,
          likeCount: youtubeData.likeCount,
          commentCount: youtubeData.commentCount,
          definition: youtubeData.definition,
          hasCaption: youtubeData.hasCaption,
          language: youtubeData.language || 'en',
        },
        skillsHighlighted: [],
        educationRequired: [],
        careerStage: 'any',
        curatedDate: new Date().toISOString(),
        analysisStatus: 'pending',
        viewCount: youtubeData.viewCount,
      };

      // Step 3: Store initial data
      updateProgress({
        step: 'storing',
        message: 'Storing video metadata...',
        progress: 50,
        videoId
      });

      await this.enhancedVideoService.storeVideoData(initialVideoData);

      // Step 4: AI Analysis with Bumpups
      updateProgress({
        step: 'ai_analysis',
        message: 'Analyzing video content with AI...',
        progress: 70,
        videoId
      });

      const analysisResult = await this.bumpupsService.analyzeForCareerExploration(url);
      
      // Update with AI analysis
      const aiAnalysis = {
        careerExplorationAnalysis: analysisResult.careerExplorationAnalysis || '',
        analyzedAt: analysisResult.analyzedAt,
        confidence: analysisResult.confidence || 90,
        analysisType: analysisResult.analysisType || 'career_exploration',
      };

      // Extract enhanced metadata
      const enhancedSkills = this.extractSkillsFromCareerAnalysis(analysisResult.careerExplorationAnalysis || '');
      const careerPathways = this.extractCareerPathways(analysisResult.careerExplorationAnalysis || '');
      const hashtags = this.extractHashtags(analysisResult.careerExplorationAnalysis || '');

      // Final update
      updateProgress({
        step: 'storing',
        message: 'Finalizing video data...',
        progress: 90,
        videoId
      });

      const finalVideoData = {
        ...initialVideoData,
        aiAnalysis,
        skillsHighlighted: enhancedSkills,
        careerPathways,
        hashtags,
        lastAnalyzed: new Date().toISOString(),
        analysisStatus: 'completed' as const,
      };

      await this.enhancedVideoService.updateVideoWithAnalysis(videoId, {
        aiAnalysis,
        skillsHighlighted: enhancedSkills,
        careerPathways,
        hashtags,
        lastAnalyzed: new Date().toISOString(),
        analysisStatus: 'completed',
      });

      // Completed!
      updateProgress({
        step: 'completed',
        message: 'Video processing completed successfully!',
        progress: 100,
        videoId
      });

      return {
        success: true,
        videoData: finalVideoData,
        videoId
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      updateProgress({
        step: 'failed',
        message: `Processing failed: ${errorMessage}`,
        progress: 0,
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Process multiple videos with progress tracking
   */
  async processMultipleVideos(
    urls: string[], 
    category: string,
    onOverallProgress?: (completed: number, total: number, currentVideo?: string) => void,
    onVideoProgress?: (url: string, progress: VideoProcessingProgress) => void
  ): Promise<ProcessedVideoResult[]> {
    const results: ProcessedVideoResult[] = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i].trim();
      if (!url) continue;

      onOverallProgress?.(i, urls.length, url);

      const result = await this.processVideo(url, category, (progress) => {
        onVideoProgress?.(url, progress);
      });

      results.push(result);

      // Small delay between videos to avoid rate limiting
      if (i < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    onOverallProgress?.(urls.length, urls.length);
    return results;
  }

  /**
   * Process video with toast notifications
   */
  async processVideoWithToasts(url: string, category: string): Promise<ProcessedVideoResult> {
    let toastId: string | undefined;

    const result = await this.processVideo(url, category, (progress) => {
      if (toastId) {
        toast.dismiss(toastId);
      }

      switch (progress.step) {
        case 'validating':
          toastId = toast.loading('🔍 Validating video URL...', { duration: Infinity });
          break;
        case 'extracting_metadata':
          toastId = toast.loading('📊 Fetching video metadata...', { duration: Infinity });
          break;
        case 'ai_analysis':
          toastId = toast.loading('🧠 Analyzing video content...', { duration: Infinity });
          break;
        case 'storing':
          toastId = toast.loading('💾 Storing video data...', { duration: Infinity });
          break;
        case 'completed':
          toast.success(`✅ Video "${progress.videoId}" processed successfully!`, { duration: 4000 });
          break;
        case 'failed':
          toast.error(`❌ Failed to process video: ${progress.error}`, { duration: 6000 });
          break;
      }
    });

    if (toastId) {
      toast.dismiss(toastId);
    }

    return result;
  }

  /**
   * Extract skills from career analysis
   */
  private extractSkillsFromCareerAnalysis(analysis: string): string[] {
    const skills = new Set<string>();
    
    const skillKeywords = ['programming', 'coding', 'javascript', 'python', 'react', 'html', 'css', 
                         'communication', 'leadership', 'management', 'design', 'analysis', 'engineering',
                         'problem-solving', 'collaboration', 'mentoring', 'time management', 'attention to detail'];
    
    skillKeywords.forEach(keyword => {
      if (analysis.toLowerCase().includes(keyword)) {
        skills.add(keyword.charAt(0).toUpperCase() + keyword.slice(1));
      }
    });

    return Array.from(skills).slice(0, 10);
  }

  /**
   * Extract career pathways
   */
  private extractCareerPathways(analysis: string): string[] {
    const pathways = new Set<string>();
    
    const pathwayKeywords = ['software development', 'data science', 'AI', 'machine learning', 'blockchain', 
                           'cybersecurity', 'STEM', 'creative industries', 'social impact', 'trades', 
                           'healthcare', 'business', 'education', 'engineering'];
    
    pathwayKeywords.forEach(keyword => {
      if (analysis.toLowerCase().includes(keyword.toLowerCase())) {
        pathways.add(keyword);
      }
    });

    return Array.from(pathways).slice(0, 5);
  }

  /**
   * Extract hashtags
   */
  private extractHashtags(analysis: string): string[] {
    const hashtags = new Set<string>();
    
    const hashtagPattern = /#\w+/g;
    const matches = analysis.match(hashtagPattern);
    
    if (matches) {
      matches.forEach(match => hashtags.add(match));
    }

    return Array.from(hashtags).slice(0, 8);
  }

  /**
   * Get video processing status
   */
  async getVideoStatus(videoId: string): Promise<EnhancedVideoData | null> {
    return await this.enhancedVideoService.getVideoData(videoId);
  }

  /**
   * Validate YouTube URL
   */
  validateYouTubeUrl(url: string): { isValid: boolean; videoId?: string; error?: string } {
    try {
      const videoId = this.youtubeService.extractVideoId(url);
      if (!videoId) {
        return { isValid: false, error: 'Invalid YouTube URL format' };
      }
      return { isValid: true, videoId };
    } catch (error) {
      return { isValid: false, error: 'Invalid URL' };
    }
  }
}

export default VideoProcessingService; 