// MCP Bridge Service - Connects main application to MCP server for enhanced conversation analysis
// Browser-compatible version that can work with external MCP server or provide fallback

export interface MCPMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface MCPAnalysisResult {
  success: boolean;
  analysis?: {
    detectedInterests: string[];
    confidence: number;
    careerCards: any[];
    timestamp: string;
    error?: string;
  };
  error?: string;
}

export interface MCPCareerInsight {
  field: string;
  roles: string[];
  salaryData: {
    entry: string;
    experienced: string;
    senior: string;
  };
  skills: string[];
  pathways: string[];
  marketOutlook: {
    growth: string;
    demand: string;
    competition: string;
    futureProspects: string;
  };
  nextSteps: string[];
}

export interface MCPInsightsResult {
  success: boolean;
  insights?: MCPCareerInsight[];
  metadata?: {
    interestCount: number;
    insightsGenerated: number;
    experience: string;
    location: string;
  };
  generatedAt?: string;
  error?: string;
}

export interface PerplexitySearchResult {
  success: boolean;
  response?: string;
  sources?: Array<{
    title: string;
    url: string;
    date?: string;
  }>;
  relatedQuestions?: string[];
  error?: string;
}

export interface PerplexitySearchParams {
  query: string;
  return_related_questions?: boolean;
  search_recency_filter?: 'hour' | 'day' | 'week' | 'month' | 'year';
  search_domain_filter?: string[];
  showThinking?: boolean;
}

class MCPBridgeService {
  private isConnected = false;
  private mcpServerUrl: string | null = null;
  private fallbackMode = false;

  constructor() {
    // In browser environment, we'll use HTTP API or fallback mode
    this.mcpServerUrl = import.meta.env.VITE_MCP_SERVER_URL || 'http://localhost:3001/mcp';
    this.fallbackMode = import.meta.env.VITE_MCP_FALLBACK_MODE === 'true';
  }

  /**
   * Initialize connection to MCP server
   */
  async connect(): Promise<boolean> {
    try {
      if (this.fallbackMode) {
        console.log('🔗 MCP Bridge in fallback mode - using local analysis');
        this.isConnected = true;
        return true;
      }

      console.log('🔗 Connecting to MCP server via HTTP...');
      
      // Try to ping the MCP server (if available via HTTP API)
      const response = await fetch(`${this.mcpServerUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        this.isConnected = true;
        console.log('✅ MCP server connected successfully via HTTP');
        return true;
      } else {
        throw new Error(`MCP server responded with status: ${response.status}`);
      }
    } catch (error) {
      console.warn('⚠️ MCP server not available, switching to fallback mode:', error);
      this.fallbackMode = true;
      this.isConnected = true; // Fallback mode is always "connected"
      return true;
    }
  }

  /**
   * Disconnect from MCP server
   */
  disconnect(): void {
    console.log('🔌 Disconnecting from MCP server...');
    this.isConnected = false;
  }

  /**
   * Check if connected to MCP server
   */
  isServerConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Analyze conversation using MCP server or fallback
   */
  async analyzeConversation(messages: MCPMessage[], userId?: string): Promise<MCPAnalysisResult> {
    if (!this.isConnected) {
      const connected = await this.connect();
      if (!connected) {
        return {
          success: false,
          error: 'Unable to connect to MCP server or fallback'
        };
      }
    }

    try {
      if (this.fallbackMode) {
        return await this.fallbackAnalyzeConversation(messages, userId);
      }

      // Try HTTP API to MCP server
      const response = await fetch(`${this.mcpServerUrl}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          userId: userId || 'anonymous'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.warn('⚠️ MCP server analysis failed, using fallback:', error);
      return await this.fallbackAnalyzeConversation(messages, userId);
    }
  }

  /**
   * Generate career insights using MCP server or fallback
   */
  async generateCareerInsights(
    interests: string[], 
    experience: string = 'intermediate', 
    location: string = 'UK'
  ): Promise<MCPInsightsResult> {
    if (!this.isConnected) {
      const connected = await this.connect();
      if (!connected) {
        return {
          success: false,
          error: 'Unable to connect to MCP server or fallback'
        };
      }
    }

    try {
      if (this.fallbackMode) {
        return await this.fallbackGenerateInsights(interests, experience, location);
      }

      // Try HTTP API to MCP server
      const response = await fetch(`${this.mcpServerUrl}/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interests,
          experience,
          location
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.warn('⚠️ MCP server insights failed, using fallback:', error);
      return await this.fallbackGenerateInsights(interests, experience, location);
    }
  }

  /**
   * Update user profile using MCP server or fallback
   */
  async updateUserProfile(userId: string, insights: any): Promise<any> {
    if (!this.isConnected) {
      return { success: false, error: 'MCP server not available' };
    }

    try {
      if (this.fallbackMode) {
        return this.fallbackUpdateProfile(userId, insights);
      }

      const response = await fetch(`${this.mcpServerUrl}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, insights })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('⚠️ MCP profile update failed:', error);
      return this.fallbackUpdateProfile(userId, insights);
    }
  }

