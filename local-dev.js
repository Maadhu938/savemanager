/**
 * SaveManager - Local Development Server
 * Emulates Vercel Serverless Functions and serves static frontend assets locally
 * Powered by Node.js native HTTP (zero dependencies needed!)
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

// Dynamic API handler loaders
const apiHandlers = {
  '/api/download': async () => (await import('./api/download.js')).default,
  '/api/instagram': async () => (await import('./api/instagram.js')).default,
  '/api/facebook': async () => (await import('./api/facebook.js')).default,
  '/api/pinterest': async () => (await import('./api/pinterest.js')).default,
  '/api/youtube': async () => (await import('./api/youtube.js')).default,
  '/api/proxy': async () => (await import('./api/proxy.js')).default
};

// MIME Types map
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Add Vercel compatibility helpers
  const query = Object.fromEntries(parsedUrl.searchParams.entries());
  req.query = query;

  res.status = function (code) {
    this.statusCode = code;
    return this;
  };

  res.json = function (data) {
    this.setHeader('Content-Type', 'application/json');
    this.end(JSON.stringify(data));
    return this;
  };

  res.redirect = function (statusOrUrl, url) {
    if (typeof statusOrUrl === 'number') {
      this.writeHead(statusOrUrl, { Location: url });
    } else {
      this.writeHead(302, { Location: statusOrUrl });
    }
    this.end();
    return this;
  };

  // Route: /api/*
  if (pathname.startsWith('/api/')) {
    const handlerLoader = apiHandlers[pathname];
    if (handlerLoader) {
      try {
        let bodyData = '';
        req.on('data', chunk => {
          bodyData += chunk;
        });

        req.on('end', async () => {
          if (bodyData) {
            try {
              req.body = JSON.parse(bodyData);
            } catch (e) {
              req.body = bodyData;
            }
          } else {
            req.body = {};
          }

          try {
            const handler = await handlerLoader();
            await handler(req, res);
          } catch (handlerErr) {
            console.error('API Error:', handlerErr);
            if (!res.writableEnded) {
              res.status(500).json({ error: handlerErr.message });
            }
          }
        });
        return;
      } catch (err) {
        console.error('API execution error:', err);
        return res.status(500).json({ error: err.message });
      }
    } else {
      return res.status(404).json({ error: 'API route not found' });
    }
  }

  // Route: Static files
  let safePath = pathname === '/' ? '/index.html' : pathname;
  let filePath = path.join(__dirname, safePath);

  // Security check: ensure path is within directory
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end('Access Denied');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const htmlPath = filePath + '.html';
      if (fs.existsSync(htmlPath)) {
        filePath = htmlPath;
      } else {
        filePath = path.join(__dirname, 'index.html');
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('File Not Found');
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`
  =============================================================
  🚀 SaveManager Local Server is running!
  🌐 URL: http://localhost:${PORT}
  📦 Multi-Platform Support: Instagram, Facebook, Pinterest, YouTube
  💰 Ads Service: Enabled (Demo Mode active)
  🗺️  Sitemap: http://localhost:${PORT}/sitemap.xml
  =============================================================
  `);
});
