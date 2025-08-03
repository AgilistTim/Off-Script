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
    openai?: string; // SECURITY WARNING: Exposed client-side for dashboard enhancement - consider server-side alternative
    // SECURITY NOTE: Sensitive API keys (bumpups, webshare) are NOT exposed client-side
    // These are handled securely in Firebase Functions server-side
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
  };
  
  // Runtime environment
  environment: 'development' | 'production' | 'test';
  
  // Feature flags
  features: {
    enableAnalytics: boolean;
    enableYouTubeIntegration: boolean;
    enableBumpupsIntegration: boolean;
    enableOpenAIAssistant: boolean;
    enableElevenLabsVoice: boolean;
    enablePerplexityEnhancement: boolean;
  };
}

/**
 * Helper function to check if a value is a placeholder or invalid
 * Enhanced to detect "undefined" strings and improve validation
 */
export const isPlaceholder = (value: string): boolean => {
  // Check for falsy values, non-strings, or empty strings
  if (!value || typeof value !== 'string' || value.trim() === '') {
    return true;
  }
  
  // Check for "undefined" string (caused by undefined variable expansion)
  if (value === 'undefined') {
    return true;
  }
  
  // Check for placeholder patterns
  return value.includes('YOUR_') || 
         value.includes('your-') || 
         value === '000000000000' || 
         value.includes('G-YOUR-') || 
         value.includes('__FIREBASE_') ||
         value.includes('__') ||  // Enhanced: catch any remaining placeholder patterns
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
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || undefined,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || undefined,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || undefined,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || undefined,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || undefined,
      appId: import.meta.env.VITE_FIREBASE_APP_ID || undefined,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
    },
    apiKeys: {
      youtube: import.meta.env.VITE_YOUTUBE_API_KEY || undefined,
      recaptcha: import.meta.env.VITE_RECAPTCHA_SITE_KEY || undefined,
      openai: import.meta.env.VITE_OPENAI_API_KEY || undefined,
      // SECURITY: bumpups and webshare API keys excluded from client-side for security
      // bumpups and webshare keys are handled server-side in Firebase Functions
    },
    elevenLabs: {
      apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY || undefined,
      agentId: import.meta.env.VITE_ELEVENLABS_AGENT_ID || undefined,
    },
    perplexity: {
      apiKey: import.meta.env.VITE_PERPLEXITY_API_KEY || undefined,
    },
    apiEndpoints: {
      bumpupsProxy: import.meta.env.VITE_BUMPUPS_PROXY_URL || undefined,
      openaiAssistant: import.meta.env.VITE_OPENAI_ASSISTANT_URL || undefined,
    },
    environment: (import.meta.env.MODE || 'development') as 'development' | 'production' | 'test',
  };
};

/**
 * Wait for window.ENV to be available with timeout
 */
const waitForWindowEnv = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // If window.ENV is already available, resolve immediately
    if (typeof window !== 'undefined' && (window as any).ENV) {
      resolve(true);
      return;
    }
    
    // Otherwise, poll for window.ENV with timeout
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds total (50 * 100ms)
    
    const checkEnv = () => {
      if (typeof window !== 'undefined' && (window as any).ENV) {
        resolve(true);
      } else if (attempts >= maxAttempts) {
        console.warn('⚠️ window.ENV not available after timeout, using fallback configuration');
        resolve(false);
      } else {
        attempts++;
        setTimeout(checkEnv, 100); // Check every 100ms
      }
    };
    
    checkEnv();
  });
};

/**
 * Get environment variables from window.ENV (runtime configuration)
 * Waits for window.ENV to be available to resolve race condition
 */
const getWindowEnvironment = async (): Promise<Partial<EnvironmentConfig>> => {
  const envAvailable = await waitForWindowEnv();
  
  if (!envAvailable || typeof window === 'undefined' || !(window as any).ENV) {
    return {};
  }
  
  return {
    firebase: {
      apiKey: (window as any).ENV.VITE_FIREBASE_API_KEY,
      authDomain: (window as any).ENV.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: (window as any).ENV.VITE_FIREBASE_PROJECT_ID,
      storageBucket: (window as any).ENV.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: (window as any).ENV.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: (window as any).ENV.VITE_FIREBASE_APP_ID,
      measurementId: (window as any).ENV.VITE_FIREBASE_MEASUREMENT_ID,
    },
    apiKeys: {
      youtube: (window as any).ENV.VITE_YOUTUBE_API_KEY,
      recaptcha: (window as any).ENV.VITE_RECAPTCHA_SITE_KEY,
      openai: (window as any).ENV.VITE_OPENAI_API_KEY,
      // SECURITY: bumpups API key excluded from client-side runtime config
    },
    elevenLabs: {
      apiKey: (window as any).ENV.VITE_ELEVENLABS_API_KEY || undefined,
      agentId: (window as any).ENV.VITE_ELEVENLABS_AGENT_ID || undefined,
    },
    perplexity: {
      apiKey: (window as any).ENV.VITE_PERPLEXITY_API_KEY || undefined,
    },
    apiEndpoints: {
      bumpupsProxy: (window as any).ENV.VITE_BUMPUPS_PROXY_URL,
      openaiAssistant: (window as any).ENV.VITE_OPENAI_ASSISTANT_URL || undefined,
      // openaiAssistant endpoint can stay as it's just a URL
    },
  };
};

