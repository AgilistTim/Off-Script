import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useVoiceRecording } from '../../hooks/use-voice-recording';
import VoiceInputButton from './VoiceInputButton';
import ConversationMessage from './ConversationMessage';
import QuickActions from './QuickActions';
import TypingIndicator from './TypingIndicator';
import PersonaDetector, { UserPersona } from './PersonaDetector';
import AdaptiveAIResponse from './AdaptiveAIResponse';
import { createThread, createChatThreadInFirestore, sendMessage } from '../../services/chatService';
import { useAuth } from '../../context/AuthContext';
import { voiceService } from '../../services/voiceService';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  audioUrl?: string;
  isTyping?: boolean;
  metadata?: {
    careerInsight?: string;
    actionRequired?: string;
    confidence?: number;
    voiceGenerated?: boolean;
    personaType?: string;
    insightType?: string;
  };
}

export interface ConversationalChatProps {
  onMessageSent?: (message: string) => void;
  onVoiceInput?: (transcript: string) => void;
  onQuickAction?: (action: string) => void;
  initialGreeting?: string;
  className?: string;
}

const THUMB_REACH_ZONE = {
  bottom: '0px',
  right: '0px',
  height: '120px',
  width: '100%'
};

// Persona-specific initial greetings for 8-second value delivery
const PERSONA_GREETINGS = {
  unknown: "Hi! I'm here to help you explore career paths that actually fit your life. What makes time fly by for you?",
  overwhelmed_explorer: "Hey! I totally get that career stuff can feel overwhelming. Here's something that might help right now: 92% of people find clarity by focusing on just one strength at a time. What activities make time fly for you?",
  skeptical_pragmatist: "Look, I get it - you've probably heard career promises before. Here's something concrete you can use today: the exact 3 skills employers actually look for in your field. What field are you interested in?",
  curious_achiever: "Amazing that you're thinking about your future! Here's an opportunity most people don't know about: this emerging field could triple your earning potential. What excites you most about your career possibilities?"
};

