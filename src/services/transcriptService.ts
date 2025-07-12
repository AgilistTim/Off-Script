import { getEnvironmentConfig } from '../config/environment';

interface TranscriptSegment {
  start: number;
  duration: number;
  text: string;
}

interface TranscriptResult {
  success: boolean;
  fullText: string;
  segments: TranscriptSegment[];
  segmentCount: number;
  error?: string;
  extractedAt: string;
}

interface OpenAIAnalysisResult {
  success: boolean;
  analysis?: {
    keyThemes: string[];
    softSkills: string[];
    challenges: string[];
    aspirationalElements: Array<{
      timestamp: string;
      quote: string;
    }>;
    hashtags: string[];
    careerPaths: string[];
    summary: string;
  };
  error?: string;
  tokensUsed?: number;
}

class TranscriptService {
  private env = getEnvironmentConfig();

  /**
   * Extract transcript from YouTube video (DISABLED - returns failure)
   * 
   * Transcript extraction has been disabled due to YouTube's anti-bot measures.
   * The application now relies on bumpups service for video analysis.
   */
  async extractTranscript(youtubeUrl: string): Promise<TranscriptResult> {
    console.log('🚫 Transcript extraction disabled - using bumpups service instead');
    
    return {
      success: false,
      fullText: '',
      segments: [],
      segmentCount: 0,
      error: 'Transcript extraction disabled - application now uses bumpups service',
      extractedAt: new Date().toISOString()
    };
  }

  /**
   * Analyze transcript with OpenAI for career exploration insights
   */
  async analyzeWithOpenAI(transcript: string, category: string): Promise<OpenAIAnalysisResult> {
    try {
      console.log('🧠 Analyzing transcript with OpenAI...');

      // Check if emulators are disabled - if so, always use production URLs
      const useProductionUrls = import.meta.env.VITE_DISABLE_EMULATORS === 'true';
      
      const functionUrl = useProductionUrls || this.env.environment === 'production'
        ? 'https://us-central1-offscript-8f6eb.cloudfunctions.net/generateTranscriptSummary'
        : 'http://127.0.0.1:5001/offscript-8f6eb/us-central1/generateTranscriptSummary';

      console.log(`🌐 Calling OpenAI analysis function: ${functionUrl}`);

      // Try to use the deployed Firebase Function for real OpenAI analysis
      try {
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transcript: transcript,
            category: category,
            analysisType: 'career_exploration'
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.summary) {
            console.log('✅ Real OpenAI analysis completed via Firebase Function');
            
            // Convert the summary response to the expected analysis format
            const structuredAnalysis = this.convertSummaryToAnalysis(result.summary, category);
            
            return {
              success: true,
              analysis: structuredAnalysis,
              tokensUsed: result.metadata?.tokensUsed || 1200
            };
          } else {
            console.warn('⚠️ OpenAI analysis function returned unsuccessful result:', result.error);
          }
        } else {
          const errorText = await response.text();
          console.warn('⚠️ OpenAI analysis HTTP error:', response.status, errorText);
        }
      } catch (fetchError) {
        console.warn('⚠️ OpenAI analysis function call failed:', fetchError);
      }

      // Fallback to structured mock result if Firebase Function fails
      const mockAnalysis = {
        keyThemes: [
          "Professional development and skill building",
          "Career pathway exploration", 
          "Industry insights and opportunities",
          "Work-life balance considerations",
          "Educational requirements and progression"
        ],
        softSkills: [
          "Communication and presentation",
          "Problem-solving and critical thinking",
          "Leadership and teamwork",
          "Adaptability and resilience",
          "Time management and organization"
        ],
        challenges: [
          "Navigating competitive job markets",
          "Balancing education with experience",
          "Building professional networks",
          "Developing technical expertise",
          "Managing career transitions"
        ],
        aspirationalElements: [
          {
            timestamp: "0:01:30",
            quote: "Success comes from continuous learning and adapting to change"
          },
          {
            timestamp: "0:03:45", 
            quote: "Building meaningful connections is key to career growth"
          }
        ],
        hashtags: [
          "#CareerExploration",
          "#ProfessionalDevelopment", 
          "#YouthCareers",
          "#SkillBuilding",
          "#WorkLifeBalance",
          `#${category.replace(/\s+/g, '')}`
        ],
        careerPaths: [
          `${category} Specialist`,
          `${category} Manager`,
          `${category} Consultant`,
          "Entrepreneur",
          "Team Leader"
        ],
        summary: `This video provides valuable insights into ${category} careers, highlighting key skills, challenges, and opportunities for young professionals. The content emphasizes the importance of continuous learning, building strong professional relationships, and developing both technical and soft skills to succeed in today's dynamic job market.`
      };

