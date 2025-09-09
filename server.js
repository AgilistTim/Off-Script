import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MIME types for common file extensions
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

// SPA routes that should serve index.html
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

const server = http.createServer((req, res) => {
  let filePath = req.url;
  
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Handle health check
  if (filePath === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'OK', timestamp: new Date().toISOString() }));
    return;
  }
  
  // Remove query parameters
  filePath = filePath.split('?')[0];
  
  // Construct file path
  let diskPath = path.join(__dirname, 'dist', filePath);
  
  // Check if it's a SPA route or if file doesn't exist, serve index.html
  if (spaRoutes.includes(filePath) || !fs.existsSync(diskPath)) {
    // For SPA routes or missing files, serve index.html
    diskPath = path.join(__dirname, 'dist', 'index.html');
    console.log(`SPA route: ${filePath} -> serving index.html`);
  }
  
  // If it's a directory, try to serve index.html from it
  if (fs.existsSync(diskPath) && fs.statSync(diskPath).isDirectory()) {
    diskPath = path.join(diskPath, 'index.html');
  }
  
  // Read and serve the file
  fs.readFile(diskPath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // File not found, serve index.html for SPA
        fs.readFile(path.join(__dirname, 'dist', 'index.html'), (err, content) => {
          if (err) {
            res.writeHead(500);
            res.end('Server Error');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content, 'utf-8');
          }
        });
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
    } else {
      // Determine content type
      const ext = path.extname(diskPath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      
      // Set caching headers for static assets
      if (ext !== '.html') {
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day cache
      }
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Simple HTTP Server running on port ${PORT}`);
  console.log(`📱 SPA routing enabled (no Express dependencies)`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
