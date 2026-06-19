function buildProductMatrix(productList) {
  var groups = { monthly: [], quarterly: [], yearly: [] };
  for (var i = 0; i < productList.length; i++) {
    var item = productList[i];
    var billing = inferBillingFromPreview(item);
    if (!groups[billing]) groups[billing] = [];
    groups[billing].push(item);
  }

  var matrix = { monthly: [], quarterly: [], yearly: [] };
  var billings = ['monthly', 'quarterly', 'yearly'];
  for (var j = 0; j < billings.length; j++) {
    var currentBilling = billings[j];
    var rows = groups[currentBilling] || [];
    rows.sort(function(a, b) {
      return Number(a.monthlyPayAmount || a.payAmount || 0) - Number(b.monthlyPayAmount || b.payAmount || 0);
    });
    for (var k = 0; k < rows.length && k < _planOrder.length; k++) {
      var preview = rows[k];
      var renewAmount = preview.renewAmount != null ? preview.renewAmount : preview.payAmount;
      matrix[currentBilling].push({
        id: preview.productId,
        name: _planOrder[k],
        price: preview.monthlyPayAmount,
        originalPrice: preview.monthlyOriginalAmount,
        currentAmount: preview.payAmount,
        renewAmount: renewAmount,
        soldOut: !!(preview.soldOut || preview.forbidden || preview.canPurchase === false),
        tag: getPromoTag(preview),
        description: getRenewLabel(currentBilling) + '：¥' + formatAmount(renewAmount),
        raw: preview,
      });
    }
  }

  return matrix;
}

function getVisibleProducts() {
  return _productMatrix[_billing] || [];
}

function getAllProducts() {
  return [].concat(_productMatrix.monthly || [], _productMatrix.quarterly || [], _productMatrix.yearly || []);
}

function findProductById(id) {
  var all = getAllProducts();
  for (var i = 0; i < all.length; i++) {
    if (all[i].id === id) return all[i];
  }
  return null;
}

function priorityIndexOf(productId) {
  for (var i = 0; i < _priorityList.length; i++) {
    if (_priorityList[i].productId === productId) return i;
  }
  return -1;
}

function getSelectionSummary() {
  var selected = _priorityList.length;
  return {
    total: getAllProducts().length,
    selected: selected,
    tickets: _ticketCount,
    launchable: Math.min(selected, _ticketCount),
  };
}

function syncSelectionStatus() {
  var summary = getSelectionSummary();
  var tag = document.getElementById('_prodTag');
  var sel = document.getElementById('_prodSel');
  var fb = document.getElementById('_fb');
  var fbb = document.getElementById('_fbb');
  var ammo = document.getElementById('_ammo');
  var cp = document.getElementById('_cpd');
  var cpb = document.getElementById('_cpb');
  var meter = document.getElementById('_meter');

  if (summary.total > 0 && tag) {
    tag.textContent = summary.selected + '/' + Math.min(summary.total, 3);
    tag.className = 'tg ' + (summary.selected > 0 ? 'tg-g' : 'tg-a');
  }

  if (sel) {
    if (summary.total === 0) {
      sel.innerHTML = '';
    } else if (summary.selected === 0) {
      sel.innerHTML = '<span style="color:#f59e0b">Select up to 3 products to enable Fire</span>';
    } else if (summary.tickets === 0) {
      sel.innerHTML = '<span style="color:#d97706"><b>' + summary.selected + '</b> selected · <b>0</b> tickets · add captcha</span>';
    } else {
      var names = _priorityList.map(function(item, idx) {
        var p = findProductById(item.productId);
        return (p ? p.name : item.productId.slice(-6)) + (idx < _priorityList.length - 1 ? ' > ' : '');
      }).join('');
      sel.innerHTML = '<b>' + summary.selected + '</b> selected · <b>' + summary.tickets + '</b> tickets · priority ' + names;
    }
  }

  if (fb) {
    fb.disabled = summary.launchable === 0;
    fb.innerHTML = '&#9889; FIRE 串行 (' + summary.launchable + ')';
  }
  if (fbb) {
    fbb.disabled = summary.launchable === 0;
    fbb.innerHTML = '&#9889; BURST 并发 (' + summary.launchable + ') · 200ms';
  }
  if (ammo) {
    if (summary.selected === 0) {
      ammo.textContent = 'Select products to calculate burst size';
      ammo.style.color = '#64748b';
    } else if (summary.tickets === 0) {
      ammo.textContent = summary.selected + ' selected · 0 tickets · add captcha first';
      ammo.style.color = '#d97706';
    } else {
      ammo.textContent = summary.selected + ' selected · ' + summary.tickets + ' tickets · ' + summary.launchable + ' ready to strike';
      ammo.style.color = '#059669';
    }
  }

  if (meter) {
    var children = meter.children;
    var ready = Math.min(summary.launchable, 10);
    for (var j = 0; j < children.length; j++) {
      children[j].className = 'fp' + (j < ready ? ' on' : '');
    }
  }

  if (cp) {
    var captchaReady = summary.selected > 0 ? summary.tickets >= summary.selected : summary.tickets > 0;
    cp.className = 'pd ' + (captchaReady ? 'ok' : 'w');
  }
  if (cpb) {
    if (summary.selected > 0) cpb.textContent = summary.tickets + '/' + summary.selected;
    else cpb.textContent = summary.tickets > 0 ? String(summary.tickets) : '';
  }
}

