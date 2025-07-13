import { doc, collection, addDoc, updateDoc, getDoc, getDocs, query, where, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, getFirebaseFunctionUrl } from './firebase';
import { Video } from './videoService';
import { UserPreference, getUserPreferences } from './userPreferenceService';

export interface InlineQuestion {
  id: string;
  videoId: string;
  timestamp: number; // When in the video to show this question (in seconds)
  type: 'binary_choice' | 'preference' | 'career_direction' | 'skill_interest';
  question: string;
  optionA: string;
  optionB: string;
  context?: string; // Additional context about why this question is being asked
  importance: 'high' | 'medium' | 'low';
  category: string; // e.g., 'career_preference', 'skill_assessment', 'learning_style'
  generatedAt: string;
  basedOnKeyMoments?: boolean; // Whether this was generated from video key moments
}

export interface QuestionResponse {
  id: string;
  userId: string;
  questionId: string;
  videoId: string;
  selectedOption: 'A' | 'B' | 'skip';
  timestamp: string;
  responseTime: number; // How long user took to respond (ms)
  videoProgressWhenAnswered: number; // Video timestamp when answered
}

export interface UserQuestionProfile {
  userId: string;
  careerPreferences: Record<string, number>; // e.g., 'technology': 0.8, 'creative': 0.2
  skillInterests: Record<string, number>; // e.g., 'programming': 0.9, 'design': 0.7
  learningPreferences: Record<string, number>; // e.g., 'hands_on': 0.8, 'theoretical': 0.3
  workEnvironmentPrefs: Record<string, number>; // e.g., 'remote': 0.7, 'collaborative': 0.6
  lastUpdated: string;
  totalResponses: number;
  responseAccuracy: number; // How consistent their responses are
}

export interface QuestionGenerationContext {
  video: Video;
  userProfile?: UserPreference;
  userQuestionProfile?: UserQuestionProfile;
  targetQuestionCount: number;
  questionTypes: ('binary_choice' | 'preference' | 'career_direction' | 'skill_interest')[];
  focusAreas?: string[]; // Specific areas to focus questions on
}

export class InlineQuestionsService {
  
