"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.textChatEnd = exports.textChatMessage = exports.textChatStart = exports.searchCareerData = exports.generateCareerPathways = exports.debugVideoDatabase = exports.getEnhancedCareerRecommendations = exports.generateTranscriptSummary = exports.processVideoWithTranscript = exports.extractTranscript = exports.getPersonalizedVideoRecommendations = exports.searchVideos = exports.generateEmbedding = exports.getVideoRecommendations = exports.generateDetailedChatSummary = exports.generateChatSummary = exports.sendChatMessage = exports.createChatThread = exports.healthCheck = exports.bumpupsProxy = exports.enrichVideoMetadata = void 0;
const admin = __importStar(require("firebase-admin"));
const https = __importStar(require("https"));
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
const functionsV1 = __importStar(require("firebase-functions/v1"));
const params_1 = require("firebase-functions/params");
const openai_1 = __importDefault(require("openai"));
// Define secrets
const bumpupsApiKeySecret = (0, params_1.defineSecret)("BUMPUPS_APIKEY");
const openaiApiKeySecret = (0, params_1.defineSecret)('OPENAI_API_KEY');
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
// CORS configuration for functions v2 - more permissive for Firebase domains
const corsConfig = corsOrigins;
// Helper function to validate origin against allowed list
const isOriginAllowed = (origin) => {
    if (!origin)
        return true; // Allow requests without origin (server-to-server)
    // Check against allowed origins (exact match)
    if (corsOrigins.includes(origin)) {
        return true;
    }
    // Allow any localhost in development with any port
    if (origin.includes('localhost')) {
        return true;
    }
    // Allow any Firebase hosting domain for this project
    if (origin.includes('offscript-8f6eb.web.app') ||
        origin.includes('offscript-8f6eb.firebaseapp.com')) {
        return true;
    }
    return false;
};
// Helper function to set CORS headers properly
const setCorsHeaders = (response, origin) => {
    if (origin && isOriginAllowed(origin)) {
        response.set('Access-Control-Allow-Origin', origin);
    }
    else if (!origin) {
        response.set('Access-Control-Allow-Origin', '*');
    }
    response.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.set('Access-Control-Max-Age', '3600');
};
/**
 * Recursively removes undefined values from an object
 * @param {any} obj - The object to sanitize
 * @return {any} The sanitized object
 */
function sanitizeObject(obj) {
    if (obj === null || obj === undefined) {
        return null;
    }
    if (Array.isArray(obj)) {
        return obj.map(sanitizeObject).filter(item => item !== undefined);
    }
    if (typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
                sanitized[key] = sanitizeObject(value);
            }
        }
        return sanitized;
    }
    return obj;
}
/**
 * Check if a URL is accessible
 * @param {string} url - The URL to check
 * @return {Promise<boolean>} Whether the URL is accessible
 */
