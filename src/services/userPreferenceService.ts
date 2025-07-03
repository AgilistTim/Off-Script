import { doc, collection, addDoc, updateDoc, getDoc, getDocs, query, where, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { Video } from './videoService';

export interface UserPreference {
  userId: string;
  likedVideos: string[];
  dislikedVideos: string[];
  likedCategories: Record<string, number>; // Category name to weight
  likedSkills: Record<string, number>; // Skill name to weight
  watchHistory: {
    videoId: string;
    timestamp: Date;
  }[];
  interactionScore: number; // Higher score = more engaged user
}

// Get user preferences
export const getUserPreferences = async (userId: string): Promise<UserPreference | null> => {
  try {
    const preferencesRef = doc(db, 'userPreferences', userId);
    const preferencesSnapshot = await getDoc(preferencesRef);
    
    if (!preferencesSnapshot.exists()) {
      return null;
    }
    
    return preferencesSnapshot.data() as UserPreference;
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return null;
  }
};

// Initialize user preferences if they don't exist
export const initializeUserPreferences = async (userId: string): Promise<void> => {
  try {
    const preferences = await getUserPreferences(userId);
    
    if (!preferences) {
      const initialPreferences: Omit<UserPreference, 'userId'> = {
        likedVideos: [],
        dislikedVideos: [],
        likedCategories: {},
        likedSkills: {},
        watchHistory: [],
        interactionScore: 0
      };
      
      await updateDoc(doc(db, 'userPreferences', userId), initialPreferences);
    }
  } catch (error) {
    console.error('Error initializing user preferences:', error);
    throw error;
  }
};

// Like a video and update user preferences
export const likeVideo = async (userId: string, video: Video): Promise<void> => {
  try {
    const userPrefRef = doc(db, 'userPreferences', userId);
    const userPrefSnapshot = await getDoc(userPrefRef);
    
    if (!userPrefSnapshot.exists()) {
      // Create new preferences document if it doesn't exist
      await initializeUserPreferences(userId);
    }
    
    // Update user preferences
    const updates: Record<string, any> = {
      likedVideos: arrayUnion(video.id),
      dislikedVideos: arrayRemove(video.id), // Remove from disliked if it was there
      interactionScore: userPrefSnapshot.exists() 
        ? (userPrefSnapshot.data().interactionScore || 0) + 5 
        : 5
    };
    
    // Update category preferences
    const categoryField = `likedCategories.${video.category}`;
    const currentCategoryScore = userPrefSnapshot.exists() && userPrefSnapshot.data().likedCategories
      ? userPrefSnapshot.data().likedCategories[video.category] || 0
      : 0;
    updates[categoryField] = currentCategoryScore + 1;
    
    // Update skills preferences
    if (video.skillsHighlighted && video.skillsHighlighted.length > 0) {
      video.skillsHighlighted.forEach(skill => {
        const skillField = `likedSkills.${skill}`;
        const currentSkillScore = userPrefSnapshot.exists() && userPrefSnapshot.data().likedSkills
          ? userPrefSnapshot.data().likedSkills[skill] || 0
          : 0;
        updates[skillField] = currentSkillScore + 1;
      });
    }
    
    // Add to watch history
    updates.watchHistory = arrayUnion({
      videoId: video.id,
      timestamp: serverTimestamp()
    });
    
    await updateDoc(userPrefRef, updates);
    
    // Also update video likes count in a separate collection if needed
    // This could be implemented here
  } catch (error) {
    console.error('Error liking video:', error);
    throw error;
  }
};

// Dislike a video and update user preferences
export const dislikeVideo = async (userId: string, video: Video): Promise<void> => {
  try {
    const userPrefRef = doc(db, 'userPreferences', userId);
    const userPrefSnapshot = await getDoc(userPrefRef);
    
    if (!userPrefSnapshot.exists()) {
      // Create new preferences document if it doesn't exist
      await initializeUserPreferences(userId);
    }
    
    // Update user preferences
    const updates: Record<string, any> = {
      dislikedVideos: arrayUnion(video.id),
      likedVideos: arrayRemove(video.id), // Remove from liked if it was there
      interactionScore: userPrefSnapshot.exists() 
        ? (userPrefSnapshot.data().interactionScore || 0) + 2 // Still give some points for interaction
        : 2
    };
    
    // Update category preferences (negative weight)
    const categoryField = `likedCategories.${video.category}`;
    const currentCategoryScore = userPrefSnapshot.exists() && userPrefSnapshot.data().likedCategories
      ? userPrefSnapshot.data().likedCategories[video.category] || 0
      : 0;
    updates[categoryField] = Math.max(0, currentCategoryScore - 1); // Don't go below 0
    
    // Add to watch history
    updates.watchHistory = arrayUnion({
      videoId: video.id,
      timestamp: serverTimestamp()
    });
    
    await updateDoc(userPrefRef, updates);
  } catch (error) {
    console.error('Error disliking video:', error);
    throw error;
  }
};

// Get recommended videos based on user preferences
export const getPersonalizedRecommendations = async (userId: string, limit: number = 10): Promise<Video[]> => {
  try {
    const userPreferences = await getUserPreferences(userId);
    
    if (!userPreferences) {
      // If no preferences exist, return generic popular videos
      const videosRef = collection(db, 'videos');
      const videosSnapshot = await getDocs(query(videosRef, where('viewCount', '>', 0)));
      
      const videos = videosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Video[];
      
      // Sort by view count and return top results
      return videos
        .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
        .slice(0, limit);
    }
    
    // Get all videos
    const videosRef = collection(db, 'videos');
    const videosSnapshot = await getDocs(videosRef);
    
    const videos = videosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Video[];
    
    // Filter out already liked/disliked videos
    const unseenVideos = videos.filter(video => 
      !userPreferences.likedVideos.includes(video.id) && 
      !userPreferences.dislikedVideos.includes(video.id)
    );
    
    // Calculate a score for each video based on user preferences
    const scoredVideos = unseenVideos.map(video => {
      let score = 0;
      
      // Category match
      const categoryScore = userPreferences.likedCategories[video.category] || 0;
      score += categoryScore * 10; // Weight category matches highly
      
      // Skills match
      if (video.skillsHighlighted && video.skillsHighlighted.length > 0) {
        video.skillsHighlighted.forEach(skill => {
          const skillScore = userPreferences.likedSkills[skill] || 0;
          score += skillScore * 5;
        });
      }
      
      // Add some weight for popular videos
      score += Math.min(5, (video.viewCount || 0) / 100);
      
      return { video, score };
    });
    
    // Sort by score and return top results
    return scoredVideos
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.video);
  } catch (error) {
    console.error('Error getting personalized recommendations:', error);
    throw new Error('Failed to get personalized recommendations');
  }
};

// Track video watch
export const trackVideoWatch = async (userId: string, videoId: string): Promise<void> => {
  try {
    const userPrefRef = doc(db, 'userPreferences', userId);
    const userPrefSnapshot = await getDoc(userPrefRef);
    
    if (!userPrefSnapshot.exists()) {
      await initializeUserPreferences(userId);
    }
    
    const updates: Record<string, any> = {
      watchHistory: arrayUnion({
        videoId,
        timestamp: serverTimestamp()
      }),
      interactionScore: userPrefSnapshot.exists() 
        ? (userPrefSnapshot.data().interactionScore || 0) + 3
        : 3
    };
    
    await updateDoc(userPrefRef, updates);
  } catch (error) {
    console.error('Error tracking video watch:', error);
    throw error;
  }
};

// Get user engagement score
export const getUserEngagementScore = async (userId: string): Promise<number> => {
  try {
    const userPreferences = await getUserPreferences(userId);
    
    if (!userPreferences) {
      return 0;
    }
    
    return userPreferences.interactionScore || 0;
  } catch (error) {
    console.error('Error getting user engagement score:', error);
    return 0;
  }
}; 