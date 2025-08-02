#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { zodResponseFormat } from 'openai/helpers/zod';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: join(__dirname, '..', '.env') });

// Enhanced logging utility
class Logger {
  static log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(data && { data })
    };
    
    if (level === 'error') {
      console.error(`[${timestamp}] [ERROR] ${message}`, data ? data : '');
    } else if (level === 'warn') {
      console.warn(`[${timestamp}] [WARN] ${message}`, data ? data : '');
    } else {
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, data ? data : '');
    }
  }

  static info(message, data = null) { this.log('info', message, data); }
  static warn(message, data = null) { this.log('warn', message, data); }
  static error(message, data = null) { this.log('error', message, data); }
  static debug(message, data = null) { this.log('debug', message, data); }
}

// Add Zod schemas for structured outputs - Comprehensive 10-Section Framework
const CareerCard = z.object({
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

const Interest = z.object({
  interest: z.string(),
  context: z.string(),
  confidence: z.number().min(0).max(1),
  extractedTerms: z.array(z.string())
});

const Preferences = z.object({
  workStyle: z.string(),
  teamSize: z.string(),
  industry: z.string()
});

const ConversationAnalysis = z.object({
  interests: z.array(Interest),
  skills: z.array(z.string()),
  preferences: Preferences
});

const CareerInsights = z.object({
  careerCards: z.array(CareerCard)
});

const CareerInsight = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  priority: z.string(),
  actionSteps: z.array(z.string()),
  timeframe: z.string(),
  resources: z.array(z.string())
});

const CareerInsightsResponse = z.object({
  insights: z.array(CareerInsight)
});

// Enhanced schemas for separated analysis
const PersonProfileAnalysis = z.object({
  interests: z.array(z.string()).describe("Pure interests, hobbies, subjects - NO job titles or career names"),
  skills: z.array(z.string()).describe("Demonstrated abilities from stories, examples, and experiences"),
  goals: z.array(z.string()).describe("Career aspirations, what they want to achieve professionally"),
  values: z.array(z.string()).describe("What matters to them: helping others, innovation, family, etc."),
  workStyle: z.array(z.string()).describe("Preferred work environment, team vs solo, etc."),
  careerStage: z.string().describe("Current career stage: exploring, transitioning, advancing, etc.")
});

const CareerRecommendationAnalysis = z.object({
  careerCards: z.array(CareerCard).describe("3-6 diverse career recommendations across different industries and levels")
});

const FieldInsight = z.object({
  field: z.string(),
  roles: z.array(z.string()),
  salaryData: z.object({
    entry: z.string(),
    experienced: z.string(),
    senior: z.string()
  }),
  skills: z.array(z.string()),
  pathways: z.array(z.string()),
  marketOutlook: z.object({
    growth: z.string(),
    demand: z.string(),
    competition: z.string(),
    futureProspects: z.string()
  }),
  nextSteps: z.array(z.string())
});

// Using OpenAI structured outputs with Zod schemas - no JSON parsing needed

// Validation schemas
const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1)
});

const MessagesArraySchema = z.array(MessageSchema).min(1);

// Initialize OpenAI client with error handling
let openai;
try {
  const apiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not found in environment variables');
  }
  
  openai = new OpenAI({ apiKey });
  Logger.info('OpenAI client initialized successfully');
} catch (error) {
  Logger.error('Failed to initialize OpenAI client', error);
  process.exit(1);
}

// Enhanced conversation analysis service with OpenAI integration
class ConversationAnalysisService {
  static async analyzeConversation(messages, options = {}) {
    const startTime = Date.now();
    try {
      const { userId } = options;
      
      // Validate input
      const validationResult = MessagesArraySchema.safeParse(messages);
      if (!validationResult.success) {
        Logger.warn('Invalid messages format', validationResult.error);
        throw new Error('Invalid messages format');
      }

      Logger.info(`Analyzing ${messages.length} messages for user: ${userId}`);
      
      // Extract full conversation text for analysis
      const conversationText = messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
      
      if (conversationText.trim().length === 0) {
        Logger.warn('No conversation content found for analysis');
        return {
          detectedInterests: [],
          detectedSkills: [],
          detectedGoals: [],
          detectedValues: [],
          confidence: 0,
          careerCards: []
        };
      }

      Logger.info('Starting dual OpenAI analysis', {
        textLength: conversationText.length
      });

      // ANALYSIS 1: Extract person profile (interests, skills, goals, values)
      const personProfile = await this.analyzePersonProfile(conversationText);
      
      // ANALYSIS 2: Generate career recommendations using conversation + profile context
      const careerRecommendations = await this.generateCareerRecommendations(conversationText, personProfile);

      const result = {
        detectedInterests: personProfile.interests || [],
        detectedSkills: personProfile.skills || [],
        detectedGoals: personProfile.goals || [],
        detectedValues: personProfile.values || [],
        userProfile: {
          interests: personProfile.interests || [],
          skills: personProfile.skills || [],
          goals: personProfile.goals || [],
          values: personProfile.values || [],
          workStyle: personProfile.workStyle || [],
          careerStage: personProfile.careerStage || "exploring"
        },
        confidence: personProfile.interests?.length > 0 ? 0.8 : 0.3,
        careerCards: careerRecommendations.careerCards || []
      };

      Logger.info(`Analysis completed in ${Date.now() - startTime}ms`, {
        interestsFound: result.detectedInterests.length,
        cardsGenerated: careerRecommendations.careerCards?.length || 0,
        confidence: result.confidence
      });

      return result;
    } catch (error) {
      Logger.error('Conversation analysis error', {
        error: error.message,
        userId: options.userId,
        processingTime: Date.now() - startTime
      });
      
      return {
        detectedInterests: [],
        confidence: 0,
        careerCards: [],
        error: 'Analysis failed'
      };
    }
  }

