// Enhanced video service that combines YouTube API, Bumpups AI analysis, and Firebase storage

import { doc, setDoc, updateDoc, getDoc, collection, query, where, getDocs, Firestore } from 'firebase/firestore';
import { db } from './firebase';
import youtubeService from './youtubeService';
import bumpupsService from './bumpupsService';

// Type definitions for the EnhancedVideoData interface
export interface EnhancedVideoData {
  id: string;
  
  // Basic video info
  title: string;
  description: string;
  category: string;
  tags: string[];
  thumbnailUrl: string;
  sourceUrl: string;
  sourceId: string;
  sourceType: 'youtube';
  
  // YouTube metadata
  youtubeMetadata?: {
    channelTitle: string;
    channelId: string;
    publishedAt: string;
    duration: number; // seconds
    viewCount: number;
    likeCount: number;
    commentCount: number;
    definition: 'HD' | 'SD';
    hasCaption: boolean;
    language?: string;
  };
  
  // AI analysis from Bumpups (supports multiple formats)
  aiAnalysis?: {
    // Legacy format (for backwards compatibility)
    summary?: {
      short: string;
      detailed: string;
      keyPoints: string[];
    };
    timestamps?: Array<{
      time: number;
      title: string;
      description?: string;
    }>;
    careerInfo?: {
      skills: string[];
      salary: string;
      education: string[];
      responsibilities: string[];
      advice: string[];
    };
    processingTime?: number;
    
    // New career exploration format
    careerExplorationAnalysis?: string;
    analysisType?: 'legacy' | 'career_exploration';
    
    // Common fields
    confidence: number;
    analyzedAt: string;
  };
  
  // Career-specific data
  skillsHighlighted: string[];
  educationRequired: string[];
  careerStage: 'entry-level' | 'mid-level' | 'senior' | 'any';
  careerPathways?: string[];
  hashtags?: string[];
  reflectiveQuestions?: string[];
  emotionalElements?: string[];
  challenges?: string[];
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
  };
  
  // Metadata
  curatedDate: string;
  lastAnalyzed?: string;
  analysisStatus: 'pending' | 'analyzing' | 'completed' | 'failed';
  creator?: string;
  creatorUrl?: string;
  viewCount: number;
}

class EnhancedVideoService {
  private firestore: Firestore;
  
  constructor() {
    this.firestore = db as Firestore;
  }

  /**
   * Analyze a YouTube video and store comprehensive metadata
   */
  async analyzeAndStoreVideo(youtubeUrl: string, category: string): Promise<EnhancedVideoData> {
    console.log('🎯 Starting comprehensive video analysis for:', youtubeUrl);

    // Step 1: Extract video ID
    const videoId = youtubeService.extractVideoId(youtubeUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    // Step 2: Get YouTube metadata
    console.log('📊 Fetching YouTube metadata...');
    const youtubeData = await youtubeService.getVideoMetadata(youtubeUrl);
    if (!youtubeData) {
      throw new Error('Could not fetch YouTube metadata');
    }

    // Step 3: Create initial video record
    const initialVideoData: EnhancedVideoData = {
      id: videoId,
      title: youtubeData.title,
      description: youtubeData.description.substring(0, 500), // Truncate for storage
      category: category,
      tags: youtubeData.tags,
      thumbnailUrl: youtubeData.thumbnails.maxres || youtubeData.thumbnails.high,
      sourceUrl: youtubeUrl,
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
        language: youtubeData.language,
      },
      skillsHighlighted: [],
      educationRequired: [],
      careerStage: 'any',
      curatedDate: new Date().toISOString(),
      analysisStatus: 'pending',
      viewCount: youtubeData.viewCount,
    };

    // Step 4: Store initial data in Firebase
    await this.storeVideoData(initialVideoData);

    // Step 5: Start AI analysis (async)
    this.performAIAnalysis(videoId, youtubeUrl).catch(error => {
      console.error('AI analysis failed:', error);
      this.updateAnalysisStatus(videoId, 'failed');
    });

    return initialVideoData;
  }

  /**
   * Perform AI analysis using Bumpups API
   */
  private async performAIAnalysis(videoId: string, youtubeUrl: string): Promise<void> {
    try {
      // Perform AI analysis with career exploration focus
      console.log('🧠 Starting career exploration analysis with Bumpups...');
      const analysisResult = await bumpupsService.processVideo(youtubeUrl);
      
      console.log(`✅ Career exploration analysis complete!`);
      console.log(`📄 Analysis length: ${analysisResult.jobSummary?.length || 0} characters`);

      // Get current timestamp for analysis
      const currentTimestamp = new Date().toISOString();

      // Update with AI analysis - ensure all fields have default values to avoid undefined
      const aiAnalysis = {
        careerExplorationAnalysis: analysisResult.jobSummary || '',
        analyzedAt: currentTimestamp, // Ensure this is always defined
        confidence: analysisResult.confidence || 90, // Default confidence if not provided
        analysisType: 'career_exploration' as const,
      };

      // Extract enhanced metadata from the structured analysis
      const enhancedSkills = analysisResult.skillsHighlighted || [];
      const careerPathways = analysisResult.careerPathways || [];
      const hashtags = analysisResult.hashtags || [];

      // Update video with analysis
      await this.updateVideoWithAnalysis(videoId, {
        aiAnalysis,
        skillsHighlighted: enhancedSkills,
        careerPathways: careerPathways,
        hashtags: hashtags,
        lastAnalyzed: currentTimestamp,
        analysisStatus: 'completed',
      });

      console.log('🔄 Video updated with career exploration analysis');
    } catch (error) {
      console.error('❌ AI analysis failed:', error);
      await this.updateAnalysisStatus(videoId, 'failed');
    }
  }

