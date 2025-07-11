// Unified video processing pipeline combining transcripts, OpenAI analysis, and selective bumpups
import { Video } from './videoService';
import { updateVideo } from './videoService';
import { generateAllVideoEmbeddings } from './videoEmbeddingService';
import { getFirebaseFunctionUrl } from './firebase';
import transcriptService from './transcriptService';

export interface VideoProcessingOptions {
  // Processing stages to include
  includeTranscripts: boolean;
  includeOpenAIAnalysis: boolean;
  includeBumpupsInsights: boolean;
  
  // Cost optimization
  maxCostPerVideo?: number; // Maximum cost per video in USD
  prioritizeTranscripts?: boolean; // Prioritize transcript extraction
  
  // Quality settings
  openaiModel?: 'gpt-4o-mini' | 'gpt-4o';
  enableEmbeddings?: boolean;
  
  // Bumpups optimization
  bumpupsStrategy?: 'always' | 'selective' | 'never';
  careerFocusedOnly?: boolean;
}

export interface ProcessingResult {
  success: boolean;
  videoId: string;
  processingTime: number;
  costEstimate: number;
  stages: {
    transcripts?: {
      success: boolean;
      segmentCount: number;
      processingTime: number;
    };
    openaiAnalysis?: {
      success: boolean;
      confidence: number;
      processingTime: number;
      tokensUsed?: number;
    };
    bumpupsInsights?: {
      success: boolean;
      insightCount: number;
      processingTime: number;
    };
    embeddings?: {
      success: boolean;
      processingTime: number;
    };
  };
  error?: string;
}

export interface BatchProcessingResult {
  totalVideos: number;
  successful: number;
  failed: number;
  totalCost: number;
  totalTime: number;
  results: ProcessingResult[];
  costBreakdown: {
    transcripts: number;
    openai: number;
    bumpups: number;
    embeddings: number;
  };
}

class UnifiedVideoProcessingService {
  private readonly DEFAULT_OPTIONS: VideoProcessingOptions = {
    includeTranscripts: true,
    includeOpenAIAnalysis: true,
    includeBumpupsInsights: true,
    maxCostPerVideo: 0.15, // Conservative cost limit
    prioritizeTranscripts: true,
    openaiModel: 'gpt-4o-mini',
    enableEmbeddings: true,
    bumpupsStrategy: 'selective',
    careerFocusedOnly: false
  };

