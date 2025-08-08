import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Volume2, Users, Zap, Play, Pause } from 'lucide-react';
import { Button } from './ui/button';
import { EnhancedChatVoiceModal } from './conversation/EnhancedChatVoiceModal';

const Hero: React.FC = () => {
  const navigate = useNavigate();
  const controls = useAnimation();
  const [isVisible, setIsVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

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

  const handleVoiceModalClose = () => {
    setShowVoiceModal(false);
  };

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
      <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary-black via-primary-gray to-primary-black" id="hero">
        {/* Minimal animated background elements */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-20 left-10 w-24 h-24 bg-electric-blue/20 rounded-full blur-xl"
            variants={floatingVariants}
            animate="animate"
          />
          <motion.div
            className="absolute bottom-20 right-10 w-32 h-32 bg-neon-pink/20 rounded-full blur-lg"
            variants={floatingVariants}
            animate="animate"
            transition={{ delay: 1 }}
          />
          <motion.div
            className="absolute top-1/2 left-1/4 w-16 h-16 bg-acid-green/20 rounded-full blur-md"
            variants={pulseVariants}
            animate="animate"
          />
        </div>

        {/* Main content */}
          <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-primary-white">
          <div className="flex flex-col items-center justify-center min-h-screen py-20 text-center">
            
            {/* Main content container */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate={controls}
              className="max-w-4xl mx-auto space-y-8 lg:space-y-12"
            >
              {/* Event Badge */}
              <motion.a
                href="https://offscriptgen.com" 
                target="_blank" 
                rel="noopener noreferrer"
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center space-x-3 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full border border-gray-200/50 shadow-sm group transition-all duration-300 hover:bg-white/90 hover:shadow-md"
              >
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Sparkles className="h-4 w-4 text-blue-500" />
                </motion.div>
                <span className="text-gray-700 font-medium text-sm">
                  LDN / 24-25 JAN 2026
                </span>
                <ArrowRight className="h-4 w-4 text-gray-500 group-hover:translate-x-1 transition-transform duration-300" />
              </motion.a>
              
              {/* Main Headlines */}
              <div className="space-y-6">
                <motion.div variants={itemVariants} className="space-y-4">
                  <motion.h1
                    className="font-bold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl text-gray-900 leading-tight"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  >
                    Self-Made
                    <span className="block text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text">
                      Futures
                    </span>
                  </motion.h1>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <h2 className="font-semibold text-xl sm:text-2xl lg:text-3xl text-primary-white/80 leading-relaxed max-w-3xl mx-auto">
                    Powerful AI that learns your goals and supports your journey with smart, UK‑specific next steps.
                  </h2>
                </motion.div>

                <motion.p
                  variants={itemVariants}
                  className="text-lg sm:text-xl text-primary-white/70 leading-relaxed max-w-2xl mx-auto font-medium"
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
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-lg px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 border-0 group min-h-[48px]"
                    size="lg"
                  >
                    <Volume2 className="h-5 w-5 mr-3 group-hover:animate-pulse" />
                    Start Voice Chat
                    <ArrowRight className="h-5 w-5 ml-3 group-hover:translate-x-1 transition-transform duration-300" />
                  </Button>
                </motion.div>
              </motion.div>

              {/* Social Proof */}
              <motion.div
                variants={itemVariants}
                className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8 text-gray-600"
              >
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">AI-powered guidance</span>
                </div>
                <div className="hidden sm:block w-px h-6 bg-gray-300"></div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  <span className="font-medium">Personalized insights</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Floating visual element */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="relative mt-12 lg:mt-20"
            >
              <motion.div
                   className="relative w-64 h-64 sm:w-80 sm:h-80 bg-gradient-to-br from-electric-blue/10 via-neon-pink/10 to-acid-green/10 rounded-3xl p-8 shadow-2xl border border-electric-blue/30 backdrop-blur-sm"
                animate={{ 
                  rotate: [0, 2, -2, 0],
                  scale: [1, 1.02, 1]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              >
                {/* Content inside */}
                <div className="h-full flex flex-col justify-between text-gray-800">
                  <div>
                    <motion.h3
                      animate={{ x: [-1, 1, -1] }}
                      transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                       className="font-bold text-2xl sm:text-3xl leading-tight text-primary-white"
                    >
                      Your Goals
                      <span className="block text-blue-600">Your Path</span>
                      <span className="block text-sm font-normal text-gray-600 mt-2">Self-Made Futures</span>
                    </motion.h3>
                  </div>
                  
                  <div className="text-right">
                     <div className="font-bold text-sm text-primary-white/90">OFF SCRIPT</div>
                     <div className="text-xs text-primary-white/60">SUMMIT26</div>
                  </div>
                </div>

                {/* Animated corner elements */}
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute top-4 right-4 w-6 h-6 border-2 border-blue-400 rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute bottom-4 left-4 w-4 h-4 bg-purple-400 rounded-full"
                />
              </motion.div>

              {/* Floating elements around the main visual */}
              <motion.div
                animate={{ 
                  y: [0, -15, 0],
                  rotate: [0, 10, 0]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-6 -left-6 w-12 h-12 bg-gradient-to-br from-blue-200 to-purple-200 rounded-xl shadow-lg"
              />
              <motion.div
                animate={{ 
                  y: [0, 12, 0],
                  rotate: [0, -15, 0]
                }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-4 -right-4 w-10 h-10 bg-gradient-to-br from-purple-200 to-indigo-200 rounded-full shadow-lg"
              />
            </motion.div>
          </div>
        </div>

        {/* Bottom scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-6 h-10 border-2 border-gray-400/50 rounded-full flex justify-center"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-1 h-3 bg-gray-400/70 rounded-full mt-2"
            />
          </motion.div>
        </motion.div>
      </section>

      {/* Enhanced Chat Voice Modal */}
      <EnhancedChatVoiceModal
        isOpen={showVoiceModal}
        onClose={handleVoiceModalClose}
        careerContext={undefined}
        currentConversationHistory={[]}
        onConversationUpdate={() => {}}
        onCareerCardsDiscovered={() => {}}
        onConversationEnd={() => {}}
      />
    </>
  );
};

export default Hero;