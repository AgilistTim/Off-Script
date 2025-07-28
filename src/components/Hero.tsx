import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useAnimation } from 'framer-motion';
import { Sparkles, ArrowRight, Volume2, Users, Zap } from 'lucide-react';
import { Button } from './ui/button';

const Hero: React.FC = () => {
  const navigate = useNavigate();
  const controls = useAnimation();
  const [isVisible, setIsVisible] = useState(false);

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: [0.6, 0.01, 0.05, 0.95]
      }
    }
  };

  const glitchVariants = {
    hidden: { 
      x: 0,
      textShadow: "none"
    },
    visible: {
      x: [0, -2, 2, 0],
      textShadow: [
        "none",
        "2px 0 #ff006e, -2px 0 #00ffff",
        "-2px 0 #ff006e, 2px 0 #00ffff",
        "none"
      ],
      transition: {
        duration: 0.3,
        repeat: Infinity,
        repeatDelay: 3,
        ease: "easeInOut"
      }
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-street" id="hero">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-20 left-10 w-32 h-32 bg-electric-blue/20 rounded-full blur-xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-24 h-24 bg-cyber-yellow/30 rounded-full blur-lg"
          animate={{
            x: [0, -80, 0],
            y: [0, 30, 0],
            scale: [1, 0.8, 1]
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.div
          className="absolute top-1/2 left-1/4 w-16 h-16 bg-neon-pink/25 rounded-full blur-md"
          animate={{
            rotate: [0, 360],
            scale: [1, 1.5, 1]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 container mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-screen py-20">
          
          {/* Left side - Content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={controls}
            className="space-y-8 lg:space-y-12"
          >
            {/* Event Badge with link */}
            <motion.a
              href="https://offscriptgen.com" 
              target="_blank" 
              rel="noopener noreferrer"
              variants={itemVariants}
              whileHover={{ scale: 1.05, rotate: -1 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center space-x-3 bg-bg-dark-glass backdrop-blur-sm px-6 py-3 rounded-full border border-primary-white/20 group transition-all duration-300 hover:bg-primary-white/10"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="h-5 w-5 text-cyber-yellow" />
              </motion.div>
              <span className="text-primary-white font-bold text-sm uppercase tracking-wider">
                LDN / 24-25 JAN 2026
              </span>
              <ArrowRight className="h-4 w-4 text-primary-white group-hover:translate-x-1 transition-transform duration-300" />
            </motion.a>
            
            {/* Main Headlines */}
            <div className="space-y-6">
              <motion.div variants={itemVariants} className="space-y-2">
                <motion.h1
                  variants={glitchVariants}
                  className="font-street text-hero-xl text-primary-white leading-none uppercase"
                >
                  FLIP THE
                </motion.h1>
                <motion.h1
                  variants={glitchVariants}
                  className="font-street text-hero-xl text-transparent bg-gradient-to-r from-electric-blue via-neon-pink to-cyber-yellow bg-clip-text leading-none uppercase"
                  style={{ WebkitBackgroundClip: 'text' }}
                >
                  SCRIPT
                </motion.h1>
              </motion.div>

              <motion.div variants={itemVariants}>
                <h2 className="font-bold text-hero-lg text-primary-white/90 leading-tight">
                  Skip University Debt.<br />
                  <span className="text-transparent bg-gradient-to-r from-cyber-yellow to-electric-blue bg-clip-text">
                    Land UK Jobs.
                  </span>
                </h2>
              </motion.div>

              <motion.p
                variants={itemVariants}
                className="text-xl text-primary-white/80 leading-relaxed max-w-lg font-medium"
              >
                AI-powered career guidance for <strong className="text-cyber-yellow">alternative pathways</strong> that get you career-ready in months, not years.
              </motion.p>
            </div>

            {/* Action Buttons */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={() => navigate('/chat')}
                  className="bg-gradient-to-r from-neon-pink to-hot-magenta hover:from-hot-magenta hover:to-neon-pink text-primary-white font-bold text-xl px-8 py-6 rounded-button shadow-glow-pink transition-all duration-300 border-0 group"
                  size="lg"
                >
                  <Volume2 className="h-6 w-6 mr-3 group-hover:animate-bounce" />
                  Start Voice Chat
                  <ArrowRight className="h-6 w-6 ml-3 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="white"
                  size="lg"
                  onClick={() => scrollToSection('career-journey')}
                  className="bg-primary-white/10 backdrop-blur-sm text-primary-white border-primary-white/30 hover:bg-primary-white/20 font-bold text-xl px-8 py-6 group"
                >
                  <Zap className="h-6 w-6 mr-3 group-hover:rotate-12 transition-transform duration-300" />
                  Explore Pathways
                </Button>
              </motion.div>
            </motion.div>

            {/* Social Proof */}
            <motion.div
              variants={itemVariants}
              className="flex items-center space-x-6 text-primary-white/70"
            >
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-electric-blue" />
                <span className="font-semibold">50K+ UK Success Stories</span>
              </div>
              <div className="w-px h-6 bg-primary-white/30"></div>
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-cyber-yellow" />
                <span className="font-semibold">10x Faster Entry</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right side - Visual Element */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="relative lg:flex justify-center items-center hidden"
          >
            <div className="relative">
              {/* Main visual container */}
              <motion.div
                animate={{ 
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.02, 1]
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="w-80 h-96 bg-gradient-to-br from-deep-purple via-hot-magenta to-neon-pink rounded-3xl p-8 shadow-brutal relative overflow-hidden"
              >
                {/* Overlay pattern */}
                <div className="absolute inset-0 bg-gradient-brutal opacity-10 bg-brutal"></div>
                
                {/* Content inside */}
                <div className="relative z-10 h-full flex flex-col justify-between text-primary-white">
                  <div>
                    <motion.h3
                      animate={{ x: [-2, 2, -2] }}
                      transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                      className="font-street text-3xl uppercase leading-tight"
                    >
                      MAKE UNI WORK<br />
                      FOR YOU<br />
                      <span className="text-cyber-yellow">NOT THE<br />OTHER WAY<br />AROUND</span>
                    </motion.h3>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-bold text-sm">OFF SCRIPT</div>
                    <div className="text-xs opacity-80">SUMMIT26</div>
                  </div>
                </div>

                {/* Animated corner elements */}
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute top-4 right-4 w-8 h-8 border-2 border-electric-blue rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute bottom-4 left-4 w-6 h-6 bg-cyber-yellow rounded-full"
                />
              </motion.div>

              {/* Floating elements around the main visual */}
              <motion.div
                animate={{ 
                  y: [0, -20, 0],
                  rotate: [0, 10, 0]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-8 -left-8 w-16 h-16 bg-gradient-cyber rounded-xl shadow-glow-blue"
              />
              <motion.div
                animate={{ 
                  y: [0, 15, 0],
                  rotate: [0, -15, 0]
                }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-6 -right-6 w-12 h-12 bg-gradient-sunset rounded-full shadow-glow-pink"
              />
            </div>
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
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-6 h-10 border-2 border-primary-white/50 rounded-full flex justify-center"
        >
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-1 h-3 bg-primary-white/70 rounded-full mt-2"
          />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;