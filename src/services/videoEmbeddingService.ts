import { collection, doc, getDoc, getDocs, setDoc, query as firestoreQuery, where, limit as firestoreLimit } from 'firebase/firestore';
import { db } from './firebase';
import { Video } from './videoService';

// SECURITY: OpenAI client removed from client-side code
// All OpenAI operations are handled server-side through Firebase Functions

// OpenAI embedding model reference (for documentation)
const EMBEDDING_MODEL = 'text-embedding-3-small';

// Interface for video embedding data
export interface VideoEmbedding {
  videoId: string;
  embedding: number[];
  contentType: 'metadata' | 'transcript' | 'combined';
  createdAt: Date;
  version: string; // For tracking embedding model versions
}

/**
 * Generate a text representation of a video for embedding
 */
const generateVideoText = (video: Video, includeTranscript: boolean = true): string => {
  // Combine all relevant video metadata into a single text string
  const textParts = [
    `Title: ${video.title || ''}`,
    `Description: ${video.description || ''}`,
    `Category: ${video.category || ''}`,
    `Subcategory: ${video.subcategory || ''}`,
    `Tags: ${(video.tags || []).join(', ')}`,
    `Skills: ${(video.skillsHighlighted || []).join(', ')}`,
    `Education: ${(video.educationRequired || []).join(', ')}`,
    `Duration: ${video.duration || 0} seconds`
  ];
  
  // Add transcript data if available and requested
  if (includeTranscript && video.transcript && video.transcript.fullText) {
    // Truncate transcript if too long (keep first 3000 chars for embedding efficiency)
    const transcriptText = video.transcript.fullText.length > 3000 
      ? video.transcript.fullText.substring(0, 3000) + '...'
      : video.transcript.fullText;
    textParts.push(`Transcript: ${transcriptText}`);
  }
  
  // Add AI-enhanced metadata if available
  if (video.aiAnalysis) {
    // Prioritize OpenAI analysis if available
    if (video.aiAnalysis.openaiAnalysis) {
      const openai = video.aiAnalysis.openaiAnalysis;
      textParts.push(`Career Field: ${openai.careerInsights.primaryCareerField}`);
      textParts.push(`Career Paths: ${openai.careerInsights.relatedCareerPaths.join(', ')}`);
      textParts.push(`Skills Identified: ${openai.careerInsights.skillsHighlighted.join(', ')}`);
      textParts.push(`Education Requirements: ${openai.careerInsights.educationRequirements}`);
      textParts.push(`Content Summary: ${openai.contentAnalysis.summary}`);
      textParts.push(`Key Takeaways: ${openai.contentAnalysis.keyTakeaways.join('. ')}`);
      textParts.push(`Target Audience: ${openai.contentAnalysis.targetAudience}`);
      textParts.push(`Actionable Advice: ${openai.engagement.actionableAdvice.join('. ')}`);
      
      // Add key moments context for better searchability
      if (openai.keyMoments && openai.keyMoments.length > 0) {
        const momentsText = openai.keyMoments
          .map(moment => `${moment.title || 'Key moment'}: ${moment.description}`)
          .join('. ');
        textParts.push(`Key Moments: ${momentsText}`);
      }
    }
    // Fallback to legacy analysis
    else {
      if (video.aiAnalysis.summary) {
        textParts.push(`Summary: ${video.aiAnalysis.summary}`);
      }
      
      if (video.aiAnalysis.careerInfo) {
        textParts.push(`Career Insights: ${JSON.stringify(video.aiAnalysis.careerInfo)}`);
      }
      
      if (video.aiAnalysis.careerExplorationAnalysis) {
        // Include career exploration analysis from bumpups
        const analysisText = video.aiAnalysis.careerExplorationAnalysis.length > 1000
          ? video.aiAnalysis.careerExplorationAnalysis.substring(0, 1000) + '...'
          : video.aiAnalysis.careerExplorationAnalysis;
        textParts.push(`Career Analysis: ${analysisText}`);
      }
      
      if (video.aiAnalysis.skillsIdentified && video.aiAnalysis.skillsIdentified.length > 0) {
        textParts.push(`Skills Identified: ${video.aiAnalysis.skillsIdentified.join(', ')}`);
      }
    }
  }
  
  // Add career pathways if available
  if (video.careerPathways && video.careerPathways.length > 0) {
    textParts.push(`Career Pathways: ${video.careerPathways.join(', ')}`);
  }
  
  // Add hashtags if available (prioritize OpenAI generated hashtags)
  const hashtags = video.aiAnalysis?.openaiAnalysis?.engagement.hashtags || video.hashtags || [];
  if (hashtags.length > 0) {
    textParts.push(`Hashtags: ${hashtags.join(' ')}`);
  }
  
  return textParts.join('\n');
};

