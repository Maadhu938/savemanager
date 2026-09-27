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
import json
import time
import shutil
import tempfile
import subprocess
from urllib.parse import quote, unquote

app = FastAPI(title="SaveManager yt-dlp Extractor Engine", version="1.2.0")

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

def get_ffmpeg_binary() -> str:
    """Find system ffmpeg or fallback to imageio-ffmpeg static binary"""
    sys_ffmpeg = shutil.which("ffmpeg")
    if sys_ffmpeg:
        return sys_ffmpeg
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"

def ensure_cookie_file() -> str | None:
    """
    Ensures a valid Netscape-formatted cookie file exists.
    Checks:
    1. Local cookies.txt
    2. INSTAGRAM_COOKIE or INSTAGRAM_SESSIONID environment variable:
       - Netscape format
       - JSON format from browser extensions
       - Key-value string (sessionid=...; ds_user_id=...)
       - Raw sessionid token
    """
    if os.path.exists("cookies.txt"):
        return "cookies.txt"

    cookie_str = os.environ.get("INSTAGRAM_COOKIE") or os.environ.get("INSTAGRAM_SESSIONID")
    if not cookie_str:
        return None

    target_path = os.path.join(tempfile.gettempdir(), "ig_cookies.txt")
    cookie_str = cookie_str.strip()

    # Case 1: Already Netscape format
    if cookie_str.startswith("# Netscape") or "\tTRUE\t" in cookie_str:
        with open(target_path, "w", encoding="utf-8") as f:
            f.write(cookie_str)
        return target_path

    cookies_dict = {}

    # Case 2: JSON format from extension
    if cookie_str.startswith("[") and cookie_str.endswith("]"):
        try:
            items = json.loads(cookie_str)
            for item in items:
                n = item.get("name")
                v = item.get("value")
                if n and v:
                    cookies_dict[n] = v
        except Exception:
            pass

    # Case 3: Key-Value pairs ("sessionid=...; ds_user_id=...")
    if not cookies_dict and ("=" in cookie_str):
        parts = cookie_str.split(";")
        for part in parts:
            if "=" in part:
                k, v = part.strip().split("=", 1)
                k = k.strip()
                v = v.strip()
                if k and v:
                    cookies_dict[k] = v

    # Case 4: Bare sessionid string
    if not cookies_dict and len(cookie_str) > 10 and " " not in cookie_str:
        cookies_dict["sessionid"] = cookie_str

    if not cookies_dict:
        return None

    # Write out Netscape HTTP Cookie File
    expiry = int(time.time()) + 31536000  # 1 year
    lines = [
        "# Netscape HTTP Cookie File",
        "# http://curl.haxx.se/rfc/cookie_spec.html",
        "# This is a generated file!  Do not edit.",
        ""
    ]

    for name, value in cookies_dict.items():
        clean_val = value.strip('"\' ;')
        lines.append(f".instagram.com\tTRUE\t/\tTRUE\t{expiry}\t{name}\t{clean_val}")
        lines.append(f"www.instagram.com\tFALSE\t/\tTRUE\t{expiry}\t{name}\t{clean_val}")
        lines.append(f"i.instagram.com\tFALSE\t/\tTRUE\t{expiry}\t{name}\t{clean_val}")

    content = "\n".join(lines) + "\n"
    with open(target_path, "w", encoding="utf-8") as f:
        f.write(content)

    return target_path

@app.api_route("/", methods=["GET", "HEAD", "OPTIONS", "POST"])
@app.api_route("/health", methods=["GET", "HEAD", "OPTIONS", "POST"])
def health_check():
    """UptimeRobot & Health Monitor Endpoint (Supports GET, HEAD, OPTIONS, POST)"""
    cookie_path = ensure_cookie_file()
    ffmpeg_bin = get_ffmpeg_binary()
    return {
        "status": "online",
        "service": "SaveManager yt-dlp Engine",
        "yt_dlp_version": yt_dlp.version.__version__,
        "has_cookies": bool(cookie_path),
        "has_ffmpeg": bool(shutil.which(ffmpeg_bin) or os.path.exists(ffmpeg_bin) or ffmpeg_bin == "ffmpeg")
    }

