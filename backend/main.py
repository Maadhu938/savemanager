"""
SaveManager yt-dlp Micro-Backend
High-performance video extractor powered by yt-dlp.
Supports Instagram, YouTube, Facebook, TikTok, Pinterest, Twitter, and 1000+ sites.
"""

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
import yt_dlp
import os
import re

app = FastAPI(title="SaveManager yt-dlp Extractor Engine", version="1.0.0")

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

@app.api_route("/", methods=["GET", "HEAD", "OPTIONS", "POST"])
@app.api_route("/health", methods=["GET", "HEAD", "OPTIONS", "POST"])
def health_check():
    return {
        "status": "online",
        "service": "SaveManager yt-dlp Engine",
        "yt_dlp_version": yt_dlp.version.__version__
    }

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

    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'noplaylist': True,
        'extract_flat': False,
        'format': 'best',
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        }
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(target_url, download=False)
            if not info:
                raise HTTPException(status_code=404, detail="Could not extract video from this link.")

            # In case of playlist/entries, take the first entry
            if 'entries' in info and info['entries']:
                info = info['entries'][0]

            title = info.get('title') or 'Saved Video'
            author = info.get('uploader') or info.get('channel') or info.get('creator') or 'Creator'
            thumbnail = info.get('thumbnail') or ''
            duration = info.get('duration')
            platform = detect_platform(target_url)

            # Parse available stream formats
            download_options = []
            seen_resolutions = set()

            formats = info.get('formats') or []
            # Sort formats from best quality to lowest
            valid_formats = [f for f in formats if f.get('url') and f.get('protocol', '').startswith(('http', 'https'))]

            # 1. Direct best combined format
            if info.get('url') and not valid_formats:
                download_options.append({
                    'label': 'HD Video (MP4)',
                    'quality': 'HD Master',
                    'format': 'mp4',
                    'url': info['url'],
                    'sizeEstimate': format_bytes(info.get('filesize')) or 'Original Quality'
                })

            # 2. Iterate video formats
            # Sort by height descending
            sorted_formats = sorted(
                valid_formats,
                key=lambda x: (x.get('height') or 0, x.get('tbr') or 0, x.get('filesize') or 0),
                reverse=True
            )

            for fmt in sorted_formats:
                height = fmt.get('height')
                vcodec = fmt.get('vcodec') or ''
                ext = fmt.get('ext') or 'mp4'
                url_stream = fmt.get('url')

                # Check if it has video
                if vcodec != 'none' and height and height > 140:
                    res_label = f"{height}p"
                    if res_label not in seen_resolutions:
                        seen_resolutions.add(res_label)
                        size_str = format_bytes(fmt.get('filesize') or fmt.get('filesize_approx'))
                        download_options.append({
                            'label': f"{res_label} {'Full HD' if height >= 1080 else 'HD' if height >= 720 else 'SD'} ({ext.upper()})",
                            'quality': res_label,
                            'format': ext,
                            'url': url_stream,
                            'sizeEstimate': size_str or 'High Quality'
                        })

            # 3. Audio format
            audio_formats = [f for f in valid_formats if (f.get('vcodec') == 'none' and f.get('acodec') != 'none') or f.get('ext') in ['m4a', 'mp3']]
            if audio_formats:
                best_audio = sorted(audio_formats, key=lambda x: x.get('abr') or 0, reverse=True)[0]
                download_options.append({
                    'label': f"Audio Only ({best_audio.get('ext', 'mp3').upper()})",
                    'quality': f"{int(best_audio.get('abr') or 128)} kbps",
                    'format': best_audio.get('ext', 'mp3'),
                    'url': best_audio.get('url'),
                    'sizeEstimate': format_bytes(best_audio.get('filesize') or best_audio.get('filesize_approx')) or '~3-5 MB'
                })

            # 4. Fallback if no specific resolution captured
            if not download_options:
                best_url = info.get('url') or (valid_formats[0].get('url') if valid_formats else None)
                if best_url:
                    download_options.append({
                        'label': 'Direct MP4 Stream',
                        'quality': 'Original',
                        'format': 'mp4',
                        'url': best_url,
                        'sizeEstimate': 'Ready'
                    })

            best_video_url = (download_options[0]['url'] if download_options else info.get('url'))

            return {
                "success": True,
                "data": {
                    "id": str(info.get('id') or 'media'),
                    "title": title,
                    "author": author,
                    "thumbnail": thumbnail,
                    "duration": duration,
                    "platform": platform,
                    "videoUrl": best_video_url,
                    "downloadOptions": download_options
                }
            }

    except Exception as e:
        error_msg = str(e)
        # Clean yt-dlp error prefixes
        clean_msg = re.sub(r'ERROR:\s*\[[^\]]+\]\s*', '', error_msg)
        raise HTTPException(status_code=400, detail=clean_msg)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
