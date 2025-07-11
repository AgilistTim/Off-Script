// SECURITY WARNING: This service should NOT be used in the browser
// OpenAI API calls must be made server-side to protect API keys
// Use secureVideoProcessingService.ts instead

// import OpenAI from 'openai';

// // DISABLED: Initialize OpenAI client - NEVER expose API keys in browser!
// const openai = new OpenAI({
//   apiKey: import.meta.env.VITE_OPENAI_API_KEY,
//   dangerouslyAllowBrowser: false // SECURITY: Never set this to true
// });

console.warn('⚠️ SECURITY WARNING: openaiVideoAnalysisService.ts should not be used in browser. Use secureVideoProcessingService.ts instead.');

export interface OpenAIVideoAnalysis {
  // Career-focused analysis
  careerInsights: {
    primaryCareerField: string;
    relatedCareerPaths: string[];
    skillsHighlighted: string[];
    educationRequirements: string;
    careerStage: 'entry-level' | 'mid-level' | 'senior' | 'any';
    salaryInsights?: {
      mentioned: boolean;
      range?: string;
      context?: string;
    };
  };
  
  // Content analysis
  contentAnalysis: {
    summary: string;
    keyTakeaways: string[];
    targetAudience: string;
    difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
    estimatedWatchTime: number | string; // minutes or string format
  };
  
  // Engagement features
  engagement: {
    hashtags: string[];
    reflectionQuestions: string[];
    actionableAdvice: string[];
    inspirationalQuotes: string[];
  };
  
  // Timestamp-based insights
  keyMoments?: Array<{
    timestamp: number | string; // seconds or MM:SS format
    title?: string;
    description: string;
    importance: 'high' | 'medium' | 'low';
    type: 'skill' | 'advice' | 'example' | 'transition' | 'summary' | 'career-advice' | 'skill-demo' | 'success-story' | 'challenge' | 'tip';
  }>;
  
  // Metadata
  analysisMetadata?: {
    confidence: number;
    processingTime: number;
    transcriptLength: number;
    analysisVersion: string;
    analyzedAt: string;
    error?: string;
  };
}

