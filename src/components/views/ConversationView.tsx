import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { EnhancedChatVoiceModal } from '../conversation/EnhancedChatVoiceModal';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { Mic, Sparkles, Target, Users, UserPlus, LogIn, Crown, Zap, Brain, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { DesignProvider } from '../../context/DesignContext';
import { CareerCard } from '../../types/careerCard';
import OnboardingProgress, { type OnboardingStage } from '../ui/onboarding-progress';
import { guestSessionService } from '../../services/guestSessionService';

interface ConversationViewProps {
  className?: string;
}

export const ConversationView: React.FC<ConversationViewProps> = ({ className }) => {
  const { currentUser } = useAuth();
  
  // Enhanced chat modal state
  const [showEnhancedModal, setShowEnhancedModal] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [activeCareerContext, setActiveCareerContext] = useState<any>(null);
  
  // Post-conversation state
  const [showPostConversationCTA, setShowPostConversationCTA] = useState(false);
  const [discoveredCareerCards, setDiscoveredCareerCards] = useState<CareerCard[]>([]);

  // Onboarding progress state
  const [currentOnboardingStage, setCurrentOnboardingStage] = useState<OnboardingStage>('discovery');
  const [extractedProfileData, setExtractedProfileData] = useState<any>({});

  // Handle conversation end with career insights
  const handleConversationUpdate = useCallback((messages: any[]) => {
    setConversationHistory(messages);
  }, []);

  // Debug: Log when career cards are discovered
  const handleCareerCardsDiscovered = useCallback((cards: CareerCard[]) => {
    console.log('🎯 ConversationView: Career cards discovered:', cards.length);
    setDiscoveredCareerCards(cards);
  }, []);

  // Check for active career context when modal opens
  const checkActiveCareerContext = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      console.log('🔍 ConversationView: Checking for active career context');
      // Import careerAwareVoiceService to check for active sessions
      const { careerAwareVoiceService } = await import('../../services/careerAwareVoiceService');
      const activeSessions = await careerAwareVoiceService.getActiveSessions(currentUser.uid);
      
      if (activeSessions.length > 0) {
        const activeSession = activeSessions[0];
        console.log('🎯 ConversationView: Found active career session:', activeSession.career);
        setActiveCareerContext({
          title: activeSession.career,
          sessionId: activeSession.sessionId
        });
      } else {
        console.log('ℹ️ ConversationView: No active career sessions found');
        setActiveCareerContext(null);
      }
    } catch (error) {
      console.log('⚠️ ConversationView: Could not check career context:', error);
      setActiveCareerContext(null);
    }
  }, [currentUser]);

  // Handle modal close - check if we should show post-conversation CTA
  const handleModalClose = useCallback(() => {
    console.log('🚪 ConversationView: handleModalClose called');
    console.log('🔍 Modal close state check:', { 
      currentUser: currentUser ? 'logged in' : 'guest',
      showPostConversationCTA: showPostConversationCTA
    });
    setShowEnhancedModal(false);
    
    // Use current state value to avoid dependency issues
    setDiscoveredCareerCards(currentCards => {
      // Show post-conversation CTA for ALL guest users (Option 1: Always show CTA)
      if (!currentUser) {
        console.log('🎯 Showing post-conversation CTA for guest user (always show strategy)');
        setShowPostConversationCTA(true);
      }
      return currentCards; // Return unchanged
    });
  }, [currentUser]); // Remove discoveredCareerCards.length dependency

  // Handle signup CTA
  const handleSignUp = useCallback(() => {
    window.location.href = '/auth/register';
  }, []);

  // Handle login CTA  
  const handleLogin = useCallback(() => {
    window.location.href = '/auth/login';
  }, []);

  // Handle dismiss post-conversation CTA
  const handleDismissPostCTA = useCallback(() => {
    setShowPostConversationCTA(false);
  }, []);

  // Sync onboarding progress for guest users
  useEffect(() => {
    if (!currentUser && showEnhancedModal) {
      const interval = setInterval(() => {
        const stage = guestSessionService.getCurrentOnboardingStage() as OnboardingStage;
        setCurrentOnboardingStage(stage);
        
        // Extract basic profile data if available
        const session = guestSessionService.getGuestSession();
        if (session) {
          const newExtractedData = {
            name: session.personProfile?.name,
            education: session.personProfile?.careerStage,
            careerDirection: session.personProfile?.goals?.join(', '),
            careerCardsGenerated: session.careerCards?.length || 0
          };
          setExtractedProfileData(newExtractedData);
          
          console.log('🎯 ConversationView: Progress bar state sync:', {
            stage,
            extractedData: newExtractedData,
            showProgressBar: !currentUser && showEnhancedModal && stage !== 'complete'
          });
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [currentUser, showEnhancedModal]);

  // Handle conversation end from modal
  const handleConversationEnd = useCallback((hasGeneratedData: boolean, careerCardCount: number) => {
    console.log('🎯 ConversationView: handleConversationEnd called', { hasGeneratedData, careerCardCount });
    console.log('🔍 Current user state:', { currentUser: currentUser ? 'logged in' : 'guest' });
    console.log('🔍 CTA trigger conditions:', { 
      isGuest: !currentUser, 
      hasData: hasGeneratedData, 
      cardCount: careerCardCount,
      shouldTrigger: !currentUser && hasGeneratedData && careerCardCount > 0 
    });
    
    // Show post-conversation CTA if guest user generated career insights
    if (!currentUser && hasGeneratedData && careerCardCount > 0) {
      console.log('🎯 Triggering post-conversation CTA for guest with career insights');
      setShowPostConversationCTA(true);
    } else {
      console.log('❌ CTA not triggered - conditions not met');
    }
  }, [currentUser]);

  // Debug logging for CTA state
  React.useEffect(() => {
    console.log('🔍 CTA Render Check:', { 
      showPostConversationCTA, 
      currentUser: currentUser ? 'logged in' : 'guest', 
      shouldShow: showPostConversationCTA && !currentUser 
    });
  }, [showPostConversationCTA, currentUser]);

  // Animation variants
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

  const itemVariants = {
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

  return (
    <DesignProvider mode={{ aesthetic: 'hybrid', energy: 'medium', interaction: 'energetic' }}>
      <motion.div 
        className={cn("min-h-screen bg-gradient-organic relative overflow-hidden", className)}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-teal-200/20 to-purple-100/20 rounded-full blur-3xl"
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
            className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-yellow-200/20 to-green-200/20 rounded-full blur-3xl"
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
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Hero Section */}
        <motion.div 
          className="flex-1 flex items-center justify-center px-6 py-12"
          variants={itemVariants}
        >
          <div className="max-w-4xl mx-auto text-center">
            {/* Main Title */}
            <motion.h1 
              className="text-6xl lg:text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-500 via-yellow-400 to-orange-500 mb-6"
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
              className="text-4xl lg:text-6xl font-bold text-black mb-8"
              animate={{
                textShadow: [
                  "0 0 10px rgba(129, 240, 140, 0.5)",
                  "0 0 20px rgba(207, 206, 255, 0.5)", 
                  "0 0 10px rgba(129, 240, 140, 0.5)"
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
            
            {/* Subtitle */}
            <motion.p 
              className="text-xl lg:text-2xl text-green-600 font-semibold tracking-wide mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              Talk • Discover • Transform Your Future
            </motion.p>

            {/* Main CTA Button */}
            <motion.div
              className="mb-12"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.7 }}
            >
              <Button
                variant="primary"
                onClick={async () => {
                  console.log('🚀 ConversationView: Opening enhanced modal');
                  await checkActiveCareerContext();
                  setShowEnhancedModal(true);
                }}
                className="px-12 py-6 text-xl"
              >
                <div className="flex items-center justify-center space-x-4">
                  <Mic className="w-8 h-8" />
                  <span>START CONVERSATION</span>
                </div>
                <p className="text-sm mt-2 opacity-90">Voice-first career guidance with AI insights</p>
              </Button>
            </motion.div>

            {/* Feature Highlights */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto"
              variants={containerVariants}
            >
              <Card   className="text-center">
                <Brain className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-black mb-2">AI-Powered Analysis</h3>
                <p className="text-sm text-black/70">Real-time career insights as you speak</p>
              </Card>

              <Card   className="text-center">
                <Target className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-black mb-2">Personalized Matching</h3>
                <p className="text-sm text-black/70">Career cards tailored to your interests</p>
              </Card>

              <Card   className="text-center">
                <Sparkles className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-black mb-2">Instant Discovery</h3>
                <p className="text-sm text-black/70">Find hidden career opportunities</p>
              </Card>
            </motion.div>
          </div>
        </motion.div>

        {/* Status Bar */}
        <motion.div 
          className="flex justify-center items-center space-x-8 py-6 text-sm"
          variants={itemVariants}
        >
          <div className="flex items-center space-x-2">
            <motion.div
              className="w-3 h-3 bg-green-500 rounded-full"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-green-600 font-semibold">AI READY</span>
          </div>
          <div className="text-black/50">•</div>
          <div className="text-purple-500 font-semibold">
            {discoveredCareerCards.length} INSIGHTS GENERATED
          </div>
          <div className="text-black/50">•</div>
          <div className="text-yellow-500 font-semibold">
            {currentUser ? 'AUTHENTICATED' : 'GUEST MODE'}
          </div>
        </motion.div>
      </div>

      {/* Post-Conversation CTA */}
      <AnimatePresence>
        {showPostConversationCTA && !currentUser && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white border-2 border-black rounded-3xl p-8 max-w-md w-full text-center shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <motion.div
                className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <CheckCircle className="w-8 h-8 text-white" />
              </motion.div>
              
              <h3 className="text-2xl font-bold text-black mb-4">
                Great Conversation!
              </h3>
              <p className="text-gray-600 mb-2">
                You discovered <span className="text-black font-bold">{discoveredCareerCards.length} career insights</span>
              </p>
              <p className="text-gray-600 mb-8">
                Sign up to save your progress and continue exploring
              </p>
              
              <div className="space-y-3">
                <Button
                  variant="primary"
                  onClick={handleSignUp}
                  className="w-full py-3"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Sign Up Free
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleLogin}
                  className="w-full py-3"
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Login
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleDismissPostCTA}
                  className="w-full py-2 opacity-50"
                >
                  Maybe Later
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Onboarding Progress - Only show for guest users during onboarding when modal is open */}
      {(() => {
        const shouldShow = !currentUser && showEnhancedModal && currentOnboardingStage !== 'complete';
        console.log('🎯 ConversationView: Progress bar render decision:', {
          currentUser: !!currentUser,
          showEnhancedModal,
          currentOnboardingStage,
          shouldShow
        });
        return shouldShow;
      })() && (
        <motion.div
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[200] max-w-sm w-full px-4"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <OnboardingProgress 
            currentStage={currentOnboardingStage}
            extractedData={extractedProfileData}
            className="shadow-lg bg-red-500"
          />
        </motion.div>
      )}

      {/* Enhanced Chat Voice Modal */}
      <EnhancedChatVoiceModal
        isOpen={showEnhancedModal}
        onClose={handleModalClose}
        careerContext={activeCareerContext}
        currentConversationHistory={conversationHistory}
        onConversationUpdate={handleConversationUpdate}
        onCareerCardsDiscovered={handleCareerCardsDiscovered}
        onConversationEnd={(hasGeneratedData: boolean, careerCardCount: number) => {
          console.log('🔥 WRAPPER: onConversationEnd called in ConversationView');
          handleConversationEnd(hasGeneratedData, careerCardCount);
        }}
      />
    </motion.div>
    </DesignProvider>
  );
}; 