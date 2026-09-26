# 🚀 SaveManager - Multi-Platform Video & Reels Downloader

**SaveManager** is an ultra-fast, premium web application built to download videos, reels, shorts, stories, and audio from **Instagram**, **Facebook**, **Pinterest**, and **YouTube**.

Designed for fast performance, clean modern UI, advertisement monetization, and seamless 1-click deployment on **Vercel**.

---

## ✨ Features & Capabilities

- 📸 **Instagram Downloader**: Download Instagram Reels, Videos, IGTV, and high-res cover photos in original 1080p MP4.
- 📘 **Facebook Downloader**: Download Facebook Reels, Watch videos, and public timeline posts with HD (1080p/720p) and SD options.
- 📌 **Pinterest Downloader**: Download video pins, aesthetic idea pins, and high-resolution pin artworks. Resolves `pin.it` shortlinks automatically.
- ▶️ **YouTube Shorts & Video Downloader**: Extract viral YouTube Shorts and videos in 1080p, 720p, 480p, high-bitrate 320kbps MP3 audio, and MaxRes cover thumbnails.
- 🔍 **Smart Auto-Detect**: Simply paste any link — SaveManager detects the platform and optimizes the download options instantly.
- 🎬 **In-App Media Player**: Watch or preview videos and listen to audio right inside the browser before downloading.
- 📥 **Direct Attachment Downloads**: Built-in `/api/proxy` bypasses CORS and browser hotlink blocking, forcing the file to save directly to the user's device with a clean filename.
- 🕒 **Recent Downloads History**: Stored locally in `localStorage` for fast re-downloading.
- 🎨 **Luxury Dark UI**: Glassmorphism, animated ambient mesh gradients, micro-interactions, and responsive layouts.
- 🗺️ **SEO Ready**: Full `sitemap.xml` and `robots.txt` pre-configured for Google and Bing indexing.
- 💰 **Built-in Ads Service**: Ready for **Google AdSense** (`ca-pub-XXXXXXXXXX`), PropellerAds, or direct affiliate sponsorships with high-CTR placements.

---

## 📁 Project Architecture

```
instasave/
├── index.html          # Semantic HTML5 frontend with SEO meta tags & ad slots
├── style.css           # Vanilla CSS design system with dark luxury glassmorphism
├── app.js              # Client-side controller (auto-detect, clipboard API, video preview, history)
├── ads.js              # Ads Service & monetization manager (AdSense, native slots, sticky banner)
├── sitemap.xml         # XML Sitemap for search engines
├── robots.txt          # SEO crawler rules
├── vercel.json         # Vercel deployment & serverless function configuration
├── server.js           # Local development server (zero npm dependencies required)
├── package.json        # Project metadata
└── api/
    ├── download.js     # Master unified API dispatcher with auto-detection
    ├── instagram.js    # Instagram Reels & media scraper
    ├── facebook.js     # Facebook Reels & Watch video scraper
    ├── pinterest.js    # Pinterest video & pin scraper
    ├── youtube.js      # YouTube Shorts, video & audio extractor
    └── proxy.js        # Media streaming proxy with Content-Disposition attachment headers
```

---

## 🚀 How to Run Locally

You can run SaveManager locally with zero external npm dependencies:

```bash
# Start the local development server
node server.js
```
or:
```bash
npm start
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## ☁️ How to Deploy to Vercel

SaveManager is 100% pre-configured for Vercel Serverless deployment.

### Method 1: Deploy via GitHub (Recommended)
1. Push your repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of SaveManager"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/savemanager.git
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com) and log in.
3. Click **"Add New..."** -> **"Project"**.
4. Select your `savemanager` repository.
5. Leave all build settings as default (Framework Preset: **Other**) and click **"Deploy"**.
6. Your site is live on your custom `*.vercel.app` domain!

### Method 2: Deploy via Vercel CLI
```bash
npm i -g vercel
vercel
```

---

## 💰 How to Configure Ads & Monetization

Open `ads.js`:

```javascript
const ADS_CONFIG = {
  // 1. Enter your Google AdSense Publisher ID here:
  googleAdSenseId: 'ca-pub-XXXXXXXXXXXXXXXX', 
  
  // 2. Set demoMode to false once AdSense is approved:
  demoMode: false,

  // 3. Configure individual ad unit slot IDs from Google AdSense:
  slots: {
    topBanner: { enabled: true, adSenseSlotId: '1234567890' },
    inFeed: { enabled: true, adSenseSlotId: '2345678901' },
    downloadReady: { enabled: true, adSenseSlotId: '3456789012' },
    bottomSticky: { enabled: true, adSenseSlotId: '4567890123' }
  }
};
```

When `demoMode: true` is active, stylish simulated sponsored units appear to show how ads will look and encourage partner clicks.

---

## 🗺️ Sitemap & SEO

- **Sitemap**: `/sitemap.xml` lists all landing anchors and platform features for maximum organic search traffic.
- **Robots**: `/robots.txt` ensures search engine crawlers index all download pages while preserving API serverless quotas.

---

## ⚖️ Legal Disclaimer

SaveManager is an independent open-source tool for educational and personal archiving purposes. It is not affiliated with, endorsed by, or associated with Instagram, Facebook, Meta, Pinterest, or YouTube. All trademarks belong to their respective owners.
