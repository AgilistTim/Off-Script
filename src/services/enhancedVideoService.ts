// Enhanced video service that combines YouTube API, Bumpups AI analysis, and Firebase storage

import { doc, setDoc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import YouTubeService, { type EnhancedVideoMetadata } from './youtubeService';
import BumpupsService, { type BumpupsAnalysisResult, type BumpupsTimestamp } from './bumpupsService';

interface EnhancedVideoData {
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
  
  // AI analysis from Bumpups
  aiAnalysis?: {
    summary: {
      short: string;
      detailed: string;
      keyPoints: string[];
    };
    timestamps: Array<{
      time: number;
      title: string;
      description?: string;
    }>;
    careerInfo: {
      skills: string[];
      salary: string;
      education: string[];
      responsibilities: string[];
      advice: string[];
    };
    processingTime: number;
    confidence: number;
    analyzedAt: string;
  };
  
  // Career-specific data
  skillsHighlighted: string[];
  educationRequired: string[];
  careerStage: 'entry-level' | 'mid-level' | 'senior' | 'any';
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
  private youtubeService: YouTubeService;
  private bumpupsService: BumpupsService;

  constructor() {
    this.youtubeService = new YouTubeService();
    this.bumpupsService = new BumpupsService();
  }

  /**
   * Analyze a YouTube video and store comprehensive metadata
   */
  async analyzeAndStoreVideo(youtubeUrl: string, category: string): Promise<EnhancedVideoData> {
    console.log('🎯 Starting comprehensive video analysis for:', youtubeUrl);

    // Step 1: Extract video ID
    const videoId = this.youtubeService.extractVideoId(youtubeUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    // Step 2: Get YouTube metadata
    console.log('📊 Fetching YouTube metadata...');
    const youtubeData = await this.youtubeService.getVideoMetadata(youtubeUrl);
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
    this.performAIAnalysis(videoId, youtubeUrl, category).catch(error => {
      console.error('AI analysis failed:', error);
      this.updateAnalysisStatus(videoId, 'failed');
    });

    return initialVideoData;
  }

  /**
   * Perform AI analysis using Bumpups API
   */
  private async performAIAnalysis(videoId: string, youtubeUrl: string, category: string): Promise<void> {
    try {
      console.log('🧠 Starting AI analysis with Bumpups...');
      
      // Update status to analyzing
      await this.updateAnalysisStatus(videoId, 'analyzing');

      // Submit for analysis
      const analysisResult = await this.bumpupsService.analyzeVideoComplete(youtubeUrl);
      
      // Extract career information
      const careerInfo = await this.bumpupsService.extractCareerInfo(videoId);

      // Prepare AI analysis data
      const aiAnalysis = {
        summary: analysisResult.summary,
        timestamps: analysisResult.timestamps,
        careerInfo: careerInfo,
        processingTime: analysisResult.processingTime,
        confidence: analysisResult.confidence,
        analyzedAt: new Date().toISOString(),
      };

      // Extract enhanced metadata from AI analysis
      const enhancedSkills = this.extractSkillsFromAnalysis(aiAnalysis);
      const enhancedEducation = this.extractEducationFromAnalysis(aiAnalysis);
      const careerStage = this.determineCareerStage(aiAnalysis);
      const salaryRange = this.extractSalaryRange(aiAnalysis.careerInfo.salary);

      // Update video with AI analysis
      await this.updateVideoWithAnalysis(videoId, {
        aiAnalysis,
        skillsHighlighted: enhancedSkills,
        educationRequired: enhancedEducation,
        careerStage,
        salaryRange,
        lastAnalyzed: new Date().toISOString(),
        analysisStatus: 'completed',
      });

      console.log('✅ AI analysis completed successfully');
    } catch (error) {
      console.error('❌ AI analysis failed:', error);
      await this.updateAnalysisStatus(videoId, 'failed');
      throw error;
    }
  }

  /**
   * Store video data in Firebase
   */
  private async storeVideoData(videoData: EnhancedVideoData): Promise<void> {
    const videoRef = doc(db, 'videos', videoData.id);
    await setDoc(videoRef, videoData);
    console.log('💾 Video data stored in Firebase');
  }

  /**
   * Update video with AI analysis results
   */
  private async updateVideoWithAnalysis(videoId: string, updates: Partial<EnhancedVideoData>): Promise<void> {
    const videoRef = doc(db, 'videos', videoId);
    await updateDoc(videoRef, updates);
    console.log('🔄 Video updated with AI analysis');
  }

  /**
   * Update analysis status
   */
  private async updateAnalysisStatus(videoId: string, status: EnhancedVideoData['analysisStatus']): Promise<void> {
    const videoRef = doc(db, 'videos', videoId);
    await updateDoc(videoRef, { analysisStatus: status });
  }

  /**
   * Get video data from Firebase
   */
  async getVideoData(videoId: string): Promise<EnhancedVideoData | null> {
    const videoRef = doc(db, 'videos', videoId);
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
      collection(db, 'videos'),
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
      collection(db, 'videos'),
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
      collection(db, 'videos'),
      where('analysisStatus', 'in', ['pending', 'analyzing'])
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as EnhancedVideoData);
  }

  /**
   * Extract skills from AI analysis
   */
  private extractSkillsFromAnalysis(analysis: any): string[] {
    const skills = new Set<string>();
    
    // From career info
    analysis.careerInfo?.skills?.forEach((skill: string) => skills.add(skill));
    
    // From summary key points
    analysis.summary?.keyPoints?.forEach((point: string) => {
      // Simple keyword extraction for common skills
      const skillKeywords = ['programming', 'coding', 'javascript', 'python', 'react', 'html', 'css', 
                           'communication', 'leadership', 'management', 'design', 'analysis'];
      
      skillKeywords.forEach(keyword => {
        if (point.toLowerCase().includes(keyword)) {
          skills.add(keyword.charAt(0).toUpperCase() + keyword.slice(1));
        }
      });
    });

    return Array.from(skills).slice(0, 10); // Limit to 10 skills
  }

  /**
   * Extract education requirements from AI analysis
   */
  private extractEducationFromAnalysis(analysis: any): string[] {
    return analysis.careerInfo?.education?.slice(0, 5) || [];
  }

  /**
   * Determine career stage from analysis
   */
  private determineCareerStage(analysis: any): EnhancedVideoData['careerStage'] {
    const summary = analysis.summary?.detailed?.toLowerCase() || '';
    const keyPoints = analysis.summary?.keyPoints?.join(' ').toLowerCase() || '';
    const text = summary + ' ' + keyPoints;

    if (text.includes('entry') || text.includes('beginner') || text.includes('junior') || text.includes('starting')) {
      return 'entry-level';
    }
    if (text.includes('senior') || text.includes('lead') || text.includes('manager') || text.includes('director')) {
      return 'senior';
    }
    if (text.includes('mid') || text.includes('experienced') || text.includes('intermediate')) {
      return 'mid-level';
    }
    
    return 'any';
  }

  /**
   * Extract salary range from salary string
   */
  private extractSalaryRange(salaryText: string): EnhancedVideoData['salaryRange'] | undefined {
    if (!salaryText || salaryText.includes('not') || salaryText === 'Not specified') {
      return undefined;
    }

    // Try to extract numbers from salary text
    const numbers = salaryText.match(/[\d,]+/g);
    if (numbers && numbers.length >= 2) {
      const min = parseInt(numbers[0].replace(/,/g, ''));
      const max = parseInt(numbers[1].replace(/,/g, ''));
      
      if (min && max && min < max) {
        return {
          min,
          max,
          currency: salaryText.includes('£') ? 'GBP' : 'USD'
        };
      }
    }

    return undefined;
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

export default EnhancedVideoService;
export type { EnhancedVideoData }; 