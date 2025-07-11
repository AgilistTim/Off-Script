/**
 * Centralized configuration service for environment variables
 * 
 * This module provides a unified way to access environment variables across the application,
 * with proper validation, type checking, and fallback mechanisms.
 */

// Environment detection for internal use
const _isProduction = import.meta.env.MODE === 'production';
const _isDevelopment = import.meta.env.MODE === 'development' || !import.meta.env.MODE;
const _isTest = import.meta.env.MODE === 'test';

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
    bumpups?: string;
    // SECURITY NOTE: Sensitive API keys (bumpups, openai, webshare) are NOT exposed client-side
    // These are handled securely in Firebase Functions server-side
  };
  
  // API endpoints
  apiEndpoints: {
    bumpupsProxy?: string;
    openaiAssistant?: string;
  };
  
  // Runtime environment
  environment: 'development' | 'production' | 'test';
  
  // Feature flags
  features: {
    enableAnalytics: boolean;
    enableYouTubeIntegration: boolean;
    enableBumpupsIntegration: boolean;
    enableOpenAIAssistant: boolean;
  };
}

/**
 * Helper function to check if a value is a placeholder or invalid
 */
export const isPlaceholder = (value: string): boolean => {
  if (!value || typeof value !== 'string') return true;
  
  return value.includes('YOUR_') || 
         value.includes('your-') || 
         value === '000000000000' || 
         value.includes('G-YOUR-') || 
         value.includes('__FIREBASE_') ||
         value.includes('demo-') ||
         value.includes('REPLACE_WITH_') ||
         value.includes('placeholder') ||
         value === 'NOT_SET' ||
         value.includes('NOT_SET');
};

/**
 * Get environment variables from Vite's import.meta.env
 */
const getViteEnvironment = (): Partial<EnvironmentConfig> => {
  return {
    firebase: {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
      appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string,
    },
    apiKeys: {
      youtube: import.meta.env.VITE_YOUTUBE_API_KEY as string,
      recaptcha: import.meta.env.VITE_RECAPTCHA_SITE_KEY as string,
      // SECURITY: bumpups API key excluded from client-side for security
      // bumpups, openai, and webshare keys are handled server-side in Firebase Functions
    },
    apiEndpoints: {
      bumpupsProxy: import.meta.env.VITE_BUMPUPS_PROXY_URL as string,
      openaiAssistant: import.meta.env.VITE_OPENAI_ASSISTANT_URL as string,
    },
    environment: (import.meta.env.MODE || 'development') as 'development' | 'production' | 'test',
  };
};

/**
 * Get environment variables from window.ENV (runtime configuration)
 */
const getWindowEnvironment = (): Partial<EnvironmentConfig> => {
  if (typeof window === 'undefined' || !window.ENV) {
    return {};
  }
  
  return {
    firebase: {
      apiKey: window.ENV.VITE_FIREBASE_API_KEY,
      authDomain: window.ENV.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: window.ENV.VITE_FIREBASE_PROJECT_ID,
      storageBucket: window.ENV.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: window.ENV.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: window.ENV.VITE_FIREBASE_APP_ID,
      measurementId: window.ENV.VITE_FIREBASE_MEASUREMENT_ID,
    },
    apiKeys: {
      youtube: window.ENV.VITE_YOUTUBE_API_KEY,
      recaptcha: window.ENV.VITE_RECAPTCHA_SITE_KEY,
      // SECURITY: bumpups API key excluded from client-side runtime config
    },
    apiEndpoints: {
      bumpupsProxy: window.ENV.VITE_BUMPUPS_PROXY_URL,
      // openaiAssistant endpoint can stay as it's just a URL
    },
  };
};

/**
 * Validate Firebase configuration
 */
const validateFirebaseConfig = (config: EnvironmentConfig['firebase']): boolean => {
  const required = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId'];
  
  for (const key of required) {
    const value = config[key as keyof typeof config];
    if (!value || isPlaceholder(value)) {
      console.error(`❌ Missing or invalid Firebase configuration: ${key}`);
      return false;
    }
  }
  
  // Measurement ID is optional - just warn if it's missing or a placeholder
  if (!config.measurementId || isPlaceholder(config.measurementId)) {
    console.warn(`⚠️ Firebase Analytics measurement ID is missing or invalid - analytics will be disabled`);
  }
  
  return true;
};

/**
 * Determine feature flags based on configuration
 */
const determineFeatureFlags = (config: Partial<EnvironmentConfig>): EnvironmentConfig['features'] => {
  return {
    // Enable analytics in production only, unless explicitly configured
    enableAnalytics: config.features?.enableAnalytics ?? _isProduction,
    
    // Enable YouTube integration if API key is available
    enableYouTubeIntegration: config.features?.enableYouTubeIntegration ?? 
      Boolean(config.apiKeys?.youtube),
    
    // Enable Bumpups integration if proxy endpoint is available
    enableBumpupsIntegration: config.features?.enableBumpupsIntegration ?? 
      Boolean(config.apiEndpoints?.bumpupsProxy),
      
    // Enable OpenAI Assistant if endpoint is available
    enableOpenAIAssistant: config.features?.enableOpenAIAssistant ?? 
      Boolean(config.apiEndpoints?.openaiAssistant)
  };
};

