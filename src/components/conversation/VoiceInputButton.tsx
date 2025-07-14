import React from 'react';
import { motion } from 'framer-motion';
import { VoiceRecordingState, VoiceRecordingControls } from '../../hooks/use-voice-recording';

export interface VoiceInputButtonProps {
  voiceState: VoiceRecordingState;
  voiceControls: VoiceRecordingControls;
  onClose: () => void;
  className?: string;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  voiceState,
  voiceControls,
  onClose,
  className = ''
}) => {
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const getButtonState = () => {
    if (voiceState.isProcessing) return 'processing';
    if (voiceState.isRecording) return 'recording';
    return 'idle';
  };

  const handleMainButtonClick = () => {
    const state = getButtonState();
    if (state === 'idle') {
      voiceControls.startRecording();
    } else if (state === 'recording') {
      voiceControls.stopRecording();
    }
  };

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* Audio level visualization */}
      {voiceState.isRecording && (
        <motion.div 
          className="flex items-center justify-center space-x-1 h-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-1 bg-red-500 rounded-full"
              animate={{
                height: [4, 8 + (voiceState.recordingLevel * 20), 4],
                backgroundColor: voiceState.recordingLevel > 0.1 ? '#ef4444' : '#9ca3af'
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                delay: i * 0.1
              }}
            />
          ))}
        </motion.div>
      )}

      {/* Main voice button */}
      <motion.button
        onClick={handleMainButtonClick}
        disabled={voiceState.isProcessing}
        className="relative w-20 h-20 rounded-full focus:outline-none focus:ring-4 focus:ring-blue-300"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          backgroundColor: getButtonState() === 'recording' ? '#ef4444' : '#3b82f6',
          scale: voiceState.isRecording ? [1, 1.1, 1] : 1
        }}
        transition={{
          backgroundColor: { duration: 0.2 },
          scale: { duration: 0.8, repeat: voiceState.isRecording ? Infinity : 0 }
        }}
      >
        {voiceState.isProcessing ? (
          <motion.div
            className="w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        ) : (
          <svg 
            className="w-8 h-8 text-white mx-auto" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            {voiceState.isRecording ? (
              <rect x="6" y="6" width="12" height="12" rx="2" strokeWidth={2} fill="currentColor" />
            ) : (
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
              />
            )}
          </svg>
        )}

        {/* Recording pulse animation */}
        {voiceState.isRecording && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-red-400"
            animate={{
              scale: [1, 1.3],
              opacity: [0.7, 0]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeOut"
            }}
          />
        )}
      </motion.button>

      {/* Status text and controls */}
      <div className="text-center space-y-2">
        {voiceState.isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-600 font-medium"
          >
            Recording: {formatDuration(voiceState.recordingDuration)}
          </motion.div>
        )}

        {voiceState.isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-blue-600 font-medium"
          >
            Processing your voice...
          </motion.div>
        )}

        {voiceState.transcript && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-gray-700 text-sm bg-gray-100 rounded-lg p-3 max-w-xs"
          >
            "{voiceState.transcript}"
          </motion.div>
        )}

        {voiceState.error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-600 text-sm bg-red-50 rounded-lg p-3 max-w-xs"
          >
            {voiceState.error}
          </motion.div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-center space-x-3 mt-4">
          {voiceState.audioUrl && !voiceState.isRecording && !voiceState.isProcessing && (
            <motion.button
              onClick={voiceControls.playback}
              disabled={voiceState.isPlaying}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-300 disabled:opacity-50"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {voiceState.isPlaying ? 'Playing...' : 'Play Back'}
            </motion.button>
          )}

          <motion.button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Close
          </motion.button>

          {voiceState.audioUrl && (
            <motion.button
              onClick={voiceControls.clearRecording}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-medium hover:bg-red-200"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Clear
            </motion.button>
          )}
        </div>
      </div>

      {/* Instruction text */}
      <motion.p
        className="text-gray-500 text-sm text-center max-w-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {voiceState.isRecording 
          ? "Tap the red button to stop recording"
          : voiceState.isProcessing
          ? "Converting your speech to text..."
          : "Tap the blue button to start recording"
        }
      </motion.p>
    </div>
  );
};

export default VoiceInputButton; 