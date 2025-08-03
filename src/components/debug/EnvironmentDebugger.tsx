import React, { useEffect } from 'react';

export const EnvironmentDebugger: React.FC = () => {
  useEffect(() => {
    console.log('🔬 === PRODUCTION ENVIRONMENT DEBUG ===');
    
    // 1. Check if window.ENV exists
    console.log('🔍 window.ENV exists:', typeof window !== 'undefined' && !!(window as any).ENV);
    
    if (typeof window !== 'undefined' && (window as any).ENV) {
      // 2. Log the complete window.ENV object
      console.log('🔍 Complete window.ENV object:', (window as any).ENV);
      
      // 3. Log all keys
      console.log('🔍 window.ENV keys:', Object.keys((window as any).ENV));
      
      // 4. Test direct property access
      const rawApiKey = (window as any).ENV.VITE_FIREBASE_API_KEY;
      console.log('🔍 Direct window.ENV.VITE_FIREBASE_API_KEY:', rawApiKey);
      console.log('🔍 Type of API key:', typeof rawApiKey);
      console.log('🔍 API key length:', rawApiKey?.length);
      console.log('🔍 API key === "undefined":', rawApiKey === 'undefined');
      console.log('🔍 API key === undefined:', rawApiKey === undefined);
      
      // 5. Test various access patterns
      console.log('🔍 Bracket access:', (window as any).ENV['VITE_FIREBASE_API_KEY']);
      console.log('🔍 Destructured access:', (window as any).ENV.VITE_FIREBASE_API_KEY);
      
      // 6. Compare with working properties
      console.log('🔍 ElevenLabs API Key (working):', (window as any).ENV.VITE_ELEVENLABS_API_KEY);
      console.log('🔍 Project ID:', (window as any).ENV.VITE_FIREBASE_PROJECT_ID);
      
      // 7. Check for encoding issues
      const apiKeyBytes = new TextEncoder().encode(rawApiKey || '');
      console.log('🔍 API key byte array:', Array.from(apiKeyBytes));
      
      // 8. Test JSON stringification
      try {
        console.log('🔍 JSON stringify API key:', JSON.stringify(rawApiKey));
      } catch (e) {
        console.log('🔍 JSON stringify failed:', e);
      }
      
      // 9. Test object iteration
      console.log('🔍 Environment object iteration:');
      for (const [key, value] of Object.entries((window as any).ENV)) {
        if (key.includes('FIREBASE_API_KEY')) {
          console.log(`  ${key}: ${value} (type: ${typeof value}, length: ${value?.length})`);
        }
      }
    } else {
      console.log('❌ window.ENV is not available');
    }
    
    console.log('🔬 === END ENVIRONMENT DEBUG ===');
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'red',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999
    }}>
      🔬 ENV DEBUG ACTIVE - Check Console
    </div>
  );
};