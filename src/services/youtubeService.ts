// YouTube Data API v3 service for fetching video metadata

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

interface EnhancedVideoMetadata {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  duration: string; // in seconds
  durationISO: string; // original ISO format
  viewCount: number;
  likeCount: number;
  commentCount: number;
  thumbnails: {
    default: string;
    medium: string;
    high: string;
    maxres?: string;
  };
  tags: string[];
  categoryId: string;
  definition: 'HD' | 'SD';
  hasCaption: boolean;
  language?: string;
}

class YouTubeService {
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor() {
    // Get API key from environment variables
    this.apiKey = import.meta.env.VITE_YOUTUBE_API_KEY || 
                  (typeof window !== 'undefined' && window.ENV?.VITE_YOUTUBE_API_KEY) || '';
    
    if (!this.apiKey) {
      console.warn('YouTube API key not found. YouTube metadata features will be limited.');
    }
  }

  /**
   * Extract video ID from YouTube URL
   */
  extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
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
   * Convert ISO 8601 duration to seconds
   */
  private parseDuration(isoDuration: string): number {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Format duration in human-readable format
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Fetch detailed video metadata from YouTube API
   */
  async getVideoMetadata(videoIdOrUrl: string): Promise<EnhancedVideoMetadata | null> {
    if (!this.apiKey) {
      throw new Error('YouTube API key not configured');
    }

    const videoId = this.extractVideoId(videoIdOrUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube video URL or ID');
    }

    try {
      const url = new URL(`${this.baseUrl}/videos`);
      url.searchParams.append('id', videoId);
      url.searchParams.append('part', 'snippet,statistics,contentDetails');
      url.searchParams.append('key', this.apiKey);

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
      }

      const data: YouTubeVideoResponse = await response.json();

      if (!data.items || data.items.length === 0) {
        throw new Error('Video not found');
      }

      const video = data.items[0];
      const duration = this.parseDuration(video.contentDetails.duration);

      return {
        id: videoId,
        title: video.snippet.title,
        description: video.snippet.description,
        channelTitle: video.snippet.channelTitle,
        channelId: video.snippet.channelId,
        publishedAt: video.snippet.publishedAt,
        duration: duration.toString(),
        durationISO: video.contentDetails.duration,
        viewCount: parseInt(video.statistics.viewCount || '0'),
        likeCount: parseInt(video.statistics.likeCount || '0'),
        commentCount: parseInt(video.statistics.commentCount || '0'),
        thumbnails: {
          default: video.snippet.thumbnails.default.url,
          medium: video.snippet.thumbnails.medium.url,
          high: video.snippet.thumbnails.high.url,
          maxres: video.snippet.thumbnails.maxres?.url,
        },
        tags: video.snippet.tags || [],
        categoryId: video.snippet.categoryId,
        definition: video.contentDetails.definition.toUpperCase() as 'HD' | 'SD',
        hasCaption: video.contentDetails.caption === 'true',
        language: video.snippet.defaultLanguage || video.snippet.defaultAudioLanguage,
      };
    } catch (error) {
      console.error('Error fetching YouTube metadata:', error);
      throw error;
    }
  }

  /**
   * Fetch metadata for multiple videos
   */
  async getMultipleVideoMetadata(videoIds: string[]): Promise<EnhancedVideoMetadata[]> {
    if (!this.apiKey) {
      throw new Error('YouTube API key not configured');
    }

    if (videoIds.length === 0) return [];

    // YouTube API allows up to 50 videos per request
    const chunks = [];
    for (let i = 0; i < videoIds.length; i += 50) {
      chunks.push(videoIds.slice(i, i + 50));
    }

    const results: EnhancedVideoMetadata[] = [];

    for (const chunk of chunks) {
      try {
        const url = new URL(`${this.baseUrl}/videos`);
        url.searchParams.append('id', chunk.join(','));
        url.searchParams.append('part', 'snippet,statistics,contentDetails');
        url.searchParams.append('key', this.apiKey);

        const response = await fetch(url.toString());
        
        if (!response.ok) {
          throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
        }

        const data: YouTubeVideoResponse = await response.json();

        for (const video of data.items) {
          const duration = this.parseDuration(video.contentDetails.duration);
          
          results.push({
            id: video.id,
            title: video.snippet.title,
            description: video.snippet.description,
            channelTitle: video.snippet.channelTitle,
            channelId: video.snippet.channelId,
            publishedAt: video.snippet.publishedAt,
            duration: duration.toString(),
            durationISO: video.contentDetails.duration,
            viewCount: parseInt(video.statistics.viewCount || '0'),
            likeCount: parseInt(video.statistics.likeCount || '0'),
            commentCount: parseInt(video.statistics.commentCount || '0'),
            thumbnails: {
              default: video.snippet.thumbnails.default.url,
              medium: video.snippet.thumbnails.medium.url,
              high: video.snippet.thumbnails.high.url,
              maxres: video.snippet.thumbnails.maxres?.url,
            },
            tags: video.snippet.tags || [],
            categoryId: video.snippet.categoryId,
            definition: video.contentDetails.definition.toUpperCase() as 'HD' | 'SD',
            hasCaption: video.contentDetails.caption === 'true',
            language: video.snippet.defaultLanguage || video.snippet.defaultAudioLanguage,
          });
        }
      } catch (error) {
        console.error('Error fetching YouTube metadata for chunk:', error);
        // Continue with other chunks if one fails
      }
    }

    return results;
  }

  /**
   * Search for videos by query (optional feature)
   */
  async searchVideos(query: string, maxResults: number = 10): Promise<Array<{ id: string; title: string; channelTitle: string }>> {
    if (!this.apiKey) {
      throw new Error('YouTube API key not configured');
    }

    try {
      const url = new URL(`${this.baseUrl}/search`);
      url.searchParams.append('q', query);
      url.searchParams.append('part', 'snippet');
      url.searchParams.append('type', 'video');
      url.searchParams.append('maxResults', maxResults.toString());
      url.searchParams.append('key', this.apiKey);

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return data.items.map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
      }));
    } catch (error) {
      console.error('Error searching YouTube videos:', error);
      throw error;
    }
  }
}

export default YouTubeService;
export type { EnhancedVideoMetadata }; 