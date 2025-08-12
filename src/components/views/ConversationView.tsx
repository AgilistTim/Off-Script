import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { EnhancedChatVoiceModal } from '../conversation/EnhancedChatVoiceModal';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { Mic, Sparkles, Target, Users, UserPlus, LogIn, Crown, Zap, Brain, CheckCircle } from 'lucide-react';
import { ContextualButton } from '../ui/button';
import { ContextualCard } from '../ui/card';
import { DesignProvider } from '../../context/DesignContext';
import { CareerCard } from '../../types/careerCard';

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
      // Show post-conversation CTA if guest user discovered career cards
      if (!currentUser && currentCards.length > 0) {
        console.log('🎯 Showing post-conversation CTA for guest with career insights');
        setShowPostConversationCTA(true);
      } else if (!currentUser && currentCards.length === 0) {
        // Fallback: query guest session directly in case of race condition
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { guestSessionService } = require('../../services/guestSessionService');
          const session = guestSessionService.getGuestSession();
          const hasCards = (session?.careerCards?.length || 0) > 0;
          if (hasCards) {
            console.log('🎯 Fallback CTA trigger: guest session has career cards');
            setShowPostConversationCTA(true);
          }
        } catch (e) {
          console.warn('Guest session lookup failed when closing modal:', e);
        }
      }
      return currentCards; // Return unchanged
    });
  }, [currentUser]); // Remove discoveredCareerCards.length dependency

  // Handle signup CTA
  const handleSignUp = useCallback(() => {
    window.location.href = '/register';
  }, []);

  // Handle login CTA  
  const handleLogin = useCallback(() => {
    window.location.href = '/login';
  }, []);

  // Handle dismiss post-conversation CTA
  const handleDismissPostCTA = useCallback(() => {
    setShowPostConversationCTA(false);
  }, []);

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
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-primary-mint/20 to-primary-lavender/20 rounded-full blur-3xl"
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
            className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-primary-yellow/20 to-primary-green/20 rounded-full blur-3xl"
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
              className="text-6xl lg:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-green via-primary-yellow to-primary-peach mb-6"
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
              className="text-4xl lg:text-6xl font-black text-primary-black mb-8"
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
              className="text-xl lg:text-2xl text-primary-green font-semibold tracking-wide mb-12"
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
              <ContextualButton
                intent="cta"
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
              </ContextualButton>
            </motion.div>

            {/* Feature Highlights */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto"
              variants={containerVariants}
            >
              <ContextualCard purpose="highlight" mood="neutral" className="text-center">
                <Brain className="w-12 h-12 text-primary-green mx-auto mb-4" />
                <h3 className="text-lg font-bold text-primary-black mb-2">AI-Powered Analysis</h3>
                <p className="text-sm text-primary-black/70">Real-time career insights as you speak</p>
              </ContextualCard>

              <ContextualCard purpose="highlight" mood="neutral" className="text-center">
                <Target className="w-12 h-12 text-primary-peach mx-auto mb-4" />
                <h3 className="text-lg font-bold text-primary-black mb-2">Personalized Matching</h3>
                <p className="text-sm text-primary-black/70">Career cards tailored to your interests</p>
              </ContextualCard>

              <ContextualCard purpose="highlight" mood="neutral" className="text-center">
                <Sparkles className="w-12 h-12 text-primary-yellow mx-auto mb-4" />
                <h3 className="text-lg font-bold text-primary-black mb-2">Instant Discovery</h3>
                <p className="text-sm text-primary-black/70">Find hidden career opportunities</p>
              </ContextualCard>
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
              className="w-3 h-3 bg-primary-green rounded-full"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-primary-green font-semibold">AI READY</span>
          </div>
          <div className="text-primary-black/50">•</div>
          <div className="text-primary-lavender font-semibold">
            {discoveredCareerCards.length} INSIGHTS GENERATED
          </div>
          <div className="text-primary-black/50">•</div>
          <div className="text-primary-yellow font-semibold">
            {currentUser ? 'AUTHENTICATED' : 'GUEST MODE'}
          </div>
        </motion.div>
      </div>

      {/* Post-Conversation CTA */}
      <AnimatePresence>
        {showPostConversationCTA && !currentUser && (
          <motion.div
            className="fixed inset-0 bg-primary-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gradient-to-br from-primary-white/10 to-primary-white/5 backdrop-blur-xl border border-primary-green/30 rounded-3xl p-8 max-w-md w-full text-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <motion.div
                className="w-16 h-16 bg-gradient-to-r from-primary-green to-primary-yellow rounded-2xl flex items-center justify-center mx-auto mb-6"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <CheckCircle className="w-8 h-8 text-primary-black" />
              </motion.div>
              
              <h3 className="text-2xl font-bold text-primary-black mb-4">
                Great Conversation!
              </h3>
              <p className="text-primary-black/70 mb-2">
                You discovered <span className="text-primary-green font-bold">{discoveredCareerCards.length} career insights</span>
              </p>
              <p className="text-primary-black/70 mb-8">
                Sign up to save your progress and continue exploring
              </p>
              
              <div className="space-y-3">
                <ContextualButton
                  intent="cta"
                  onClick={handleSignUp}
                  className="w-full py-3"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Sign Up Free
                </ContextualButton>
                
                <ContextualButton
                  intent="secondary"
                  onClick={handleLogin}
                  className="w-full py-3"
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Login
                </ContextualButton>
                
                <ContextualButton
                  intent="secondary"
                  onClick={handleDismissPostCTA}
                  className="w-full py-2 opacity-50"
                >
                  Maybe Later
                </ContextualButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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