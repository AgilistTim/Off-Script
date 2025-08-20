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
      className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-50 p-6"
    >
      <motion.div
        className="border-2 border-black rounded-3xl p-8 max-w-2xl w-full relative overflow-hidden shadow-2xl"
        style={{ backgroundColor: 'white !important' }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.3 }}
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'white !important' }} />
        <motion.div
          className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-200/40 to-transparent rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ duration: 4, repeat: Infinity }}
        />

        {/* Close Button */}
        <button
          onClick={onDismiss}
          className="absolute top-6 right-6 w-10 h-10 bg-gray-100/80 hover:bg-gray-200/80 border border-gray-300/50 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
        >
          <X className="w-5 h-5 text-black" />
        </button>

        {/* Header */}
        <div className="relative mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <motion.div
              className="w-16 h-16 bg-gradient-to-r from-black to-gray-700 rounded-2xl flex items-center justify-center"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            >
              <Crown className="w-8 h-8 text-white" />
            </motion.div>
            <div>
              <motion.h3 
                className="text-3xl font-street font-black text-black mb-2"
              >
                UNLOCK CAREER MODE
              </motion.h3>
              <p className="text-gray-700 font-bold text-lg">
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
              color: "black",
              gradient: "from-gray-100/80 to-gray-50/40"
            },
            {
              icon: Target,
              title: "PERSONALIZED ROADMAP", 
              description: "Custom pathways based on UK market data",
              color: "black",
              gradient: "from-gray-100/80 to-gray-50/40"
            },
            {
              icon: BookOpen,
              title: "EXCLUSIVE CONTENT",
              description: "Access to premium career resources & guides",
              color: "black",
              gradient: "from-gray-100/80 to-gray-50/40"
            },
            {
              icon: Zap,
              title: "PRIORITY SUPPORT",
              description: "Direct access to career experts & mentors",
              color: "black",
              gradient: "from-gray-100/80 to-gray-50/40"
            }
          ].map((benefit, index) => (
            <motion.div
              key={benefit.title}
              className={`bg-gradient-to-br ${benefit.gradient} backdrop-blur-sm border border-gray-200/60 rounded-2xl p-6 hover:scale-105 transition-all duration-300`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ 
                boxShadow: `0 0 30px rgba(0, 0, 0, 0.1)`
              }}
            >
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 bg-gradient-to-r from-${benefit.color} to-gray-600 rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <benefit.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-street font-bold text-black text-lg mb-2">{benefit.title}</h4>
                  <p className="text-gray-600 text-sm font-medium">{benefit.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="relative">
          <div className="text-center mb-6">
            <motion.p 
              className="text-black font-bold text-xl mb-2"
            >
              JOIN 50K+ CAREER REBELS
            </motion.p>
            <p className="text-gray-600 font-semibold">
              Break free from traditional career paths
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <motion.button
              onClick={onRegister}
              className="flex-1 bg-black hover:bg-gray-800 text-white font-street font-black text-lg py-4 px-8 rounded-2xl transition-all duration-300 flex items-center justify-center space-x-3 shadow-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <UserPlus className="w-6 h-6" />
              <span>START CAREER REVOLUTION</span>
              <ArrowRight className="w-6 h-6" />
            </motion.button>
            
            <motion.button
              onClick={onDismiss}
              className="bg-gray-100/80 hover:bg-gray-200/80 text-black border border-gray-300/50 font-semibold py-4 px-6 rounded-2xl transition-all duration-300 hover:scale-105"
              whileHover={{ borderColor: "rgba(0, 0, 0, 0.2)" }}
            >
              Maybe Later
            </motion.button>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              ✨ <span className="text-black font-semibold">FREE</span> to start • No credit card required • Cancel anytime
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}; 