  /**
   * Generate contextual questions for a video based on its analysis and user profile
   */
  async generateQuestionsForVideo(context: QuestionGenerationContext): Promise<InlineQuestion[]> {
    try {
      console.log('🎯 Generating inline questions for video:', context.video.id);
      
      // Create the prompt for OpenAI
      const prompt = this.buildQuestionGenerationPrompt(context);
      
      // Call OpenAI via Firebase Function for security
      const response = await fetch(getFirebaseFunctionUrl('generateInlineQuestions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          videoId: context.video.id,
          targetCount: context.targetQuestionCount,
          questionTypes: context.questionTypes
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.questions) {
        throw new Error('Failed to generate questions from OpenAI');
      }

      // Process and validate the generated questions
      const questions = this.processGeneratedQuestions(data.questions, context.video);
      
      // Store questions in Firestore
      await this.storeQuestions(questions);
      
      console.log(`✅ Generated ${questions.length} inline questions for video ${context.video.id}`);
      return questions;
      
    } catch (error) {
      console.error('Error generating questions:', error);
      
      // Fallback to template-based questions if OpenAI fails
      return this.generateFallbackQuestions(context);
    }
  }

  /**
   * Build the prompt for OpenAI to generate contextual questions
   */
  private buildQuestionGenerationPrompt(context: QuestionGenerationContext): string {
    const { video, userProfile, userQuestionProfile } = context;
    
    // Extract key information from video analysis
    const videoInfo = {
      title: video.title,
      description: video.description,
      category: video.category,
      skills: video.skillsHighlighted || [],
      duration: video.duration,
      keyMoments: video.aiAnalysis?.openaiAnalysis?.keyMoments || []
    };

    // Build user context if available
    let userContext = '';
    if (userProfile) {
      userContext = `
User Profile Context:
- Liked Categories: ${Object.entries(userProfile.likedCategories || {}).map(([cat, score]) => `${cat} (${score})`).join(', ')}
- Liked Skills: ${Object.entries(userProfile.likedSkills || {}).map(([skill, score]) => `${skill} (${score})`).join(', ')}
- Engagement Level: ${userProfile.interactionScore || 0}
`;
    }

    if (userQuestionProfile) {
      userContext += `
Question Response History:
- Career Preferences: ${Object.entries(userQuestionProfile.careerPreferences || {}).map(([pref, score]) => `${pref} (${score.toFixed(2)})`).join(', ')}
- Skill Interests: ${Object.entries(userQuestionProfile.skillInterests || {}).map(([skill, score]) => `${skill} (${score.toFixed(2)})`).join(', ')}
- Total Responses: ${userQuestionProfile.totalResponses || 0}
`;
    }

    return `
You are an AI career guidance assistant. Generate ${context.targetQuestionCount} contextual inline questions for this video that will help users explore their career interests and preferences.

Video Information:
- Title: ${videoInfo.title}
- Category: ${videoInfo.category}
- Duration: ${Math.floor(videoInfo.duration / 60)} minutes
- Skills Highlighted: ${videoInfo.skills.join(', ')}
- Description: ${videoInfo.description}

${userContext}

Key Moments in Video:
${videoInfo.keyMoments.map((moment, idx) => 
  `${idx + 1}. ${moment.timestamp}s - ${moment.title || moment.description} (${moment.importance})`
).join('\n')}

Requirements:
1. Generate questions that are contextual to the video content and timing
2. Use "this or that" binary choice format that reveals user preferences
3. Questions should be brief, engaging, and relevant to career exploration
4. Include timestamp suggestions (in seconds) for when to show each question
5. Mix different question types: career preferences, skill interests, work style, learning preferences
6. Make questions feel natural and not intrusive to the viewing experience
7. Base timing on key moments when possible, but spread questions evenly if no key moments exist

Question Types to Include:
${context.questionTypes.join(', ')}

Return the response as a JSON array with this exact structure:
[
  {
    "timestamp": 30,
    "type": "career_direction",
    "question": "What appeals to you more about this career path?",
    "optionA": "The creative problem-solving aspects",
    "optionB": "The structured, methodical approach",
    "context": "This question explores problem-solving preferences",
    "importance": "high",
    "category": "career_preference"
  }
]

Generate exactly ${context.targetQuestionCount} questions, spacing them throughout the video duration (${videoInfo.duration} seconds).
Focus on career exploration and skill discovery that will improve video recommendations.
`;
  }

  /**
   * Process and validate questions generated by OpenAI
   */
  private processGeneratedQuestions(generatedQuestions: any[], video: Video): InlineQuestion[] {
    return generatedQuestions
      .filter(q => q.timestamp && q.question && q.optionA && q.optionB)
      .map((q, index) => ({
        id: `${video.id}_q${index + 1}_${Date.now()}`,
        videoId: video.id,
        timestamp: Math.max(10, Math.min(q.timestamp, video.duration - 10)), // Ensure valid timing
        type: q.type || 'binary_choice',
        question: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        context: q.context || '',
        importance: q.importance || 'medium',
        category: q.category || 'general',
        generatedAt: new Date().toISOString(),
        basedOnKeyMoments: true
      }))
      .sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp
  }

  /**
   * Generate fallback questions using templates when OpenAI fails
   */
  private generateFallbackQuestions(context: QuestionGenerationContext): InlineQuestion[] {
    const { video } = context;
    const questions: InlineQuestion[] = [];
    
    // Template questions based on video category and skills
    const templates = [
      {
        type: 'career_direction' as const,
        question: 'What motivates you more in a career?',
        optionA: 'Making a direct impact on people',
        optionB: 'Solving complex technical problems',
        category: 'career_preference'
      },
      {
        type: 'skill_interest' as const,
        question: 'Which type of work environment appeals more?',
        optionA: 'Collaborative team-based projects',
        optionB: 'Independent focused work',
        category: 'work_environment'
      },
      {
        type: 'preference' as const,
        question: 'How do you prefer to learn new skills?',
        optionA: 'Hands-on practice and experimentation',
        optionB: 'Structured courses and theory first',
        category: 'learning_style'
      }
    ];

    // Generate questions at evenly spaced intervals
    const questionCount = Math.min(context.targetQuestionCount, templates.length);
    const interval = Math.max(30, video.duration / (questionCount + 1));

    for (let i = 0; i < questionCount; i++) {
      const template = templates[i % templates.length];
      questions.push({
        id: `${video.id}_fallback_${i + 1}_${Date.now()}`,
        videoId: video.id,
        timestamp: Math.floor((i + 1) * interval),
        type: template.type,
        question: template.question,
        optionA: template.optionA,
        optionB: template.optionB,
        context: 'Fallback question when AI generation fails',
        importance: 'medium' as const,
        category: template.category,
        generatedAt: new Date().toISOString(),
        basedOnKeyMoments: false
      });
    }

    return questions;
  }

  /**
   * Store generated questions in Firestore
   */
  private async storeQuestions(questions: InlineQuestion[]): Promise<void> {
    try {
      const batch = questions.map(question => 
        addDoc(collection(db, 'inlineQuestions'), question)
      );
      
      await Promise.all(batch);
      console.log(`Stored ${questions.length} questions in Firestore`);
    } catch (error) {
      console.error('Error storing questions:', error);
      throw error;
    }
  }

  /**
   * Get questions for a specific video
   */
  async getQuestionsForVideo(videoId: string): Promise<InlineQuestion[]> {
    try {
      const q = query(
        collection(db, 'inlineQuestions'),
        where('videoId', '==', videoId)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InlineQuestion[];
    } catch (error) {
      console.error('Error fetching questions:', error);
      return [];
    }
  }

  /**
   * Record a user's response to a question
   */
  async recordQuestionResponse(
    userId: string, 
    questionId: string, 
    selectedOption: 'A' | 'B' | 'skip',
    responseTime: number,
    videoProgressWhenAnswered: number
  ): Promise<void> {
    try {
      const response: Omit<QuestionResponse, 'id'> = {
        userId,
        questionId,
        videoId: '', // Will be filled from question
        selectedOption,
        timestamp: new Date().toISOString(),
        responseTime,
        videoProgressWhenAnswered
      };

      // Get the question to find video ID
      const questionDoc = await getDoc(doc(db, 'inlineQuestions', questionId));
      if (questionDoc.exists()) {
        response.videoId = questionDoc.data().videoId;
      }

      // Store the response
      await addDoc(collection(db, 'questionResponses'), response);

      // Update user question profile
      await this.updateUserQuestionProfile(userId, questionId, selectedOption);
      
    } catch (error) {
      console.error('Error recording question response:', error);
      throw error;
    }
  }

  /**
   * Update user's question profile based on their responses
   */
  private async updateUserQuestionProfile(
    userId: string, 
    questionId: string, 
    selectedOption: 'A' | 'B' | 'skip'
  ): Promise<void> {
    if (selectedOption === 'skip') return;

    try {
      // Get the question details
      const questionDoc = await getDoc(doc(db, 'inlineQuestions', questionId));
      if (!questionDoc.exists()) return;

      const question = questionDoc.data() as InlineQuestion;
      
      // Get or create user question profile
      const profileRef = doc(db, 'userQuestionProfiles', userId);
      const profileDoc = await getDoc(profileRef);
      
      let profile: UserQuestionProfile;
      
      if (profileDoc.exists()) {
        profile = profileDoc.data() as UserQuestionProfile;
      } else {
        profile = {
          userId,
          careerPreferences: {},
          skillInterests: {},
          learningPreferences: {},
          workEnvironmentPrefs: {},
          lastUpdated: new Date().toISOString(),
          totalResponses: 0,
          responseAccuracy: 1.0
        };
      }

      // Update profile based on question category and response
      this.updateProfileCategory(profile, question, selectedOption);
      
      profile.totalResponses++;
      profile.lastUpdated = new Date().toISOString();

      // Save updated profile (use setDoc to handle both new and existing profiles)
      await setDoc(profileRef, profile);
      
    } catch (error) {
      console.error('Error updating user question profile:', error);
    }
  }

  /**
   * Update specific category in user profile based on question response
   */
  private updateProfileCategory(
    profile: UserQuestionProfile, 
    question: InlineQuestion, 
    selectedOption: 'A' | 'B'
  ): void {
    const weight = question.importance === 'high' ? 0.3 : question.importance === 'medium' ? 0.2 : 0.1;
    const value = selectedOption === 'A' ? 1 : 0;

    // Determine which profile category to update based on question category
    let targetCategory: Record<string, number>;
    
    switch (question.category) {
      case 'career_preference':
        targetCategory = profile.careerPreferences;
        break;
      case 'skill_assessment':
        targetCategory = profile.skillInterests;
        break;
      case 'learning_style':
        targetCategory = profile.learningPreferences;
        break;
      case 'work_environment':
        targetCategory = profile.workEnvironmentPrefs;
        break;
      default:
        targetCategory = profile.careerPreferences;
    }

    // Extract key from question options to update
    const key = this.extractProfileKey(question, selectedOption);
    if (key) {
      const currentValue = targetCategory[key] || 0.5;
      // Weighted average to gradually update preferences
      targetCategory[key] = currentValue * (1 - weight) + value * weight;
    }
  }

  /**
   * Extract a profile key from question options
   */
  private extractProfileKey(question: InlineQuestion, selectedOption: 'A' | 'B'): string | null {
    const option = selectedOption === 'A' ? question.optionA : question.optionB;
    
    // Simple keyword mapping - could be enhanced with NLP
    const keywordMap: Record<string, string> = {
      'creative': 'creative',
      'technical': 'technical',
      'collaborative': 'collaborative',
      'independent': 'independent',
      'hands-on': 'hands_on',
      'theoretical': 'theoretical',
      'people': 'people_focused',
      'data': 'data_focused',
      'remote': 'remote',
      'office': 'office_based'
    };

    for (const [keyword, key] of Object.entries(keywordMap)) {
      if (option.toLowerCase().includes(keyword)) {
        return key;
      }
    }

    return null;
  }

  /**
   * Get user's question profile for generating better recommendations
   */
  async getUserQuestionProfile(userId: string): Promise<UserQuestionProfile | null> {
    try {
      const profileDoc = await getDoc(doc(db, 'userQuestionProfiles', userId));
      return profileDoc.exists() ? profileDoc.data() as UserQuestionProfile : null;
    } catch (error) {
      console.error('Error fetching user question profile:', error);
      return null;
    }
  }
}

// Export singleton instance
export const inlineQuestionsService = new InlineQuestionsService();

// Helper function to generate questions for a video (main entry point)
export const generateInlineQuestions = async (
  video: Video,
  userId?: string,
  options: {
    questionCount?: number;
    questionTypes?: ('binary_choice' | 'preference' | 'career_direction' | 'skill_interest')[];
    focusAreas?: string[];
  } = {}
): Promise<InlineQuestion[]> => {
  const {
    questionCount = 3,
    questionTypes = ['career_direction', 'skill_interest', 'preference'],
    focusAreas = []
  } = options;

  // Get user context if available
  let userProfile: UserPreference | undefined;
  let userQuestionProfile: UserQuestionProfile | undefined;
  
  if (userId) {
    try {
      [userProfile, userQuestionProfile] = await Promise.all([
        getUserPreferences(userId),
        inlineQuestionsService.getUserQuestionProfile(userId)
      ]);
    } catch (error) {
      console.warn('Error fetching user context for question generation:', error);
    }
  }

  const context: QuestionGenerationContext = {
    video,
    userProfile: userProfile || undefined,
    userQuestionProfile: userQuestionProfile || undefined,
    targetQuestionCount: questionCount,
    questionTypes,
    focusAreas
  };

  return inlineQuestionsService.generateQuestionsForVideo(context);
}; 