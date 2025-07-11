// Enhanced video service that combines YouTube API, Transcript + OpenAI analysis, and Firebase storage

import { doc, setDoc, updateDoc, getDoc, collection, query, where, getDocs, Firestore } from 'firebase/firestore';
import { db } from './firebase';
import youtubeService from './youtubeService';
import bumpupsService from './bumpupsService';
import transcriptService from './transcriptService';
import { getEnvironmentConfig } from '../config/environment';
import type { TranscriptResult, OpenAIAnalysisResult } from './transcriptService';

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
    analysisType?: 'legacy' | 'career_exploration' | 'transcript_openai' | 'bumpups_fallback';
    
    // Transcript-based analysis fields
    transcriptSummary?: string;
    tokensUsed?: number;
    transcriptInfo?: {
      segmentCount: number;
      extractedAt: string;
      fullTextLength: number;
    };
    
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
  keyThemes?: string[];
  aspirationalElements?: string[];
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
   * Process video using the working Firebase function pipeline
   * This calls the same function that the batch script uses successfully
   */
  async processVideoWithFirebaseFunction(youtubeUrl: string, category: string): Promise<EnhancedVideoData> {
    console.log('🎯 Processing video via Firebase function:', youtubeUrl);

    const videoId = youtubeService.extractVideoId(youtubeUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    try {
      // Get the Firebase project ID from environment config
      const envConfig = getEnvironmentConfig();
      const projectId = envConfig.firebase.projectId;
      
      if (!projectId || projectId.includes('your-project') || projectId.includes('__FIREBASE_')) {
        throw new Error('Firebase project ID not configured properly');
      }
      
      // Call the working Firebase function (same one used by batch script)
      const functionUrl = `https://us-central1-${projectId}.cloudfunctions.net/processVideoWithTranscript`;
      
      console.log('📞 Calling Firebase function:', functionUrl);
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId,
          youtubeUrl,
          category
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Firebase function error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Processing failed');
      }

      console.log('✅ Video processed successfully via Firebase function');
      
      // Return the processed video data
      return result.data || result.videoData;
      
    } catch (error) {
      console.error('❌ Firebase function processing failed:', error);
      throw error;
    }
  }

  /**
   * Analyze a YouTube video and store comprehensive metadata
   * @deprecated Use processVideoWithFirebaseFunction instead for reliable processing
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
   * Perform AI analysis using transcript + OpenAI (primary) with Bumpups as fallback
   */
  private async performAIAnalysis(videoId: string, youtubeUrl: string): Promise<void> {
    try {
      console.log('🎬 Starting transcript-first analysis pipeline...');

      // Step 1: Extract transcript 
      console.log('📝 Extracting transcript...');
      const transcriptResult = await transcriptService.extractTranscript(youtubeUrl);
      
      if (!transcriptResult.success) {
        console.warn('⚠️ Transcript extraction failed, falling back to Bumpups analysis');
        await this.fallbackToBumpupsAnalysis(videoId, youtubeUrl);
        return;
      }

      console.log(`✅ Transcript extracted: ${transcriptResult.segmentCount} segments, ${transcriptResult.fullText.length} characters`);

      // Step 2: Analyze transcript with OpenAI
      console.log('🧠 Analyzing transcript with OpenAI...');
      const openaiResult = await transcriptService.analyzeWithOpenAI(
        transcriptResult.fullText, 
        'Career Exploration' // Default category - could be enhanced later
      );

      if (!openaiResult.success || !openaiResult.analysis) {
        console.warn('⚠️ OpenAI analysis failed, falling back to Bumpups analysis');
        await this.fallbackToBumpupsAnalysis(videoId, youtubeUrl);
        return;
      }

      console.log('✅ OpenAI analysis completed successfully');

      // Step 3: Store the comprehensive analysis
      const currentTimestamp = new Date().toISOString();
      
      const aiAnalysis = {
        // Store transcript summary and OpenAI analysis
        transcriptSummary: openaiResult.analysis.summary,
        careerExplorationAnalysis: this.formatCareerAnalysis(openaiResult.analysis),
        confidence: 95, // High confidence for transcript-based analysis
        analyzedAt: currentTimestamp,
        analysisType: 'transcript_openai' as const,
        tokensUsed: openaiResult.tokensUsed || 0,
        
        // Store transcript metadata
        transcriptInfo: {
          segmentCount: transcriptResult.segmentCount,
          extractedAt: transcriptResult.extractedAt,
          fullTextLength: transcriptResult.fullText.length
        }
      };

      // Extract enhanced metadata from OpenAI analysis
      const enhancedData = {
        skillsHighlighted: openaiResult.analysis.softSkills || [],
        careerPathways: openaiResult.analysis.careerPaths || [],
        hashtags: openaiResult.analysis.hashtags || [],
        challenges: openaiResult.analysis.challenges || [],
        keyThemes: openaiResult.analysis.keyThemes || [],
        aspirationalElements: openaiResult.analysis.aspirationalElements?.map(el => el.quote) || []
      };

      // Update video with comprehensive analysis
      await this.updateVideoWithAnalysis(videoId, {
        aiAnalysis,
        ...enhancedData,
        lastAnalyzed: currentTimestamp,
        analysisStatus: 'completed',
      });

      console.log('🎉 Transcript-first analysis pipeline completed successfully');

    } catch (error) {
      console.error('❌ Transcript-first analysis pipeline failed:', error);
      // Fallback to Bumpups if the entire pipeline fails
      await this.fallbackToBumpupsAnalysis(videoId, youtubeUrl);
    }
  }

  /**
   * Format OpenAI analysis into career exploration markdown
   */
  private formatCareerAnalysis(analysis: OpenAIAnalysisResult['analysis']): string {
    if (!analysis) return '';

    let formatted = `# Career Exploration Insights\n\n`;

    // 1. Key Career Themes
    formatted += `## 1. Key Career Themes\n`;
    (analysis.keyThemes || []).forEach(t => {
      formatted += `- ${t}\n`;
    });
    formatted += `\n`;

    // 2. Emotional and Aspirational Elements
    formatted += `## 2. Emotional and Aspirational Elements\n`;
    (analysis.aspirationalElements || []).forEach(el => {
      formatted += `- ${el.timestamp} – "${el.quote}"\n`;
    });
    formatted += `\n`;

    // 3. Relevant Soft Skills
    formatted += `## 3. Relevant Soft Skills\n`;
    (analysis.softSkills || []).forEach(s => {
      formatted += `- ${s}\n`;
    });
    formatted += `\n`;

    // 4. Work Environment & Challenges
    formatted += `## 4. Work Environment & Challenges\n`;
    (analysis.challenges || []).forEach(c => {
      formatted += `- ${c}\n`;
    });
    formatted += `\n`;

    // 5. Quotable Moments
    formatted += `## 5. Quotable Moments\n`;
    (analysis.aspirationalElements || []).forEach(el => {
      formatted += `- ${el.timestamp} – "${el.quote}"\n`;
    });
    formatted += `\n`;

    // 6. Reflective Questions (generate simple ones if none)
    formatted += `## 6. Reflective Questions\n`;
    const questions = [
      `How could you apply the skill of ${analysis.softSkills?.[0] || 'communication'} in your own career journey?`,
      `Which of the challenges mentioned resonates with you and why?`,
      `What steps can you take this week to explore the ${analysis.careerPaths?.[0] || 'highlighted'} career path?`
    ];
    questions.forEach(q => formatted += `- ${q}\n`);
    formatted += `\n`;

    // 7. OffScript Career Pathways
    formatted += `## 7. OffScript Career Pathways\n`;
    (analysis.careerPaths || []).forEach(p => {
      formatted += `- ${p}\n`;
    });
    formatted += `\n`;

    // Summary
    formatted += `## Summary\n${analysis.summary}\n`;

    return formatted;
  }

  /**
   * Fallback to Bumpups analysis when transcript pipeline fails
   */
  private async fallbackToBumpupsAnalysis(videoId: string, youtubeUrl: string): Promise<void> {
    try {
      console.log('🔄 Using Bumpups as fallback analysis method...');
      
      const analysisResult = await bumpupsService.processVideo(youtubeUrl);
      const currentTimestamp = new Date().toISOString();

      const aiAnalysis = {
        careerExplorationAnalysis: analysisResult.jobSummary || '',
        analyzedAt: currentTimestamp,
        confidence: analysisResult.confidence || 80, // Lower confidence for fallback
        analysisType: 'bumpups_fallback' as const,
      };

      const enhancedSkills = analysisResult.skillsHighlighted || [];
      const careerPathways = analysisResult.careerPathways || [];
      const hashtags = analysisResult.hashtags || [];

      await this.updateVideoWithAnalysis(videoId, {
        aiAnalysis,
        skillsHighlighted: enhancedSkills,
        careerPathways: careerPathways,
        hashtags: hashtags,
        lastAnalyzed: currentTimestamp,
        analysisStatus: 'completed',
      });

      console.log('✅ Fallback Bumpups analysis completed');
    } catch (error) {
      console.error('❌ Fallback Bumpups analysis also failed:', error);
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
   * Batch analyze multiple videos using the working Firebase function pipeline
   */
  async batchAnalyzeVideos(youtubeUrls: string[], category: string): Promise<EnhancedVideoData[]> {
    const results: EnhancedVideoData[] = [];
    
    for (const url of youtubeUrls) {
      try {
        console.log(`Processing ${results.length + 1}/${youtubeUrls.length}: ${url}`);
        // Use the working Firebase function (same as single video processing)
        const result = await this.processVideoWithFirebaseFunction(url, category);
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