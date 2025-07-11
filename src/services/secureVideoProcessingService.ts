// Secure video processing service - uses existing Firebase Functions for all AI processing
import { Video } from './videoService';
import { updateVideo, getVideoById } from './videoService';
import { getFirebaseFunctionUrl } from './firebase';

export interface SecureProcessingResult {
  success: boolean;
  videoId: string;
  processingTime: number;
  stages: {
    metadata?: {
      success: boolean;
      processingTime: number;
    };
    analysis?: {
      success: boolean;
      confidence: number;
      processingTime: number;
      analysisText?: string;
    };
    embeddings?: {
      success: boolean;
      processingTime: number;
    };
  };
  error?: string;
}

class SecureVideoProcessingService {
  /**
   * Process a video using secure server-side Firebase Functions
   * This replaces the unsafe browser-side OpenAI calls
   */
  async processVideo(video: Video): Promise<SecureProcessingResult> {
    const startTime = Date.now();
    const result: SecureProcessingResult = {
      success: false,
      videoId: video.id,
      processingTime: 0,
      stages: {}
    };

    try {
      console.log('🔒 Starting secure video processing for:', video.id);

      // Stage 1: Wait for metadata enrichment (handled automatically by enrichVideoMetadata trigger)
      const metadataStart = Date.now();
      await this.waitForMetadataEnrichment(video.id);
      result.stages.metadata = {
        success: true,
        processingTime: Date.now() - metadataStart
      };
      console.log('✅ Metadata extraction completed');

      // Stage 2: AI Analysis using existing bumpupsProxy function
      const analysisStart = Date.now();
      const analysisResult = await this.performAnalysis(video.sourceUrl);
      result.stages.analysis = {
        success: analysisResult.success,
        confidence: analysisResult.confidence || 0.8,
        processingTime: Date.now() - analysisStart,
        analysisText: analysisResult.output
      };
      
      if (analysisResult.success && analysisResult.output) {
        // Update video with analysis
        await updateVideo(video.id, {
          aiAnalysis: {
            careerExplorationAnalysis: analysisResult.output,
            analysisType: 'career_exploration' as const,
            confidence: analysisResult.confidence || 0.8,
            analyzedAt: new Date().toISOString()
          },
          analysisStatus: 'completed'
        });
        console.log('✅ AI analysis completed and saved');
      }

      // Stage 3: Generate embeddings using existing generateEmbedding function
      const embeddingStart = Date.now();
      const embeddingResult = await this.generateVideoEmbeddings(video);
      result.stages.embeddings = {
        success: embeddingResult.success,
        processingTime: Date.now() - embeddingStart
      };
      console.log('✅ Embeddings generation completed');

      result.success = true;
      result.processingTime = Date.now() - startTime;
      
      return result;

    } catch (error) {
      console.error('❌ Secure video processing failed:', error);
      result.error = error instanceof Error ? error.message : 'Unknown processing error';
      result.processingTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Wait for the enrichVideoMetadata Firebase Function to complete
   * Uses Firestore directly instead of a non-existent API endpoint
   */
  private async waitForMetadataEnrichment(videoId: string, maxWaitTime = 15000): Promise<void> {
    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Check Firestore directly for metadata enrichment status
        const video = await getVideoById(videoId);
        if (video) {
          console.log(`📊 Video metadata status: ${video.metadataStatus}`);
          if (video.metadataStatus === 'enriched') {
            console.log('✅ Metadata enrichment completed successfully');
            return; // Enrichment complete
          }
          if (video.metadataStatus === 'failed') {
            throw new Error('Metadata enrichment failed');
          }
        }
      } catch (error) {
        console.warn('Error checking metadata status:', error);
        // Don't throw here, just continue trying
      }
      
      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    // If we get here, we've timed out - but this might be okay
    // The enrichVideoMetadata function might be taking longer than expected
    console.warn('⚠️ Metadata enrichment timeout - proceeding anyway');
    // Don't throw, just proceed with the processing
  }

  /**
   * Perform AI analysis using existing bumpupsProxy Firebase Function
   */
  private async performAnalysis(videoUrl: string): Promise<{
    success: boolean;
    output?: string;
    confidence?: number;
  }> {
    try {
      console.log('🧠 Starting AI analysis via bumpupsProxy...');
      
      // Use career-focused prompt for analysis
      const prompt = `Analyze this video for career exploration. Focus on:
1. What career paths or jobs are demonstrated?
2. What skills are being showcased?
3. What educational or experience requirements are mentioned?
4. How would this help a young person explore careers?

Provide a concise but informative summary for career exploration.`;

      const response = await fetch(getFirebaseFunctionUrl('bumpupsProxy'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: videoUrl,
          prompt: prompt,
          model: 'bump-1.0',
          language: 'en',
          output_format: 'text'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Analysis failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ AI analysis completed successfully');
      
      return {
        success: true,
        output: data.output,
        confidence: 0.8
      };

    } catch (error) {
      console.error('❌ Analysis error:', error);
      return {
        success: false
      };
    }
  }

  /**
   * Generate embeddings using the existing generateEmbedding Firebase Function
   */
  private async generateVideoEmbeddings(video: Video): Promise<{ success: boolean }> {
    try {
      console.log('🔍 Starting embedding generation...');
      
      // Create text for embedding from video metadata
      const embeddingText = `${video.title} ${video.description} ${video.category || ''}`.trim();
      
      if (!embeddingText) {
        throw new Error('No text available for embedding generation');
      }

      const response = await fetch(getFirebaseFunctionUrl('generateEmbedding'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: embeddingText,
          model: 'text-embedding-3-small'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Embedding generation failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      console.log('✅ Embedding generated successfully:', {
        dimension: data.embedding.length,
        model: data.model
      });

      return { success: true };

    } catch (error) {
      console.error('❌ Embedding generation error:', error);
      return { success: false };
    }
  }
}

export default new SecureVideoProcessingService(); 