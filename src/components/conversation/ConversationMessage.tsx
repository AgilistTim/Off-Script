import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Message } from '../ui/chat-message';
import { voiceService } from '../../services/voiceService';

// Extended message interface for conversation messages
interface ConversationMessage extends Message {
  audioUrl?: string;
  timestamp?: Date;
  metadata?: {
    careerInsight?: string;
    confidence?: number;
    voiceGenerated?: boolean;
    personaType?: string;
    source?: 'voice' | 'text' | 'elevenlabs';
    actionRequired?: string;
  };
}

export interface ConversationMessageProps {
  message: ConversationMessage;
  isVoiceEnabled?: boolean;
  className?: string;
}

export const ConversationMessage = React.forwardRef<HTMLDivElement, ConversationMessageProps>(({
  message,
  isVoiceEnabled = true,
  className = ''
}, ref) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleTextToSpeech = async () => {
    if (isPlayingAudio) return;

    try {
      setIsPlayingAudio(true);
      
      let audioUrl = message.audioUrl || generatedAudioUrl;
      
      // Generate speech if not already available
      if (!audioUrl) {
        const result = await voiceService.textToSpeech(message.content);
        audioUrl = result.audioUrl;
        setGeneratedAudioUrl(audioUrl);
      }
      
      // Play the audio
      await voiceService.playAudio(audioUrl);
    } catch (error) {
      console.error('Text-to-speech failed:', error);
    } finally {
      setIsPlayingAudio(false);
    }
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-gray-500';
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getInsightIcon = (insight?: string) => {
    switch (insight) {
      case 'immediate_engagement':
        return '🎯';
      case 'strength_identification':
        return '💪';
      case 'career_matching':
        return '🔍';
      case 'market_analysis':
        return '📊';
      case 'system_message':
        return 'ℹ️';
      default:
        return '💬';
    }
  };

  return (
    <motion.div
      ref={ref}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${className}`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.3,
        ease: "easeOut"
      }}
      layout
    >
      <div 
        className={`max-w-[85%] md:max-w-[70%] ${
          isUser 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-100 text-gray-900'
        } rounded-2xl px-4 py-3 shadow-sm`}
      >
        {/* Message header for assistant messages */}
        {isAssistant && message.metadata && (
          <div className="flex items-center space-x-2 mb-2 text-xs text-gray-500">
            <span>{getInsightIcon(message.metadata.careerInsight)}</span>
            {message.metadata.careerInsight && (
              <span className="capitalize">
                {message.metadata.careerInsight.replace('_', ' ')}
              </span>
            )}
            {message.metadata.confidence && (
              <span className={`font-medium ${getConfidenceColor(message.metadata.confidence)}`}>
                {Math.round(message.metadata.confidence * 100)}% confidence
              </span>
            )}
          </div>
        )}

        {/* Message content */}
        <div className="text-sm md:text-base leading-relaxed">
          {message.content}
        </div>

        {/* Voice indicator for user messages */}
        {isUser && message.metadata?.voiceGenerated && (
          <div className="flex items-center space-x-1 mt-2 text-xs opacity-75">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
            <span>Voice message</span>
          </div>
        )}

        {/* Message footer */}
        <div className={`flex items-center justify-between mt-2 text-xs ${
          isUser ? 'text-blue-100' : 'text-gray-500'
        }`}>
          <span>{formatTime(message.timestamp)}</span>
          
          {/* Voice playback button for assistant messages */}
          {isAssistant && isVoiceEnabled && (
            <motion.button
              onClick={handleTextToSpeech}
              disabled={isPlayingAudio}
              className={`flex items-center space-x-1 p-1 rounded ${
                isPlayingAudio 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'hover:bg-gray-200 text-gray-600'
              } transition-colors`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isPlayingAudio ? (
                <motion.div
                  className="w-3 h-3"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <svg fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                  </svg>
                </motion.div>
              ) : (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
              )}
              <span className="sr-only">Play message</span>
            </motion.button>
          )}
        </div>

        {/* Action required indicator */}
        {message.metadata?.actionRequired && (
          <motion.div
            className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center space-x-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span className="font-medium">
                {message.metadata.actionRequired.replace('_', ' ')}
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
});

ConversationMessage.displayName = 'ConversationMessage';

export default ConversationMessage; 