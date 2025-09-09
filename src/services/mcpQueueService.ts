import PQueue from 'p-queue';

interface MCPRequest {
  id: string;
  type: 'analyze_conversation_for_careers' | 'update_person_profile' | 'other';
  parameters: any;
  timestamp: number;
}

interface QueueStatus {
  pending: number;
  running: number;
  completed: number;
  failed: number;
}

class MCPQueueService {
  private queue: PQueue;
  private activeRequests = new Map<string, Promise<any>>();
  private requestHistory = new Map<string, { 
    status: 'pending' | 'running' | 'completed' | 'failed';
    result?: any;
    error?: any;
    timestamp: number;
  }>();
  
  constructor() {
    this.queue = new PQueue({
      concurrency: 2,      // Allow 2 concurrent MCP calls
      interval: 1000,      // Rate limiting window (1 second)
      intervalCap: 5,      // Max 5 requests per second
      timeout: 120000,     // 120-second timeout per request (increased for OpenAI analysis)
      throwOnTimeout: true
    });

    // Log queue events for debugging
    this.queue.on('active', () => {
      console.log(`🔄 MCP Queue: ${this.queue.pending} pending, ${this.queue.size} running`);
    });

    this.queue.on('idle', () => {
      console.log('✅ MCP Queue: All requests completed');
    });
  }

  /**
   * Queue a conversation analysis request
   */
  async queueAnalysisRequest(
    conversationHistory: any[],
    triggerReason: string,
    mcpEndpoint: string,
    userId?: string,
    assistantFirstMessage?: string,
    sessionId?: string
  ): Promise<any> {
    const requestId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`📝 Queuing analysis request: ${requestId}`, {
      conversationLength: conversationHistory.length,
      triggerReason,
      userId: userId || 'guest'
    });

    // Track request in history
    this.requestHistory.set(requestId, {
      status: 'pending',
      timestamp: Date.now()
    });

