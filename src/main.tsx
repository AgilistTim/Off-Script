import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initFirebase } from './services/firebase';

// Initialize Firebase before starting the React app
(async () => {
  try {
    await initFirebase();
    console.log('🚀 Firebase initialized, starting React app...');
    
    createRoot(document.getElementById('root')!).render(
      // Temporarily disable StrictMode to prevent ElevenLabs WebSocket conflicts
      // <StrictMode>
        <App />
      // </StrictMode>
    );
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error);
    
    // Show error to user instead of broken app
    const rootElement = document.getElementById('root')!;
    rootElement.innerHTML = `
      <div style="
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: center; 
        height: 100vh; 
        font-family: system-ui, -apple-system, sans-serif;
        background: #1a1a1a;
        color: white;
        text-align: center;
        padding: 20px;
      ">
        <h1 style="color: #ef4444; margin-bottom: 16px;">⚠️ Initialization Error</h1>
        <p style="margin-bottom: 16px;">Unable to initialize the application.</p>
        <p style="font-size: 14px; color: #999;">Check your environment configuration and try refreshing the page.</p>
        <button 
          onclick="window.location.reload()" 
          style="
            margin-top: 20px; 
            padding: 10px 20px; 
            background: #3b82f6; 
            color: white; 
            border: none; 
            border-radius: 6px; 
            cursor: pointer;
          "
        >
          Retry
        </button>
      </div>
    `;
  }
})();
