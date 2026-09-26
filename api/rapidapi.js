/**
 * RapidAPI Social Media Downloader Integration
 * Engines:
 *  - Instagram: instagram-reels-downloader-api.p.rapidapi.com
 *  - YouTube/Facebook/TikTok/All-In-One: social-download-all-in-one.p.rapidapi.com
 * Includes in-memory response cache to preserve API quota.
 */

const memoryCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour in-memory cache

export async function fetchFromRapidApi(url, platform = 'video') {
  const apiKey = process.env.RAPIDAPI_KEY;

  if (!apiKey) {
    return null;
  }

  // 1. Check in-memory cache to save quota
  const cacheKey = `${platform}:${url}`;
  const cached = memoryCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  try {
    // ----------------------------------------------------
    // Platform A: Dedicated Instagram Reels & Posts
    // ----------------------------------------------------
    if (platform === 'instagram' || url.includes('instagram.com')) {
      const igHost = 'instagram-reels-downloader-api.p.rapidapi.com';
      // Clean Instagram URL to remove tracking parameters (?igsh=..., /share/reel/...)
      const scMatch = url.match(/(?:reel|reels|p|share\/reel)\/([A-Za-z0-9_-]+)/i);
      const cleanUrl = scMatch ? `https://www.instagram.com/reel/${scMatch[1]}/` : url;
      const igEndpoint = `https://${igHost}/download?url=${encodeURIComponent(cleanUrl)}`;

      const res = await fetch(igEndpoint, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': igHost,
          'x-rapidapi-key': apiKey
        }
      });

      if (!res.ok) {
        console.warn('Instagram RapidAPI response not ok:', res.status);
        return null;
      }

      const json = await res.json();
      if (!json.success || !json.data) {
        console.warn('Instagram RapidAPI unsuccessful:', json.message);
        return null;
      }

      const reel = json.data;
      const medias = reel.medias || [];
      const videoMedia = medias.find(m => m.type === 'video' || m.url?.includes('.mp4')) || medias[0];

      if (!videoMedia && medias.length === 0) {
        return null;
      }

      const result = {
        id: reel.shortcode || 'instagram_media',
        title: (reel.title || 'Instagram Reel').replace(/#\S+/g, '').trim().substring(0, 100) || 'Instagram Reel',
        author: reel.author || 'Instagram Creator',
        thumbnail: reel.thumbnail || '',
        videoUrl: videoMedia ? videoMedia.url : null,
        duration: null,
        platform: 'instagram',
        downloadOptions: medias.map((m, idx) => {
          const isAudio = m.type === 'audio' || m.extension === 'm4a';
          return {
            label: isAudio ? `Original Audio (${m.quality || 'M4A'})` : `HD Video (${m.quality || m.resolution || 'MP4'})`,
            quality: m.quality || (isAudio ? 'Audio' : 'HD'),
            format: m.extension || (isAudio ? 'm4a' : 'mp4'),
            url: m.url,
            sizeEstimate: m.resolution || m.quality || 'Original Stream'
          };
        })
      };

      // Store in memory cache
      memoryCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    }

    // ----------------------------------------------------
    // Platform B: YouTube, Facebook, TikTok (All-in-One)
    // ----------------------------------------------------
    const allHost = process.env.RAPIDAPI_HOST || 'social-download-all-in-one.p.rapidapi.com';
    const res = await fetch(`https://${allHost}/v1/social/autolink`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': allHost,
        'x-rapidapi-key': apiKey
      },
      body: JSON.stringify({ url })
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (data.error || !data.medias || !Array.isArray(data.medias) || data.medias.length === 0) {
      return null;
    }

    const videoMedia = data.medias.find(m => m.type === 'video' || m.url?.includes('.mp4')) || data.medias[0];

    const result = {
      id: data.id || 'media',
      title: data.title || `${platform.charAt(0).toUpperCase() + platform.slice(1)} Video`,
      author: data.author || data.unique_id || 'Creator',
      thumbnail: data.thumbnail || '',
      videoUrl: videoMedia ? videoMedia.url : null,
      duration: data.duration || null,
      platform: platform,
      downloadOptions: data.medias.map((m, idx) => {
        const isAudio = m.type === 'audio' || m.ext === 'mp3';
        return {
          label: m.label || m.quality || (isAudio ? 'MP3 Audio' : `Video Stream ${idx + 1}`),
          quality: m.quality || m.label || (isAudio ? 'Audio' : 'HD'),
          format: m.ext || (isAudio ? 'mp3' : 'mp4'),
          url: m.url,
          sizeEstimate: m.formattedSize || (m.width && m.height ? `${m.width}x${m.height}` : 'Direct Link')
        };
      })
    };

    // Store in cache
    memoryCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  } catch (err) {
    console.error('RapidAPI Fetch error:', err.message);
    return null;
  }
}
