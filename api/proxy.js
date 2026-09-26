/**
 * Download Streaming Proxy
 * Bypasses CORS and sets Content-Disposition: attachment to force direct native browser download
 */
import { Readable } from 'stream';

function safeRedirect(res, targetUrl) {
  if (typeof res.redirect === 'function') {
    return res.redirect(302, targetUrl);
  }
  res.writeHead(302, { Location: targetUrl });
  return res.end();
}

export default async function handler(req, res) {
  // Support CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status ? res.status(200).end() : res.end();
  }

  const { url, filename } = req.query || {};

  if (!url) {
    if (typeof res.status === 'function') {
      return res.status(400).json({ error: 'Missing media URL parameter' });
    }
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Missing media URL parameter' }));
  }

  try {
    const targetUrl = decodeURIComponent(url);
    const downloadFilename = filename ? decodeURIComponent(filename) : 'savemanager_media.mp4';

    const mediaRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': 'https://www.google.com/'
      }
    });

    if (!mediaRes.ok) {
      return safeRedirect(res, targetUrl);
    }

    const contentType = mediaRes.headers.get('content-type') || 'application/octet-stream';
    const contentLength = mediaRes.headers.get('content-length');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename.replace(/[^a-zA-Z0-9_.-]/g, '_')}"`);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Pipe response stream to client
    if (mediaRes.body) {
      if (typeof Readable.fromWeb === 'function') {
        const stream = Readable.fromWeb(mediaRes.body);
        stream.pipe(res);
      } else {
        const buffer = await mediaRes.arrayBuffer();
        res.end(Buffer.from(buffer));
      }
    } else {
      safeRedirect(res, targetUrl);
    }
  } catch (err) {
    console.error('Proxy download error:', err);
    try {
      return safeRedirect(res, decodeURIComponent(url));
    } catch (e) {
      if (typeof res.status === 'function') {
        return res.status(500).json({ error: 'Failed to stream media download' });
      }
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'Failed to stream media download' }));
    }
  }
}
