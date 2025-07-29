import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useChatContext } from '../../context/ChatContext';
import { ElevenLabsWidget } from '../conversation/ElevenLabsWidget';
import { CareerCardsPanel } from '../conversation/CareerCardsPanel';
import { PersonaDetector } from '../conversation/PersonaDetector';
import { AdaptiveAIResponse } from '../conversation/AdaptiveAIResponse';
import { RegistrationPrompt } from '../conversation/RegistrationPrompt';
import { cn } from '../../lib/utils';
import { simpleChatService } from '../../services/simpleChatService';
import { conversationAnalyzer } from '../../services/conversationAnalyzer';
import { toast } from 'sonner';
import { Brain, Sparkles, Zap, Crown, Target, Users, Mic, MessageCircle, Phone, Video } from 'lucide-react';

// Import simplified components and types
import { UserPersona } from '../conversation/PersonaDetector';
import { EnhancedCareerProfile } from '../../services/careerProfileBuilder';
import { CareerInsight } from '../../services/conversationAnalyzer';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { PersonCard } from '../conversation/PersonCard';

// Import guest session service
import { guestSessionService } from '../../services/guestSessionService';

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
  
  // Conversation state tracking
  const [isConversationActive, setIsConversationActive] = useState(false);
  
  // Toast nag state
  const [toastNagShown, setToastNagShown] = useState(false);
  const [toastNagDismissed, setToastNagDismissed] = useState(false);
  const toastNagTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Analysis loading state
  const [analysisState, setAnalysisState] = useState({ 
    isAnalyzing: false, 
    type: undefined as 'career_analysis' | 'profile_update' | undefined,
    progress: '' 
  });
  
  // Progressive engagement state (legacy - keeping for compatibility)
  const [careerProfile, setCareerProfile] = useState<EnhancedCareerProfile | null>(null);
  const [showInsightsPanel, setShowInsightsPanel] = useState(false);
  const [newInsights, setNewInsights] = useState<CareerInsight[]>([]);

  // Toast nag functions - defined early to avoid dependency issues
  const handleTemporaryDismiss = useCallback(() => {
    setToastNagDismissed(true);
    setShowRegistrationPrompt(false);
    if (toastNagTimer.current) {
      clearInterval(toastNagTimer.current);
    }
  }, []);

  const handlePermanentDismiss = useCallback(() => {
    setToastNagDismissed(true);
    setShowRegistrationPrompt(false);
    localStorage.setItem('career-nag-dismissed', Date.now().toString());
    if (toastNagTimer.current) {
      clearInterval(toastNagTimer.current);
    }
  }, []);

  // Handle registration
  const handleRegister = useCallback(() => {
    // Close the modal first
    setShowRegistrationPrompt(false);
    // Redirect to registration page or open auth modal
    window.location.href = '/register';
  }, []);

  const showProgressNagToast = useCallback(() => {
    console.log('🍞 SHOWING TOAST with', careerCards.length, 'career cards');
    toast.info(`You've discovered ${careerCards.length} career matches! Sign up to save your progress.`, {
      duration: 10000,
      position: 'bottom-center',
      action: {
        label: 'Sign Up',
        onClick: () => {
          setShowRegistrationPrompt(true);
        },
      },
    });
  }, [careerCards.length]);

  // Test function for manual toast triggering (development only)
  const testToastNag = useCallback(() => {
    console.log('🧪 MANUAL TOAST TEST');
    showProgressNagToast();
  }, [showProgressNagToast]);

  // Handle conversation end - show registration toast if user generated valuable data
  const handleConversationEnd = useCallback((hasGeneratedData: boolean, careerCardCount: number) => {
    setIsConversationActive(false);
    
    // Only show registration prompt if user isn't logged in and generated valuable data
    if (!currentUser && hasGeneratedData && careerCardCount > 0) {
      console.log('🎯 ConversationView: Conversation ended with valuable data, showing registration toast');
      
      toast.success(`Great conversation! You generated ${careerCardCount} career insights.`, {
        duration: 8000,
        position: 'bottom-center',
        action: {
          label: 'Save Progress',
          onClick: () => {
            setShowRegistrationPrompt(true);
          },
        },
      });
    }
  }, [currentUser]);

  // Handle conversation start
  const handleConversationStart = useCallback(() => {
    setIsConversationActive(true);
    console.log('🟢 ConversationView: Conversation started, disabling intrusive prompts');
  }, []);

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

  // Toast nag system for account creation after 3 cards - only when conversation is NOT active
  useEffect(() => {
    console.log('🍞 Toast nag check:', {
      careerCardsLength: careerCards.length,
      currentUser: !!currentUser,
      toastNagDismissed,
      toastNagShown,
      isConversationActive,
      shouldTrigger: careerCards.length >= 3 && !currentUser && !toastNagDismissed && !toastNagShown && !isConversationActive
    });

    // Only show for unregistered users who haven't dismissed the nag AND conversation is not active
    if (currentUser) {
      console.log('🍞 Toast nag blocked: User is logged in');
      return;
    }
    
    if (toastNagDismissed) {
      console.log('🍞 Toast nag blocked: User dismissed it');
      return;
    }
    
    if (isConversationActive) {
      console.log('🍞 Toast nag blocked: Conversation is active - will show after disconnect');
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

    // Trigger after 3 career cards - but only when conversation is not active
    if (careerCards.length >= 3 && !toastNagShown) {
      console.log('🍞 TRIGGERING TOAST NAG - Career cards >= 3 and conversation inactive!', {
        careerCardsLength: careerCards.length,
        toastNagShown,
        isConversationActive
      });
      
      // Show initial toast immediately
      showProgressNagToast();
      setToastNagShown(true);
      
      // Set up recurring reminders every 2 minutes (not too annoying)
      toastNagTimer.current = setInterval(() => {
        if (!currentUser && !toastNagDismissed && !isConversationActive) {
          console.log('🍞 Recurring toast nag reminder');
          showProgressNagToast();
        }
      }, 120000); // 2 minutes
    } else {
      console.log('🍞 Toast nag not triggered yet:', {
        careerCardsLength: careerCards.length,
        needsAtLeast: 3,
        toastNagShown,
        isConversationActive,
        reason: careerCards.length < 3 ? 'Not enough cards' : toastNagShown ? 'Already shown' : isConversationActive ? 'Conversation active' : 'Unknown'
      });
    }

    // Cleanup timer
    return () => {
      if (toastNagTimer.current) {
        clearInterval(toastNagTimer.current);
      }
    };
  }, [careerCards.length, currentUser, toastNagDismissed, toastNagShown, isConversationActive, showProgressNagToast]);

  // Handle career cards generated from ElevenLabs widget
  const handleCareerCardsGenerated = useCallback(async (newCards: CareerCard[]) => {
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
      
      // Save to guest session if user is not logged in
      if (!currentUser && newCards.length > 0) {
        try {
          guestSessionService.addCareerCards(newCards);
          console.log('💾 Saved career cards to guest session');
        } catch (error) {
          console.error('Failed to save career cards to guest session:', error);
        }
      }
      
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
    
    // Save to Firebase if user is logged in (outside of setState)
    if (currentUser && newCards.length > 0) {
      try {
        const careerPathwayService = await import('../../services/careerPathwayService');
        const service = careerPathwayService.careerPathwayService;
        await service.saveCareerCardsFromConversation(currentUser.uid, newCards);
        console.log('💾 Saved career cards to Firebase for logged-in user');
      } catch (error) {
        console.error('Failed to save career cards to Firebase:', error);
      }
    }
    
    setHasStartedConversation(true);
    
    // Track engagement - show registration prompt after user gets career cards
    setUserEngagementCount(prev => prev + 1);
  }, [careerCards.length, currentUser, toastNagShown, toastNagDismissed]); // Added dependencies for logging

  // Handle analysis state changes
  const handleAnalysisStateChange = useCallback((state: { isAnalyzing: boolean; type?: 'career_analysis' | 'profile_update'; progress?: string }) => {
    console.log('🔄 Analysis state change:', state);
    setAnalysisState({
      isAnalyzing: state.isAnalyzing,
      type: state.type,
      progress: state.progress || ''
    });
  }, []);

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
        
        // Save to guest session if user is not logged in
        if (!currentUser) {
          try {
            // Convert to guest session format
            const guestProfile = {
              ...normalizedNewProfile,
              careerStage: normalizedNewProfile.careerStage as "exploring" | "deciding" | "transitioning" | "advancing"
            };
            guestSessionService.updatePersonProfile(guestProfile);
            console.log('💾 Saved new person profile to guest session');
          } catch (error) {
            console.error('Failed to save person profile to guest session:', error);
          }
        }
        
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
      
      // Save merged profile to guest session if user is not logged in
      if (!currentUser) {
        try {
          // Convert to guest session format
          const guestProfile = {
            ...mergedProfile,
            careerStage: mergedProfile.careerStage as "exploring" | "deciding" | "transitioning" | "advancing"
          };
          guestSessionService.updatePersonProfile(guestProfile);
          console.log('💾 Saved updated person profile to guest session');
        } catch (error) {
          console.error('Failed to save updated person profile to guest session:', error);
        }
      }
      
      return mergedProfile;
    });
  }, [currentUser]); // Added currentUser dependency

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

  // Trigger registration prompt immediately when cards are generated - but NOT during active conversation
  useEffect(() => {
    // Show registration prompt if:
    // 1. User is not logged in
    // 2. They've received career cards (engaged with the system)
    // 3. We haven't shown the prompt yet
    // 4. User hasn't dismissed it in this session
    // 5. Conversation is NOT currently active (key change)
    const dismissed = sessionStorage.getItem('registration-prompt-dismissed');
    
    if (!currentUser && careerCards.length > 0 && !showRegistrationPrompt && userEngagementCount >= 1 && !dismissed && !isConversationActive) {
      // Show immediately when cards are generated and conversation is not active
      console.log('🎯 ConversationView: Showing registration prompt - conversation inactive, user has career cards');
      setShowRegistrationPrompt(true);
    } else if (isConversationActive && showRegistrationPrompt) {
      // Hide registration prompt if conversation becomes active
      console.log('🎯 ConversationView: Hiding registration prompt - conversation became active');
      setShowRegistrationPrompt(false);
    }
  }, [currentUser, careerCards.length, showRegistrationPrompt, userEngagementCount, isConversationActive]);

  // Handle dismissing registration prompt
  const handleDismissRegistration = useCallback(() => {
    setShowRegistrationPrompt(false);
    // Don't show again for this session
    sessionStorage.setItem('registration-prompt-dismissed', 'true');
  }, []);

  // Animation variants for the new street-art design
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.8,
        staggerChildren: 0.2
      }
    }
  };

  const panelVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: [0.6, 0.01, 0.05, 0.95]
      }
    }
  };

  const glowVariants = {
    animate: {
      boxShadow: [
        "0 0 20px rgba(0, 255, 255, 0.3)",
        "0 0 40px rgba(255, 0, 110, 0.3)",
        "0 0 60px rgba(255, 255, 0, 0.3)",
        "0 0 20px rgba(0, 255, 255, 0.3)"
      ],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <motion.div 
      className={cn("min-h-screen bg-gradient-to-br from-primary-black via-deep-purple to-primary-black relative overflow-hidden", className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-electric-blue/20 to-neon-pink/20 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-cyber-yellow/20 to-acid-green/20 rounded-full blur-3xl"
          animate={{
            x: [0, -80, 0],
            y: [0, 60, 0],
            scale: [1.2, 1, 1.2]
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <motion.div 
          className="px-6 py-8"
          variants={panelVariants}
        >
          <div className="max-w-7xl mx-auto">
            <motion.div 
              className="text-center mb-8"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <motion.h1 
                className="text-6xl lg:text-8xl font-street font-black text-transparent bg-clip-text bg-gradient-to-r from-electric-blue via-neon-pink to-cyber-yellow mb-4"
                animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{ backgroundSize: "200% 100%" }}
              >
                VOICE CAREER
              </motion.h1>
              <motion.div
                className="text-4xl lg:text-6xl font-street font-black text-primary-white mb-6"
                animate={{
                  textShadow: [
                    "0 0 10px rgba(0, 255, 255, 0.5)",
                    "0 0 20px rgba(255, 0, 110, 0.5)", 
                    "0 0 10px rgba(0, 255, 255, 0.5)"
                  ]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                EXPLORATION
              </motion.div>
              <motion.p 
                className="text-xl text-electric-blue font-semibold tracking-wide"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              >
                Talk • Discover • Transform Your Future
              </motion.p>
            </motion.div>
          </div>
        </motion.div>

        {/* Main Chat Interface */}
        <div className="px-6 pb-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left Panel - Voice Chat */}
              <motion.div 
                className="space-y-6"
                variants={panelVariants}
              >
                {/* Voice Chat Card */}
                <motion.div
                  className="bg-gradient-to-br from-primary-white/10 to-primary-white/5 backdrop-blur-xl border border-primary-white/20 rounded-3xl p-8 relative overflow-hidden shadow-glow-blue"
                  variants={glowVariants}
                  animate="animate"
                  whileHover={{ 
                    scale: 1.02,
                    transition: { duration: 0.3 }
                  }}
                >
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-electric-blue/10 via-transparent to-neon-pink/10 pointer-events-none" />
                  
                  {/* Header */}
                  <div className="relative mb-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <motion.div
                        className="w-16 h-16 bg-gradient-to-r from-electric-blue to-neon-pink rounded-2xl flex items-center justify-center"
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      >
                        <Mic className="h-8 w-8 text-primary-white" />
                      </motion.div>
                      <div>
                        <h2 className="text-2xl font-bold text-primary-white mb-1">VOICE AI COACH</h2>
                        {/* <p className="text-electric-blue font-semibold">POWERED BY ELEVENLABS*</p> */}
                      </div>
                    </div>
                    
                    {/* Quick Actions - Commented out as redundant with Start Conversation 
                    <div className="flex space-x-3">
                      <motion.button
                        className="px-4 py-2 bg-electric-blue/20 hover:bg-electric-blue/30 text-electric-blue border border-electric-blue/40 rounded-lg text-sm font-bold transition-all duration-300"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <MessageCircle className="h-4 w-4 inline mr-2" />
                        CHAT MODE
                      </motion.button>
                      <motion.button
                        className="px-4 py-2 bg-neon-pink/20 hover:bg-neon-pink/30 text-neon-pink border border-neon-pink/40 rounded-lg text-sm font-bold transition-all duration-300"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Phone className="h-4 w-4 inline mr-2" />
                        VOICE CALL
                      </motion.button>
                    </div>
                    */}
                  </div>

                  {/* Analysis Loading */}
                  <AnimatePresence>
                    {analysisState.isAnalyzing && (
                      <motion.div
                        className="mb-6 p-4 bg-gradient-to-r from-cyber-yellow/20 to-acid-green/20 backdrop-blur-sm border border-cyber-yellow/30 rounded-2xl"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="flex items-center space-x-4">
                          <motion.div
                            className="w-8 h-8 bg-gradient-to-r from-cyber-yellow to-acid-green rounded-full flex items-center justify-center"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          >
                            <Brain className="h-4 w-4 text-primary-black" />
                          </motion.div>
                          <div>
                            <p className="text-cyber-yellow font-bold text-sm">
                              {analysisState.type === 'career_analysis' ? '🎯 ANALYZING CAREER MATRIX' : '👤 UPDATING PROFILE DATA'}
                            </p>
                            <p className="text-cyber-yellow/70 text-xs">{analysisState.progress}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ElevenLabs Widget */}
                  <div className="relative">
                    <ElevenLabsWidget
                      onCareerCardsGenerated={handleCareerCardsGenerated}
                      onPersonProfileGenerated={handlePersonProfileGenerated}
                      onAnalysisStateChange={handleAnalysisStateChange}
                      onConversationStart={handleConversationStart}
                      onConversationEnd={handleConversationEnd}
                      className="min-h-96"
                    />
                  </div>

                  {/* Status Indicators */}
                  <div className="mt-6 flex justify-between items-center text-sm">
                    <div className="flex items-center space-x-2">
                      <motion.div
                        className="w-3 h-3 bg-acid-green rounded-full"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <span className="text-acid-green font-semibold">AI READY</span>
                    </div>
                    <div className="text-electric-blue font-semibold">
                      {careerCards.length} INSIGHTS GENERATED
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* Right Panel - Career Insights */}
              <motion.div 
                className="space-y-6"
                variants={panelVariants}
              >
                {/* Career Cards Panel */}
                <motion.div
                  className="bg-gradient-to-br from-primary-white/10 to-primary-white/5 backdrop-blur-xl border border-primary-white/20 rounded-3xl p-8 relative overflow-hidden shadow-glow-pink"
                  whileHover={{ 
                    scale: 1.02,
                    transition: { duration: 0.3 }
                  }}
                >
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-neon-pink/10 via-transparent to-cyber-yellow/10 pointer-events-none" />
                  
                  {/* Header */}
                  <div className="relative mb-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <motion.div
                        className="w-16 h-16 bg-gradient-to-r from-neon-pink to-cyber-yellow rounded-2xl flex items-center justify-center"
                        animate={{ 
                          boxShadow: [
                            "0 0 20px rgba(255, 0, 110, 0.4)",
                            "0 0 40px rgba(255, 255, 0, 0.4)",
                            "0 0 20px rgba(255, 0, 110, 0.4)"
                          ]
                        }}
                        transition={{ duration: 3, repeat: Infinity }}
                      >
                        <Target className="h-8 w-8 text-primary-white" />
                      </motion.div>
                      <div>
                        <h2 className="text-2xl font-bold text-primary-white mb-1">CAREER MATRIX</h2>
                        <p className="text-neon-pink font-semibold">PERSONALIZED INSIGHTS*</p>
                      </div>
                    </div>
                  </div>

                  {/* Career Cards */}
                  <div className="relative min-h-96">
                    {careerCards.length > 0 ? (
                      <CareerCardsPanel 
                        cards={careerCards}
                        className="h-full"
                      />
                    ) : (
                      <motion.div
                        className="flex flex-col items-center justify-center h-96 text-center"
                        initial={{ opacity: 0.5 }}
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      >
                        <motion.div
                          className="w-20 h-20 bg-gradient-to-r from-neon-pink/20 to-cyber-yellow/20 rounded-3xl flex items-center justify-center mb-6"
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        >
                          <Sparkles className="h-10 w-10 text-neon-pink" />
                        </motion.div>
                        <h3 className="text-xl font-bold text-primary-white mb-2">
                          START TALKING TO GENERATE
                        </h3>
                        <p className="text-electric-blue/80 text-sm font-medium">
                          Your personalized career insights will appear here
                        </p>
                      </motion.div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="mt-6 grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-neon-pink">{careerCards.length}</div>
                      <div className="text-xs text-neon-pink/80 font-semibold">CAREERS</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-cyber-yellow">{userEngagementCount}</div>
                      <div className="text-xs text-cyber-yellow/80 font-semibold">INTERACTIONS</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-acid-green">AI</div>
                      <div className="text-xs text-acid-green/80 font-semibold">POWERED</div>
                    </div>
                  </div>

                  {/* Person Profile Display */}
                  {personProfile && (
                    <motion.div
                      className="mt-6"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    >
                      <PersonCard
                        profile={personProfile}
                        onUpdateProfile={(updatedProfile) => {
                          setPersonProfile(updatedProfile);
                          // Update guest session if needed
                        }}
                      />
                    </motion.div>
                  )}
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>

        

        {/* Registration Prompt */}
        <AnimatePresence>
          {showRegistrationPrompt && (
            <RegistrationPrompt
              onRegister={handleRegister}
              onDismiss={handleTemporaryDismiss}
            />
          )}
        </AnimatePresence>

        {/* Persona Detector */}
        <PersonaDetector 
          userMessages={messages.map(msg => ({
            content: msg.content,
            timestamp: msg.timestamp?.getTime() || Date.now(),
            wordCount: msg.content.split(' ').length
          }))}
          engagementMetrics={{
            timeOnPage: Date.now() - (messages[0]?.timestamp?.getTime() || Date.now()),
            clicksPerMinute: userEngagementCount,
            scrollBehavior: 'moderate' as const,
            abandonmentRisk: 0.3
          }}
          onPersonaDetected={setUserPersona}
        />

        {/* Adaptive AI Response - Only render when needed */}
        {messages.length > 0 && (
          <AdaptiveAIResponse
            userMessage={messages[messages.length - 1]?.content || ''}
            persona={userPersona}
            conversationPhase={messages.length < 3 ? 'greeting' : messages.length < 8 ? 'exploring' : 'deepening'}
            previousInsights={careerCards.map(card => card.title || '')}
            onResponseGenerated={(response, confidence) => {
              console.log('Generated response:', response, 'Confidence:', confidence);
            }}
          />
        )}
      </div>
    </motion.div>
  );
}; 