  /**
   * Store video data in Firebase
   */
  async storeVideoData(videoData: EnhancedVideoData): Promise<void> {
    const videoRef = doc(this.firestore, 'videos', videoData.id);
    await setDoc(videoRef, videoData);
    console.log('💾 Video data stored in Firebase');
  }

  /**
   * Update video with AI analysis results
   */
  async updateVideoWithAnalysis(videoId: string, updates: Partial<EnhancedVideoData>): Promise<void> {
    try {
      const videoRef = doc(this.firestore, 'videos', videoId);
      
      // Ensure no undefined values in the update object
      const sanitizedUpdates: Record<string, any> = {};
      
      // Process aiAnalysis separately to ensure all nested fields are defined
      if (updates.aiAnalysis) {
        const aiAnalysis: Record<string, any> = {};
        
        // Copy all defined fields from the original aiAnalysis
        Object.entries(updates.aiAnalysis).forEach(([key, value]) => {
          if (value !== undefined) {
            aiAnalysis[key] = value;
          }
        });
        
        // Ensure required fields have defaults
        if (!aiAnalysis.analyzedAt) {
          aiAnalysis.analyzedAt = new Date().toISOString();
        }
        
        if (!aiAnalysis.confidence) {
          aiAnalysis.confidence = 90;
        }
        
        if (!aiAnalysis.analysisType) {
          aiAnalysis.analysisType = 'career_exploration';
        }
        
        sanitizedUpdates.aiAnalysis = aiAnalysis;
      }
      
      // Process all other fields
      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'aiAnalysis' && value !== undefined) {
          sanitizedUpdates[key] = value;
        }
      });
      
      // Ensure arrays have default empty arrays
      ['skillsHighlighted', 'educationRequired', 'careerPathways', 'hashtags'].forEach(field => {
        if (updates[field as keyof EnhancedVideoData] === undefined && field in updates) {
          sanitizedUpdates[field] = [];
        }
      });
      
      // Ensure timestamp fields have values
      if ('lastAnalyzed' in updates && !sanitizedUpdates.lastAnalyzed) {
        sanitizedUpdates.lastAnalyzed = new Date().toISOString();
      }
      
      await updateDoc(videoRef, sanitizedUpdates);
      console.log('🔄 Video updated with AI analysis');
    } catch (error) {
      console.error('❌ Error updating video with analysis:', error);
      throw error;
    }
  }

  /**
   * Update analysis status
   */
  private async updateAnalysisStatus(videoId: string, status: EnhancedVideoData['analysisStatus']): Promise<void> {
    const videoRef = doc(this.firestore, 'videos', videoId);
    await updateDoc(videoRef, { analysisStatus: status });
  }

  /**
   * Get video data from Firebase
   */
  async getVideoData(videoId: string): Promise<EnhancedVideoData | null> {
    const videoRef = doc(this.firestore, 'videos', videoId);
    const videoDoc = await getDoc(videoRef);
    
    if (videoDoc.exists()) {
      return videoDoc.data() as EnhancedVideoData;
    }
    
    return null;
  }

  /**
   * Get videos by category with AI analysis
   */
  async getVideosByCategory(category: string, includeAnalysisOnly: boolean = false): Promise<EnhancedVideoData[]> {
    let q = query(
      collection(this.firestore, 'videos'),
      where('category', '==', category)
    );

    if (includeAnalysisOnly) {
      q = query(q, where('analysisStatus', '==', 'completed'));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as EnhancedVideoData);
  }

  /**
   * Search videos by skills
   */
  async searchBySkills(skills: string[]): Promise<EnhancedVideoData[]> {
    const q = query(
      collection(this.firestore, 'videos'),
      where('skillsHighlighted', 'array-contains-any', skills)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as EnhancedVideoData);
  }

  /**
   * Get videos that are still being analyzed
   */
  async getPendingAnalysis(): Promise<EnhancedVideoData[]> {
    const q = query(
      collection(this.firestore, 'videos'),
      where('analysisStatus', 'in', ['pending', 'analyzing'])
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as EnhancedVideoData);
  }

  /**
   * Batch analyze multiple videos
   */
  async batchAnalyzeVideos(youtubeUrls: string[], category: string): Promise<EnhancedVideoData[]> {
    const results: EnhancedVideoData[] = [];
    
    for (const url of youtubeUrls) {
      try {
        console.log(`Processing ${results.length + 1}/${youtubeUrls.length}: ${url}`);
        const result = await this.analyzeAndStoreVideo(url, category);
        results.push(result);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to process ${url}:`, error);
      }
    }
    
    return results;
  }
}

// Create and export a singleton instance
const enhancedVideoService = new EnhancedVideoService();
export default enhancedVideoService; 