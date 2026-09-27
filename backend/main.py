"""
SaveManager yt-dlp Micro-Backend
High-performance video extractor and audio/video muxer powered by yt-dlp & FFmpeg.
Supports Instagram, YouTube, Facebook, TikTok, Pinterest, Twitter, and 1000+ sites.
Includes support for authenticated sessions (cookies) and DASH stream muxing.
"""

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import yt_dlp
import os
import re
import subprocess
from urllib.parse import quote, unquote

app = FastAPI(title="SaveManager yt-dlp Extractor Engine", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def format_bytes(size):
    if not size or size <= 0:
        return None
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size < 1024.0:
            return f"{size:.1f} {unit}"
        size /= 1024.0
    return f"{size:.1f} TB"

def detect_platform(url: str) -> str:
    clean = url.lower()
    if 'instagram.com' in clean:
        return 'instagram'
    if 'facebook.com' in clean or 'fb.watch' in clean:
        return 'facebook'
    if 'pinterest.com' in clean or 'pin.it' in clean:
        return 'pinterest'
    if 'youtube.com' in clean or 'youtu.be' in clean:
        return 'youtube'
    if 'tiktok.com' in clean:
        return 'tiktok'
    return 'video'

def get_instagram_cookies():
    """Extract cookies from environment variable or cookies.txt file"""
    cookie_str = os.environ.get("INSTAGRAM_COOKIE") or os.environ.get("INSTAGRAM_SESSIONID")
    if cookie_str:
        if "sessionid=" not in cookie_str and len(cookie_str) > 10:
            return f"sessionid={cookie_str};"
        return cookie_str
    return None

@app.api_route("/", methods=["GET", "HEAD", "OPTIONS", "POST"])
@app.api_route("/health", methods=["GET", "HEAD", "OPTIONS", "POST"])
def health_check():
    """UptimeRobot & Health Monitor Endpoint (Supports GET, HEAD, OPTIONS, POST)"""
    return {
        "status": "online",
        "service": "SaveManager yt-dlp Engine",
        "yt_dlp_version": yt_dlp.version.__version__,
        "has_cookies": bool(get_instagram_cookies() or os.path.exists("cookies.txt"))
    }

@app.get("/mux")
async def mux_streams(
    video_url: str = Query(..., description="Direct video stream URL"),
    audio_url: str = Query(..., description="Direct audio stream URL"),
    filename: str = Query("video.mp4", description="Output filename")
):
    """
    On-the-fly FFmpeg DASH Muxer:
    Combines separate video stream and audio stream into a single MP4 file with sound,
    piping the result directly to the client browser with zero disk lag.
    """
    clean_filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)
    
    referer = "https://www.instagram.com/"
    if "googlevideo.com" in video_url or "youtube.com" in video_url:
        referer = "https://www.youtube.com/"
    elif "fbcdn.net" in video_url or "facebook.com" in video_url:
        referer = "https://www.facebook.com/"
    elif "pinimg.com" in video_url or "pinterest.com" in video_url:
        referer = "https://www.pinterest.com/"

    headers_opt = f"User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\r\nReferer: {referer}\r\n"

    cmd = [
        "ffmpeg",
        "-y",
        "-headers", headers_opt,
        "-i", video_url,
        "-headers", headers_opt,
        "-i", audio_url,
        "-c:v", "copy",
        "-c:a", "aac",
        "-movflags", "frag_keyframe+empty_moov+default_base_moof",
        "-f", "mp4",
        "pipe:1"
    ]

    try:
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        return StreamingResponse(
            proc.stdout,
            media_type="video/mp4",
            headers={"Content-Disposition": f'attachment; filename="{clean_filename}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FFmpeg muxing failed: {str(e)}")

@app.api_route("/extract", methods=["GET", "POST"])
async def extract_media(request: Request, url: str = Query(None)):
    target_url = url
    if not target_url and request.method == "POST":
        try:
            body = await request.json()
            target_url = body.get("url")
        except Exception:
            pass

    if not target_url:
        raise HTTPException(status_code=400, detail="Missing required 'url' parameter")

    # Clean URL (strip tracking params for Instagram)
    if 'instagram.com' in target_url:
        shortcode_match = re.search(r'(?:reel|reels|p|share\/reel)\/([A-Za-z0-9_-]+)', target_url)
        if shortcode_match:
            target_url = f"https://www.instagram.com/reel/{shortcode_match.group(1)}/"

    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'noplaylist': True,
        'extract_flat': False,
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.instagram.com/',
        }
    }

    # Authenticated Session support for age-restricted / audience-restricted content
    if os.path.exists("cookies.txt"):
        ydl_opts['cookiefile'] = "cookies.txt"
    else:
        ig_cookie = get_instagram_cookies()
        if ig_cookie:
            ydl_opts['http_headers']['Cookie'] = ig_cookie

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(target_url, download=False)
            if not info:
                raise HTTPException(status_code=404, detail="Could not extract video from this link.")

            if 'entries' in info and info['entries']:
                info = info['entries'][0]

            title = info.get('title') or 'Saved Video'
            author = info.get('uploader') or info.get('channel') or info.get('creator') or 'Creator'
            thumbnail = info.get('thumbnail') or ''
            duration = info.get('duration')
            platform = detect_platform(target_url)

            # Sort and classify formats: Combined (Audio+Video) vs DASH Video-Only vs Audio-Only
            formats = info.get('formats') or []
            valid_formats = [f for f in formats if f.get('url') and f.get('protocol', '').startswith(('http', 'https'))]

            combined_formats = []
            video_only_formats = []
            audio_only_formats = []

            for fmt in valid_formats:
                vc = fmt.get('vcodec') or ''
                ac = fmt.get('acodec') or ''

                has_video = (vc != 'none') and bool(vc)
                # In progressive MP4s, acodec might be None or a codec name; if it is explicitly 'none', it has NO audio
                has_audio = (ac != 'none')

                is_progressive = (fmt.get('format_note') == 'progressive') or (has_video and has_audio and ac is not None)
                if not has_video and (ac != 'none' or fmt.get('ext') in ['m4a', 'mp3']):
                    audio_only_formats.append(fmt)
                elif is_progressive or (has_video and has_audio):
                    combined_formats.append(fmt)
                elif has_video and (ac == 'none'):
                    video_only_formats.append(fmt)

            download_options = []
            seen_labels = set()

            # Host base for muxing endpoint
            base_url = str(request.base_url).rstrip('/')

            # 1. Best Audio stream
            best_audio = None
            if audio_only_formats:
                best_audio = sorted(audio_only_formats, key=lambda x: x.get('abr') or 0, reverse=True)[0]

            # 2. Add Pre-Muxed (Combined Audio + Video) options first
            # These are guaranteed to have sound natively without server processing
            sorted_combined = sorted(
                combined_formats,
                key=lambda x: (x.get('height') or 720, x.get('tbr') or 0, x.get('filesize') or 0),
                reverse=True
            )

            for fmt in sorted_combined:
                height = fmt.get('height')
                h_label = f"{height}p" if height else "HD"
                label = f"{h_label} Video (Audio Included)"
                if label not in seen_labels:
                    seen_labels.add(label)
                    size_str = format_bytes(fmt.get('filesize') or fmt.get('filesize_approx'))
                    download_options.append({
                        'label': label,
                        'quality': h_label,
                        'format': fmt.get('ext') or 'mp4',
                        'url': fmt.get('url'),
                        'sizeEstimate': size_str or 'Original Sound'
                    })

            # 3. Add High-Resolution Muxed Options for video-only streams with audio (YouTube, Facebook, Instagram)
            if video_only_formats and best_audio:
                for v_fmt in sorted(video_only_formats, key=lambda x: (x.get('height') or 0, x.get('tbr') or 0), reverse=True):
                    v_h = v_fmt.get('height')
                    if not v_h:
                        continue
                    res_tag = "Full HD" if v_h >= 1080 else "HD" if v_h >= 720 else "SD"
                    lbl = f"{v_h}p {res_tag} (Audio Included)"
                    if lbl not in seen_labels:
                        seen_labels.add(lbl)
                        mux_filename = f"{platform}_{info.get('id', 'video')}_{v_h}p.mp4"
                        mux_url = f"{base_url}/mux?video_url={quote(v_fmt['url'])}&audio_url={quote(best_audio['url'])}&filename={quote(mux_filename)}"
                        download_options.append({
                            'label': lbl,
                            'quality': f"{v_h}p",
                            'format': 'mp4',
                            'url': mux_url,
                            'sizeEstimate': format_bytes(v_fmt.get('filesize') or v_fmt.get('filesize_approx')) or 'Master Quality'
                        })

            # 4. Fallback if no combined formats detected
            if not download_options and info.get('url'):
                download_options.append({
                    'label': 'HD Video (Master Stream)',
                    'quality': 'HD',
                    'format': 'mp4',
                    'url': info.get('url'),
                    'sizeEstimate': format_bytes(info.get('filesize')) or 'Ready'
                })

            # 5. Audio Only Option
            if best_audio:
                download_options.append({
                    'label': f"Audio Only ({best_audio.get('ext', 'm4a').upper()})",
                    'quality': f"{int(best_audio.get('abr') or 128)} kbps",
                    'format': best_audio.get('ext', 'm4a'),
                    'url': best_audio.get('url'),
                    'sizeEstimate': format_bytes(best_audio.get('filesize') or best_audio.get('filesize_approx')) or '~3-5 MB'
                })

            # Determine best preview video URL (MUST have sound!)
            # Prefer combined format so video preview plays with audio in browser
            best_preview_url = None
            if sorted_combined:
                best_preview_url = sorted_combined[0].get('url')
            elif download_options:
                best_preview_url = download_options[0]['url']
            else:
                best_preview_url = info.get('url')

            return {
                "success": True,
                "data": {
                    "id": str(info.get('id') or 'media'),
                    "title": title,
                    "author": author,
                    "thumbnail": thumbnail,
                    "duration": duration,
                    "platform": platform,
                    "videoUrl": best_preview_url,
                    "downloadOptions": download_options
                }
            }

    except Exception as e:
        error_msg = str(e)
        clean_msg = re.sub(r'ERROR:\s*\[[^\]]+\]\s*', '', error_msg)
        raise HTTPException(status_code=400, detail=clean_msg)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
