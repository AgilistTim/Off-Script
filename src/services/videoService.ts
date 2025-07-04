import { collection, getDocs, query, where, doc, getDoc, addDoc, updateDoc, serverTimestamp, getCountFromServer, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { User } from '../models/User';

// Placeholder image URL for when thumbnails are not available
const PLACEHOLDER_THUMBNAIL = 'https://placehold.co/600x400?text=Video+Thumbnail';

// Function to get YouTube thumbnail URL with fallbacks
const getYouTubeThumbnailUrl = (videoId: string): string => {
  // Try different thumbnail qualities in order of preference
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  // Note: maxresdefault.jpg often returns 404 for older videos, so we use hqdefault.jpg instead
};

export interface Video {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  sourceType: 'youtube' | 'vimeo' | 'instagram' | 'other';
  sourceId: string;
  sourceUrl: string;
  thumbnailUrl: string;
  duration: number;
  creator: string;
  creatorUrl?: string;
  publicationDate: string;
  curatedDate: string;
  tags: string[];
  skillsHighlighted: string[];
  educationRequired: string[];
  prompts: ReflectionPrompt[];
  relatedContent: string[];
  viewCount: number;
  metadataStatus?: 'pending' | 'processing' | 'enriched' | 'failed';
  enrichmentFailed?: boolean;
  enrichmentError?: string;
  metadata?: {
    extractedAt: any; // Firestore timestamp
    raw: {
      title?: string;
      description?: string;
      duration?: number;
      webpage_url?: string;
      thumbnail?: string;
      uploader?: string;
      upload_date?: string;
      tags?: string[];
      subtitles?: Record<string, any>;
      categories?: string[];
      like_count?: number;
      view_count?: number;
    };
  };
  createdAt?: any; // Firestore timestamp
}

export interface ReflectionPrompt {
  id: string;
  question: string;
  options: string[];
  appearTime?: number;
}

export interface VideoProgress {
  userId: string;
  videoId: string;
  watchedSeconds: number;
  completed: boolean;
  lastWatched: Date;
  reflectionResponses: {
    promptId: string;
    response: string;
  }[];
}

// Get total video count
export const getVideoCount = async (): Promise<number> => {
  try {
    const videosRef = collection(db, 'videos');
    const snapshot = await getCountFromServer(videosRef);
    return snapshot.data().count;
  } catch (error) {
    console.error('Error getting video count:', error);
    return 0;
  }
};

// Get total video view count
export const getVideoViewCount = async (): Promise<number> => {
  try {
    const videosRef = collection(db, 'videos');
    const videosSnapshot = await getDocs(videosRef);
    
    let totalViews = 0;
    videosSnapshot.docs.forEach(doc => {
      const viewCount = doc.data().viewCount || 0;
      totalViews += viewCount;
    });
    
    return totalViews;
  } catch (error) {
    console.error('Error getting total video view count:', error);
    return 0;
  }
};

// Get all videos
export const getAllVideos = async (limit: number = 50): Promise<Video[]> => {
  try {
    const videosRef = collection(db, 'videos');
    const videosSnapshot = await getDocs(videosRef);
    
    const videos = videosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Video[];
    
    // Sort by publication date (newest first)
    return videos
      .sort((a, b) => new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime())
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching videos:', error);
    throw new Error('Failed to fetch videos from Firebase');
  }
};

// Get videos by category
export const getVideosByCategory = async (category: string, limit: number = 50): Promise<Video[]> => {
  try {
    const videosRef = collection(db, 'videos');
    const q = query(
      videosRef,
      where('category', '==', category)
    );
    const videosSnapshot = await getDocs(q);
    
    const videos = videosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Video[];
    
    return videos
      .sort((a, b) => new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime())
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching videos by category:', error);
    throw new Error(`Failed to fetch videos for category: ${category}`);
  }
};

// Get videos by user preferences
export const getVideosByPreferences = async (user: User, limit: number = 20): Promise<Video[]> => {
  try {
    const videosRef = collection(db, 'videos');
    const videosSnapshot = await getDocs(videosRef);
    
    const videos = videosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Video[];
    
    // Filter videos based on user preferences
    if (user.preferences?.interestedSectors && user.preferences.interestedSectors.length > 0) {
      return videos
        .filter(video => user.preferences?.interestedSectors?.includes(video.category))
        .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
        .slice(0, limit);
    }
    
    // If no preferences, return popular videos
    return videos
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching videos by preferences:', error);
    throw new Error('Failed to fetch personalized videos');
  }
};

// Get a single video by ID
export const getVideoById = async (videoId: string): Promise<Video | null> => {
  try {
    const videoRef = doc(db, 'videos', videoId);
    const videoSnapshot = await getDoc(videoRef);
    
    if (!videoSnapshot.exists()) {
      return null;
    }
    
    return {
      id: videoSnapshot.id,
      ...videoSnapshot.data()
    } as Video;
  } catch (error) {
    console.error(`Error fetching video ${videoId}:`, error);
    throw error;
  }
};

// Create a new video
export const createVideo = async (videoData: Omit<Video, 'id'>): Promise<string> => {
  try {
    // Generate thumbnail URL from YouTube video ID if sourceType is youtube and thumbnailUrl is not provided
    if (videoData.sourceType === 'youtube' && !videoData.thumbnailUrl && videoData.sourceId) {
      // Use our helper function to get a more reliable thumbnail URL
      videoData.thumbnailUrl = getYouTubeThumbnailUrl(videoData.sourceId);
    } else if (!videoData.thumbnailUrl) {
      // Use placeholder if no thumbnail URL is provided
      videoData.thumbnailUrl = PLACEHOLDER_THUMBNAIL;
    }
    
    // Generate source URL if not provided
    if (!videoData.sourceUrl && videoData.sourceId) {
      if (videoData.sourceType === 'youtube') {
        videoData.sourceUrl = `https://www.youtube.com/watch?v=${videoData.sourceId}`;
      } else if (videoData.sourceType === 'vimeo') {
        videoData.sourceUrl = `https://vimeo.com/${videoData.sourceId}`;
      }
    }
    
    // Add current date as curatedDate if not provided
    if (!videoData.curatedDate) {
      videoData.curatedDate = new Date().toISOString();
    }
    
    // Add current date as publicationDate if not provided
    if (!videoData.publicationDate) {
      videoData.publicationDate = new Date().toISOString();
    }
    
    // Initialize viewCount if not provided
    if (videoData.viewCount === undefined) {
      videoData.viewCount = 0;
    }
    
    // Add metadata enrichment status
    const videoWithMetadata = {
      ...videoData,
      metadataStatus: 'pending', // Will be updated by the Cloud Function
      createdAt: serverTimestamp(),
    };
    
    const videosRef = collection(db, 'videos');
    const docRef = await addDoc(videosRef, videoWithMetadata);
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating video:', error);
    throw error;
  }
};

// Update an existing video
export const updateVideo = async (videoId: string, videoData: Partial<Video>): Promise<void> => {
  try {
    const videoRef = doc(db, 'videos', videoId);
    
    // Generate thumbnail URL from YouTube video ID if sourceType is youtube and thumbnailUrl is not provided
    if (videoData.sourceType === 'youtube' && !videoData.thumbnailUrl && videoData.sourceId) {
      // Use our helper function to get a more reliable thumbnail URL
      videoData.thumbnailUrl = getYouTubeThumbnailUrl(videoData.sourceId);
    } else if (videoData.thumbnailUrl === '') {
      // Use placeholder if thumbnail URL is explicitly set to empty
      videoData.thumbnailUrl = PLACEHOLDER_THUMBNAIL;
    }
    
    // Generate source URL if not provided
    if (videoData.sourceId && !videoData.sourceUrl) {
      if (videoData.sourceType === 'youtube') {
        videoData.sourceUrl = `https://www.youtube.com/watch?v=${videoData.sourceId}`;
      } else if (videoData.sourceType === 'vimeo') {
        videoData.sourceUrl = `https://vimeo.com/${videoData.sourceId}`;
      }
    }
    
    await updateDoc(videoRef, videoData);
  } catch (error) {
    console.error(`Error updating video ${videoId}:`, error);
    throw error;
  }
};

// Delete a video
export const deleteVideo = async (videoId: string): Promise<void> => {
  try {
    const videoRef = doc(db, 'videos', videoId);
    await deleteDoc(videoRef);
  } catch (error) {
    console.error(`Error deleting video ${videoId}:`, error);
    throw error;
  }
};

// Update video view count
export const incrementVideoViewCount = async (videoId: string): Promise<void> => {
  try {
    const videoRef = doc(db, 'videos', videoId);
    const videoSnapshot = await getDoc(videoRef);
    
    if (!videoSnapshot.exists()) {
      throw new Error(`Video with ID ${videoId} not found`);
    }
    
    const currentViewCount = videoSnapshot.data().viewCount || 0;
    
    await updateDoc(videoRef, {
      viewCount: currentViewCount + 1
    });
  } catch (error) {
    console.error(`Error updating view count for video ${videoId}:`, error);
    throw error;
  }
};

// Save user video progress
export const saveVideoProgress = async (progress: Omit<VideoProgress, 'lastWatched'>): Promise<void> => {
  try {
    const progressRef = collection(db, 'videoProgress');
    const q = query(
      progressRef, 
      where('userId', '==', progress.userId),
      where('videoId', '==', progress.videoId)
    );
    const progressSnapshot = await getDocs(q);
    
    if (progressSnapshot.empty) {
      // Create new progress record
      await addDoc(progressRef, {
        ...progress,
        lastWatched: serverTimestamp()
      });
    } else {
      // Update existing progress record
      const progressDoc = progressSnapshot.docs[0];
      await updateDoc(progressDoc.ref, {
        ...progress,
        lastWatched: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error saving video progress:', error);
    throw error;
  }
};

// Get user video progress
export const getUserVideoProgress = async (userId: string, videoId: string): Promise<VideoProgress | null> => {
  try {
    const progressRef = collection(db, 'videoProgress');
    const q = query(
      progressRef, 
      where('userId', '==', userId),
      where('videoId', '==', videoId)
    );
    const progressSnapshot = await getDocs(q);
    
    if (progressSnapshot.empty) {
      return null;
    }
    
    const progressDoc = progressSnapshot.docs[0];
    return {
      ...progressDoc.data(),
      lastWatched: progressDoc.data().lastWatched?.toDate()
    } as VideoProgress;
  } catch (error) {
    console.error('Error fetching video progress:', error);
    throw error;
  }
};

// Get recommended videos based on user preferences and history
export const getRecommendedVideos = async (user: User, limit: number = 5): Promise<Video[]> => {
  try {
    // This is a simplified recommendation algorithm
    // In a real-world application, you would implement more sophisticated logic
    
    // Get user's preferred categories from profile
    const preferredCategories = user.preferences?.interestedSectors || [];
    
    if (preferredCategories.length === 0) {
      // If no preferences, return most popular videos
      const videosRef = collection(db, 'videos');
      const q = query(videosRef);
      const videosSnapshot = await getDocs(q);
      
      const videos = videosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Video));
      
      // Sort by view count
      return videos
        .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
        .slice(0, limit);
    }
    
    // Get videos from preferred categories
    const videosRef = collection(db, 'videos');
    const q = query(videosRef, where('category', 'in', preferredCategories));
    const videosSnapshot = await getDocs(q);
    
    const videos = videosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Video));
    
    // Sort by view count and return limited number
    return videos
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching recommended videos:', error);
    // Use fallback videos filtered by user preferences if available
    try {
      const fallbackVideos = await getAllVideos();
      if (user.preferences?.interestedSectors && user.preferences.interestedSectors.length > 0) {
        return fallbackVideos
          .filter(video => user.preferences?.interestedSectors?.includes(video.category))
          .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
          .slice(0, limit);
      }
      return fallbackVideos
        .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
        .slice(0, limit);
    } catch (fallbackError) {
      console.error('Error fetching fallback videos:', fallbackError);
      return [];
    }
  }
};

