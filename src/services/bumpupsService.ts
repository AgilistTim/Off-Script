// Bumpups API service for video analysis and interactive querying
// Using Firebase Cloud Function proxy to avoid CORS issues
import env from '../config/environment';

// Define the response structure from the Bumpups API
export interface BumpupsResponse {
  videoId: string;
  title: string;
  description: string;
  transcript?: string;
  confidence: number;
  skillsHighlighted?: string[];
  educationRequired?: string[];
  careerPathways?: string[];
  jobSummary?: string;
  keyTakeaways?: string[];
  hashtags?: string[];
  output?: string; // Raw output field for compatibility with older responses
}

// Define the structure for timestamps in the video
interface BumpupsTimestamp {
  time: string;
  description: string;
}

// Define the structure for the analysis result
export interface BumpupsAnalysisResult {
  summary: string;
  timestamps: BumpupsTimestamp[];
  skills: string[];
  salary: string;
  education: string[];
  responsibilities: string[];
  advice: string;
}

interface BumpupsSummary {
  short: string;
  detailed: string;
  keyPoints: string[];
}

interface BumpupsQueryResponse {
  answer: string;
  confidence: number;
  relatedTimestamps: BumpupsTimestamp[];
  sources: Array<{
    time: number;
    text: string;
  }>;
}

interface BumpupsJobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  estimatedTimeRemaining?: number;
  result?: BumpupsAnalysisResult;
  error?: string;
}

class BumpupsService {
  private apiUrl: string;
  
  // Singleton instance
  private static instance: BumpupsService;

  constructor() {
    this.apiUrl = env.apiEndpoints.bumpupsProxy || '';
    console.log('BumpupsService initialized with URL:', this.apiUrl);
  }
  
  /**
   * Get singleton instance of BumpupsService
   */
  public static getInstance(): BumpupsService {
    if (!BumpupsService.instance) {
      BumpupsService.instance = new BumpupsService();
    }
    return BumpupsService.instance;
  }

  /**
   * Process a video URL through the Bumpups API service
   * @param videoUrl YouTube video URL to analyze
   * @param options Optional parameters for the API call
   * @returns Processed response with career information
   */
  async processVideo(
    videoUrl: string, 
    options?: {
      prompt?: string;
      model?: string;
      language?: string;
      output_format?: string;
    }
  ): Promise<BumpupsResponse> {
    try {
      console.log('Querying Bumpups API via proxy:', this.apiUrl);
      
      if (!this.apiUrl) {
        throw new Error('Bumpups API URL not configured');
      }

      // Default prompt for career exploration
      const careerPrompt = options?.prompt || 
        "Analyse this video for a youth career exploration platform for 16–20-year-olds. Return your output in clear markdown using the following exact structure with bullet lists:\n\n# Key Themes and Environments\n- (max 5 themes/environments)\n\n# Soft Skills Demonstrated\n- (max 5 soft skills)\n\n# Challenges Highlighted\n- (max 5 challenges)\n\n# Aspirational and Emotional Elements\n- Timestamp – Quotation or moment (max 5)\n\n# Suggested Hashtags\n- #hashtag1\n- #hashtag2\n(up to 10)\n\n# Recommended Career Paths\n- (max 3 career paths)\n\n# Reflective Prompts for Young Viewers\n- Prompt 1\n- Prompt 2\n- Prompt 3\n\nReturn only the structured markdown without additional commentary";

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: videoUrl,
          prompt: careerPrompt,
          model: options?.model || 'bump-1.0',
          language: options?.language || 'en',
          output_format: options?.output_format || 'markdown',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bumpups API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log('Bumpups API raw response:', data);
      
      // Check if the output is truncated (ends with "..." or similar)
      const outputText = data.output || '';
      const isTruncated = outputText.endsWith('...') || outputText.endsWith('…');
      
      if (isTruncated) {
        console.warn('Bumpups API response appears to be truncated. Using available content.');
      }
      
      // Process the response to extract career information
      const result: BumpupsResponse = {
        videoId: this.extractVideoId(videoUrl) || '',
        title: data.title || '',
        description: data.description || '',
        confidence: data.confidence || 90, // Default confidence if not provided
        output: data.output || '',
        jobSummary: data.output || '',
        skillsHighlighted: this.extractSkillsFromOutput(data.output || ''),
        careerPathways: this.extractPathwaysFromOutput(data.output || ''),
        hashtags: this.extractHashtagsFromOutput(data.output || '')
      };
      
      // Log the processed result for debugging
      console.log('Processed Bumpups result:', {
        videoId: result.videoId,
        confidence: result.confidence,
        skillsCount: result.skillsHighlighted?.length || 0,
        pathwaysCount: result.careerPathways?.length || 0,
        hashtagsCount: result.hashtags?.length || 0,
        outputLength: result.output?.length || 0
      });
      
      return result;
    } catch (error) {
      console.error('Error processing video with Bumpups:', error);
      throw error;
    }
  }

