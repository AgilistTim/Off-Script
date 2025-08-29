import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useConversation } from '@elevenlabs/react';
import { 
  X, 
  Loader2, 
  Volume2,
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
  ChevronDown,
  Target,
  Wrench,
  DollarSign,
  TrendingUp as TrendingUpIcon,
  AlertTriangle,
  Heart,
  Lightbulb,
  Star,
  CheckCircle2,
  Zap,
  Award,
  Radio,
} from 'lucide-react';

import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { type OnboardingStage } from '../ui/onboarding-progress';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';
import { useAuth } from '../../context/AuthContext';

import { progressAwareMCPService, MCPProgressUpdate } from '../../services/progressAwareMCPService';
import { UnifiedVoiceContextService } from '../../services/unifiedVoiceContextService';
import { guestSessionService } from '../../services/guestSessionService';
import { personaOnboardingService } from '../../services/personaOnboardingService';
import { realTimePersonaAdaptationService } from '../../services/realTimePersonaAdaptationService';
import { treeProgressService } from '../../services/treeProgressService';
import { careerPathwayService } from '../../services/careerPathwayService';
import { lightweightCareerSuggestionService } from '../../services/lightweightCareerSuggestionService';
import environmentConfig from '../../config/environment';
import { TextConversationClient } from '../../services/textConversationClient';
import { EnhancedTextConversationClient } from '../../services/enhancedTextConversationClient';
import { TextPromptService } from '../../services/textPromptService';
import { ChatTextInput } from './ChatTextInput';
import { CompactProgressIndicator, MiniProgressIndicator } from '../ui/compact-progress-indicator';
import { structuredOnboardingService } from '../../services/structuredOnboardingService';
import { conversationFlowManager } from '../../services/conversationFlowManager';




interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

type CommunicationMode = 'voice' | 'text' | null;

interface EnhancedChatVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  careerContext?: any;
  currentConversationHistory?: ConversationMessage[];
  onConversationUpdate?: (messages: ConversationMessage[]) => void;
  onCareerCardsDiscovered?: (cards: any[]) => void;
  onConversationEnd?: (hasGeneratedData: boolean, careerCardCount: number) => void;
}

