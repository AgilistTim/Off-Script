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
 * Generate a detailed chat summary with structured data
 */
export const generateDetailedChatSummary = onRequest(
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
        logger.warn('Unauthorized origin attempted to access generateDetailedChatSummary', { origin });
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

      // Create a detailed summary prompt
      const detailedSummaryPrompt = `
        Based on our conversation so far, please create a detailed profile of the user with the following information:
        1. A concise summary of the conversation (1-2 paragraphs)
        2. A list of the user's interests extracted from the conversation
        3. A list of skills the user has or wants to develop
        4. A list of career goals mentioned or implied
        5. Suggested learning paths based on the conversation
        6. 3-5 reflective questions that would help the user explore their career interests further
        
        Format your response as a JSON object with the following keys:
        {
          "text": "summary text",
          "interests": ["interest1", "interest2", ...],
          "skills": ["skill1", "skill2", ...],
          "careerGoals": ["goal1", "goal2", ...],
          "learningPaths": ["path1", "path2", ...],
          "reflectiveQuestions": ["question1", "question2", ...]
        }
      `;

      // Add the summary request to the thread
      await openai.beta.threads.messages.create(threadId, {
        role: 'user',
        content: detailedSummaryPrompt
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
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                          content.match(/```\s*([\s\S]*?)\s*```/) ||
                          content.match(/{[\s\S]*}/);
        
        let jsonStr;
        if (jsonMatch) {
          jsonStr = jsonMatch[0].replace(/```json\s*|\s*```/g, '');
        } else {
          jsonStr = content;
        }
        
        summaryData = JSON.parse(jsonStr);
      } catch (error) {
        logger.error('Error parsing detailed summary JSON', error);
        summaryData = {
          text: content,
          interests: [],
          skills: [],
          careerGoals: [],
          learningPaths: [],
          reflectiveQuestions: []
        };
      }

      logger.info('Generated detailed chat summary', { threadId });

      // Return the detailed summary
      response.status(200).json(summaryData);
    } catch (error) {
      logger.error('Error in generateDetailedChatSummary function', error);
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

      // Validate origin for additional security (allow requests without origin header for server-to-server calls)
      const origin = request.headers.origin;
      if (origin && !isOriginAllowed(origin)) {
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

      // DEBUG: Log the request parameters
      logger.info('getVideoRecommendations request parameters', { 
        userId, 
        interests,
        careerGoals,
        skills,
        limit
      });

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

      // DEBUG: Check if we have a meaningful profile
      logger.info('Combined query for recommendations', { combinedQuery, length: combinedQuery.length });

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
          
          // DEBUG: Log the number of embeddings found
          logger.info('Video embeddings query results', { 
            count: embeddingsSnapshot.size,
            empty: embeddingsSnapshot.empty 
          });
          
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
              method: 'embeddings',
              topResults
            });
            
            // Return the video IDs
            response.status(200).json({ videoIds: topResults });
            return;
          } else {
            logger.warn('No video embeddings found, falling back to category matching');
          }
        } catch (embeddingError) {
          // Log the error but continue with fallback method
          logger.error('Error using embeddings for recommendations, falling back to category matching', embeddingError);
        }
      }

      // DEBUG: Check if we have interests to query with
      logger.info('Falling back to category matching', { 
        hasInterests: interests && interests.length > 0,
        interestsCount: interests ? interests.length : 0
      });

      // Fallback to category matching if embeddings aren't available or profile is too sparse
      let videoQuery;
      
      // Build query based on user profile
      if (interests && interests.length > 0) {
        // Query videos that match user interests
        videoQuery = db.collection('videos')
          .where('category', 'in', interests.slice(0, 10)) // Firestore limits 'in' clauses to 10 values
          .orderBy('viewCount', 'desc')
          .limit(limit);
          
        // DEBUG: Log the query parameters  
        logger.info('Category-based query', { 
          categories: interests.slice(0, 10),
          limit
        });
      } else {
        // Get popular videos if no interests are specified
        videoQuery = db.collection('videos')
          .orderBy('viewCount', 'desc')
          .limit(limit);
          
        // DEBUG: Log that we're using a fallback query
        logger.info('Using fallback query (popular videos)', { limit });
      }
      
      const videosSnapshot = await videoQuery.get();
      
      // DEBUG: Log the query results
      logger.info('Video query results', { 
        count: videosSnapshot.size,
        empty: videosSnapshot.empty
      });
      
      // Extract video IDs
      const videoIds = videosSnapshot.docs.map((doc) => doc.id);
      
      logger.info('Generated video recommendations using category matching', { 
        userId, 
        videoCount: videoIds.length,
        method: 'category',
        videoIds
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
 * Get personalized video recommendations based on user preferences and chat history
 * Now uses enhanced career-focused recommendation system when available
 */
export const getPersonalizedVideoRecommendations = onRequest(
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

      // Validate origin for additional security (allow requests without origin header for server-to-server calls)
      const origin = request.headers.origin;
      if (origin && !isOriginAllowed(origin)) {
        logger.warn('Unauthorized origin attempted to access getPersonalizedVideoRecommendations', { origin });
        response.status(403).json({ error: 'Origin not allowed' });
        return;
      }

      // Validate request body
      const { 
        userId, 
        limit = 5, 
        includeWatched = false,
        feedbackType = null, // null, 'liked', 'disliked', 'saved'
        chatSummaryId = null
      } = request.body;
      
      if (!userId) {
        response.status(400).json({ 
          error: 'Missing required field: userId' 
        });
        return;
      }

      // Initialize OpenAI client early so it's available for semantic scoring
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

      // First try the enhanced career-focused recommendation system
      try {
        // Get user preferences
        const userPrefsSnapshot = await db.collection('userPreferences').doc(userId).get();
        const userPrefs = userPrefsSnapshot.exists ? userPrefsSnapshot.data() : {};
        
        // Get user watch history
        const watchHistorySnapshot = await db.collection('userActivity')
          .doc(userId)
          .collection('watchHistory')
          .orderBy('timestamp', 'desc')
          .limit(20)
          .get();
        
        const watchedVideoIds = watchHistorySnapshot.docs.map(doc => doc.data().videoId);
        
        // Get user feedback
        const userFeedbackSnapshot = await db.collection('userActivity')
          .doc(userId)
          .collection('videoFeedback')
          .get();
        
        const videoFeedback = userFeedbackSnapshot.docs.reduce((acc, doc) => {
          const data = doc.data();
          acc[doc.id] = {
            liked: data.liked || false,
            disliked: data.disliked || false,
            saved: data.saved || false
          };
          return acc;
        }, {} as Record<string, { liked: boolean, disliked: boolean, saved: boolean }>);
        
        // Get chat summary
        let chatSummary = null;
        if (chatSummaryId) {
          const chatSummarySnapshot = await db.collection('chatSummaries').doc(chatSummaryId).get();
          if (chatSummarySnapshot.exists) {
            chatSummary = chatSummarySnapshot.data();
          }
        }
        
        if (!chatSummary) {
          const recentSummariesSnapshot = await db.collection('chatSummaries')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
          
          if (!recentSummariesSnapshot.empty) {
            chatSummary = recentSummariesSnapshot.docs[0].data();
          }
        }
        
        // Extract user profile
        const userProfile = {
          interests: chatSummary?.interests || userPrefs?.interests || [],
          skills: chatSummary?.skills || userPrefs?.skills || [],
          careerGoals: chatSummary?.careerGoals || userPrefs?.careerGoals || [],
          learningPaths: chatSummary?.learningPaths || []
        };
        
        // Check if we have a meaningful profile for enhanced recommendations
        const hasProfile = userProfile.interests.length > 0 || userProfile.skills.length > 0 || 
                          userProfile.careerGoals.length > 0 || userProfile.learningPaths.length > 0;
        
        if (hasProfile) {
          // Get videos with analysis data for enhanced recommendations
          const videosSnapshot = await db.collection('videos')
            .where('analysisStatus', '==', 'completed')
            .get();
          
          // Debug: Log categories of videos being processed
          const videoCategories = videosSnapshot.docs.reduce((acc, doc) => {
            const category = doc.data().category || 'uncategorized';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          // Debug: Log specific software development videos found in the query
          const softwareVideosFromQuery = videosSnapshot.docs.filter(doc => {
            const title = doc.data().title?.toLowerCase() || '';
            return title.includes('software engineer') || title.includes('software developer');
          }).map(doc => ({
            id: doc.id,
            title: doc.data().title,
            category: doc.data().category
          }));
          
          logger.info('Personalized recommendations - video categories found', {
            totalVideos: videosSnapshot.docs.length,
            categories: videoCategories,
            hasTechnology: videoCategories.technology || 0,
            hasBusinessSoftware: videoCategories.business || 0,
            softwareVideosFound: softwareVideosFromQuery.length,
            softwareVideoIds: softwareVideosFromQuery.map(v => v.id),
            softwareVideoTitles: softwareVideosFromQuery.map(v => v.title)
          });
          
          if (!videosSnapshot.empty) {
            // Use semantic scoring for more accurate recommendations
            const scoredVideos = await Promise.all(videosSnapshot.docs.map(async (doc) => {
              const video = { id: doc.id, ...doc.data() };
              const semanticScore = await calculateSemanticRelevanceScore(video, userProfile, openai);
              
              // Apply feedback adjustments
              let adjustedScore = semanticScore;
              const feedback = videoFeedback[video.id];
              
              if (feedback) {
                if (feedback.liked) adjustedScore *= 1.3;
                if (feedback.disliked) adjustedScore *= 0.3;
                if (feedback.saved) adjustedScore *= 1.4;
                
                // Filter by feedback type if specified
                if (feedbackType === 'liked' && !feedback.liked) adjustedScore = 0;
                if (feedbackType === 'disliked' && !feedback.disliked) adjustedScore = 0;
                if (feedbackType === 'saved' && !feedback.saved) adjustedScore = 0;
              }
              
              // Exclude watched videos if requested
              if (!includeWatched && watchedVideoIds.includes(video.id)) {
                adjustedScore = 0;
              }
              
              // Debug: Log scoring for software development videos
              const videoData = doc.data();
              const title = videoData.title?.toLowerCase() || '';
              if (title.includes('software engineer') || title.includes('software developer')) {
                logger.info('Software development video semantic scoring', {
                  videoId: video.id,
                  title: videoData.title,
                  semanticScore: semanticScore,
                  adjustedScore: adjustedScore,
                  hasFeedback: !!feedback,
                  isWatched: watchedVideoIds.includes(video.id),
                  includeWatched: includeWatched
                });
              }
              
              return {
                videoId: video.id,
                score: adjustedScore,
                originalScore: semanticScore
              };
            }));

            // Sort by score and take top results
            const filteredVideos = scoredVideos.filter(item => item.score > 0);
            const topResults = filteredVideos
              .sort((a, b) => b.score - a.score)
              .slice(0, limit)
              .map(item => item.videoId);

            // Debug: Check if any software development videos made it through filtering
            const softwareVideosInResults = topResults.filter(videoId => {
              const videoDoc = videosSnapshot.docs.find(doc => doc.id === videoId);
              if (!videoDoc) return false;
              const title = videoDoc.data().title?.toLowerCase() || '';
              return title.includes('software engineer') || title.includes('software developer');
            });

            logger.info('Final recommendation results', {
              totalScored: scoredVideos.length,
              totalFiltered: filteredVideos.length,
              topResultsCount: topResults.length,
              softwareVideosInResults: softwareVideosInResults.length,
              softwareVideoIds: softwareVideosInResults,
              topScores: filteredVideos.slice(0, 10).map(v => ({ 
                id: v.videoId, 
                score: v.score, 
                originalScore: v.originalScore 
              }))
            });

            if (topResults.length > 0) {
              logger.info('Generated personalized video recommendations using OpenAI semantic scoring', { 
                userId,
                videoCount: topResults.length,
                method: 'semantic-ai',
                totalAnalyzed: scoredVideos.length
              });

              response.status(200).json({ 
                videoIds: topResults,
                method: 'semantic-ai',
                profileUsed: true,
                totalAnalyzed: scoredVideos.length
              });
              return;
            }
          }
        }
      } catch (enhancedError) {
        logger.error('Enhanced career recommendations failed, falling back to embeddings', enhancedError);
      }

      // Fallback to embeddings-based recommendations (openai client already initialized above)
      // Get user preferences for fallback
      const userPrefsSnapshot = await db.collection('userPreferences').doc(userId).get();
      const userPrefs = userPrefsSnapshot.exists ? userPrefsSnapshot.data() : {};
      
      // Get user watch history for fallback
      const watchHistorySnapshot = await db.collection('userActivity')
        .doc(userId)
        .collection('watchHistory')
        .orderBy('timestamp', 'desc')
        .limit(20)
        .get();
      
      const watchedVideoIds = watchHistorySnapshot.docs.map(doc => doc.data().videoId);
      
      // Get user feedback for fallback
      const userFeedbackSnapshot = await db.collection('userActivity')
        .doc(userId)
        .collection('videoFeedback')
        .get();
      
      const videoFeedback = userFeedbackSnapshot.docs.reduce((acc, doc) => {
        const data = doc.data();
        acc[doc.id] = {
          liked: data.liked || false,
          disliked: data.disliked || false,
          saved: data.saved || false
        };
        return acc;
      }, {} as Record<string, { liked: boolean, disliked: boolean, saved: boolean }>);
      
      // Get chat summary for fallback
      let chatSummary = null;
      if (chatSummaryId) {
        const chatSummarySnapshot = await db.collection('chatSummaries').doc(chatSummaryId).get();
        if (chatSummarySnapshot.exists) {
          chatSummary = chatSummarySnapshot.data();
        }
      }
      
      if (!chatSummary) {
        const recentSummariesSnapshot = await db.collection('chatSummaries')
          .where('userId', '==', userId)
          .orderBy('createdAt', 'desc')
          .limit(1)
          .get();
        
        if (!recentSummariesSnapshot.empty) {
          chatSummary = recentSummariesSnapshot.docs[0].data();
        }
      }
      
      // Extract interests, skills, and career goals from chat summary
      const interests = chatSummary?.interests || userPrefs?.interests || [];
      const skills = chatSummary?.skills || userPrefs?.skills || [];
      const careerGoals = chatSummary?.careerGoals || userPrefs?.careerGoals || [];
      const learningPaths = chatSummary?.learningPaths || [];
      
      // Build a combined profile for recommendations
      const combinedProfile = [
        `Interests: ${interests.join(', ')}`,
        `Skills: ${skills.join(', ')}`,
        `Career Goals: ${careerGoals.join(', ')}`,
        `Learning Paths: ${learningPaths.join(', ')}`
      ].filter(part => !part.endsWith(': ')).join('\n');
      
      logger.info('Combined profile for personalized recommendations (fallback)', { 
        profileLength: combinedProfile.length,
        interestsCount: interests.length,
        skillsCount: skills.length,
        goalsCount: careerGoals.length
      });
      
      // If we have a meaningful profile, use embeddings for recommendations
      if (combinedProfile.length > 20) {
        try {
          // Generate embedding for the combined profile
          const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: combinedProfile,
            encoding_format: 'float'
          });
          
          const profileEmbedding = embeddingResponse.data[0].embedding;
          
          // Get all video embeddings from Firestore
          const embeddingsSnapshot = await db.collection('videoEmbeddings')
            .where('contentType', '==', 'metadata')
            .get();
          
          if (!embeddingsSnapshot.empty) {
            // Calculate similarity scores
            const similarities = embeddingsSnapshot.docs.map(doc => {
              const embedding = doc.data();
              const similarity = cosineSimilarity(profileEmbedding, embedding.embedding);
              
              // Apply feedback adjustments
              let adjustedScore = similarity;
              const feedback = videoFeedback[embedding.videoId];
              
              if (feedback) {
                if (feedback.liked) adjustedScore *= 1.2; // Boost liked videos
                if (feedback.disliked) adjustedScore *= 0.5; // Reduce disliked videos
                if (feedback.saved) adjustedScore *= 1.3; // Boost saved videos
                
                // If filtering by feedback type
                if (feedbackType === 'liked' && !feedback.liked) adjustedScore = 0;
                if (feedbackType === 'disliked' && !feedback.disliked) adjustedScore = 0;
                if (feedbackType === 'saved' && !feedback.saved) adjustedScore = 0;
              }
              
              // Exclude watched videos if requested
              if (!includeWatched && watchedVideoIds.includes(embedding.videoId)) {
                adjustedScore = 0;
              }
              
              return {
                videoId: embedding.videoId,
                similarity: adjustedScore
              };
            });
            
            // Sort by adjusted similarity (highest first) and take the top results
            const topResults = similarities
              .filter(item => item.similarity > 0) // Remove excluded videos
              .sort((a, b) => b.similarity - a.similarity)
              .slice(0, limit)
              .map(item => item.videoId);
            
            logger.info('Generated personalized video recommendations using embeddings (fallback)', { 
              userId, 
              videoCount: topResults.length,
              method: 'embeddings',
              topResults
            });
            
            // Return the video IDs
            response.status(200).json({ 
              videoIds: topResults,
              method: 'embeddings',
              profileUsed: true
            });
            return;
          }
        } catch (embeddingError) {
          // Log the error but continue with fallback method
          logger.error('Error using embeddings for personalized recommendations, falling back to category matching', embeddingError);
        }
      }
      
      // Final fallback to category matching
      let videoQuery;
      
      if (interests && interests.length > 0) {
        // Query videos that match user interests
        videoQuery = db.collection('videos')
          .where('category', 'in', interests.slice(0, 10)) // Firestore limits 'in' clauses to 10 values
          .orderBy('viewCount', 'desc')
          .limit(limit * 2); // Get more than needed to filter out watched videos
      } else {
        // Get popular videos if no interests are specified
        videoQuery = db.collection('videos')
          .orderBy('viewCount', 'desc')
          .limit(limit * 2);
      }
      
      const videosSnapshot = await videoQuery.get();
      
      // Filter out watched videos if requested
      let videoIds = videosSnapshot.docs.map((doc) => doc.id);
      
      if (!includeWatched) {
        videoIds = videoIds.filter(id => !watchedVideoIds.includes(id));
      }
      
      // Apply feedback filters if requested
      if (feedbackType) {
        videoIds = videoIds.filter(id => {
          const feedback = videoFeedback[id];
          if (!feedback) return false;
          
          if (feedbackType === 'liked') return feedback.liked;
          if (feedbackType === 'disliked') return feedback.disliked;
          if (feedbackType === 'saved') return feedback.saved;
          
          return true;
        });
      }
      
      // Limit to requested number
      videoIds = videoIds.slice(0, limit);
      
      logger.info('Generated personalized video recommendations using category matching (final fallback)', { 
        userId, 
        videoCount: videoIds.length,
        method: 'category',
        videoIds
      });

      // Return the video IDs
      response.status(200).json({ 
        videoIds,
        method: 'category',
        profileUsed: interests.length > 0
      });
    } catch (error) {
      logger.error('Error in getPersonalizedVideoRecommendations function', error);
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

/**
 * Extract YouTube transcript (disabled - returns failure to force bumpups fallback)
 */
export const extractTranscript = onRequest(
  {
    cors: true, // Allow all origins for this function
    memory: '256MiB',
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
      
      // Set CORS headers manually to ensure they're properly applied
      response.set('Access-Control-Allow-Origin', '*');
      response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      response.set('Access-Control-Allow-Headers', 'Content-Type');
      
      // Handle preflight requests
      if (request.method === 'OPTIONS' as string) {
        response.status(204).send('');
        return;
      }

      // Get video ID from request body
      const { videoId } = request.body;
      
      if (!videoId) {
        response.status(400).json({ 
          success: false, 
          error: 'Missing videoId parameter' 
        });
        return;
      }

      // Extract video ID if a full URL was provided
      const extractedVideoId = extractYouTubeId(videoId) || videoId;
      
      logger.info('🎬 Transcript extraction disabled - using bumpups fallback', { 
        videoId: extractedVideoId
      });

      // Always return failure to force bumpups fallback
      response.status(200).json({ 
        success: false, 
        error: 'Transcript extraction disabled - using bumpups service',
        errorType: 'DISABLED',
        segments: [],
        fullText: '',
        segmentCount: 0
      });
      
    } catch (error: any) {
      logger.error('❌ Transcript extraction function error:', error);
      
      // Make sure we only send one response
      if (!response.headersSent) {
        response.status(500).json({ 
          success: false, 
          error: error.message || 'Unknown error',
          errorType: 'SERVER_ERROR',
          segments: [],
          fullText: '',
          segmentCount: 0
        });
      }
    }
  }
);

/**
 * Process video with transcript extraction and OpenAI analysis
 * This implements the optimized pipeline: YouTube API → Transcript → OpenAI Analysis → Storage
 */
export const processVideoWithTranscript = onRequest(
  {
    cors: corsOrigins,
    memory: '2GiB',
    timeoutSeconds: 600, // 10 minutes for full processing
    secrets: ['OPENAI_API_KEY', 'BUMPUPS_APIKEY']
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

      // Validate origin (allow requests without origin header for server-to-server calls)
      const origin = request.headers.origin;
      if (origin && !isOriginAllowed(origin)) {
        logger.warn('Unauthorized origin attempted to access processVideoWithTranscript', { origin });
        response.status(403).json({ error: 'Origin not allowed' });
        return;
      }

      // Validate request body
      const { videoUrl, category, videoId: providedVideoId, includeBumpups = false } = request.body;
      
      if (!videoUrl) {
        response.status(400).json({ 
          error: 'Missing required field: videoUrl' 
        });
        return;
      }
      
      // Category is now optional - will be determined automatically from AI analysis
      const manualCategory = category || null;

      // Use provided videoId if available, otherwise extract from URL
      const videoId = providedVideoId || extractYouTubeId(videoUrl);
      if (!videoId) {
        response.status(400).json({ 
          error: 'Invalid YouTube URL or missing videoId' 
        });
        return;
      }

      // Extract YouTube video ID for transcript extraction (different from document ID)
      const youtubeVideoId = extractYouTubeId(videoUrl);
      if (!youtubeVideoId) {
        response.status(400).json({ 
          error: 'Invalid YouTube URL - cannot extract video ID for transcript' 
        });
        return;
      }

      logger.info('Starting video processing with transcript-first pipeline', { 
        videoId,
        manualCategory,
        includeBumpups,
        origin
      });

      const processingResult = {
        success: false,
        videoId,
        stages: {
          transcript: { success: false, processingTime: 0 },
          openaiAnalysis: { success: false, processingTime: 0 },
          bumpupsAnalysis: { success: false, processingTime: 0 },
          storage: { success: false, processingTime: 0 }
        },
        videoData: null as any
      };

      // Stage 1: Extract transcript from YouTube
      const transcriptStart = Date.now();
      logger.info('Stage 1: Extracting transcript from YouTube');
      
      const transcriptResult = await extractTranscriptInternal(youtubeVideoId);
      processingResult.stages.transcript.processingTime = Date.now() - transcriptStart;
      
      let contentForAnalysis = null;
      let contentSource = null;
      
      if (transcriptResult.success && transcriptResult.fullText) {
        processingResult.stages.transcript.success = true;
        contentForAnalysis = transcriptResult.fullText;
        contentSource = 'transcript';
        logger.info('Transcript extraction successful', { 
          segmentCount: transcriptResult.segmentCount 
        });
      } else {
        processingResult.stages.transcript.success = false;
        logger.warn('Transcript extraction failed, falling back to Bumpups');
        
        // Stage 2: Bumpups fallback when transcript fails
        const bumpupsStart = Date.now();
        logger.info('Stage 2: Using Bumpups as fallback for content analysis');
        
        try {
          const bumpupsResult = await callBumpupsAPI(videoUrl, manualCategory || 'general');
          if (bumpupsResult && bumpupsResult.output) {
            contentForAnalysis = bumpupsResult.output;
            contentSource = 'bumpups';
            processingResult.stages.bumpupsAnalysis.success = true;
            logger.info('Bumpups fallback successful');
          } else {
            logger.error('Bumpups fallback also failed');
          }
        } catch (error) {
          logger.error('Bumpups fallback failed:', error);
        }
        
        processingResult.stages.bumpupsAnalysis.processingTime = Date.now() - bumpupsStart;
      }

      // Stage 3: OpenAI Analysis (on transcript OR Bumpups content)
      const openaiStart = Date.now();
      let openaiAnalysis = null;
      let videoSummary = null;
      
      if (contentForAnalysis) {
        logger.info(`Stage 3: Performing OpenAI analysis on ${contentSource} content`);
        
        try {
          const openaiResult = await analyzeTranscriptWithOpenAI(
            contentForAnalysis,
            manualCategory || 'general',
            videoUrl
          );
          
          if (openaiResult.success) {
            openaiAnalysis = openaiResult.analysis;
            videoSummary = openaiResult.analysis.summary; // Extract summary for video cards
            processingResult.stages.openaiAnalysis.success = true;
            
            // Log detailed OpenAI analysis data
            logger.info('=== OPENAI ANALYSIS EXTRACTION ===', {
              videoId,
              analysisKeys: Object.keys(openaiAnalysis || {}),
              summary: openaiAnalysis?.summary?.substring(0, 100) + '...',
              skillsHighlighted: openaiAnalysis?.skillsHighlighted || [],
              educationRequired: openaiAnalysis?.educationRequired || [],
              hashtags: openaiAnalysis?.hashtags || [],
              keyThemes: openaiAnalysis?.keyThemes || [],
              careerPathways: openaiAnalysis?.careerPathways || [],
              careerStage: openaiAnalysis?.careerStage,
              confidenceScore: openaiAnalysis?.confidenceScore,
              fullAnalysis: JSON.stringify(openaiAnalysis, null, 2)
            });
            
            logger.info('OpenAI analysis completed successfully', { 
              contentSource,
              summaryLength: videoSummary?.length || 0 
            });
            
            // Determine category automatically if not provided manually
            const determinedCategory = manualCategory || determineAutomaticCategory(openaiAnalysis);
            
            logger.info('=== CATEGORY DETERMINATION ===', {
              manualCategory,
              determinedCategory,
              method: manualCategory ? 'manual' : 'automatic'
            });
          }
        } catch (error) {
          logger.error('OpenAI analysis failed:', error);
        }
      } else {
        logger.warn('No content available for OpenAI analysis (both transcript and Bumpups failed)');
      }
      
      processingResult.stages.openaiAnalysis.processingTime = Date.now() - openaiStart;

      // Stage 4: Compile and store results
      const storageStart = Date.now();
      logger.info('Stage 4: Storing processed video data');
      
      // Determine final category to use (manual if provided, otherwise automatic from analysis)
      let finalCategory = manualCategory || 'business'; // Default fallback
      if (openaiAnalysis) {
        finalCategory = manualCategory || determineAutomaticCategory(openaiAnalysis);
      }
      
      logger.info('=== FINAL CATEGORY DETERMINATION ===', {
        manualCategory,
        finalCategory,
        hasOpenAIAnalysis: !!openaiAnalysis,
        method: manualCategory ? 'manual' : 'automatic'
      });
      
      try {
        // First, ensure we have basic YouTube metadata for the video
        logger.info('Fetching basic YouTube metadata for video');
        let basicMetadata = null;
        try {
          basicMetadata = await extractYouTubeBasicMetadata(videoUrl);
          logger.info('Basic YouTube metadata fetched successfully', {
            title: basicMetadata.title,
            uploader: basicMetadata.uploader,
            duration: basicMetadata.duration
          });
        } catch (metadataError) {
          logger.warn('Failed to fetch basic YouTube metadata:', metadataError);
        }
        
        // Create update data structure (using update instead of set to preserve metadata)
        const updateData: any = {
          // Include basic video metadata if available
          ...(basicMetadata ? {
            title: basicMetadata.title,
            thumbnailUrl: basicMetadata.thumbnail,
            sourceUrl: videoUrl,
            sourceId: videoId,
            sourceType: 'youtube',
            creator: basicMetadata.uploader,
            duration: basicMetadata.duration,
            viewCount: 0, // Will be updated by other processes
            curatedDate: admin.firestore.Timestamp.now(),
          } : {}),
          category: finalCategory, // Update category (automatic or manual)
          // Update description with OpenAI summary if available
          description: openaiAnalysis?.summary || undefined,
          // Extract tags from hashtags (remove # symbols)
          tags: openaiAnalysis?.hashtags?.map((tag: string) => tag.replace('#', '')) || [],
          // Store transcript only if we successfully extracted it
          transcript: transcriptResult.success ? {
            fullText: transcriptResult.fullText,
            segments: transcriptResult.segments,
            segmentCount: transcriptResult.segmentCount,
            extractedAt: admin.firestore.Timestamp.now()
          } : admin.firestore.FieldValue.delete(), // Remove transcript if extraction failed
          // Update lastTranscriptUpdate if we have transcript data
          lastTranscriptUpdate: transcriptResult.success ? admin.firestore.Timestamp.now() : undefined,
          // Store AI analysis and summary for video cards and recommendations
          aiAnalysis: openaiAnalysis ? {
            summary: videoSummary || openaiAnalysis.summary, // Summary for video cards
            fullAnalysis: openaiAnalysis,
            contentSource: contentSource, // 'transcript' or 'bumpups'
            confidence: contentSource === 'transcript' ? 0.95 : 0.85,
            analyzedAt: admin.firestore.Timestamp.now(),
            analysisType: 'career_exploration' as const
          } : {
            summary: null,
            contentSource: null,
            confidence: 0,
            analyzedAt: admin.firestore.Timestamp.now(),
            analysisType: 'career_exploration' as const,
            error: 'Analysis failed - no content available'
          },
          // Extract structured data from OpenAI analysis for recommendations engine
          hashtags: openaiAnalysis?.hashtags || [],
          skillsHighlighted: openaiAnalysis?.skillsHighlighted || [],
          careerPathways: openaiAnalysis?.careerPathways || [],
          challenges: openaiAnalysis?.challenges || [],
          emotionalElements: openaiAnalysis?.emotionalElements || [],
          keyThemes: openaiAnalysis?.keyThemes || [],
          educationRequired: openaiAnalysis?.educationRequired || [],
          careerStage: openaiAnalysis?.careerStage || 'any',
          workEnvironments: openaiAnalysis?.workEnvironments || [],
          updatedAt: admin.firestore.Timestamp.now(),
          lastAnalyzed: admin.firestore.Timestamp.now(),
          analysisStatus: openaiAnalysis ? 'completed' : 'failed',
          // Clear any previous errors
          enrichmentError: admin.firestore.FieldValue.delete()
        };

        // Remove undefined values to avoid Firestore issues
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === undefined) {
            delete updateData[key];
          }
        });

        // Log the data being saved for debugging
        logger.info('=== PRE-SAVE DEBUG INFO ===', { 
          videoId,
          documentPath: `videos/${videoId}`,
          hasAiAnalysis: !!openaiAnalysis,
          hasTranscript: transcriptResult.success,
          category: finalCategory,
          skillsCount: updateData.skillsHighlighted?.length || 0,
          tagsCount: updateData.tags?.length || 0,
          educationCount: updateData.educationRequired?.length || 0
        });

        // Log the complete updateData structure being saved
        logger.info('=== COMPLETE UPDATE DATA ===', {
          videoId,
          updateDataKeys: Object.keys(updateData),
          updateData: JSON.stringify(updateData, null, 2)
        });

        // Check if document exists before updating
        const docRef = admin.firestore().collection('videos').doc(videoId);
        const docSnapshot = await docRef.get();
        
        logger.info('=== DOCUMENT EXISTS CHECK ===', {
          videoId,
          documentExists: docSnapshot.exists,
          currentData: docSnapshot.exists ? 'Document found' : 'Document not found'
        });

        if (docSnapshot.exists) {
          const currentData = docSnapshot.data();
          logger.info('=== CURRENT DOCUMENT DATA ===', {
            videoId,
            currentAnalysisStatus: currentData?.analysisStatus,
            currentCategory: currentData?.category,
            currentSkillsLength: currentData?.skillsHighlighted?.length || 0,
            currentTagsLength: currentData?.tags?.length || 0,
            hasCurrentAiAnalysis: !!currentData?.aiAnalysis
          });
        }

        // Store in Firestore using set with merge to preserve existing metadata
        logger.info('=== ATTEMPTING FIRESTORE WRITE ===', {
          videoId,
          operation: 'set with merge',
          collection: 'videos',
          documentId: videoId
        });

        try {
          await admin.firestore().collection('videos').doc(videoId).set(updateData, { merge: true });
          logger.info('=== FIRESTORE WRITE SUCCESS ===', {
            videoId,
            message: 'Document updated successfully'
          });
        } catch (firestoreError) {
          const errorDetails = firestoreError instanceof Error 
            ? { 
                message: firestoreError.message, 
                stack: firestoreError.stack,
                code: (firestoreError as any).code 
              }
            : { message: String(firestoreError), stack: null, code: null };
            
          logger.error('=== FIRESTORE WRITE FAILED ===', {
            videoId,
            error: errorDetails.message,
            errorCode: errorDetails.code,
            errorStack: errorDetails.stack
          });
          throw firestoreError;
        }

        // Verify the write was successful by reading the document back
        logger.info('=== VERIFYING WRITE SUCCESS ===', {
          videoId,
          message: 'Reading document back to verify changes'
        });

        const verificationDoc = await admin.firestore().collection('videos').doc(videoId).get();
        if (verificationDoc.exists) {
          const verifiedData = verificationDoc.data();
          logger.info('=== POST-WRITE VERIFICATION ===', {
            videoId,
            verifiedAnalysisStatus: verifiedData?.analysisStatus,
            verifiedCategory: verifiedData?.category,
            verifiedSkillsLength: verifiedData?.skillsHighlighted?.length || 0,
            verifiedTagsLength: verifiedData?.tags?.length || 0,
            verifiedHasAiAnalysis: !!verifiedData?.aiAnalysis,
            verifiedLastAnalyzed: verifiedData?.lastAnalyzed?.toDate?.() || verifiedData?.lastAnalyzed
          });
          
          // Return the complete video object (not just the update fields)
          processingResult.videoData = verifiedData; // Return complete video data
          processingResult.stages.storage.success = true;
          processingResult.success = true;
          
          logger.info('Video processing completed successfully', { videoId });
        } else {
          logger.error('=== POST-WRITE VERIFICATION FAILED ===', {
            videoId,
            error: 'Document not found after write operation'
          });
          
          // Fallback to update data if verification fails
          processingResult.videoData = updateData;
          processingResult.stages.storage.success = false;
          processingResult.success = false;
          
          logger.error('Video processing failed during verification', { videoId });
        }
        
      } catch (error) {
        logger.error('Failed to store video data:', error);
      }
      
      processingResult.stages.storage.processingTime = Date.now() - storageStart;

      // Return comprehensive result
      response.status(200).json(processingResult);
      
    } catch (error) {
      logger.error('Error in processVideoWithTranscript function:', error);
      response.status(500).json({ 
        error: 'Internal server error during video processing',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Internal function to extract transcript using Python Firebase Function
 */
async function extractTranscriptInternal(videoId: string): Promise<any> {
  // Transcript extraction has been disabled due to YouTube's anti-bot measures
  // The pipeline now relies on bumpups service for video analysis
  logger.info('Transcript extraction skipped - using bumpups service for video analysis');
  
  return {
    success: false,
    error: 'Transcript extraction disabled - using bumpups service',
    errorType: 'DISABLED',
    segments: [],
    fullText: '',
    segmentCount: 0
  };
}

/**
 * Internal function to call Bumpups API (reused logic from bumpupsProxy)
 */
async function callBumpupsAPI(videoUrl: string, category: string): Promise<any> {
  try {
    // Use the same secret as the bumpupsProxy function
    const bumpupsApiKey = bumpupsApiKeySecret.value();
    if (!bumpupsApiKey) {
      throw new Error('Bumpups API key not configured');
    }

    const prompt = `Analyse this video for a youth career exploration platform for 16–20-year-olds. Return your output in clear markdown using the following exact structure with bullet lists:

# Key Themes and Environments
- (max 5 themes/environments)

# Soft Skills Demonstrated
- (max 5 soft skills)

# Challenges Highlighted
- (max 5 challenges)

# Aspirational and Emotional Elements
- Timestamp – Quotation or moment (max 5)

# Suggested Hashtags
- #hashtag1
- #hashtag2
(up to 10)

# Recommended Career Paths
- (max 5 career paths)`;

    const payload = {
      url: videoUrl,
      model: "bump-1.0",
      prompt: prompt,
      language: "en",
      output_format: "text"
    };

    const response = await fetch("https://api.bumpups.com/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": bumpupsApiKey
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Bumpups API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    logger.error('Bumpups API call failed:', error);
    return null;
  }
}

/**
 * Automatically determine video category based on OpenAI analysis
 */
function determineAutomaticCategory(analysis: any): string {
  const careerPathways = analysis?.careerPathways || [];
  const keyThemes = analysis?.keyThemes || [];
  const workEnvironments = analysis?.workEnvironments || [];
  const hashtags = analysis?.hashtags || [];
  
  // Combine all text for analysis
  const allText = [
    ...careerPathways,
    ...keyThemes,
    ...workEnvironments,
    ...hashtags
  ].join(' ').toLowerCase();
  
  // Define category keywords with weights
  const categoryKeywords = {
    technology: [
      'software', 'tech', 'digital', 'data', 'ai', 'coding', 'programming', 'web', 'app', 'cyber',
      'computer', 'engineer', 'developer', 'IT', 'artificial intelligence', 'machine learning',
      'blockchain', 'cloud', 'database', 'algorithm', 'ux', 'ui', 'design system'
    ],
    healthcare: [
      'medical', 'health', 'doctor', 'nurse', 'therapist', 'physician', 'hospital', 'clinic',
      'patient', 'treatment', 'medicine', 'care', 'wellness', 'psychology', 'mental health',
      'physical therapy', 'dentist', 'pharmacist', 'surgery', 'rehabilitation'
    ],
    creative: [
      'art', 'design', 'music', 'film', 'creative', 'artist', 'photographer', 'writer', 'content',
      'media', 'advertising', 'marketing', 'brand', 'video', 'audio', 'theatre', 'performance',
      'animation', 'graphics', 'illustration', 'storytelling', 'journalism'
    ],
    trades: [
      'construction', 'plumbing', 'electrical', 'mechanic', 'carpenter', 'welder', 'technician',
      'repair', 'maintenance', 'installation', 'craftsmanship', 'skilled labor', 'manual work',
      'hands-on', 'tools', 'building', 'manufacturing', 'automotive', 'HVAC', 'food service',
      'cooking', 'chef', 'culinary', 'restaurant', 'kitchen', 'street vendor', 'food preparation'
    ],
    business: [
      'business', 'management', 'entrepreneur', 'startup', 'finance', 'accounting', 'sales',
      'marketing', 'consulting', 'administration', 'leadership', 'operations', 'strategy',
      'project management', 'human resources', 'customer service', 'retail', 'commerce',
      'small business', 'organization', 'planning', 'negotiation'
    ],
    sustainability: [
      'environmental', 'sustainability', 'green', 'renewable', 'solar', 'wind', 'conservation',
      'ecology', 'climate', 'recycling', 'organic', 'sustainable', 'carbon', 'energy efficient',
      'environmental science', 'conservation biology', 'renewable energy', 'waste management'
    ],
    education: [
      'education', 'teaching', 'teacher', 'instructor', 'professor', 'school', 'university',
      'training', 'learning', 'curriculum', 'academic', 'classroom', 'student', 'educational',
      'pedagogy', 'tutoring', 'mentoring', 'coaching', 'knowledge transfer'
    ],
    finance: [
      'finance', 'banking', 'investment', 'accounting', 'insurance', 'financial advisor',
      'analyst', 'economics', 'money management', 'budgeting', 'financial planning',
      'credit', 'loans', 'wealth management', 'trading', 'portfolio', 'risk management'
    ]
  };
  
  // Calculate category scores
  const categoryScores: { [key: string]: number } = {};
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    let score = 0;
    for (const keyword of keywords) {
      // Count occurrences of keyword in the text
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = allText.match(regex);
      if (matches) {
        score += matches.length;
      }
    }
    categoryScores[category] = score;
  }
  
  // Find the category with the highest score
  const bestCategory = Object.entries(categoryScores).reduce((a, b) => 
    categoryScores[a[0]] > categoryScores[b[0]] ? a : b
  )[0];
  
  // Log the scoring for debugging
  logger.info('=== AUTOMATIC CATEGORY DETERMINATION ===', {
    categoryScores,
    selectedCategory: bestCategory,
    topKeywords: allText.split(' ').slice(0, 20)
  });
  
  // Return the best category, or 'business' as fallback
  return categoryScores[bestCategory] > 0 ? bestCategory : 'business';
}

/**
 * Analyze transcript with OpenAI for career exploration insights
 * Using OpenAI SDK with proper token management and chunking for long transcripts
 */
async function analyzeTranscriptWithOpenAI(
  transcript: string, 
  category: string, 
  videoUrl: string
): Promise<{ success: boolean; analysis?: any }> {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize OpenAI client with proper configuration
    const openai = new OpenAI({
      apiKey: openaiApiKey.trim() // Remove any potential whitespace
    });

    // Simple token estimation (1 token ≈ 4 characters for English)
    const estimatedTokens = Math.ceil(transcript.length / 4);
    const maxContextTokens = 120000; // GPT-4o-mini context limit (leave room for response)
    const maxPromptTokens = maxContextTokens - 2000; // Reserve 2000 tokens for response

    let processedTranscript = transcript;
    
    // If transcript is too long, chunk it intelligently
    if (estimatedTokens > maxPromptTokens) {
      logger.warn(`Transcript too long (${estimatedTokens} tokens), chunking...`);
      
      // Take first 80% and last 20% to preserve context while staying within limits
      const targetLength = Math.floor(maxPromptTokens * 4 * 0.8); // Convert back to characters
      const firstPart = transcript.substring(0, targetLength * 0.8);
      const lastPart = transcript.substring(transcript.length - targetLength * 0.2);
      
      processedTranscript = firstPart + "\n\n[...CONTENT TRUNCATED...]\n\n" + lastPart;
      
      logger.info(`Transcript chunked from ${transcript.length} to ${processedTranscript.length} characters`);
    }

    const prompt = `Analyze this video transcript for a youth career exploration platform for 16–20-year-olds. The video is categorized as "${category}".

Transcript:
${processedTranscript}

Please provide a detailed analysis in JSON format with the following structure:
{
  "summary": "Brief 2-3 sentence summary of the video content",
  "keyThemes": ["theme1", "theme2", "theme3"], // max 5 themes
  "skillsHighlighted": ["skill1", "skill2"], // soft skills demonstrated, max 5
  "challenges": ["challenge1", "challenge2"], // challenges highlighted, max 5
  "careerPathways": ["career1", "career2"], // recommended career paths, max 5
  "hashtags": ["#hashtag1", "#hashtag2"], // relevant hashtags, max 10
  "emotionalElements": [
    {"timestamp": "MM:SS", "quote": "inspiring quote", "significance": "why important"}
  ], // max 5 emotional moments
  "educationRequired": ["High School", "Bachelor's", "Certification"], // education levels
  "careerStage": "entry-level|mid-career|senior-level|any",
  "workEnvironments": ["office", "remote", "field", "laboratory"], // max 3
  "confidenceScore": 0.95 // how confident the analysis is (0-1)
}

Focus on career exploration aspects and make it relevant for young people exploring career options.`;

    // Use OpenAI SDK with proper configuration
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a career guidance counselor analyzing video content for young people. Provide structured, actionable insights in valid JSON format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.7,
      response_format: { type: "json_object" } // Ensure JSON response
    });

    const analysisText = completion.choices[0]?.message?.content;
    
    if (!analysisText) {
      throw new Error('No analysis returned from OpenAI');
    }

    // Parse the JSON response
    try {
      const analysis = JSON.parse(analysisText);
      
      logger.info('OpenAI analysis completed successfully', {
        tokensUsed: completion.usage?.total_tokens || 0,
        confidenceScore: analysis.confidenceScore || 0.8
      });
      
      return { success: true, analysis };
    } catch (parseError) {
      logger.warn('Failed to parse OpenAI JSON response, using structured fallback');
      
      // Create structured fallback from raw text
      return { 
        success: true, 
        analysis: {
          summary: analysisText.substring(0, 300) + "...",
          keyThemes: ["Content Analysis", "Professional Development"],
          skillsHighlighted: ["Communication", "Critical Thinking"],
          challenges: ["Skill Development", "Career Planning"],
          careerPathways: ["Technology", "Business", "Creative"],
          hashtags: ["#career", "#skills", "#development"],
          emotionalElements: [],
          educationRequired: ["High School"],
          careerStage: "any",
          workEnvironments: ["office", "remote"],
          confidenceScore: 0.6
        }
      };
    }
    
  } catch (error) {
    logger.error('OpenAI analysis failed:', error);
    return { success: false };
  }
}

