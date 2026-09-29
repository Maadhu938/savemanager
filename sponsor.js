/**
 * SaveManager Monetization & Adsterra Smartlink Engine
 * Smartlink direct link provided by Adsterra:
 * https://ironcomparable.com/cc6yaevm7?key=1c1ac831ba00fe353015701765ecf878
 */
(function () {
  var SMARTLINK_URL = 'https://ironcomparable.com/cc6yaevm7?key=1c1ac831ba00fe353015701765ecf878';

  window.SaveManagerSponsors = window.SaveManagerSponsors || {
    smartlinkUrl: SMARTLINK_URL,

    triggerSmartlink: function (force) {
      try {
        var now = Date.now();
        var last = parseInt(sessionStorage.getItem('sm_smartlink_last') || '0', 10);
        // 30-second frequency cooldown so users downloading multiple files are not spammed
        if (!force && (now - last < 30000)) {
          return false;
        }
        sessionStorage.setItem('sm_smartlink_last', now.toString());
        window.open(this.smartlinkUrl, '_blank', 'noopener,noreferrer');
        return true;
      } catch (e) {
        console.warn('Smartlink trigger:', e);
        return false;
      }
    },

    init: function () {},
    renderAllSlots: function () {},
    triggerDownloadSponsor: function () {
      return this.triggerSmartlink();
    }
  };

  window.SaveManagerAds = window.SaveManagerSponsors;
})();

