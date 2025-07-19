import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useChatContext } from '../../context/ChatContext';
import { Mic, MicOff, Sparkles, TrendingUp, BookOpen, Users, PanelRightClose, PanelRightOpen, Play } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';

// Import our simplified components
import { ElevenLabsWidget } from '../conversation/ElevenLabsWidget';
import { CareerCardsPanel } from '../conversation/CareerCardsPanel';
import { UserPersona } from '../conversation/PersonaDetector';

// Import progressive engagement types
import { EnhancedCareerProfile } from '../../services/careerProfileBuilder';
import { CareerInsight } from '../../services/conversationAnalyzer';

// Import UI components
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { RegistrationPrompt } from '../conversation/RegistrationPrompt';
import { PersonCard } from '../conversation/PersonCard';

interface PersonProfile {
  interests: string[];
  goals: string[];
  skills: string[];
  values: string[];
  careerStage: string;
  workStyle: string[];
  lastUpdated: string;
}

interface CareerCard {
  id: string;
  title: string;
  description: string;
  industry: string;
  averageSalary: {
    entry: string;
    experienced: string;
    senior: string;
  };
  growthOutlook: string;
  entryRequirements: string[];
  trainingPathways: string[];
  keySkills: string[];
  workEnvironment: string;
  nextSteps: string[];
  confidence: number;
  sourceData: string;
  location: string;
  generatedAt: string;
}

interface ConversationViewProps {
  className?: string;
}

