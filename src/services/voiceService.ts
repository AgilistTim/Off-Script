import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

// Lazy initialization of ElevenLabs client
let elevenLabsClient: ElevenLabsClient | null = null;

const getElevenLabsClient = (): ElevenLabsClient => {
  if (!elevenLabsClient) {
    // Try multiple environment variable formats
    let apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
    
    if (!apiKey && import.meta.env.eleven_labs_key) {
      // Handle URL-encoded key and remove trailing %
      apiKey = import.meta.env.eleven_labs_key.replace(/%+$/, '');
    }
    
    if (!apiKey) {
      throw new Error('ElevenLabs API key not configured. Please set VITE_ELEVENLABS_API_KEY or eleven_labs_key');
    }
    
    elevenLabsClient = new ElevenLabsClient({
      apiKey: apiKey,
    });
  }
  return elevenLabsClient;
};

// Voice configuration for career guidance - using a professional, friendly voice
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel voice - clear, professional
const CONVERSATION_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Sarah voice - warm, conversational

export interface VoiceSettings {
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
}

// Optimized voice settings for career conversations
const CAREER_VOICE_SETTINGS: VoiceSettings = {
  stability: 0.75, // Slightly lower for more natural variation
  similarityBoost: 0.85, // High clarity for professional guidance
  style: 0.25, // Moderate style for engaging but professional tone
  useSpeakerBoost: true
};

export interface TextToSpeechOptions {
  voiceId?: string;
  settings?: Partial<VoiceSettings>;
  modelId?: string;
}

export interface SpeechResult {
  audioBlob: Blob;
  audioUrl: string;
  duration?: number;
}

class VoiceService {
  private audioContext: AudioContext | null = null;
  private isInitialized = false;

  constructor() {
    this.initializeAudioContext();
  }

  private async initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.isInitialized = true;
    } catch (error) {
      console.warn('Audio context initialization failed:', error);
    }
  }

  /**
   * Convert text to speech with optimized settings for career guidance
   */
  async textToSpeech(
    text: string, 
    options: TextToSpeechOptions = {}
  ): Promise<SpeechResult> {
    try {
      const client = getElevenLabsClient();
      const voiceId = options.voiceId || CONVERSATION_VOICE_ID;
      const settings = { ...CAREER_VOICE_SETTINGS, ...options.settings };
      
      // Convert text to speech - returns ReadableStream<Uint8Array>
      const audioStream = await client.textToSpeech.convert(voiceId, {
        text,
        voiceSettings: settings,
        modelId: options.modelId || "eleven_multilingual_v2",
        outputFormat: "mp3_44100_128"
      });

      // Convert ReadableStream to blob
      const chunks: Uint8Array[] = [];
      const reader = audioStream.getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }

      // Create blob from all chunks
      const audioBlob = new Blob(chunks as BlobPart[], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);

      return {
        audioBlob,
        audioUrl,
        duration: await this.getAudioDuration(audioBlob)
      };
    } catch (error) {
      console.error('Text-to-speech conversion failed:', error);
      throw new Error(`Failed to convert text to speech: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get audio duration from blob
   */
  private async getAudioDuration(audioBlob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
        URL.revokeObjectURL(audio.src);
      });
      audio.addEventListener('error', () => {
        resolve(0);
      });
      audio.src = URL.createObjectURL(audioBlob);
    });
  }

  /**
   * Convert speech to text using ElevenLabs Speech-to-Text
   */
  async speechToText(audioBlob: Blob): Promise<string> {
    try {
      // Note: ElevenLabs doesn't have direct speech-to-text in the JS SDK yet
      // For now, we'll use the Web Speech API as fallback
      return await this.webSpeechToText(audioBlob);
    } catch (error) {
      console.error('Speech-to-text conversion failed:', error);
      throw new Error('Failed to convert speech to text');
    }
  }

  /**
   * Fallback speech-to-text using Web Speech API
   */
  private async webSpeechToText(audioBlob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };

      recognition.onerror = (event: any) => {
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      recognition.onend = () => {
        // If no result was captured, resolve with empty string
        resolve('');
      };

      // Create audio element to play the blob for recognition
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.onplay = () => {
        recognition.start();
      };
      audio.play();
    });
  }

  /**
   * Play audio with enhanced controls for conversation UI
   */
  async playAudio(audioUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      
      audio.addEventListener('ended', () => resolve());
      audio.addEventListener('error', (e) => reject(e));
      
      // Enhanced audio settings for better voice clarity
      if (this.audioContext) {
        try {
          const source = this.audioContext.createMediaElementSource(audio);
          const gainNode = this.audioContext.createGain();
          
          // Slight boost for voice frequencies
          gainNode.gain.value = 1.1;
          
          source.connect(gainNode);
          gainNode.connect(this.audioContext.destination);
        } catch (error) {
          console.warn('Audio enhancement failed, using default playback:', error);
        }
      }
      
      audio.play().catch(reject);
    });
  }

  /**
   * Get available voices for user selection
   */
  async getAvailableVoices(): Promise<any[]> {
    try {
      const client = getElevenLabsClient();
      const response = await client.voices.getAll();
      return response.voices || [];
    } catch (error) {
      console.error('Failed to fetch voices:', error);
      return [];
    }
  }

  /**
   * Generate voice preview for voice selection
   */
  async generateVoicePreview(voiceId: string, text: string = "Hello! I'm here to help guide your career journey."): Promise<string> {
    try {
      const result = await this.textToSpeech(text, { voiceId });
      return result.audioUrl;
    } catch (error) {
      console.error('Voice preview generation failed:', error);
      throw error;
    }
  }

  /**
   * Clean up audio resources
   */
  cleanup() {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

// Export singleton instance
export const voiceService = new VoiceService();

// Export types and constants
export { DEFAULT_VOICE_ID, CONVERSATION_VOICE_ID, CAREER_VOICE_SETTINGS };
export default voiceService; 