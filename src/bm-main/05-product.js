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
        planKey: _planOrder[k],
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

function getSelectionSummary() {
  var all = getAllProducts();
  var selected = 0;
  for (var i = 0; i < all.length; i++) {
    if (_selectedProducts[all[i].id]) selected++;
  }
  return {
    total: all.length,
    selected: selected,
    tickets: _ticketCount,
    launchable: Math.min(selected, _ticketCount),
    autoFollowUp: selected > 0 ? Math.max(0, _ticketCount - Math.min(selected, _ticketCount)) : 0,
    shortage: Math.max(0, selected - _ticketCount),
  };
}

function syncSelectionStatus() {
  var summary = getSelectionSummary();
  var tag = document.getElementById('_prodTag');
  var sel = document.getElementById('_prodSel');
  var fb = document.getElementById('_fb');
  var ammo = document.getElementById('_ammo');
  var fc = document.getElementById('_fc');
  var selc = document.getElementById('_selc');
  var mx = document.getElementById('_mx');
  var cp = document.getElementById('_cpd');
  var cpb = document.getElementById('_cpb');

  if (summary.total > 0 && tag) {
    tag.textContent = summary.selected + '/' + summary.total;
    tag.className = 'tg ' + (summary.selected === summary.total ? 'tg-g' : 'tg-a');
  }

  if (sel) {
    if (summary.total === 0) {
      sel.innerHTML = '';
    } else if (summary.selected === 0) {
      sel.innerHTML = '<span style="color:#f59e0b">Select at least 1 product to enable Fire</span>';
    } else if (summary.shortage > 0) {
      sel.innerHTML = '<span style="color:#d97706"><b>' + summary.selected + '/' + summary.total + '</b> selected · <b>' + summary.tickets + '</b> tickets ready · at most <b>' + summary.launchable + '</b> requests</span>';
    } else {
      sel.innerHTML = '<b>' + summary.selected + '/' + summary.total + '</b> selected · <b>' + summary.tickets + '</b> tickets ready';
    }
  }

  if (fb) {
    fb.disabled = summary.launchable === 0;
    fb.innerHTML = '&#9889; FIRE (' + summary.launchable + ')';
  }
  if (ammo) {
    if (summary.selected === 0) {
      ammo.textContent = 'Select products to calculate burst size';
      ammo.style.color = '#64748b';
    } else if (summary.autoFollowUp > 0) {
      ammo.textContent = summary.selected + ' selected · ' + summary.tickets + ' tickets ready · auto sends ' + summary.launchable + ' initial + ' + summary.autoFollowUp + ' follow-up';
      ammo.style.color = '#059669';
    } else if (summary.shortage > 0) {
      ammo.textContent = summary.selected + ' selected · ' + summary.tickets + ' tickets ready · auto initial sends ' + summary.launchable + ' requests';
      ammo.style.color = '#d97706';
    } else {
      ammo.textContent = summary.selected + ' selected · ' + summary.tickets + ' tickets ready · auto initial sends ' + summary.launchable + ' requests';
      ammo.style.color = '#059669';
    }
  }
  if (fc) fc.textContent = summary.tickets;
  if (selc) selc.textContent = summary.selected;
  if (mx) mx.textContent = summary.launchable;
  for (var j = 0; j < 10; j++) {
    var p = document.getElementById('_fp' + j);
    if (p) p.className = 'fp' + (j < Math.min(summary.launchable, 10) ? ' on' : '');
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
  var saved = {};
  var version = '';
  try {
    saved = JSON.parse(sessionStorage.getItem('bm_selected_products') || '{}') || {};
    version = sessionStorage.getItem(SELECTION_VERSION_KEY) || '';
  } catch(e) {
    saved = {};
    version = '';
  }

  _selectedProducts = {};
  var hasAny = false;
  var all = getAllProducts();

  if (version === '1') {
    for (var i = 0; i < all.length; i++) {
      if (saved[all[i].id]) {
        _selectedProducts[all[i].id] = true;
        hasAny = true;
      }
    }
  } else {
    var legacyPlans = {};
    for (var j = 0; j < all.length; j++) {
      if (saved[all[j].id]) legacyPlans[all[j].planKey] = true;
    }
    var legacyKeys = Object.keys(legacyPlans);
    if (legacyKeys.length > 0) {
      for (var k = 0; k < all.length; k++) {
        if (legacyPlans[all[k].planKey]) {
          _selectedProducts[all[k].id] = true;
          hasAny = true;
        }
      }
    }
  }

  if (!hasAny) {
    for (var m = 0; m < all.length; m++) {
      _selectedProducts[all[m].id] = true;
    }
  }
}

function persistSelection() {
  var all = getAllProducts();
  var selected = {};
  for (var i = 0; i < all.length; i++) {
    var product = all[i];
    if (_selectedProducts[product.id]) selected[product.id] = true;
  }
  try {
    sessionStorage.setItem('bm_selected_products', JSON.stringify(selected));
    sessionStorage.setItem(SELECTION_VERSION_KEY, '1');
  } catch(e) {}
  postMsg('PRODUCT_SELECTION_CHANGED', { selected: selected, count: Object.keys(selected).length });
  return selected;
}

function updateProductMatrix(productList) {
  if (productList && productList.length > 0) { _authFailed = false; }
  _productMatrix = buildProductMatrix(productList || []);
  restoreSelectedProducts();
  persistSelection();
  try { sessionStorage.setItem('bm_products', JSON.stringify(getVisibleProducts())); } catch(e) {}
  renderProducts();
}

function loadBatchPreviewFromCache() {
  try {
    var cached = JSON.parse(sessionStorage.getItem('bm_batch_preview') || 'null');
    if (cached && cached.data && cached.data.productList) {
      updateProductMatrix(cached.data.productList);
    }
  } catch(e) {}
}

function hasLocalAuthSignals() {
  try {
    return document.cookie.indexOf('bigmodel_token_production') !== -1 &&
      !!localStorage.getItem('Bigmodel-Organization') &&
      !!localStorage.getItem('Bigmodel-Project');
  } catch(e) {
    return false;
  }
}

function recoverViaAuthenticatedRefresh() {
  if (!hasLocalAuthSignals()) return false;
  _authFailed = false;
  var authBanner = document.getElementById('_authBanner');
  if (authBanner) authBanner.style.display = 'none';
  cmdToOverlay('REFRESH_BATCH_PREVIEW');
  return true;
}

function fetchBatchPreview() {
  fetch('/api/biz/pay/batch-preview', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
    body: '{"invitationCode":""}'
  })
    .then(function(r) {
      return r.json();
    })
    .then(function(d) {
      if (d.code === 200 && d.data && d.data.productList) {
        _authFailed = false;
        try { sessionStorage.setItem('bm_batch_preview', JSON.stringify(d)); } catch(e) {}
        updateProductMatrix(d.data.productList);
        var authBanner = document.getElementById('_authBanner');
        if (authBanner) authBanner.style.display = 'none';
      } else if (d.code === 1001) {
        if (recoverViaAuthenticatedRefresh()) {
          return;
        }
        _authFailed = true;
        try { sessionStorage.removeItem('bm_batch_preview'); } catch(e) {}
        renderProductsAuthError();
        var authBanner = document.getElementById('_authBanner');
        if (authBanner) authBanner.style.display = 'block';
      }
    })
    .catch(function() {});
}

