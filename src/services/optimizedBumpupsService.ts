// Optimized Bumpups service focused on timestamp-specific insights and emotional elements
import { environmentConfig } from '../config/environment';



export interface BumpupsTimestampInsight {
  timestamp: number; // seconds
  type: 'emotional_moment' | 'skill_demonstration' | 'challenge_highlight' | 'advice_nugget' | 'aspirational_quote';
  title: string;
  description: string;
  emotionalImpact: 'high' | 'medium' | 'low';
  quotation?: string; // Direct quote from the video
  context?: string; // Additional context around this moment
}

export interface OptimizedBumpupsResponse {
  videoId: string;
  timestampInsights: BumpupsTimestampInsight[];
  emotionalElements: string[];
  aspirationalQuotes: Array<{
    quote: string;
    timestamp?: number;
    speaker?: string;
  }>;
  challenges: Array<{
    challenge: string;
    timestamp?: number;
    category: 'personal' | 'technical' | 'career' | 'educational';
  }>;
  skillDemonstrations: Array<{
    skill: string;
    timestamp: number;
    demonstrationContext: string;
  }>;
  confidence: number;
  processingTime: number;
  metadata: {
    analyzedAt: string;
    tokensUsed?: number;
    analysisVersion: string;
  };
}

class OptimizedBumpupsService {
  private readonly apiUrl: string;
  private readonly ANALYSIS_VERSION = '2.0.0-optimized';

  constructor() {
    this.apiUrl = environmentConfig.apiEndpoints.bumpupsProxy || '';
  }

