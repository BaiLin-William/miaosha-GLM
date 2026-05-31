function setupXhrInterception() {
  var origOpen = XMLHttpRequest.prototype.open;
  var origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(m, u) { this._u = u; return origOpen.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function(b) {
    if (this._u) {
      if (this._u.indexOf('/api/biz/pay/preview') !== -1) {
        this.addEventListener('load', function() {
          try {
            var d = JSON.parse(this.responseText);
            if (d.code === 200 && d.data) {
              postMsg('PAYMENT_PREVIEW', { qrCode: d.data.qrCode, bizId: d.data.bizId, amount: d.data.thirdPartyAmount || d.data.payAmount, productId: d.data.productId, soldOut: d.data.soldOut });
            } else if (d.code) { postMsg('PAYMENT_PREVIEW_ERROR', { code: d.code, msg: d.msg }); }
          } catch(e){}
        });
      }
      if (this._u.indexOf('/api/biz/pay/check') !== -1) {
        this.addEventListener('load', function() {
          try {
            var d = JSON.parse(this.responseText);
            if (d.code === 200) postMsg('PAYMENT_CHECK', { bizId: d.data });
          } catch(e){}
        });
      }
      if (this._u.indexOf('/api/biz/pay/batch-preview') !== -1) {
        this.addEventListener('load', function() {
          try {
            var d = JSON.parse(this.responseText);
            if (d.code === 200 && d.data && d.data.productList) {
              sessionStorage.setItem('bm_batch_preview', JSON.stringify(d));
              updateProductMatrix(d.data.productList);
            }
          } catch(e){}
        });
      }
    }
    return origSend.apply(this, arguments);
  };
}
