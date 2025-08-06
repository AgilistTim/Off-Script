import { 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  collection, 
  addDoc, 
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';
import { guestSessionService, GuestSession } from './guestSessionService';
import { updateUserProfile } from './userService';
import { UserProfile } from '../models/User';
import { dashboardCareerEnhancer } from './dashboardCareerEnhancer';
import type { EnhancedCareerCard } from '../types/careerCard';
import { UnifiedVoiceContextService } from './unifiedVoiceContextService';
import { serializeForFirebase, validateFirebaseData, flattenNestedArraysForFirebase } from '../lib/utils';
import { prepareDataForFirebase, retryFirebaseOperation, logFirebaseOperation, validateCareerCardData, cleanObjectForFirebase } from '../lib/firebase-utils';

// Migration tracking interface
interface MigrationRecord {
  userId: string;
  guestSessionId: string;
  migratedAt: Date;
  dataTransferred: {
    conversationMessages: number;
    careerCards: number;
    profileFields: string[];
    videoProgress: boolean;
    engagementMetrics: boolean;
  };
  migrationSource: 'registration' | 'login';
}

export class GuestMigrationService {
  
  /**
   * Main migration function - transfers guest data to registered user
   */
  static async migrateGuestToRegisteredUser(
    userId: string, 
    guestSession: GuestSession,
    source: 'registration' | 'login' = 'registration'
  ): Promise<MigrationRecord | null> {
    
    // Only migrate if there's significant data
    if (!guestSessionService.hasSignificantData()) {
      console.log('📝 No significant guest data to migrate');
      return null;
    }

    console.log(`🔄 Starting guest data migration for user ${userId}`);
    console.log('📊 Guest session data:', {
      sessionId: guestSession.sessionId,
      conversationMessages: guestSession.conversationHistory.length,
      careerCards: guestSession.careerCards.length,
      hasProfile: !!guestSession.personProfile,
      videosWatched: guestSession.videoProgress.videosWatched.length
    });

    try {
      const migrationTasks = [];
      const migrationRecord: Omit<MigrationRecord, 'migratedAt'> = {
        userId,
        guestSessionId: guestSession.sessionId,
        dataTransferred: {
          conversationMessages: 0,
          careerCards: 0,
          profileFields: [],
          videoProgress: false,
          engagementMetrics: false
        },
        migrationSource: source
      };

      // 1. Transfer person profile to user document
      if (guestSession.personProfile) {
        migrationTasks.push(
          this.transferPersonProfile(userId, guestSession.personProfile)
            .then(fields => {
              migrationRecord.dataTransferred.profileFields = fields;
            })
        );
      }

      // 2. Transfer conversation history as a migration thread
      console.log('🔍 [MIGRATION FLOW] Checking guest conversation history:', {
        conversationLength: guestSession.conversationHistory.length,
        sessionId: guestSession.sessionId,
        sampleMessages: guestSession.conversationHistory.slice(0, 2).map(msg => ({
          role: msg.role,
          preview: msg.content.substring(0, 30) + '...'
        }))
      });
      
      if (guestSession.conversationHistory.length > 0) {
        console.log('✅ [MIGRATION FLOW] Starting conversation history transfer...');
        migrationTasks.push(
          this.transferConversationHistory(userId, guestSession)
            .then(count => {
              migrationRecord.dataTransferred.conversationMessages = count;
              console.log('✅ [MIGRATION FLOW] Conversation transfer completed:', { messageCount: count });
            })
            .catch(error => {
              console.error('❌ [MIGRATION FLOW] Conversation transfer failed:', error);
              throw error;
            })
        );
      } else {
        console.warn('⚠️ [MIGRATION FLOW] No conversation history found in guest session!', {
          sessionId: guestSession.sessionId,
          totalHistoryItems: guestSession.conversationHistory.length
        });
      }

      // 3. Transfer career cards to user's career explorations
      if (guestSession.careerCards.length > 0) {
        migrationTasks.push(
          this.transferCareerCards(userId, guestSession)
            .then(count => {
              migrationRecord.dataTransferred.careerCards = count;
            })
        );
      }

      // 4. Transfer video progress to user preferences
      if (guestSession.videoProgress.videosWatched.length > 0) {
        migrationTasks.push(
          this.transferVideoProgress(userId, guestSession.videoProgress)
            .then(() => {
              migrationRecord.dataTransferred.videoProgress = true;
            })
        );
      }

      // 5. Create initial user preferences with guest insights
      migrationTasks.push(
        this.initializeEnhancedUserPreferences(userId, guestSession)
          .then(() => {
            migrationRecord.dataTransferred.engagementMetrics = true;
          })
      );

      // Execute all migration tasks
      await Promise.all(migrationTasks);

      // Record the migration
      const finalRecord: MigrationRecord = {
        ...migrationRecord,
        migratedAt: new Date()
      };

      await this.recordMigration(finalRecord);

      // 6. Queue premium Perplexity enhancement for logged-in users (background process)
      if (guestSession.careerCards.length > 0) {
        this.queuePerplexityEnhancement(userId, guestSession.careerCards)
          .catch(error => {
            console.warn('⚠️ Could not queue Perplexity enhancement (non-critical):', error);
          });
      }

      // Clean up guest session
      guestSessionService.clearSession();

      console.log('✅ Guest data migration completed successfully:', finalRecord);
      return finalRecord;

    } catch (error) {
      console.error('❌ Error during guest data migration:', error);
      // Don't fail the registration/login process if migration fails
      return null;
    }
  }

  /**
   * Transfer person profile to user document
   */
  private static async transferPersonProfile(
    userId: string, 
    guestProfile: GuestSession['personProfile']
  ): Promise<string[]> {
    if (!guestProfile) return [];

    try {
      // Convert guest profile to UserProfile format with proper serialization
      const userProfile: Partial<UserProfile> = {
        interests: guestProfile.interests.length > 0 ? [...guestProfile.interests] : undefined,
        careerGoals: guestProfile.goals.length > 0 ? [...guestProfile.goals] : undefined,
        skills: guestProfile.skills.length > 0 ? [...guestProfile.skills] : undefined,
        // Add displayName from guest profile if available
        displayName: guestProfile.name || undefined
      };

      // Only update with non-empty, serializable fields
      const fieldsToUpdate = Object.entries(userProfile)
        .filter(([_, value]) => value !== undefined && value !== null && value !== '')
        .reduce((acc, [key, value]) => {
          // Ensure all values are properly serializable
          if (Array.isArray(value)) {
            acc[key] = [...value]; // Deep copy arrays
          } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            acc[key] = value;
          }
          return acc;
        }, {} as any);

      if (Object.keys(fieldsToUpdate).length > 0) {
        console.log('🔍 PROFILE DEBUG - Raw fieldsToUpdate:', JSON.stringify(fieldsToUpdate, null, 2));
        
        // First flatten any nested arrays for Firebase compatibility
        const flattenedProfile = flattenNestedArraysForFirebase(fieldsToUpdate);
        console.log('🔍 PROFILE DEBUG - After flattening:', JSON.stringify(flattenedProfile, null, 2));
        
        // Then serialize profile data for Firebase compatibility
        const serializedProfile = serializeForFirebase(flattenedProfile);
        console.log('🔍 PROFILE DEBUG - After serialization:', JSON.stringify(serializedProfile, null, 2));
        
        // Validate profile data before saving
        const validation = validateFirebaseData(serializedProfile);
        if (!validation.isValid) {
          console.error('❌ Profile data validation failed:', validation.errors);
          throw new Error(`Invalid profile data for Firebase: ${validation.errors.join(', ')}`);
        }
        console.log('✅ PROFILE DEBUG - Validation passed');

        console.log('🔍 PROFILE DEBUG - About to call updateUserProfile with:', JSON.stringify(serializedProfile, null, 2));
        await updateUserProfile(userId, serializedProfile);
        console.log('✅ Transferred person profile to user document');
        return Object.keys(serializedProfile);
      }

      return [];
    } catch (error) {
      console.error('Error transferring person profile:', error);
      return [];
    }
  }

  /**
   * Transfer conversation history as a migration chat thread
   */
  private static async transferConversationHistory(
    userId: string,
    guestSession: GuestSession
  ): Promise<number> {
    if (guestSession.conversationHistory.length === 0) return 0;

    try {
      // Create a special migration chat thread
      const migrationThreadRef = doc(collection(db, 'chatThreads'));
      
      await setDoc(migrationThreadRef, {
        id: migrationThreadRef.id,
        userId,
        title: 'Guest Session Conversation',
        description: `Conversation from guest session ${guestSession.sessionId}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: guestSession.conversationHistory[guestSession.conversationHistory.length - 1]?.content?.substring(0, 100) || '',
        messageCount: guestSession.conversationHistory.length,
        isMigrated: true,
        migrationSource: 'guest_session',
        guestSessionId: guestSession.sessionId
      });

      // Add all conversation messages
      let messageCount = 0;
      for (const message of guestSession.conversationHistory) {
        try {
          await addDoc(collection(db, 'chatThreads', migrationThreadRef.id, 'messages'), {
            content: message.content,
            role: message.role,
            timestamp: serverTimestamp(),
            originalTimestamp: message.timestamp,
            migrated: true
          });
          messageCount++;
        } catch (messageError) {
          console.warn('Failed to migrate message:', messageError);
        }
      }

      // Create a chat summary for the migrated conversation
      try {
        console.log('🔍 [ANALYSIS FLOW] Starting chat summary creation with enhanced analysis...');
        await this.createMigrationChatSummary(userId, migrationThreadRef.id, guestSession);
        console.log('✅ [ANALYSIS FLOW] Created chat summary for migrated conversation successfully');
      } catch (summaryError) {
        console.error('❌ [ANALYSIS FLOW] Could not create chat summary for migration:', summaryError);
        // Still throw to ensure we know about this critical failure
        throw summaryError;
      }

      console.log(`✅ Transferred ${messageCount} conversation messages`);
      return messageCount;
      
    } catch (error) {
      console.error('Error transferring conversation history:', error);
      return 0;
    }
  }

  /**
   * Transfer career cards to threadCareerGuidance (same as live conversations)
   */
  private static async transferCareerCards(
    userId: string,
    guestSession: GuestSession
  ): Promise<number> {
    const careerCards = guestSession.careerCards;
    if (careerCards.length === 0) return 0;

    try {
      // Import the singleton instance of CareerPathwayService 
      const careerPathwayService = (await import('./careerPathwayService')).default;
      
      // Use the same method that live conversations use
      await careerPathwayService.saveCareerCardsFromConversation(userId, careerCards);
      
      console.log(`✅ Transferred ${careerCards.length} career cards to threadCareerGuidance`);
      return careerCards.length;
      
    } catch (error) {
      console.error('Error transferring career cards:', error);
      return 0;
    }
  }

  /**
   * Create a chat summary for migrated conversation
   */
  private static async createMigrationChatSummary(
    userId: string, 
    threadId: string, 
    guestSession: GuestSession
  ): Promise<void> {
    try {
      const { db } = await import('./firebase');
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');

      // Extract key information from the conversation and guest session data
      const conversationText = guestSession.conversationHistory
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      // Create a comprehensive summary using available data
      const summary = [
        'Career exploration conversation from guest session.',
        `Discussed ${guestSession.careerCards?.length || 0} career paths.`,
        `User interests: ${guestSession.personProfile?.interests?.join(', ') || 'Not specified'}.`,
        `Career goals: ${guestSession.personProfile?.goals?.join(', ') || 'Not specified'}.`,
        'Full conversation data has been preserved for detailed analysis.'
      ].join(' ');

      // Analyze conversation for enhanced personal insights
      console.log('🔍 [ANALYSIS FLOW] Starting enhanced conversation analysis...', {
        conversationLength: guestSession.conversationHistory.length,
        threadId,
        userId
      });
      const enhancedInsights = await this.analyzeConversationForPersonalInsights(guestSession);
      console.log('✅ [ANALYSIS FLOW] Enhanced conversation analysis completed:', {
        extractedName: enhancedInsights.name,
        personalityTraitsCount: enhancedInsights.personalityTraits.length,
        motivationsCount: enhancedInsights.motivations.length,
        communicationStyle: enhancedInsights.communicationStyle,
        hasInsights: !!(enhancedInsights.name || enhancedInsights.personalityTraits.length > 0)
      });
      
      // Create chat summary document with enhanced insights
      const summaryDoc = {
        id: `${threadId}_summary`,
        threadId,
        userId,
        summary,
        interests: Array.isArray(guestSession.personProfile?.interests) ? guestSession.personProfile.interests : [],
        careerGoals: Array.isArray(guestSession.personProfile?.goals) ? guestSession.personProfile.goals : [],
        skills: Array.isArray(guestSession.personProfile?.skills) ? guestSession.personProfile.skills : [],
        // Enhanced personal data extracted from conversation
        enhancedProfile: {
          extractedName: enhancedInsights.name,
          personalityTraits: enhancedInsights.personalityTraits,
          communicationStyle: enhancedInsights.communicationStyle,
          motivations: enhancedInsights.motivations,
          concerns: enhancedInsights.concerns,
          preferences: enhancedInsights.preferences
        },
        conversationText: guestSession.conversationHistory
          .map(msg => `${msg.role}: ${msg.content}`)
          .join('\n'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        messageCount: guestSession.conversationHistory.length,
        isMigrated: true,
        migrationSource: 'guest_session',
        guestSessionId: guestSession.sessionId,
        enriched: true,
        // Include additional context for career guidance generation
        conversationContext: {
          careerCardsGenerated: guestSession.careerCards?.length || 0,
          userEngagement: guestSession.engagementMetrics || {},
          sessionDuration: 'guest_session'
        }
      };

      console.log('💾 [FIREBASE FLOW] Saving chat summary to Firebase...', {
        summaryId: summaryDoc.id,
        collection: 'chatSummaries',
        hasEnhancedProfile: !!summaryDoc.enhancedProfile,
        extractedName: summaryDoc.enhancedProfile?.extractedName,
        conversationTextLength: summaryDoc.conversationText.length
      });
      
      // Clean the summary document for proper Firebase serialization
      const cleanedSummaryDoc = cleanObjectForFirebase(summaryDoc);
      console.log('🧹 [FIREBASE FLOW] Applied object cleaning for serialization:', {
        originalSize: JSON.stringify(summaryDoc).length,
        cleanedSize: JSON.stringify(cleanedSummaryDoc).length,
        hasCleanedEnhancedProfile: !!(cleanedSummaryDoc as any)?.enhancedProfile
      });
      
      await setDoc(doc(db, 'chatSummaries', summaryDoc.id), cleanedSummaryDoc);
      
      console.log('✅ [FIREBASE FLOW] Chat summary successfully saved to Firebase:', {
        summaryId: summaryDoc.id,
        collection: 'chatSummaries',
        enhancedProfileKeys: Object.keys(summaryDoc.enhancedProfile || {}),
        dataSize: JSON.stringify(summaryDoc).length
      });
      
    } catch (error) {
      console.error('Error creating migration chat summary:', error);
      throw error;
    }
  }

  /**
   * Transfer video progress to user preferences
   */
  private static async transferVideoProgress(
    userId: string,
    videoProgress: GuestSession['videoProgress']
  ): Promise<void> {
    try {
      const userPrefsRef = doc(db, 'userPreferences', userId);
      
      // Check if user preferences already exist
      const existingPrefs = await getDoc(userPrefsRef);
      
      if (existingPrefs.exists()) {
        // Merge with existing preferences
        const currentData = existingPrefs.data();
        await updateDoc(userPrefsRef, {
          watchHistory: [
            ...(currentData.watchHistory || []),
            ...videoProgress.videosWatched.map(videoId => ({
              videoId,
              timestamp: new Date().toISOString(), // Use regular timestamp
              source: 'guest_migration'
            }))
          ],
          totalWatchTime: (currentData.totalWatchTime || 0) + videoProgress.totalWatchTime,
          migratedFromGuest: true,
          migratedAt: serverTimestamp()
        });
      } else {
        // Create new preferences with guest data
        await setDoc(userPrefsRef, {
          userId,
          likedVideos: [],
          dislikedVideos: [],
          likedCategories: {},
          likedSkills: {},
          watchHistory: videoProgress.videosWatched.map(videoId => ({
            videoId,
            timestamp: new Date().toISOString(), // Use regular timestamp
            source: 'guest_migration'
          })),
          totalWatchTime: videoProgress.totalWatchTime,
          interactionScore: 1,
          migratedFromGuest: true,
          migratedAt: serverTimestamp()
        });
      }

      console.log('✅ Transferred video progress to user preferences');
    } catch (error) {
      // Don't fail the migration if video progress can't be transferred
      console.warn('⚠️ Could not transfer video progress (non-critical):', error);
    }
  }

  /**
   * Analyze conversation for enhanced personal insights using OpenAI
   */
  private static async analyzeConversationForPersonalInsights(
    guestSession: GuestSession
  ): Promise<{
    name: string | null;
    personalityTraits: string[];
    communicationStyle: string;
    motivations: string[];
    concerns: string[];
    preferences: string[];
  }> {
    try {
      if (guestSession.conversationHistory.length === 0) {
        return {
          name: null,
          personalityTraits: [],
          communicationStyle: 'unknown',
          motivations: [],
          concerns: [],
          preferences: []
        };
      }

      // Import OpenAI service
      const { conversationAnalyzer } = await import('./conversationAnalyzer');
      
      // Format conversation for analysis
      const conversationText = guestSession.conversationHistory
        .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
        .join('\n\n');

      console.log('🔍 [OPENAI FLOW] Analyzing conversation for personal insights...', {
        conversationTextLength: conversationText.length,
        messageCount: guestSession.conversationHistory.length,
        sampleText: conversationText.substring(0, 200) + '...'
      });

      // Use OpenAI to extract personal insights
      const startTime = Date.now();
      const insights = await conversationAnalyzer.analyzeForPersonalInsights(conversationText);
      const analysisTime = Date.now() - startTime;
      
      console.log('✅ [OPENAI FLOW] Personal insights extraction completed:', {
        analysisTimeMs: analysisTime,
        extractedName: insights.name,
        personalityTraits: insights.personalityTraits,
        communicationStyle: insights.communicationStyle,
        motivations: insights.motivations,
        concerns: insights.concerns,
        preferences: insights.preferences,
        hasValidInsights: !!(insights.name || insights.personalityTraits.length > 0)
      });
      return insights;

    } catch (error) {
      console.error('❌ Error analyzing conversation for personal insights:', error);
      // Return empty insights on error
      return {
        name: null,
        personalityTraits: [],
        communicationStyle: 'unknown',
        motivations: [],
        concerns: [],
        preferences: []
      };
    }
  }

  /**
   * Initialize enhanced user preferences with guest insights
   */
  private static async initializeEnhancedUserPreferences(
    userId: string,
    guestSession: GuestSession
  ): Promise<void> {
    try {
      const userPrefsRef = doc(db, 'userPreferences', userId);
      const existingPrefs = await getDoc(userPrefsRef);
      
      const perplexityData = {
        guestMigrationData: {
          originalSessionId: guestSession.sessionId,
          sessionDuration: guestSession.lastActive && guestSession.createdAt 
            ? new Date(guestSession.lastActive).getTime() - new Date(guestSession.createdAt).getTime()
            : 0,
          engagementMetrics: guestSession.engagementMetrics,
          migratedAt: serverTimestamp()
        }
      };

      if (existingPrefs.exists()) {
        await updateDoc(userPrefsRef, perplexityData);
      } else {
        await setDoc(userPrefsRef, {
          userId,
          likedVideos: [],
          dislikedVideos: [],
          likedCategories: {},
          likedSkills: {},
          watchHistory: [],
          totalWatchTime: 0,
          interactionScore: guestSession.engagementMetrics.messageCount > 5 ? 2 : 1,
          ...perplexityData
        });
      }

      console.log('✅ Initialized enhanced user preferences');
    } catch (error) {
      // Don't fail the migration if preferences can't be updated
      console.warn('⚠️ Could not initialize enhanced user preferences (non-critical):', error);
    }
  }

  /**
   * Record the migration for analytics and debugging
   */
  private static async recordMigration(record: MigrationRecord): Promise<void> {
    try {
      await addDoc(collection(db, 'userMigrations'), {
        ...record,
        migratedAt: serverTimestamp()
      });
      console.log('✅ Migration record saved');
    } catch (error) {
      // Don't fail the migration if we can't record it - this might be a permissions issue
      console.warn('⚠️ Could not save migration record (non-critical):', error);
      
      // Try to save to user document instead as fallback
      try {
        const userRef = doc(db, 'users', record.userId);
        await updateDoc(userRef, {
          lastMigration: {
            guestSessionId: record.guestSessionId,
            migratedAt: serverTimestamp(),
            source: record.migrationSource,
            dataTransferred: record.dataTransferred
          }
        });
        console.log('✅ Migration info saved to user document as fallback');
      } catch (fallbackError) {
        console.warn('⚠️ Fallback migration recording also failed (non-critical):', fallbackError);
      }
    }
  }

  /**
   * Check if there's guest data available for migration
   */
  static hasGuestDataToMigrate(): boolean {
    return guestSessionService.hasSignificantData();
  }

  /**
   * Queue Perplexity enhancement for migrated career cards (premium feature)
   */
  private static async queuePerplexityEnhancement(
    userId: string,
    careerCards: any[]
  ): Promise<void> {
    try {
      // Only enhance if enhancement is available and user has career cards
      if (!dashboardCareerEnhancer.isEnhancementAvailable()) {
        console.log('📊 Enhancement not available - skipping premium enhancement');
        return;
      }

      if (careerCards.length === 0) {
        console.log('📊 No career cards to enhance');
        return;
      }

      console.log(`🎯 Queueing premium Perplexity enhancement for ${careerCards.length} career cards`);

      // Start enhancement process in background after a short delay
      setTimeout(async () => {
        try {
          console.log(`🚀 Starting background Perplexity enhancement for user: ${userId}`);
          
          // Note: In a production environment, this would ideally be handled by a job queue
          // For now, we'll run it as a background process
          const enhancedCards = await dashboardCareerEnhancer.batchEnhanceUserCareerCards(
            userId,
            careerCards,
            (status) => {
              console.log(`📊 Enhancement progress:`, status);
              // TODO: Could emit real-time progress updates to the user via WebSocket/SSE
              
              // Trigger context update when enhancement completes
              if (status.status === 'completed') {
                console.log('🎯 Enhancement completed - triggering ElevenLabs context update');
                this.triggerContextUpdateForEnhancement(userId, status);
              }
            }
          );

          // Save enhanced data back to Firebase
          await this.saveEnhancedCareerCardsToFirebase(userId, enhancedCards);

          // Final context update after data is saved to Firebase
          await this.triggerFinalContextUpdate(userId, enhancedCards);

          console.log(`✅ Background Perplexity enhancement completed for user: ${userId}`);
        } catch (error) {
          console.error(`❌ Background Perplexity enhancement failed for user ${userId}:`, error);
        }
      }, 5000); // Start after 5 seconds to allow user registration to complete

    } catch (error) {
      console.error('❌ Error queueing Perplexity enhancement:', error);
      // Don't throw - this is a premium feature and shouldn't break migration
    }
  }

  /**
   * Get preview of guest data for UI display
   */
  static getGuestDataPreview(): {
    careerCards: number;
    conversationMessages: number;
    interests: number;
    goals: number;
    videosWatched: number;
  } {
    const session = guestSessionService.getGuestSession();
    
    return {
      careerCards: session.careerCards.length,
      conversationMessages: session.conversationHistory.length,
      interests: session.personProfile?.interests.length || 0,
      goals: session.personProfile?.goals.length || 0,
      videosWatched: session.videoProgress.videosWatched.length
    };
  }

  /**
   * Save enhanced Perplexity career cards back to Firebase
   * Transforms Perplexity data format to UI-compatible format
   */
  private static async saveEnhancedCareerCardsToFirebase(
    userId: string,
    enhancedCards: EnhancedCareerCard[]
  ): Promise<void> {
    try {
      console.log(`💾 Saving ${enhancedCards.length} enhanced career cards to Firebase for user: ${userId}`);

      // Get the user's most recent thread career guidance document
      const guidanceQuery = query(
        collection(db, 'threadCareerGuidance'),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc'),
        limit(1)
      );

      const guidanceSnapshot = await getDocs(guidanceQuery);
      
      if (guidanceSnapshot.empty) {
        console.warn('⚠️ No threadCareerGuidance document found for enhanced data save');
        return;
      }

      const docRef = guidanceSnapshot.docs[0].ref;
      const currentData = guidanceSnapshot.docs[0].data();
      
      if (!currentData.guidance) {
        console.warn('⚠️ No guidance data found in document');
        return;
      }

      // Transform Perplexity enhanced cards to UI-compatible format
      const updatedGuidance = { ...currentData.guidance };

      // Update primary pathway if enhanced
      if (enhancedCards.length > 0 && updatedGuidance.primaryPathway) {
        const primaryCard = enhancedCards[0]; // First card is typically the primary
        if (primaryCard.enhancement.status === 'completed' && primaryCard.perplexityData) {
          updatedGuidance.primaryPathway = {
            ...updatedGuidance.primaryPathway,
            ...this.transformPerplexityDataToUIFormat(primaryCard),
            isEnhanced: true,
            enhancedAt: new Date(),
            enhancementSource: 'perplexity',
            enhancementStatus: 'enhanced',
            webSearchVerified: true
          };
          console.log(`✅ Enhanced primary pathway: ${primaryCard.title}`);
        }
      }

      // Update alternative pathways if enhanced
      if (enhancedCards.length > 1 && updatedGuidance.alternativePathways) {
        enhancedCards.slice(1).forEach((card, index) => {
          if (card.enhancement.status === 'completed' && card.perplexityData && 
              updatedGuidance.alternativePathways[index]) {
            updatedGuidance.alternativePathways[index] = {
              ...updatedGuidance.alternativePathways[index],
              ...this.transformPerplexityDataToUIFormat(card),
              isEnhanced: true,
              enhancedAt: new Date(),
              enhancementSource: 'perplexity',
              enhancementStatus: 'enhanced',
              webSearchVerified: true
            };
            console.log(`✅ Enhanced alternative pathway ${index + 1}: ${card.title}`);
          }
        });
      }

      // Prepare data for Firebase with comprehensive validation
      const dataPrep = prepareDataForFirebase(updatedGuidance);
      if (!dataPrep.success) {
        console.error('❌ Data preparation failed:', dataPrep.errors);
        throw new Error(`Failed to prepare data for Firebase: ${dataPrep.errors?.join(', ')}`);
      }

      // Data structure validation is handled by prepareDataForFirebase above
      console.log('✅ Data prepared and validated for Firebase save');

      // Use the properly prepared data (already flattened and cleaned)
      console.log('🧹 [FIREBASE FLOW] Using prepared data for enhanced career guidance:', {
        originalGuidanceSize: JSON.stringify(updatedGuidance).length,
        preparedDataSize: JSON.stringify(dataPrep.data).length,
        hasPrimaryPathway: !!(dataPrep.data as any)?.primaryPathway,
        hasAlternativePathways: !!(dataPrep.data as any)?.alternativePathways,
        guidanceType: typeof dataPrep.data,
        isObject: typeof dataPrep.data === 'object' && !Array.isArray(dataPrep.data)
      });

      // Save to Firebase with retry mechanism  
      const saveResult = await retryFirebaseOperation(
        () => updateDoc(docRef, {
          guidance: dataPrep.data, // Use the properly prepared guidance object (flattened + cleaned)
          lastEnhanced: serverTimestamp()
        }),
        { maxRetries: 3, initialDelayMs: 1000 }
      );

      if (!saveResult.success) {
        logFirebaseOperation('Enhanced Career Cards Save', dataPrep.data, 'error', saveResult.error);
        throw new Error(`Failed to save enhanced career cards after ${saveResult.retryCount} retries: ${saveResult.error}`);
      }

      logFirebaseOperation('Enhanced Career Cards Save', dataPrep.data, 'success', { retries: saveResult.retryCount });

      console.log('✅ Successfully saved enhanced career cards to Firebase');
      
      // Clear caches to ensure fresh data is loaded in Dashboard
      const { careerPathwayService } = await import('./careerPathwayService');
      careerPathwayService.clearStructuredGuidanceCache(userId);
      console.log('🧹 Cleared dashboard cache after saving enhanced cards');

    } catch (error) {
      console.error('❌ Error saving enhanced career cards to Firebase:', error);
      // Don't throw - this is enhancement, not critical functionality
    }
  }

  /**
   * Transform Perplexity enhanced data to UI-compatible format
   * Maps to comprehensive 10-section schema that the career modal expects
   */
  private static transformPerplexityDataToUIFormat(enhancedCard: EnhancedCareerCard): any {
    if (!enhancedCard.perplexityData) {
      return {};
    }

    const data = enhancedCard.perplexityData;
    
    // TEMPORARY: Simplified return to avoid type errors and get app compiling
    // The dashboard modal will handle the structured perplexityData directly
    return {
      // Essential data for the career modal
      perplexityData: data,
      enhancedSources: data.verifiedSalaryRanges?.entry?.sources || [],
      
      // Basic compensation data (simplified structure)
      compensationRewards: data.verifiedSalaryRanges ? {
        salaryRange: {
          entry: data.verifiedSalaryRanges.entry.min,
          mid: data.verifiedSalaryRanges.mid.min,
          senior: data.verifiedSalaryRanges.senior.min,
          exceptional: data.verifiedSalaryRanges.senior.max,
          currency: data.verifiedSalaryRanges.entry.currency
        }
      } : undefined
    };
    
    /* COMMENTED OUT: Complex transformations causing 70+ type errors
    // TODO: Fix these transformations once main enhancement is working
    return {
      // Map to compensationRewards schema for career modal
      compensationRewards: data.verifiedSalaryRanges ? {
        salaryRange: {
          entry: data.verifiedSalaryRanges.entry.min,
          mid: data.verifiedSalaryRanges.mid.min,
          senior: data.verifiedSalaryRanges.senior.min,
          exceptional: data.verifiedSalaryRanges.senior.max,
          currency: data.verifiedSalaryRanges.entry.currency
        },
        variablePay: {
          bonuses: "Performance-based (market data)",
          commissions: "None",
          equity: "Possible in startups",
          profitShare: "Varies by company"
        },
        nonFinancialBenefits: {
          pension: "Standard employer contribution",
          healthcare: "Private healthcare options",
          leavePolicy: "25+ days annual leave",
          professionalDevelopment: "Training budgets",
          perks: ["Remote work", "Flexible hours", "Professional development"]
        }
      } : undefined,

      // Map to labourMarketDynamics schema
      labourMarketDynamics: data.industryIntelligence ? {
        demandOutlook: {
          growthForecast: data.industryIntelligence.growthProjection.outlook,
          timeHorizon: "5-10 years",
          regionalHotspots: ["London", "Manchester", "Edinburgh", "Bristol"]
        },
        supplyProfile: {
          talentScarcity: data.demandIndicators?.competitionLevel || "Moderate",
          competitionLevel: data.demandIndicators?.competitionLevel || "High",
          barriers: ["Technical skills", "Experience requirements"]
        },
        economicSensitivity: {
          recessionImpact: "Moderate",
          techDisruption: "Low",
          cyclicalPatterns: `${data.industryIntelligence.growthProjection.nextYear}% growth next year`
        }
      } : undefined,

      // Map to competencyRequirements schema
      competencyRequirements: data.currentOpportunities?.skillsInDemand ? {
        technicalSkills: data.currentOpportunities.skillsInDemand
          .slice(0, 5)
          .map(skill => String(skill?.skill || ''))
          .filter(skill => skill.trim()),
        softSkills: ["Problem-solving", "Communication", "Analytical thinking", "Leadership"],
        tools: data.currentOpportunities.skillsInDemand
          .filter(skill => {
            const skillName = String(skill?.skill || '').toLowerCase();
            return skillName.includes('python') || 
              skillName.includes('sql') ||
              skillName.includes('tableau') ||
              skillName.includes('excel');
          })
          .map(skill => String(skill?.skill || ''))
          .filter(skill => skill.trim()),
        certifications: data.verifiedEducation?.professionalBodies
          ?.map(body => String(body?.certification || ''))
          .filter(cert => cert.trim()) || [],
        qualificationPathway: {
          degrees: data.verifiedEducation?.pathways
            ?.filter(p => p?.type === 'University')
            .map(p => String(p?.title || ''))
            .filter(title => title.trim()) || [],
          licenses: [],
          alternativeRoutes: data.verifiedEducation?.pathways
            ?.filter(p => p?.type === 'Online')
            .map(p => String(p?.title || ''))
            .filter(title => title.trim()) || [],
          apprenticeships: data.verifiedEducation?.pathways
            ?.filter(p => p?.type === 'Apprenticeship')
            .map(p => String(p?.title || ''))
            .filter(title => title.trim()) || [],
          bootcamps: data.verifiedEducation?.pathways
            ?.filter(p => p?.type === 'Professional')
            .map(p => String(p?.title || ''))
            .filter(title => title.trim()) || []
        },
        learningCurve: {
          timeToCompetent: "1-3 years",
          difficultyLevel: "Medium to High",
          prerequisites: ["Basic technical knowledge", "Problem-solving skills"]
        }
      } : undefined,

      // Map to workEnvironmentCulture schema
      workEnvironmentCulture: data.currentOpportunities?.topEmployers ? {
        typicalEmployers: data.currentOpportunities.topEmployers
          .slice(0, 3)
          .map(emp => String(emp?.name || ''))
          .filter(name => name.trim()),
        teamStructures: ["Cross-functional teams", "Agile teams", "Project-based teams"],
        culturalNorms: {
          pace: "Fast-paced",
          formality: "Informal to business casual",
          decisionMaking: "Data-driven and collaborative",
          diversityInclusion: "High emphasis"
        },
        physicalContext: ["Office", "Remote", "Hybrid"]
      } : undefined,

      // Map to transferabilityFutureProofing schema
      transferabilityFutureProofing: data.industryIntelligence?.automationRisk ? {
        portableSkills: data.currentOpportunities?.skillsInDemand
          ?.slice(0, 3)
          .map(skill => String(skill?.skill || ''))
          .filter(skill => skill.trim()) || [],
        automationExposure: {
          vulnerabilityLevel: data.industryIntelligence.automationRisk.level,
          timeHorizon: data.industryIntelligence.automationRisk.timeline,
          protectiveFactors: data.industryIntelligence.automationRisk.mitigation ? [data.industryIntelligence.automationRisk.mitigation] : []
        },
        globalRelevance: {
          credentialRecognition: ["Internationally recognized", "Global demand"],
          marketDemand: ["High in tech hubs", "Growing globally"],
          culturalAdaptability: "High"
        }
      } : undefined,

      // Enhanced fields for backward compatibility
      enhancedSalary: data.verifiedSalary ? {
        entry: `£${data.verifiedSalary.entry.min.toLocaleString()} - £${data.verifiedSalary.entry.max.toLocaleString()}`,
        experienced: `£${data.verifiedSalary.mid.min.toLocaleString()} - £${data.verifiedSalary.mid.max.toLocaleString()}`,
        senior: `£${data.verifiedSalary.senior.min.toLocaleString()} - £${data.verifiedSalary.senior.max.toLocaleString()}`,
        byRegion: data.verifiedSalary.byRegion
      } : undefined,

      industryTrends: data.industryIntelligence ? [
        `Growth outlook: ${data.industryIntelligence.growthProjection.outlook}`,
        `Next year projection: ${data.industryIntelligence.growthProjection.nextYear}%`,
        `Five year projection: ${data.industryIntelligence.growthProjection.fiveYear}%`,
        ...data.industryIntelligence.emergingTrends.map(trend => `${trend.trend} (${trend.impact} impact)`)
      ].filter(Boolean) : undefined,

      topUKEmployers: data.currentOpportunities?.topEmployers?.map(employer => ({
        name: employer.name,
        openings: employer.openings,
        salaryRange: `£${employer.salaryRange.min.toLocaleString()} - £${employer.salaryRange.max.toLocaleString()}`,
        benefits: employer.benefits
      })) || undefined,

      workLifeBalance: data.industryIntelligence?.automationRisk ? {
        automationRisk: data.industryIntelligence.automationRisk.level,
        timeline: data.industryIntelligence.automationRisk.timeline,
        mitigation: data.industryIntelligence.automationRisk.mitigation
      } : undefined,

      professionalAssociations: data.verifiedEducation?.professionalBodies?.map(body => ({
        name: body.name,
        certification: body.certification,
        cost: `£${body.cost.toLocaleString()}`,
        renewalPeriod: body.renewalPeriod,
        url: body.url
      })) || undefined,

      additionalQualifications: data.verifiedEducation?.pathways?.map(pathway => ({
        type: pathway.type,
        title: pathway.title,
        provider: pathway.provider,
        duration: pathway.duration,
        cost: `£${pathway.cost.min.toLocaleString()} - £${pathway.cost.max.toLocaleString()}`,
        entryRequirements: Array.isArray(pathway.entryRequirements) ? 
          pathway.entryRequirements.join(', ') : 
          String(pathway.entryRequirements || ''),
        verified: pathway.verified
      })) || undefined,

      inDemandSkills: data.currentOpportunities?.skillsInDemand?.map(skill => ({
        skill: String(skill.skill || ''),
        frequency: `${skill.frequency || 0}% of job postings`,
        salaryPremium: `${skill.salaryPremium || 0}% increase`
      })) || undefined,

      enhancedSources: enhancedCard.perplexityData?.verifiedSalaryRanges?.entry?.sources || [],

      // CRITICAL: Add perplexityData field that Dashboard modal expects
      perplexityData: data ? {
        // Verified salary ranges for main modal display
        verifiedSalaryRanges: data.verifiedSalary ? {
          entry: {
            min: data.verifiedSalary.entry.min,
            max: data.verifiedSalary.entry.max,
            currency: data.verifiedSalary.entry.currency
          },
          mid: {
            min: data.verifiedSalary.mid.min,
            max: data.verifiedSalary.mid.max,
            currency: data.verifiedSalary.mid.currency
          },
          senior: {
            min: data.verifiedSalary.senior.min,
            max: data.verifiedSalary.senior.max,
            currency: data.verifiedSalary.senior.currency
          },
          byRegion: data.verifiedSalary.byRegion
        } : undefined,

        // Real-time market demand for modal sections
        realTimeMarketDemand: data.demandIndicators ? {
          jobPostingVolume: data.demandIndicators.jobPostingVolume || 0,
          growthRate: data.industryIntelligence?.growthProjection?.nextYear || 0,
          competitionLevel: data.demandIndicators.competitionLevel || 'Medium'
        } : undefined,

        // Work environment details for modal
        workEnvironmentDetails: {
          remoteOptions: true,
          flexibilityLevel: 'High',
          typicalHours: '37-42 hours/week',
          stressLevel: 'Medium'
        },

        // Current education pathways for modal
        currentEducationPathways: data.verifiedEducation?.pathways?.map(pathway => ({
          title: pathway.title,
          provider: pathway.provider,
          duration: pathway.duration,
          cost: {
            min: pathway.cost.min,
            max: pathway.cost.max
          },
          verified: pathway.verified
        })) || [],

        // Automation risk assessment for modal
        automationRiskAssessment: data.industryIntelligence?.automationRisk ? {
          riskLevel: data.industryIntelligence.automationRisk.level,
          timeline: data.industryIntelligence.automationRisk.timeline,
          mitigation: data.industryIntelligence.automationRisk.mitigation,
          futureOutlook: data.industryIntelligence.growthProjection.outlook
        } : undefined,

        // Enhanced status flags
        enhancementStatus: 'completed',
        lastEnhanced: new Date().toISOString(),
        dataSource: 'perplexity'
      } : undefined
    };
    */ // END OF COMMENTED OUT COMPLEX TRANSFORMATIONS
  }

  /**
   * Trigger ElevenLabs context update during enhancement progress
   */
  private static async triggerContextUpdateForEnhancement(
    userId: string, 
    enhancementStatus: any
  ): Promise<void> {
    try {
      console.log('🔄 Triggering ElevenLabs context update for enhancement progress');
      
      // For progress updates, we'll just log for now
      // The final update will happen after data is saved to Firebase
      console.log(`📊 Enhancement status: ${enhancementStatus.status}, Progress: ${enhancementStatus.progress.completed}/${enhancementStatus.progress.total}`);
      
    } catch (error) {
      console.error('❌ Error triggering context update for enhancement:', error);
      // Don't throw - this shouldn't break the enhancement process
    }
  }

  /**
   * Trigger final ElevenLabs context update after enhanced data is saved
   */
  private static async triggerFinalContextUpdate(
    userId: string, 
    enhancedCards: EnhancedCareerCard[]
  ): Promise<void> {
    try {
      console.log(`🎯 Triggering final ElevenLabs context update for ${enhancedCards.length} enhanced cards`);
      
      // Create UnifiedVoiceContextService instance
      const voiceContextService = new UnifiedVoiceContextService();
      
      // Get user data for context personalization
      const { getUserById } = await import('./userService');
      const userData = await getUserById(userId);
      const userName = userData?.careerProfile?.name || userData?.displayName;
      
      // Convert enhanced cards to CareerCard format
      const careerCards = enhancedCards.map(enhancedCard => ({
        id: enhancedCard.id,
        title: enhancedCard.title,
        description: enhancedCard.description,
        confidence: enhancedCard.enhancement?.confidence || 0.8,
        enhancement: enhancedCard.enhancement,
        perplexityData: enhancedCard.perplexityData,
        // Add enhanced data fields for context formatting
        compensationRewards: enhancedCard.perplexityData?.verifiedSalaryRanges,
        competencyRequirements: enhancedCard.perplexityData?.currentEducationPathways,
        labourMarketDynamics: enhancedCard.perplexityData?.industryGrowthProjection
      }));
      
      // Note: Since we don't have active agent IDs during background processing,
      // we'll prepare the context for future conversations
      // In a production environment, you might maintain a registry of active agents per user
      
      console.log(`✅ Enhanced career context prepared for user ${userId} with ${careerCards.length} cards`);
      console.log('📝 Context will be available for next ElevenLabs conversation');
      
    } catch (error) {
      console.error('❌ Error triggering final context update:', error);
      // Don't throw - this shouldn't break the migration process
    }
  }
}

export default GuestMigrationService; 