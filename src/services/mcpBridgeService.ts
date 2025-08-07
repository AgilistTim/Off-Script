// MCP Bridge Service - Connects main application to MCP server for enhanced conversation analysis
// Browser-compatible version that can work with external MCP server or provide fallback

import { environmentConfig } from '../config/environment';

// Helper function to get environment variables from the environment configuration
const getEnvVar = (key: string): string | undefined => {
  switch (key) {
    case 'VITE_MCP_SERVER_URL':
      return environmentConfig.apiEndpoints.mcpServer;
    case 'VITE_PERPLEXITY_API_KEY':
      return environmentConfig.perplexity.apiKey;
    case 'VITE_OPENAI_API_KEY':
      return environmentConfig.apiKeys.openai;
    default:
      return import.meta.env[key];
  }
};

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

export interface PerplexityStructuredCareerData {
  roleFundamentals: {
    corePurpose: string;
    problemsSolved: string[];
    typicalResponsibilities: string[];
    keyStakeholders: string[];
  };
  compensationRewards: {
    salaryRange: {
      entry: string;
      experienced: string;
      senior: string;
      byRegion: {
        london: string;
        manchester: string;
        birmingham: string;
        scotland: string;
      };
    };
    nonFinancialBenefits: {
      pension: string;
      healthcare: string;
      professionalDevelopment: string;
      perks: string[];
    };
  };
  competencyRequirements: {
    technicalSkills: string[];
    softSkills: string[];
    qualificationPathway: {
      degrees: string[];
      alternativeRoutes: string[];
      apprenticeships: string[];
      bootcamps: string[];
    };
    learningCurve: {
      timeToCompetent: string;
      difficultyLevel: string;
      prerequisites: string[];
    };
  };
  careerTrajectory: {
    progressionSteps: Array<{
      title: string;
      timeFrame: string;
      requirements: string[];
    }>;
    horizontalMoves: string[];
    specialistTrack: string[];
  };
  labourMarketDynamics: {
    demandOutlook: {
      growthForecast: string;
      timeHorizon: string;
      regionalHotspots: string[];
    };
    supplyProfile: {
      talentScarcity: string;
      competitionLevel: string;
      barriers: string[];
    };
    economicSensitivity: {
      recessionImpact: string;
      techDisruption: string;
      cyclicalPatterns: string;
    };
  };
  workEnvironmentCulture: {
    typicalEmployers: string[];
    teamStructures: string[];
    culturalNorms: {
      pace: string;
      formality: string;
      workLifeBalance: string;
    };
    physicalContext: string[];
  };
  lifestyleFit: {
    workingHours: {
      typical: string;
      flexibility: string;
      shiftWork: boolean;
    };
    remoteOptions: {
      remoteWork: boolean;
      hybridOptions: boolean;
    };
    stressProfile: {
      intensity: string;
      volatility: string;
      emotionalLabour: string;
    };
  };
  costRiskEntry: {
    upfrontInvestment: {
      tuitionCosts: string;
      trainingCosts: string;
      totalEstimate: string;
    };
    employmentCertainty: {
      placementRates: string;
      timeToFirstRole: string;
    };
    regulatoryRisk: {
      licenseRequirements: string[];
      revocationRisk: string;
    };
  };
  valuesImpact: {
    societalContribution: {
      publicGood: string;
      sustainability: string;
      ethicalFootprint: string;
    };
    personalAlignment: {
      intrinsicMotivation: string[];
      meaningfulness: string;
    };
    reputationPrestige: {
      perceivedStatus: string;
      networkingValue: string;
    };
  };
  transferabilityFutureProofing: {
    portableSkills: string[];
    automationExposure: {
      vulnerabilityLevel: string;
      timeHorizon: string;
      protectiveFactors: string[];
    };
    globalRelevance: {
      marketDemand: string[];
      culturalAdaptability: string;
    };
  };
  enhancedData: {
    verifiedSalary: {
      entry: string;
      experienced: string;
      senior: string;
      byRegion: {
        london: string;
        manchester: string;
        birmingham: string;
        scotland: string;
      };
    };
    currentEducationPathways: Array<{
      type: string;
      title: string;
      provider: string;
      duration: string;
      cost: string;
      entryRequirements: string[];
      verified: boolean;
    }>;
    realTimeMarketDemand: {
      jobPostingVolume: number;
      growthRate: string;
      competitionLevel: string;
      topEmployers: Array<{
        name: string;
        salaryRange: string;
        benefits: string[];
      }>;
    };
    industryGrowthProjection: {
      nextYear: string;
      fiveYear: string;
      outlook: string;
      factors: string[];
    };
    automationRiskAssessment: {
      level: string;
      timeline: string;
      mitigationStrategies: string[];
      futureSkillsNeeded: string[];
    };
  };
  sources: Array<{
    title: string;
    url: string;
    date?: string;
  }>;
}

