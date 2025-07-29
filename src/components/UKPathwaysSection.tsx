import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Target, PoundSterling, Users, ArrowRight, Zap, Crown, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UKPathwaysSection: React.FC = () => {
  const navigate = useNavigate();

  const offScriptCards = [
    {
      id: 1,
      title: "UK-SPECIFIC",
      subtitle: "AI GUIDANCE",
      message: "Personalized career recommendations based on real UK job market data and regional opportunities.",
      tagline: "DATA GOBLIN",
      icon: Brain,
      bgGradient: "bg-gradient-to-br from-electric-blue via-primary-blue to-deep-purple",
      textAccent: "text-electric-blue",
      shadowColor: "shadow-glow-blue",
      hoverEffect: "hover:shadow-glow-blue hover:scale-[1.02]",
      borderColor: "border-electric-blue/20"
    },
    {
      id: 2,
      title: "10X FASTER",
      subtitle: "ENTRY",
      message: "Alternative pathways: months not years to become career-ready with real-world skills.",
      tagline: "BUILDER", 
      icon: Target,
      bgGradient: "bg-gradient-to-br from-sunset-orange via-primary-peach to-hot-magenta",
      textAccent: "text-sunset-orange",
      shadowColor: "shadow-glow-pink",
      hoverEffect: "hover:shadow-glow-pink hover:scale-[1.02]",
      borderColor: "border-sunset-orange/20"
    },
    {
      id: 3,
      title: "REAL UK",
      subtitle: "SALARIES",
      message: "Verified salary data from actual UK professionals, not estimates or outdated figures.",
      tagline: "GRINDER",
      icon: PoundSterling,
      bgGradient: "bg-gradient-to-br from-acid-green via-cyber-yellow to-electric-blue",
      textAccent: "text-acid-green",
      shadowColor: "shadow-glow",
      hoverEffect: "hover:shadow-glow hover:scale-[1.02]",
      borderColor: "border-acid-green/20"
    },
    {
      id: 4,
      title: "50K+ SUCCESS",
      subtitle: "STORIES",
      message: "Join thousands who've launched careers without university debt across the UK.",
      tagline: "LABRAT",
      icon: Users,
      bgGradient: "bg-gradient-to-br from-deep-purple via-hot-magenta to-neon-pink",
      textAccent: "text-hot-magenta",
      shadowColor: "shadow-glow-pink",
      hoverEffect: "hover:shadow-glow-pink hover:scale-[1.02]",
      borderColor: "border-hot-magenta/20"
    }
  ];

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

  const cardVariants = {
    hidden: { 
      y: 80, 
      opacity: 0,
      rotateX: 15
    },
    visible: {
      y: 0,
      opacity: 1,
      rotateX: 0,
      transition: {
        duration: 0.8,
        ease: [0.6, 0.01, 0.05, 0.95]
      }
    }
  };

  return (
    <section className="py-section bg-primary-black relative overflow-hidden" id="career-journey">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 90, 180, 270, 360]
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-neon-pink/10 to-electric-blue/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 270, 180, 90, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-cyber-yellow/10 to-deep-purple/10 rounded-full blur-3xl"
        />
      </div>

      <div className="container relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center space-x-3 bg-bg-dark-glass backdrop-blur-sm px-6 py-3 rounded-full border border-primary-white/20 mb-8"
          >
            <Crown className="h-5 w-5 text-cyber-yellow" />
            <span className="text-primary-white font-bold text-sm uppercase tracking-wider">
              Why Choose Off Script?
            </span>
          </motion.div>

          <motion.h2
            variants={{
              hidden: { opacity: 0, y: 30 },
              visible: { opacity: 1, y: 0 }
            }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="font-street text-hero-lg text-primary-white mb-6 uppercase leading-tight"
          >
            SELF-MADE
            <span className="block text-transparent bg-gradient-to-r from-cyber-yellow via-electric-blue to-neon-pink bg-clip-text">
              FUTURES
            </span>
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-xl text-primary-white/80 max-w-3xl mx-auto leading-relaxed"
          >
            Explore proven UK pathways that help you land meaningful careers without university debt. 
            <strong className="text-cyber-yellow"> Make uni work for you, not the other way around.</strong>
          </motion.p>
        </motion.div>

        {/* Off Script Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 mb-20"
        >
          {offScriptCards.map((card, index) => {
            const IconComponent = card.icon;
            
            return (
              <motion.div
                key={card.id}
                variants={cardVariants}
                whileHover={{ 
                  scale: 1.03,
                  rotateY: index % 2 === 0 ? 2 : -2
                }}
                whileTap={{ scale: 0.98 }}
                className={`
                  relative cursor-pointer group overflow-hidden rounded-3xl 
                  ${card.bgGradient} ${card.shadowColor} ${card.hoverEffect}
                  transition-all duration-500 border-2 ${card.borderColor}
                  backdrop-blur-sm
                `}
                onClick={() => navigate('/chat')}
                style={{ perspective: '1000px' }}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-gradient-brutal opacity-5 bg-brutal"></div>
                
                {/* Glitch Lines */}
                <motion.div
                  animate={{
                    x: [0, 100, -100, 0],
                    opacity: [0, 0.3, 0]
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    repeatDelay: 5,
                    ease: "easeInOut"
                  }}
                  className="absolute top-0 left-0 w-full h-0.5 bg-electric-blue"
                />

                {/* Content */}
                <div className="relative z-10 p-8 lg:p-10 h-full flex flex-col justify-between min-h-[350px]">
                  {/* Header */}
                  <div className="space-y-6">
                    <div className="flex items-start justify-between">
                      <motion.div
                        whileHover={{ 
                          rotate: [0, -10, 10, -5, 0],
                          scale: [1, 1.1, 1]
                        }}
                        transition={{ duration: 0.5 }}
                        className="w-16 h-16 bg-primary-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-primary-white/30"
                      >
                        <IconComponent className="h-8 w-8 text-primary-white" />
                      </motion.div>
                      
                      {/* Tagline */}
                      <motion.div
                        whileHover={{ x: 5, y: -2 }}
                        className="bg-primary-black/30 backdrop-blur-sm px-3 py-1 rounded-lg border border-primary-white/20"
                      >
                        <span className={`font-bold text-sm uppercase tracking-wider ${card.textAccent}`}>
                          {card.tagline}
                        </span>
                      </motion.div>
                    </div>

                    <div>
                      <motion.h3
                        whileHover={{ 
                          x: [0, -3, 3, 0],
                          textShadow: [
                            "none",
                            "2px 0 #ff006e, -2px 0 #00ffff",
                            "none"
                          ]
                        }}
                        transition={{ duration: 0.3 }}
                        className="font-street text-3xl lg:text-4xl text-primary-white leading-tight uppercase mb-2"
                      >
                        {card.title}
                      </motion.h3>
                      <h4 className={`font-bold text-lg ${card.textAccent} uppercase tracking-wide`}>
                        {card.subtitle}
                      </h4>
                    </div>
                  </div>

                  {/* Message */}
                  <div className="space-y-6">
                    <p className="text-primary-white/90 text-lg font-medium leading-relaxed">
                      {card.message}
                    </p>
                    
                    {/* Action Area */}
                    <motion.div
                      whileHover={{ y: -2 }}
                      className="flex items-center justify-between pt-6 border-t border-primary-white/20"
                    >
                      <div className="flex items-center space-x-2 text-primary-white/70">
                        <Zap className="h-4 w-4" />
                        <span className="text-sm font-medium">Join the revolution</span>
                      </div>
                      
                      <motion.div
                        whileHover={{ 
                          scale: 1.2,
                          rotate: 15
                        }}
                        className="w-10 h-10 bg-primary-white/20 rounded-full flex items-center justify-center group-hover:bg-primary-white/30 transition-colors duration-300 border border-primary-white/30"
                      >
                        <ArrowRight className="h-5 w-5 text-primary-white" />
                      </motion.div>
                    </motion.div>
                  </div>
                </div>

                {/* Hover Overlay Effect */}
                <motion.div
                  initial={{ opacity: 0 }}
                  whileHover={{ 
                    opacity: [0, 0.1, 0],
                  }}
                  transition={{ duration: 0.3, repeat: 3 }}
                  className={`absolute inset-0 bg-gradient-to-r from-electric-blue/20 to-neon-pink/20 mix-blend-overlay rounded-3xl`}
                />

                {/* Corner Accent */}
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute top-4 right-4 w-3 h-3 bg-cyber-yellow rounded-full opacity-60"
                />
              </motion.div>
            );
          })}
        </motion.div>

        {/* Main CTA */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-center"
        >
          <motion.button
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0 0 40px rgba(138, 201, 38, 0.4)"
            }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/chat')}
            className="bg-gradient-to-r from-acid-green to-electric-blue hover:from-electric-blue hover:to-acid-green text-primary-black font-bold text-xl px-16 py-6 rounded-button transition-all duration-300 shadow-glow group border-2 border-transparent hover:border-acid-green/30"
          >
            <span className="flex items-center space-x-4">
              <Rocket className="h-6 w-6 group-hover:animate-bounce" />
              <span>START YOUR CAREER JOURNEY</span>
              <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform duration-300" />
            </span>
          </motion.button>
          
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-primary-white/60 text-base mt-6 font-medium"
          >
            Get personalized UK career guidance powered by 
            <span className="text-electric-blue font-bold"> real market data</span>
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex justify-center items-center space-x-8 mt-8 text-primary-white/70"
          >
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-cyber-yellow" />
              <span className="font-semibold">50K+ Success Stories</span>
            </div>
            <div className="w-px h-6 bg-primary-white/30"></div>
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-electric-blue" />
              <span className="font-semibold">10x Faster Entry</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default UKPathwaysSection; 