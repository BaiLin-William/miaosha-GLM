// ── 10-native-pay-trigger.js ────────────────────────────────────────────────
// Listens for BURST_FIRE_SUCCESS from the ISOLATED world content script and,
// on success, opens bigmodel.cn's OWN in-page payment modal — the PayComponent
// Vue instance living under #app.
//
// We do NOT render any custom payment UI. The whole point of this module is to
// hand control back to the website's native payment flow so users pay
// bigmodel.cn directly, with no extension-mediated UI in between. This avoids
// the trust problem where users might think they are paying the extension
// rather than the merchant.
//
// Implementation notes (reverse-engineered from bigmodel.cn; may need re-check
// if the site reshuffles its Vue tree):
//
//   The PayComponent is a Vue 2 component (Element UI based) mounted under
//   #app. It exposes:
//     data:    { priceData, payDialogVisible, payType, captchaVerified, isSoldOut, ... }
//     methods: payPreviewFn, getPayStatusFn, selectPayTypeFn, closeAndRefreshFn
//
//   To open the modal with an already-reserved bizId we set:
//     pay.priceData        = { bizId, productId, thirdPartyAmount, payAmount, qrCode, ... }
//     pay.captchaVerified  = true          // skip their captcha gate
//     pay.isSoldOut        = false
//     pay.payDialogVisible = true

(function () {
  var _pt_payComponent = null;
  var _pt_discoveryAttempted = false;

  function findPayComponent() {
    if (_pt_payComponent) return _pt_payComponent;
    if (_pt_discoveryAttempted) return null;
    _pt_discoveryAttempted = true;

    var root = document.querySelector('#app');
    if (!root || !root.__vue__) return null;
    var top = root.__vue__;
    while (top.$parent) top = top.$parent;

    var queue = [top];
    var visited = new Set();
    while (queue.length) {
      var vm = queue.shift();
      if (!vm || visited.has(vm)) continue;
      visited.add(vm);
      var opts = vm.$options;
      var data = vm.$data;
      if (opts && opts.name === 'PayComponent' && data && 'payDialogVisible' in data) {
        _pt_payComponent = vm;
        return vm;
      }
      var children = vm.$children || [];
      for (var i = 0; i < children.length; i++) queue.push(children[i]);
    }
    return null;
  }

  function buildPriceData(ps) {
    return {
      bizId: ps.bizId,
      productId: ps.productId,
      thirdPartyAmount: typeof ps.amount === 'number' ? ps.amount : null,
      payAmount: typeof ps.amount === 'number' ? ps.amount : null,
      qrCode: ps.qrCode || null,
    };
  }

  function openNativePaymentDialog(ps) {
    if (!ps || !ps.bizId) return false;
    var pay = findPayComponent();
    if (!pay) {
      console.warn('[miaosha] PayComponent not found in Vue tree — bigmodel.cn may have restructured.');
      return false;
    }
    try {
      pay.priceData = buildPriceData(ps);
      pay.isSoldOut = false;
      pay.isServerBusy = false;
      pay.payType = ps.payType || 'ALI';

      pay.payDialogVisible = true;
      var setVerified = function () {
        try {
          pay.captchaVerified = true;
          pay.captchaTicket = pay.captchaTicket || 'miaosha-bypass';
          pay.captchaRandstr = pay.captchaRandstr || 'miaosha-bypass';
        } catch (e) { /* ignore */ }
      };
      if (typeof pay.$nextTick === 'function') {
        pay.$nextTick(setVerified);
      } else {
        setTimeout(setVerified, 0);
      }
      return true;
    } catch (e) {
      console.warn('[miaosha] Failed to open native PayComponent dialog:', e);
      return false;
    }
  }

  window.addEventListener('message', function (e) {
    if (!e.data || e.data.__miaosha_overlay !== true) return;
    var msg = e.data;
    if (msg.type !== 'BURST_FIRE_SUCCESS') return;
    var ps = msg.data;
    if (!ps || !ps.bizId) return;
    openNativePaymentDialog(ps);
  });
})();
