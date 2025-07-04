import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as youtubeDl from "youtube-dl-exec";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
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
  subtitles?: Record<string, unknown>;
  categories?: string[];
  view_count?: number;
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
 * Get a valid YouTube thumbnail URL
 * @param {string} videoId - The YouTube video ID
 * @return {Promise<string>} A valid thumbnail URL or empty string
 */
async function getValidYouTubeThumbnail(videoId: string): Promise<string> {
  // Try different thumbnail qualities in order
  const thumbnailFormats = [
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/default.jpg`
  ];

  for (const url of thumbnailFormats) {
    if (await isUrlAccessible(url)) {
      return url;
    }
  }
  
  // Default to hqdefault which almost always exists
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Extracts metadata from a video URL using yt-dlp
 * @param {string} url - The video URL to extract metadata from
 * @return {Promise<VideoMetadata>} The extracted metadata
 */
async function extractVideoMetadata(url: string): Promise<VideoMetadata> {
  try {
    console.log(`Starting metadata extraction for URL: ${url}`);
    
    // Create a temporary directory for yt-dlp cache
    const tempDir = path.join(os.tmpdir(), 'yt-dlp-cache');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Extract metadata without downloading the video
    const options = {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      preferFreeFormats: true,
      youtubeSkipDashManifest: true,
      skipDownload: true,
      cacheDir: tempDir,
      // Add user agent to avoid being blocked
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    };

    console.log(`Executing yt-dlp with options:`, JSON.stringify(options));
    const output = await youtubeDl.default(url, options);
    console.log(`yt-dlp extraction successful for ${url}`);

    // Get video ID for YouTube videos
    let videoId = "";
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      videoId = extractYouTubeId(url) || "";
    }

    // Get a valid thumbnail URL for YouTube videos
    let thumbnailUrl = output.thumbnail || "";
    if (videoId) {
      thumbnailUrl = await getValidYouTubeThumbnail(videoId);
    }

    // Extract the relevant metadata
    return {
      title: output.title || "",
      description: output.description || "",
      duration: output.duration || 0,
      webpage_url: output.webpage_url || url,
      thumbnail: thumbnailUrl,
      uploader: output.uploader || "",
      upload_date: output.upload_date,
      tags: output.tags || [],
      subtitles: output.subtitles || {},
      categories: output.categories || [],
      view_count: output.view_count,
    };
  } catch (error) {
    console.error(`Error extracting metadata for ${url}:`, error);
    
    // Try to extract YouTube ID and get thumbnail directly if yt-dlp fails
    try {
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        const videoId = extractYouTubeId(url);
        if (videoId) {
          const thumbnailUrl = await getValidYouTubeThumbnail(videoId);
          return {
            title: "YouTube Video",
            description: "Failed to extract full metadata. Please edit manually.",
            duration: 0,
            webpage_url: url,
            thumbnail: thumbnailUrl,
            uploader: "Unknown",
            enrichmentFailed: true,
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }
    } catch (fallbackError) {
      console.error("Fallback extraction failed:", fallbackError);
    }
    
    return {
      title: "",
      description: "",
      duration: 0,
      webpage_url: url,
      thumbnail: "",
      uploader: "",
      enrichmentFailed: true,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    };
  }
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
 * Cloud function that extracts metadata from a video URL and saves it to Firestore
 */
export const enrichVideoMetadata = functions
  .runWith(runtimeOpts)
  .firestore
  .document("videos/{videoId}")
  .onCreate(async (snapshot, context) => {
    const videoData = snapshot.data();
    const videoId = context.params.videoId;
    
    // Skip if no URL is provided
    if (!videoData.sourceUrl) {
      console.log(`No source URL provided for video: ${videoId}`);
      
      // Update the document to indicate the enrichment failed
      await db.collection("videos").doc(videoId).update({
        metadataStatus: "failed",
        enrichmentFailed: true,
        enrichmentError: "No source URL provided"
      });
      
      return null;
    }

    try {
      console.log(`Extracting metadata for video ${videoId} from URL: ${videoData.sourceUrl}`);
      
      // First, update the status to indicate processing has started
      await db.collection("videos").doc(videoId).update({
        metadataStatus: "processing"
      });
      
      // Extract metadata
      const metadata = await extractVideoMetadata(videoData.sourceUrl);
      
      // Determine source type and ID if not already set
      const sourceType = videoData.sourceType || determineSourceType(videoData.sourceUrl);
      let sourceId = videoData.sourceId;
      
      if (!sourceId && sourceType === "youtube") {
        sourceId = extractYouTubeId(videoData.sourceUrl) || "";
      }

      // Prepare data to update in Firestore
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

      // If metadata extraction failed, add the error info
      if (metadata.enrichmentFailed) {
        updateData.enrichmentFailed = true;
        updateData.enrichmentError = metadata.errorMessage;
      }

      // Add publication date if available
      if (metadata.upload_date) {
        // Convert YYYYMMDD format to ISO string
        const year = metadata.upload_date.substring(0, 4);
        const month = metadata.upload_date.substring(4, 6);
        const day = metadata.upload_date.substring(6, 8);
        updateData.publicationDate = `${year}-${month}-${day}`;
      }

      // Add tags if available and not already set
      if (metadata.tags && metadata.tags.length > 0 && (!videoData.tags || videoData.tags.length === 0)) {
        updateData.tags = metadata.tags.slice(0, 20); // Limit to 20 tags
      }

      // Update the video document with the extracted metadata
      await db.collection("videos").doc(videoId).update(updateData);
      
      console.log(`Successfully enriched metadata for video ${videoId}`);
      return null;
    } catch (error) {
      console.error(`Error enriching metadata for video ${videoId}:`, error);
      
      // Update the document with the error information
      await db.collection("videos").doc(videoId).update({
        metadataStatus: "failed",
        enrichmentFailed: true,
        enrichmentError: error instanceof Error ? error.message : "Unknown error",
      });
      
      return null;
    }
  }); 