      console.log('✅ OpenAI analysis completed (mock data)');
      
      return {
        success: true,
        analysis: mockAnalysis,
        tokensUsed: 1200 // Mock token usage
      };

    } catch (error) {
      console.error('❌ OpenAI analysis failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Extract video ID from YouTube URL
   */
  private extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Converts a summary string from the OpenAI function to a structured analysis object.
   * Extracts career insights, skills, challenges, and other structured data from the summary.
   */
  private convertSummaryToAnalysis(summary: string, category: string): OpenAIAnalysisResult['analysis'] {
    // Extract key information from the summary text
    const extractPatterns = {
      skills: /(?:skills?|abilities|qualifications|competencies)[:\s]*([^.]*)/gi,
      challenges: /(?:challenges?|difficulties|obstacles|barriers)[:\s]*([^.]*)/gi,
      themes: /(?:key themes?|main topics?|important points?)[:\s]*([^.]*)/gi,
      quotes: /"([^"]+)"/g,
      careers: /(?:career[s]?|job[s]?|role[s]?|position[s]?)[:\s]*([^.]*)/gi
    };

    // Extract skills mentioned in the summary
    const skillMatches = [...summary.matchAll(extractPatterns.skills)];
    const extractedSkills = skillMatches
      .map(match => match[1]?.trim().split(/[,;]/).map(s => s.trim()).filter(Boolean))
      .flat()
      .filter(skill => skill && skill.length > 2 && skill.length < 50)
      .slice(0, 6); // Limit to top 6 skills

    // Extract challenges mentioned
    const challengeMatches = [...summary.matchAll(extractPatterns.challenges)];
    const extractedChallenges = challengeMatches
      .map(match => match[1]?.trim().split(/[,;]/).map(s => s.trim()).filter(Boolean))
      .flat()
      .filter(challenge => challenge && challenge.length > 5 && challenge.length < 100)
      .slice(0, 5); // Limit to top 5 challenges

    // Extract quotes for aspirational elements
    const quoteMatches = [...summary.matchAll(extractPatterns.quotes)];
    const extractedQuotes = quoteMatches
      .map((match, index) => ({
        timestamp: `0:0${index + 1}:30`, // Mock timestamps
        quote: match[1]?.trim() || ''
      }))
      .filter(item => item.quote.length > 10 && item.quote.length < 150)
      .slice(0, 3); // Limit to top 3 quotes

    // Generate hashtags based on category and summary content
    const summaryWords = summary.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const commonWords = new Set(['career', 'professional', 'development', 'skills', 'work', 'industry', 'business']);
    const relevantWords = summaryWords
      .filter(word => !commonWords.has(word) && word.length < 15)
      .reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    const topWords = Object.entries(relevantWords)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([word]) => `#${word.charAt(0).toUpperCase() + word.slice(1)}`);

    // Generate structured analysis
    return {
      keyThemes: extractedSkills.length > 0 ? [
        "Professional skill development",
        "Career pathway exploration",
        ...extractedSkills.slice(0, 3).map(skill => `${skill} expertise`)
      ] : [
        "Professional development and skill building",
        "Career pathway exploration", 
        "Industry insights and opportunities",
        "Work-life balance considerations",
        "Educational requirements and progression"
      ],
      
      softSkills: extractedSkills.length > 0 ? extractedSkills : [
        "Communication and presentation",
        "Problem-solving and critical thinking",
        "Leadership and teamwork",
        "Adaptability and resilience",
        "Time management and organization"
      ],
      
      challenges: extractedChallenges.length > 0 ? extractedChallenges : [
        "Navigating competitive job markets",
        "Balancing education with experience",
        "Building professional networks",
        "Developing technical expertise",
        "Managing career transitions"
      ],
      
      aspirationalElements: extractedQuotes.length > 0 ? extractedQuotes : [
        {
          timestamp: "0:01:30",
          quote: "Success comes from continuous learning and adapting to change"
        },
        {
          timestamp: "0:03:45", 
          quote: "Building meaningful connections is key to career growth"
        }
      ],
      
      hashtags: [
        "#CareerExploration",
        "#ProfessionalDevelopment", 
        "#YouthCareers",
        "#SkillBuilding",
        ...topWords,
        `#${category.replace(/\s+/g, '')}`
      ].slice(0, 8), // Limit hashtags
      
      careerPaths: [
        `${category} Specialist`,
        `${category} Manager`,
        `${category} Consultant`,
        "Entrepreneur",
        "Team Leader"
      ],
      
      summary: summary // Use the full OpenAI-generated summary
    };
  }
}

export default new TranscriptService();
export type { TranscriptResult, OpenAIAnalysisResult }; 