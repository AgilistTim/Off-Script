import React, { useState, useEffect, useRef } from 'react';
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
import OnboardingProgress, { type OnboardingStage } from '../ui/onboarding-progress';
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
import { careerPathwayService } from '../../services/careerPathwayService';
import { lightweightCareerSuggestionService } from '../../services/lightweightCareerSuggestionService';
import environmentConfig from '../../config/environment';
import { ChatTextInput } from './ChatTextInput';




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

export const EnhancedChatVoiceModal: React.FC<EnhancedChatVoiceModalProps> = ({
  isOpen,
  onClose,
  careerContext,
  currentConversationHistory = [],
  onConversationUpdate,
  onCareerCardsDiscovered,
  onConversationEnd
}) => {
  const { currentUser, userData } = useAuth();

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

  // Determine agent based on user auth state and context
  const getAgentId = (): string => {
    const agentId = environmentConfig.elevenLabs.agentId;
    if (!agentId) {
      console.error('Missing VITE_ELEVENLABS_AGENT_ID environment variable');
      throw new Error('ElevenLabs agent ID not configured');
    }
    
    if (!currentUser) {
      // Guest user - use unified career-aware agent
      return agentId;
    }
    
    if (careerContext && careerContext.title) {
      // Authenticated user with career context - use same agent with career context injection
      return agentId;
    }
    
    // Authenticated user without specific career context - use same agent with user context injection
    return agentId;
  };

  const agentId = getAgentId();
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
  const clientTools = {
      analyze_conversation_for_careers: async (parameters: { trigger_reason: string }) => {
        console.log('🚨 TOOL CALLED: analyze_conversation_for_careers - Enhanced modal with progress tracking!');
        console.log('🔍 Tool parameters:', parameters);
        
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
              const currentAgentId = getAgentId();
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

      update_person_profile: async (parameters: { interests?: string[] | string; goals?: string[] | string; skills?: string[] | string; personalQualities?: string[] | string; [key: string]: any }) => {
        console.log('🚨 TOOL CALLED: update_person_profile - Enhanced modal agent calling tools!');
        console.log('👤 Updating person profile based on conversation...');
        console.log('👤 Profile parameters:', parameters);
        
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
              name: parameters.name || null,
              interests: newInsights.interests,
              goals: newInsights.goals,
              skills: newInsights.skills,
              values: newInsights.personalQualities, // Map personalQualities to values
              workStyle: parseInsights(parameters.workStyle),
              careerStage: parameters.careerStage || 'exploring',
              lastUpdated: new Date().toISOString()
            };

            guestSessionService.updatePersonProfile(profileData);
            console.log('💾 Profile saved to guest session for migration:', profileData);
          }

          console.log('✅ Profile insights updated:', newInsights);
          return "Profile insights updated successfully based on conversation";

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

          // **THIS IS THE ACTUAL FIX**: Call the MCP analysis service with correct parameters
          const analysisResult = await progressAwareMCPService.analyzeConversationWithProgress(
            conversationHistory,  // Use conversation history directly (already in correct format)
            effectiveTriggerReason,
            currentUser?.uid || 'guest', // userId
            (update: MCPProgressUpdate) => {
              console.log('📊 Career analysis progress from tool:', update);
            }, // onProgress callback
            false, // enablePerplexityEnhancement
            (result: any) => {
              // Inline completion handler to avoid scoping issues
              console.log('🎉 Career analysis completed from generate_career_recommendations tool:', result);
              if (onCareerCardsDiscovered && result.success) {
                const careerCards = result.enhancedCareerCards || result.basicCareerCards || [];
                onCareerCardsDiscovered(careerCards);
              }
            } // onCompletion callback
          );
          
          // Return acknowledgment that analysis is starting (not fake completion)
          return "Perfect! I'm analyzing our conversation to create personalized career cards for you. This will take about 30-40 seconds...";
          
        } catch (error) {
          console.error('❌ Error in generate_career_recommendations tool:', error);
          return "I'm having trouble accessing the career analysis system right now. Could you tell me more about your interests while I try again?";
        }
      },
    };

  // Initialize conversation (only when environment config is ready)
  const conversation = useConversation({
    agentId: agentId || '', // Fallback to empty string when config not ready
    // Remove firstMessage override to prevent WebSocket connection issues
    clientTools,
    onConnect: () => {
      if (conversationInitialized.current) {
        console.log('⚠️ Conversation already initialized, skipping duplicate connection');
        return;
      }
      
      console.log(`🎙️ Connected to enhanced chat voice assistant (Agent: ${agentId})`);
      conversationInitialized.current = true;
      setIsConnected(true);
      setConnectionStatus('connected');
      setIsLoading(false); // Reset loading state on successful connection
      
      // Let the agent use its default greeting to avoid connection issues
      // Custom greetings will be handled by the agent's prompt configuration
    },
    onDisconnect: () => {
      console.log('📞 Disconnected from enhanced chat voice assistant');
      conversationInitialized.current = false;
      setIsConnected(false);
      setConnectionStatus('disconnected');
      setIsSpeaking(false);
      setIsLoading(false);
      
      // Call onConversationEnd callback with career cards data
      if (onConversationEnd) {
        const currentCards = careerCardsRef.current;
        const hasGeneratedData = currentCards.length > 0;
        console.log('🎯 Calling onConversationEnd:', { hasGeneratedData, careerCardCount: currentCards.length });
        console.log('🔍 onConversationEnd callback type:', typeof onConversationEnd);
        console.log('🔍 About to call onConversationEnd with args:', hasGeneratedData, currentCards.length);
        console.log('🔍 onConversationEnd function name:', onConversationEnd.name);
        onConversationEnd(hasGeneratedData, currentCards.length);
        console.log('✅ onConversationEnd called successfully');
      } else {
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
  });

  // Auto-scroll to bottom of conversation - Enhanced reliability for both mobile and desktop
  useEffect(() => {
    const scrollToBottom = () => {
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
    };

    scrollToBottom();
  }, [conversationHistory, isSpeaking]);

  // Additional scroll trigger specifically for new messages
  useEffect(() => {
    if (conversationHistory.length > 0) {
      const timer = setTimeout(() => {
        // Scroll both containers
        [mobileScrollAreaRef, scrollAreaRef].forEach(ref => {
          if (ref.current) {
            const scrollContainer = ref.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
              scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
          }
        });
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [conversationHistory.length]);

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
        conversation.endSession().catch(console.error);
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
                agentId,
                userId: currentUser?.uid,
                connectionType: 'webrtc',
                overrides
              });
            } else {
              console.log('🎙️ No overrides found, starting basic career session');
              await conversation.startSession({
                agentId,
                userId: currentUser?.uid,
                connectionType: 'webrtc'
              });
            }
          } else {
            console.log('🎙️ No active career sessions, starting basic session');
            await conversation.startSession({
              agentId,
              userId: currentUser?.uid,
              connectionType: 'webrtc'
            });
          }
        } catch (error) {
          console.warn('⚠️ Error getting career overrides, falling back to basic session:', error);
          await conversation.startSession({
            agentId,
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
          const personaOptions = await personaOnboardingService.getPersonaAwareConversationOptions(agentId);
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
          agentId,
          userId: currentUser?.uid,
          firstMessage: overrides?.agent?.firstMessage
        });

        // Start session with overrides for general chat
        await conversation.startSession({
          agentId,
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
          await conversation.startSession({ agentId, connectionType: 'webrtc' });
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

  // Handle text-only conversation start
  const handleStartTextOnlyConversation = async () => {
    if (!conversation || !conversation.startSession) {
      console.error('❌ Conversation object not available for text-only mode');
      return;
    }

    setIsLoading(true);
    setConnectionStatus('connecting');

    try {
      console.log('🔧 Starting text-only conversation session...');
      
      // Use dedicated text-only agent instead of applying overrides
      const textOnlyAgentId = import.meta.env.VITE_ELEVENLABS_TEXT_AGENT_ID;
      
      if (!textOnlyAgentId) {
        throw new Error('Text-only agent ID not configured. Please set VITE_ELEVENLABS_TEXT_AGENT_ID in .env');
      }
      
      console.log('🎭 Using dedicated text-only agent:', textOnlyAgentId);
      
      // Get appropriate overrides based on context (but without textOnly since agent is pre-configured)
      let overrides: any | undefined;
      
      if (careerContext && careerContext.title) {
        console.log('✅ Career context provided - using career-aware overrides');
        
        try {
          // Import and check for active career session overrides
          const { careerAwareVoiceService } = await import('../../services/careerAwareVoiceService');
          const activeSessions = careerAwareVoiceService.getActiveSessions(currentUser?.uid || '');
          
          if (activeSessions.length > 0) {
            const activeSessionId = activeSessions[0].sessionId;
            overrides = careerAwareVoiceService.getConversationOverrides(activeSessionId);
            console.log('🎙️ Using existing career conversation overrides');
          }
        } catch (error) {
          console.warn('⚠️ Error getting career overrides:', error);
        }
      } else {
        console.log('🔧 No career context - building general conversation overrides...');
        const contextService = new UnifiedVoiceContextService();

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
          
          // Get persona-aware conversation options
          const personaOptions = await personaOnboardingService.getPersonaAwareConversationOptions(textOnlyAgentId);
          overrides = personaOptions.overrides;
          
          console.log('🧠 Text mode persona-aware guest conversation initialized:', {
            preservedExisting: hasExistingConversation
          });
        } else {
          console.log('👤 Authenticated user - building authenticated overrides');
          overrides = await contextService.createAuthenticatedOverrides(currentUser.uid);
        }
      }

      console.log('🔍 DEBUG: Text-only conversation setup:', {
        textOnlyAgentId,
        hasOverrides: !!overrides,
        userId: currentUser?.uid
      });

      // Start session with dedicated text-only agent (no textOnly override needed)
      await conversation.startSession({
        agentId: textOnlyAgentId,
        userId: currentUser?.uid,
        overrides: overrides
      });
      
      console.log('✅ Text-only conversation started successfully with dedicated agent');
    } catch (error) {
      console.error('❌ Failed to start text-only conversation:', error);
      
      // Fallback to basic text-only session
      try {
        console.log('🔄 Attempting fallback text-only session...');
        await conversation.startSession({ 
          agentId, 
          overrides: {
            conversation: {
              textOnly: true
            }
          }
        });
        console.log('✅ Fallback text-only conversation started');
      } catch (fallbackError) {
        console.error('❌ Fallback text-only conversation start also failed:', fallbackError);
        setConnectionStatus('disconnected');
        setIsLoading(false);
      }
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
      
      // Handle text-only mode using dedicated ElevenLabs text-only agent
      if (communicationMode === 'text') {
        console.log('📱 Text-only mode: Using dedicated ElevenLabs text-only agent');
        
        // Start text-only conversation session if not already connected
        if (conversation && connectionStatus !== 'connected') {
          try {
            console.log('🔧 Starting text-only conversation session...');
            await handleStartTextOnlyConversation();
          } catch (error) {
            console.error('❌ Failed to start text-only conversation session:', error);
          }
        }
        
        // Send message using ElevenLabs conversation hook (text-only mode)
        if (conversation && conversation.sendUserMessage && connectionStatus === 'connected') {
          try {
            console.log('📤 Sending message via ElevenLabs text-only conversation:', messageText);
            await conversation.sendUserMessage(messageText);
            console.log('✅ Text message sent successfully via ElevenLabs text-only mode');
          } catch (error) {
            console.error('❌ Failed to send text message via ElevenLabs:', error);
            
            // Fallback: Add a basic response
            const fallbackMessage: ConversationMessage = {
              role: 'assistant',
              content: "I'm here to help you explore your career options. Could you tell me more about your interests?",
              timestamp: new Date()
            };
            
            setConversationHistory(prev => [...prev, fallbackMessage]);
          }
        } else {
          console.warn('⚠️ Text-only conversation not ready. Status:', {
            hasConversation: !!conversation,
            hasSendUserMessage: !!(conversation && conversation.sendUserMessage),
            connectionStatus,
            isConnected
          });
          
          // Fallback: Add a basic response  
          const fallbackMessage: ConversationMessage = {
            role: 'assistant',
            content: "Let me help you discover career opportunities. What interests you most about your future career?",
            timestamp: new Date()
          };
            
          setConversationHistory(prev => {
            const updated = [...prev, fallbackMessage];
            conversationHistoryRef.current = updated;
            
            // Save AI message to guest session
            if (!currentUser) {
              try {
                guestSessionService.addConversationMessage(fallbackMessage.role, fallbackMessage.content);
              } catch (error) {
                console.error('❌ Failed to save AI message to guest session:', error);
              }
            }
            
            return updated;
          });
        }
      } else {
        // Voice mode - just log that message was added
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

  // Generate immediate AI response for text-only mode
  const generateImmediateResponse = (userMessage: string, messageCount: number): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    // First message responses
    if (messageCount <= 1) {
      const firstResponses = [
        "Hello! I'm your AI career advisor. I'm here to help you explore career paths that align with your interests, skills, and goals. What would you like to know about your career options?",
        "Hi there! Thanks for reaching out. I specialize in helping people discover career paths that suit them. What's on your mind about your career journey?",
        "Welcome! I'm excited to help you explore your career possibilities. Whether you're just starting out or looking for a change, I can provide personalized guidance. What career topics interest you most?",
        "Great to meet you! I'm here to provide personalized career guidance based on your unique interests and goals. What would you like to discuss about your career path?"
      ];
      
      if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
        return firstResponses[Math.floor(Math.random() * firstResponses.length)];
      }
    }
    
    // Interest/passion responses
    if (lowerMessage.includes('interest') || lowerMessage.includes('passionate') || lowerMessage.includes('love') || lowerMessage.includes('enjoy')) {
      return "That's wonderful! Your interests and passions are key to finding a fulfilling career. I'm analyzing what you've shared to identify careers that align with what energizes you. Tell me more about what specifically excites you about this area.";
    }
    
    // Skills responses
    if (lowerMessage.includes('skill') || lowerMessage.includes('good at') || lowerMessage.includes('talent')) {
      return "Excellent! Understanding your skills is crucial for career planning. I'm processing your strengths to match them with suitable career paths. What other skills do you feel confident about, or what skills would you like to develop?";
    }
    
    // Goals/ambition responses  
    if (lowerMessage.includes('goal') || lowerMessage.includes('want to') || lowerMessage.includes('hope to') || lowerMessage.includes('dream')) {
      return "Your goals and aspirations are important guides for your career journey. I'm analyzing how your ambitions can translate into specific career opportunities. What timeline are you thinking about for achieving these goals?";
    }
    
    // Work environment responses
    if (lowerMessage.includes('environment') || lowerMessage.includes('workplace') || lowerMessage.includes('team') || lowerMessage.includes('remote') || lowerMessage.includes('office')) {
      return "Work environment preferences are really important for job satisfaction! I'm taking note of your preferences to suggest careers that offer the kind of workplace culture you're looking for. What other aspects of a work environment matter to you?";
    }
    
    // Default encouraging responses
    const defaultResponses = [
      "I can see you're thinking about your career path - that's great! I'm analyzing what you've shared to identify opportunities that might be a good fit. What other aspects of your career are you curious about?",
      "Thanks for sharing that with me. Every detail helps me understand what kind of career environment would suit you best. I'm working on finding some personalized recommendations. What else would you like to explore?",
      "That's valuable information! I'm processing your preferences to find career matches that align with your interests and goals. Is there anything specific about your ideal career that you'd like to discuss?",
      "I appreciate you sharing your thoughts. This helps me build a better picture of what you're looking for in a career. I'm analyzing this to provide you with tailored suggestions. What questions do you have about different career paths?"
    ];
    
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  };

  // Handle mode selection
  const handleModeSelection = (mode: CommunicationMode) => {
    console.log(`🎯 Communication mode selected: ${mode}`);
    setCommunicationMode(mode);
    
    if (mode === 'voice') {
      // Start voice conversation automatically
      handleStartConversation();
    }
    // Text mode doesn't need connection setup
  };

  // Reset mode selection while preserving conversation history
  const handleResetMode = () => {
    console.log('🔄 Switching communication mode while preserving context');
    
    // Preserve current conversation history before switching
    const currentHistory = [...conversationHistory];
    console.log('💾 Preserving conversation history:', {
      messageCount: currentHistory.length,
      hasMessages: currentHistory.length > 0
    });
    
    setCommunicationMode(null);
    
    // End voice session if active, but keep the conversation history
    if (isConnected || connectionStatus === 'connecting') {
      console.log('🔄 Ending voice session but preserving context');
      handleEndConversation();
      
      // Restore conversation history after a brief delay to allow cleanup
      setTimeout(() => {
        console.log('🔄 Restoring conversation history after mode switch');
        setConversationHistory(currentHistory);
        conversationHistoryRef.current = currentHistory;
      }, 100);
    }
  };

  // Format timestamp for display
  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get agent display info
  const getAgentInfo = () => {
    // Dynamic agent info based on current configuration
    const currentAgentId = environmentConfig.elevenLabs.agentId;
    
    switch (agentId) {
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

  const agentInfo = getAgentInfo();


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

  if (!isOpen) return null;



  // Handle missing environment config
      if (!apiKey || !agentId) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-5xl h-[80dvh] bg-white p-6 border-2 border-black shadow-card">
          <DialogHeader>
            <DialogTitle className="sr-only">Configuration Error</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center space-y-4 text-center">
              <AlertTriangle className="h-8 w-8 text-black" />
              <h3 className="text-lg font-bold text-black">Configuration Missing</h3>
              <p className="text-black">ElevenLabs configuration is not available. Please check your environment setup.</p>
              <Button onClick={onClose} variant="outline" className="border-black text-black hover:bg-template-primary hover:text-white min-h-[44px]">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  console.log('🎭 EnhancedChatVoiceModal: Rendering modal (isOpen=true)');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="md:max-w-7xl md:w-[95vw] md:h-[85vh] w-screen max-w-none h-[100dvh] p-0 bg-white border-2 border-black [&>button]:hidden z-[120] grid grid-rows-[auto_1fr_auto]"
        aria-describedby="enhanced-chat-description"
      >
          {/* Fixed Header */}
          <DialogHeader className="border-b-2 border-black pb-4 px-4 pt-4 md:px-6 flex-shrink-0">
            <div id="enhanced-chat-description" className="sr-only">
              Enhanced voice chat interface for career guidance and conversation analysis
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-template-primary rounded-button flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-black">
                    {agentInfo.name}
                  </DialogTitle>
                  <p className="text-gray-600 text-sm">
                    {agentInfo.description}
                  </p>
                </div>
              </div>
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-black"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>

          {/* Onboarding Progress Bar - Only show for guest users during onboarding */}
          {!currentUser && currentOnboardingStage !== 'complete' && (
            <div className="px-4 md:px-6 pt-4 border-b border-gray-200 pb-4">
              <OnboardingProgress 
                currentStage={currentOnboardingStage}
                extractedData={extractedProfileData}
                className="w-full"
              />
            </div>
          )}

          {/* Flexible Content Area */}
          <div className="min-h-0 h-full overflow-hidden px-2 md:px-4 pt-2">
            {/* Mobile Layout: Stacked */}
            <div className="flex flex-col h-full md:hidden">
              {/* Mobile: Collapsible Career Insights */}
              <div className="flex-shrink-0 border-b-2 border-gray-200">
                <Collapsible defaultOpen={careerCards.length > 0 || discoveredInsights.interests.length > 0 || discoveredInsights.goals.length > 0 || discoveredInsights.skills.length > 0 || discoveredInsights.personalQualities.length > 0}>
                  <CollapsibleTrigger className="w-full p-4 flex justify-between items-center hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-template-primary rounded-lg flex items-center justify-center relative">
                        <Briefcase className="w-4 h-4 text-white" />
                        {(careerCards.length > 0 || discoveredInsights.interests.length > 0 || discoveredInsights.goals.length > 0 || discoveredInsights.skills.length > 0 || discoveredInsights.personalQualities.length > 0) && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-template-accent rounded-full animate-pulse border border-white" />
                        )}
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-lg font-bold text-black">
                          Career Insights
                        </span>
                        {(careerCards.length > 0 || discoveredInsights.interests.length > 0 || discoveredInsights.goals.length > 0 || discoveredInsights.skills.length > 0 || discoveredInsights.personalQualities.length > 0) && (
                          <span className="text-xs text-black font-medium">
                            {careerCards.length} careers • {discoveredInsights.interests.length + discoveredInsights.goals.length + discoveredInsights.skills.length + discoveredInsights.personalQualities.length} profile details
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronDown className="h-5 w-5 text-gray-600 transition-transform ui-open:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 pb-4">
                    {/* New Content Notification */}
                    {newContentAdded && (
                      <div className="mb-3 p-2 bg-white text-black rounded-lg border-2 border-black text-center text-sm font-medium animate-pulse">
                        ✨ {newContentAdded}
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
                              <div key={index} className="border-2 border-black rounded-lg bg-white p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <Briefcase className="w-4 h-4 text-black" />
                                    <h4 className="text-sm font-bold text-black">{card.title}</h4>
                                  </div>
                                  <Badge className="text-xs bg-gray-100 text-black border border-black">
                                    <MatchIcon className="w-3 h-3 mr-1" />
                                    {card.matchScore || 85}%
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-600 mb-2">
                                  {card.description || 'Career pathway discovered from our conversation'}
                                </p>
                                {(card.salaryRange || card.averageSalary || card.growthOutlook) && (
                                  <div className="flex items-center space-x-4 text-xs">
                                    {(card.salaryRange || card.averageSalary) && (
                                      <div className="flex items-center space-x-1">
                                        <PoundSterling className="w-3 h-3 text-black" />
                                        <span className="text-black">
                                          {card.salaryRange || formatSalary(card.averageSalary)}
                                        </span>
                                      </div>
                                    )}
                                    {card.growthOutlook && (
                                      <div className="flex items-center space-x-1">
                                        <TrendingUp className="w-3 h-3 text-black" />
                                        <span className="text-black">{card.growthOutlook}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
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
                                  {/* Basic Info Section */}
                                  <div className="grid grid-cols-2 gap-3 text-xs">
                                    {(card.salaryRange || card.averageSalary) && (
                                      <div className="flex items-center space-x-1">
                                        <PoundSterling className="w-3 h-3 text-black" />
                                        <span className="text-black">
                                          {card.salaryRange || formatSalary(card.averageSalary)}
                                        </span>
                                      </div>
                                    )}
                                    {card.growthOutlook && (
                                      <div className="flex items-center space-x-1">
                                        <TrendingUp className="w-3 h-3 text-black" />
                                        <span className="text-black">{card.growthOutlook}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Comprehensive Career Data Sections */}
                                  {card.roleFundamentals && (
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
                      className="bg-template-primary text-white font-bold px-6 py-3 rounded-xl hover:scale-105 transition-transform duration-200 min-h-[48px] focus:outline-none focus:ring-2 focus:ring-template-primary shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] border-2 border-black"
                    >
                      <PhoneCall className="w-5 h-5 mr-2" />
                      Voice Chat
                    </Button>
                    <Button
                      onClick={() => handleModeSelection('text')}
                      className="bg-template-secondary text-black font-bold px-6 py-3 rounded-xl hover:scale-105 transition-transform duration-200 min-h-[48px] focus:outline-none focus:ring-2 focus:ring-template-secondary shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] border-2 border-black"
                    >
                      <MessageSquare className="w-5 h-5 mr-2" />
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
                    <Button
                      onClick={handleResetMode}
                      variant="outline"
                      size="sm"
                      className="border-black text-black hover:bg-gray-100"
                    >
                      Switch Mode
                    </Button>
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
                    <Button
                      onClick={handleResetMode}
                      variant="outline"
                      size="sm"
                      className="border-black text-black hover:bg-gray-100"
                    >
                      Switch Mode
                    </Button>
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