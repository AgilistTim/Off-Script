import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Import types from their actual locations
import { CareerCard, PersonProfile } from '../types/careerCard';
import { PersonaProfile, PersonaClassification, ConversationTrigger, PersonaTailoredRecommendations } from './personaService';

interface UserPersona {
  type: string;
  confidence: number;
  traits: string[];
  adaptations: {
    maxResponseLength: number;
    responseStyle: string;
    valueDeliveryTimeout: number;
    preferredActions: string[];
    conversationPace: string;
  };
}

interface UserProgress {
  videosWatched: string[];
  totalWatchTime: number;
  completedQuests: string[];
  selectedPaths: string[];
  skills: Record<string, number>; // Skill name -> proficiency level (0-100)
}

// Guest session data structure
export interface GuestSession {
  sessionId: string;
  createdAt: string;
  lastActive: string;
  
  // Core conversation data
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  
  // AI analysis results  
  careerCards: CareerCard[];
  personProfile: PersonProfile | null;
  userPersona: UserPersona | null;
  
  // App usage data
  videoProgress: UserProgress;
  
  // MCP analysis cache
  analysisResults: Array<{
    timestamp: string;
    triggerReason: string;
    result: any;
  }>;
  
  // User engagement metrics
  engagementMetrics: {
    messageCount: number;
    careerCardsGenerated: number;
    sessionsWithActivity: number;
    lastCareerAnalysis: string | null;
  };

  // Persona-based onboarding data
  personaProfile?: PersonaProfile | null;
  onboardingStage: 'initial' | 'discovery' | 'classification' | 'tailored_guidance' | 'journey_active' | 'complete';
  classificationTriggers: ConversationTrigger[];
  personaAnalysisHistory: Array<{
    timestamp: string;
    classification: PersonaClassification;
    messageCount: number;
  }>;

  // Structured Q1-Q6 questionnaire onboarding
  structuredOnboarding?: {
    currentQuestion: string | null;
    responses: Array<{
      questionId: string;
      response: string | number;
      timestamp: Date;
    }>;
    stage: 'q1' | 'q2' | 'q2_details' | 'q3' | 'q4' | 'q5' | 'q6' | 'complete';
    tentativePersona: 'uncertain' | 'exploring' | 'decided' | null;
    hasSpecificCareer: boolean;
    isComplete: boolean;
  };
}

// Guest session actions
interface GuestSessionActions {
  // Core session management
  initializeSession: () => void;
  updateLastActive: () => void;
  clearSession: () => void;
  
  // Conversation management
  addConversationMessage: (role: 'user' | 'assistant', content: string) => void;
  getConversationHistory: () => GuestSession['conversationHistory'];
  
  // Career data management
  addCareerCards: (cards: CareerCard[]) => void;
  updatePersonProfile: (profile: PersonProfile) => void;
  updateUserPersona: (persona: UserPersona) => void;
  
  // Video progress
  updateVideoProgress: (progress: Partial<UserProgress>) => void;
  
  // Analysis results
  addAnalysisResult: (triggerReason: string, result: any) => void;
  
  // Engagement tracking
  incrementMessageCount: () => void;
  recordCareerAnalysis: () => void;
  
  // Migration helpers
  getSessionForMigration: () => GuestSession;
  hasSignificantData: () => boolean;

  // Persona-based onboarding actions
  updateOnboardingStage: (stage: GuestSession['onboardingStage']) => void;
  setPersonaProfile: (profile: PersonaProfile) => void;
  addClassificationTrigger: (trigger: ConversationTrigger) => void;
  addPersonaAnalysis: (classification: PersonaClassification) => void;
  getPersonaProfile: () => PersonaProfile | null;
  getCurrentOnboardingStage: () => GuestSession['onboardingStage'];
  shouldTriggerPersonaAnalysis: () => boolean;
  
  // Structured onboarding actions
  updateSession: (sessionUpdates: Partial<GuestSession>) => void;
}

