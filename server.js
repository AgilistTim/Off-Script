import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Add security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Serve static files from the 'dist' directory with caching
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1d',
  etag: false
}));

// API health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Handle specific SPA routes explicitly to avoid path-to-regexp issues
const spaRoutes = [
  '/',
  '/auth/login',
  '/auth/register', 
  '/dashboard',
  '/profile',
  '/reports',
  '/settings',
  '/conversations',
  '/career-cards',
  '/analytics',
  '/admin',
  '/admin/users',
  '/admin/analytics'
];

spaRoutes.forEach(route => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
});

// Catch-all for any other routes (fallback)
app.get('*', (req, res) => {
  console.log(`Serving SPA for route: ${req.path}`);
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 SPA routing enabled`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
