import { useState, useCallback, useRef, useEffect } from 'react';
import { useReactMediaRecorder } from 'react-media-recorder';
import { voiceService } from '../services/voiceService';

export interface VoiceRecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  isPlaying: boolean;
  recordingDuration: number;
  transcript: string;
  audioUrl: string | null;
  error: string | null;
  recordingLevel: number;
}

export interface VoiceRecordingControls {
  startRecording: () => void;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  playback: () => Promise<void>;
  clearRecording: () => void;
  convertToText: () => Promise<void>;
  generateSpeech: (text: string) => Promise<void>;
}

export interface UseVoiceRecordingOptions {
  onTranscriptReady?: (transcript: string) => void;
  onSpeechGenerated?: (audioUrl: string) => void;
  onError?: (error: string) => void;
  autoConvertToText?: boolean;
  enableRealTimeLevel?: boolean;
  maxRecordingTime?: number; // in milliseconds
}

export function useVoiceRecording(options: UseVoiceRecordingOptions = {}) {
  console.debug(`[useVoiceRecording] initialized ts=${new Date().toISOString()}`)
  const {
    onTranscriptReady,
    onSpeechGenerated,
    onError,
    autoConvertToText = true,
    enableRealTimeLevel = true,
    maxRecordingTime = 30000 // 30 seconds default
  } = options;

  const [state, setState] = useState<VoiceRecordingState>({
    isRecording: false,
    isProcessing: false,
    isPlaying: false,
    recordingDuration: 0,
    transcript: '',
    audioUrl: null,
    error: null,
    recordingLevel: 0
  });

  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const allowAudioInit = typeof window !== 'undefined' && (window as any).__ALLOW_AUDIO_INIT === true;

  const audioOption = allowAudioInit
    ? {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100
      }
    : false;

  const {
    status,
    startRecording: startMediaRecording,
    stopRecording: stopMediaRecording,
    pauseRecording: pauseMediaRecording,
    resumeRecording: resumeMediaRecording,
    mediaBlobUrl,
    clearBlobUrl,
    previewStream
  } = useReactMediaRecorder({
    audio: audioOption,
    onStart: () => {
      setState(prev => ({ 
        ...prev, 
        isRecording: true, 
        error: null,
        recordingDuration: 0 
      }));
      recordingStartTimeRef.current = Date.now();
      
      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        const duration = Date.now() - recordingStartTimeRef.current;
        setState(prev => ({ ...prev, recordingDuration: duration }));
        
        // Auto-stop if max time reached
        if (duration >= maxRecordingTime) {
          stopRecording();
        }
      }, 100);

      // Set up audio level monitoring
      if (enableRealTimeLevel && previewStream) {
        setupAudioLevelMonitoring(previewStream);
      }
    },
    onStop: async (blobUrl, blob) => {
      setState(prev => ({ ...prev, isRecording: false, audioUrl: blobUrl }));
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      // Clean up audio monitoring
      cleanupAudioMonitoring();

      // Auto-convert to text if enabled
      if (autoConvertToText && blob) {
        await convertBlobToText(blob);
      }
    }
  });

  // Log when previewStream becomes available so we can trace when audio plumbing
  // is initialized relative to conversation.startSession
  useEffect(() => {
    if (previewStream) {
      console.debug(`[useVoiceRecording] previewStream available ts=${new Date().toISOString()}`, previewStream);
    } else {
      console.debug(`[useVoiceRecording] previewStream cleared or not available ts=${new Date().toISOString()}`);
    }
  }, [previewStream]);

  // Handle media recorder errors by monitoring status
  useEffect(() => {
    if (status.includes('error') || status === 'media_aborted' || status === 'permission_denied') {
      const errorMessage = `Recording error: ${status}`;
      setState(prev => ({ ...prev, error: errorMessage, isRecording: false }));
      onError?.(errorMessage);
    }
  }, [status, onError]);

  // Set up real-time audio level monitoring
  const setupAudioLevelMonitoring = useCallback((stream: MediaStream) => {
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      const updateLevel = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const normalizedLevel = average / 255;
        
        setState(prev => ({ ...prev, recordingLevel: normalizedLevel }));
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
    } catch (error) {
      console.warn('Audio level monitoring setup failed:', error);
    }
  }, []);

  // Clean up audio monitoring
  const cleanupAudioMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    setState(prev => ({ ...prev, recordingLevel: 0 }));
  }, []);

  // Convert audio blob to text
  const convertBlobToText = useCallback(async (blob: Blob) => {
    setState(prev => ({ ...prev, isProcessing: true }));
    
    try {
      const transcript = await voiceService.speechToText(blob);
      setState(prev => ({ ...prev, transcript, isProcessing: false }));
      onTranscriptReady?.(transcript);
    } catch (error) {
      const errorMessage = `Speech-to-text failed: ${error}`;
      setState(prev => ({ ...prev, error: errorMessage, isProcessing: false }));
      onError?.(errorMessage);
    }
  }, [onTranscriptReady, onError]);

  // Start recording
  const startRecording = useCallback(() => {
    if (status === 'idle') {
      setState(prev => ({ ...prev, error: null, transcript: '' }));
      startMediaRecording();
    }
  }, [status, startMediaRecording]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (status === 'recording') {
      stopMediaRecording();
    }
  }, [status, stopMediaRecording]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (status === 'recording') {
      pauseMediaRecording();
    }
  }, [status, pauseMediaRecording]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (status === 'paused') {
      resumeMediaRecording();
    }
  }, [status, resumeMediaRecording]);

  // Play back recorded audio
  const playback = useCallback(async () => {
    if (!mediaBlobUrl) return;
    
    setState(prev => ({ ...prev, isPlaying: true }));
    
    try {
      await voiceService.playAudio(mediaBlobUrl);
    } catch (error) {
      const errorMessage = `Playback failed: ${error}`;
      setState(prev => ({ ...prev, error: errorMessage }));
      onError?.(errorMessage);
    } finally {
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, [mediaBlobUrl, onError]);

  // Clear recording
  const clearRecording = useCallback(() => {
    clearBlobUrl();
    setState(prev => ({
      ...prev,
      audioUrl: null,
      transcript: '',
      error: null,
      recordingDuration: 0,
      recordingLevel: 0
    }));
  }, [clearBlobUrl]);

  // Convert text to speech using voice service
  const generateSpeech = useCallback(async (text: string) => {
    setState(prev => ({ ...prev, isProcessing: true }));
    
    try {
      const result = await voiceService.textToSpeech(text);
      setState(prev => ({ ...prev, isProcessing: false }));
      onSpeechGenerated?.(result.audioUrl);
      
      // Auto-play generated speech
      await voiceService.playAudio(result.audioUrl);
    } catch (error) {
      const errorMessage = `Speech generation failed: ${error}`;
      setState(prev => ({ ...prev, error: errorMessage, isProcessing: false }));
      onError?.(errorMessage);
    }
  }, [onSpeechGenerated, onError]);

  // Manual transcript conversion
  const convertToText = useCallback(async () => {
    if (!mediaBlobUrl) return;
    
    try {
      const response = await fetch(mediaBlobUrl);
      const blob = await response.blob();
      await convertBlobToText(blob);
    } catch (error) {
      const errorMessage = `Failed to convert recording: ${error}`;
      setState(prev => ({ ...prev, error: errorMessage }));
      onError?.(errorMessage);
    }
  }, [mediaBlobUrl, convertBlobToText, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      cleanupAudioMonitoring();
      voiceService.cleanup();
    };
  }, [cleanupAudioMonitoring]);

  // Update state based on media recorder status
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isRecording: status === 'recording',
      audioUrl: mediaBlobUrl
    }));
  }, [status, mediaBlobUrl]);

  const controls: VoiceRecordingControls = {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    playback,
    clearRecording,
    convertToText,
    generateSpeech
  };

  return {
    state,
    controls,
    status,
    previewStream
  };
}

export default useVoiceRecording; 