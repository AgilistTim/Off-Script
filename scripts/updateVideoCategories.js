import admin from 'firebase-admin';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  // Use environment variables for Firebase Admin initialization
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  
  // Handle different private key formats
  if (privateKey) {
    // Remove quotes if present
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    // Replace literal \n with actual newlines
    privateKey = privateKey.replace(/\\n/g, '\n');
    // Ensure proper formatting
    if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
      console.error('❌ Invalid private key format. Make sure it starts with -----BEGIN PRIVATE KEY-----');
      process.exit(1);
    }
  }
  
  const serviceAccount = {
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'offscript-8f6eb',
    privateKey: privateKey,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
  };

  if (!serviceAccount.privateKey || !serviceAccount.clientEmail) {
    console.error('❌ Missing Firebase Admin credentials. Please set FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL in your .env file');
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.projectId
  });
}

const db = admin.firestore();

/**
 * Automatically determine video category based on AI analysis
 * (Same logic as implemented in Firebase functions)
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
  const bestCategory = Object.entries(categoryScores).reduce((a, b) => 
    categoryScores[a[0]] > categoryScores[b[0]] ? a : b
  )[0];
  
  // Return the best category, or 'business' as fallback
  return categoryScores[bestCategory] > 0 ? bestCategory : 'business';
}

/**
 * Update video categories for all existing videos
 */
async function updateVideoCategories() {
  console.log('🎬 Starting video category update process...');
  
  try {
    // Get all videos from Firestore
    const videosSnapshot = await db.collection('videos').get();
    
    if (videosSnapshot.empty) {
      console.log('❌ No videos found in database');
      return;
    }
    
    console.log(`📊 Found ${videosSnapshot.size} videos to process`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Process each video
    for (const doc of videosSnapshot.docs) {
      const videoData = doc.data();
      const videoId = doc.id;
      
      try {
        // Check if video has AI analysis
        const aiAnalysis = videoData.aiAnalysis?.fullAnalysis;
        
        if (!aiAnalysis) {
          console.log(`⚠️  Skipping ${videoId}: No AI analysis data`);
          skippedCount++;
          continue;
        }
        
        // Determine new category
        const newCategory = determineAutomaticCategory(aiAnalysis);
        const currentCategory = videoData.category;
        
        // Update if category changed
        if (newCategory !== currentCategory) {
          console.log(`📝 Updating ${videoId}: ${currentCategory} → ${newCategory}`);
          console.log(`   Title: ${videoData.title?.substring(0, 50)}...`);
          
          // Update in Firestore
          await db.collection('videos').doc(videoId).update({
            category: newCategory,
            categoryUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            categoryMethod: 'automatic_script'
          });
          
          updatedCount++;
        } else {
          console.log(`✅ ${videoId}: Category already correct (${currentCategory})`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${videoId}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n🎉 Category update complete!');
    console.log(`📊 Summary:`);
    console.log(`   Updated: ${updatedCount} videos`);
    console.log(`   Skipped: ${skippedCount} videos (no AI analysis)`);
    console.log(`   Errors: ${errorCount} videos`);
    console.log(`   Total: ${videosSnapshot.size} videos`);
    
  } catch (error) {
    console.error('❌ Error updating video categories:', error);
  }
}

/**
 * Analyze category distribution
 */
async function analyzeCategories() {
  console.log('\n📊 Analyzing category distribution...');
  
  try {
    const videosSnapshot = await db.collection('videos').get();
    const categoryCounts = {};
    
    videosSnapshot.docs.forEach(doc => {
      const category = doc.data().category || 'unknown';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    
    console.log('Category distribution:');
    Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        console.log(`  ${category}: ${count} videos`);
      });
    
  } catch (error) {
    console.error('❌ Error analyzing categories:', error);
  }
}

// Main execution
async function main() {
  console.log('🚀 Video Category Update Script');
  console.log('================================\n');
  
  // First analyze current distribution
  await analyzeCategories();
  
  // Ask for confirmation
  const readline = (await import('readline')).createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const answer = await new Promise(resolve => {
    readline.question('\n❓ Do you want to proceed with updating categories? (y/N): ', resolve);
  });
  
  readline.close();
  
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    await updateVideoCategories();
    await analyzeCategories();
  } else {
    console.log('❌ Operation cancelled');
  }
  
  process.exit(0);
}

// Run the script
main().catch(console.error); 