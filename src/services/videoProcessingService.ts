import { toast } from 'react-hot-toast';
import enhancedVideoService, { type EnhancedVideoData } from './enhancedVideoService';
import youtubeService from './youtubeService';
import bumpupsService from './bumpupsService';

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
  constructor() {
    // Using singleton instances directly
  }

  /**
   * Process a single video URL with real-time progress updates
   */
  async processVideo(
    url: string, 
    category: string, 
    onProgress?: ProgressCallback,
    bumpupsOptions?: {
      prompt?: string;
      model?: string;
      language?: string;
      output_format?: string;
    }
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

      const videoId = youtubeService.extractVideoId(url);
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

      const youtubeData = await youtubeService.getVideoMetadata(url);
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

      await enhancedVideoService.storeVideoData(initialVideoData);

      // Step 4: AI Analysis with Bumpups
      updateProgress({
        step: 'ai_analysis',
        message: 'Analyzing video content with AI...',
        progress: 70,
        videoId
      });

      const analysisResult = await bumpupsService.processVideo(url, bumpupsOptions);
      console.log('Bumpups analysis result:', analysisResult);
      
      // Update with AI analysis
      const aiAnalysis = {
        careerExplorationAnalysis: analysisResult.jobSummary || analysisResult.output || '',
        analyzedAt: new Date().toISOString(),
        confidence: analysisResult.confidence || 90,
        analysisType: 'career_exploration' as const,
      };

      // Extract enhanced metadata from the structured analysis
      const enhancedSkills = this.extractSkillsFromOutput(aiAnalysis.careerExplorationAnalysis);
      const careerPathways = this.extractPathwaysFromOutput(aiAnalysis.careerExplorationAnalysis);
      const hashtags = this.extractHashtagsFromOutput(aiAnalysis.careerExplorationAnalysis);
      const reflectiveQuestions = this.extractReflectiveQuestions(aiAnalysis.careerExplorationAnalysis);
      const emotionalElements = this.extractEmotionalElements(aiAnalysis.careerExplorationAnalysis);
      const challenges = this.extractChallenges(aiAnalysis.careerExplorationAnalysis);

      // Update video with analysis
      updateProgress({
        step: 'storing',
        message: 'Finalizing video data...',
        progress: 90,
        videoId
      });

      // Determine career stage from analysis text
      let careerStage: 'entry-level' | 'mid-level' | 'senior' | 'any' = 'any';
      const analysisText = aiAnalysis.careerExplorationAnalysis.toLowerCase();
      if (analysisText.includes('entry') || analysisText.includes('beginner') || analysisText.includes('junior')) {
        careerStage = 'entry-level';
      } else if (analysisText.includes('senior') || analysisText.includes('lead') || analysisText.includes('manager')) {
        careerStage = 'senior';
      } else if (analysisText.includes('mid') || analysisText.includes('experienced')) {
        careerStage = 'mid-level';
      }

      // Extract education requirements
      const educationRequired: string[] = [];
      if (analysisText.includes('degree')) educationRequired.push('Degree');
      if (analysisText.includes('bachelor')) educationRequired.push('Bachelor\'s Degree');
      if (analysisText.includes('master')) educationRequired.push('Master\'s Degree');
      if (analysisText.includes('phd') || analysisText.includes('doctorate')) educationRequired.push('PhD');
      if (analysisText.includes('certification')) educationRequired.push('Certification');
      if (analysisText.includes('training')) educationRequired.push('Training');
      if (analysisText.includes('apprenticeship')) educationRequired.push('Apprenticeship');

      const finalVideoData = {
        ...initialVideoData,
        aiAnalysis,
        skillsHighlighted: enhancedSkills,
        careerPathways,
        hashtags,
        careerStage,
        educationRequired,
        reflectiveQuestions,
        emotionalElements,
        challenges,
        lastAnalyzed: new Date().toISOString(),
        analysisStatus: 'completed' as const,
      };

      await enhancedVideoService.updateVideoWithAnalysis(videoId, {
        aiAnalysis,
        skillsHighlighted: enhancedSkills,
        careerPathways,
        hashtags,
        careerStage,
        educationRequired,
        reflectiveQuestions,
        emotionalElements,
        challenges,
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
    onVideoProgress?: (url: string, progress: VideoProcessingProgress) => void,
    bumpupsOptions?: {
      prompt?: string;
      model?: string;
      language?: string;
      output_format?: string;
    }
  ): Promise<ProcessedVideoResult[]> {
    const results: ProcessedVideoResult[] = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i].trim();
      if (!url) continue;

      onOverallProgress?.(i, urls.length, url);

      const result = await this.processVideo(url, category, (progress) => {
        onVideoProgress?.(url, progress);
      }, bumpupsOptions);

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
  async processVideoWithToasts(
    url: string, 
    category: string,
    bumpupsOptions?: {
      prompt?: string;
      model?: string;
      language?: string;
      output_format?: string;
    }
  ): Promise<ProcessedVideoResult> {
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
          toast.success('✅ Video processed successfully!');
          break;
        case 'failed':
          toast.error(`❌ ${progress.message}`);
          break;
      }
    }, bumpupsOptions);

    return result;
  }

  /**
   * Get video status
   */
  async getVideoStatus(videoId: string): Promise<EnhancedVideoData | null> {
    return enhancedVideoService.getVideoData(videoId);
  }

  /**
   * Validate YouTube URL
   */
  validateYouTubeUrl(url: string): { isValid: boolean; videoId?: string; error?: string } {
    const videoId = youtubeService.extractVideoId(url);
    
    if (!videoId) {
      return {
        isValid: false,
        error: 'Invalid YouTube URL format'
      };
    }
    
    return {
      isValid: true,
      videoId
    };
  }

  /**
   * Extract skills from output text
   */
  private extractSkillsFromOutput(output: string): string[] {
    const skills = new Set<string>();
    
    // Look for skills section with the new format
    const skillsMatch = output.match(/(?:# Soft Skills Demonstrated)[^\n]*\n((?:- [^\n]+\n?)+)/i);
    if (skillsMatch && skillsMatch[1]) {
      const skillsText = skillsMatch[1].trim();
      
      // Extract bullet points
      const bulletPoints = skillsText.match(/- ([^\n]+)/g);
      if (bulletPoints) {
        bulletPoints.forEach(point => {
          const skill = point.replace(/^- /, '').trim();
          if (skill) skills.add(skill);
        });
      }
    }
    
    // Also look for skills mentioned in the entire text if we didn't find enough
    if (skills.size < 3) {
      // Look for bullet points with skill-related terms
      const allBulletPoints = output.match(/- ([^\n]+)/g) || [];
      allBulletPoints.forEach(point => {
        const lowerPoint = point.toLowerCase();
        if (lowerPoint.includes('skill') || 
            lowerPoint.includes('organiz') || 
            lowerPoint.includes('communicat') || 
            lowerPoint.includes('manag') ||
            lowerPoint.includes('leadership')) {
          const skill = point.replace(/^- /, '').trim();
          if (skill) skills.add(skill);
        }
      });
      
      // Common soft skills to look for in the text
      const skillKeywords = [
        'communication', 'teamwork', 'leadership', 'problem-solving', 'critical thinking',
        'creativity', 'adaptability', 'time management', 'organization', 'attention to detail',
        'interpersonal', 'collaboration', 'negotiation', 'decision-making', 'emotional intelligence',
        'resilience', 'self-motivation', 'conflict resolution', 'active listening', 'empathy'
      ];
      
      skillKeywords.forEach(keyword => {
        if (output.toLowerCase().includes(keyword.toLowerCase())) {
          skills.add(keyword.charAt(0).toUpperCase() + keyword.slice(1));
        }
      });
    }
    
    return Array.from(skills).slice(0, 10); // Limit to 10 skills
  }
  
  /**
   * Extract career pathways from output text
   */
  private extractPathwaysFromOutput(output: string): string[] {
    const pathways = new Set<string>();
    
    // Look for career pathways section with the new format
    const pathwaysMatch = output.match(/(?:# Recommended Career Paths)[^\n]*\n((?:- [^\n]+\n?)+)/i);
    if (pathwaysMatch && pathwaysMatch[1]) {
      const pathwaysText = pathwaysMatch[1].trim();
      
      // Extract bullet points
      const bulletPoints = pathwaysText.match(/- ([^\n]+)/g);
      if (bulletPoints) {
        bulletPoints.forEach(point => {
          const pathway = point.replace(/^- /, '').trim();
          if (pathway) pathways.add(pathway);
        });
      }
    }
    
    // Look for pathways in the key themes section if we didn't find enough
    if (pathways.size < 2) {
      const themesMatch = output.match(/(?:# Key Themes and Environments)[^\n]*\n((?:- [^\n]+\n?)+)/i);
      if (themesMatch && themesMatch[1]) {
        const themesText = themesMatch[1].trim();
        const bulletPoints = themesText.match(/- ([^\n]+)/g);
        if (bulletPoints) {
          bulletPoints.forEach(point => {
            const lowerPoint = point.toLowerCase();
            if (lowerPoint.includes('career') || 
                lowerPoint.includes('path') || 
                lowerPoint.includes('industry') || 
                lowerPoint.includes('field')) {
              const pathway = point.replace(/^- /, '').trim();
              if (pathway) pathways.add(pathway);
            }
          });
        }
      }
      
      // Common industry pathways to look for in the text
      const pathwayKeywords = [
        'creative industries', 'STEM', 'social impact', 'healthcare', 'education',
        'business', 'finance', 'technology', 'engineering', 'arts', 'media',
        'hospitality', 'trades', 'construction', 'manufacturing', 'public service'
      ];
      
      pathwayKeywords.forEach(keyword => {
        if (output.toLowerCase().includes(keyword.toLowerCase())) {
          pathways.add(keyword.charAt(0).toUpperCase() + keyword.slice(1));
        }
      });
    }
    
    return Array.from(pathways).slice(0, 5); // Limit to 5 pathways
  }
  
  /**
   * Extract hashtags from output text
   */
  private extractHashtagsFromOutput(output: string): string[] {
    const hashtags = new Set<string>();
    
    // Look for hashtags section with the new format
    const hashtagsMatch = output.match(/(?:# Suggested Hashtags)[^\n]*\n((?:- #[^\n]+\n?)+)/i);
    if (hashtagsMatch && hashtagsMatch[1]) {
      const hashtagsText = hashtagsMatch[1].trim();
      
      // Extract hashtags
      const hashtagLines = hashtagsText.match(/- (#\w+)/g);
      if (hashtagLines) {
        hashtagLines.forEach(line => {
          const hashtag = line.replace(/^- /, '').trim();
          if (hashtag) hashtags.add(hashtag);
        });
      }
    }
    
    // Look for hashtags in the entire output
    if (hashtags.size === 0) {
      const allHashtags = output.match(/#\w+/g);
      if (allHashtags) {
        allHashtags.forEach(tag => hashtags.add(tag));
      }
    }
    
    // If still no hashtags found, generate from key themes
    if (hashtags.size === 0) {
      const themesMatch = output.match(/(?:# Key Themes and Environments)[^\n]*\n((?:- [^\n]+\n?)+)/i);
      if (themesMatch && themesMatch[1]) {
        const themesText = themesMatch[1].trim();
        const words = themesText.split(/[,;\s]/).map(w => w.trim()).filter(w => w.length > 3);
        
        words.slice(0, 5).forEach(word => {
          const cleanWord = word.replace(/[^\w]/g, '');
          if (cleanWord) hashtags.add('#' + cleanWord);
        });
      }
    }
    
    return Array.from(hashtags).slice(0, 10); // Limit to 10 hashtags
  }
  
  /**
   * Extract reflective questions from output text
   */
  private extractReflectiveQuestions(output: string): string[] {
    const questions: string[] = [];
    
    // Look for reflective questions section with the new format
    const questionsMatch = output.match(/(?:# Reflective Prompts for Young Viewers)[^\n]*\n((?:- [^\n]+\n?)+)/i);
    if (questionsMatch && questionsMatch[1]) {
      const questionsText = questionsMatch[1].trim();
      
      // Extract bullet points
      const bulletPoints = questionsText.match(/- ([^\n]+)/g);
      if (bulletPoints) {
        bulletPoints.forEach(point => {
          const question = point.replace(/^- /, '').trim();
          if (question) questions.push(question);
        });
      }
    }
    
    return questions.slice(0, 3); // Limit to 3 questions
  }
  
  /**
   * Extract emotional elements from output text
   */
  private extractEmotionalElements(output: string): string[] {
    const elements = new Set<string>();
    
    // Look for emotional and aspirational elements section with the new format
    const elementsMatch = output.match(/(?:# Aspirational and Emotional Elements)[^\n]*\n((?:- [^\n]+\n?)+)/i);
    if (elementsMatch && elementsMatch[1]) {
      const elementsText = elementsMatch[1].trim();
      
      // Extract bullet points
      const bulletPoints = elementsText.match(/- ([^\n]+)/g);
      if (bulletPoints) {
        bulletPoints.forEach(point => {
          const element = point.replace(/^- /, '').trim();
          if (element) elements.add(element);
        });
      }
    }
    
    // Also look for common emotional keywords if we didn't find enough elements
    if (elements.size < 2) {
      const emotionalKeywords = [
        'passion', 'inspiration', 'fulfillment', 'purpose', 'satisfaction',
        'excitement', 'pride', 'accomplishment', 'joy', 'enthusiasm',
        'motivation', 'ambition', 'determination', 'dedication', 'aspiration'
      ];
      
      emotionalKeywords.forEach(keyword => {
        if (output.toLowerCase().includes(keyword.toLowerCase())) {
          elements.add(keyword.charAt(0).toUpperCase() + keyword.slice(1));
        }
      });
    }
    
    return Array.from(elements).slice(0, 5); // Limit to 5 elements
  }
  
  /**
   * Extract challenges from output text
   */
  private extractChallenges(output: string): string[] {
    const challenges = new Set<string>();
    
    // Look for challenges section with the new format
    const challengesMatch = output.match(/(?:# Challenges Highlighted)[^\n]*\n((?:- [^\n]+\n?)+)/i);
    if (challengesMatch && challengesMatch[1]) {
      const challengesText = challengesMatch[1].trim();
      
      // Extract bullet points
      const bulletPoints = challengesText.match(/- ([^\n]+)/g);
      if (bulletPoints) {
        bulletPoints.forEach(point => {
          const challenge = point.replace(/^- /, '').trim();
          if (challenge) challenges.add(challenge);
        });
      }
    }
    
    return Array.from(challenges).slice(0, 5); // Limit to 5 challenges
  }
}

// Create and export a singleton instance
const videoProcessingService = new VideoProcessingService();
export default videoProcessingService; 