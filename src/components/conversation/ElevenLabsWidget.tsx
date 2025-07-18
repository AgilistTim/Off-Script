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

interface ElevenLabsWidgetProps {
  onCareerCardsGenerated?: (cards: any[]) => void;
  className?: string;
}

export const ElevenLabsWidget: React.FC<ElevenLabsWidgetProps> = ({
  onCareerCardsGenerated,
  className = ''
}) => {
  const { currentUser } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  // Use the helper function to get environment variables
  const agentId = getEnvVar('VITE_ELEVENLABS_AGENT_ID');
  const apiKey = getEnvVar('VITE_ELEVENLABS_API_KEY');
  const mcpEndpoint = 'https://off-script-mcp-elevenlabs.onrender.com/mcp';

  // 🔍 DEBUGGING: Log configuration on component mount
  useEffect(() => {
    console.log('🔧 ElevenLabsWidget Configuration Check:');
    console.log('🔧 Agent ID:', agentId ? `${agentId.substring(0, 8)}...` : 'MISSING');
    console.log('🔧 API Key:', apiKey ? `${apiKey.substring(0, 8)}...` : 'MISSING');
    console.log('🔧 MCP Endpoint:', mcpEndpoint);
    console.log('🔧 Current User:', currentUser ? currentUser.uid : 'No user');
    console.log('🔧 Environment vars available:', {
      VITE_ELEVENLABS_AGENT_ID: !!getEnvVar('VITE_ELEVENLABS_AGENT_ID'),
      VITE_ELEVENLABS_API_KEY: !!getEnvVar('VITE_ELEVENLABS_API_KEY')
    });
  }, [agentId, apiKey, currentUser]);

  // 🔍 DEBUGGING: Monitor conversation history changes
  useEffect(() => {
    console.log('📝 Conversation history changed:', {
      length: conversationHistory.length,
      messages: conversationHistory.map(msg => ({
        role: msg.role,
        preview: msg.content.substring(0, 50) + '...'
      }))
    });
  }, [conversationHistory]);

  // Initialize conversation with forward-declared client tools
  const conversation = useConversation({
    clientTools: (() => {
      // Forward declaration - actual tools defined below
      const tools = {
        analyze_conversation_for_careers: async (parameters: { trigger_reason: string }) => {
          console.log('🔍 ===== ANALYZE TOOL CALLED FROM ELEVENLABS =====');
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
            console.log('📤 Sending conversation to MCP server from ElevenLabs tool call');
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
            console.log('✅ MCP Analysis result:', result);
            
            const analysisData = result.analysis || result;
            const careerCards = analysisData.careerCards || [];
            
            if (careerCards.length > 0 && onCareerCardsGenerated) {
              console.log('🎯 Generating career cards from ElevenLabs tool call:', careerCards.length);
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
          console.log('⚡ Triggering instant insights from ElevenLabs:', parameters);
          return `Generated instant career insights based on: "${parameters.user_message?.substring(0, 30)}..."`;
        }
      };
      return tools;
    })(),
    onConnect: () => {
      console.log('🟢 ElevenLabs connected');
      console.log('🔧 Connection established with config:', { agentId: agentId?.substring(0, 8) + '...', hasApiKey: !!apiKey });
      setConnectionStatus('connected');
    },
    onDisconnect: () => {
      console.log('🔴 ElevenLabs disconnected');
      console.log('📊 Final conversation history:', conversationHistory);
      setConnectionStatus('disconnected');
    },
    onMessage: (message: any) => {
      console.log('📝 ===== onMessage TRIGGERED =====');
      console.log('📝 Raw message received:', message);
      console.log('📝 Message type:', typeof message);
      console.log('📝 Message constructor:', message?.constructor?.name);
      console.log('📝 Message keys (if object):', message && typeof message === 'object' ? Object.keys(message) : 'N/A');
      console.log('📝 Message string representation:', String(message));
      console.log('📝 Message JSON representation:', JSON.stringify(message, null, 2));
      
      // According to React SDK docs, onMessage receives text messages directly
      // These can be tentative/final transcriptions of user voice or LLM replies
      let content: string | null = null;
      let role: 'user' | 'assistant' = 'assistant'; // Default to assistant since most messages are from the agent
      
      if (typeof message === 'string') {
        // Direct text message - this is the expected format for React SDK
        content = message;
        console.log('📝 ✅ Direct text message detected:', content);
      } else if (message && typeof message === 'object') {
        // Handle potential object formats as fallback
        console.log('📝 🔍 Checking object message properties...');
        
        if (message.text) {
          content = message.text;
          console.log('📝 Found content in .text property');
        } else if (message.content) {
          content = message.content;
          console.log('📝 Found content in .content property');
        } else if (message.message) {
          content = message.message;
          console.log('📝 Found content in .message property');
        } else {
          console.log('📝 ❌ No recognizable content property found');
        }
        
        // Try to determine role from object properties
        if (message.role) {
          role = message.role;
          console.log('📝 Role from .role property:', role);
        } else if (message.source) {
          role = message.source === 'user' ? 'user' : 'assistant';
          console.log('📝 Role from .source property:', role);
        }
        
        console.log('📝 Object message extracted:', { content, role, originalMessage: message });
      } else {
        console.log('📝 ❌ Unexpected message format:', typeof message);
      }
      
      console.log('📝 Final extracted:', { content, role, type: typeof content, length: content?.length });
      
      if (content && typeof content === 'string' && content.trim().length > 0) {
        console.log('📝 ✅ Adding valid message to conversation history');
        setConversationHistory(prev => {
          const updated = [...prev, { role, content: content.trim() }];
          console.log('✅ Added to conversation history. New length:', updated.length);
          console.log('✅ Updated history:', updated.map(msg => ({ role: msg.role, preview: msg.content.substring(0, 30) + '...' })));
          return updated;
        });
        console.log('✅ Successfully added to conversation history:', { role, content: content.substring(0, 50) + '...' });
      } else {
        console.warn('⚠️ Could not extract valid content from message:', { 
          messageType: typeof message,
          content, 
          role,
          fullMessage: message 
        });
      }
      
      console.log('📝 ===== onMessage COMPLETE =====');
    },
    onError: (error) => {
      console.error('❌ ElevenLabs error:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error string representation:', String(error));
    },
    onUserTranscriptReceived: (transcript: string) => {
      console.log('🎤 ===== onUserTranscriptReceived TRIGGERED =====');
      console.log('🎤 User transcript received:', transcript);
      console.log('🎤 Transcript type:', typeof transcript);
      console.log('🎤 Transcript length:', transcript?.length);
      
      // Add user voice input to conversation history
      if (transcript && transcript.trim().length > 0) {
        console.log('🎤 Processing valid transcript...');
        setConversationHistory(prev => {
          // Check if this transcript is already in history (to avoid duplicates)
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.role === 'user' && lastMessage?.content === transcript.trim()) {
            console.log('🎤 Transcript already in history, skipping duplicate');
            return prev;
          }
          
          const updated = [...prev, { role: 'user' as const, content: transcript.trim() }];
          console.log('✅ Added user voice input to conversation history. New length:', updated.length);
          console.log('✅ Updated history via onUserTranscriptReceived:', updated.map(msg => ({ role: msg.role, preview: msg.content.substring(0, 30) + '...' })));
          return updated;
        });
        console.log('✅ Successfully added user voice input to conversation history:', transcript.substring(0, 50) + '...');
      } else {
        console.warn('🎤 ⚠️ Invalid or empty transcript received');
      }
      
      console.log('🎤 ===== onUserTranscriptReceived COMPLETE =====');
    },
    // Try additional callbacks that might exist in React SDK
    onStatusChange: (status: string) => {
      console.log('🔄 ===== onStatusChange TRIGGERED =====');
      console.log('🔄 Status changed to:', status);
      console.log('🔄 ===== onStatusChange COMPLETE =====');
    },
    onModeChange: (mode: string) => {
      console.log('🎯 ===== onModeChange TRIGGERED =====');
      console.log('🎯 Mode changed to:', mode);
      console.log('🎯 ===== onModeChange COMPLETE =====');
    }
  });

  // 🔍 DEBUGGING: Log conversation object
  console.log('🔧 Conversation object:', conversation);
  console.log('🔧 Conversation methods:', Object.keys(conversation || {}));

  // 🔍 DEBUGGING: Monitor conversation state properties
  useEffect(() => {
    console.log('📊 Conversation state changed:', {
      status: conversation?.status,
      isSpeaking: conversation?.isSpeaking,
      canSendFeedback: conversation?.canSendFeedback,
      micMuted: conversation?.micMuted
    });
  }, [conversation?.status, conversation?.isSpeaking, conversation?.canSendFeedback, conversation?.micMuted]);

  // 🚀 SOLUTION: Fetch conversation transcript directly from ElevenLabs API
  useEffect(() => {
    if (conversation?.status === 'connected' && apiKey) {
      console.log('🔍 Starting conversation transcript polling...');
      
      const fetchConversationTranscript = async () => {
        try {
          const conversationId = conversation.getId ? conversation.getId() : null;
          
          if (!conversationId) {
            console.log('🔍 No conversation ID available yet');
            return;
          }
          
          console.log('📡 Fetching transcript for conversation:', conversationId);
          
          const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`, {
            headers: {
              'xi-api-key': apiKey,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            console.log('📡 Transcript fetch failed:', response.status, response.statusText);
            return;
          }
          
          const conversationData = await response.json();
          console.log('📡 Conversation data received:', conversationData);
          
          const transcript = conversationData.transcript || [];
          console.log('📜 Raw transcript:', transcript);
          
          if (transcript.length > 0) {
            // Convert ElevenLabs transcript format to our format
            const newHistory = transcript
              .filter(entry => entry.message && entry.message.trim().length > 0)
              .map(entry => ({
                role: entry.role === 'agent' ? 'assistant' : entry.role,
                content: entry.message
              }));
            
            console.log('📜 Processed conversation history:', newHistory);
            
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
                  console.log('🎯 Triggering career analysis from transcript!');
                  // TODO: Re-enable clientTools and this will automatically trigger analysis
                }
              }
            }
          }
          
          // Also log audio volumes for debugging
          if (conversation.getInputVolume && conversation.getOutputVolume) {
            const [inputVolume, outputVolume] = await Promise.all([
              conversation.getInputVolume(),
              conversation.getOutputVolume()
            ]);
            console.log('🔍 Audio levels:', { input: inputVolume, output: outputVolume });
          }
          
        } catch (error) {
          console.log('📡 Error fetching conversation transcript:', error);
        }
      };
      
      // Poll every 1 second for transcript updates (faster to catch data)
      const pollInterval = setInterval(fetchConversationTranscript, 1000);
      
      // Also fetch immediately
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

      // 🔍 DEBUGGING: Try to extract conversation data from the context this tool was called in
      try {
        console.log('🔍 Trying to extract conversation context from ElevenLabs...');
        
        // Since this tool is being called by ElevenLabs, maybe there's conversation context available
        // Let's log everything about the current state
        console.log('🔍 Current conversation object state:', {
          status: conversation?.status,
          isSpeaking: conversation?.isSpeaking,
          canSendFeedback: conversation?.canSendFeedback,
          id: conversation?.getId ? conversation.getId() : 'unknown'
        });
        
        // Check if there's any conversation data we can access
        console.log('🔍 Conversation object properties:', Object.getOwnPropertyNames(conversation || {}));
        console.log('🔍 Parameters received by tool:', parameters);
        
      } catch (error) {
        console.log('🔍 Error extracting conversation context:', error);
      }

      if (conversationHistory.length < 2 || conversationHistory.map(m => m.content).join(' ').length < 20) {
        console.log('⚠️ Not enough conversation history for analysis yet');
        
        // 🔍 DEBUGGING: Since the tool is being called, there MUST be conversation data somewhere
        console.log('🔍 BUT: Tool was called by ElevenLabs, so conversation must exist somewhere!');
        console.log('🔍 This suggests our callback approach is wrong and we need to find another way');
        
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

  // 🔍 DEBUGGING: Log client tools
  console.log('🔧 Client tools configured:', Object.keys(clientTools));

  const startConversation = useCallback(async () => {
    console.log('🚀 ===== STARTING CONVERSATION =====');
    console.log('🔧 Configuration check:', {
      agentId: agentId ? `${agentId.substring(0, 8)}...` : 'MISSING',
      apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'MISSING',
      conversationObject: !!conversation,
      conversationMethods: conversation ? Object.keys(conversation) : 'No conversation object'
    });

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
      console.log('🚀 Starting ElevenLabs conversation with agentId:', agentId);
      console.log('🔧 Calling conversation.startSession...');
      
      const result = await conversation.startSession({
        agentId
      });
      
      console.log('✅ Conversation started successfully, result:', result);
      console.log('🚀 ===== CONVERSATION START COMPLETE =====');
      
    } catch (error) {
      console.error('❌ Failed to start conversation:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error details:', String(error));
      setConnectionStatus('disconnected');
      console.log('🚀 ===== CONVERSATION START FAILED =====');
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