function renderProductsAuthError() {
  var list = document.getElementById('_prodList');
  var tag = document.getElementById('_prodTag');
  if (!list) return;
  list.innerHTML =
    '<div style="font-size:8px;text-align:center;padding:10px 6px;line-height:1.8">' +
    '<div style="color:#dc2626;font-weight:700;margin-bottom:4px">&#9888; 需要登录</div>' +
    '<a href="/login" style="display:inline-block;padding:3px 10px;background:#6366f1;color:#fff;border-radius:4px;text-decoration:none;font-size:8px;font-weight:700">登录 / 注册</a>' +
    '<div style="color:#94a3b8;margin-top:4px;font-size:7px">登录后刷新页面即可查看可购产品</div>' +
    '</div>';
  if (tag) { tag.textContent = 'AUTH'; tag.className = 'tg tg-r'; }
}

function renderProducts() {
  var products = getVisibleProducts();
  var list = document.getElementById('_prodList');
  var tag = document.getElementById('_prodTag');
  var sel = document.getElementById('_prodSel');
  if (!list) return;

  if (products.length === 0) {
    list.innerHTML = '<div style="font-size:8px;color:#94a3b8;text-align:center;padding:8px">No products loaded</div>';
    if (tag) tag.textContent = 'NONE';
    return;
  }

  var html = '';
  for (var i = 0; i < products.length; i++) {
    var p = products[i];
    var isSel = !!_selectedProducts[p.id];
    var badge = '';
    if (p.tag) badge = ' <span style="font-size:6px;font-weight:800;padding:1px 4px;border-radius:3px;background:#fef3c7;color:#d97706">' + p.tag + '</span>';
    var priceHtml = p.price != null ? '¥' + formatAmount(p.price) : '-';
    var originalHtml = '';
    var currentAmountHtml = p.currentAmount != null ? '¥' + formatAmount(p.currentAmount) : '-';
    var renewAmountHtml = p.renewAmount != null ? '¥' + formatAmount(p.renewAmount) : '-';
    if (p.originalPrice != null && Number(p.originalPrice) > Number(p.price)) {
      originalHtml = ' <span style="font-size:9px;color:#94a3b8;text-decoration:line-through">¥' + formatAmount(p.originalPrice) + '/月</span>';
    }
    html += '<div class="pr-t' + (isSel ? ' on' : '') + '" data-id="' + p.id + '" data-plan="' + p.planKey + '">' +
      '<div class="pr-th">' +
        '<div class="pr-td">' + (isSel ? '✓' : '') + '</div>' +
        '<div class="pr-tn">' + p.name + badge + '</div>' +
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

  // Bind tier clicks
  var tiers = list.querySelectorAll('.pr-t');
  for (var t = 0; t < tiers.length; t++) {
    tiers[t].addEventListener('click', function(e) {
      var productId = this.getAttribute('data-id');
      if (_selectedProducts[productId]) delete _selectedProducts[productId];
      else _selectedProducts[productId] = true;
      persistSelection();
      renderProducts();
    });
  }
}

function setupProductUI() {
  // Billing toggle
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
  // Restore billing
  try {
    var savedBilling = sessionStorage.getItem('bm_billing');
    if (savedBilling) _billing = savedBilling;
    var allBtns = billEl ? billEl.querySelectorAll('.pr-bl') : [];
    for (var k = 0; k < allBtns.length; k++) {
      allBtns[k].className = 'pr-bl' + (allBtns[k].getAttribute('data-b') === _billing ? ' on' : '');
    }
  } catch(e) {}
  loadBatchPreviewFromCache();
  fetchBatchPreview();
  setInterval(fetchBatchPreview, 30000);
  // Request batch preview data from extension storage (pushed by content script)
  cmdToOverlay('REQUEST_BATCH_PREVIEW');

  // Self-heal: if initial load misses due auth/bootstrap race, force refresh from isolated world.
  // When auth signals appear after a previous auth failure, resume refresh automatically.
  setTimeout(function() {
    var canRetry = !_authFailed || hasLocalAuthSignals();
    if (canRetry && getAllProducts().length === 0) {
      cmdToOverlay('REFRESH_BATCH_PREVIEW');
    }
  }, 1200);

  setInterval(function() {
    var canRetry = !_authFailed || hasLocalAuthSignals();
    if (canRetry && getAllProducts().length === 0) {
      cmdToOverlay('REFRESH_BATCH_PREVIEW');
    }
  }, 10000);
}