/**
 * Generate embedding for text using the OpenAI API
 */
const generateEmbedding = async (text: string): Promise<number[] | null> => {
  try {
    // This function is no longer used directly for embedding generation
    // as OpenAI API key is removed from client-side code.
    // All embedding generation should be handled by Firebase Functions.
    console.warn('generateEmbedding is deprecated. Embedding generation should be handled by Firebase Functions.');
    return null;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
};

/**
 * Store a video embedding in Firestore
 * @param videoId The ID of the video
 * @param embedding The embedding vector
 * @param contentType The type of content that was embedded
 */
const storeEmbedding = async (
  videoId: string, 
  embedding: number[], 
  contentType: 'metadata' | 'transcript' | 'combined' = 'metadata'
): Promise<void> => {
  try {
    const embeddingData: VideoEmbedding = {
      videoId,
      embedding,
      contentType,
      createdAt: new Date(),
      version: EMBEDDING_MODEL
    };

    await setDoc(
      doc(db, 'videoEmbeddings', `${videoId}_${contentType}`), 
      embeddingData
    );
  } catch (error) {
    console.error('Error storing embedding:', error);
    throw new Error('Failed to store embedding in Firestore');
  }
};

/**
 * Get an embedding for a video from Firestore
 * @param videoId The ID of the video
 * @param contentType The type of content embedding to retrieve
 * @returns The embedding data or null if not found
 */
const getEmbedding = async (
  videoId: string, 
  contentType: 'metadata' | 'transcript' | 'combined' = 'metadata'
): Promise<VideoEmbedding | null> => {
  try {
    const embeddingDoc = await getDoc(
      doc(db, 'videoEmbeddings', `${videoId}_${contentType}`)
    );
    
    if (embeddingDoc.exists()) {
      return embeddingDoc.data() as VideoEmbedding;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting embedding:', error);
    throw new Error('Failed to retrieve embedding from Firestore');
  }
};

/**
 * Calculate cosine similarity between two vectors
 * @param vecA First vector
 * @param vecB Second vector
 * @returns Similarity score between 0 and 1
 */
const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
};

/**
 * Generate and store embeddings for a video
 * @param video The video object to generate embeddings for
 * @returns The generated embedding
 */
export const createVideoEmbedding = async (video: Video): Promise<number[]> => {
  try {
    // Generate text representation of the video
    const videoText = generateVideoText(video);
    
    // Generate embedding from OpenAI
    const embedding = await generateEmbedding(videoText);
    
    if (!embedding) {
      throw new Error('Failed to generate embedding from OpenAI API');
    }

    // Store the embedding in Firestore
    await storeEmbedding(video.id, embedding, 'metadata');
    
    return embedding;
  } catch (error) {
    console.error(`Error creating embedding for video ${video.id}:`, error);
    throw error;
  }
};

/**
 * Find similar videos based on text query
 * @param query The text query to find similar videos for
 * @param limit Maximum number of results to return
 * @returns Array of video IDs sorted by similarity
 */
export const findSimilarVideos = async (query: string, limit: number = 5): Promise<string[]> => {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    
    if (!queryEmbedding) {
      throw new Error('Failed to generate embedding for query');
    }

    // Get all video embeddings from Firestore
    const embeddingsRef = collection(db, 'videoEmbeddings');
    const q = firestoreQuery(
      embeddingsRef,
      where('contentType', '==', 'metadata')
    );
    
    const embeddingsSnapshot = await getDocs(q);
    
    // Calculate similarity scores
    const similarities = embeddingsSnapshot.docs.map(doc => {
      const embedding = doc.data() as VideoEmbedding;
      const similarity = cosineSimilarity(queryEmbedding, embedding.embedding);
      return {
        videoId: embedding.videoId,
        similarity
      };
    });
    
    // Sort by similarity (highest first) and take the top results
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => item.videoId);
  } catch (error) {
    console.error('Error finding similar videos:', error);
    throw error;
  }
};

/**
 * Find videos similar to a reference video
 * @param videoId The ID of the reference video
 * @param limit Maximum number of results to return
 * @returns Array of video IDs sorted by similarity
 */
