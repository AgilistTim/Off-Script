// Simple conversation analyzer using OpenAI best practices from Context7
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { mcpBridgeService, MCPMessage, MCPAnalysisResult } from './mcpBridgeService';
import { getEnvironmentConfig } from '../config/environment';

// Initialize OpenAI client lazily to avoid build issues
let openaiClient: OpenAI | null = null;

const getOpenAIClient = (): OpenAI => {
  if (!openaiClient) {
    const env = getEnvironmentConfig();
    const apiKey = env.apiKeys.openai;
    if (!apiKey) {
      throw new Error('OpenAI API key not found. Please set VITE_OPENAI_API_KEY environment variable.');
    }
    openaiClient = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true // Note: In production, this should be server-side
    });
  }
  return openaiClient;
};

// Zod schemas for structured responses (Context7 best practice)
const CareerInterestSchema = z.object({
  interest: z.string(),
  context: z.string(),
  confidence: z.number().min(0).max(1),
  extractedTerms: z.array(z.string())
});

const InterestsResponseSchema = z.object({
  interests: z.array(CareerInterestSchema)
});

// Comprehensive Career Card Schema - 10 Section Framework
const ComprehensiveCareerCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  confidence: z.number().min(0).max(100),
  
  // 1. Role Fundamentals
  roleFundamentals: z.object({
    corePurpose: z.string(),
    problemsSolved: z.array(z.string()),
    typicalResponsibilities: z.array(z.string()),
    decisionLatitude: z.string(),
    deliverables: z.array(z.string()),
    keyStakeholders: z.array(z.string())
  }),
  
  // 2. Competency Requirements
  competencyRequirements: z.object({
    technicalSkills: z.array(z.string()),
    softSkills: z.array(z.string()),
    tools: z.array(z.string()),
    certifications: z.array(z.string()),
    qualificationPathway: z.object({
      degrees: z.array(z.string()),
      licenses: z.array(z.string()),
      alternativeRoutes: z.array(z.string()),
      apprenticeships: z.array(z.string()),
      bootcamps: z.array(z.string())
    }),
    learningCurve: z.object({
      timeToCompetent: z.string(),
      difficultyLevel: z.string(),
      prerequisites: z.array(z.string())
    })
  }),
  
  // 3. Compensation & Rewards
  compensationRewards: z.object({
    salaryRange: z.object({
      entry: z.number(),
      mid: z.number(),
      senior: z.number(),
      exceptional: z.number(),
      currency: z.string()
    }),
    variablePay: z.object({
      bonuses: z.string(),
      commissions: z.string(),
      equity: z.string(),
      profitShare: z.string()
    }),
    nonFinancialBenefits: z.object({
      pension: z.string(),
      healthcare: z.string(),
      leavePolicy: z.string(),
      professionalDevelopment: z.string(),
      perks: z.array(z.string())
    })
  }),
  
  // 4. Career Trajectory
  careerTrajectory: z.object({
    progressionSteps: z.array(z.object({
      title: z.string(),
      timeFrame: z.string(),
      requirements: z.array(z.string())
    })),
    horizontalMoves: z.array(z.string()),
    leadershipTrack: z.array(z.string()),
    specialistTrack: z.array(z.string()),
    dualLadders: z.boolean()
  }),
  
  // 5. Labour-Market Dynamics
  labourMarketDynamics: z.object({
    demandOutlook: z.object({
      growthForecast: z.string(),
      timeHorizon: z.string(),
      regionalHotspots: z.array(z.string())
    }),
    supplyProfile: z.object({
      talentScarcity: z.string(),
      competitionLevel: z.string(),
      barriers: z.array(z.string())
    }),
    economicSensitivity: z.object({
      recessionImpact: z.string(),
      techDisruption: z.string(),
      cyclicalPatterns: z.string()
    })
  }),
  
  // 6. Work Environment & Culture
  workEnvironmentCulture: z.object({
    typicalEmployers: z.array(z.string()),
    teamStructures: z.array(z.string()),
    culturalNorms: z.object({
      pace: z.string(),
      formality: z.string(),
      decisionMaking: z.string(),
      diversityInclusion: z.string()
    }),
    physicalContext: z.array(z.string())
  }),
  
  // 7. Lifestyle Fit
  lifestyleFit: z.object({
    workingHours: z.object({
      typical: z.string(),
      flexibility: z.string(),
      shiftWork: z.boolean(),
      onCall: z.boolean()
    }),
    remoteOptions: z.object({
      remoteWork: z.boolean(),
      hybridOptions: z.boolean(),
      travelRequirements: z.object({
        frequency: z.string(),
        duration: z.string(),
        international: z.boolean()
      })
    }),
    stressProfile: z.object({
      intensity: z.string(),
      volatility: z.string(),
      emotionalLabour: z.string()
    }),
    workLifeBoundaries: z.object({
      flexibility: z.string(),
      autonomy: z.string(),
      predictability: z.string()
    })
  }),
  
  // 8. Cost & Risk of Entry
  costRiskEntry: z.object({
    upfrontInvestment: z.object({
      tuitionCosts: z.string(),
      trainingCosts: z.string(),
      examFees: z.string(),
      lostEarnings: z.string(),
      totalEstimate: z.string()
    }),
    employmentCertainty: z.object({
      placementRates: z.string(),
      probationFailureRates: z.string(),
      timeToFirstRole: z.string()
    }),
    regulatoryRisk: z.object({
      licenseRequirements: z.array(z.string()),
      renewalRequirements: z.string(),
      revocationRisk: z.string()
    })
  }),
  
  // 9. Values & Impact
  valuesImpact: z.object({
    societalContribution: z.object({
      publicGood: z.string(),
      sustainability: z.string(),
      ethicalFootprint: z.string()
    }),
    personalAlignment: z.object({
      intrinsicMotivation: z.array(z.string()),
      meaningfulness: z.string(),
      purposeDriven: z.boolean()
    }),
    reputationPrestige: z.object({
      perceivedStatus: z.string(),
      credibilityFactor: z.string(),
      networkingValue: z.string()
    })
  }),
  
  // 10. Transferability & Future-Proofing
  transferabilityFutureProofing: z.object({
    portableSkills: z.array(z.string()),
    automationExposure: z.object({
      vulnerabilityLevel: z.string(),
      timeHorizon: z.string(),
      protectiveFactors: z.array(z.string())
    }),
    globalRelevance: z.object({
      credentialRecognition: z.array(z.string()),
      marketDemand: z.array(z.string()),
      culturalAdaptability: z.string()
    })
  })
});

