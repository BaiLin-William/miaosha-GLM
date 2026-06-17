// ── Overlay HTML ──
function buildHTML() {
  return '<style>' + CSS + '</style>' +

    // Header
    '<div class="h"><span>&#128736;</span><h3>智谱秒杀助手</h3><button class="opts" id="_opts" title="Open options">&#9881;</button><button class="mn" id="_mn">&#8722;</button></div>' +
    '<div class="b" id="_bd">' +

    // Card 1: Preparations
    '<div class="c"><div class="ch"><span class="ct">&#128736; Preparations</span><span class="tg tg-a">AUDIT</span></div>' +
    '<div class="pg">' +
      '<div class="pc"><span class="pd" id="_pi"></span><span class="pn">Product ID</span></div>' +
      '<div class="pc" id="_cp"><span class="pd w" id="_cpd"></span><span class="pn">Captcha</span><span class="pb" id="_cpb"></span></div>' +
    '</div>' +
    '</div>' +

    // Card 2: Target Products
    '<div class="c" id="_prodCard">' +
    '<div class="ch"><span class="ct">&#128230; Target Products</span><span class="tg tg-a" id="_prodTag">LOADING</span></div>' +
    '<div class="pr-bill" id="_bill">' +
      '<button class="pr-bl" data-b="monthly">月付</button>' +
      '<button class="pr-bl on" data-b="quarterly">季付 9折</button>' +
      '<button class="pr-bl" data-b="yearly">年付 8折</button>' +
    '</div>' +
    '<div id="_prodList"><div style="font-size:8px;color:#94a3b8;text-align:center;padding:8px">Loading products...</div></div>' +
    '<div class="pr-sel" id="_prodSel"></div>' +
    '</div>' +

    // Card 3: Captcha Pool
    '<div class="c" id="_poolCard">' +
    '<div class="pl-h"><span class="pl-l">&#127915; Captcha Pool</span><span class="pl-c" id="_plc">0 / 100</span></div>' +
    '<div class="pm" id="_pm"></div>' +
    '<div class="ps" id="_ps">暂无有效票 · 建议先录入验证码</div>' +
    '<button class="ab" id="_ab">+ Solve Captcha</button>' +
    '</div>' +

    // Card 4: Fire
    '<div class="c">' +
    '<div class="ch"><span class="ct">&#128293; Fire</span><span class="tg tg-r">LAUNCH</span></div>' +
    '<div class="fm" id="_meter"></div>' +
    '<div id="_fireCfg"></div>' +
    '<div class="fc-row"><span class="fc-lbl">Mode<span class="fc-tip" data-tip="决定“什么时候发射”。Auto：插件自动倒计时并在秒杀时刻前根据实测延迟提前触发。Manual：禁用自动，只有点击 FIRE 才发射。推荐：Auto。">?</span></span><select class="fc-sel" id="_fireMode"><option value="auto">Auto</option><option value="manual">Manual</option></select></div>' +
    '<div class="fc-row"><span class="fc-lbl">Burst Interval<span class="fc-tip" data-tip="Burst 模式下每枪之间的间隔（毫秒）。智谱后端使用 2 秒滑动窗口限流（阈值=1），低于 2 秒会触发大量 555。实测 2100ms 是单用户最优节奏：0% 555 且比 3000ms 快 31%。">?</span></span><input class="fc-num" id="_fireBurstInterval" type="number" min="500" max="10000" step="100" value="2100"></div>' +
    '<div class="fc-row"><span class="fc-lbl">First Shot Offset<span class="fc-tip" data-tip="首枪相对 10:00:00.000 的偏移（毫秒）。负值提前发射以抢先进入窗口，正值延后以避开 1000 QPS 峰值。推荐：-50 ~ +100。">?</span></span><input class="fc-num" id="_fireOffset" type="number" min="-5000" max="5000" step="10" value="0"></div>' +
    '<div class="fc-row"><span class="fc-lbl">Stagger Window<span class="fc-tip" data-tip="首枪抖动窗（毫秒）。实际首枪时刻 = 目标时刻 + 偏移 + random(0, 窗口)。用于把请求打散，避免所有用户挤在绝对零点。推荐：0 ~ 200。">?</span></span><input class="fc-num" id="_fireStagger" type="number" min="0" max="3000" step="50" value="0"></div>' +
    '<div class="fc-row"><span class="fc-lbl">Backoff 500<span class="fc-tip" data-tip="遇到 code=500 “验证码校验服务异常”（腾讯核销层过载）时，每次增加的退避毫秒数。推荐：1000 ~ 1500。">?</span></span><input class="fc-num" id="_fireB500" type="number" min="500" max="5000" step="100" value="1200"></div>' +
    '<div class="fc-row"><span class="fc-lbl">Backoff 555<span class="fc-tip" data-tip="遇到 code=555（智谱 2 秒滑动窗口限流）时，每次增加的退避毫秒数。推荐：200。">?</span></span><input class="fc-num" id="_fireB555" type="number" min="0" max="2000" step="50" value="200"></div>' +
    '<div class="fc-row"><span class="fc-lbl">Max Backoff<span class="fc-tip" data-tip="动态间隔上限（毫秒）。无论触发多少次退避，间隔都不会超过此值。推荐：4000。">?</span></span><input class="fc-num" id="_fireMaxB" type="number" min="2100" max="8000" step="100" value="4000"></div>' +
    '<div class="fc-row"><span class="fc-lbl">Soldout Threshold<span class="fc-tip" data-tip="同一商品连续 soldout 多少次后，将其移出轮换并把剩余 ticket 重新分配给存活商品。推荐：2。">?</span></span><input class="fc-num" id="_fireSoldout" type="number" min="1" max="5" step="1" value="2"></div>' +
    '<div class="fc-row"><span class="fc-lbl">Dynamic Switch<span class="fc-tip" data-tip="开启后，soldout 商品会被自动移出并触发 ticket 重分配；关闭则保持原队列直到打完或手动停止。">?</span></span><input type="checkbox" id="_fireDynSwitch" checked></div>' +
    '<div class="fc-row"><span class="fc-lbl">Pay<span class="fc-tip" data-tip="create-sign 使用的支付方式，决定打开支付宝还是微信支付。推荐：ALI（Alipay）。">?</span></span><select class="fc-sel" id="_firePayType"><option value="ALI">Alipay</option><option value="WE_CHAT">WeChat</option></select></div>' +
    '<button class="fb" id="_fb" disabled>&#9889; FIRE (0)</button>' +
    '<div style="font-size:8px;color:#64748b;text-align:center;padding:3px 0" id="_ammo"></div>' +
    '<div style="font-size:8px;color:#94a3b8;text-align:center;padding:2px 0" id="_auths">Auth: pending</div>' +
    '<div style="font-size:8px;color:#94a3b8;text-align:center;padding:2px 0" id="_auto">Auto: waiting…</div>' +
    '</div>' +

    '</div>';
}

