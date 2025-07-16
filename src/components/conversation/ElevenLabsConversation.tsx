import React, { useCallback, useEffect, useState } from 'react';
import { useConversation } from '@elevenlabs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPersona } from './PersonaDetector';
import { useAuth } from '../../context/AuthContext';
import { CareerInsight } from '../../services/conversationAnalyzer';
import { EnhancedCareerProfile } from '../../services/careerProfileBuilder';

export interface ElevenLabsConversationProps {
  onMessageSent?: (message: string) => void;
  onVoiceInput?: (transcript: string) => void;
  onQuickAction?: (action: string) => void;
  initialGreeting?: string;
  className?: string;
  userPersona: UserPersona;
  onPersonaUpdate?: (persona: UserPersona) => void;
  onInsightDiscovered?: (insight: CareerInsight) => void;
  onProfileUpdate?: (profile: EnhancedCareerProfile) => void;
  onRegistrationPrompt?: () => void;
}

// Persona-specific agent configurations
const PERSONA_AGENT_CONFIGS = {
  unknown: {
    firstMessage: "Hi! I'm here to help you explore career paths that actually fit your life. What makes time fly by for you?",
    dynamicVariables: {
      conversation_style: "open_exploratory",
      response_length: "medium",
      value_delivery_time: "8"
    }
  },
  overwhelmed_explorer: {
    firstMessage: "Hey! I totally get that career stuff can feel overwhelming. Here's something that might help right now: 92% of people find clarity by focusing on just one strength at a time. What activities make time fly for you?",
    dynamicVariables: {
      conversation_style: "structured_supportive",
      response_length: "short",
      value_delivery_time: "6",
      persona_type: "overwhelmed_explorer"
    }
  },
  skeptical_pragmatist: {
    firstMessage: "Look, I get it - you've probably heard career promises before. Here's something concrete you can use today: the exact 3 skills employers actually look for in your field. What field are you interested in?",
    dynamicVariables: {
      conversation_style: "direct_evidence_based",
      response_length: "short",
      value_delivery_time: "5",
      persona_type: "skeptical_pragmatist"
    }
  },
  curious_achiever: {
    firstMessage: "Amazing that you're thinking about your future! Here's an opportunity most people don't know about: this emerging field could triple your earning potential. What excites you most about your career possibilities?",
    dynamicVariables: {
      conversation_style: "encouraging_expansive",
      response_length: "medium",
      value_delivery_time: "10",
      persona_type: "curious_achiever"
    }
  }
};

// Persona-specific client tools for dynamic UI updates
const createPersonaTools = (
  onPersonaUpdate?: (persona: UserPersona) => void,
  onInsightDiscovered?: (insight: CareerInsight) => void
) => ({
  update_conversation_style: ({ style, confidence }: { style: string; confidence: number }) => {
    console.log(`Conversation style updated to: ${style} (confidence: ${confidence})`);
    return `Updated conversation style to ${style}`;
  },
  
  detect_persona_shift: ({ new_persona, traits, confidence }: { 
    new_persona: string; 
    traits: string[]; 
    confidence: number 
  }) => {
    if (onPersonaUpdate && confidence > 0.7) {
      const persona: UserPersona = {
        type: new_persona as any,
        confidence,
        traits,
        adaptations: {
          maxResponseLength: new_persona === 'skeptical_pragmatist' ? 30 : 60,
          responseStyle: new_persona === 'overwhelmed_explorer' ? 'structured' : 
                        new_persona === 'skeptical_pragmatist' ? 'direct' : 'encouraging',
          valueDeliveryTimeout: new_persona === 'skeptical_pragmatist' ? 5000 : 8000,
          preferredActions: traits.slice(0, 3),
          conversationPace: new_persona === 'curious_achiever' ? 'moderate' : 'fast'
        }
      };
      onPersonaUpdate(persona);
    }
    return `Detected persona shift to ${new_persona} with ${confidence} confidence`;
  },

  suggest_quick_action: ({ action, reason }: { action: string; reason: string }) => {
    console.log(`Suggested quick action: ${action} - ${reason}`);
    return `Quick action "${action}" suggested: ${reason}`;
  },

  request_career_insight: ({ topic, urgency }: { topic: string; urgency: 'low' | 'medium' | 'high' }) => {
    console.log(`Career insight requested for: ${topic} (urgency: ${urgency})`);
    return `Providing career insight for ${topic}`;
  },

  create_insight: ({ insight_type, user_interest }: { insight_type: string; user_interest: string }) => {
    console.log(`Creating insight: ${insight_type} for interest: ${user_interest}`);
    
    // Map insight_type to valid CareerInsight types
    const validType = (): 'interest' | 'skill' | 'preference' | 'pathway' | 'industry' | 'summary' => {
      switch (insight_type.toLowerCase()) {
        case 'career_path':
        case 'pathway':
          return 'pathway';
        case 'skill':
          return 'skill';
        case 'opportunity':
        case 'industry':
          return 'industry';
        case 'interest':
          return 'interest';
        default:
          return 'interest'; // Default fallback
      }
    };
    
    // Create a career insight object
    const insight: CareerInsight = {
      id: `insight_${Date.now()}`,
      type: validType(),
      title: `${insight_type.charAt(0).toUpperCase() + insight_type.slice(1)} for ${user_interest}`,
      description: `Based on your interest in ${user_interest}, I've identified this ${insight_type} opportunity that could be a great fit for your career development.`,
      confidence: 0.85,
      extractedAt: new Date(),
      relatedTerms: [user_interest, insight_type],
      metadata: {
        source: 'ai_conversation',
        personaType: 'agent_generated',
        conversationContext: user_interest
      }
    };
    
    // Notify the parent component about the discovered insight
    if (onInsightDiscovered) {
      onInsightDiscovered(insight);
    }
    
    return `Created ${insight_type} insight for ${user_interest}. This insight has been added to your career profile.`;
  }
});

