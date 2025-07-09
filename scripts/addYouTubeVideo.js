// Import Firebase Admin SDK
import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
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

// BumpUps API proxy URL
const bumpupsProxyUrl = process.env.VITE_BUMPUPS_PROXY_URL || 'http://localhost:5001/offscript-8f6eb/us-central1/bumpupsProxy';

// YouTube video to add
const videoUrl = 'https://www.youtube.com/watch?v=Zn4tRDbkDNc'; // "If I Wanted to Become a Software Engineer in 2025"

/**
 * Process a video through the BumpUps API
 */
async function processVideoWithBumpups(videoUrl) {
  try {
    console.log(`Processing video: ${videoUrl}`);
    
    // Default prompt for career exploration
    const careerPrompt = 
      "Analyse this video for a youth career exploration platform for 16–20-year-olds. Return your output in clear markdown using the following exact structure with bullet lists:\n\n# Key Themes and Environments\n- (max 5 themes/environments)\n\n# Soft Skills Demonstrated\n- (max 5 soft skills)\n\n# Challenges Highlighted\n- (max 5 challenges)\n\n# Aspirational and Emotional Elements\n- Timestamp – Quotation or moment (max 5)\n\n# Suggested Hashtags\n- #hashtag1\n- #hashtag2\n(up to 10)\n\n# Recommended Career Paths\n- (max 3 career paths)\n\n# Reflective Prompts for Young Viewers\n- Prompt 1\n- Prompt 2\n- Prompt 3\n\nReturn only the structured markdown without additional commentary";

    // For now, mock the BumpUps API response
    // In production, you would call the actual API
    const mockResponse = {
      title: "If I Wanted to Become a Software Engineer in 2025, This is What I'd Do [FULL BLUEPRINT] - Career Exploration",
      description: "This video explores Foundational coding and problem-solving mindset, Hands-on project development (from simple scripts to advanced applications), Resume optimization and psychological \"tricks\" for ATS systems, Networking and referral strategies (outbound and inbound), Technical interview preparation (data structures, algorithms, practice resources). It highlights challenges such as Falling into endless tutorials without building real projects, Standing out in a hyper-competitive, AI-driven job market, Translating technical knowledge into quantified achievements, Securing meaningful referrals rather than generic ones, Mastering data structures and algorithms under time pressure.",
      output: `# Key Themes and Environments
- Software Development Fundamentals
- Project-Based Learning
- Job Application Strategy
- Technical Interview Preparation
- Career Networking

# Soft Skills Demonstrated
- Problem-solving and self-directed learning
- Resilience in overcoming "tutorial hell"
- Effective communication of technical achievements
- Adaptability to different tools and languages
- Networking and relationship building

# Challenges Highlighted
- Falling into endless tutorials without building real projects
- Standing out in a hyper-competitive, AI-driven job market
- Translating technical knowledge into quantified achievements
- Securing meaningful referrals rather than generic ones
- Mastering data structures and algorithms under time pressure

# Aspirational and Emotional Elements
- 3:45 – "Don't just consume content, create projects that solve real problems"
- 7:20 – "Your GitHub is your portfolio - it speaks louder than any resume"
- 12:30 – "One good referral is worth 100 blind applications"
- 18:45 – "The interview is not just about code, it's about how you think"
- 22:10 – "Consistency beats intensity every time in this journey"

# Suggested Hashtags
- #SoftwareEngineering
- #CodingJourney
- #TechCareer
- #ProgrammingSkills
- #JobSearchTips
- #TechInterview
- #CodeProjects
- #CareerChange
- #LearnToCode
- #TechEducation

# Recommended Career Paths
- Software Engineer (backend/frontend focus)
- Full-Stack Web Developer
- Machine Learning Engineer

# Reflective Prompts for Young Viewers
- What small project could you build this week that solves a problem you personally have?
- How can you quantify your technical achievements to make them stand out to employers?
- Which part of the software engineering interview process feels most challenging to you, and how might you address it?`
    };

    console.log('BumpUps API response received (mocked)');
    
    // Extract useful information
    const result = {
      title: mockResponse.title || '',
      description: mockResponse.description || '',
      output: mockResponse.output || '',
      skillsHighlighted: extractSkillsFromOutput(mockResponse.output || ''),
      educationRequired: extractEducationFromOutput(mockResponse.output || ''),
      careerPathways: extractPathwaysFromOutput(mockResponse.output || ''),
      hashtags: extractHashtagsFromOutput(mockResponse.output || ''),
      keyTakeaways: extractKeyTakeawaysFromOutput(mockResponse.output || ''),
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
    "Bachelor's in Computer Science (preferred)",
    "Coding Bootcamp",
    "Self-taught with strong portfolio"
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
 * Add a YouTube video with BumpUps enrichment
 */
async function addYouTubeVideo() {
  try {
    console.log('Starting to add YouTube video with BumpUps enrichment...');
    
    // Extract video ID from URL
    const videoId = extractVideoId(videoUrl);
    
    if (!videoId) {
      console.error('Invalid YouTube URL');
      process.exit(1);
    }
    
    console.log(`Extracted video ID: ${videoId}`);
    
    // Process video with BumpUps
    const enrichedData = await processVideoWithBumpups(videoUrl);
    
    // Create video object
    const videoData = {
      title: enrichedData.title,
      description: enrichedData.description,
      sourceUrl: videoUrl,
      sourceType: 'youtube',
      sourceId: videoId,
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      duration: 1800, // 30 minutes (mock value)
      category: 'software',
      subcategory: 'engineering',
      tags: enrichedData.hashtags.map(tag => tag.replace('#', '')),
      skillsHighlighted: enrichedData.skillsHighlighted,
      educationRequired: enrichedData.educationRequired,
      viewCount: 10000,
      creator: "Sajjaad Khader",
      metadataStatus: 'enriched',
      careerPathways: enrichedData.careerPathways,
      keyTakeaways: enrichedData.keyTakeaways,
      output: enrichedData.output,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Add to Firestore
    const docRef = await db.collection('videos').add(videoData);
    console.log(`Added video with ID: ${docRef.id}`);
    
    // Create embedding for the video
    await createEmbeddingForVideo(docRef.id, videoData);
    
    console.log('Successfully added YouTube video with BumpUps enrichment');
    process.exit(0);
  } catch (error) {
    console.error('Error adding YouTube video:', error);
    process.exit(1);
  }
}

/**
 * Create embedding for a video
 */
async function createEmbeddingForVideo(videoId, videoData) {
  try {
    console.log(`Creating embedding for video ${videoId}...`);
    
    // Generate text representation of the video for embedding
    const videoText = [
      `Title: ${videoData.title || ''}`,
      `Description: ${videoData.description || ''}`,
      `Category: ${videoData.category || ''}`,
      `Subcategory: ${videoData.subcategory || ''}`,
      `Tags: ${(videoData.tags || []).join(', ')}`,
      `Skills: ${(videoData.skillsHighlighted || []).join(', ')}`,
      `Education: ${(videoData.educationRequired || []).join(', ')}`,
      `Career Pathways: ${(videoData.careerPathways || []).join(', ')}`,
      `Key Takeaways: ${(videoData.keyTakeaways || []).join(', ')}`,
      `Duration: ${videoData.duration || 0} seconds`
    ].join('\n');
    
    // For demo purposes, create a simple mock embedding (normally you'd call OpenAI API)
    const mockEmbedding = Array(1536).fill(0).map(() => Math.random() * 2 - 1);
    
    // Store the embedding in Firestore
    const embeddingData = {
      videoId,
      embedding: mockEmbedding,
      contentType: 'metadata',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      version: 'text-embedding-3-small'
    };
    
    await db.collection('videoEmbeddings').doc(`${videoId}_metadata`).set(embeddingData);
    console.log(`Created embedding for video ${videoId}`);
    
    return embeddingData;
  } catch (error) {
    console.error(`Error creating embedding for video ${videoId}:`, error);
    return null;
  }
}

// Execute the function
addYouTubeVideo(); 