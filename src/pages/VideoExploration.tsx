import React, { useState } from 'react';
import { motion } from 'framer-motion';
import InfiniteVideoFeed from '../components/video/InfiniteVideoFeed';
import { useAuth } from '../context/AuthContext';
import { Info, Lightbulb } from 'lucide-react';

const VideoExploration: React.FC = () => {
  const { currentUser } = useAuth();
  const [showTips, setShowTips] = useState(true);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4 md:mb-0">
            Video Exploration
          </h1>
          
          <button
            onClick={() => setShowTips(!showTips)}
            className="flex items-center text-sm text-primary-blue hover:text-blue-700 transition-colors"
          >
            <Info size={16} className="mr-1" />
            {showTips ? 'Hide Tips' : 'Show Tips'}
          </button>
        </div>
        
        {/* Tips section */}
        {showTips && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 mb-8"
          >
            <div className="flex items-start">
              <Lightbulb className="text-primary-blue mr-3 mt-1 flex-shrink-0" size={20} />
              <div>
                <h3 className="font-medium text-gray-800 dark:text-white mb-2">How to use the video explorer</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                  <li className="flex items-center">
                    <span className="inline-block w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center mr-2">✓</span>
                    <span>Swipe <strong>right</strong> or tap the <strong>thumbs up</strong> button to like a video</span>
                  </li>
                  <li className="flex items-center">
                    <span className="inline-block w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center mr-2">✗</span>
                    <span>Swipe <strong>left</strong> or tap the <strong>thumbs down</strong> button to skip a video</span>
                  </li>
                  <li className="flex items-center">
                    <span className="inline-block w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center mr-2">▶</span>
                    <span>Tap the video to <strong>expand</strong> and watch it</span>
                  </li>
                  <li className="flex items-center">
                    <span className="inline-block w-5 h-5 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center mr-2">?</span>
                    <span>Answer reflection questions to help us personalize your experience</span>
                  </li>
                </ul>
                {!currentUser && (
                  <p className="mt-3 text-sm text-primary-blue">
                    <strong>Sign in</strong> to save your preferences and get personalized recommendations!
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Main video feed */}
        <InfiniteVideoFeed />
      </motion.div>
    </div>
  );
};

export default VideoExploration;
