import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConversation } from '@elevenlabs/react';
import { 
  X, 
  Mic, 
  MicOff, 
  Loader2, 
  Crown,
  Sparkles,
  PoundSterling,
  TrendingUp,
  Briefcase,
  Volume2,
  VolumeX,
  MessageSquare,
  User,
  Bot,
  Radio,
  PhoneCall,
  PhoneOff,
  Save,
  CheckCircle
} from 'lucide-react';

import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { useAuth } from '../../context/AuthContext';

// Helper function to get environment variables (matches ElevenLabsWidget pattern)
const getEnvVar = (key: string): string | undefined => {
  const devValue = import.meta.env[key];
  if (devValue && devValue !== 'undefined') return devValue;
  
  if (typeof window !== 'undefined' && window.ENV) {
    const prodValue = window.ENV[key];
    if (prodValue && prodValue !== '__ELEVENLABS_API_KEY__' && prodValue !== '__ELEVENLABS_AGENT_ID__') {
      return prodValue;
    }
  }
  return undefined;
};

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CareerVoiceDiscussionModalProps {
  isOpen: boolean;
  onClose: () => void;
  careerData: any;
  discussionContext: any;
  sessionId: string;
  isPrimary?: boolean;
}

export const CareerVoiceDiscussionModal: React.FC<CareerVoiceDiscussionModalProps> = ({
  isOpen,
  onClose,
  careerData,
  discussionContext,
  sessionId,
  isPrimary = true
}) => {
  const { currentUser } = useAuth();
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [savingInsights, setSavingInsights] = useState(false);
  const [insightsSaved, setInsightsSaved] = useState(false);
  const [discoveredInsights, setDiscoveredInsights] = useState<{
    interests: string[];
    goals: string[];
    skills: string[];
  }>({ interests: [], goals: [], skills: [] });
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Get ElevenLabs configuration
  const careerAwareAgentId = 'agent_3301k1j5rqq1fp29fsg4278fmtsa';
  const apiKey = getEnvVar('VITE_ELEVENLABS_API_KEY');

  // Initialize conversation with career-aware agent
  const conversation = useConversation({
    agentId: careerAwareAgentId,
    onConnect: () => {
      console.log('🎙️ Connected to career-aware voice assistant');
      setIsConnected(true);
      setConnectionStatus('connected');
      
      // Add initial agent message to history
      const initialMessage: ConversationMessage = {
        role: 'assistant',
        content: `Hi! I'm ready to discuss your ${isPrimary ? 'top career match' : 'alternative career option'}: ${careerData?.title}. I have all your profile details and career intelligence loaded. What would you like to explore?`,
        timestamp: new Date()
      };
      setConversationHistory([initialMessage]);
    },
    onDisconnect: () => {
      console.log('📞 Disconnected from career-aware voice assistant');
      setIsConnected(false);
      setConnectionStatus('disconnected');
      setIsSpeaking(false);
    },
    onMessage: async (message) => {
      console.log('🤖 Agent message:', message);
      const newMessage: ConversationMessage = {
        role: 'assistant',
        content: message.message,
        timestamp: new Date()
      };
      setConversationHistory(prev => [...prev, newMessage]);
      
      // Track message with careerAwareVoiceService
      if (sessionId) {
        const { careerAwareVoiceService } = await import('../../services/careerAwareVoiceService');
        await careerAwareVoiceService.trackConversationMessage(sessionId, 'assistant', message.message);
      }
    },
    onError: (error) => {
      console.error('❌ Voice conversation error:', error);
      setConnectionStatus('disconnected');
    },
    onModeChange: (mode) => {
      console.log('🎙️ Voice mode changed:', mode);
      setIsSpeaking(mode.mode === 'speaking');
    }
  });

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [conversationHistory]);

  // Handle conversation start
  const handleStartConversation = async () => {
    if (!apiKey) {
      console.error('❌ ElevenLabs API key not configured');
      return;
    }

    try {
      setConnectionStatus('connecting');
      
      console.log('🎙️ Starting voice conversation - context already loaded by careerAwareVoiceService');
      
      // Start conversation - the agent should already have the context from our service call
      await conversation.startSession({
        agentId: careerAwareAgentId,
      });
      
    } catch (error) {
      console.error('❌ Failed to start voice conversation:', error);
      setConnectionStatus('disconnected');
    }
  };

  // Handle conversation end
  const handleEndConversation = () => {
    conversation.endSession();
    setConnectionStatus('disconnected');
    setIsSpeaking(false);
  };

  // Track user input (this would be called by ElevenLabs when user speaks)
  const handleUserInput = async (userMessage: string) => {
    const newMessage: ConversationMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    setConversationHistory(prev => [...prev, newMessage]);
    
    // Track message with careerAwareVoiceService
    if (sessionId) {
      const { careerAwareVoiceService } = await import('../../services/careerAwareVoiceService');
      await careerAwareVoiceService.trackConversationMessage(sessionId, 'user', userMessage);
      
      // Update insights display
      const insights = careerAwareVoiceService.getSessionInsights(sessionId);
      if (insights) {
        setDiscoveredInsights(insights.discoveredInsights);
      }
    }
  };

  // Save insights to user profile
  const handleSaveInsights = async () => {
    if (!sessionId) return;
    
    setSavingInsights(true);
    try {
      const { careerAwareVoiceService } = await import('../../services/careerAwareVoiceService');
      const result = await careerAwareVoiceService.saveInsightsToProfile(sessionId);
      
      if (result.success) {
        setInsightsSaved(true);
        console.log('✅ Insights saved to profile:', result.updatedFields);
        
        // Show success feedback
        setTimeout(() => setInsightsSaved(false), 3000);
      } else {
        console.error('❌ Failed to save insights:', result.error);
      }
    } catch (error) {
      console.error('❌ Error saving insights:', error);
    } finally {
      setSavingInsights(false);
    }
  };

  // Format career data for display
  const formatSalary = (salary: number | undefined): string => {
    if (!salary) return 'Salary data available';
    return `£${salary.toLocaleString()}/year`;
  };

  const getMatchScoreBadge = () => {
    const score = careerData?.matchScore || (isPrimary ? 95 : 75);
    if (score >= 90) return { color: 'bg-gradient-to-r from-acid-green to-cyber-yellow text-primary-black', icon: Crown };
    if (score >= 80) return { color: 'bg-gradient-to-r from-electric-blue to-neon-pink text-primary-white', icon: Sparkles };
    return { color: 'bg-gradient-to-r from-neon-pink to-sunset-orange text-primary-white', icon: TrendingUp };
  };

  const matchBadge = getMatchScoreBadge();
  const MatchIcon = matchBadge.icon;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
              <DialogContent 
          className="max-w-4xl h-[80vh] bg-gradient-to-br from-primary-black to-primary-gray border border-electric-blue/30 text-primary-white overflow-hidden [&>button]:hidden"
          aria-describedby="career-voice-discussion-description"
        >
        <DialogHeader className="border-b border-electric-blue/20 pb-4">
          <div id="career-voice-discussion-description" className="sr-only">
            AI career discussion interface for deep career exploration and guidance
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-electric-blue to-neon-pink rounded-xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-primary-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-primary-white">
                  AI Career Discussion
                </DialogTitle>
                <p className="text-primary-white/70 text-sm">
                  Voice conversation with career-aware assistant
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                {connectionStatus === 'connected' && (
                  <div className="flex items-center space-x-2 text-acid-green">
                    <div className="w-2 h-2 bg-acid-green rounded-full animate-pulse" />
                    <span className="text-xs font-medium">Connected</span>
                  </div>
                )}
                {connectionStatus === 'connecting' && (
                  <div className="flex items-center space-x-2 text-electric-blue">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs font-medium">Connecting...</span>
                  </div>
                )}
                {connectionStatus === 'disconnected' && (
                  <div className="flex items-center space-x-2 text-primary-white/50">
                    <div className="w-2 h-2 bg-primary-white/50 rounded-full" />
                    <span className="text-xs font-medium">Ready</span>
                  </div>
                )}
              </div>
              
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="text-primary-white/70 hover:text-primary-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex space-x-6 overflow-hidden min-h-0">
          {/* Career Quick Reference Panel */}
          <div className="w-80 flex-shrink-0">
            <Card className="bg-gradient-to-br from-primary-gray/50 to-electric-blue/10 border border-electric-blue/20 h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-black text-primary-white">
                    {isPrimary ? 'YOUR TOP MATCH' : 'ALTERNATIVE OPTION'}
                  </CardTitle>
                  <Badge className={`font-bold ${matchBadge.color}`}>
                    <MatchIcon className="w-3 h-3 mr-1" />
                    {careerData?.matchScore || (isPrimary ? 95 : 75)}% MATCH
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Career Title */}
                <div>
                  <h3 className="text-xl font-black text-electric-blue mb-2">
                    {careerData?.title || 'Career Path'}
                  </h3>
                  <p className="text-primary-white/80 text-sm leading-relaxed">
                    {careerData?.description?.substring(0, 150)}...
                  </p>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-acid-green/20 to-cyber-yellow/20 rounded-lg p-3 border border-acid-green/20">
                    <div className="flex items-center mb-1">
                      <PoundSterling className="w-4 h-4 text-acid-green mr-1" />
                      <span className="text-xs font-bold text-acid-green">SALARY</span>
                    </div>
                    <p className="text-sm font-bold text-primary-white">
                      {formatSalary(careerData?.averageSalary)}
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-electric-blue/20 to-neon-pink/20 rounded-lg p-3 border border-electric-blue/20">
                    <div className="flex items-center mb-1">
                      <TrendingUp className="w-4 h-4 text-electric-blue mr-1" />
                      <span className="text-xs font-bold text-electric-blue">GROWTH</span>
                    </div>
                    <p className="text-sm font-bold text-primary-white">
                      {careerData?.growthOutlook || 'Excellent'}
                    </p>
                  </div>
                </div>

                {/* Discussion Topics */}
                <div>
                  <h4 className="text-sm font-bold text-neon-pink mb-2">What you can ask about:</h4>
                  <div className="space-y-1 text-xs text-primary-white/70">
                    <p>• Day-to-day work and responsibilities</p>
                    <p>• Career progression and opportunities</p>
                    <p>• Skills needed and training paths</p>
                    <p>• Industry trends and outlook</p>
                    <p>• Work-life balance expectations</p>
                    <p>• Compare with other careers</p>
                  </div>
                </div>

                {/* Discovered Insights Panel */}
                {(discoveredInsights.interests.length > 0 || 
                  discoveredInsights.goals.length > 0 || 
                  discoveredInsights.skills.length > 0) && (
                  <div className="border-t border-electric-blue/20 pt-4">
                    <h4 className="text-sm font-bold text-acid-green mb-2">Insights from Discussion:</h4>
                    <div className="space-y-2 text-xs">
                      {discoveredInsights.interests.length > 0 && (
                        <div>
                          <span className="font-medium text-electric-blue">New Interests:</span>
                          <div className="ml-2 text-primary-white/80">
                            {discoveredInsights.interests.map((interest, idx) => (
                              <p key={idx}>• {interest}</p>
                            ))}
                          </div>
                        </div>
                      )}
                      {discoveredInsights.goals.length > 0 && (
                        <div>
                          <span className="font-medium text-neon-pink">Career Goals:</span>
                          <div className="ml-2 text-primary-white/80">
                            {discoveredInsights.goals.map((goal, idx) => (
                              <p key={idx}>• {goal}</p>
                            ))}
                          </div>
                        </div>
                      )}
                      {discoveredInsights.skills.length > 0 && (
                        <div>
                          <span className="font-medium text-cyber-yellow">Skills Mentioned:</span>
                          <div className="ml-2 text-primary-white/80">
                            {discoveredInsights.skills.map((skill, idx) => (
                              <p key={idx}>• {skill}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Voice Conversation Panel */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Conversation History */}
            <div className="flex-1 mb-4 min-h-0">
              <ScrollArea ref={scrollAreaRef} className="h-full pr-2">
                <div className="space-y-4 pb-4">
                  {conversationHistory.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-xl ${
                        message.role === 'user' 
                          ? 'bg-gradient-to-r from-electric-blue to-neon-pink text-primary-white' 
                          : 'bg-gradient-to-r from-primary-gray to-primary-white/10 text-primary-white border border-electric-blue/20'
                      }`}>
                        <div className="flex items-start space-x-2 mb-2">
                          {message.role === 'user' ? (
                            <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          ) : (
                            <Bot className="w-4 h-4 mt-0.5 text-electric-blue flex-shrink-0" />
                          )}
                          <span className="text-xs font-medium opacity-70">
                            {message.role === 'user' ? 'You' : 'AI Career Guide'}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        <p className="text-xs opacity-50 mt-2">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                  
                  {isSpeaking && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="bg-gradient-to-r from-primary-gray to-primary-white/10 text-primary-white border border-electric-blue/20 px-4 py-3 rounded-xl max-w-xs">
                        <div className="flex items-center space-x-2">
                          <Volume2 className="w-4 h-4 text-electric-blue animate-pulse" />
                          <span className="text-sm">AI is speaking...</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Voice Controls */}
            <div className="bg-gradient-to-r from-primary-gray/50 to-electric-blue/10 rounded-xl p-4 border border-electric-blue/20 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {!isConnected ? (
                    <Button
                      onClick={handleStartConversation}
                      disabled={connectionStatus === 'connecting' || !apiKey}
                      className="bg-gradient-to-r from-acid-green to-cyber-yellow text-primary-black font-bold px-6 py-2 rounded-xl hover:scale-105 transition-transform duration-200"
                    >
                      {connectionStatus === 'connecting' ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <PhoneCall className="w-5 h-5 mr-2" />
                          Start Voice Discussion
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleEndConversation}
                      className="bg-gradient-to-r from-neon-pink to-sunset-orange text-primary-white font-bold px-6 py-2 rounded-xl hover:scale-105 transition-transform duration-200"
                    >
                      <PhoneOff className="w-5 h-5 mr-2" />
                      End Discussion
                    </Button>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {isConnected && (
                    <div className="flex items-center space-x-2 text-sm text-primary-white/70">
                      <Radio className="w-4 h-4" />
                      <span>Voice conversation active</span>
                    </div>
                  )}
                  
                  {/* Discovered Insights */}
                  {(discoveredInsights.interests.length > 0 || 
                    discoveredInsights.goals.length > 0 || 
                    discoveredInsights.skills.length > 0) && (
                    <div className="flex items-center space-x-3">
                      <div className="text-xs text-electric-blue">
                        <span className="font-medium">Insights discovered:</span>
                        <span className="ml-2">
                          {discoveredInsights.interests.length + discoveredInsights.goals.length + discoveredInsights.skills.length} items
                        </span>
                      </div>
                      <Button
                        onClick={handleSaveInsights}
                        disabled={savingInsights || insightsSaved}
                        size="sm"
                        className={`text-xs px-3 py-1 ${
                          insightsSaved 
                            ? 'bg-gradient-to-r from-acid-green to-cyber-yellow text-primary-black' 
                            : 'bg-gradient-to-r from-electric-blue to-neon-pink text-primary-white'
                        }`}
                      >
                        {savingInsights ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : insightsSaved ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <Save className="w-3 h-3 mr-1" />
                        )}
                        {insightsSaved ? 'Saved!' : 'Save to Profile'}
                      </Button>
                    </div>
                  )}
                  
                  {!apiKey && (
                    <div className="text-xs text-sunset-orange">
                      Configure ElevenLabs API key to enable voice discussions
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};