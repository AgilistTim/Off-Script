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
  ChevronDown,
  Target,
  Wrench,
  DollarSign,
  TrendingUp as TrendingUpIcon,
  BarChart3,
  Building2,
  Clock,
  AlertTriangle,
  Heart,
  Shield,
  Lightbulb,
  Star,
  CheckCircle2,
  Zap,
  Award,
  Smile,
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
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import { useAuth } from '../../context/AuthContext';
import { agentContextService } from '../../services/agentContextService';
import { mcpQueueService } from '../../services/mcpQueueService';
import { progressAwareMCPService, MCPProgressUpdate } from '../../services/progressAwareMCPService';
import { UnifiedVoiceContextService } from '../../services/unifiedVoiceContextService';
import { guestSessionService } from '../../services/guestSessionService';
import { careerPathwayService } from '../../services/careerPathwayService';
import { lightweightCareerSuggestionService } from '../../services/lightweightCareerSuggestionService';
import environmentConfig from '../../config/environment';




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
  const [savingInsights, setSavingInsights] = useState(false);
  const [insightsSaved, setInsightsSaved] = useState(false);
  const [discoveredInsights, setDiscoveredInsights] = useState<{
    interests: string[];
    goals: string[];
    skills: string[];
    personalQualities: string[];
  }>({ interests: [], goals: [], skills: [], personalQualities: [] });
  const [careerCards, setCareerCards] = useState<any[]>([]);
  const [ctaBottomOffsetPx, setCtaBottomOffsetPx] = useState<number>(0);
  
  // Progress tracking for career analysis
  const [progressUpdate, setProgressUpdate] = useState<MCPProgressUpdate | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const conversationInitialized = useRef<boolean>(false);
  
  // Ref to always access current conversation history (avoids stale closure)
  const conversationHistoryRef = useRef<ConversationMessage[]>([]);
  
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

  // Initialize conversation (only when environment config is ready)
  const conversation = useConversation({
    agentId: agentId || '', // Fallback to empty string when config not ready
    // Remove firstMessage override to prevent WebSocket connection issues
    clientTools: {
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
          setDiscoveredInsights(prev => ({
            interests: [...new Set([...prev.interests, ...newInsights.interests])],
            goals: [...new Set([...prev.goals, ...newInsights.goals])],
            skills: [...new Set([...prev.skills, ...newInsights.skills])],
            personalQualities: [...new Set([...prev.personalQualities, ...newInsights.personalQualities])]
          }));

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
    },
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
            guestSessionService.addConversationMessage(newMessage.role, newMessage.content);
            const guestSession = guestSessionService.getGuestSession();
            console.log('💾 [GUEST FLOW] Saved message to guest session for migration:', {
              messageRole: newMessage.role,
              messagePreview: newMessage.content.substring(0, 50) + '...',
              totalMessages: guestSession.conversationHistory.length,
              sessionId: guestSession.sessionId
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
      
      // If we have a careerContext, careerAwareVoiceService should have already loaded context
      // Follow the same pattern as CareerVoiceDiscussionModal - don't use overrides
      if (careerContext && careerContext.title) {
        console.log('✅ Career context provided - careerAwareVoiceService should have loaded context');
        console.log('🎙️ Starting voice conversation - context already loaded by careerAwareVoiceService');
        
        // Don't use overrides - let the existing career context work (same as CareerVoiceDiscussionModal)
        await conversation.startSession({
          agentId,
          userId: currentUser?.uid,
          connectionType: 'webrtc'
        });
      } else {
        console.log('🔧 No career context - building conversation overrides for general chat...');
        const contextService = new UnifiedVoiceContextService();
        let overrides: any | undefined;

        if (!currentUser) {
          console.log('👤 Guest user - building guest overrides');
          overrides = await contextService.createGuestOverrides();
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
    if (score >= 75) return { color: 'bg-gradient-to-r from-primary-lavender to-primary-peach text-primary-black', icon: Sparkles };
    return { color: 'bg-gradient-to-r from-primary-white to-primary-mint/50 text-primary-black', icon: Briefcase };
  };

  if (!isOpen) return null;



  // Handle missing environment config
      if (!apiKey || !agentId) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-5xl h-[80dvh] bg-gradient-to-br from-primary-white via-primary-mint/10 to-primary-white p-6 border-primary-green/30 shadow-[0_0_50px_rgba(129,240,140,0.3)]">
          <DialogHeader>
            <DialogTitle className="sr-only">Configuration Error</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center space-y-4 text-center">
              <AlertTriangle className="h-8 w-8 text-primary-peach" />
              <h3 className="text-lg font-bold text-neon-pink">Configuration Missing</h3>
              <p className="text-primary-white">ElevenLabs configuration is not available. Please check your environment setup.</p>
              <Button onClick={onClose} variant="outline" className="border-electric-blue text-electric-blue hover:bg-electric-blue/10 min-h-[44px]">
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
        className="md:max-w-7xl md:w-[95vw] md:h-[85vh] w-screen max-w-none h-[100dvh] p-0 bg-gradient-to-br from-primary-white to-primary-mint/20 border border-primary-green/30 [&>button]:hidden z-[120] grid grid-rows-[auto_1fr_auto]"
        aria-describedby="enhanced-chat-description"
      >
          {/* Fixed Header */}
          <DialogHeader className="border-b border-electric-blue/20 pb-4 px-4 pt-4 md:px-6 flex-shrink-0">
            <div id="enhanced-chat-description" className="sr-only">
              Enhanced voice chat interface for career guidance and conversation analysis
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-electric-blue to-neon-pink rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-primary-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black text-primary-black">
                    {agentInfo.name}
                  </DialogTitle>
                  <p className="text-primary-white/70 text-sm">
                    {agentInfo.description}
                  </p>
                </div>
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
          </DialogHeader>

          {/* Flexible Content Area */}
          <div className="min-h-0 h-full overflow-hidden px-2 md:px-4 pt-2">
            <div className="flex flex-col md:flex-row md:space-x-4 h-full">
              {/* Career Insights Panel - Top on mobile, Left on desktop */}
              <div className="block w-full md:w-64 lg:w-72 xl:w-80 flex-shrink-0 md:h-full">
                {/* Mobile: Fixed height container with scroll */}
                <div className="h-48 md:h-full overflow-hidden">
                <Card className="bg-gradient-to-br from-primary-mint/20 to-primary-lavender/10 border border-primary-green/30 h-full flex flex-col overflow-hidden min-h-[300px]">
                  <CardHeader className="pb-3 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-black text-primary-black">
                        CAREER INSIGHTS
                      </CardTitle>
                      {careerCards.length > 0 && (
                        <Badge className="bg-gradient-to-r from-primary-green to-primary-yellow text-primary-black font-bold">
                          <Sparkles className="w-3 h-3 mr-1" />
                          {careerCards.length} FOUND
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 overflow-y-auto flex-1 min-h-0 relative h-full">
                    {/* Progress Indicator - Fixed container to prevent jiggling */}
                    <div className="min-h-[120px] mb-4 flex flex-col justify-start">
                      {isAnalyzing && progressUpdate && (
                        <div className="bg-primary-mint/20 rounded-lg p-3 border border-primary-green/30">
                        <div className="flex items-center space-x-2 mb-2">
                          <Loader2 className="w-4 h-4 animate-spin text-primary-green" />
                          <span className="text-sm font-medium text-primary-green">Analyzing Career Path</span>
                        </div>
                        <div className="text-xs text-primary-black/80 mb-2">
                          {progressUpdate.message || 'Processing your conversation...'}
                        </div>
                        <div className="w-full bg-primary-white/20 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-primary-green to-primary-yellow h-2 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progressUpdate.progress || 0}%` }}
                          />
                        </div>
                        <div className="text-xs text-primary-black/60 mt-1 text-center">
                          {progressUpdate.progress || 0}% complete
                        </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Discovered Career Cards - Fixed container to prevent layout shift */}
                    <div className="min-h-[200px]">
                    {careerCards.length > 0 && (
                      <Accordion type="single" collapsible className="space-y-2">
                        {careerCards.map((card, index) => {
                          const matchBadge = getMatchBadge(card.matchScore || 85);
                          const MatchIcon = matchBadge.icon;
                          
                          return (
                            <AccordionItem 
                              key={index} 
                              value={`career-${index}`}
                              className="border border-primary-green/30 rounded-lg bg-primary-white/95 px-3"
                            >
                              <AccordionTrigger className="hover:no-underline py-3">
                                <div className="flex items-center justify-between w-full mr-3">
                                  <div className="flex items-center space-x-3">
                                    <Briefcase className="w-4 h-4 text-primary-green" />
                                    <div className="text-left">
                                      <h4 className="text-sm font-bold text-primary-black">{card.title}</h4>
                                      <p className="text-xs text-primary-black/70 line-clamp-1">
                                        {card.description || 'Career pathway discovered from our conversation'}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge className={`text-xs ${matchBadge.color} ml-2`}>
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
                                        <PoundSterling className="w-3 h-3 text-primary-green" />
                                        <span className="text-primary-black">
                                          {card.salaryRange || formatSalary(card.averageSalary)}
                                        </span>
                                      </div>
                                    )}
                                    {card.growthOutlook && (
                                      <div className="flex items-center space-x-1">
                                        <TrendingUp className="w-3 h-3 text-primary-peach" />
                                        <span className="text-primary-black">{card.growthOutlook}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Comprehensive Career Data Sections */}
                                  {card.roleFundamentals && (
                                    <div className="border-t border-electric-blue/20 pt-3">
                                      <div className="flex items-center space-x-2 mb-2">
                                        <Target className="w-3 h-3 text-neon-pink" />
                                        <h5 className="text-xs font-bold text-neon-pink">Role Fundamentals</h5>
                                      </div>
                                      <p className="text-xs text-primary-white/80 mb-2">{card.roleFundamentals.corePurpose}</p>
                                      {card.roleFundamentals.typicalResponsibilities && (
                                        <div>
                                          <p className="text-xs font-semibold text-primary-white mb-1">Key Responsibilities:</p>
                                          <ul className="text-xs text-primary-white/70 space-y-1">
                                            {card.roleFundamentals.typicalResponsibilities.slice(0, 3).map((resp, i) => (
                                              <li key={i} className="flex items-start space-x-1">
                                                <span className="text-acid-green mt-0.5">•</span>
                                                <span>{resp}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {card.competencyRequirements && (
                                    <div className="border-t border-electric-blue/20 pt-3">
                                      <div className="flex items-center space-x-2 mb-2">
                                        <Wrench className="w-3 h-3 text-acid-green" />
                                        <h5 className="text-xs font-bold text-acid-green">Skills & Requirements</h5>
                                      </div>
                                      {card.competencyRequirements.technicalSkills && (
                                        <div className="mb-2">
                                          <p className="text-xs font-semibold text-primary-white mb-1">Technical Skills:</p>
                                          <div className="flex flex-wrap gap-1">
                                            {card.competencyRequirements.technicalSkills.slice(0, 4).map((skill, i) => (
                                              <Badge key={i} variant="outline" className="text-xs border-acid-green/30 text-acid-green">
                                                {skill}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {card.competencyRequirements.qualificationPathway && (
                                        <div>
                                          <p className="text-xs font-semibold text-primary-white mb-1">Education:</p>
                                          <p className="text-xs text-primary-white/70">
                                            {card.competencyRequirements.qualificationPathway.degrees?.[0] || 
                                             card.competencyRequirements.qualificationPathway.alternativeRoutes?.[0] ||
                                             'Various pathways available'}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {card.compensationRewards && (
                                    <div className="border-t border-electric-blue/20 pt-3">
                                      <div className="flex items-center space-x-2 mb-2">
                                        <DollarSign className="w-3 h-3 text-acid-green" />
                                        <h5 className="text-xs font-bold text-acid-green">Compensation</h5>
                                      </div>
                                      {card.compensationRewards.salaryRange && (
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                          <div>
                                            <p className="font-semibold text-primary-white">Entry Level:</p>
                                            <p className="text-primary-white/70">£{card.compensationRewards.salaryRange.entry?.toLocaleString()}</p>
                                          </div>
                                          <div>
                                            <p className="font-semibold text-primary-white">Senior Level:</p>
                                            <p className="text-primary-white/70">£{card.compensationRewards.salaryRange.senior?.toLocaleString()}</p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {card.careerTrajectory && (
                                    <div className="border-t border-electric-blue/20 pt-3">
                                      <div className="flex items-center space-x-2 mb-2">
                                        <TrendingUpIcon className="w-3 h-3 text-electric-blue" />
                                        <h5 className="text-xs font-bold text-electric-blue">Career Path</h5>
                                      </div>
                                      {card.careerTrajectory.progressionSteps && (
                                        <div className="space-y-1">
                                          {card.careerTrajectory.progressionSteps.slice(0, 3).map((step, i) => (
                                            <div key={i} className="flex justify-between text-xs">
                                              <span className="text-primary-white font-medium">{step.title}</span>
                                              <span className="text-primary-white/70">{step.timeFrame}</span>
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
                                        <div className="border-t border-electric-blue/20 pt-3">
                                          <div className="flex items-center space-x-2 mb-2">
                                            <Wrench className="w-3 h-3 text-acid-green" />
                                            <h5 className="text-xs font-bold text-acid-green">Key Skills</h5>
                                          </div>
                                          <div className="flex flex-wrap gap-1">
                                            {card.skills.map((skill, i) => (
                                              <Badge key={i} variant="outline" className="text-xs border-acid-green/30 text-acid-green">
                                                {skill}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {card.nextSteps && (
                                        <div className="border-t border-electric-blue/20 pt-3">
                                          <div className="flex items-center space-x-2 mb-2">
                                            <Target className="w-3 h-3 text-neon-pink" />
                                            <h5 className="text-xs font-bold text-neon-pink">Next Steps</h5>
                                          </div>
                                          <ul className="text-xs text-primary-white/70 space-y-1">
                                            {card.nextSteps.slice(0, 3).map((step, i) => (
                                              <li key={i} className="flex items-start space-x-1">
                                                <span className="text-acid-green mt-0.5">•</span>
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
                      discoveredInsights.skills.length > 0 ||
                      discoveredInsights.personalQualities.length > 0) && (
                      <div className="border-t border-electric-blue/20 pt-4">
                        <h4 className="text-sm font-bold text-acid-green mb-2">Insights from Discussion:</h4>
                        <div className="space-y-3 text-xs">
                          {/* Personal Qualities - Confidence Building Section */}
                          {discoveredInsights.personalQualities.length > 0 && (
                            <div className="bg-gradient-to-r from-acid-green/10 to-neon-pink/10 border border-acid-green/30 rounded-lg p-3">
                              <div className="flex items-center space-x-2 mb-2">
                                <Star className="w-4 h-4 text-cyber-yellow" />
                                <span className="font-bold text-cyber-yellow">Your Strengths:</span>
                              </div>
                              <div className="grid grid-cols-1 gap-2">
                                {discoveredInsights.personalQualities.map((quality, idx) => {
                                  // Map qualities to appropriate icons and colors
                                  const getQualityIcon = (quality: string) => {
                                    const lowerQuality = quality.toLowerCase();
                                    if (lowerQuality.includes('innovative') || lowerQuality.includes('creative')) {
                                      return { Icon: Lightbulb, color: 'text-cyber-yellow' };
                                    } else if (lowerQuality.includes('organised') || lowerQuality.includes('organized')) {
                                      return { Icon: CheckCircle2, color: 'text-acid-green' };
                                    } else if (lowerQuality.includes('leader') || lowerQuality.includes('confident')) {
                                      return { Icon: Crown, color: 'text-neon-pink' };
                                    } else if (lowerQuality.includes('analytical') || lowerQuality.includes('thoughtful')) {
                                      return { Icon: Target, color: 'text-electric-blue' };
                                    } else if (lowerQuality.includes('passionate') || lowerQuality.includes('enthusiastic')) {
                                      return { Icon: Heart, color: 'text-neon-pink' };
                                    } else if (lowerQuality.includes('adaptable') || lowerQuality.includes('flexible')) {
                                      return { Icon: Zap, color: 'text-cyber-yellow' };
                                    } else {
                                      return { Icon: Award, color: 'text-acid-green' };
                                    }
                                  };
                                  
                                  const { Icon, color } = getQualityIcon(quality);
                                  
                                  return (
                                    <div key={idx} className="flex items-center space-x-2 bg-primary-white/5 rounded px-2 py-1">
                                      <Icon className={`w-3 h-3 ${color}`} />
                                      <span className="text-primary-white font-medium">{quality}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="mt-2 text-center">
                                <p className="text-xs text-primary-white/80 italic">
                                  ✨ These qualities make you unique and valuable in any career path
                                </p>
                              </div>
                            </div>
                          )}
                          
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
                    </div>

                    {/* Discussion Topics - Fixed height container to prevent wiggling */}
                    <div className="min-h-[140px]">
                      {!careerContext && careerCards.length === 0 && (
                        <div>
                          <h4 className="text-sm font-bold text-primary-peach mb-2">What you can explore:</h4>
                          <div className="space-y-1 text-xs text-primary-black/70">
                            <p>• Career interests and goals</p>
                            <p>• Skills and training paths</p>
                            <p>• Industry trends and outlook</p>
                            <p>• Work-life balance expectations</p>
                            <p>• Educational requirements</p>
                            <p>• Career progression paths</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                </div>
              </div>

              {/* Voice Conversation Panel - Bottom on mobile, Right on desktop */}
              <div className="flex-1 flex flex-col min-h-0 mt-4 md:mt-0">
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
                              ? 'bg-gradient-to-r from-primary-green to-primary-mint text-primary-black' 
                              : 'bg-gradient-to-r from-primary-lavender/80 to-primary-peach/80 text-primary-black border border-primary-green/20'
                          }`}>
                            <div className="flex items-start space-x-2 mb-2">
                              {message.role === 'user' ? (
                                <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              ) : (
                                <Bot className="w-4 h-4 mt-0.5 text-primary-green flex-shrink-0" />
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
              </div>
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="flex-shrink-0 border-t border-primary-green/20 p-4">
            <div className="bg-gradient-to-r from-primary-white/90 to-primary-mint/30 rounded-xl p-4 border border-primary-green/20 backdrop-blur">
              <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
                <div className="flex items-center justify-center lg:justify-start">
                  {!isConnected ? (
                    <Button
                      onClick={handleStartConversation}
                      disabled={connectionStatus === 'connecting' || !apiKey}
                      aria-label="Start voice chat"
                      className="bg-gradient-to-r from-primary-green to-primary-yellow text-primary-black font-bold px-8 py-3 rounded-xl hover:scale-105 transition-transform duration-200 text-base min-h-[48px] pointer-coarse:min-h-[56px] focus:outline-none focus:ring-2 focus:ring-primary-yellow/70 shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] border-2 border-primary-black"
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
                      className="bg-gradient-to-r from-neon-pink to-sunset-orange text-primary-white font-bold px-8 py-3 rounded-xl hover:scale-105 transition-transform duration-200 text-base min-h-[48px] pointer-coarse:min-h-[56px] focus:outline-none focus:ring-2 focus:ring-neon-pink/70"
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

                  {(discoveredInsights.interests.length > 0 ||
                    discoveredInsights.goals.length > 0 ||
                    discoveredInsights.skills.length > 0 ||
                    discoveredInsights.personalQualities.length > 0) && (
                    <div className="flex items-center space-x-3">
                      <div className="text-xs text-electric-blue">
                        <span className="font-medium">Insights discovered:</span>
                        <span className="ml-2">
                          {discoveredInsights.interests.length + discoveredInsights.goals.length + discoveredInsights.skills.length + discoveredInsights.personalQualities.length} items
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
      </DialogContent>
    </Dialog>
  );
};