class MCPBridgeService {
  private isConnected = false;
  private mcpServerUrl: string | null = null;
  private fallbackMode = false;

  constructor() {
    // In browser environment, we'll use HTTP API or fallback mode
    this.mcpServerUrl = getEnvVar('VITE_MCP_SERVER_URL') || 'https://off-script-mcp-elevenlabs.onrender.com/mcp';
    this.fallbackMode = getEnvVar('VITE_MCP_FALLBACK_MODE') === 'true';
    
    console.log('🔗 MCP Bridge Service initialized:', {
      mcpServerUrl: this.mcpServerUrl,
      fallbackMode: this.fallbackMode,
      envVar: getEnvVar('VITE_MCP_SERVER_URL')
    });
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
   * Update ElevenLabs agent context with career card information
   */
  async updateAgentContext(
    agentId: string, 
    careerCards: any[], 
    userName?: string, 
    contextType: string = 'new_cards'
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    if (!this.isConnected) {
      const connected = await this.connect();
      if (!connected) {
        return {
          success: false,
          error: 'Unable to connect to MCP server'
        };
      }
    }

    try {
      console.log('🔄 Updating agent context via MCP server:', {
        agentId,
        careerCardsCount: careerCards.length,
        contextType,
        hasUserName: !!userName
      });

      // Use proper MCP JSON-RPC protocol to call update_agent_context tool
      const response = await fetch(this.mcpServerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: 'update_agent_context',
            arguments: {
              agent_id: agentId,
              career_cards: careerCards,
              user_name: userName,
              context_type: contextType
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Handle MCP JSON-RPC response format
      if (result.error) {
        console.error('❌ MCP server returned error:', result.error);
        return {
          success: false,
          error: result.error.message || 'Unknown MCP error'
        };
      }

      // Parse the result content (MCP returns text content with JSON)
      let toolResult;
      if (result.result?.content?.[0]?.text) {
        try {
          toolResult = JSON.parse(result.result.content[0].text);
        } catch (e) {
          toolResult = { success: false, error: 'Failed to parse MCP response' };
        }
      } else {
        toolResult = result.result || { success: false, error: 'No result from MCP server' };
      }

      console.log('✅ Agent context update result:', toolResult);
      
      return {
        success: toolResult.success,
        error: toolResult.error,
        message: toolResult.message || 'Agent context updated successfully'
      };

    } catch (error) {
      console.error('❌ Failed to update agent context via MCP:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Search using Perplexity API for real-time career data
   */
  async searchWithPerplexity(params: PerplexitySearchParams): Promise<PerplexitySearchResult> {
    try {
      if (!environmentConfig.perplexity.apiKey) {
        return {
          success: false,
          error: 'Perplexity API key not configured'
        };
      }

      console.log('🔍 Calling Perplexity API:', params.query);

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${environmentConfig.perplexity.apiKey}`,
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

  /**
   * Search using Perplexity API for comprehensive structured career data (JSON response)
   */
  async searchStructuredCareerData(careerTitle: string): Promise<{
    success: boolean;
    data?: PerplexityStructuredCareerData;
    error?: string;
  }> {
    try {
      if (!environmentConfig.perplexity.apiKey) {
        return {
          success: false,
          error: 'Perplexity API key not configured'
        };
      }

      console.log('🔍 Calling Perplexity API for structured career data:', careerTitle);

      const comprehensivePrompt = `Research comprehensive UK career data for: ${careerTitle}

Please provide current 2024 information covering all 10 career exploration areas with specific UK data and sources.

Areas to research:
1. ROLE FUNDAMENTALS: Core purpose, problems solved, key responsibilities, stakeholders
2. COMPENSATION & REWARDS: Current UK salary ranges by experience level and region, benefits packages
3. COMPETENCY REQUIREMENTS: Technical skills, soft skills, qualifications, learning pathways, training time
4. CAREER TRAJECTORY: Progression steps, horizontal moves, specialist tracks, leadership paths
5. LABOUR MARKET DYNAMICS: Growth forecasts, talent scarcity, competition levels, economic sensitivity
6. WORK ENVIRONMENT & CULTURE: Typical employers, team structures, pace, formality, work-life balance
7. LIFESTYLE FIT: Working hours, remote options, stress levels, flexibility, shift work patterns
8. COST & RISK OF ENTRY: Training costs, employment certainty, regulatory requirements, licensing
9. VALUES & IMPACT: Social contribution, personal alignment, reputation, sustainability aspects
10. TRANSFERABILITY & FUTURE-PROOFING: Portable skills, automation risks, global relevance, adaptability

Use recent UK job market data, salary surveys, government statistics, and industry reports. Include specific salary figures, employer names, qualification providers, and verified market information.`;

      const jsonSchema = {
        type: 'object',
        properties: {
          roleFundamentals: {
            type: 'object',
            properties: {
              corePurpose: { type: 'string' },
              problemsSolved: { type: 'array', items: { type: 'string' } },
              typicalResponsibilities: { type: 'array', items: { type: 'string' } },
              keyStakeholders: { type: 'array', items: { type: 'string' } }
            },
            required: ['corePurpose', 'problemsSolved', 'typicalResponsibilities', 'keyStakeholders']
          },
          compensationRewards: {
            type: 'object',
            properties: {
              salaryRange: {
                type: 'object',
                properties: {
                  entry: { type: 'string' },
                  experienced: { type: 'string' },
                  senior: { type: 'string' },
                  byRegion: {
                    type: 'object',
                    properties: {
                      london: { type: 'string' },
                      manchester: { type: 'string' },
                      birmingham: { type: 'string' },
                      scotland: { type: 'string' }
                    },
                    required: ['london', 'manchester', 'birmingham', 'scotland']
                  }
                },
                required: ['entry', 'experienced', 'senior', 'byRegion']
              },
              nonFinancialBenefits: {
                type: 'object',
                properties: {
                  pension: { type: 'string' },
                  healthcare: { type: 'string' },
                  professionalDevelopment: { type: 'string' },
                  perks: { type: 'array', items: { type: 'string' } }
                },
                required: ['pension', 'healthcare', 'professionalDevelopment', 'perks']
              }
            },
            required: ['salaryRange', 'nonFinancialBenefits']
          },
          competencyRequirements: {
            type: 'object',
            properties: {
              technicalSkills: { type: 'array', items: { type: 'string' } },
              softSkills: { type: 'array', items: { type: 'string' } },
              qualificationPathway: {
                type: 'object',
                properties: {
                  degrees: { type: 'array', items: { type: 'string' } },
                  alternativeRoutes: { type: 'array', items: { type: 'string' } },
                  apprenticeships: { type: 'array', items: { type: 'string' } },
                  bootcamps: { type: 'array', items: { type: 'string' } }
                },
                required: ['degrees', 'alternativeRoutes', 'apprenticeships', 'bootcamps']
              },
              learningCurve: {
                type: 'object',
                properties: {
                  timeToCompetent: { type: 'string' },
                  difficultyLevel: { type: 'string' },
                  prerequisites: { type: 'array', items: { type: 'string' } }
                },
                required: ['timeToCompetent', 'difficultyLevel', 'prerequisites']
              }
            },
            required: ['technicalSkills', 'softSkills', 'qualificationPathway', 'learningCurve']
          },
          enhancedData: {
            type: 'object',
            properties: {
              verifiedSalary: {
                type: 'object',
                properties: {
                  entry: { type: 'string' },
                  experienced: { type: 'string' },
                  senior: { type: 'string' },
                  byRegion: {
                    type: 'object',
                    properties: {
                      london: { type: 'string' },
                      manchester: { type: 'string' },
                      birmingham: { type: 'string' },
                      scotland: { type: 'string' }
                    }
                  }
                },
                required: ['entry', 'experienced', 'senior']
              },
              currentEducationPathways: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    title: { type: 'string' },
                    provider: { type: 'string' },
                    duration: { type: 'string' },
                    cost: { type: 'string' },
                    entryRequirements: { type: 'array', items: { type: 'string' } },
                    verified: { type: 'boolean' }
                  },
                  required: ['type', 'title', 'provider', 'duration', 'cost']
                }
              },
              realTimeMarketDemand: {
                type: 'object',
                properties: {
                  jobPostingVolume: { type: 'number' },
                  growthRate: { type: 'string' },
                  competitionLevel: { type: 'string' },
                  topEmployers: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        salaryRange: { type: 'string' },
                        benefits: { type: 'array', items: { type: 'string' } }
                      }
                    }
                  }
                },
                required: ['jobPostingVolume', 'growthRate', 'competitionLevel']
              }
            },
            required: ['verifiedSalary', 'currentEducationPathways', 'realTimeMarketDemand']
          },
          sources: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                url: { type: 'string' },
                date: { type: 'string' }
              },
              required: ['title', 'url']
            }
          }
        },
        required: ['roleFundamentals', 'compensationRewards', 'competencyRequirements', 'enhancedData', 'sources']
      };

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${environmentConfig.perplexity.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [
            {
              role: 'system',
              content: 'You are a UK career research specialist providing comprehensive, structured career data. Always return valid JSON matching the exact schema provided. Use current 2024 UK market data with specific sources and verified information. Focus on accuracy and include recent salary data, employer names, qualification providers, and market statistics.'
            },
            {
              role: 'user',
              content: comprehensivePrompt
            }
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              schema: jsonSchema
            }
          },
          search_domain_filter: [
            'indeed.co.uk', 'reed.co.uk', 'glassdoor.co.uk', 'totaljobs.com',
            'ons.gov.uk', 'prospects.ac.uk', 'ucas.com', 'linkedin.com',
            'gov.uk', 'cipd.co.uk'
          ],
          search_recency_filter: 'month',
          temperature: 0.1,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      
      if (!choice || !choice.message?.content) {
        throw new Error('No response from Perplexity API');
      }

      let parsedData: PerplexityStructuredCareerData;
      try {
        parsedData = JSON.parse(choice.message.content);
      } catch (parseError) {
        console.error('❌ Failed to parse JSON response:', choice.message.content);
        throw new Error('Invalid JSON response from Perplexity');
      }

      // Extract sources from the API response
      const apiSources = data.search_results?.map((result: any) => ({
        title: result.title,
        url: result.url,
        date: result.date
      })) || [];

      // Merge API sources with any sources included in the JSON response
      if (parsedData.sources) {
        parsedData.sources = [...parsedData.sources, ...apiSources];
      } else {
        parsedData.sources = apiSources;
      }

      console.log('✅ Structured career data retrieved:', {
        careerTitle,
        hasEnhancedSalary: !!parsedData.enhancedData?.verifiedSalary,
        hasEducationPathways: !!parsedData.enhancedData?.currentEducationPathways?.length,
        hasMarketData: !!parsedData.enhancedData?.realTimeMarketDemand,
        sourcesCount: parsedData.sources?.length || 0
      });

      return {
        success: true,
        data: parsedData
      };

    } catch (error) {
      console.error('❌ Structured career data API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown structured career data error'
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
    console.error('❌ MCP insights generation failed - refusing to provide misleading fallback career data');
    console.error('Users deserve accurate career information, not fabricated salary and market data');
    
    return {
      success: false,
      error: 'Career insights unavailable - API services are currently offline. Please try again later or consult verified career resources.',
      insights: [],
      metadata: {
        interestCount: interests.length,
        insightsGenerated: 0,
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

  // REMOVED: Fallback helper methods that generated misleading career data
  // These methods provided fabricated salary ranges, fake skills lists, and generic career pathways
  // that could seriously mislead users making important career decisions.
  // 
  // When APIs fail, we now return clear error messages instead of fake data.
  //
  // Previous methods removed:
  // - getFallbackRoles() - returned generic role lists
  // - getFallbackSalaryData() - returned FAKE salary ranges like £25k-£70k+
  // - getFallbackSkills() - returned generic skill lists  
  // - getFallbackPathways() - returned generic learning pathways
  // - getFallbackNextSteps() - returned generic next steps
  //
  // Data integrity is more important than showing "complete" but false information.
}

// Export singleton instance
export const mcpBridgeService = new MCPBridgeService();

// Auto-connect on import in development
if (import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_MCP_SERVER !== 'false') {
  mcpBridgeService.connect().catch(error => {
    console.warn('⚠️ MCP server auto-connection failed, using fallback mode:', error.message);
  });
} 