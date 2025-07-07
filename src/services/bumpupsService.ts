// Bumpups API service for video analysis and interactive querying
// Using Firebase Cloud Function proxy to avoid CORS issues

interface BumpupsTimestamp {
  time: number; // seconds
  title: string;
  description?: string;
}

interface BumpupsSummary {
  short: string;
  detailed: string;
  keyPoints: string[];
}

interface BumpupsAnalysisResult {
  videoId: string;
  videoUrl: string;
  title?: string;
  summary: BumpupsSummary;
  timestamps: BumpupsTimestamp[];
  processingTime: number;
  confidence: number;
  language?: string;
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
  private baseUrl: string;

  constructor() {
    // Get project ID from environment variables
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'offscript-8f6eb';
    
    // Use the standard Firebase Functions URL format
    this.baseUrl = `https://us-central1-${projectId}.cloudfunctions.net/bumpupsProxy`;
    
    console.log('BumpupsService initialized with URL:', this.baseUrl);
  }

  /**
   * Query video with Bumpups API via Firebase Function proxy
   */
  async queryVideo(youtubeUrl: string, prompt: string): Promise<any> {
    try {
      console.log(`Querying Bumpups API via proxy: ${this.baseUrl}`);
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: youtubeUrl,
          model: 'bump-1.0',
          prompt: prompt,
          language: 'en',
          output_format: 'text'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Bumpups proxy error: ${response.status} ${response.statusText} - ${errorData.error || errorData.details || 'Unknown error'}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error querying video:', error);
      throw error;
    }
  }

  /**
   * Comprehensive video analysis using multiple queries
   */
  async analyzeVideoComplete(youtubeUrl: string): Promise<BumpupsAnalysisResult> {
    try {
      // Get summary
      const summaryResult = await this.queryVideo(youtubeUrl, 
        "Provide a detailed summary of this video. Include the main topics covered and key takeaways."
      );

      // Get timestamps
      const timestampsResult = await this.queryVideo(youtubeUrl,
        "List the main topics and their timestamps in this format: 'MM:SS - Topic description'. Provide at least 5-10 key moments."
      );

      // Get career information
      const skillsResult = await this.queryVideo(youtubeUrl,
        "What specific skills are required or mentioned for this career? List them clearly."
      );

      const salaryResult = await this.queryVideo(youtubeUrl,
        "What salary information, compensation, or pay range is mentioned in this video?"
      );

      const educationResult = await this.queryVideo(youtubeUrl,
        "What education requirements, degrees, certifications, or training are mentioned?"
      );

      const responsibilitiesResult = await this.queryVideo(youtubeUrl,
        "What are the main job responsibilities and daily tasks described in this video?"
      );

      const adviceResult = await this.queryVideo(youtubeUrl,
        "What career advice or tips are given for someone interested in this field?"
      );

      // Parse timestamps from the response
      const timestamps = this.parseTimestamps(timestampsResult.output || '');

      // Extract video ID for result
      const videoId = this.extractVideoId(youtubeUrl) || '';

      return {
        videoId,
        videoUrl: youtubeUrl,
        title: '', // Will be filled by YouTube metadata
        summary: {
          short: this.extractShortSummary(summaryResult.output || ''),
          detailed: summaryResult.output || '',
          keyPoints: this.extractKeyPoints(summaryResult.output || ''),
        },
        timestamps,
        processingTime: 0,
        confidence: 85, // Default confidence for chat-based analysis
        language: 'en',
      };
    } catch (error) {
      console.error('Error in comprehensive video analysis:', error);
      throw error;
    }
  }

  /**
   * Parse timestamps from text response
   */
  private parseTimestamps(text: string): BumpupsTimestamp[] {
    const timestamps: BumpupsTimestamp[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      // Look for patterns like "MM:SS - Description" or "M:SS - Description"
      const match = line.match(/(\d{1,2}:\d{2})\s*-\s*(.+)/);
      if (match) {
        const [, timeStr, description] = match;
        const [minutes, seconds] = timeStr.split(':').map(Number);
        const timeInSeconds = minutes * 60 + seconds;
        
        timestamps.push({
          time: timeInSeconds,
          title: description.trim(),
          description: description.trim(),
        });
      }
    }
    
    return timestamps;
  }

  /**
   * Extract short summary from detailed text
   */
  private extractShortSummary(text: string): string {
    const sentences = text.split(/[.!?]+/);
    const firstTwoSentences = sentences.slice(0, 2).join('. ').trim();
    return firstTwoSentences.length > 200 
      ? firstTwoSentences.substring(0, 200) + '...'
      : firstTwoSentences;
  }