  /**
   * Get user preferences using MCP server or fallback
   */
  async getUserPreferences(userId: string): Promise<any> {
    if (!this.isConnected) {
      return { success: false, error: 'MCP server not available' };
    }

    try {
      if (this.fallbackMode) {
        return this.fallbackGetPreferences(userId);
      }

      const response = await fetch(`${this.mcpServerUrl}/preferences/${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('⚠️ MCP preferences retrieval failed:', error);
      return this.fallbackGetPreferences(userId);
    }
  }

  /**
   * Search using Perplexity API for real-time career data
   */
  async searchWithPerplexity(params: PerplexitySearchParams): Promise<PerplexitySearchResult> {
    try {
      const { perplexity } = await import('../config/environment');
      
      if (!perplexity.apiKey) {
        return {
          success: false,
          error: 'Perplexity API key not configured'
        };
      }

      console.log('🔍 Calling Perplexity API:', params.query);

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${perplexity.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant providing accurate, current information about UK career opportunities, training pathways, and job market data. Always cite your sources and provide recent, verifiable information.'
            },
            {
              role: 'user',
              content: params.query
            }
          ],
          return_citations: true,
          search_domain_filter: params.search_domain_filter,
          search_recency_filter: params.search_recency_filter,
          return_related_questions: params.return_related_questions,
          temperature: 0.1,
          max_tokens: 1500
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      
      if (!choice) {
        throw new Error('No response from Perplexity API');
      }

      // Extract sources from citations or search_results
      const sources = data.search_results?.map((result: any) => ({
        title: result.title,
        url: result.url,
        date: result.date
      })) || [];

      console.log('✅ Perplexity search completed:', {
        query: params.query,
        sourcesFound: sources.length,
        responseLength: choice.message?.content?.length || 0
      });

      return {
        success: true,
        response: choice.message?.content || '',
        sources,
        relatedQuestions: data.related_questions || []
      };

    } catch (error) {
      console.error('❌ Perplexity API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Perplexity API error'
      };
    }
  }

  // Fallback methods for when MCP server is not available

  private async fallbackAnalyzeConversation(messages: MCPMessage[], userId?: string): Promise<MCPAnalysisResult> {
    console.log('🔄 MCP server unavailable - returning clear error instead of misleading fallback data');
    
    // Return clear error instead of hardcoded career cards to prevent misleading information
    return {
      success: false,
      analysis: {
        detectedInterests: [],
        confidence: 0,
        careerCards: [],
        timestamp: new Date().toISOString(),
        error: 'Career analysis service is temporarily unavailable. Please try again in a few moments or check your connection.'
      }
    };
  }

  private async fallbackGenerateInsights(interests: string[], experience: string, location: string): Promise<MCPInsightsResult> {
    console.log('🔄 Using fallback insights generation');

    const insights: MCPCareerInsight[] = interests.map(interest => ({
      field: interest,
      roles: this.getFallbackRoles(interest),
      salaryData: this.getFallbackSalaryData(interest),
      skills: this.getFallbackSkills(interest),
      pathways: this.getFallbackPathways(interest, experience),
      marketOutlook: {
        growth: 'Growing',
        demand: 'High demand in UK market',
        competition: 'Competitive but opportunities available',
        futureProspects: 'Positive outlook with digital transformation'
      },
      nextSteps: this.getFallbackNextSteps(interest)
    }));

    return {
      success: true,
      insights,
      metadata: {
        interestCount: interests.length,
        insightsGenerated: insights.length,
        experience,
        location
      },
      generatedAt: new Date().toISOString()
    };
  }

  private fallbackUpdateProfile(userId: string, insights: any): any {
    console.log('🔄 Using fallback profile update');
    return {
      success: true,
      profile: {
        userId,
        interests: insights?.detectedInterests || [],
        lastUpdated: new Date().toISOString(),
        source: 'fallback_mcp_bridge'
      },
      timestamp: new Date().toISOString()
    };
  }

  private fallbackGetPreferences(userId: string): any {
    console.log('🔄 Using fallback preferences retrieval');
    return {
      success: true,
      preferences: {
        userId,
        communicationStyle: 'helpful',
        careerStage: 'exploring',
        interests: [],
        goals: [],
        source: 'fallback_defaults'
      },
      timestamp: new Date().toISOString()
    };
  }

  // Helper methods for fallback data
  private getFallbackRoles(interest: string): string[] {
    const roleMap: { [key: string]: string[] } = {
      'AI/Machine Learning': ['Data Scientist', 'ML Engineer', 'AI Researcher'],
      'Design': ['UX Designer', 'Graphic Designer', 'Product Designer'],
      'Entrepreneurship': ['Startup Founder', 'Business Developer', 'Innovation Manager']
    };
    return roleMap[interest] || ['Specialist', 'Consultant', 'Manager'];
  }

  private getFallbackSalaryData(interest: string): { entry: string; experienced: string; senior: string } {
    const salaryMap: { [key: string]: { entry: string; experienced: string; senior: string } } = {
      'AI/Machine Learning': { entry: '£35,000', experienced: '£65,000', senior: '£100,000+' },
      'Design': { entry: '£28,000', experienced: '£50,000', senior: '£80,000+' },
      'Entrepreneurship': { entry: '£30,000', experienced: '£60,000', senior: '£150,000+' }
    };
    return salaryMap[interest] || { entry: '£25,000', experienced: '£45,000', senior: '£70,000+' };
  }

  private getFallbackSkills(interest: string): string[] {
    const skillMap: { [key: string]: string[] } = {
      'AI/Machine Learning': ['Python', 'Statistics', 'Machine Learning'],
      'Design': ['Creative Thinking', 'Design Software', 'User Research'],
      'Entrepreneurship': ['Leadership', 'Business Strategy', 'Finance']
    };
    return skillMap[interest] || ['Communication', 'Problem Solving', 'Critical Thinking'];
  }

  private getFallbackPathways(interest: string, experience: string): string[] {
    const pathwayMap: { [key: string]: { [key: string]: string[] } } = {
      'AI/Machine Learning': {
        beginner: ['Learn Python basics', 'Take online ML course', 'Practice with datasets'],
        intermediate: ['Advanced ML techniques', 'Specialize in field', 'Build portfolio'],
        advanced: ['Research opportunities', 'Lead projects', 'Mentor others']
      }
    };
    return pathwayMap[interest]?.[experience] || ['Learn fundamentals', 'Gain experience', 'Build portfolio'];
  }

  private getFallbackNextSteps(interest: string): string[] {
    const stepMap: { [key: string]: string[] } = {
      'AI/Machine Learning': ['Take Python course', 'Practice with real data', 'Join AI communities'],
      'Design': ['Build design portfolio', 'Learn design tools', 'Get user feedback'],
      'Entrepreneurship': ['Develop business idea', 'Network with entrepreneurs', 'Learn business basics']
    };
    return stepMap[interest] || ['Research the field', 'Connect with professionals', 'Gain relevant skills'];
  }
}

// Export singleton instance
export const mcpBridgeService = new MCPBridgeService();

// Auto-connect on import in development
if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_MCP_SERVER !== 'false') {
  mcpBridgeService.connect().catch(error => {
    console.warn('⚠️ MCP server auto-connection failed, using fallback mode:', error.message);
  });
} 