function restoreSelectedProducts() {
  var saved = null;
  try {
    saved = JSON.parse(sessionStorage.getItem('bm_priority_v2') || 'null');
  } catch(e) {
    saved = null;
  }

  _priorityList = [];
  if (saved && Array.isArray(saved.priorityList)) {
    for (var i = 0; i < saved.priorityList.length && i < 3; i++) {
      var item = saved.priorityList[i];
      if (item && item.productId) {
        _priorityList.push({ productId: item.productId });
      }
    }
  }

  // Default target: yearly Pro plan when nothing is selected.
  if (_priorityList.length === 0) {
    var yearly = _productMatrix.yearly || [];
    for (var j = 0; j < yearly.length; j++) {
      if (yearly[j].name === 'Pro') {
        _priorityList.push({ productId: yearly[j].id });
        break;
      }
    }
  }
}

function persistSelection() {
  var payload = { priorityList: _priorityList };
  try {
    sessionStorage.setItem('bm_priority_v2', JSON.stringify(payload));
  } catch(e) {}
  postMsg('PRODUCT_SELECTION_CHANGED', payload);
  return payload;
}

function toggleProductSelection(productId) {
  var idx = priorityIndexOf(productId);
  var maxFlash = document.getElementById('_prodTag');
  if (idx >= 0) {
    _priorityList.splice(idx, 1);
  } else {
    if (_priorityList.length >= 3) {
      if (maxFlash) {
        maxFlash.textContent = 'MAX 3';
        maxFlash.className = 'tg tg-r';
        setTimeout(function() { syncSelectionStatus(); }, 1200);
      }
      return;
    }
    _priorityList.push({ productId: productId });
  }
  persistSelection();
  renderProducts();
  renderFireConfig();
  syncSelectionStatus();
}

function updateProductMatrix(productList) {
  if (productList && productList.length > 0) { _authFailed = false; }
  _productMatrix = buildProductMatrix(productList || []);
  if (_productMatrix.monthly.length + _productMatrix.quarterly.length + _productMatrix.yearly.length > 0) {
    _productLoadStatus.status = 'loaded';
    _productLoadStatus.error = '';
  }
  restoreSelectedProducts();
  persistSelection();
  renderProducts();
  renderFireConfig();
}

function loadBatchPreviewFromCache() {
  if (!hasLocalAuthSignals()) return;
  try {
    var cached = JSON.parse(sessionStorage.getItem('bm_batch_preview') || 'null');
    if (cached && cached.data && cached.data.productList) {
      updateProductMatrix(cached.data.productList);
    }
  } catch(e) {}
}

