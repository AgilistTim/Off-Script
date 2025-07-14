import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import AlternativePathways from '../components/AlternativePathways';
import { ElevenLabsConversation } from '../components/conversation/ElevenLabsConversation';
import { UserPersona } from '../components/conversation/PersonaDetector';

const Home: React.FC = () => {
  const { currentUser } = useAuth();
  
  // Persona state management
  const [userPersona, setUserPersona] = useState<UserPersona>({
    type: 'unknown',
    confidence: 0,
    traits: [],
    adaptations: {
      maxResponseLength: 60,
      responseStyle: 'encouraging',
      valueDeliveryTimeout: 8000,
      preferredActions: [],
      conversationPace: 'moderate'
    }
  });
  const [showTraditionalView, setShowTraditionalView] = useState(false);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Persona-Aware Conversational Hero Section */}
      <section className="py-8">
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-6"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-2">
              Find Your Path, <span className="text-blue-600 dark:text-blue-400">Your Way</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Get personalized career guidance in seconds. Our AI adapts to how you think and what you need.
            </p>
          </motion.div>

          {/* Conversational Interface */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="h-[500px] md:h-[600px]">
                <ElevenLabsConversation
                  userPersona={userPersona}
                  onPersonaUpdate={setUserPersona}
                  onMessageSent={(message) => {
                    console.log('Message sent from home:', message);
                  }}
                  onVoiceInput={(transcript) => {
                    console.log('Voice input from home:', transcript);
                  }}
                  onQuickAction={(action) => {
                    console.log('Quick action from home:', action);
                  }}
                  className="h-full"
                />
              </div>
            </div>
          </motion.div>

          {/* Alternative CTA for users who prefer traditional navigation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-center mt-6"
          >
            <button
              onClick={() => setShowTraditionalView(!showTraditionalView)}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
            >
              {showTraditionalView ? 'Try the conversation instead' : 'Prefer to browse traditionally?'}
            </button>
          </motion.div>

          {/* Traditional Navigation (collapsed by default) */}
          {showTraditionalView && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-wrap justify-center gap-4 mt-4"
            >
              <Link to="/explore" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Explore Career Videos
              </Link>
              {currentUser ? (
                <Link to="/dashboard" className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  Go to Dashboard
                </Link>
              ) : (
                <Link to="/register" className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  Get Started
                </Link>
              )}
            </motion.div>
          )}
        </div>
      </section>
      
      <section className="py-12">
        <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-12">
          How OffScript Works
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"
          >
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
              🎯 Instant Insights
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Get personalized career guidance within seconds. Our AI detects how you think and adapts instantly.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"
          >
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
              🗣️ Voice & Text
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Talk naturally or type - whatever feels comfortable. Our AI understands both perfectly.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"
          >
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
              📈 Real Data
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Get current salary info, job market trends, and authentic stories from real professionals.
            </p>
          </motion.div>
        </div>
      </section>
      
      {/* Alternative Pathways Section */}
      <AlternativePathways />
      
      <section className="py-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
            Ready to Dive Deeper?
          </h2>
          
          {currentUser ? (
            <div className="space-y-4">
              <Link to="/chat" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mr-4">
                Continue in Full Chat
              </Link>
              <Link to="/explore" className="inline-block px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                Explore Career Videos
              </Link>
            </div>
          ) : (
            <Link to="/register" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Create Account to Save Progress
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