// Create guest session store with persistence
const useGuestSessionStore = create<GuestSession & GuestSessionActions>()(
  persist(
    (set, get) => ({
      // Initial state
      sessionId: '',
      createdAt: '',
      lastActive: '',
      conversationHistory: [],
      careerCards: [],
      personProfile: null,
      userPersona: null,
      videoProgress: {
        videosWatched: [],
        totalWatchTime: 0,
        completedQuests: [],
        selectedPaths: [],
        skills: {}
      },
      analysisResults: [],
      engagementMetrics: {
        messageCount: 0,
        careerCardsGenerated: 0,
        sessionsWithActivity: 1,
        lastCareerAnalysis: null
      },

      // Persona-based onboarding initial state
      personaProfile: null,
      onboardingStage: 'initial',
      classificationTriggers: [],
      personaAnalysisHistory: [],

      // Actions
      initializeSession: () => {
        const state = get();
        if (!state.sessionId) {
          const now = new Date().toISOString();
          const sessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          set({
            sessionId,
            createdAt: now,
            lastActive: now
          });
          
          console.log('✅ Guest session initialized:', sessionId);
        } else {
          // Update existing session activity
          set({ lastActive: new Date().toISOString() });
        }
      },

      updateLastActive: () => {
        set({ lastActive: new Date().toISOString() });
      },

      clearSession: () => {
        set({
          sessionId: '',
          createdAt: '',
          lastActive: '',
          conversationHistory: [],
          careerCards: [],
          personProfile: null,
          userPersona: null,
          analysisResults: [],
          engagementMetrics: {
            messageCount: 0,
            careerCardsGenerated: 0,
            sessionsWithActivity: 0,
            lastCareerAnalysis: null
          },
          // Reset persona fields
          personaProfile: null,
          onboardingStage: 'initial',
          classificationTriggers: [],
          personaAnalysisHistory: []
        });
        console.log('🧹 Guest session cleared');
      },

      addConversationMessage: (role: 'user' | 'assistant', content: string) => {
        const state = get();
        const message = {
          role,
          content: content.trim(),
          timestamp: new Date().toISOString()
        };
        
        // Avoid duplicates
        const lastMessage = state.conversationHistory[state.conversationHistory.length - 1];
        if (lastMessage?.content === content.trim() && lastMessage?.role === role) {
          return;
        }
        
        set({
          conversationHistory: [...state.conversationHistory, message],
          lastActive: new Date().toISOString()
        });
        
        console.log('💾 [GUEST SESSION] Message added to conversation history:', {
          role: message.role,
          messagePreview: message.content.substring(0, 50) + '...',
          totalMessages: state.conversationHistory.length + 1,
          sessionId: state.sessionId
        });
        
        if (role === 'user') {
          get().incrementMessageCount();
        }
      },

      getConversationHistory: () => {
        return get().conversationHistory;
      },

      addCareerCards: (cards: CareerCard[]) => {
        const state = get();
        
        // Deduplicate by title (case-insensitive)
        const existingTitles = new Set(
          state.careerCards.map(card => card.title.toLowerCase().trim())
        );
        
        const newCards = cards.filter(card => 
          !existingTitles.has(card.title.toLowerCase().trim())
        );
        
        if (newCards.length > 0) {
          set({
            careerCards: [...state.careerCards, ...newCards],
            lastActive: new Date().toISOString(),
            engagementMetrics: {
              ...state.engagementMetrics,
              careerCardsGenerated: state.engagementMetrics.careerCardsGenerated + newCards.length
            }
          });
          
          console.log(`📋 Added ${newCards.length} new career cards to guest session`);
        }
      },

      updatePersonProfile: (profile: PersonProfile) => {
        const state = get();
        
        // Merge with existing profile if present
        const mergedProfile: PersonProfile = state.personProfile ? {
          name: profile.name || state.personProfile.name, // Use new name if provided, keep existing if not
          interests: [...new Set([...state.personProfile.interests, ...profile.interests])],
          goals: [...new Set([...state.personProfile.goals, ...profile.goals])],
          skills: [...new Set([...state.personProfile.skills, ...profile.skills])],
          values: [...new Set([...state.personProfile.values, ...profile.values])],
          workStyle: [...new Set([...state.personProfile.workStyle, ...profile.workStyle])],
          careerStage: profile.careerStage !== "exploring" ? profile.careerStage : state.personProfile.careerStage,
          lastUpdated: profile.lastUpdated
        } : profile;
        
        set({
          personProfile: mergedProfile,
          lastActive: new Date().toISOString()
        });
        
        console.log('👤 Updated person profile in guest session');
      },

      updateUserPersona: (persona: UserPersona) => {
        set({
          userPersona: persona,
          lastActive: new Date().toISOString()
        });
      },

      updateVideoProgress: (progress: Partial<UserProgress>) => {
        const state = get();
        set({
          videoProgress: { ...state.videoProgress, ...progress },
          lastActive: new Date().toISOString()
        });
      },

      addAnalysisResult: (triggerReason: string, result: any) => {
        const state = get();
        set({
          analysisResults: [...state.analysisResults, {
            timestamp: new Date().toISOString(),
            triggerReason,
            result
          }],
          lastActive: new Date().toISOString()
        });
      },

      incrementMessageCount: () => {
        const state = get();
        set({
          engagementMetrics: {
            ...state.engagementMetrics,
            messageCount: state.engagementMetrics.messageCount + 1
          }
        });
      },

      recordCareerAnalysis: () => {
        const state = get();
        set({
          engagementMetrics: {
            ...state.engagementMetrics,
            lastCareerAnalysis: new Date().toISOString()
          }
        });
      },

      getSessionForMigration: () => {
        const session = get();
        // Only log on first call and major milestones to reduce spam
        const shouldLog = (
          session.conversationHistory.length === 1 || // First message
          session.conversationHistory.length % 10 === 0 || // Every 10 messages
          (session.careerCards.length > 0 && session.conversationHistory.length % 20 === 0) // Less frequent when cards exist
        );
        
        // Temporarily disabled to reduce log spam - TODO: implement proper rate limiting
        if (false && shouldLog) {
          console.log('📤 [GUEST SESSION] Retrieved session for migration:', {
            sessionId: session.sessionId,
            conversationHistoryLength: session.conversationHistory.length,
            careerCardsCount: session.careerCards.length,
            hasPersonProfile: !!session.personProfile,
            sampleMessages: session.conversationHistory.slice(0, 2).map(msg => ({
              role: msg.role,
              preview: msg.content.substring(0, 30) + '...'
            }))
          });
        }
        return session;
      },

      hasSignificantData: () => {
        const state = get();
        const result = (
          state.careerCards.length > 0 || 
          state.conversationHistory.length >= 4 || // At least 2 exchanges
          (state.personProfile && (
            state.personProfile.interests.length > 0 || 
            state.personProfile.goals.length > 0
          )) ||
          state.videoProgress.videosWatched.length > 0
        );
        
        // Rate-limited logging to prevent spam - only log on state changes or errors
        const currentStateHash = `${state.careerCards.length}-${state.conversationHistory.length}-${state.personProfile?.interests?.length || 0}-${state.personProfile?.goals?.length || 0}`;
        const lastStateHash = (state as any)._lastSignificantDataHash;
        
        if (currentStateHash !== lastStateHash) {
          // Only log when significant data state actually changes
          console.log('🔍 hasSignificantData() - state changed:', {
            careerCardsCount: state.careerCards.length,
            conversationCount: state.conversationHistory.length,
            hasPersonProfile: !!state.personProfile,
            personProfileInterests: state.personProfile?.interests?.length || 0,
            personProfileGoals: state.personProfile?.goals?.length || 0,
            videosWatchedCount: state.videoProgress.videosWatched.length,
            finalResult: result
          });
          
          // Store hash to prevent duplicate logging
          set({ ...(state as any), _lastSignificantDataHash: currentStateHash });
        }
        
        return result;
      },

      // Persona-based onboarding actions
      updateOnboardingStage: (stage: GuestSession['onboardingStage']) => {
        const state = get();
        set({
          onboardingStage: stage,
          lastActive: new Date().toISOString()
        });
        console.log('🎯 Onboarding stage updated:', { from: state.onboardingStage, to: stage });
      },

      setPersonaProfile: (profile: PersonaProfile) => {
        set({
          personaProfile: profile,
          lastActive: new Date().toISOString()
        });
        console.log('👤 Persona profile set:', {
          type: profile.classification.type,
          confidence: Math.round(profile.classification.confidence * 100) + '%',
          stage: profile.journeyStage
        });
      },

      addClassificationTrigger: (trigger: ConversationTrigger) => {
        const state = get();
        set({
          classificationTriggers: [...state.classificationTriggers, trigger],
          lastActive: new Date().toISOString()
        });
        console.log('🎯 Classification trigger added:', {
          type: trigger.type,
          signal: trigger.signal.substring(0, 50),
          personaIndicator: trigger.personaIndicator
        });
      },

      addPersonaAnalysis: (classification: PersonaClassification) => {
        const state = get();
        set({
          personaAnalysisHistory: [...state.personaAnalysisHistory, {
            timestamp: new Date().toISOString(),
            classification,
            messageCount: state.conversationHistory.length
          }],
          lastActive: new Date().toISOString()
        });
        console.log('📊 Persona analysis added to history:', {
          type: classification.type,
          confidence: Math.round(classification.confidence * 100) + '%',
          totalAnalyses: state.personaAnalysisHistory.length + 1
        });
      },

      getPersonaProfile: () => {
        return get().personaProfile;
      },

      getCurrentOnboardingStage: () => {
        return get().onboardingStage;
      },

      shouldTriggerPersonaAnalysis: () => {
        const state = get();
        
        // Trigger conditions:
        // 1. At least 2 user messages (1 exchange)
        // 2. Every 2 messages after that for refinement
        // 3. Not already in journey_active or complete stage
        
        const userMessages = state.conversationHistory.filter(msg => msg.role === 'user').length;
        const lastAnalysis = state.personaAnalysisHistory[state.personaAnalysisHistory.length - 1];
        const messagesSinceLastAnalysis = lastAnalysis ? userMessages - lastAnalysis.messageCount : userMessages;
        
        const shouldTrigger = (
          userMessages >= 2 && // At least one exchange
          messagesSinceLastAnalysis >= 2 && // New content to analyze
          !['journey_active', 'complete'].includes(state.onboardingStage) // Still in onboarding
        );
        
        console.log('🤔 Should trigger persona analysis?', {
          userMessages,
          messagesSinceLastAnalysis,
          currentStage: state.onboardingStage,
          lastAnalysisMessageCount: lastAnalysis?.messageCount || 0,
          shouldTrigger
        });
        
        return shouldTrigger;
      },

      // Structured onboarding actions
      updateSession: (sessionUpdates: Partial<GuestSession>) => {
        const state = get();
        set({
          ...sessionUpdates,
          lastActive: new Date().toISOString()
        });
        console.log('📝 Session updated with structured onboarding data:', {
          updatedFields: Object.keys(sessionUpdates),
          structuredOnboarding: sessionUpdates.structuredOnboarding
        });
      }
    }),
    {
      name: 'guest-session-storage',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      
      // Only persist essential data to keep localStorage light
      partialize: (state) => ({
        sessionId: state.sessionId,
        createdAt: state.createdAt,
        lastActive: state.lastActive,
        conversationHistory: state.conversationHistory,
        careerCards: state.careerCards,
        personProfile: state.personProfile,
        userPersona: state.userPersona,
        videoProgress: state.videoProgress,
        engagementMetrics: state.engagementMetrics,
        // Persist persona onboarding data
        personaProfile: state.personaProfile,
        onboardingStage: state.onboardingStage,
        classificationTriggers: state.classificationTriggers,
        personaAnalysisHistory: state.personaAnalysisHistory,
        // Persist structured onboarding data
        structuredOnboarding: state.structuredOnboarding,
        // Skip analysisResults to keep storage light
      }),
      
      // Handle storage version migration
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Handle migration from version 0 if needed in future
        }
        return persistedState;
      }
    }
  )
);