function renderCaptchaMeter() {
  var plc = document.getElementById('_plc');
  var pm = document.getElementById('_pm');
  var ps = document.getElementById('_ps');
  if (!pm) return;

  var max = BATCH_SESSION_LIMIT || 100;
  var valid = _ticketCount || 0;

  if (plc) plc.textContent = valid + ' / ' + max;

  if (pm.children.length === 0) {
    var sh = '';
    for (var s = 0; s < 20; s++) sh += '<div></div>';
    pm.innerHTML = sh;
  }
  var per = Math.max(1, Math.ceil(max / 20));
  var filled = Math.min(20, Math.floor(valid / per));
  for (var j = 0; j < 20; j++) {
    pm.children[j].className = j < filled ? 'on' : '';
  }

  if (!ps) return;
  var status = '', cls = 'ps-low';
  if (valid === 0) {
    status = '暂无有效票 · 建议先录入验证码';
  } else if (valid <= max * 0.2) {
    status = '票量偏低 · 继续录入可提升命中率';
  } else if (valid <= max * 0.6) {
    status = '票量中等 · 仍可继续补充';
    cls = 'ps-mid';
  } else if (valid < max) {
    status = '票量充足 · 命中概率较高';
    cls = 'ps-high';
  } else {
    status = '票池已满 · 当前最大火力';
    cls = 'ps-high';
  }
  ps.textContent = status;
  ps.className = 'ps ' + cls;
}