export const findRelatedVideos = async (videoId: string, limit: number = 5): Promise<string[]> => {
  try {
    // Get the embedding for the reference video
    const videoEmbedding = await getEmbedding(videoId);
    
    if (!videoEmbedding) {
      // If no embedding exists, create one
      const videoDoc = await getDoc(doc(db, 'videos', videoId));
      if (!videoDoc.exists()) {
        throw new Error(`Video ${videoId} not found`);
      }
      
      const video = { id: videoId, ...videoDoc.data() } as Video;
      await createVideoEmbedding(video);
      
      // Get the newly created embedding
      const newEmbedding = await getEmbedding(videoId);
      if (!newEmbedding) {
        throw new Error(`Failed to create embedding for video ${videoId}`);
      }
      
      return findRelatedVideos(videoId, limit);
    }
    
    // Get all video embeddings from Firestore
    const embeddingsRef = collection(db, 'videoEmbeddings');
    const q = firestoreQuery(
      embeddingsRef,
      where('contentType', '==', 'metadata'),
      where('videoId', '!=', videoId) // Exclude the reference video
    );
    
    const embeddingsSnapshot = await getDocs(q);
    
    // Calculate similarity scores
    const similarities = embeddingsSnapshot.docs.map(doc => {
      const embedding = doc.data() as VideoEmbedding;
      const similarity = cosineSimilarity(videoEmbedding.embedding, embedding.embedding);
      return {
        videoId: embedding.videoId,
        similarity
      };
    });
    
    // Sort by similarity (highest first) and take the top results
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => item.videoId);
  } catch (error) {
    console.error(`Error finding related videos for ${videoId}:`, error);
    throw error;
  }
};

/**
 * Generate embeddings for all videos in the database
 * @returns Number of videos processed
 */
export const generateAllVideoEmbeddings = async (): Promise<number> => {
  try {
    // Get all videos from Firestore
    const videosRef = collection(db, 'videos');
    const videosSnapshot = await getDocs(videosRef);
    
    const videos = videosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Video[];
    
    // Process videos in batches to avoid rate limiting
    let processedCount = 0;
    for (const video of videos) {
      try {
        // Check if embedding already exists
        const existingEmbedding = await getEmbedding(video.id);
        if (!existingEmbedding) {
          await createVideoEmbedding(video);
          processedCount++;
          
          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`Error processing video ${video.id}:`, error);
        // Continue with next video
      }
    }
    
    return processedCount;
  } catch (error) {
    console.error('Error generating all video embeddings:', error);
    throw error;
  }
};

/**
 * Generate embeddings for all videos in the database
 * This should be run periodically to keep embeddings up to date
 */
export const generateEmbeddingsForAllVideos = async (): Promise<void> => {
  try {
    // Get all videos from Firestore
    const videosRef = collection(db, 'videos');
    const videosSnapshot = await getDocs(videosRef);
    
    if (videosSnapshot.empty) {
      console.log('No videos found in the database');
      return;
    }
    
    console.log(`Found ${videosSnapshot.size} videos, generating embeddings...`);
    
    // Process videos in batches to avoid rate limiting
    const batchSize = 10;
    const videos = videosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Video[];
    
    for (let i = 0; i < videos.length; i += batchSize) {
      const batch = videos.slice(i, i + batchSize);
      const promises = batch.map(video => generateEmbeddingForVideo(video.id));
      
      await Promise.all(promises);
      console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(videos.length / batchSize)}`);
      
      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < videos.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('Finished generating embeddings for all videos');
  } catch (error) {
    console.error('Error generating embeddings for all videos:', error);
    throw new Error('Failed to generate embeddings for all videos');
  }
};

/**
 * Generate embedding for a single video by ID
 */
export const generateEmbeddingForVideo = async (videoId: string): Promise<VideoEmbedding | null> => {
  try {
    // Get the video from Firestore
    const videoRef = doc(db, 'videos', videoId);
    const videoDoc = await getDoc(videoRef);
    
    if (!videoDoc.exists()) {
      console.error(`Video with ID ${videoId} not found`);
      return null;
    }
    
    const video = {
      id: videoDoc.id,
      ...videoDoc.data()
    } as Video;
    
    // Generate text representation
    const videoText = generateVideoText(video);
    
    // Generate embedding using the API
    const embedding = await generateEmbedding(videoText);
    
    if (!embedding) {
      console.error(`Failed to generate embedding for video ${videoId}`);
      return null;
    }
    
    // Store the embedding in Firestore
    const embeddingData: VideoEmbedding = {
      videoId,
      embedding,
      contentType: 'metadata',
      createdAt: new Date(),
      version: EMBEDDING_MODEL
    };
    
    await setDoc(doc(db, 'videoEmbeddings', videoId), embeddingData);
    
    return embeddingData;
  } catch (error) {
    console.error(`Error generating embedding for video ${videoId}:`, error);
    return null;
  }
};

// Export the service functions
const videoEmbeddingService = {
  createVideoEmbedding,
  findSimilarVideos,
  findRelatedVideos,
  generateAllVideoEmbeddings,
  getEmbedding
};

export default videoEmbeddingService; 