const EnhancedChatVoiceModalComponent: React.FC<EnhancedChatVoiceModalProps> = ({
  isOpen,
  onClose,
  careerContext,
  currentConversationHistory = [],
  onConversationUpdate,
  onCareerCardsDiscovered,
  onConversationEnd
}) => {
  const { currentUser, userData } = useAuth();

  // Global guard to prevent audio initialization before explicit user action.
  // Audio hooks check this flag to decide whether to request microphone access.
  if (typeof window !== 'undefined' && (window as any).__ALLOW_AUDIO_INIT === undefined) {
    (window as any).__ALLOW_AUDIO_INIT = false;
  }

  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>(currentConversationHistory);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [isLoading, setIsLoading] = useState(false);
  const [communicationMode, setCommunicationMode] = useState<CommunicationMode>(null);
  const [insightsSaved, setInsightsSaved] = useState(false);
  const [discoveredInsights, setDiscoveredInsights] = useState<{
    interests: string[];
    goals: string[];
    skills: string[];
    personalQualities: string[];
  }>({ interests: [], goals: [], skills: [], personalQualities: [] });
  const [careerCards, setCareerCards] = useState<any[]>([]);
  const [newContentAdded, setNewContentAdded] = useState<string | null>(null);
  const [ctaBottomOffsetPx, setCtaBottomOffsetPx] = useState<number>(0);
  
  // Connection monitoring
  const [connectionMonitor, setConnectionMonitor] = useState<NodeJS.Timeout | null>(null);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  
  // Progress tracking for career analysis
  const [progressUpdate, setProgressUpdate] = useState<MCPProgressUpdate | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Onboarding progress tracking
  const [extractedProfileData, setExtractedProfileData] = useState<{
    name?: string;
    education?: string;
    careerDirection?: string;
    careerCardsGenerated?: number;
  }>({});
  const [currentOnboardingStage, setCurrentOnboardingStage] = useState<OnboardingStage>('initial');
  
  // Real-time persona adaptation tracking
  const [personaAdaptationState, setPersonaAdaptationState] = useState<any>(null);
  const [personaChangeEvents, setPersonaChangeEvents] = useState<any[]>([]);
  
  // Compact progress visualization
  const [compactProgressData, setCompactProgressData] = useState<any>(null);
  
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const mobileScrollAreaRef = useRef<HTMLDivElement>(null);
  const conversationInitialized = useRef<boolean>(false);
  
  // Ref to always access current conversation history (avoids stale closure)
  const conversationHistoryRef = useRef<ConversationMessage[]>([]);

  // Extract profile data from conversation
  const extractProfileDataFromConversation = (messages: ConversationMessage[]) => {
    const extracted: typeof extractedProfileData = {};
    
    // Extract name - look for "I'm [Name]" or "My name is [Name]" patterns
    const namePatterns = [
      /(?:I'm|I am)\s+([A-Z][a-zA-Z]+)(?:\.|$|\s)/i,
      /(?:My name is|Name is|Call me)\s+([A-Z][a-zA-Z]+)/i,
      /(?:Hi|Hello),?\s*(?:I'm|I am)\s+([A-Z][a-zA-Z]+)/i
    ];
    
    // Extract education/work status
    const educationPatterns = [
      /(?:I'm|I am)\s+(?:currently\s+)?(?:in\s+)?(secondary school|college|university|working|graduated)/i,
      /(?:I'm|I am)\s+(?:a\s+)?(student|worker|graduate)/i,
      /(?:taking a gap year|gap year)/i
    ];
    
    // Extract career direction
    const careerPatterns = [
      /(?:interested in|like|enjoy|want to work in)\s+([^.]+)/i,
      /(?:exploring|considering)\s+([^.]+)/i,
      /(?:career|job|work)\s+in\s+([^.]+)/i
    ];

    for (const message of messages) {
      if (message.role === 'user') {
        const content = message.content;
        
        // Extract name
        if (!extracted.name) {
          for (const pattern of namePatterns) {
            const match = content.match(pattern);
            if (match && match[1]) {
              extracted.name = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
              break;
            }
          }
        }
        
        // Extract education/work
        if (!extracted.education) {
          for (const pattern of educationPatterns) {
            const match = content.match(pattern);
            if (match && match[1]) {
              extracted.education = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
              break;
            } else if (match && match[0]) {
              extracted.education = match[0].charAt(0).toUpperCase() + match[0].slice(1).toLowerCase();
              break;
            }
          }
        }
        
        // Extract career interests
        if (!extracted.careerDirection) {
          for (const pattern of careerPatterns) {
            const match = content.match(pattern);
            if (match && match[1]) {
              extracted.careerDirection = match[1].trim().charAt(0).toUpperCase() + match[1].trim().slice(1);
              break;
            }
          }
        }
      }
    }
    
    // Count career cards generated
    extracted.careerCardsGenerated = careerCards.length;
    
    return extracted;
  };
  
  // Ref to always access current career cards (avoids stale closure)
  const careerCardsRef = useRef<any[]>([]);
  
  // Refs for debug logging memoization (to reduce log spam)
  const lastDebugKey = useRef<string>('');
  const lastConversationDebugKey = useRef<string>('');
  const renderCount = useRef(0);

  // Debug: Log component mount/unmount
  useEffect(() => {
    console.log('🎭 EnhancedChatVoiceModal: Component mounted');
    // Keyboard/visual viewport awareness for CTA positioning on mobile
    const vv: any = (window as any).visualViewport;
    const handleViewportResize = () => {
      try {
        if (vv) {
          const delta = window.innerHeight - (vv.height + vv.offsetTop);
          // Only treat as keyboard when the delta is significant (prevents mid-screen CTA on desktop)
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
      console.log('🎭 EnhancedChatVoiceModal: Component unmounting');
      if (vv && vv.removeEventListener) {
        vv.removeEventListener('resize', handleViewportResize);
        vv.removeEventListener('scroll', handleViewportResize);
      } else {
        window.removeEventListener('resize', handleViewportResize);
      }
    };
  }, []);

  // Handle conversation update callback separately to avoid setState during render
  // Use ref to store callback to prevent stale closures
  const onConversationUpdateRef = useRef(onConversationUpdate);
  onConversationUpdateRef.current = onConversationUpdate;
  
  useEffect(() => {
    if (onConversationUpdateRef.current) {
      onConversationUpdateRef.current(conversationHistory);
    }
  }, [conversationHistory]); // Only depend on conversationHistory to prevent re-render loops

  // Handle career cards discovery callback separately to avoid setState during render
  useEffect(() => {
    if (careerCards.length > 0 && onCareerCardsDiscovered) {
      onCareerCardsDiscovered(careerCards);
    }
  }, [careerCards, onCareerCardsDiscovered]);

  // Memoize persona change handler to prevent useEffect from re-creating it
  const handlePersonaChange = useCallback((event: any) => {
    console.log('🔄 Persona change event received:', {
      type: event.type,
      previousPersona: event.previousState.currentPersona,
      newPersona: event.newState.currentPersona,
      confidence: Math.round(event.newState.confidence * 100) + '%',
      recommendedActions: event.recommendedActions.length
    });
    
    // Update state with new persona information
    setPersonaAdaptationState(event.newState);
    setPersonaChangeEvents(prev => [...prev, event].slice(-5)); // Keep last 5 events
    
    // TODO: If we need to inject context into conversation, we could do it here
    // For now, this is primarily for tracking and debugging
  }, []);

  // Initialize real-time persona adaptation service
  useEffect(() => {
    if (!currentUser && isOpen) {
      console.log('🧠 Initializing real-time persona adaptation for guest user');
      
      // Set up persona change listener with memoized handler
      const unsubscribe = realTimePersonaAdaptationService.onPersonaChange(handlePersonaChange);
      
      return () => {
        console.log('🧹 Cleaning up persona adaptation listeners');
        unsubscribe();
        realTimePersonaAdaptationService.reset();
      };
    }
  }, [currentUser, isOpen, handlePersonaChange]);

  // Memoize progress update handler to prevent recreation on every render
  const updateCompactProgress = useCallback(() => {
    try {
      const progressData = treeProgressService.getCompactProgressData();
      
      // Use ref to avoid stale closure comparisons
      setCompactProgressData(prevData => {
        // Skip update if data hasn't actually changed
        if (prevData) {
          const progressKey = `${progressData.stage.customerLabel}-${Math.round(progressData.stage.progress * 100)}`;
          const lastProgressKey = `${prevData.stage.customerLabel}-${Math.round(prevData.stage.progress * 100)}`;
          
          if (progressKey === lastProgressKey) {
            return prevData; // No actual change, skip update
          }
        }
        
        console.log('📊 Compact progress updated:', {
          stage: progressData.stage.customerLabel,
          progress: Math.round(progressData.stage.progress * 100) + '%',
          stats: progressData.stats
        });
        
        return progressData;
      });
    } catch (error) {
      console.error('❌ Failed to update compact progress:', error);
    }
  }, []);

  // Initialize and update compact progress visualization with real-time updates
  useEffect(() => {
    if (!currentUser && isOpen) {
      console.log('📊 Initializing compact progress visualization for guest user');
      
      // Initialize structured onboarding for guest users (only when modal opens)
      const guestSession = guestSessionService.getGuestSession();
      if (!guestSession.structuredOnboarding) {
        if (guestSession.conversationHistory.length === 0) {
          console.log('🎯 Fresh guest user detected - initializing structured onboarding');
          structuredOnboardingService.initializeStructuredFlow();
        } else {
          console.log('🔄 Existing session without structured onboarding - user can continue with legacy flow or restart for questionnaire');
        }
      }
      
      // Batched update mechanism using refs to avoid stale closures
      let updateTimeout: NodeJS.Timeout | null = null;
      
      const updateCompactProgressBatched = () => {
        if (updateTimeout) {
          clearTimeout(updateTimeout);
        }
        updateTimeout = setTimeout(updateCompactProgress, 100); // Batch updates within 100ms
      };

      // Update initially
      updateCompactProgress();

      // Set up listener for real-time progress updates with memoized handler
      const unsubscribe = treeProgressService.onProgressUpdate((update) => {
        console.log('📊 Real-time progress update received:', update.description);
        updateCompactProgressBatched();
      });

      // Backup periodic update (reduced frequency since we have real-time updates)
      const updateInterval = setInterval(updateCompactProgressBatched, 10000); // Update every 10 seconds as backup

      return () => {
        console.log('🧹 Cleaning up compact progress listeners');
        unsubscribe();
        clearInterval(updateInterval);
        if (updateTimeout) {
          clearTimeout(updateTimeout);
        }
      };
    }
  }, [currentUser, isOpen, updateCompactProgress]);

  // Trigger real-time progress updates when conversation changes
  useEffect(() => {
    if (!currentUser && conversationHistory.length > 0) {
      // Verify against guest session to prevent counter inflation
      const guestSession = guestSessionService.getGuestSession();
      const actualMessageCount = guestSession.conversationHistory.length;
      const stateMessageCount = conversationHistory.length;
      
      console.log('💬 Conversation length changed, triggering progress update:', {
        stateCount: stateMessageCount,
        sessionCount: actualMessageCount,
        isInflated: stateMessageCount > actualMessageCount
      });
      
      // Only trigger progress updates based on actual session message count to prevent inflation
      const effectiveLength = Math.min(stateMessageCount, actualMessageCount);
      if (effectiveLength > 0) {
        treeProgressService.triggerRealTimeUpdate('message_sent');
        
        // Check for milestones based on actual conversation length
        if (effectiveLength === 3 || effectiveLength === 5 || effectiveLength === 10) {
          treeProgressService.triggerRealTimeUpdate('engagement_milestone');
        }
      }
    }
  }, [conversationHistory.length, currentUser]);

  // Determine agent based on communication mode (ElevenLabs is VOICE-ONLY)
  const getAgentId = (mode: CommunicationMode = communicationMode): string => {
    const voiceAgentId = environmentConfig.elevenLabs.agentId;
    if (mode !== 'voice') {
      return '';
    }
    if (!voiceAgentId) {
      console.error('Missing VITE_ELEVENLABS_AGENT_ID environment variable');
      throw new Error('ElevenLabs voice agent ID not configured');
    }
    console.log('🎙️ Using voice agent:', voiceAgentId);
    return voiceAgentId;
  };

  // Get current agent ONLY for voice mode
  const currentAgentId = communicationMode === 'voice' ? getAgentId('voice') : '';
  const apiKey = environmentConfig.elevenLabs.apiKey;

  // Fallback career card generation when MCP is unavailable
  const generateFallbackCareerCards = async (messages: any[], triggerReason: string) => {
    console.log('🎯 Generating fallback career cards from conversation');
    
    // Extract career-related keywords from conversation and trigger
    const conversationText = messages.map(m => m.content.toLowerCase()).join(' ') + ' ' + triggerReason.toLowerCase();
    
    // Enhanced career data with UK-specific information
    const careerData = {
      'Chef': {
        keywords: ['cooking', 'chef', 'kitchen', 'culinary', 'food', 'restaurant', 'catering'],
        description: 'Professional chef creating delicious meals in restaurants, hotels, or catering businesses',
        salaryRange: '£18,000 - £45,000+',
        matchScore: 90,
        skills: ['Culinary Skills', 'Creativity', 'Time Management', 'Team Leadership'],
        nextSteps: ['Complete a culinary course', 'Gain kitchen experience', 'Work in different restaurant types', 'Consider apprenticeships'],
        keyResponsibilities: ['Menu planning and preparation', 'Managing kitchen operations', 'Training junior staff', 'Maintaining food safety standards'],
        educationLevel: 'Apprenticeship or culinary qualification'
      },
      'Sous Chef': {
        keywords: ['cooking', 'chef', 'kitchen', 'culinary', 'sous'],
        description: 'Second-in-command in professional kitchens, supporting head chefs and managing daily operations',
        salaryRange: '£22,000 - £35,000',
        matchScore: 85,
        skills: ['Leadership', 'Organization', 'Culinary Expertise', 'Staff Management'],
        nextSteps: ['Gain chef experience', 'Develop leadership skills', 'Learn inventory management', 'Study advanced cooking techniques'],
        keyResponsibilities: ['Supervising kitchen staff', 'Quality control', 'Menu development support', 'Kitchen operations management'],
        educationLevel: 'Professional culinary experience'
      },
      'Food Service Manager': {
        keywords: ['food', 'restaurant', 'management', 'service'],
        description: 'Managing food service operations in restaurants, hotels, or institutional settings',
        salaryRange: '£20,000 - £40,000',
        matchScore: 75,
        skills: ['Management', 'Customer Service', 'Financial Planning', 'Team Leadership'],
        nextSteps: ['Gain restaurant experience', 'Develop management skills', 'Study business operations', 'Learn food safety regulations'],
        keyResponsibilities: ['Staff scheduling and training', 'Customer service oversight', 'Budget management', 'Compliance monitoring'],
        educationLevel: 'Business or hospitality qualification preferred'
      }
    };
    
    // Detect careers based on keywords
    const detectedCareers = [];
    for (const [career, data] of Object.entries(careerData)) {
      if (data.keywords.some(keyword => conversationText.includes(keyword))) {
        detectedCareers.push({ career, ...data });
      }
    }
    
    // If no specific matches, add general chef career for cooking interests
    if (detectedCareers.length === 0 && (conversationText.includes('cooking') || conversationText.includes('chef'))) {
      detectedCareers.push({ career: 'Chef', ...careerData.Chef });
    }
    
    // Generate career cards
    const careerCards = detectedCareers.map(({ career, ...data }) => ({
      title: career,
      description: data.description,
      matchScore: data.matchScore,
      salaryRange: data.salaryRange,
      educationLevel: data.educationLevel,
      skills: data.skills,
      nextSteps: data.nextSteps,
      keyResponsibilities: data.keyResponsibilities,
      generatedAt: new Date().toISOString(),
      source: 'local_fallback'
    }));
    
    return {
      careerCards,
      message: `Generated ${careerCards.length} UK career insights based on your culinary interests`,
      analysis: {
        detectedInterests: detectedCareers.map(c => c.career),
        confidence: 0.85
      }
    };
  };



  // Define client tools that can be used by both voice and text modes
  // Memoize to prevent infinite useEffect loops in text mode
  const clientTools = useMemo(() => ({
      analyze_conversation_for_careers: async (parameters: { trigger_reason: string }) => {
        console.log('🚨 TOOL CALLED: analyze_conversation_for_careers - Enhanced modal with progress tracking!');
        console.log('🔍 Tool parameters:', parameters);
        
        // **PROGRESSIVE TOOL ENABLEMENT**: Enable career analysis when appropriate
        const shouldEnable = conversationFlowManager.shouldEnableSpecificTool('analyze_conversation_for_careers');
        console.log('🔍 [DEBUG] Tool enablement check:', {
          toolName: 'analyze_conversation_for_careers',
          shouldEnable,
          conversationHistoryLength: conversationHistory.length,
          guestSessionLength: guestSessionService.getGuestSession().conversationHistory.length
        });
        
        if (!shouldEnable) {
          console.log('⏸️ Career analysis tool not yet enabled - need more conversation');
          // TEMPORARY FIX: Allow tool to proceed if we have sufficient conversation in ANY context
          if (conversationHistory.length >= 6) {
            console.log('🔄 [OVERRIDE] Allowing tool to proceed based on conversation history length');
          } else {
            return "I'm learning about your interests and goals. Tell me more about what you enjoy or what kind of work appeals to you, and I'll start building career suggestions.";
          }
        }
        
        // Trigger progress update when career analysis starts
        console.log('🌱 Triggering progress update for career analysis start');
        treeProgressService.triggerRealTimeUpdate('engagement_milestone');
        
        try {
          // Use ref to get current conversation history (avoids stale closure)
          const currentHistory = conversationHistoryRef.current;
          
          // Get valid conversation messages for analysis
          const validMessages = currentHistory.filter(msg => 
            msg.content && 
            msg.content.trim().length > 0 && 
            !msg.content.includes('Connected to enhanced chat voice assistant') &&
            !msg.content.includes('Sarah an AI assistant') // Filter out system messages
          );

          console.log('🔍 Conversation history for analysis:', {
            totalMessages: currentHistory.length,
            validMessages: validMessages.length,
            messages: validMessages.map(m => ({ role: m.role, content: m.content.substring(0, 50) + '...' })),
            debugInfo: 'Using conversationHistoryRef.current to avoid stale closure'
          });

          if (validMessages.length === 0) {
            console.log('⚠️ No valid messages for analysis - conversation may be too new');
            return "I'm starting a deep analysis of our conversation to create personalized career cards. This comprehensive process takes 60-90 seconds to ensure accuracy - I'll share specific results as soon as they're ready.";
          }

          // **NEW: Use lightweight service for guest users**
          if (!currentUser) {
            console.log('🚀 Using lightweight career suggestions for guest user');
            
            // Convert messages to format expected by lightweight service
            const conversationMessages = validMessages.map(msg => ({
              role: msg.role, // Already in correct format ('user' | 'assistant')
              content: msg.content
            }));

            try {
              const userName = currentUser?.displayName || userData?.careerProfile?.name;
              const lightweightResult = await lightweightCareerSuggestionService.generateSuggestions(
                conversationMessages,
                userName
              );

              if (lightweightResult.success && lightweightResult.suggestions.length > 0) {
                // Convert lightweight suggestions to career card format
                const careerCards = lightweightResult.suggestions.map((suggestion, index) => ({
                  id: suggestion.id,
                  title: suggestion.title,
                  description: suggestion.description,
                  whyGoodFit: suggestion.whyGoodFit,
                  registrationCTA: suggestion.registrationCTA,
                  matchScore: 85 - (index * 5), // Decrease match score for subsequent cards
                  salaryRange: 'Register for detailed salary data',
                  educationLevel: 'Register for training pathway details',
                  skills: ['Register', 'for', 'skill', 'analysis'],
                  nextSteps: ['Register for personalized career roadmap'],
                  keyResponsibilities: ['Register for detailed role information'],
                  generatedAt: new Date().toISOString(),
                  source: 'lightweight_openai',
                  processingTimeMs: lightweightResult.processingTimeMs
                }));

                // Save career cards for guest migration
                console.log('💾 Saving career cards to guest session:', careerCards.length);
                guestSessionService.addCareerCards(careerCards);
                
                // **FIX: Update modal's career cards state so they appear in the UI**
                setCareerCards(prev => {
                  const combined = [...prev];
                  careerCards.forEach((newCard: any) => {
                    const existingIndex = combined.findIndex(card => card.title === newCard.title);
                    if (existingIndex >= 0) {
                      combined[existingIndex] = { ...combined[existingIndex], ...newCard };
                    } else {
                      combined.push(newCard);
                    }
                  });
                  return combined;
                });
                
                // Trigger career cards discovered callback
                if (onCareerCardsDiscovered) {
                  onCareerCardsDiscovered(careerCards);
                }

                const cardTitles = careerCards.map(card => card.title).join(', ');
                const processingTime = (lightweightResult.processingTimeMs / 1000).toFixed(1);
                
                setTimeout(() => {
                  const completionMessage = `✅ Quick analysis complete! I've identified ${careerCards.length} career paths that match your interests: ${cardTitles}. Each suggestion includes why it's a good fit for you. To get detailed salary ranges, training pathways, and market insights, register for your full career profile - it takes just 30 seconds and unlocks comprehensive analytics!`;
                  injectCompletionMessage(completionMessage);
                }, 500);

                return `Perfect! I'm analyzing your interests using our quick career suggestion engine. This takes just 2-3 seconds and will give you immediate insights. Processing now... (${processingTime}s)`;
              } else {
                console.warn('⚠️ Lightweight career suggestions failed, falling back to simple response');
                return "I'm analyzing your interests to suggest some career paths. Let me give you some quick insights based on what you've shared...";
              }
            } catch (error) {
              console.error('❌ Error with lightweight career suggestions:', error);
              return "I'm analyzing your interests to suggest some career paths. Let me give you some quick insights...";
            }
          }

          // **EXISTING: Use full MCP analysis for authenticated users**
          // Show progress and start analysis
          setIsAnalyzing(true);
          setProgressUpdate(null);

          // Determine if we should use enhanced analysis (Perplexity) for authenticated users
          const enableEnhancement = !!currentUser;
          
          console.log('🎯 Starting progress-aware career analysis', {
            enableEnhancement,
            userType: currentUser ? 'authenticated' : 'guest',
            messageCount: validMessages.length
          });

          const progressStartTime = Date.now();
          
          // Progress callback to update UI
          const handleProgress = (update: MCPProgressUpdate) => {
            console.log('📊 [MCP PROGRESS] Career analysis update:', {
              stage: update.stage,
              progress: update.progress,
              message: update.message,
              timeElapsed: Date.now() - (progressStartTime || Date.now()),
              estimatedTotal: '65+ seconds for deep analysis'
            });
            setProgressUpdate(update);
            
            // Inform user about longer operations
            if (update.progress > 10 && update.progress < 50) {
              console.log('⏰ [USER INFO] Deep career analysis in progress - this enables enhanced personal insights and accurate career matching');
            }
          };

          // Create completion callback to notify agent when cards are ready
          const handleCompletion = async (result: any) => {
            if (result.success) {
              const careerCards = result.enhancedCareerCards || result.basicCareerCards || [];
              const cardCount = careerCards.length;
              const cardTitles = careerCards.map((card: any) => card.title).slice(0, 3); // Show first 3 titles
              const hasEnhancement = !!result.enhancedCareerCards?.length;
              
              const completionMessage = `✅ Analysis complete! I've created ${cardCount} personalized career cards: ${cardTitles.join(', ')}${cardCount > 3 ? ' and more' : ''}. Each includes ${hasEnhancement ? 'verified salary data, training pathways, and market insights from my latest research' : 'detailed analysis of skills, progression paths, and market demand'}. Which career would you like to explore first?`;
              
              // Trigger progress update for career cards generation
              console.log('🌱 Triggering progress update for career cards generated');
              treeProgressService.triggerRealTimeUpdate('career_cards_generated');
              
              // Persist cards for authenticated users so they appear on the dashboard
              if (currentUser && careerCards.length > 0) {
                (async () => {
                  try {
                    // Ensure each card has an id for downstream mapping
                    const cardsWithIds = careerCards.map((card: any, index: number) => ({
                      ...card,
                      id: card.id || `career-${Date.now()}-${index}`
                    }));
                    await careerPathwayService.saveCareerCardsFromConversation(currentUser.uid, cardsWithIds);
                    console.log('💾 Saved conversation career cards for authenticated user:', { count: cardsWithIds.length });
                  } catch (err) {
                    console.error('❌ Failed to save conversation career cards for user:', err);
                  }
                })();
              }

              // **FIXED: Update agent context ASYNCHRONOUSLY (non-blocking) to avoid delays**
              if (currentAgentId && careerCards.length > 0) {
                // Fire and forget - don't block the completion message
                (async () => {
                  try {
                    console.log('🔄 Updating agent context with new career cards (non-blocking)...');
                    const service = new UnifiedVoiceContextService();
                    const userName = currentUser?.displayName || userData?.careerProfile?.name;
                    await service.updateAgentWithCareerCards(
                      currentAgentId, 
                      careerCards, 
                      userName,
                      'new_cards'
                    );
                    console.log('✅ Agent context updated with new career cards');
                  } catch (error) {
                    console.error('❌ Failed to update agent context with new career cards:', error);
                    // Don't affect user experience if this fails
                  }
                })();
              }
              
              // Inject completion message immediately (don't wait for context update)
              setTimeout(() => {
                injectCompletionMessage(completionMessage);
              }, 500); // Much shorter delay for immediate user feedback
            } else {
              const errorMessage = `❌ I encountered an issue while generating your career cards: ${result.error}. Please try again or continue our conversation and I'll analyze your interests differently.`;
              setTimeout(() => {
                injectCompletionMessage(errorMessage);
              }, 1000);
            }
          };

          // Use progress-aware MCP service with completion callback
          const analysisResult = await progressAwareMCPService.analyzeConversationWithProgress(
            validMessages,
            parameters.trigger_reason,
            currentUser?.uid,
            handleProgress,
            enableEnhancement,
            handleCompletion
          );

          if (analysisResult.success) {
            console.log('✅ Progress-aware analysis successful:', {
              hasBasicCards: !!analysisResult.basicCareerCards?.length,
              hasEnhancedCards: !!analysisResult.enhancedCareerCards?.length,
              basicCount: analysisResult.basicCareerCards?.length || 0,
              enhancedCount: analysisResult.enhancedCareerCards?.length || 0
            });

            // Use enhanced cards if available, otherwise basic cards
            const careerCardsToUse = analysisResult.enhancedCareerCards || analysisResult.basicCareerCards || [];
            
            // Update career cards state
            if (careerCardsToUse.length > 0) {
              setCareerCards(prev => {
                const combined = [...prev];
                careerCardsToUse.forEach((newCard: any) => {
                  const existingIndex = combined.findIndex(card => card.title === newCard.title);
                  if (existingIndex >= 0) {
                    combined[existingIndex] = { ...combined[existingIndex], ...newCard };
                  } else {
                    combined.push(newCard);
                  }
                });
                
                return combined;
              });
              
              // Persist to guest session for non-authenticated users
              if (!currentUser) {
                console.log('💾 Saving career cards to guest session:', careerCardsToUse.length);
                // Ensure cards have IDs before saving
                const cardsWithIds = careerCardsToUse.map((card: any, index: number) => ({
                  ...card,
                  id: card.id || `career-${Date.now()}-${index}`
                }));
                guestSessionService.addCareerCards(cardsWithIds);
              }
            }

            // Hide progress modal after short delay
            setTimeout(() => {
              setIsAnalyzing(false);
            }, 2000);

            const cardCount = careerCardsToUse.length;
            const cardType = analysisResult.enhancedCareerCards ? 'enhanced' : 'basic';
            
            return `Generated ${cardCount} ${cardType} career recommendations with ${enableEnhancement ? 'premium market intelligence' : 'AI analysis'}`;
            
          } else {
            // Analysis failed
            console.error('❌ Progress-aware analysis failed:', analysisResult.error);
            
            // Hide progress
            setIsAnalyzing(false);
            
            // Try fallback analysis
            console.log('🔄 Attempting fallback analysis...');
            const fallbackResult = await generateFallbackCareerCards(validMessages, parameters.trigger_reason);
            
            if (fallbackResult && typeof fallbackResult === 'object' && fallbackResult.careerCards) {
              const fallbackCards = fallbackResult.careerCards;
              setCareerCards(prev => {
                const combined = [...prev, ...fallbackCards];
                return combined;
              });
              
              // Persist to guest session for non-authenticated users
              if (!currentUser) {
                console.log('💾 Saving fallback career cards to guest session:', fallbackCards.length);
                // Ensure cards have IDs before saving
                const cardsWithIds = fallbackCards.map((card: any, index: number) => ({
                  ...card,
                  id: card.id || `fallback-career-${Date.now()}-${index}`
                }));
                guestSessionService.addCareerCards(cardsWithIds);
              }
              
              return `Generated ${fallbackCards.length} career insights using fallback analysis`;
            }
            
            return `Career analysis encountered an issue: ${analysisResult.error}`;
          }

        } catch (error) {
          console.error('❌ Error in progress-aware career analysis:', error);
          
          // Hide progress on error
          setIsAnalyzing(false);
          
          return "Career analysis is temporarily unavailable. Please try again in a moment.";
        }
      },

      update_person_profile: async (parameters: { 
        name?: string; 
        interests?: string[] | string; 
        goals?: string[] | string; 
        skills?: string[] | string; 
        personalQualities?: string[] | string; 
        lifeStage?: string;
        careerDirection?: string;
        [key: string]: any 
      }) => {
        console.log('🚨 TOOL CALLED: update_person_profile - Enhanced modal agent calling tools!');
        console.log('👤 Updating person profile based on conversation...');
        console.log('👤 Profile parameters:', parameters);
        
        // **PROGRESSIVE TOOL ENABLEMENT**: Enable profile updates early for profile building  
        if (!conversationFlowManager.shouldEnableSpecificTool('update_person_profile')) {
          console.log('⏸️ Profile tool not yet enabled - need basic information');
          return "Let me gather a bit more information about you first, then I'll update your profile.";
        }
        
        try {
          // Handle both string and array inputs from ElevenLabs agent
          const parseInsights = (value: any): string[] => {
            if (!value) return [];
            if (Array.isArray(value)) return value;
            if (typeof value === 'string') {
              // Split by comma and clean up
              return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
            }
            return [];
          };

          const newInsights = {
            interests: parseInsights(parameters.interests),
            goals: parseInsights(parameters.goals),
            skills: parseInsights(parameters.skills),
            personalQualities: parseInsights(parameters.personalQualities)
          };

          // Handle individual fields that don't go into insights display
          const name = parameters.name?.trim();
          const lifeStage = parameters.lifeStage?.trim();
          const careerDirection = parameters.careerDirection?.trim();

          // Update local state for immediate UI feedback
          setDiscoveredInsights(prev => {
            const updated = {
              interests: [...new Set([...prev.interests, ...newInsights.interests])],
              goals: [...new Set([...prev.goals, ...newInsights.goals])],
              skills: [...new Set([...prev.skills, ...newInsights.skills])],
              personalQualities: [...new Set([...prev.personalQualities, ...newInsights.personalQualities])]
            };
            
            // Show notification for new content
            const totalNewItems = newInsights.interests.length + newInsights.goals.length + newInsights.skills.length + newInsights.personalQualities.length;
            if (totalNewItems > 0) {
              setNewContentAdded(`Added ${totalNewItems} new profile detail${totalNewItems > 1 ? 's' : ''}`);
              setTimeout(() => setNewContentAdded(null), 4000);
            }
            
            return updated;
          });

          // CRITICAL: Also save to guest session if user is not logged in
          if (!currentUser) {
            const { guestSessionService } = await import('../../services/guestSessionService');
            
            const profileData = {
              name: name || null,
              interests: newInsights.interests,
              goals: newInsights.goals,
              skills: newInsights.skills,
              values: newInsights.personalQualities, // Map personalQualities to values
              workStyle: parseInsights(parameters.workStyle),
              careerStage: lifeStage || parameters.careerStage || 'exploring',
              lastUpdated: new Date().toISOString()
            };

            guestSessionService.updatePersonProfile(profileData);
            console.log('💾 Profile saved to guest session for migration:', profileData);
          }

          console.log('✅ Profile insights updated:', {
            ...newInsights,
            name,
            lifeStage,
            careerDirection
          });
          
          // Trigger progress update when profile is updated
          console.log('🌱 Triggering progress update for profile update');
          treeProgressService.triggerRealTimeUpdate('engagement_milestone');
          
          const updateSummary = [];
          if (name) updateSummary.push(`name: ${name}`);
          if (lifeStage) updateSummary.push(`life stage: ${lifeStage}`);
          if (careerDirection) updateSummary.push(`career direction: ${careerDirection}`);
          if (newInsights.interests.length) updateSummary.push(`${newInsights.interests.length} interests`);
          if (newInsights.goals.length) updateSummary.push(`${newInsights.goals.length} goals`);
          if (newInsights.skills.length) updateSummary.push(`${newInsights.skills.length} skills`);
          if (newInsights.personalQualities.length) updateSummary.push(`${newInsights.personalQualities.length} strengths`);
          
          return `Profile updated: ${updateSummary.join(', ') || 'no new information'}`;

        } catch (error) {
          console.error('❌ Error updating profile:', error);
          return "Profile update is temporarily unavailable";
        }
      },

      // Legacy tool mapping for backwards compatibility with agent configuration
      generate_career_recommendations: async (parameters: any) => {
        console.log('🚨 TOOL CALLED: generate_career_recommendations -> analyze_conversation_for_careers (Legacy Mapping)');
        console.log('🔄 Routing to MCP-based career analysis');
        console.log('🔍 Legacy tool parameters:', parameters);
        
        try {
          // Extract trigger reason with fallback
          const effectiveTriggerReason = parameters.trigger_reason || 'generate_career_recommendations';
          
          // **CRITICAL FIX**: Actually call the MCP service instead of returning fake response
          console.log('🚀 EXECUTING ACTUAL MCP ANALYSIS (was previously just fake response)');
          
          // Check if we have enough conversation history for analysis
          if (conversationHistory.length === 0) {
            return "I need a bit more conversation to analyze your interests. Could you tell me more about what you enjoy doing?";
          }
          
          // Enhanced conversation content validation
          const userMessages = conversationHistory.filter(msg => msg.role === 'user');
          const allContent = userMessages.map(msg => msg.content.toLowerCase()).join(' ');
          
          console.log('🔍 [CAREER GENERATION] Content analysis:', {
            totalMessages: conversationHistory.length,
            userMessages: userMessages.length,
            hasCareerKeywords: /work|job|career|skill|interest|enjoy|goal|consultancy|ai|build/.test(allContent),
            contentPreview: allContent.substring(0, 200) + '...'
          });

          // **THIS IS THE ACTUAL FIX**: Call the MCP analysis service with correct parameters
          console.log('🔍 Starting MCP analysis with conversation history:', {
            historyLength: conversationHistory.length,
            triggerReason: effectiveTriggerReason,
            userId: currentUser?.uid || 'guest'
          });
          
          console.log('🚀 [CAREER GENERATION] Starting MCP analysis...');
          const analysisResult = await Promise.race([
            progressAwareMCPService.analyzeConversationWithProgress(
              conversationHistory,  // Use conversation history directly (already in correct format)
              effectiveTriggerReason,
              currentUser?.uid || 'guest', // userId
              (update: MCPProgressUpdate) => {
                console.log('📊 Career analysis progress from tool:', update);
              }, // onProgress callback
              false, // enablePerplexityEnhancement
              (result: any) => {
                // Inline completion handler to avoid scoping issues
                console.log('🎉 [CAREER GENERATION] Analysis completed:', {
                  success: result.success,
                  careerCardsCount: (result.enhancedCareerCards || result.basicCareerCards || []).length,
                  hasOnCareerCardsDiscovered: !!onCareerCardsDiscovered
                });
                
                if (onCareerCardsDiscovered && result.success) {
                  const careerCards = result.enhancedCareerCards || result.basicCareerCards || [];
                  console.log('📋 [CAREER GENERATION] Calling onCareerCardsDiscovered with cards:', careerCards.length);
                  onCareerCardsDiscovered(careerCards);
                  
                  // Also update the career cards ref for immediate access
                  careerCardsRef.current = careerCards;
                  setCareerCards(careerCards);
                } else {
                  console.warn('⚠️ [CAREER GENERATION] Analysis result missing success or cards:', result);
                }
              } // onCompletion callback
            ),
            // Add timeout to prevent hanging
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('MCP analysis timeout after 60 seconds')), 60000)
            )
          ]);
          
          console.log('🏁 [CAREER GENERATION] MCP analysis completed:', {
            success: (analysisResult as any)?.success,
            hasCareerCards: !!((analysisResult as any)?.enhancedCareerCards || (analysisResult as any)?.basicCareerCards)
          });
          
          console.log('✅ MCP analysis service call completed:', analysisResult);
          
          // Return acknowledgment that analysis is starting (not fake completion)
          return "Perfect! I'm analyzing our conversation to create personalized career cards for you. This will take about 30-40 seconds...";
          
        } catch (error) {
          console.error('❌ Error in generate_career_recommendations tool:', error);
          return "I'm having trouble accessing the career analysis system right now. Could you tell me more about your interests while I try again?";
        }
      },

      trigger_instant_insights: async (parameters: { trigger_reason: string }) => {
        console.log('🚨 TOOL CALLED: trigger_instant_insights - Instant career analysis!');
        console.log('🔍 Tool parameters:', parameters);
        
        try {
          // Provide immediate career insights based on current conversation context
          const guestSession = guestSessionService.getGuestSession();
          const conversationText = guestSession.conversationHistory
            .map(msg => msg.content)
            .join(' ')
            .toLowerCase();

          // Quick pattern matching for instant insights
          const insights = [];
          
          if (/tech|software|coding|programming|developer|engineer/.test(conversationText)) {
            insights.push("🚀 Strong technical interests detected - consider software engineering, web development, or data science paths");
          }
          
          if (/creative|design|art|visual|ui|ux/.test(conversationText)) {
            insights.push("🎨 Creative talents showing - UX/UI design, graphic design, or digital marketing could be great fits");
          }
          
          if (/help|people|teach|support|care/.test(conversationText)) {
            insights.push("🤝 People-focused mindset - careers in education, healthcare, consulting, or HR might align well");
          }
          
          if (/business|management|lead|strategy/.test(conversationText)) {
            insights.push("📈 Leadership potential - consider business analysis, project management, or entrepreneurship");
          }

          // Trigger progress update
          treeProgressService.triggerRealTimeUpdate('engagement_milestone');
          
          const insightText = insights.length > 0 
            ? insights.join('. ') + '.'
            : "Based on our conversation, I can see you have diverse interests that could lead to several exciting career paths!";
            
          return `Instant insight: ${insightText} Let's explore these directions further!`;
          
        } catch (error) {
          console.error('❌ Error in trigger_instant_insights tool:', error);
          return "I'm excited about what you've shared! Let me gather more details to provide better career insights.";
        }
      },
    }), [currentUser, setConversationHistory, setCareerCards, setDiscoveredInsights, setIsAnalyzing, setProgressUpdate]);

  // Get conversation overrides for text mode
  const [conversationOverrides, setConversationOverrides] = useState<any>(null);
  
  // Set up overrides when communication mode changes to text
  useEffect(() => {
    const setupTextOverrides = async () => {
      if (communicationMode === 'text') {
        console.log('🔧 Setting up text-only overrides...');
        
        try {
          // Initialize persona onboarding for guest users in text mode
          if (!currentUser) {
            console.log('👤 Guest user - initializing persona-aware onboarding for text mode');
            
            // Check if we have existing conversation history from mode switch
            const hasExistingConversation = conversationHistory.length > 0;
            console.log('🔄 Text mode - checking for existing conversation:', {
              historyLength: conversationHistory.length,
              hasExisting: hasExistingConversation
            });
            
            // Initialize persona-based onboarding (preserve existing session if switching modes)
            personaOnboardingService.initializeOnboarding(undefined, !hasExistingConversation);
          }
          
          // Use persona-aware onboarding overrides to mirror the structured flow used in voice
          const personaOptions = await personaOnboardingService.getPersonaAwareConversationOptions('');

          // Ensure explicit textOnly flag for text-mode sessions
          const safeOverrides = {
            ...personaOptions.overrides,
            conversation: {
              ...(personaOptions.overrides?.conversation || {}),
              textOnly: true,
            },
          };

          setConversationOverrides(safeOverrides);
          console.log('✅ Text-only overrides configured:', {
            hasOverrides: !!safeOverrides,
            textOnly: safeOverrides?.conversation?.textOnly,
            hasFirstMessage: !!safeOverrides?.agent?.firstMessage
          });
          
        } catch (error) {
          console.error('❌ Failed to setup text overrides:', error);
          
          // Fallback overrides
          const fallbackOverrides = {
            conversation: { textOnly: true },
            agent: {
              prompt: { 
                prompt: "You are Sarah, an AI career assistant. Help users explore career opportunities through natural conversation." 
              },
              firstMessage: "Hi! I'm Sarah, your AI career assistant. What brings you here today?"
            }
          };
          
          setConversationOverrides(fallbackOverrides);
          console.log('⚠️ Using fallback text-only overrides');
        }
      } else {
        setConversationOverrides(null);
        console.log('🎙️ Cleared text overrides for voice mode');
      }
    };
    
    if (communicationMode) {
      setupTextOverrides();
    }
  }, [communicationMode]);
  
  // Debug conversation initialization
  // Only initialize the ElevenLabs conversation for text mode when the app is explicitly configured
  // to use ElevenLabs for text (provider === 'elevenlabs'). Otherwise Text mode should use OpenAI.
  const shouldInitializeConversation = communicationMode && (
    communicationMode === 'voice' ||
    (communicationMode === 'text' && environmentConfig.providers?.text === 'elevenlabs' && conversationOverrides)
  );
  // Memoized debug logging to reduce spam
  const debugKey = `${communicationMode}-${!!conversationOverrides}-${currentAgentId}-${shouldInitializeConversation}`;
  
  if (lastDebugKey.current !== debugKey) {
    console.log('🔍 Conversation initialization check:', {
      communicationMode,
      hasOverrides: !!conversationOverrides,
      currentAgentId,
      shouldInitialize: shouldInitializeConversation
    });
    lastDebugKey.current = debugKey;
  }

  // Initialize conversation for both voice and text modes
  const conversation = useConversation(
    shouldInitializeConversation ? {
      agentId: currentAgentId,
      clientTools,
      overrides: conversationOverrides,
      onConnect: () => {
        console.log('🔥 ONCONNECT CALLBACK FIRED!', { 
          agentId: currentAgentId, 
          mode: communicationMode,
          isInitialized: conversationInitialized.current 
        });
        
        if (conversationInitialized.current) {
          console.log('⚠️ Conversation already initialized, skipping duplicate connection');
          return;
        }
        
        console.log(`🎙️ Connected to enhanced chat assistant (Agent: ${currentAgentId}, Mode: ${communicationMode})`);
        conversationInitialized.current = true;
        setIsConnected(true);
        setConnectionStatus('connected');
        setIsLoading(false);
        
        // In text mode, don't send first message automatically - wait for user to send first message
        if (communicationMode === 'text') {
          console.log('📱 Text mode connected - waiting for user message');
        }
      },
    onDisconnect: () => {
      console.log('📞 Disconnected from enhanced chat assistant');
      
      conversationInitialized.current = false;
      setIsConnected(false);
      setConnectionStatus('disconnected');
      setIsSpeaking(false);
      setIsLoading(false);
      
      // Check if this is an onboarding completion scenario where conversation should continue
      const onboardingStage = guestSessionService.getCurrentOnboardingStage();
      const guestSessionHistory = guestSessionService.getConversationForAnalysis();
      const hasOngoingConversation = guestSessionHistory.length >= 4; // At least 2 exchanges
      const hasPersonProfile = !!guestSessionService.getGuestSession().personProfile;
      const isOnboardingTransition = (
        (onboardingStage === 'tailored_guidance' || onboardingStage === 'journey_active') && 
        hasOngoingConversation && 
        hasPersonProfile
      );
      
      console.log('🔍 Disconnect analysis:', {
        onboardingStage,
        hasOngoingConversation,
        hasPersonProfile,
        isOnboardingTransition,
        conversationLength: conversationHistory.length,
        guestSessionHistoryLength: guestSessionHistory.length
      });
      
      // Only call onConversationEnd for intentional endings, not for onboarding transitions
      if (!isOnboardingTransition && onConversationEnd) {
        const currentCards = careerCardsRef.current;
        const hasGeneratedData = currentCards.length > 0;
        console.log('🎯 Calling onConversationEnd:', { hasGeneratedData, careerCardCount: currentCards.length });
        console.log('🔍 onConversationEnd callback type:', typeof onConversationEnd);
        console.log('🔍 About to call onConversationEnd with args:', hasGeneratedData, currentCards.length);
        console.log('🔍 onConversationEnd function name:', onConversationEnd.name);
        onConversationEnd(hasGeneratedData, currentCards.length);
        console.log('✅ onConversationEnd called successfully');
      } else if (isOnboardingTransition) {
        console.log('🔄 Onboarding transition detected - preparing for continued conversation without ending session');
        // Update onboarding stage to journey_active to indicate ongoing conversation
        guestSessionService.updateOnboardingStage('journey_active');
      } else if (!onConversationEnd) {
        console.warn('⚠️ onConversationEnd callback not provided to EnhancedChatVoiceModal');
      }
    },
    onMessage: async (message) => {
      console.log('🤖 Agent message:', message);
      const newMessage: ConversationMessage = {
        role: message.source === 'ai' ? 'assistant' : 'user',
        content: message.message,
        timestamp: new Date()
      };
      
      setConversationHistory(prev => {
        const updated = [...prev, newMessage];
        conversationHistoryRef.current = updated; // Keep ref in sync
        console.log(`📝 Message added to history. Total messages: ${updated.length}`);
        
        // Save message to guest session for migration
        if (!currentUser) {
          try {
            const guestSession = guestSessionService.getGuestSession();
            console.log('💾 [GUEST FLOW] Saved message to guest session for migration:', {
              messageRole: newMessage.role,
              messagePreview: newMessage.content.substring(0, 50) + '...',
              totalMessages: guestSession.conversationHistory.length,
              sessionId: guestSession.sessionId
            });

            // Process message and potentially trigger persona analysis (async, non-blocking)
            personaOnboardingService.processConversationMessage(
              newMessage.role, 
              newMessage.content
            ).then(analysisResult => {
              if (analysisResult.analysisTriggered && analysisResult.result) {
                const personaSummary = personaOnboardingService.getPersonaSummary();
                console.log('🧠 [PERSONA ANALYSIS] Classification updated:', {
                  hasPersona: personaSummary.hasPersona,
                  type: personaSummary.type,
                  confidence: personaSummary.confidence,
                  stage: personaSummary.stage,
                  onboardingStage: guestSessionService.getCurrentOnboardingStage()
                });
                
                // Trigger real-time persona adaptation
                if (personaSummary.hasPersona && analysisResult.result) {
                  console.log('🔄 [REAL-TIME ADAPTATION] Updating persona state for conversation adaptation');
                  
                  // Get the persona profile from guest session (has proper PersonaProfile type)
                  const personaProfile = guestSessionService.getPersonaProfile();
                  const evidence = analysisResult.evidenceUpdate;
                  
                  if (personaProfile) {
                    // Initialize adaptation if needed
                    if (!realTimePersonaAdaptationService.getCurrentState()) {
                      realTimePersonaAdaptationService.initializeAdaptation(personaProfile);
                    } else {
                      // Update existing state with new persona profile
                      const changeEvent = realTimePersonaAdaptationService.updatePersonaState(
                        personaProfile,
                        evidence,
                        'conversation_message'
                      );
                      
                      if (changeEvent) {
                        console.log('🔄 [REAL-TIME ADAPTATION] Persona change detected:', {
                          type: changeEvent.type,
                          from: changeEvent.previousState.currentPersona,
                          to: changeEvent.newState.currentPersona,
                          confidence: Math.round(changeEvent.newState.confidence * 100) + '%'
                        });
                        
                        // Get context injection for agent adaptation
                        const contextInjection = realTimePersonaAdaptationService.getCurrentContextInjection();
                        if (contextInjection) {
                          console.log('💬 [CONTEXT INJECTION] Available for next agent interaction:', contextInjection.substring(0, 200) + '...');
                        }
                      }
                    }
                  }
                }
              }
            }).catch(error => {
              console.error('❌ [PERSONA ANALYSIS] Failed to process message:', error);
            });
            
          } catch (error) {
            console.error('❌ [GUEST FLOW] Failed to save message to guest session:', error);
          }
        }
        
        return updated;
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
    } : undefined
  );

  // Memoized debug conversation object to reduce spam
  const conversationDebugKey = `${!!conversation}-${conversation?.status}-${isConnected}-${connectionStatus}`;
  
  if (lastConversationDebugKey.current !== conversationDebugKey) {
    console.log('🔍 Conversation object debug:', {
      hasConversation: !!conversation,
      hasStartSession: !!(conversation && conversation.startSession),
      hasSendUserMessage: !!(conversation && conversation.sendUserMessage),
      conversationStatus: conversation?.status || 'unknown',
      isConnected,
      connectionStatus,
      conversationMethods: conversation ? Object.keys(conversation) : []
    });
    lastConversationDebugKey.current = conversationDebugKey;
  }
  
  // Auto-connect for text mode using Enhanced OpenAI client when provider is openai
  useEffect(() => {
    if (
      communicationMode === 'text' &&
      environmentConfig.providers?.text === 'openai' &&
      conversationOverrides?.conversation?.textOnly === true
    ) {
      console.log('🔄 Auto-connecting enhanced text conversation via OpenAI client');

      try {
        // Create enhanced text client with same clientTools as voice mode
        const enhancedTextClient = new EnhancedTextConversationClient(clientTools);

        enhancedTextClient.onMessage((msg) => {
          const newMessage: any = { role: 'assistant', content: msg, timestamp: new Date() };
          setConversationHistory(prev => {
            const updated = [...prev, newMessage];
            conversationHistoryRef.current = updated;
            return updated;
          });
          
          // Trigger same UI updates as voice mode
          if (!currentUser) {
            guestSessionService.addConversationMessage('assistant', msg);
          }
        });

        // Use the updated ConversationFlowManager prompt which has mandatory evidence collection
        const basePersonaContext = conversationOverrides?.agent?.prompt?.prompt || '';
        const contextType = currentUser ? 'authenticated' : 'guest';
        
        console.log('🔧 [ENHANCED TEXT MODAL] Using ConversationFlowManager prompt instead of TextPromptService:', {
          basePromptLength: basePersonaContext.length,
          basePromptPreview: basePersonaContext.substring(0, 200) + '...',
          contextType
        });
        
        // Use the basePersonaContext directly from ConversationFlowManager (which has the mandatory evidence collection)
        const enhancedPersonaContext = basePersonaContext;

        const baseFirstMessage = conversationOverrides?.agent?.firstMessage;
        
        // Only send first message if conversation is truly empty
        const currentConversationLength = conversationHistoryRef.current.length;
        const isNewConversation = currentConversationLength === 0;
        const firstMessage = isNewConversation ? baseFirstMessage : undefined;
        
        console.log('🟢 [ENHANCED TEXT START] Initializing enhanced OpenAI text client with:', {
          sessionId: guestSessionService.getGuestSession().sessionId,
          personaContextPreview: enhancedPersonaContext.substring(0, 160) + '...',
          personaContextLength: enhancedPersonaContext.length,
          hasFirstMessage: !!firstMessage,
          hasClientTools: Object.keys(clientTools).length,
          isNewConversation,
          currentConversationLength
        });

        // Use the explicit sessionId getter to ensure a valid sessionId is provided
        void enhancedTextClient.start({ 
          personaContext: enhancedPersonaContext, 
          firstMessage, 
          sessionId: guestSessionService.getSessionId() 
        });

        // Replace send in text mode to use the enhanced client
        (window as any).__TEXT_CLIENT__ = enhancedTextClient;

        return () => { void enhancedTextClient.end(); };
        
      } catch (error) {
        console.error('❌ Failed to initialize enhanced text client, falling back to basic client:', error);
        
        // Fallback to basic text client if enhanced client fails
        // Import Firebase URL utility at the top - should be available since it's already imported
        const proxyBase = '/api/openai-assistant'; // Fallback proxy base
        const textClient = new TextConversationClient(proxyBase);

        textClient.onMessage((msg) => {
          const newMessage: any = { role: 'assistant', content: msg, timestamp: new Date() };
          setConversationHistory(prev => {
            const updated = [...prev, newMessage];
            conversationHistoryRef.current = updated;
            return updated;
          });
        });

        const personaContext = conversationOverrides?.agent?.prompt?.prompt;
        const firstMessage = conversationOverrides?.agent?.firstMessage;
        
        void textClient.start({ personaContext, firstMessage, sessionId: guestSessionService.getSessionId() });
        (window as any).__TEXT_CLIENT__ = textClient;

        return () => { void textClient.end(); };
      }
    }
  }, [communicationMode, conversationOverrides, clientTools, currentUser]);

  // Memoize scroll function to prevent recreation on every render
  const scrollToBottom = useCallback(() => {
    // Function to scroll a specific container
    const scrollContainer = (containerRef: React.RefObject<HTMLDivElement>) => {
      if (containerRef.current) {
        const scrollElement = containerRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollElement) {
          const scrollHeight = scrollElement.scrollHeight;
          const clientHeight = scrollElement.clientHeight;
          const maxScrollTop = scrollHeight - clientHeight;
          
          // Force scroll to absolute bottom
          const forceScroll = () => {
            scrollElement.scrollTop = maxScrollTop;
          };
          
          // Multiple scroll attempts with different strategies
          forceScroll(); // Immediate
          requestAnimationFrame(forceScroll); // After paint
          setTimeout(forceScroll, 50); // Early fallback
          setTimeout(forceScroll, 150); // Late fallback
          
          // Also try smooth scroll as backup
          setTimeout(() => {
            scrollElement.scrollTo({
              top: scrollElement.scrollHeight,
              behavior: 'smooth'
            });
          }, 200);
        }
      }
    };

    // Scroll both mobile and desktop containers
    scrollContainer(mobileScrollAreaRef);
    scrollContainer(scrollAreaRef);
  }, []);

  // Optimized auto-scroll with debouncing to prevent excessive scroll events
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      scrollToBottom();
    }, 50); // Small debounce to batch scroll events

    return () => clearTimeout(debounceTimer);
  }, [conversationHistory.length, isSpeaking, scrollToBottom]); // Only depend on length, not entire array

  // Sync with external conversation history
  useEffect(() => {
    if (currentConversationHistory.length > 0 && !isConnected) {
      setConversationHistory(currentConversationHistory);
      conversationHistoryRef.current = currentConversationHistory; // Keep ref in sync
    }
  }, [currentConversationHistory, isConnected]);

  // Function to inject completion messages into the agent conversation
  const injectCompletionMessage = (message: string) => {
    console.log('📤 Injecting completion message to agent:', message);
    
    const completionMessage: ConversationMessage = {
      role: 'assistant',
      content: message,
      timestamp: new Date()
    };
    
    setConversationHistory(prev => {
      const updated = [...prev, completionMessage];
      conversationHistoryRef.current = updated; // Keep ref in sync
      console.log(`📝 Completion message added to history. Total messages: ${updated.length}`);
      
      // Save message to guest session for migration
      if (!currentUser) {
        try {
          guestSessionService.addConversationMessage(completionMessage.role, completionMessage.content);
          const guestSession = guestSessionService.getGuestSession();
          console.log('💾 [GUEST FLOW] Saved completion message to guest session for migration:', {
            messageRole: completionMessage.role,
            messagePreview: completionMessage.content.substring(0, 50) + '...',
            totalMessages: guestSession.conversationHistory.length,
            sessionId: guestSession.sessionId
          });
        } catch (error) {
          console.error('❌ [GUEST FLOW] Failed to save completion message to guest session:', error);
        }
      }
      
      return updated;
    });
  };

  // Cleanup conversation on unmount to prevent WebSocket conflicts
  useEffect(() => {
    return () => {
      if (conversation && conversationInitialized.current) {
        console.log('🧹 Cleaning up conversation on unmount');
        conversationInitialized.current = false;
        
        // Only attempt to end session if connection is active
        if (conversation.status === 'connected' || conversation.status === 'connecting') {
          conversation.endSession().catch((error) => {
            console.error('❌ Error cleaning up conversation on unmount:', error);
            // Suppress WebSocket errors during cleanup
          });
        } else {
          console.log('📞 Conversation already disconnected, skipping cleanup endSession');
        }
      }
    };
  }, []); // Empty dependency array - only run cleanup on actual unmount

  // Update ref when career cards change to avoid stale closure in callbacks
  useEffect(() => {
    careerCardsRef.current = careerCards;
  }, [careerCards]);

  // Extract profile data from conversation history
  useEffect(() => {
    if (conversationHistory.length > 0) {
      const extracted = extractProfileDataFromConversation(conversationHistory);
      setExtractedProfileData(prev => ({
        ...prev,
        ...extracted
      }));
    }
  }, [conversationHistory, careerCards]);

  // Sync onboarding stage with guest session service
  useEffect(() => {
    if (!currentUser) {
      // For guest users, get the onboarding stage from the guest session service
      const currentStage = guestSessionService.getCurrentOnboardingStage();
      setCurrentOnboardingStage(currentStage as OnboardingStage);
      
      console.log('🎯 Onboarding progress updated:', {
        stage: currentStage,
        extractedData: extractedProfileData
      });
    }
  }, [currentUser, conversationHistory]);

  // Log progress for debugging
  useEffect(() => {
    console.log('📊 Profile extraction progress:', {
      stage: currentOnboardingStage,
      extracted: extractedProfileData,
      conversationLength: conversationHistory.length,
      careerCardsCount: careerCards.length
    });
  }, [currentOnboardingStage, extractedProfileData, conversationHistory.length, careerCards.length]);

  // Handle conversation start
  const handleStartConversation = async () => {
    if (!conversation || !conversation.startSession) {
      console.error('❌ Conversation object not available');
      return;
    }

    setIsLoading(true);
    setConnectionStatus('connecting');

    try {
      // 🎯 PHASE 3: Check for existing career context vs new overrides
      console.log('🔧 Checking for existing career context vs building new overrides...', {
        hasCareerContext: !!careerContext,
        careerTitle: careerContext?.title
      });
      
      // If we have a careerContext, try to get conversation overrides from careerAwareVoiceService
      if (careerContext && careerContext.title) {
        console.log('✅ Career context provided - checking for conversation overrides');
        
        try {
          // Import and check for active career session overrides
          const { careerAwareVoiceService } = await import('../../services/careerAwareVoiceService');
          const activeSessions = careerAwareVoiceService.getActiveSessions(currentUser?.uid || '');
          
          if (activeSessions.length > 0) {
            const activeSessionId = activeSessions[0].sessionId;
            const overrides = careerAwareVoiceService.getConversationOverrides(activeSessionId);
            
            if (overrides) {
              console.log('🎙️ Using career conversation overrides for privacy-safe session');
              await conversation.startSession({
                agentId: currentAgentId,
                userId: currentUser?.uid,
                connectionType: 'webrtc',
                overrides
              });
            } else {
              console.log('🎙️ No overrides found, starting basic career session');
              await conversation.startSession({
                agentId: currentAgentId,
                userId: currentUser?.uid,
                connectionType: 'webrtc'
              });
            }
          } else {
            console.log('🎙️ No active career sessions, starting basic session');
            await conversation.startSession({
              agentId: currentAgentId,
              userId: currentUser?.uid,
              connectionType: 'webrtc'
            });
          }
        } catch (error) {
          console.warn('⚠️ Error getting career overrides, falling back to basic session:', error);
          await conversation.startSession({
            agentId: currentAgentId,
            userId: currentUser?.uid,
            connectionType: 'webrtc'
          });
        }
      } else {
        console.log('🔧 No career context - building conversation overrides for general chat...');
        const contextService = new UnifiedVoiceContextService();
        let overrides: any | undefined;

        if (!currentUser) {
          console.log('👤 Guest user - initializing persona-aware onboarding');
          
          // Check if we have existing conversation history from mode switch
          const hasExistingConversation = conversationHistory.length > 0;
          console.log('🔄 Checking for existing conversation:', {
            historyLength: conversationHistory.length,
            hasExisting: hasExistingConversation
          });
          
          // Initialize persona-based onboarding (preserve existing session if switching modes)
          personaOnboardingService.initializeOnboarding(undefined, !hasExistingConversation);
          
          // Get persona-aware conversation options
          const personaOptions = await personaOnboardingService.getPersonaAwareConversationOptions(currentAgentId);
          overrides = personaOptions.overrides;
          
          console.log('🧠 Persona-aware guest conversation initialized:', {
            preservedExisting: hasExistingConversation
          });
        } else {
          console.log('👤 Authenticated user - building authenticated overrides');
          overrides = await contextService.createAuthenticatedOverrides(currentUser.uid);
        }

        console.log('🔍 DEBUG: Conversation overrides structure:', {
          overrides,
          agentId: currentAgentId,
          userId: currentUser?.uid,
          firstMessage: overrides?.agent?.firstMessage
        });

        // Start session with overrides for general chat
        await conversation.startSession({
          agentId: currentAgentId,
          userId: currentUser?.uid,
          connectionType: 'webrtc',
          overrides
        });
      }
      console.log('✅ Enhanced chat conversation started successfully');
    } catch (error) {
      console.error('❌ Failed to start enhanced chat conversation:', error);
      
      // If context injection fails, log but still try to start conversation
      if (error instanceof Error && error.message.includes('context')) {
        console.warn('⚠️ Enhanced context injection failed, starting conversation without enhanced context');
        try {
          await conversation.startSession({ agentId: currentAgentId, connectionType: 'webrtc' });
          console.log('✅ Enhanced chat conversation started without context injection');
        } catch (fallbackError) {
          console.error('❌ Fallback conversation start also failed:', fallbackError);
          setConnectionStatus('disconnected');
          setIsLoading(false);
        }
      } else {
        setConnectionStatus('disconnected');
        setIsLoading(false);
      }
    }
  };


  // Handle conversation end
  const handleEndConversation = async () => {
    try {
      setIsLoading(true);
      
      // Only attempt to end session if conversation exists and is connected
      if (conversation && (conversation.status === 'connected' || conversation.status === 'connecting')) {
        await conversation.endSession();
        console.log('📞 Enhanced chat conversation ended');
      } else {
        console.log('📞 Conversation already disconnected or not available, skipping endSession');
      }
    } catch (error) {
      console.error('❌ Failed to end enhanced chat conversation:', error);
      // Don't throw the error, just log it to prevent UI issues
    } finally {
      setIsLoading(false);
    }
  };

  // Send text message function
  const sendTextMessage = async (messageText: string) => {
    if (!messageText.trim()) {
      console.warn('Cannot send message: empty text');
      return;
    }
    
    // In text mode, we don't need a voice connection
    if (communicationMode === 'voice' && !isConnected) {
      console.warn('Cannot send message: voice mode requires connection');
      return;
    }

    try {
      console.log('📤 Sending text message via enhanced modal:', messageText);
      
      // Add user message to conversation history immediately for responsive UI
      const newMessage: ConversationMessage = {
        role: 'user',
        content: messageText.trim(),
        timestamp: new Date()
      };
      
      setConversationHistory(prev => {
        const updated = [...prev, newMessage];
        conversationHistoryRef.current = updated; // Keep ref in sync
        console.log(`📝 Text message added to history. Total messages: ${updated.length}`);
        
        // Save message to guest session for migration
        if (!currentUser) {
          try {
            const guestSession = guestSessionService.getGuestSession();
            console.log('💾 [GUEST FLOW] Saved text message to guest session for migration:', {
              messageRole: newMessage.role,
              messagePreview: newMessage.content.substring(0, 50) + '...',
              totalMessages: guestSession.conversationHistory.length,
              sessionId: guestSession.sessionId
            });

            // Process message and potentially trigger persona analysis (async, non-blocking)
            personaOnboardingService.processConversationMessage(
              newMessage.role, 
              newMessage.content
            ).then(analysisResult => {
              if (analysisResult.analysisTriggered && analysisResult.result) {
                const personaSummary = personaOnboardingService.getPersonaSummary();
                console.log('🧠 [PERSONA ANALYSIS] Classification updated from text:', {
                  hasPersona: personaSummary.hasPersona,
                  type: personaSummary.type,
                  confidence: personaSummary.confidence,
                  stage: personaSummary.stage,
                  onboardingStage: guestSessionService.getCurrentOnboardingStage()
                });
                
                // Trigger real-time persona adaptation for text mode
                if (personaSummary.hasPersona && analysisResult.result) {
                  console.log('🔄 [REAL-TIME ADAPTATION] Updating persona state from text conversation');
                  
                  // Get the persona profile from guest session (has proper PersonaProfile type)
                  const personaProfile = guestSessionService.getPersonaProfile();
                  const evidence = analysisResult.evidenceUpdate;
                  
                  if (personaProfile) {
                    // Initialize adaptation if needed
                    if (!realTimePersonaAdaptationService.getCurrentState()) {
                      realTimePersonaAdaptationService.initializeAdaptation(personaProfile);
                    } else {
                      // Update existing state with new persona profile
                      const changeEvent = realTimePersonaAdaptationService.updatePersonaState(
                        personaProfile,
                        evidence,
                        'text_message'
                      );
                      
                      if (changeEvent) {
                        console.log('🔄 [REAL-TIME ADAPTATION] Persona change detected from text:', {
                          type: changeEvent.type,
                          from: changeEvent.previousState.currentPersona,
                          to: changeEvent.newState.currentPersona,
                          confidence: Math.round(changeEvent.newState.confidence * 100) + '%'
                        });
                        
                        // Get context injection for agent adaptation
                        const contextInjection = realTimePersonaAdaptationService.getCurrentContextInjection();
                        if (contextInjection) {
                          console.log('💬 [CONTEXT INJECTION] Available from text mode:', contextInjection.substring(0, 200) + '...');
                        }
                      }
                    }
                  }
                }
              }
            }).catch(error => {
              console.error('❌ [PERSONA ANALYSIS] Failed to process text message:', error);
            });
            
          } catch (error) {
            console.error('❌ [GUEST FLOW] Failed to save text message to guest session:', error);
          }
        }
        
        return updated;
      });
      
      // Handle provider-specific send
      if (communicationMode === 'text' && environmentConfig.providers?.text === 'openai') {
        const client = (window as any).__TEXT_CLIENT__ as { sendUserMessage: (t: string, h?: Array<{role:'user'|'assistant'; content:string}>) => Promise<void> } | undefined;
        if (client) {
          console.log('💬 [TEXT MSG] Sending to OpenAI proxy:', {
            messagePreview: messageText.substring(0, 120) + '...'
          });
          const minimalHistory = (conversationHistoryRef.current || []).map((m: any) => ({ role: m.role, content: m.content }));
          await client.sendUserMessage(messageText, minimalHistory);
        } else {
          console.warn('⚠️ Text client not initialized');
        }
      } else if (communicationMode === 'voice') {
        // Voice mode - message already added to history, voice agent will see and respond
        console.log('✅ Text message added to conversation history via enhanced modal - voice agent will see and respond');
      }
    } catch (error) {
      console.error('❌ Failed to send text message via enhanced modal:', error);
    }
  };

  // Check if analysis should be triggered (replicates ElevenLabs agent logic)
  const checkIfAnalysisShouldBeTriggered = (messages: ConversationMessage[], latestMessage: string): boolean => {
    const validMessages = messages.filter(msg => 
      msg.content && 
      msg.content.trim().length > 0 && 
      !msg.content.includes('Connected to enhanced chat voice assistant')
    );
    
    // Need at least 4 messages for meaningful analysis
    if (validMessages.length < 4) return false;
    
    // Check for career-related keywords in the conversation
    const conversationText = validMessages.map(m => m.content).join(' ').toLowerCase();
    const latestText = latestMessage.toLowerCase();
    
    const careerKeywords = [
      'career', 'job', 'work', 'profession', 'industry', 'field',
      'skills', 'experience', 'goals', 'interests', 'passion',
      'salary', 'growth', 'opportunities', 'future', 'path',
      'education', 'training', 'qualifications', 'degree'
    ];
    
    const keywordMatches = careerKeywords.filter(keyword => 
      conversationText.includes(keyword) || latestText.includes(keyword)
    ).length;
    
    // Trigger analysis if we have career context and sufficient conversation
    const shouldTrigger = keywordMatches >= 3 && validMessages.length >= 4;
    
    console.log('🤖 Analysis trigger check:', {
      validMessages: validMessages.length,
      keywordMatches,
      shouldTrigger,
      sample: conversationText.substring(0, 100) + '...'
    });
    
    return shouldTrigger;
  };

  // Generate phase-aware AI response using conversation flow manager
  const generateImmediateResponse = (userMessage: string, messageCount: number): string => {
    return conversationFlowManager.generatePhaseAwareResponse(userMessage, messageCount);
  };
  
  // LEGACY: Generate immediate AI response using old structured onboarding flow
  const generateImmediateResponseOld = (userMessage: string, messageCount: number): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    // First message - Welcome and start structured flow
    if (messageCount <= 1) {
      // ALWAYS use the required Sarah introduction message
      const welcomeResponse = "Hi, I'm Sarah an AI assistant. I'm here to help you think about careers and next steps. Lots of people feel unsure about their future — some have no idea where to start, some are weighing up different paths, and some already have a clear goal.\n\nTo make sure I can give you the most useful support, I'll ask a few quick questions about where you're at right now. There are no right or wrong answers — just tell me in your own words. By the end, I'll have a better idea whether you need help discovering options, narrowing down choices, or planning the next steps for a career you already have in mind.\n\nFirst up whats your name?";
      
      // Initialize structured onboarding
      structuredOnboardingService.initializeStructuredFlow();
      
      // Return the exact Sarah introduction message
      return welcomeResponse;
    }
    
    // Check if user is responding to a structured question
    const currentQuestion = structuredOnboardingService.getCurrentQuestion();
    if (currentQuestion && structuredOnboardingService.shouldPromptStructuredQuestion()) {
      
      // Try to process user response if it matches current question format
      if (currentQuestion.type === 'multiple_choice' && currentQuestion.options) {
        // Check if user provided a number response
        const numberMatch = userMessage.match(/^(\d+)\.?\s*/);
        if (numberMatch) {
          const responseIndex = parseInt(numberMatch[1]) - 1;
          if (responseIndex >= 0 && responseIndex < currentQuestion.options.length) {
            // Valid response - process it
            console.log('📝 Processing structured response:', { questionId: currentQuestion.id, responseIndex });
            
            try {
              const newState = structuredOnboardingService.submitResponse(currentQuestion.id, responseIndex);
              
              // Generate response based on completion status
              if (newState.isComplete) {
                return "Perfect! Thank you for completing the career assessment. Based on your responses, I now have a clear understanding of your situation and can provide personalized guidance. Let me analyze your profile and suggest some career paths that align with your goals and preferences.";
              } else {
                // Get next question
                const nextPrompt = structuredOnboardingService.getStructuredPrompt();
                if (nextPrompt) {
                  return `Great choice! ${nextPrompt}`;
                } else {
                  return "Thank you for that response. Let me continue gathering information about your career interests.";
                }
              }
            } catch (error) {
              console.error('❌ Error processing structured response:', error);
            }
          }
        }
      } else if (currentQuestion.type === 'open_ended') {
        // Process open-ended response
        console.log('📝 Processing open-ended response:', { questionId: currentQuestion.id });
        
        try {
          const newState = structuredOnboardingService.submitResponse(currentQuestion.id, userMessage);
          
          if (newState.isComplete) {
            return "Excellent insights! I now have a comprehensive understanding of your career situation. Let me process this information and provide you with personalized career recommendations that match your unique profile.";
          } else {
            const nextPrompt = structuredOnboardingService.getStructuredPrompt();
            if (nextPrompt) {
              return `Thank you for sharing that. ${nextPrompt}`;
            }
          }
        } catch (error) {
          console.error('❌ Error processing open-ended response:', error);
        }
      }
      
      // If we couldn't process the response, prompt for the current question again
      const structuredPrompt = structuredOnboardingService.getStructuredPrompt();
      if (structuredPrompt) {
        return `I want to make sure I understand you correctly. ${structuredPrompt}`;
      }
    }
    
    // If structured onboarding is complete, use normal conversation flow
    const currentState = structuredOnboardingService.getCurrentState();
    if (currentState.isComplete) {
      
      // Interest/passion responses
      if (lowerMessage.includes('interest') || lowerMessage.includes('passionate') || lowerMessage.includes('love') || lowerMessage.includes('enjoy')) {
        return "That's wonderful! Based on your career assessment, I can see how your interests align with certain career paths. Let me provide some specific recommendations that match both your interests and your career decision stage.";
      }
      
      // Skills responses
      if (lowerMessage.includes('skill') || lowerMessage.includes('good at') || lowerMessage.includes('talent')) {
        return "Excellent! Your skills combined with the insights from your assessment give me a clear picture of suitable career directions. Let me suggest some paths that leverage your strengths.";
      }
      
      // Goals/ambition responses  
      if (lowerMessage.includes('goal') || lowerMessage.includes('want to') || lowerMessage.includes('hope to') || lowerMessage.includes('dream')) {
        return "Your goals are important! Based on your career assessment profile, I can suggest specific steps to help you achieve these aspirations. Let me provide some tailored recommendations.";
      }
      
      // Default post-assessment responses
      const postAssessmentResponses = [
        "Based on your career assessment, I have valuable insights about your situation. I'm analyzing this along with what you've shared to provide personalized career recommendations.",
        "Great question! Your assessment results help me understand exactly how to guide you. Let me provide some specific suggestions based on your profile.",
        "That's a thoughtful point. Given your assessment results and career decision stage, I can offer some targeted advice that fits your specific situation."
      ];
      
      return postAssessmentResponses[Math.floor(Math.random() * postAssessmentResponses.length)];
    }
    
    // If somehow we're not in structured flow and not complete, fall back to encouraging structured completion
    if (messageCount >= 3) {
      const structuredPrompt = structuredOnboardingService.getStructuredPrompt();
      if (structuredPrompt) {
        return `I'd like to understand your situation better to provide the most helpful guidance. ${structuredPrompt}`;
      }
    }
    
    // Ultimate fallback
    const fallbackResponses = [
      "I'm here to provide personalized career guidance based on your unique situation. Let me ask you some questions to understand how I can best help you.",
      "Thanks for sharing that with me. To give you the most relevant advice, I'd like to understand more about your current career situation.",
      "That's valuable information! Let me learn a bit more about your career goals and decision-making stage so I can provide tailored recommendations."
    ];
    
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  };

  // Handle mode selection
  const handleModeSelection = (mode: CommunicationMode) => {
    console.log(`🎯 Communication mode selected: ${mode}`);
    // Set global flag before updating mode so audio hooks can react accordingly
    if (typeof window !== 'undefined') {
      (window as any).__ALLOW_AUDIO_INIT = mode === 'voice';
    }

    setCommunicationMode(mode);

    if (mode === 'voice') {
      // Start voice conversation automatically
      handleStartConversation();
    }
    // Text mode doesn't need connection setup
  };


  // Format timestamp for display
  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get agent display info
  const getAgentInfo = () => {
    // Dynamic agent info based on current configuration and communication mode
    const activeAgentId = getAgentId(communicationMode);
    
    switch (activeAgentId) {
      case 'agent_01k0fkhhx0e8k8e6nwtz8ptkwb':
        return {
          name: 'Career Guide',
          description: currentUser ? 'Your personalized career assistant' : 'General career exploration guide',
          icon: <Sparkles className="w-5 h-5" />
        };
      case currentAgentId:
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



  // Format salary display
  const formatSalary = (salary: string | number | undefined): string => {
    if (!salary) return 'Varies';
    if (typeof salary === 'string') return salary;
    return `£${salary.toLocaleString()}`;
  };

  // Get match badge styling
  const getMatchBadge = (score: number) => {
    if (score >= 90) return { color: 'bg-gradient-to-r from-acid-green to-cyber-yellow text-primary-black', icon: Crown };
    if (score >= 75) return { color: 'bg-gradient-to-r from-primary-lavender to-primary-peach text-primary-black', icon: Sparkles };
    return { color: 'bg-gradient-to-r from-primary-white to-primary-mint/50 text-primary-black', icon: Briefcase };
  };

  // Memoize expensive career cards rendering to prevent unnecessary re-computation
  const memoizedCareerCards = useMemo(() => {
    return careerCards.map((card, index) => {
      const matchBadge = getMatchBadge(card.matchScore || 85);
      const MatchIcon = matchBadge.icon;
      
      return { ...card, matchBadge, MatchIcon, key: `${card.title}-${index}` };
    });
  }, [careerCards]);

  // Memoize agent info to prevent recreation on every render
  const agentInfo = useMemo(() => getAgentInfo(), [currentAgentId, currentUser, communicationMode]);

  if (!isOpen) return null;



  // Do not block the modal when voice configuration is missing.
  // Voice controls are already disabled when !apiKey, and Text Chat remains available.

  // Memoized render logging to reduce spam
  renderCount.current++;
  
  if (renderCount.current % 20 === 1) { // Log every 20th render
    console.log('🎭 EnhancedChatVoiceModal: Rendering modal (isOpen=true)', { renderCount: renderCount.current });
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="md:max-w-7xl md:w-[95vw] md:h-[85vh] w-screen max-w-none h-[100dvh] p-0 bg-template-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_#000000] [&>button]:hidden z-[120] grid grid-rows-[auto_1fr_auto]"
        aria-describedby="enhanced-chat-description"
      >
          {/* Fixed Header */}
          <DialogHeader className="border-b-4 border-black pb-6 px-6 pt-6 md:px-8 flex-shrink-0 bg-template-yellow rounded-t-xl">
            <div id="enhanced-chat-description" className="sr-only">
              Enhanced voice chat interface for career guidance and conversation analysis
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-template-primary rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_#000000] flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black text-black mb-1">
                    {agentInfo.name}
                  </DialogTitle>
                  <p className="text-black/80 text-base font-semibold">
                    {agentInfo.description}
                  </p>
                </div>
              </div>
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="text-black hover:text-black/70 bg-white/50 hover:bg-white/80 border-2 border-black rounded-xl w-12 h-12 shadow-[2px_2px_0px_0px_#000000] hover:shadow-[4px_4px_0px_0px_#000000] transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
          </DialogHeader>


          {/* Flexible Content Area */}
          <div className="min-h-0 h-full overflow-hidden px-2 md:px-4 pt-2">
            {/* Mobile Layout: Stacked */}
            <div className="flex flex-col h-full md:hidden">
              {/* Mobile: Collapsible Career Insights */}
              <div className="flex-shrink-0 border-b-2 border-gray-200">
                <Collapsible defaultOpen={careerCards.length > 0 || discoveredInsights.interests.length > 0 || discoveredInsights.goals.length > 0 || discoveredInsights.skills.length > 0 || discoveredInsights.personalQualities.length > 0}>
                  <CollapsibleTrigger className="w-full p-4 flex justify-between items-center hover:bg-template-peach/20 rounded-xl border-2 border-black bg-template-white shadow-[2px_2px_0px_0px_#000000] hover:shadow-[4px_4px_0px_0px_#000000] transition-all duration-200 m-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-template-primary rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000000] flex items-center justify-center relative">
                        <Briefcase className="w-6 h-6 text-white" />
                        {(careerCards.length > 0 || discoveredInsights.interests.length > 0 || discoveredInsights.goals.length > 0 || discoveredInsights.skills.length > 0 || discoveredInsights.personalQualities.length > 0) && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-template-accent rounded-full animate-pulse border-2 border-white" />
                        )}
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-lg font-black text-black">
                          Career Insights
                        </span>
                        {(careerCards.length > 0 || discoveredInsights.interests.length > 0 || discoveredInsights.goals.length > 0 || discoveredInsights.skills.length > 0 || discoveredInsights.personalQualities.length > 0) && (
                          <span className="text-sm text-black font-semibold">
                            {careerCards.length} careers • {discoveredInsights.interests.length + discoveredInsights.goals.length + discoveredInsights.skills.length + discoveredInsights.personalQualities.length} profile details
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronDown className="h-5 w-5 text-black transition-transform ui-open:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 pb-4">
                    {/* New Content Notification */}
                    {newContentAdded && (
                      <div className="mb-3 p-2 bg-white text-black rounded-lg border-2 border-black text-center text-sm font-medium animate-pulse">
                        ✨ {newContentAdded}
                      </div>
                    )}
                    
                    {/* Compact Progress Indicator (Mobile) */}
                    {compactProgressData && !currentUser && (
                      <div className="mb-4">
                        <MiniProgressIndicator 
                          data={compactProgressData}
                          onClick={() => {
                            console.log('📊 Mobile - Progress indicator clicked');
                            // Could expand to full tree view or show detailed progress modal
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="max-h-80 overflow-y-auto bg-gray-50 rounded-lg border-2 border-black p-4">
                      {/* Progress Indicator - Only show when analyzing, no min-height */}
                      {isAnalyzing && progressUpdate && (
                        <div className="bg-white rounded-lg p-3 border-2 border-black mb-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <Loader2 className="w-4 h-4 animate-spin text-black" />
                            <span className="text-sm font-medium text-black">Analyzing Career Path</span>
                          </div>
                          <div className="text-xs text-gray-800 mb-2">
                            {progressUpdate.message || 'Processing your conversation...'}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-black h-2 rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${progressUpdate.progress || 0}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-600 mt-1 text-center">
                            {progressUpdate.progress || 0}% complete
                          </div>
                        </div>
                      )}
                      
                      {/* Profile Details - Show First */}
                      {(discoveredInsights.interests.length > 0 || 
                        discoveredInsights.goals.length > 0 || 
                        discoveredInsights.skills.length > 0 ||
                        discoveredInsights.personalQualities.length > 0) && (
                        <div className="mb-4 p-3 bg-white rounded-lg border-2 border-black">
                          <h4 className="text-sm font-bold text-black mb-3">Profile Details from Conversation:</h4>
                          <div className="space-y-3 text-xs">
                            {/* Personal Qualities */}
                            {discoveredInsights.personalQualities.length > 0 && (
                              <div className="bg-gray-50 border border-gray-300 rounded-lg p-2">
                                <div className="flex items-center space-x-2 mb-2">
                                  <Star className="w-4 h-4 text-black" />
                                  <span className="font-bold text-black text-sm">Your Strengths:</span>
                                </div>
                                <div className="grid grid-cols-1 gap-1">
                                  {discoveredInsights.personalQualities.map((quality, idx) => (
                                    <div key={idx} className="flex items-center space-x-2 bg-white rounded px-2 py-1">
                                      <Award className="w-3 h-3 text-black" />
                                      <span className="text-black font-medium text-xs">{quality}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {discoveredInsights.interests.length > 0 && (
                              <div>
                                <span className="font-medium text-black">Interests:</span>
                                <div className="ml-2 text-gray-700">
                                  {discoveredInsights.interests.map((interest, idx) => (
                                    <p key={idx}>• {interest}</p>
                                  ))}
                                </div>
                              </div>
                            )}
                            {discoveredInsights.goals.length > 0 && (
                              <div>
                                <span className="font-medium text-black">Career Goals:</span>
                                <div className="ml-2 text-gray-700">
                                  {discoveredInsights.goals.map((goal, idx) => (
                                    <p key={idx}>• {goal}</p>
                                  ))}
                                </div>
                              </div>
                            )}
                            {discoveredInsights.skills.length > 0 && (
                              <div>
                                <span className="font-medium text-black">Skills Mentioned:</span>
                                <div className="ml-2 text-gray-700">
                                  {discoveredInsights.skills.map((skill, idx) => (
                                    <p key={idx}>• {skill}</p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Career Cards for Mobile */}
                      {careerCards.length > 0 && (
                        <div className="space-y-3">
                          {careerCards.map((card, index) => {
                            const matchBadge = getMatchBadge(card.matchScore || 85);
                            const MatchIcon = matchBadge.icon;
                            
                            return (
                              <div key={index} className="border-4 border-black rounded-2xl bg-template-white p-4 shadow-[4px_4px_0px_0px_#000000] mb-3">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-template-primary rounded-xl border-2 border-black flex items-center justify-center">
                                      <Briefcase className="w-5 h-5 text-white" />
                                    </div>
                                    <h4 className="text-base font-black text-black">{card.title}</h4>
                                  </div>
                                  <Badge className="text-sm bg-template-lavender border-2 border-black text-black font-bold shadow-[2px_2px_0px_0px_#000000]">
                                    <MatchIcon className="w-4 h-4 mr-1" />
                                    {card.matchScore || 85}%
                                  </Badge>
                                </div>
                                
                                {/* Priority: Role overview */}
                                <div className="mb-3">
                                  <p className="text-sm text-black font-semibold leading-relaxed">
                                    {card.roleFundamentals?.corePurpose || card.description || 'Career pathway discovered from our conversation'}
                                  </p>
                                </div>

                                {/* Skills preview */}
                                {card.competencyRequirements?.technicalSkills && card.competencyRequirements.technicalSkills.length > 0 && (
                                  <div className="mb-3">
                                    <p className="text-sm font-bold text-black mb-2">Key Skills:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {card.competencyRequirements.technicalSkills.slice(0, 3).map((skill, i) => (
                                        <Badge key={i} className="text-xs bg-template-mint border border-black text-black font-medium">
                                          {skill}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Secondary: Financial info in small text */}
                                {(card.salaryRange || card.averageSalary || card.growthOutlook) && (
                                  <div className="flex items-center space-x-4 text-xs text-black/70">
                                    {(card.salaryRange || card.averageSalary) && (
                                      <div className="flex items-center space-x-1">
                                        <PoundSterling className="w-3 h-3" />
                                        <span>{card.salaryRange || formatSalary(card.averageSalary)}</span>
                                      </div>
                                    )}
                                    {card.growthOutlook && (
                                      <div className="flex items-center space-x-1">
                                        <TrendingUp className="w-3 h-3" />
                                        <span>{card.growthOutlook}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Persona Adaptation Debug Panel (Mobile) */}
                      {personaAdaptationState && (
                        <div className="border-t-2 border-gray-200 pt-4">
                          <h4 className="text-sm font-bold text-black mb-2 flex items-center">
                            <Zap className="w-4 h-4 mr-2 text-purple-600" />
                            Real-Time Persona Adaptation
                          </h4>
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
                            <div className="text-xs">
                              <span className="font-medium text-purple-800">Current: </span>
                              <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-300">
                                {personaAdaptationState.currentPersona}
                              </Badge>
                            </div>
                            <div className="text-xs text-purple-700">
                              <span className="font-medium">Confidence: </span>
                              {Math.round(personaAdaptationState.confidence * 100)}%
                            </div>
                            <div className="text-xs text-purple-700">
                              <span className="font-medium">Stage: </span>
                              {personaAdaptationState.conversationStage}
                            </div>
                            {personaChangeEvents.length > 0 && (
                              <div className="text-xs text-purple-600">
                                <span className="font-medium">Changes: </span>
                                {personaChangeEvents.length} adaptation events
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Smart Placeholder Text */}
                      {!careerContext && careerCards.length === 0 && (discoveredInsights.interests.length === 0 && discoveredInsights.goals.length === 0 && discoveredInsights.skills.length === 0 && discoveredInsights.personalQualities.length === 0) && (
                        <div className="text-center py-8">
                          <div className="max-w-sm mx-auto">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <User className="w-8 h-8 text-gray-400" />
                            </div>
                            <h4 className="text-base font-bold text-black mb-3">Building Your Career Profile</h4>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              As we chat, I'll build out your profile and discover career ideas tailored specifically for you. 
                              Start the conversation to see your insights appear here!
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Mobile: Chat Area */}
              <div className="flex-1 flex flex-col min-h-0">
                <ScrollArea ref={mobileScrollAreaRef} className="flex-1 px-2">
                  <div className="space-y-4 pb-4">
                    {conversationHistory.map((message, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%] px-4 py-3 rounded-xl break-words ${
                          message.role === 'user' 
                            ? 'bg-template-primary text-white' 
                            : 'bg-white text-black border-2 border-black'
                        }`}>
                          <div className="flex items-start space-x-2 mb-2">
                            {message.role === 'user' ? (
                              <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            ) : (
                              <Bot className="w-4 h-4 mt-0.5 text-black flex-shrink-0" />
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
                        <div className="bg-gray-100 text-black border-2 border-gray-300 px-4 py-3 rounded-xl max-w-xs">
                          <div className="flex items-center space-x-2">
                            <Volume2 className="w-4 h-4 text-black animate-pulse" />
                            <span className="text-sm">AI is speaking...</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Desktop Layout: Side-by-side */}
            <div className="hidden md:flex md:flex-row md:space-x-4 h-full">
              {/* Desktop: Career Insights Panel */}
              <div className="block w-64 lg:w-72 xl:w-80 flex-shrink-0 h-full">
                <div className="h-full overflow-hidden">
                <Card className="bg-gray-50 border-2 border-black h-full flex flex-col overflow-hidden min-h-[200px]">
                  <CardHeader className="pb-3 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-bold text-black">
                        CAREER INSIGHTS
                      </CardTitle>
                      {careerCards.length > 0 && (
                        <Badge className="bg-template-primary text-white font-bold">
                          <Sparkles className="w-3 h-3 mr-1" />
                          {careerCards.length} FOUND
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 overflow-y-auto flex-1 min-h-0 relative h-full">
                    {/* New Content Notification */}
                    {newContentAdded && (
                      <div className="mb-3 p-2 bg-white text-black rounded-lg border-2 border-black text-center text-sm font-medium animate-pulse">
                        ✨ {newContentAdded}
                      </div>
                    )}
                    
                    {/* Compact Progress Indicator (Desktop) */}
                    {compactProgressData && !currentUser && (
                      <div className="mb-4">
                        <CompactProgressIndicator 
                          data={compactProgressData}
                          onClick={() => {
                            console.log('📊 Desktop - Progress indicator clicked');
                            // Could expand to detailed tree view or progress dashboard
                          }}
                        />
                      </div>
                    )}
                    
                    {/* Progress Indicator - Only show when analyzing, no min-height */}
                    {isAnalyzing && progressUpdate && (
                      <div className="bg-white rounded-lg p-3 border-2 border-black mb-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Loader2 className="w-4 h-4 animate-spin text-black" />
                          <span className="text-sm font-medium text-black">Analyzing Career Path</span>
                        </div>
                        <div className="text-xs text-gray-800 mb-2">
                          {progressUpdate.message || 'Processing your conversation...'}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-black h-2 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progressUpdate.progress || 0}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-600 mt-1 text-center">
                          {progressUpdate.progress || 0}% complete
                        </div>
                      </div>
                    )}
                    
                    {/* Profile Details - Show First */}
                    {(discoveredInsights.interests.length > 0 || 
                      discoveredInsights.goals.length > 0 || 
                      discoveredInsights.skills.length > 0 ||
                      discoveredInsights.personalQualities.length > 0) && (
                      <div className="mb-4 p-3 bg-white rounded-lg border-2 border-black">
                        <h4 className="text-sm font-bold text-black mb-3">Profile Details from Conversation:</h4>
                        <div className="space-y-3 text-xs">
                          {/* Personal Qualities */}
                          {discoveredInsights.personalQualities.length > 0 && (
                            <div className="bg-gray-50 border border-gray-300 rounded-lg p-2">
                              <div className="flex items-center space-x-2 mb-2">
                                <Star className="w-4 h-4 text-black" />
                                <span className="font-bold text-black text-sm">Your Strengths:</span>
                              </div>
                              <div className="grid grid-cols-1 gap-1">
                                {discoveredInsights.personalQualities.map((quality, idx) => (
                                  <div key={idx} className="flex items-center space-x-2 bg-white rounded px-2 py-1">
                                    <Award className="w-3 h-3 text-black" />
                                    <span className="text-black font-medium text-xs">{quality}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {discoveredInsights.interests.length > 0 && (
                            <div>
                              <span className="font-medium text-black">Interests:</span>
                              <div className="ml-2 text-gray-700">
                                {discoveredInsights.interests.map((interest, idx) => (
                                  <p key={idx}>• {interest}</p>
                                ))}
                              </div>
                            </div>
                          )}
                          {discoveredInsights.goals.length > 0 && (
                            <div>
                              <span className="font-medium text-black">Career Goals:</span>
                              <div className="ml-2 text-gray-700">
                                {discoveredInsights.goals.map((goal, idx) => (
                                  <p key={idx}>• {goal}</p>
                                ))}
                              </div>
                            </div>
                          )}
                          {discoveredInsights.skills.length > 0 && (
                            <div>
                              <span className="font-medium text-black">Skills Mentioned:</span>
                              <div className="ml-2 text-gray-700">
                                {discoveredInsights.skills.map((skill, idx) => (
                                  <p key={idx}>• {skill}</p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Discovered Career Cards - Show After Profile */}
                    <div>
                    {careerCards.length > 0 && (
                      <Accordion type="single" collapsible className="space-y-2">
                        {careerCards.map((card, index) => {
                          const matchBadge = getMatchBadge(card.matchScore || 85);
                          const MatchIcon = matchBadge.icon;
                          
                          return (
                            <AccordionItem 
                              key={index} 
                              value={`career-${index}`}
                              className="border-2 border-black rounded-lg bg-white px-3"
                            >
                              <AccordionTrigger className="hover:no-underline py-3">
                                <div className="flex items-center justify-between w-full mr-3">
                                  <div className="flex items-center space-x-3">
                                    <Briefcase className="w-4 h-4 text-black" />
                                    <div className="text-left">
                                      <h4 className="text-sm font-bold text-black">{card.title}</h4>
                                      <p className="text-xs text-gray-600 line-clamp-1">
                                        {card.description || 'Career pathway discovered from our conversation'}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge className="text-xs bg-gray-100 text-black border border-black ml-2">
                                    <MatchIcon className="w-3 h-3 mr-1" />
                                    {card.matchScore || 85}%
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                              
                              <AccordionContent className="pb-3">
                                <div className="space-y-4 mt-2">
                                  {/* PRIORITY: Role Overview Section */}
                                  {card.roleFundamentals && (
                                    <div className="p-4 bg-template-mint/20 border-2 border-black rounded-xl mb-3">
                                      <div className="flex items-center space-x-2 mb-3">
                                        <Target className="w-4 h-4 text-black" />
                                        <h5 className="text-sm font-black text-black">What You'll Do</h5>
                                      </div>
                                      <p className="text-sm text-black font-medium mb-3 leading-relaxed">{card.roleFundamentals.corePurpose}</p>
                                      {card.roleFundamentals.typicalResponsibilities && (
                                        <div>
                                          <p className="text-sm font-bold text-black mb-2">Daily Responsibilities:</p>
                                          <ul className="text-sm text-black/80 space-y-1 font-medium">
                                            {card.roleFundamentals.typicalResponsibilities.slice(0, 4).map((resp, i) => (
                                              <li key={i} className="flex items-start space-x-2">
                                                <span className="text-template-primary mt-1 font-bold">•</span>
                                                <span>{resp}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Skills & Requirements Section */}
                                  {card.competencyRequirements && (
                                    <div className="p-4 bg-template-lavender/20 border-2 border-black rounded-xl mb-3">
                                      <div className="flex items-center space-x-2 mb-3">
                                        <Wrench className="w-4 h-4 text-black" />
                                        <h5 className="text-sm font-black text-black">Skills You'll Need</h5>
                                      </div>
                                      {card.competencyRequirements.technicalSkills && card.competencyRequirements.technicalSkills.length > 0 && (
                                        <div className="mb-3">
                                          <p className="text-sm font-bold text-black mb-2">Key Skills:</p>
                                          <div className="flex flex-wrap gap-2">
                                            {card.competencyRequirements.technicalSkills.slice(0, 6).map((skill, i) => (
                                              <Badge key={i} className="bg-template-white border-2 border-black text-black font-semibold shadow-[2px_2px_0px_0px_#000000]">
                                                {skill}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {card.competencyRequirements.qualificationPathway && (
                                        <div>
                                          <p className="text-sm font-bold text-black mb-1">Education Path:</p>
                                          <p className="text-sm text-black/80 font-medium">
                                            {card.competencyRequirements.qualificationPathway.degrees?.[0] || 
                                             card.competencyRequirements.qualificationPathway.alternativeRoutes?.[0] ||
                                             "Multiple pathways available"}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Secondary: Financial Info Section (moved to bottom) */}
                                  <div className="p-3 bg-gray-50 border-2 border-gray-300 rounded-xl">
                                    <h5 className="text-sm font-bold text-black mb-2">Financial Overview</h5>
                                    <div className="grid grid-cols-1 gap-2 text-sm">
                                      {(card.salaryRange || card.averageSalary) && (
                                        <div className="flex items-center space-x-2">
                                          <PoundSterling className="w-4 h-4 text-black" />
                                          <span className="text-black font-medium">
                                            {card.salaryRange || formatSalary(card.averageSalary)}
                                          </span>
                                        </div>
                                      )}
                                      {card.growthOutlook && (
                                        <div className="flex items-center space-x-2">
                                          <TrendingUp className="w-4 h-4 text-black" />
                                          <span className="text-black font-medium">{card.growthOutlook}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Additional Role Data Sections */}
                                  {card.roleFundamentals && false && (
                                    <div className="border-t-2 border-gray-200 pt-3">
                                      <div className="flex items-center space-x-2 mb-2">
                                        <Target className="w-3 h-3 text-black" />
                                        <h5 className="text-xs font-bold text-black">Role Fundamentals</h5>
                                      </div>
                                      <p className="text-xs text-gray-800 mb-2">{card.roleFundamentals.corePurpose}</p>
                                      {card.roleFundamentals.typicalResponsibilities && (
                                        <div>
                                          <p className="text-xs font-semibold text-black mb-1">Key Responsibilities:</p>
                                          <ul className="text-xs text-gray-600 space-y-1">
                                            {card.roleFundamentals.typicalResponsibilities.slice(0, 3).map((resp, i) => (
                                              <li key={i} className="flex items-start space-x-1">
                                                <span className="text-black mt-0.5">•</span>
                                                <span>{resp}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {card.competencyRequirements && (
                                    <div className="border-t-2 border-gray-200 pt-3">
                                      <div className="flex items-center space-x-2 mb-2">
                                        <Wrench className="w-3 h-3 text-black" />
                                        <h5 className="text-xs font-bold text-black">Skills & Requirements</h5>
                                      </div>
                                      {card.competencyRequirements.technicalSkills && (
                                        <div className="mb-2">
                                          <p className="text-xs font-semibold text-black mb-1">Technical Skills:</p>
                                          <div className="flex flex-wrap gap-1">
                                            {card.competencyRequirements.technicalSkills.slice(0, 4).map((skill, i) => (
                                              <Badge key={i} variant="outline" className="text-xs border-black text-black">
                                                {skill}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {card.competencyRequirements.qualificationPathway && (
                                        <div>
                                          <p className="text-xs font-semibold text-black mb-1">Education:</p>
                                          <p className="text-xs text-gray-600">
                                            {card.competencyRequirements.qualificationPathway.degrees?.[0] || 
                                             card.competencyRequirements.qualificationPathway.alternativeRoutes?.[0] ||
                                             'Various pathways available'}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {card.compensationRewards && (
                                    <div className="border-t-2 border-gray-200 pt-3">
                                      <div className="flex items-center space-x-2 mb-2">
                                        <DollarSign className="w-3 h-3 text-black" />
                                        <h5 className="text-xs font-bold text-black">Compensation</h5>
                                      </div>
                                      {card.compensationRewards.salaryRange && (
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                          <div>
                                            <p className="font-semibold text-black">Entry Level:</p>
                                            <p className="text-gray-600">£{card.compensationRewards.salaryRange.entry?.toLocaleString()}</p>
                                          </div>
                                          <div>
                                            <p className="font-semibold text-black">Senior Level:</p>
                                            <p className="text-gray-600">£{card.compensationRewards.salaryRange.senior?.toLocaleString()}</p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {card.careerTrajectory && (
                                    <div className="border-t-2 border-gray-200 pt-3">
                                      <div className="flex items-center space-x-2 mb-2">
                                        <TrendingUpIcon className="w-3 h-3 text-black" />
                                        <h5 className="text-xs font-bold text-black">Career Path</h5>
                                      </div>
                                      {card.careerTrajectory.progressionSteps && (
                                        <div className="space-y-1">
                                          {card.careerTrajectory.progressionSteps.slice(0, 3).map((step, i) => (
                                            <div key={i} className="flex justify-between text-xs">
                                              <span className="text-black font-medium">{step.title}</span>
                                              <span className="text-gray-600">{step.timeFrame}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Fallback sections for basic cards */}
                                  {(card.skills || card.nextSteps || card.keyResponsibilities) && !card.roleFundamentals && (
                                    <>
                                      {card.skills && (
                                        <div className="border-t-2 border-gray-200 pt-3">
                                          <div className="flex items-center space-x-2 mb-2">
                                            <Wrench className="w-3 h-3 text-black" />
                                            <h5 className="text-xs font-bold text-black">Key Skills</h5>
                                          </div>
                                          <div className="flex flex-wrap gap-1">
                                            {card.skills.map((skill, i) => (
                                              <Badge key={i} variant="outline" className="text-xs border-black text-black">
                                                {skill}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {card.nextSteps && (
                                        <div className="border-t-2 border-gray-200 pt-3">
                                          <div className="flex items-center space-x-2 mb-2">
                                            <Target className="w-3 h-3 text-black" />
                                            <h5 className="text-xs font-bold text-black">Next Steps</h5>
                                          </div>
                                          <ul className="text-xs text-gray-600 space-y-1">
                                            {card.nextSteps.slice(0, 3).map((step, i) => (
                                              <li key={i} className="flex items-start space-x-1">
                                                <span className="text-black mt-0.5">•</span>
                                                <span>{step}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    )}

                    {/* Original Career Context */}
                    {careerContext && (
                      <div className="border-t-2 border-gray-200 pt-4">
                        <h4 className="text-sm font-bold text-black mb-2">Discussion Focus:</h4>
                        <div className="space-y-2">
                          <h5 className="font-bold text-black">{careerContext.title}</h5>
                          {careerContext.averageSalary && (
                            <p className="text-xs text-gray-600">
                              Salary: {formatSalary(careerContext.averageSalary)}
                            </p>
                          )}
                          {careerContext.growthOutlook && (
                            <p className="text-xs text-gray-600">
                              Growth: {careerContext.growthOutlook}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Discovered Insights Panel */}
                    {(discoveredInsights.interests.length > 0 || 
                      discoveredInsights.goals.length > 0 || 
                      discoveredInsights.skills.length > 0 ||
                      discoveredInsights.personalQualities.length > 0) && (
                      <div className="border-t-2 border-gray-200 pt-4">
                        <h4 className="text-sm font-bold text-black mb-2">Insights from Discussion:</h4>
                        <div className="space-y-3 text-xs">
                          {/* Personal Qualities - Confidence Building Section */}
                          {discoveredInsights.personalQualities.length > 0 && (
                            <div className="bg-white border-2 border-black rounded-lg p-3">
                              <div className="flex items-center space-x-2 mb-2">
                                <Star className="w-4 h-4 text-black" />
                                <span className="font-bold text-black">Your Strengths:</span>
                              </div>
                              <div className="grid grid-cols-1 gap-2">
                                {discoveredInsights.personalQualities.map((quality, idx) => {
                                  // Map qualities to appropriate icons and colors
                                  const getQualityIcon = (quality: string) => {
                                    const lowerQuality = quality.toLowerCase();
                                    if (lowerQuality.includes('innovative') || lowerQuality.includes('creative')) {
                                      return { Icon: Lightbulb, color: 'text-black' };
                                    } else if (lowerQuality.includes('organised') || lowerQuality.includes('organized')) {
                                      return { Icon: CheckCircle2, color: 'text-black' };
                                    } else if (lowerQuality.includes('leader') || lowerQuality.includes('confident')) {
                                      return { Icon: Crown, color: 'text-black' };
                                    } else if (lowerQuality.includes('analytical') || lowerQuality.includes('thoughtful')) {
                                      return { Icon: Target, color: 'text-black' };
                                    } else if (lowerQuality.includes('passionate') || lowerQuality.includes('enthusiastic')) {
                                      return { Icon: Heart, color: 'text-black' };
                                    } else if (lowerQuality.includes('adaptable') || lowerQuality.includes('flexible')) {
                                      return { Icon: Zap, color: 'text-black' };
                                    } else {
                                      return { Icon: Award, color: 'text-black' };
                                    }
                                  };
                                  
                                  const { Icon, color } = getQualityIcon(quality);
                                  
                                  return (
                                    <div key={idx} className="flex items-center space-x-2 bg-gray-50 rounded px-2 py-1">
                                      <Icon className={`w-3 h-3 ${color}`} />
                                      <span className="text-black font-medium">{quality}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="mt-2 text-center">
                                <p className="text-xs text-gray-600 italic">
                                  ✨ These qualities make you unique and valuable in any career path
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {discoveredInsights.interests.length > 0 && (
                            <div>
                              <span className="font-medium text-black">New Interests:</span>
                              <div className="ml-2 text-gray-600">
                                {discoveredInsights.interests.map((interest, idx) => (
                                  <p key={idx}>• {interest}</p>
                                ))}
                              </div>
                            </div>
                          )}
                          {discoveredInsights.goals.length > 0 && (
                            <div>
                              <span className="font-medium text-black">Career Goals:</span>
                              <div className="ml-2 text-gray-600">
                                {discoveredInsights.goals.map((goal, idx) => (
                                  <p key={idx}>• {goal}</p>
                                ))}
                              </div>
                            </div>
                          )}
                          {discoveredInsights.skills.length > 0 && (
                            <div>
                              <span className="font-medium text-black">Skills Mentioned:</span>
                              <div className="ml-2 text-gray-600">
                                {discoveredInsights.skills.map((skill, idx) => (
                                  <p key={idx}>• {skill}</p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    </div>

                    {/* Persona Adaptation Debug Panel (Desktop) */}
                    {personaAdaptationState && (
                      <div className="border-t-2 border-gray-200 pt-4">
                        <h4 className="text-sm font-bold text-black mb-2 flex items-center">
                          <Zap className="w-4 h-4 mr-2 text-purple-600" />
                          Real-Time Persona Adaptation
                        </h4>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
                          <div className="text-xs">
                            <span className="font-medium text-purple-800">Current: </span>
                            <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-300">
                              {personaAdaptationState.currentPersona}
                            </Badge>
                          </div>
                          <div className="text-xs text-purple-700">
                            <span className="font-medium">Confidence: </span>
                            {Math.round(personaAdaptationState.confidence * 100)}%
                          </div>
                          <div className="text-xs text-purple-700">
                            <span className="font-medium">Stage: </span>
                            {personaAdaptationState.conversationStage}
                          </div>
                          {personaChangeEvents.length > 0 && (
                            <div className="text-xs text-purple-600">
                              <span className="font-medium">Changes: </span>
                              {personaChangeEvents.length} adaptation events
                            </div>
                          )}
                          {personaAdaptationState.previousPersona && (
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">Previous: </span>
                              {personaAdaptationState.previousPersona}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Smart Placeholder Text */}
                    {!careerContext && careerCards.length === 0 && (discoveredInsights.interests.length === 0 && discoveredInsights.goals.length === 0 && discoveredInsights.skills.length === 0 && discoveredInsights.personalQualities.length === 0) && (
                      <div className="text-center py-8">
                        <div className="max-w-sm mx-auto">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <User className="w-8 h-8 text-gray-400" />
                          </div>
                          <h4 className="text-base font-bold text-black mb-3">Building Your Career Profile</h4>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            As we chat, I'll build out your profile and discover career ideas tailored specifically for you. 
                            Start the conversation to see your insights appear here!
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                </div>
              </div>

              {/* Voice Conversation Panel - Bottom on mobile, Right on desktop */}
              <div className="flex-1 flex flex-col min-h-0 min-h-[40vh] md:min-h-0 mt-0 md:mt-0">
                <div className="flex-1 h-full">
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
                              ? 'bg-template-primary text-white' 
                              : 'bg-white text-black border-2 border-black'
                          }`}>
                            <div className="flex items-start space-x-2 mb-2">
                              {message.role === 'user' ? (
                                <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              ) : (
                                <Bot className="w-4 h-4 mt-0.5 text-black flex-shrink-0" />
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
                          <div className="bg-gray-100 text-black border-2 border-gray-300 px-4 py-3 rounded-xl max-w-xs">
                            <div className="flex items-center space-x-2">
                              <Volume2 className="w-4 h-4 text-black animate-pulse" />
                              <span className="text-sm">AI is speaking...</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="flex-shrink-0 border-t-2 border-gray-200 p-4">
            <div className="bg-gray-50 rounded-xl p-4 border-2 border-black space-y-4">
              
              {/* Mode Selection - Show when no mode selected */}
              {!communicationMode && (
                <div className="text-center space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-black mb-2">Choose Communication Mode</h3>
                    <p className="text-sm text-gray-600">Select how you'd like to interact with your career assistant</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      onClick={() => handleModeSelection('voice')}
                      disabled={!apiKey}
                      className="bg-template-primary text-white font-black px-8 py-4 rounded-2xl hover:scale-105 transition-all duration-200 min-h-[56px] focus:outline-none focus:ring-4 focus:ring-template-primary/30 shadow-[6px_6px_0px_0px_#000000] hover:shadow-[8px_8px_0px_0px_#000000] border-4 border-black text-lg disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <PhoneCall className="w-6 h-6 mr-3" />
                      Voice Chat
                    </Button>
                    <Button
                      onClick={() => handleModeSelection('text')}
                      className="bg-template-secondary text-black font-black px-8 py-4 rounded-2xl hover:scale-105 transition-all duration-200 min-h-[56px] focus:outline-none focus:ring-4 focus:ring-template-secondary/30 shadow-[6px_6px_0px_0px_#000000] hover:shadow-[8px_8px_0px_0px_#000000] border-4 border-black text-lg"
                    >
                      <MessageSquare className="w-6 h-6 mr-3" />
                      Text Chat
                    </Button>
                  </div>
                  {!apiKey && (
                    <p className="text-xs text-gray-600">
                      Voice chat requires ElevenLabs configuration. Text chat is always available.
                    </p>
                  )}
                </div>
              )}

              {/* Voice Mode Controls */}
              {communicationMode === 'voice' && (
                <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
                  <div className="flex items-center justify-center lg:justify-start space-x-3">
                    {!isConnected ? (
                      <Button
                        onClick={handleStartConversation}
                        disabled={connectionStatus === 'connecting' || !apiKey}
                        aria-label="Start voice chat"
                        className="bg-template-primary text-white font-bold px-8 py-3 rounded-xl hover:scale-105 transition-transform duration-200 text-base min-h-[48px] pointer-coarse:min-h-[56px] focus:outline-none focus:ring-2 focus:ring-template-primary shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] border-2 border-black"
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
                        aria-label="End voice call"
                        className="bg-template-secondary text-black font-bold px-8 py-3 rounded-xl hover:scale-105 transition-transform duration-200 text-base min-h-[48px] pointer-coarse:min-h-[56px] focus:outline-none focus:ring-2 focus:ring-template-secondary border-2 border-black"
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
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Radio className="w-4 h-4" />
                      <span>Voice conversation active</span>
                    </div>
                  )}

                  {(discoveredInsights.interests.length > 0 ||
                    discoveredInsights.goals.length > 0 ||
                    discoveredInsights.skills.length > 0 ||
                    discoveredInsights.personalQualities.length > 0) && (
                    <div className="flex items-center space-x-3">
                      <div className="text-xs text-black">
                        <span className="font-medium">Insights discovered:</span>
                        <span className="ml-2">
                          {discoveredInsights.interests.length + discoveredInsights.goals.length + discoveredInsights.skills.length + discoveredInsights.personalQualities.length} items
                        </span>
                      </div>
                    </div>
                  )}

                  {!apiKey && (
                    <div className="text-xs text-black">
                      Configure ElevenLabs API key to enable voice discussions
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* Text Mode Controls */}
              {communicationMode === 'text' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm text-black">
                      <MessageSquare className="w-4 h-4" />
                      <span className="font-medium">Text Chat Mode</span>
                    </div>
                  </div>
                  
                  <ChatTextInput
                    onSendMessage={sendTextMessage}
                    disabled={false}
                    placeholder="Type your message..."
                    className="w-full"
                    isLoading={isLoading}
                  />
                  
                  <div className="text-center">
                    <p className="text-xs text-gray-600">
                      💬 Text-only conversation - no voice connection needed
                    </p>
                  </div>
                </div>
              )}

              {/* Voice + Text Input for Voice Mode */}
              {communicationMode === 'voice' && (connectionStatus === 'connected' || connectionStatus === 'disconnected') && (
                <div className="w-full">
                  <ChatTextInput
                    onSendMessage={sendTextMessage}
                    disabled={!isConnected}
                    placeholder={isConnected ? "Type a message or use voice..." : "Start voice chat to enable messaging"}
                    className="w-full"
                    isLoading={isLoading}
                  />
                </div>
              )}

              {/* Helper Text for Voice Mode */}
              {communicationMode === 'voice' && isConnected && (
                <div className="text-center">
                  <p className="text-xs text-gray-600">
                    🎙️ Voice chat active - speak or type your messages
                  </p>
                </div>
              )}
            </div>
          </div>
      </DialogContent>
    </Dialog>
  );
};

// Export with React.memo for performance optimization
export const EnhancedChatVoiceModal = React.memo(EnhancedChatVoiceModalComponent, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.careerContext?.title === nextProps.careerContext?.title &&
    prevProps.currentConversationHistory.length === nextProps.currentConversationHistory.length &&
    prevProps.onClose === nextProps.onClose &&
    prevProps.onConversationUpdate === nextProps.onConversationUpdate &&
    prevProps.onCareerCardsDiscovered === nextProps.onCareerCardsDiscovered &&
    prevProps.onConversationEnd === nextProps.onConversationEnd
  );
});