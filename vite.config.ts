import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { Socket } from 'net';

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  const rawOpenaiUrl = env.VITE_OPENAI_ASSISTANT_URL ?? '';
  let openaiAssistantUrl = (rawOpenaiUrl && rawOpenaiUrl.trim().length > 0)
    ? rawOpenaiUrl.trim()
    : 'https://us-central1-offscript-8f6eb.cloudfunctions.net';

  // Respect explicit developer opt-out for emulators: if emulators are disabled,
  // force cloud functions usage regardless of other settings.
  if ((env.VITE_DISABLE_EMULATORS || '').toString().toLowerCase() === 'true') {
    openaiAssistantUrl = 'https://us-central1-offscript-8f6eb.cloudfunctions.net';
  }

  // If the env var is a path (e.g. "/api/text-chat") or otherwise malformed
  // (e.g. begins with multiple slashes producing "https:///..."), treat it as
  // invalid and fall back to the production functions URL. This prevents
  // accidentally using a relative path as the proxy target.
  if (openaiAssistantUrl.startsWith('/')) {
    console.warn('VITE_OPENAI_ASSISTANT_URL appears to be a path instead of a host:', openaiAssistantUrl);
    openaiAssistantUrl = 'https://us-central1-offscript-8f6eb.cloudfunctions.net';
  }

  // Ensure the proxy target includes a protocol. If a developer sets a host like "localhost:5001"
  // without "http://", the proxy internals may receive a null hostname which causes a crash.
  function ensureUrlHasProtocol(u: string) {
    if (!/^https?:\/\//i.test(u)) {
      // Prefer http for localhost/127.0.0.1 or bare IPv4 addresses, otherwise default to https
      if (/^(localhost|127\.0\.0\.1)/i.test(u) || /^\d+\.\d+\.\d+\.\d+(:\d+)?$/.test(u)) {
        return `http://${u}`;
      }
      return `https://${u}`;
    }
    return u;
  }
  let functionsBase = ensureUrlHasProtocol(openaiAssistantUrl);

  // If the normalized URL still doesn't contain a valid hostname (e.g. "https:///api/text-chat")
  // then treat it as malformed and fall back to the cloud functions URL.
  try {
    const parsedCheck = new URL(functionsBase);
    if (!parsedCheck.hostname) {
      console.warn('VITE_OPENAI_ASSISTANT_URL is malformed (no hostname):', functionsBase);
      functionsBase = 'https://us-central1-offscript-8f6eb.cloudfunctions.net';
    }
  } catch (e) {
    console.warn('VITE_OPENAI_ASSISTANT_URL could not be parsed, falling back to cloud functions:', functionsBase);
    functionsBase = 'https://us-central1-offscript-8f6eb.cloudfunctions.net';
  }

  // Helper to test reachability of a host:port
  async function isHostReachable(urlString: string) {
    try {
      const parsed = new URL(urlString);
      const hostname = parsed.hostname;
      const port = Number(parsed.port || (parsed.protocol === 'https:' ? 443 : 80));

      // Only attempt TCP probe for localhost/127.0.0.1 or numeric hosts
      if (!hostname || (hostname !== 'localhost' && hostname !== '127.0.0.1' && isNaN(Number(hostname)))) {
        return true; // assume remote hosts reachable (can't probe reliably here)
      }

      return await new Promise<boolean>((resolve) => {
        const socket = new Socket();
        const onError = () => {
          socket.destroy();
          resolve(false);
        };
        const timer = setTimeout(() => {
          socket.destroy();
          resolve(false);
        }, 1500);

        socket.once('error', onError);
        socket.connect(port, hostname, () => {
          clearTimeout(timer);
          socket.end();
          resolve(true);
        });
      });
    } catch (e) {
      return false;
    }
  }

  // If in development and the functionsBase is a local host that is not responding,
  // fall back to the production cloud functions endpoint to avoid dev proxy crashes.
  if (mode === 'development') {
    const reachable = await isHostReachable(functionsBase);
    if (!reachable) {
      const fallback = 'https://us-central1-offscript-8f6eb.cloudfunctions.net';
      console.warn(`Vite proxy target ${functionsBase} appears unreachable. Falling back to ${fallback}`);
      functionsBase = fallback;
    }
  }

  console.log('Vite dev proxy target for functionsBase:', functionsBase);
  
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
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/analytics']
          }
        }
      },
      // Ensure proper chunk loading
      assetsDir: 'assets',
      sourcemap: false,
      // Improve caching
      chunkSizeWarningLimit: 1000
    },
    server: {
      proxy: {
        '/api/openai': {
          target: functionsBase,
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
        },
        // Text chat proxy to live Firebase Functions (dev only)
        '/api/text-chat/start': {
          target: functionsBase,
          changeOrigin: true,
          rewrite: (p) => p.replace('/api/text-chat/start', '/textChatStart')
        },
        '/api/text-chat/message': {
          target: functionsBase,
          changeOrigin: true,
          rewrite: (p) => p.replace('/api/text-chat/message', '/textChatMessage')
        },
        '/api/text-chat/end': {
          target: functionsBase,
          changeOrigin: true,
          rewrite: (p) => p.replace('/api/text-chat/end', '/textChatEnd')
        }
      }
    }
  };
});
