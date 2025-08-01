import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConversation } from '@elevenlabs/react';
import { 
  X, 
  Mic, 
  MicOff, 
  Loader2, 
  Volume2,
  VolumeX,
  MessageSquare,
  User,
  Bot,
  PhoneCall,
  PhoneOff,
  Sparkles
} from 'lucide-react';

import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { useAuth } from '../../context/AuthContext';
import { agentContextService } from '../../services/agentContextService';

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

interface EnhancedChatVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  careerContext?: any;
  currentConversationHistory?: ConversationMessage[];
  onConversationUpdate?: (messages: ConversationMessage[]) => void;
}

export const EnhancedChatVoiceModal: React.FC<EnhancedChatVoiceModalProps> = ({
  isOpen,
  onClose,
  careerContext,
  currentConversationHistory = [],
  onConversationUpdate
}) => {
  const { currentUser, userData } = useAuth();
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>(currentConversationHistory);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Determine agent based on user auth state and context
  const getAgentId = (): string => {
    if (!currentUser) {
      // Guest user - use general career guide agent
      return 'agent_01k0fkhhx0e8k8e6nwtz8ptkwb';
    }
    
    if (careerContext && careerContext.title) {
      // Authenticated user with career context - use career-aware agent
      return 'agent_3301k1j5rqq1fp29fsg4278fmtsa';
    }
    
    // Authenticated user without specific career context - use general career guide with context
    return 'agent_01k0fkhhx0e8k8e6nwtz8ptkwb';
  };

  const agentId = getAgentId();
  const apiKey = getEnvVar('VITE_ELEVENLABS_API_KEY');

  // Build personalized greeting using agent context service
  const buildGreeting = (): string => {
    // Use userData which has our User interface with profile
    const context = agentContextService.buildAgentContext(
      userData, // Use full userData from auth context
      userData?.profile, // Pass the user's profile
      careerContext
    );
    return context.greeting;
  };

  // Initialize conversation
  const conversation = useConversation({
    agentId,
    overrides: {
      agent: {
        firstMessage: buildGreeting(),
      },
    },
    clientTools: {
      analyze_conversation_for_careers: async (parameters: { trigger_reason: string }) => {
        console.log('🚨 TOOL CALLED: analyze_conversation_for_careers - Enhanced modal agent calling tools!');
        console.log('🔍 Tool parameters:', parameters);
        
        // Create mock analysis for now since this modal is more basic
        const mockAnalysis = {
          careerCards: [
            {
              title: "Career Analysis Available",
              description: "Your conversation has been analyzed. Please use the main conversation interface for detailed career insights.",
              matchScore: 85
            }
          ],
          message: "Career analysis completed successfully"
        };
        
        return mockAnalysis;
      },

      update_person_profile: async (parameters: { interests?: string[]; goals?: string[]; skills?: string[] }) => {
        console.log('🚨 TOOL CALLED: update_person_profile - Enhanced modal agent calling tools!');
        console.log('👤 Updating person profile based on conversation...');
        console.log('👤 Profile parameters:', parameters);
        
        // Return success message for now
        return "Profile updated successfully based on conversation";
      },
    },
    onConnect: () => {
      console.log(`🎙️ Connected to enhanced chat voice assistant (Agent: ${agentId})`);
      setIsConnected(true);
      setConnectionStatus('connected');
      
      // Add personalized initial message
      const initialMessage: ConversationMessage = {
        role: 'assistant',
        content: buildGreeting(),
        timestamp: new Date()
      };
      
      const updatedHistory = [...conversationHistory, initialMessage];
      setConversationHistory(updatedHistory);
      onConversationUpdate?.(updatedHistory);
    },
    onDisconnect: () => {
      console.log('📞 Disconnected from enhanced chat voice assistant');
      setIsConnected(false);
      setConnectionStatus('disconnected');
      setIsSpeaking(false);
    },
    onMessage: async (message) => {
      console.log('🤖 Agent message:', message);
      const newMessage: ConversationMessage = {
        role: message.source === 'ai' ? 'assistant' : 'user',
        content: message.message,
        timestamp: new Date()
      };
      
      setConversationHistory(prev => {
        const updatedHistory = [...prev, newMessage];
        onConversationUpdate?.(updatedHistory);
        return updatedHistory;
      });
    },
    onError: (error) => {
      console.error('❌ Enhanced chat voice conversation error:', error);
      setConnectionStatus('disconnected');
      setIsLoading(false);
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

  // Sync with external conversation history
  useEffect(() => {
    if (currentConversationHistory.length > 0 && !isConnected) {
      setConversationHistory(currentConversationHistory);
    }
  }, [currentConversationHistory, isConnected]);

  // Handle conversation start
  const handleStartConversation = async () => {
    if (!conversation || !conversation.startSession) {
      console.error('❌ Conversation object not available');
      return;
    }

    setIsLoading(true);
    setConnectionStatus('connecting');

    try {
      await conversation.startSession({ agentId });
      console.log('✅ Enhanced chat conversation started successfully');
    } catch (error) {
      console.error('❌ Failed to start enhanced chat conversation:', error);
      setConnectionStatus('disconnected');
      setIsLoading(false);
    }
  };

  // Handle conversation end
  const handleEndConversation = async () => {
    try {
      setIsLoading(true);
      await conversation.endSession();
      console.log('📞 Enhanced chat conversation ended');
    } catch (error) {
      console.error('❌ Failed to end enhanced chat conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Format timestamp for display
  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get agent display info
  const getAgentInfo = () => {
    switch (agentId) {
      case 'agent_01k0fkhhx0e8k8e6nwtz8ptkwb':
        return {
          name: 'Career Guide',
          description: currentUser ? 'Your personalized career assistant' : 'General career exploration guide',
          icon: <Sparkles className="w-5 h-5" />
        };
      case 'agent_3301k1j5rqq1fp29fsg4278fmtsa':
        return {
          name: 'Career Specialist',
          description: `Expert in ${careerContext?.title || 'career guidance'}`,
          icon: <Bot className="w-5 h-5" />
        };
      default:
        return {
          name: 'Career Assistant',
          description: 'AI-powered career guidance',
          icon: <Bot className="w-5 h-5" />
        };
    }
  };

  const agentInfo = getAgentInfo();

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full mx-4 max-h-[90vh] bg-gradient-to-br from-primary-dark via-secondary-dark to-primary-dark border border-electric-blue/30 [&>button]:hidden">
        <DialogHeader className="border-b border-electric-blue/20 pb-4">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {agentInfo.icon}
              <div>
                <h2 className="text-xl font-bold text-primary-white">{agentInfo.name}</h2>
                <p className="text-sm text-primary-white/70">{agentInfo.description}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-primary-white/70 hover:text-primary-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-[calc(90vh-120px)]">
          {/* Conversation History */}
          <div className="flex-1 flex space-x-6">
            {/* Messages */}
            <div className="flex-1">
              <Card className="h-full bg-primary-white/5 border-electric-blue/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-primary-white flex items-center space-x-2">
                    <MessageSquare className="w-5 h-5" />
                    <span>Conversation</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 h-[calc(100%-80px)]">
                  <ScrollArea ref={scrollAreaRef} className="h-full">
                    <div className="space-y-4 pr-4">
                      {conversationHistory.map((message, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              message.role === 'user'
                                ? 'bg-electric-blue text-primary-white'
                                : 'bg-primary-white/10 text-primary-white border border-electric-blue/20'
                            }`}
                          >
                            <div className="flex items-start space-x-2">
                              {message.role === 'assistant' && <Bot className="w-4 h-4 mt-0.5 text-electric-blue" />}
                              {message.role === 'user' && <User className="w-4 h-4 mt-0.5" />}
                              <div className="flex-1">
                                <p className="text-sm">{message.content}</p>
                                <p className="text-xs opacity-70 mt-1">
                                  {formatTime(message.timestamp)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      
                      {isSpeaking && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex justify-start"
                        >
                          <div className="bg-primary-white/10 rounded-lg p-3 border border-electric-blue/20">
                            <div className="flex items-center space-x-2">
                              <Bot className="w-4 h-4 text-electric-blue" />
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-electric-blue rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-electric-blue rounded-full animate-bounce delay-100" />
                                <div className="w-2 h-2 bg-electric-blue rounded-full animate-bounce delay-200" />
                              </div>
                              <span className="text-xs text-primary-white/70">Speaking...</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Career Context Panel */}
            {careerContext && (
              <div className="w-80">
                <Card className="h-full bg-primary-white/5 border-electric-blue/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-primary-white">Career Focus</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-bold text-electric-blue">{careerContext.title}</h3>
                        {careerContext.industry && (
                          <p className="text-sm text-primary-white/70">{careerContext.industry}</p>
                        )}
                      </div>
                      
                      {careerContext.averageSalary && (
                        <div>
                          <p className="text-xs font-semibold text-electric-blue mb-1">Average Salary</p>
                          <p className="text-sm text-primary-white">{careerContext.averageSalary}</p>
                        </div>
                      )}
                      
                      {careerContext.growthOutlook && (
                        <div>
                          <p className="text-xs font-semibold text-electric-blue mb-1">Growth Outlook</p>
                          <p className="text-sm text-primary-white">{careerContext.growthOutlook}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Voice Controls */}
          <div className="flex-shrink-0 pt-4 border-t border-electric-blue/20">
            <div className="flex items-center justify-center space-x-4">
              {!isConnected ? (
                <Button
                  onClick={handleStartConversation}
                  disabled={isLoading || !apiKey}
                  className="bg-gradient-to-r from-electric-blue to-neon-pink text-primary-white font-bold px-6 py-3 rounded-lg hover:scale-105 transition-transform disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <PhoneCall className="w-5 h-5 mr-2" />
                      Start Voice Chat
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-sm font-medium">Connected</span>
                  </div>
                  
                  <Button
                    onClick={handleEndConversation}
                    disabled={isLoading}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold px-6 py-3 rounded-lg hover:scale-105 transition-transform disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Ending...
                      </>
                    ) : (
                      <>
                        <PhoneOff className="w-5 h-5 mr-2" />
                        End Call
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};