function applyFireConfigToControls(config) {
  var mode = document.getElementById('_fireMode');
  var burstInterval = document.getElementById('_fireBurstInterval');
  var payType = document.getElementById('_firePayType');
  var offset = document.getElementById('_fireOffset');
  var stagger = document.getElementById('_fireStagger');
  var b500 = document.getElementById('_fireB500');
  var b555 = document.getElementById('_fireB555');
  var maxB = document.getElementById('_fireMaxB');
  var soldout = document.getElementById('_fireSoldout');
  var dynSwitch = document.getElementById('_fireDynSwitch');
  if (mode) mode.value = config.mode === 'manual' ? 'manual' : 'auto';
  if (burstInterval) burstInterval.value = String(Math.max(500, Math.min(10000, Math.round(Number(config.burstIntervalMs)) || 2100)));
  if (payType) payType.value = config.payType === 'WE_CHAT' ? 'WE_CHAT' : 'ALI';
  if (offset) offset.value = String(Math.max(-5000, Math.min(5000, Math.round(Number(config.firstShotOffsetMs)) || 0)));
  if (stagger) stagger.value = String(Math.max(0, Math.min(3000, Math.round(Number(config.staggerWindowMs)) || 0)));
  if (b500) b500.value = String(Math.max(500, Math.min(5000, Math.round(Number(config.backoff500Ms)) || 1200)));
  if (b555) b555.value = String(Math.max(0, Math.min(2000, Math.round(Number(config.backoff555Ms)) || 200)));
  if (maxB) maxB.value = String(Math.max(2100, Math.min(8000, Math.round(Number(config.maxBackoffMs)) || 4000)));
  if (soldout) soldout.value = String(Math.max(1, Math.min(5, Math.round(Number(config.soldoutStopThreshold)) || 2)));
  if (dynSwitch) dynSwitch.checked = config.enableDynamicSwitch !== false;
  for (var ai = 0; ai < 3; ai++) {
    var ael = document.getElementById('_fireAlloc' + ai);
    if (ael && Array.isArray(config.allocation) && config.allocation[ai] != null) {
      ael.value = String(Math.max(0, Math.min(100, Math.round(Number(config.allocation[ai])) || 0)));
    }
  }
}

function normalizeAllocationArray(arr, targetCount) {
  if (!Array.isArray(arr) || arr.length === 0) {
    return targetCount === 1 ? [100] : targetCount === 2 ? [70, 30] : [70, 20, 10];
  }
  var nums = arr.slice(0, targetCount).map(function(v) {
    var n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
  });
  while (nums.length < targetCount) nums.push(0);
  var sum = nums.reduce(function(a, b) { return a + b; }, 0);
  if (sum === 0) return targetCount === 1 ? [100] : targetCount === 2 ? [70, 30] : [70, 20, 10];
  if (sum === 100) return nums;
  var normalized = nums.map(function(v) { return Math.round((v / sum) * 100); });
  var normSum = normalized.reduce(function(a, b) { return a + b; }, 0);
  if (normSum !== 100 && normalized[0] != null) normalized[0] += 100 - normSum;
  return normalized;
}

function readFireConfigFromControls() {
  var mode = document.getElementById('_fireMode');
  var burstInterval = document.getElementById('_fireBurstInterval');
  var payType = document.getElementById('_firePayType');
  var offset = document.getElementById('_fireOffset');
  var stagger = document.getElementById('_fireStagger');
  var b500 = document.getElementById('_fireB500');
  var b555 = document.getElementById('_fireB555');
  var maxB = document.getElementById('_fireMaxB');
  var soldout = document.getElementById('_fireSoldout');
  var dynSwitch = document.getElementById('_fireDynSwitch');

  var targetCount = Math.max(1, (_priorityList || []).length);
  var allocInputs = [
    document.getElementById('_fireAlloc0'),
    document.getElementById('_fireAlloc1'),
    document.getElementById('_fireAlloc2'),
  ].slice(0, targetCount);
  var allocation = allocInputs.map(function(el) {
    return Math.round(Number(el ? el.value : 0));
  });

  return {
    ...(_fireConfig || { burstIntervalMs: 2100 }),
    mode: mode && mode.value === 'manual' ? 'manual' : 'auto',
    burstIntervalMs: Math.max(500, Math.min(10000, Math.round(Number(burstInterval ? burstInterval.value : 2100)) || 2100)),
    payType: payType && payType.value === 'WE_CHAT' ? 'WE_CHAT' : 'ALI',
    firstShotOffsetMs: Math.max(-5000, Math.min(5000, Math.round(Number(offset ? offset.value : 0)) || 0)),
    staggerWindowMs: Math.max(0, Math.min(3000, Math.round(Number(stagger ? stagger.value : 0)) || 0)),
    allocation: normalizeAllocationArray(allocation, targetCount),
    backoff500Ms: Math.max(500, Math.min(5000, Math.round(Number(b500 ? b500.value : 1200)) || 1200)),
    backoff555Ms: Math.max(0, Math.min(2000, Math.round(Number(b555 ? b555.value : 200)) || 200)),
    maxBackoffMs: Math.max(2100, Math.min(8000, Math.round(Number(maxB ? maxB.value : 4000)) || 4000)),
    soldoutStopThreshold: Math.max(1, Math.min(5, Math.round(Number(soldout ? soldout.value : 2)) || 2)),
    enableDynamicSwitch: dynSwitch ? !!dynSwitch.checked : true,
  };
}

