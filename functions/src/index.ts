import * as admin from "firebase-admin";
import * as https from "https";
import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import * as functionsV1 from "firebase-functions/v1";
import { defineSecret } from "firebase-functions/params";
import OpenAI from 'openai';
import { DocumentData } from 'firebase/firestore';

// Define secrets
const bumpupsApiKeySecret = defineSecret("BUMPUPS_APIKEY");
const openaiApiKeySecret = defineSecret('OPENAI_API_KEY');

admin.initializeApp();
const db = admin.firestore();

// Runtime options are now configured directly in the function definition

// CORS configuration for web clients - restricted to specific domains
const corsOrigins = [
  'http://localhost:5173',
  'http://localhost:5174', 
  'http://localhost:3000',
  'https://off-script.onrender.com',
  'https://offscript-8f6eb.web.app',
  'https://offscript-8f6eb.firebaseapp.com',
  'https://off-script.app',
  'https://app.off-script.app',
  'https://off-script-app.web.app'
];

// CORS configuration for functions v2
const corsConfig = corsOrigins;

// Helper function to validate origin against allowed list
const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return false;
  
  // Check against allowed origins
  if (corsOrigins.some(allowedOrigin => origin === allowedOrigin)) {
    return true;
  }
  
  // Allow localhost in development with any port
  const localhostRegex = /localhost:\d+$/;
  return localhostRegex.test(origin);
};

/**
 * Recursively removes undefined values from an object
 * @param {any} obj - The object to sanitize
 * @return {any} The sanitized object
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject).filter(item => item !== undefined);
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        sanitized[key] = sanitizeObject(value);
      }
    }
    return sanitized;
  }
  
  return obj;
}

interface VideoMetadata {
  title: string;
  description: string;
  duration: number;
  webpage_url: string;
  thumbnail: string;
  uploader: string;
  upload_date?: string;
  tags?: string[];
  enrichmentFailed?: boolean;
  errorMessage?: string;
}

/**
 * Check if a URL is accessible
 * @param {string} url - The URL to check
 * @return {Promise<boolean>} Whether the URL is accessible
 */
async function isUrlAccessible(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
      res.destroy();
    }).on("error", () => {
      resolve(false);
    });
  });
}

/**
 * Extracts YouTube video ID from a URL
 * @param {string} url - The YouTube URL
 * @return {string|null} The extracted video ID or null if not found
 */
function extractYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

/**
 * Get the best available YouTube thumbnail URL
 * @param {string} videoId - The YouTube video ID
 * @return {Promise<string>} The best available thumbnail URL
 */