// Service class for easier usage
export class GuestSessionService {
  private store = useGuestSessionStore;

  constructor() {
    // Auto-initialize session on service creation
    this.store.getState().initializeSession();
  }

  // Ensure a non-empty sessionId exists; create one if missing
  ensureSession(): void {
    if (!this.store.getState().sessionId) {
      this.store.getState().initializeSession();
    } else {
      this.store.getState().updateLastActive();
    }
  }

  // Session management
  getSessionId(): string {
    return this.store.getState().sessionId;
  }

  clearSession(): void {
    this.store.getState().clearSession();
  }

  updateActivity(): void {
    this.store.getState().updateLastActive();
  }

  // Data management methods
  addConversationMessage(role: 'user' | 'assistant', content: string): void {
    this.store.getState().addConversationMessage(role, content);
  }

  addCareerCards(cards: CareerCard[]): void {
    this.store.getState().addCareerCards(cards);
  }

  updatePersonProfile(profile: PersonProfile): void {
    this.store.getState().updatePersonProfile(profile);
  }

  updateUserPersona(persona: UserPersona): void {
    this.store.getState().updateUserPersona(persona);
  }

  updateVideoProgress(progress: Partial<UserProgress>): void {
    this.store.getState().updateVideoProgress(progress);
  }

  // Migration helpers
  getGuestSession(): GuestSession {
    return this.store.getState().getSessionForMigration();
  }

