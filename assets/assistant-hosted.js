/* Public endpoint selection only. No credential or model settings belong here. */
(() => {
  'use strict';
  if (location.origin !== 'https://bing2002.com' && location.origin !== 'https://www.bing2002.com') return;
  window.PortfolioAssistantConnection?.configureHosted();
})();