async function getBestYouTubeThumbnail(videoId: string): Promise<string> {
  // Try different thumbnail qualities in order of preference
  const thumbnailFormats = [
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/default.jpg`
  ];

  for (const url of thumbnailFormats) {
    if (await isUrlAccessible(url)) {
      console.log(`[DEBUG] Selected thumbnail URL: ${url}`);
      return url;
    }
  }
  
  // Default to standard quality which almost always exists
  return `https://i.ytimg.com/vi/${videoId}/default.jpg`;
}

/**
 * Extract basic metadata from a YouTube URL
 * @param {string} url - The YouTube URL
 * @return {Promise<VideoMetadata>} The extracted metadata
 */
async function extractYouTubeBasicMetadata(url: string): Promise<VideoMetadata> {
  try {
    console.log(`[DEBUG] Extracting basic metadata for YouTube URL: ${url}`);
    
    // Extract the video ID
    const videoId = extractYouTubeId(url);
    if (!videoId) {
      throw new Error("Could not extract YouTube video ID");
    }
    
    console.log(`[DEBUG] Extracted YouTube ID: ${videoId}`);
    
    // Get the best available thumbnail URL
    const thumbnailUrl = await getBestYouTubeThumbnail(videoId);
    
    // Try to get basic metadata from oEmbed API
    const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    console.log(`[DEBUG] Fetching oEmbed data from: ${oEmbedUrl}`);
    
    try {
      const oEmbedData = await new Promise<any>((resolve, reject) => {
        https.get(oEmbedUrl, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to fetch oEmbed data: ${response.statusCode}`));
            return;
          }
          
          let data = '';
          response.on('data', (chunk) => {
            data += chunk;
          });
          
          response.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (error) {
              reject(error);
            }
          });
        }).on('error', (err) => {
          reject(err);
        });
      });
      
      console.log(`[DEBUG] Successfully extracted oEmbed data for ${videoId}`);
      
      // Return the metadata from oEmbed
      return {
        title: oEmbedData.title || "YouTube Video",
        description: oEmbedData.description || `Video by ${oEmbedData.author_name || "YouTube creator"}`,
        duration: 0, // oEmbed doesn't provide duration
        webpage_url: url,
        thumbnail: thumbnailUrl,
        uploader: oEmbedData.author_name || "Unknown",
        upload_date: undefined,
        tags: [],
      };
    } catch (oEmbedError) {
      console.error(`[ERROR] Failed to fetch oEmbed data: ${oEmbedError}`);
      
      // If oEmbed fails, return minimal metadata with just the video ID and thumbnail
      return {
        title: `YouTube Video (${videoId})`,
        description: "Basic metadata extracted from URL. Please edit manually for more details.",
        duration: 0,
        webpage_url: url,
        thumbnail: thumbnailUrl,
        uploader: "Unknown",
        upload_date: undefined,
        tags: [],
      };
    }
  } catch (error) {
    console.error(`[ERROR] Failed to extract basic YouTube metadata:`, error);
    
    // Return minimal metadata with error information
    return {
      title: "YouTube Video",
      description: "Failed to extract metadata. Please edit manually.",
      duration: 0,
      webpage_url: url,
      thumbnail: "",
      uploader: "Unknown",
      enrichmentFailed: true,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Determines the source type based on the URL
 * @param {string} url - The video URL
 * @return {string} The source type (youtube, vimeo, etc.)
 */
function determineSourceType(url: string): string {
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    return "youtube";
  } else if (url.includes("vimeo.com")) {
    return "vimeo";
  } else if (url.includes("instagram.com")) {
    return "instagram";
  } else {
    return "other";
  }
}

/**
 * Extract basic metadata from a video URL
 * @param {string} url - The video URL
 * @return {Promise<VideoMetadata>} The extracted metadata
 */
async function extractBasicMetadata(url: string): Promise<VideoMetadata> {
  try {
    console.log(`[DEBUG] Starting metadata extraction for URL: ${url}`);
    
    // Determine the source type
    const sourceType = determineSourceType(url);
    console.log(`[DEBUG] Detected source type: ${sourceType}`);
    
    // Extract metadata based on source type
    if (sourceType === "youtube") {
      return await extractYouTubeBasicMetadata(url);
    } else {
      // For non-YouTube videos, return minimal metadata
      return {
        title: "Video",
        description: "Non-YouTube video. Please edit metadata manually.",
        duration: 0,
        webpage_url: url,
        thumbnail: "",
        uploader: "Unknown",
        enrichmentFailed: true,
        errorMessage: "Only YouTube videos are supported for automatic metadata extraction",
      };
    }
  } catch (error) {
    console.error(`[ERROR] Error extracting metadata for ${url}:`, error);
    
    return {
      title: "Video",
      description: "Failed to extract metadata. Please edit manually.",
      duration: 0,
      webpage_url: url,
      thumbnail: "",
      uploader: "Unknown",
      enrichmentFailed: true,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Cloud function that extracts metadata from a video URL and saves it to Firestore
 */
// Configure runtime options for the function
const runtimeOpts: functionsV1.RuntimeOptions = {
  timeoutSeconds: 300,  // 5 minutes
  memory: '1GB',
};

export const enrichVideoMetadata = functionsV1
  .runWith(runtimeOpts)
  .firestore
  .document("videos/{videoId}")
  .onWrite(async (change, context) => {
    // If the document was deleted, do nothing
    if (!change.after.exists) {
      return null;
    }
    
    const videoId = context.params.videoId;

    const videoData = change.after.data() as DocumentData;
    
    console.log(`[DEBUG] Function triggered for video ${videoId}`);

    // Only process if metadataStatus is 'pending' (initial creation or reset)
    if (videoData.metadataStatus && videoData.metadataStatus !== "pending") {
      console.log(`[DEBUG] Video ${videoId} metadataStatus is '${videoData.metadataStatus}', skipping.`);
      return null;
    }

    // Skip if no source URL
    if (!videoData.sourceUrl) {
      console.log(`[ERROR] No source URL provided for video: ${videoId}`);
      const errorUpdateData = sanitizeObject({
        metadataStatus: "failed",
        enrichmentFailed: true,
        enrichmentError: "No source URL provided",
      });
      await db.collection("videos").doc(videoId).update(errorUpdateData);
      return null;
    }

    try {
      console.log(`[DEBUG] Extracting metadata for video ${videoId} from URL: ${videoData.sourceUrl}`);

      // Mark as processing immediately to avoid duplicate triggers
      await db.collection("videos").doc(videoId).update({ metadataStatus: "processing" });

      // Extract basic metadata
      const metadata = await extractBasicMetadata(videoData.sourceUrl);

      // Determine source type and ID if not already set
      const sourceType = videoData.sourceType || determineSourceType(videoData.sourceUrl);
      let sourceId = videoData.sourceId;
      if (!sourceId && sourceType === "youtube") {
        sourceId = extractYouTubeId(videoData.sourceUrl) || "";
      }

      const updateData: Record<string, unknown> = {
        metadataStatus: metadata.enrichmentFailed ? "failed" : "enriched",
        title: videoData.title && videoData.title !== "Loading..." ? videoData.title : metadata.title,
        description: videoData.description && videoData.description !== "Loading..." ? videoData.description : metadata.description,
        duration: videoData.duration || metadata.duration,
        sourceType,
        sourceId,
        thumbnailUrl: videoData.thumbnailUrl || metadata.thumbnail,
        creator: videoData.creator && videoData.creator !== "Loading..." ? videoData.creator : metadata.uploader,
        metadata: {
          extractedAt: admin.firestore.FieldValue.serverTimestamp(),
          raw: metadata,
        },
      };

      if (metadata.enrichmentFailed) {
        updateData.enrichmentFailed = true;
        updateData.enrichmentError = metadata.errorMessage;
      }

      // Sanitize the update data to remove undefined values
      const sanitizedUpdateData = sanitizeObject(updateData);
      
      await db.collection("videos").doc(videoId).update(sanitizedUpdateData);

      console.log(`[DEBUG] Successfully updated video ${videoId} with ${metadata.enrichmentFailed ? "failed" : "enriched"} metadata`);
      return null;
    } catch (error) {
      console.error(`[ERROR] Error enriching metadata for video ${videoId}:`, error);
      
      // Sanitize the error update data as well
      const errorUpdateData = sanitizeObject({
        metadataStatus: "failed",
        enrichmentFailed: true,
        enrichmentError: error instanceof Error ? error.message : "Unknown error",
      });
      
      await db.collection("videos").doc(videoId).update(errorUpdateData);
      return null;
    }
  });

/**
 * Proxy function for Bumpups API to avoid CORS issues
 */
export const bumpupsProxy = onRequest(
  { 
    cors: corsOrigins, // Restrict to allowed origins only
    memory: '512MiB',
    timeoutSeconds: 60,
    secrets: [bumpupsApiKeySecret],
  },
  async (request, response) => {
    try {
      // Only allow POST requests
      if (request.method !== 'POST') {
        response.status(405).json({ 
          error: 'Method not allowed. Use POST only.' 
        });
        return;
      }

      // Validate origin for additional security
      const origin = request.headers.origin;
      if (!origin || !isOriginAllowed(origin)) {
        logger.warn('Unauthorized origin attempted to access bumpupsProxy', { origin });
        response.status(403).json({ error: 'Origin not allowed' });
        return;
      }

      // Validate request body
      const { url, prompt, model = 'bump-1.0', language = 'en', output_format = 'text' } = request.body;
      
      if (!url || !prompt) {
        response.status(400).json({ 
          error: 'Missing required fields: url and prompt' 
        });
        return;
      }

      // Access the secret using the .value() method.
      const bumpupsApiKey = bumpupsApiKeySecret.value();

      if (!bumpupsApiKey) {
        logger.error('Bumpups API key not found in secret manager. Ensure the BUMPUPS_APIKEY secret is set.');
        response.status(500).json({ error: 'API configuration error' });
        return;
      }

      // Log request details without sensitive information
      logger.info('Making Bumpups API request', { 
        url, 
        promptLength: prompt.length,
        origin
      });

      // Make request to Bumpups API
      const bumpupsResponse = await fetch('https://api.bumpups.com/chat', {
        method: 'POST',
        headers: {
          'X-Api-Key': bumpupsApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          model,
          prompt,
          language,
          output_format
        })
      });

      if (!bumpupsResponse.ok) {
        const errorData = await bumpupsResponse.json().catch(() => ({}));
        logger.error('Bumpups API error', { 
          status: bumpupsResponse.status,
          statusText: bumpupsResponse.statusText,
          error: errorData
        });
        
        response.status(bumpupsResponse.status).json({
          error: `Bumpups API error: ${bumpupsResponse.status} ${bumpupsResponse.statusText}`,
          details: errorData.message || 'Unknown error'
        });
        return;
      }

      const data = await bumpupsResponse.json();
      logger.info('Bumpups API success', { 
        outputLength: data.output?.length || 0,
        videoDuration: data.video_duration 
      });

      // Return the response
      response.status(200).json(data);
      
    } catch (error) {
      logger.error('Error in bumpupsProxy function', error);
      response.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Health check endpoint
 */
export const healthCheck = onRequest({ cors: corsOrigins }, (request, response) => {
  response.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
}); 

/**
 * Create a new OpenAI thread
 */
export const createChatThread = onRequest(
  {
    cors: corsConfig,
    secrets: [openaiApiKeySecret]
  },
  async (request, response) => {
    try {
      // Only allow POST requests
      if (request.method !== 'POST') {
        response.status(405).json({ 
          error: 'Method not allowed. Use POST only.' 
        });
        return;
      }

      // Validate origin for additional security
      const origin = request.headers.origin;
      if (!origin || !isOriginAllowed(origin)) {
        logger.warn('Unauthorized origin attempted to access createChatThread', { origin });
        response.status(403).json({ error: 'Origin not allowed' });
        return;
      }

      // Get OpenAI API key
      const openaiApiKey = openaiApiKeySecret.value();
      
      if (!openaiApiKey) {
        logger.error('OpenAI API key not found in secret manager');
        response.status(500).json({ error: 'API configuration error' });
        return;
      }

      // Initialize OpenAI client
      const openai = new OpenAI({
        apiKey: openaiApiKey
      });

      // Create a new thread
      const thread = await openai.beta.threads.create();

      logger.info('Created new OpenAI thread', { threadId: thread.id });

      // Return the thread ID
      response.status(200).json({ 
        threadId: thread.id 
      });
    } catch (error) {
      logger.error('Error in createChatThread function', error);
      response.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Send a message to an OpenAI Assistant and get the response
 */
export const sendChatMessage = onRequest(
  {
    cors: corsConfig,
    secrets: [openaiApiKeySecret],
    timeoutSeconds: 60
  },
  async (request, response) => {
    try {
      // Only allow POST requests
      if (request.method !== 'POST') {
        response.status(405).json({ 
          error: 'Method not allowed. Use POST only.' 
        });
        return;
      }

      // Validate origin for additional security
      const origin = request.headers.origin;
      if (!origin || !isOriginAllowed(origin)) {
        logger.warn('Unauthorized origin attempted to access sendChatMessage', { origin });
        response.status(403).json({ error: 'Origin not allowed' });
        return;
      }

      // Validate request body
      const { threadId, message, assistantId } = request.body;
      
      if (!threadId || !message || !assistantId) {
        response.status(400).json({ 
          error: 'Missing required fields: threadId, message, and assistantId' 
        });
        return;
      }

      // Get OpenAI API key
      const openaiApiKey = openaiApiKeySecret.value();
      
      if (!openaiApiKey) {
        logger.error('OpenAI API key not found in secret manager');
        response.status(500).json({ error: 'API configuration error' });
        return;
      }

      // Initialize OpenAI client
      const openai = new OpenAI({
        apiKey: openaiApiKey
      });

      // Add the user message to the thread
      await openai.beta.threads.messages.create(threadId, {
        role: 'user',
        content: message
      });

      // Run the assistant on the thread
      const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId
      });

      // Poll for the run to complete
      let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      
      // Poll until the run is completed
      while (runStatus.status !== 'completed') {
        if (['failed', 'cancelled', 'expired'].includes(runStatus.status)) {
          throw new Error(`Run failed with status: ${runStatus.status}`);
        }
        
        // Wait for a short time before polling again
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      }

      // Get the assistant's response
      const messages = await openai.beta.threads.messages.list(threadId);
      
      // Find the most recent assistant message
      const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');
      
      if (assistantMessages.length === 0) {
        throw new Error('No assistant response found');
      }
      
      const latestMessage = assistantMessages[0];
      const content = latestMessage.content[0].type === 'text' 
        ? latestMessage.content[0].text.value 
        : 'Unable to process response';

      logger.info('Processed OpenAI assistant response', { 
        threadId, 
        runId: run.id,
        messageLength: content.length 
      });

      // Return the assistant's response
      response.status(200).json({
        id: latestMessage.id,
        content: content,
        role: 'assistant',
        timestamp: new Date(),
        threadId,
        runId: run.id
      });
    } catch (error) {
      logger.error('Error in sendChatMessage function', error);
      response.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Generate a summary of a chat thread for user profiling
 */
export const generateChatSummary = onRequest(
  {
    cors: corsConfig,
    secrets: [openaiApiKeySecret],
    timeoutSeconds: 120
  },
  async (request, response) => {
    try {
      // Only allow POST requests
      if (request.method !== 'POST') {
        response.status(405).json({ 
          error: 'Method not allowed. Use POST only.' 
        });
        return;
      }

      // Validate origin for additional security
      const origin = request.headers.origin;
      if (!origin || !isOriginAllowed(origin)) {
        logger.warn('Unauthorized origin attempted to access generateChatSummary', { origin });
        response.status(403).json({ error: 'Origin not allowed' });
        return;
      }

      // Validate request body
      const { threadId, assistantId } = request.body;
      
      if (!threadId || !assistantId) {
        response.status(400).json({ 
          error: 'Missing required fields: threadId and assistantId' 
        });
        return;
      }

      // Get OpenAI API key
      const openaiApiKey = openaiApiKeySecret.value();
      
      if (!openaiApiKey) {
        logger.error('OpenAI API key not found in secret manager');
        response.status(500).json({ error: 'API configuration error' });
        return;
      }

      // Initialize OpenAI client
      const openai = new OpenAI({
        apiKey: openaiApiKey
      });

      // We don't need to fetch messages here since we're just creating a summary
      // based on the entire thread history which OpenAI has access to

      // Create a summary prompt
      const summaryPrompt = `
        Based on our conversation so far, please create a summary of the user's profile with the following information:
        1. A brief summary of their career interests and goals
        2. A list of their key interests (as an array of strings)
        3. A list of their career goals (as an array of strings)
        4. A list of their skills (as an array of strings)
        
        Format the response as a JSON object with the following structure:
        {
          "text": "Brief summary paragraph",
          "interests": ["interest1", "interest2", ...],
          "careerGoals": ["goal1", "goal2", ...],
          "skills": ["skill1", "skill2", ...]
        }
      `;

      // Add the summary request to the thread
      await openai.beta.threads.messages.create(threadId, {
        role: 'user',
        content: summaryPrompt
      });

      // Run the assistant on the thread
      const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId
      });

      // Poll for the run to complete
      let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      
      // Poll until the run is completed
      while (runStatus.status !== 'completed') {
        if (['failed', 'cancelled', 'expired'].includes(runStatus.status)) {
          throw new Error(`Run failed with status: ${runStatus.status}`);
        }
        
        // Wait for a short time before polling again
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      }

      // Get the assistant's response
      const updatedMessages = await openai.beta.threads.messages.list(threadId);
      
      // Find the most recent assistant message
      const assistantMessages = updatedMessages.data.filter(msg => msg.role === 'assistant');
      
      if (assistantMessages.length === 0) {
        throw new Error('No assistant response found');
      }
      
      const latestMessage = assistantMessages[0];
      const content = latestMessage.content[0].type === 'text' 
        ? latestMessage.content[0].text.value 
        : 'Unable to process response';

      // Parse the JSON response
      let summaryData;
      try {
        // Extract JSON from the response (it might be wrapped in code blocks)
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/{[\s\S]*}/);
        const jsonStr = jsonMatch ? jsonMatch[0].replace(/```json|```/g, '') : content;
        summaryData = JSON.parse(jsonStr);
      } catch (error) {
        logger.error('Error parsing summary JSON', error);
        summaryData = {
          text: content,
          interests: [],
          careerGoals: [],
          skills: []
        };
      }

      logger.info('Generated chat summary', { threadId });

      // Return the summary
      response.status(200).json(summaryData);
    } catch (error) {
      logger.error('Error in generateChatSummary function', error);
      response.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Get video recommendations based on user profile
 */
export const getVideoRecommendations = onRequest(
  {
    cors: corsConfig,
    secrets: [openaiApiKeySecret],
    timeoutSeconds: 30
  },
  async (request, response) => {
    try {
      // Only allow POST requests
      if (request.method !== 'POST') {
        response.status(405).json({ 
          error: 'Method not allowed. Use POST only.' 
        });
        return;
      }

      // Validate origin for additional security
      const origin = request.headers.origin;
      if (!origin || !isOriginAllowed(origin)) {
        logger.warn('Unauthorized origin attempted to access getVideoRecommendations', { origin });
        response.status(403).json({ error: 'Origin not allowed' });
        return;
      }

      // Validate request body
      const { userId, interests = [], careerGoals = [], skills = [], limit = 5 } = request.body;
      
      if (!userId) {
        response.status(400).json({ 
          error: 'Missing required field: userId' 
        });
        return;
      }

      // Get OpenAI API key
      const openaiApiKey = openaiApiKeySecret.value();
      
      if (!openaiApiKey) {
        logger.error('OpenAI API key not found in secret manager');
        response.status(500).json({ error: 'API configuration error' });
        return;
      }

      // Initialize OpenAI client
      const openai = new OpenAI({
        apiKey: openaiApiKey
      });

      // Create a combined query from user profile
      const combinedQuery = [
        `Interests: ${interests.join(', ')}`,
        `Career Goals: ${careerGoals.join(', ')}`,
        `Skills: ${skills.join(', ')}`
      ].filter(part => !part.endsWith(': ')).join('\n');

      // If we have a meaningful profile, use embeddings for recommendations
      if (combinedQuery.length > 20) {
        try {
          // Generate embedding for the combined query
          const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: combinedQuery,
            encoding_format: 'float'
          });
          
          const queryEmbedding = embeddingResponse.data[0].embedding;
          
          // Get all video embeddings from Firestore
          const embeddingsSnapshot = await db.collection('videoEmbeddings')
            .where('contentType', '==', 'metadata')
            .get();
          
          if (!embeddingsSnapshot.empty) {
            // Calculate similarity scores
            const similarities = embeddingsSnapshot.docs.map(doc => {
              const embedding = doc.data();
              const similarity = cosineSimilarity(queryEmbedding, embedding.embedding);
              return {
                videoId: embedding.videoId,
                similarity
              };
            });
            
            // Sort by similarity (highest first) and take the top results
            const topResults = similarities
              .sort((a, b) => b.similarity - a.similarity)
              .slice(0, limit)
              .map(item => item.videoId);
            
            logger.info('Generated video recommendations using embeddings', { 
              userId, 
              videoCount: topResults.length,
              method: 'embeddings'
            });
            
            // Return the video IDs
            response.status(200).json({ videoIds: topResults });
            return;
          }
        } catch (embeddingError) {
          // Log the error but continue with fallback method
          logger.error('Error using embeddings for recommendations, falling back to category matching', embeddingError);
        }
      }

      // Fallback to category matching if embeddings aren't available or profile is too sparse
      let videoQuery;
      
      // Build query based on user profile
      if (interests && interests.length > 0) {
        // Query videos that match user interests
        videoQuery = db.collection('videos')
          .where('category', 'in', interests.slice(0, 10)) // Firestore limits 'in' clauses to 10 values
          .orderBy('viewCount', 'desc')
          .limit(limit);
      } else {
        // Get popular videos if no interests are specified
        videoQuery = db.collection('videos')
          .orderBy('viewCount', 'desc')
          .limit(limit);
      }
      
      const videosSnapshot = await videoQuery.get();
      
      // Extract video IDs
      const videoIds = videosSnapshot.docs.map((doc) => doc.id);
      
      logger.info('Generated video recommendations using category matching', { 
        userId, 
        videoCount: videoIds.length,
        method: 'category'
      });

      // Return the video IDs
      response.status(200).json({ videoIds });
    } catch (error) {
      logger.error('Error in getVideoRecommendations function', error);
      response.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
); 

/**
 * Generate embeddings for text using OpenAI API
 */
export const generateEmbedding = onRequest(
  {
    cors: corsConfig,
    secrets: [openaiApiKeySecret],
    timeoutSeconds: 30
  },
  async (request, response) => {
    try {
      // Only allow POST requests
      if (request.method !== 'POST') {
        response.status(405).json({ 
          error: 'Method not allowed. Use POST only.' 
        });
        return;
      }

      // Validate origin for additional security
      const origin = request.headers.origin;
      if (!origin || !isOriginAllowed(origin)) {
        logger.warn('Unauthorized origin attempted to access generateEmbedding', { origin });
        response.status(403).json({ error: 'Origin not allowed' });
        return;
      }

      // Validate request body
      const { text, model = 'text-embedding-3-small' } = request.body;
      
      if (!text) {
        response.status(400).json({ 
          error: 'Missing required field: text' 
        });
        return;
      }

      // Get OpenAI API key
      const openaiApiKey = openaiApiKeySecret.value();
      
      if (!openaiApiKey) {
        logger.error('OpenAI API key not found in secret manager');
        response.status(500).json({ error: 'API configuration error' });
        return;
      }

      // Initialize OpenAI client
      const openai = new OpenAI({
        apiKey: openaiApiKey
      });

      // Generate embedding
      const embeddingResponse = await openai.embeddings.create({
        model: model,
        input: text,
        encoding_format: 'float'
      });

      // Return the embedding
      response.status(200).json({ 
        embedding: embeddingResponse.data[0].embedding,
        model: embeddingResponse.model,
        object: embeddingResponse.object
      });
    } catch (error) {
      logger.error('Error in generateEmbedding function', error);
      response.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
); 

/**
 * Search for videos based on semantic similarity to a query
 */
export const searchVideos = onRequest(
  {
    cors: corsConfig,
    secrets: [openaiApiKeySecret],
    timeoutSeconds: 30
  },
  async (request, response) => {
    try {
      // Only allow POST requests
      if (request.method !== 'POST') {
        response.status(405).json({ 
          error: 'Method not allowed. Use POST only.' 
        });
        return;
      }

      // Validate origin for additional security
      const origin = request.headers.origin;
      if (!origin || !isOriginAllowed(origin)) {
        logger.warn('Unauthorized origin attempted to access searchVideos', { origin });
        response.status(403).json({ error: 'Origin not allowed' });
        return;
      }

      // Validate request body
      const { query, limit = 5, model = 'text-embedding-3-small' } = request.body;
      
      if (!query) {
        response.status(400).json({ 
          error: 'Missing required field: query' 
        });
        return;
      }

      // Get OpenAI API key
      const openaiApiKey = openaiApiKeySecret.value();
      
      if (!openaiApiKey) {
        logger.error('OpenAI API key not found in secret manager');
        response.status(500).json({ error: 'API configuration error' });
        return;
      }

      // Initialize OpenAI client
      const openai = new OpenAI({
        apiKey: openaiApiKey
      });

      // Generate embedding for the query
      const embeddingResponse = await openai.embeddings.create({
        model: model,
        input: query,
        encoding_format: 'float'
      });
      
      const queryEmbedding = embeddingResponse.data[0].embedding;
      
      // Get all video embeddings from Firestore
      const embeddingsSnapshot = await db.collection('videoEmbeddings')
        .where('contentType', '==', 'metadata')
        .get();
      
      if (embeddingsSnapshot.empty) {
        response.status(200).json({ videoIds: [] });
        return;
      }
      
      // Calculate similarity scores
      const similarities = embeddingsSnapshot.docs.map(doc => {
        const embedding = doc.data();
        const similarity = cosineSimilarity(queryEmbedding, embedding.embedding);
        return {
          videoId: embedding.videoId,
          similarity
        };
      });
      
      // Sort by similarity (highest first) and take the top results
      const topResults = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(item => item.videoId);
      
      // Return the video IDs
      response.status(200).json({ videoIds: topResults });
    } catch (error) {
      logger.error('Error in searchVideos function', error);
      response.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    return 0; // Return 0 similarity for vectors of different lengths
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
} 