  /**
   * Extract skills from output text
   */
  private extractSkillsFromOutput(output: string): string[] {
    const skills = new Set<string>();
    
    // Look for skills section
    const skillsMatch = output.match(/skills[:\s-]+([^\n]+)/i);
    if (skillsMatch && skillsMatch[1]) {
      const skillsList = skillsMatch[1].split(/[,;]/).map(s => s.trim()).filter(Boolean);
      skillsList.forEach(skill => skills.add(skill));
    }
    
    // Also look for common skill keywords
    const skillKeywords = ['programming', 'coding', 'javascript', 'python', 'react', 'html', 'css', 
                          'communication', 'leadership', 'management', 'design', 'analysis'];
    
    skillKeywords.forEach(keyword => {
      if (output.toLowerCase().includes(keyword)) {
        skills.add(keyword.charAt(0).toUpperCase() + keyword.slice(1));
      }
    });
    
    return Array.from(skills).slice(0, 10); // Limit to 10 skills
  }
  
  /**
   * Extract career pathways from output text
   */
  private extractPathwaysFromOutput(output: string): string[] {
    const pathways = new Set<string>();
    
    // Look for career pathways section
    const pathwaysMatch = output.match(/career paths?[:\s-]+([^\n]+)/i);
    if (pathwaysMatch && pathwaysMatch[1]) {
      const pathwaysList = pathwaysMatch[1].split(/[,;]/).map(p => p.trim()).filter(Boolean);
      pathwaysList.forEach(pathway => pathways.add(pathway));
    }
    
    // Also look for common pathway keywords
    const pathwayKeywords = ['software development', 'data science', 'AI', 'machine learning', 'blockchain', 'cybersecurity'];
    
    pathwayKeywords.forEach(keyword => {
      if (output.toLowerCase().includes(keyword.toLowerCase())) {
        pathways.add(keyword.charAt(0).toUpperCase() + keyword.slice(1));
      }
    });
    
    return Array.from(pathways).slice(0, 5); // Limit to 5 pathways
  }
  
  /**
   * Extract hashtags from output text
   */
  private extractHashtagsFromOutput(output: string): string[] {
    const hashtags = new Set<string>();
    
    // Look for hashtags in the text
    const hashtagPattern = /#\w+/g;
    const matches = output.match(hashtagPattern);
    
    if (matches) {
      matches.forEach(match => {
        hashtags.add(match);
      });
    }
    
    // If no hashtags found, generate from keywords
    if (hashtags.size === 0) {
      const keywords = output.split(/\s+/).filter(word => 
        word.length > 4 && !['about', 'these', 'their', 'there', 'which', 'would'].includes(word.toLowerCase())
      ).slice(0, 5);
      
      keywords.forEach(keyword => {
        hashtags.add('#' + keyword.replace(/[^\w]/g, ''));
      });
    }
    
    return Array.from(hashtags).slice(0, 5); // Limit to 5 hashtags
  }

  /**
   * Get comprehensive analysis of a career video
   */
  async getVideoAnalysis(youtubeUrl: string): Promise<BumpupsAnalysisResult> {
    try {
      // Get the full analysis in a single call
      const result = await this.processVideo(youtubeUrl);
      
      // Extract or provide default values for all required fields
      const summary = result.jobSummary || result.output || '';
      const skills = result.skillsHighlighted || [];
      const education = result.educationRequired || [];
      
      // Parse timestamps if available or provide empty array
      const timestamps: BumpupsTimestamp[] = [];
      
      return {
        summary,
        timestamps,
        skills,
        salary: '',
        education,
        responsibilities: [],
        advice: '',
      };
    } catch (error) {
      console.error('Error getting video analysis:', error);
      throw error;
    }
  }

  /**
   * Get answers to specific questions about the video
   */
  async askQuestions(youtubeUrl: string, questions: string[]): Promise<string[]> {
    try {
      // For now, we just return the same analysis for all questions
      // This will be enhanced in the future to support specific questions
      const result = await this.processVideo(youtubeUrl);
      
      // Return the output or a default message for each question
      return questions.map(() => result.output || 'No information available');
    } catch (error) {
      console.error('Error asking questions:', error);
      throw error;
    }
  }

  /**
   * Get career exploration data from a video
   */
  async getCareerExplorationData(youtubeUrl: string): Promise<{
    skills: string[];
    education: string[];
    pathways: string[];
    confidence: number;
  }> {
    try {
      const result = await this.processVideo(youtubeUrl);
      
      // Ensure the result has a confidence value
      if (!result.confidence && result.confidence !== 0) {
        result.confidence = 90;
      }
      
      return {
        skills: result.skillsHighlighted || [],
        education: result.educationRequired || [],
        pathways: result.careerPathways || [],
        confidence: result.confidence,
      };
    } catch (error) {
      console.error('Error getting career exploration data:', error);
      throw error;
    }
  }

  /**
   * Extract video ID from a YouTube URL
   */
  private extractVideoId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  /**
   * Get standard career-related questions for a video
   */
  getCareerQuestions(): string[] {
    return [
      "What skills are required for this career?",
      "What education or qualifications are needed?",
      "What is the typical salary range?",
      "What are the main responsibilities?",
      "What advice is given for people interested in this career?",
    ];
  }

  /**
   * Format a timestamp in MM:SS format
   */
  formatTimestamp(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
  }

  /**
   * Create a direct link to a specific timestamp in a YouTube video
   */
  createTimestampUrl(videoId: string, timestamp: number): string {
    return `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(timestamp)}s`;
  }
}

// Create and export a singleton instance
const bumpupsService = new BumpupsService();
export default bumpupsService;