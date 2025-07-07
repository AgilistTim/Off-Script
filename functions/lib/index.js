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
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = exports.bumpupsProxy = exports.enrichVideoMetadata = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const https = __importStar(require("https"));
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
admin.initializeApp();
const db = admin.firestore();
// Configure runtime options for the function
const runtimeOpts = {
    timeoutSeconds: 300,
    memory: "1GB",
};
// CORS configuration for web clients - simplified for Firebase Functions v2
const corsOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://off-script.onrender.com'
];
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
exports.enrichVideoMetadata = functions
    .runWith(runtimeOpts)
    .firestore
    .document("videos/{videoId}")
    .onWrite(async (change, context) => {
    // If the document was deleted, do nothing
    if (!change.after.exists) {
        return null;
    }
    const videoData = change.after.data();
    const videoId = context.params.videoId;
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
    cors: true,
    memory: '512MiB',
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
        // Validate request body
        const { url, prompt, model = 'bump-1.0', language = 'en', output_format = 'text' } = request.body;
        if (!url || !prompt) {
            response.status(400).json({
                error: 'Missing required fields: url and prompt'
            });
            return;
        }
        // Hardcode API key temporarily to fix immediate issues
        const bumpupsApiKey = 'bumpups-PqWL416AfWdSgJAWr6oFd3Yj6Ff2Vqy-zxvc_2p1qkGX56FunH-yea-Gn334G3fqXJs6Gh3XuL4dMZG_W6FNL0ffvHNxc6q1UlnMrg5evJM8S9DU7Yye-dv9TqzhzNH2b2ydqolEO1GUhaPUuBfgJtM_jeqCo_FcJw';
        firebase_functions_1.logger.info('Making Bumpups API request', { url, promptLength: prompt.length });
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
//# sourceMappingURL=index.js.map