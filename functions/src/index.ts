import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as https from "https";

admin.initializeApp();
const db = admin.firestore();

// Configure runtime options for the function
const runtimeOpts: functions.RuntimeOptions = {
  timeoutSeconds: 300,  // 5 minutes
  memory: "1GB",
};

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
export const enrichVideoMetadata = functions
  .runWith(runtimeOpts)
  .firestore
  .document("videos/{videoId}")
  .onWrite(async (change, context) => {
    // If the document was deleted, do nothing
    if (!change.after.exists) {
      return null;
    }

    const videoData = change.after.data() as FirebaseFirestore.DocumentData;
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
      await db.collection("videos").doc(videoId).update({
        metadataStatus: "failed",
        enrichmentFailed: true,
        enrichmentError: "No source URL provided",
      });
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

      await db.collection("videos").doc(videoId).update(updateData);

      console.log(`[DEBUG] Successfully updated video ${videoId} with ${metadata.enrichmentFailed ? "failed" : "enriched"} metadata`);
      return null;
    } catch (error) {
      console.error(`[ERROR] Error enriching metadata for video ${videoId}:`, error);
      await db.collection("videos").doc(videoId).update({
        metadataStatus: "failed",
        enrichmentFailed: true,
        enrichmentError: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    }
  }); 