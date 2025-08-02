import React, { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { useAuth } from '../../context/AuthContext';
import { agentContextService } from '../../services/agentContextService';
import { enhancedUserContextService, UserContext } from '../../services/enhancedUserContextService';

export const EnhancedContextDemo: React.FC = () => {
  const { currentUser } = useAuth();
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [agentType, setAgentType] = useState<'exploration' | 'career-deep-dive'>('exploration');
  const [agentContext, setAgentContext] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserContext();
  }, [currentUser]);

  const loadUserContext = async () => {
    if (currentUser) {
      setLoading(true);
      try {
        const context = await enhancedUserContextService.getUserContext(currentUser);
        setUserContext(context);
      } catch (error) {
        console.error('Error loading user context:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const buildAgentContext = async () => {
    setLoading(true);
    try {
      const context = await agentContextService.buildEnhancedAgentContext(
        currentUser,
        agentType
      );
      setAgentContext(context);
    } catch (error) {
      console.error('Error building agent context:', error);
    } finally {
      setLoading(false);
    }
  };

  const simulateConversation = async () => {
    if (!currentUser) return;

    const mockConversationData = {
      agentType,
      duration: 15, // 15 minutes
      messageCount: 25,
      newInsights: {
        interests: ['AI development', 'voice technology'],
        skills: ['programming', 'problem solving'],
        careerGoals: ['build innovative products'],
        workPreferences: {
          workStyle: 'innovative',
          teamSize: 'small to medium'
        },
        confidence: 0.8
      },
      careerCardsCreated: 2,
      topics: ['AI careers', 'voice technology', 'software development']
    };

    await agentContextService.trackConversationCompletion(currentUser, mockConversationData);
    await loadUserContext(); // Refresh context
  };

  const trackAgentSwitch = async () => {
    if (!currentUser) return;

    const fromAgent = agentType === 'exploration' ? 'career-deep-dive' : 'exploration';
    const toAgent = agentType;

    await agentContextService.trackAgentSwitch(
      currentUser,
      fromAgent as 'exploration' | 'career-deep-dive',
      toAgent,
      'User requested switch via demo',
      { demoMode: true }
    );
    
    await loadUserContext(); // Refresh context
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Enhanced User Context Demo</h2>
      
      {/* User Status */}
      <div className="mb-6 p-4 border rounded-lg">
        <h3 className="font-semibold mb-2">User Status</h3>
        {currentUser ? (
          <div className="text-green-600">
            ✅ Authenticated: {currentUser.displayName || currentUser.email}
          </div>
        ) : (
          <div className="text-orange-600">
            👤 Guest User (limited context available)
          </div>
        )}
      </div>

      {/* Agent Type Selection */}
      <div className="mb-6 p-4 border rounded-lg">
        <h3 className="font-semibold mb-2">Agent Type</h3>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="exploration"
              checked={agentType === 'exploration'}
              onChange={(e) => setAgentType(e.target.value as 'exploration')}
              className="mr-2"
            />
            Exploration Agent (General Discovery)
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="career-deep-dive"
              checked={agentType === 'career-deep-dive'}
              onChange={(e) => setAgentType(e.target.value as 'career-deep-dive')}
              className="mr-2"
            />
            Career Deep-Dive Agent (Specific Focus)
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={buildAgentContext}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Build Agent Context'}
        </button>
        
        {currentUser && (
          <>
            <button
              onClick={simulateConversation}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              Simulate Conversation
            </button>
            
            <button
              onClick={trackAgentSwitch}
              disabled={loading}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            >
              Track Agent Switch
            </button>
          </>
        )}
      </div>

      {/* User Context Display */}
      {userContext && (
        <div className="mb-6 p-4 border rounded-lg">
          <h3 className="font-semibold mb-2">Current User Context</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Name:</strong> {userContext.name}
            </div>
            <div>
              <strong>Engagement Level:</strong> {userContext.engagementLevel}
            </div>
            <div>
              <strong>Total Conversations:</strong> {userContext.totalConversations}
            </div>
            <div>
              <strong>Career Cards Generated:</strong> {userContext.careerCardsGenerated}
            </div>
            <div>
              <strong>Interests:</strong> {userContext.discoveredInsights.interests.join(', ') || 'None'}
            </div>
            <div>
              <strong>Skills:</strong> {userContext.discoveredInsights.skills.join(', ') || 'None'}
            </div>
            <div>
              <strong>Career Goals:</strong> {userContext.discoveredInsights.careerGoals.join(', ') || 'None'}
            </div>
            <div>
              <strong>Last Agent Used:</strong> {userContext.lastAgentUsed || 'None'}
            </div>
          </div>
        </div>
      )}

      {/* Agent Context Display */}
      {agentContext && (
        <div className="mb-6 p-4 border rounded-lg">
          <h3 className="font-semibold mb-2">Generated Agent Context</h3>
          
          <div className="mb-4">
            <h4 className="font-medium">Recommended Agent ID:</h4>
            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
              {agentContextService.getEnhancedAgentId(agentType, currentUser)}
            </code>
          </div>

          <div className="mb-4">
            <h4 className="font-medium">Personalized Greeting:</h4>
            <p className="bg-blue-50 p-3 rounded italic">"{agentContext.greeting}"</p>
          </div>

          {agentContext.enhancedContext && (
            <div className="mb-4">
              <h4 className="font-medium">Enhanced Context Background:</h4>
              <p className="bg-green-50 p-3 rounded text-sm">{agentContext.enhancedContext.background}</p>
              
              <h4 className="font-medium mt-3">Conversation Recommendations:</h4>
              <ul className="bg-yellow-50 p-3 rounded text-sm">
                {agentContext.enhancedContext.recommendations.map((rec: string, index: number) => (
                  <li key={index} className="mb-1">• {rec}</li>
                ))}
              </ul>
            </div>
          )}

          <details className="mt-4">
            <summary className="font-medium cursor-pointer">System Prompt (Click to expand)</summary>
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto mt-2 whitespace-pre-wrap">
              {agentContext.systemPrompt}
            </pre>
          </details>
        </div>
      )}

      {/* Recent Conversations */}
      {userContext && userContext.previousSessions.length > 0 && (
        <div className="mb-6 p-4 border rounded-lg">
          <h3 className="font-semibold mb-2">Recent Conversations</h3>
          <div className="space-y-2">
            {userContext.previousSessions.slice(0, 3).map((session, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded text-sm">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{session.agentType} session</span>
                  <span className="text-gray-500">{session.duration} min</span>
                </div>
                <div className="text-gray-600">
                  Topics: {session.mainTopics.join(', ')}
                </div>
                <div className="text-gray-600">
                  Career cards created: {session.careerCardsCreated}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">How to Use This Demo</h3>
        <ol className="text-sm space-y-1">
          <li>1. Select an agent type (Exploration or Career Deep-Dive)</li>
          <li>2. Click "Build Agent Context" to see how the system creates personalized context</li>
          <li>3. If logged in, try "Simulate Conversation" to see how user context evolves</li>
          <li>4. Use "Track Agent Switch" to see how agent transitions are tracked</li>
          <li>5. Notice how the context becomes richer with each interaction</li>
        </ol>
      </div>
    </div>
  );
};