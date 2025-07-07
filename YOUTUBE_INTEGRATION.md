# YouTube & AI Video Analysis Integration Guide

This guide walks you through integrating YouTube API and Bumpups AI analysis with your off-script application for enhanced video metadata and career insights.

## 🔑 **Step 1: Get Your API Keys**

### **YouTube Data API v3**

1. **Go to Google Cloud Console**: [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. **Select your Firebase project**: `***REMOVED***` (or create new one)
3. **Enable the YouTube Data API**:
   - Navigate to **APIs & Services** > **Library**
   - Search for "YouTube Data API v3"
   - Click and press **"Enable"**
4. **Create API Key**:
   - Go to **APIs & Services** > **Credentials**
   - Click **"+ CREATE CREDENTIALS"** > **"API key"**
   - **Important**: Click **"Restrict Key"** for security:
     - **Application restrictions**: HTTP referrers
     - **Website restrictions**: Add `localhost:*` and `off-script.onrender.com`
     - **API restrictions**: Select "YouTube Data API v3"
   - Copy your API key

### **Google reCAPTCHA v2**

1. **Go to reCAPTCHA Console**: [https://www.google.com/recaptcha/admin](https://www.google.com/recaptcha/admin)
2. **Create new site**:
   - **Label**: "OffScript App"  
   - **reCAPTCHA type**: v2 "I'm not a robot" Checkbox
   - **Domains**: `localhost` and `off-script.onrender.com`
3. **Get keys**:
   - **Site Key** (public): For frontend
   - **Secret Key** (private): For backend (optional)

### **Bumpups API**

Your Bumpups API key is already provided:
```
***REMOVED***
```

📖 **API Documentation**: [https://docs.bumpups.com/docs/getting-started](https://docs.bumpups.com/docs/getting-started)

## 🔧 **Step 2: Configure Environment Variables**

### **For Local Development**

Create a `.env` file in your project root:

```bash
# Firebase (existing)
VITE_FIREBASE_API_KEY=***REMOVED***
VITE_FIREBASE_AUTH_DOMAIN=***REMOVED***
VITE_FIREBASE_PROJECT_ID=***REMOVED***
VITE_FIREBASE_STORAGE_BUCKET=***REMOVED***.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=***REMOVED***
VITE_FIREBASE_APP_ID=1:***REMOVED***:web:b5eac19f0f81d6ef2c3dee
VITE_FIREBASE_MEASUREMENT_ID=***REMOVED***

# YouTube Data API
VITE_YOUTUBE_API_KEY=your_youtube_api_key_here

# reCAPTCHA
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key_here

# Bumpups API
VITE_BUMPUPS_API_KEY=***REMOVED***
```

### **For Render Deployment**

Add these environment variables in your Render service settings:

```
VITE_YOUTUBE_API_KEY=your_youtube_api_key_here
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key_here  
VITE_BUMPUPS_API_KEY=***REMOVED***
```

## 🧠 **Step 3: Video Analysis Features**

### **What You Get**

1. **YouTube Metadata**:
   - Video title, description, and statistics
   - Channel information and publish date
   - View count, likes, duration
   - Thumbnail images and video quality

2. **AI Analysis by Bumpups**:
   - **Smart Summaries**: Short and detailed video summaries
   - **Intelligent Timestamps**: Key moments with descriptions
   - **Career Information**: Skills, salary, education requirements
   - **Interactive Querying**: Ask questions about video content

3. **Enhanced Search**:
   - Search by skills mentioned in videos
   - Filter by career stage (entry-level, mid-level, senior)
   - Find videos by salary range or education requirements

### **Using the Enhanced Video Service**

```typescript
import EnhancedVideoService from './services/enhancedVideoService';

const videoService = new EnhancedVideoService();

// Analyze a single video
const result = await videoService.analyzeAndStoreVideo(
  'https://www.youtube.com/watch?v=VIDEO_ID',
  'technology'
);

// Batch analyze multiple videos
const urls = [
  'https://www.youtube.com/watch?v=VIDEO_ID_1',
  'https://www.youtube.com/watch?v=VIDEO_ID_2'
];
const results = await videoService.batchAnalyzeVideos(urls, 'healthcare');

// Search videos by skills
const skillsVideos = await videoService.searchBySkills(['JavaScript', 'React']);

// Get videos by category with AI analysis
const analysedVideos = await videoService.getVideosByCategory('technology', true);
```

## 🛠 **Step 4: Run Video Analysis Script**

### **Automated Video Processing**

The included script can analyze YouTube videos and store enhanced metadata:

```bash
# Set your environment variables first
export VITE_YOUTUBE_API_KEY="your_key_here"
export VITE_BUMPUPS_API_KEY="your_bumpups_key_here"

# Run the analysis script
node scripts/analyzeVideos.js
```

### **Custom Video List**

Edit `scripts/analyzeVideos.js` to add your own videos:

```javascript
const videosToAnalyze = [
  {
    url: 'https://www.youtube.com/watch?v=YOUR_VIDEO_ID',
    category: 'technology'  // or 'healthcare', 'trades', etc.
  },
  // Add more videos...
];
```

### **What the Script Does**

1. ✅ Fetches YouTube metadata (title, stats, thumbnails)
2. 🧠 Submits video to Bumpups for AI analysis
3. ⏱️ Waits for analysis completion (2-5 minutes per video)
4. 📊 Extracts career-relevant information
5. 💾 Stores everything in Firebase
6. 🎯 Automatically categorizes skills and education requirements

## 🎨 **Step 5: Display Enhanced Videos**

### **Using the Enhanced Video Card Component**

```tsx
import EnhancedVideoCard from './components/video/EnhancedVideoCard';
import type { EnhancedVideoData } from './services/enhancedVideoService';

function VideoGallery({ videos }: { videos: EnhancedVideoData[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos.map(video => (
        <EnhancedVideoCard
          key={video.id}
          video={video}
          onVideoClick={(video) => {
            // Handle video click - open player, navigate, etc.
            window.open(video.sourceUrl, '_blank');
          }}
        />
      ))}
    </div>
  );
}
```

### **Component Features**

- 📱 **Responsive Design**: Works on all screen sizes
- 🏷️ **Smart Badges**: Analysis status and career stage indicators  
- 🎯 **Skills & Education Tags**: Visual skill and education requirements
- 💰 **Salary Information**: Extracted salary ranges when available
- 📄 **Tabbed Content**: Overview, timestamps, and career info tabs
- 🔗 **Interactive Timestamps**: Clickable links to specific video moments
- ⭐ **Analysis Confidence**: AI confidence scores and analysis dates

## 📊 **Step 6: Understanding the Data Structure**

### **Enhanced Video Data**

Each analyzed video contains:

```typescript
interface EnhancedVideoData {
  id: string;                    // YouTube video ID
  title: string;                 // Video title
  description: string;           // Truncated description
  category: string;              // Your category (technology, healthcare, etc.)
  thumbnailUrl: string;          // High-quality thumbnail
  
  // YouTube metadata
  youtubeMetadata: {
    channelTitle: string;        // Channel name
    duration: number;            // Duration in seconds
    viewCount: number;           // View count
    likeCount: number;           // Like count
    publishedAt: string;         // ISO date string
    // ... more metadata
  };
  
  // AI analysis results
  aiAnalysis: {
    summary: {
      short: string;             // Brief summary
      detailed: string;          // Detailed summary
      keyPoints: string[];       // Key takeaways
    };
    timestamps: Array<{
      time: number;              // Timestamp in seconds
      title: string;             // Moment title
      description?: string;      // Optional description
    }>;
    careerInfo: {
      skills: string[];          // Required skills
      salary: string;            // Salary information
      education: string[];       // Education requirements
      responsibilities: string[]; // Job responsibilities
      advice: string[];          // Career advice
    };
    confidence: number;          // AI confidence (0-100)
  };
  
  // Extracted metadata for easy searching
  skillsHighlighted: string[];   // Top skills from analysis
  educationRequired: string[];   // Education requirements
  careerStage: 'entry-level' | 'mid-level' | 'senior' | 'any';
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
  };
  
  analysisStatus: 'pending' | 'analyzing' | 'completed' | 'failed';
}
```

## 🔍 **Step 7: Advanced Usage Examples**

### **Real-Time Analysis Monitoring**

```typescript
// Check for videos still being analyzed
const pendingVideos = await videoService.getPendingAnalysis();

// Poll for completion
pendingVideos.forEach(async (video) => {
  if (video.analysisStatus === 'analyzing') {
    // Show loading state in UI
    console.log(`${video.title} is still being analyzed...`);
  }
});
```

### **Interactive Career Exploration**

```typescript
// Find videos for specific career questions
const bumpupsService = new BumpupsService();

const careerQuestions = bumpupsService.getCareerQuestions();
// Returns: ["What skills are required?", "What is the salary range?", ...]

// Query specific videos
const answer = await bumpupsService.queryVideo(
  'VIDEO_ID', 
  'What programming languages are most important for this career?'
);
```

### **Skill-Based Recommendations**

```typescript
// Get user's interests
const userSkills = ['JavaScript', 'React', 'Node.js'];

// Find relevant videos
const recommendedVideos = await videoService.searchBySkills(userSkills);

// Sort by relevance (number of matching skills)
recommendedVideos.sort((a, b) => {
  const aMatches = a.skillsHighlighted.filter(skill => 
    userSkills.includes(skill)
  ).length;
  const bMatches = b.skillsHighlighted.filter(skill => 
    userSkills.includes(skill)
  ).length;
  return bMatches - aMatches;
});
```

## 🚀 **Step 8: Deploy and Test**

### **Deployment Checklist**

- ✅ Environment variables configured in Render
- ✅ YouTube API key properly restricted
- ✅ Firebase rules allow authenticated access
- ✅ Bumpups API key is working

### **Testing the Integration**

1. **Local Testing**:
   ```bash
   npm run dev
   # Test environment variable loading
   # Try analyzing a single video
   ```

2. **Production Testing**:
   ```bash
   # Check environment.js is properly injected
   curl https://off-script.onrender.com/environment.js
   
   # Should show your actual API keys, not placeholders
   ```

3. **Video Analysis Testing**:
   ```bash
   # Run the analysis script with 1-2 test videos
   node scripts/analyzeVideos.js
   ```

## 💡 **Best Practices**

### **Rate Limiting**
- YouTube API: 10,000 requests/day (default quota)
- Bumpups API: Check your plan limits
- Add delays between batch operations

### **Error Handling**
- Always handle API failures gracefully
- Store basic video data even if AI analysis fails
- Implement retry logic for temporary failures

### **Cost Management**
- Bumpups charges per video analysis
- YouTube API quota resets daily
- Monitor usage in respective dashboards

### **Data Quality**
- Verify video URLs before processing
- Handle private/deleted videos
- Implement confidence thresholds for AI results

## 🎯 **What's Next?**

1. **Enhanced Filtering**: Add more sophisticated search filters
2. **User Preferences**: Learn from user interactions
3. **Career Pathways**: Connect related videos in learning paths
4. **Analytics Dashboard**: Track most valuable content
5. **Social Features**: User ratings and comments on analyses

---

**Need Help?** 
- 📖 Bumpups API Docs: [https://docs.bumpups.com/docs/getting-started](https://docs.bumpups.com/docs/getting-started)
- 🎥 YouTube Data API: [https://developers.google.com/youtube/v3](https://developers.google.com/youtube/v3)
- 🔐 reCAPTCHA Setup: [https://www.google.com/recaptcha/admin](https://www.google.com/recaptcha/admin) 