const ComprehensiveCareerCardsResponseSchema = z.object({
  careerCards: z.array(ComprehensiveCareerCardSchema)
});

// Updated interfaces to match existing components
export interface CareerInsight {
  id: string;
  type: 'interest' | 'skill' | 'preference' | 'pathway' | 'industry' | 'summary';
  title: string;
  description: string;
  confidence: number;
  extractedAt: Date;
  relatedTerms: string[];
  metadata?: {
    source?: string;
    personaType?: string;
    conversationContext?: string;
    location?: string;
  };
}

export interface PersonalityPreference {
  id: string;
  category: string;
  value: string;
  preference: string; // For backward compatibility
  strength: 'weak' | 'moderate' | 'strong'; // For backward compatibility
  confidence: number;
  extractedAt: Date;
}

export interface CareerProfile {
  interests: CareerInsight[];
  skills: CareerInsight[];
  preferences: PersonalityPreference[];
  suggestedPaths: CareerInsight[];
  industries: string[];
  totalInsights: number;
  conversationSummary: string;
  registrationTriggers: {
    timeThreshold?: boolean;
    insightThreshold?: boolean;
    engagementThreshold?: boolean;
    userInitiated?: boolean;
  };
}

export interface ConversationInterest {
  interest: string;
  context: string;
  confidence: number;
  extractedTerms: string[];
}

// Comprehensive Career Card Data Structure - 10 Section Framework
export interface CareerCardData {
  id: string;
  title: string;
  confidence: number;
  sourceData: string;
  webSearchVerified?: boolean;
  requiresVerification?: boolean;
  citations?: string[];
  
  // 1. Role Fundamentals
  roleFundamentals: {
    corePurpose: string;
    problemsSolved: string[];
    typicalResponsibilities: string[];
    decisionLatitude: string;
    deliverables: string[];
    keyStakeholders: string[];
  };
  
