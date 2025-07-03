import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Define the types for our store
interface UserProgress {
  videosWatched: string[];
  totalWatchTime: number;
  completedQuests: string[];
  selectedPaths: string[];
  skills: Record<string, number>; // Skill name -> proficiency level (0-100)
}

interface AppState {
  // User progress
  userProgress: UserProgress;
  
  // UI state
  isDarkMode: boolean;
  
  // Video feed state
  currentVideo: string | null;
  
  // Actions
  addWatchedVideo: (videoId: string, watchTime: number) => void;
  completeQuest: (questId: string) => void;
  selectPath: (pathId: string) => void;
  updateSkill: (skillId: string, level: number) => void;
  setDarkMode: (isDark: boolean) => void;
  setCurrentVideo: (videoId: string | null) => void;
  resetProgress: () => void;
}

// Create the store
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      userProgress: {
        videosWatched: [],
        totalWatchTime: 0,
        completedQuests: [],
        selectedPaths: [],
        skills: {}
      },
      isDarkMode: false,
      currentVideo: null,
      
      // Actions
      addWatchedVideo: (videoId, watchTime) => set((state) => ({
        userProgress: {
          ...state.userProgress,
          videosWatched: state.userProgress.videosWatched.includes(videoId) 
            ? state.userProgress.videosWatched 
            : [...state.userProgress.videosWatched, videoId],
          totalWatchTime: state.userProgress.totalWatchTime + watchTime
        }
      })),
      
      completeQuest: (questId) => set((state) => ({
        userProgress: {
          ...state.userProgress,
          completedQuests: state.userProgress.completedQuests.includes(questId)
            ? state.userProgress.completedQuests
            : [...state.userProgress.completedQuests, questId]
        }
      })),
      
      selectPath: (pathId) => set((state) => ({
        userProgress: {
          ...state.userProgress,
          selectedPaths: state.userProgress.selectedPaths.includes(pathId)
            ? state.userProgress.selectedPaths
            : [...state.userProgress.selectedPaths, pathId]
        }
      })),
      
      updateSkill: (skillId, level) => set((state) => ({
        userProgress: {
          ...state.userProgress,
          skills: {
            ...state.userProgress.skills,
            [skillId]: level
          }
        }
      })),
      
      setDarkMode: (isDark) => set({ isDarkMode: isDark }),
      
      setCurrentVideo: (videoId) => set({ 
        currentVideo: videoId 
      }),
      
      resetProgress: () => set({
        userProgress: {
          videosWatched: [],
          totalWatchTime: 0,
          completedQuests: [],
          selectedPaths: [],
          skills: {}
        }
      })
    }),
    {
      name: 'off-script-storage',
    }
  )
);