  /**
   * Extract key points from summary text
   */
  private extractKeyPoints(text: string): string[] {
    const points: string[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Look for bullet points or numbered lists
      if (trimmed.match(/^[-•*]\s/) || trimmed.match(/^\d+\.\s/)) {
        const point = trimmed.replace(/^[-•*]\s/, '').replace(/^\d+\.\s/, '').trim();
        if (point.length > 10) {
          points.push(point);
        }
      }
    }
    
    // If no structured points found, extract sentences
    if (points.length === 0) {
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
      return sentences.slice(0, 5).map(s => s.trim());
    }
    
    return points.slice(0, 8);
  }

  /**
   * Extract video ID from URL
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
   * Get career-relevant questions for a video
   */
  getCareerQuestions(): string[] {
    return [
      "What skills are required for this career?",
      "What is the typical salary range mentioned?",
      "What education or training is needed?",
      "What are the main responsibilities of this job?",
      "What career progression opportunities are discussed?",
      "What challenges or difficulties are mentioned?",
      "What advice is given for getting started?",
      "What tools or software are mentioned?",
      "What industry trends are discussed?",
      "What work environment or culture is described?"
    ];
  }

  /**
   * Extract career-relevant information from a video
   */
  async extractCareerInfo(youtubeUrl: string): Promise<{
    skills: string[];
    salary: string;
    education: string[];
    responsibilities: string[];
    advice: string[];
  }> {
    const questions = [
      "What specific skills are needed for this career?",
      "What salary or compensation is mentioned?",
      "What education, degrees, or certifications are required?",
      "What are the main job responsibilities and daily tasks?",
      "What advice is given for someone starting this career path?"
    ];

    const results = await Promise.all(
      questions.map(q => this.queryVideo(youtubeUrl, q))
    );

    return {
      skills: this.extractListFromAnswer(results[0]?.output || ''),
      salary: results[1]?.output || 'Not specified',
      education: this.extractListFromAnswer(results[2]?.output || ''),
      responsibilities: this.extractListFromAnswer(results[3]?.output || ''),
      advice: this.extractListFromAnswer(results[4]?.output || ''),
    };
  }

  /**
   * Helper method to extract lists from AI responses
   */
  private extractListFromAnswer(answer: string): string[] {
    // Simple extraction - look for bullet points, numbered lists, or comma-separated items
    const lines = answer.split('\n').filter(line => line.trim());
    const items: string[] = [];

    for (const line of lines) {
      // Remove bullet points, numbers, and clean up
      const cleaned = line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim();
      if (cleaned && !cleaned.includes('not mentioned') && !cleaned.includes('not specified')) {
        items.push(cleaned);
      }
    }

    // If no structured list found, try comma separation
    if (items.length === 0 && answer.includes(',')) {
      return answer.split(',').map(item => item.trim()).filter(item => item.length > 0);
    }

    return items.slice(0, 5); // Limit to 5 items
  }

  /**
   * Format timestamps for display
   */
  formatTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Convert Bumpups timestamps to YouTube URL with timestamp
   */
  createTimestampUrl(videoId: string, timestamp: number): string {
    return `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(timestamp)}s`;
  }

  /**
   * Comprehensive career exploration analysis for youth platform
   */
  async analyzeForCareerExploration(youtubeUrl: string): Promise<any> {
    const careerExplorationPrompt = `
Analyse this video for a youth career exploration platform. Identify the key career themes, environments, soft skills, challenges, and work styles demonstrated in the video. Extract aspirational and emotional elements that could inspire a young person considering this career path. Provide hashtags that summarise these insights. Highlight moments in the video where these insights are clearly demonstrated.

Generate 3 reflective questions based on this analysis to prompt a young user after watching this video.

Identify which OffScript career pathways this video could support (e.g., creative industries, STEM, social impact, trades, healthcare, business, education).

Structure your output using markdown formatting as follows:

## 1. Key Career Themes
- List the main career themes and environments shown

## 2. Emotional and Aspirational Elements  
- Elements that could inspire young people
- Motivational aspects of the career

## 3. Relevant Soft Skills
- Communication, leadership, problem-solving, etc.
- How these skills are demonstrated

## 4. Work Environment & Challenges
- Typical work settings and conditions
- Common challenges and how they're addressed

## 5. Quotable Moments
- Inspiring quotes from the video with timestamps (MM:SS format)
- Key insights that stand out

## 6. Reflective Questions
1. [Question 1]
2. [Question 2] 
3. [Question 3]

## 7. OffScript Career Pathways
- Which pathways this video supports
- How it connects to career exploration

## 8. Hashtags
#hashtag1 #hashtag2 #hashtag3 #hashtag4 #hashtag5

Provide rich, actionable insights that help young people understand both the practical and emotional aspects of this career path.`;

    return await this.queryVideo(youtubeUrl, careerExplorationPrompt);
  }
}

export default BumpupsService;
export type { 
  BumpupsAnalysisResult, 
  BumpupsTimestamp, 
  BumpupsSummary, 
  BumpupsQueryResponse,
  BumpupsJobStatus 
}; 