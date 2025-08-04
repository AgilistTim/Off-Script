// YouTube Data API v3 service for fetching video metadata
import { environmentConfig } from '../config/environment';

// Export an enhanced video metadata type
export interface EnhancedVideoMetadata {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  channelTitle: string;
  channelId: string;
  thumbnails: {
    default: string;
    medium: string;
    high: string;
    maxres?: string;
  };
  tags: string[];
  duration: string; // Duration in seconds as string
  viewCount: number;
  likeCount: number;
  commentCount: number;
  definition: 'HD' | 'SD';
  hasCaption: boolean;
  language?: string;
}

interface YouTubeVideoSnippet {
  title: string;
  description: string;
  publishedAt: string;
  channelTitle: string;
  channelId: string;
  thumbnails: {
    default: { url: string; width: number; height: number };
    medium: { url: string; width: number; height: number };
    high: { url: string; width: number; height: number };
    maxres?: { url: string; width: number; height: number };
  };
  tags?: string[];
  categoryId: string;
  defaultLanguage?: string;
  defaultAudioLanguage?: string;
}

interface YouTubeVideoStatistics {
  viewCount: string;
  likeCount?: string;
  commentCount?: string;
}

interface YouTubeVideoContentDetails {
  duration: string; // ISO 8601 format (PT4M13S)
  dimension: string; // "2d" or "3d"
  definition: string; // "hd" or "sd"
  caption: string; // "true" or "false"
}

interface YouTubeVideoResponse {
  kind: string;
  etag: string;
  items: Array<{
    kind: string;
    etag: string;
    id: string;
    snippet: YouTubeVideoSnippet;
    statistics: YouTubeVideoStatistics;
    contentDetails: YouTubeVideoContentDetails;
  }>;
}

class YouTubeService {
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';
  
  // Singleton instance
  private static instance: YouTubeService;

  constructor() {
    // Get API key from centralized configuration
    this.apiKey = environmentConfig.apiKeys.youtube || '';
    
    if (this.apiKey) {
      console.log('✅ YouTube API integration enabled');
    } else {
      console.warn('⚠️ YouTube API integration disabled - missing API key');
    }
  }
  
  /**
   * Get singleton instance of YouTubeService
   */
  public static getInstance(): YouTubeService {
    if (!YouTubeService.instance) {
      YouTubeService.instance = new YouTubeService();
    }
    return YouTubeService.instance;
  }

  /**
   * Get video metadata from YouTube API
   */
  async getVideoMetadata(url: string): Promise<EnhancedVideoMetadata | null> {
    const videoId = this.extractVideoId(url);
    if (!videoId) return null;

    try {
      // Get video details
      const videoResponse = await fetch(
        `${this.baseUrl}/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${this.apiKey}`
      );
      
      if (!videoResponse.ok) {
        const errorData = await videoResponse.json();
        throw new Error(`YouTube API error: ${errorData.error?.message || videoResponse.statusText}`);
      }

      const videoData = await videoResponse.json();
      
      if (!videoData.items || videoData.items.length === 0) {
        throw new Error('Video not found');
      }

      const video = videoData.items[0];
      const snippet: YouTubeVideoSnippet = video.snippet;
      const contentDetails = video.contentDetails;
      const statistics = video.statistics;

      // Parse duration from ISO 8601 format
      const duration = this.parseDuration(contentDetails.duration);

      return {
        videoId,
        title: snippet.title,
        description: snippet.description,
        publishedAt: snippet.publishedAt,
        channelTitle: snippet.channelTitle,
        channelId: snippet.channelId,
        thumbnails: {
          default: snippet.thumbnails.default.url,
          medium: snippet.thumbnails.medium.url,
          high: snippet.thumbnails.high.url,
          maxres: snippet.thumbnails.maxres?.url,
        },
        tags: snippet.tags || [],
        duration: duration.toString(), // Duration in seconds as string
        viewCount: parseInt(statistics.viewCount || '0'),
        likeCount: parseInt(statistics.likeCount || '0'),
        commentCount: parseInt(statistics.commentCount || '0'),
        definition: contentDetails.definition.toUpperCase() as 'HD' | 'SD',
        hasCaption: contentDetails.caption === 'true',
        language: snippet.defaultLanguage || snippet.defaultAudioLanguage,
      };
    } catch (error) {
      console.error('Error fetching video metadata:', error);
      return null;
    }
  }

  /**
   * Extract video ID from YouTube URL
   */
  extractVideoId(url: string): string | null {
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
   * Parse ISO 8601 duration to seconds
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Search videos by keyword
   */
  async searchVideos(query: string, maxResults = 10): Promise<EnhancedVideoMetadata[]> {
    if (!this.apiKey) {
      console.error('YouTube API key not available');
      return [];
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${this.apiKey}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`YouTube API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      // Get detailed info for each video
      const videoIds = data.items.map((item: any) => item.id.videoId).join(',');
      const detailsResponse = await fetch(
        `${this.baseUrl}/videos?part=snippet,contentDetails,statistics&id=${videoIds}&key=${this.apiKey}`
      );
      
      if (!detailsResponse.ok) {
        const errorData = await detailsResponse.json();
        throw new Error(`YouTube API error: ${errorData.error?.message || detailsResponse.statusText}`);
      }

      const detailsData = await detailsResponse.json();
      
      return detailsData.items.map((video: any) => {
        const snippet: YouTubeVideoSnippet = video.snippet;
        const contentDetails = video.contentDetails;
        const statistics = video.statistics;
        const duration = this.parseDuration(contentDetails.duration);

        return {
          videoId: video.id,
          title: snippet.title,
          description: snippet.description,
          publishedAt: snippet.publishedAt,
          channelTitle: snippet.channelTitle,
          channelId: snippet.channelId,
          thumbnails: {
            default: snippet.thumbnails.default.url,
            medium: snippet.thumbnails.medium.url,
            high: snippet.thumbnails.high.url,
            maxres: snippet.thumbnails.maxres?.url,
          },
          tags: snippet.tags || [],
          duration: duration.toString(),
          viewCount: parseInt(statistics.viewCount || '0'),
          likeCount: parseInt(statistics.likeCount || '0'),
          commentCount: parseInt(statistics.commentCount || '0'),
          definition: contentDetails.definition.toUpperCase() as 'HD' | 'SD',
          hasCaption: contentDetails.caption === 'true',
          language: snippet.defaultLanguage || snippet.defaultAudioLanguage,
        };
      });
    } catch (error) {
      console.error('Error searching videos:', error);
      return [];
    }
  }
}

// Export the singleton instance
export default YouTubeService.getInstance(); 