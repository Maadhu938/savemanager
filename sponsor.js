/**
 * SaveManager Monetization & Adsterra Smartlink Engine
 * Smartlink 1 (Fast Mirror): https://ironcomparable.com/cc6yaevm7?key=1c1ac831ba00fe353015701765ecf878
 * Smartlink 2 (Download Companion): https://ironcomparable.com/bcdikwk6?key=c0e9f6a8622ad5109ea674f7af31f6b8
 */
(function () {
  var SMARTLINK_1 = 'https://ironcomparable.com/cc6yaevm7?key=1c1ac831ba00fe353015701765ecf878';
  var SMARTLINK_2 = 'https://ironcomparable.com/bcdikwk6?key=c0e9f6a8622ad5109ea674f7af31f6b8';

  window.SaveManagerSponsors = window.SaveManagerSponsors || {
    smartlinkFastServer: SMARTLINK_1,
    smartlinkDownloadTrigger: SMARTLINK_2,
    smartlinkUrl: SMARTLINK_1,

    triggerSmartlink: function (force, url) {
      try {
        var targetUrl = url || this.smartlinkDownloadTrigger || this.smartlinkUrl;
        var now = Date.now();
        var last = parseInt(sessionStorage.getItem('sm_smartlink_last') || '0', 10);
        // 30-second frequency cooldown so users downloading multiple files are not spammed
        if (!force && (now - last < 30000)) {
          return false;
        }
        sessionStorage.setItem('sm_smartlink_last', now.toString());
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
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


