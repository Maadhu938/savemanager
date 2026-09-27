/**
 * YouTube Video & Shorts Extractor
 * Extracts genuine direct streams via YouTube Innertube API and HTML player responses
 */

function extractYouTubeId(url) {
  try {
    const regExp = /(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
    const match = url.match(regExp);
    return match ? match[1] : null;
  } catch (e) {
    return null;
  }
}

// Fetch official oEmbed metadata
async function getYouTubeMetadata(id) {
  try {
    const embedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`;
    const res = await fetch(embedUrl);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // ignore
  }
  return {
    title: 'YouTube Video',
    author_name: 'YouTube Creator'
  };
}

// Strategy 1: YouTube Innertube API (Android & Embedded TV Clients)
async function extractViaInnertube(videoId) {
  const clients = [
    {
      clientName: 'ANDROID',
      clientVersion: '19.09.37',
      androidSdkVersion: 30,
      hl: 'en',
      gl: 'US'
    },
    {
      clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
      clientVersion: '2.0',
      clientScreen: 'EMBED',
      hl: 'en',
      gl: 'US'
    },
    {
      clientName: 'IOS',
      clientVersion: '19.09.1',
      deviceModel: 'iPhone14,3',
      hl: 'en',
      gl: 'US'
    }
  ];

  for (const client of clients) {
    try {
      const res = await fetch('https://www.youtube.com/youtubei/v1/player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip'
        },
        body: JSON.stringify({
          videoId: videoId,
          context: {
            client: client
          }
        })
      });

      if (!res.ok) continue;

      const data = await res.json();
      const streamingData = data.streamingData;
      if (!streamingData) continue;

      const formats = [
        ...(streamingData.formats || []),
        ...(streamingData.adaptiveFormats || [])
      ];

      // Filter formats with direct URLs
      const directStreams = formats.filter(f => f && f.url);
      if (directStreams.length > 0) {
        return {
          title: data.videoDetails?.title,
          author: data.videoDetails?.author,
          thumbnail: data.videoDetails?.thumbnail?.thumbnails?.slice(-1)[0]?.url,
          streams: directStreams
        };
      }
    } catch (err) {
      // try next client
    }
  }
  return null;
}

// Strategy 2: Extract from YouTube Watch Page
async function extractViaWatchPage(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!res.ok) return null;

    const html = await res.text();
    const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});(?:\s*var\s+meta|<\/script)/s) ||
                  html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);

    if (match && match[1]) {
      const playerResponse = JSON.parse(match[1]);
      const streamingData = playerResponse.streamingData;
      if (streamingData) {
        const formats = [
          ...(streamingData.formats || []),
          ...(streamingData.adaptiveFormats || [])
        ];
        const directStreams = formats.filter(f => f && f.url);
        if (directStreams.length > 0) {
          return {
            title: playerResponse.videoDetails?.title,
            author: playerResponse.videoDetails?.author,
            thumbnail: playerResponse.videoDetails?.thumbnail?.thumbnails?.slice(-1)[0]?.url,
            streams: directStreams
          };
        }
      }
    }
  } catch (err) {
    // ignore
  }
  return null;
}

export async function getYouTubeMedia(url) {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube link. Please provide a valid YouTube Video or Shorts URL.');
  }

  const meta = await getYouTubeMetadata(videoId);
  const highResThumb = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

  // 1. Try Innertube API
  let result = await extractViaInnertube(videoId);

  // 2. Try Watch Page
  if (!result) {
    result = await extractViaWatchPage(videoId);
  }

  if (!result || !result.streams || result.streams.length === 0) {
    throw new Error('Could not extract direct stream for this YouTube video. YouTube may require account verification, or the video is private/age-restricted.');
  }

  const title = result.title || meta.title || `YouTube Video (${videoId})`;
  const author = result.author || meta.author_name || 'YouTube Creator';
  const thumb = result.thumbnail || highResThumb;

  // Build clean download options from actual extracted streams
  const downloadOptions = [];

  // Group MP4 video streams
  const mp4Streams = result.streams.filter(s => s.mimeType && s.mimeType.includes('video/mp4'));
  const audioStreams = result.streams.filter(s => s.mimeType && s.mimeType.includes('audio/'));

  if (mp4Streams.length > 0) {
    // Sort highest resolution first
    mp4Streams.sort((a, b) => (b.height || 0) - (a.height || 0));

    const backendBase = (process.env.YTDLP_BACKEND_URL || 'https://savemanager-api.onrender.com').replace(/\/+$/, '');
    const bestAudio = audioStreams.length > 0 ? audioStreams[0] : null;

    const bestVideo = mp4Streams[0];
    const sizeMb = bestVideo.contentLength ? `~${Math.round(bestVideo.contentLength / (1024 * 1024))} MB` : 'HD Stream';
    const bestHasAudio = bestVideo.audioChannels || (bestVideo.mimeType && bestVideo.mimeType.includes('audio'));
    const bestUrl = (!bestHasAudio && bestAudio) 
      ? `${backendBase}/mux?video_url=${encodeURIComponent(bestVideo.url)}&audio_url=${encodeURIComponent(bestAudio.url)}&filename=${encodeURIComponent(`youtube_${videoId}_${bestVideo.qualityLabel || '1080p'}.mp4`)}`
      : bestVideo.url;

    downloadOptions.push({
      label: `${bestVideo.qualityLabel || '1080p HD'} Video (MP4 - Audio Included)`,
      quality: bestVideo.qualityLabel || '1080p',
      format: 'mp4',
      url: bestUrl,
      sizeEstimate: sizeMb
    });

    if (mp4Streams.length > 1) {
      const standardVideo = mp4Streams[Math.floor(mp4Streams.length / 2)];
      const standardSize = standardVideo.contentLength ? `~${Math.round(standardVideo.contentLength / (1024 * 1024))} MB` : 'SD Stream';
      const stdHasAudio = standardVideo.audioChannels || (standardVideo.mimeType && standardVideo.mimeType.includes('audio'));
      const stdUrl = (!stdHasAudio && bestAudio)
        ? `${backendBase}/mux?video_url=${encodeURIComponent(standardVideo.url)}&audio_url=${encodeURIComponent(bestAudio.url)}&filename=${encodeURIComponent(`youtube_${videoId}_${standardVideo.qualityLabel || '720p'}.mp4`)}`
        : standardVideo.url;

      downloadOptions.push({
        label: `${standardVideo.qualityLabel || '720p'} Video (MP4 - Audio Included)`,
        quality: standardVideo.qualityLabel || 'Standard',
        format: 'mp4',
        url: stdUrl,
        sizeEstimate: standardSize
      });
    }
  }

  // Audio streams
  if (audioStreams.length > 0) {
    const bestAudio = audioStreams[0];
    const audioSize = bestAudio.contentLength ? `~${Math.round(bestAudio.contentLength / (1024 * 1024))} MB` : 'Audio Track';
    downloadOptions.push({
      label: 'Audio Only (MP3/AAC)',
      quality: 'High Bitrate Audio',
      format: 'mp3',
      url: bestAudio.url,
      sizeEstimate: audioSize
    });
  }

  // Thumbnail
  downloadOptions.push({
    label: 'MaxRes Thumbnail (JPG)',
    quality: '1920x1080 Ultra HD',
    format: 'jpg',
    url: thumb,
    sizeEstimate: '~400 KB'
  });

  const primaryVideoUrl = downloadOptions[0]?.url;

  return {
    platform: 'youtube',
    id: videoId,
    title: title,
    author: author,
    thumbnail: thumb,
    videoUrl: primaryVideoUrl,
    downloadOptions: downloadOptions
  };
}

export default async function handler(req, res) {
  const { url } = req.query || req.body || {};
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const data = await getYouTubeMedia(url);
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch YouTube video' });
  }
}
