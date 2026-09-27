/**
 * SaveManager Ads Compatibility Shim
 * Delegates to sponsor.js
 */
if (typeof window.SaveManagerSponsors === 'undefined') {
  const s = document.createElement('script');
  s.src = 'sponsor.js';
  document.head.appendChild(s);
}
