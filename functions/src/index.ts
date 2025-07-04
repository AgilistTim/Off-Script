import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as youtubeDl from "youtube-dl-exec";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import * as https from "https";
import * as childProcess from "child_process";
import { promisify } from "util";

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
 * Check if yt-dlp is installed and working properly
 * @return {Promise<boolean>} Whether yt-dlp is working
 */
async function checkYtDlpInstallation(): Promise<{isInstalled: boolean; version: string; error?: string}> {
  try {
    console.log("[DEBUG] Checking yt-dlp installation...");
    
    // Try to get yt-dlp version
    const exec = promisify(childProcess.exec);
    const { stdout } = await exec("yt-dlp --version");
    const version = stdout.trim();
    
    console.log(`[DEBUG] yt-dlp is installed, version: ${version}`);
    return { isInstalled: true, version };
  } catch (error) {
    console.error("[ERROR] yt-dlp is not installed or not working:", error);
    return { 
      isInstalled: false, 
      version: "", 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
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
 * Download and install yt-dlp binary
 * @return {Promise<boolean>} Whether the installation was successful
 */
async function installYtDlp(): Promise<{success: boolean; path: string; error?: string}> {
  try {
    console.log("[DEBUG] Installing yt-dlp...");
    
    // Create a directory for the binary
    const binDir = path.join(os.tmpdir(), 'bin');
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }
    
    // Path to save the binary
    const ytDlpPath = path.join(binDir, 'yt-dlp');
    
    // Download the binary
    const downloadUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";
    console.log(`[DEBUG] Downloading yt-dlp from ${downloadUrl} to ${ytDlpPath}`);
    
    await new Promise<void>((resolve, reject) => {
      const file = fs.createWriteStream(ytDlpPath);
      https.get(downloadUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download yt-dlp: ${response.statusCode}`));
          return;
        }
        
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(ytDlpPath, () => {});
        reject(err);
      });
    });
    
    // Make the binary executable
    fs.chmodSync(ytDlpPath, '755');
    console.log("[DEBUG] Made yt-dlp executable");
    
    // Test the binary
    const exec = promisify(childProcess.exec);
    const { stdout } = await exec(`${ytDlpPath} --version`);
    const version = stdout.trim();
    
    console.log(`[DEBUG] Successfully installed yt-dlp version ${version}`);
    return { success: true, path: ytDlpPath };
  } catch (error) {
    console.error("[ERROR] Failed to install yt-dlp:", error);
    return { 
      success: false, 
      path: "", 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Extracts metadata from a video URL using yt-dlp
 * @param {string} url - The video URL to extract metadata from
 * @return {Promise<VideoMetadata>} The extracted metadata
 */
async function extractVideoMetadata(url: string): Promise<VideoMetadata> {
  try {
    console.log(`[DEBUG] Starting metadata extraction for URL: ${url}`);
    
    // Create a temporary directory for yt-dlp cache
    const tempDir = path.join(os.tmpdir(), 'yt-dlp-cache');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    console.log(`[DEBUG] Created temp directory: ${tempDir}`);
    
    // Check if yt-dlp is installed
    let ytDlpPath = "yt-dlp"; // Default to system path
    const ytDlpStatus = await checkYtDlpInstallation();
    
    if (!ytDlpStatus.isInstalled) {
      console.log("[DEBUG] yt-dlp not found, attempting to install...");
      const installResult = await installYtDlp();
      
      if (!installResult.success) {
        throw new Error(`Failed to install yt-dlp: ${installResult.error}`);
      }
      
      ytDlpPath = installResult.path;
      console.log(`[DEBUG] Using installed yt-dlp at ${ytDlpPath}`);
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
      binaryPath: ytDlpPath, // Use the installed binary if needed
    };

    console.log(`[DEBUG] Executing yt-dlp with options:`, JSON.stringify(options));
    
    try {
      const output = await youtubeDl.default(url, options);
      console.log(`[DEBUG] yt-dlp extraction successful for ${url}`);
      console.log(`[DEBUG] Output title: ${output.title}`);
      console.log(`[DEBUG] Output thumbnail: ${output.thumbnail}`);

      // Get video ID for YouTube videos
      let videoId = "";
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        videoId = extractYouTubeId(url) || "";
        console.log(`[DEBUG] Extracted YouTube ID: ${videoId}`);
      }

      // Get a valid thumbnail URL for YouTube videos
      let thumbnailUrl = output.thumbnail || "";
      if (videoId) {
        console.log(`[DEBUG] Getting valid YouTube thumbnail for ID: ${videoId}`);
        thumbnailUrl = await getValidYouTubeThumbnail(videoId);
        console.log(`[DEBUG] Selected thumbnail URL: ${thumbnailUrl}`);
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
    } catch (ytdlpError) {
      console.error(`[ERROR] yt-dlp execution failed:`, ytdlpError);
      throw ytdlpError;
    }
  } catch (error) {
    console.error(`[ERROR] Error extracting metadata for ${url}:`, error);
    
    // Try to extract YouTube ID and get thumbnail directly if yt-dlp fails
    try {
      console.log(`[DEBUG] Attempting fallback extraction for ${url}`);
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        const videoId = extractYouTubeId(url);
        console.log(`[DEBUG] Fallback: extracted YouTube ID: ${videoId}`);
        if (videoId) {
          const thumbnailUrl = await getValidYouTubeThumbnail(videoId);
          console.log(`[DEBUG] Fallback: selected thumbnail URL: ${thumbnailUrl}`);
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
      console.error("[ERROR] Fallback extraction failed:", fallbackError);
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
 * Extract YouTube metadata directly without using yt-dlp
 * @param {string} url - The YouTube URL
 * @return {Promise<VideoMetadata>} The extracted metadata
 */
async function extractYouTubeMetadataDirectly(url: string): Promise<VideoMetadata> {
  try {
    console.log(`[DEBUG] Extracting YouTube metadata directly for: ${url}`);
    
    // Extract the video ID
    const videoId = extractYouTubeId(url);
    if (!videoId) {
      throw new Error("Could not extract YouTube video ID");
    }
    
    console.log(`[DEBUG] Extracted YouTube ID: ${videoId}`);
    
    // Get a valid thumbnail URL
    const thumbnailUrl = await getValidYouTubeThumbnail(videoId);
    console.log(`[DEBUG] Using thumbnail URL: ${thumbnailUrl}`);
    
    // Get video info from oEmbed API (doesn't require API key)
    const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    console.log(`[DEBUG] Fetching oEmbed data from: ${oEmbedUrl}`);
    
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
    
    console.log(`[DEBUG] oEmbed data:`, JSON.stringify(oEmbedData));
    
    // Return the metadata
    return {
      title: oEmbedData.title || "YouTube Video",
      description: oEmbedData.description || `Video by ${oEmbedData.author_name || "YouTube creator"}`,
      duration: 0, // oEmbed doesn't provide duration
      webpage_url: url,
      thumbnail: thumbnailUrl,
      uploader: oEmbedData.author_name || "Unknown",
      upload_date: undefined,
      tags: [],
      subtitles: {},
      categories: [],
      view_count: 0,
    };
  } catch (error) {
    console.error(`[ERROR] Failed to extract YouTube metadata directly:`, error);
    
    // Return minimal metadata with the thumbnail at least
    try {
      const videoId = extractYouTubeId(url);
      if (videoId) {
        const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        return {
          title: "YouTube Video",
          description: "Failed to extract metadata. Please edit manually.",
          duration: 0,
          webpage_url: url,
          thumbnail: thumbnailUrl,
          uploader: "Unknown",
          enrichmentFailed: true,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        };
      }
    } catch (fallbackError) {
      console.error(`[ERROR] Failed to extract minimal YouTube metadata:`, fallbackError);
    }
    
    throw error;
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
    
    console.log(`[DEBUG] Function triggered for video ${videoId}`);
    console.log(`[DEBUG] Video data:`, JSON.stringify(videoData));
    
    // Skip if no URL is provided
    if (!videoData.sourceUrl) {
      console.log(`[ERROR] No source URL provided for video: ${videoId}`);
      
      // Update the document to indicate the enrichment failed
      await db.collection("videos").doc(videoId).update({
        metadataStatus: "failed",
        enrichmentFailed: true,
        enrichmentError: "No source URL provided"
      });
      
      return null;
    }

    try {
      console.log(`[DEBUG] Extracting metadata for video ${videoId} from URL: ${videoData.sourceUrl}`);
      
      // First, update the status to indicate processing has started
      await db.collection("videos").doc(videoId).update({
        metadataStatus: "processing"
      });
      console.log(`[DEBUG] Updated status to 'processing' for video ${videoId}`);
      
      // Determine if this is a YouTube URL
      const isYouTube = videoData.sourceUrl.includes("youtube.com") || videoData.sourceUrl.includes("youtu.be");
      
      // Extract metadata - try yt-dlp first, then fallback to direct extraction for YouTube
      let metadata: VideoMetadata;
      try {
        // Try yt-dlp first
        metadata = await extractVideoMetadata(videoData.sourceUrl);
      } catch (ytdlpError) {
        console.error(`[ERROR] yt-dlp extraction failed: ${ytdlpError}`);
        
        // For YouTube videos, try direct extraction as fallback
        if (isYouTube) {
          console.log(`[DEBUG] Falling back to direct YouTube extraction for ${videoId}`);
          try {
            metadata = await extractYouTubeMetadataDirectly(videoData.sourceUrl);
          } catch (directError) {
            console.error(`[ERROR] Direct extraction also failed: ${directError}`);
            throw directError; // Re-throw to be caught by the outer catch
          }
        } else {
          throw ytdlpError; // Re-throw for non-YouTube videos
        }
      }
      
      console.log(`[DEBUG] Metadata extraction complete for video ${videoId}`);
      
      // Determine source type and ID if not already set
      const sourceType = videoData.sourceType || determineSourceType(videoData.sourceUrl);
      let sourceId = videoData.sourceId;
      
      if (!sourceId && sourceType === "youtube") {
        sourceId = extractYouTubeId(videoData.sourceUrl) || "";
        console.log(`[DEBUG] Extracted YouTube ID: ${sourceId} for video ${videoId}`);
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

      console.log(`[DEBUG] Update data prepared for video ${videoId}:`, JSON.stringify(updateData));

      // If metadata extraction failed, add the error info
      if (metadata.enrichmentFailed) {
        updateData.enrichmentFailed = true;
        updateData.enrichmentError = metadata.errorMessage;
        console.log(`[ERROR] Metadata enrichment failed for video ${videoId}: ${metadata.errorMessage}`);
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
      try {
        await db.collection("videos").doc(videoId).update(updateData);
        console.log(`[DEBUG] Successfully updated video ${videoId} with metadata`);
      } catch (updateError) {
        console.error(`[ERROR] Failed to update video ${videoId} in Firestore:`, updateError);
        throw updateError;
      }
      
      console.log(`[DEBUG] Successfully enriched metadata for video ${videoId}`);
      return null;
    } catch (error) {
      console.error(`[ERROR] Error enriching metadata for video ${videoId}:`, error);
      
      // Update the document with the error information
      try {
        await db.collection("videos").doc(videoId).update({
          metadataStatus: "failed",
          enrichmentFailed: true,
          enrichmentError: error instanceof Error ? error.message : "Unknown error",
        });
        console.log(`[DEBUG] Updated video ${videoId} with failed status`);
      } catch (updateError) {
        console.error(`[ERROR] Failed to update error status for video ${videoId}:`, updateError);
      }
      
      return null;
    }
  }); 