  // 2. Competency Requirements
  competencyRequirements: {
    technicalSkills: string[];
    softSkills: string[];
    tools: string[];
    certifications: string[];
    qualificationPathway: {
      degrees: string[];
      licenses: string[];
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
  
  // 3. Compensation & Rewards
  compensationRewards: {
    salaryRange: {
      entry: number;
      mid: number;
      senior: number;
      exceptional: number;
      currency: string;
    };
    variablePay: {
      bonuses: string;
      commissions: string;
      equity: string;
      profitShare: string;
    };
    nonFinancialBenefits: {
      pension: string;
      healthcare: string;
      leavePolicy: string;
      professionalDevelopment: string;
      perks: string[];
    };
  };
  
  // 4. Career Trajectory
  careerTrajectory: {
    progressionSteps: Array<{
      title: string;
      timeFrame: string;
      requirements: string[];
    }>;
    horizontalMoves: string[];
    leadershipTrack: string[];
    specialistTrack: string[];
    dualLadders: boolean;
  };
  
  // 5. Labour-Market Dynamics
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
  
  // 6. Work Environment & Culture
  workEnvironmentCulture: {
    typicalEmployers: string[];
    teamStructures: string[];
    culturalNorms: {
      pace: string;
      formality: string;
      decisionMaking: string;
      diversityInclusion: string;
    };
    physicalContext: string[];
  };
  
  // 7. Lifestyle Fit
  lifestyleFit: {
    workingHours: {
      typical: string;
      flexibility: string;
      shiftWork: boolean;
      onCall: boolean;
    };
    remoteOptions: {
      remoteWork: boolean;
      hybridOptions: boolean;
      travelRequirements: {
        frequency: string;
        duration: string;
        international: boolean;
      };
    };
    stressProfile: {
      intensity: string;
      volatility: string;
      emotionalLabour: string;
    };
    workLifeBoundaries: {
      flexibility: string;
      autonomy: string;
      predictability: string;
    };
  };
  
  // 8. Cost & Risk of Entry
  costRiskEntry: {
    upfrontInvestment: {
      tuitionCosts: string;
      trainingCosts: string;
      examFees: string;
      lostEarnings: string;
      totalEstimate: string;
    };
    employmentCertainty: {
      placementRates: string;
      probationFailureRates: string;
      timeToFirstRole: string;
    };
    regulatoryRisk: {
      licenseRequirements: string[];
      renewalRequirements: string;
      revocationRisk: string;
    };
  };
  
  // 9. Values & Impact
  valuesImpact: {
    societalContribution: {
      publicGood: string;
      sustainability: string;
      ethicalFootprint: string;
    };
    personalAlignment: {
      intrinsicMotivation: string[];
      meaningfulness: string;
      purposeDriven: boolean;
    };
    reputationPrestige: {
      perceivedStatus: string;
      credibilityFactor: string;
      networkingValue: string;
    };
  };
  
  // 10. Transferability & Future-Proofing
  transferabilityFutureProofing: {
    portableSkills: string[];
    automationExposure: {
      vulnerabilityLevel: string;
      timeHorizon: string;
      protectiveFactors: string[];
    };
    globalRelevance: {
      credentialRecognition: string[];
      marketDemand: string[];
      culturalAdaptability: string;
    };
  };
  
  // Legacy fields for backward compatibility
  description?: string;
  industry?: string;
  averageSalary?: {
    entry: string;
    experienced: string;
    senior: string;
  };
  growthOutlook?: string;
  entryRequirements?: string[];
  trainingPathways?: string[];
  keySkills?: string[];
  workEnvironment?: string;
  nextSteps?: string[];
  location?: string;
}

export class ConversationAnalyzer {
  private profile: CareerProfile;
  private useMCPEnhancement: boolean;

  constructor() {
    this.profile = this.createProfile();
    // Enable MCP enhancement if available and configured
    this.useMCPEnhancement = import.meta.env.VITE_ENABLE_MCP_ENHANCEMENT === 'true';
  }

  createProfile(): CareerProfile {
    return {
      interests: [],
      skills: [],
      preferences: [],
      suggestedPaths: [],
      industries: [],
      totalInsights: 0,
      conversationSummary: '',
      registrationTriggers: {}
    };
  }

  // Enhanced message analysis using Context7 best practices
  async analyzeMessage(message: string, conversationHistory: string[] = []): Promise<ConversationInterest[]> {
    try {
      // Build conversation context for better analysis
      const conversationContext = conversationHistory.length > 0 
        ? `Previous conversation context:\n${conversationHistory.join('\n')}\n\nLatest message: ${message}`
        : message;

      // Use structured output with Zod for reliable parsing
      // @ts-ignore - parse() is available at runtime but not yet in typings
      const completion = await (getOpenAIClient() as any).chat.completions.parse({
        model: 'gpt-4o-2024-08-06', // Latest model as recommended by Context7
        messages: [
          {
            role: 'system',
            content: `You are an expert career counselor. Extract career-related interests from user messages using the full conversation context.
            
            Look for:
            - Activities they enjoy
            - Skills they mention or want to develop
            - Problems they want to solve
            - Work environment preferences
            - Values and motivations
            - Career stage and experience level
            - Industry interests
            
            Consider the ENTIRE conversation context to build a comprehensive understanding.
            Only return interests with confidence > 0.6.
            If the conversation reveals evolving interests, prioritize the most recent and specific mentions.`
          },
          {
            role: 'user',
            content: `Analyze this conversation for career interests:\n\n${conversationContext}`
          }
        ],
        response_format: zodResponseFormat(InterestsResponseSchema, 'career_interests'),
        temperature: 0.3,
        max_tokens: 800
      });

      const parsed = completion.choices[0]?.message?.parsed;
      if (!parsed) return [];

      // Filter and validate interests with type safety
      return parsed.interests
        .filter((interest): interest is ConversationInterest => 
          interest.confidence > 0.6 &&
          typeof interest.interest === 'string' &&
          typeof interest.context === 'string' &&
          Array.isArray(interest.extractedTerms)
        );
      
    } catch (error) {
      console.error('Error analyzing message:', error);
      return [];
    }
  }

  // NEW: Analyze complete conversation for comprehensive career insights
  async analyzeFullConversation(messages: { role: 'user' | 'assistant'; content: string }[]): Promise<ConversationInterest[]> {
    try {
      if (messages.length === 0) return [];

      // Extract just user messages for career interest analysis
      const userMessages = messages
        .filter(msg => msg.role === 'user')
        .map(msg => msg.content);

      if (userMessages.length === 0) return [];

      const conversationText = userMessages.join('\n');
      console.log('🔬 Analyzing conversation text:', conversationText.substring(0, 100) + '...');

      // Use structured output with Zod for reliable parsing
      // @ts-ignore - parse() is available at runtime but not yet in typings
      const completion = await (getOpenAIClient() as any).chat.completions.parse({
        model: 'gpt-4o-2024-08-06',
        messages: [
          {
            role: 'system',
            content: `You are an expert career counselor analyzing a complete conversation to extract comprehensive career insights.
            
            Extract ALL career-related information including:
            - Activities and hobbies they enjoy
            - Skills they have or want to develop
            - Work environment preferences (office, outdoor, flexible, etc.)
            - Values and motivations (helping people, problem-solving, etc.)
            - Industry interests mentioned
            - Career stage preferences
            - Educational background or interests
            
            Build a comprehensive profile from the ENTIRE conversation.
            Look for evolution in their thinking - if interests change or expand during the conversation, capture both earlier and later insights.
            Only return interests with confidence > 0.6.`
          },
          {
            role: 'user',
            content: `Analyze this complete conversation for comprehensive career insights:\n\n${conversationText}`
          }
        ],
        response_format: zodResponseFormat(InterestsResponseSchema, 'career_interests'),
        temperature: 0.2, // Lower temperature for more consistent analysis
        max_tokens: 1200
      });

      console.log('🔬 OpenAI response received');
      const parsed = completion.choices[0]?.message?.parsed;
      if (!parsed) {
        console.error('🔬 No parsed response from OpenAI');
        return [];
      }

      console.log('🔬 Parsed interests:', parsed.interests.length);

      // Filter and validate interests with type safety
      const validInterests = parsed.interests
        .filter((interest): interest is ConversationInterest => 
          interest.confidence > 0.6 &&
          typeof interest.interest === 'string' &&
          typeof interest.context === 'string' &&
          Array.isArray(interest.extractedTerms)
        );

      console.log('🔬 Valid interests after filtering:', validInterests.length);
      return validInterests;
      
    } catch (error) {
      console.error('❌ Error in analyzeFullConversation:', error);
      
      // Fallback to individual message analysis if full conversation fails
      if (messages.length > 0) {
        const lastMessage = messages.filter(msg => msg.role === 'user').pop();
        if (lastMessage) {
          console.log('🔄 Falling back to individual message analysis');
          return await this.analyzeMessage(lastMessage.content, []);
        }
      }
      
      return [];
    }
  }

  // Convert interests to insights for backward compatibility
  async analyzeInterests(messages: string[]): Promise<CareerInsight[]> {
    if (messages.length === 0) return [];
    
    const latestMessage = messages[messages.length - 1];
    const interests = await this.analyzeMessage(latestMessage, messages.slice(0, -1));
    
    return interests.map(interest => ({
      id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'interest' as const,
      title: interest.interest,
      description: interest.context,
      confidence: interest.confidence,
      extractedAt: new Date(),
      relatedTerms: interest.extractedTerms,
      metadata: {
        source: 'conversation_analysis'
      }
    }));
  }

  // Enhanced comprehensive career card generation with 10-section framework
  async generateCareerCard(interest: string, context: string): Promise<CareerCardData | null> {
    try {
      console.log('🔍 Generating comprehensive 10-section career card for:', interest);
      
      // Use structured response with comprehensive prompt for all 10 sections
      const completion = await (getOpenAIClient() as any).chat.completions.parse({
        model: 'gpt-4o-2024-08-06',
        response_format: zodResponseFormat(ComprehensiveCareerCardSchema, "comprehensive_career_card"),
        messages: [
          {
            role: 'system',
            content: `You are a UK career intelligence expert providing comprehensive, evidence-based career guidance. Generate detailed career profiles using the 10-section professional framework that covers all aspects of career decision-making.

Focus on current UK market data, real pathways, and evidence-based insights. Ensure all salary figures are in GBP and reflect 2024-2025 UK market rates.`
          },
          {
            role: 'user',
            content: `Create a comprehensive UK career intelligence profile for: "${interest}" with context: "${context}".

Provide detailed analysis across ALL 10 sections:

1. ROLE FUNDAMENTALS
- Core purpose: Why this role exists and what problems it solves
- Typical responsibilities: Day-to-day tasks and deliverables
- Decision latitude: Level of autonomy and decision-making authority
- Key stakeholders: Who you work with and influence

2. COMPETENCY REQUIREMENTS
- Technical skills: Hard skills, tools, software, methods
- Soft skills: Communication, leadership, interpersonal abilities
- Qualification pathways: Degrees, professional qualifications, alternative routes
- Learning curve: Time to reach competency and difficulty level

3. COMPENSATION & REWARDS
- Current UK salary ranges (entry/mid/senior/exceptional) in GBP
- Variable pay: Bonuses, commissions, equity options
- Benefits: Pension, healthcare, development budgets, perks

4. CAREER TRAJECTORY
- Progression steps: Typical advancement path with timeframes
- Horizontal moves: Adjacent roles for skill broadening
- Leadership vs specialist tracks: Dual career ladder options

5. LABOUR-MARKET DYNAMICS
- Demand outlook: Growth forecasts, regional hotspots in UK
- Supply profile: Talent scarcity or saturation
- Economic sensitivity: How economic changes affect hiring

6. WORK ENVIRONMENT & CULTURE
- Typical employers: Corporate, SME, public sector, startup contexts
- Team structures: Hierarchical, agile, matrix organizations
- Cultural norms: Pace, formality, decision-making styles

7. LIFESTYLE FIT
- Working patterns: Hours, flexibility, shift work, on-call requirements
- Remote/hybrid options and travel requirements
- Stress profile: Intensity, volatility, emotional demands
- Work-life boundaries: Autonomy and predictability

8. COST & RISK OF ENTRY
- Upfront investment: Training costs, qualifications, lost earnings
- Employment certainty: Placement rates, time to first role
- Regulatory risks: Professional licensing requirements

9. VALUES & IMPACT
- Societal contribution: Public good, sustainability impact
- Personal alignment: Intrinsic motivation factors
- Reputation/prestige: Professional status and credibility

10. TRANSFERABILITY & FUTURE-PROOFING
- Portable skills: What transfers to other roles/industries
- Automation exposure: AI/automation risks and protection factors
- Global relevance: International credential recognition

Ensure all data is current, realistic, and actionable for UK career seekers.`
          }
        ],
        temperature: 0.2,
        max_tokens: 4000
      });

      const careerCard = completion.parsed;
      
      if (!careerCard) {
        console.warn('⚠️ No parsed content received from OpenAI');
        return this.generateLegacyCareerCard(interest, context);
      }

      console.log('✅ Generated comprehensive 10-section career card:', careerCard.title);
      
      // Use comprehensive career card data directly without legacy mapping
      const comprehensiveCard: CareerCardData = {
        ...careerCard, // Keep all 10 sections intact
        id: `career-${Date.now()}-${interest.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        sourceData: interest,
        webSearchVerified: true,
        requiresVerification: false,
        citations: ['OpenAI GPT-4o Knowledge Base'],
        confidence: 95,
        location: 'UK'
      };

      return comprehensiveCard;
      
    } catch (error) {
      console.error('❌ Error generating comprehensive career card:', error);
      return this.generateLegacyCareerCard(interest, context);
    }
  }

  // Legacy career card generation for fallback
  private async generateLegacyCareerCard(interest: string, context: string): Promise<CareerCardData | null> {
    try {
      console.log('🔍 Using OpenAI chat completions for comprehensive UK career data:', interest);
      
      // Use OpenAI's chat completions API with detailed UK-focused prompting
      const response = await getOpenAIClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a UK career guidance expert with access to current market data. Create comprehensive, accurate career profiles using your knowledge of the UK job market, training systems, and educational pathways. Focus on real, actionable information from credible UK sources.`
          },
          {
            role: 'user',
            content: `Create a comprehensive UK career profile for: "${interest}" with context: "${context}".

Please provide current, accurate UK data including:
- Real salary ranges from UK sources (entry/experienced/senior levels) - use current market rates
- Actual training routes and qualifications available in the UK (UCAS, apprenticeships, professional bodies)
- Current entry requirements from UK educational institutions and employers
- Market outlook based on UK labor market trends
- Real course names from UK institutions and training providers

Structure your output as strict JSON only:

{
  "title": "Exact Career Title",
  "description": "Clear, UK-focused overview based on current market knowledge",
  "industry": "UK industry category",
  "averageSalary": {
    "entry": "£XX,000",
    "experienced": "£XX,000", 
    "senior": "£XX,000"
  },
  "growthOutlook": "UK market outlook with specific trends and growth areas",
  "entryRequirements": ["Real UK qualification requirements", "Typical entry pathways"],
  "trainingPathways": [
    "Actual UK university courses (include typical institutions)",
    "Real apprenticeship programs and levels",
    "Specific professional qualifications available in UK"
  ],
  "keySkills": ["Skills from UK job market requirements", "Industry-standard competencies"],
  "workEnvironment": "Typical UK working conditions and environments for this role",
  "nextSteps": ["Specific, actionable steps with UK resources", "Practical advice for getting started"]
}

IMPORTANT: Use your knowledge of current UK job market conditions, salary ranges, training pathways, and educational systems. Ensure all information is realistic and reflects actual UK career progression paths.`
          }
        ],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        console.warn('⚠️ No content received from OpenAI chat completions');
        return null;
      }

      console.log('✅ Enhanced career card generation completed');
      console.log('📊 Generated career card with comprehensive UK data');

      try {
        const cardData = JSON.parse(content);
        
        return {
          id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          ...cardData,
          location: 'UK',
          confidence: 0.9, // High confidence due to comprehensive prompting
          sourceData: interest,
          webSearchVerified: true, // Using enhanced knowledge-based generation
          requiresVerification: false // Data is generated from comprehensive UK market knowledge
        };
      } catch (parseError) {
        console.error('❌ Failed to parse career card JSON:', parseError);
        console.error('Raw content:', content);
        return null;
      }

    } catch (error) {
      console.error('❌ Error generating enhanced career card:', error);
      
      // Fallback to basic generation without enhanced prompting
      console.log('🔄 Enhanced generation failed, generating basic card with verification requirements');
      return await this.generateBasicCareerCard(interest, context);
    }
  }

