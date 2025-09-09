/**
 * UserPersonaService - Manages persona classification data for registered users
 * Provides continuity of persona-based guidance across sessions for registered users
 */

import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { PersonaType, PersonaProfile, PersonaClassification, personaService } from './personaService';

export interface UserPersonaData {
  userId: string;
  classification: PersonaClassification;
  analysisHistory: Array<{
    timestamp: string;
    messageCount: number;
    classification: PersonaClassification;
  }>;
  onboarding: {
    currentStage: string;
    isComplete: boolean;
    journeyStage: string;
  };
  recommendations: any;
  triggers: Array<{
    type: string;
    signal: string;
    weight: number;
    personaIndicator: PersonaType[];
    messageIndex: number;
    confidence: number;
  }>;
  migratedFromGuest: boolean;
  guestSessionId?: string;
  migratedAt?: any;
  createdAt: string;
  updatedAt: string;
}

/**
 * Service for managing persona data for registered users
 */
export class UserPersonaService {
  
  /**
   * Get persona profile for a registered user
   */
  static async getUserPersonaProfile(userId: string): Promise<UserPersonaData | null> {
    try {
      const personaRef = doc(db, 'userPersonaProfiles', userId);
      const personaSnap = await getDoc(personaRef);
      
      if (personaSnap.exists()) {
        const data = personaSnap.data() as UserPersonaData;
        console.log('📊 Retrieved persona profile for user:', {
          userId: userId.substring(0, 8) + '...',
          persona: personaService.getPersonaDisplayName(data.classification.type),
          confidence: Math.round(data.classification.confidence * 100) + '%',
          stage: data.classification.stage,
          analysisCount: data.analysisHistory.length
        });
        return data;
      }
      
      console.log('📝 No persona profile found for user:', userId.substring(0, 8) + '...');
      return null;
    } catch (error) {
      console.error('❌ Error retrieving user persona profile:', error);
      return null;
    }
  }

  /**
   * Update persona classification for a registered user
   */
  static async updateUserPersonaClassification(
    userId: string, 
    newClassification: PersonaClassification,
    conversationAnalysis?: any
  ): Promise<void> {
    try {
      const personaRef = doc(db, 'userPersonaProfiles', userId);
      const existingData = await this.getUserPersonaProfile(userId);
      
      if (existingData) {
        // Update existing profile
        const updatedData = {
          ...existingData,
          classification: newClassification,
          analysisHistory: [
            ...existingData.analysisHistory,
            {
              timestamp: new Date().toISOString(),
              messageCount: conversationAnalysis?.messageCount || 0,
              classification: newClassification
            }
          ],
          updatedAt: new Date().toISOString()
        };
        
        await updateDoc(personaRef, updatedData);
        
        // Update user document with latest persona info
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          personaType: newClassification.type,
          personaConfidence: newClassification.confidence,
          personaLastUpdated: serverTimestamp()
        });
        
        console.log('✅ Updated persona classification for user:', {
          userId: userId.substring(0, 8) + '...',
          newPersona: personaService.getPersonaDisplayName(newClassification.type),
          confidence: Math.round(newClassification.confidence * 100) + '%',
          stage: newClassification.stage
        });
        
      } else {
        // Create new persona profile (shouldn't happen for registered users, but handle gracefully)
        console.warn('⚠️ Creating new persona profile for registered user (unexpected)');
        await this.createUserPersonaProfile(userId, newClassification, conversationAnalysis);
      }
      
    } catch (error) {
      console.error('❌ Error updating user persona classification:', error);
    }
  }

  /**
   * Create initial persona profile for a registered user
   */
  static async createUserPersonaProfile(
    userId: string,
    classification: PersonaClassification,
    conversationAnalysis?: any
  ): Promise<void> {
    try {
      const personaRef = doc(db, 'userPersonaProfiles', userId);
      
      const personaData: UserPersonaData = {
        userId,
        classification,
        analysisHistory: [{
          timestamp: new Date().toISOString(),
          messageCount: conversationAnalysis?.messageCount || 0,
          classification
        }],
        onboarding: {
          currentStage: 'classification',
          isComplete: false,
          journeyStage: 'classification'
        },
        recommendations: personaService.generatePersonaRecommendations(
          classification.type,
          conversationAnalysis || {}
        ),
        triggers: [],
        migratedFromGuest: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(personaRef, personaData);
      
      // Update user document
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        personaType: classification.type,
        personaConfidence: classification.confidence,
        onboardingStage: 'classification',
        hasPersonaProfile: true,
        personaLastUpdated: serverTimestamp()
      });
      
      console.log('✅ Created persona profile for registered user:', {
        userId: userId.substring(0, 8) + '...',
        persona: personaService.getPersonaDisplayName(classification.type),
        confidence: Math.round(classification.confidence * 100) + '%'
      });
      
    } catch (error) {
      console.error('❌ Error creating user persona profile:', error);
    }
  }

  /**
   * Check if a user has persona classification data
   */
  static async hasPersonaProfile(userId: string): Promise<boolean> {
    try {
      const personaRef = doc(db, 'userPersonaProfiles', userId);
      const personaSnap = await getDoc(personaRef);
      return personaSnap.exists();
    } catch (error) {
      console.error('❌ Error checking user persona profile:', error);
      return false;
    }
  }

  /**
   * Get persona-based conversation overrides for registered users
   */
  static async getPersonaConversationContext(userId: string): Promise<{
    hasPersona: boolean;
    personaType?: PersonaType;
    confidence?: number;
    recommendations?: any;
    onboardingStage?: string;
  }> {
    try {
      const personaData = await this.getUserPersonaProfile(userId);
      
      if (personaData) {
        return {
          hasPersona: true,
          personaType: personaData.classification.type,
          confidence: personaData.classification.confidence,
          recommendations: personaData.recommendations,
          onboardingStage: personaData.onboarding.currentStage
        };
      }
      
      return { hasPersona: false };
    } catch (error) {
      console.error('❌ Error getting persona conversation context:', error);
      return { hasPersona: false };
    }
  }

  /**
   * Update onboarding stage for registered user
   */
  static async updateOnboardingStage(
    userId: string, 
    newStage: string
  ): Promise<void> {
    try {
      const personaRef = doc(db, 'userPersonaProfiles', userId);
      await updateDoc(personaRef, {
        'onboarding.currentStage': newStage,
        updatedAt: new Date().toISOString()
      });
      
      // Update user document
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        onboardingStage: newStage
      });
      
      console.log('🎯 Updated onboarding stage for user:', {
        userId: userId.substring(0, 8) + '...',
        newStage
      });
      
    } catch (error) {
      console.error('❌ Error updating onboarding stage:', error);
    }
  }

  /**
   * Complete onboarding for registered user
   */
  static async completeOnboarding(userId: string): Promise<void> {
    try {
      const personaRef = doc(db, 'userPersonaProfiles', userId);
      await updateDoc(personaRef, {
        'onboarding.isComplete': true,
        'onboarding.currentStage': 'journey_active',
        'onboarding.journeyStage': 'journey_active',
        updatedAt: new Date().toISOString()
      });
      
      // Update user document
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        onboardingStage: 'journey_active'
      });
      
      console.log('🎉 Completed onboarding for user:', userId.substring(0, 8) + '...');
      
    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
    }
  }
}

// Export the service
export { UserPersonaService as userPersonaService };