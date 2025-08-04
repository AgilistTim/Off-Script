import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Import Firebase services to trigger automatic initialization
import './services/firebase';

console.log('🚀 Firebase initialized, starting React app...');

// Render the React app - Firebase is now initialized synchronously
createRoot(document.getElementById('root')!).render(
  // Temporarily disable StrictMode to prevent ElevenLabs WebSocket conflicts
  // <StrictMode>
    <App />
  // </StrictMode>
);