// Get popular videos across all categories
export const getPopularVideos = async (limit: number = 10): Promise<Video[]> => {
  try {
    const videosRef = collection(db, 'videos');
    const q = query(videosRef, where('viewCount', '>', 0));
    const videosSnapshot = await getDocs(q);
    
    const videos = videosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Video[];
    
    return videos
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching popular videos:', error);
    // Use fallback videos sorted by view count
    try {
      const fallbackVideos = await getAllVideos();
      return fallbackVideos
        .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
        .slice(0, limit);
    } catch (fallbackError) {
      console.error('Error fetching fallback videos:', fallbackError);
      return [];
    }
  }
};

// Save user reflection response
export const saveReflectionResponse = async (
  userId: string, 
  videoId: string, 
  promptId: string, 
  response: string
): Promise<void> => {
  try {
    const progressRef = collection(db, 'videoProgress');
    const q = query(
      progressRef, 
      where('userId', '==', userId),
      where('videoId', '==', videoId)
    );
    const progressSnapshot = await getDocs(q);
    
    if (progressSnapshot.empty) {
      // Create new progress record with reflection response
      await addDoc(progressRef, {
        userId,
        videoId,
        watchedSeconds: 0,
        completed: false,
        lastWatched: serverTimestamp(),
        reflectionResponses: [{
          promptId,
          response
        }]
      });
    } else {
      // Update existing progress record
      const progressDoc = progressSnapshot.docs[0];
      const currentData = progressDoc.data();
      const currentResponses = currentData.reflectionResponses || [];
      
      // Check if response for this prompt already exists
      const existingResponseIndex = currentResponses.findIndex(
        (r: any) => r.promptId === promptId
      );
      
      if (existingResponseIndex >= 0) {
        // Update existing response
        currentResponses[existingResponseIndex].response = response;
      } else {
        // Add new response
        currentResponses.push({
          promptId,
          response
        });
      }
      
      await updateDoc(progressDoc.ref, {
        reflectionResponses: currentResponses,
        lastWatched: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error saving reflection response:', error);
    throw error;
  }
};

// Check if a video with the given URL already exists
export const checkVideoExists = async (sourceUrl: string): Promise<boolean> => {
  try {
    const videosRef = collection(db, 'videos');
    const q = query(videosRef, where('sourceUrl', '==', sourceUrl));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking if video exists:', error);
    throw error;
  }
};

// Import multiple videos from URLs
export const bulkImportVideos = async (urls: string[], defaultCategory: string = ''): Promise<{
  success: number;
  duplicates: number;
  failed: number;
  failedUrls: string[];
}> => {
  const results = {
    success: 0,
    duplicates: 0,
    failed: 0,
    failedUrls: [] as string[]
  };

  // Process URLs sequentially to avoid overwhelming Firebase
  for (const url of urls) {
    try {
      const trimmedUrl = url.trim();
      if (!trimmedUrl) continue;

      // Check if video already exists
      const exists = await checkVideoExists(trimmedUrl);
      if (exists) {
        results.duplicates++;
        continue;
      }

      // Determine source type
      let sourceType: 'youtube' | 'vimeo' | 'instagram' | 'other' = 'other';
      if (trimmedUrl.includes('youtube.com') || trimmedUrl.includes('youtu.be')) {
        sourceType = 'youtube';
      } else if (trimmedUrl.includes('vimeo.com')) {
        sourceType = 'vimeo';
      } else if (trimmedUrl.includes('instagram.com')) {
        sourceType = 'instagram';
      }

      // Extract video ID if possible
      let sourceId = '';
      if (sourceType === 'youtube') {
        const youtubeId = extractYouTubeId(trimmedUrl);
        if (youtubeId) sourceId = youtubeId;
      }

      // Create minimal video record - the Cloud Function will enrich it
      const videoData: Omit<Video, 'id'> = {
        title: 'Loading...', // Will be updated by Cloud Function
        description: 'Loading...', // Will be updated by Cloud Function
        category: defaultCategory,
        sourceType,
        sourceId,
        sourceUrl: trimmedUrl,
        thumbnailUrl: '',
        duration: 0,
        creator: 'Loading...', // Will be updated by Cloud Function
        publicationDate: new Date().toISOString(),
        curatedDate: new Date().toISOString(),
        tags: [],
        skillsHighlighted: [],
        educationRequired: [],
        prompts: [],
        relatedContent: [],
        viewCount: 0,
        metadataStatus: 'pending'
      };

      await createVideo(videoData);
      results.success++;
    } catch (error) {
      console.error('Error importing video:', url, error);
      results.failed++;
      results.failedUrls.push(url);
    }
  }

  return results;
};

// Helper function to extract YouTube ID
const extractYouTubeId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}; 