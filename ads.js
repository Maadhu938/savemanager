/**
 * SaveManager Ads Service & Monetization Manager
 * Supports: Google AdSense, PropellerAds, Direct Affiliate Banners, and Native Placements
 */

const ADS_CONFIG = {
  // Set your Google AdSense Publisher ID here (e.g., 'ca-pub-1234567890123456')
  googleAdSenseId: '', 
  
  // Set to false once your AdSense account is approved and you add real ad units
  demoMode: true,

  // Individual ad slot configurations
  slots: {
    topBanner: {
      enabled: true,
      adSenseSlotId: '1234567890',
      format: 'auto',
      demoTitle: 'Hostinger Cloud VPS - Up to 75% Off + Free Domain',
      demoDesc: 'Deploy ultra-fast web apps with 99.9% uptime. Perfect for high-traffic media tools.',
      demoCta: 'Claim 75% Discount',
      demoUrl: 'https://hostinger.com',
      badge: 'Sponsored'
    },
    inFeed: {
      enabled: true,
      adSenseSlotId: '2345678901',
      format: 'horizontal',
      demoTitle: 'ExpressVPN: Watch Any Stream at 4K Ultra Speeds',
      demoDesc: 'Bypass restrictions, browse securely, and stream Instagram Reels & YouTube without buffering.',
      demoCta: 'Get 3 Months Free',
      demoUrl: 'https://expressvpn.com',
      badge: 'Recommended'
    },
    downloadReady: {
      enabled: true,
      adSenseSlotId: '3456789012',
      format: 'rectangle',
      demoTitle: 'NordVPN: Industry Leading Privacy Tool for Video Creators',
      demoDesc: 'Download with military-grade 256-bit encryption. Protect your device now.',
      demoCta: 'Try 30 Days Free',
      demoUrl: 'https://nordvpn.com',
      badge: 'Partner'
    },
    bottomSticky: {
      enabled: true,
      adSenseSlotId: '4567890123',
      format: 'banner',
      demoTitle: 'Spotify Premium: 3 Months Free Audio Streaming',
      demoDesc: 'Enjoy ad-free music, podcasts & high-fidelity downloads anywhere.',
      demoCta: 'Start Free Trial',
      demoUrl: 'https://spotify.com',
      badge: 'Partner'
    }
  }
};

class AdsService {
  constructor(config = ADS_CONFIG) {
    this.config = config;
    this.adBlockDetected = false;
  }

  init() {
    this.checkAdBlocker();
    if (this.config.googleAdSenseId && !this.config.demoMode) {
      this.loadGoogleAdSenseScript(this.config.googleAdSenseId);
    }
    this.renderAllSlots();
    this.setupStickyBanner();
  }

  // Load Google AdSense script dynamically
  loadGoogleAdSenseScript(clientId) {
    if (document.getElementById('adsense-script')) return;
    const script = document.createElement('script');
    script.id = 'adsense-script';
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
  }

  // Check if an ad blocker is enabled
  checkAdBlocker() {
    const testAd = document.createElement('div');
    testAd.className = 'adsbox pub_300x250 pub_728x90 text-ad textAd text_ad';
    testAd.style.position = 'absolute';
    testAd.style.left = '-9999px';
    document.body.appendChild(testAd);

    window.setTimeout(() => {
      if (testAd.offsetHeight === 0) {
        this.adBlockDetected = true;
        console.info('AdBlocker detected. SaveManager operates seamlessly with or without ads.');
      }
      testAd.remove();
    }, 150);
  }

  // Render ad slot containers
  renderAllSlots() {
    const containers = document.querySelectorAll('[data-ad-slot]');
    containers.forEach(container => {
      const slotKey = container.getAttribute('data-ad-slot');
      const slotConfig = this.config.slots[slotKey];
      if (!slotConfig || !slotConfig.enabled) {
        container.style.display = 'none';
        return;
      }

      if (this.config.demoMode || !this.config.googleAdSenseId) {
        this.renderDemoAd(container, slotConfig, slotKey);
      } else {
        this.renderAdSenseAd(container, slotConfig);
      }
    });
  }

  // Render High-CPM Native Demo Ad Card
  renderDemoAd(container, slotConfig, slotKey) {
    container.innerHTML = `
      <div class="ad-unit ad-${slotKey}">
        <div class="ad-meta">
          <span class="ad-badge">${slotConfig.badge || 'Ad'}</span>
          <span class="ad-label">SaveManager Partner</span>
        </div>
        <div class="ad-content">
          <div class="ad-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
          </div>
          <div class="ad-text-block">
            <h4 class="ad-headline">${slotConfig.demoTitle}</h4>
            <p class="ad-description">${slotConfig.demoDesc}</p>
          </div>
          <a href="${slotConfig.demoUrl}" target="_blank" rel="noopener sponsored" class="ad-cta-btn">
            <span>${slotConfig.demoCta}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M7 17L17 7M17 7H7M17 7V17"/>
            </svg>
          </a>
        </div>
      </div>
    `;
  }

  // Render official Google AdSense markup
  renderAdSenseAd(container, slotConfig) {
    container.innerHTML = `
      <ins class="adsbygoogle"
           style="display:block"
           data-ad-client="${this.config.googleAdSenseId}"
           data-ad-slot="${slotConfig.adSenseSlotId}"
           data-ad-format="${slotConfig.format || 'auto'}"
           data-full-width-responsive="true"></ins>
    `;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.warn('AdSense push error:', e);
    }
  }

  // Sticky banner bottom bar logic
  setupStickyBanner() {
    const stickyContainer = document.getElementById('ad-sticky-container');
    const closeBtn = document.getElementById('ad-sticky-close');
    if (!stickyContainer) return;

    if (sessionStorage.getItem('dismiss_sticky_ad') === 'true') {
      stickyContainer.style.display = 'none';
      return;
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        stickyContainer.classList.add('ad-sticky-hiding');
        setTimeout(() => {
          stickyContainer.style.display = 'none';
          sessionStorage.setItem('dismiss_sticky_ad', 'true');
        }, 300);
      });
    }
  }

  // Interstitial trigger before download
  triggerDownloadSponsor(callback) {
    // If demo mode or ad enabled, show smooth sponsored toast/notice without blocking UX
    if (typeof callback === 'function') {
      callback();
    }
  }
}

// Global instance
window.SaveManagerAds = new AdsService();
document.addEventListener('DOMContentLoaded', () => {
  window.SaveManagerAds.init();
});