export const ConversationalChat: React.FC<ConversationalChatProps> = ({
  onMessageSent,
  onVoiceInput,
  onQuickAction,
  initialGreeting,
  className = ''
}) => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [quickActions, setQuickActions] = useState<any[]>([]);
  const [conversationPhase, setConversationPhase] = useState<'greeting' | 'exploring' | 'deepening' | 'converting'>('greeting');
  
  // Thread management state for real AI integration
  const [threadId, setThreadId] = useState<string | null>(null);
  const [firestoreThreadId, setFirestoreThreadId] = useState<string | null>(null);
  const [isInitializingThread, setIsInitializingThread] = useState(false);
  
  // Persona detection state
  const [userPersona, setUserPersona] = useState<UserPersona>({
    type: 'unknown',
    confidence: 0,
    traits: [],
    adaptations: {
      maxResponseLength: 45,
      responseStyle: 'structured',
      valueDeliveryTimeout: 8000,
      preferredActions: ['Assess needs', 'Provide options'],
      conversationPace: 'moderate'
    }
  });
  
  const [engagementMetrics, setEngagementMetrics] = useState({
    timeOnPage: 0,
    clicksPerMinute: 0,
    scrollBehavior: 'moderate' as 'fast' | 'moderate' | 'slow',
    abandonmentRisk: 0
  });
  
  const [previousInsights, setPreviousInsights] = useState<string[]>([]);
  const [clickCount, setClickCount] = useState(0);
  const [lastUserMessage, setLastUserMessage] = useState<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [startTime] = useState(Date.now());

  // Voice recording integration
  const {
    state: voiceState,
    controls: voiceControls
  } = useVoiceRecording({
    onTranscriptReady: (transcript) => {
      if (transcript.trim()) {
        handleUserMessage(transcript);
        setShowVoiceInput(false);
        onVoiceInput?.(transcript);
      }
    },
    onError: (error) => {
      console.error('Voice recording error:', error);
      setShowVoiceInput(false);
    },
    autoConvertToText: true,
    maxRecordingTime: 30000
  });

  // Initialize thread for AI conversation
  useEffect(() => {
    const initializeThread = async () => {
      if (!currentUser || isInitializingThread || threadId) return;
      
      setIsInitializingThread(true);
      try {
        // Create OpenAI thread
        const newThreadId = await createThread();
        setThreadId(newThreadId);
        
        // Create Firestore thread
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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Set initial greeting based on persona
  useEffect(() => {
    if (messages.length === 0 && userPersona.type !== 'unknown') {
      const greeting = PERSONA_GREETINGS[userPersona.type] || PERSONA_GREETINGS.unknown;
      const welcomeMessage: Message = {
        id: `welcome-${Date.now()}`,
        content: initialGreeting || greeting,
        role: 'assistant',
        timestamp: new Date(),
        metadata: {
          personaType: userPersona.type,
          confidence: userPersona.confidence,
          voiceGenerated: false
        }
      };
      setMessages([welcomeMessage]);
      
      // Generate and play audio for the greeting
      generateAudioForMessage(welcomeMessage);
    }
  }, [userPersona.type, initialGreeting, messages.length]);

  // Generate audio for AI messages
  const generateAudioForMessage = async (message: Message) => {
    if (message.role !== 'assistant' || message.audioUrl) return;
    
    try {
      const audioResult = await voiceService.textToSpeech(message.content, {
        voiceId: userPersona.type === 'skeptical_pragmatist' ? 'EXAVITQu4vr4xnSDxMaL' : '21m00Tcm4TlvDq8ikWAM'
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
    }
  };

  // Track engagement metrics
  useEffect(() => {
    const updateMetrics = () => {
      const timeOnPage = Date.now() - startTime;
      const clicksPerMinute = (clickCount / (timeOnPage / 60000)) || 0;
      
      setEngagementMetrics(prev => ({
        ...prev,
        timeOnPage,
        clicksPerMinute,
        abandonmentRisk: timeOnPage > 30000 && clicksPerMinute < 1 ? 0.8 : 0.2
      }));
    };

    const interval = setInterval(updateMetrics, 5000);
    return () => clearInterval(interval);
  }, [startTime, clickCount]);

  // Update quick actions based on persona
  const updateQuickActionsForPersona = (persona: UserPersona) => {
    const baseActions = [
      { id: 'voice-start', label: '🎤 Talk to Me', type: 'primary' as const },
    ];

    switch (persona.type) {
      case 'overwhelmed_explorer':
        setQuickActions([
          ...baseActions,
          { id: 'show-simple-path', label: '🛤️ Simple Path', type: 'secondary' as const },
          { id: 'one-thing', label: '🎯 One Thing First', type: 'secondary' as const }
        ]);
        break;
      case 'skeptical_pragmatist':
        setQuickActions([
          ...baseActions,
          { id: 'show-evidence', label: '📊 Show Me Data', type: 'secondary' as const },
          { id: 'real-examples', label: '👥 Real Examples', type: 'secondary' as const }
        ]);
        break;
      case 'curious_achiever':
        setQuickActions([
          ...baseActions,
          { id: 'explore-advanced', label: '🚀 Advanced Options', type: 'secondary' as const },
          { id: 'growth-opportunities', label: '📈 Growth Paths', type: 'secondary' as const }
        ]);
        break;
      default:
        setQuickActions([
          ...baseActions,
          { id: 'get-started', label: '✨ Get Started', type: 'secondary' as const },
          { id: 'learn-more', label: '📚 Learn More', type: 'secondary' as const }
        ]);
    }
  };

  // Handle persona detection updates
  const handlePersonaUpdate = useCallback((newPersona: UserPersona, insights: string[]) => {
    setUserPersona(newPersona);
    setPreviousInsights(insights);
    updateQuickActionsForPersona(newPersona);
    
    // If this is the first strong persona detection, trigger a more specific greeting
    if (newPersona.confidence > 0.7 && userPersona.confidence < 0.7) {
      const personalizedGreeting = PERSONA_GREETINGS[newPersona.type];
      if (personalizedGreeting && messages.length <= 1) {
        const updatedMessage: Message = {
          id: `persona-greeting-${Date.now()}`,
          content: personalizedGreeting,
          role: 'assistant',
          timestamp: new Date(),
          metadata: {
            personaType: newPersona.type,
            confidence: newPersona.confidence,
            voiceGenerated: false
          }
        };
        setMessages(prev => [...prev, updatedMessage]);
        generateAudioForMessage(updatedMessage);
      }
    }
  }, [userPersona.confidence, messages.length]);

  // Handle user message and get AI response
  const handleUserMessage = useCallback(async (content: string) => {
    if (!content.trim() || !threadId) return;

    setClickCount(prev => prev + 1);
    setLastUserMessage(content);

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: content.trim(),
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // Send message to AI assistant
      const aiResponse = await sendMessage(threadId, content);
      
      // Create AI message
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        content: aiResponse.content,
        role: 'assistant',
        timestamp: new Date(),
        metadata: {
          confidence: 0.95,
          voiceGenerated: false,
          personaType: userPersona.type
        }
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Generate audio for AI response
      generateAudioForMessage(aiMessage);
      
      // Update conversation phase and quick actions
      updateConversationFlow(content);
      onMessageSent?.(content);
      
    } catch (error) {
      console.error('Failed to get AI response:', error);
      
      // Fallback message
      const fallbackMessage: Message = {
        id: `fallback-${Date.now()}`,
        content: "I'm having trouble connecting right now. Could you try rephrasing that?",
        role: 'assistant',
        timestamp: new Date(),
        metadata: {
          confidence: 0.3,
          voiceGenerated: false
        }
      };
      
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [threadId, userPersona.type, onMessageSent]);

  const updateConversationFlow = (userInput: string) => {
    // Update conversation phase based on interaction depth
    if (conversationPhase === 'greeting' && userInput.length > 20) {
      setConversationPhase('exploring');
    } else if (conversationPhase === 'exploring' && messages.length > 4) {
      setConversationPhase('deepening');
    }
  };

  const handleQuickAction = useCallback((actionId: string) => {
    if (actionId === 'voice-start') {
      setShowVoiceInput(true);
      return;
    }
    
    const action = quickActions.find(a => a.id === actionId);
    if (action) {
      handleUserMessage(`I want to ${action.label.toLowerCase()}`);
      onQuickAction?.(actionId);
    }
  }, [quickActions, handleUserMessage, onQuickAction]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      handleUserMessage(inputValue);
      setInputValue('');
    }
  };

  const handleSwipeToVoice = (info: PanInfo) => {
    if (info.offset.y < -50) {
      setShowVoiceInput(true);
    }
  };

  return (
    <div className={`conversational-chat ${className}`}>
      {/* Persona Detection - Hidden but active */}
      <PersonaDetector
        userMessages={messages.filter(m => m.role === 'user').map(m => ({
          content: m.content,
          timestamp: m.timestamp.getTime(),
          timeToRespond: 5000, // Default response time
          wordCount: m.content.split(' ').length
        }))}
        engagementMetrics={engagementMetrics}
        onPersonaDetected={(persona) => handlePersonaUpdate(persona, [])}
      />

      {/* Adaptive AI Response Enhancement */}
      <AdaptiveAIResponse
        userMessage={lastUserMessage || ''}
        persona={userPersona}
        conversationPhase={messages.length < 2 ? 'greeting' : messages.length < 5 ? 'exploring' : 'deepening'}
        previousInsights={previousInsights}
        onResponseGenerated={(response) => {
          // This enhances responses but we're using real AI now
          console.log('Enhanced response context:', response);
        }}
      />

      {/* Chat Container */}
      <motion.div
        ref={chatContainerRef}
        className="h-full flex flex-col bg-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        onPan={(event, info) => handleSwipeToVoice(info)}
      >
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <ConversationMessage
                key={message.id}
                message={message}
                isVoiceEnabled={true}
              />
            ))}
          </AnimatePresence>
          
          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {quickActions.length > 0 && (
          <QuickActions
            actions={quickActions}
            onActionClick={handleQuickAction}
            className="px-4 pb-2"
          />
        )}

        {/* Input Area */}
        <div className="border-t bg-gray-50 p-4">
          {showVoiceInput ? (
            <VoiceInputButton
              voiceState={voiceState}
              voiceControls={voiceControls}
              onClose={() => setShowVoiceInput(false)}
              className="w-full"
            />
          ) : (
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message or swipe up for voice..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isTyping || isInitializingThread}
              />
              <button
                type="button"
                onClick={() => setShowVoiceInput(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isTyping || isInitializingThread}
              >
                🎤
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!inputValue.trim() || isTyping || isInitializingThread}
              >
                Send
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ConversationalChat; 