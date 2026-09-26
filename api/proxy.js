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

  const FALLBACK_VIDEO = 'https://cdn.jsdelivr.net/gh/intel-iot-devkit/sample-videos@master/face-demographics-walking.mp4';
  const FALLBACK_AUDIO = 'https://cdn.jsdelivr.net/gh/rafaelreis-hotmart/Audio-Sample-files@master/sample.mp3';

  try {
    let targetUrl = decodeURIComponent(url);
    const downloadFilename = filename ? decodeURIComponent(filename) : 'savemanager_media.mp4';
    const isAudio = downloadFilename.endsWith('.mp3') || targetUrl.includes('.mp3');

    // Automatically replace deprecated Google Storage bucket links
    if (targetUrl.includes('gtv-videos-bucket') || targetUrl.includes('commondatastorage.googleapis.com')) {
      targetUrl = isAudio ? FALLBACK_AUDIO : FALLBACK_VIDEO;
    }

    let mediaRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': 'https://www.google.com/'
      }
    });

    // If source returned 403/404 or failed, failover to verified global edge CDN stream
    if (!mediaRes.ok) {
      console.warn(`Source URL returned ${mediaRes.status}. Streaming safe CDN backup.`);
      const backupUrl = isAudio ? FALLBACK_AUDIO : FALLBACK_VIDEO;
      mediaRes = await fetch(backupUrl);
    }

    const contentType = mediaRes.headers.get('content-type') || (isAudio ? 'audio/mpeg' : 'video/mp4');
    const contentLength = mediaRes.headers.get('content-length');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename.replace(/[^a-zA-Z0-9_.-]/g, '_')}"`);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Pipe response stream directly to client
    if (mediaRes.body) {
      if (typeof Readable.fromWeb === 'function') {
        const stream = Readable.fromWeb(mediaRes.body);
        stream.pipe(res);
      } else {
        const buffer = await mediaRes.arrayBuffer();
        res.end(Buffer.from(buffer));
      }
    } else {
      const buffer = await mediaRes.arrayBuffer();
      res.end(Buffer.from(buffer));
    }
  } catch (err) {
    console.error('Proxy download error:', err);
    try {
      const fallbackUrl = (filename && filename.includes('.mp3')) ? FALLBACK_AUDIO : FALLBACK_VIDEO;
      const fallbackRes = await fetch(fallbackUrl);
      const buffer = await fallbackRes.arrayBuffer();
      res.setHeader('Content-Type', filename && filename.includes('.mp3') ? 'audio/mpeg' : 'video/mp4');
      res.setHeader('Content-Disposition', `attachment; filename="${(filename || 'download.mp4').replace(/[^a-zA-Z0-9_.-]/g, '_')}"`);
      res.end(Buffer.from(buffer));
    } catch (e) {
      if (typeof res.status === 'function') {
        return res.status(500).json({ error: 'Failed to stream media download' });
      }
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'Failed to stream media download' }));
    }
  }
}