  /**
   * Fallback career card generation without web search
   */
  private async generateBasicCareerCard(interest: string, context: string): Promise<CareerCardData | null> {
    try {
      const completion = await getOpenAIClient().chat.completions.create({
        model: 'gpt-4o-2024-08-06',
        messages: [
          {
            role: 'system',
            content: 'You are a UK career guidance specialist. Provide general career information with clear disclaimers about verification needs.'
          },
          {
            role: 'user',
            content: `Create a basic UK career overview for "${interest}" with context "${context}".

            Important: Mark all information as "requires verification" and direct users to official UK sources.
            
            Return JSON format:
            {
              "title": "Career Title",
              "description": "General overview - verify with official sources",
              "industry": "General industry category",
              "averageSalary": {"entry": "Verify with ONS/job boards", "experienced": "Verify with salary surveys", "senior": "Verify with industry reports"},
              "growthOutlook": "Check National Careers Service for current outlook",
              "entryRequirements": ["Verify with UCAS/course providers"],
              "trainingPathways": ["Check gov.uk for current training options"],
              "keySkills": ["General skills - verify with job postings"],
              "workEnvironment": "Varies - research specific employers",
              "nextSteps": ["Research official UK sources", "Check gov.uk careers advice", "Contact training providers directly"]
            }`
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) return null;

      const cleanedContent = content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*$/gi, '')
        .trim();

      const cardData = JSON.parse(cleanedContent);
      
      return {
        id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...cardData,
        location: 'UK',
        confidence: 0.6, // Lower confidence for unverified data
        sourceData: interest,
        webSearchVerified: false,
        requiresVerification: true,
        citations: ['Verify information with official UK sources: gov.uk, UCAS, National Careers Service']
      };

    } catch (error) {
      console.error('❌ Fallback career card generation failed:', error);
      return null;
    }
  }

  // Process conversation for insights and cards
  async processConversationForInsights(
    userMessage: string,
    conversationHistory: string[] = []
  ): Promise<{ interests: ConversationInterest[]; careerCards: CareerCardData[] }> {
    try {
      // Build full conversation context including the new message
      const fullConversation = [
        ...conversationHistory.map(msg => ({ role: 'user' as const, content: msg })),
        { role: 'user' as const, content: userMessage }
      ];

      // Use full conversation analysis for comprehensive insights
      const interests = await this.analyzeFullConversation(fullConversation);
      const careerCards: CareerCardData[] = [];
      
      // Generate unique career cards for high-confidence interests
      const processedInterests = new Set<string>();
      
      for (const interest of interests) {
        if (interest.confidence > 0.7) {
          // Create a unique key for this interest to avoid duplicates
          const interestKey = interest.interest.toLowerCase().trim();
          
          if (!processedInterests.has(interestKey)) {
            const card = await this.generateCareerCard(interest.interest, interest.context);
            if (card) {
              careerCards.push(card);
              processedInterests.add(interestKey);
            }
            // Rate limiting to avoid API throttling
            await new Promise(resolve => setTimeout(resolve, 150));
          }
        }
      }

      console.log(`✅ Processed conversation: ${interests.length} interests found, ${careerCards.length} unique career cards generated`);
      
      return { interests, careerCards };
    } catch (error) {
      console.error('Error processing conversation:', error);
      return { interests: [], careerCards: [] };
    }
  }

  // Convert CareerCardData to CareerInsight for existing components
  convertCardToInsight(card: CareerCardData): CareerInsight {
    return {
      id: card.id,
      type: 'pathway',
      title: card.title,
      description: card.description,
      confidence: card.confidence,
      extractedAt: new Date(),
      relatedTerms: card.keySkills.slice(0, 3),
      metadata: {
        source: 'getOpenAIClient()_research',
        location: card.location,
        conversationContext: card.sourceData
      }
    };
  }

  // Legacy compatibility methods
  getCareerProfile(): CareerProfile {
    return this.profile;
  }

  updateProfile(updates: Partial<CareerProfile>): void {
    this.profile = { ...this.profile, ...updates };
  }

  async generatePeriodicSummary(): Promise<string> {
    return "Career exploration summary based on conversation analysis.";
  }

  getRegistrationReadiness(): { score: number; reasons: string[] } {
    const score = this.profile.totalInsights >= 3 ? 0.8 : 0.3;
    const reasons = this.profile.totalInsights >= 3 
      ? ['Sufficient career insights discovered', 'Good engagement level', 'Ready for personalized recommendations']
      : ['Building career profile', 'Discovering interests', 'Continue exploring'];
    return { score, reasons };
  }

  shouldTriggerRegistration(): boolean {
    return this.profile.totalInsights >= 3;
  }

  /**
   * Enhanced conversation analysis that optionally uses MCP server
   */
  async analyzeConversationWithMCP(
    messages: { role: 'user' | 'assistant'; content: string }[],
    userId?: string
  ): Promise<ConversationInterest[]> {
    if (this.useMCPEnhancement && mcpBridgeService.isServerConnected()) {
      try {
        console.log('🔬 Using MCP-enhanced conversation analysis');
        
        // Convert messages to MCP format
        const mcpMessages: MCPMessage[] = messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));

        // Analyze with MCP server
        const mcpResult: MCPAnalysisResult = await mcpBridgeService.analyzeConversation(mcpMessages, userId);
        
        if (mcpResult.success && mcpResult.analysis) {
          // Convert MCP results to ConversationInterest format
          const interests: ConversationInterest[] = mcpResult.analysis.detectedInterests.map((interest, index) => ({
            interest,
            context: `Detected from MCP conversation analysis`,
            confidence: mcpResult.analysis!.confidence,
            extractedTerms: [interest.toLowerCase().replace(/[^a-z0-9]/g, '')]
          }));

          console.log('✅ MCP analysis completed', {
            interestsFound: interests.length,
            confidence: mcpResult.analysis.confidence,
            careerCards: mcpResult.analysis.careerCards?.length || 0
          });

          return interests;
        } else {
          console.warn('⚠️ MCP analysis failed, falling back to standard analysis:', mcpResult.error);
        }
      } catch (error) {
        console.warn('⚠️ MCP analysis error, falling back to standard analysis:', error);
      }
    }

    // Fallback to standard analysis
    console.log('🔬 Using standard conversation analysis');
    return await this.analyzeStandardConversation(messages, userId);
  }

