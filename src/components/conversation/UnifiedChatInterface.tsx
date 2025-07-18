import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConversation } from '@elevenlabs/react';
import { Mic, MessageCircle, Send, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useVoiceRecording } from '../../hooks/use-voice-recording';
import { createThread, createChatThreadInFirestore, sendMessage, storeMessage } from '../../services/chatService';
import { simpleChatService, SimpleChatMessage } from '../../services/simpleChatService';
import { voiceService } from '../../services/voiceService';
import { conversationAnalyzer, CareerCardData, ConversationInterest } from '../../services/conversationAnalyzer';
import { CareerInsight } from '../../services/quickValueService';
import ConversationMessage from './ConversationMessage';
import TypingIndicator from './TypingIndicator';
import PersonaDetector, { UserPersona } from './PersonaDetector';
import { InsightsCarousel } from './InsightsCarousel';
import { CareerDetailsModal } from '../ui/career-details-modal';
import { ElevenLabsConversation } from './ElevenLabsConversation';

// MCP Enhancement: Import MCP bridge service for enhanced analysis
// import { mcpBridgeService } from '../../services/mcpBridgeService';

export interface UnifiedMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  audioUrl?: string;
  metadata?: {
    careerInsight?: string;
    confidence?: number;
    voiceGenerated?: boolean;
    personaType?: string;
    source?: 'voice' | 'text' | 'elevenlabs';
  };
}

export interface UnifiedChatInterfaceProps {
  onMessageSent?: (message: string) => void;
  onVoiceInput?: (transcript: string) => void;
  onQuickAction?: (action: string) => void;
  initialGreeting?: string;
  className?: string;
  userPersona: UserPersona;
  onPersonaUpdate?: (persona: UserPersona) => void;
}

type InputMode = 'text' | 'voice' | 'elevenlabs';

// Persona-specific configurations for 8-second value delivery
const PERSONA_CONFIGS = {
  unknown: {
    greeting: "Hi! I'm here to help you explore career paths that actually fit your life. What makes time fly by for you?",
    voiceSettings: { voiceId: '21m00Tcm4TlvDq8ikWAM' },
    agentConfig: {
      firstMessage: "Hi! I'm here to help you explore career paths that actually fit your life. What makes time fly by for you?",
      dynamicVariables: {
        conversation_style: "open_exploratory",
        response_length: "medium",
        value_delivery_time: "8"
      }
    }
  },
  overwhelmed_explorer: {
    greeting: "Hey! I totally get that career stuff can feel overwhelming. Here's something that might help right now: 92% of people find clarity by focusing on just one strength at a time. What activities make time fly for you?",
    voiceSettings: { voiceId: 'EXAVITQu4vr4xnSDxMaL' },
    agentConfig: {
      firstMessage: "Hey! I totally get that career stuff can feel overwhelming. Here's something that might help right now: 92% of people find clarity by focusing on just one strength at a time. What activities make time fly for you?",
      dynamicVariables: {
        conversation_style: "structured_supportive",
        response_length: "short",
        value_delivery_time: "6",
        persona_type: "overwhelmed_explorer"
      }
    }
  },
  skeptical_pragmatist: {
    greeting: "Look, I get it - you've probably heard career promises before. Here's something concrete you can use today: the exact 3 skills employers actually look for in your field. What field are you interested in?",
    voiceSettings: { voiceId: 'bVMeCyTHy58xNoL34h3p' },
    agentConfig: {
      firstMessage: "Look, I get it - you've probably heard career promises before. Here's something concrete you can use today: the exact 3 skills employers actually look for in your field. What field are you interested in?",
      dynamicVariables: {
        conversation_style: "direct_evidence_based",
        response_length: "short",
        value_delivery_time: "5",
        persona_type: "skeptical_pragmatist"
      }
    }
  },
  curious_achiever: {
    greeting: "Amazing that you're thinking about your future! Here's an opportunity most people don't know about: this emerging field could triple your earning potential. What excites you most about your career possibilities?",
    voiceSettings: { voiceId: 'pNInz6obpgDQGcFmaJgB' },
    agentConfig: {
      firstMessage: "Amazing that you're thinking about your future! Here's an opportunity most people don't know about: this emerging field could triple your earning potential. What excites you most about your career possibilities?",
      dynamicVariables: {
        conversation_style: "encouraging_expansive",
        response_length: "medium",
        value_delivery_time: "10",
        persona_type: "curious_achiever"
      }
    }
  }
};