function getLocalAuthHeaders() {
  try {
    var jwt = '';
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
      var part = cookies[i].trim();
      if (part.indexOf('bigmodel_token_production=') === 0) {
        jwt = part.substring('bigmodel_token_production='.length);
        break;
      }
    }
    var org = localStorage.getItem('Bigmodel-Organization');
    var proj = localStorage.getItem('Bigmodel-Project');
    if (!jwt || !org || !proj) return null;
    return {
      authorization: jwt.indexOf('Bearer ') === 0 ? jwt : 'Bearer ' + jwt,
      bigmodelOrganization: org,
      bigmodelProject: proj
    };
  } catch(e) {
    return null;
  }
}

function hasLocalAuthSignals() {
  return !!getLocalAuthHeaders();
}

function recoverViaAuthenticatedRefresh() {
  if (!hasLocalAuthSignals()) return false;
  _authFailed = false;
  cmdToOverlay('REFRESH_BATCH_PREVIEW');
  return true;
}

function renderProductsLoading() {
  var list = document.getElementById('_prodList');
  var tag = document.getElementById('_prodTag');
  if (!list) return;
  list.innerHTML = '<div style="font-size:8px;color:#94a3b8;text-align:center;padding:10px 6px;line-height:1.8"><div class="spinner" style="width:14px;height:14px;border:2px solid #e2e8f0;border-top-color:#6366f1;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 6px"></div>Loading products…</div>';
  if (tag) { tag.textContent = 'LOADING'; tag.className = 'tg tg-a'; }
}

function renderProductsError(reason) {
  var list = document.getElementById('_prodList');
  var tag = document.getElementById('_prodTag');
  if (!list) return;
  list.innerHTML =
    '<div style="font-size:8px;text-align:center;padding:10px 6px;line-height:1.8">' +
    '<div style="color:#dc2626;font-weight:700;margin-bottom:4px">&#9888; 产品加载失败</div>' +
    '<div style="color:#64748b;font-size:8px;margin-bottom:6px">' + (reason || 'unknown') + '</div>' +
    '<button id="_prodRetry" style="display:inline-block;padding:3px 10px;background:#6366f1;color:#fff;border-radius:4px;border:0;text-decoration:none;font-size:8px;font-weight:700;cursor:pointer">重试</button>' +
    '</div>';
  var btn = document.getElementById('_prodRetry');
  if (btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      loadProducts();
    });
  }
  if (tag) { tag.textContent = 'ERROR'; tag.className = 'tg tg-r'; }
}

// ── Product loading orchestrator ──
// Loads products directly from the page first; if that fails, falls back to the
// isolated content script. Exposes _productLoadStatus for tests/diagnostics.
var _productLoadStatus = { status: 'idle', error: '', attempt: 0 };