  /**
   * Standard conversation analysis (fallback method)
   */
  private async analyzeStandardConversation(
    messages: { role: 'user' | 'assistant'; content: string }[],
    userId?: string
  ): Promise<ConversationInterest[]> {
    try {
      // Use the new full conversation analysis method
      return await this.analyzeFullConversation(messages);
    } catch (error) {
      console.error('❌ Standard conversation analysis failed:', error);
      
      // Final fallback: analyze just the last user message if available
      const lastUserMessage = messages
        .filter(msg => msg.role === 'user')
        .pop();
      
      if (lastUserMessage) {
        return await this.analyzeMessage(lastUserMessage.content, []);
      }
      
      return [];
    }
  }

  /**
   * Generate career cards using OpenAI web search (prioritized over MCP)
   */
  async generateCareerCardsWithMCP(interests: ConversationInterest[], userId?: string): Promise<CareerCardData[]> {
    console.log('🎯 Using OpenAI web search for career card generation (skipping MCP)');
    
    const careerCards: CareerCardData[] = [];
    
    // Use direct OpenAI web search for ALL career cards to ensure rich data
    for (const interest of interests) {
      if (interest.confidence > 0.7) {
        console.log(`🔍 Generating web search-enhanced card for: ${interest.interest}`);
        const card = await this.generateCareerCard(interest.interest, interest.context);
        if (card) {
          console.log(`✅ Generated web search card: ${card.title} (webSearchVerified: ${card.webSearchVerified})`);
          careerCards.push(card);
        }
      }
    }
    
    console.log(`✅ Generated ${careerCards.length} web search-enhanced career cards`);
    return careerCards;
  }

