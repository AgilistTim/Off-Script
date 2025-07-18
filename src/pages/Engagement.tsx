import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChatContext } from '../context/ChatContext';
import { ConversationView } from '../components/views/ConversationView';

import { Button } from '../components/ui/button';
import { MessageCircle, Sparkles, Brain, ChevronLeft } from 'lucide-react';

interface EngagementPageProps {}

export const EngagementPage: React.FC<EngagementPageProps> = () => {
  const { currentUser } = useAuth();
  const { currentThread } = useChatContext();
  const [showWelcome, setShowWelcome] = useState(!currentThread);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Hide welcome screen when conversation starts
  useEffect(() => {
    if (currentThread) {
      setShowWelcome(false);
    }
  }, [currentThread]);

  const handleStartConversation = () => {
    setShowWelcome(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      {/* Mobile Header */}
      {isMobile && !showWelcome && (
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-6 w-6 text-blue-600" />
            <span className="font-semibold text-gray-900">OffScript</span>
          </div>
        </div>
      )}

      {/* Welcome Screen */}
      {showWelcome && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-lg text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Discover Your Career Path
              </h1>
              <p className="text-lg text-gray-600">
                AI-powered conversation that creates your personalized career profile in real-time
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="bg-white p-4 rounded-lg border">
                  <MessageCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="font-medium">Voice & Chat</p>
                  <p className="text-gray-500">Natural conversation</p>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <Sparkles className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="font-medium">AI Analysis</p>
                  <p className="text-gray-500">Authentic insights</p>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <Brain className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="font-medium">Career Matches</p>
                  <p className="text-gray-500">Personalized recommendations</p>
                </div>
              </div>
              
              <Button
                onClick={handleStartConversation}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
              >
                Get Real Insights Now
              </Button>
              
              <p className="text-sm text-gray-500">
                No signup required • Get AI insights instantly
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Conversation Interface - Use ConversationView with analyzer */}
      {!showWelcome && (
        <div className="flex-1">
          <ConversationView />
        </div>
      )}
    </div>
  );
};

export default EngagementPage; 