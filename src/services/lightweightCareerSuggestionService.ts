/**
 * Lightweight Career Suggestion Service
 * 
 * Provides fast, OpenAI-powered career suggestions for guest users
 * Focus: High-level insights with CTA to register for detailed analytics
 */

import { environmentConfig } from '../config/environment';

export interface LightweightCareerSuggestion {
  id: string;
  title: string;
  description: string;
  whyGoodFit: string;
  registrationCTA: string;
}

export interface LightweightCareerResponse {
  success: boolean;
  suggestions: LightweightCareerSuggestion[];
  processingTimeMs: number;
  error?: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class LightweightCareerSuggestionService {
  private openaiApiKey: string;

  constructor() {
    this.openaiApiKey = environmentConfig.apiKeys.openai || '';
    if (!this.openaiApiKey) {
      console.warn('⚠️ OpenAI API key not configured for LightweightCareerSuggestionService');
    }
  }

  /**
   * Generate fast career suggestions from conversation history
   */
  async generateSuggestions(
    conversationHistory: ConversationMessage[],
    userName?: string
  ): Promise<LightweightCareerResponse> {
    const startTime = Date.now();

    try {
      console.log('🚀 Generating lightweight career suggestions:', {
        messagesCount: conversationHistory.length,
        hasUserName: !!userName
      });

      if (!this.openaiApiKey) {
        return {
          success: false,
          suggestions: [],
          processingTimeMs: Date.now() - startTime,
          error: 'OpenAI API key not configured'
        };
      }

      // Extract key insights from conversation
      const conversationText = conversationHistory
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      const prompt = this.buildPrompt(conversationText, userName);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Fast and cost-effective
          messages: [
            {
              role: 'system',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 800,
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const content = result.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      const parsedSuggestions = JSON.parse(content);
      const processingTimeMs = Date.now() - startTime;

      console.log('✅ Lightweight career suggestions generated:', {
        suggestionsCount: parsedSuggestions.suggestions?.length || 0,
        processingTimeMs
      });

      return {
        success: true,
        suggestions: parsedSuggestions.suggestions || [],
        processingTimeMs
      };

    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      console.error('❌ Error generating lightweight career suggestions:', error);
      
      return {
        success: false,
        suggestions: [],
        processingTimeMs,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Build optimized prompt for fast career suggestions
   */
  private buildPrompt(conversationText: string, userName?: string): string {
    const userRef = userName || 'the user';
    
    return `You are a career advisor providing quick, high-level career suggestions based on a brief conversation.

CONVERSATION:
${conversationText}

TASK: Generate 2-3 career suggestions that are immediately relevant and actionable for ${userRef}.

REQUIREMENTS:
- Focus on careers that match their expressed interests and skills
- Provide high-level overviews that create excitement
- Include compelling reasons why each career fits them
- Add registration CTAs that highlight what they'd get with full analytics

RESPONSE FORMAT (JSON):
{
  "suggestions": [
    {
      "id": "career-1",
      "title": "Clear, specific job title",
      "description": "2-3 sentences describing the role and its appeal",
      "whyGoodFit": "1-2 sentences explaining why this matches their interests/skills",
      "registrationCTA": "Compelling reason to register for detailed analytics (salary data, training paths, market outlook, etc.)"
    }
  ]
}

EXAMPLES OF GOOD REGISTRATION CTAs:
- "Register to see detailed UK salary ranges, training pathways, and market demand forecasts"
- "Sign up for personalized career roadmaps, industry connections, and skill gap analysis"
- "Get access to real market data, company insights, and personalized next steps"

Keep each field concise but engaging. Focus on immediate value and future opportunity.`;
  }

  /**
   * Quick validation of conversation for career suggestion readiness
   */
  static hasEnoughContext(conversationHistory: ConversationMessage[]): boolean {
    const userMessages = conversationHistory.filter(msg => msg.role === 'user');
    const totalUserText = userMessages.map(msg => msg.content).join(' ');
    
    // Basic heuristics for meaningful conversation
    return userMessages.length >= 2 && totalUserText.length >= 50;
  }

  /**
   * Extract user interests from conversation (simple keyword matching)
   */
  static extractQuickInsights(conversationHistory: ConversationMessage[]): {
    interests: string[];
    skills: string[];
    goals: string[];
  } {
    const userText = conversationHistory
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content.toLowerCase())
      .join(' ');

    // Simple keyword extraction (could be enhanced with NLP)
    const interestKeywords = ['interested in', 'love', 'enjoy', 'passionate about', 'like'];
    const skillKeywords = ['good at', 'experienced in', 'know', 'can', 'built', 'developed'];
    const goalKeywords = ['want to', 'goal', 'hope to', 'plan to', 'looking to'];

    return {
      interests: this.extractKeywords(userText, interestKeywords),
      skills: this.extractKeywords(userText, skillKeywords),
      goals: this.extractKeywords(userText, goalKeywords)
    };
  }

  private static extractKeywords(text: string, triggers: string[]): string[] {
    const keywords: string[] = [];
    triggers.forEach(trigger => {
      const regex = new RegExp(`${trigger}\\s+([^.!?]+)`, 'gi');
      const matches = text.matchAll(regex);
      for (const match of matches) {
        if (match[1]) {
          keywords.push(match[1].trim());
        }
      }
    });
    return keywords.slice(0, 3); // Limit to top 3
  }
}

// Export singleton instance
export const lightweightCareerSuggestionService = new LightweightCareerSuggestionService();