/**
 * Validate Firebase configuration
 */
const validateFirebaseConfig = (config: EnvironmentConfig['firebase']): boolean => {
  const required = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId'];
  
  console.log('🔍 DEBUG: validateFirebaseConfig called', {
    configKeys: Object.keys(config),
    apiKeyValue: config.apiKey,
    apiKeyType: typeof config.apiKey,
    windowEnvExists: typeof window !== 'undefined' && !!window.ENV,
    windowEnvApiKey: typeof window !== 'undefined' && window.ENV ? (window as any).ENV.VITE_FIREBASE_API_KEY : 'WINDOW_NOT_AVAILABLE',
    caller: new Error().stack?.split('\n')[1]?.trim(),
  });
  
  for (const key of required) {
    const value = config[key as keyof typeof config];
    if (!value || isPlaceholder(value)) {
      console.error(`❌ Missing or invalid Firebase configuration: ${key}`, {
        key,
        value: value ? `"${value.substring(0, 20)}${value.length > 20 ? '...' : ''}"` : 'undefined',
        rawValue: value,
        isPlaceholder: isPlaceholder(value || ''),
        windowEnvExists: typeof window !== 'undefined' && !!window.ENV,
        windowEnvKeys: typeof window !== 'undefined' && window.ENV ? Object.keys((window as any).ENV) : 'N/A',
        windowEnvApiKey: typeof window !== 'undefined' && window.ENV ? (window as any).ENV.VITE_FIREBASE_API_KEY : 'WINDOW_NOT_AVAILABLE',
        viteEnvMode: import.meta.env.MODE,
        timestamp: new Date().toISOString(),
        caller: new Error().stack?.split('\n')[1]?.trim(),
      });
      return false;
    }
  }
  
  // Measurement ID is optional - just warn if it's missing or a placeholder
  if (!config.measurementId || isPlaceholder(config.measurementId)) {
    console.warn(`⚠️ Firebase Analytics measurement ID is missing or invalid - analytics will be disabled`);
  } else {
    console.log(`📊 Firebase Analytics configured with measurement ID: ${config.measurementId}`);
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
      Boolean(config.apiEndpoints?.openaiAssistant),

    // Enable ElevenLabs voice if API key and agent ID are available
    enableElevenLabsVoice: config.features?.enableElevenLabsVoice ?? 
      Boolean(config.elevenLabs?.apiKey && config.elevenLabs?.agentId),

    // Enable Perplexity enhancement if API key is available
    enablePerplexityEnhancement: config.features?.enablePerplexityEnhancement ?? 
      Boolean(config.perplexity?.apiKey),
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
 * Async function to get the environment configuration
 * Handles the window.ENV loading race condition properly
 */
export const initializeEnvironmentConfig = async (): Promise<EnvironmentConfig> => {
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
  
  // Fall back to window.ENV (with proper async waiting)
  const windowConfig = await getWindowEnvironment();
  
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
      openai: fallbackConfig.apiKeys?.openai,
      // SECURITY: Other sensitive API keys not included in fallback config
    },
    elevenLabs: {
      apiKey: fallbackConfig.elevenLabs?.apiKey,
      agentId: fallbackConfig.elevenLabs?.agentId,
    },
    perplexity: {
      apiKey: fallbackConfig.perplexity?.apiKey,
    },
    apiEndpoints: generateApiEndpoints(fallbackConfig),
    environment: fallbackConfig.environment || 'development',
    features: determineFeatureFlags(fallbackConfig),
  };
};

/**
 * Synchronous fallback function for backwards compatibility
 * This will return immediately available config or fallback values
 */
