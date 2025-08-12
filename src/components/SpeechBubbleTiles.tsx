import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, Target, Users, Crown, Rocket, Brain, Star } from 'lucide-react';
import { EnhancedChatVoiceModal } from './conversation/EnhancedChatVoiceModal';
import { ContextualCard, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { ContextualButton } from './ui/button';

const SpeechBubbleTiles: React.FC = () => {
  const navigate = useNavigate();
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [selectedContext, setSelectedContext] = useState<{
    title: string;
    description?: string;
    contextId?: string;
  } | null>(null);

  const stories = [
    {
      id: 1,
      title: "Skip University Debt",
      subtitle: "Alternative Pathways to UK Careers",
      message: "Why pay £35K+ when bootcamps cost £8K and get you hired faster?",
      icon: Target,
      color: "blue",
      description: "Break free from the traditional university trap",
      context: "university_alternatives"
    },
    {
      id: 2,
      title: "AI-Powered",
      subtitle: "Career Matching",
      message: "Find your perfect UK job path through intelligent conversation.",
      icon: Brain,
      color: "purple",
      description: "Smart guidance for the modern workforce",
      context: "career_matching"
    },
    {
      id: 3,
      title: "Real UK",
      subtitle: "Salaries & Data",
      message: "Verified data from actual professionals, not outdated estimates.",
      icon: Crown,
      color: "indigo",
      description: "Truth over marketing promises",
      context: "salary_data"
    },
    {
      id: 4,
      title: "Earning While",
      subtitle: "Learning in 2025",
      message: "Apprenticeships & bootcamps that pay you to gain real skills.",
      icon: Rocket,
      color: "blue",
      description: "Get paid while you level up",
      context: "earning_while_learning"
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
      y: 40, 
      opacity: 0,
      scale: 0.95
    },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  };



  const handleCardClick = (
    context: { title: string; description?: string; contextId?: string }
  ) => {
    setSelectedContext(context);
    setShowVoiceModal(true);
  };

  const handleVoiceModalClose = () => {
    setShowVoiceModal(false);
    setSelectedContext(null);
  };

  return (
    <>
      <section className="py-20 bg-gradient-to-br from-primary-peach/30 via-primary-mint/30 to-primary-lavender/30 relative overflow-hidden text-primary-black">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 180, 360]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-10 right-10 w-64 h-64 bg-blue-200/30 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1.1, 1, 1.1],
              rotate: [360, 180, 0]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-10 left-10 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl"
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
               className="font-bold text-4xl sm:text-5xl lg:text-6xl text-primary-black mb-6"
            >
              Flip the
              <span className="block text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text">
                Narrative
              </span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
               className="text-xl text-primary-black/80 max-w-3xl mx-auto leading-relaxed"
            >
              Let AI get to know your goals and guide you to the right path. 
              <strong className="text-blue-600"> No judgment. Just smart alternatives.</strong>
            </motion.p>
          </motion.div>

          {/* Story Cards Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 mb-20"
          >
            {stories.map((story, index) => {
              const IconComponent = story.icon;
              
              return (
                <motion.div
                  key={story.id}
                  variants={cardVariants}
                  whileHover={{ 
                    scale: 1.02,
                    y: -5
                  }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() =>
                    handleCardClick({
                      title: `${story.title} ${story.subtitle}`.trim(),
                      description: story.message,
                      contextId: story.context,
                    })
                  }
                  className="cursor-pointer"
                >
                  <ContextualCard 
                    purpose="interactive" 
                    mood="neutral" 
                    className="h-full min-h-[320px] transition-all duration-500 hover:shadow-xl flex flex-col"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <motion.div
                          whileHover={{ rotate: 12, scale: 1.1 }}
                          transition={{ duration: 0.3 }}
                          className="w-16 h-16 bg-primary-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-sm"
                        >
                          <IconComponent className="h-8 w-8 text-primary-green" />
                        </motion.div>
                        
                        <motion.div
                          whileHover={{ x: 4 }}
                          transition={{ duration: 0.3 }}
                          className="opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                        >
                          <ArrowRight className="h-6 w-6 text-primary-black/40" />
                        </motion.div>
                      </div>

                      
                      <CardTitle className="text-2xl lg:text-3xl text-primary-black leading-tight mb-2">
                        {story.title}
                      </CardTitle>
                      <div className="font-semibold text-lg text-primary-green uppercase tracking-wide">
                        {story.subtitle}
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1">
                      <p className="text-primary-black/80 text-lg font-medium leading-relaxed mb-4">
                        {story.message}
                      </p>
                      
                      <div className="flex items-center space-x-2 text-primary-black/60">
                        <Star className="h-4 w-4" />
                        <span className="text-sm font-medium">{story.description}</span>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-4 border-t border-primary-black/10">
                      <div className="flex items-center justify-center w-full">
                        <ContextualButton
                          intent="chat-cta"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCardClick({
                              title: `${story.title} ${story.subtitle}`.trim(),
                              description: story.message,
                              contextId: story.context,
                            });
                          }}
                          className="text-sm w-full"
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Ask AI about this
                        </ContextualButton>
                      </div>
                    </CardFooter>
                  </ContextualCard>
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
            className="text-center"
          >
            <motion.button
              whileHover={{ 
                scale: 1.02,
                boxShadow: "0 10px 30px rgba(59, 130, 246, 0.3)"
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() =>
                handleCardClick({
                  title: 'Career Discovery',
                  description: 'General exploration to learn about your goals and surface pathways.',
                  contextId: 'general',
                })
              }
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xl px-12 py-6 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl group border-0"
            >
              <span className="flex items-center space-x-3">
                <Rocket className="h-6 w-6 group-hover:animate-pulse" />
                <span>Start Your Journey</span>
                <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform duration-300" />
              </span>
            </motion.button>
            
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-primary-black/60 text-sm mt-6 font-medium"
            >
              Let AI understand your goals and guide you to the right path
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Enhanced Chat Voice Modal */}
      <EnhancedChatVoiceModal
        isOpen={showVoiceModal}
        onClose={handleVoiceModalClose}
        careerContext={selectedContext || undefined}
        currentConversationHistory={[]}
        onConversationUpdate={() => {}}
        onCareerCardsDiscovered={() => {}}
        onConversationEnd={() => {}}
      />
    </>
  );
};

export default SpeechBubbleTiles; 