async function isUrlAccessible(url) {
    return new Promise((resolve) => {
        https.get(url, (res) => {
            if (res.statusCode === 200) {
                resolve(true);
            }
            else {
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
function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}
/**
 * Get the best available YouTube thumbnail URL
 * @param {string} videoId - The YouTube video ID
 * @return {Promise<string>} The best available thumbnail URL
 */
async function getBestYouTubeThumbnail(videoId) {
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
async function extractYouTubeBasicMetadata(url) {
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
            const oEmbedData = await new Promise((resolve, reject) => {
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
                        }
                        catch (error) {
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
                duration: 0,
                webpage_url: url,
                thumbnail: thumbnailUrl,
                uploader: oEmbedData.author_name || "Unknown",
                upload_date: undefined,
                tags: [],
            };
        }
        catch (oEmbedError) {
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
    }
    catch (error) {
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
function determineSourceType(url) {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
        return "youtube";
    }
    else if (url.includes("vimeo.com")) {
        return "vimeo";
    }
    else if (url.includes("instagram.com")) {
        return "instagram";
    }
    else {
        return "other";
    }
}
/**
 * Extract basic metadata from a video URL
 * @param {string} url - The video URL
 * @return {Promise<VideoMetadata>} The extracted metadata
 */
async function extractBasicMetadata(url) {
    try {
        console.log(`[DEBUG] Starting metadata extraction for URL: ${url}`);
        // Determine the source type
        const sourceType = determineSourceType(url);
        console.log(`[DEBUG] Detected source type: ${sourceType}`);
        // Extract metadata based on source type
        if (sourceType === "youtube") {
            return await extractYouTubeBasicMetadata(url);
        }
        else {
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
    }
    catch (error) {
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
const runtimeOpts = {
    timeoutSeconds: 300,
    memory: '1GB',
};
exports.enrichVideoMetadata = functionsV1
    .runWith(runtimeOpts)
    .firestore
    .document("videos/{videoId}")
    .onWrite(async (change, context) => {
    // If the document was deleted, do nothing
    if (!change.after.exists) {
        return null;
    }
    const videoId = context.params.videoId;
    const videoData = change.after.data();
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
        const updateData = {
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
    }
    catch (error) {
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
exports.bumpupsProxy = (0, https_1.onRequest)({
    cors: corsOrigins,
    memory: '512MiB',
    timeoutSeconds: 60,
    secrets: [bumpupsApiKeySecret],
}, async (request, response) => {
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
            firebase_functions_1.logger.warn('Unauthorized origin attempted to access bumpupsProxy', { origin });
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
            firebase_functions_1.logger.error('Bumpups API key not found in secret manager. Ensure the BUMPUPS_APIKEY secret is set.');
            response.status(500).json({ error: 'API configuration error' });
            return;
        }
        // Log request details without sensitive information
        firebase_functions_1.logger.info('Making Bumpups API request', {
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
            firebase_functions_1.logger.error('Bumpups API error', {
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
        firebase_functions_1.logger.info('Bumpups API success', {
            outputLength: data.output?.length || 0,
            videoDuration: data.video_duration
        });
        // Return the response
        response.status(200).json(data);
    }
    catch (error) {
        firebase_functions_1.logger.error('Error in bumpupsProxy function', error);
        response.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Health check endpoint
 */
exports.healthCheck = (0, https_1.onRequest)({ cors: corsOrigins }, (request, response) => {
    response.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});
/**
 * Create a new OpenAI thread
 */
exports.createChatThread = (0, https_1.onRequest)({
    cors: corsConfig,
    secrets: [openaiApiKeySecret]
}, async (request, response) => {
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
            firebase_functions_1.logger.warn('Unauthorized origin attempted to access createChatThread', { origin });
            response.status(403).json({ error: 'Origin not allowed' });
            return;
        }
        // Get OpenAI API key
        const openaiApiKey = openaiApiKeySecret.value();
        if (!openaiApiKey) {
            firebase_functions_1.logger.error('OpenAI API key not found in secret manager');
            response.status(500).json({ error: 'API configuration error' });
            return;
        }
        // Initialize OpenAI client
        const openai = new openai_1.default({
            apiKey: openaiApiKey
        });
        // Create a new thread
        const thread = await openai.beta.threads.create();
        firebase_functions_1.logger.info('Created new OpenAI thread', { threadId: thread.id });
        // Return the thread ID
        response.status(200).json({
            threadId: thread.id
        });
    }
    catch (error) {
        firebase_functions_1.logger.error('Error in createChatThread function', error);
        response.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Send a message to an OpenAI Assistant and get the response
 */
exports.sendChatMessage = (0, https_1.onRequest)({
    cors: corsConfig,
    secrets: [openaiApiKeySecret],
    timeoutSeconds: 60
}, async (request, response) => {
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
            firebase_functions_1.logger.warn('Unauthorized origin attempted to access sendChatMessage', { origin });
            response.status(403).json({ error: 'Origin not allowed' });
            return;
        }
        // Validate request body
        const { threadId, message, assistantId, userId, userContext } = request.body;
        if (!threadId || !message || !assistantId) {
            response.status(400).json({
                error: 'Missing required fields: threadId, message, and assistantId'
            });
            return;
        }
        // Get OpenAI API key
        const openaiApiKey = openaiApiKeySecret.value();
        if (!openaiApiKey) {
            firebase_functions_1.logger.error('OpenAI API key not found in secret manager');
            response.status(500).json({ error: 'API configuration error' });
            return;
        }
        // Initialize OpenAI client
        const openai = new openai_1.default({
            apiKey: openaiApiKey
        });
        // Check if this is the first message in the thread (context injection needed)
        const existingMessages = await openai.beta.threads.messages.list(threadId);
        const isFirstMessage = existingMessages.data.length === 0;
        // Inject user context if this is the first message and we have context
        if (isFirstMessage && userContext) {
            firebase_functions_1.logger.info('Injecting user context for first message in thread', {
                threadId,
                userId,
                contextLength: userContext.length
            });
            // Add context as a system-like message before the user message
            await openai.beta.threads.messages.create(threadId, {
                role: 'user',
                content: `[CONTEXT FOR ASSISTANT - Use this to personalize responses but do not mention receiving this context]\n\n${userContext}\n\n[END CONTEXT]`
            });
        }
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
        firebase_functions_1.logger.info('Processed OpenAI assistant response', {
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
    }
    catch (error) {
        firebase_functions_1.logger.error('Error in sendChatMessage function', error);
        response.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Generate a summary of a chat thread for user profiling
 */
exports.generateChatSummary = (0, https_1.onRequest)({
    cors: corsConfig,
    secrets: [openaiApiKeySecret],
    timeoutSeconds: 120
}, async (request, response) => {
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
            firebase_functions_1.logger.warn('Unauthorized origin attempted to access generateChatSummary', { origin });
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
            firebase_functions_1.logger.error('OpenAI API key not found in secret manager');
            response.status(500).json({ error: 'API configuration error' });
            return;
        }
        // Initialize OpenAI client
        const openai = new openai_1.default({
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
        }
        catch (error) {
            firebase_functions_1.logger.error('Error parsing summary JSON', error);
            summaryData = {
                text: content,
                interests: [],
                careerGoals: [],
                skills: []
            };
        }
        firebase_functions_1.logger.info('Generated chat summary', { threadId });
        // Return the summary
        response.status(200).json(summaryData);
    }
    catch (error) {
        firebase_functions_1.logger.error('Error in generateChatSummary function', error);
        response.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Generate a detailed chat summary with structured data
 */
exports.generateDetailedChatSummary = (0, https_1.onRequest)({
    cors: corsConfig,
    secrets: [openaiApiKeySecret],
    timeoutSeconds: 120
}, async (request, response) => {
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
            firebase_functions_1.logger.warn('Unauthorized origin attempted to access generateDetailedChatSummary', { origin });
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
            firebase_functions_1.logger.error('OpenAI API key not found in secret manager');
            response.status(500).json({ error: 'API configuration error' });
            return;
        }
        // Initialize OpenAI client
        const openai = new openai_1.default({
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
            }
            else {
                jsonStr = content;
            }
            summaryData = JSON.parse(jsonStr);
        }
        catch (error) {
            firebase_functions_1.logger.error('Error parsing detailed summary JSON', error);
            summaryData = {
                text: content,
                interests: [],
                skills: [],
                careerGoals: [],
                learningPaths: [],
                reflectiveQuestions: []
            };
        }
        firebase_functions_1.logger.info('Generated detailed chat summary', { threadId });
        // Return the detailed summary
        response.status(200).json(summaryData);
    }
    catch (error) {
        firebase_functions_1.logger.error('Error in generateDetailedChatSummary function', error);
        response.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Get video recommendations based on user profile
 */
exports.getVideoRecommendations = (0, https_1.onRequest)({
    cors: corsConfig,
    secrets: [openaiApiKeySecret],
    timeoutSeconds: 30
}, async (request, response) => {
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
            firebase_functions_1.logger.warn('Unauthorized origin attempted to access getVideoRecommendations', { origin });
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
        firebase_functions_1.logger.info('getVideoRecommendations request parameters', {
            userId,
            interests,
            careerGoals,
            skills,
            limit
        });
        // Get OpenAI API key
        const openaiApiKey = openaiApiKeySecret.value();
        if (!openaiApiKey) {
            firebase_functions_1.logger.error('OpenAI API key not found in secret manager');
            response.status(500).json({ error: 'API configuration error' });
            return;
        }
        // Initialize OpenAI client
        const openai = new openai_1.default({
            apiKey: openaiApiKey
        });
        // Create a combined query from user profile
        const combinedQuery = [
            `Interests: ${interests.join(', ')}`,
            `Career Goals: ${careerGoals.join(', ')}`,
            `Skills: ${skills.join(', ')}`
        ].filter(part => !part.endsWith(': ')).join('\n');
        // DEBUG: Check if we have a meaningful profile
        firebase_functions_1.logger.info('Combined query for recommendations', { combinedQuery, length: combinedQuery.length });
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
                firebase_functions_1.logger.info('Video embeddings query results', {
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
                    firebase_functions_1.logger.info('Generated video recommendations using embeddings', {
                        userId,
                        videoCount: topResults.length,
                        method: 'embeddings',
                        topResults
                    });
                    // Return the video IDs
                    response.status(200).json({ videoIds: topResults });
                    return;
                }
                else {
                    firebase_functions_1.logger.warn('No video embeddings found, falling back to category matching');
                }
            }
            catch (embeddingError) {
                // Log the error but continue with fallback method
                firebase_functions_1.logger.error('Error using embeddings for recommendations, falling back to category matching', embeddingError);
            }
        }
        // DEBUG: Check if we have interests to query with
        firebase_functions_1.logger.info('Falling back to category matching', {
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
            firebase_functions_1.logger.info('Category-based query', {
                categories: interests.slice(0, 10),
                limit
            });
        }
        else {
            // Get popular videos if no interests are specified
            videoQuery = db.collection('videos')
                .orderBy('viewCount', 'desc')
                .limit(limit);
            // DEBUG: Log that we're using a fallback query
            firebase_functions_1.logger.info('Using fallback query (popular videos)', { limit });
        }
        const videosSnapshot = await videoQuery.get();
        // DEBUG: Log the query results
        firebase_functions_1.logger.info('Video query results', {
            count: videosSnapshot.size,
            empty: videosSnapshot.empty
        });
        // Extract video IDs
        const videoIds = videosSnapshot.docs.map((doc) => doc.id);
        firebase_functions_1.logger.info('Generated video recommendations using category matching', {
            userId,
            videoCount: videoIds.length,
            method: 'category',
            videoIds
        });
        // Return the video IDs
        response.status(200).json({ videoIds });
    }
    catch (error) {
        firebase_functions_1.logger.error('Error in getVideoRecommendations function', error);
        response.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Generate embeddings for text using OpenAI API
 */
exports.generateEmbedding = (0, https_1.onRequest)({
    cors: corsConfig,
    secrets: [openaiApiKeySecret],
    timeoutSeconds: 30
}, async (request, response) => {
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
            firebase_functions_1.logger.warn('Unauthorized origin attempted to access generateEmbedding', { origin });
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
            firebase_functions_1.logger.error('OpenAI API key not found in secret manager');
            response.status(500).json({ error: 'API configuration error' });
            return;
        }
        // Initialize OpenAI client
        const openai = new openai_1.default({
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
    }
    catch (error) {
        firebase_functions_1.logger.error('Error in generateEmbedding function', error);
        response.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Search for videos based on semantic similarity to a query
 */
exports.searchVideos = (0, https_1.onRequest)({
    cors: corsConfig,
    secrets: [openaiApiKeySecret],
    timeoutSeconds: 30
}, async (request, response) => {
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
            firebase_functions_1.logger.warn('Unauthorized origin attempted to access searchVideos', { origin });
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
            firebase_functions_1.logger.error('OpenAI API key not found in secret manager');
            response.status(500).json({ error: 'API configuration error' });
            return;
        }
        // Initialize OpenAI client
        const openai = new openai_1.default({
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
    }
    catch (error) {
        firebase_functions_1.logger.error('Error in searchVideos function', error);
        response.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Get personalized video recommendations based on user preferences and chat history
 * Now uses enhanced career-focused recommendation system when available
 */
exports.getPersonalizedVideoRecommendations = (0, https_1.onRequest)({
    cors: corsConfig,
    secrets: [openaiApiKeySecret],
    timeoutSeconds: 30
}, async (request, response) => {
    try {
        const origin = request.get('origin') || request.get('referer');
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            setCorsHeaders(response, origin);
            response.status(204).send('');
            return;
        }
        // Set CORS headers for all responses
        setCorsHeaders(response, origin);
        // Only allow POST requests
        if (request.method !== 'POST') {
            response.status(405).json({
                error: 'Method not allowed. Use POST only.'
            });
            return;
        }
        // Validate origin for additional security
        if (origin && !isOriginAllowed(origin)) {
            firebase_functions_1.logger.warn('Unauthorized origin attempted to access getPersonalizedVideoRecommendations', { origin });
            response.status(403).json({ error: 'Origin not allowed' });
            return;
        }
        // Validate request body
        const { userId, limit = 5, includeWatched = false, feedbackType = null, // null, 'liked', 'disliked', 'saved'
        chatSummaryId = null } = request.body;
        if (!userId) {
            response.status(400).json({
                error: 'Missing required field: userId'
            });
            return;
        }
        // Initialize OpenAI client early so it's available for semantic scoring
        const openaiApiKey = openaiApiKeySecret.value();
        if (!openaiApiKey) {
            firebase_functions_1.logger.error('OpenAI API key not found in secret manager');
            response.status(500).json({ error: 'API configuration error' });
            return;
        }
        // Initialize OpenAI client
        const openai = new openai_1.default({
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
            }, {});
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
                // Get MORE videos for better recommendations (increased from 50 to 100)
                const videosSnapshot = await db.collection('videos')
                    .where('analysisStatus', '==', 'completed')
                    .limit(100) // Increased limit for better selection
                    .get();
                if (!videosSnapshot.empty) {
                    // Use ENHANCED scoring with better matching
                    const scoredVideos = videosSnapshot.docs.map((doc) => {
                        const video = { id: doc.id, ...doc.data() };
                        const enhancedScore = calculateEnhancedRelevanceScore(video, userProfile);
                        // Apply feedback adjustments
                        let adjustedScore = enhancedScore;
                        const feedback = videoFeedback[video.id];
                        if (feedback) {
                            if (feedback.liked)
                                adjustedScore *= 1.3;
                            if (feedback.disliked)
                                adjustedScore *= 0.3;
                            if (feedback.saved)
                                adjustedScore *= 1.4;
                            // Filter by feedback type if specified
                            if (feedbackType === 'liked' && !feedback.liked)
                                adjustedScore = 0;
                            if (feedbackType === 'disliked' && !feedback.disliked)
                                adjustedScore = 0;
                            if (feedbackType === 'saved' && !feedback.saved)
                                adjustedScore = 0;
                        }
                        // Exclude watched videos if requested
                        if (!includeWatched && watchedVideoIds.includes(video.id)) {
                            adjustedScore = 0;
                        }
                        // Debug: Log scoring for software development videos
                        const videoData = doc.data();
                        const title = videoData.title?.toLowerCase() || '';
                        if (title.includes('software engineer') || title.includes('software developer')) {
                            firebase_functions_1.logger.info('Software development video enhanced scoring', {
                                videoId: video.id,
                                title: videoData.title,
                                enhancedScore: enhancedScore,
                                adjustedScore: adjustedScore,
                                category: videoData.category,
                                userInterests: userProfile.interests,
                                userGoals: userProfile.careerGoals,
                                hasFeedback: !!feedback,
                                isWatched: watchedVideoIds.includes(video.id),
                                includeWatched: includeWatched
                            });
                        }
                        return {
                            videoId: video.id,
                            score: adjustedScore,
                            originalScore: enhancedScore
                        };
                    });
                    // Sort by score and take top results
                    const filteredVideos = scoredVideos.filter(item => item.score > 0);
                    const topResults = filteredVideos
                        .sort((a, b) => b.score - a.score)
                        .slice(0, limit)
                        .map(item => item.videoId);
                    // Debug: Check if any software development videos made it through filtering
                    const softwareVideosInResults = topResults.filter(videoId => {
                        const videoDoc = videosSnapshot.docs.find(doc => doc.id === videoId);
                        if (!videoDoc)
                            return false;
                        const title = videoDoc.data().title?.toLowerCase() || '';
                        return title.includes('software engineer') || title.includes('software developer');
                    });
                    firebase_functions_1.logger.info('Final recommendation results', {
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
                        firebase_functions_1.logger.info('Generated personalized video recommendations using enhanced scoring', {
                            userId,
                            videoCount: topResults.length,
                            method: 'enhanced-semantic',
                            totalAnalyzed: scoredVideos.length
                        });
                        response.status(200).json({
                            videoIds: topResults,
                            method: 'enhanced-semantic',
                            profileUsed: true,
                            totalAnalyzed: scoredVideos.length
                        });
                        return;
                    }
                }
            }
        }
        catch (enhancedError) {
            firebase_functions_1.logger.error('Enhanced career recommendations failed, falling back to embeddings', enhancedError);
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
        }, {});
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
        firebase_functions_1.logger.info('Combined profile for personalized recommendations (fallback)', {
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
                            if (feedback.liked)
                                adjustedScore *= 1.2; // Boost liked videos
                            if (feedback.disliked)
                                adjustedScore *= 0.5; // Reduce disliked videos
                            if (feedback.saved)
                                adjustedScore *= 1.3; // Boost saved videos
                            // If filtering by feedback type
                            if (feedbackType === 'liked' && !feedback.liked)
                                adjustedScore = 0;
                            if (feedbackType === 'disliked' && !feedback.disliked)
                                adjustedScore = 0;
                            if (feedbackType === 'saved' && !feedback.saved)
                                adjustedScore = 0;
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
                    firebase_functions_1.logger.info('Generated personalized video recommendations using embeddings (fallback)', {
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
            }
            catch (embeddingError) {
                // Log the error but continue with fallback method
                firebase_functions_1.logger.error('Error using embeddings for personalized recommendations, falling back to category matching', embeddingError);
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
        }
        else {
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
                if (!feedback)
                    return false;
                if (feedbackType === 'liked')
                    return feedback.liked;
                if (feedbackType === 'disliked')
                    return feedback.disliked;
                if (feedbackType === 'saved')
                    return feedback.saved;
                return true;
            });
        }
        // Limit to requested number
        videoIds = videoIds.slice(0, limit);
        firebase_functions_1.logger.info('Generated personalized video recommendations using category matching (final fallback)', {
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
    }
    catch (error) {
        firebase_functions_1.logger.error('Error in getPersonalizedVideoRecommendations function', error);
        response.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
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
exports.extractTranscript = (0, https_1.onRequest)({
    cors: true,
    memory: '256MiB',
    timeoutSeconds: 30
}, async (request, response) => {
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
        if (request.method === 'OPTIONS') {
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
        firebase_functions_1.logger.info('🎬 Transcript extraction disabled - using bumpups fallback', {
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
    }
    catch (error) {
        firebase_functions_1.logger.error('❌ Transcript extraction function error:', error);
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
});
/**
 * Process video with transcript extraction and OpenAI analysis
 * This implements the optimized pipeline: YouTube API → Transcript → OpenAI Analysis → Storage
 */
exports.processVideoWithTranscript = (0, https_1.onRequest)({
    cors: corsOrigins,
    memory: '2GiB',
    timeoutSeconds: 600,
    secrets: ['OPENAI_API_KEY', 'BUMPUPS_APIKEY']
}, async (request, response) => {
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
            firebase_functions_1.logger.warn('Unauthorized origin attempted to access processVideoWithTranscript', { origin });
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
        firebase_functions_1.logger.info('Starting video processing with transcript-first pipeline', {
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
            videoData: null
        };
        // Stage 1: Extract transcript from YouTube
        const transcriptStart = Date.now();
        firebase_functions_1.logger.info('Stage 1: Extracting transcript from YouTube');
        const transcriptResult = await extractTranscriptInternal(youtubeVideoId);
        processingResult.stages.transcript.processingTime = Date.now() - transcriptStart;
        let contentForAnalysis = null;
        let contentSource = null;
        if (transcriptResult.success && transcriptResult.fullText) {
            processingResult.stages.transcript.success = true;
            contentForAnalysis = transcriptResult.fullText;
            contentSource = 'transcript';
            firebase_functions_1.logger.info('Transcript extraction successful', {
                segmentCount: transcriptResult.segmentCount
            });
        }
        else {
            processingResult.stages.transcript.success = false;
            firebase_functions_1.logger.warn('Transcript extraction failed, falling back to Bumpups');
            // Stage 2: Bumpups fallback when transcript fails
            const bumpupsStart = Date.now();
            firebase_functions_1.logger.info('Stage 2: Using Bumpups as fallback for content analysis');
            try {
                const bumpupsResult = await callBumpupsAPI(videoUrl, manualCategory || 'general');
                if (bumpupsResult && bumpupsResult.output) {
                    contentForAnalysis = bumpupsResult.output;
                    contentSource = 'bumpups';
                    processingResult.stages.bumpupsAnalysis.success = true;
                    firebase_functions_1.logger.info('Bumpups fallback successful');
                }
                else {
                    firebase_functions_1.logger.error('Bumpups fallback also failed');
                }
            }
            catch (error) {
                firebase_functions_1.logger.error('Bumpups fallback failed:', error);
            }
            processingResult.stages.bumpupsAnalysis.processingTime = Date.now() - bumpupsStart;
        }
        // Stage 3: OpenAI Analysis (on transcript OR Bumpups content)
        const openaiStart = Date.now();
        let openaiAnalysis = null;
        let videoSummary = null;
        if (contentForAnalysis) {
            firebase_functions_1.logger.info(`Stage 3: Performing OpenAI analysis on ${contentSource} content`);
            try {
                const openaiResult = await analyzeTranscriptWithOpenAI(contentForAnalysis, manualCategory || 'general', videoUrl);
                if (openaiResult.success) {
                    openaiAnalysis = openaiResult.analysis;
                    videoSummary = openaiResult.analysis.summary; // Extract summary for video cards
                    processingResult.stages.openaiAnalysis.success = true;
                    // Log detailed OpenAI analysis data
                    firebase_functions_1.logger.info('=== OPENAI ANALYSIS EXTRACTION ===', {
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
                    firebase_functions_1.logger.info('OpenAI analysis completed successfully', {
                        contentSource,
                        summaryLength: videoSummary?.length || 0
                    });
                    // Determine category automatically if not provided manually
                    const determinedCategory = manualCategory || determineAutomaticCategory(openaiAnalysis);
                    firebase_functions_1.logger.info('=== CATEGORY DETERMINATION ===', {
                        manualCategory,
                        determinedCategory,
                        method: manualCategory ? 'manual' : 'automatic'
                    });
                }
            }
            catch (error) {
                firebase_functions_1.logger.error('OpenAI analysis failed:', error);
            }
        }
        else {
            firebase_functions_1.logger.warn('No content available for OpenAI analysis (both transcript and Bumpups failed)');
        }
        processingResult.stages.openaiAnalysis.processingTime = Date.now() - openaiStart;
        // Stage 4: Compile and store results
        const storageStart = Date.now();
        firebase_functions_1.logger.info('Stage 4: Storing processed video data');
        // Determine final category to use (manual if provided, otherwise automatic from analysis)
        let finalCategory = manualCategory || 'business'; // Default fallback
        if (openaiAnalysis) {
            finalCategory = manualCategory || determineAutomaticCategory(openaiAnalysis);
        }
        firebase_functions_1.logger.info('=== FINAL CATEGORY DETERMINATION ===', {
            manualCategory,
            finalCategory,
            hasOpenAIAnalysis: !!openaiAnalysis,
            method: manualCategory ? 'manual' : 'automatic'
        });
        try {
            // First, ensure we have basic YouTube metadata for the video
            firebase_functions_1.logger.info('Fetching basic YouTube metadata for video');
            let basicMetadata = null;
            try {
                basicMetadata = await extractYouTubeBasicMetadata(videoUrl);
                firebase_functions_1.logger.info('Basic YouTube metadata fetched successfully', {
                    title: basicMetadata.title,
                    uploader: basicMetadata.uploader,
                    duration: basicMetadata.duration
                });
            }
            catch (metadataError) {
                firebase_functions_1.logger.warn('Failed to fetch basic YouTube metadata:', metadataError);
            }
            // Create update data structure (using update instead of set to preserve metadata)
            const updateData = {
                // Include basic video metadata if available
                ...(basicMetadata ? {
                    title: basicMetadata.title,
                    thumbnailUrl: basicMetadata.thumbnail,
                    sourceUrl: videoUrl,
                    sourceId: videoId,
                    sourceType: 'youtube',
                    creator: basicMetadata.uploader,
                    duration: basicMetadata.duration,
                    viewCount: 0,
                    curatedDate: admin.firestore.Timestamp.now(),
                } : {}),
                category: finalCategory,
                // Update description with OpenAI summary if available
                description: openaiAnalysis?.summary || undefined,
                // Extract tags from hashtags (remove # symbols)
                tags: openaiAnalysis?.hashtags?.map((tag) => tag.replace('#', '')) || [],
                // Store transcript only if we successfully extracted it
                transcript: transcriptResult.success ? {
                    fullText: transcriptResult.fullText,
                    segments: transcriptResult.segments,
                    segmentCount: transcriptResult.segmentCount,
                    extractedAt: admin.firestore.Timestamp.now()
                } : admin.firestore.FieldValue.delete(),
                // Update lastTranscriptUpdate if we have transcript data
                lastTranscriptUpdate: transcriptResult.success ? admin.firestore.Timestamp.now() : undefined,
                // Store AI analysis and summary for video cards and recommendations
                aiAnalysis: openaiAnalysis ? {
                    summary: videoSummary || openaiAnalysis.summary,
                    fullAnalysis: openaiAnalysis,
                    contentSource: contentSource,
                    confidence: contentSource === 'transcript' ? 0.95 : 0.85,
                    analyzedAt: admin.firestore.Timestamp.now(),
                    analysisType: 'career_exploration'
                } : {
                    summary: null,
                    contentSource: null,
                    confidence: 0,
                    analyzedAt: admin.firestore.Timestamp.now(),
                    analysisType: 'career_exploration',
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
            firebase_functions_1.logger.info('=== PRE-SAVE DEBUG INFO ===', {
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
            firebase_functions_1.logger.info('=== COMPLETE UPDATE DATA ===', {
                videoId,
                updateDataKeys: Object.keys(updateData),
                updateData: JSON.stringify(updateData, null, 2)
            });
            // Check if document exists before updating
            const docRef = admin.firestore().collection('videos').doc(videoId);
            const docSnapshot = await docRef.get();
            firebase_functions_1.logger.info('=== DOCUMENT EXISTS CHECK ===', {
                videoId,
                documentExists: docSnapshot.exists,
                currentData: docSnapshot.exists ? 'Document found' : 'Document not found'
            });
            if (docSnapshot.exists) {
                const currentData = docSnapshot.data();
                firebase_functions_1.logger.info('=== CURRENT DOCUMENT DATA ===', {
                    videoId,
                    currentAnalysisStatus: currentData?.analysisStatus,
                    currentCategory: currentData?.category,
                    currentSkillsLength: currentData?.skillsHighlighted?.length || 0,
                    currentTagsLength: currentData?.tags?.length || 0,
                    hasCurrentAiAnalysis: !!currentData?.aiAnalysis
                });
            }
            // Store in Firestore using set with merge to preserve existing metadata
            firebase_functions_1.logger.info('=== ATTEMPTING FIRESTORE WRITE ===', {
                videoId,
                operation: 'set with merge',
                collection: 'videos',
                documentId: videoId
            });
            try {
                await admin.firestore().collection('videos').doc(videoId).set(updateData, { merge: true });
                firebase_functions_1.logger.info('=== FIRESTORE WRITE SUCCESS ===', {
                    videoId,
                    message: 'Document updated successfully'
                });
            }
            catch (firestoreError) {
                const errorDetails = firestoreError instanceof Error
                    ? {
                        message: firestoreError.message,
                        stack: firestoreError.stack,
                        code: firestoreError.code
                    }
                    : { message: String(firestoreError), stack: null, code: null };
                firebase_functions_1.logger.error('=== FIRESTORE WRITE FAILED ===', {
                    videoId,
                    error: errorDetails.message,
                    errorCode: errorDetails.code,
                    errorStack: errorDetails.stack
                });
                throw firestoreError;
            }
            // Verify the write was successful by reading the document back
            firebase_functions_1.logger.info('=== VERIFYING WRITE SUCCESS ===', {
                videoId,
                message: 'Reading document back to verify changes'
            });
            const verificationDoc = await admin.firestore().collection('videos').doc(videoId).get();
            if (verificationDoc.exists) {
                const verifiedData = verificationDoc.data();
                firebase_functions_1.logger.info('=== POST-WRITE VERIFICATION ===', {
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
                firebase_functions_1.logger.info('Video processing completed successfully', { videoId });
            }
            else {
                firebase_functions_1.logger.error('=== POST-WRITE VERIFICATION FAILED ===', {
                    videoId,
                    error: 'Document not found after write operation'
                });
                // Fallback to update data if verification fails
                processingResult.videoData = updateData;
                processingResult.stages.storage.success = false;
                processingResult.success = false;
                firebase_functions_1.logger.error('Video processing failed during verification', { videoId });
            }
        }
        catch (error) {
            firebase_functions_1.logger.error('Failed to store video data:', error);
        }
        processingResult.stages.storage.processingTime = Date.now() - storageStart;
        // Return comprehensive result
        response.status(200).json(processingResult);
    }
    catch (error) {
        firebase_functions_1.logger.error('Error in processVideoWithTranscript function:', error);
        response.status(500).json({
            error: 'Internal server error during video processing',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * Internal function to extract transcript using Python Firebase Function
 */
async function extractTranscriptInternal(videoId) {
    // Transcript extraction has been disabled due to YouTube's anti-bot measures
    // The pipeline now relies on bumpups service for video analysis
    firebase_functions_1.logger.info('Transcript extraction skipped - using bumpups service for video analysis');
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
async function callBumpupsAPI(videoUrl, category) {
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
    }
    catch (error) {
        firebase_functions_1.logger.error('Bumpups API call failed:', error);
        return null;
    }
}
/**
 * Automatically determine video category based on OpenAI analysis
 */
function determineAutomaticCategory(analysis) {
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
    const categoryScores = {};
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
    const bestCategory = Object.entries(categoryScores).reduce((a, b) => categoryScores[a[0]] > categoryScores[b[0]] ? a : b)[0];
    // Log the scoring for debugging
    firebase_functions_1.logger.info('=== AUTOMATIC CATEGORY DETERMINATION ===', {
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
async function analyzeTranscriptWithOpenAI(transcript, category, videoUrl) {
    try {
        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (!openaiApiKey) {
            throw new Error('OpenAI API key not configured');
        }
        // Initialize OpenAI client with proper configuration
        const openai = new openai_1.default({
            apiKey: openaiApiKey.trim() // Remove any potential whitespace
        });
        // Simple token estimation (1 token ≈ 4 characters for English)
        const estimatedTokens = Math.ceil(transcript.length / 4);
        const maxContextTokens = 120000; // GPT-4o-mini context limit (leave room for response)
        const maxPromptTokens = maxContextTokens - 2000; // Reserve 2000 tokens for response
        let processedTranscript = transcript;
        // If transcript is too long, chunk it intelligently
        if (estimatedTokens > maxPromptTokens) {
            firebase_functions_1.logger.warn(`Transcript too long (${estimatedTokens} tokens), chunking...`);
            // Take first 80% and last 20% to preserve context while staying within limits
            const targetLength = Math.floor(maxPromptTokens * 4 * 0.8); // Convert back to characters
            const firstPart = transcript.substring(0, targetLength * 0.8);
            const lastPart = transcript.substring(transcript.length - targetLength * 0.2);
            processedTranscript = firstPart + "\n\n[...CONTENT TRUNCATED...]\n\n" + lastPart;
            firebase_functions_1.logger.info(`Transcript chunked from ${transcript.length} to ${processedTranscript.length} characters`);
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
            firebase_functions_1.logger.info('OpenAI analysis completed successfully', {
                tokensUsed: completion.usage?.total_tokens || 0,
                confidenceScore: analysis.confidenceScore || 0.8
            });
            return { success: true, analysis };
        }
        catch (parseError) {
            firebase_functions_1.logger.warn('Failed to parse OpenAI JSON response, using structured fallback');
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
    }
    catch (error) {
        firebase_functions_1.logger.error('OpenAI analysis failed:', error);
        return { success: false };
    }
}
/**
 * Generate OpenAI summary from transcript (server-side)
 */
exports.generateTranscriptSummary = (0, https_1.onRequest)({
    cors: true,
    memory: '512MiB',
    timeoutSeconds: 120,
    secrets: [openaiApiKeySecret]
}, async (request, response) => {
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
        if (request.method === 'OPTIONS') {
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
            firebase_functions_1.logger.error('OpenAI API key not configured');
            response.status(500).json({
                success: false,
                error: 'OpenAI API key not configured'
            });
            return;
        }
        const openai = new openai_1.default({
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
        firebase_functions_1.logger.info('Calling OpenAI API for transcript analysis');
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
        firebase_functions_1.logger.info('OpenAI analysis completed', {
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
    }
    catch (error) {
        firebase_functions_1.logger.error('OpenAI analysis error:', error);
        response.status(500).json({
            success: false,
            error: error.message || 'Unknown error',
            errorType: 'SERVER_ERROR'
        });
    }
});
// Old string matching function removed - replaced with OpenAI semantic scoring
/**
 * Enhanced video recommendations using career-focused analysis
 */
exports.getEnhancedCareerRecommendations = (0, https_1.onRequest)({
    cors: corsConfig,
    secrets: [openaiApiKeySecret],
    timeoutSeconds: 30
}, async (request, response) => {
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
            firebase_functions_1.logger.warn('Unauthorized origin attempted to access getEnhancedCareerRecommendations', { origin });
            response.status(403).json({ error: 'Origin not allowed' });
            return;
        }
        // Validate request body
        const { userId, limit = 5, includeWatched = false, feedbackType = null, chatSummaryId = null } = request.body;
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
        }, {});
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
        firebase_functions_1.logger.info('Enhanced career recommendations user profile', {
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
            firebase_functions_1.logger.error('OpenAI API key not found in secret manager');
            response.status(500).json({ error: 'API configuration error' });
            return;
        }
        const openai = new openai_1.default({
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
        }, {});
        firebase_functions_1.logger.info('Enhanced career recommendations - video categories found', {
            totalVideos: videosSnapshot.docs.length,
            categories: videoCategories,
            hasTechnology: videoCategories.technology || 0,
            hasBusinessSoftware: videoCategories.business || 0
        });
        if (videosSnapshot.empty) {
            firebase_functions_1.logger.warn('No analyzed videos found for career recommendations');
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
                if (feedback.liked)
                    adjustedScore *= 1.3;
                if (feedback.disliked)
                    adjustedScore *= 0.3;
                if (feedback.saved)
                    adjustedScore *= 1.4;
                // Filter by feedback type if specified
                if (feedbackType === 'liked' && !feedback.liked)
                    adjustedScore = 0;
                if (feedbackType === 'disliked' && !feedback.disliked)
                    adjustedScore = 0;
                if (feedbackType === 'saved' && !feedback.saved)
                    adjustedScore = 0;
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
        firebase_functions_1.logger.info('Enhanced career recommendations generated', {
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
    }
    catch (error) {
        firebase_functions_1.logger.error('Error in getEnhancedCareerRecommendations function', error);
        response.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Debug function to check database state
exports.debugVideoDatabase = (0, https_1.onRequest)({ cors: corsConfig }, async (request, response) => {
    try {
        firebase_functions_1.logger.info('Debug: Checking video database state...');
        // Get all videos
        const allVideos = await db.collection('videos').get();
        // Count by analysis status
        const statusCounts = {};
        const softwareVideos = [];
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
        firebase_functions_1.logger.info('Debug video database results', response_data);
        response.json(response_data);
    }
    catch (error) {
        firebase_functions_1.logger.error('Debug video database error', error);
        response.status(500).json({ error: 'Failed to debug video database' });
    }
});
/**
 * Calculate relevance score efficiently without OpenAI calls
 */
function calculateEnhancedRelevanceScore(video, userProfile) {
    let score = 0;
    // Extract video data
    const videoAnalysis = video.aiAnalysis?.fullAnalysis || video.aiAnalysis || {};
    const careerPathways = videoAnalysis.careerPathways || video.careerPathways || [];
    const skillsHighlighted = videoAnalysis.skillsHighlighted || video.skillsHighlighted || [];
    const keyThemes = videoAnalysis.keyThemes || [];
    const hashtags = videoAnalysis.hashtags || video.hashtags || [];
    const title = (video.title || '').toLowerCase();
    const category = (video.category || '').toLowerCase();
    const description = (video.description || '').toLowerCase();
    // Normalize user inputs
    const userInterests = userProfile.interests.map(i => i.toLowerCase());
    const userGoals = userProfile.careerGoals.map(g => g.toLowerCase());
    const userSkills = userProfile.skills.map(s => s.toLowerCase());
    // Enhanced category matching (25 points max)
    const categoryMappings = {
        'technology': ['software', 'programming', 'coding', 'development', 'tech', 'computer', 'digital', 'ai', 'machine learning', 'data science'],
        'healthcare': ['medical', 'health', 'nursing', 'doctor', 'medicine', 'wellness', 'therapy', 'care'],
        'creative': ['art', 'design', 'music', 'film', 'video', 'content', 'media', 'creative', 'animation'],
        'business': ['business', 'management', 'marketing', 'sales', 'entrepreneurship', 'startup', 'leadership'],
        'finance': ['finance', 'accounting', 'banking', 'investment', 'money', 'financial', 'economics'],
        'education': ['teaching', 'education', 'training', 'learning', 'instructor', 'coach', 'tutor'],
        'trades': ['construction', 'culinary', 'manufacturing', 'electrical', 'plumbing', 'mechanic', 'trades'],
        'sustainability': ['environment', 'sustainability', 'green', 'renewable', 'climate', 'conservation']
    };
    // Check if user interests match video category (direct or through mappings)
    for (const interest of userInterests) {
        if (category.includes(interest) || interest.includes(category)) {
            score += 25;
            break;
        }
        // Check category mappings
        for (const [cat, keywords] of Object.entries(categoryMappings)) {
            if (category === cat && keywords.some(keyword => interest.includes(keyword) || keyword.includes(interest))) {
                score += 20;
                break;
            }
        }
    }
    // Enhanced title and description matching (35 points max)
    const allUserTerms = [...userInterests, ...userGoals, ...userSkills];
    let keywordScore = 0;
    for (const term of allUserTerms) {
        // Exact matches get higher scores
        if (title.includes(term))
            keywordScore += 8;
        if (description.includes(term))
            keywordScore += 5;
        // Partial matches for compound terms
        const termWords = term.split(/\s+/);
        if (termWords.length > 1) {
            for (const word of termWords) {
                if (word.length > 3) { // Only check meaningful words
                    if (title.includes(word))
                        keywordScore += 3;
                    if (description.includes(word))
                        keywordScore += 2;
                }
            }
        }
    }
    score += Math.min(35, keywordScore);
    // Career pathways matching (20 points max)
    const matchingPathways = careerPathways.filter((pathway) => userGoals.some(goal => goal.includes(pathway.toLowerCase()) ||
        pathway.toLowerCase().includes(goal) ||
        // Check for word-level matches
        goal.split(/\s+/).some(goalWord => pathway.toLowerCase().includes(goalWord) && goalWord.length > 3)));
    score += Math.min(20, matchingPathways.length * 7);
    // Skills matching (15 points max)
    const matchingSkills = skillsHighlighted.filter((skill) => userSkills.some(userSkill => userSkill.includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(userSkill) ||
        // Check for word-level matches
        userSkill.split(/\s+/).some(skillWord => skill.toLowerCase().includes(skillWord) && skillWord.length > 3)));
    score += Math.min(15, matchingSkills.length * 4);
    // Hashtags and themes matching (5 points max)
    const allTags = [...hashtags, ...keyThemes].map(tag => tag.toLowerCase());
    let tagScore = 0;
    for (const term of allUserTerms) {
        if (allTags.some(tag => tag.includes(term) || term.includes(tag))) {
            tagScore += 1;
        }
    }
    score += Math.min(5, tagScore);
    // Base popularity score (0-5 points)
    const viewCount = video.viewCount || 0;
    score += Math.min(5, viewCount / 1000);
    return Math.min(100, score); // Cap at 100
}
/**
 * OpenAI-powered semantic scoring for video relevance (EXPENSIVE - USE SPARINGLY)
 * Uses GPT to understand the nuanced relationship between user goals and video content
 */
async function calculateSemanticRelevanceScore(video, userProfile, openai) {
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
            careerPathways: careerPathways.slice(0, 5),
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
            model: 'gpt-4o-mini',
            messages: [
                { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            max_tokens: 10 // We only need a number
        });
        const scoreText = completion.choices[0]?.message?.content?.trim() || '0';
        const score = parseInt(scoreText, 10);
        // Validate score
        if (isNaN(score) || score < 0 || score > 100) {
            firebase_functions_1.logger.warn('Invalid semantic score received', {
                videoId: video.id,
                scoreText,
                parsedScore: score
            });
            return 0;
        }
        // Debug log for software development videos
        const title = video.title?.toLowerCase() || '';
        if (title.includes('software engineer') || title.includes('software developer')) {
            firebase_functions_1.logger.info('Semantic score for software development video', {
                videoId: video.id,
                title: video.title,
                semanticScore: score,
                userGoals: userContext.careerGoals
            });
        }
        return score;
    }
    catch (error) {
        firebase_functions_1.logger.error('Semantic scoring error', {
            videoId: video.id,
            error: error.message
        });
        return 0; // Fall back to 0 if OpenAI call fails
    }
}
/**
 * Generate comprehensive career pathways with training, volunteering, and funding information
 */
exports.generateCareerPathways = (0, https_1.onRequest)({
    cors: corsConfig,
    secrets: [openaiApiKeySecret],
    memory: "512MiB",
    timeoutSeconds: 120,
}, async (request, response) => {
    try {
        const origin = request.get('origin') || request.get('referer');
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            setCorsHeaders(response, origin);
            response.status(204).send('');
            return;
        }
        // Set CORS headers for all responses
        setCorsHeaders(response, origin);
        if (request.method !== 'POST') {
            response.status(405).send('Method Not Allowed');
            return;
        }
        if (origin && !isOriginAllowed(origin)) {
            firebase_functions_1.logger.warn('Unauthorized origin attempted to access generateCareerPathways', { origin });
            response.status(403).send('Forbidden: Unauthorized origin');
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
        firebase_functions_1.logger.info('Generating career pathways for user profile', {
            interests: userProfile.interests?.length || 0,
            skills: userProfile.skills?.length || 0,
            goals: userProfile.goals?.length || 0,
            careerStage: userProfile.careerStage
        });
        // Check if OpenAI API key secret is available
        const openaiApiKey = openaiApiKeySecret.value();
        if (!openaiApiKey) {
            firebase_functions_1.logger.error('OpenAI API key secret not found');
            response.status(500).json({
                success: false,
                error: 'OpenAI API key not configured',
                message: 'Server configuration error'
            });
            return;
        }
        const openai = new openai_1.default({
            apiKey: openaiApiKey,
        });
        const systemPrompt = `You are a UK career guidance specialist with comprehensive knowledge of training providers, volunteering opportunities, and funding schemes across the UK. Generate detailed, actionable career guidance with real UK-specific resources.

CRITICAL: When generating training courses and links:
- For university courses, use actual UK university URLs (e.g., Imperial College London, University of Edinburgh, UCL, etc.)
- For professional training, use recognized UK providers (Coursera UK, FutureLearn, Institute of Engineering and Technology, etc.)
- For apprenticeships, use gov.uk apprenticeship URLs
- NEVER link different subjects to unrelated course pages
- If you're unsure of exact URLs, use reputable search patterns like "find-postgraduate-study.ac.uk" or "prospects.ac.uk"`;
        const userPrompt = `Generate comprehensive UK career guidance for a user with this profile:

INTERESTS: ${userProfile.interests?.join(', ') || 'Not specified'}
SKILLS: ${userProfile.skills?.join(', ') || 'Not specified'}  
GOALS: ${userProfile.goals?.join(', ') || 'Not specified'}
CAREER STAGE: ${userProfile.careerStage || 'exploring'}

Provide a JSON response with this exact structure - be specific and actionable:

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
      "title": "Specific course name (e.g., 'MSc Artificial Intelligence - University of Edinburgh')",
      "provider": "Actual UK training provider or university",
      "duration": "Course length",
      "cost": "Course cost with £ symbol or 'Free' or 'Funded'",
      "location": "UK location or 'Online'",
      "description": "Brief course description and what it leads to",
      "link": "Only provide links if you're confident they're correct UK URLs, otherwise use 'https://find-postgraduate-study.ac.uk' for university courses or 'https://www.prospects.ac.uk' for general career guidance"
    }
  ],
  "volunteering": [
    {
      "title": "Specific volunteer role title",
      "organization": "Real UK charity or organization (e.g., Age UK, British Red Cross, etc.)",
      "timeCommitment": "Weekly time commitment",
      "location": "UK location or 'Various locations'", 
      "description": "Role description and skills gained",
      "benefits": "Specific skills and experience gained",
      "link": "Organization's main website or volunteer portal if known, otherwise 'https://do-it.org' for volunteer search"
    }
  ],
  "funding": [
    {
      "title": "Specific funding scheme name",
      "provider": "Government department or funding body",
      "amount": "Funding amount with £ symbol",
      "eligibility": "Who can apply - be specific",
      "description": "What the funding covers",
      "link": "Gov.uk URL for government schemes or organization website"
    }
  ],
  "resources": [
    {
      "title": "Specific resource name",
      "organization": "UK organization/website",
      "description": "What this resource provides",
      "link": "Reputable UK career website or industry association"
    }
  ]
}

EXPANDED LEARNING PATHS: Include diverse pathways beyond formal education:
- University degrees and postgraduate courses
- Professional certifications and industry qualifications  
- Online courses and MOOCs
- Apprenticeships and traineeships
- Self-directed learning resources
- Industry bootcamps and intensive programs
- Professional association training
- Entrepreneurship and startup programs
- Entry-level job opportunities with training
- Volunteer-to-paid pathways

Focus on real UK opportunities with actionable next steps.`;
        firebase_functions_1.logger.info('Making OpenAI Responses API request with web search', {
            model: 'gpt-4o',
            messageLength: userPrompt.length,
            webSearchEnabled: true
        });
        const completion = await openai.responses.create({
            model: "gpt-4o",
            input: [
                { role: "system", content: systemPrompt + "\n\nIMPORTANT: Respond with valid JSON only." },
                { role: "user", content: userPrompt }
            ],
            tools: [
                {
                    "type": "web_search_preview"
                }
            ]
        });
        const responseText = completion.output_text;
        if (!responseText) {
            firebase_functions_1.logger.error('No response content from OpenAI');
            throw new Error('No response from OpenAI');
        }
        firebase_functions_1.logger.info('OpenAI Responses API response received', {
            responseLength: responseText.length,
            hasWebSearchResults: completion.output?.some(item => item.type === 'web_search_call') || false
        });
        let careerGuidance;
        try {
            careerGuidance = JSON.parse(responseText);
            // URL validation function
            const isValidUrl = (url) => {
                if (!url || typeof url !== 'string')
                    return false;
                try {
                    const urlObj = new URL(url);
                    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
                }
                catch {
                    return false;
                }
            };
            // Validate and clean URLs in the response
            const validateAndCleanLinks = (items) => {
                return items?.map(item => {
                    if (item.link) {
                        if (isValidUrl(item.link)) {
                            return item;
                        }
                        else {
                            firebase_functions_1.logger.warn('Invalid URL detected and removed', {
                                originalUrl: item.link,
                                itemTitle: item.title
                            });
                            // Remove the invalid link
                            const { link, ...itemWithoutLink } = item;
                            return itemWithoutLink;
                        }
                    }
                    return item;
                }) || [];
            };
            // Apply validation to all sections with links
            if (careerGuidance.training) {
                careerGuidance.training = validateAndCleanLinks(careerGuidance.training);
            }
            if (careerGuidance.volunteering) {
                careerGuidance.volunteering = validateAndCleanLinks(careerGuidance.volunteering);
            }
            if (careerGuidance.funding) {
                careerGuidance.funding = validateAndCleanLinks(careerGuidance.funding);
            }
            if (careerGuidance.resources) {
                careerGuidance.resources = validateAndCleanLinks(careerGuidance.resources);
            }
        }
        catch (parseError) {
            firebase_functions_1.logger.error('Failed to parse OpenAI response as JSON', {
                responseText: responseText.substring(0, 500) + '...',
                parseError: parseError instanceof Error ? parseError.message : String(parseError)
            });
            // Provide fallback structure
            careerGuidance = {
                primaryPathway: {
                    title: "Career Exploration",
                    description: "Explore various career paths based on your interests and skills",
                    timeline: "3-6 months",
                    requirements: ["Research skills", "Networking"],
                    progression: ["Self-assessment", "Research careers", "Gain experience", "Apply for roles"]
                },
                training: [{
                        title: "Career Development Course",
                        provider: "FutureLearn",
                        duration: "4 weeks",
                        cost: "Free",
                        location: "Online",
                        description: "Develop essential career planning skills",
                        link: "https://www.futurelearn.com"
                    }],
                volunteering: [{
                        title: "Community Volunteer",
                        organization: "Local charity",
                        timeCommitment: "2-4 hours per week",
                        location: "Various locations",
                        description: "Gain valuable experience while helping the community",
                        benefits: "Communication, teamwork, leadership skills",
                        link: "https://do-it.org"
                    }],
                funding: [{
                        title: "Career Development Loan",
                        provider: "Gov.uk",
                        amount: "£300-£10,000",
                        eligibility: "Adults 18+ seeking career development",
                        description: "Government loan for career training",
                        link: "https://www.gov.uk/career-development-loans"
                    }],
                resources: [{
                        title: "National Careers Service",
                        organization: "Gov.uk",
                        description: "Free career guidance and job search support",
                        link: "https://nationalcareers.service.gov.uk"
                    }]
            };
        }
        firebase_functions_1.logger.info('Successfully generated career pathways', {
            trainingCount: careerGuidance.training?.length || 0,
            volunteeringCount: careerGuidance.volunteering?.length || 0,
            fundingCount: careerGuidance.funding?.length || 0,
            resourcesCount: careerGuidance.resources?.length || 0
        });
        response.json({
            success: true,
            data: careerGuidance,
            generatedAt: new Date().toISOString()
        });
    }
    catch (error) {
        firebase_functions_1.logger.error('Error in generateCareerPathways function', {
            error: error.message,
            stack: error.stack,
            code: error.code,
            type: error.constructor.name
        });
        response.status(500).json({
            success: false,
            error: 'Failed to generate career pathways',
            message: error.message,
            details: {
                type: error.constructor.name,
                code: error.code || 'UNKNOWN_ERROR'
            }
        });
    }
});
/**
 * Web search function for career research
 * Returns real UK training and salary data for career card generation
 */
exports.searchCareerData = (0, https_1.onRequest)({
    cors: corsConfig,
    secrets: [openaiApiKeySecret]
}, async (request, response) => {
    try {
        // Validate request method
        if (request.method !== 'POST') {
            response.status(405).json({
                success: false,
                error: 'Method not allowed. Use POST.'
            });
            return;
        }
        // Extract parameters
        const { searchTerm, searchType } = request.body;
        if (!searchTerm || typeof searchTerm !== 'string') {
            response.status(400).json({
                success: false,
                error: 'searchTerm is required and must be a string'
            });
            return;
        }
        const validSearchTypes = ['training', 'salary', 'general'];
        if (searchType && !validSearchTypes.includes(searchType)) {
            response.status(400).json({
                success: false,
                error: `searchType must be one of: ${validSearchTypes.join(', ')}`
            });
            return;
        }
        firebase_functions_1.logger.info('Career data search request', {
            searchTerm,
            searchType: searchType || 'general'
        });
        // TODO: Implement actual web search
        // This could use services like:
        // - SerpAPI for Google search results
        // - ScaleSerp for search API
        // - Custom web scraping for specific UK education sites
        // For now, return a structured response indicating research is needed
        const searchResults = await performCareerDataSearch(searchTerm, searchType);
        response.status(200).json({
            success: true,
            searchTerm,
            searchType: searchType || 'general',
            results: searchResults,
            timestamp: new Date().toISOString(),
            note: 'This is a placeholder implementation. Real web search should be integrated.'
        });
    }
    catch (error) {
        firebase_functions_1.logger.error('Error in searchCareerData function', {
            error: error.message,
            stack: error.stack
        });
        response.status(500).json({
            success: false,
            error: 'Failed to search career data',
            message: error.message
        });
    }
});
/**
 * Text chat (OpenAI Responses) - START (no-op placeholder)
 */
exports.textChatStart = (0, https_1.onRequest)({
    cors: corsConfig,
    secrets: [openaiApiKeySecret]
}, async (request, response) => {
    try {
        if (request.method !== 'POST') {
            response.status(405).json({ error: 'Method not allowed. Use POST only.' });
            return;
        }
        const origin = request.headers.origin;
        if (!origin || !isOriginAllowed(origin)) {
            response.status(403).json({ error: 'Origin not allowed' });
            return;
        }
        const { sessionId, personaContext } = request.body || {};
        console.log('🟢 [TEXT START] OpenAI text session start:', {
            sessionId: sessionId || 'none',
            personaContextPreview: typeof personaContext === 'string' ? personaContext.substring(0, 160) + '...' : 'none',
            personaContextLength: typeof personaContext === 'string' ? personaContext.length : 0
        });
        response.status(200).json({ ok: true });
    }
    catch (error) {
        response.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * Text chat (OpenAI Responses) - MESSAGE
 * Body: { sessionId?: string, text: string, personaContext?: string, conversation_history?: Array<{role:'user'|'assistant', content:string}> }
 * Returns: { reply: string }
 */
exports.textChatMessage = (0, https_1.onRequest)({
    cors: corsConfig,
    secrets: [openaiApiKeySecret]
}, async (request, response) => {
    try {
        if (request.method !== 'POST') {
            response.status(405).json({ error: 'Method not allowed. Use POST only.' });
            return;
        }
        const origin = request.headers.origin;
        if (!origin || !isOriginAllowed(origin)) {
            response.status(403).json({ error: 'Origin not allowed' });
            return;
        }
        const { sessionId, text, personaContext, conversation_history } = request.body || {};
        console.log('💬 [TEXT MSG] Incoming message:', {
            sessionId: sessionId || 'none',
            textPreview: typeof text === 'string' ? text.substring(0, 120) + '...' : 'invalid',
            personaContextPresent: !!personaContext,
            personaContextLength: typeof personaContext === 'string' ? personaContext.length : 0,
            historyCount: Array.isArray(conversation_history) ? conversation_history.length : 0
        });
        if (!text || typeof text !== 'string') {
            response.status(400).json({ error: 'Missing text' });
            return;
        }
        const apiKey = openaiApiKeySecret.value();
        if (!apiKey) {
            response.status(500).json({ error: 'API configuration error' });
            return;
        }
        const openai = new openai_1.default({ apiKey });
        const systemBlock = personaContext ? [{ role: 'system', content: personaContext }] : [];
        const priorTurns = Array.isArray(conversation_history)
            ? conversation_history.filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string')
            : [];
        let trimmedTurns = priorTurns;
        if (priorTurns.length > 0) {
            const last = priorTurns[priorTurns.length - 1];
            if (last.role === 'user' && typeof text === 'string' && last.content === text) {
                trimmedTurns = priorTurns.slice(0, -1);
            }
        }
        const completion = await openai.responses.create({
            model: 'gpt-5',
            input: [
                ...systemBlock,
                ...trimmedTurns,
                { role: 'user', content: text }
            ],
        });
        const reply = completion.output_text || '';
        console.log('🟣 [TEXT MSG] OpenAI reply:', {
            replyPreview: reply.substring(0, 160) + '...'
        });
        response.status(200).json({ reply });
    }
    catch (error) {
        console.error('🔴 [TEXT MSG] Error:', error);
        response.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
/**
 * Text chat (OpenAI Responses) - END (no-op)
 */
exports.textChatEnd = (0, https_1.onRequest)({
    cors: corsConfig
}, async (request, response) => {
    try {
        response.status(200).json({ ok: true });
    }
    catch (error) {
        response.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * Perform career data search (placeholder implementation)
 */
async function performCareerDataSearch(searchTerm, searchType) {
    // This is where actual web search would be implemented
    // For now, return guidance on where to find real information
    const baseGuidance = {
        searchTerm,
        searchType,
        guidance: `For current information about "${searchTerm}", please verify with official sources:`,
        verificationSources: []
    };
    if (searchType === 'training' || !searchType) {
        baseGuidance.verificationSources.push('Find an Apprenticeship - gov.uk/apply-apprenticeship', 'UCAS for university courses - ucas.com', 'Further Education courses - gov.uk/further-education-courses', 'Professional bodies and trade associations', 'Major training providers (City & Guilds, Pearson)', 'Local colleges and universities');
    }
    if (searchType === 'salary' || !searchType) {
        baseGuidance.verificationSources.push('National Careers Service - nationalcareersservice.direct.gov.uk', 'ONS Average Weekly Earnings - ons.gov.uk', 'PayScale UK salary data - payscale.com/research/UK', 'Indeed UK salary insights - indeed.co.uk/salaries', 'Glassdoor UK salaries - glassdoor.co.uk/Salaries', 'Professional association salary surveys');
    }
    return {
        ...baseGuidance,
        implementationNote: 'To enable real-time search, integrate with search APIs like SerpAPI or implement web scraping for specific UK education and career sites.',
        dataFreshness: 'Information should be verified as of ' + new Date().toLocaleDateString()
    };
}
//# sourceMappingURL=index.js.map