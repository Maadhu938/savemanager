/**
 * SaveManager - Studio Grade Controller
 * Fast, tactile, responsive client controller with realistic live terminal ticker
 */

const AppState = {
  currentPlatform: 'auto',
  isLoading: false,
  currentMedia: null,
  history: []
};

const DOM = {
  body: document.body,
  downloadForm: document.getElementById('downloadForm'),
  urlInput: document.getElementById('urlInput'),
  clearInputBtn: document.getElementById('clearInputBtn'),
  pasteBtn: document.getElementById('pasteBtn'),
  submitBtn: document.getElementById('submitBtn'),
  detectedBadge: document.getElementById('detectedPlatformBadge'),
  detectedIcon: document.getElementById('detectedPlatformIcon'),
  detectedName: document.getElementById('detectedPlatformName'),
  segmentItems: document.querySelectorAll('.segment-item'),
  errorBanner: document.getElementById('errorBanner'),
  errorTitle: document.getElementById('errorTitle'),
  errorMessage: document.getElementById('errorMessage'),
  errorCloseBtn: document.getElementById('errorCloseBtn'),
  loadingCard: document.getElementById('loadingCard'),
  loadingTitle: document.getElementById('loadingTitle'),
  loadingSubtitle: document.getElementById('loadingSubtitle'),
  resultSection: document.getElementById('resultSection'),
  resPlatformName: document.getElementById('resPlatformName'),
  resMediaAuthor: document.getElementById('resMediaAuthor'),
  resMediaTitle: document.getElementById('resMediaTitle'),
  specContainer: document.getElementById('specContainer'),
  specResolution: document.getElementById('specResolution'),
  specAudio: document.getElementById('specAudio'),
  previewVideo: document.getElementById('previewVideoPlayer'),
  previewImage: document.getElementById('previewImage'),
  playOverlayBtn: document.getElementById('playOverlayBtn'),
  mediaDurationBadge: document.getElementById('mediaDurationBadge'),
  downloadOptionsGrid: document.getElementById('downloadOptionsGrid'),
  copyShareLinkBtn: document.getElementById('copyShareLinkBtn'),
  resetBtn: document.getElementById('resetBtn'),
  historyToggleBtn: document.getElementById('historyToggleBtn'),
  historyDrawer: document.getElementById('historyDrawer'),
  drawerBackdrop: document.getElementById('drawerBackdrop'),
  historyCloseBtn: document.getElementById('historyCloseBtn'),
  historyList: document.getElementById('historyList'),
  historyCount: document.getElementById('historyCount'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),
  toastContainer: document.getElementById('toastContainer')
};

// URL Detection Regexes
const PlatformDetectors = {
  instagram: /instagram\.com\/(?:reel|reels|p|share\/reel)\/([A-Za-z0-9_-]+)/i,
  facebook: /(?:facebook\.com\/(?:reel|watch|.*\/videos)\/|fb\.watch\/|facebook\.com\/share\/)/i,
  pinterest: /(?:pinterest\.[a-z.]+\/pin\/|pin\.it\/)/i,
  youtube: /(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)/i
};

function detectPlatform(url) {
  if (!url) return null;
  const clean = url.trim();

  if (PlatformDetectors.instagram.test(clean)) return 'instagram';
  if (PlatformDetectors.facebook.test(clean)) return 'facebook';
  if (PlatformDetectors.pinterest.test(clean)) return 'pinterest';
  if (PlatformDetectors.youtube.test(clean)) return 'youtube';

  if (clean.includes('instagram.com')) return 'instagram';
  if (clean.includes('facebook.com') || clean.includes('fb.watch')) return 'facebook';
  if (clean.includes('pinterest.') || clean.includes('pin.it')) return 'pinterest';
  if (clean.includes('youtube.com') || clean.includes('youtu.be')) return 'youtube';

  return null;
}