export const ElevenLabsConversation: React.FC<ElevenLabsConversationProps> = ({
  onMessageSent,
  onVoiceInput,
  onQuickAction,
  initialGreeting,
  className = '',
  userPersona,
  onPersonaUpdate,
  onInsightDiscovered,
  onProfileUpdate,
  onRegistrationPrompt
}) => {
  const { currentUser } = useAuth();
  const [conversationMessages, setConversationMessages] = useState<Array<{
    id: string;
    content: string;
    role: 'user' | 'assistant';
    timestamp: Date;
  }>>([]);
  
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [agentMode, setAgentMode] = useState<'listening' | 'speaking' | 'thinking'>('listening');

  // Get persona-specific configuration
  const agentConfig = PERSONA_AGENT_CONFIGS[userPersona.type] || PERSONA_AGENT_CONFIGS.unknown;

  // Create conversation using ElevenLabs React hook
  const conversation = useConversation({
    onConnect: () => {
      console.log('🟢 ===== ELEVENLABS CONNECTED =====');
      console.log('✅ ElevenLabs conversation connected - audio should be working');
      setConnectionStatus('connected');
      console.log('🟢 ===== CONNECTION ESTABLISHED =====');
    },
    onDisconnect: () => {
      console.log('🔴 ===== ELEVENLABS DISCONNECTED =====');
      console.log('❌ ElevenLabs conversation disconnected');
      setConnectionStatus('disconnected');
      setAgentMode('listening');
      console.log('🔴 ===== DISCONNECTION COMPLETE =====');
    },
    onMessage: (messageData: any) => {
      console.log('📨 ElevenLabs message received:', messageData);
      
      // Extract message content from various possible formats
      const message = messageData?.message || messageData?.text || messageData?.content || JSON.stringify(messageData);
      
      if (message && typeof message === 'string' && message.length > 0) {
        const assistantMessage = {
          id: `assistant-${Date.now()}`,
          content: message,
          role: 'assistant' as const,
          timestamp: new Date()
        };
        
        console.log('✅ Adding assistant message to chat:', message.substring(0, 50) + '...');
        setConversationMessages(prev => [...prev, assistantMessage]);
        onMessageSent?.(message);
      } else {
        console.warn('⚠️ Received invalid message format:', messageData);
      }
    },
    onError: (error: any) => {
      console.error('❌ ElevenLabs conversation error:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      setConnectionStatus('disconnected');
      
      // Check for audio-specific errors
      if (error?.message?.includes('audio') || error?.message?.includes('microphone')) {
        console.error('🎤 Audio/microphone error detected');
      }
    },
    onUserTranscriptReceived: (transcript: string) => {
      console.log('🎤 User transcript received:', transcript);
      if (transcript && transcript.trim().length > 0) {
        const userMessage = {
          id: `user-${Date.now()}`,
          content: transcript,
          role: 'user' as const,
          timestamp: new Date()
        };
        console.log('✅ Adding user message to chat:', transcript);
        setConversationMessages(prev => [...prev, userMessage]);
        onVoiceInput?.(transcript);
      }
    },
    onStatusChange: (status: any) => {
      console.log('Conversation status changed:', status);
      if (status === 'connected') {
        setConnectionStatus('connected');
      } else if (status === 'disconnected') {
        setConnectionStatus('disconnected');
      }
    },
    onModeChange: (mode: any) => {
      console.log('Agent mode changed:', mode);
      setAgentMode(mode?.mode || 'listening');
    }
  });

  // Check if ElevenLabs is properly configured
  const isElevenLabsConfigured = 
    import.meta.env.VITE_ELEVENLABS_API_KEY && 
    import.meta.env.VITE_ELEVENLABS_API_KEY !== 'your_elevenlabs_api_key_here' &&
    import.meta.env.VITE_ELEVENLABS_AGENT_ID && 
    import.meta.env.VITE_ELEVENLABS_AGENT_ID !== 'your_elevenlabs_agent_id_here';

  // Start conversation automatically when component mounts
  const startConversation = useCallback(async () => {
    if (connectionStatus !== 'disconnected' || !currentUser) return;
    
    if (!isElevenLabsConfigured) {
      console.warn('ElevenLabs is not properly configured. Please set up your API key and agent ID.');
      setConnectionStatus('disconnected');
      return;
    }
    
    setConnectionStatus('connecting');
    
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      console.log('🤖 Starting ElevenLabs session with agent:', import.meta.env.VITE_ELEVENLABS_AGENT_ID?.substring(0, 10) + '...');

      // Start the conversation with ElevenLabs agent
      const conversationId = await conversation.startSession({
        agentId: import.meta.env.VITE_ELEVENLABS_AGENT_ID || 'YOUR_AGENT_ID',
        
        // Pass persona-specific configuration
        dynamicVariables: {
          ...agentConfig.dynamicVariables,
          user_id: currentUser.uid,
          user_name: currentUser.displayName || 'there',
          conversation_id: `conv_${Date.now()}`,
          platform: 'web'
        },
        
        // Client-side tools for dynamic interaction
        clientTools: createPersonaTools(onPersonaUpdate, onInsightDiscovered),
        
        // Override first message if provided
        ...(initialGreeting && { 
          firstMessage: initialGreeting 
        })
      });
      
      console.log('✅ ElevenLabs session started:', conversationId);
      console.log('🟢 Connection status set to connected');

    } catch (error) {
      console.error('Failed to start ElevenLabs conversation:', error);
      setConnectionStatus('disconnected');
    }
  }, [conversation, currentUser, agentConfig, initialGreeting, onPersonaUpdate, connectionStatus, isElevenLabsConfigured]);

  // Stop conversation
  const stopConversation = useCallback(async () => {
    if (connectionStatus === 'disconnected') return;
    
    try {
      await conversation.endSession();
      setConversationMessages([]);
    } catch (error) {
      console.error('Failed to stop conversation:', error);
    }
  }, [conversation, connectionStatus]);

  // Auto-start conversation when component mounts and user is available
  useEffect(() => {
    if (currentUser && connectionStatus === 'disconnected') {
      startConversation();
    }
  }, [currentUser, startConversation, connectionStatus]);

  // Handle quick actions
  const handleQuickAction = useCallback(async (action: string) => {
    onQuickAction?.(action);
    
    // For now, we'll let the agent handle quick actions via client tools
    // In a full implementation, you might send specific messages based on the action
    console.log('Quick action triggered:', action);
  }, [onQuickAction]);

  // Show setup message if ElevenLabs is not configured
  if (!isElevenLabsConfigured) {
    return (
      <div className={`elevenlabs-conversation ${className}`}>
        <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-purple-50">
          <div className="max-w-md text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                🎙️ Voice AI Setup Required
              </h3>
              <p className="text-gray-600 mb-4">
                To enable intelligent voice conversations, please configure your ElevenLabs integration.
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200 text-left">
              <h4 className="font-medium text-gray-800 mb-2">Quick Setup:</h4>
              <ol className="text-sm text-gray-600 space-y-1">
                <li>1. Get your ElevenLabs API key</li>
                <li>2. Create a Conversational AI agent</li>
                <li>3. Update your .env file</li>
                <li>4. Restart the development server</li>
              </ol>
            </div>
            
            <button 
              onClick={() => window.open('https://elevenlabs.io', '_blank')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Open ElevenLabs Dashboard
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`elevenlabs-conversation ${className}`}>
      {/* Connection Status Indicator */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
        <div className="flex items-center space-x-2">
          <div 
            className={`w-3 h-3 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
            }`}
          />
          <span className="text-sm font-medium">
            {connectionStatus === 'connected' ? 'Connected' : 
             connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            Agent is {agentMode === 'speaking' ? '🗣️ speaking' : 
                     agentMode === 'thinking' ? '🤔 thinking' : '👂 listening'}
          </span>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white min-h-[400px]">
        <AnimatePresence mode="popLayout">
          {conversationMessages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <span className="text-xs opacity-70 mt-1 block">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {agentMode === 'thinking' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-gray-100 p-3 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Control Panel */}
      <div className="p-4 bg-gray-50 border-t">
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {connectionStatus === 'disconnected' ? (
              <button
                onClick={startConversation}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Start Conversation
              </button>
            ) : (
              <button
                onClick={stopConversation}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                End Conversation
              </button>
            )}
          </div>
          
          {/* Persona Indicator */}
          <div className="text-sm text-gray-600">
            Persona: <span className="font-medium">{userPersona.type.replace('_', ' ')}</span>
            {userPersona.confidence > 0.5 && (
              <span className="ml-1 text-green-600">({Math.round(userPersona.confidence * 100)}%)</span>
            )}
          </div>
        </div>
        
        {/* Instructions */}
        <div className="mt-2 text-xs text-gray-500">
          {connectionStatus === 'connected' ? (
            <>
              {agentMode === 'listening' ? (
                "🎤 Just start speaking - I'm listening!"
              ) : agentMode === 'speaking' ? (
                "🗣️ I'm speaking - you can interrupt me anytime"
              ) : (
                "🤔 I'm thinking about your question..."
              )}
            </>
          ) : (
            "Click 'Start Conversation' to begin. I'll speak first!"
          )}
        </div>
      </div>
    </div>
  );
}; 