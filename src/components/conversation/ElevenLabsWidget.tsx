import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import { useAuth } from '../../context/AuthContext';

// Helper function to get environment variables from both sources (dev + production)
const getEnvVar = (key: string): string | undefined => {
  // Try import.meta.env first (development)
  const devValue = import.meta.env[key];
  if (devValue) return devValue;
  
  // Fallback to window.ENV (production runtime injection)
  if (typeof window !== 'undefined' && window.ENV) {
    return window.ENV[key];
  }
  
  return undefined;
};

interface CareerCard {
  id: string;
  title: string;
  description: string;
  salaryRange: string;
  skillsRequired: string[];
  trainingPathway: string;
  nextSteps: string;
  confidence: number;
}

interface PersonProfile {
  interests: string[];
  goals: string[];
  skills: string[];
  values: string[];
  careerStage: string;
  workStyle: string[];
  lastUpdated: string;
}

interface ElevenLabsWidgetProps {
  onCareerCardsGenerated?: (cards: any[]) => void;
  onPersonProfileGenerated?: (profile: PersonProfile) => void;
  onAnalysisStateChange?: (state: { isAnalyzing: boolean; type?: 'career_analysis' | 'profile_update'; progress?: string }) => void;
  className?: string;
}

export const ElevenLabsWidget: React.FC<ElevenLabsWidgetProps> = ({
  onCareerCardsGenerated,
  onPersonProfileGenerated,
  onAnalysisStateChange,
  className = ''
}) => {
  const { currentUser } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  
  const [isConnected, setIsConnected] = useState<boolean>(false);
  
  // Use ref to access current conversation history in tool closures
  const conversationHistoryRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  
  // Update ref whenever state changes
  useEffect(() => {
    conversationHistoryRef.current = conversationHistory;
  }, [conversationHistory]);

  // Use the helper function to get environment variables
  const agentId = getEnvVar('VITE_ELEVENLABS_AGENT_ID');
  const apiKey = getEnvVar('VITE_ELEVENLABS_API_KEY');
  const mcpEndpoint = 'https://off-script-mcp-elevenlabs.onrender.com/mcp';

  // Helper function to update conversation history and persist to Firebase
  const updateConversationHistory = useCallback((role: 'user' | 'assistant', content: string) => {
    if (!content || content.trim().length === 0) {
      console.log('⚠️ Empty content, skipping history update');
      return;
    }

    setConversationHistory(prev => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage?.role === role && lastMessage?.content === content.trim()) {
        console.log('⚠️ Skipping duplicate message:', role, content.substring(0, 30) + '...');
        return prev; // Skip duplicate
      }
      
      const updated = [...prev, { role, content: content.trim() }];
      console.log(`✅ Added ${role} message. New history length:`, updated.length);
      
      // TODO: Persist to Firebase for user's conversation history
      if (currentUser?.uid) {
        console.log('📝 TODO: Save conversation to Firebase for user:', currentUser.uid);
        // Future implementation:
        // await saveConversationToFirebase(currentUser.uid, { 
        //   role, 
        //   content: content.trim(), 
        //   timestamp: new Date(),
        //   conversationId: conversation?.getConversationId?.() || 'unknown'
        // });
      }
      
      return updated;
    });
  }, [currentUser?.uid]);

  // Removed generateLocalCareerCards - using OpenAI analysis only
  // If OpenAI fails, we show error rather than confusing with hardcoded data

  // Profile extraction from OpenAI analysis only - no hardcoded fallbacks
  const extractProfileFromConversation = (conversationText: string): PersonProfile => {
    // Return empty profile - rely on OpenAI/MCP for real analysis
    return {
      interests: [],
      goals: [],
      skills: [],
      values: [],
      careerStage: "exploring",
      workStyle: [],
      lastUpdated: new Date().toLocaleDateString()
    };
  };

  // Enhanced conversation analysis with care sector detection
  const analyzeConversationForCareerInsights = useCallback(async (triggerReason: string) => {
    // Use ref to get current conversation history (fixes closure issue)
    const currentHistory = conversationHistoryRef.current;
    
    // Allow analysis with cached conversation data even when disconnected
    if (!isConnected && currentHistory.length === 0) {
      console.log('🚫 Analysis blocked - No conversation history available');
      return 'Please start a conversation first to generate career insights';
    }
    
    if (!isConnected) {
      console.log('🔄 Analysis proceeding with cached conversation data (ElevenLabs disconnected)');
    }
    
    // Start loading state
    onAnalysisStateChange?.({ isAnalyzing: true, type: 'career_analysis', progress: 'Analyzing your conversation...' });
    
    try {
      console.log('🎯 ANALYSIS TRIGGERED:', { 
        triggerReason, 
        historyLength: currentHistory.length,
        contentLength: currentHistory.map(m => m.content).join(' ').length 
      });

      // Filter out any messages with empty content before sending to MCP
      const validMessages = currentHistory.filter(msg => 
        msg.content && typeof msg.content === 'string' && msg.content.trim().length > 0
      );

      console.log('🔍 Conversation analysis in progress...', {
        originalLength: currentHistory.length,
        validMessagesLength: validMessages.length,
        filteredOut: currentHistory.length - validMessages.length,
        contentLength: validMessages.map(m => m.content).join(' ').length
      });
      
      const conversationText = validMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
      
      // Enhanced analysis with care sector keywords
      const careKeywords = ['nursing home', 'care home', 'elderly care', 'grandma', 'grandpa', 'helping others', 'care work', 'healthcare', 'caring for'];
      const hasCareInterest = careKeywords.some(keyword => 
        conversationText.toLowerCase().includes(keyword.toLowerCase())
      );
      
      console.log('🔍 Enhanced analysis:', {
        historyLength: validMessages.length,
        contentLength: conversationText.length,
        hasCareInterest,
        triggerReason
      });
      
      // Create enhanced context for better MCP analysis - send as message array
      const enhancedContext = {
        conversationHistory: validMessages, // Send as array instead of string
        analysisRequest: {
          extractGoals: "Extract career goals, aspirations, and what the user wants to achieve professionally. Look for phrases about wanting fulfilling work, work-life balance, financial goals, impact goals.",
          extractSkills: "Extract both mentioned skills (like physics, maths, problem-solving) and implied skills from activities and interests. Include academic subjects, hobbies, and demonstrated abilities.",
          extractValues: "Extract what matters to the user in work and life. Look for mentions of helping others, conservation, teamwork, avoiding certain environments (like military), work preferences.",
          extractInterests: "Extract specific interests, subjects, activities, and areas of curiosity mentioned by the user.",
          careerPreferences: "Note preferences about work environment, team vs individual work, specific sectors of interest or avoidance."
        },
        conversationSummary: {
          totalMessages: validMessages.length,
          userMessages: validMessages.filter(m => m.role === 'user').length,
          keyTopics: triggerReason,
          careInterestDetected: hasCareInterest
        }
      };
      
      const response = await fetch(`${mcpEndpoint}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...enhancedContext,
          userId: currentUser?.uid || `guest_${Date.now()}`,
          triggerReason: triggerReason,
          careInterestDetected: hasCareInterest
        }),
      });

      if (!response.ok) {
        console.error('❌ MCP request failed:', response.status, response.statusText);
        return 'Career analysis temporarily unavailable';
      }

      const result = await response.json();
      console.log('✅ Enhanced MCP Analysis result:', result);
      
      const analysisData = result.analysis || result;
      let careerCards = analysisData.careerCards || [];
      
      // Generate user profile automatically when analyzing conversation (only if we have meaningful data)
      if (validMessages.length >= 2 && onPersonProfileGenerated) {
        try {
          const profileData = analysisData.userProfile || {};
          
          // More comprehensive check for real data - check if we have substantial content
          const mcpInterests = analysisData.detectedInterests || [];
          const mcpSkills = analysisData.detectedSkills || [];
          const mcpGoals = analysisData.detectedGoals || [];
          const mcpValues = analysisData.detectedValues || [];
          
          const hasRealData = mcpInterests.length > 0 || mcpSkills.length > 0 || mcpGoals.length > 0;
          
          // Filter career titles from MCP interests (OpenAI sometimes categorizes careers as interests)
          const careerTitleKeywords = ['engineer', 'developer', 'manager', 'analyst', 'specialist', 'consultant', 'architect', 'scientist', 'technician', 'director', 'coordinator'];
          const filteredMcpInterests = mcpInterests.filter(interest => 
            !careerTitleKeywords.some(keyword => interest.toLowerCase().includes(keyword))
          );
          
          // Debug logging to understand MCP categorization issues
          if (mcpInterests.length > 0) {
            console.log('🔍 MCP Analysis Debug:', {
              originalInterests: mcpInterests,
              filteredInterests: filteredMcpInterests,
              removedCareerTitles: mcpInterests.filter(interest => 
                careerTitleKeywords.some(keyword => interest.toLowerCase().includes(keyword))
              ),
              skills: mcpSkills,
              goals: mcpGoals
            });
          }
          
          if (hasRealData && (filteredMcpInterests.length + mcpSkills.length + mcpGoals.length + mcpValues.length) >= 2) {
            // OpenAI has provided substantial data, use it
            const autoProfile: PersonProfile = {
              interests: filteredMcpInterests,
              goals: mcpGoals,
              skills: mcpSkills,
              values: mcpValues,
              careerStage: profileData.careerStage || analysisData.careerStage || "exploring",
              workStyle: profileData.workStyle || analysisData.workStyle || [],
              lastUpdated: new Date().toLocaleDateString()
            };
            
            console.log('👤 Generated user profile from OpenAI analysis:', autoProfile);
            onPersonProfileGenerated(autoProfile);
          } else {
            // OpenAI analysis was insufficient - log but don't generate fake profile
            console.log('⚠️ OpenAI analysis insufficient for profile generation:', {
              hasRealData,
              totalDataPoints: filteredMcpInterests.length + mcpSkills.length + mcpGoals.length + mcpValues.length,
              threshold: 2,
              message: 'User profile not generated - need more conversation data'
            });
          }
        } catch (error) {
          console.error('❌ Error auto-generating profile:', error);
        }
      }
      
      // Career cards generation - OpenAI analysis only
      if (careerCards.length > 0) {
        console.log('🎯 Generated career recommendations:', {
          total: careerCards.length,
          source: 'openai_analysis'
        });
        onCareerCardsGenerated(careerCards);
      } else {
        console.log('⚠️ OpenAI analysis did not generate career cards');
        return 'Career analysis could not generate recommendations from our conversation. Please share more about your interests and experiences.';
      }
      
      // Return specific career titles so the agent can reference them accurately
      const cardTitles = careerCards.map(card => card.title).join(', ');
      
      // Complete loading state
      onAnalysisStateChange?.({ isAnalyzing: false });
      
      return `I've generated ${careerCards.length} career recommendations: ${cardTitles}. You can reference these specific careers in our conversation.`;
      
    } catch (error) {
      console.error('❌ Error in enhanced career analysis:', error);
      
      // Complete loading state on error
      onAnalysisStateChange?.({ isAnalyzing: false });
      
      return 'Career analysis temporarily unavailable';
    }
  }, [isConnected, currentUser?.uid, onCareerCardsGenerated, onAnalysisStateChange]); // Removed conversationHistory dependency since using ref

  // Validate configuration on mount
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 ElevenLabs config check:', {
        hasAgentId: !!agentId,
        hasApiKey: !!apiKey,
        user: currentUser ? 'logged in' : 'guest'
      });
    }
  }, [agentId, apiKey, currentUser]);

  // Initialize conversation with client tools that ElevenLabs calls
  const conversation = useConversation({
    clientTools: {
      analyze_conversation_for_careers: async (parameters: { trigger_reason: string }) => {
        console.log('🚨 TOOL CALLED: analyze_conversation_for_careers - AGENT IS CALLING TOOLS!');
        console.log('🔍 Tool parameters:', parameters);
        
        const result = await analyzeConversationForCareerInsights(parameters.trigger_reason || 'agent_request');
        return result;
      },

      update_person_profile: async (parameters: { interests?: string[]; goals?: string[]; skills?: string[] }) => {
        console.log('🚨 TOOL CALLED: update_person_profile - AGENT IS CALLING TOOLS!');
        console.log('👤 Updating person profile based on conversation...');
        console.log('👤 Profile parameters:', parameters);
        
        // Start loading state for profile update
        onAnalysisStateChange?.({ isAnalyzing: true, type: 'profile_update', progress: 'Updating your profile...' });
        
        if (onPersonProfileGenerated) {
          try {
            // Use conversation history and parameters to generate detailed profile
            const validMessages = conversationHistoryRef.current.filter(msg => 
              msg.content && typeof msg.content === 'string' && msg.content.trim().length > 0
            );
            const conversationText = validMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
            
            if (conversationText.length > 20) { // If we have real conversation content
              const response = await fetch(`${mcpEndpoint}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  conversationHistory: validMessages, // Send as array
                  userId: currentUser?.uid || `guest_${Date.now()}`,
                  triggerReason: 'persona_update',
                  generatePersona: true,
                  profileParams: parameters
                })
              });
              
              if (response.ok) {
                const result = await response.json();
                
                // Helper function to normalize data to arrays
                const normalizeToArray = (data: any): string[] => {
                  if (Array.isArray(data)) return data;
                  if (typeof data === 'string') {
                    // Split by comma, semicolon, or newline and clean up
                    return data.split(/[,;\n]/).map(item => item.trim()).filter(item => item.length > 0);
                  }
                  return [];
                };
                
                // Generate enhanced profile from analysis with proper data types
                const updatedProfile: PersonProfile = {
                  interests: normalizeToArray(parameters.interests || result.detectedInterests) || ["Technology", "Problem Solving", "Innovation"],
                  goals: normalizeToArray(parameters.goals || result.detectedGoals) || ["Career development", "Skill building"],
                  skills: normalizeToArray(parameters.skills || result.detectedSkills) || ["Communication", "Analytical thinking"],
                  values: normalizeToArray(result.detectedValues) || ["Making a difference", "Innovation", "Growth"],
                  careerStage: result.careerStage || "exploring",
                  workStyle: normalizeToArray(result.workStyle) || ["Collaborative", "Flexible"],
                  lastUpdated: new Date().toLocaleDateString()
                };
                
                console.log('🎯 Generated enhanced persona profile:', updatedProfile);
                onPersonProfileGenerated(updatedProfile);
                
                // Complete loading state
                onAnalysisStateChange?.({ isAnalyzing: false });
                
                return `I've analyzed our conversation and updated your profile with insights about your interests in ${updatedProfile.interests.join(', ')}!`;
              }
            }
          } catch (error) {
            console.error('❌ Error generating persona from conversation:', error);
            
            // Complete loading state on error
            onAnalysisStateChange?.({ isAnalyzing: false });
          }
          
          // Fallback to basic profile
          const updatedProfile: PersonProfile = {
            interests: Array.isArray(parameters.interests) ? parameters.interests : ["Technology", "Problem Solving", "Innovation"],
            goals: Array.isArray(parameters.goals) ? parameters.goals : ["Career development", "Skill building"],
            skills: Array.isArray(parameters.skills) ? parameters.skills : ["Communication", "Analytical thinking"],
            values: ["Making a difference", "Innovation", "Growth"],
            careerStage: "exploring",
            workStyle: ["Collaborative", "Flexible"],
            lastUpdated: new Date().toLocaleDateString()
          };
          
          onPersonProfileGenerated(updatedProfile);
          
          // Complete loading state
          onAnalysisStateChange?.({ isAnalyzing: false });
          
          return "I've updated your profile based on our conversation!";
        }
        
        // Complete loading state for simple update
        onAnalysisStateChange?.({ isAnalyzing: false });
        
        return "Profile updated successfully!";
      }
    },
    onConnect: () => {
      console.log('🟢 ElevenLabs connected');
      setConnectionStatus('connected');
      setIsConnected(true);
    },
    onDisconnect: () => {
      console.log('🔴 ElevenLabs disconnected');
      setConnectionStatus('disconnected');
      setIsConnected(false);
      
      // Note: We deliberately preserve conversation history, career cards, and profile data
      // when disconnecting to maintain user's progress and insights
      console.log('💾 Preserving conversation data and generated insights after disconnect');
    },
    onMessage: (message: any) => {
      console.log('📦 Raw message received:', message);
      
      // Handle agent_response events with proper structure
      if (message && typeof message === 'object' && message.type === 'agent_response') {
        if (message.agent_response_event && message.agent_response_event.agent_response) {
          const { agent_response } = message.agent_response_event;
          console.log('🎯 Agent response from structured event:', agent_response);
          updateConversationHistory('assistant', agent_response);
          return;
        }
      }
      
      // Fallback to existing parsing for compatibility
      let content: string | null = null;
      let role: 'user' | 'assistant' = 'assistant';
      
      if (typeof message === 'string') {
        content = message;
      } else if (message && typeof message === 'object') {
        if (message.text) {
          content = message.text;
        } else if (message.content) {
          content = message.content;
        } else if (message.message) {
          content = message.message;
        }
        
        if (message.role) {
          role = message.role;
        } else if (message.source) {
          role = message.source === 'user' ? 'user' : 'assistant';
        }
      }
      
      if (content && typeof content === 'string' && content.trim().length > 0) {
        console.log('🎯 Agent response:', content.substring(0, 50) + '...');
        updateConversationHistory(role, content);
      } else {
        console.log('⚠️ Could not parse message content:', message);
      }
    },
    onError: (error) => {
      console.error('❌ ElevenLabs error:', error);
    },
    onUserTranscriptReceived: (transcript: string | any) => {
      console.log('📝 Raw transcript received:', transcript);
      
      let userTranscript: string | null = null;
      
      // Handle structured user_transcript events
      if (transcript && typeof transcript === 'object' && transcript.type === 'user_transcript') {
        if (transcript.user_transcription_event && transcript.user_transcription_event.user_transcript) {
          userTranscript = transcript.user_transcription_event.user_transcript;
          console.log('🎯 User transcript from structured event:', userTranscript);
        }
      } 
      // Handle direct string transcripts (fallback)
      else if (typeof transcript === 'string') {
        userTranscript = transcript;
        console.log('🎯 User transcript from string:', userTranscript);
      }
      
      if (userTranscript && userTranscript.trim().length > 0) {
        updateConversationHistory('user', userTranscript);
      } else {
        console.log('⚠️ Could not extract transcript content:', transcript);
      }
    },
    onStatusChange: (status: string) => {
      console.log('🔄 Status:', status);
    },
    onModeChange: (mode: string) => {
      console.log('🎯 Mode:', mode);
    }
  });

  // Monitor conversation state for UI updates
  useEffect(() => {
    // Only log important state changes in development
    if (process.env.NODE_ENV === 'development' && conversation?.status) {
      console.log('📊 Conversation status:', conversation.status);
    }
  }, [conversation?.status]);

  // Remove the polling mechanism - we're now using real-time WebSocket events!
  // The onUserTranscriptReceived and onMessage handlers above handle the real-time data

  // Backup analysis removed - ElevenLabs agent tools now handle career analysis automatically
  useEffect(() => {
    console.log('🔄 Conversation history updated:', {
      length: conversationHistory.length,
      messages: conversationHistory.map(m => `${m.role}: ${m.content.substring(0, 30)}...`)
    });
  }, [conversationHistory.length, conversationHistory]);

  // Client tools that call our MCP server
  // Note: These are now handled by the conversation clientTools above to prevent duplicates
  
  const startConversation = useCallback(async () => {
    console.log('🚀 Starting ElevenLabs conversation...');

    if (!agentId || !apiKey) {
      console.error('❌ Missing ElevenLabs configuration:', { agentId: !!agentId, apiKey: !!apiKey });
      return;
    }

    if (!conversation || !conversation.startSession) {
      console.error('❌ Conversation object not available or missing startSession method');
      return;
    }

    try {
      setConnectionStatus('connecting');
      
      const result = await conversation.startSession({
        agentId
      });
      
      console.log('✅ Conversation started successfully:', result);
      
    } catch (error) {
      console.error('❌ Failed to start conversation:', error);
      setConnectionStatus('disconnected');
    }
  }, [conversation, agentId, apiKey]);

  const endConversation = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch (error) {
      console.error('Failed to end conversation:', error);
    }
  }, [conversation]);

  // Configuration check
  const isConfigured = agentId && apiKey && 
    agentId !== 'your_elevenlabs_agent_id_here' && 
    apiKey !== 'your_elevenlabs_api_key_here';

  if (!isConfigured) {
    return (
      <div className={`p-6 border-2 border-dashed border-gray-300 rounded-lg text-center ${className}`}>
        <div className="text-gray-500">
          <p className="text-lg font-medium">ElevenLabs Configuration Required</p>
          <p className="text-sm mt-2">Please configure VITE_ELEVENLABS_AGENT_ID and VITE_ELEVENLABS_API_KEY</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center space-y-4 p-6 ${className}`}>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">AI Career Guide</h3>
        <p className="text-gray-600 text-sm">
          Voice-first career guidance with real-time insights
        </p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        {connectionStatus === 'disconnected' && (
          <button
            onClick={startConversation}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            🎙️ Start Conversation
          </button>
        )}

        {connectionStatus === 'connecting' && (
          <div className="flex items-center space-x-2 text-blue-600">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
            <span>Connecting...</span>
          </div>
        )}

        {connectionStatus === 'connected' && (
          <div className="flex flex-col items-center space-y-3">
            <div className="flex items-center space-x-2 text-green-600">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-medium">Connected - Speak naturally!</span>
            </div>
            
            <button
              onClick={endConversation}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
            >
              End Conversation
            </button>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 max-w-md text-center">
        <p>✨ Career cards will appear automatically as you discuss your interests</p>
        <p>🔍 Analysis happens every few messages to generate personalized recommendations</p>
      </div>
    </div>
  );
}; 