function loadProducts() {
  if (_productLoadStatus.status === 'loading') return;
  _productLoadStatus.status = 'loading';
  _productLoadStatus.error = '';
  _productLoadStatus.attempt = 0;

  var auth = getLocalAuthHeaders();
  if (!auth) {
    _productLoadStatus.status = 'error';
    _productLoadStatus.error = 'auth-missing';
    renderProductsAuthError();
    return;
  }

  if (!getVisibleProducts().length) renderProductsLoading();

  var MAX_DIRECT_ATTEMPTS = 2;
  var CONTENT_SCRIPT_TIMEOUT_MS = 8000;

  function markLoaded(productList) {
    _productLoadStatus.status = 'loaded';
    _productLoadStatus.error = '';
    _authFailed = false;
    try { sessionStorage.setItem('bm_batch_preview', JSON.stringify({ code: 200, data: { productList: productList } })); } catch(e) {}
    updateProductMatrix(productList);
  }

  function fallbackToContentScript(reason) {
    _productLoadStatus.error = reason;
    cmdToOverlay('REFRESH_BATCH_PREVIEW');
    setTimeout(function() {
      if (_productLoadStatus.status !== 'loaded' && getVisibleProducts().length === 0) {
        _productLoadStatus.status = 'error';
        renderProductsError(reason);
      }
    }, CONTENT_SCRIPT_TIMEOUT_MS);
  }

  function tryDirect(attempt) {
    _productLoadStatus.attempt = attempt;
    fetch('https://bigmodel.cn/api/biz/pay/batch-preview', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'authorization': auth.authorization,
        'bigmodel-organization': auth.bigmodelOrganization,
        'bigmodel-project': auth.bigmodelProject
      },
      body: '{"invitationCode":""}'
    })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.code === 200 && d.data && Array.isArray(d.data.productList) && d.data.productList.length > 0) {
          markLoaded(d.data.productList);
        } else if (d.code === 1001) {
          _authFailed = true;
          try { sessionStorage.removeItem('bm_batch_preview'); } catch(e) {}
          renderProductsAuthError();
        } else {
          if (attempt < MAX_DIRECT_ATTEMPTS) {
            setTimeout(function() { tryDirect(attempt + 1); }, 1000);
          } else {
            fallbackToContentScript('server-code-' + (d.code || 'unknown'));
          }
        }
      })
      .catch(function(err) {
        if (attempt < MAX_DIRECT_ATTEMPTS) {
          setTimeout(function() { tryDirect(attempt + 1); }, 1000);
        } else {
          fallbackToContentScript(err && err.message ? err.message : 'network-error');
        }
      });
  }

  tryDirect(1);
}

// Kept for backward compatibility; new code should call loadProducts().
function fetchBatchPreview() {
  loadProducts();
}

function renderProductsAuthError() {
  _authFailed = true;
  _productLoadStatus.status = 'error';
  _productLoadStatus.error = 'auth-missing';
  var list = document.getElementById('_prodList');
  var tag = document.getElementById('_prodTag');
  if (!list) return;
  list.innerHTML =
    '<div style="font-size:8px;text-align:center;padding:10px 6px;line-height:1.8">' +
    '<div style="color:#dc2626;font-weight:700;margin-bottom:4px">&#9888; 需要登录</div>' +
    '<button id="_prodLogin" style="display:inline-block;padding:3px 10px;background:#6366f1;color:#fff;border-radius:4px;border:0;text-decoration:none;font-size:8px;font-weight:700;cursor:pointer">登录 / 注册</button>' +
    '<div style="color:#94a3b8;margin-top:4px;font-size:7px">登录后刷新页面即可查看可购产品</div>' +
    '</div>';
  var btn = document.getElementById('_prodLogin');
  if (btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      var siteBtn = document.querySelector('.register-btn.register-btn__style1.el-popover__reference') ||
        document.querySelector('.register-btn');
      if (siteBtn) siteBtn.click();
    });
  }
  if (tag) { tag.textContent = 'AUTH'; tag.className = 'tg tg-r'; }
}