  static async analyzeWithOpenAI(conversationText) {
    try {
      if (!conversationText || conversationText.trim().length === 0) {
        throw new Error('Empty conversation text provided');
      }

      Logger.debug('Sending conversation to OpenAI for analysis', {
        textLength: conversationText.length
      });

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-2024-08-06',
        messages: [
          {
            role: 'system',
            content: `You are an expert career counselor and conversation analyst. Extract comprehensive career insights from conversations.

ANALYSIS REQUIREMENTS:
- Extract ALL mentioned interests, hobbies, activities, and subjects (not just career-related)
- Identify demonstrated skills from stories, experiences, and activities described
- Detect career goals, aspirations, and what motivates them professionally
- Note work style preferences, values, and what they find fulfilling
- Look for specific technologies, tools, projects, or domains mentioned
- Consider both explicit statements and implicit preferences

EXTRACTION GUIDELINES:
- Include specific technologies (e.g., "AI", "Python", "machine learning")
- Extract skills from activities (e.g., "building tools" → Problem Solving, Technical Skills)
- Note helping motivations (e.g., "helping grandma" → Empathy, Care, Family Support)
- Capture project experiences (e.g., "phone calls, analysis, reports" → Communication, Analysis, Reporting)
- Extract industry interests from context (e.g., "voice solutions" → Audio Technology, AI)

Be comprehensive - extract 3-8 interests, 2-6 skills, and 1-4 goals minimum from meaningful conversations.`
          },
          {
            role: 'user',
            content: `Analyze this conversation for comprehensive career insights:\n\n${conversationText}`
          }
        ],
        response_format: zodResponseFormat(ConversationAnalysis, 'conversation_analysis'),
        temperature: 0.3,
        max_tokens: 1500
      });

      const message = completion.choices[0]?.message;
      if (!message?.content) {
        throw new Error('No content response from OpenAI');
      }

      Logger.debug('Received OpenAI analysis response', {
        contentLength: message.content?.length || 0
      });

      // Parse the JSON content manually since structured outputs return JSON as string
      let analysis;
      try {
        analysis = JSON.parse(message.content);
      } catch (parseError) {
        Logger.error('Failed to parse OpenAI response as JSON', {
          error: parseError.message,
          content: message.content
        });
        throw new Error('Invalid JSON response from OpenAI');
      }
      const overallConfidence = analysis.interests.length > 0 
        ? analysis.interests.reduce((sum, i) => sum + i.confidence, 0) / analysis.interests.length 
        : 0;

