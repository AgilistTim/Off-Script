import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useConversation } from '@elevenlabs/react';
import { 
  X, 
  Loader2, 
  Crown,
  Sparkles,
  PoundSterling,
  TrendingUp,
  Volume2,
  MessageSquare,
  User,
  Bot,
  Radio,
  PhoneCall,
  PhoneOff
} from 'lucide-react';

import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
} from '../ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { useAuth } from '../../context/AuthContext';
import { environmentConfig } from '../../config/environment';



interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CareerVoiceDiscussionModalProps {
  isOpen: boolean;
  onClose: () => void;
  careerData: any;
  sessionId: string;
  isPrimary?: boolean;
}

export const CareerVoiceDiscussionModal: React.FC<CareerVoiceDiscussionModalProps> = ({
  isOpen,
  onClose,
  careerData,
  sessionId,
  isPrimary = true
}) => {
  const { currentUser } = useAuth();

  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [discoveredInsights, setDiscoveredInsights] = useState<{
    interests: string[];
    goals: string[];
    skills: string[];
  }>({ interests: [], goals: [], skills: [] });
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [ctaBottomOffsetPx, setCtaBottomOffsetPx] = useState<number>(12);

  // Get ElevenLabs configuration
  const careerAwareAgentId = environmentConfig.elevenLabs.agentId;
  const apiKey = environmentConfig.elevenLabs.apiKey;

  // Track whether we seeded a local greeting to avoid double greetings
  const seededGreetingRef = useRef(false);

  // Initialize conversation with career-aware agent (only when environment config is ready)
  const conversation = useConversation({
    agentId: careerAwareAgentId || '', // Fallback to empty string when config not ready
    onConnect: () => {
      console.log('🎙️ Connected to career-aware voice assistant');
      setIsConnected(true);
      setConnectionStatus('connected');
      
      // Only seed a local greeting if the agent did not send its own first message
      if (!seededGreetingRef.current) {
        const initialMessage: ConversationMessage = {
          role: 'assistant',
          content: `Hi! I'm ready to discuss your match: ${careerData?.title}. I have your profile and market intelligence loaded. What would you like to explore?`,
          timestamp: new Date()
        };
        setConversationHistory([initialMessage]);
        seededGreetingRef.current = true;
      }
    },
    onDisconnect: () => {
      console.log('📞 Disconnected from career-aware voice assistant');
      setIsConnected(false);
      setConnectionStatus('disconnected');
      setIsSpeaking(false);
    },
    onMessage: async (message) => {
      console.log('🤖 Agent message:', message);
      // If this is the first agent message and we seeded a greeting, replace the seeded one for accuracy
      setConversationHistory(prev => {
        const newMsg: ConversationMessage = { role: 'assistant', content: message.message, timestamp: new Date() };
        if (prev.length === 1 && prev[0].role === 'assistant' && seededGreetingRef.current) {
          seededGreetingRef.current = false;
          return [newMsg];
        }
        return [...prev, newMsg];
      });
      
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

  // Keyboard/visualViewport awareness for CTA on mobile
  useEffect(() => {
    const vv: any = (window as any).visualViewport;
    const handleViewportResize = () => {
      try {
        if (vv) {
          const delta = window.innerHeight - (vv.height + vv.offsetTop);
          const keyboardInset = delta > 120 ? delta : 0;
          setCtaBottomOffsetPx(keyboardInset);
        } else {
          setCtaBottomOffsetPx(0);
        }
      } catch {
        setCtaBottomOffsetPx(0);
      }
    };
    if (vv && vv.addEventListener) {
      vv.addEventListener('resize', handleViewportResize);
      vv.addEventListener('scroll', handleViewportResize);
      handleViewportResize();
    } else {
      window.addEventListener('resize', handleViewportResize);
    }
    return () => {
      if (vv && vv.removeEventListener) {
        vv.removeEventListener('resize', handleViewportResize);
        vv.removeEventListener('scroll', handleViewportResize);
      } else {
        window.removeEventListener('resize', handleViewportResize);
      }
    };
  }, []);

  // Handle conversation start
  const handleStartConversation = async () => {
    if (!apiKey) {
      console.error('❌ ElevenLabs API key not configured');
      return;
    }

    try {
      setConnectionStatus('connecting');
      
      console.log('🎙️ Starting voice conversation with modern conversation overrides');
      
      // Get conversation overrides from careerAwareVoiceService (NEW APPROACH)
      const { careerAwareVoiceService } = await import('../../services/careerAwareVoiceService');
      const overrides = careerAwareVoiceService.getConversationOverrides(sessionId);
      
      if (overrides) {
        console.log('✅ Using conversation overrides for privacy-safe session:', {
          sessionId: sessionId.substring(0, 12) + '...',
          hasOverrides: true,
          approach: 'PER_SESSION_ISOLATION'
        });
        
        // Start session with conversation overrides (privacy-safe)
        await conversation.startSession({
          agentId: careerAwareAgentId,
          userId: currentUser?.uid,
          connectionType: 'webrtc',
          overrides
        });
      } else {
        console.warn('⚠️ No conversation overrides found, falling back to basic session');
        
        // Fallback to basic session (shouldn't happen in normal flow)
        await conversation.startSession({
          agentId: careerAwareAgentId,
          userId: currentUser?.uid,
          connectionType: 'webrtc'
        });
      }
      
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



  // Format career data for display
  const formatSalary = (salary: any): string => {
    if (!salary) return 'Salary data available';
    // Handle { entry, senior } objects
    if (typeof salary === 'object') {
      const entry = salary.entry ?? salary.min ?? salary.low;
      const senior = salary.senior ?? salary.max ?? salary.high;
      if (typeof entry === 'number' && typeof senior === 'number') {
        return `£${entry.toLocaleString()} - £${senior.toLocaleString()}`;
      }
      // Handle perplexity verified ranges
      if (salary?.verifiedSalaryRanges) {
        const v = salary.verifiedSalaryRanges;
        if (v.entry && v.senior) {
          return `£${v.entry.min.toLocaleString()} - £${v.senior.max.toLocaleString()}`;
        }
      }
    }
    if (typeof salary === 'number') return `£${salary.toLocaleString()}/year`;
    if (typeof salary === 'string') return salary;
    return 'Salary data available';
  };

  const getMatchScoreBadge = () => {
    const score = careerData?.matchScore || (isPrimary ? 95 : 75);
    if (score >= 90) return { color: 'bg-gradient-to-r from-primary-green to-primary-yellow text-primary-black', icon: Crown };
    if (score >= 80) return { color: 'bg-gradient-to-r from-primary-lavender to-primary-peach text-primary-black', icon: Sparkles };
    return { color: 'bg-gradient-to-r from-primary-peach to-primary-yellow text-primary-black', icon: TrendingUp };
  };

  const matchBadge = getMatchScoreBadge();
  const MatchIcon = matchBadge.icon;

  if (!isOpen) return null;



  // Handle missing environment config
  if (!apiKey || !careerAwareAgentId) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[80vh] bg-gradient-to-br from-primary-white to-primary-mint/10 border border-primary-green/30 text-primary-black overflow-hidden [&>button]:hidden">
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center space-y-4 text-center">
              <X className="h-8 w-8 text-primary-peach" />
              <h3 className="text-lg font-bold text-primary-peach">Configuration Missing</h3>
              <p className="text-primary-black">ElevenLabs configuration is not available. Please check your environment setup.</p>
              <Button onClick={onClose} variant="outline" className="border-primary-green text-primary-green hover:bg-primary-green/10">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="fixed inset-0 z-50 bg-white/90 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
              <DialogContent 
          className="!bg-template-white !border-4 !border-black !rounded-2xl !shadow-[8px_8px_0px_0px_#000000] max-w-4xl h-[80vh] text-black overflow-hidden [&>button]:hidden !p-0"
          aria-describedby="career-voice-discussion-description"
        >
        <DialogHeader className="border-b-4 border-black bg-template-yellow p-6">
          <div id="career-voice-discussion-description" className="sr-only">
            AI career discussion interface for deep career exploration and guidance
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-template-primary rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_#000000] flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black text-black">
                  AI Career Discussion
                </DialogTitle>
                <p className="text-black/80 text-base font-semibold">
                  Voice conversation with career-aware assistant
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                {connectionStatus === 'connected' && (
                  <div className="flex items-center space-x-2 bg-template-mint border-2 border-black px-3 py-1 rounded-xl shadow-[2px_2px_0px_0px_#000000]">
                    <div className="w-3 h-3 bg-template-primary rounded-full animate-pulse" />
                    <span className="text-sm font-bold text-black">Connected</span>
                  </div>
                )}
                {connectionStatus === 'connecting' && (
                  <div className="flex items-center space-x-2 bg-template-lavender border-2 border-black px-3 py-1 rounded-xl shadow-[2px_2px_0px_0px_#000000]">
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span className="text-sm font-bold text-black">Connecting...</span>
                  </div>
                )}
                {connectionStatus === 'disconnected' && (
                  <div className="flex items-center space-x-2 bg-template-white border-2 border-black px-3 py-1 rounded-xl shadow-[2px_2px_0px_0px_#000000]">
                    <div className="w-3 h-3 bg-gray-400 rounded-full" />
                    <span className="text-sm font-bold text-black">Ready</span>
                  </div>
                )}
              </div>
              
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="w-12 h-12 text-black hover:text-black/70 bg-white/50 hover:bg-white/80 border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_#000000] hover:shadow-[4px_4px_0px_0px_#000000] transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-[auto_1fr] gap-6 overflow-hidden min-h-0 h-full">
          {/* Career Quick Reference Panel */}
          <div className="w-80 flex-shrink-0">
            <Card className="bg-template-white border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_#000000] h-full overflow-hidden flex flex-col">
              <CardHeader className="pb-4 flex-shrink-0 bg-template-mint border-b-4 border-black">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-black text-black">
                    {isPrimary ? '🎯 YOUR TOP MATCH' : '⭐ ALTERNATIVE OPTION'}
                  </CardTitle>
                  <Badge className="bg-template-lavender border-2 border-black text-black font-black shadow-[2px_2px_0px_0px_#000000]">
                    <MatchIcon className="w-4 h-4 mr-1" />
                    {careerData?.matchScore || (isPrimary ? 95 : 75)}% MATCH
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 overflow-y-auto flex-1 min-h-0 p-4">
                {/* PRIORITY: Career Overview */}
                <div className="bg-template-yellow/30 border-2 border-black rounded-xl p-4">
                  <h3 className="text-2xl font-black text-black mb-3">
                    {careerData?.title || 'Career Path'}
                  </h3>
                  <p className="text-black font-semibold text-base leading-relaxed">
                    {careerData?.description?.substring(0, 200)}...
                  </p>
                </div>

                {/* What You Can Ask Section */}
                <div className="bg-template-peach/30 border-2 border-black rounded-xl p-4">
                  <h4 className="text-base font-black text-black mb-3">
                    💬 What you can ask about:
                  </h4>
                  <div className="space-y-1 text-sm font-semibold text-black leading-tight">
                    <p>• Day-to-day work</p>
                    <p>• Career progression</p>
                    <p>• Skills & training</p>
                    <p>• Industry trends</p>
                    <p>• Work-life balance</p>
                    <p>• Compare careers</p>
                  </div>
                </div>

                {/* SECONDARY: Financial Overview */}
                <div className="bg-gray-100 border-2 border-gray-400 rounded-xl p-4">
                  <h4 className="text-base font-bold text-black mb-3">💷 Financial Overview</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-template-white border-2 border-black rounded-lg p-3 shadow-[2px_2px_0px_0px_#000000]">
                      <div className="flex items-center mb-1">
                        <PoundSterling className="w-4 h-4 text-black mr-1" />
                        <span className="text-xs font-bold text-black">SALARY</span>
                      </div>
                      <p className="text-sm font-bold text-black">
                        {formatSalary(careerData?.averageSalary)}
                      </p>
                    </div>
                    
                    <div className="bg-template-white border-2 border-black rounded-lg p-3 shadow-[2px_2px_0px_0px_#000000]">
                      <div className="flex items-center mb-1">
                        <TrendingUp className="w-4 h-4 text-black mr-1" />
                        <span className="text-xs font-bold text-black">GROWTH</span>
                      </div>
                      <p className="text-sm font-bold text-black">
                        {careerData?.growthOutlook || 'Excellent'}
                      </p>
                    </div>
                  </div>
                </div>



                {/* Discovered Insights Panel */}
                {(discoveredInsights.interests.length > 0 || 
                  discoveredInsights.goals.length > 0 || 
                  discoveredInsights.skills.length > 0) && (
                  <div className="bg-template-lavender/30 border-2 border-black rounded-xl p-4">
                    <h4 className="text-lg font-black text-black mb-3">✨ Insights from Discussion:</h4>
                    <div className="space-y-3 text-sm">
                      {discoveredInsights.interests.length > 0 && (
                        <div>
                          <span className="font-bold text-black">New Interests:</span>
                          <div className="ml-2 text-black/80 font-medium">
                            {discoveredInsights.interests.map((interest, idx) => (
                              <p key={idx}>• {interest}</p>
                            ))}
                          </div>
                        </div>
                      )}
                      {discoveredInsights.goals.length > 0 && (
                        <div>
                          <span className="font-bold text-black">Career Goals:</span>
                          <div className="ml-2 text-black/80 font-medium">
                            {discoveredInsights.goals.map((goal, idx) => (
                              <p key={idx}>• {goal}</p>
                            ))}
                          </div>
                        </div>
                      )}
                      {discoveredInsights.skills.length > 0 && (
                        <div>
                          <span className="font-bold text-black">Skills Mentioned:</span>
                          <div className="ml-2 text-black/80 font-medium">
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
            <div className="flex-1 min-h-0">
              <ScrollArea ref={scrollAreaRef} className="h-full pr-2">
                <div className="space-y-4 pb-[136px] md:pb-4">
                  {conversationHistory.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-xl ${
                        message.role === 'user' 
                          ? 'bg-gradient-to-r from-primary-green to-primary-peach text-primary-black' 
                          : 'bg-gradient-to-r from-primary-white to-primary-mint/10 text-primary-black border border-primary-green/20'
                      }`}>
                        <div className="flex items-start space-x-2 mb-2">
                          {message.role === 'user' ? (
                            <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          ) : (
                            <Bot className="w-4 h-4 mt-0.5 text-primary-green flex-shrink-0" />
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
                      <div className="bg-gradient-to-r from-primary-white to-primary-mint/10 text-primary-black border border-primary-green/20 px-4 py-3 rounded-xl max-w-xs">
                        <div className="flex items-center space-x-2">
                          <Volume2 className="w-4 h-4 text-primary-green animate-pulse" />
                          <span className="text-sm">AI is speaking...</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Voice Controls - fixed on mobile, sticky on desktop */}
            <div className="md:sticky md:bottom-0">
              <div
                className="fixed left-0 right-0 bottom-0 z-[130] px-4 md:static md:z-auto md:px-0"
                style={{ bottom: `calc(${ctaBottomOffsetPx}px + env(safe-area-inset-bottom, 0px))` }}
              >
                <div className="bg-template-white rounded-t-2xl md:rounded-2xl p-6 border-4 border-black shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
                  <div className="flex items-center justify-between min-h-[56px]">
                <div className="flex items-center space-x-3">
                  {!isConnected ? (
                    <Button
                      onClick={handleStartConversation}
                      disabled={connectionStatus === 'connecting' || !apiKey}
                      className="bg-template-primary text-white font-black px-6 py-3 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] hover:scale-105 transition-all duration-200 text-base whitespace-nowrap disabled:opacity-60"
                    >
                      {connectionStatus === 'connecting' ? (
                        <>
                          <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <PhoneCall className="w-6 h-6 mr-3" />
                          Start Voice Discussion
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleEndConversation}
                      className="bg-template-secondary text-black font-black px-6 py-3 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] hover:scale-105 transition-all duration-200 text-base whitespace-nowrap"
                    >
                      <PhoneOff className="w-6 h-6 mr-3" />
                      End Discussion
                    </Button>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {isConnected && (
                    <div className="flex items-center space-x-2 text-sm text-primary-black/70">
                      <Radio className="w-4 h-4" />
                      <span>Voice conversation active</span>
                    </div>
                  )}
                  
                  {/* Discovered Insights */}
                  {(discoveredInsights.interests.length > 0 || 
                    discoveredInsights.goals.length > 0 || 
                    discoveredInsights.skills.length > 0) && (
                    <div className="flex items-center space-x-3">
                      <div className="text-xs text-primary-green">
                        <span className="font-medium">Insights discovered:</span>
                        <span className="ml-2">
                          {discoveredInsights.interests.length + discoveredInsights.goals.length + discoveredInsights.skills.length} items
                        </span>
                      </div>
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
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};