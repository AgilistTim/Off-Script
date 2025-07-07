#!/usr/bin/env node

// Script to analyze YouTube videos and store enhanced metadata
// Run with: node scripts/analyzeVideos.js

import { db, authenticateAdmin } from './firebaseConfig.js';
import fetch from 'node-fetch';

// Bumpups API configuration
const BUMPUPS_API_KEY = process.env.VITE_BUMPUPS_API_KEY || '***REMOVED***';
const YOUTUBE_API_KEY = process.env.VITE_YOUTUBE_API_KEY;

// YouTube videos to analyze (add your URLs here)
const videosToAnalyze = [
  {
    url: 'https://www.youtube.com/watch?v=a0glBQXOcl4',
    category: 'technology'
  },
  {
    url: 'https://www.youtube.com/watch?v=3YrjvaWlbFA', 
    category: 'technology'
  },
  {
    url: 'https://www.youtube.com/watch?v=ocqceS7KlzE',
    category: 'trades'
  },
  {
    url: 'https://www.youtube.com/watch?v=Va0F9_0T9R4',
    category: 'trades'
  },
  {
    url: 'https://www.youtube.com/watch?v=k-7B_YfHWXQ',
    category: 'healthcare'
  }
];

// YouTube API service
class YouTubeService {
  constructor() {
    this.apiKey = YOUTUBE_API_KEY;
    this.baseUrl = 'https://www.googleapis.com/youtube/v3';
  }

  extractVideoId(url) {
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

  parseDuration(isoDuration) {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    return hours * 3600 + minutes * 60 + seconds;
  }

  async getVideoMetadata(videoIdOrUrl) {
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

      const data = await response.json();

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
        definition: video.contentDetails.definition.toUpperCase(),
        hasCaption: video.contentDetails.caption === 'true',
        language: video.snippet.defaultLanguage || video.snippet.defaultAudioLanguage,
      };
    } catch (error) {
      console.error('Error fetching YouTube metadata:', error);
      throw error;
    }
  }
}

// Bumpups API service
class BumpupsService {
  constructor() {
    this.apiKey = BUMPUPS_API_KEY;
    this.baseUrl = 'https://api.bumpups.com';
  }