function renderProducts() {
  var products = getVisibleProducts();
  var list = document.getElementById('_prodList');
  var tag = document.getElementById('_prodTag');
  if (!list) return;

  if (products.length === 0) {
    list.innerHTML = '<div style="font-size:8px;color:#94a3b8;text-align:center;padding:8px">No products loaded</div>';
    if (tag) tag.textContent = 'NONE';
    return;
  }

  var html = '';
  for (var i = 0; i < products.length; i++) {
    var p = products[i];
    var rank = priorityIndexOf(p.id);
    var isSel = rank >= 0;
    var badge = '';
    if (p.tag) badge = ' <span style="font-size:6px;font-weight:800;padding:1px 4px;border-radius:3px;background:#fef3c7;color:#d97706">' + p.tag + '</span>';
    var rankBadge = isSel ? ' <span class="pr-rk">P' + (rank + 1) + '</span>' : '';
    var priceHtml = p.price != null ? '¥' + formatAmount(p.price) : '-';
    var originalHtml = '';
    var currentAmountHtml = p.currentAmount != null ? '¥' + formatAmount(p.currentAmount) : '-';
    var renewAmountHtml = p.renewAmount != null ? '¥' + formatAmount(p.renewAmount) : '-';
    if (p.originalPrice != null && Number(p.originalPrice) > Number(p.price)) {
      originalHtml = ' <span style="font-size:9px;color:#94a3b8;text-decoration:line-through">¥' + formatAmount(p.originalPrice) + '/月</span>';
    }
    html += '<div class="pr-t' + (isSel ? ' on' : '') + '" data-id="' + p.id + '">' +
      '<div class="pr-th">' +
        '<div class="pr-td">' + (isSel ? '✓' : '') + '</div>' +
        '<div class="pr-tn">' + p.name + badge + rankBadge + '</div>' +
        '<div class="pr-tp"><b>' + priceHtml + '</b>/月' + originalHtml + '</div>' +
        '<span class="pr-ts ' + (p.soldOut ? 'warn' : 'ok') + '">' + (p.soldOut ? '售罄' : '有货') + '</span>' +
      '</div>' +
      '<div class="pr-ti">' +
        '<div>本次支付<b>' + currentAmountHtml + '</b></div>' +
        '<div>下次续费<b>' + renewAmountHtml + '</b></div>' +
      '</div>' +
      '<div class="pr-tb">' + (p.description || '') + '</div>' +
    '</div>';
  }
  list.innerHTML = html;
  syncSelectionStatus();

  var tiers = list.querySelectorAll('.pr-t');
  for (var t = 0; t < tiers.length; t++) {
    tiers[t].addEventListener('click', function(e) {
      var productId = this.getAttribute('data-id');
      toggleProductSelection(productId);
    });
  }
}

function renderFireConfig() {
  var body = document.getElementById('_fireCfg');
  if (!body) return;
  if (_priorityList.length === 0) {
    body.innerHTML = '<div class="cfg-val">Select up to 3 products in Target Products</div>';
    return;
  }

  var html = '';
  for (var i = 0; i < _priorityList.length; i++) {
    var item = _priorityList[i];
    var p = findProductById(item.productId);
    var name = p ? p.name : item.productId.slice(-6);
    var price = p && p.price != null ? '¥' + formatAmount(p.price) + '/月' : '';
    var rankCls = i === 0 ? 'cfg-rk cfg-rk1' : (i === 1 ? 'cfg-rk cfg-rk2' : 'cfg-rk cfg-rk3');
    html +=
      '<div class="cfg-sl">' +
        '<div class="' + rankCls + '">P' + (i + 1) + '</div>' +
        '<div class="cfg-n">' + name + '<span class="cfg-p">' + price + '</span></div>' +
      '</div>';
  }
  body.innerHTML = html;
}

function setupProductUI() {
  var billEl = document.getElementById('_bill');
  if (billEl) {
    var btns = billEl.querySelectorAll('.pr-bl');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function() {
        _billing = this.getAttribute('data-b');
        var all = billEl.querySelectorAll('.pr-bl');
        for (var j = 0; j < all.length; j++) all[j].className = 'pr-bl';
        this.className = 'pr-bl on';
        persistSelection();
        renderProducts();
        try { sessionStorage.setItem('bm_billing', _billing); } catch(e) {}
      });
    }
  }
  try {
    var savedBilling = sessionStorage.getItem('bm_billing');
    if (savedBilling) _billing = savedBilling;
    var allBtns = billEl ? billEl.querySelectorAll('.pr-bl') : [];
    for (var k = 0; k < allBtns.length; k++) {
      allBtns[k].className = 'pr-bl' + (allBtns[k].getAttribute('data-b') === _billing ? ' on' : '');
    }
  } catch(e) {}

  if (!hasLocalAuthSignals()) {
    renderProductsAuthError();
    renderFireConfig();
    return;
  }

  loadBatchPreviewFromCache();
  if (!getVisibleProducts().length) renderProductsLoading();
  loadProducts();
  cmdToOverlay('REQUEST_BATCH_PREVIEW');
  renderFireConfig();
}