const getEnvironmentConfigSync = (): EnvironmentConfig => {
  // Add debug stack trace to identify which component is calling this
  console.error('🚨 SYNCHRONOUS CONFIG ACCESS DETECTED!');
  console.error('📍 Stack trace:', new Error().stack);
  console.error('⚠️ This component should wait for Firebase initialization!');
  
  // Only try Vite environment variables synchronously
  const viteConfig = getViteEnvironment();
  
  // Check if Firebase config from Vite is valid
  if (viteConfig.firebase && validateFirebaseConfig(viteConfig.firebase)) {
    console.log('✅ Using Vite environment variables (sync)');
    return {
      ...viteConfig,
      features: determineFeatureFlags(viteConfig),
      apiEndpoints: generateApiEndpoints(viteConfig),
      environment: viteConfig.environment || 'development',
    } as EnvironmentConfig;
  }
  
  // For production, provide a minimal config that will trigger async loading
  console.warn('⚠️ Synchronous config access - async initialization required for production');
  console.warn('🔍 Component should use async initializeEnvironment() instead');
  
  return {
    firebase: {
      apiKey: 'INITIALIZING',
      authDomain: 'INITIALIZING',
      projectId: 'INITIALIZING',
      storageBucket: 'INITIALIZING',
      messagingSenderId: 'INITIALIZING',
      appId: 'INITIALIZING',
      measurementId: 'INITIALIZING',
    },
    apiKeys: {
      youtube: undefined,
      recaptcha: undefined,
      openai: undefined,
    },
    elevenLabs: {
      apiKey: undefined,
      agentId: undefined,
    },
    perplexity: {
      apiKey: undefined,
    },
    apiEndpoints: generateApiEndpoints({}),
    environment: viteConfig.environment || 'production',
    features: determineFeatureFlags({}),
  };
};

// Environment configuration state management
let _environmentConfig: EnvironmentConfig | null = null;
let _initializationPromise: Promise<EnvironmentConfig> | null = null;

/**
 * Initialize environment configuration asynchronously
 * This should be called early in the application lifecycle
 */
export const initializeEnvironment = async (): Promise<EnvironmentConfig> => {
  if (_environmentConfig) {
    return _environmentConfig;
  }
  
  if (!_initializationPromise) {
    _initializationPromise = initializeEnvironmentConfig();
  }
  
  _environmentConfig = await _initializationPromise;
  return _environmentConfig;
};

/**
 * Check if environment has been properly initialized
 */
export const isEnvironmentInitialized = (): boolean => {
  return _environmentConfig !== null && 
         _environmentConfig.firebase.apiKey !== 'INITIALIZING';
};

export const env = new Proxy({} as EnvironmentConfig, {
  get(target, prop) {
    if (!_environmentConfig) {
      _environmentConfig = getEnvironmentConfigSync();
      
      // Trigger async initialization if we're using fallback config
      if (!isEnvironmentInitialized()) {
        initializeEnvironment().then(config => {
          _environmentConfig = config;
        }).catch(error => {
          console.error('❌ Failed to initialize environment configuration:', error);
        });
      }
    }
    return _environmentConfig[prop as keyof EnvironmentConfig];
  }
});

// Export convenience accessors (also lazy-loaded)
export const firebaseConfig = new Proxy({} as EnvironmentConfig['firebase'], {
  get(target, prop) {
    return env.firebase[prop as keyof EnvironmentConfig['firebase']];
  }
});

export const apiKeys = new Proxy({} as EnvironmentConfig['apiKeys'], {
  get(target, prop) {
    return env.apiKeys[prop as keyof EnvironmentConfig['apiKeys']];
  }
});

export const elevenLabs = new Proxy({} as EnvironmentConfig['elevenLabs'], {
  get(target, prop) {
    return env.elevenLabs[prop as keyof EnvironmentConfig['elevenLabs']];
  }
});

export const perplexity = new Proxy({} as EnvironmentConfig['perplexity'], {
  get(target, prop) {
    return env.perplexity[prop as keyof EnvironmentConfig['perplexity']];
  }
});

export const apiEndpoints = new Proxy({} as EnvironmentConfig['apiEndpoints'], {
  get(target, prop) {
    return env.apiEndpoints[prop as keyof EnvironmentConfig['apiEndpoints']];
  }
});

export const features = new Proxy({} as EnvironmentConfig['features'], {
  get(target, prop) {
    return env.features[prop as keyof EnvironmentConfig['features']];
  }
});

// Environment flags (lazy-loaded)
export const isProduction = () => env.environment === 'production';
export const isDevelopment = () => env.environment === 'development';
export const isTest = () => env.environment === 'test';

// Backwards compatibility exports
export const getEnvironmentConfig = getEnvironmentConfigSync;

// Default export for backwards compatibility
export default env; 