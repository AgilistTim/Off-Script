/**
 * AI Insights Service
 * 
 * Leverages OpenAI API to generate personalized career insights and recommendations.
 * Uses structured outputs with Zod schemas for reliable data parsing.
 * 
 * Features:
 * - Personalized career insights based on conversation data
 * - Actionable recommendations for skill development
 * - Progress pattern analysis
 * - Enhanced report content generation
 * - Input validation and rate limiting
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { ProfileAnalytics } from './profileAnalyticsService';

// Environment validation
const getOpenAIKey = (): string => {
  const key = import.meta.env.VITE_OPENAI_API_KEY;
  if (!key) {
    throw new Error('VITE_OPENAI_API_KEY environment variable is required');
  }
  return key;
};

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: getOpenAIKey(),
  dangerouslyAllowBrowser: true // Required for Vite client-side usage
});

// Zod schemas for structured outputs
const PersonalizedInsightSchema = z.object({
  category: z.enum(['strengths', 'growth_areas', 'opportunities', 'recommendations']),
  title: z.string().min(5).max(100),
  description: z.string().min(20).max(500),
  significance: z.enum(['high', 'medium', 'low']),
  actionable: z.boolean(),
  timeline: z.enum(['immediate', 'short_term', 'long_term']) // 0-1 month, 1-6 months, 6+ months
});

const ActionableRecommendationSchema = z.object({
  type: z.enum(['skill_development', 'exploration', 'networking', 'education', 'experience']),
  title: z.string().min(5).max(80),
  description: z.string().min(30).max(300),
  steps: z.array(z.string().min(10).max(150)).min(2).max(5),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  timeToComplete: z.string().max(50), // e.g., "2-4 weeks", "3 months"
  resources: z.array(z.string().max(100)).max(3).nullable(),
  successMetrics: z.array(z.string().max(100)).min(1).max(3)
});

const ProgressPatternSchema = z.object({
  pattern_type: z.enum(['accelerating', 'steady', 'inconsistent', 'declining', 'breakthrough', 'clarifying', 'emerging', 'developing', 'exploring']),
  confidence: z.number().min(0).max(100),
  description: z.string().min(20).max(300),
  contributing_factors: z.array(z.string().max(100)).min(1).max(4),
  predictions: z.array(z.string().max(150)).min(1).max(3),
  recommendations: z.array(z.string().max(150)).min(1).max(3)
});

const EnhancedReportContentSchema = z.object({
  executive_summary: z.string().min(100).max(500),
  key_achievements: z.array(z.string().max(150)).min(2).max(5),
  growth_narrative: z.string().min(150).max(1000),
  future_outlook: z.string().min(100).max(400),
  personalized_recommendations: z.array(z.string().max(200)).min(3).max(6),
  parent_guidance: z.string().min(100).max(400).nullable()
});

// Response format schemas
const InsightsResponseSchema = z.object({
  insights: z.array(PersonalizedInsightSchema).min(3).max(8)
});

const RecommendationsResponseSchema = z.object({
  recommendations: z.array(ActionableRecommendationSchema).min(2).max(6)
});

const ProgressAnalysisResponseSchema = z.object({
  overall_pattern: ProgressPatternSchema,
  skill_patterns: z.array(ProgressPatternSchema).max(3),
  interest_patterns: z.array(ProgressPatternSchema).max(2)
});

// Types derived from schemas
export type PersonalizedInsight = z.infer<typeof PersonalizedInsightSchema>;
export type ActionableRecommendation = z.infer<typeof ActionableRecommendationSchema>;
export type ProgressPattern = z.infer<typeof ProgressPatternSchema>;
export type EnhancedReportContent = z.infer<typeof EnhancedReportContentSchema>;

export interface AIInsightsResponse {
  insights: PersonalizedInsight[];
  recommendations: ActionableRecommendation[];
  progressAnalysis: {
    overall_pattern: ProgressPattern;
    skill_patterns: ProgressPattern[];
    interest_patterns: ProgressPattern[];
  };
  generatedAt: Date;
  processingTime: number;
}

// Rate limiting and caching
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests = 10; // per minute
  private readonly windowMs = 60 * 1000; // 1 minute

  canMakeRequest(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      return false;
    }
    
    this.requests.push(now);
    return true;
  }

  getWaitTime(): number {
    if (this.requests.length === 0) return 0;
    const oldestRequest = Math.min(...this.requests);
    return Math.max(0, this.windowMs - (Date.now() - oldestRequest));
  }
}

export class AIInsightsService {
  private static rateLimiter = new RateLimiter();
  private static cache = new Map<string, { data: any; expires: number }>();

  /**
   * Input validation to prevent prompt injection
   */
  private static validateInput(input: string): string {
    if (!input || typeof input !== 'string') {
      throw new Error('Invalid input: must be a non-empty string');
    }

    // Remove potentially harmful patterns
    const cleaned = input
      .replace(/[<>{}]/g, '') // Remove script-like brackets
      .replace(/javascript:/gi, '') // Remove javascript protocols
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .slice(0, 2000); // Limit length

    if (cleaned.length < 5) {
      throw new Error('Input too short after cleaning');
    }

    return cleaned;
  }

  /**
   * Generate cache key for user data
   */
  private static getCacheKey(userId: string, type: string): string {
    return `ai-insights-${userId}-${type}`;
  }

  /**
   * Check cache for existing data
   */
  private static getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data as T;
    }
    return null;
  }

  /**
   * Store data in cache
   */
  private static setCachedData<T>(key: string, data: T, ttlMinutes: number = 30): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + (ttlMinutes * 60 * 1000)
    });
  }

  /**
   * Generate personalized career insights based on user profile and analytics
   */
  static async generatePersonalizedInsights(
    userId: string,
    analytics: ProfileAnalytics,
    userProfile?: any
  ): Promise<PersonalizedInsight[]> {
    const cacheKey = this.getCacheKey(userId, 'insights');
    const cached = this.getCachedData<PersonalizedInsight[]>(cacheKey);
    if (cached) return cached;

    if (!this.rateLimiter.canMakeRequest()) {
      const waitTime = this.rateLimiter.getWaitTime();
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }

    try {
      console.log('🧠 Starting personalized insights generation...');
      const userContext = this.buildUserContext(analytics, userProfile);
      console.log('📋 User context built, making OpenAI API call for insights...');
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an enthusiastic career development advisor specializing in young adults aged 16-25. 
            Your role is to analyze career exploration data and generate exciting, personalized insights that make them feel seen and inspired.
            
            Focus on:
            - Celebrating their unique journey and discoveries 
            - Revealing hidden patterns that show real growth
            - Connecting interests and skills in unexpected, inspiring ways
            - Making them feel proud of their progress, however small
            - Providing specific insights that feel personally tailored to their story
            
            Tone: Enthusiastic but authentic, like a mentor who genuinely sees their potential.
            Be specific, personal, and reference their actual exploration data. Avoid generic career advice.
            
            Return your response as a JSON object with this exact structure:
            {
              "insights": [
                {
                  "category": "strengths|growth_areas|opportunities|recommendations",
                  "title": "string (5-100 chars)",
                  "description": "string (20-500 chars)",
                  "significance": "high|medium|low",
                  "actionable": true|false,
                  "timeline": "immediate|short_term|long_term"
                }
              ]
            }
            
            IMPORTANT: 
            - Use ONLY these category values: "strengths", "growth_areas", "opportunities", "recommendations"
            - Do NOT use "progress_patterns" or any other category names`
          },
          {
            role: 'user',
            content: `Analyze this career development data and create exciting, personalized insights that celebrate their unique journey:

${userContext}

Generate 4-6 compelling insights that make them feel excited about their potential:
1. Celebrate specific strengths they've demonstrated (reference their actual interests/skills)
2. Highlight promising growth areas that connect to their goals
3. Reveal positive patterns in their exploration journey  
4. Identify immediate opportunities that feel achievable and exciting
5. Provide strategic recommendations that feel personally crafted for them

Be enthusiastic about their progress! Reference specific data like their interests (AI software development, gaming, fishing), their communication style, or their goals. Make it feel like you really understand their unique journey. Return as JSON only.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2000
      });

      console.log('✅ OpenAI API call completed for insights, processing response...');
      const responseText = completion.choices[0]?.message.content;
      if (!responseText) {
        throw new Error('No response content received');
      }
      console.log('📄 Response received, parsing JSON...');

      const parsed = JSON.parse(responseText);
      
      // Validate and clean up the data
      if (parsed.insights) {
        // Fix any invalid category values
        parsed.insights = parsed.insights.map((insight: any) => {
          if (!['strengths', 'growth_areas', 'opportunities', 'recommendations'].includes(insight.category)) {
            // Map common variations to valid categories
            if (insight.category?.includes('pattern') || insight.category?.includes('progress')) {
              insight.category = 'strengths';
            } else if (insight.category?.includes('growth') || insight.category?.includes('develop')) {
              insight.category = 'growth_areas';
            } else if (insight.category?.includes('opportunity')) {
              insight.category = 'opportunities';
            } else {
              insight.category = 'recommendations';
            }
          }
          return insight;
        });
      }
      
      const validated = InsightsResponseSchema.parse(parsed);
      const result = validated.insights;
      this.setCachedData(cacheKey, result, 60); // Cache for 1 hour
      return result;

    } catch (error) {
      console.error('Error generating personalized insights:', error);
      throw new Error(`Failed to generate insights: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create actionable recommendations based on skills, interests, and goals
   */
  static async createActionableRecommendations(
    userId: string,
    analytics: ProfileAnalytics,
    userProfile?: any
  ): Promise<ActionableRecommendation[]> {
    const cacheKey = this.getCacheKey(userId, 'recommendations');
    const cached = this.getCachedData<ActionableRecommendation[]>(cacheKey);
    if (cached) return cached;

    if (!this.rateLimiter.canMakeRequest()) {
      const waitTime = this.rateLimiter.getWaitTime();
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }

    try {
      const userContext = this.buildUserContext(analytics, userProfile);
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a career development specialist creating actionable recommendations for young adults.
            
            Your recommendations should be:
            - Specific and actionable with clear steps
            - Realistic and achievable within suggested timeframes
            - Tailored to the individual's current level and interests
            - Include measurable success criteria
            - Provide helpful resources when relevant
            
            Categories to consider:
            - Skill development (technical and soft skills)
            - Career exploration activities
            - Networking and professional connections
            - Educational opportunities
            - Real-world experience opportunities
            
            Return your response as a JSON object with this exact structure:
            {
              "recommendations": [
                {
                  "type": "skill_development|exploration|networking|education|experience",
                  "title": "string (5-80 chars)",
                  "description": "string (30-300 chars)",
                  "steps": ["string (10-150 chars)", "string (10-150 chars)"],
                  "priority": "critical|high|medium|low",
                  "timeToComplete": "string (max 50 chars)",
                  "resources": ["string (max 100 chars)"] or null,
                  "successMetrics": ["string (max 100 chars)"]
                }
              ]
            }`
          },
          {
            role: 'user',
            content: `Based on this career development profile, create specific actionable recommendations:

${userContext}

Create 3-5 prioritized recommendations that address:
1. Skills that should be developed next
2. Career exploration activities to try
3. Ways to gain relevant experience
4. Networking or connection opportunities
5. Educational or learning suggestions

Each recommendation should include specific steps, timeline, and success metrics. Return as JSON only.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
        max_tokens: 2500
      });

      const responseText = completion.choices[0]?.message.content;
      if (!responseText) {
        throw new Error('No response content received');
      }

      const parsed = JSON.parse(responseText);
      const validated = RecommendationsResponseSchema.parse(parsed);
      const result = validated.recommendations;
      this.setCachedData(cacheKey, result, 45); // Cache for 45 minutes
      return result;

    } catch (error) {
      console.error('Error creating actionable recommendations:', error);
      throw new Error(`Failed to create recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze progress patterns in user's career development journey
   */
  static async analyzeProgressPatterns(
    userId: string,
    analytics: ProfileAnalytics,
    historicalData?: any[]
  ): Promise<{
    overall_pattern: ProgressPattern;
    skill_patterns: ProgressPattern[];
    interest_patterns: ProgressPattern[];
  }> {
    const cacheKey = this.getCacheKey(userId, 'progress-patterns');
    const cached = this.getCachedData<any>(cacheKey);
    if (cached) return cached;

    if (!this.rateLimiter.canMakeRequest()) {
      const waitTime = this.rateLimiter.getWaitTime();
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }

    try {
      const progressContext = this.buildProgressContext(analytics, historicalData);
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a data analyst specializing in career development patterns for young adults.
            
            Analyze engagement patterns, skill development trends, and interest evolution to identify:
            - Overall career development trajectory
            - Skill acquisition and improvement patterns  
            - Interest development and focus shifts
            - Contributing factors to progress
            - Predictive insights for future development
            
            Be objective, data-driven, and provide confidence levels for your assessments.
            
            Return your response as a JSON object with this exact structure:
            {
              "overall_pattern": {
                "pattern_type": "accelerating|steady|inconsistent|declining|breakthrough",
                "confidence": number (0-100),
                "description": "string (20-300 chars)",
                "contributing_factors": ["string (max 100 chars)"],
                "predictions": ["string (max 150 chars)"],
                "recommendations": ["string (max 150 chars)"]
              },
              "skill_patterns": [
                {
                  "pattern_type": "accelerating|steady|inconsistent|declining|breakthrough",
                  "confidence": number (0-100),
                  "description": "string (20-300 chars)",
                  "contributing_factors": ["string (max 100 chars)"],
                  "predictions": ["string (max 150 chars)"],
                  "recommendations": ["string (max 150 chars)"]
                }
              ],
              "interest_patterns": [
                {
                  "pattern_type": "accelerating|steady|inconsistent|declining|breakthrough", 
                  "confidence": number (0-100),
                  "description": "string (20-300 chars)",
                  "contributing_factors": ["string (max 100 chars)"],
                  "predictions": ["string (max 150 chars)"],
                  "recommendations": ["string (max 150 chars)"]
                }
              ]
            }`
          },
          {
            role: 'user',
            content: `Analyze these career development patterns with a positive, growth-focused perspective:

${progressContext}

Identify and describe positive patterns in this person's journey:
1. Overall progress pattern - Find the positive momentum in their exploration (steady growth, meaningful discoveries, accelerating understanding)
2. Skill development patterns - Highlight 2-3 areas where they're showing real potential (return empty array only if truly no data)
3. Interest evolution patterns - Show how their interests are clarifying and deepening (return empty array only if truly no data)

Be encouraging and highlight growth, even small progress. Focus on potential and trajectory rather than gaps.
For each pattern, include confidence level, what's driving this positive development, and exciting predictions.
Return as JSON only.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.6,
        max_tokens: 2000
      });

      const responseText = completion.choices[0]?.message.content;
      if (!responseText) {
        throw new Error('No response content received');
      }

      const parsed = JSON.parse(responseText);
      
      // Validate and clean up the data structure
      if (parsed.skill_patterns && !Array.isArray(parsed.skill_patterns)) {
        // If it's an object, convert to array or set empty array
        parsed.skill_patterns = [];
      }
      if (parsed.interest_patterns && !Array.isArray(parsed.interest_patterns)) {
        // If it's an object, convert to array or set empty array  
        parsed.interest_patterns = [];
      }
      
      // Ensure arrays exist
      parsed.skill_patterns = parsed.skill_patterns || [];
      parsed.interest_patterns = parsed.interest_patterns || [];
      
      // Clean up pattern types to ensure they match our enum
      const validPatternTypes = ['accelerating', 'steady', 'inconsistent', 'declining', 'breakthrough', 'clarifying', 'emerging', 'developing', 'exploring'];
      const cleanPattern = (pattern: any) => {
        if (pattern && pattern.pattern_type && !validPatternTypes.includes(pattern.pattern_type)) {
          // Map common variations to valid types
          const typeMap: Record<string, string> = {
            'growing': 'accelerating',
            'stable': 'steady',
            'building': 'developing',
            'discovering': 'exploring',
            'fluctuating': 'inconsistent'
          };
          pattern.pattern_type = typeMap[pattern.pattern_type] || 'steady';
        }
        return pattern;
      };
      
      // Ensure all required fields are present with defaults and proper structure
      const processedData = {
        overall_pattern: parsed.overall_pattern ? cleanPattern(parsed.overall_pattern) : {
          pattern_type: 'steady' as const,
          confidence: 75,
          description: 'Consistent engagement pattern',
          recommendations: ['Continue current exploration approach'],
          contributing_factors: ['Regular platform usage'],
          predictions: ['Continued steady progress expected']
        },
        skill_patterns: (parsed.skill_patterns || []).map(cleanPattern),
        interest_patterns: (parsed.interest_patterns || []).map(cleanPattern)
      };
      
      const result = ProgressAnalysisResponseSchema.parse(processedData) as typeof processedData;

      this.setCachedData(cacheKey, result, 30); // Cache for 30 minutes
      return result;

    } catch (error) {
      console.error('Error analyzing progress patterns:', error);
      throw new Error(`Failed to analyze progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enhance report content with AI-generated personalized narratives
   */
  static async enhanceReportContent(
    userId: string,
    analytics: ProfileAnalytics,
    userProfile?: any,
    reportType: 'parent' | 'student' | 'counselor' = 'parent'
  ): Promise<EnhancedReportContent> {
    const cacheKey = this.getCacheKey(userId, `report-${reportType}`);
    const cached = this.getCachedData<EnhancedReportContent>(cacheKey);
    if (cached) return cached;

    if (!this.rateLimiter.canMakeRequest()) {
      const waitTime = this.rateLimiter.getWaitTime();
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }

    try {
      const reportContext = this.buildReportContext(analytics, userProfile, reportType);
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a professional career development report writer specializing in ${reportType} reports.
            
            For ${reportType} reports, focus on:
            ${reportType === 'parent' ? '- Clear, encouraging language for parents/guardians\n- Actionable guidance for supporting their teen\n- Context about typical career development\n- Specific next steps families can take together' :
              reportType === 'student' ? '- Direct, empowering language for the student\n- Clear next steps they can take\n- Recognition of their progress and potential\n- Motivation and encouragement' :
              '- Professional language for counselors/educators\n- Data-driven insights and recommendations\n- Alignment with educational goals\n- Specific intervention or support suggestions'}
            
            Write compelling, personalized content that tells their unique story.
            
            Return your response as a JSON object with this exact structure:
            {
              "executive_summary": "string (100-500 chars)",
              "key_achievements": ["string (max 150 chars)", "string (max 150 chars)"],
              "growth_narrative": "string (150-1000 chars)",
              "future_outlook": "string (100-400 chars)",
              "personalized_recommendations": ["string (max 200 chars)"],
              "parent_guidance": "string (100-400 chars)" or null
            }`
          },
          {
            role: 'user',
            content: `Create enhanced ${reportType} report content based on this data:

${reportContext}

Generate:
1. Executive summary highlighting key findings
2. Key achievements and milestones (3-5 items)
3. Growth narrative showing their development journey
4. Future outlook and potential pathways
5. Personalized recommendations (4-6 specific items)
${reportType === 'parent' ? '6. Guidance for parents/guardians on how to support continued development' : ''}

Make it personal, specific, and inspiring while being realistic and actionable. Return as JSON only.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 3000
      });

      const responseText = completion.choices[0]?.message.content;
      if (!responseText) {
        throw new Error('No response content received');
      }

      const parsed = JSON.parse(responseText);
      const result = EnhancedReportContentSchema.parse(parsed);

      this.setCachedData(cacheKey, result, 120); // Cache for 2 hours
      return result;

    } catch (error) {
      console.error('Error enhancing report content:', error);
      throw new Error(`Failed to enhance report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate comprehensive AI insights for dashboard with caching
   */
  static async generateComprehensiveInsights(
    userId: string,
    analytics: ProfileAnalytics,
    userProfile?: any,
    forceRefresh = false
  ): Promise<AIInsightsResponse> {
    const startTime = Date.now();
    
    // Create a cache key based on user data signature
    const dataSignature = this.createDataSignature(analytics, userProfile);
    const cacheKey = `comprehensive-insights-${userId}-${dataSignature}`;
    
    // Check cache first unless forced refresh
    if (!forceRefresh) {
      const cached = this.getCachedData<AIInsightsResponse>(cacheKey);
      if (cached) {
        console.log('🔄 Using cached AI insights');
        return cached;
      }
    }
    
    try {
      console.log('🔮 Generating fresh AI insights...');
      
      // Generate all insights with fallback handling and timeout
      const timeout = 30000; // 30 second timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI insights generation timed out after 30 seconds')), timeout)
      );
      
      const insightsPromises = [
        this.generatePersonalizedInsights(userId, analytics, userProfile),
        this.createActionableRecommendations(userId, analytics, userProfile),
        this.analyzeProgressPatterns(userId, analytics)
      ];
      
      console.log('🔄 Starting parallel AI generation...');
      const results = await Promise.race([
        Promise.allSettled(insightsPromises),
        timeoutPromise
      ]) as PromiseSettledResult<any>[];
      
      console.log('✅ AI generation completed, processing results...');

      // Extract successful results or provide fallbacks
      const insights = results[0].status === 'fulfilled' ? results[0].value : [
        {
          category: 'strengths' as const,
          title: 'Active Career Explorer',
          description: `You've engaged with ${analytics.engagementSummary.totalSessions} career exploration sessions, showing genuine commitment to discovering your path. This proactive approach to career development is a real strength.`,
          significance: 'high' as const,
          actionable: true,
          timeline: 'immediate' as const
        },
        {
          category: 'opportunities' as const,
          title: 'Diverse Interest Portfolio',
          description: `Your exploration spans ${analytics.interestEvolution.interestDiversity} different areas, giving you a broad foundation to build upon. This diversity opens multiple career pathways.`,
          significance: 'medium' as const,
          actionable: true,
          timeline: 'short_term' as const
        }
      ];
      
      const recommendations = results[1].status === 'fulfilled' ? results[1].value : [
        {
          category: 'career_exploration' as const,
          title: 'Continue Active Exploration',
          description: 'Keep engaging with career conversations to deepen your understanding of different paths.',
          priority: 'medium' as const,
          timeToComplete: '2-4 weeks',
          resources: null,
          successMetrics: ['Increased clarity about preferred career areas', 'Enhanced understanding of skill requirements']
        }
      ];
      
      const progressAnalysis = results[2].status === 'fulfilled' ? results[2].value : {
        overall_pattern: {
          pattern_type: 'steady' as const,
          confidence: 75,
          description: `With ${analytics.engagementSummary.totalHours} hours invested and ${analytics.skillsProgression.identifiedSkills.length} skills identified, you're building solid career awareness`,
          contributing_factors: ['Consistent platform engagement', 'Active skill development', 'Diverse interest exploration'],
          predictions: ['Continued growth in career clarity', 'Enhanced skill development', 'Increased confidence in career decisions'],
          recommendations: ['Maintain regular exploration schedule', 'Focus on top 3 most interesting areas', 'Connect learning to real opportunities']
        },
        skill_patterns: [],
        interest_patterns: []
      };

      // Log any failures for debugging
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const names = ['insights', 'recommendations', 'progressAnalysis'];
          console.warn(`Failed to generate ${names[index]}:`, result.reason);
        }
      });

      const processingTime = Date.now() - startTime;

      const response: AIInsightsResponse = {
        insights,
        recommendations,
        progressAnalysis,
        generatedAt: new Date(),
        processingTime
      };

      // Cache the results for 60 minutes
      this.setCachedData(cacheKey, response, 60);

      return response;

    } catch (error) {
      console.error('Error generating comprehensive insights:', error);
      throw new Error(`Failed to generate insights: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a signature of user data to detect changes
   */
  private static createDataSignature(analytics: ProfileAnalytics, userProfile?: any): string {
    const keyData = {
      totalSessions: analytics.engagementSummary.totalSessions,
      totalHours: analytics.engagementSummary.totalHours,
      skillsCount: analytics.skillsProgression.identifiedSkills.length,
      interestsCount: analytics.interestEvolution.currentInterests.length,
      milestonesCount: analytics.careerMilestones.length,
      topSkills: analytics.skillsProgression.identifiedSkills.slice(0, 3).map(s => s.skill).join(','),
      topInterests: analytics.interestEvolution.currentInterests.slice(0, 3).map(i => i.interest).join(',')
    };
    
    // Create a simple hash from the key data
    return btoa(JSON.stringify(keyData)).slice(0, 16);
  }

  /**
   * Build user context for AI prompts
   */
  private static buildUserContext(analytics: ProfileAnalytics, userProfile?: any): string {
    const context = [];

    // Engagement summary
    context.push(`ENGAGEMENT METRICS:
- Total platform hours: ${analytics.engagementSummary.totalHours}
- Total sessions: ${analytics.engagementSummary.totalSessions}
- Average session length: ${analytics.engagementSummary.averageSessionLength} minutes
- Total messages: ${analytics.conversationInsights.totalMessages}
- Weekly trend: ${analytics.engagementSummary.weeklyTrend > 0 ? 'increasing' : 'stable'} engagement`);

    // Skills progression
    if (analytics.skillsProgression.identifiedSkills.length > 0) {
      const topSkills = analytics.skillsProgression.identifiedSkills.slice(0, 8);
      context.push(`\nSKILLS IDENTIFIED:
${topSkills.map(skill => `- ${skill.skill}: ${skill.proficiency}% proficiency (${skill.category} skill, mentioned ${skill.frequency} times)`).join('\n')}`);
      
      if (analytics.skillsProgression.growthAreas.length > 0) {
        context.push(`\nGROWTH AREAS: ${analytics.skillsProgression.growthAreas.join(', ')}`);
      }
    }

    // Interest evolution
    if (analytics.interestEvolution.currentInterests.length > 0) {
      const topInterests = analytics.interestEvolution.currentInterests.slice(0, 6);
      context.push(`\nCURRENT INTERESTS:
${topInterests.map(interest => `- ${interest.interest}: ${interest.strength}% strength, ${interest.trend} trend`).join('\n')}`);
      
      context.push(`\nINTEREST PATTERNS:
- Diversity: ${analytics.interestEvolution.interestDiversity} different areas explored
- Focus change: ${analytics.interestEvolution.focusShift}% shift over time`);
    }

    // Recent milestones
    if (analytics.careerMilestones.length > 0) {
      const recentMilestones = analytics.careerMilestones.slice(0, 5);
      context.push(`\nRECENT MILESTONES:
${recentMilestones.map(m => `- ${m.description} (${m.significance} significance)`).join('\n')}`);
    }

    // Discussion topics
    if (analytics.conversationInsights.topDiscussionTopics.length > 0) {
      const topTopics = analytics.conversationInsights.topDiscussionTopics.slice(0, 8);
      context.push(`\nTOP DISCUSSION TOPICS:
${topTopics.map(topic => `- ${topic.topic}: discussed ${topic.frequency} times`).join('\n')}`);
    }

    // User profile information
    if (userProfile) {
      context.push(`\nPROFILE INFORMATION:
- Name: ${userProfile.displayName || 'Not provided'}
- School: ${userProfile.school || 'Not specified'}
- Grade: ${userProfile.grade || 'Not specified'}
- Bio: ${userProfile.bio || 'Not provided'}`);
    }

    return context.join('\n');
  }

  /**
   * Build progress context for pattern analysis
   */
  private static buildProgressContext(analytics: ProfileAnalytics, historicalData?: any[]): string {
    const context = [];

    // Helper function to safely format dates
    const formatDate = (date: any): string => {
      if (!date) return 'Unknown';
      if (date instanceof Date) return date.toLocaleDateString();
      if (typeof date === 'string') return new Date(date).toLocaleDateString();
      if (date.toDate && typeof date.toDate === 'function') return date.toDate().toLocaleDateString();
      return String(date);
    };

    context.push(`CURRENT ENGAGEMENT METRICS:
- Total hours: ${analytics.engagementSummary.totalHours}
- Sessions: ${analytics.engagementSummary.totalSessions}
- Avg session: ${analytics.engagementSummary.averageSessionLength} minutes
- Last active: ${formatDate(analytics.engagementSummary.lastActiveDate)}`);

    context.push(`\nSKILL DEVELOPMENT TIMELINE:
${analytics.skillsProgression.identifiedSkills.slice(0, 5).map(skill => 
  `- ${skill.skill}: First mentioned ${formatDate(skill.firstMentioned)}, ${skill.frequency} mentions, ${skill.proficiency}% proficiency`
).join('\n')}`);

    context.push(`\nINTEREST EVOLUTION:
${analytics.interestEvolution.currentInterests.slice(0, 5).map(interest =>
  `- ${interest.interest}: ${interest.trend} trend (${interest.strength}% strength)`
).join('\n')}`);

    if (analytics.careerMilestones.length > 0) {
      context.push(`\nMILESTONE PROGRESSION:
${analytics.careerMilestones.slice(0, 8).map(milestone =>
  `- ${formatDate(milestone.date)}: ${milestone.description} (${milestone.significance})`
).join('\n')}`);
    }

    if (historicalData && historicalData.length > 0) {
      context.push(`\nHISTORICAL TRENDS:
- Data points available: ${historicalData.length}
- Time span: ${historicalData.length > 1 ? 'Multiple sessions' : 'Single session'}`);
    }

    return context.join('\n');
  }

  /**
   * Build report context for enhanced content generation
   */
  private static buildReportContext(analytics: ProfileAnalytics, reportType: string, userProfile?: any): string {
    const context = [];

    const userName = userProfile?.displayName || 'Student';
    context.push(`REPORT FOR: ${userName}
REPORT TYPE: ${reportType}
GENERATED: ${new Date().toLocaleDateString()}`);

    context.push(`\nENGAGEMENT OVERVIEW:
- ${analytics.engagementSummary.totalHours} hours of career exploration
- ${analytics.engagementSummary.totalSessions} exploration sessions completed
- ${analytics.conversationInsights.totalMessages} meaningful conversations
- Average ${analytics.engagementSummary.averageSessionLength} minutes per session`);

    if (analytics.skillsProgression.identifiedSkills.length > 0) {
      context.push(`\nSKILLS DEVELOPMENT:
- ${analytics.skillsProgression.identifiedSkills.length} skills identified
- Top skills: ${analytics.skillsProgression.identifiedSkills.slice(0, 3).map(s => s.skill).join(', ')}
- Primary category: ${analytics.skillsProgression.topSkillCategory}
- Growth areas: ${analytics.skillsProgression.growthAreas.slice(0, 3).join(', ')}`);
    }

    if (analytics.interestEvolution.currentInterests.length > 0) {
      context.push(`\nCAREER INTERESTS:
- ${analytics.interestEvolution.interestDiversity} different career areas explored
- Strongest interests: ${analytics.interestEvolution.currentInterests.slice(0, 3).map(i => i.interest).join(', ')}
- Focus evolution: ${analytics.interestEvolution.focusShift}% change over time`);
    }

    if (analytics.careerMilestones.length > 0) {
      context.push(`\nKEY MILESTONES:
${analytics.careerMilestones.slice(0, 5).map(m => `- ${m.description}`).join('\n')}`);
    }

    if (userProfile) {
      context.push(`\nSTUDENT BACKGROUND:
- School: ${userProfile.school || 'Not specified'}
- Grade: ${userProfile.grade || 'Not specified'}
- Bio: ${userProfile.bio || 'Getting to know their interests and goals'}`);
    }

    return context.join('\n');
  }

  /**
   * Clear cache for specific user or all cache
   */
  static clearCache(userId?: string): void {
    if (userId) {
      const keysToDelete = Array.from(this.cache.keys()).filter(key => key.includes(userId));
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}
