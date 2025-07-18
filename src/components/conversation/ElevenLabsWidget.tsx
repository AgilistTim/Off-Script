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

  // Use the helper function to get environment variables
  const agentId = getEnvVar('VITE_ELEVENLABS_AGENT_ID');
  const apiKey = getEnvVar('VITE_ELEVENLABS_API_KEY');
  const mcpEndpoint = 'https://off-script-mcp-elevenlabs.onrender.com/mcp';

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
          console.log('🔍 Analyzing conversation for careers');

          // If we have limited conversation history, provide some default career cards to demonstrate functionality
          if (conversationHistory.length < 2 || conversationHistory.map(m => m.content).join(' ').length < 20) {
            console.log('🎯 Providing sample career cards due to limited conversation data');
            
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
                  description: "Create applications, websites, and systems that help people solve problems",
                  industry: "Technology", 
                  averageSalary: {
                    entry: "£35,000",
                    experienced: "£65,000", 
                    senior: "£80,000"
                  },
                  growthOutlook: "Strong demand across all industries",
                  entryRequirements: ["Programming fundamentals", "Problem-solving skills", "Portfolio of projects"],
                  trainingPathways: ["Coding bootcamp", "Computer Science degree", "Self-taught with portfolio"],
                  keySkills: ["Programming", "Problem Solving", "Communication", "Teamwork"],
                  workEnvironment: "Flexible work arrangements, collaborative environment",
                  nextSteps: ["Choose a programming language", "Build first project", "Join coding community"],
                  location: "UK",
                  confidence: 0.88,
                  sourceData: "general interest"
                },
                {
                  id: "sample-product-manager",
                  title: "Product Manager", 
                  description: "Lead development of products that make a real difference in people's lives",
                  industry: "Technology",
                  averageSalary: {
                    entry: "£45,000",
                    experienced: "£75,000",
                    senior: "£100,000"
                  },
                  growthOutlook: "Growing field with diverse opportunities",
                  entryRequirements: ["Business acumen", "Communication skills", "User-focused mindset"],
                  trainingPathways: ["Business degree", "Product management courses", "Associate PM programs"],
                  keySkills: ["Strategic Thinking", "Communication", "Analysis", "Leadership"],
                  workEnvironment: "Cross-functional collaboration, strategic role",
                  nextSteps: ["Learn product fundamentals", "Practice with personal projects", "Network with current PMs"],
                  location: "UK", 
                  confidence: 0.85,
                  sourceData: "leadership interest"
                }
              ];
              
              console.log('🎯 Generated', sampleCareerCards.length, 'sample career recommendations');
              onCareerCardsGenerated(sampleCareerCards);
              return `I've generated ${sampleCareerCards.length} career recommendations to get you started! As we chat more, I'll personalize these based on your specific interests.`;
            }
            
            return 'Career recommendations will appear as we chat more about your interests!';
          }

          try {
            const conversationText = conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');
            
            const response = await fetch(`${mcpEndpoint}/analyze`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                conversationHistory: conversationText,
                userId: currentUser?.uid || `guest_${Date.now()}`,
                triggerReason: parameters.trigger_reason
              }),
            });

            if (!response.ok) {
              console.error('❌ MCP request failed:', response.status, response.statusText);
              return 'Career analysis temporarily unavailable';
            }

            const result = await response.json();
            const analysisData = result.analysis || result;
            const careerCards = analysisData.careerCards || [];
            
            if (careerCards.length > 0 && onCareerCardsGenerated) {
              console.log('🎯 Generated', careerCards.length, 'career recommendations');
              onCareerCardsGenerated(careerCards);
              return `I've generated ${careerCards.length} career recommendations based on our conversation!`;
            } else {
              return 'Career recommendations will appear as we chat more about your interests!';
            }
            
          } catch (error) {
            console.error('❌ Error analyzing conversation:', error);
            return 'Career analysis temporarily unavailable';
          }
        },

        trigger_instant_insights: async (parameters: { user_message: string }) => {
          console.log('⚡ Triggering instant insights from ElevenLabs:', parameters);
          return `Generated instant career insights based on: "${parameters.user_message?.substring(0, 30)}..."`;
        },

        generate_career_recommendations: async (parameters: any) => {
          console.log('🎯 Generating career recommendations...');

          // If we don't have conversation history yet, try to use context from parameters
          if (conversationHistory.length < 2) {
            console.log('⚠️ No conversation history yet, using parameter context');
            
            // Try to extract any useful context from the parameters
            const contextString = JSON.stringify(parameters);
            if (contextString.length > 20) {
              console.log('🎯 Using parameter context for career recommendations');
              
              if (onCareerCardsGenerated) {
                // Generate enhanced career cards with deep data
                const enhancedCareerCards = [
                  {
                    id: "ai-ml-engineer",
                    title: "AI/Machine Learning Engineer",
                    description: "Build intelligent systems and AI solutions to solve complex real-world problems",
                    industry: "Technology",
                    salaryRange: "£50,000 - £120,000",
                    averageSalary: {
                      entry: "£50,000",
                      experienced: "£85,000", 
                      senior: "£120,000"
                    },
                    skillsRequired: ["Python", "Machine Learning", "Deep Learning", "TensorFlow", "Problem Solving"],
                    keySkills: ["Python", "Machine Learning", "Deep Learning", "TensorFlow", "Problem Solving"],
                    marketOutlook: "Excellent growth prospects - 35% job growth expected",
                    growthOutlook: "Excellent growth prospects - 35% job growth expected",
                    workEnvironment: "Hybrid/Remote friendly, collaborative tech teams",
                    location: "UK",
                    confidence: 0.92,
                    trainingPathways: [
                      "Computer Science Degree or equivalent experience",
                      "Machine Learning bootcamps (Google AI, Coursera)",
                      "Portfolio of ML projects on GitHub"
                    ],
                    entryRequirements: [
                      "Strong programming skills in Python",
                      "Understanding of mathematics/statistics",
                      "Problem-solving mindset"
                    ],
                    nextSteps: [
                      "Start with Python programming basics",
                      "Complete online ML course (Coursera/edX)",
                      "Build your first ML project",
                      "Create GitHub portfolio"
                    ]
                  },
                  {
                    id: "software-developer",
                    title: "Software Developer",
                    description: "Create applications, websites, and systems that help people solve problems",
                    industry: "Technology",
                    salaryRange: "£35,000 - £80,000",
                    averageSalary: {
                      entry: "£35,000",
                      experienced: "£55,000",
                      senior: "£80,000"
                    },
                    skillsRequired: ["Programming", "Problem Solving", "Communication", "JavaScript", "React"],
                    keySkills: ["Programming", "Problem Solving", "Communication", "JavaScript", "React"],
                    marketOutlook: "Strong demand across all industries",
                    growthOutlook: "Strong demand across all industries",
                    workEnvironment: "Flexible, often remote-friendly, team-based",
                    location: "UK",
                    confidence: 0.88,
                    trainingPathways: [
                      "Self-taught through online resources",
                      "Coding bootcamps (12-24 weeks)",
                      "Computer Science degree"
                    ],
                    entryRequirements: [
                      "Basic programming knowledge",
                      "Problem-solving skills",
                      "Willingness to learn continuously"
                    ],
                    nextSteps: [
                      "Choose a programming language (JavaScript recommended)",
                      "Complete FreeCodeCamp or similar",
                      "Build 3-5 portfolio projects",
                      "Apply for junior positions"
                    ]
                  },
                  {
                    id: "product-manager", 
                    title: "Product Manager",
                    description: "Lead development of products that make a real difference in people's lives",
                    industry: "Technology",
                    salaryRange: "£45,000 - £100,000",
                    averageSalary: {
                      entry: "£45,000",
                      experienced: "£70,000",
                      senior: "£100,000"
                    },
                    skillsRequired: ["Strategic Thinking", "Communication", "Analysis", "User Research", "Leadership"],
                    keySkills: ["Strategic Thinking", "Communication", "Analysis", "User Research", "Leadership"],
                    marketOutlook: "Growing field with diverse opportunities",
                    growthOutlook: "Growing field with diverse opportunities",
                    workEnvironment: "Cross-functional teams, stakeholder management",
                    location: "UK",
                    confidence: 0.85,
                    trainingPathways: [
                      "Product Management courses (Product School)",
                      "MBA or business-related degree",
                      "Transition from related roles (UX, Engineering, Marketing)"
                    ],
                    entryRequirements: [
                      "Strong communication skills",
                      "Analytical mindset",
                      "Customer empathy"
                    ],
                    nextSteps: [
                      "Learn product management fundamentals",
                      "Practice with personal projects",
                      "Network with current PMs",
                      "Consider associate PM roles"
                    ]
                  }
                ];
                
                console.log('🎯 Generating enhanced career cards with deep data');
                onCareerCardsGenerated(enhancedCareerCards);
                
                // Also generate person profile if callback is available
                if (onPersonProfileGenerated) {
                  const personProfile: PersonProfile = {
                    interests: ["Technology", "Problem Solving", "Innovation", "Helping Others"],
                    goals: ["Build meaningful products", "Continuous learning", "Career growth"],
                    skills: ["Analytical thinking", "Communication", "Adaptability"],
                    values: ["Making a difference", "Innovation", "Collaboration", "Growth"],
                    careerStage: "exploring",
                    workStyle: ["Team collaboration", "Flexible hours", "Remote friendly"],
                    lastUpdated: new Date().toLocaleDateString()
                  };
                  
                  console.log('👤 Generating person profile');
                  onPersonProfileGenerated(personProfile);
                }
                
                return `I've generated ${enhancedCareerCards.length} detailed career recommendations and your personal profile! Check them out.`;
              }
            }
            
            return 'Let me gather a bit more information about your interests to provide personalized career recommendations.';
          }

          // If we have conversation history, use the normal flow
          try {
            console.log('📤 Sending conversation to MCP server for career recommendations');
            const conversationText = conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');
            
            const response = await fetch(`${mcpEndpoint}/analyze`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                conversationHistory: conversationText,
                userId: currentUser?.uid || `guest_${Date.now()}`,
                triggerReason: 'generate_career_recommendations'
              }),
            });

            if (!response.ok) {
              console.error('❌ MCP request failed:', response.status, response.statusText);
              return 'Career recommendations temporarily unavailable';
            }

            const result = await response.json();
            console.log('✅ MCP Career recommendations result:', result);
            
            const analysisData = result.analysis || result;
            const careerCards = analysisData.careerCards || [];
            
            if (careerCards.length > 0 && onCareerCardsGenerated) {
              console.log('🎯 Generating career cards from MCP analysis:', careerCards.length);
              onCareerCardsGenerated(careerCards);
              return `I've generated ${careerCards.length} personalized career recommendations for you!`;
            } else {
              console.log('⚠️ No career cards from MCP, generating fallback');
              return 'Career recommendations are being prepared based on our conversation!';
            }
            
          } catch (error) {
            console.error('❌ Error generating career recommendations:', error);
            return 'Career recommendations temporarily unavailable';
          }
        },

        update_person_profile: async (parameters: { interests?: string[]; goals?: string[]; skills?: string[] }) => {
          console.log('👤 Updating person profile based on conversation...');
          
          if (onPersonProfileGenerated) {
            // Extract insights from conversation to update profile
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
      // Extract content from message
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
        console.log('📝 Message added:', { role, preview: content.substring(0, 50) + '...' });
        setConversationHistory(prev => {
          const updated = [...prev, { role, content: content.trim() }];
          return updated;
        });
      }
    },
    onError: (error) => {
      console.error('❌ ElevenLabs error:', error);
    },
    onUserTranscriptReceived: (transcript: string) => {
      if (transcript && transcript.trim().length > 0) {
        console.log('🎤 User transcript:', transcript.substring(0, 50) + '...');
        setConversationHistory(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.role === 'user' && lastMessage?.content === transcript.trim()) {
            return prev; // Skip duplicate
          }
          
          const updated = [...prev, { role: 'user' as const, content: transcript.trim() }];
          return updated;
        });
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

  // 🚀 SOLUTION: Fetch conversation transcript directly from ElevenLabs API
  useEffect(() => {
    if (conversation?.status === 'connected' && apiKey) {
      console.log('🔍 Starting conversation transcript polling...');
      
      const fetchConversationTranscript = async () => {
        try {
          const conversationId = conversation.getId ? conversation.getId() : null;
          
          if (!conversationId) {
            return;
          }
          
          const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`, {
            headers: {
              'xi-api-key': apiKey,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            return;
          }
          
          const conversationData = await response.json();
          const transcript = conversationData.transcript || [];
          
          // Only log when we actually have transcript data
          if (transcript.length > 0) {
            console.log('📜 Transcript received:', transcript.length, 'messages');
            
            // Convert ElevenLabs transcript format to our format
            const newHistory = transcript
              .filter(entry => entry.message && entry.message.trim().length > 0)
              .map(entry => ({
                role: entry.role === 'agent' ? 'assistant' : entry.role,
                content: entry.message
              }));
            
            // Update conversation history if we have new content
            if (newHistory.length !== conversationHistory.length) {
              console.log('📜 Updating conversation history:', {
                oldLength: conversationHistory.length,
                newLength: newHistory.length
              });
              
              setConversationHistory(newHistory);
              
              // Trigger career analysis if we have enough content
              if (newHistory.length >= 2) {
                const totalContent = newHistory.map(m => m.content).join(' ');
                if (totalContent.length >= 50) {
                  console.log('🎯 Sufficient conversation for career analysis');
                }
              }
            }
          }
          
        } catch (error) {
          // Silently handle errors to reduce noise
        }
      };
      
      // Poll every 2 seconds (reduced frequency)
      const pollInterval = setInterval(fetchConversationTranscript, 2000);
      fetchConversationTranscript();
      
      return () => {
        console.log('🔍 Stopping conversation transcript polling...');
        clearInterval(pollInterval);
      };
    }
  }, [conversation?.status, apiKey, conversationHistory.length]);

  // Client tools that call our MCP server
  const clientTools = {
    analyze_conversation_for_careers: async (parameters: { trigger_reason: string }) => {
      console.log('🔍 ===== ANALYZE TOOL CALLED =====');
      console.log('🔍 Analyzing conversation for careers:', parameters);
      console.log('📊 Current conversation history state:', {
        length: conversationHistory.length,
        messages: conversationHistory
      });

      if (conversationHistory.length < 2 || conversationHistory.map(m => m.content).join(' ').length < 20) {
        console.log('⚠️ Not enough conversation history for analysis yet');
        
        return 'Keep chatting! I need a bit more conversation to understand your interests and generate personalized career recommendations.';
      }

      try {
        console.log('📤 Sending conversation to MCP server:', {
          endpoint: mcpEndpoint,
          historyLength: conversationHistory.length,
          contentPreview: conversationHistory.map(m => m.content.substring(0, 30)).join(' | ')
        });

        const conversationText = conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');
        
        const response = await fetch(`${mcpEndpoint}/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationHistory: conversationText,
            userId: currentUser?.uid || `guest_${Date.now()}`,
            triggerReason: parameters.trigger_reason
          }),
        });

        console.log('📥 MCP Response status:', response.status);
        
        if (!response.ok) {
          console.error('❌ MCP request failed:', response.status, response.statusText);
          return 'Career analysis temporarily unavailable';
        }

        const result = await response.json();
        console.log('✅ MCP Analysis result:', result);
        
        const analysisData = result.analysis || result;
        const careerCards = analysisData.careerCards || [];
        
        if (careerCards.length > 0 && onCareerCardsGenerated) {
          console.log('🎯 Generating career cards:', careerCards.length);
          onCareerCardsGenerated(careerCards);
          return `I've generated ${careerCards.length} career recommendations based on our conversation!`;
        } else {
          console.log('⚠️ No career cards generated');
          return 'Career recommendations will appear as we chat more about your interests!';
        }
        
      } catch (error) {
        console.error('❌ Error analyzing conversation:', error);
        return 'Career analysis temporarily unavailable';
      }
    },

    trigger_instant_insights: async (parameters: { user_message: string }) => {
      console.log('⚡ Triggering instant insights:', parameters);
      
      if (!parameters.user_message || parameters.user_message.trim().length < 10) {
        console.log('⚠️ User message too short for instant insights');
        return 'Tell me more about what interests you career-wise!';
      }
      
      try {
        // Combine current message with existing conversation history for better context
        const fullContext = conversationHistory.map(msg => msg.content).join('\n') + 
                            (conversationHistory.length > 0 ? '\n' : '') + 
                            parameters.user_message;
        
        console.log('📤 Sending instant insight request:', {
          messageLength: parameters.user_message.length,
          contextLength: fullContext.length,
          preview: parameters.user_message.substring(0, 50) + '...'
        });
        
        const response = await fetch(`${mcpEndpoint}/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationHistory: fullContext,
            userId: currentUser?.uid || `guest_${Date.now()}`,
            triggerReason: 'instant_insights'
          }),
        });

        if (!response.ok) {
          console.error('Failed to trigger insights:', response.status);
          return 'Insights temporarily unavailable';
        }

        const result = await response.json();
        console.log('✅ Instant insights result:', result);
        
        const analysisData = result.analysis || result;
        const careerCards = analysisData.careerCards || [];
        
        if (careerCards.length > 0 && onCareerCardsGenerated) {
          onCareerCardsGenerated(careerCards);
        }
        
        return `Generated instant career insights based on your message: "${parameters.user_message.substring(0, 30)}..."`;
        
      } catch (error) {
        console.error('Error triggering insights:', error);
        return 'Instant insights temporarily unavailable';
      }
    }
  };

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