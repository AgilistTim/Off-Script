import React, { useCallback, useEffect, useState } from 'react';
import { useConversation } from '@elevenlabs/react';
import { useAuth } from '../../context/AuthContext';

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

  const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID;
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
  const mcpEndpoint = 'http://localhost:3001/mcp';

  // Client tools that call our MCP server
  const clientTools = {
    analyze_conversation_for_careers: async (parameters: { trigger_reason: string }) => {
      console.log('🔍 Analyzing conversation for careers:', parameters);
      
      try {
        const response = await fetch(`${mcpEndpoint}/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationHistory: conversationHistory.map(msg => msg.content).join('\n'),
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
        
        if (result.careerCards && onCareerCardsGenerated) {
          onCareerCardsGenerated(result.careerCards);
        }
        
        return `Analysis complete - generated ${result.careerCards?.length || 0} career recommendations`;
        
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
      
      try {
        const response = await fetch(`${mcpEndpoint}/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationHistory: parameters.user_message,
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
        
        if (result.careerCards && onCareerCardsGenerated) {
          onCareerCardsGenerated(result.careerCards);
        }
        
        return `Generated instant career insights based on your latest message`;
        
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
    onMessage: (message) => {
      console.log('📝 Message:', message);
      
      // Track conversation history for MCP context
      if (message.message && message.source) {
        const content = message.message;
        const role = message.source === 'user' ? 'user' : 'assistant';
        setConversationHistory(prev => [...prev, { role, content }]);
      }
    },
    onError: (error) => {
      console.error('❌ ElevenLabs error:', error);
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