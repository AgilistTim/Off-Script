import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as youtubeDl from "youtube-dl-exec";

admin.initializeApp();
const db = admin.firestore();

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
 * Extracts metadata from a video URL using yt-dlp
 * @param {string} url - The video URL to extract metadata from
 * @return {Promise<VideoMetadata>} The extracted metadata
 */
async function extractVideoMetadata(url: string): Promise<VideoMetadata> {
  try {
    // Extract metadata without downloading the video
    const options = {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      preferFreeFormats: true,
      youtubeSkipDashManifest: true,
      skipDownload: true,
    };

    const output = await youtubeDl.default(url, options);

    // Extract the relevant metadata
    return {
      title: output.title || "",
      description: output.description || "",
      duration: output.duration || 0,
      webpage_url: output.webpage_url || url,
      thumbnail: output.thumbnail || "",
      uploader: output.uploader || "",
      upload_date: output.upload_date,
      tags: output.tags || [],
      subtitles: output.subtitles || {},
      categories: output.categories || [],
      view_count: output.view_count,
    };
  } catch (error) {
    console.error("Error extracting metadata:", error);
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
export const enrichVideoMetadata = functions.firestore
  .document("videos/{videoId}")
  .onCreate(async (snapshot, context) => {
    const videoData = snapshot.data();
    const videoId = context.params.videoId;

    // Skip if no URL is provided
    if (!videoData.sourceUrl) {
      console.log("No source URL provided for video:", videoId);
      return null;
    }

    try {
      console.log(`Extracting metadata for video ${videoId} from URL: ${videoData.sourceUrl}`);

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
        title: videoData.title || metadata.title,
        description: videoData.description || metadata.description,
        duration: videoData.duration || metadata.duration,
        sourceType,
        sourceId,
        thumbnailUrl: videoData.thumbnailUrl || metadata.thumbnail,
        creator: videoData.creator || metadata.uploader,
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
        enrichmentFailed: true,
        enrichmentError: error instanceof Error ? error.message : "Unknown error",
      });

      return null;
    }
  }); 