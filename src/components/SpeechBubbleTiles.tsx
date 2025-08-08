import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, Target, Users, Crown, Rocket, Brain, Star } from 'lucide-react';
import { EnhancedChatVoiceModal } from './conversation/EnhancedChatVoiceModal';

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

  const getColorClasses = (color: string) => {
    const colors = {
      blue: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-600",
        icon: "text-blue-500",
        hover: "hover:bg-blue-100",
        gradient: "from-blue-500 to-blue-600"
      },
      purple: {
        bg: "bg-purple-50",
        border: "border-purple-200",
        text: "text-purple-600",
        icon: "text-purple-500",
        hover: "hover:bg-purple-100",
        gradient: "from-purple-500 to-purple-600"
      },
      indigo: {
        bg: "bg-indigo-50",
        border: "border-indigo-200",
        text: "text-indigo-600",
        icon: "text-indigo-500",
        hover: "hover:bg-indigo-100",
        gradient: "from-indigo-500 to-indigo-600"
      }
    };
    return colors[color as keyof typeof colors] || colors.blue;
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
      <section className="py-20 bg-gradient-to-br from-primary-black via-primary-gray to-primary-black relative overflow-hidden text-primary-white">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 180, 360]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-10 right-10 w-64 h-64 bg-blue-200/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1.1, 1, 1.1],
              rotate: [360, 180, 0]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-10 left-10 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl"
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
               className="font-bold text-4xl sm:text-5xl lg:text-6xl text-primary-white mb-6"
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
               className="text-xl text-primary-white/80 max-w-3xl mx-auto leading-relaxed"
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
              const colors = getColorClasses(story.color);
              
              return (
                <motion.div
                  key={story.id}
                  variants={cardVariants}
                  whileHover={{ 
                    scale: 1.02,
                    y: -5
                  }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    relative cursor-pointer group overflow-hidden rounded-2xl 
                    ${colors.bg} ${colors.border} border transition-all duration-500
                    shadow-lg hover:shadow-xl ${colors.hover}
                  `}
                  onClick={() =>
                    handleCardClick({
                      title: `${story.title} ${story.subtitle}`.trim(),
                      description: story.message,
                      contextId: story.context,
                    })
                  }
                >
                  {/* Content */}
                   <div className="relative z-10 p-8 lg:p-10 h-full flex flex-col justify-between min-h-[320px] text-primary-white">
                    {/* Header */}
                    <div className="space-y-6">
                      <div className="flex items-start justify-between">
                        <motion.div
                          whileHover={{ rotate: 12, scale: 1.1 }}
                          transition={{ duration: 0.3 }}
                          className="w-16 h-16 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-sm"
                        >
                          <IconComponent className={`h-8 w-8 ${colors.icon}`} />
                        </motion.div>
                        
                        <motion.div
                          whileHover={{ x: 4 }}
                          transition={{ duration: 0.3 }}
                          className="opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                        >
                          <ArrowRight className="h-6 w-6 text-gray-400" />
                        </motion.div>
                      </div>

                      <div>
                        <motion.h3
                          whileHover={{ x: [0, -1, 1, 0] }}
                          transition={{ duration: 0.3 }}
                           className="font-bold text-2xl lg:text-3xl text-primary-white leading-tight mb-2"
                        >
                          {story.title}
                        </motion.h3>
                        <h4 className={`font-semibold text-lg ${colors.text} uppercase tracking-wide`}>
                          {story.subtitle}
                        </h4>
                      </div>
                    </div>

                    {/* Message */}
                    <div className="space-y-4">
                       <p className="text-primary-white/80 text-lg font-medium leading-relaxed">
                        {story.message}
                      </p>
                      
                      <div className="flex items-center space-x-2 text-gray-500">
                        <Star className="h-4 w-4" />
                        <span className="text-sm font-medium">{story.description}</span>
                      </div>
                    </div>

                    {/* Interactive Elements */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex items-center justify-between pt-4 border-t border-gray-200"
                    >
                      <button
                        type="button"
                        aria-label={`Ask AI about ${story.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardClick({
                            title: `${story.title} ${story.subtitle}`.trim(),
                            description: story.message,
                            contextId: story.context,
                          });
                        }}
                        className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                      >
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-500">Ask AI about this</span>
                      </button>
                      
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        className={`w-8 h-8 bg-gradient-to-r ${colors.gradient} rounded-full flex items-center justify-center group-hover:shadow-lg transition-all duration-300`}
                      >
                        <ArrowRight className="h-4 w-4 text-white" />
                      </motion.div>
                    </motion.div>
                  </div>

                  {/* Subtle hover effect */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileHover={{ 
                      opacity: [0, 0.05, 0],
                    }}
                    transition={{ duration: 0.3 }}
                    className={`absolute inset-0 bg-gradient-to-r ${colors.gradient} mix-blend-multiply rounded-2xl`}
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
              className="text-gray-500 text-sm mt-6 font-medium"
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