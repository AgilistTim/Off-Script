import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Target, PoundSterling, Users, ArrowRight, Zap, Crown, Rocket, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EnhancedChatVoiceModal } from './conversation/EnhancedChatVoiceModal';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';

const UKPathwaysSection: React.FC = () => {
  const navigate = useNavigate();
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [selectedContext, setSelectedContext] = useState<{
    title: string;
    description?: string;
    contextId?: string;
  } | null>(null);

  const offScriptCards = [
    {
      id: 1,
      title: "UK-Specific",
      subtitle: "AI Guidance",
      message: "Personalized career recommendations based on real UK job market data and regional opportunities.",
      tagline: "Data-Driven",
      icon: Brain,
      color: "blue",
      context: "uk_specific_guidance"
    },
    {
      id: 2,
      title: "10x Faster",
      subtitle: "Entry",
      message: "Alternative pathways: months not years to become career-ready with real-world skills.",
      tagline: "Efficient", 
      icon: Target,
      color: "purple",
      context: "fast_track_entry"
    },
    {
      id: 3,
      title: "Real UK",
      subtitle: "Salaries",
      message: "Verified salary data from actual UK professionals, not estimates or outdated figures.",
      tagline: "Transparent",
      icon: PoundSterling,
      color: "indigo",
      context: "real_uk_salaries"
    },
    {
      id: 4,
      title: "Adaptive AI",
      subtitle: "Career Coach",
      message: "Powerful AI that learns your goals and supports your journey with smart next steps.",
      tagline: "Personalized",
      icon: Users,
      color: "blue",
      context: "ai_career_coach"
    }
  ];

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
        bg: "bg-gradient-to-br from-primary-mint/30 to-primary-lavender/20",
        border: "border-primary-green/30",
        text: "text-primary-black",
        icon: "text-primary-green",
        hover: "hover:bg-gradient-to-br hover:from-primary-mint/40 hover:to-primary-lavender/30",
        gradient: "from-primary-green to-primary-yellow",
        tagline: "bg-primary-green/20 text-primary-black"
      },
      purple: {
        bg: "bg-gradient-to-br from-primary-peach/30 to-primary-lavender/20",
        border: "border-primary-peach/30",
        text: "text-primary-black",
        icon: "text-primary-peach",
        hover: "hover:bg-gradient-to-br hover:from-primary-peach/40 hover:to-primary-lavender/30",
        gradient: "from-primary-peach to-primary-yellow",
        tagline: "bg-primary-peach/20 text-primary-black"
      },
      indigo: {
        bg: "bg-gradient-to-br from-primary-lavender/30 to-primary-mint/20",
        border: "border-primary-lavender/30",
        text: "text-primary-black",
        icon: "text-primary-lavender",
        hover: "hover:bg-gradient-to-br hover:from-primary-lavender/40 hover:to-primary-mint/30",
        gradient: "from-primary-lavender to-primary-mint",
        tagline: "bg-primary-lavender/20 text-primary-black"
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
      <section className="py-20 bg-gradient-to-br from-primary-white via-primary-mint/40 to-primary-lavender/40 text-primary-black relative overflow-hidden" id="career-journey">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 90, 180, 270, 360]
            }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
           className="absolute top-20 left-20 w-96 h-96 bg-primary-mint/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1.1, 1, 1.1],
              rotate: [360, 270, 180, 90, 0]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
           className="absolute bottom-20 right-20 w-80 h-80 bg-primary-peach/20 rounded-full blur-3xl"
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
               className="inline-flex items-center space-x-3 bg-primary-green/20 backdrop-blur-sm px-6 py-3 rounded-full border border-primary-green/30 mb-8"
            >
              <Crown className="h-5 w-5 text-primary-green" />
               <span className="text-primary-black font-semibold text-sm">
                Why Choose OffScript?
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
               className="font-bold text-4xl sm:text-5xl lg:text-6xl text-primary-black mb-6 leading-tight"
            >
              Self-Made
              <span className="block text-transparent bg-gradient-to-r from-primary-green via-primary-yellow to-primary-peach bg-clip-text">
                Futures
              </span>
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.5 }}
               className="text-xl text-primary-black/80 max-w-3xl mx-auto leading-relaxed"
            >
              Explore proven UK pathways that help you land meaningful careers without university debt. 
              <strong className="text-primary-green"> Let AI understand your goals and guide you to the right path.</strong>
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
            {offScriptCards.map((card) => {
              const IconComponent = card.icon;
              const colors = getColorClasses(card.color);
              
              return (
                <motion.div
                  key={card.id}
                  variants={cardVariants}
                  whileHover={{ 
                    scale: 1.02,
                    y: -5
                  }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() =>
                    handleCardClick({
                      title: `${card.title} ${card.subtitle}`.trim(),
                      description: card.message,
                      contextId: card.context,
                    })
                  }
                  className="cursor-pointer"
                >
                  <Card 
                     
                     
                    className="h-full min-h-[320px] transition-all duration-500 hover:shadow-xl flex flex-col"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <motion.div
                          whileHover={{ rotate: 12, scale: 1.1 }}
                          transition={{ duration: 0.3 }}
                          className="w-16 h-16 bg-primary-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-sm"
                        >
                          <IconComponent className={`h-8 w-8 ${colors.icon}`} />
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
                        {card.title}
                      </CardTitle>
                      <div className="font-semibold text-lg text-primary-green uppercase tracking-wide">
                        {card.subtitle}
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1">
                      <p className="text-primary-black/80 text-lg font-medium leading-relaxed mb-4">
                        {card.message}
                      </p>
                      
                      <div className="flex items-center space-x-2 text-primary-black/60">
                        <Star className="h-4 w-4" />
                        <span className="text-sm font-medium">{card.tagline}</span>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-4 border-t border-primary-black/10">
                      <div className="flex items-center justify-center w-full">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCardClick({
                              title: `${card.title} ${card.subtitle}`.trim(),
                              description: card.message,
                              contextId: card.context,
                            });
                          }}
                          className="text-sm w-full"
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Ask AI about this
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
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
              className="bg-gradient-to-r from-primary-green to-primary-yellow hover:from-primary-yellow hover:to-primary-green text-primary-black font-semibold text-xl px-16 py-6 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl group border-0"
            >
              <span className="flex items-center space-x-4">
                <Rocket className="h-6 w-6 group-hover:animate-pulse" />
                <span>Start Your Career Journey</span>
                <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform duration-300" />
              </span>
            </motion.button>
            
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-gray-500 text-base mt-6 font-medium"
            >
              Get personalized UK career guidance powered by 
              <span className="text-blue-600 font-bold"> AI that understands your goals</span>
            </motion.p>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-8 mt-8 text-gray-600"
            >
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">AI-powered guidance</span>
              </div>
              <div className="hidden sm:block w-px h-6 bg-gray-300"></div>
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-purple-500" />
                <span className="font-semibold">Personalized insights</span>
              </div>
            </motion.div>
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

export default UKPathwaysSection; 