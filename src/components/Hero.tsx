import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Volume2, Users, Zap, Play, Pause, CheckCircle, UserPlus } from 'lucide-react';
import { Button } from './ui/button';
import { EnhancedChatVoiceModal } from './conversation/EnhancedChatVoiceModal';
import { useAuth } from '../context/AuthContext';

const Hero: React.FC = () => {
  const navigate = useNavigate();
  const controls = useAnimation();
  const [isVisible, setIsVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showPostConversationCTA, setShowPostConversationCTA] = useState(false);
  const [discoveredCareerCards, setDiscoveredCareerCards] = useState<any[]>([]);
  
  const { currentUser } = useAuth();

  useEffect(() => {
    setIsVisible(true);
    controls.start("visible");
  }, [controls]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleStartVoiceChat = () => {
    setShowVoiceModal(true);
  };

  const handleVoiceModalClose = useCallback(() => {
    console.log('🚪 Hero: handleVoiceModalClose called');
    setShowVoiceModal(false);
    
    // Show post-conversation CTA for ALL guest users (Option 1: Always show CTA)
    if (!currentUser) {
      console.log('🎯 Hero: Showing post-conversation CTA for guest user (always show strategy)');
      setShowPostConversationCTA(true);
    }
  }, [currentUser, discoveredCareerCards.length]);

  // Handle career cards discovered
  const handleCareerCardsDiscovered = useCallback((cards: any[]) => {
    console.log('🎯 Hero: Career cards discovered:', cards.length);
    setDiscoveredCareerCards(cards);
  }, []);

  // Handle conversation end
  const handleConversationEnd = useCallback((hasGeneratedData: boolean, careerCardCount: number) => {
    console.log('🎯 Hero: handleConversationEnd called', { hasGeneratedData, careerCardCount });
    
    // Show post-conversation CTA for ALL guest users (Option 1: Always show CTA)
    if (!currentUser) {
      console.log('🎯 Hero: Triggering post-conversation CTA for guest user (always show strategy)');
      setShowPostConversationCTA(true);
    }
  }, [currentUser]);

  // Handle signup CTA
  const handleSignUp = useCallback(() => {
    console.log('🎯 Hero: Sign up button clicked');
    navigate('/auth/register');
  }, [navigate]);

  // Handle login CTA  
  const handleLogin = useCallback(() => {
    console.log('🎯 Hero: Login button clicked');
    navigate('/auth/login');
  }, [navigate]);

  // Handle dismiss post-conversation CTA
  const handleDismissPostCTA = useCallback(() => {
    console.log('🎯 Hero: Dismiss CTA button clicked');
    setShowPostConversationCTA(false);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
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
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  };

  const floatingVariants = {
    animate: {
      y: [0, -10, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const pulseVariants = {
    animate: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <>
      <section className="relative min-h-screen overflow-hidden bg-gradient-organic" id="hero">
        {/* Organic floating background elements */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-20 left-10 w-24 h-24 bg-gray-400/30 rounded-full blur-xl"
            variants={floatingVariants}
            animate="animate"
          />
          <motion.div
            className="absolute bottom-20 right-10 w-32 h-32 bg-gray-500/30 rounded-full blur-lg"
            variants={floatingVariants}
            animate="animate"
            transition={{ delay: 1 }}
          />
          <motion.div
            className="absolute top-1/2 left-1/4 w-16 h-16 bg-gray-300/30 rounded-full blur-md"
            variants={pulseVariants}
            animate="animate"
          />
        </div>

        {/* Main content */}
          <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-black">
          <div className="flex flex-col items-center justify-center min-h-screen py-20 text-center">
            
            {/* Main content container */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate={controls}
              className="max-w-4xl mx-auto space-y-8 lg:space-y-12"
            >
              {/* Main Headlines */}
              <div className="space-y-6">
                <motion.div variants={itemVariants} className="space-y-4">
                  <motion.h1
                    className="font-bold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl text-black leading-tight"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  >
                    Self-Made
                    <span className="block text-transparent bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800 bg-clip-text">
                      Futures
                    </span>
                  </motion.h1>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <h2 className="font-semibold text-xl sm:text-2xl lg:text-3xl text-black/80 leading-relaxed max-w-3xl mx-auto">
                    Powerful AI that learns your goals and supports your journey with smart, UK‑specific next steps.
                  </h2>
                </motion.div>

                <motion.p
                  variants={itemVariants}
                  className="text-lg sm:text-xl text-black/70 leading-relaxed max-w-2xl mx-auto font-medium"
                >
                  Flip the Script. Not your usual career advice.
                </motion.p>
              </div>

              {/* Single Action Button */}
              <motion.div variants={itemVariants} className="flex justify-center">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={handleStartVoiceChat}
                    variant="primary"
                    size="lg"
                    className="font-semibold text-lg px-8 py-4 min-h-[48px] group"
                  >
                    <Volume2 className="h-5 w-5 mr-3 group-hover:animate-pulse" />
                    Start your journey
                    <ArrowRight className="h-5 w-5 ml-3 group-hover:translate-x-1 transition-transform duration-300" />
                  </Button>
                </motion.div>
              </motion.div>

              {/* Social Proof */}
              <motion.div
                variants={itemVariants}
                className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8 text-black/60"
              >
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-gray-600" />
                  <span className="font-medium">AI-powered guidance</span>
                </div>
                <div className="hidden sm:block w-px h-6 bg-black/20"></div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-gray-500" />
                  <span className="font-medium">Personalized insights</span>
                </div>
              </motion.div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Enhanced Chat Voice Modal */}
      <EnhancedChatVoiceModal
        isOpen={showVoiceModal}
        onClose={handleVoiceModalClose}
        careerContext={undefined}
        currentConversationHistory={[]}
        onConversationUpdate={() => {}}
        onCareerCardsDiscovered={handleCareerCardsDiscovered}
        onConversationEnd={handleConversationEnd}
      />

      {/* Post-Conversation CTA */}
      <AnimatePresence>
        {showPostConversationCTA && !currentUser && !showVoiceModal && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ pointerEvents: 'auto' }}
          >
            <motion.div
              className="bg-white border-2 border-black rounded-3xl p-8 max-w-md w-full text-center shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{ pointerEvents: 'auto' }}
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
                  onClick={handleSignUp}
                  variant="primary"
                  className="w-full font-bold py-3"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Sign Up Free
                </Button>
                
                <Button
                  onClick={handleLogin}
                  variant="outline"
                  className="w-full py-3"
                >
                  Already have an account? Log in
                </Button>
                
                <Button
                  onClick={handleDismissPostCTA}
                  variant="ghost"
                  className="w-full py-2 text-gray-500 hover:text-gray-700"
                >
                  Maybe later
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Hero;