/**
 * Generate OpenAI summary from transcript (server-side)
 */
export const generateTranscriptSummary = onRequest(
  {
    cors: true, // Allow all origins for this function
    memory: '512MiB',
    timeoutSeconds: 120,
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

      // Set CORS headers manually to ensure they're properly applied
      response.set('Access-Control-Allow-Origin', '*');
      response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      response.set('Access-Control-Allow-Headers', 'Content-Type');
      
      // Handle preflight requests
      if (request.method === 'OPTIONS' as string) {
        response.status(204).send('');
        return;
      }

      // Get transcript from request body
      const { transcript, videoTitle, videoDescription, category = 'Career Exploration' } = request.body;
      
      if (!transcript || typeof transcript !== 'string') {
        response.status(400).json({ 
          success: false, 
          error: 'Missing or invalid transcript' 
        });
        return;
      }

      // Initialize OpenAI API
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        logger.error('OpenAI API key not configured');
        response.status(500).json({ 
          success: false, 
          error: 'OpenAI API key not configured' 
        });
        return;
      }

      const openai = new OpenAI({
        apiKey: openaiApiKey.trim()
      });

      // Prepare system prompt
      const systemPrompt = `You are an AI career counselor analyzing video content for a career exploration platform targeted at 16-20 year olds. 
Your task is to extract career-relevant insights from video transcripts.`;

      // Prepare user prompt with transcript
      const userPrompt = `Analyze this transcript for career exploration insights:

TRANSCRIPT:
${transcript.substring(0, 15000)}${transcript.length > 15000 ? '... (truncated)' : ''}

VIDEO TITLE: ${videoTitle || 'Unknown'}
VIDEO DESCRIPTION: ${videoDescription || 'Not provided'}
CATEGORY: ${category || 'Career Exploration'}

Provide a detailed analysis with these sections:

1. Career Insights: Key roles, responsibilities, industry information
2. Skills & Qualifications: Required skills, education, certifications
3. Professional Development: Growth opportunities, career progression
4. Industry Context: Market trends, workplace culture, challenges
5. Actionable Takeaways: 3-5 specific actions viewers can take

Format your response in Markdown with clear headings and bullet points where appropriate.`;

      // Call OpenAI API
      logger.info('Calling OpenAI API for transcript analysis');
      const startTime = Date.now();
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const summary = completion.choices[0]?.message?.content || '';
      const tokensUsed = completion.usage?.total_tokens || 0;
      const processingTime = Date.now() - startTime;
      
      logger.info('OpenAI analysis completed', { 
        tokensUsed, 
        processingTimeMs: processingTime 
      });

      // Return the analysis
      response.status(200).json({
        success: true,
        summary,
        metadata: {
          tokensUsed,
          model: 'gpt-4o',
          generatedAt: new Date().toISOString(),
          processingTimeMs: processingTime
        }
      });
      
    } catch (error: any) {
      logger.error('OpenAI analysis error:', error);
      response.status(500).json({ 
        success: false, 
        error: error.message || 'Unknown error',
        errorType: 'SERVER_ERROR'
      });
    }
  }
); 

