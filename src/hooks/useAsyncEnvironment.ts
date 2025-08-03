import { useState, useEffect } from 'react';
import { initFirebase } from '../services/firebase';
import { getEnvironmentConfig, EnvironmentConfig } from '../config/environment';

interface UseAsyncEnvironmentResult {
  config: EnvironmentConfig | null;
  loading: boolean;
  error: string | null;
  isReady: boolean;
}

/**
 * Custom React hook for async environment variable access
 * 
 * This hook ensures Firebase initialization completes before providing
 * environment configuration to components, eliminating synchronous access
 * issues and following proper async initialization patterns.
 * 
 * @returns {UseAsyncEnvironmentResult} Environment config with loading and error states
 */
export function useAsyncEnvironment(): UseAsyncEnvironmentResult {
  const [config, setConfig] = useState<EnvironmentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function initializeEnvironment() {
      try {
        console.log('🔧 useAsyncEnvironment: Starting initialization...');
        
        // Ensure Firebase is fully initialized before accessing environment
        await initFirebase();
        console.log('✅ useAsyncEnvironment: Firebase initialized');
        
        // Now safely get the environment configuration
        const environmentConfig = await getEnvironmentConfig();
        console.log('✅ useAsyncEnvironment: Environment config loaded');
        
        if (isMounted) {
          setConfig(environmentConfig);
          setError(null);
        }
      } catch (err) {
        console.error('❌ useAsyncEnvironment: Initialization failed:', err);
        
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize environment');
          setConfig(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initializeEnvironment();

    // Cleanup function to prevent state updates if component unmounts
    return () => {
      isMounted = false;
    };
  }, []);

  return {
    config,
    loading,
    error,
    isReady: !loading && !error && config !== null
  };
}

/**
 * Helper hook for components that need specific environment values
 * Returns a specific environment value with loading/error handling
 */
export function useEnvironmentValue<T>(
  selector: (config: EnvironmentConfig) => T | undefined,
  defaultValue?: T
): { value: T | undefined; loading: boolean; error: string | null } {
  const { config, loading, error } = useAsyncEnvironment();

  const value = config ? selector(config) : defaultValue;

  return { value, loading, error };
}

// Convenience hooks for common environment values
export function useFirebaseConfig() {
  return useEnvironmentValue(config => config.firebase);
}

export function useElevenLabsConfig() {
  return useEnvironmentValue(config => config.elevenLabs);
}

export function useApiKeys() {
  return useEnvironmentValue(config => config.apiKeys);
}