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
exports.getPersonalizedVideoRecommendations = exports.searchVideos = exports.generateEmbedding = exports.getVideoRecommendations = exports.generateDetailedChatSummary = exports.generateChatSummary = exports.sendChatMessage = exports.createChatThread = exports.healthCheck = exports.bumpupsProxy = exports.enrichVideoMetadata = void 0;
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
// CORS configuration for functions v2
const corsConfig = corsOrigins;
// Helper function to validate origin against allowed list
const isOriginAllowed = (origin) => {
    if (!origin)
        return false;
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
            firebase_functions_1.logger.error('OpenAI API key not found in secret manager');
            response.status(500).json({ error: 'API configuration error' });
            return;
        }
        // Initialize OpenAI client
        const openai = new openai_1.default({
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
        // Validate origin for additional security
        const origin = request.headers.origin;
        if (!origin || !isOriginAllowed(origin)) {
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
 */
exports.getPersonalizedVideoRecommendations = (0, https_1.onRequest)({
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
        // Get user feedback (likes, dislikes, saves)
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
        // Get chat summary if provided
        let chatSummary = null;
        if (chatSummaryId) {
            const chatSummarySnapshot = await db.collection('chatSummaries').doc(chatSummaryId).get();
            if (chatSummarySnapshot.exists) {
                chatSummary = chatSummarySnapshot.data();
            }
        }
        // If no chat summary provided, get the most recent one
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
        firebase_functions_1.logger.info('Combined profile for personalized recommendations', {
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
                    firebase_functions_1.logger.info('Generated personalized video recommendations using embeddings', {
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
        // Fallback to category matching
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
        firebase_functions_1.logger.info('Generated personalized video recommendations using category matching', {
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
//# sourceMappingURL=index.js.map