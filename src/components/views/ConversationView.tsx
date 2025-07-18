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
import { RegistrationPrompt } from '../conversation/RegistrationPrompt';
import { PersonCard } from '../conversation/PersonCard';

interface PersonProfile {
  interests: string[];
  goals: string[];
  skills: string[];
  values: string[];
  careerStage: string;
  workStyle: string[];
  lastUpdated: string;
}

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
  
  // Person profile state
  const [personProfile, setPersonProfile] = useState<PersonProfile | null>(null);
  
  // Registration prompt state
  const [showRegistrationPrompt, setShowRegistrationPrompt] = useState(false);
  const [userEngagementCount, setUserEngagementCount] = useState(0);
  
  // Progressive engagement state (legacy - keeping for compatibility)
  const [careerProfile, setCareerProfile] = useState<EnhancedCareerProfile | null>(null);
  const [showInsightsPanel, setShowInsightsPanel] = useState(false);
  const [newInsights, setNewInsights] = useState<CareerInsight[]>([]);

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
    
    // Track engagement - show registration prompt after user gets career cards
    setUserEngagementCount(prev => prev + 1);
  }, []);

  // Handle person profile generated/updated
  const handlePersonProfileGenerated = useCallback((profile: PersonProfile) => {
    console.log('👤 ConversationView: Received person profile:', profile);
    setPersonProfile(profile);
  }, []);

  // Handle person profile updates from the PersonCard component
  const handlePersonProfileUpdate = useCallback((profile: PersonProfile) => {
    console.log('👤 ConversationView: Person profile updated by user:', profile);
    setPersonProfile(profile);
    // Could save to localStorage or send to backend here
  }, []);

  // Handle persona updates
  const handlePersonaUpdate = useCallback((persona: UserPersona) => {
    setUserPersona(persona);
  }, []);

  // Trigger registration prompt immediately when cards are generated
  useEffect(() => {
    // Show registration prompt if:
    // 1. User is not logged in
    // 2. They've received career cards (engaged with the system)
    // 3. We haven't shown the prompt yet
    // 4. User hasn't dismissed it in this session
    const dismissed = sessionStorage.getItem('registration-prompt-dismissed');
    
    if (!currentUser && careerCards.length > 0 && !showRegistrationPrompt && userEngagementCount >= 1 && !dismissed) {
      // Show immediately when cards are generated - they've seen the value
      setShowRegistrationPrompt(true);
    }
  }, [currentUser, careerCards.length, showRegistrationPrompt, userEngagementCount]);

  // Handle registration
  const handleRegister = useCallback(() => {
    // Redirect to registration page or open auth modal
    window.location.href = '/register';
  }, []);

  // Handle dismissing registration prompt
  const handleDismissRegistration = useCallback(() => {
    setShowRegistrationPrompt(false);
    // Don't show again for this session
    sessionStorage.setItem('registration-prompt-dismissed', 'true');
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
            onPersonProfileGenerated={handlePersonProfileGenerated}
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

        {/* Right Panel - Profile & Career Cards */}
        <div className="lg:w-1/2 flex flex-col space-y-6">
          {/* Person Profile Card */}
          {personProfile && (
            <div>
              <PersonCard
                profile={personProfile}
                onUpdateProfile={handlePersonProfileUpdate}
              />
            </div>
          )}
          
          {/* Career Cards Section */}
          <div className="flex-1">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                ✨ Your Career Matches
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
          
          {/* Registration Prompt */}
          <AnimatePresence>
            {showRegistrationPrompt && !currentUser && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-4"
              >
                <RegistrationPrompt
                  onRegister={handleRegister}
                  onDismiss={handleDismissRegistration}
                />
              </motion.div>
            )}
          </AnimatePresence>
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