  hasSignificantData(): boolean {
    return this.store.getState().hasSignificantData();
  }

  // Analytics
  getEngagementMetrics(): GuestSession['engagementMetrics'] {
    return this.store.getState().engagementMetrics;
  }

  // Name helper for ElevenLabs integration
  getGuestName(): string | null {
    return this.store.getState().personProfile?.name || null;
  }

  // Persona-based onboarding methods
  updateOnboardingStage(stage: GuestSession['onboardingStage']): void {
    this.store.getState().updateOnboardingStage(stage);
  }

  setPersonaProfile(profile: PersonaProfile): void {
    this.store.getState().setPersonaProfile(profile);
  }

  addClassificationTrigger(trigger: ConversationTrigger): void {
    this.store.getState().addClassificationTrigger(trigger);
  }

  addPersonaAnalysis(classification: PersonaClassification): void {
    this.store.getState().addPersonaAnalysis(classification);
  }

  getPersonaProfile(): PersonaProfile | null {
    return this.store.getState().getPersonaProfile();
  }

  getCurrentOnboardingStage(): GuestSession['onboardingStage'] {
    return this.store.getState().getCurrentOnboardingStage();
  }

  shouldTriggerPersonaAnalysis(): boolean {
    return this.store.getState().shouldTriggerPersonaAnalysis();
  }

  // Structured onboarding methods
  updateSession(sessionUpdates: Partial<GuestSession>): void {
    this.store.getState().updateSession(sessionUpdates);
  }

  // Convenience methods for persona workflow
  getConversationForAnalysis(): Array<{role: string; content: string; timestamp: string}> {
    return this.store.getState().getConversationHistory();
  }

  isPersonaClassified(): boolean {
    const profile = this.getPersonaProfile();
    return profile?.classification?.stage === 'confirmed';
  }

  getPersonaRecommendations(): PersonaTailoredRecommendations | null {
    return this.getPersonaProfile()?.recommendations || null;
  }
}

// Export singleton instance
export const guestSessionService = new GuestSessionService();

// Export store hook for React components
export { useGuestSessionStore }; 