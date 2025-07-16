import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useChatContext } from '../../context/ChatContext';
import { Mic, MicOff, Sparkles, TrendingUp, BookOpen, Users, PanelRightClose, PanelRightOpen, Play } from 'lucide-react';
import { cn } from '../../lib/utils';

// Import our enhanced components
import { UnifiedChatInterface } from '../conversation/UnifiedChatInterface';
import { UserPersona } from '../conversation/PersonaDetector';
import { InsightsPanel } from '../conversation/InsightsPanel';

// Import progressive engagement types
import { EnhancedCareerProfile } from '../../services/careerProfileBuilder';
import { CareerInsight } from '../../services/conversationAnalyzer';

// Import UI components
import { Card } from '../ui/card';
import { Button } from '../ui/button';

interface ConversationViewProps {
  className?: string;
}

export const ConversationView: React.FC<ConversationViewProps> = ({ className }) => {
  const { currentUser } = useAuth();
  const { messages } = useChatContext();
  const [userPersona, setUserPersona] = useState<UserPersona>({
    type: 'curious_achiever',
    confidence: 0.7,
    traits: [],
    adaptations: {
      maxResponseLength: 150,
      responseStyle: 'encouraging',
      valueDeliveryTimeout: 8000,
      preferredActions: ['explore', 'learn'],
      conversationPace: 'moderate'
    }
  });
  const [hasStartedConversation, setHasStartedConversation] = useState(false);
  
  // Progressive engagement state
  const [careerProfile, setCareerProfile] = useState<EnhancedCareerProfile | null>(null);
  const [showInsightsPanel, setShowInsightsPanel] = useState(false);
  const [newInsights, setNewInsights] = useState<CareerInsight[]>([]);
  const [showRegistrationPrompt, setShowRegistrationPrompt] = useState(false);

  // Check if conversation has started based on messages
  useEffect(() => {
    if (messages && messages.length > 0) {
      setHasStartedConversation(true);
    }
  }, [messages]);

  const handlePersonaUpdate = useCallback((persona: UserPersona) => {
    setUserPersona(persona);
  }, []);

  const handleStartConversation = useCallback(() => {
    setHasStartedConversation(true);
  }, []);

  // Handle career insight discovery
  const handleInsightDiscovered = useCallback((insight: CareerInsight) => {
    setNewInsights(prev => [...prev, insight]);
    
    // Show insights panel after first insight is discovered
    if (!showInsightsPanel) {
      setShowInsightsPanel(true);
    }
  }, [showInsightsPanel]);

  // Handle career profile updates
  const handleProfileUpdate = useCallback((profile: EnhancedCareerProfile) => {
    setCareerProfile(profile);
    
    // Auto-show insights panel when meaningful insights are accumulated
    // TODO: Re-implement with new analyzer
    // if (profile.totalInsights >= 2 && !showInsightsPanel) {
    //   setShowInsightsPanel(true);
    // }
  }, [showInsightsPanel]);

  // Handle registration prompt
  const handleRegistrationPrompt = useCallback(() => {
    setShowRegistrationPrompt(true);
    console.log('Registration prompt triggered - ready for account creation');
    
    // TODO: Show registration modal or navigate to registration
    // For now, just log the career profile data that would be transferred
    if (careerProfile) {
      console.log('Career profile ready for registration:', careerProfile);
      // console.log('Career profile ready for registration:', {
      //   insights: careerProfile.totalInsights,
      //   interests: careerProfile.interests.length,
      //   skills: careerProfile.skills.length,
      //   pathways: careerProfile.suggestedPaths.length
      // });
    }
  }, [careerProfile]);

  // 8-Second Value Delivery: Show immediate persona-based greeting
  const getPersonaGreeting = () => {
    switch (userPersona.type) {
      case 'overwhelmed_explorer':
        return "Hey! I know career planning can feel overwhelming. Let's break it down together, one step at a time. What's on your mind?";
      case 'skeptical_pragmatist':
        return "I get it - you've probably heard a lot of career advice before. I'm here to give you real, practical guidance. What do you actually want to know?";
      case 'curious_achiever':
        return "Amazing! I love working with driven people like you. There's so much we can explore together. What career goals are you excited about?";
      default:
        return "Hey! I'm here to help you navigate your career journey. What would you like to explore today?";
    }
  };

  return (
    <div className={cn("h-full flex bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50", className)}>
      {/* Main Conversation Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Welcome Screen - Only show if no conversation started */}
        <AnimatePresence>
          {!hasStartedConversation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6"
            >
              {/* Hero Section - Immediate Value Delivery */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="text-center mb-8"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Your AI Career Coach
                </h1>
                <p className="text-gray-600 text-sm max-w-xs">
                  Get personalized career guidance in seconds, not hours
                </p>
              </motion.div>

              {/* Start Conversation Button - Primary CTA */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.3 }}
                className="text-center"
              >
                <Button
                  onClick={handleStartConversation}
                  className="px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white text-lg font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Play className="w-6 h-6 mr-2" />
                  Start Conversation
                </Button>
                <p className="text-gray-500 text-sm mt-3">
                  Start with voice or text - your choice
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Unified Chat Interface - Full Integration */}
        <div className="h-full">
          <UnifiedChatInterface
            className="h-full"
            userPersona={userPersona}
            onPersonaUpdate={handlePersonaUpdate}
            initialGreeting={getPersonaGreeting()}
            onVoiceInput={(transcript) => {
              setHasStartedConversation(true);
            }}
            onMessageSent={(message) => {
              setHasStartedConversation(true);
            }}
            onQuickAction={(prompt) => {
              setHasStartedConversation(true);
            }}
          />
        </div>

        {/* Insights Panel Toggle Button */}
        {/* TODO: Re-implement with new analyzer */}
        {/*
        <AnimatePresence>
          {hasStartedConversation && careerProfile && careerProfile.totalInsights > 0 && (
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute top-4 right-4 z-20"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInsightsPanel(!showInsightsPanel)}
                className="bg-white/90 backdrop-blur-sm border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {showInsightsPanel ? (
                  <PanelRightClose className="w-4 h-4 mr-1" />
                ) : (
                  <PanelRightOpen className="w-4 h-4 mr-1" />
                )}
                Insights ({careerProfile.totalInsights})
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        */}
      </div>

      {/* Career Insights Panel */}
      <AnimatePresence>
        {showInsightsPanel && careerProfile && (
          <InsightsPanel
            careerProfile={careerProfile}
            isVisible={showInsightsPanel}
            onRegistrationPrompt={handleRegistrationPrompt}
            className="w-80 h-full"
          />
        )}
      </AnimatePresence>
    </div>
  );
}; 