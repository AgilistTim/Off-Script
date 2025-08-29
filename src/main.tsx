
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Import Firebase services to trigger automatic initialization
import './services/firebase';

console.log('🚀 Firebase initialized, starting React app...');

// Enable audio initialization for voice features
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as any).__ALLOW_AUDIO_INIT = true;
}

// Development-time instrumentation: detect any code that requests microphone
// permissions or constructs MediaRecorder so we can trace the exact call site.
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  try {
    const originalGetUserMedia = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
    if (originalGetUserMedia) {
      navigator.mediaDevices.getUserMedia = async function (constraints: any) {
        const stack = new Error().stack || '';
        console.debug('[dev-instrument] navigator.mediaDevices.getUserMedia called', { constraints, ts: new Date().toISOString(), stack });
        const allow = (window as any).__ALLOW_AUDIO_INIT === true;
        if (!allow) {
          console.warn('[dev-instrument] Blocking getUserMedia: audio init not allowed (global guard)');
          // Reject to avoid browser permission prompt and surface the call site
          const err: any = new DOMException('Audio init disallowed in current mode', 'NotAllowedError');
          err.stack = stack;
          return Promise.reject(err);
        }
        return originalGetUserMedia(constraints);
      } as any;
    }

    // Wrap MediaRecorder constructor
    const OriginalMediaRecorder = (window as any).MediaRecorder;
    if (OriginalMediaRecorder) {
      (window as any).MediaRecorder = function (stream: MediaStream, options?: any) {
        const stack = new Error().stack || '';
        console.debug('[dev-instrument] MediaRecorder constructed', { options, ts: new Date().toISOString(), stack });
        // @ts-ignore - forward to original
        return new OriginalMediaRecorder(stream, options);
      } as any;
      // copy static properties if any
      try {
        Object.assign((window as any).MediaRecorder, OriginalMediaRecorder);
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {
    console.warn('Dev instrumentation failed:', e);
  }
}

// Render the React app - Firebase is now initialized synchronously
createRoot(document.getElementById('root')!).render(
  // Temporarily disable StrictMode to prevent ElevenLabs WebSocket conflicts
  // <StrictMode>
    <App />
  // </StrictMode>
);