// Old string matching function removed - replaced with OpenAI semantic scoring

/**
 * Enhanced video recommendations using career-focused analysis
 */
export const getEnhancedCareerRecommendations = onRequest(
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

      // Validate origin
      const origin = request.headers.origin;
      if (origin && !isOriginAllowed(origin)) {
        logger.warn('Unauthorized origin attempted to access getEnhancedCareerRecommendations', { origin });
        response.status(403).json({ error: 'Origin not allowed' });
        return;
      }

      // Validate request body
      const { 
        userId, 
        limit = 5, 
        includeWatched = false,
        feedbackType = null,
        chatSummaryId = null
      } = request.body;
      
      if (!userId) {
        response.status(400).json({ 
          error: 'Missing required field: userId' 
        });
        return;
      }

      // Get user preferences
      const userPrefsSnapshot = await db.collection('userPreferences').doc(userId).get();
      const userPrefs = userPrefsSnapshot.exists ? userPrefsSnapshot.data() : {};
      
      // Get user watch history
      const watchHistorySnapshot = await db.collection('userActivity')
        .doc(userId)
        .collection('watchHistory')
        .orderBy('timestamp', 'desc')
        .limit(20)
        .get();
      
      const watchedVideoIds = watchHistorySnapshot.docs.map(doc => doc.data().videoId);
      
      // Get user feedback
      const userFeedbackSnapshot = await db.collection('userActivity')
        .doc(userId)
        .collection('videoFeedback')
        .get();
      
      const videoFeedback = userFeedbackSnapshot.docs.reduce((acc, doc) => {
        const data = doc.data();
        acc[doc.id] = {
          liked: data.liked || false,
          disliked: data.disliked || false,
          saved: data.saved || false
        };
        return acc;
      }, {} as Record<string, { liked: boolean, disliked: boolean, saved: boolean }>);
      
      // Get chat summary
      let chatSummary = null;
      if (chatSummaryId) {
        const chatSummarySnapshot = await db.collection('chatSummaries').doc(chatSummaryId).get();
        if (chatSummarySnapshot.exists) {
          chatSummary = chatSummarySnapshot.data();
        }
      }
      
      if (!chatSummary) {
        const recentSummariesSnapshot = await db.collection('chatSummaries')
          .where('userId', '==', userId)
          .orderBy('createdAt', 'desc')
          .limit(1)
          .get();
        
        if (!recentSummariesSnapshot.empty) {
          chatSummary = recentSummariesSnapshot.docs[0].data();
        }
      }
      
      // Extract user profile
      const userProfile = {
        interests: chatSummary?.interests || userPrefs?.interests || [],
        skills: chatSummary?.skills || userPrefs?.skills || [],
        careerGoals: chatSummary?.careerGoals || userPrefs?.careerGoals || [],
        learningPaths: chatSummary?.learningPaths || []
      };
      
      logger.info('Enhanced career recommendations user profile', { 
        userId,
        interestsCount: userProfile.interests.length,
        skillsCount: userProfile.skills.length,
        goalsCount: userProfile.careerGoals.length,
        pathsCount: userProfile.learningPaths.length,
        actualInterests: userProfile.interests,
        actualSkills: userProfile.skills,
        actualGoals: userProfile.careerGoals,
        actualPaths: userProfile.learningPaths
      });

      // Initialize OpenAI client for semantic scoring
      const openaiApiKey = openaiApiKeySecret.value();
      if (!openaiApiKey) {
        logger.error('OpenAI API key not found in secret manager');
        response.status(500).json({ error: 'API configuration error' });
        return;
      }
      
      const openai = new OpenAI({
        apiKey: openaiApiKey
      });

      // Get all videos with analysis data
      const videosSnapshot = await db.collection('videos')
        .where('analysisStatus', '==', 'completed')
        .get();
      
      // Debug: Log categories of videos being processed
      const videoCategories = videosSnapshot.docs.reduce((acc, doc) => {
        const category = doc.data().category || 'uncategorized';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      logger.info('Enhanced career recommendations - video categories found', {
        totalVideos: videosSnapshot.docs.length,
        categories: videoCategories,
        hasTechnology: videoCategories.technology || 0,
        hasBusinessSoftware: videoCategories.business || 0
      });
      
      if (videosSnapshot.empty) {
        logger.warn('No analyzed videos found for career recommendations');
        response.status(200).json({ 
          videoIds: [],
          method: 'enhanced-career',
          reason: 'no-analyzed-videos'
        });
        return;
      }

      // Use semantic scoring for enhanced career recommendations
      const scoredVideos = await Promise.all(videosSnapshot.docs.map(async (doc) => {
        const video = { id: doc.id, ...doc.data() };
        const semanticScore = await calculateSemanticRelevanceScore(video, userProfile, openai);
        
        // Apply feedback adjustments
        let adjustedScore = semanticScore;
        const feedback = videoFeedback[video.id];
        
        if (feedback) {
          if (feedback.liked) adjustedScore *= 1.3;
          if (feedback.disliked) adjustedScore *= 0.3;
          if (feedback.saved) adjustedScore *= 1.4;
          
          // Filter by feedback type if specified
          if (feedbackType === 'liked' && !feedback.liked) adjustedScore = 0;
          if (feedbackType === 'disliked' && !feedback.disliked) adjustedScore = 0;
          if (feedbackType === 'saved' && !feedback.saved) adjustedScore = 0;
        }
        
        // Exclude watched videos if requested
        if (!includeWatched && watchedVideoIds.includes(video.id)) {
          adjustedScore = 0;
        }
        
        return {
          videoId: video.id,
          score: adjustedScore,
          originalScore: semanticScore
        };
      }));

      // Sort by score and take top results
      const topResults = scoredVideos
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.videoId);

      logger.info('Enhanced career recommendations generated', { 
        userId,
        totalVideos: scoredVideos.length,
        recommendedCount: topResults.length,
        method: 'enhanced-career',
        topScores: scoredVideos.slice(0, 10).map(v => ({ id: v.videoId, score: v.score, originalScore: v.originalScore })),
        videoAnalysisStatusCheck: videosSnapshot.docs.slice(0, 3).map(doc => ({
          id: doc.id,
          hasAnalysis: !!doc.data().aiAnalysis,
          analysisType: doc.data().aiAnalysis?.analysisType,
          hasCareerPathways: !!(doc.data().aiAnalysis?.careerPathways || doc.data().careerPathways),
          hasSkills: !!(doc.data().aiAnalysis?.skillsHighlighted || doc.data().skillsHighlighted)
        }))
      });

      response.status(200).json({ 
        videoIds: topResults,
        method: 'enhanced-career',
        profileUsed: true,
        totalAnalyzed: scoredVideos.length
      });

    } catch (error) {
      logger.error('Error in getEnhancedCareerRecommendations function', error);
      response.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Debug function to check database state
export const debugVideoDatabase = onRequest(
  { cors: corsConfig },
  async (request, response) => {
    try {
      logger.info('Debug: Checking video database state...');
      
      // Get all videos
      const allVideos = await db.collection('videos').get();
      
      // Count by analysis status
      const statusCounts: Record<string, number> = {};
      const softwareVideos: any[] = [];
      
      allVideos.forEach(doc => {
        const data = doc.data();
        const status = data.analysisStatus || 'no-status';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
        
        // Check for software development videos
        const title = data.title?.toLowerCase() || '';
        if (title.includes('software engineer') || title.includes('software developer') || 
            title.includes('programming') || title.includes('coding')) {
          softwareVideos.push({
            id: doc.id,
            title: data.title,
            category: data.category,
            analysisStatus: data.analysisStatus,
            hasAiAnalysis: !!data.aiAnalysis,
            videoUrl: data.videoUrl
          });
        }
      });
      
      // Check specifically for completed technology videos
      const completedVideos = await db.collection('videos')
        .where('analysisStatus', '==', 'completed')
        .get();
      
      const completedTechVideos = completedVideos.docs.filter(doc => {
        const data = doc.data();
        return data.category === 'technology';
      });
      
      const response_data = {
        totalVideos: allVideos.size,
        statusCounts,
        softwareVideos: softwareVideos.length,
        softwareVideoDetails: softwareVideos,
        completedVideos: completedVideos.size,
        completedTechVideos: completedTechVideos.length,
        completedTechVideoIds: completedTechVideos.map(doc => ({
          id: doc.id,
          title: doc.data().title,
          category: doc.data().category
        }))
      };
      
      logger.info('Debug video database results', response_data);
      
      response.json(response_data);
      
    } catch (error) {
      logger.error('Debug video database error', error);
      response.status(500).json({ error: 'Failed to debug video database' });
    }
  }
);

/**
 * OpenAI-powered semantic scoring for video relevance
 * Uses GPT to understand the nuanced relationship between user goals and video content
 */
async function calculateSemanticRelevanceScore(
  video: any,
  userProfile: {
    interests: string[];
    skills: string[];
    careerGoals: string[];
    learningPaths: string[];
  },
  openai: OpenAI
): Promise<number> {
  try {
    // Extract video analysis data
    const videoAnalysis = video.aiAnalysis?.fullAnalysis || video.aiAnalysis || {};
    const careerPathways = videoAnalysis.careerPathways || video.careerPathways || [];
    const skillsHighlighted = videoAnalysis.skillsHighlighted || video.skillsHighlighted || [];
    const keyThemes = videoAnalysis.keyThemes || [];
    const hashtags = videoAnalysis.hashtags || video.hashtags || [];
    const summary = videoAnalysis.summary || '';
    
    // Create video context
    const videoContext = {
      title: video.title || '',
      category: video.category || '',
      careerPathways: careerPathways.slice(0, 5), // Limit to prevent token overflow
      skillsHighlighted: skillsHighlighted.slice(0, 5),
      keyThemes: keyThemes.slice(0, 5),
      hashtags: hashtags.slice(0, 5),
      summary: summary.slice(0, 300) // Limit summary length
    };
    
    // Create user profile context
    const userContext = {
      careerGoals: userProfile.careerGoals,
      interests: userProfile.interests,
      skills: userProfile.skills,
      learningPaths: userProfile.learningPaths
    };
    
    const prompt = `You are an expert career counselor evaluating how well a video matches a user's career goals and interests.

USER PROFILE:
- Career Goals: ${userContext.careerGoals.join(', ')}
- Interests: ${userContext.interests.join(', ')}
- Skills: ${userContext.skills.join(', ')}
- Learning Paths: ${userContext.learningPaths.join(', ')}

VIDEO CONTENT:
- Title: ${videoContext.title}
- Category: ${videoContext.category}
- Career Pathways: ${videoContext.careerPathways.join(', ')}
- Skills Highlighted: ${videoContext.skillsHighlighted.join(', ')}
- Key Themes: ${videoContext.keyThemes.join(', ')}
- Hashtags: ${videoContext.hashtags.join(', ')}
- Summary: ${videoContext.summary}

TASK: Rate how relevant this video is to the user's career goals and interests on a scale of 0-100, where:
- 0-20: Not relevant at all
- 21-40: Somewhat related but not directly relevant
- 41-60: Moderately relevant, some useful content
- 61-80: Highly relevant, strong match with user goals
- 81-100: Perfect match, exactly what the user is looking for

Consider:
1. Specificity: Exact matches to career goals should score higher than general matches
2. Context: Software engineering is very different from other types of engineering
3. Relevance: How directly does this video help the user achieve their stated goals?
4. Practical value: Would this video provide actionable insights for their career path?

Respond with ONLY a number between 0-100. No explanation needed.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Use faster, cheaper model for scoring
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.1, // Low temperature for consistent scoring
      max_tokens: 10 // We only need a number
    });

    const scoreText = completion.choices[0]?.message?.content?.trim() || '0';
    const score = parseInt(scoreText, 10);
    
    // Validate score
    if (isNaN(score) || score < 0 || score > 100) {
      logger.warn('Invalid semantic score received', { 
        videoId: video.id, 
        scoreText, 
        parsedScore: score 
      });
      return 0;
    }

    // Debug log for software development videos
    const title = video.title?.toLowerCase() || '';
    if (title.includes('software engineer') || title.includes('software developer')) {
      logger.info('Semantic score for software development video', {
        videoId: video.id,
        title: video.title,
        semanticScore: score,
        userGoals: userContext.careerGoals
      });
    }

    return score;
    
  } catch (error: any) {
    logger.error('Semantic scoring error', { 
      videoId: video.id, 
      error: error.message 
    });
    return 0; // Fall back to 0 if OpenAI call fails
  }
}

/**
 * Generate comprehensive career pathways with training, volunteering, and funding information
 */
export const generateCareerPathways = onRequest(
  {
    cors: corsConfig,
    secrets: [openaiApiKeySecret],
    memory: "512MiB",
    timeoutSeconds: 120,
  },
  async (request, response) => {
    try {
      const origin = request.get('origin') || request.get('referer');
      
      if (!isOriginAllowed(origin)) {
        logger.warn('Unauthorized origin attempted to access generateCareerPathways', { origin });
        response.status(403).send('Forbidden: Unauthorized origin');
        return;
      }

      if (request.method === 'OPTIONS') {
        response.set('Access-Control-Allow-Origin', origin || '*');
        response.set('Access-Control-Allow-Methods', 'POST');
        response.set('Access-Control-Allow-Headers', 'Content-Type');
        response.status(204).send('');
        return;
      }

      if (request.method !== 'POST') {
        response.status(405).send('Method Not Allowed');
        return;
      }

      const { userProfile } = request.body;

      if (!userProfile) {
        response.status(400).json({ 
          error: 'User profile is required',
          received: request.body 
        });
        return;
      }

      logger.info('Generating career pathways for user profile', {
        interests: userProfile.interests?.length || 0,
        skills: userProfile.skills?.length || 0,
        goals: userProfile.goals?.length || 0,
        careerStage: userProfile.careerStage
      });

      const openai = new OpenAI({
        apiKey: openaiApiKeySecret.value(),
      });

      const systemPrompt = `You are a UK career guidance specialist with comprehensive knowledge of training providers, volunteering opportunities, and funding schemes across the UK. Generate detailed, actionable career guidance with real UK-specific resources.`;

      const userPrompt = `Generate comprehensive UK career guidance for a user with this profile:

INTERESTS: ${userProfile.interests?.join(', ') || 'Not specified'}
SKILLS: ${userProfile.skills?.join(', ') || 'Not specified'}  
GOALS: ${userProfile.goals?.join(', ') || 'Not specified'}
CAREER STAGE: ${userProfile.careerStage || 'exploring'}

Provide a JSON response with this exact structure:

{
  "primaryPathway": {
    "title": "Career pathway name",
    "description": "Brief description of the career path",
    "timeline": "Expected timeline (e.g., '6-12 months')",
    "requirements": ["skill1", "skill2"],
    "progression": ["step1", "step2", "step3"]
  },
  "training": [
    {
      "title": "Course name",
      "provider": "Training provider name",
      "duration": "Course length",
      "cost": "Course cost with £ symbol",
      "location": "UK location or 'Online'",
      "description": "Brief course description",
      "link": "Real UK course URL if available, or '#' if not"
    }
  ],
  "volunteering": [
    {
      "title": "Volunteer role title",
      "organization": "UK organization name",
      "timeCommitment": "Weekly time commitment",
      "location": "UK location or 'Various locations'", 
      "description": "Role description",
      "benefits": "Skills/experience gained",
      "link": "Real UK organization URL if available, or '#' if not"
    }
  ],
  "funding": [
    {
      "title": "Funding scheme name",
      "provider": "Government/organization providing funding",
      "amount": "Funding amount with £ symbol",
      "eligibility": "Who can apply",
      "description": "What the funding covers",
      "link": "Real UK funding scheme URL if available, or '#' if not"
    }
  ],
  "resources": [
    {
      "title": "Resource name",
      "organization": "UK organization/website",
      "description": "What this resource provides",
      "link": "Real UK resource URL if available, or '#' if not"
    }
  ]
}

Focus on real UK opportunities. Use actual UK training providers, recognized charities, government schemes, and career services where possible.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const responseText = completion.choices[0]?.message?.content;
      
      if (!responseText) {
        throw new Error('No response from OpenAI');
      }

      let careerGuidance;
      try {
        careerGuidance = JSON.parse(responseText);
      } catch (parseError) {
        logger.error('Failed to parse OpenAI response as JSON', { responseText });
        throw new Error('Invalid JSON response from OpenAI');
      }

      logger.info('Successfully generated career pathways', {
        trainingCount: careerGuidance.training?.length || 0,
        volunteeringCount: careerGuidance.volunteering?.length || 0,
        fundingCount: careerGuidance.funding?.length || 0,
        resourcesCount: careerGuidance.resources?.length || 0
      });

      response.set('Access-Control-Allow-Origin', origin || '*');
      response.json({
        success: true,
        data: careerGuidance,
        generatedAt: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('Error in generateCareerPathways function', {
        error: error.message,
        stack: error.stack
      });
      
      response.status(500).json({
        success: false,
        error: 'Failed to generate career pathways',
        message: error.message
      });
    }
  }
);