export async function generateOpenAIVideoAnalysis(
  transcript: string,
  videoMetadata?: {
    title?: string;
    description?: string;
    duration?: number;
    channelName?: string;
  }
): Promise<OpenAIVideoAnalysis> {
  const startTime = Date.now();
  
  try {
    // Construct the prompt with career exploration focus
    const prompt = createCareerExplorationPrompt(transcript, videoMetadata);
    
    // SECURITY WARNING: This service should NOT be used in the browser
    // OpenAI API calls must be made server-side to protect API keys
    // Use secureVideoProcessingService.ts instead

    // const completion = await openai.chat.completions.create({
    //   model: 'gpt-4o-mini',
    //   messages: [
    //     {
    //       role: 'system',
    //       content: 'You are a career exploration AI assistant specializing in analyzing video content for 16-20 year olds exploring career paths. Always respond with valid JSON following the specified schema.'
    //     },
    //     {
    //       role: 'user',
    //       content: prompt
    //     }
    //   ],
    //   temperature: 0.3,
    //   max_tokens: 2000,
    //   response_format: { type: 'json_object' }
    // });

    // const response = completion.choices[0]?.message?.content;
    // if (!response) {
    //   throw new Error('No response received from OpenAI');
    // }

    // Parse and validate the response
    // const analysis = parseOpenAIResponse(response);
    
    // Add metadata
    // analysis.analysisMetadata = {
    //   confidence: calculateConfidenceScore(analysis),
    //   processingTime: Date.now() - startTime,
    //   transcriptLength: transcript.length,
    //   analysisVersion: '1.0.0',
    //   analyzedAt: new Date().toISOString()
    // };

    // Return fallback analysis
    return createFallbackAnalysis(transcript, videoMetadata, {
      confidence: 0.1,
      processingTime: Date.now() - startTime,
      transcriptLength: transcript.length,
      analysisVersion: '1.0.0',
      analyzedAt: new Date().toISOString(),
      error: 'OpenAI API calls are disabled in this browser environment.'
    });

  } catch (error) {
    console.error('OpenAI analysis failed:', error);
    
    // Return fallback analysis
    return createFallbackAnalysis(transcript, videoMetadata, {
      confidence: 0.1,
      processingTime: Date.now() - startTime,
      transcriptLength: transcript.length,
      analysisVersion: '1.0.0',
      analyzedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function createCareerExplorationPrompt(
  transcript: string,
  videoMetadata?: {
    title?: string;
    description?: string;
    duration?: number;
    channelName?: string;
  }
): string {
  const metadataContext = videoMetadata ? `
Video Title: ${videoMetadata.title || 'Unknown'}
Channel: ${videoMetadata.channelName || 'Unknown'}
Duration: ${videoMetadata.duration ? Math.round(videoMetadata.duration / 60) : 'Unknown'} minutes
Description: ${videoMetadata.description || 'No description available'}
` : '';

  return `${metadataContext}

Please analyze this video transcript for career exploration purposes, targeting 16-20 year olds. Provide insights about career paths, skills, and opportunities mentioned.

Transcript:
${transcript.length > 3000 ? transcript.substring(0, 3000) + '...' : transcript}

Respond with JSON in exactly this format:
{
  "careerInsights": {
    "primaryField": "main career field discussed",
    "relatedCareerPaths": ["career1", "career2", "career3"],
    "skillsHighlighted": ["skill1", "skill2", "skill3"],
    "educationRequirements": "brief education overview",
    "careerStage": "entry-level|mid-career|senior|all-levels",
    "salaryInsights": "salary range or earning potential mentioned"
  },
  "contentAnalysis": {
    "summary": "2-3 sentence summary of key points",
    "keyTakeaways": ["takeaway1", "takeaway2", "takeaway3"],
    "targetAudience": "who this content is best for",
    "difficultyLevel": "beginner|intermediate|advanced",
    "estimatedWatchTime": "time in minutes to watch actively"
  },
  "engagementFeatures": {
    "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
    "reflectionQuestions": ["question1", "question2"],
    "actionableAdvice": ["advice1", "advice2", "advice3"],
    "inspirationalQuotes": ["quote1", "quote2"]
  },
  "keyMoments": [
    {
      "timestamp": "MM:SS",
      "description": "what happens at this moment",
      "importance": "high|medium|low",
      "type": "career-advice|skill-demo|success-story|challenge|tip"
    }
  ]
}`;
}

function parseOpenAIResponse(response: string): OpenAIVideoAnalysis {
  try {
    const parsed = JSON.parse(response);
    
    // Validate required fields exist
    if (!parsed.careerInsights || !parsed.contentAnalysis || !parsed.engagementFeatures) {
      throw new Error('Missing required fields in OpenAI response');
    }

    return {
      careerInsights: {
        primaryCareerField: parsed.careerInsights.primaryField || 'General',
        relatedCareerPaths: Array.isArray(parsed.careerInsights.relatedCareerPaths) 
          ? parsed.careerInsights.relatedCareerPaths.slice(0, 5) 
          : [],
        skillsHighlighted: Array.isArray(parsed.careerInsights.skillsHighlighted)
          ? parsed.careerInsights.skillsHighlighted.slice(0, 8)
          : [],
        educationRequirements: parsed.careerInsights.educationRequirements || 'Varies',
        careerStage: ['entry-level', 'mid-level', 'senior', 'any'].includes(parsed.careerInsights.careerStage)
          ? parsed.careerInsights.careerStage
          : 'any',
        salaryInsights: typeof parsed.careerInsights.salaryInsights === 'string' 
          ? { mentioned: true, range: parsed.careerInsights.salaryInsights }
          : parsed.careerInsights.salaryInsights || { mentioned: false }
      },
      contentAnalysis: {
        summary: parsed.contentAnalysis.summary || 'No summary available',
        keyTakeaways: Array.isArray(parsed.contentAnalysis.keyTakeaways)
          ? parsed.contentAnalysis.keyTakeaways.slice(0, 5)
          : [],
        targetAudience: parsed.contentAnalysis.targetAudience || 'General audience',
        difficultyLevel: ['beginner', 'intermediate', 'advanced'].includes(parsed.contentAnalysis.difficultyLevel)
          ? parsed.contentAnalysis.difficultyLevel
          : 'beginner',
        estimatedWatchTime: parsed.contentAnalysis.estimatedWatchTime || '5 minutes'
      },
      engagement: {
        hashtags: Array.isArray(parsed.engagementFeatures.hashtags)
          ? parsed.engagementFeatures.hashtags.slice(0, 6)
          : [],
        reflectionQuestions: Array.isArray(parsed.engagementFeatures.reflectionQuestions)
          ? parsed.engagementFeatures.reflectionQuestions.slice(0, 3)
          : [],
        actionableAdvice: Array.isArray(parsed.engagementFeatures.actionableAdvice)
          ? parsed.engagementFeatures.actionableAdvice.slice(0, 5)
          : [],
        inspirationalQuotes: Array.isArray(parsed.engagementFeatures.inspirationalQuotes)
          ? parsed.engagementFeatures.inspirationalQuotes.slice(0, 3)
          : []
      },
      keyMoments: Array.isArray(parsed.keyMoments)
        ? parsed.keyMoments.slice(0, 10).map((moment: any) => ({
            timestamp: moment.timestamp || '0:00',
            description: moment.description || 'Key moment',
            importance: ['high', 'medium', 'low'].includes(moment.importance) ? moment.importance : 'medium',
            type: ['skill', 'advice', 'example', 'transition', 'summary', 'career-advice', 'skill-demo', 'success-story', 'challenge', 'tip'].includes(moment.type)
              ? moment.type
              : 'career-advice'
          }))
        : []
    };
  } catch (error) {
    console.error('Failed to parse OpenAI response:', error);
    throw new Error('Invalid JSON response from OpenAI');
  }
}

function calculateConfidenceScore(analysis: OpenAIVideoAnalysis): number {
  let score = 0.5; // Base score
  
  // Boost for career insights
  if (analysis.careerInsights.primaryCareerField && analysis.careerInsights.primaryCareerField !== 'General') score += 0.15;
  if (analysis.careerInsights.relatedCareerPaths.length > 0) score += 0.1;
  if (analysis.careerInsights.skillsHighlighted.length > 2) score += 0.1;
  
  // Boost for content quality
  if (analysis.contentAnalysis.summary.length > 50) score += 0.05;
  if (analysis.contentAnalysis.keyTakeaways.length > 2) score += 0.05;
  
  // Boost for engagement features
  if (analysis.engagement.hashtags.length > 0) score += 0.05;
  if (analysis.keyMoments && analysis.keyMoments.length > 0) score += 0.1;
  
  return Math.min(1.0, score);
}

function createFallbackAnalysis(
  transcript: string, 
  videoMetadata?: any,
  metadata?: any
): OpenAIVideoAnalysis {
  return {
    careerInsights: {
      primaryCareerField: 'General',
      relatedCareerPaths: [],
      skillsHighlighted: [],
      educationRequirements: 'To be determined',
      careerStage: 'any',
      salaryInsights: { mentioned: false }
    },
    contentAnalysis: {
      summary: 'Analysis unavailable due to processing error',
      keyTakeaways: [],
      targetAudience: 'General audience',
      difficultyLevel: 'beginner',
      estimatedWatchTime: videoMetadata?.duration ? `${Math.round(videoMetadata.duration / 60)} minutes` : 'Unknown'
    },
    engagement: {
      hashtags: [],
      reflectionQuestions: [],
      actionableAdvice: [],
      inspirationalQuotes: []
    },
    keyMoments: [],
    analysisMetadata: metadata
  };
}

export default {
  generateOpenAIVideoAnalysis
}; 