  /**
   * Process video for timestamp-specific insights only
   * This is much more cost-effective than full analysis
   */
  async extractTimestampInsights(videoUrl: string): Promise<OptimizedBumpupsResponse> {
    const startTime = Date.now();
    
    try {
      console.log('🎯 Extracting timestamp-specific insights with Bumpups...');
      
      // Optimized prompt focused on timestamps and emotional moments
      const timestampPrompt = `Analyze this video specifically for timestamp-based insights for youth career exploration (16-20 years old). Focus ONLY on specific moments with timestamps.

Return your output in this EXACT JSON structure:

{
  "timestampInsights": [
    {
      "timestamp": 30,
      "type": "emotional_moment|skill_demonstration|challenge_highlight|advice_nugget|aspirational_quote",
      "title": "Brief title of the moment",
      "description": "What happens at this specific moment",
      "emotionalImpact": "high|medium|low",
      "quotation": "Direct quote if applicable",
      "context": "Why this moment is significant"
    }
  ],
  "emotionalElements": ["List of emotional themes/moments without timestamps"],
  "aspirationalQuotes": [
    {
      "quote": "Inspirational quote from the video",
      "timestamp": 45,
      "speaker": "Person who said it if identifiable"
    }
  ],
  "challenges": [
    {
      "challenge": "Specific challenge mentioned",
      "timestamp": 120,
      "category": "personal|technical|career|educational"
    }
  ],
  "skillDemonstrations": [
    {
      "skill": "Specific skill being demonstrated",
      "timestamp": 180,
      "demonstrationContext": "How the skill is being shown"
    }
  ]
}

Focus on:
1. Specific timestamps where something important happens
2. Emotional moments that would inspire young viewers
3. Skills being actively demonstrated (not just mentioned)
4. Challenges being discussed with context
5. Quotes that would motivate career exploration

Return ONLY the JSON, no additional text.`;

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: videoUrl,
          prompt: timestampPrompt,
          model: 'bump-1.0',
          language: 'en',
          output_format: 'json',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bumpups API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const processingTime = Date.now() - startTime;
      
      console.log('Bumpups timestamp analysis raw response:', data);
      
      // Parse the response
      const parsedResponse = this.parseTimestampResponse(data.output || '');
      
      const result: OptimizedBumpupsResponse = {
        videoId: this.extractVideoId(videoUrl) || '',
        timestampInsights: parsedResponse.timestampInsights || [],
        emotionalElements: parsedResponse.emotionalElements || [],
        aspirationalQuotes: parsedResponse.aspirationalQuotes || [],
        challenges: parsedResponse.challenges || [],
        skillDemonstrations: parsedResponse.skillDemonstrations || [],
        confidence: this.calculateConfidence(parsedResponse),
        processingTime,
        metadata: {
          analyzedAt: new Date().toISOString(),
          tokensUsed: data.tokensUsed,
          analysisVersion: this.ANALYSIS_VERSION
        }
      };
      
      console.log(`✅ Timestamp analysis completed in ${processingTime}ms`);
      console.log(`📍 Found ${result.timestampInsights.length} timestamp insights`);
      console.log(`💭 Found ${result.emotionalElements.length} emotional elements`);
      console.log(`🎯 Found ${result.skillDemonstrations.length} skill demonstrations`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Bumpups timestamp analysis failed:', error);
      throw new Error(`Bumpups timestamp analysis failed: ${error.message}`);
    }
  }

  /**
   * Parse the Bumpups response for timestamp insights
   */
  private parseTimestampResponse(output: string): Partial<OptimizedBumpupsResponse> {
    try {
      // Clean the output (remove any markdown formatting)
      const cleanedOutput = output
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      const parsed = JSON.parse(cleanedOutput);
      
      // Validate and structure the response
      return {
        timestampInsights: this.validateTimestampInsights(parsed.timestampInsights || []),
        emotionalElements: Array.isArray(parsed.emotionalElements) ? parsed.emotionalElements : [],
        aspirationalQuotes: this.validateQuotes(parsed.aspirationalQuotes || []),
        challenges: this.validateChallenges(parsed.challenges || []),
        skillDemonstrations: this.validateSkillDemonstrations(parsed.skillDemonstrations || [])
      };
      
    } catch (error) {
      console.error('Failed to parse Bumpups timestamp response:', error);
      console.error('Raw output:', output);
      
      // Fallback: try to extract insights from unstructured text
      return this.extractInsightsFromText(output);
    }
  }

  /**
   * Validate and clean timestamp insights
   */
  private validateTimestampInsights(insights: any[]): BumpupsTimestampInsight[] {
    return insights
      .filter(insight => insight && typeof insight.timestamp === 'number')
      .map(insight => ({
        timestamp: Math.max(0, insight.timestamp),
        type: this.validateInsightType(insight.type),
        title: String(insight.title || 'Insight'),
        description: String(insight.description || ''),
        emotionalImpact: this.validateEmotionalImpact(insight.emotionalImpact),
        quotation: insight.quotation ? String(insight.quotation) : undefined,
        context: insight.context ? String(insight.context) : undefined
      }));
  }

  /**
   * Validate insight type
   */
  private validateInsightType(type: string): BumpupsTimestampInsight['type'] {
    const validTypes = ['emotional_moment', 'skill_demonstration', 'challenge_highlight', 'advice_nugget', 'aspirational_quote'];
    return validTypes.includes(type) ? type as BumpupsTimestampInsight['type'] : 'emotional_moment';
  }

  /**
   * Validate emotional impact level
   */
  private validateEmotionalImpact(impact: string): 'high' | 'medium' | 'low' {
    return ['high', 'medium', 'low'].includes(impact) ? impact as any : 'medium';
  }

  /**
   * Validate quotes structure
   */
  private validateQuotes(quotes: any[]): OptimizedBumpupsResponse['aspirationalQuotes'] {
    return quotes
      .filter(q => q && q.quote)
      .map(q => ({
        quote: String(q.quote),
        timestamp: typeof q.timestamp === 'number' ? q.timestamp : undefined,
        speaker: q.speaker ? String(q.speaker) : undefined
      }));
  }

  /**
   * Validate challenges structure
   */
  private validateChallenges(challenges: any[]): OptimizedBumpupsResponse['challenges'] {
    return challenges
      .filter(c => c && c.challenge)
      .map(c => ({
        challenge: String(c.challenge),
        timestamp: typeof c.timestamp === 'number' ? c.timestamp : undefined,
        category: this.validateChallengeCategory(c.category)
      }));
  }

  /**
   * Validate challenge category
   */
  private validateChallengeCategory(category: string): 'personal' | 'technical' | 'career' | 'educational' {
    const validCategories = ['personal', 'technical', 'career', 'educational'];
    return validCategories.includes(category) ? category as any : 'personal';
  }

  /**
   * Validate skill demonstrations
   */
  private validateSkillDemonstrations(demos: any[]): OptimizedBumpupsResponse['skillDemonstrations'] {
    return demos
      .filter(d => d && d.skill && typeof d.timestamp === 'number')
      .map(d => ({
        skill: String(d.skill),
        timestamp: d.timestamp,
        demonstrationContext: String(d.demonstrationContext || '')
      }));
  }

  /**
   * Fallback method to extract insights from unstructured text
   */
  private extractInsightsFromText(text: string): Partial<OptimizedBumpupsResponse> {
    const insights: BumpupsTimestampInsight[] = [];
    const emotionalElements: string[] = [];
    
    // Simple pattern matching for timestamp mentions
    const timestampPattern = /(\d{1,2}:\d{2}|\d+\s*(?:seconds?|minutes?|mins?))/gi;
    const matches = text.match(timestampPattern);
    
    if (matches) {
      matches.forEach((match, index) => {
        insights.push({
          timestamp: this.parseTimeToSeconds(match),
          type: 'emotional_moment',
          title: `Moment ${index + 1}`,
          description: `Significant moment mentioned in analysis`,
          emotionalImpact: 'medium'
        });
      });
    }
    
    // Extract emotional elements from text
    const emotionalKeywords = ['inspiring', 'motivating', 'challenging', 'empowering', 'encouraging'];
    emotionalKeywords.forEach(keyword => {
      if (text.toLowerCase().includes(keyword)) {
        emotionalElements.push(`${keyword.charAt(0).toUpperCase() + keyword.slice(1)} content`);
      }
    });
    
    return {
      timestampInsights: insights,
      emotionalElements,
      aspirationalQuotes: [],
      challenges: [],
      skillDemonstrations: []
    };
  }

  /**
   * Convert time strings to seconds
   */
  private parseTimeToSeconds(timeStr: string): number {
    // Handle formats like "1:30", "90 seconds", "2 minutes"
    if (timeStr.includes(':')) {
      const [minutes, seconds] = timeStr.split(':').map(Number);
      return (minutes || 0) * 60 + (seconds || 0);
    }
    
    const match = timeStr.match(/(\d+)\s*(seconds?|minutes?|mins?)/i);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      return unit.startsWith('min') ? value * 60 : value;
    }
    
    return 0;
  }

