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

  // Client tools that call our MCP server
  const clientTools = {
    analyze_conversation_for_careers: async (parameters: { trigger_reason: string }) => {
      console.log('🔍 Analyzing conversation for careers:', parameters);
      console.log('📊 Current conversation history state:', {
        length: conversationHistory.length,
        messages: conversationHistory.map(msg => ({ role: msg.role, preview: msg.content.substring(0, 30) + '...' }))
      });
      
      // Check if we have meaningful conversation content
      if (conversationHistory.length < 2) {
        console.log('⚠️ Not enough conversation history for analysis yet');
        return 'I need to learn more about you first. Tell me about your interests and what kind of work excites you!';
      }
      
      const conversationText = conversationHistory.map(msg => msg.content).join('\n');
      if (conversationText.trim().length < 20) {
        console.log('⚠️ Conversation content too short for meaningful analysis');
        return 'Let\'s chat a bit more so I can better understand your career interests!';
      }
      
      try {
        console.log('📤 Sending conversation for analysis:', {
          messageCount: conversationHistory.length,
          textLength: conversationText.length,
          preview: conversationText.substring(0, 100) + '...'
        });
        
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

        if (!response.ok) {
          console.error('Failed to analyze conversation:', response.status);
          return 'Analysis failed - will retry later';
        }

        const result = await response.json();
        console.log('✅ Analysis result:', result);
        
        // Handle nested result structure from MCP server
        const analysisData = result.analysis || result;
        const careerCards = analysisData.careerCards || [];
        
        console.log('🎯 Extracted career cards:', careerCards);
        
        if (careerCards.length > 0 && onCareerCardsGenerated) {
          onCareerCardsGenerated(careerCards);
        }
        
        return `Analysis complete - generated ${careerCards.length} career recommendations based on our conversation`;
        
      } catch (error) {
        console.error('Error analyzing conversation:', error);
        return 'Analysis temporarily unavailable - continuing conversation';
      }
    },

    generate_career_recommendations: async (parameters: { interests: string[], experience_level?: string }) => {
      console.log('🎯 Generating career recommendations:', parameters);
      
      try {
        const response = await fetch(`${mcpEndpoint}/insights`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            interests: parameters.interests,
            experienceLevel: parameters.experience_level || 'beginner',
            conversationHistory: conversationHistory.map(msg => msg.content).join('\n'),
            userId: currentUser?.uid || `guest_${Date.now()}`,
          }),
        });

        if (!response.ok) {
          console.error('Failed to generate recommendations:', response.status);
          return 'Recommendation generation failed - will retry';
        }

        const result = await response.json();
        console.log('✅ Recommendations result:', result);
        
        if (result.careerCards && onCareerCardsGenerated) {
          onCareerCardsGenerated(result.careerCards);
        }
        
        return `Generated ${result.careerCards?.length || 0} personalized career recommendations with UK salary data and pathways`;
        
      } catch (error) {
        console.error('Error generating recommendations:', error);
        return 'Recommendations temporarily unavailable';
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

  // Initialize conversation with client tools
  const conversation = useConversation({
    clientTools,
    apiKey,
    onConnect: () => {
      console.log('🟢 ElevenLabs connected');
      setConnectionStatus('connected');
    },
    onDisconnect: () => {
      console.log('🔴 ElevenLabs disconnected');
      setConnectionStatus('disconnected');
    },
    onMessage: (message: any) => {
      console.log('📝 Message received:', message);
      console.log('📝 Message keys:', Object.keys(message || {}));
      console.log('📝 Message source:', message?.source);
      
      // Track conversation history for MCP context
      // Extract message content - prioritize the 'message' property as per ElevenLabs types
      const content = message?.message || (message as any)?.text || (message as any)?.content;
      
      console.log('📝 Extracted content:', content);
      console.log('📝 Content type:', typeof content);
      console.log('📝 Content length:', content?.length);
      
      if (content && typeof content === 'string' && content.trim().length > 0) {
        // Determine role based on message source
        const role: 'user' | 'assistant' = message?.source === 'user' ? 'user' : 'assistant';
        setConversationHistory(prev => {
          const updated = [...prev, { role, content: content.trim() }];
          console.log('✅ Added to conversation history. New length:', updated.length);
          return updated;
        });
        console.log('✅ Added to conversation history:', { role, content: content.substring(0, 50) + '...' });
      } else {
        console.warn('⚠️ Could not extract content from message:', message);
        console.warn('⚠️ Content value:', content);
      }
    },
    onError: (error) => {
      console.error('❌ ElevenLabs error:', error);
    },
    onUserTranscriptReceived: (transcript: string) => {
      console.log('🎤 User transcript received:', transcript);
      
      // Add user voice input to conversation history
      if (transcript && transcript.trim().length > 0) {
        setConversationHistory(prev => [...prev, { role: 'user', content: transcript.trim() }]);
        console.log('✅ Added user voice input to conversation history:', transcript.substring(0, 50) + '...');
      }
    }
  });

  const startConversation = useCallback(async () => {
    if (!agentId || !apiKey) {
      console.error('Missing ElevenLabs configuration');
      return;
    }

    try {
      setConnectionStatus('connecting');
      console.log('🚀 Starting ElevenLabs conversation...');
      
      await conversation.startSession({
        agentId
      });
      
    } catch (error) {
      console.error('Failed to start conversation:', error);
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