function sendFireConfigUpdate() {
  var cfg = readFireConfigFromControls();
  _fireConfig = cfg;
  window.postMessage({ __miaosha_cmd: true, type: 'SET_FIRE_CONFIG', data: cfg }, '*');
}

function bindFireControlEvents() {
  var ids = ['_fireMode', '_fireBurstInterval', '_firePayType', '_fireOffset', '_fireStagger', '_fireB500', '_fireB555', '_fireMaxB', '_fireSoldout', '_fireDynSwitch'];
  for (var i = 0; i < ids.length; i++) {
    var el = document.getElementById(ids[i]);
    if (!el) continue;
    el.addEventListener('change', sendFireConfigUpdate);
  }
  for (var j = 0; j < 3; j++) {
    var ael = document.getElementById('_fireAlloc' + j);
    if (ael) ael.addEventListener('change', sendFireConfigUpdate);
  }
}

// ── Overlay Injection ──
function injectOverlay() {
  if (document.getElementById(O)) return;
  if (location.pathname !== '/glm-coding') return;
  var overlay = document.createElement('div');
  overlay.id = O;
  overlay.innerHTML = buildHTML();
  (document.body || document.documentElement).appendChild(overlay);

  var meter = document.getElementById('_meter');
  if (meter) { var mh = ''; for (var i=0;i<10;i++) mh += '<div class="fp" id="_fp'+i+'"></div>'; meter.innerHTML = mh; }

  bindFireControlEvents();

  function poll() { cmdToOverlay('GET_TICKET_COUNT'); }
  setInterval(poll, 1000);
  setTimeout(poll, 500);

  setupXhrInterception();

  window.addEventListener('message', function(ev) {
    if (ev.source !== window || !ev.data || !ev.data.__miaosha_overlay) return;
    var d = ev.data;

    if (d.type === 'TICKET_COUNT') {
      var ticketList = (d.data && d.data.tickets) || d.tickets || [];
      _tickets = ticketList;
      _ticketCount = (d.data && d.data.count) || d.count || 0;
      renderCaptchaMeter();
      syncSelectionStatus();
    }

    if (d.type === 'SALE_TIME_CONFIG' && d.data && d.data.nextSaleTime) {
      scheduleAutoFire(d.data.nextSaleTime);
    }

    if (d.type === 'CAPTCHA_CONFIG' && d.data) {
      var limit = Number(d.data.batchSessionLimit);
      if (limit > 0 && isFinite(limit)) {
        BATCH_SESSION_LIMIT = Math.round(limit);
      }
      renderCaptchaMeter();
    }

    if (d.type === 'RUNTIME_CALIBRATION' && d.data) {
      applyRuntimeCalibration(d.data);
    }

    if (d.type === 'BATCH_PREVIEW_DATA' && d.data) {
      if (!hasLocalAuthSignals()) {
        _authFailed = true;
        renderProductsAuthError();
        return;
      }
      _authFailed = false;
      updateProductMatrix(d.data);
    }

    if (d.type === 'FIRE_CONFIG' && d.data) {
      _fireConfig = d.data;
      applyFireConfigToControls(d.data);
      if (typeof renderFireConfig === 'function') renderFireConfig();
    }

    if (d.type === 'BURST_FIRE_SUCCESS' && d.data) {
      var autoEl = document.getElementById('_auto');
      if (autoEl) { autoEl.style.color = '#059669'; autoEl.textContent = 'Native pay dialog opened · bizId=' + String(d.data.bizId || '?').slice(-8); }
    }

    if (d.type === 'PAYMENT_STATE' && d.data) {
      var autoElPs = document.getElementById('_auto');
      if (autoElPs) {
        if (d.data.status === 'success') { autoElPs.style.color = '#059669'; autoElPs.textContent = 'Payment confirmed'; }
        else if (d.data.status === 'expired') { autoElPs.style.color = '#d97706'; autoElPs.textContent = 'Payment expired'; }
        else if (d.data.status === 'timeout') { autoElPs.style.color = '#64748b'; autoElPs.textContent = 'Payment status timeout'; }
      }
    }

    if (d.type === 'BURST_FIRE_DEPLETED') {
      var autoElD = document.getElementById('_auto');
      if (autoElD) { autoElD.style.color = '#dc2626'; autoElD.textContent = 'Depleted (' + (d.data && d.data.total || 0) + ' shots)'; }
    }

    if (d.type === 'PREFIRE_STATUS') {
      renderPrefireAuthStatus(d.data);
    }
  });

  document.getElementById('_ab').addEventListener('click', function() { toggleBatchMode(); });
  document.getElementById('_fb').addEventListener('click', function() {
    window.postMessage({ __miaosha_cmd: true, type: 'PREFIRE_FIRE', data: { startMs: Date.now(), reason: 'manual' } }, '*');
  });

  document.getElementById('_mn').addEventListener('click', function() {
    var bd = document.getElementById('_bd');
    if (bd) { var h = bd.style.display === 'none'; bd.style.display = h ? 'block' : 'none'; this.innerHTML = h ? '&#8722;' : '+'; }
  });

  var optsBtn = document.getElementById('_opts');
  if (optsBtn) {
    optsBtn.addEventListener('click', function() {
      window.postMessage({ __miaosha_cmd: true, type: 'OPEN_OPTIONS_PAGE' }, '*');
    });
  }

  (function() {
    var hd = overlay.querySelector('.h');
    var ox, oy, left, top, dragging = false;
    hd.addEventListener('mousedown', function(e) {
      if (e.target.tagName === 'BUTTON') return;
      dragging = true; ox = e.clientX; oy = e.clientY;
      var r = overlay.getBoundingClientRect(); left = r.left; top = r.top;
      overlay.style.transition = 'none'; overlay.style.right = 'auto';
      e.preventDefault();
    });
    document.addEventListener('mousemove', function(e) {
      if (!dragging) return;
      overlay.style.left = (left + e.clientX - ox) + 'px';
      overlay.style.top = (top + e.clientY - oy) + 'px';
    });
    document.addEventListener('mouseup', function() {
      if (dragging) { dragging = false; overlay.style.transition = ''; }
    });
  })();

  var wasAuthReady = false;

  function checkRealState() {
    var hasCookie = false;
    var hasUser = false;
    try {
      hasCookie = document.cookie.indexOf('bigmodel_token_production') !== -1;
      hasUser = hasCookie &&
        !!localStorage.getItem('Bigmodel-Organization') &&
        !!localStorage.getItem('Bigmodel-Project');
    } catch (e) {}

    var authReady = hasCookie && hasUser;
    if (authReady && !wasAuthReady) {
      // Auth just became ready: event-driven product refresh, no independent polling.
      renderProductsLoading();
      loadBatchPreviewFromCache();
      fetchBatchPreview();
      cmdToOverlay('REFRESH_BATCH_PREVIEW');

      var totalProducts = 0;
      try {
        totalProducts = (_productMatrix.monthly || []).length +
                        (_productMatrix.quarterly || []).length +
                        (_productMatrix.yearly || []).length;
      } catch (e) {}
      if (typeof _h1_rt !== 'undefined') _h1_rt.hasProducts = totalProducts > 0;
      if (typeof _h1_updateAuth === 'function') _h1_updateAuth();
    }

    if (!authReady && wasAuthReady) {
      _productMatrix = { monthly: [], quarterly: [], yearly: [] };
      _priorityList = [];
      _ticketCount = 0;
      _tickets = [];
      try { sessionStorage.removeItem('bm_batch_preview'); } catch (e) {}
      cmdToOverlay('CLEAR_BATCH_PREVIEW_CACHE');
      cmdToOverlay('CLEAR_TICKET_POOL');
      renderProductsAuthError();
      renderFireConfig();
      renderCaptchaMeter();
      syncSelectionStatus();
      if (typeof _h1_rt !== 'undefined') _h1_rt.hasProducts = false;
      if (typeof _h1_updateAuth === 'function') _h1_updateAuth();
    }
    wasAuthReady = authReady;

    var hasSelectedProducts = _priorityList.length > 0;
    var piEl = document.getElementById('_pi');
    if (piEl) { piEl.className = 'pd ' + (hasSelectedProducts ? 'ok' : 'w'); }
  }

  checkRealState();
  setInterval(checkRealState, 3000);

  setTimeout(poll, 200);
  setTimeout(function() { cmdToOverlay('GET_SALE_TIME'); }, 800);
  setTimeout(function() { cmdToOverlay('GET_FIRE_CONFIG'); }, 1000);

  setTimeout(setupProductUI, 300);
}

setTimeout(injectOverlay, 1500);

// ── Message Listener ──
window.addEventListener('message', function(ev) {
  if (ev.source !== window) return;
  if (ev.data?.__miaosha_cmd) {
    if (ev.data.type === 'PRODUCE_CAPTCHA') produceCaptcha();
  }
});