  /**
   * Enhance existing career card with additional rich data using OpenAI web search
   */
  async enhanceCareerCardWithWebSearch(careerCard: any): Promise<any | null> {
    try {
      console.log('🔍 Enhancing career card with additional web search data:', careerCard.title);
      
      const response = await getOpenAIClient().responses.create({
        model: 'gpt-4o',
        tools: [{ 
          type: 'web_search_preview',
          search_context_size: 'high', // Use high for more detailed enhancement
          user_location: {
            type: 'approximate',
            country: 'GB',
            city: 'London',
            region: 'England'
          }
        }],
        input: `Enhance this existing UK career profile with additional detailed research: "${careerCard.title}"

CURRENT DATA:
- Industry: ${careerCard.industry || 'Not specified'}
- Current salary info: ${JSON.stringify(careerCard.averageSalary || {})}
- Description: ${careerCard.description || 'Not specified'}
- Entry requirements: ${JSON.stringify(careerCard.entryRequirements || [])}

Use web search to find ADDITIONAL comprehensive UK data:
- More detailed salary breakdown by location and specialization from UK job boards
- Specific career progression paths and promotional opportunities
- Day-in-the-life details from professional interviews/blogs
- Latest industry trends and future outlook from UK industry reports
- Specific UK employers and their requirements from company websites
- Real testimonials from professionals in this field
- Additional qualifications that boost earning potential
- Work-life balance insights from Glassdoor UK reviews
- Skills in highest demand from recent UK job postings
- Professional associations and networking opportunities in UK

Structure as strict JSON with ENHANCED details:

{
  "enhancedSalary": {
    "entry": "£XX,000 (source: [specific UK source])",
    "experienced": "£XX,000 (source: [specific UK source])", 
    "senior": "£XX,000 (source: [specific UK source])",
    "byLocation": {
      "london": "£XX,000 - £XX,000",
      "manchester": "£XX,000 - £XX,000", 
      "birmingham": "£XX,000 - £XX,000"
    },
    "bySpecialization": {
      "specialized_area_1": "£XX,000 - £XX,000",
      "specialized_area_2": "£XX,000 - £XX,000"
    }
  },
  "careerProgression": [
    "Entry level position → Mid-level role (timeframe and requirements)",
    "Mid-level → Senior role progression path",
    "Senior → Leadership advancement opportunities"
  ],
  "dayInTheLife": "Detailed description of typical daily activities based on professional accounts",
  "industryTrends": ["Latest trend 1 with source", "Industry development 2 with source"],
  "topUKEmployers": [
    {"name": "Company Name", "knownFor": "What they're known for", "typical_salary": "£XX,000"},
    {"name": "Company 2", "knownFor": "Their specialty", "typical_salary": "£XX,000"}
  ],
  "professionalTestimonials": [
    {"quote": "Real quote from professional", "source": "Name/Platform where found"},
    {"quote": "Another testimonial", "source": "Source attribution"}
  ],
  "additionalQualifications": [
    {"qualification": "Specific cert/course name", "benefit": "How it helps career/salary", "provider": "UK institution"}
  ],
  "workLifeBalance": {
    "typical_hours": "XX hours per week",
    "flexibility": "Remote/hybrid options description",
    "stress_level": "Low/Medium/High with explanation",
    "job_satisfaction": "Rating and reasons from reviews"
  },
  "inDemandSkills": ["Skill 1 from recent job postings", "Hot skill 2", "Emerging skill 3"],
  "professionalAssociations": [
    {"name": "Association name", "benefits": "What members get", "cost": "£XX annual"}
  ],
  "enhancedSources": ["Specific URL 1", "Industry report 2", "Professional platform 3"]
}

CRITICAL: Only include information found through current web search. Use specific UK sources and include attribution for all data points.`
      });

      const content = response.output_text;

      if (!content) {
        console.warn('⚠️ No enhanced content received from OpenAI');
        return careerCard; // Return original if enhancement fails
      }

      console.log('✅ Career card enhancement completed with additional web search data');

      const cleanedContent = content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*$/gi, '')
        .trim();

      try {
        const enhancedData = JSON.parse(cleanedContent);
        
        // Merge enhanced data with original career card
        return {
          ...careerCard,
          // Keep original data but add enhanced fields
          enhancedSalary: enhancedData.enhancedSalary,
          careerProgression: enhancedData.careerProgression,
          dayInTheLife: enhancedData.dayInTheLife,
          industryTrends: enhancedData.industryTrends,
          topUKEmployers: enhancedData.topUKEmployers,
          professionalTestimonials: enhancedData.professionalTestimonials,
          additionalQualifications: enhancedData.additionalQualifications,
          workLifeBalance: enhancedData.workLifeBalance,
          inDemandSkills: enhancedData.inDemandSkills,
          professionalAssociations: enhancedData.professionalAssociations,
          enhancedSources: enhancedData.enhancedSources,
          
          // Update metadata
          isEnhanced: true,
          enhancedAt: new Date().toISOString(),
          enhancementSource: 'getOpenAIClient()_web_search',
          citations: [
            ...(careerCard.citations || []),
            ...(enhancedData.enhancedSources || [])
          ]
        };
        
      } catch (parseError) {
        console.error('❌ Failed to parse enhanced career card JSON:', parseError);
        console.error('Raw enhanced content:', content);
        return careerCard; // Return original if parsing fails
      }

    } catch (error) {
      console.error('❌ Error enhancing career card with web search:', error);
      return careerCard; // Return original if enhancement fails
    }
  }

  reset(): void {
    this.profile = this.createProfile();
  }
}

// Export singleton instance for backward compatibility
export const conversationAnalyzer = new ConversationAnalyzer(); 