import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useChatContext } from '../../context/ChatContext';
import { Mic, MicOff, Sparkles, TrendingUp, BookOpen, Users, PanelRightClose, PanelRightOpen, Play } from 'lucide-react';
import { cn } from '../../lib/utils';

// Import our simplified components
import { ElevenLabsWidget } from '../conversation/ElevenLabsWidget';
import { CareerCardsPanel } from '../conversation/CareerCardsPanel';
import { UserPersona } from '../conversation/PersonaDetector';

// Import progressive engagement types
import { EnhancedCareerProfile } from '../../services/careerProfileBuilder';
import { CareerInsight } from '../../services/conversationAnalyzer';

// Import UI components
import { Card } from '../ui/card';
import { Button } from '../ui/button';

interface CareerCard {
  id: string;
  title: string;
  description: string;
  industry: string;
  averageSalary: {
    entry: string;
    experienced: string;
    senior: string;
  };
  growthOutlook: string;
  entryRequirements: string[];
  trainingPathways: string[];
  keySkills: string[];
  workEnvironment: string;
  nextSteps: string[];
  confidence: number;
  sourceData: string;
  location: string;
  generatedAt: string;
}

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
  
  // Career cards state
  const [careerCards, setCareerCards] = useState<CareerCard[]>([]);
  const [hasStartedConversation, setHasStartedConversation] = useState(false);
  
  // Progressive engagement state (legacy - keeping for compatibility)
  const [careerProfile, setCareerProfile] = useState<EnhancedCareerProfile | null>(null);
  const [showInsightsPanel, setShowInsightsPanel] = useState(false);
  const [newInsights, setNewInsights] = useState<CareerInsight[]>([]);
  const [showRegistrationPrompt, setShowRegistrationPrompt] = useState(false);

  // Check if conversation has started based on messages or career cards
  useEffect(() => {
    if (messages && messages.length > 0) {
      setHasStartedConversation(true);
    }
  }, [messages]);

  useEffect(() => {
    if (careerCards.length > 0) {
      setHasStartedConversation(true);
    }
  }, [careerCards]);

  // Handle career cards generated from ElevenLabs widget
  const handleCareerCardsGenerated = useCallback((newCards: CareerCard[]) => {
    console.log('🎯 ConversationView: Received career cards:', newCards.length);
    setCareerCards(prev => [...prev, ...newCards]);
    setHasStartedConversation(true);
  }, []);

  // Handle persona updates
  const handlePersonaUpdate = useCallback((persona: UserPersona) => {
    setUserPersona(persona);
  }, []);

  // Handle registration prompt (legacy)
  const handleRegistrationPrompt = useCallback(() => {
    setShowRegistrationPrompt(true);
    console.log('Registration prompt triggered');
  }, []);

  return (
    <div className={cn("flex h-full bg-gray-50", className)}>
      {/* Main Conversation Area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 max-w-7xl mx-auto w-full">
        
        {/* Left Panel - ElevenLabs Widget */}
        <div className="lg:w-1/2 flex flex-col">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              🎙️ Voice Career Exploration
            </h1>
            <p className="text-gray-600">
              Talk about your interests and get personalized career recommendations powered by AI.
            </p>
          </div>
          
          <ElevenLabsWidget
            onCareerCardsGenerated={handleCareerCardsGenerated}
            className="flex-1"
          />
          
          {/* Quick Start Tips */}
          <div className="mt-4 bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-800 mb-2">💡 Quick Start Tips</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• "I enjoy solving problems and working with technology"</li>
              <li>• "I want to help people and make a difference"</li>
              <li>• "I'm creative and love visual design"</li>
              <li>• "I'm good with numbers and analyzing data"</li>
            </ul>
          </div>
        </div>

        {/* Right Panel - Career Cards */}
        <div className="lg:w-1/2 flex flex-col">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              ✨ Your Personalized Matches
            </h2>
            <p className="text-gray-600">
              Real-time career recommendations based on our conversation.
            </p>
          </div>
          
          <CareerCardsPanel
            cards={careerCards}
            className="flex-1"
          />
        </div>
      </div>

      {/* Legacy insights panel - hidden for now but keeping for compatibility */}
      <AnimatePresence>
        {false && showInsightsPanel && careerProfile && (
          <div className="w-80 h-full bg-white border-l shadow-lg">
            {/* Legacy insights panel content would go here */}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}; 