  async queryVideo(youtubeUrl, prompt) {
    if (!this.apiKey) {
      throw new Error('Bumpups API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'X-Api-Key': this.apiKey,
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
        throw new Error(`Bumpups API error: ${response.status} ${response.statusText} - ${errorData.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error querying video:', error);
      throw error;
    }
  }

  async analyzeForCareerExploration(youtubeUrl) {
    console.log('🧠 Starting career exploration analysis...');
    
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

    try {
      const result = await this.queryVideo(youtubeUrl, careerExplorationPrompt);
      
      console.log(`✅ Career exploration analysis complete!`);
      console.log(`📄 Analysis length: ${result.output?.length || 0} characters`);

      return {
        careerExplorationAnalysis: result.output || '',
        analyzedAt: new Date().toISOString(),
        confidence: 90, // Higher confidence for structured career analysis
        analysisType: 'career_exploration',
      };
    } catch (error) {
      console.error('Error in career exploration analysis:', error);
      throw error;
    }
  }

  parseTimestamps(text) {
    const timestamps = [];
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

  extractShortSummary(text) {
    const sentences = text.split(/[.!?]+/);
    const firstTwoSentences = sentences.slice(0, 2).join('. ').trim();
    return firstTwoSentences.length > 200 
      ? firstTwoSentences.substring(0, 200) + '...'
      : firstTwoSentences;
  }

  extractKeyPoints(text) {
    const points = [];
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

  extractVideoId(url) {
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
}

// Enhanced video service
class EnhancedVideoService {
  constructor() {
    this.youtubeService = new YouTubeService();
    this.bumpupsService = new BumpupsService();
  }

  async analyzeAndStoreVideo(youtubeUrl, category) {
    console.log(`\n🎯 Starting comprehensive video analysis for: ${youtubeUrl}`);

    // Extract video ID
    const videoId = this.youtubeService.extractVideoId(youtubeUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    // Get YouTube metadata
    console.log('📊 Fetching YouTube metadata...');
    const youtubeData = await this.youtubeService.getVideoMetadata(youtubeUrl);
    if (!youtubeData) {
      throw new Error('Could not fetch YouTube metadata');
    }

    console.log(`✅ YouTube metadata: "${youtubeData.title}" by ${youtubeData.channelTitle}`);

    // Create initial video record
    const initialVideoData = {
      id: videoId,
      title: youtubeData.title,
      description: youtubeData.description.substring(0, 500),
      category: category,
      tags: youtubeData.tags,
      thumbnailUrl: youtubeData.thumbnails.maxres || youtubeData.thumbnails.high,
      sourceUrl: youtubeUrl,
      sourceId: videoId,
      sourceType: 'youtube',
      youtubeMetadata: {
        channelTitle: youtubeData.channelTitle,
        channelId: youtubeData.channelId,
        publishedAt: youtubeData.publishedAt,
        duration: parseInt(youtubeData.duration),
        viewCount: youtubeData.viewCount,
        likeCount: youtubeData.likeCount,
        commentCount: youtubeData.commentCount,
        definition: youtubeData.definition,
        hasCaption: youtubeData.hasCaption,
        language: youtubeData.language || 'en', // Default to 'en' if undefined
      },
      skillsHighlighted: [],
      educationRequired: [],
      careerStage: 'any',
      curatedDate: new Date().toISOString(),
      analysisStatus: 'pending',
      viewCount: youtubeData.viewCount,
    };

    // Store initial data in Firebase
    await this.storeVideoData(initialVideoData);
    console.log('💾 Video data stored in Firebase');

    try {
      // Perform AI analysis with career exploration focus
      console.log('🧠 Starting career exploration analysis with Bumpups...');
      const analysisResult = await this.bumpupsService.analyzeForCareerExploration(youtubeUrl);
      
      console.log(`✅ Career exploration analysis complete! Confidence: ${analysisResult.confidence}%`);
      console.log(`📄 Analysis length: ${analysisResult.careerExplorationAnalysis?.length || 0} characters`);

      // Update with AI analysis
      const aiAnalysis = {
        careerExplorationAnalysis: analysisResult.careerExplorationAnalysis || '',
        analyzedAt: analysisResult.analyzedAt,
        confidence: analysisResult.confidence || 90,
        analysisType: analysisResult.analysisType || 'career_exploration',
      };

      // Extract enhanced metadata from career analysis
      const enhancedSkills = this.extractSkillsFromCareerAnalysis(analysisResult.careerExplorationAnalysis || '');
      const careerPathways = this.extractCareerPathways(analysisResult.careerExplorationAnalysis || '');
      const hashtags = this.extractHashtags(analysisResult.careerExplorationAnalysis || '');

      // Update video with analysis
      await this.updateVideoWithAnalysis(videoId, {
        aiAnalysis,
        skillsHighlighted: enhancedSkills,
        careerPathways,
        hashtags,
        lastAnalyzed: new Date().toISOString(),
        analysisStatus: 'completed',
      });

      console.log('🔄 Video updated with AI analysis');
      return { ...initialVideoData, aiAnalysis };

    } catch (error) {
      console.error('❌ AI analysis failed:', error);
      await this.updateAnalysisStatus(videoId, 'failed');
      return initialVideoData; // Return basic data even if AI analysis fails
    }
  }

  async storeVideoData(videoData) {
    const { doc, setDoc } = await import('firebase/firestore');
    const videoRef = doc(db, 'videos', videoData.id);
    await setDoc(videoRef, videoData);
  }

  async updateVideoWithAnalysis(videoId, updates) {
    const { doc, updateDoc } = await import('firebase/firestore');
    const videoRef = doc(db, 'videos', videoId);
    await updateDoc(videoRef, updates);
  }

  async updateAnalysisStatus(videoId, status) {
    const { doc, updateDoc } = await import('firebase/firestore');
    const videoRef = doc(db, 'videos', videoId);
    await updateDoc(videoRef, { analysisStatus: status });
  }

  extractSkillsFromCareerAnalysis(analysis) {
    const skills = new Set();
    
    // Extract skills from the analysis text
    const skillKeywords = ['programming', 'coding', 'javascript', 'python', 'react', 'html', 'css', 
                         'communication', 'leadership', 'management', 'design', 'analysis', 'engineering',
                         'problem-solving', 'collaboration', 'mentoring', 'time management', 'attention to detail'];
    
    skillKeywords.forEach(keyword => {
      if (analysis.toLowerCase().includes(keyword)) {
        skills.add(keyword.charAt(0).toUpperCase() + keyword.slice(1));
      }
    });

    return Array.from(skills).slice(0, 10);
  }

  extractCareerPathways(analysis) {
    const pathways = new Set();
    
    // Extract career pathways from the analysis text
    const pathwayKeywords = ['software development', 'data science', 'AI', 'machine learning', 'blockchain', 
                           'cybersecurity', 'STEM', 'creative industries', 'social impact', 'trades', 
                           'healthcare', 'business', 'education', 'engineering'];
    
    pathwayKeywords.forEach(keyword => {
      if (analysis.toLowerCase().includes(keyword.toLowerCase())) {
        pathways.add(keyword);
      }
    });

    return Array.from(pathways).slice(0, 5);
  }

  extractHashtags(analysis) {
    const hashtags = new Set();
    
    // Extract hashtags from the analysis text
    const hashtagPattern = /#\w+/g;
    const matches = analysis.match(hashtagPattern);
    
    if (matches) {
      matches.forEach(match => {
        hashtags.add(match);
      });
    }

    return Array.from(hashtags).slice(0, 8);
  }
}

// Main execution function
async function main() {
  console.log('🚀 Starting enhanced video analysis script...');
  console.log(`📊 Videos to process: ${videosToAnalyze.length}`);
  
  // Check API keys
  if (!YOUTUBE_API_KEY) {
    console.error('❌ YouTube API key not found. Set VITE_YOUTUBE_API_KEY environment variable.');
    process.exit(1);
  }

  if (!BUMPUPS_API_KEY) {
    console.error('❌ Bumpups API key not found. Using default key...');
  }

  console.log('🔑 API keys configured');

  // Authenticate with Firebase
  const authSuccess = await authenticateAdmin();
  if (!authSuccess) {
    console.error('❌ Firebase authentication failed');
    process.exit(1);
  }

  const enhancedVideoService = new EnhancedVideoService();
  const results = [];

  // Process each video
  for (let i = 0; i < videosToAnalyze.length; i++) {
    const { url, category } = videosToAnalyze[i];
    
    try {
      console.log(`\n📹 Processing ${i + 1}/${videosToAnalyze.length}: ${url}`);
      
      const result = await enhancedVideoService.analyzeAndStoreVideo(url, category);
      results.push({ success: true, url, result });
      
      console.log(`✅ Success: ${result.title}`);
      
      // Small delay to avoid rate limiting
      if (i < videosToAnalyze.length - 1) {
        console.log('⏳ Waiting 3 seconds before next video...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
    } catch (error) {
      console.error(`❌ Failed to process ${url}:`, error.message);
      results.push({ success: false, url, error: error.message });
    }
  }

  // Summary
  console.log('\n📊 Analysis Summary:');
  console.log(`✅ Successful: ${results.filter(r => r.success).length}`);
  console.log(`❌ Failed: ${results.filter(r => !r.success).length}`);
  
  if (results.some(r => !r.success)) {
    console.log('\n❌ Failed videos:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.url}: ${r.error}`);
    });
  }

  console.log('\n🎉 Video analysis script completed!');
  process.exit(0);
}

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
}); 