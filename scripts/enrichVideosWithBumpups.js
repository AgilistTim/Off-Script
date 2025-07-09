// Import Firebase Admin SDK
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin SDK
try {
  // Initialize without credentials to use emulator
  admin.initializeApp({
    projectId: 'offscript-8f6eb'
  });
  
  console.log('Initialized Firebase Admin for emulator');
  
  // Connect to the Firestore emulator
  admin.firestore().settings({
    host: 'localhost:8080',
    ssl: false
  });
  
  console.log('Connected to Firestore emulator at localhost:8080');
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
  process.exit(1);
}

// Get Firestore instance
const db = admin.firestore();
const { collection, query, where, getDocs } = admin.firestore;

// BumpUps API proxy URL
const bumpupsProxyUrl = process.env.VITE_BUMPUPS_PROXY_URL || 'http://localhost:5001/offscript-8f6eb/us-central1/bumpupsProxy';

/**
 * Process a video through the BumpUps API
 */
async function processVideoWithBumpups(videoUrl) {
  try {
    console.log(`Processing video: ${videoUrl}`);
    
    // Default prompt for career exploration
    const careerPrompt = 
      "Analyse this video for a youth career exploration platform for 16–20-year-olds. Return your output in clear markdown using the following exact structure with bullet lists:\n\n# Key Themes and Environments\n- (max 5 themes/environments)\n\n# Soft Skills Demonstrated\n- (max 5 soft skills)\n\n# Challenges Highlighted\n- (max 5 challenges)\n\n# Aspirational and Emotional Elements\n- Timestamp – Quotation or moment (max 5)\n\n# Suggested Hashtags\n- #hashtag1\n- #hashtag2\n(up to 10)\n\n# Recommended Career Paths\n- (max 3 career paths)\n\n# Reflective Prompts for Young Viewers\n- Prompt 1\n- Prompt 2\n- Prompt 3\n\nReturn only the structured markdown without additional commentary";

    const response = await fetch(bumpupsProxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        url: videoUrl,
        prompt: careerPrompt,
        model: 'bump-1.0',
        language: 'en',
        output_format: 'markdown',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`BumpUps API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log('BumpUps API response received');
    
    // Extract useful information
    const result = {
      title: data.title || '',
      description: data.description || '',
      output: data.output || '',
      skillsHighlighted: extractSkillsFromOutput(data.output || ''),
      educationRequired: extractEducationFromOutput(data.output || ''),
      careerPathways: extractPathwaysFromOutput(data.output || ''),
      hashtags: extractHashtagsFromOutput(data.output || ''),
      keyTakeaways: extractKeyTakeawaysFromOutput(data.output || ''),
      metadataStatus: 'enriched'
    };
    
    return result;
  } catch (error) {
    console.error('Error processing video with BumpUps:', error);
    throw error;
  }
}

/**
 * Extract skills from output text
 */
function extractSkillsFromOutput(output) {
  const skills = new Set();
  
  // Look for skills section
  const softSkillsRegex = /# Soft Skills Demonstrated\s+((?:-\s*[^\n]+\s*)+)/i;
  const softSkillsMatch = output.match(softSkillsRegex);
  
  if (softSkillsMatch && softSkillsMatch[1]) {
    const skillsList = softSkillsMatch[1]
      .split('\n')
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(Boolean);
    
    skillsList.forEach(skill => skills.add(skill));
  }
  
  return Array.from(skills);
}

/**
 * Extract education requirements from output text
 */
function extractEducationFromOutput(output) {
  // For this demo, we'll return some default education requirements
  // In a real implementation, you would parse this from the BumpUps output
  return [
    "Bachelor's degree in related field",
    "Industry certifications",
    "Self-taught options available"
  ];
}

/**
 * Extract career pathways from output text
 */
function extractPathwaysFromOutput(output) {
  const pathways = new Set();
  
  // Look for career pathways section
  const pathwaysRegex = /# Recommended Career Paths\s+((?:-\s*[^\n]+\s*)+)/i;
  const pathwaysMatch = output.match(pathwaysRegex);
  
  if (pathwaysMatch && pathwaysMatch[1]) {
    const pathwaysList = pathwaysMatch[1]
      .split('\n')
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(Boolean);
    
    pathwaysList.forEach(pathway => pathways.add(pathway));
  }
  
  return Array.from(pathways);
}

/**
 * Extract hashtags from output text
 */
function extractHashtagsFromOutput(output) {
  const hashtags = new Set();
  
  // Look for hashtags section
  const hashtagsRegex = /# Suggested Hashtags\s+((?:-\s*[^\n]+\s*)+)/i;
  const hashtagsMatch = output.match(hashtagsRegex);
  
  if (hashtagsMatch && hashtagsMatch[1]) {
    const hashtagsList = hashtagsMatch[1]
      .split('\n')
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(Boolean);
    
    hashtagsList.forEach(hashtag => hashtags.add(hashtag));
  }
  
  return Array.from(hashtags);
}

/**
 * Extract key takeaways from output text
 */
function extractKeyTakeawaysFromOutput(output) {
  const takeaways = new Set();
  
  // Look for key themes section as takeaways
  const themesRegex = /# Key Themes and Environments\s+((?:-\s*[^\n]+\s*)+)/i;
  const themesMatch = output.match(themesRegex);
  
  if (themesMatch && themesMatch[1]) {
    const themesList = themesMatch[1]
      .split('\n')
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(Boolean);
    
    themesList.forEach(theme => takeaways.add(theme));
  }
  
  return Array.from(takeaways);
}

/**
 * Extract video ID from YouTube URL
 */
function extractVideoId(url) {
  if (!url) return null;
  
  // Handle youtu.be format
  const shortMatch = /youtu\.be\/([^?&]+)/.exec(url);
  if (shortMatch) return shortMatch[1];
  
  // Handle youtube.com format
  const longMatch = /youtube\.com\/.*[?&]v=([^&]+)/.exec(url);
  if (longMatch) return longMatch[1];
  
  return null;
}

/**
 * Enrich videos with BumpUps data
 */
async function enrichVideosWithBumpups() {
  try {
    console.log('Starting to enrich videos with BumpUps data...');
    
    // Get all videos that need enrichment
    const videosSnapshot = await db.collection('videos').get();
    
    if (videosSnapshot.empty) {
      console.log('No videos found that need enrichment');
      return;
    }
    
    console.log(`Found ${videosSnapshot.size} videos to enrich`);
    
    for (const doc of videosSnapshot.docs) {
      const videoData = doc.data();
      const videoId = doc.id;
      
      // Skip already enriched videos
      if (videoData.metadataStatus === 'enriched') {
        console.log(`Skipping already enriched video: ${videoId}`);
        continue;
      }
      
      console.log(`Enriching video: ${videoId} - ${videoData.title}`);
      
      try {
        // Process video with BumpUps
        const enrichedData = await processVideoWithBumpups(videoData.sourceUrl);
        
        // Update video in Firestore
        await db.collection('videos').doc(videoId).update({
          ...enrichedData,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Successfully enriched video: ${videoId}`);
      } catch (error) {
        console.error(`Error enriching video ${videoId}:`, error);
      }
    }
    
    console.log('Finished enriching videos with BumpUps data');
    process.exit(0);
  } catch (error) {
    console.error('Error in enrichVideosWithBumpups:', error);
    process.exit(1);
  }
}

// Execute the function
enrichVideosWithBumpups(); 