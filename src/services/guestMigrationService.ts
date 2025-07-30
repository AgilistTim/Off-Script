import { 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  collection, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { guestSessionService, GuestSession } from './guestSessionService';
import { updateUserProfile } from './userService';
import { UserProfile } from '../models/User';

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
      if (guestSession.conversationHistory.length > 0) {
        migrationTasks.push(
          this.transferConversationHistory(userId, guestSession)
            .then(count => {
              migrationRecord.dataTransferred.conversationMessages = count;
            })
        );
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
      // Convert guest profile to UserProfile format
      const userProfile: Partial<UserProfile> = {
        interests: guestProfile.interests.length > 0 ? guestProfile.interests : undefined,
        careerGoals: guestProfile.goals.length > 0 ? guestProfile.goals : undefined,
        skills: guestProfile.skills.length > 0 ? guestProfile.skills : undefined,
        // Note: UserProfile doesn't have values or workStyle fields, 
        // but we could add them to a custom section
      };

      // Only update with non-empty fields
      const fieldsToUpdate = Object.entries(userProfile)
        .filter(([_, value]) => value !== undefined && value !== null)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

      if (Object.keys(fieldsToUpdate).length > 0) {
        await updateUserProfile(userId, fieldsToUpdate);
        console.log('✅ Transferred person profile to user document');
        return Object.keys(fieldsToUpdate);
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
        await this.createMigrationChatSummary(userId, migrationThreadRef.id, guestSession);
        console.log('✅ Created chat summary for migrated conversation');
      } catch (summaryError) {
        console.warn('⚠️ Could not create chat summary for migration (non-critical):', summaryError);
      }

      console.log(`✅ Transferred ${messageCount} conversation messages`);
      return messageCount;
      
    } catch (error) {
      console.error('Error transferring conversation history:', error);
      return 0;
    }
  }

  /**
   * Transfer career cards to career explorations collection
   */
  private static async transferCareerCards(
    userId: string,
    guestSession: GuestSession
  ): Promise<number> {
    const careerCards = guestSession.careerCards;
    if (careerCards.length === 0) return 0;

    try {
      let transferredCount = 0;

      // Create a career exploration document for the migrated cards
      const explorationRef = doc(collection(db, 'careerExplorations'));
      
      // Prepare career cards with regular timestamps (not serverTimestamp in arrays)
      const now = new Date();
      const processedCards = careerCards.map(card => ({
        ...card,
        discoveredAt: now.toISOString(),
        source: 'guest_migration'
      }));
      
      await setDoc(explorationRef, {
        userId,
        title: 'Guest Session Career Discoveries',
        description: 'Career cards discovered during guest session',
        createdAt: serverTimestamp(),
        careerCards: processedCards,
        cardCount: careerCards.length,
        migrationSource: 'guest_session',
        explorationComplete: true,
        // Include person profile if available for dashboard display
        personProfile: guestSession.personProfile || null,
        // Include engagement metrics for context
        engagementMetrics: guestSession.engagementMetrics || null
      });

      transferredCount = careerCards.length;
      console.log(`✅ Transferred ${transferredCount} career cards`);
      return transferredCount;
      
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
        `Career goals: ${guestSession.personProfile?.careerGoals?.join(', ') || 'Not specified'}.`,
        'Full conversation data has been preserved for detailed analysis.'
      ].join(' ');

      // Create chat summary document
      const summaryDoc = {
        id: `${threadId}_summary`,
        threadId,
        userId,
        summary,
        interests: guestSession.personProfile?.interests || [],
        careerGoals: guestSession.personProfile?.careerGoals || [],
        skills: guestSession.personProfile?.skills || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        messageCount: guestSession.conversationHistory.length,
        isMigrated: true,
        migrationSource: 'guest_session',
        guestSessionId: guestSession.sessionId,
        // Include additional context for career guidance generation
        conversationContext: {
          careerCardsGenerated: guestSession.careerCards?.length || 0,
          userEngagement: guestSession.engagementMetrics || {},
          sessionDuration: 'guest_session'
        }
      };

      await setDoc(doc(db, 'chatSummaries', summaryDoc.id), summaryDoc);
      console.log('✅ Chat summary created for migrated conversation:', summaryDoc.id);
      
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
   * Initialize enhanced user preferences with guest insights
   */
  private static async initializeEnhancedUserPreferences(
    userId: string,
    guestSession: GuestSession
  ): Promise<void> {
    try {
      const userPrefsRef = doc(db, 'userPreferences', userId);
      const existingPrefs = await getDoc(userPrefsRef);
      
      const enhancedData = {
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
        await updateDoc(userPrefsRef, enhancedData);
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
          ...enhancedData
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
}

export default GuestMigrationService; 