    const requestPromise = this.queue.add(async () => {
      console.log(`🚀 Processing analysis request: ${requestId}`);
      
      // Update status to running
      this.requestHistory.set(requestId, {
        status: 'running',
        timestamp: Date.now()
      });

      try {
        const result = await this.performConversationAnalysis(
          conversationHistory,
          triggerReason,
          mcpEndpoint,
          userId,
          assistantFirstMessage,
          sessionId
        );

        // Update status to completed
        this.requestHistory.set(requestId, {
          status: 'completed',
          result,
          timestamp: Date.now()
        });

        return result;
      } catch (error) {
        console.error(`❌ Analysis request failed: ${requestId}`, error);
        
        // Update status to failed
        this.requestHistory.set(requestId, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        });

        throw error;
      }
    }, {
      priority: this.getPriority(triggerReason)
    });

    this.activeRequests.set(requestId, requestPromise);
    
    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Queue a profile update request
   */
  async queueProfileUpdateRequest(
    parameters: { interests?: string[]; goals?: string[]; skills?: string[] },
    userId?: string
  ): Promise<any> {
    const requestId = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`👤 Queuing profile update request: ${requestId}`, {
      parameters,
      userId: userId || 'guest'
    });

    const requestPromise = this.queue.add(async () => {
      console.log(`🚀 Processing profile update request: ${requestId}`);
      
      try {
        // This would integrate with the existing profile update logic
        const result = await this.performProfileUpdate(parameters, userId);
        return result;
      } catch (error) {
        console.error(`❌ Profile update request failed: ${requestId}`, error);
        throw error;
      }
    }, {
      priority: 5 // Medium priority for profile updates
    });

    this.activeRequests.set(requestId, requestPromise);
    
    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Get queue status
   */
  getStatus(): QueueStatus {
    const historyEntries = Array.from(this.requestHistory.values());
    
    return {
      pending: this.queue.pending,
      running: this.queue.size,
      completed: historyEntries.filter(entry => entry.status === 'completed').length,
      failed: historyEntries.filter(entry => entry.status === 'failed').length
    };
  }

  /**
   * Simplified interface for conversation analysis
   */
  async analyzeConversation(conversationHistory: any[], triggerReason: string = 'agent_request'): Promise<{ success: boolean; analysis?: any; error?: string }> {
    try {
      const result = await this.queueAnalysisRequest(
        conversationHistory,
        triggerReason,
        'https://off-script-mcp-elevenlabs.onrender.com/mcp' // Use live MCP server
      );
      
      return {
        success: true,
        analysis: result
      };
    } catch (error) {
      console.error('❌ MCP analysis failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Clear request history (for memory management)
   */
  clearHistory(olderThanMs: number = 5 * 60 * 1000): void {
    const cutoffTime = Date.now() - olderThanMs;
    
    for (const [requestId, entry] of this.requestHistory.entries()) {
      if (entry.timestamp < cutoffTime) {
        this.requestHistory.delete(requestId);
      }
    }
  }

  /**
   * Get request priority based on trigger reason
   */
  private getPriority(triggerReason: string): number {
    switch (triggerReason) {
      case 'user_request':
        return 10; // Highest priority
      case 'career_exploration':
        return 8;
      case 'conversation_milestone':
        return 6;
      case 'agent_request':
        return 4;
      case 'background_analysis':
        return 2; // Lowest priority
      default:
        return 5; // Default priority
    }
  }

  /**
   * Perform the actual conversation analysis via MCP
   */
  private async performConversationAnalysis(
    conversationHistory: any[],
    triggerReason: string,
    mcpEndpoint: string,
    userId?: string,
    assistantFirstMessage?: string,
    sessionId?: string
  ): Promise<any> {
    try {
      // Filter out empty messages
      const validMessages = conversationHistory.filter(msg => 
        msg && msg.content && msg.content.trim().length > 0
      );

      if (validMessages.length === 0) {
        return 'No conversation content available for analysis.';
      }

      // Prepare conversation context
      const conversationText = validMessages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      const requestBody = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: 'analyze_conversation_for_careers',
          arguments: {
            conversation_history: conversationText,
            trigger_reason: triggerReason,
            user_context: {
              user_id: userId || 'guest',
              user_type: userId ? 'registered' : 'guest',
              timestamp: new Date().toISOString(),
              // Pass assistant first message so MCP/OpenAI can honour our desired persona
              assistant_first_message: assistantFirstMessage || undefined,
              // Include sessionId for traceability and to allow server to attach it to OpenAI context
              sessionId: sessionId || undefined
            }
          }
        }
      };

      console.log('📤 Sending MCP request:', {
        endpoint: mcpEndpoint,
        conversationLength: conversationText.length,
        triggerReason
      });

      const response = await fetch(mcpEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`MCP request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(`MCP error: ${result.error.message || 'Unknown error'}`);
      }

      console.log('✅ MCP analysis completed successfully');
      
      // Handle JSON-RPC response format
      if (result.result && result.result.content && result.result.content.length > 0) {
        const content = result.result.content[0];
        if (content.type === 'text') {
          try {
            // Try to parse the text content as JSON
            const parsedContent = JSON.parse(content.text);
            return parsedContent;
          } catch (e) {
            // If not JSON, return as plain text
            return { message: content.text };
          }
        }
      }
      
      return result.result || result || 'Analysis completed successfully';

    } catch (error) {
      console.error('❌ MCP conversation analysis failed:', error);
      throw error;
    }
  }

  /**
   * Perform the actual profile update
   */
  private async performProfileUpdate(
    parameters: { interests?: string[]; goals?: string[]; skills?: string[] },
    userId?: string
  ): Promise<any> {
    // This would integrate with Firebase or other profile update mechanisms
    console.log('👤 Profile update processed:', parameters);
    
    // For now, return a placeholder response
    return {
      success: true,
      message: 'Profile updated successfully',
      parameters,
      userId
    };
  }
}

// Export singleton instance
export const mcpQueueService = new MCPQueueService();
export default mcpQueueService;