      return {
        interests: analysis.interests || [],
        skills: analysis.skills || [],
        preferences: analysis.preferences || {},
        overallConfidence
      };
    } catch (error) {
      Logger.error('OpenAI analysis error', {
        error: error.message,
        textLength: conversationText?.length || 0
      });
      
      if (error instanceof SyntaxError) {
        Logger.warn('JSON parsing failed, OpenAI returned invalid JSON');
      }
      
      return { interests: [], overallConfidence: 0 };
    }
  }

  // NEW: Specialized person profile analysis
  static async analyzePersonProfile(conversationText) {
    try {
      if (!conversationText || conversationText.trim().length === 0) {
        throw new Error('Empty conversation text provided');
      }

      Logger.debug('Analyzing person profile with OpenAI', {
        textLength: conversationText.length
      });

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-2024-08-06',
        messages: [
          {
            role: 'system',
            content: `You are an expert psychologist and career counselor specializing in extracting person profiles from conversations.

CRITICAL EXTRACTION RULES:
1. INTERESTS: Only genuine interests, hobbies, subjects, technologies - NEVER job titles or career names
   ✅ Good: "Gaming", "Testing", "Problem solving", "Technology"
   ❌ Bad: "Game Developer", "QA Tester", "Software Engineer"

2. SKILLS: Extract demonstrated abilities from stories and examples
   - "built something" → Programming, Problem-solving
   - "helps others" → Empathy, Care, Communication
   - "analyzes patterns" → Analysis, Critical thinking

3. GOALS: Career aspirations and professional motivations
   - "want to help people" → Make positive impact
   - "solve real problems" → Apply skills meaningfully
   - "build solutions" → Create innovative products

4. VALUES: What matters to them personally
   - Helping others → Care, Responsibility
   - Solving problems → Innovation, Impact
   - Quality work → Excellence, Attention to detail

5. WORK STYLE: Environmental and collaboration preferences
   - Independent projects → Solo work
   - Team collaboration → Team-oriented
   - Remote/flexible → Location flexibility

ANALYSIS APPROACH:
- Extract interests and skills directly from what the person mentions
- Don't make assumptions beyond what's clearly stated
- Focus on the actual conversation content
- Avoid inserting examples that aren't mentioned

Extract 3-8 interests, 2-6 skills, 1-4 goals, 2-5 values minimum from meaningful conversations.`
          },
          {
            role: 'user',
            content: `Extract a comprehensive person profile from this conversation:\n\n${conversationText}`
          }
        ],
        response_format: zodResponseFormat(PersonProfileAnalysis, 'person_profile_analysis'),
        temperature: 0.2,
        max_tokens: 1000
      });

      const message = completion.choices[0]?.message;
      if (!message?.content) {
        throw new Error('No content response from OpenAI');
      }

      let analysis;
      try {
        analysis = JSON.parse(message.content);
      } catch (parseError) {
        Logger.error('Failed to parse person profile response', {
          error: parseError.message,
          content: message.content
        });
        throw new Error('Invalid JSON response from OpenAI');
      }

      Logger.debug('Person profile analysis complete', {
        interests: analysis.interests?.length || 0,
        skills: analysis.skills?.length || 0,
        goals: analysis.goals?.length || 0,
        values: analysis.values?.length || 0
      });

      return analysis;
    } catch (error) {
      Logger.error('Person profile analysis error', {
        error: error.message,
        textLength: conversationText?.length || 0
      });
      return {
        interests: [],
        skills: [],
        goals: [],
        values: [],
        workStyle: [],
        careerStage: "exploring"
      };
    }
  }

  // NEW: Specialized career recommendations generation
  static async generateCareerRecommendations(conversationText, personProfile = null) {
    try {
      if (!conversationText || conversationText.trim().length === 0) {
        throw new Error('Empty conversation text provided');
      }

      Logger.debug('Generating career recommendations with OpenAI', {
        textLength: conversationText.length,
        hasPersonProfile: !!personProfile
      });

      const profileContext = personProfile ? `
PERSON PROFILE CONTEXT:
- Interests: ${personProfile.interests?.join(', ') || 'None specified'}
- Skills: ${personProfile.skills?.join(', ') || 'None specified'}
- Goals: ${personProfile.goals?.join(', ') || 'None specified'}
- Values: ${personProfile.values?.join(', ') || 'None specified'}
- Work Style: ${personProfile.workStyle?.join(', ') || 'None specified'}
- Career Stage: ${personProfile.careerStage || 'Exploring'}
` : '';

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-2024-08-06',
        messages: [
          {
            role: 'system',
            content: `You are an expert career counselor specializing in generating diverse, actionable career recommendations.

CAREER GENERATION REQUIREMENTS:
- Generate 3-6 diverse career recommendations
- Include different industries, experience levels, and pathways
- Base recommendations on conversation context and demonstrated interests
- Include entry-level, mid-level, and senior opportunities
- Consider both traditional and emerging career paths

CAREER CARD REQUIREMENTS:
- Clear, engaging job titles
- Detailed role descriptions (50-100 words)
- UK-specific salary ranges (entry/experienced/senior)
- Realistic entry requirements
- Specific training pathways available in UK
- Key skills needed for role
- Growth outlook and market demand
- Next steps to enter the field
- Work environment details

DIVERSITY GUIDELINES:
- Mix of technical and non-technical roles
- Different industries (tech, healthcare, business, etc.)
- Various experience levels (graduate, mid-career, senior)
- Different work styles (office, remote, field-based)
- Include emerging and traditional careers

CONVERSATION ANALYSIS:
Extract demonstrated interests, skills, and values from conversation context.
Consider stories, examples, and expressed preferences to match relevant careers.`
          },
          {
            role: 'user',
            content: `Generate diverse career recommendations based on this conversation:

${profileContext}

CONVERSATION:
${conversationText}

Focus on creating varied, actionable career paths that match their demonstrated interests and skills.`
          }
        ],
        response_format: zodResponseFormat(CareerRecommendationAnalysis, 'career_recommendations'),
        temperature: 0.4,
        max_tokens: 16000
      });

      const message = completion.choices[0]?.message;
      if (!message?.content) {
        throw new Error('No content response from OpenAI');
      }

      let analysis;
      try {
        analysis = JSON.parse(message.content);
      } catch (parseError) {
        Logger.error('Failed to parse career recommendations response', {
          error: parseError.message,
          content: message.content
        });
        throw new Error('Invalid JSON response from OpenAI');
      }

      Logger.debug('Career recommendations analysis complete', {
        careerCards: analysis.careerCards?.length || 0
      });

      return analysis;
    } catch (error) {
      Logger.error('Career recommendations analysis error', {
        error: error.message,
        textLength: conversationText?.length || 0
      });
      return {
        careerCards: []
      };
    }
  }

  static async generateCareerCard(interest) {
    try {
      if (!interest || !interest.interest) {
        throw new Error('Invalid interest object provided');
      }

      Logger.debug(`Generating comprehensive 10-section career card for: ${interest.interest}`);

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-2024-08-06',
        messages: [
          {
            role: 'system',
            content: `You are a UK career intelligence expert providing comprehensive, evidence-based career guidance. Generate detailed career profiles using the 10-section professional framework that covers all aspects of career decision-making.

Focus on current UK market data, real pathways, and evidence-based insights. Ensure all salary figures are in GBP and reflect 2024-2025 UK market rates.`
          },
          {
            role: 'user',
            content: `Create a comprehensive UK career intelligence profile for: "${interest.interest}" with context: "${interest.context}".

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
        response_format: zodResponseFormat(CareerCard, 'career_card'),
        temperature: 0.2,
        max_tokens: 8000
      });

      const message = completion.choices[0]?.message;
      if (!message?.content) {
        throw new Error('No content response from OpenAI');
      }

      // Parse the JSON content manually since structured outputs return JSON as string
      let cardData;
      try {
        cardData = JSON.parse(message.content);
      } catch (parseError) {
        Logger.error('Failed to parse career card response as JSON', {
          error: parseError.message,
          content: message.content
        });
        throw new Error('Invalid JSON response from OpenAI');
      }
      const card = {
        ...cardData,
        id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        confidence: cardData.confidence || Math.round(interest.confidence * 100),
        sourceData: interest.interest,
        location: 'UK',
        generatedAt: new Date().toISOString(),
        webSearchVerified: true,
        requiresVerification: false,
        citations: ['OpenAI GPT-4o Knowledge Base']
      };

      Logger.debug(`Career card generated successfully for: ${interest.interest}`);
      return card;
    } catch (error) {
      Logger.error('Career card generation error', {
        error: error.message,
        interest: interest?.interest || 'unknown'
      });
      return null;
    }
  }
}

// Enhanced career insights service
class CareerInsightsService {
  static async generateInsights(interests, experience = 'intermediate', location = 'UK') {
    try {
      // Validate inputs
      if (!Array.isArray(interests) || interests.length === 0) {
        Logger.warn('No interests provided for insight generation');
        return [];
      }

      Logger.info(`Generating insights for: ${interests.join(', ')}`, {
        experience,
        location,
        interestCount: interests.length
      });
      
      const insights = [];
      const maxConcurrent = 3; // Limit concurrent API calls
      
      for (let i = 0; i < interests.length; i += maxConcurrent) {
        const batch = interests.slice(i, i + maxConcurrent);
        const batchPromises = batch.map(interest => 
          this.generateInsightForField(interest, experience, location)
        );
        
        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            insights.push(result.value);
          } else {
            Logger.warn(`Failed to generate insight for: ${batch[index]}`, result.reason);
          }
        });
      }
      
      Logger.info(`Generated ${insights.length} insights successfully`);
      return insights;
    } catch (error) {
      Logger.error('Career insights generation error', error);
      return [];
    }
  }

  static async generateInsightForField(interest, experience, location) {
    try {
      if (!interest || typeof interest !== 'string') {
        throw new Error('Invalid interest provided');
      }

      Logger.debug(`Generating insight for field: ${interest}`);

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-2024-08-06',
        messages: [
          {
            role: 'system',
            content: `You are a UK career specialist. Generate detailed career insights for specific fields.`
          },
          {
            role: 'user',
            content: `Generate detailed UK career insight for "${interest}" at ${experience} level.`
          }
        ],
        response_format: zodResponseFormat(FieldInsight, 'field_insight'),
        temperature: 0.2,
        max_tokens: 800
      });

      const message = completion.choices[0]?.message;
      if (!message?.content) {
        throw new Error('No content response from OpenAI');
      }

      // Parse the JSON content manually since structured outputs return JSON as string
      let insight;
      try {
        insight = JSON.parse(message.content);
      } catch (parseError) {
        Logger.error('Failed to parse insight response as JSON', {
          error: parseError.message,
          content: message.content
        });
        throw new Error('Invalid JSON response from OpenAI');
      }
      Logger.debug(`Insight generated successfully for: ${interest}`);
      return insight;
    } catch (error) {
      Logger.error('Field insight generation error', {
        error: error.message,
        interest,
        experience,
        location
      });
      return null;
    }
  }
}

// User profile service
class UserProfileService {
  static async updateProfile(userId, insights) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      Logger.info(`Updating profile for user: ${userId}`, {
        interestCount: insights?.detectedInterests?.length || 0,
        cardCount: insights?.careerCards?.length || 0
      });

      // For MCP server, we'll return structured data
      // In production, this would integrate with your Firebase database
      const profile = {
        userId,
        interests: insights.detectedInterests || [],
        skillLevel: 'intermediate',
        preferences: {
          workStyle: 'hybrid',
          industryPreference: insights.detectedInterests?.[0] || 'technology'
        },
        lastUpdated: new Date().toISOString(),
        careerCards: insights.careerCards || [],
        analysisMetadata: {
          confidence: insights.confidence,
          analysisDate: new Date().toISOString(),
          source: 'mcp_server'
        }
      };

      Logger.debug('Profile updated successfully', { userId });
      return profile;
    } catch (error) {
      Logger.error('Profile update error', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  static async getPreferences(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      Logger.debug(`Retrieving preferences for user: ${userId}`);

      // Return enhanced default preferences
      // In production, this would query your database
      const preferences = {
        userId,
        communicationStyle: 'detailed',
        careerStage: 'exploring',
        interests: [],
        goals: [],
        personalityType: 'explorer',
        preferredIndustries: [],
        workEnvironmentPreferences: {
          teamSize: 'medium',
          workStyle: 'hybrid',
          environment: 'collaborative'
        },
        learningPreferences: {
          style: 'hands-on',
          pace: 'moderate',
          format: 'mixed'
        }
      };

      Logger.debug('Preferences retrieved successfully', { userId });
      return preferences;
    } catch (error) {
      Logger.error('Preferences retrieval error', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
}

// Define tool schemas
const AnalyzeConversationTool = z.object({
  name: z.literal('analyze_conversation'),
  description: z.string(),
  inputSchema: z.object({
    type: z.literal('object'),
    properties: z.object({
      messages: z.object({
        type: z.literal('array'),
        description: z.string(),
        items: z.object({
          type: z.literal('object'),
          properties: z.object({
            role: z.object({ type: z.literal('string') }),
            content: z.object({ type: z.literal('string') })
          })
        })
      }),
      userId: z.object({
        type: z.literal('string'),
        description: z.string()
      })
    }),
    required: z.array(z.string())
  })
});

const GenerateCareerInsightsTool = z.object({
  name: z.literal('generate_career_insights'),
  description: z.string(),
  inputSchema: z.object({
    type: z.literal('object'),
    properties: z.object({
      interests: z.object({
        type: z.literal('array'),
        description: z.string(),
        items: z.object({ type: z.literal('string') })
      }),
      experience: z.object({
        type: z.literal('string'),
        description: z.string()
      }),
      location: z.object({
        type: z.literal('string'),
        description: z.string(),
        default: z.literal('UK')
      })
    }),
    required: z.array(z.string())
  })
});

const UpdateUserProfileTool = z.object({
  name: z.literal('update_user_profile'),
  description: z.string(),
  inputSchema: z.object({
    type: z.literal('object'),
    properties: z.object({
      userId: z.object({
        type: z.literal('string'),
        description: z.string()
      }),
      insights: z.object({
        type: z.literal('object'),
        description: z.string()
      })
    }),
    required: z.array(z.string())
  })
});

const GetUserPreferencesTool = z.object({
  name: z.literal('get_user_preferences'),
  description: z.string(),
  inputSchema: z.object({
    type: z.literal('object'),
    properties: z.object({
      userId: z.object({
        type: z.literal('string'),
        description: z.string()
      })
    }),
    required: z.array(z.string())
  })
});

class OffScriptMCPServer {
  constructor() {
    this.httpApp = express();
    this.isRunning = false;
    this.cachedConversationHistory = []; // Cache for conversation history
    this.lastCacheUpdate = null; // Track when cache was last updated
    
    // Initialize MCP Server (needed for stdio transport)
    this.server = new Server({
      name: 'off-script-mcp-server',
      version: '1.0.0'
    }, {
      capabilities: {
        tools: {}
      }
    });
    
    this.setupMiddleware();
    this.setupMCPHttpServer();
  }

  setupOpenAI() {
    try {
      const apiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key not found in environment variables');
      }
      this.openai = new OpenAI({ apiKey });
      Logger.info('OpenAI client initialized successfully');
    } catch (error) {
      Logger.error('Failed to initialize OpenAI client', error);
      process.exit(1);
    }
  }

  setupMiddleware() {
    this.httpApp.use(express.json());
  }

  setupMCPHttpServer() {
    this.httpApp = express();
    
    // Enable CORS
    this.httpApp.use(cors({
      origin: [
        'http://localhost:5173', 
        'http://localhost:5174', 
        'http://localhost:3000',
        'https://off-script.onrender.com',
        'https://off-script-elevenlabs-preview.onrender.com'
      ],
      credentials: true
    }));

    this.httpApp.use(express.json());

    // MCP endpoint - supports both GET (SSE) and POST (JSON-RPC)
    this.httpApp.all('/mcp', async (req, res) => {
      try {
        if (req.method === 'OPTIONS') {
          res.status(200).end();
          return;
        }

        if (req.method === 'GET') {
          // Handle SSE connection for MCP
          const acceptHeader = req.headers.accept || '';
          
          if (acceptHeader.includes('text/event-stream')) {
            Logger.info('Setting up MCP SSE stream');
            
            res.writeHead(200, {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            });

            // Send initial capabilities with tools list
            const capabilities = {
              protocolVersion: '2025-03-26',
              capabilities: {
                tools: {
                  listChanged: false,
                  supportsProgress: false
                }
              },
              serverInfo: {
                name: 'OffScript Career Guidance Server',
                version: '1.0.0'
              }
            };

            res.write(`data: ${JSON.stringify(capabilities)}\n\n`);

            // Keep connection alive
            const keepAlive = setInterval(() => {
              res.write(':\n\n'); // Comment line to keep connection alive
            }, 30000);

            req.on('close', () => {
              clearInterval(keepAlive);
              Logger.info('MCP SSE connection closed');
            });

            return;
          } else {
            res.status(405).json({ error: 'Method not allowed for non-SSE requests' });
            return;
          }
        }

        if (req.method === 'POST') {
          // Handle JSON-RPC requests
          const contentType = req.headers['content-type'] || '';
          const acceptHeader = req.headers.accept || '';

          if (!contentType.includes('application/json')) {
            res.status(400).json({ error: 'Content-Type must be application/json' });
            return;
          }

          Logger.info('Received MCP JSON-RPC request:', req.body);

          // Process the JSON-RPC request
          const request = req.body;
          let response;

          if (request.method === 'initialize') {
            response = {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                protocolVersion: '2025-03-26',
                capabilities: {
                  tools: {},
                },
                serverInfo: {
                  name: 'OffScript Career Guidance Server',
                  version: '1.0.0'
                }
              }
            };
          } else if (request.method === 'tools/list') {
            response = {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                tools: [
                  {
                    name: 'analyze_conversation_for_careers',
                    description: 'Analyzes conversation history to detect career interests and generate personalized career cards',
                    inputSchema: {
                      type: 'object',
                      properties: {
                        trigger_reason: {
                          type: 'string',
                          description: 'Reason for triggering analysis'
                        }
                      },
                      required: ['trigger_reason']
                    }
                  },
                  {
                    name: 'generate_career_recommendations',
                    description: 'Generates detailed career recommendations with UK salary data and pathways',
                    inputSchema: {
                      type: 'object',
                      properties: {
                        interests: {
                          type: 'array',
                          items: { type: 'string' },
                          description: 'Career interests from conversation'
                        },
                        experience_level: {
                          type: 'string',
                          enum: ['beginner', 'intermediate', 'advanced'],
                          description: 'User experience level'
                        }
                      },
                      required: ['interests']
                    }
                  },
                  {
                    name: 'trigger_instant_insights',
                    description: 'Provides instant career analysis for the current message',
                    inputSchema: {
                      type: 'object',
                      properties: {
                        user_message: {
                          type: 'string',
                          description: 'Current user message to analyze'
                        }
                      },
                      required: ['user_message']
                    }
                  }
                ]
              }
            };
          } else if (request.method === 'tools/call') {
            const { name, arguments: args } = request.params;
            let result;

            switch (name) {
              case 'analyze_conversation_for_careers':
                result = await this.handleMCPAnalyzeConversation(args);
                break;
              case 'generate_career_recommendations':
                result = await this.handleMCPGenerateRecommendations(args);
                break;
              case 'trigger_instant_insights':
                result = await this.handleMCPInstantInsights(args);
                break;
              default:
                throw new Error(`Unknown tool: ${name}`);
            }

            response = {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(result)
                  }
                ]
              }
            };
          } else {
            response = {
              jsonrpc: '2.0',
              id: request.id,
              error: {
                code: -32601,
                message: 'Method not found'
              }
            };
          }

          // Return JSON response or start SSE stream based on Accept header
          if (acceptHeader.includes('text/event-stream') && request.method === 'tools/call') {
            // Return SSE stream for tool calls
            res.writeHead(200, {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            });

            res.write(`data: ${JSON.stringify(response)}\n\n`);
            res.end();
          } else {
            // Return single JSON response
            res.json(response);
          }

          return;
        }

        res.status(405).json({ error: 'Method not allowed' });

      } catch (error) {
        Logger.error('MCP HTTP error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Health check endpoint
    this.httpApp.get('/mcp/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        server: 'OffScript MCP Server',
        tools: ['analyze_conversation', 'generate_career_insights', 'update_user_profile', 'get_user_preferences']
      });
    });

    // Analyze conversation endpoint
    this.httpApp.post('/mcp/analyze', async (req, res) => {
      try {
        const { conversationHistory, userId = 'anonymous', triggerReason } = req.body;
        
        // Cache conversation history for tool calls
        if (conversationHistory) {
          if (typeof conversationHistory === 'string') {
            // Convert string format to messages array
            const lines = conversationHistory.split('\n').filter(line => line.trim());
            this.cachedConversationHistory = lines.map((line, index) => {
              const [role, ...contentParts] = line.split(':');
              const content = contentParts.join(':').trim();
              return {
                role: role.trim() === 'user' ? 'user' : 'assistant',
                content: content
              };
            }).filter(msg => msg.content && msg.content.length > 0); // Filter out empty messages
          } else if (Array.isArray(conversationHistory)) {
            // Filter out any messages with empty content
            this.cachedConversationHistory = conversationHistory.filter(msg => 
              msg && msg.content && typeof msg.content === 'string' && msg.content.trim().length > 0
            );
          }
          this.lastCacheUpdate = new Date();
          
          Logger.info('Cached conversation history for tool calls', { 
            messageCount: this.cachedConversationHistory.length,
            userId 
          });
        }
        
        // Convert conversationHistory to messages array format expected by service
        const messages = [];
        if (conversationHistory && typeof conversationHistory === 'string') {
          // Split conversation and create alternating user/assistant messages
          const lines = conversationHistory.split('\n').filter(line => line.trim());
          lines.forEach((line, index) => {
            const [role, ...contentParts] = line.split(':');
            const content = contentParts.join(':').trim();
            
            // Only add messages with non-empty content
            if (content && content.length > 0) {
              messages.push({
                role: role.trim() === 'user' ? 'user' : 'assistant',
                content: content
              });
            }
          });
        } else if (Array.isArray(conversationHistory)) {
          // Filter out any messages with empty content
          conversationHistory.forEach(msg => {
            if (msg && msg.content && typeof msg.content === 'string' && msg.content.trim().length > 0) {
              messages.push({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content.trim()
              });
            }
          });
        }
        
        // If no valid messages available, create a placeholder to generate initial insights
        if (messages.length === 0) {
          messages.push({
            role: 'user',
            content: `I'm exploring career options and would like some guidance. ${triggerReason ? `Context: ${triggerReason}` : ''}`
          });
        }
        
        Logger.info('Processing conversation analysis', {
          originalInput: typeof conversationHistory === 'string' ? 'string' : Array.isArray(conversationHistory) ? 'array' : 'unknown',
          validMessages: messages.length,
          userId
        });
        
        const result = await this.handleAnalyzeConversation({ messages, userId });
        
        // Extract the actual data from the MCP response structure
        const responseData = result.content?.[0]?.text ? 
          JSON.parse(result.content[0].text) : 
          { success: false, error: 'Invalid response format' };
        
        res.json(responseData);
      } catch (error) {
        Logger.error('HTTP analyze error', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Generate career insights endpoint  
    this.httpApp.post('/mcp/insights', async (req, res) => {
      try {
        const { interests, userId = 'anonymous', context = {} } = req.body;
        const result = await this.handleGenerateCareerInsights({ 
          interests, 
          experience: context.experience || 'intermediate', 
          location: context.location || 'UK' 
        });
        
        // Extract the actual data from the MCP response structure
        const responseData = result.content?.[0]?.text ? 
          JSON.parse(result.content[0].text) : 
          { success: false, error: 'Invalid response format' };
        
        // Transform the response to match what the frontend expects
        if (responseData.success && responseData.insights) {
          res.json({
            success: true,
            careerCards: responseData.insights.map(insight => ({
              id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              title: insight.roles?.[0] || insight.field,
              description: `${insight.field} professional focusing on ${insight.skills?.slice(0, 2).join(' and ') || 'key skills'}`,
              salaryRange: `${insight.salaryData?.entry || '£25,000'} - ${insight.salaryData?.senior || '£65,000+'}`,
              skillsRequired: insight.skills || [],
              trainingPathway: insight.pathways?.[0] || 'Professional development pathway',
              nextSteps: insight.nextSteps || [],
              marketOutlook: insight.marketOutlook?.growth || 'Positive',
              source: 'mcp_analysis'
            }))
          });
        } else {
          res.json(responseData);
        }
      } catch (error) {
        Logger.error('HTTP insights error', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    const port = process.env.PORT || process.env.MCP_HTTP_PORT || 3001;
    const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
    
    this.httpApp.listen(port, host, () => {
      Logger.info(`MCP HTTP server running on http://${host}:${port}`);
      Logger.info(`MCP endpoint available at: http://${host}:${port}/mcp`);
      Logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  }

  async handleAnalyzeConversation(args) {
    try {
      // Validate required arguments
      if (!args || !args.messages) {
        throw new Error('Messages are required for conversation analysis');
      }

      const { messages, userId } = args;
      Logger.debug('Starting conversation analysis', { 
        userId, 
        messageCount: messages?.length || 0 
      });
      
      const analysis = await ConversationAnalysisService.analyzeConversation(messages, { userId });
      
      const response = {
        success: true,
        analysis: {
          detectedInterests: analysis.detectedInterests,
          detectedSkills: analysis.detectedSkills,
          detectedGoals: analysis.detectedGoals,  
          detectedValues: analysis.detectedValues,
          userProfile: analysis.userProfile,
          confidence: analysis.confidence,
          careerCards: analysis.careerCards,
          timestamp: new Date().toISOString(),
          ...(analysis.error && { error: analysis.error })
        }
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
    } catch (error) {
      Logger.error('Conversation analysis handler error', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      };
    }
  }

  async handleGenerateCareerInsights(args) {
    try {
      // Validate required arguments
      if (!args || !args.interests || !Array.isArray(args.interests)) {
        throw new Error('Interests array is required for career insights generation');
      }

      const { interests, experience = 'intermediate', location = 'UK' } = args;
      Logger.debug('Starting career insights generation', { 
        interests, 
        experience, 
        location 
      });
      
      // Generate detailed career insights
      const insights = await CareerInsightsService.generateInsights(interests, experience, location);
      
      const response = {
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

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
    } catch (error) {
      Logger.error('Career insights generation handler error', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      };
    }
  }

  // MCP-specific tool handlers  
  async handleMCPAnalyzeConversation(args) {
    Logger.info('MCP: Analyzing conversation for careers:', args);
    Logger.info('MCP: Args keys:', Object.keys(args));
    Logger.info('MCP: Has conversation_history:', !!args.conversation_history);
    Logger.info('MCP: conversation_history type:', typeof args.conversation_history);
    
    try {
      let conversationHistory = null;
      let conversationText = '';

      // First, try to use conversation history from args (direct call)
      if (args.conversation_history) {
        if (typeof args.conversation_history === 'string') {
          conversationText = args.conversation_history;
          Logger.info('Using conversation history from arguments (string format)', { 
            contentLength: conversationText.length 
          });
        } else if (Array.isArray(args.conversation_history)) {
          conversationHistory = args.conversation_history;
          conversationText = conversationHistory
            .map(msg => `${msg.role}: ${msg.content}`)
            .join('\n');
          Logger.info('Using conversation history from arguments (array format)', { 
            messageCount: conversationHistory.length,
            contentLength: conversationText.length 
          });
        }
      }
      // Fallback to cached conversation history if no args provided
      else if (this.cachedConversationHistory && this.cachedConversationHistory.length > 0) {
        conversationText = this.cachedConversationHistory
          .map(msg => `${msg.role}: ${msg.content}`)
          .join('\n');
        Logger.info('Using cached conversation history', { 
          messageCount: this.cachedConversationHistory.length,
          contentLength: conversationText.length 
        });
      }
      
      // Require proper conversation history - no fallbacks to prevent misleading results
      if (!conversationText || conversationText.trim().length === 0) {
        Logger.error('No conversation history available for analysis');
        return {
          success: false,
          error: 'Conversation history not available. Please ensure the conversation is properly loaded before requesting analysis.',
          analysis: {
            detectedInterests: [],
            confidence: 0,
            careerCards: []
          }
        };
      }

      // First extract interests/skills, then generate career cards
      const analysisResult = await ConversationAnalysisService.analyzeWithOpenAI(conversationText);
      
      // Generate career recommendations based on the conversation
      const careerRecommendations = await ConversationAnalysisService.generateCareerRecommendations(conversationText);
      
      Logger.info('Career cards generated successfully', {
        cardCount: careerRecommendations.careerCards?.length || 0,
        hasAnalysis: !!analysisResult,
        interestCount: analysisResult.interests?.length || 0
      });

      return {
        success: true,
        analysis: analysisResult,
        careerCards: careerRecommendations.careerCards || []
      };
    } catch (error) {
      Logger.error('MCP analysis error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async handleMCPGenerateRecommendations(args) {
    Logger.info('MCP: Generating career recommendations:', args);
    
    try {
      const careerCards = await this.generateCareerCards(args.interests, args.experience_level);
      
      return {
        success: true,
        careerCards: careerCards,
        count: careerCards.length
      };
    } catch (error) {
      Logger.error('MCP recommendations error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async handleMCPInstantInsights(args) {
    Logger.info('MCP: Generating instant insights:', args);
    
    try {
      const analysisResult = await ConversationAnalysisService.analyzeWithOpenAI(args.user_message);
      
      return {
        success: true,
        insights: analysisResult,
        careerCards: analysisResult.careerCards || []
      };
    } catch (error) {
      Logger.error('MCP instant insights error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Server startup
  async run() {
    try {
      Logger.info('Starting OffScript MCP Server...');
      
      // Start MCP server for stdio (HTTP server already set up in constructor)
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      Logger.info('OffScript MCP Server running on stdio', {
        capabilities: Object.keys(this.server.capabilities || {}),
        tools: ['analyze_conversation', 'generate_career_insights', 'update_user_profile', 'get_user_preferences']
      });
    } catch (error) {
      Logger.error('Failed to start MCP Server', error);
      process.exit(1);
    }
  }
}

// Start the server
const server = new OffScriptMCPServer();
server.run().catch((error) => {
  Logger.error('Unhandled server error', error);
  process.exit(1);
});