export const UnifiedChatInterface: React.FC<UnifiedChatInterfaceProps> = ({
  onMessageSent,
  onVoiceInput,
  onQuickAction,
  initialGreeting,
  className = '',
  userPersona,
  onPersonaUpdate
}) => {
  const { currentUser } = useAuth();
  
  // State management
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  // Default to ElevenLabs mode if configured, otherwise text
  const getInitialInputMode = (): InputMode => {
    const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
    const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID;
    
    // Check ElevenLabs configuration
    
          if (apiKey && agentId && 
          apiKey !== 'your_elevenlabs_api_key_here' && 
          agentId !== 'your_elevenlabs_agent_id_here') {
        return 'elevenlabs';
      }
      return 'text';
  };
  
  const [inputMode, setInputMode] = useState<InputMode>(getInitialInputMode());
  
  // Debug input mode
  console.log('🎮 UnifiedChatInterface inputMode:', inputMode);
  
  // Track when ElevenLabs mode is activated
  useEffect(() => {
    if (inputMode === 'elevenlabs') {
      console.log('🟦 ElevenLabs mode activated - component should render');
    }
  }, [inputMode]);
  const [isTyping, setIsTyping] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);
  
  // Thread management for persistent chat
  const [threadId, setThreadId] = useState<string | null>(null);
  const [firestoreThreadId, setFirestoreThreadId] = useState<string | null>(null);
  const [isInitializingThread, setIsInitializingThread] = useState(false);
  
  // ElevenLabs conversation state
  const [elevenLabsConnected, setElevenLabsConnected] = useState(false);
  const [agentMode, setAgentMode] = useState<'listening' | 'speaking' | 'thinking'>('listening');
  
  // Conversation analysis state
  const [careerCards, setCareerCards] = useState<CareerCardData[]>([]);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isLoadingCardDetails, setIsLoadingCardDetails] = useState(false);
  const [selectedCareerCard, setSelectedCareerCard] = useState<CareerCardData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Registration prompt state
  const [showRegistrationPrompt, setShowRegistrationPrompt] = useState(false);
  const [registrationTrigger, setRegistrationTrigger] = useState<{
    type: 'insights' | 'messages' | 'engagement';
    count: number;
  }>({ type: 'messages', count: 0 });
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Get persona-specific configuration
  const personaConfig = PERSONA_CONFIGS[userPersona.type] || PERSONA_CONFIGS.unknown;
  
  // Check if ElevenLabs is configured
  const isElevenLabsConfigured = 
    import.meta.env.VITE_ELEVENLABS_API_KEY && 
    import.meta.env.VITE_ELEVENLABS_API_KEY !== 'your_elevenlabs_api_key_here' &&
    import.meta.env.VITE_ELEVENLABS_AGENT_ID && 
    import.meta.env.VITE_ELEVENLABS_AGENT_ID !== 'your_elevenlabs_agent_id_here';

  // Voice recording hook for fallback voice input
  const {
    state: voiceState,
    controls: voiceControls
  } = useVoiceRecording({
    onTranscriptReady: (transcript) => {
      if (transcript.trim()) {
        handleUserMessage(transcript, 'voice');
        onVoiceInput?.(transcript);
      }
    },
    onError: (error) => {
      console.error('Voice recording error:', error);
      // Fallback to text mode on voice error
      setInputMode('text');
    },
    autoConvertToText: true,
    maxRecordingTime: 30000
  });

  // ElevenLabs conversation hook
  const elevenLabsConversation = useConversation({
    onConnect: () => {
      console.log('✅ ElevenLabs connected');
      setElevenLabsConnected(true);
    },
    onDisconnect: () => {
      console.log('❌ ElevenLabs disconnected');
      setElevenLabsConnected(false);
      setAgentMode('listening');
    },
    onMessage: (messageData: any) => {
      const content = messageData?.message || messageData?.text || messageData?.content;
      if (content && typeof content === 'string' && content.length > 0) {
        const assistantMessage: UnifiedMessage = {
          id: `assistant-elevenlabs-${Date.now()}`,
          content,
          role: 'assistant',
          timestamp: new Date(),
          metadata: {
            voiceGenerated: true,
            source: 'elevenlabs',
            personaType: userPersona.type,
            confidence: 0.95
          }
        };
        
        addMessage(assistantMessage);
        onMessageSent?.(content);
      }
    },
    onUserTranscriptReceived: (transcript: string) => {
      if (transcript && transcript.trim().length > 0) {
        handleUserMessage(transcript, 'elevenlabs');
        onVoiceInput?.(transcript);
      }
    },
    onError: (error: any) => {
      console.error('ElevenLabs conversation error:', error);
      setElevenLabsConnected(false);
      // Fallback to text mode on ElevenLabs error
      if (inputMode === 'elevenlabs') {
        setInputMode('text');
      }
    },
    onModeChange: (mode: any) => {
      setAgentMode(mode?.mode || 'listening');
    }
  });

  // Initialize thread for persistent chat
  useEffect(() => {
    const initializeThread = async () => {
      if (!currentUser || isInitializingThread || threadId) return;
      
      setIsInitializingThread(true);
      try {
        const newThreadId = await createThread();
        setThreadId(newThreadId);
        
        const newFirestoreThreadId = await createChatThreadInFirestore(
          currentUser.uid, 
          newThreadId, 
          'Career Conversation'
        );
        setFirestoreThreadId(newFirestoreThreadId);
        
        console.log('Thread initialized:', { threadId: newThreadId, firestoreThreadId: newFirestoreThreadId });
      } catch (error) {
        console.error('Failed to initialize thread:', error);
      } finally {
        setIsInitializingThread(false);
      }
    };

    initializeThread();
  }, [currentUser, isInitializingThread, threadId]);

  // Set initial greeting based on persona and trigger quick value (within 8 seconds)
  useEffect(() => {
    // Initialize conversation analyzer on component mount
    // Initialize conversation analyzer for enhanced insights
  }, [userPersona.type, messages.length]);

  // Auto-start ElevenLabs conversation when in ElevenLabs mode
  useEffect(() => {
    if (inputMode === 'elevenlabs' && isElevenLabsConfigured && currentUser && !elevenLabsConnected) {
      startElevenLabsConversation();
    }
  }, [inputMode, isElevenLabsConfigured, currentUser, elevenLabsConnected]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check for registration prompt triggers - simplified and non-blocking
  useEffect(() => {
    if (currentUser || showRegistrationPrompt) return; // Don't show if already logged in or already showing
    
    const userMessages = messages.filter(m => m.role === 'user');
    
    // Only trigger after 3+ user messages (real engagement)
    if (userMessages.length >= 3 && registrationTrigger.type !== 'engagement') {
      setRegistrationTrigger({ type: 'engagement', count: userMessages.length });
      setShowRegistrationPrompt(true);
    }
  }, [messages, currentUser, showRegistrationPrompt, registrationTrigger.type]);

  // Add message to state and optionally persist to Firestore
  const addMessage = useCallback(async (message: UnifiedMessage) => {
    setMessages(prev => [...prev, message]);
    
    // Update conversation history for analysis
    setConversationHistory(prev => [...prev, { role: message.role, content: message.content }]);
    
    // Persist to Firestore if thread is available
    if (firestoreThreadId && threadId) {
      try {
        await storeMessage(
          firestoreThreadId,
          message.content,
          message.role,
          threadId,
          undefined // runId not needed for unified interface
        );
      } catch (error) {
        console.error('Failed to store message:', error);
        // Continue without persisting - not critical for UX
      }
    }
  }, [firestoreThreadId, threadId]);

  // Helper function to deduplicate career cards by title/industry
  const deduplicateCareerCards = useCallback((cards: CareerCardData[]): CareerCardData[] => {
    const seen = new Map<string, CareerCardData>();
    
    // Process cards in reverse order so newer cards take precedence
    for (let i = cards.length - 1; i >= 0; i--) {
      const card = cards[i];
      const key = `${card.title.toLowerCase().trim()}-${card.industry?.toLowerCase().trim() || ''}`;
      
      if (!seen.has(key)) {
        seen.set(key, card);
      }
    }
    
    // Return cards in original order (newest first since we processed in reverse)
    return Array.from(seen.values()).reverse();
  }, []);

  // Analyze user message for career insights and generate cards
  const analyzeUserMessage = useCallback(async (userMessage: string) => {
    try {
      // MCP Enhancement: Option to use enhanced analysis
      // To enable MCP-enhanced analysis, set VITE_ENABLE_MCP_ENHANCEMENT=true in .env
      /*
      if (import.meta.env.VITE_ENABLE_MCP_ENHANCEMENT === 'true') {
        const allMessages = [...conversationHistory, { role: 'user' as const, content: userMessage }];
        const mcpInterests = await conversationAnalyzer.analyzeConversationWithMCP(
          allMessages, 
          currentUser?.uid
        );
        
        if (mcpInterests.length > 0) {
          const mcpCareerCards = await conversationAnalyzer.generateCareerCardsWithMCP(
            mcpInterests, 
            currentUser?.uid
          );
          
          if (mcpCareerCards.length > 0) {
            console.log(`🚀 Generated ${mcpCareerCards.length} MCP-enhanced career cards`);
            // Replace rather than append for better analysis
            setCareerCards(mcpCareerCards);
            return; // Use MCP results
          }
        }
      }
      */
      
      // Standard conversation analysis using the updated method
      // Convert conversation history to string array format for compatibility
      const conversationStrings = conversationHistory.map(msg => msg.content);
      
      const result = await conversationAnalyzer.processConversationForInsights(
        userMessage,
        conversationStrings
      );
      
      if (result.careerCards.length > 0) {
        console.log(`✅ Generated ${result.careerCards.length} career cards from conversation analysis`);
        
        // Merge new cards with existing ones, removing duplicates
        setCareerCards(prev => {
          const combined = [...prev, ...result.careerCards];
          const uniqueCards = deduplicateCareerCards(combined);
          console.log(`🔄 Career cards: ${prev.length} existing + ${result.careerCards.length} new = ${uniqueCards.length} unique`);
          return uniqueCards;
        });
      }
      
      if (result.interests.length > 0) {
        console.log(`💡 Detected ${result.interests.length} career interests`);
      }
    } catch (error) {
      console.error('Error analyzing user message:', error);
    }
  }, [conversationHistory, deduplicateCareerCards]);

  // Enhanced career card generation handler for ElevenLabs
  const handleCareerCardsGenerated = useCallback((newCards: CareerCardData[]) => {
    console.log('🎯 Received career cards:', newCards.length);
    
    if (newCards.length > 0) {
      // For ElevenLabs-generated cards, we often want to replace rather than merge
      // since they tend to be more comprehensive analysis results
      const isElevenLabsGenerated = newCards.some(card => 
        card.id.includes('mcp-') || card.id.includes('enhanced-')
      );
      
      if (isElevenLabsGenerated) {
        console.log('🔄 Replacing career cards with ElevenLabs analysis');
        setCareerCards(newCards);
      } else {
        // Merge and deduplicate for other sources
        setCareerCards(prev => {
          const combined = [...prev, ...newCards];
          return deduplicateCareerCards(combined);
        });
      }
    }
  }, [deduplicateCareerCards]);

  // Handle user message from any input source
  const handleUserMessage = useCallback(async (content: string, source: 'text' | 'voice' | 'elevenlabs') => {
    if (!content.trim()) return;

    const userMessage: UnifiedMessage = {
      id: `user-${source}-${Date.now()}`,
      content: content.trim(),
      role: 'user',
      timestamp: new Date(),
      metadata: {
        voiceGenerated: source !== 'text',
        source,
        personaType: userPersona.type
      }
    };

    await addMessage(userMessage);
    
    // Analyze user message for career insights
    await analyzeUserMessage(content.trim());
    
    // Clear text input if it was a text message
    if (source === 'text') {
      setInputValue('');
    }

    // Get AI response if not using ElevenLabs (which handles responses automatically)
    if (source !== 'elevenlabs') {
      setIsTyping(true);
      try {
        const aiResponse = await simpleChatService.sendMessage(content);
        
        const aiMessage: UnifiedMessage = {
          id: aiResponse.id,
          content: aiResponse.content,
          role: 'assistant',
          timestamp: aiResponse.timestamp,
          metadata: {
            confidence: 0.95,
            voiceGenerated: false,
            source: 'text',
            personaType: userPersona.type
          }
        };

        await addMessage(aiMessage);
        
        // Generate audio for AI response if in voice mode
        if (inputMode === 'voice') {
          generateAudioForMessage(aiMessage);
        }
        
        onMessageSent?.(aiResponse.content);
      } catch (error) {
        console.error('Failed to get AI response:', error);
        
        const fallbackMessage: UnifiedMessage = {
          id: `fallback-${Date.now()}`,
          content: "I'm having trouble connecting right now. Could you try rephrasing that?",
          role: 'assistant',
          timestamp: new Date(),
          metadata: {
            confidence: 0.3,
            voiceGenerated: false,
            source: 'text'
          }
        };
        
        await addMessage(fallbackMessage);
      } finally {
        setIsTyping(false);
      }
    }
  }, [threadId, userPersona.type, inputMode, onMessageSent, addMessage, analyzeUserMessage]);

  // Generate audio for AI messages
  const generateAudioForMessage = async (message: UnifiedMessage) => {
    if (message.role !== 'assistant' || message.audioUrl) return;
    
    try {
      const audioResult = await voiceService.textToSpeech(message.content, {
        voiceId: personaConfig.voiceSettings.voiceId
      });
      
      // Update message with audio URL
      setMessages(prev => prev.map(m => 
        m.id === message.id 
          ? { ...m, audioUrl: audioResult.audioUrl, metadata: { ...m.metadata, voiceGenerated: true }}
          : m
      ));
      
      // Auto-play the audio
      setTimeout(() => {
        voiceService.playAudio(audioResult.audioUrl);
      }, 500);
    } catch (error) {
      console.error('Failed to generate audio for message:', error);
      // Continue without audio - not critical
    }
  };

  // Start ElevenLabs conversation
  const startElevenLabsConversation = useCallback(async () => {
    if (elevenLabsConnected || !isElevenLabsConfigured || !currentUser) return;
    
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      await elevenLabsConversation.startSession({
        agentId: import.meta.env.VITE_ELEVENLABS_AGENT_ID,
        dynamicVariables: {
          ...personaConfig.agentConfig.dynamicVariables,
          user_id: currentUser.uid,
          user_name: currentUser.displayName || 'there',
          conversation_id: `conv_${Date.now()}`,
          platform: 'web'
        },
        ...(initialGreeting && { 
          firstMessage: initialGreeting 
        })
      });
    } catch (error) {
      console.error('Failed to start ElevenLabs conversation:', error);
      // Fallback to text mode
      setInputMode('text');
    }
  }, [elevenLabsConversation, elevenLabsConnected, isElevenLabsConfigured, currentUser, personaConfig, initialGreeting]);

  // Handle text input submission
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      handleUserMessage(inputValue, 'text');
    }
  };

  // Handle voice recording toggle
  const handleVoiceToggle = () => {
    if (voiceState.isRecording) {
      voiceControls.stopRecording();
    } else {
      voiceControls.startRecording();
    }
  };

  // Handle input mode change
  const handleInputModeChange = (mode: InputMode) => {
    setInputMode(mode);
    setShowModeSelector(false);
    
    // Stop any ongoing voice recording
    if (voiceState.isRecording) {
      voiceControls.stopRecording();
    }
    
    // Start ElevenLabs if switching to that mode
    if (mode === 'elevenlabs' && isElevenLabsConfigured && !elevenLabsConnected) {
      startElevenLabsConversation();
    }
  };

  // Trigger quick value demonstration within 8 seconds
  const triggerQuickValueDemonstration = useCallback(async () => {
    // This function is no longer needed - career cards are generated dynamically from conversation
    console.log('Dynamic career card generation active');
  }, []);

  // Handle quick action from insights - show modal instead of sending message
  const handleQuickInsightAction = useCallback(async (card: CareerCardData) => {
    setIsLoadingCardDetails(true);
    
    // Simulate brief loading for better UX (card data is already available)
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setSelectedCareerCard(card);
    setIsModalOpen(true);
    setIsLoadingCardDetails(false);
    onQuickAction?.(card.id);
  }, [onQuickAction]);

  // Convert CareerCardData to CareerInsight format for carousel compatibility
  const convertCardToCareerInsight = useCallback((card: CareerCardData): CareerInsight => {
    return {
      id: card.id,
      title: card.title,
      description: card.description,
      actionableStep: card.nextSteps[0] || 'Explore this career path further',
      confidence: card.confidence,
      relevanceScore: card.confidence,
      category: 'pathway' as const,
      timeToValue: 'immediate',
      personaTypes: ['all'],
      metadata: {
        source: 'conversation_analysis',
        lastUpdated: new Date(),
        engagementProbability: card.confidence
      }
    };
  }, []);

  // Get status indicator for current mode
  const getStatusIndicator = () => {
    switch (inputMode) {
      case 'voice':
        return voiceState.isRecording ? 'Recording...' : 'Voice Ready';
      case 'elevenlabs':
        return elevenLabsConnected ? `Agent ${agentMode}` : 'Connecting...';
      default:
        return 'Type to chat';
    }
  };

  // Get mode button styling
  const getModeButtonClass = (mode: InputMode) => {
    const baseClass = "px-3 py-2 rounded-lg text-sm font-medium transition-colors";
    const activeClass = "bg-blue-500 text-white";
    const inactiveClass = "bg-gray-100 text-gray-700 hover:bg-gray-200";
    
    return `${baseClass} ${inputMode === mode ? activeClass : inactiveClass}`;
  };

  return (
    <div className={`unified-chat-interface ${className} flex flex-col h-full bg-white`}>
      {/* Header with mode selector */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="text-sm text-gray-600">{getStatusIndicator()}</div>
          {(inputMode === 'voice' && voiceState.isRecording) && (
            <motion.div 
              className="w-2 h-2 bg-red-500 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
          {(inputMode === 'elevenlabs' && agentMode === 'speaking') && (
            <motion.div 
              className="w-2 h-2 bg-blue-500 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowModeSelector(!showModeSelector)}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            aria-label="Change input mode"
          >
            <Settings className="w-5 h-5" />
          </button>
          
          <AnimatePresence>
            {showModeSelector && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10"
              >
                <div className="flex flex-col space-y-1">
                  <button
                    onClick={() => handleInputModeChange('text')}
                    className={getModeButtonClass('text')}
                  >
                    <MessageCircle className="w-4 h-4 inline mr-2" />
                    Text Chat
                  </button>
                  <button
                    onClick={() => handleInputModeChange('voice')}
                    className={getModeButtonClass('voice')}
                  >
                    <Mic className="w-4 h-4 inline mr-2" />
                    Voice Recording
                  </button>
                  {isElevenLabsConfigured && (
                    <button
                      onClick={() => handleInputModeChange('elevenlabs')}
                      className={getModeButtonClass('elevenlabs')}
                    >
                      <Mic className="w-4 h-4 inline mr-2" />
                      Voice AI
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Career Cards Display - Real-time Insights */}
      {careerCards.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 mb-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              🎯 Your Career Insights
              <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                {careerCards.length} insights
              </span>
            </h3>
            {careerCards.length > 3 && (
              <button 
                className="text-sm text-blue-600 hover:text-blue-800"
                onClick={() => {/* TODO: Show all cards modal */}}
              >
                View All
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {careerCards.slice(-6).map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedCareerCard(card);
                  setIsModalOpen(true);
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900 text-sm leading-tight">
                    {card.title}
                  </h4>
                  <div className="flex items-center ml-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-gray-500 ml-1">New</span>
                  </div>
                </div>
                
                <p className="text-gray-600 text-xs mb-3 line-clamp-2">
                  {card.description}
                </p>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Salary Range</span>
                    <span className="text-xs font-medium text-green-600">
                      {typeof card.averageSalary === 'object' 
                        ? `${card.averageSalary.entry} - ${card.averageSalary.senior}`
                        : card.averageSalary}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Match Score</span>
                    <div className="flex items-center">
                      <div className="w-12 h-1.5 bg-gray-200 rounded-full mr-1">
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(card.confidence || 0.8) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-600">
                        {Math.round((card.confidence || 0.8) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 pt-2 border-t border-gray-100">
                  <div className="flex flex-wrap gap-1">
                    {card.keySkills?.slice(0, 2).map((skill, skillIndex) => (
                      <span 
                        key={skillIndex}
                        className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded"
                      >
                        {skill}
                      </span>
                    ))}
                    {card.keySkills && card.keySkills.length > 2 && (
                      <span className="text-xs text-gray-500">
                        +{card.keySkills.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          {careerCards.length > 0 && (
            <div className="mt-3 text-center">
              <p className="text-xs text-gray-500">
                💡 Cards update automatically as we learn more about your interests
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ConversationMessage 
                message={message}
                isVoiceEnabled={inputMode !== 'text'}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <TypingIndicator />
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input area based on current mode */}
      <div className="p-4 border-t border-gray-200">
        {inputMode === 'text' && (
          <form onSubmit={handleTextSubmit} className="flex space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isTyping || isInitializingThread}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={!inputValue.trim() || isTyping || isInitializingThread}
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        )}
        
        {inputMode === 'voice' && (
          <div className="flex items-center justify-center">
            <button
              onClick={handleVoiceToggle}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                voiceState.isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
              disabled={voiceState.isProcessing}
            >
              <Mic className="w-5 h-5 mr-2 inline" />
              {voiceState.isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
          </div>
        )}
        
        {inputMode === 'elevenlabs' && (
          <ElevenLabsConversation
            userPersona={userPersona}
            onPersonaUpdate={onPersonaUpdate}
            onMessageSent={(message) => {
              onMessageSent?.(message);
              // Add message to unified interface
              const unifiedMessage: UnifiedMessage = {
                id: `elevenlabs-assistant-${Date.now()}`,
                content: message,
                role: 'assistant',
                timestamp: new Date(),
                metadata: {
                  source: 'elevenlabs',
                  voiceGenerated: true,
                  personaType: userPersona.type
                }
              };
              addMessage(unifiedMessage);
            }}
            onVoiceInput={(transcript) => {
              onVoiceInput?.(transcript);
              // Add user voice input to unified interface
              const userMessage: UnifiedMessage = {
                id: `elevenlabs-user-${Date.now()}`,
                content: transcript,
                role: 'user',
                timestamp: new Date(),
                metadata: {
                  source: 'elevenlabs',
                  voiceGenerated: true
                }
              };
              addMessage(userMessage);
            }}
            onCareerCardsGenerated={(cards) => {
              console.log('🎯 Received career cards from ElevenLabs:', cards.length);
              handleCareerCardsGenerated(cards);
            }}
            className="flex-1"
          />
        )}
      </div>

      {/* Persona detector (hidden but active) */}
      <PersonaDetector
        userMessages={messages.filter(m => m.role === 'user').map(m => ({
          content: m.content,
          timestamp: m.timestamp.getTime(),
          timeToRespond: 5000,
          wordCount: m.content.split(' ').length
        }))}
        engagementMetrics={{
          timeOnPage: Date.now() - messages[0]?.timestamp.getTime() || 0,
          clicksPerMinute: 0,
          scrollBehavior: 'moderate',
          abandonmentRisk: 0
        }}
        onPersonaDetected={(persona: UserPersona) => {
          if (onPersonaUpdate) {
            onPersonaUpdate(persona);
          }
        }}
      />

      {/* Registration Prompt */}
      {showRegistrationPrompt && !currentUser && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3 mx-4 mt-4 rounded-lg shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium">
                🎉 Great conversation! Create a free account to save your progress and get personalized guidance.
              </p>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => {
                  // TODO: Navigate to registration page
                  console.log('Navigate to registration');
                }}
                className="px-3 py-1 bg-white text-blue-600 text-xs font-medium rounded hover:bg-gray-100 transition-colors"
              >
                Sign Up Free
              </button>
              <button
                onClick={() => setShowRegistrationPrompt(false)}
                className="p-1 text-white/80 hover:text-white rounded transition-colors"
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Loading Overlay for Card Details */}
      <AnimatePresence>
        {isLoadingCardDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 max-w-sm mx-4"
            >
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Preparing Career Details
                </h3>
                <p className="text-gray-600 text-sm">
                  Getting the latest insights for you...
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Career Details Modal */}
      <CareerDetailsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCareerCard(null);
          setIsLoadingCardDetails(false);
        }}
        careerCard={selectedCareerCard}
      />
    </div>
  );
}; 