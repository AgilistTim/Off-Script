import React from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Star, TrendingUp, BookOpen, Target, ArrowRight, X, Zap, Crown } from 'lucide-react';

interface RegistrationPromptProps {
  onRegister: () => void;
  onDismiss: () => void;
}

export const RegistrationPrompt: React.FC<RegistrationPromptProps> = ({
  onRegister,
  onDismiss
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 50 }}
      transition={{ duration: 0.4, ease: [0.6, 0.01, 0.05, 0.95] }}
      className="fixed inset-0 bg-primary-black/80 backdrop-blur-lg flex items-center justify-center z-50 p-6"
    >
      <motion.div
        className="bg-gradient-to-br from-primary-white/15 to-primary-white/5 backdrop-blur-xl border border-electric-blue/30 rounded-3xl p-8 max-w-2xl w-full relative overflow-hidden shadow-glow-blue"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.3 }}
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-electric-blue/10 via-neon-pink/5 to-cyber-yellow/10 pointer-events-none" />
        <motion.div
          className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-neon-pink/20 to-transparent rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ duration: 4, repeat: Infinity }}
        />

        {/* Close Button */}
        <button
          onClick={onDismiss}
          className="absolute top-6 right-6 w-10 h-10 bg-primary-white/10 hover:bg-primary-white/20 border border-primary-white/20 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
        >
          <X className="w-5 h-5 text-primary-white" />
        </button>

        {/* Header */}
        <div className="relative mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <motion.div
              className="w-16 h-16 bg-gradient-to-r from-electric-blue to-neon-pink rounded-2xl flex items-center justify-center"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            >
              <Crown className="w-8 h-8 text-primary-white" />
            </motion.div>
            <div>
              <motion.h3 
                className="text-3xl font-street font-black text-transparent bg-clip-text bg-gradient-to-r from-electric-blue via-neon-pink to-cyber-yellow mb-2"
                animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{ backgroundSize: "200% 100%" }}
              >
                UNLOCK CAREER MODE*
              </motion.h3>
              <p className="text-electric-blue font-bold text-lg">
                SAVE YOUR PROGRESS & BUILD YOUR FUTURE
              </p>
            </div>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 relative">
          {[
            {
              icon: TrendingUp,
              title: "ADVANCED ANALYSIS",
              description: "AI-powered career insights with 95% accuracy rate",
              color: "electric-blue",
              gradient: "from-electric-blue/20 to-electric-blue/5"
            },
            {
              icon: Target,
              title: "PERSONALIZED ROADMAP", 
              description: "Custom pathways based on UK market data",
              color: "neon-pink",
              gradient: "from-neon-pink/20 to-neon-pink/5"
            },
            {
              icon: BookOpen,
              title: "EXCLUSIVE CONTENT",
              description: "Access to premium career resources & guides",
              color: "cyber-yellow",
              gradient: "from-cyber-yellow/20 to-cyber-yellow/5"
            },
            {
              icon: Zap,
              title: "PRIORITY SUPPORT",
              description: "Direct access to career experts & mentors",
              color: "acid-green",
              gradient: "from-acid-green/20 to-acid-green/5"
            }
          ].map((benefit, index) => (
            <motion.div
              key={benefit.title}
              className={`bg-gradient-to-br ${benefit.gradient} backdrop-blur-sm border border-${benefit.color}/30 rounded-2xl p-6 hover:scale-105 transition-all duration-300`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ 
                boxShadow: `0 0 30px rgba(${benefit.color === 'electric-blue' ? '0, 255, 255' : benefit.color === 'neon-pink' ? '255, 0, 110' : benefit.color === 'cyber-yellow' ? '255, 255, 0' : '0, 255, 0'}, 0.3)`
              }}
            >
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 bg-gradient-to-r from-${benefit.color} to-${benefit.color}/70 rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <benefit.icon className="w-6 h-6 text-primary-black" />
                </div>
                <div>
                  <h4 className="font-street font-bold text-primary-white text-lg mb-2">{benefit.title}</h4>
                  <p className={`text-${benefit.color}/80 text-sm font-medium`}>{benefit.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="relative">
          <div className="text-center mb-6">
            <motion.p 
              className="text-primary-white font-bold text-xl mb-2"
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
              JOIN 50K+ CAREER REBELS
            </motion.p>
            <p className="text-electric-blue/80 font-semibold">
              Break free from traditional career paths
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <motion.button
              onClick={onRegister}
              className="flex-1 bg-gradient-to-r from-electric-blue via-neon-pink to-cyber-yellow hover:from-neon-pink hover:via-cyber-yellow hover:to-electric-blue text-primary-black font-street font-black text-lg py-4 px-8 rounded-2xl transition-all duration-300 flex items-center justify-center space-x-3 shadow-glow-pink"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <UserPlus className="w-6 h-6" />
              <span>START CAREER REVOLUTION</span>
              <ArrowRight className="w-6 h-6" />
            </motion.button>
            
            <motion.button
              onClick={onDismiss}
              className="bg-primary-white/10 hover:bg-primary-white/20 text-primary-white border border-primary-white/30 font-semibold py-4 px-6 rounded-2xl transition-all duration-300 hover:scale-105"
              whileHover={{ borderColor: "rgba(255, 255, 255, 0.5)" }}
            >
              Maybe Later
            </motion.button>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-primary-white/60 text-sm">
              ✨ <span className="text-cyber-yellow font-semibold">FREE</span> to start • No credit card required • Cancel anytime
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}; 