export const ConversationView: React.FC<ConversationViewProps> = ({ className }) => {
  const { currentUser } = useAuth();
  const { messages } = useChatContext();
  const [userPersona, setUserPersona] = useState<UserPersona>({
    type: 'curious_achiever',
    confidence: 0.7,
    traits: [],
    adaptations: {
      maxResponseLength: 150,
      responseStyle: 'encouraging',
      valueDeliveryTimeout: 8000,
      preferredActions: ['explore', 'learn'],
      conversationPace: 'moderate'
    }
  });
  
  // Career cards state
  const [careerCards, setCareerCards] = useState<CareerCard[]>([]);
  const [hasStartedConversation, setHasStartedConversation] = useState(false);
  
  // Person profile state
  const [personProfile, setPersonProfile] = useState<PersonProfile | null>(null);
  
  // Registration prompt state
  const [showRegistrationPrompt, setShowRegistrationPrompt] = useState(false);
  const [userEngagementCount, setUserEngagementCount] = useState(0);
  
  // Toast nag state
  const [toastNagShown, setToastNagShown] = useState(false);
  const [toastNagDismissed, setToastNagDismissed] = useState(false);
  const toastNagTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Progressive engagement state (legacy - keeping for compatibility)
  const [careerProfile, setCareerProfile] = useState<EnhancedCareerProfile | null>(null);
  const [showInsightsPanel, setShowInsightsPanel] = useState(false);
  const [newInsights, setNewInsights] = useState<CareerInsight[]>([]);

  // Toast nag functions - defined early to avoid dependency issues
  const handleTemporaryDismiss = useCallback(() => {
    setToastNagDismissed(true);
    if (toastNagTimer.current) {
      clearInterval(toastNagTimer.current);
    }
  }, []);

  const handlePermanentDismiss = useCallback(() => {
    setToastNagDismissed(true);
    localStorage.setItem('career-nag-dismissed', Date.now().toString());
    if (toastNagTimer.current) {
      clearInterval(toastNagTimer.current);
    }
  }, []);

  // Handle registration
  const handleRegister = useCallback(() => {
    // Redirect to registration page or open auth modal
    window.location.href = '/register';
  }, []);

  const showProgressNagToast = useCallback(() => {
    console.log('🍞 SHOWING TOAST with', careerCards.length, 'career cards');
    toast((t) => (
      <div className="flex flex-col space-y-3 p-2 max-w-sm">
        <div className="flex items-start space-x-3">
          <div className="text-2xl">💼</div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900">Don't lose your career progress!</div>
            <div className="text-sm text-gray-600 mt-1">
              You've discovered {careerCards.length} career matches. Create an account to save them and unlock your personalized dashboard.
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button
            onClick={() => {
              toast.dismiss(t.id);
              handleRegister();
            }}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded-md"
          >
            Save Progress
          </Button>
          <Button
            onClick={() => {
              toast.dismiss(t.id);
              handleTemporaryDismiss();
            }}
            variant="outline"
            className="text-sm py-2 px-3 rounded-md"
          >
            Later
          </Button>
        </div>
        
        <button
          onClick={() => {
            toast.dismiss(t.id);
            handlePermanentDismiss();
          }}
          className="text-xs text-gray-400 hover:text-gray-600 text-center underline"
        >
          Don't show again
        </button>
      </div>
    ), {
      duration: Infinity, // Never auto-dismiss - user must choose an action
      position: 'top-center',
      style: {
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        padding: '0',
        maxWidth: '400px'
      }
    });
  }, [careerCards.length, handleRegister, handleTemporaryDismiss, handlePermanentDismiss]);

  // Test function for manual toast triggering (development only)
  const testToastNag = useCallback(() => {
    console.log('🧪 MANUAL TOAST TEST');
    showProgressNagToast();
  }, [showProgressNagToast]);

  // Check if conversation has started based on messages or career cards
  useEffect(() => {
    if (messages && messages.length > 0) {
      setHasStartedConversation(true);
    }
  }, [messages]);

  useEffect(() => {
    if (careerCards.length > 0) {
      setHasStartedConversation(true);
    }
  }, [careerCards]);

  // Toast nag system for account creation after 3 cards
  useEffect(() => {
    console.log('🍞 Toast nag check:', {
      careerCardsLength: careerCards.length,
      currentUser: !!currentUser,
      toastNagDismissed,
      toastNagShown,
      shouldTrigger: careerCards.length >= 3 && !currentUser && !toastNagDismissed && !toastNagShown
    });

    // Only show for unregistered users who haven't dismissed the nag
    if (currentUser) {
      console.log('🍞 Toast nag blocked: User is logged in');
      return;
    }
    
    if (toastNagDismissed) {
      console.log('🍞 Toast nag blocked: User dismissed it');
      return;
    }
    
    // Check if we have persistently dismissed this
    const persistentDismiss = localStorage.getItem('career-nag-dismissed');
    if (persistentDismiss) {
      const dismissTime = parseInt(persistentDismiss);
      const daysSinceDismiss = (Date.now() - dismissTime) / (1000 * 60 * 60 * 24);
      
      console.log('🍞 Persistent dismiss check:', { daysSinceDismiss, shouldShow: daysSinceDismiss >= 3 });
      
      // Show again after 3 days
      if (daysSinceDismiss < 3) {
        console.log('🍞 Toast nag blocked: Persistently dismissed within 3 days');
        setToastNagDismissed(true);
        return;
      }
    }

    // Trigger after 3 career cards
    if (careerCards.length >= 3 && !toastNagShown) {
      console.log('🍞 TRIGGERING TOAST NAG - Career cards >= 3!', {
        careerCardsLength: careerCards.length,
        toastNagShown
      });
      
      // Show initial toast immediately
      showProgressNagToast();
      setToastNagShown(true);
      
      // Set up recurring reminders every 2 minutes (not too annoying)
      toastNagTimer.current = setInterval(() => {
        if (!currentUser && !toastNagDismissed) {
          console.log('🍞 Recurring toast nag reminder');
          showProgressNagToast();
        }
      }, 120000); // 2 minutes
    } else {
      console.log('🍞 Toast nag not triggered yet:', {
        careerCardsLength: careerCards.length,
        needsAtLeast: 3,
        toastNagShown,
        reason: careerCards.length < 3 ? 'Not enough cards' : toastNagShown ? 'Already shown' : 'Unknown'
      });
    }

    // Cleanup timer
    return () => {
      if (toastNagTimer.current) {
        clearInterval(toastNagTimer.current);
      }
    };
  }, [careerCards.length, currentUser, toastNagDismissed, toastNagShown]); // Removed showProgressNagToast to break circular dependency

  // Handle career cards generated from ElevenLabs widget
  const handleCareerCardsGenerated = useCallback((newCards: CareerCard[]) => {
    console.log('🎯 ConversationView: Received career cards:', newCards.length);
    console.log('🎯 Current career cards before update:', careerCards.length);
    
    setCareerCards(prev => {
      // Combine previous and new cards
      const combined = [...prev, ...newCards];
      
      // Deduplicate by title (case-insensitive)
      const seen = new Set<string>();
      const deduplicated = combined.filter(card => {
        const normalizedTitle = card.title.toLowerCase().trim();
        if (seen.has(normalizedTitle)) {
          console.log('🔄 Removing duplicate career card:', {
            title: card.title,
            normalizedTitle,
            alreadySeen: Array.from(seen)
          });
          return false;
        }
        seen.add(normalizedTitle);
        return true;
      });
      
      console.log('✨ Career cards after deduplication:', {
        originalCount: combined.length,
        deduplicatedCount: deduplicated.length,
        duplicatesRemoved: combined.length - deduplicated.length,
        previousLength: prev.length,
        newCards: newCards.length,
        newTotal: deduplicated.length,
        allTitles: deduplicated.map(card => card.title)
      });
      
      // Log toast trigger conditions
      console.log('🍞 Toast trigger check after cards update:', {
        newCardsCount: deduplicated.length,
        willTriggerToast: deduplicated.length >= 3,
        currentUser: !!currentUser,
        toastNagShown,
        toastNagDismissed
      });
      
      return deduplicated;
    });
    
    setHasStartedConversation(true);
    
    // Track engagement - show registration prompt after user gets career cards
    setUserEngagementCount(prev => prev + 1);
  }, [careerCards.length, currentUser, toastNagShown, toastNagDismissed]); // Added dependencies for logging

  // Handle person profile generated/updated with upsert logic
  const handlePersonProfileGenerated = useCallback((newProfile: PersonProfile) => {
    console.log('👤 ConversationView: Received person profile:', newProfile);
    
    // Helper function to normalize data to arrays
    const normalizeToArray = (data: any): string[] => {
      if (Array.isArray(data)) return data;
      if (typeof data === 'string') {
        // Split by comma, semicolon, or newline and clean up
        return data.split(/[,;\n]/).map(item => item.trim()).filter(item => item.length > 0);
      }
      return [];
    };
    
    // Normalize incoming profile data
    const normalizedNewProfile: PersonProfile = {
      ...newProfile,
      interests: normalizeToArray(newProfile.interests),
      goals: normalizeToArray(newProfile.goals),
      skills: normalizeToArray(newProfile.skills),
      values: normalizeToArray(newProfile.values),
      workStyle: normalizeToArray(newProfile.workStyle)
    };
    
    setPersonProfile(prev => {
      if (!prev) {
        // No existing profile, use normalized new one
        console.log('👤 No existing profile, creating new one');
        return normalizedNewProfile;
      }
      
      // Normalize existing profile data as well
      const normalizedPrevProfile: PersonProfile = {
        ...prev,
        interests: normalizeToArray(prev.interests),
        goals: normalizeToArray(prev.goals),
        skills: normalizeToArray(prev.skills),
        values: normalizeToArray(prev.values),
        workStyle: normalizeToArray(prev.workStyle)
      };
      
      // Merge profiles with upsert logic using normalized arrays
      const mergedProfile: PersonProfile = {
        // Merge arrays, removing duplicates and keeping unique items
        interests: [...new Set([...normalizedPrevProfile.interests, ...normalizedNewProfile.interests])],
        goals: [...new Set([...normalizedPrevProfile.goals, ...normalizedNewProfile.goals])],
        skills: [...new Set([...normalizedPrevProfile.skills, ...normalizedNewProfile.skills])],
        values: [...new Set([...normalizedPrevProfile.values, ...normalizedNewProfile.values])],
        workStyle: [...new Set([...normalizedPrevProfile.workStyle, ...normalizedNewProfile.workStyle])],
        
        // Update career stage if new one is more specific (not "exploring")
        careerStage: normalizedNewProfile.careerStage !== "exploring" ? normalizedNewProfile.careerStage : normalizedPrevProfile.careerStage,
        
        // Use most recent timestamp
        lastUpdated: normalizedNewProfile.lastUpdated
      };
      
      console.log('👤 Merged profile:', {
        before: normalizedPrevProfile,
        new: normalizedNewProfile,
        merged: mergedProfile
      });
      
      return mergedProfile;
    });
  }, []);

  // Handle person profile updates from the PersonCard component
  const handlePersonProfileUpdate = useCallback((profile: PersonProfile) => {
    console.log('👤 ConversationView: Person profile updated by user:', profile);
    setPersonProfile(profile);
    // Could save to localStorage or send to backend here
  }, []);

  // Handle persona updates
  const handlePersonaUpdate = useCallback((persona: UserPersona) => {
    setUserPersona(persona);
  }, []);

  // Trigger registration prompt immediately when cards are generated
  useEffect(() => {
    // Show registration prompt if:
    // 1. User is not logged in
    // 2. They've received career cards (engaged with the system)
    // 3. We haven't shown the prompt yet
    // 4. User hasn't dismissed it in this session
    const dismissed = sessionStorage.getItem('registration-prompt-dismissed');
    
    if (!currentUser && careerCards.length > 0 && !showRegistrationPrompt && userEngagementCount >= 1 && !dismissed) {
      // Show immediately when cards are generated - they've seen the value
      setShowRegistrationPrompt(true);
    }
  }, [currentUser, careerCards.length, showRegistrationPrompt, userEngagementCount]);

  // Handle dismissing registration prompt
  const handleDismissRegistration = useCallback(() => {
    setShowRegistrationPrompt(false);
    // Don't show again for this session
    sessionStorage.setItem('registration-prompt-dismissed', 'true');
  }, []);

  return (
    <div className={cn("flex h-full bg-gray-50", className)}>
      {/* Main Conversation Area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 max-w-7xl mx-auto w-full">
        
        {/* Left Panel - ElevenLabs Widget */}
        <div className="lg:w-1/2 flex flex-col">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              🎙️ Voice Career Exploration
            </h1>
            <p className="text-gray-600">
              Talk about your interests and get personalized career recommendations powered by AI.
            </p>
          </div>
          
          <ElevenLabsWidget
            onCareerCardsGenerated={handleCareerCardsGenerated}
            onPersonProfileGenerated={handlePersonProfileGenerated}
            className="flex-1"
          />
          
          {/* TEMPORARY DEBUG BUTTON - Remove after testing */}
          {process.env.NODE_ENV === 'development' && !currentUser && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-700 mb-2">
                Debug: Cards={careerCards.length}, User={!!currentUser ? 'logged' : 'guest'}, 
                Dismissed={toastNagDismissed ? 'yes' : 'no'}, Shown={toastNagShown ? 'yes' : 'no'}
              </p>
              <p className="text-xs text-yellow-700 mb-2">
                RegPrompt={showRegistrationPrompt ? 'shown' : 'hidden'}, 
                LocalStorage={localStorage.getItem('career-nag-dismissed') ? 'blocked' : 'clear'}
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={testToastNag}
                  className="px-3 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600"
                >
                  Test Toast Nag
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem('career-nag-dismissed');
                    sessionStorage.removeItem('registration-prompt-dismissed');
                    setToastNagDismissed(false);
                    setToastNagShown(false);
                    console.log('🧹 Cleared localStorage and reset toast states');
                  }}
                  className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                >
                  Reset All
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Right Panel - Profile & Career Cards */}
        <div className="lg:w-1/2 flex flex-col space-y-6">
          {/* Person Profile Card */}
          {personProfile && (
            <div>
              <PersonCard
                profile={personProfile}
                onUpdateProfile={handlePersonProfileUpdate}
              />
            </div>
          )}
          
          {/* Career Cards Section */}
          <div className="flex-1">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                ✨ Your Career Matches
              </h2>
              <p className="text-gray-600">
                Real-time career recommendations based on our conversation.
              </p>
            </div>
            
            <CareerCardsPanel
              cards={careerCards}
              className="flex-1"
            />
          </div>
          
          {/* Registration Prompt */}
          <AnimatePresence>
            {showRegistrationPrompt && !currentUser && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-4"
              >
                <RegistrationPrompt
                  onRegister={handleRegister}
                  onDismiss={handleDismissRegistration}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Legacy insights panel - hidden for now but keeping for compatibility */}
      <AnimatePresence>
        {false && showInsightsPanel && careerProfile && (
          <div className="w-80 h-full bg-white border-l shadow-lg">
            {/* Legacy insights panel content would go here */}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}; 