/**
 * SaveManager Unified Dispatcher API
 * Automatically detects platform (Instagram, Facebook, Pinterest, YouTube)
 * and resolves video download metadata and streams.
 */

import { getInstagramMedia } from './instagram.js';
import { getFacebookMedia } from './facebook.js';
import { getPinterestMedia } from './pinterest.js';
import { getYouTubeMedia } from './youtube.js';
import { fetchFromRapidApi } from './rapidapi.js';

// Auto-detect platform from URL string
export function detectPlatform(url) {
  if (!url) return null;
  const clean = url.trim().toLowerCase();

  if (clean.includes('instagram.com')) {
    return 'instagram';
  }
  if (clean.includes('facebook.com') || clean.includes('fb.watch') || clean.includes('fb.com')) {
    return 'facebook';
  }
  if (clean.includes('pinterest.com') || clean.includes('pin.it') || clean.includes('pinterest.')) {
    return 'pinterest';
  }
  if (clean.includes('youtube.com') || clean.includes('youtu.be')) {
    return 'youtube';
  }
  return null;
}

async function fetchFromYtDlpBackend(url) {
  const backendUrl = process.env.YTDLP_BACKEND_URL;
  if (!backendUrl) return { data: null, error: null };
  try {
    const cleanBase = backendUrl.replace(/\/+$/, '');
    const res = await fetch(`${cleanBase}/extract?url=${encodeURIComponent(url)}`, {
      headers: { 'Accept': 'application/json' }
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json && json.success && json.data) {
      return { data: json.data, error: null };
    }
    if (json && json.detail) {
      let detailMsg = json.detail;
      if (detailMsg.includes("isn't available to everyone") || detailMsg.includes("certain audiences")) {
        detailMsg = "This Instagram Reel has audience or age restrictions set by the creator, and cannot be downloaded without logging into Instagram.";
      }
      return { data: null, error: detailMsg };
    }
  } catch (err) {
    console.warn('yt-dlp micro-backend query error:', err.message);
  }
  return { data: null, error: null };
}

export default async function handler(req, res) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const sendJson = (status, data) => {
    if (typeof res.status === 'function') {
      return res.status(status).json(data);
    }
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(data));
  };

  if (req.method === 'OPTIONS') {
    return res.status ? res.status(200).end() : res.end();
  }

  // Parse body or query
  let url = '';
  let requestedPlatform = '';

  if (req.method === 'POST') {
    let body = req.body;
    if (!body) {
      try {
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        const raw = Buffer.concat(chunks).toString('utf8');
        if (raw) body = JSON.parse(raw);
      } catch (e) {
        body = {};
      }
    } else if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }
    url = body?.url || '';
    requestedPlatform = body?.platform || '';
  } else {
    url = req.query?.url || '';
    requestedPlatform = req.query?.platform || '';
  }

  if (!url) {
    return sendJson(400, {
      success: false,
      error: 'Please enter a video URL to download'
    });
  }

  // Detect platform
  const platform = requestedPlatform && requestedPlatform !== 'auto' 
    ? requestedPlatform 
    : detectPlatform(url);

  if (!platform) {
    return sendJson(400, {
      success: false,
      error: 'Unsupported link. SaveManager currently supports Instagram, Facebook, Pinterest, and YouTube.'
    });
  }

  try {
    let mediaData = null;
    let nativeError = null;

    // 1. Check yt-dlp micro-backend first (if configured in environment)
    if (process.env.YTDLP_BACKEND_URL) {
      const ytdlpResult = await fetchFromYtDlpBackend(url);
      if (ytdlpResult && ytdlpResult.data) {
        mediaData = ytdlpResult.data;
      } else if (ytdlpResult && ytdlpResult.error) {
        nativeError = new Error(ytdlpResult.error);
        if (ytdlpResult.error.includes('restriction') || ytdlpResult.error.includes('Private')) {
          throw nativeError;
        }
      }
    }

    // 2. Try native platform extractor
    if (!mediaData) {
      try {
        switch (platform) {
          case 'instagram':
            mediaData = await getInstagramMedia(url);
            break;
          case 'facebook':
            mediaData = await getFacebookMedia(url);
            break;
          case 'pinterest':
            mediaData = await getPinterestMedia(url);
            break;
          case 'youtube':
            mediaData = await getYouTubeMedia(url);
            break;
          default:
            throw new Error(`Platform '${platform}' is not supported.`);
        }
      } catch (err) {
        if (!nativeError) nativeError = err;
        console.warn(`Native extraction failed for ${platform}, attempting RapidAPI fallback:`, err.message);
      }
    }

    // 3. If native failed or returned no streams, attempt RapidAPI fallback
    if (!mediaData || !mediaData.downloadOptions || mediaData.downloadOptions.length === 0) {
      const fallbackData = await fetchFromRapidApi(url, platform);
      if (fallbackData && fallbackData.downloadOptions && fallbackData.downloadOptions.length > 0) {
        mediaData = fallbackData;
      }
    }

    if (!mediaData) {
      throw nativeError || new Error('Unable to extract media from this URL. Please verify the link is public.');
    }

    // Attach proxy download URLs to download options
    if (mediaData.downloadOptions && Array.isArray(mediaData.downloadOptions)) {
      mediaData.downloadOptions = mediaData.downloadOptions.map((opt, idx) => {
        const safeExt = opt.format || (opt.label && opt.label.includes('Audio') ? 'mp3' : opt.label && opt.label.includes('Image') ? 'jpg' : 'mp4');
        const filename = `${platform}_${mediaData.id || 'media'}_${opt.quality || idx}.${safeExt}`.replace(/\s+/g, '_');
        const isMux = opt.url && opt.url.includes('/mux?');
        return {
          ...opt,
          proxyUrl: isMux ? opt.url : `/api/proxy?url=${encodeURIComponent(opt.url)}&filename=${encodeURIComponent(filename)}`
        };
      });

    }

    return sendJson(200, {
      success: true,
      data: mediaData
    });
  } catch (err) {
    console.error(`Error resolving media for ${platform}:`, err);
    return sendJson(500, {
      success: false,
      platform: platform,
      error: err.message || 'Failed to process video link. Please make sure the video is public and try again.'
    });
  }
}
