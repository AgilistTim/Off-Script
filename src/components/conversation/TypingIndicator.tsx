import React from 'react';
import { motion } from 'framer-motion';

export interface TypingIndicatorProps {
  className?: string;
  message?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  className = '',
  message = 'AI is thinking...'
}) => {
  return (
    <motion.div
      className={`flex justify-start ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-gray-100 rounded-2xl px-4 py-3 shadow-sm max-w-[85%] md:max-w-[70%]">
        <div className="flex items-center space-x-2">
          {/* AI Avatar */}
          <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-medium">AI</span>
          </div>
          
          {/* Typing animation */}
          <div className="flex items-center space-x-1">
            <motion.div
              className="w-2 h-2 bg-gray-400 rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.div
              className="w-2 h-2 bg-gray-400 rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.2
              }}
            />
            <motion.div
              className="w-2 h-2 bg-gray-400 rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.4
              }}
            />
          </div>
          
          {/* Optional message */}
          <motion.span
            className="text-gray-500 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {message}
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
};

export default TypingIndicator; 