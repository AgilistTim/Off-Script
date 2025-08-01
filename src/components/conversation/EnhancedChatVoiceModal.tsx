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
  Sparkles,
  Crown,
  PoundSterling,
  TrendingUp,
  Briefcase,
  Radio,
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
import { agentContextService } from '../../services/agentContextService';
import { mcpQueueService } from '../../services/mcpQueueService';

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
  onCareerCardsDiscovered?: (cards: any[]) => void;
}

export const EnhancedChatVoiceModal: React.FC<EnhancedChatVoiceModalProps> = ({
  isOpen,
  onClose,
  careerContext,
  currentConversationHistory = [],
  onConversationUpdate,
  onCareerCardsDiscovered
}) => {
  const { currentUser, userData } = useAuth();
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>(currentConversationHistory);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [isLoading, setIsLoading] = useState(false);
  const [savingInsights, setSavingInsights] = useState(false);
  const [insightsSaved, setInsightsSaved] = useState(false);
  const [discoveredInsights, setDiscoveredInsights] = useState<{
    interests: string[];
    goals: string[];
    skills: string[];
  }>({ interests: [], goals: [], skills: [] });
  const [careerCards, setCareerCards] = useState<any[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Handle conversation update callback separately to avoid setState during render
  useEffect(() => {
    if (onConversationUpdate) {
      onConversationUpdate(conversationHistory);
    }
  }, [conversationHistory, onConversationUpdate]);

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
    // Only override firstMessage for authenticated users to avoid WebSocket issues for guests
    ...(currentUser && {
      overrides: {
        agent: {
          firstMessage: buildGreeting(),
        },
      },
    }),
    clientTools: {
      analyze_conversation_for_careers: async (parameters: { trigger_reason: string }) => {
        console.log('🚨 TOOL CALLED: analyze_conversation_for_careers - Enhanced modal agent calling tools!');
        console.log('🔍 Tool parameters:', parameters);
        
        try {
          // Get valid conversation messages for analysis
          const validMessages = conversationHistory.filter(msg => 
            msg.content && 
            msg.content.trim().length > 0 && 
            !msg.content.includes('Connected to enhanced chat voice assistant')
          );

          if (validMessages.length === 0) {
            console.log('⚠️ No valid messages for analysis');
            return { careerCards: [], message: "No conversation content to analyze yet" };
          }

          // Use MCP queue service for analysis
          const mcpEndpoint = 'http://localhost:3001/mcp';
          const result = await mcpQueueService.queueAnalysisRequest(
            validMessages,
            parameters.trigger_reason,
            mcpEndpoint,
            currentUser?.uid
          );

          // Parse the result
          let analysisData: any;
          if (typeof result === 'string') {
            analysisData = { message: result };
          } else {
            analysisData = result.analysis || result;
          }

          // Update career cards state
          const newCareerCards = analysisData.careerCards || [];
          if (newCareerCards.length > 0) {
            setCareerCards(prev => {
              const combined = [...prev];
              newCareerCards.forEach((newCard: any) => {
                const existingIndex = combined.findIndex(card => card.title === newCard.title);
                if (existingIndex >= 0) {
                  combined[existingIndex] = { ...combined[existingIndex], ...newCard };
                } else {
                  combined.push(newCard);
                }
              });
              
              // Notify parent of discovered career cards
              if (onCareerCardsDiscovered) {
                onCareerCardsDiscovered(combined);
              }
              
              return combined;
            });
          }

          console.log('✅ Career analysis completed:', analysisData);
          return analysisData.message || "Career analysis completed successfully";

        } catch (error) {
          console.error('❌ Error analyzing conversation:', error);
          return "Career analysis is temporarily unavailable";
        }
      },

      update_person_profile: async (parameters: { interests?: string[]; goals?: string[]; skills?: string[] }) => {
        console.log('🚨 TOOL CALLED: update_person_profile - Enhanced modal agent calling tools!');
        console.log('👤 Updating person profile based on conversation...');
        console.log('👤 Profile parameters:', parameters);
        
        try {
          // Update discovered insights state
          const newInsights = {
            interests: parameters.interests || [],
            goals: parameters.goals || [],
            skills: parameters.skills || []
          };

          setDiscoveredInsights(prev => ({
            interests: [...new Set([...prev.interests, ...newInsights.interests])],
            goals: [...new Set([...prev.goals, ...newInsights.goals])],
            skills: [...new Set([...prev.skills, ...newInsights.skills])]
          }));

          console.log('✅ Profile insights updated:', newInsights);
          return "Profile insights updated successfully based on conversation";

        } catch (error) {
          console.error('❌ Error updating profile:', error);
          return "Profile update is temporarily unavailable";
        }
      },
    },
    onConnect: () => {
      console.log(`🎙️ Connected to enhanced chat voice assistant (Agent: ${agentId})`);
      setIsConnected(true);
      setConnectionStatus('connected');
      
      // Add personalized initial message only for authenticated users
      // For guests, let the agent use its default greeting to avoid connection issues
      if (currentUser) {
        const initialMessage: ConversationMessage = {
          role: 'assistant',
          content: buildGreeting(),
          timestamp: new Date()
        };
        
        const updatedHistory = [...conversationHistory, initialMessage];
        setConversationHistory(updatedHistory);
        onConversationUpdate?.(updatedHistory);
      }
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
      
      setConversationHistory(prev => [...prev, newMessage]);
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

  // Handle saving insights to profile
  const handleSaveInsights = async () => {
    setSavingInsights(true);
    try {
      // Here you would typically save to Firebase/backend
      // For now, we'll just simulate the save
      await new Promise(resolve => setTimeout(resolve, 1000));
      setInsightsSaved(true);
      console.log('✅ Insights saved to profile:', discoveredInsights);
    } catch (error) {
      console.error('❌ Failed to save insights:', error);
    } finally {
      setSavingInsights(false);
    }
  };

  // Format salary display
  const formatSalary = (salary: string | number | undefined): string => {
    if (!salary) return 'Varies';
    if (typeof salary === 'string') return salary;
    return `£${salary.toLocaleString()}`;
  };

  // Get match badge styling
  const getMatchBadge = (score: number) => {
    if (score >= 90) return { color: 'bg-gradient-to-r from-acid-green to-cyber-yellow text-primary-black', icon: Crown };
    if (score >= 75) return { color: 'bg-gradient-to-r from-electric-blue to-neon-pink text-primary-white', icon: Sparkles };
    return { color: 'bg-gradient-to-r from-primary-gray to-electric-blue/50 text-primary-white', icon: Briefcase };
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-[95vw] h-[85vh] bg-gradient-to-br from-primary-dark via-secondary-dark to-primary-dark border border-electric-blue/30 [&>button]:hidden flex flex-col">
        <DialogHeader className="border-b border-electric-blue/20 pb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-electric-blue to-neon-pink rounded-xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-primary-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-primary-white">
                  {agentInfo.name}
                </DialogTitle>
                <p className="text-primary-white/70 text-sm">
                  {agentInfo.description}
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

        <div className="flex-1 flex space-x-4 overflow-hidden min-h-0 p-2">
          {/* Career Insights Panel */}
          <div className="w-72 xl:w-80 flex-shrink-0">
            <Card className="bg-gradient-to-br from-primary-gray/50 to-electric-blue/10 border border-electric-blue/20 h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-black text-primary-white">
                    CAREER INSIGHTS
                  </CardTitle>
                  {careerCards.length > 0 && (
                    <Badge className="bg-gradient-to-r from-electric-blue to-neon-pink text-primary-white font-bold">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {careerCards.length} FOUND
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Discovered Career Cards */}
                {careerCards.length > 0 && (
                  <div className="space-y-3">
                    {careerCards.slice(0, 2).map((card, index) => {
                      const matchBadge = getMatchBadge(card.matchScore || 85);
                      const MatchIcon = matchBadge.icon;
                      
                      return (
                        <div key={index} className="border border-electric-blue/20 rounded-lg p-3 bg-primary-white/5">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-bold text-electric-blue">{card.title}</h4>
                            <Badge className={`text-xs ${matchBadge.color}`}>
                              <MatchIcon className="w-3 h-3 mr-1" />
                              {card.matchScore || 85}%
                            </Badge>
                          </div>
                          <p className="text-xs text-primary-white/70 line-clamp-2">
                            {card.description}
                          </p>
                          {card.averageSalary && (
                            <div className="flex items-center mt-2 space-x-3">
                              <div className="flex items-center space-x-1">
                                <PoundSterling className="w-3 h-3 text-acid-green" />
                                <span className="text-xs text-primary-white">{formatSalary(card.averageSalary)}</span>
                              </div>
                              {card.growthOutlook && (
                                <div className="flex items-center space-x-1">
                                  <TrendingUp className="w-3 h-3 text-electric-blue" />
                                  <span className="text-xs text-primary-white">{card.growthOutlook}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Original Career Context */}
                {careerContext && (
                  <div className="border-t border-electric-blue/20 pt-4">
                    <h4 className="text-sm font-bold text-neon-pink mb-2">Discussion Focus:</h4>
                    <div className="space-y-2">
                      <h5 className="font-bold text-electric-blue">{careerContext.title}</h5>
                      {careerContext.averageSalary && (
                        <p className="text-xs text-primary-white/70">
                          Salary: {formatSalary(careerContext.averageSalary)}
                        </p>
                      )}
                      {careerContext.growthOutlook && (
                        <p className="text-xs text-primary-white/70">
                          Growth: {careerContext.growthOutlook}
                        </p>
                      )}
                    </div>
                  </div>
                )}

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

                {/* Discussion Topics */}
                {!careerContext && careerCards.length === 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-neon-pink mb-2">What you can explore:</h4>
                    <div className="space-y-1 text-xs text-primary-white/70">
                      <p>• Career interests and goals</p>
                      <p>• Skills and training paths</p>
                      <p>• Industry trends and outlook</p>
                      <p>• Work-life balance expectations</p>
                      <p>• Educational requirements</p>
                      <p>• Career progression paths</p>
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
                      <div className={`max-w-[80%] px-4 py-3 rounded-xl break-words ${
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
                            {message.role === 'user' ? (currentUser ? (userData?.profile?.displayName || 'You') : 'You') : agentInfo.name}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed break-words overflow-wrap-anywhere">{message.content}</p>
                        <p className="text-xs opacity-50 mt-2">
                          {formatTime(message.timestamp)}
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
              <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
                <div className="flex items-center justify-center lg:justify-start">
                  {!isConnected ? (
                    <Button
                      onClick={handleStartConversation}
                      disabled={connectionStatus === 'connecting' || !apiKey}
                      className="bg-gradient-to-r from-acid-green to-cyber-yellow text-primary-black font-bold px-8 py-3 rounded-xl hover:scale-105 transition-transform duration-200 text-base"
                    >
                      {connectionStatus === 'connecting' ? (
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
                    <Button
                      onClick={handleEndConversation}
                      disabled={isLoading}
                      className="bg-gradient-to-r from-neon-pink to-sunset-orange text-primary-white font-bold px-8 py-3 rounded-xl hover:scale-105 transition-transform duration-200 text-base"
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