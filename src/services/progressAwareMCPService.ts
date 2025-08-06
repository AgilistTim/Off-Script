import { mcpQueueService } from './mcpQueueService';
import { dashboardCareerEnhancer } from './dashboardCareerEnhancer';

export interface MCPProgressUpdate {
  stage: 'initializing' | 'analyzing' | 'generating_cards' | 'enhancing_cards' | 'completed' | 'error';
  message: string;
  progress: number; // 0-100
  timestamp: number;
  details?: any;
}

export interface MCPProgressCallback {
  (update: MCPProgressUpdate): void;
}

export interface ProgressAwareMCPResult {
  success: boolean;
  analysis?: any;
  basicCareerCards?: any[];
  enhancedCareerCards?: any[];
  error?: string;
}

class ProgressAwareMCPService {
  
  /**
   * Analyze conversation with real-time progress updates
   */
  async analyzeConversationWithProgress(
    conversationHistory: any[],
    triggerReason: string = 'agent_request',
    userId?: string,
    onProgress?: MCPProgressCallback,
    enablePerplexityEnhancement: boolean = false
  ): Promise<ProgressAwareMCPResult> {
    
    const updateProgress = (stage: MCPProgressUpdate['stage'], message: string, progress: number, details?: any) => {
      const update: MCPProgressUpdate = {
        stage,
        message,
        progress,
        timestamp: Date.now(),
        details
      };
      
      console.log(`📊 Progress Update [${progress}%]: ${message}`, details || '');
      onProgress?.(update);
    };

    try {
      // Stage 1: Initialize
      updateProgress('initializing', 'Starting conversation analysis...', 5);
      
      // Stage 2: Analyze with OpenAI
      updateProgress('analyzing', 'Analyzing conversation for interests and skills...', 15);
      
      const basicResult = await mcpQueueService.analyzeConversation(
        conversationHistory,
        triggerReason
      );

      if (!basicResult.success) {
        updateProgress('error', `Analysis failed: ${basicResult.error}`, 0, { error: basicResult.error });
        return {
          success: false,
          error: basicResult.error
        };
      }

      // Stage 3: Generate basic career cards
      updateProgress('generating_cards', 'Generating personalized career recommendations...', 45);
      
      const basicCards = basicResult.analysis?.careerCards || [];
      
      updateProgress('generating_cards', `Generated ${basicCards.length} career recommendations`, 60, {
        cardCount: basicCards.length,
        interests: basicResult.analysis?.analysis?.detectedInterests || []
      });

      // If no enhancement requested or user is guest, return basic cards
      if (!enablePerplexityEnhancement || !userId) {
        updateProgress('completed', 'Career analysis completed successfully', 100, {
          cardCount: basicCards.length,
          type: 'basic'
        });
        
        return {
          success: true,
          analysis: basicResult.analysis,
          basicCareerCards: basicCards
        };
      }

      // Stage 4: Enhance with structured API (for authenticated users)
      if (dashboardCareerEnhancer.isEnhancementAvailable() && basicCards.length > 0) {
        updateProgress('enhancing_cards', 'Enhancing career recommendations with real-time market data...', 70);
        
        try {
          const enhancedCards = await dashboardCareerEnhancer.batchEnhanceUserCareerCards(
            userId,
            basicCards,
            (status) => {
              // Update progress based on enhancement status
              const progressPercent = 70 + (status.progress.completed / status.progress.total) * 20;
              updateProgress('enhancing_cards', `Enhancing career card: ${status.currentCard}`, progressPercent, {
                enhancementProgress: `${status.progress.completed}/${status.progress.total}`,
                currentCard: status.currentCard,
                status: status.status
              });
            }
          );

          updateProgress('enhancing_cards', `Enhanced ${enhancedCards.length} career cards with market data`, 90, {
            enhancedCount: enhancedCards.length,
            marketDataIncluded: true
          });

          updateProgress('completed', 'Advanced career analysis completed with market intelligence', 100, {
            cardCount: enhancedCards.length,
            type: 'enhanced',
            features: ['market_data', 'education_paths', 'growth_projections', 'opportunities']
          });

          return {
            success: true,
            analysis: basicResult.analysis,
            basicCareerCards: basicCards,
            enhancedCareerCards: enhancedCards
          };

        } catch (enhancementError) {
          // If enhancement fails, still return basic cards
          console.warn('⚠️ Perplexity enhancement failed, returning basic cards:', enhancementError);
          
          updateProgress('completed', 'Career analysis completed (enhancement unavailable)', 100, {
            cardCount: basicCards.length,
            type: 'basic',
            enhancementError: enhancementError instanceof Error ? enhancementError.message : 'Unknown error'
          });

          return {
            success: true,
            analysis: basicResult.analysis,
            basicCareerCards: basicCards,
            error: `Enhancement failed: ${enhancementError instanceof Error ? enhancementError.message : 'Unknown error'}`
          };
        }
      } else {
        // Perplexity not available
        updateProgress('completed', 'Career analysis completed (premium enhancement not available)', 100, {
          cardCount: basicCards.length,
          type: 'basic',
          enhancementReason: !dashboardCareerEnhancer.isEnhancementAvailable() 
            ? 'Enhancement API not configured'
            : 'No cards to enhance'
        });

        return {
          success: true,
          analysis: basicResult.analysis,
          basicCareerCards: basicCards
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      updateProgress('error', `Analysis failed: ${errorMessage}`, 0, { error: errorMessage });
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Quick analysis without Perplexity enhancement
   */
  async quickAnalyzeConversation(
    conversationHistory: any[],
    triggerReason: string = 'agent_request',
    onProgress?: MCPProgressCallback
  ): Promise<ProgressAwareMCPResult> {
    return this.analyzeConversationWithProgress(
      conversationHistory,
      triggerReason,
      undefined, // No userId = no enhancement
      onProgress,
      false
    );
  }

  /**
   * Full analysis with enhancement for authenticated users
   */
  async enhancedAnalyzeConversation(
    conversationHistory: any[],
    userId: string,
    triggerReason: string = 'agent_request',
    onProgress?: MCPProgressCallback
  ): Promise<ProgressAwareMCPResult> {
    return this.analyzeConversationWithProgress(
      conversationHistory,
      triggerReason,
      userId,
      onProgress,
      true
    );
  }

  /**
   * Get estimated processing time based on configuration
   */
  getEstimatedProcessingTime(enablePerplexityEnhancement: boolean = false): {
    min: number; // seconds
    max: number; // seconds
    stages: { stage: string; duration: number }[];
  } {
    if (enablePerplexityEnhancement) {
      return {
        min: 45,
        max: 120,
        stages: [
          { stage: 'Analysis', duration: 15 },
          { stage: 'Basic Cards', duration: 30 },
          { stage: 'Market Enhancement', duration: 60 }
        ]
      };
    } else {
      return {
        min: 30,
        max: 90,
        stages: [
          { stage: 'Analysis', duration: 15 },
          { stage: 'Career Cards', duration: 45 }
        ]
      };
    }
  }
}

// Export singleton instance
export const progressAwareMCPService = new ProgressAwareMCPService();
export default progressAwareMCPService;