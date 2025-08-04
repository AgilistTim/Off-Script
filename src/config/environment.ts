/**
 * Environment Configuration - Static Site Deployment Pattern
 * 
 * All environment variables are injected at BUILD TIME by Vite
 * Works with Render's static site deployment without runtime injection
 * No window.ENV or /environment.js needed
 */

// Type definitions for environment variables
export interface EnvironmentConfig {
  // Firebase configuration
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId: string;
  };
  
  // API keys
  apiKeys: {
    youtube?: string;
    recaptcha?: string;
    openai?: string;
    bumpups?: string;
  };
  
  // ElevenLabs configuration
  elevenLabs: {
    apiKey?: string;
    agentId?: string;
  };
  
  // Perplexity configuration
  perplexity: {
    apiKey?: string;
  };
  
  // API endpoints
  apiEndpoints: {
    bumpupsProxy?: string;
    openaiAssistant?: string;
    mcpServer?: string;
  };
  
  // Environment and features
  environment: string;
  features: {
    voiceChat: boolean;
    careerGuidance: boolean;
    videoRecommendations: boolean;
    adminPanel: boolean;
    enableYouTubeIntegration: boolean;
    enableBumpupsIntegration: boolean;
    enablePerplexityEnhancement: boolean;
  };
}

/**
 * Validate that critical environment variables are available
 */
function validateCriticalEnvVars() {
  const criticalVars = {
    'VITE_FIREBASE_API_KEY': import.meta.env.VITE_FIREBASE_API_KEY,
    'VITE_FIREBASE_PROJECT_ID': import.meta.env.VITE_FIREBASE_PROJECT_ID,
    'VITE_FIREBASE_AUTH_DOMAIN': import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  };

  const missing = Object.entries(criticalVars)
    .filter(([key, value]) => !value || value === 'undefined')
    .map(([key]) => key);

  if (missing.length > 0) {
    console.error('❌ Missing critical environment variables:', missing);
    console.error('🔍 Current environment:', import.meta.env.MODE);
    console.error('📋 Available VITE_ vars:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));
    
    if (import.meta.env.MODE === 'production') {
      throw new Error(`Missing required environment variables in production: ${missing.join(', ')}`);
    }
  }
}

// Validate environment immediately
validateCriticalEnvVars();

/**
 * Environment configuration using Vite's build-time injection
 * All VITE_ prefixed variables are injected at build time by Render
 */
export const environmentConfig: EnvironmentConfig = {
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
  },
  
  apiKeys: {
    youtube: import.meta.env.VITE_YOUTUBE_API_KEY,
    recaptcha: import.meta.env.VITE_RECAPTCHA_SITE_KEY,
    openai: import.meta.env.VITE_OPENAI_API_KEY,
    bumpups: import.meta.env.VITE_BUMPUPS_API_KEY,
  },
  
  elevenLabs: {
    apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY,
    agentId: import.meta.env.VITE_ELEVENLABS_AGENT_ID,
  },
  
  perplexity: {
    apiKey: import.meta.env.VITE_PERPLEXITY_API_KEY,
  },
  
  apiEndpoints: {
    bumpupsProxy: import.meta.env.VITE_BUMPUPS_PROXY_URL,
    openaiAssistant: import.meta.env.VITE_OPENAI_ASSISTANT_URL,
    mcpServer: import.meta.env.VITE_MCP_SERVER_URL,
  },
  
  environment: import.meta.env.MODE || 'development',
  
  features: {
    voiceChat: true,
    careerGuidance: true,
    videoRecommendations: true,
    adminPanel: import.meta.env.MODE === 'development',
    enableYouTubeIntegration: true,
    enableBumpupsIntegration: true,
    enablePerplexityEnhancement: true,
  },
};

/**
 * Firebase configuration object - ready for direct use with Firebase SDK
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

/**
 * Environment flags for convenience
 */
export const isProduction = import.meta.env.MODE === 'production';
export const isDevelopment = import.meta.env.MODE === 'development';
export const isTest = import.meta.env.MODE === 'test';

/**
 * Check if a value is a placeholder (for testing purposes)
 */
export const isPlaceholder = (value: string): boolean => {
  if (!value || value.trim() === '') return true;
  
  const placeholderPatterns = [
    /^YOUR_/i,
    /^your-/i,
    /^REPLACE_WITH_/i,
    /^placeholder/i,
    /^demo-/i,
    /^__.*__$/,
    /^G-YOUR-/i,
    /^0+$/,
  ];
  
  return placeholderPatterns.some(pattern => pattern.test(value));
};

// Environment validation handled by validateCriticalEnvVars() above

// Backward-compatible named exports for existing services
export const getEnvironmentConfig = () => environmentConfig;
export const apiKeys = environmentConfig.apiKeys;
export const features = environmentConfig.features;
export const elevenLabs = environmentConfig.elevenLabs;
export const perplexity = environmentConfig.perplexity;
export const env = environmentConfig;

// Default export for convenience
export default environmentConfig;