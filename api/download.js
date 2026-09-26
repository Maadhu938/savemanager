/**
 * SaveManager Unified Dispatcher API
 * Automatically detects platform (Instagram, Facebook, Pinterest, YouTube)
 * and resolves video download metadata and streams.
 */

import { getInstagramMedia } from './instagram.js';
import { getFacebookMedia } from './facebook.js';
import { getPinterestMedia } from './pinterest.js';
import { getYouTubeMedia } from './youtube.js';

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

export default async function handler(req, res) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse body or query
  let url = '';
  let requestedPlatform = '';

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
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
    return res.status(400).json({
      success: false,
      error: 'Please enter a video URL to download'
    });
  }

  // Detect platform
  const platform = requestedPlatform && requestedPlatform !== 'auto' 
    ? requestedPlatform 
    : detectPlatform(url);

  if (!platform) {
    return res.status(400).json({
      success: false,
      error: 'Unsupported link. SaveManager currently supports Instagram, Facebook, Pinterest, and YouTube.'
    });
  }

  try {
    let mediaData = null;

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

    if (!mediaData) {
      throw new Error('Unable to extract media from this URL. Please verify the link is public.');
    }

    // Attach proxy download URLs to download options
    if (mediaData.downloadOptions && Array.isArray(mediaData.downloadOptions)) {
      mediaData.downloadOptions = mediaData.downloadOptions.map((opt, idx) => {
        const safeExt = opt.format || (opt.label.includes('Audio') ? 'mp3' : opt.label.includes('Image') ? 'jpg' : 'mp4');
        const filename = `${platform}_${mediaData.id || 'media'}_${opt.quality || idx}.${safeExt}`.replace(/\s+/g, '_');
        return {
          ...opt,
          proxyUrl: `/api/proxy?url=${encodeURIComponent(opt.url)}&filename=${encodeURIComponent(filename)}`
        };
      });
    }

    return res.status(200).json({
      success: true,
      data: mediaData
    });
  } catch (err) {
    console.error(`Error resolving media for ${platform}:`, err);
    return res.status(500).json({
      success: false,
      platform: platform,
      error: err.message || 'Failed to process video link. Please make sure the video is public and try again.'
    });
  }
}