const SVG_ICONS = {
  link: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`,
  instagram: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>`,
  facebook: `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
  pinterest: `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.291 1.199-.332 1.365-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/></svg>`,
  youtube: `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`
};

function updateUrlDetectionUI() {
  const url = DOM.urlInput.value.trim();
  DOM.clearInputBtn.style.display = url ? 'inline-flex' : 'none';

  if (!url) {
    DOM.detectedBadge.className = 'platform-indicator-tag';
    DOM.detectedIcon.innerHTML = SVG_ICONS.link;
    DOM.detectedName.textContent = 'RAW URL';
    return;
  }

  const detected = detectPlatform(url);
  if (detected && SVG_ICONS[detected]) {
    DOM.detectedBadge.className = `platform-indicator-tag detected-${detected}`;
    DOM.detectedIcon.innerHTML = SVG_ICONS[detected];
    DOM.detectedName.textContent = detected.toUpperCase();
  } else {
    DOM.detectedBadge.className = 'platform-indicator-tag';
    DOM.detectedIcon.innerHTML = SVG_ICONS.link;
    DOM.detectedName.textContent = 'RAW URL';
  }
}

// Switch Platform Tabs
window.switchPlatformTab = function(platform) {
  AppState.currentPlatform = platform;
  DOM.body.setAttribute('data-active-platform', platform);

  DOM.segmentItems.forEach(item => {
    const p = item.getAttribute('data-platform');
    item.classList.toggle('is-active', p === platform);
  });

  const placeholders = {
    auto: 'Paste any Instagram, Facebook, Pinterest or YouTube link...',
    instagram: 'Paste Instagram Reel or Post link (e.g. instagram.com/reel/...)',
    facebook: 'Paste Facebook Reel or Watch link (e.g. facebook.com/reel/...)',
    pinterest: 'Paste Pinterest video pin or pin.it link (e.g. pin.it/...)',
    youtube: 'Paste YouTube Shorts or Video link (e.g. youtube.com/shorts/...)'
  };

  DOM.urlInput.placeholder = placeholders[platform] || placeholders.auto;
};

// Clipboard Paste
async function pasteFromClipboard() {
  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      const text = await navigator.clipboard.readText();
      if (text) {
        DOM.urlInput.value = text.trim();
        updateUrlDetectionUI();
        showToast('Link pasted', 'success');
        DOM.urlInput.focus();
        return;
      }
    }
    DOM.urlInput.focus();
  } catch (err) {
    DOM.urlInput.focus();
  }
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  toast.innerHTML = `<span style="color: #818cf8; font-family: var(--font-mono); margin-right: 6px;">[${icon}]</span> <span>${message}</span>`;
  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

function showError(title, message) {
  DOM.errorTitle.textContent = title || 'Extraction Failed';
  DOM.errorMessage.textContent = message || 'Could not parse media from URL. Ensure video is public.';
  DOM.errorBanner.style.display = 'flex';
}

function hideError() {
  DOM.errorBanner.style.display = 'none';
}

// Status Ticker Simulation
let tickerTimer = null;
const TICKER_STEPS = [
  'Resolving media link...',
  'Fetching video information...',
  'Preparing download formats...'
];

function runTerminalTicker() {
  let stepIdx = 0;
  DOM.loadingSubtitle.textContent = TICKER_STEPS[0];
  clearInterval(tickerTimer);

  tickerTimer = setInterval(() => {
    stepIdx++;
    if (stepIdx < TICKER_STEPS.length) {
      DOM.loadingSubtitle.textContent = TICKER_STEPS[stepIdx];
    }
  }, 450);
}

// Form Submission
async function handleDownloadSubmit(e) {
  if (e) e.preventDefault();

  const url = DOM.urlInput.value.trim();
  if (!url) {
    showError('Link Required', 'Please paste a valid video URL.');
    DOM.urlInput.focus();
    return;
  }

  hideError();
  AppState.isLoading = true;
  DOM.submitBtn.classList.add('is-loading');
  DOM.loadingCard.style.display = 'block';
  DOM.resultSection.style.display = 'none';
  DOM.loadingCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  runTerminalTicker();

  const platform = AppState.currentPlatform;

  try {
    const res = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, platform })
    });

    const json = await res.json();
    clearInterval(tickerTimer);

    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to extract media.');
    }

    setTimeout(() => {
      DOM.loadingCard.style.display = 'none';
      DOM.submitBtn.classList.remove('is-loading');
      AppState.isLoading = false;
      renderMediaResult(json.data);
      saveToHistory(json.data);
    }, 350);

  } catch (err) {
    clearInterval(tickerTimer);
    DOM.loadingCard.style.display = 'none';
    DOM.submitBtn.classList.remove('is-loading');
    AppState.isLoading = false;
    showError('Download Error', err.message);
  }
}

// Render Media Result
function renderMediaResult(media) {
  AppState.currentMedia = media;

  DOM.resPlatformName.textContent = media.platform.toUpperCase();
  DOM.resMediaAuthor.textContent = media.author || '@creator';
  DOM.resMediaTitle.textContent = media.title || 'Extracted Social Video';

  // Tech Specs
  DOM.specContainer.textContent = media.isImagePin ? 'JPEG / WebP' : 'MP4 (H.264)';
  DOM.specResolution.textContent = media.isImagePin ? 'Original 4K' : '1080p HD';
  DOM.specAudio.textContent = media.isImagePin ? 'N/A' : '320kbps AAC';

  // Preview Video/Image
  if (media.videoUrl) {
    DOM.previewVideo.src = media.videoUrl;
    DOM.previewVideo.poster = media.thumbnail || '';
    DOM.previewVideo.style.display = 'block';
    DOM.previewImage.style.display = 'none';
    DOM.playOverlayBtn.style.display = 'flex';
    DOM.mediaDurationBadge.textContent = '1080p Master';
  } else if (media.thumbnail) {
    DOM.previewImage.src = media.thumbnail;
    DOM.previewImage.style.display = 'block';
    DOM.previewVideo.style.display = 'none';
    DOM.playOverlayBtn.style.display = 'none';
    DOM.mediaDurationBadge.textContent = 'Original JPG';
  }

  // Populate Download Decks
  DOM.downloadOptionsGrid.innerHTML = '';
  const options = media.downloadOptions || [];

  if (options.length === 0 && media.videoUrl) {
    options.push({
      label: '1080p HD Video',
      quality: 'Master MP4',
      format: 'mp4',
      url: media.videoUrl,
      sizeEstimate: 'Original Stream'
    });
  }

  options.forEach((opt) => {
    const row = document.createElement('div');
    row.className = 'deck-item-row';

    const cleanFilename = `${media.platform}_${media.id || 'media'}_${opt.quality || 'hd'}.${opt.format || 'mp4'}`.replace(/\s+/g, '_');
    const proxyUrl = opt.proxyUrl || (opt.url && opt.url.includes('/mux?') ? opt.url : `/api/proxy?url=${encodeURIComponent(opt.url)}&filename=${encodeURIComponent(cleanFilename)}`);


    row.innerHTML = `
      <div class="deck-meta-info">
        <span class="deck-format-name">${opt.label}</span>
        <span class="deck-format-sub">${opt.quality} • ${opt.sizeEstimate || 'Ready'}</span>
      </div>
      <a href="${proxyUrl}" 
         download="${cleanFilename}" 
         class="tactile-download-link"
         target="_blank"
         rel="noopener">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <span>Save</span>
      </a>
    `;

    const link = row.querySelector('.tactile-download-link');
    link.addEventListener('click', () => {
      showToast('Starting file download...', 'success');
      if (window.SaveManagerAds) {
        window.SaveManagerAds.triggerDownloadSponsor();
      }
    });

    DOM.downloadOptionsGrid.appendChild(row);
  });

  DOM.resultSection.style.display = 'block';
  DOM.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (window.SaveManagerAds) {
    window.SaveManagerAds.renderAllSlots();
  }
}

// Media Play Trigger
DOM.playOverlayBtn.addEventListener('click', () => {
  if (DOM.previewVideo.paused) {
    DOM.previewVideo.play();
    DOM.playOverlayBtn.style.display = 'none';
  } else {
    DOM.previewVideo.pause();
    DOM.playOverlayBtn.style.display = 'flex';
  }
});

DOM.previewVideo.addEventListener('play', () => {
  DOM.playOverlayBtn.style.display = 'none';
});

DOM.previewVideo.addEventListener('pause', () => {
  DOM.playOverlayBtn.style.display = 'flex';
});

// Copy Direct URL
DOM.copyShareLinkBtn.addEventListener('click', () => {
  if (AppState.currentMedia && AppState.currentMedia.videoUrl) {
    navigator.clipboard.writeText(AppState.currentMedia.videoUrl)
      .then(() => showToast('Direct CDN stream URL copied', 'success'))
      .catch(() => showToast('Could not copy link', 'error'));
  }
});

// Reset
DOM.resetBtn.addEventListener('click', () => {
  DOM.resultSection.style.display = 'none';
  DOM.urlInput.value = '';
  updateUrlDetectionUI();
  DOM.urlInput.focus();
  window.scrollTo({ top: DOM.downloadForm.offsetTop - 120, behavior: 'smooth' });
});

// History in LocalStorage
function loadHistory() {
  try {
    const raw = localStorage.getItem('savemanager_history');
    AppState.history = raw ? JSON.parse(raw) : [];
    updateHistoryUI();
  } catch (e) {
    AppState.history = [];
  }
}

function saveToHistory(media) {
  if (!media) return;
  const item = {
    id: media.id || Date.now().toString(),
    platform: media.platform,
    title: media.title,
    author: media.author,
    thumbnail: media.thumbnail,
    videoUrl: media.videoUrl,
    downloadOptions: media.downloadOptions,
    timestamp: Date.now()
  };

  AppState.history = [item, ...AppState.history.filter(h => h.id !== item.id)].slice(0, 20);
  try {
    localStorage.setItem('savemanager_history', JSON.stringify(AppState.history));
  } catch (e) {}
  updateHistoryUI();
}

function updateHistoryUI() {
  DOM.historyCount.textContent = AppState.history.length;
  if (AppState.history.length === 0) {
    DOM.historyList.innerHTML = `
      <div style="text-align: center; padding: 40px 10px; color: var(--text-dim); font-size: 0.85rem;">
        No saved media in vault.
      </div>
    `;
    return;
  }

  DOM.historyList.innerHTML = '';
  AppState.history.forEach(item => {
    const el = document.createElement('div');
    el.className = 'history-item-card';
    el.innerHTML = `
      <img src="${item.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&q=70'}" alt="" class="history-thumb">
      <div class="history-info">
        <div class="history-item-title">${item.title}</div>
        <div class="history-item-sub">${item.platform.toUpperCase()} • ${item.author}</div>
      </div>
      <button type="button" class="tactile-btn" style="padding: 4px 8px; font-size: 0.72rem;">Load</button>
    `;

    el.querySelector('button').addEventListener('click', () => {
      renderMediaResult(item);
      toggleHistoryDrawer(false);
    });

    DOM.historyList.appendChild(el);
  });
}

function toggleHistoryDrawer(open) {
  const isOpen = open !== undefined ? open : !DOM.historyDrawer.classList.contains('is-open');
  DOM.historyDrawer.classList.toggle('is-open', isOpen);
  DOM.drawerBackdrop.classList.toggle('is-open', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
}


DOM.historyToggleBtn.addEventListener('click', () => toggleHistoryDrawer(true));
DOM.historyCloseBtn.addEventListener('click', () => toggleHistoryDrawer(false));
DOM.drawerBackdrop.addEventListener('click', () => toggleHistoryDrawer(false));

DOM.clearHistoryBtn.addEventListener('click', () => {
  AppState.history = [];
  localStorage.removeItem('savemanager_history');
  updateHistoryUI();
  showToast('Vault cleared', 'info');
});

// Theme Manager (Dark / Light)
function initTheme() {
  const savedTheme = localStorage.getItem('savemanager_theme') || 'dark';
  applyTheme(savedTheme);

  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
      showToast(`Switched to ${nextTheme} theme`);
    });
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('savemanager_theme', theme);

  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (!themeToggleBtn) return;

  if (theme === 'light') {
    themeToggleBtn.innerHTML = `
      <svg class="theme-icon moon-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
      <span id="themeToggleText">Dark</span>
    `;
  } else {
    themeToggleBtn.innerHTML = `
      <svg class="theme-icon sun-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
      <span id="themeToggleText">Light</span>
    `;
  }
}

// Legal Modal System
window.showLegalModal = function(type) {
  const contentMap = {
    terms: {
      title: 'Terms of Service',
      body: `
        <h4>1. Acceptance of Terms</h4>
        <p>By accessing and using SaveManager, you confirm that you have read, understood, and agreed to be legally bound by these Terms of Service. If you do not agree, discontinue use immediately.</p>
        <h4>2. Personal & Archival Use</h4>
        <p>SaveManager is provided strictly for personal backup, offline research, and fair-use archiving of publicly accessible social media content. Commercial exploitation, piracy, or distribution of downloaded materials without copyright holder consent is strictly forbidden.</p>
        <h4>3. Intellectual Property Rights</h4>
        <p>All trademarks, logos, and brand symbols displayed belong to their respective corporate owners (Meta Platforms Inc., Pinterest Inc., Alphabet Inc.). SaveManager is an independent open utility and is not affiliated with or endorsed by any social platform.</p>
        <h4>4. No Hosting / Direct Stream Notice</h4>
        <p>SaveManager does not operate video repositories, databases, or streaming servers. All media items are parsed transiently from official public content delivery networks (CDNs) directly to the end user's device.</p>
        <h4>5. Limitation of Liability</h4>
        <p>The service is provided "as is" without warranty of any kind. SaveManager shall not be held liable for any copyright infringement or misuse committed by users of this utility.</p>
      `
    },
    privacy: {
      title: 'Privacy Policy',
      body: `
        <h4>1. Zero-Log Personal Data Policy</h4>
        <p>SaveManager does not require accounts, logins, phone numbers, or credit cards. We never log or record personal identifying information.</p>
        <h4>2. Local Storage Usage</h4>
        <p>The "Media Vault" (Recent Downloads) stores your processed video metadata exclusively on your local device via HTML5 <code>localStorage</code>. This data never touches our servers and can be wiped anytime with the "Clear" button.</p>
        <h4>3. Analytics & Advertising Cookies</h4>
        <p>To keep SaveManager 100% free, we partner with reputable third-party advertising networks (e.g. Google AdSense). These partners may use cookies to serve non-intrusive contextual advertisements.</p>
        <h4>4. Ephemeral Processing</h4>
        <p>When you request a download, our serverless edge functions process the public media stream transiently in memory to inject native attachment headers. No media streams or client IP logs are permanently stored.</p>
        <h4>5. Contact Us</h4>
        <p>For privacy inquiries or technical concerns, email our team at <strong>privacy@savemanager.app</strong>.</p>
      `
    },
    disclaimer: {
      title: 'DMCA Takedown & Disclaimer',
      body: `
        <h4>1. DMCA Notice & Compliance</h4>
        <p>SaveManager respects copyright laws and complies with the Digital Millennium Copyright Act (16 U.S.C. § 512). As an algorithmic parser and streaming proxy, SaveManager does not host or duplicate any media files.</p>
        <h4>2. Third-Party Hosting Disclaimer</h4>
        <p>All video and audio files extracted through this tool remain hosted on the official servers and content delivery networks of Instagram, Facebook, Pinterest, and YouTube. Removing a video from the host network automatically renders it inaccessible via SaveManager.</p>
        <h4>3. DMCA Takedown Contact</h4>
        <p>If you are a copyright owner or authorized representative seeking to restrict access to a specific URL pattern, submit a written notice to <strong>dmca@savemanager.app</strong> containing the exact URL and proof of authorized representation.</p>
      `
    }
  };

  const selected = contentMap[type] || contentMap.terms;
  const modalBackdrop = document.getElementById('legalModalBackdrop');
  const modalTitle = document.getElementById('legalModalTitle');
  const modalContent = document.getElementById('legalModalContent');
  const modalClose = document.getElementById('legalModalClose');
  const modalOk = document.getElementById('legalModalOkBtn');

  if (modalTitle) modalTitle.textContent = selected.title;
  if (modalContent) modalContent.innerHTML = selected.body;
  if (modalBackdrop) modalBackdrop.style.display = 'flex';

  const closeModal = () => {
    if (modalBackdrop) modalBackdrop.style.display = 'none';
  };

  if (modalClose) modalClose.onclick = closeModal;
  if (modalOk) modalOk.onclick = closeModal;
  if (modalBackdrop) {
    modalBackdrop.onclick = (e) => {
      if (e.target === modalBackdrop) closeModal();
    };
  }
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modalBackdrop = document.getElementById('legalModalBackdrop');
    if (modalBackdrop) modalBackdrop.style.display = 'none';
  }
});

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  DOM.urlInput.addEventListener('input', updateUrlDetectionUI);
  DOM.clearInputBtn.addEventListener('click', () => {
    DOM.urlInput.value = '';
    updateUrlDetectionUI();
    DOM.urlInput.focus();
  });
  DOM.pasteBtn.addEventListener('click', pasteFromClipboard);

  DOM.downloadForm.addEventListener('submit', handleDownloadSubmit);
  DOM.errorCloseBtn.addEventListener('click', hideError);

  DOM.segmentItems.forEach(item => {
    item.addEventListener('click', () => {
      const p = item.getAttribute('data-platform');
      switchPlatformTab(p);
    });
  });

  document.querySelectorAll('.sample-token').forEach(token => {
    token.addEventListener('click', () => {
      DOM.urlInput.value = token.getAttribute('data-sample');
      updateUrlDetectionUI();
      handleDownloadSubmit();
    });
  });

  loadHistory();
  initTheme();
});