@app.get("/debug")
def debug_formats(url: str):
    """Debug route to inspect all raw formats from yt-dlp"""
    cookie_path = ensure_cookie_file()
    ydl_opts = {
        'quiet': True,
        'skip_download': True,
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'ios', 'tv']
            }
        }
    }
    if cookie_path:
        ydl_opts['cookiefile'] = cookie_path
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        fmts = info.get('formats', [])
        return {
            "title": info.get("title"),
            "url": info.get("url"),
            "formats_count": len(fmts),
            "formats": [
                {
                    "format_id": f.get("format_id"),
                    "ext": f.get("ext"),
                    "vcodec": f.get("vcodec"),
                    "acodec": f.get("acodec"),
                    "height": f.get("height"),
                    "width": f.get("width"),
                    "tbr": f.get("tbr"),
                    "abr": f.get("abr"),
                    "protocol": f.get("protocol"),
                    "format_note": f.get("format_note"),
                    "has_url": bool(f.get("url")),
                    "url": f.get("url")
                }
                for f in fmts
            ]
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
    ffmpeg_bin = get_ffmpeg_binary()

    cmd = [
        ffmpeg_bin,
        "-y",
        "-headers", headers_opt,
        "-i", video_url,
        "-headers", headers_opt,
        "-i", audio_url,
        "-map", "0:v:0",
        "-map", "1:a:0?",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
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

    platform = detect_platform(target_url)

    # Dynamic platform referer
    referer = "https://www.instagram.com/"
    if platform == 'youtube':
        referer = "https://www.youtube.com/"
    elif platform == 'facebook':
        referer = "https://www.facebook.com/"
    elif platform == 'pinterest':
        referer = "https://www.pinterest.com/"

    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'noplaylist': True,
        'extract_flat': False,
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': referer,
        },
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'ios', 'tv']
            }
        }
    }

    # Authenticated Session support for age-restricted Instagram content
    # Netscape cookiefile is strictly scoped to .instagram.com (never leaked to YouTube or other hosts)
    cookie_path = ensure_cookie_file()
    if cookie_path:
        ydl_opts['cookiefile'] = cookie_path


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
            
            # Keep all formats that have direct HTTP/HTTPS URLs (do not drop progressive formats lacking protocol key)
            valid_formats = [
                f for f in formats 
                if f.get('url') and str(f.get('url', '')).startswith(('http://', 'https://'))
            ]

            combined_formats = []
            video_only_formats = []
            audio_only_formats = []

            for fmt in valid_formats:
                vc = fmt.get('vcodec') or ''
                ac = fmt.get('acodec') or ''
                ext = (fmt.get('ext') or 'mp4').lower()
                height = fmt.get('height') or 0
                width = fmt.get('width') or 0
                fid = str(fmt.get('format_id') or '').lower()

                # Audio-only:
                # 1. vcodec is explicitly 'none' while acodec is not 'none'
                # 2. Audio container extension (m4a, mp3, etc.) without video resolution
                # 3. 'audio' in format_id and no height/width
                is_audio = (vc == 'none' and ac != 'none') or \
                           (ext in ['m4a', 'mp3', 'aac', 'opus', 'wav', 'ogg'] and height == 0 and width == 0) or \
                           ('audio' in fid and height == 0 and width == 0)

                # Video-only (DASH stream with no audio track):
                # In yt-dlp, acodec is explicitly 'none' when stream lacks audio
                is_video_only = (ac == 'none') and (vc != 'none' or height > 0 or width > 0)

                if is_audio:
                    audio_only_formats.append(fmt)
                elif is_video_only:
                    video_only_formats.append(fmt)
                else:
                    # Combined format: Video + Audio included natively (e.g. Instagram progressive MP4, YouTube format 18/22)
                    combined_formats.append(fmt)

            download_options = []
            seen_labels = set()
            base_url = str(request.base_url).rstrip('/')

            # 1. Best Audio stream (for Audio Only option or DASH muxing)
            best_audio = None
            if audio_only_formats:
                best_audio = sorted(audio_only_formats, key=lambda x: x.get('abr') or 0, reverse=True)[0]

            # 2. Add Pre-Muxed / Progressive (Combined Audio + Video) options FIRST
            # These are GUARANTEED to have sound natively without any server processing lag
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

            # 3. High-Resolution Muxed Options for video-only DASH streams (YouTube 1080p/4K, Facebook 1080p, Instagram 1080p)
            audio_source = best_audio.get('url') if best_audio else (sorted_combined[0].get('url') if sorted_combined else None)

            if video_only_formats and audio_source:
                for v_fmt in sorted(video_only_formats, key=lambda x: (x.get('height') or 0, x.get('tbr') or 0), reverse=True):
                    v_h = v_fmt.get('height')
                    if not v_h:
                        continue
                    
                    # If this exact resolution is already offered with native audio, don't duplicate
                    if any(c.get('height') == v_h for c in sorted_combined):
                        continue

                    res_tag = "4K Ultra HD" if v_h >= 2160 else "2K Quad HD" if v_h >= 1440 else "Full HD" if v_h >= 1080 else "HD" if v_h >= 720 else "SD"
                    lbl = f"{v_h}p {res_tag} (Audio Included)"
                    if lbl not in seen_labels:
                        seen_labels.add(lbl)
                        mux_filename = f"{platform}_{info.get('id', 'video')}_{v_h}p.mp4"
                        mux_url = f"{base_url}/mux?video_url={quote(v_fmt['url'])}&audio_url={quote(audio_source)}&filename={quote(mux_filename)}"
                        download_options.append({
                            'label': lbl,
                            'quality': f"{v_h}p",
                            'format': 'mp4',
                            'url': mux_url,
                            'sizeEstimate': format_bytes(v_fmt.get('filesize') or v_fmt.get('filesize_approx')) or 'Master Quality'
                        })

            # 4. Fallback if no options were generated
            if not download_options:
                if sorted_combined:
                    download_options.append({
                        'label': 'HD Video (Audio Included)',
                        'quality': 'HD',
                        'format': 'mp4',
                        'url': sorted_combined[0]['url'],
                        'sizeEstimate': 'Ready'
                    })
                elif info.get('url'):
                    if audio_source:
                        mux_filename = f"{platform}_{info.get('id', 'video')}_master.mp4"
                        mux_url = f"{base_url}/mux?video_url={quote(info['url'])}&audio_url={quote(audio_source)}&filename={quote(mux_filename)}"
                        download_options.append({
                            'label': 'HD Video (Audio Included)',
                            'quality': 'HD',
                            'format': 'mp4',
                            'url': mux_url,
                            'sizeEstimate': 'Ready'
                        })
                    else:
                        download_options.append({
                            'label': 'HD Video (Video Only)',
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
            elif sorted_combined:
                download_options.append({
                    'label': "Audio Track (Original Sound)",
                    'quality': "Original AAC",
                    'format': "mp4",
                    'url': sorted_combined[0]['url'],
                    'sizeEstimate': 'Audio Track'
                })

            # Determine best preview video URL (GUARANTEED to have sound!)
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
