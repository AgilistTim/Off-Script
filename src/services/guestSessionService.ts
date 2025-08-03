import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Import types from their actual locations
import { CareerCard, PersonProfile } from '../types/careerCard';

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
          }
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
        return get();
      },

      hasSignificantData: () => {
        const state = get();
        return (
          state.careerCards.length > 0 || 
          state.conversationHistory.length >= 4 || // At least 2 exchanges
          (state.personProfile && (
            state.personProfile.interests.length > 0 || 
            state.personProfile.goals.length > 0
          )) ||
          state.videoProgress.videosWatched.length > 0
        );
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
}

// Export singleton instance
export const guestSessionService = new GuestSessionService();

// Export store hook for React components
export { useGuestSessionStore }; 