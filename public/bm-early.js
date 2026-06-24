// MAIN-world script injected by bm-early.content.ts at document_start.
// Saves a reference to the page's original fetch/XHR before the page's Sentry
// SDK instruments them. The overlay later uses these references to call
// /api/biz/pay/batch-preview without triggering Alibaba WAF 405 blocks.
(function() {
  if (window.__bm_originalFetch) return;
  try {
    window.__bm_originalFetch = window.fetch;
    window.__bm_originalXHR = window.XMLHttpRequest;
  } catch (e) {}
})();
