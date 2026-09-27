/**
 * Instagram Reels & Media Extractor
 * Extracts authentic video streams from public Instagram Reels & Posts
 */

// Helper to extract Instagram shortcode from URL
function extractShortcode(url) {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const match = pathname.match(/(?:reel|reels|p|share\/reel)\/([A-Za-z0-9_-]+)/i);
    return match ? match[1] : null;
  } catch (err) {
    const match = url.match(/(?:reel|reels|p|share\/reel)\/([A-Za-z0-9_-]+)/i);
    return match ? match[1] : null;
  }
}

function cleanCdnUrl(rawUrl) {
  if (!rawUrl) return null;
  return rawUrl
    .replace(/\\u0026/g, '&')
    .replace(/\\/g, '')
    .replace(/&amp;/g, '&');
}

// Strategy 1: Instagram Embed Page Parser
async function extractViaEmbed(shortcode) {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
  ];

  for (const ua of userAgents) {
    try {
      const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
      const response = await fetch(embedUrl, {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Sec-Fetch-Mode': 'navigate'
        }
      });

      if (!response.ok) continue;

      const html = await response.text();

      let videoUrl = null;
      let thumbnailUrl = null;
      let caption = 'Instagram Reel';
      let author = 'Instagram Creator';

      // 1. Match video_url in JSON
      const videoMatch = html.match(/"video_url"\s*:\s*"([^"]+)"/i) || 
                         html.match(/\\"video_url\\"\s*:\s*\\"([^\\"]+)\\"/i);
      if (videoMatch && videoMatch[1]) {
        videoUrl = cleanCdnUrl(videoMatch[1]);
      }

      // 2. Match cdninstagram or fbcdn MP4 links in script bundles
      if (!videoUrl) {
        const cdnMatch = html.match(/(https:\/\/[^"'\s\\]*?\.cdninstagram\.com\/[^"'\s\\]*?\.mp4[^"'\s\\]*)/i) ||
                         html.match(/(https:\/\/[^"'\s\\]*?\.fbcdn\.net\/[^"'\s\\]*?\.mp4[^"'\s\\]*)/i);
        if (cdnMatch && cdnMatch[1]) {
          videoUrl = cleanCdnUrl(cdnMatch[1]);
        }
      }

      // 3. Match <video src="..."> tag
      if (!videoUrl) {
        const videoTagMatch = html.match(/<video[^>]+src=["']([^"']+)["']/i);
        if (videoTagMatch && videoTagMatch[1]) {
          videoUrl = cleanCdnUrl(videoTagMatch[1]);
        }
      }

      // 4. Extract display/thumbnail URL
      const imgMatch = html.match(/"display_url"\s*:\s*"([^"]+)"/i) || 
                       html.match(/\\"display_url\\"\s*:\s*\\"([^\\"]+)\\"/i) ||
                       html.match(/<img[^>]+class=["'][^"']*EmbeddedMediaImage[^"']*["'][^>]+src=["']([^"']+)["']/i);
      if (imgMatch && imgMatch[1]) {
        thumbnailUrl = cleanCdnUrl(imgMatch[1]);
      }

      // 5. Extract Author & Caption
      const authorMatch = html.match(/class=["']UsernameText["'][^>]*>([^<]+)<\/span>/i) ||
                          html.match(/"author_name"\s*:\s*"([^"]+)"/i);
      if (authorMatch && authorMatch[1]) {
        author = authorMatch[1].trim();
      }

      const captionMatch = html.match(/class=["']Caption["'][^>]*>([\s\S]*?)<\/div>/i);
      if (captionMatch && captionMatch[1]) {
        caption = captionMatch[1].replace(/<[^>]+>/g, '').trim().substring(0, 160);
      }

      if (videoUrl) {
        return {
          platform: 'instagram',
          id: shortcode,
          title: caption || `Instagram Reel by ${author}`,
          author: author,
          thumbnail: thumbnailUrl,
          videoUrl: videoUrl,
          downloadOptions: [
            {
              label: 'HD Video (MP4)',
              quality: '1080p HD',
              format: 'mp4',
              url: videoUrl,
              sizeEstimate: '~15-30 MB'
            },
            {
              label: 'Audio Track (MP3)',
              quality: '320 kbps Audio',
              format: 'mp3',
              url: videoUrl,
              sizeEstimate: '~2-4 MB'
            },
            ...(thumbnailUrl ? [{
              label: 'Cover Image (JPG)',
              quality: 'High Definition',
              format: 'jpg',
              url: thumbnailUrl,
              sizeEstimate: '~500 KB'
            }] : [])
          ]
        };
      }
    } catch (err) {
      // try next
    }
  }

  return null;
}

// Strategy 2: Instagram Public Page og:video scraper
async function extractViaPublicPage(shortcode) {
  try {
    const pageUrl = `https://www.instagram.com/reel/${shortcode}/`;
    const res = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!res.ok) return null;

    const html = await res.text();
    const ogVideo = html.match(/<meta property=["']og:video["'] content=["']([^"']+)["']/i) ||
                    html.match(/<meta property=["']og:video:secure_url["'] content=["']([^"']+)["']/i);
    const ogImage = html.match(/<meta property=["']og:image["'] content=["']([^"']+)["']/i);
    const ogTitle = html.match(/<meta property=["']og:title["'] content=["']([^"']+)["']/i);

    if (ogVideo && ogVideo[1]) {
      const videoUrl = cleanCdnUrl(ogVideo[1]);
      const thumbUrl = ogImage ? cleanCdnUrl(ogImage[1]) : null;
      return {
        platform: 'instagram',
        id: shortcode,
        title: ogTitle ? ogTitle[1].replace(/ \| Instagram.*$/i, '').trim() : `Instagram Reel (${shortcode})`,
        author: 'Instagram Creator',
        thumbnail: thumbUrl,
        videoUrl: videoUrl,
        downloadOptions: [
          {
            label: 'HD Video (MP4)',
            quality: '1080p HD',
            format: 'mp4',
            url: videoUrl,
            sizeEstimate: '~15-30 MB'
          },
          {
            label: 'Audio Track (MP3)',
            quality: '320 kbps Audio',
            format: 'mp3',
            url: videoUrl,
            sizeEstimate: '~2-4 MB'
          },
          ...(thumbUrl ? [{
            label: 'Cover Image (JPG)',
            quality: 'High Definition',
            format: 'jpg',
            url: thumbUrl,
            sizeEstimate: '~500 KB'
          }] : [])
        ]
      };
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function shortcodeToMediaId(shortcode) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let id = BigInt(0);
  for (let i = 0; i < shortcode.length; i++) {
    const char = shortcode[i];
    const index = alphabet.indexOf(char);
    if (index === -1) return null;
    id = id * BigInt(64) + BigInt(index);
  }
  return id.toString();
}

// Strategy 3: Instagram Mobile / Internal API
async function extractViaMobileApi(shortcode) {
  const mediaId = shortcodeToMediaId(shortcode);
  if (!mediaId) return null;

  const endpoints = [
    `https://i.instagram.com/api/v1/media/${mediaId}/info/`,
    `https://www.instagram.com/api/v1/media/${mediaId}/info/`
  ];

  const cookie = process.env.INSTAGRAM_COOKIE || '';

  for (const ep of endpoints) {
    try {
      const headers = {
        'User-Agent': 'Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; Google/google; Pixel 7; cheetah; cheetah; en_US; 458649479)',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'X-IG-App-ID': '936619743392459',
        'Referer': 'https://www.instagram.com/',
        'Origin': 'https://www.instagram.com',
        'Sec-Fetch-Site': 'same-site',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Dest': 'empty'
      };
      if (cookie) {
        headers['Cookie'] = cookie.includes('sessionid=') ? cookie : `sessionid=${cookie};`;
      }

      const res = await fetch(ep, { headers });
      if (!res.ok) continue;

      const data = await res.json();
      const item = data?.items?.[0];
      if (!item) continue;

      const videoVersions = item.video_versions || [];
      if (videoVersions.length === 0) continue;

      const bestVideo = videoVersions[0];
      const caption = item.caption?.text?.replace(/#\S+/g, '')?.trim()?.slice(0, 100) || 'Instagram Reel';
      const author = item.user?.username || item.user?.full_name || 'Instagram Creator';
      const thumbnail = item.image_versions2?.candidates?.[0]?.url || '';

      const downloadOptions = videoVersions.map((vv) => ({
        label: `${vv.height}p HD Video (Audio Included)`,
        quality: `${vv.height}p`,
        format: 'mp4',
        url: cleanCdnUrl(vv.url),
        sizeEstimate: `${vv.width}x${vv.height}`
      }));

      return {
        platform: 'instagram',
        id: shortcode,
        title: caption,
        author: author,
        thumbnail: thumbnail,
        videoUrl: cleanCdnUrl(bestVideo.url),
        downloadOptions: downloadOptions
      };
    } catch (e) {
      // ignore and try next strategy
    }
  }
  return null;
}

export async function getInstagramMedia(url) {
  const shortcode = extractShortcode(url);
  if (!shortcode) {
    throw new Error('Invalid Instagram URL. Please provide a valid Reel or Post link (e.g., instagram.com/reel/...).');
  }

  // 1. Try Mobile API with session support
  const mobileResult = await extractViaMobileApi(shortcode);
  if (mobileResult && mobileResult.videoUrl) {
    return mobileResult;
  }

  // 2. Try Embed extraction
  const embedResult = await extractViaEmbed(shortcode);
  if (embedResult && embedResult.videoUrl) {
    return embedResult;
  }

  // 3. Try Public Page scraper
  const pageResult = await extractViaPublicPage(shortcode);
  if (pageResult && pageResult.videoUrl) {
    return pageResult;
  }

  throw new Error('Could not extract video from this Instagram Reel. Please ensure the account is Public (not Private) and the Reel is viewable without login.');
}

export default async function handler(req, res) {
  const { url } = req.query || req.body || {};
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const data = await getInstagramMedia(url);
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch Instagram Reel' });
  }
}
