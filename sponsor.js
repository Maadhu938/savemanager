/**
 * SaveManager Sponsor & Partner Recommendations Manager
 * Tactile, native affiliate cards and partner discovery engine.
 */

const SPONSOR_CONFIG = {
  enabled: true,
  slots: {
    topBanner: {
      enabled: true,
      title: 'Hostinger Cloud VPS - Up to 75% Off + Free Domain',
      desc: 'Deploy ultra-fast web apps with 99.9% uptime. Perfect for high-traffic media tools.',
      cta: 'Claim 75% Off',
      url: 'https://hostinger.com',
      badge: 'Partner'
    },
    inFeed: {
      enabled: true,
      title: 'ExpressVPN: Watch Any Stream at 4K Ultra Speeds',
      desc: 'Bypass restrictions, browse securely, and stream Instagram Reels & YouTube without buffering.',
      cta: 'Get 3 Months Free',
      url: 'https://expressvpn.com',
      badge: 'Recommended'
    },
    downloadReady: {
      enabled: true,
      title: 'NordVPN: Industry Leading Privacy Tool for Video Creators',
      desc: 'Download with military-grade 256-bit encryption. Protect your device now.',
      cta: 'Try 30 Days Free',
      url: 'https://nordvpn.com',
      badge: 'Featured'
    },
    bottomSticky: {
      enabled: true,
      title: 'Spotify Premium: 3 Months Free Audio Streaming',
      desc: 'Enjoy ad-free music, podcasts & high-fidelity downloads anywhere.',
      cta: 'Start Free Trial',
      url: 'https://spotify.com',
      badge: 'Partner'
    }
  }
};

class SponsorService {
  constructor(config = SPONSOR_CONFIG) {
    this.config = config;
  }

  init() {
    this.renderAllSlots();
    this.setupStickyBanner();
  }

  renderAllSlots() {
    const containers = document.querySelectorAll('[data-sponsor-slot], [data-ad-slot]');
    containers.forEach(container => {
      const slotKey = container.getAttribute('data-sponsor-slot') || container.getAttribute('data-ad-slot');
      const slotConfig = this.config.slots[slotKey];
      if (!slotConfig || !slotConfig.enabled) {
        container.style.display = 'none';
        return;
      }
      this.renderSlotCard(container, slotConfig, slotKey);
    });
  }

  renderSlotCard(container, slotConfig, slotKey) {
    if (slotKey === 'bottomSticky') {
      container.innerHTML = `
        <div class="sponsor-sticky-card">
          <div class="sponsor-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
          </div>
          <div class="sponsor-text">
            <span class="sponsor-badge">${slotConfig.badge}</span>
            <span class="sponsor-headline">${slotConfig.title}</span>
          </div>
          <a href="${slotConfig.url}" target="_blank" rel="noopener sponsored" class="sponsor-cta-btn">
            <span>${slotConfig.cta}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M7 17L17 7M17 7H7M17 7V17"/>
            </svg>
          </a>
        </div>
      `;
      // Now that content is injected, reveal the sticky bar container if not dismissed
      const stickyBar = document.getElementById('sponsor-sticky-container') || document.getElementById('ad-sticky-container');
      if (stickyBar && sessionStorage.getItem('dismiss_sticky_sponsor') !== 'true') {
        stickyBar.style.display = 'block';
      }
    } else {
      container.innerHTML = `
        <div class="sponsor-card">
          <div class="sponsor-meta">
            <span class="sponsor-badge">${slotConfig.badge}</span>
            <span class="sponsor-label">Verified Recommendation</span>
          </div>
          <div class="sponsor-body">
            <div class="sponsor-icon-lg">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </div>
            <div class="sponsor-info">
              <h4 class="sponsor-title">${slotConfig.title}</h4>
              <p class="sponsor-desc">${slotConfig.desc}</p>
            </div>
            <a href="${slotConfig.url}" target="_blank" rel="noopener sponsored" class="sponsor-cta-btn">
              <span>${slotConfig.cta}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M7 17L17 7M17 7H7M17 7V17"/>
              </svg>
            </a>
          </div>
        </div>
      `;
    }
  }

  setupStickyBanner() {
    const stickyBar = document.getElementById('sponsor-sticky-container') || document.getElementById('ad-sticky-container');
    const closeBtn = document.getElementById('sponsor-sticky-close') || document.getElementById('ad-sticky-close');
    if (!stickyBar) return;

    if (sessionStorage.getItem('dismiss_sticky_sponsor') === 'true') {
      stickyBar.style.display = 'none';
      return;
    }

    if (closeBtn) {
      closeBtn.onclick = () => {
        stickyBar.classList.add('sponsor-hiding');
        setTimeout(() => {
          stickyBar.style.display = 'none';
          sessionStorage.setItem('dismiss_sticky_sponsor', 'true');
        }, 250);
      };
    }
  }

  triggerDownloadSponsor(callback) {
    if (typeof callback === 'function') callback();
  }
}

// Global Exports
const instance = new SponsorService();
window.SaveManagerSponsors = instance;
window.SaveManagerAds = instance; // Backwards-compatible for app.js

document.addEventListener('DOMContentLoaded', () => {
  instance.init();
});