  /**
   * Calculate confidence based on the quality of extracted insights
   */
  private calculateConfidence(response: Partial<OptimizedBumpupsResponse>): number {
    let confidence = 0.5; // Base confidence
    
    const timestampCount = response.timestampInsights?.length || 0;
    const emotionalCount = response.emotionalElements?.length || 0;
    const quotesCount = response.aspirationalQuotes?.length || 0;
    const challengesCount = response.challenges?.length || 0;
    const skillsCount = response.skillDemonstrations?.length || 0;
    
    // Boost confidence based on content richness
    if (timestampCount > 0) confidence += 0.2;
    if (timestampCount > 3) confidence += 0.1;
    if (emotionalCount > 0) confidence += 0.1;
    if (quotesCount > 0) confidence += 0.1;
    if (challengesCount > 0) confidence += 0.05;
    if (skillsCount > 0) confidence += 0.05;
    
    return Math.min(1.0, confidence);
  }

  /**
   * Extract video ID from YouTube URL
   */
  private extractVideoId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  /**
   * Check if we should use optimized bumpups (based on cost-benefit analysis)
   */
  shouldUseBumpupsForVideo(
    hasTranscript: boolean,
    videoDuration: number,
    category?: string
  ): boolean {
    // Use bumpups only when it adds unique value:
    // 1. Video has good potential for emotional moments (career/personal development)
    // 2. Video is not too long (cost consideration)
    // 3. We already have transcript (avoid redundant analysis)
    
    const careerCategories = ['career', 'personal development', 'entrepreneurship', 'leadership'];
    const isCareerFocused = category ? careerCategories.some(cat => 
      category.toLowerCase().includes(cat)
    ) : false;
    
    const isReasonableLength = videoDuration > 0 && videoDuration < 30 * 60; // Less than 30 minutes
    
    // Use bumpups if:
    // - We have transcript (no duplication with OpenAI)
    // - Video is career-focused OR reasonable length
    // - We want timestamp-specific insights
    return hasTranscript && (isCareerFocused || isReasonableLength);
  }

  /**
   * Generate a cost-benefit report for bumpups usage
   */
  generateCostBenefitReport(videoCount: number, averageDuration: number): {
    estimatedCost: number;
    uniqueValueProposition: string[];
    recommendation: 'use' | 'skip' | 'selective';
    reasoning: string;
  } {
    const estimatedCostPerVideo = 0.05; // Rough estimate based on API usage
    const totalCost = videoCount * estimatedCostPerVideo;
    
    const uniqueValue = [
      'Timestamp-specific emotional moments',
      'Inspirational quotes with exact timing',
      'Skill demonstrations at specific points',
      'Challenge identification with context',
      'Youth-focused aspirational content'
    ];
    
    let recommendation: 'use' | 'skip' | 'selective' = 'selective';
    let reasoning = '';
    
    if (videoCount < 50 && averageDuration < 15 * 60) {
      recommendation = 'use';
      reasoning = 'Small collection with short videos - good value for timestamp insights';
    } else if (videoCount > 200 || averageDuration > 20 * 60) {
      recommendation = 'selective';
      reasoning = 'Large collection or long videos - use selectively for high-value content';
    } else {
      recommendation = 'selective';
      reasoning = 'Medium collection - use for career-focused content where timestamps add value';
    }
    
    return {
      estimatedCost: totalCost,
      uniqueValueProposition: uniqueValue,
      recommendation,
      reasoning
    };
  }
}

export default new OptimizedBumpupsService(); 