  /**
   * Process a single video with the unified pipeline
   */
  async processVideo(
    video: Video,
    options: Partial<VideoProcessingOptions> = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const result: ProcessingResult = {
      success: false,
      videoId: video.id,
      processingTime: 0,
      costEstimate: 0,
      stages: {}
    };

    try {
      console.log(`🚀 Starting unified processing for video: ${video.title}`);
      
      // Stage 1: Transcript Processing (if needed and requested)
      if (opts.includeTranscripts && this.needsTranscriptProcessing(video)) {
        console.log('📄 Processing transcripts...');
        const transcriptResult = await this.processTranscripts(video);
        result.stages.transcripts = transcriptResult;
        result.costEstimate += 0.02; // Estimated transcript cost
        
        if (transcriptResult.success) {
          // Update video with transcript data
          await updateVideo(video.id, {
            transcript: {
              fullText: transcriptResult.fullText || '',
              segments: transcriptResult.segments || [],
              segmentCount: transcriptResult.segmentCount,
              extractedAt: new Date()
            }
          });
          
          // Update our local video object for subsequent processing
          video.transcript = {
            fullText: transcriptResult.fullText || '',
            segments: transcriptResult.segments || [],
            segmentCount: transcriptResult.segmentCount,
            extractedAt: new Date()
          };
        }
      }

      // Stage 2: OpenAI Analysis (if transcript available and requested)
      if (opts.includeOpenAIAnalysis && video.transcript?.fullText) {
        console.log('🧠 Performing OpenAI analysis...');
        const openaiResult = await this.performOpenAIAnalysis(video, opts);
        result.stages.openaiAnalysis = openaiResult;
        result.costEstimate += this.estimateOpenAICost(video.transcript.fullText, opts.openaiModel!);
        
        if (openaiResult.success && openaiResult.analysis) {
          // Update video with OpenAI analysis
          await updateVideo(video.id, {
            aiAnalysis: {
              ...video.aiAnalysis,
              openaiAnalysis: openaiResult.analysis
            },
            // Update hashtags and career pathways from OpenAI analysis
            hashtags: openaiResult.analysis.engagement.hashtags,
            careerPathways: openaiResult.analysis.careerInsights.relatedCareerPaths,
            skillsHighlighted: [
              ...(video.skillsHighlighted || []),
              ...openaiResult.analysis.careerInsights.skillsHighlighted
            ].filter((skill, index, arr) => arr.indexOf(skill) === index) // Remove duplicates
          });
          
          // Update local video object
          video.aiAnalysis = {
            ...video.aiAnalysis,
            openaiAnalysis: openaiResult.analysis
          };
          video.hashtags = openaiResult.analysis.engagement.hashtags;
          video.careerPathways = openaiResult.analysis.careerInsights.relatedCareerPaths;
        }
      }

      // Stage 3: Selective Bumpups Analysis (timestamp-specific insights)
      if (opts.includeBumpupsInsights && this.shouldUseBumpups(video, opts)) {
        console.log('🎯 Extracting bumpups timestamp insights...');
        const bumpupsResult = await this.performBumpupsAnalysis(video);
        result.stages.bumpupsInsights = bumpupsResult;
        result.costEstimate += 0.05; // Estimated bumpups cost
        
        if (bumpupsResult.success && bumpupsResult.insights) {
                     // Update video with bumpups timestamp insights
           // Note: This would require extending the aiAnalysis interface to include bumpups insights
           // For now, we'll store it in a separate field or extend the existing structure
           console.log('✅ Bumpups insights extracted successfully');
        }
      }

      // Stage 4: Generate Embeddings (if content available and requested)
      if (opts.enableEmbeddings && (video.transcript?.fullText || video.aiAnalysis?.openaiAnalysis)) {
        console.log('🔍 Generating embeddings...');
        const embeddingResult = await this.generateEmbeddings(video);
        result.stages.embeddings = embeddingResult;
        result.costEstimate += 0.001; // Minimal embedding cost
      }

      // Final update
      const processingTime = Date.now() - startTime;
      result.processingTime = processingTime;
      result.success = true;
      
      console.log(`✅ Video processing completed in ${processingTime}ms`);
      console.log(`💰 Estimated cost: $${result.costEstimate.toFixed(4)}`);
      
      return result;

    } catch (error) {
      console.error('❌ Video processing failed:', error);
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.processingTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Process multiple videos with intelligent batching and cost management
   */
  async processBatch(
    videos: Video[],
    options: Partial<VideoProcessingOptions> = {},
    onProgress?: (completed: number, total: number, current?: ProcessingResult) => void
  ): Promise<BatchProcessingResult> {
    const startTime = Date.now();
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    const batchResult: BatchProcessingResult = {
      totalVideos: videos.length,
      successful: 0,
      failed: 0,
      totalCost: 0,
      totalTime: 0,
      results: [],
      costBreakdown: {
        transcripts: 0,
        openai: 0,
        bumpups: 0,
        embeddings: 0
      }
    };

    console.log(`🎬 Starting batch processing of ${videos.length} videos`);
    
    // Generate cost-benefit report
    const avgDuration = videos.reduce((sum, v) => sum + (v.duration || 0), 0) / videos.length;
    const costReport = optimizedBumpupsService.generateCostBenefitReport(videos.length, avgDuration);
    console.log(`📊 Cost-benefit analysis:`, costReport);

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      
      try {
        console.log(`\n📹 Processing video ${i + 1}/${videos.length}: ${video.title}`);
        
        const result = await this.processVideo(video, opts);
        batchResult.results.push(result);
        
        if (result.success) {
          batchResult.successful++;
        } else {
          batchResult.failed++;
        }
        
        batchResult.totalCost += result.costEstimate;
        
        // Update cost breakdown
        if (result.stages.transcripts?.success) {
          batchResult.costBreakdown.transcripts += 0.02;
        }
        if (result.stages.openaiAnalysis?.success) {
          batchResult.costBreakdown.openai += this.estimateOpenAICost(
            video.transcript?.fullText || '', 
            opts.openaiModel!
          );
        }
        if (result.stages.bumpupsInsights?.success) {
          batchResult.costBreakdown.bumpups += 0.05;
        }
        if (result.stages.embeddings?.success) {
          batchResult.costBreakdown.embeddings += 0.001;
        }
        
        onProgress?.(i + 1, videos.length, result);
        
        // Add delay between videos to avoid rate limiting
        if (i < videos.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`❌ Failed to process video ${i + 1}:`, error);
        batchResult.failed++;
        batchResult.results.push({
          success: false,
          videoId: video.id,
          processingTime: 0,
          costEstimate: 0,
          stages: {},
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    batchResult.totalTime = Date.now() - startTime;
    
    console.log(`\n🏁 Batch processing completed:`);
    console.log(`✅ Successful: ${batchResult.successful}/${batchResult.totalVideos}`);
    console.log(`❌ Failed: ${batchResult.failed}/${batchResult.totalVideos}`);
    console.log(`💰 Total cost: $${batchResult.totalCost.toFixed(2)}`);
    console.log(`⏱️ Total time: ${Math.round(batchResult.totalTime / 1000)}s`);
    
    return batchResult;
  }

  /**
   * Check if video needs transcript processing
   */
  private needsTranscriptProcessing(video: Video): boolean {
    return !video.transcript || !video.transcript.fullText;
  }

  /**
   * Process transcripts for a video
   */
  private async processTranscripts(video: Video): Promise<{
    success: boolean;
    segmentCount: number;
    processingTime: number;
    fullText?: string;
    segments?: Array<{ text: string; start: number; duration: number }>;
  }> {
    const startTime = Date.now();
    
    try {
      // Import the transcript extraction service dynamically
      const { extractTranscript } = await import('./transcriptService');
      
      // Extract transcript using webshare proxies
      const transcriptResult = await extractTranscript(video.sourceUrl);
      
      if (!transcriptResult || !transcriptResult.fullText) {
        throw new Error('Failed to extract transcript');
      }
      
      return {
        success: true,
        segmentCount: transcriptResult.segments?.length || 0,
        processingTime: Date.now() - startTime,
        fullText: transcriptResult.fullText,
        segments: transcriptResult.segments
      };
    } catch (error) {
      console.error('Transcript extraction failed:', error);
      return {
        success: false,
        segmentCount: 0,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Perform OpenAI analysis
   */
  private async performOpenAIAnalysis(video: Video, options: VideoProcessingOptions): Promise<{
    success: boolean;
    confidence: number;
    processingTime: number;
    tokensUsed?: number;
    analysis?: OpenAIVideoAnalysis;
  }> {
    const startTime = Date.now();
    
    try {
      if (!video.transcript?.fullText) {
        throw new Error('No transcript available for OpenAI analysis');
      }
      
      const analysis = await openaiVideoAnalysisService.generateOpenAIVideoAnalysis(
        video.transcript.fullText,
        {
          title: video.title,
          description: video.description,
          duration: video.duration,
          channelName: video.creator || undefined
        }
      );
      
      return {
        success: true,
        confidence: analysis.analysisMetadata?.confidence || 0,
        processingTime: Date.now() - startTime,
        tokensUsed: analysis.analysisMetadata?.transcriptLength, // Rough estimate
        analysis
      };
    } catch (error) {
      console.error('OpenAI analysis failed:', error);
      return {
        success: false,
        confidence: 0,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Perform selective bumpups analysis
   */
  private async performBumpupsAnalysis(video: Video): Promise<{
    success: boolean;
    insightCount: number;
    processingTime: number;
    insights?: OptimizedBumpupsResponse;
  }> {
    const startTime = Date.now();
    
    try {
      const insights = await optimizedBumpupsService.extractTimestampInsights(video.sourceUrl);
      
      return {
        success: true,
        insightCount: insights.timestampInsights.length,
        processingTime: Date.now() - startTime,
        insights
      };
    } catch (error) {
      console.error('Bumpups analysis failed:', error);
      return {
        success: false,
        insightCount: 0,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Generate embeddings
   */
  private async generateEmbeddings(video: Video): Promise<{
    success: boolean;
    processingTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      const { createVideoEmbedding } = await import('./videoEmbeddingService');
      await createVideoEmbedding(video);
      
      return {
        success: true,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Embedding generation failed:', error);
      return {
        success: false,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Determine if bumpups should be used for this video
   */
  private shouldUseBumpups(video: Video, options: VideoProcessingOptions): boolean {
    if (options.bumpupsStrategy === 'never') return false;
    if (options.bumpupsStrategy === 'always') return true;
    
    // Selective strategy
    return optimizedBumpupsService.shouldUseBumpupsForVideo(
      Boolean(video.transcript?.fullText),
      video.duration,
      video.category
    );
  }

  /**
   * Estimate OpenAI API cost
   */
  private estimateOpenAICost(text: string, model: string): number {
    const tokenCount = Math.ceil(text.length / 4); // Rough estimate
    const costPerToken = model === 'gpt-4o' ? 0.000015 : 0.000003; // GPT-4o vs GPT-4o-mini
    return tokenCount * costPerToken;
  }

  /**
   * Generate processing recommendations for a video collection
   */
  generateProcessingRecommendations(videos: Video[]): {
    recommendedStrategy: VideoProcessingOptions;
    estimatedCosts: {
      basic: number;
      standard: number;
      premium: number;
    };
    reasoning: string[];
  } {
    const videoCount = videos.length;
    const avgDuration = videos.reduce((sum, v) => sum + (v.duration || 0), 0) / videos.length;
    const transcriptCoverage = videos.filter(v => v.transcript?.fullText).length / videoCount;
    
    const reasoning: string[] = [];
    const estimatedCosts = {
      basic: videoCount * 0.03,    // Transcripts + embeddings only
      standard: videoCount * 0.08, // + OpenAI analysis
      premium: videoCount * 0.15   // + selective bumpups
    };
    
    let recommendedStrategy: VideoProcessingOptions;
    
    if (videoCount < 50 && avgDuration < 15 * 60) {
      // Small collection, short videos
      recommendedStrategy = {
        ...this.DEFAULT_OPTIONS,
        bumpupsStrategy: 'always',
        openaiModel: 'gpt-4o-mini'
      };
      reasoning.push('Small collection with short videos - use full pipeline for maximum insights');
    } else if (videoCount > 200 || avgDuration > 20 * 60) {
      // Large collection or long videos
      recommendedStrategy = {
        ...this.DEFAULT_OPTIONS,
        bumpupsStrategy: 'selective',
        careerFocusedOnly: true,
        openaiModel: 'gpt-4o-mini'
      };
      reasoning.push('Large collection or long videos - use selective processing for cost efficiency');
    } else {
      // Medium collection
      recommendedStrategy = {
        ...this.DEFAULT_OPTIONS,
        bumpupsStrategy: 'selective',
        openaiModel: 'gpt-4o-mini'
      };
      reasoning.push('Medium collection - balanced approach with selective bumpups usage');
    }
    
    if (transcriptCoverage < 0.5) {
      reasoning.push('Low transcript coverage - prioritize transcript extraction first');
      recommendedStrategy.prioritizeTranscripts = true;
    }
    
    return {
      recommendedStrategy,
      estimatedCosts,
      reasoning
    };
  }
}

export default new UnifiedVideoProcessingService(); 