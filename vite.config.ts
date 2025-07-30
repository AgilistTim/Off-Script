import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  const openaiAssistantUrl = env.VITE_OPENAI_ASSISTANT_URL || 'https://us-central1-offscript-8f6eb.cloudfunctions.net';
  
  return {
    plugins: [
      react()
    ],
    define: {
      // Add process.env for Node.js libraries compatibility
      global: 'globalThis',
      'process.env': JSON.stringify({}),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    optimizeDeps: {
      include: [
        'react-hot-toast',
        'framer-motion',
        'react-router-dom',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        'firebase/analytics'
      ],
      force: true
    },
    server: {
      proxy: {
        '/api/openai': {
          target: openaiAssistantUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/openai/, ''),
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (_proxyReq, req, _res) => {
              console.log('Sending Request:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response from:', req.url, proxyRes.statusCode);
            });
          }
        }
      }
    }
  };
});
