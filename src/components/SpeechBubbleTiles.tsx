import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, Target, Users, Crown, Rocket, Brain } from 'lucide-react';

const SpeechBubbleTiles: React.FC = () => {
  const navigate = useNavigate();

  const stories = [
    {
      id: 1,
      title: "SKIP UNIVERSITY DEBT",
      subtitle: "ALTERNATIVE PATHWAYS TO UK CAREERS",
      message: "Why pay £35K+ when bootcamps cost £8K and get you hired faster?",
      icon: Target,
      gradient: "bg-gradient-street",
      shadowColor: "shadow-glow-pink",
      hoverGradient: "hover:bg-gradient-cyber",
      textAccent: "text-cyber-yellow",
      description: "Break free from the traditional university trap"
    },
    {
      id: 2,
      title: "AI-POWERED",
      subtitle: "CAREER MATCHING",
      message: "Find your perfect UK job path through intelligent conversation.",
      icon: Brain,
      gradient: "bg-gradient-cyber",
      shadowColor: "shadow-glow-blue",
      hoverGradient: "hover:bg-gradient-neon",
      textAccent: "text-electric-blue",
      description: "Smart guidance for the modern workforce"
    },
    {
      id: 3,
      title: "REAL UK",
      subtitle: "SALARIES & DATA",
      message: "Verified data from actual professionals, not outdated estimates.",
      icon: Crown,
      gradient: "bg-gradient-sunset",
      shadowColor: "shadow-glow",
      hoverGradient: "hover:bg-gradient-street",
      textAccent: "text-sunset-orange",
      description: "Truth over marketing promises"
    },
    {
      id: 4,
      title: "EARNING WHILE",
      subtitle: "LEARNING IN 2025",
      message: "Apprenticeships & bootcamps that pay you to gain real skills.",
      icon: Rocket,
      gradient: "bg-gradient-neon",
      shadowColor: "shadow-glow-blue",
      hoverGradient: "hover:bg-gradient-sunset",
      textAccent: "text-acid-green",
      description: "Get paid while you level up"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  const cardVariants = {
    hidden: { 
      y: 60, 
      opacity: 0,
      scale: 0.9
    },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.6, 0.01, 0.05, 0.95]
      }
    }
  };

  return (
    <section className="py-section bg-primary-black relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-10 right-10 w-64 h-64 bg-gradient-to-r from-deep-purple/10 to-neon-pink/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-10 left-10 w-96 h-96 bg-gradient-to-r from-electric-blue/10 to-cyber-yellow/10 rounded-full blur-3xl"
        />
      </div>

      <div className="container relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <motion.h2
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-street text-hero-lg text-primary-white mb-6 uppercase"
          >
            FLIP THE
            <span className="block text-transparent bg-gradient-to-r from-neon-pink via-cyber-yellow to-electric-blue bg-clip-text">
              NARRATIVE
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-xl text-primary-white/80 max-w-2xl mx-auto leading-relaxed"
          >
            Choose your rebellion. These aren't just career paths—they're <strong className="text-cyber-yellow">revolutions</strong> against outdated systems.
          </motion.p>
        </motion.div>

        {/* Story Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12"
        >
          {stories.map((story, index) => {
            const IconComponent = story.icon;
            
            return (
              <motion.div
                key={story.id}
                variants={cardVariants}
                whileHover={{ 
                  scale: 1.03,
                  rotate: index % 2 === 0 ? 1 : -1
                }}
                whileTap={{ scale: 0.98 }}
                className={`relative cursor-pointer group overflow-hidden rounded-3xl ${story.gradient} ${story.shadowColor} transition-all duration-500 ${story.hoverGradient}`}
                onClick={() => navigate('/chat')}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-gradient-brutal opacity-5 bg-brutal"></div>
                
                {/* Animated Border */}
                <motion.div
                  animate={{
                    rotate: [0, 360]
                  }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-3xl bg-gradient-to-r from-electric-blue/20 via-transparent to-neon-pink/20 p-0.5"
                >
                  <div className="w-full h-full rounded-3xl bg-transparent"></div>
                </motion.div>

                {/* Content */}
                <div className="relative z-10 p-8 lg:p-10 h-full flex flex-col justify-between min-h-[320px]">
                  {/* Header */}
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <motion.div
                        whileHover={{ rotate: 12, scale: 1.1 }}
                        transition={{ duration: 0.3 }}
                        className="w-16 h-16 bg-primary-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center"
                      >
                        <IconComponent className="h-8 w-8 text-primary-white" />
                      </motion.div>
                      
                      <motion.div
                        whileHover={{ x: 4 }}
                        transition={{ duration: 0.3 }}
                        className="opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                      >
                        <ArrowRight className="h-6 w-6 text-primary-white" />
                      </motion.div>
                    </div>

                    <div>
                      <motion.h3
                        className="font-street text-3xl lg:text-4xl text-primary-white leading-tight uppercase mb-2"
                        whileHover={{ x: [0, -2, 2, 0] }}
                        transition={{ duration: 0.3 }}
                      >
                        {story.title}
                      </motion.h3>
                      <h4 className={`font-bold text-lg ${story.textAccent} uppercase tracking-wide`}>
                        {story.subtitle}
                      </h4>
                    </div>
                  </div>

                  {/* Message */}
                  <div className="space-y-4">
                    <p className="text-primary-white/90 text-lg font-medium leading-relaxed">
                      {story.message}
                    </p>
                    
                    <div className="flex items-center space-x-2 text-primary-white/70">
                      <Zap className="h-4 w-4" />
                      <span className="text-sm font-medium">{story.description}</span>
                    </div>
                  </div>

                  {/* Interactive Elements */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center justify-between pt-4 border-t border-primary-white/20"
                  >
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-primary-white/60" />
                      <span className="text-sm text-primary-white/60">Join the revolution</span>
                    </div>
                    
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="w-8 h-8 bg-primary-white/20 rounded-full flex items-center justify-center group-hover:bg-primary-white/30 transition-colors duration-300"
                    >
                      <ArrowRight className="h-4 w-4 text-primary-white" />
                    </motion.div>
                  </motion.div>
                </div>

                {/* Glitch Effect on Hover */}
                <motion.div
                  initial={{ opacity: 0 }}
                  whileHover={{ 
                    opacity: [0, 0.1, 0],
                    x: [0, -2, 2, 0]
                  }}
                  transition={{ duration: 0.2, repeat: 2 }}
                  className="absolute inset-0 bg-electric-blue mix-blend-multiply rounded-3xl"
                />
              </motion.div>
            );
          })}
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-center mt-16"
        >
          <motion.button
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0 0 30px rgba(255, 0, 110, 0.4)"
            }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/chat')}
            className="bg-gradient-to-r from-hot-magenta to-deep-purple hover:from-deep-purple hover:to-hot-magenta text-primary-white font-bold text-xl px-12 py-6 rounded-button transition-all duration-300 shadow-glow-pink group border-2 border-transparent hover:border-neon-pink/30"
          >
            <span className="flex items-center space-x-3">
              <Rocket className="h-6 w-6 group-hover:animate-bounce" />
              <span>START YOUR REVOLUTION</span>
              <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform duration-300" />
            </span>
          </motion.button>
          
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-primary-white/60 text-sm mt-4 font-medium"
          >
            Join <span className="text-cyber-yellow font-bold">50,000+</span> who've already broken free
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
};

export default SpeechBubbleTiles; 