/**
 * Generate API endpoints based on configuration
 */
const generateApiEndpoints = (config: Partial<EnvironmentConfig>): EnvironmentConfig['apiEndpoints'] => {
  const endpoints: EnvironmentConfig['apiEndpoints'] = {
    bumpupsProxy: config.apiEndpoints?.bumpupsProxy,
    openaiAssistant: config.apiEndpoints?.openaiAssistant
  };
  
  // Development: use local emulator for some, deployed for others with secret issues
  // Production: use environment variables or defaults
  if (_isDevelopment) {
    if (!endpoints.bumpupsProxy) {
      endpoints.bumpupsProxy = 'http://localhost:5001/offscript-8f6eb/us-central1/bumpupsProxy';
    }
    // Use deployed functions for OpenAI Assistant in development (emulator has secret issues)
    if (!endpoints.openaiAssistant) {
      endpoints.openaiAssistant = 'https://us-central1-offscript-8f6eb.cloudfunctions.net';
    }
  } else {
    // Production: ensure we have proper endpoints as fallbacks
    if (!endpoints.bumpupsProxy) {
      endpoints.bumpupsProxy = 'https://us-central1-offscript-8f6eb.cloudfunctions.net/bumpupsProxy';
    }
    if (!endpoints.openaiAssistant) {
      endpoints.openaiAssistant = 'https://us-central1-offscript-8f6eb.cloudfunctions.net';
    }
  }
  
  return endpoints;
};

/**
 * Get the environment configuration
 * 
 * This function prioritizes Vite environment variables (for development)
 * and falls back to window.ENV (for production) if needed.
 */
export const getEnvironmentConfig = (): EnvironmentConfig => {
  // First try Vite environment variables
  const viteConfig = getViteEnvironment();
  
  // Check if Firebase config from Vite is valid
  if (viteConfig.firebase && validateFirebaseConfig(viteConfig.firebase)) {
    console.log('✅ Using Vite environment variables');
    return {
      ...viteConfig,
      features: determineFeatureFlags(viteConfig),
      apiEndpoints: generateApiEndpoints(viteConfig),
      environment: viteConfig.environment || 'development',
    } as EnvironmentConfig;
  }
  
  // Fall back to window.ENV
  const windowConfig = getWindowEnvironment();
  
  // Check if Firebase config from window.ENV is valid
  if (windowConfig.firebase && validateFirebaseConfig(windowConfig.firebase)) {
    console.log('✅ Using window.ENV configuration');
    return {
      ...windowConfig,
      features: determineFeatureFlags(windowConfig),
      apiEndpoints: generateApiEndpoints(windowConfig),
      environment: viteConfig.environment || 'production',
    } as EnvironmentConfig;
  }
  
  // If we get here, we don't have valid configuration
  console.error('❌ No valid configuration found. The application will not function correctly.');
  console.error('Please check your environment variables or window.ENV configuration.');
  
  // Try to salvage what we can from available configs
  const fallbackConfig = { ...viteConfig, ...windowConfig };
  
  // Return a configuration that will fail gracefully but still provide some functionality
  return {
    firebase: {
      apiKey: fallbackConfig.firebase?.apiKey || 'MISSING_API_KEY',
      authDomain: fallbackConfig.firebase?.authDomain || 'MISSING_AUTH_DOMAIN',
      projectId: fallbackConfig.firebase?.projectId || 'MISSING_PROJECT_ID',
      storageBucket: fallbackConfig.firebase?.storageBucket || 'MISSING_STORAGE_BUCKET',
      messagingSenderId: fallbackConfig.firebase?.messagingSenderId || 'MISSING_MESSAGING_SENDER_ID',
      appId: fallbackConfig.firebase?.appId || 'MISSING_APP_ID',
      measurementId: fallbackConfig.firebase?.measurementId || 'MISSING_MEASUREMENT_ID',
    },
    apiKeys: {
      youtube: fallbackConfig.apiKeys?.youtube,
      recaptcha: fallbackConfig.apiKeys?.recaptcha,
      // SECURITY: Sensitive API keys not included in fallback config
    },
    apiEndpoints: generateApiEndpoints(fallbackConfig),
    environment: fallbackConfig.environment || 'development',
    features: determineFeatureFlags(fallbackConfig),
  };
};

// Create a singleton instance of the environment configuration
export const env = getEnvironmentConfig();

// Export individual parts of the configuration for convenience
export const firebaseConfig = env.firebase;
export const apiKeys = env.apiKeys;
export const apiEndpoints = env.apiEndpoints;
export const features = env.features;
export const environment = env.environment;

// Export a helper function to check if we're in production
export const isProduction = env.environment === 'production';
export const isDevelopment = env.environment === 'development';
export const isTest = env.environment === 'test';

// Export default configuration
export default env; 