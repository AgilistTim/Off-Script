import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChatContext } from '../context/ChatContext';
import { ConversationView } from '../components/views/ConversationView';

interface EngagementPageProps {}

export const EngagementPage: React.FC<EngagementPageProps> = () => {
  const { currentUser } = useAuth();
  const { currentThread } = useChatContext();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-black via-primary-black to-electric-blue/10 pt-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
      {isMobile && (
        <div className="bg-primary-white border-b border-border-neutral px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Off Script Logo for Mobile */}
            <svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="text-primary-black">
              <text x="0" y="20" fontFamily="Barlow Semi Condensed, sans-serif" fontSize="12" fontWeight="700">OFF</text>
              <text x="0" y="20" fontFamily="Barlow Semi Condensed, sans-serif" fontSize="12" fontWeight="700" fontStyle="italic" dx="20">SCRIPT</text>
              <line x1="0" y1="22" x2="28" y2="22" stroke="currentColor" strokeWidth="1" />
            </svg>
            <span className="font-semibold text-primary-black">Voice Career Guide</span>
          </div>
        </div>
      )}

      {/* Main Conversation Interface - Direct access without welcome screen */}
      <div className="flex-1">
        <ConversationView />
      </div>
      </div>
    </div>
  );
};

export default EngagementPage; 