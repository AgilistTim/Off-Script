import React, { useCallback, useEffect, useState } from 'react';
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
  className?: string;
}

export const ElevenLabsWidget: React.FC<ElevenLabsWidgetProps> = ({
  onCareerCardsGenerated,
  onPersonProfileGenerated,
  className = ''
}) => {
  const { currentUser } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  
  // Add throttling to prevent duplicate tool calls
  const [lastAnalysisTime, setLastAnalysisTime] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

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

  // Enhanced conversation analysis with care sector detection
  const analyzeConversationForCareerInsights = useCallback(async (triggerReason: string) => {
    const now = Date.now();
    
    // Reduce throttling time to 2 seconds (was too aggressive at 5 seconds)
    if (now - lastAnalysisTime < 2000 || isAnalyzing) {
      console.log('🚫 Analysis throttled - too recent or already analyzing');
      return 'Analysis in progress...';
    }
    
    setLastAnalysisTime(now);
    setIsAnalyzing(true);
    
    try {
      console.log('🎯 ANALYSIS TRIGGERED:', { 
        triggerReason, 
        historyLength: conversationHistory.length,
        contentLength: conversationHistory.map(m => m.content).join(' ').length 
      });

      // If we have very limited conversation, provide immediate sample cards
      if (conversationHistory.length < 2 || conversationHistory.map(m => m.content).join(' ').length < 20) {
        console.log('🚀 Providing immediate sample career cards for early conversation');
        
        if (onCareerCardsGenerated) {
          const sampleCareerCards = [
            {
              id: "sample-ai-ml",
              title: "AI/Machine Learning Engineer", 
              description: "Build intelligent systems and AI solutions to solve complex real-world problems",
              industry: "Technology",
              averageSalary: {
                entry: "£50,000",
                experienced: "£85,000",
                senior: "£120,000"
              },
              growthOutlook: "Excellent growth prospects - 35% job growth expected",
              entryRequirements: ["Strong programming skills", "Mathematics/statistics background", "Problem-solving mindset"],
              trainingPathways: ["Computer Science Degree", "Machine Learning bootcamps", "Online courses (Coursera, edX)"],
              keySkills: ["Python", "Machine Learning", "Deep Learning", "TensorFlow", "Problem Solving"],
              workEnvironment: "Hybrid/Remote friendly, collaborative tech teams",
              nextSteps: ["Learn Python basics", "Complete ML online course", "Build portfolio projects"],
              location: "UK",
              confidence: 0.92,
              sourceData: "technology interest"
            },
            {
              id: "sample-software-dev",
              title: "Software Developer",
              description: "Create applications and systems that power businesses and solve user problems",
              industry: "Technology", 
              averageSalary: {
                entry: "£35,000",
                experienced: "£55,000",
                senior: "£80,000"
              },
              growthOutlook: "Strong growth - 22% job growth expected",
              entryRequirements: ["Programming skills", "Problem-solving abilities", "Attention to detail"],
              trainingPathways: ["Coding bootcamps", "Computer Science degree", "Self-taught with portfolio"],
              keySkills: ["JavaScript", "React", "Node.js", "Git", "Problem Solving"],
              workEnvironment: "Flexible, often remote-friendly",
              nextSteps: ["Choose a programming language", "Build first project", "Create GitHub portfolio"],
              location: "UK",
              confidence: 0.88,
              sourceData: "technology interest"
            }
          ];
          
          onCareerCardsGenerated(sampleCareerCards);
          return `I've provided ${sampleCareerCards.length} initial career recommendations to get started!`;
        }
        
        return 'Initial career recommendations provided!';
      }
      
      const conversationText = conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');
      
      // Enhanced analysis with care sector keywords
      const careKeywords = ['nursing home', 'care home', 'elderly care', 'grandma', 'grandpa', 'helping others', 'care work', 'healthcare', 'caring for'];
      const hasCareInterest = careKeywords.some(keyword => 
        conversationText.toLowerCase().includes(keyword.toLowerCase())
      );
      
      console.log('🔍 Enhanced analysis:', {
        historyLength: conversationHistory.length,
        contentLength: conversationText.length,
        hasCareInterest,
        triggerReason
      });
      
      const response = await fetch(`${mcpEndpoint}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationHistory: conversationText,
          userId: currentUser?.uid || `guest_${Date.now()}`,
          triggerReason: triggerReason,
          careInterestDetected: hasCareInterest // Flag for MCP server
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
      
      // If care interest detected but no care cards generated, add care sector cards
      if (hasCareInterest && !careerCards.some(card => 
        card.title.toLowerCase().includes('care') || 
        card.title.toLowerCase().includes('health') ||
        card.industry?.toLowerCase().includes('care') ||
        card.industry?.toLowerCase().includes('health')
      )) {
        console.log('🏥 Adding care sector career cards based on detected interest');
        
        const careSectorCards = [
          {
            id: "care-assistant",
            title: "Care Assistant",
            description: "Provide essential support and care to elderly residents in care homes and nursing facilities",
            industry: "Healthcare & Care",
            averageSalary: {
              entry: "£18,000",
              experienced: "£22,000",
              senior: "£26,000"
            },
            growthOutlook: "High demand - aging population driving 15% growth",
            entryRequirements: ["Compassion and empathy", "Good communication skills", "Physical fitness"],
            trainingPathways: ["Care Certificate Level 2", "Health & Social Care diploma", "On-the-job training"],
            keySkills: ["Patient Care", "Communication", "Empathy", "First Aid", "Record Keeping"],
            workEnvironment: "Care homes, nursing homes, community care",
            nextSteps: ["Complete Care Certificate", "Apply for care assistant roles", "Gain first aid certification"],
            location: "UK",
            confidence: 0.89,
            sourceData: "care sector interest detected"
          },
          {
            id: "activities-coordinator",
            title: "Activities Coordinator",
            description: "Plan and organize engaging activities and entertainment for care home residents",
            industry: "Healthcare & Care",
            averageSalary: {
              entry: "£19,000",
              experienced: "£24,000",
              senior: "£28,000"
            },
            growthOutlook: "Growing field focused on quality of life improvements",
            entryRequirements: ["Creativity and organization", "People skills", "Activity planning experience"],
            trainingPathways: ["Activities coordination courses", "Recreation therapy qualification", "Volunteer experience"],
            keySkills: ["Activity Planning", "Creative Arts", "Social Skills", "Event Management", "Wellbeing"],
            workEnvironment: "Care homes, day centers, community programs",
            nextSteps: ["Volunteer at local care homes", "Learn about dementia care", "Develop activity planning skills"],
            location: "UK",
            confidence: 0.87,
            sourceData: "care sector interest detected"
          }
        ];
        
        careerCards = [...careerCards, ...careSectorCards];
      }
      
      if (careerCards.length > 0 && onCareerCardsGenerated) {
        console.log('🎯 Generated comprehensive career recommendations:', careerCards.length);
        onCareerCardsGenerated(careerCards);
        return `I've generated ${careerCards.length} career recommendations including care sector opportunities!`;
      } else {
        return 'Career recommendations will appear as we chat more about your interests!';
      }
      
    } catch (error) {
      console.error('❌ Error in enhanced career analysis:', error);
      return 'Career analysis temporarily unavailable';
    } finally {
      setIsAnalyzing(false);
    }
  }, [conversationHistory, currentUser?.uid, onCareerCardsGenerated, lastAnalysisTime, isAnalyzing]);

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

  // Initialize conversation with forward-declared client tools
  const conversation = useConversation({
    clientTools: (() => {
      // Forward declaration - actual tools defined below
      const tools = {
        analyze_conversation_for_careers: async (parameters: { trigger_reason: string }) => {
          console.log('🚨 TOOL CALLED: analyze_conversation_for_careers - AGENT IS CALLING TOOLS!');
          console.log('🔍 Tool parameters:', parameters);
          console.log('🔍 Getting fresh conversation state for analysis...');
          
          return await analyzeConversationForCareerInsights(parameters.trigger_reason || 'agent_request');
        },

        trigger_instant_insights: async (parameters: { user_message: string }) => {
          console.log('🚨 TOOL CALLED: trigger_instant_insights - AGENT IS CALLING TOOLS!');
          console.log('⚡ Tool parameters:', parameters);
          console.log('⚡ User message content:', parameters.user_message);
          
          // Use the user message directly for immediate analysis
          if (parameters.user_message && onCareerCardsGenerated) {
            try {
              // Trigger immediate analysis based on the user's message
              const analysisContent = `user: ${parameters.user_message}`;
              console.log('🎯 IMMEDIATE ANALYSIS with user message:', analysisContent);
              
              const response = await fetch(`${mcpEndpoint}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  conversationHistory: analysisContent,
                  userId: currentUser?.uid || `guest_${Date.now()}`,
                  triggerReason: 'instant_user_message',
                  immediateMessage: parameters.user_message
                })
              });
              
              if (response.ok) {
                const result = await response.json();
                if (result.careerCards?.length > 0) {
                  console.log('🎯 Generated immediate career cards:', result.careerCards.length);
                  onCareerCardsGenerated(result.careerCards);
                  return `Generated ${result.careerCards.length} career insights from your message!`;
                }
              }
            } catch (error) {
              console.error('❌ Error in immediate analysis:', error);
            }
          }
          
          return await analyzeConversationForCareerInsights('instant_insights');
        },

        generate_career_recommendations: async (parameters: any) => {
          console.log('🚨 TOOL CALLED: generate_career_recommendations - AGENT IS CALLING TOOLS!');
          console.log('🎯 Tool parameters:', parameters);
          
          // Use interests from parameters if available
          if (parameters.interests && parameters.interests.length > 0 && onCareerCardsGenerated) {
            try {
              console.log('🎯 GENERATING CARDS FROM INTERESTS:', parameters.interests);
              
              const interestsText = `User interests: ${parameters.interests.join(', ')}`;
              const response = await fetch(`${mcpEndpoint}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  conversationHistory: interestsText,
                  userId: currentUser?.uid || `guest_${Date.now()}`,
                  triggerReason: 'interest_based_recommendations',
                  interests: parameters.interests
                })
              });
              
              if (response.ok) {
                const result = await response.json();
                if (result.careerCards?.length > 0) {
                  console.log('🎯 Generated interest-based career cards:', result.careerCards.length);
                  onCareerCardsGenerated(result.careerCards);
                  return `Generated ${result.careerCards.length} recommendations based on your interests!`;
                }
              }
            } catch (error) {
              console.error('❌ Error in interest-based analysis:', error);
            }
          }
          
          return await analyzeConversationForCareerInsights('generate_recommendations');
        },

        update_person_profile: async (parameters: { interests?: string[]; goals?: string[]; skills?: string[] }) => {
          console.log('🚨 TOOL CALLED: update_person_profile - AGENT IS CALLING TOOLS!');
          console.log('👤 Updating person profile based on conversation...');
          console.log('👤 Profile parameters:', parameters);
          
          if (onPersonProfileGenerated) {
            try {
              // Use conversation history and parameters to generate detailed profile
              const conversationText = conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');
              
              if (conversationText.length > 20) { // If we have real conversation content
                const response = await fetch(`${mcpEndpoint}/analyze`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    conversationHistory: conversationText,
                    userId: currentUser?.uid || `guest_${Date.now()}`,
                    triggerReason: 'persona_update',
                    generatePersona: true,
                    profileParams: parameters
                  })
                });
                
                if (response.ok) {
                  const result = await response.json();
                  
                  // Generate enhanced profile from analysis
                  const updatedProfile: PersonProfile = {
                    interests: parameters.interests || result.detectedInterests || ["Technology", "Problem Solving", "Innovation"],
                    goals: parameters.goals || result.detectedGoals || ["Career development", "Skill building"],
                    skills: parameters.skills || result.detectedSkills || ["Communication", "Analytical thinking"],
                    values: result.detectedValues || ["Making a difference", "Innovation", "Growth"],
                    careerStage: result.careerStage || "exploring",
                    workStyle: result.workStyle || ["Collaborative", "Flexible"],
                    lastUpdated: new Date().toLocaleDateString()
                  };
                  
                  console.log('🎯 Generated enhanced persona profile:', updatedProfile);
                  onPersonProfileGenerated(updatedProfile);
                  return `I've analyzed our conversation and updated your profile with insights about your interests in ${updatedProfile.interests.join(', ')}!`;
                }
              }
            } catch (error) {
              console.error('❌ Error generating persona from conversation:', error);
            }
            
            // Fallback to basic profile
            const updatedProfile: PersonProfile = {
              interests: parameters.interests || ["Technology", "Problem Solving", "Innovation"],
              goals: parameters.goals || ["Career development", "Skill building"],
              skills: parameters.skills || ["Communication", "Analytical thinking"],
              values: ["Making a difference", "Innovation", "Growth"],
              careerStage: "exploring",
              workStyle: ["Collaborative", "Flexible"],
              lastUpdated: new Date().toLocaleDateString()
            };
            
            onPersonProfileGenerated(updatedProfile);
            return "I've updated your profile based on our conversation!";
          }
          
          return "Profile updated successfully!";
        }
      };
      

        console.log('🔧 Client tools configured:', Object.keys(tools));
        return tools;
    })(),
    onConnect: () => {
      console.log('🟢 ElevenLabs connected');
      setConnectionStatus('connected');
    },
    onDisconnect: () => {
      console.log('🔴 ElevenLabs disconnected');
      setConnectionStatus('disconnected');
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
        console.log('🎯 Fallback agent response parsing:', content.substring(0, 50) + '...');
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

  // Monitor conversation history changes and trigger analysis
  useEffect(() => {
    console.log('🔄 Conversation history updated:', {
      length: conversationHistory.length,
      messages: conversationHistory.map(m => `${m.role}: ${m.content.substring(0, 30)}...`)
    });
    
    if (conversationHistory.length >= 2) {
      const totalContent = conversationHistory.map(m => m.content).join(' ');
      console.log('🔍 Content analysis:', {
        totalLength: totalContent.length,
        threshold: 50, // Reduced threshold
        shouldTrigger: totalContent.length >= 50
      });
      
      if (totalContent.length >= 50) { // MUCH lower threshold
        console.log('🎯 TRIGGERING BACKUP AUTO-ANALYSIS - sufficient content detected');
        
        // Immediate trigger (no delay) since agent isn't calling tools
        console.log('🚀 IMMEDIATE AUTO-TRIGGER: Agent not calling tools, forcing analysis now');
        analyzeConversationForCareerInsights('immediate_auto_trigger');
      }
    } else {
      console.log('⚠️ Not enough conversation history yet:', conversationHistory.length, 'messages');
    }
  }, [conversationHistory.length, conversationHistory, analyzeConversationForCareerInsights]);

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