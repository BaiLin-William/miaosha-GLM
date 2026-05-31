// ── 09-fire-viz.js ── Independent Fire Visualization Overlay (Design D + C)
// Opens automatically on FIRE_BATCH_START (auto or manual fire trigger).
// Completely separate from the existing dashboard overlay (#__bm_overlay).
// Reads _productMatrix from 02-state.js (same IIFE scope).

var _fv_plans   = ['Lite', 'Pro', 'Max'];
var _fv_bkeys   = ['monthly', 'quarterly', 'yearly'];
var _fv_blabels = ['月付', '季付', '年付'];
var _fv_cells   = {};        // "row_col" → DOM cell element
var _fv_ppos    = {};        // productId → { row, col, name, billing }
var _fv_logEl   = null;
var _fv_cursor  = null;
var _fv_autoScr = true;
var _fv_lineNo  = 0;
var _fv_counts  = { s: 0, b: 0, e: 0, d: 0 };
var _fv_startMs = 0;
var _fv_total   = 0;
var _fv_done    = 0;

function _fv_escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Build productId → grid position map from current _productMatrix
function _fv_buildPPos() {
  var map = {};
  for (var bi = 0; bi < _fv_bkeys.length; bi++) {
    var grp = (_productMatrix && _productMatrix[_fv_bkeys[bi]]) || [];
    for (var pi = 0; pi < grp.length; pi++) {
      var prod = grp[pi];
      var row = _fv_plans.indexOf(prod.planKey);
      if (row < 0) row = Math.min(pi, _fv_plans.length - 1);
      map[prod.id] = {
        row: row,
        col: bi,
        name: prod.planKey || prod.name || '?',
        billing: _fv_blabels[bi]
      };
    }
  }
  return map;
}

// Build CSS string (injected once as <style>)
function _fv_buildCSS() {
  return [
    '<style id="__bm_fv_css">',
    '@keyframes fvFlicker{0%,100%{opacity:1}50%{opacity:.65}}',
    '@keyframes fvBlink{0%,100%{opacity:1}50%{opacity:0}}',
    '@keyframes fvPulse{0%{box-shadow:0 0 0 0 rgba(46,204,113,.55)}',
    '100%{box-shadow:0 0 0 8px rgba(46,204,113,0)}}',
    '#__bm_fv *{box-sizing:border-box}',
    '#__bm_fv ::-webkit-scrollbar{width:3px}',
    '#__bm_fv ::-webkit-scrollbar-thumb{background:rgba(233,69,96,.35);border-radius:99px}',
    '</style>'
  ].join('');
}

// Build the overlay HTML
function _fv_buildHTML() {
  // Matrix grid rows
  var gridRows = '';
  for (var ri = 0; ri < _fv_plans.length; ri++) {
    gridRows += '<div style="display:grid;grid-template-columns:44px 1fr 1fr 1fr;gap:3px;margin-bottom:3px">';
    gridRows += '<div style="font-size:9px;color:#64748b;font-weight:700;display:flex;align-items:center">' +
      _fv_plans[ri] + '</div>';
    for (var ci = 0; ci < _fv_bkeys.length; ci++) {
      gridRows +=
        '<div id="__bm_fv_c_' + ri + '_' + ci + '" ' +
        'style="height:28px;border-radius:4px;border:1px solid rgba(255,255,255,.06);' +
        'background:rgba(255,255,255,.02);display:flex;align-items:center;justify-content:center;' +
        'font-size:8px;font-weight:700;color:#1e293b;transition:all .25s;cursor:default;' +
        'font-family:inherit">—</div>';
    }
    gridRows += '</div>';
  }

  return _fv_buildCSS() + [
    // Container
    '<div id="__bm_fv" style="',
      'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);',
      'z-index:2147483646;width:420px;',
      'background:#1a1a2e;',
      'border:1px solid rgba(233,69,96,.4);',
      'border-radius:12px;',
      'box-shadow:0 20px 60px rgba(0,0,0,.7),0 0 30px rgba(233,69,96,.1);',
      "font-family:'SF Mono','Fira Code','Consolas',monospace;",
      'overflow:hidden;user-select:none">',

    // ── Header ──
    '<div id="__bm_fv_h" style="',
      'background:linear-gradient(135deg,#16213e,#0f3460);',
      'padding:10px 14px;cursor:move;',
      'display:flex;align-items:center;gap:8px;',
      'border-bottom:1px solid rgba(233,69,96,.2)">',
    '<span style="font-size:15px;display:inline-block;animation:fvFlicker .5s ease-in-out infinite alternate">🔥</span>',
    '<span style="font-size:11px;font-weight:800;color:#e94560;letter-spacing:.1em;text-transform:uppercase;flex:1">Fire Matrix</span>',
    '<span id="__bm_fv_cnt" style="font-size:9px;color:#4a9eff;margin-right:6px">0/0 shots</span>',
    '<button id="__bm_fv_cls" style="',
      'width:18px;height:18px;border-radius:50%;',
      'border:1px solid rgba(255,255,255,.15);',
      'background:rgba(255,255,255,.05);color:#94a3b8;',
      'cursor:pointer;font-size:9px;display:grid;place-items:center">✕</button>',
    '</div>',

    // ── Progress bar ──
    '<div style="height:2px;background:rgba(255,255,255,.05)">',
    '<div id="__bm_fv_pb" style="height:100%;width:0%;background:linear-gradient(90deg,#4a9eff,#2ecc71);transition:width .3s"></div>',
    '</div>',

    // ── Matrix section ──
    '<div style="padding:12px 14px 10px">',
    '<div style="font-size:9px;color:#4a9eff;font-weight:700;margin-bottom:8px;letter-spacing:.06em">▸ PRODUCT MATRIX</div>',
    // Column headers
    '<div style="display:grid;grid-template-columns:44px 1fr 1fr 1fr;gap:3px;margin-bottom:4px">',
    '<div></div>',
    '<div style="font-size:8px;color:#334155;text-align:center;font-weight:700">月付</div>',
    '<div style="font-size:8px;color:#334155;text-align:center;font-weight:700">季付</div>',
    '<div style="font-size:8px;color:#334155;text-align:center;font-weight:700">年付</div>',
    '</div>',
    gridRows,
    '</div>',

    // ── Stats bar ──
    '<div style="margin:0 14px 10px;padding:5px 10px;',
      'background:rgba(255,255,255,.02);',
      'border-radius:6px;border:1px solid rgba(255,255,255,.05);',
      'display:flex;gap:12px;align-items:center">',
    '<span id="__bm_fv_ss" style="font-size:9px;color:#2ecc71">✓ 0</span>',
    '<span id="__bm_fv_sb" style="font-size:9px;color:#f39c12">⚠ 0</span>',
    '<span id="__bm_fv_se" style="font-size:9px;color:#e74c3c">✗ 0</span>',
    '<span id="__bm_fv_sd" style="font-size:9px;color:#64748b">⊘ 0</span>',
    '<span style="flex:1"></span>',
    '<span id="__bm_fv_st" style="font-size:9px;color:#334155">0ms</span>',
    '</div>',

    // ── Terminal Log section ──
    '<div style="border-top:1px solid rgba(255,255,255,.05)">',
    '<div style="display:flex;align-items:center;padding:8px 14px 4px;gap:6px">',
    '<span style="font-size:9px;color:#4a9eff;font-weight:700;letter-spacing:.06em">▸ FIRE CONSOLE</span>',
    '<span style="flex:1"></span>',
    '<button id="__bm_fv_asc" style="',
      'font-size:8px;color:#4a9eff;',
      'border:1px solid rgba(74,158,255,.3);',
      'background:rgba(74,158,255,.05);',
      'border-radius:3px;padding:1px 6px;cursor:pointer">AUTO ↓</button>',
    '<button id="__bm_fv_clr" style="',
      'font-size:8px;color:#64748b;',
      'border:1px solid rgba(255,255,255,.08);',
      'background:transparent;border-radius:3px;',
      'padding:1px 6px;cursor:pointer;margin-left:4px">CLR</button>',
    '</div>',
    '<div id="__bm_fv_log" style="',
      'height:130px;overflow-y:auto;',
      'font-size:10px;line-height:1.6;',
      'background:#0a0a0f;padding:6px 8px;',
      'margin:0 14px 12px;border-radius:6px;',
      'border:1px solid rgba(255,255,255,.04)">',
    '<span id="__bm_fv_cur" style="color:#00bcd4;animation:fvBlink 1s step-end infinite">█</span>',
    '</div>',
    '</div>',

    '</div>'
  ].join('');
}

// Open (or re-open) the overlay and reset state
function _fv_show(queue, totalShots) {
  // Clean up any previous instance
  var prev = document.getElementById('__bm_fv');
  if (prev) prev.parentNode && prev.parentNode.removeChild(prev);
  var prevCss = document.getElementById('__bm_fv_css');
  if (prevCss) prevCss.parentNode && prevCss.parentNode.removeChild(prevCss);

  var tmp = document.createElement('div');
  tmp.innerHTML = _fv_buildHTML();
  while (tmp.firstChild) document.body.appendChild(tmp.firstChild);

  _fv_logEl   = document.getElementById('__bm_fv_log');
  _fv_cursor  = document.getElementById('__bm_fv_cur');
  _fv_lineNo  = 0;
  _fv_counts  = { s: 0, b: 0, e: 0, d: 0 };
  _fv_startMs = Date.now();
  _fv_total   = totalShots || 0;
  _fv_done    = 0;
  _fv_autoScr = true;

  // Cache cell elements
  _fv_cells = {};
  for (var ri = 0; ri < _fv_plans.length; ri++) {
    for (var ci = 0; ci < _fv_bkeys.length; ci++) {
      var el = document.getElementById('__bm_fv_c_' + ri + '_' + ci);
      if (el) _fv_cells[ri + '_' + ci] = el;
    }
  }

  // Build product → position map from current state
  _fv_ppos = _fv_buildPPos();

  // Mark queued products as PENDING
  if (queue && queue.length) {
    for (var i = 0; i < queue.length; i++) {
      var pos = _fv_ppos[queue[i].productId];
      if (!pos) continue;
      var cell = _fv_cells[pos.row + '_' + pos.col];
      if (!cell) continue;
      cell.style.background    = 'rgba(74,158,255,.08)';
      cell.style.borderColor   = 'rgba(74,158,255,.25)';
      cell.style.color         = '#4a9eff';
      cell.textContent         = '···';
      cell.title               = pos.name + ' ' + pos.billing;
    }
  }

  // ── Button wiring ──
  var cls = document.getElementById('__bm_fv_cls');
  if (cls) cls.addEventListener('click', function() {
    var ov = document.getElementById('__bm_fv');
    if (ov) ov.parentNode && ov.parentNode.removeChild(ov);
    var css = document.getElementById('__bm_fv_css');
    if (css) css.parentNode && css.parentNode.removeChild(css);
  });

  var asc = document.getElementById('__bm_fv_asc');
  if (asc) asc.addEventListener('click', function() {
    _fv_autoScr = !_fv_autoScr;
    asc.style.color       = _fv_autoScr ? '#4a9eff' : '#64748b';
    asc.style.borderColor = _fv_autoScr ? 'rgba(74,158,255,.3)' : 'rgba(255,255,255,.08)';
  });

  var clr = document.getElementById('__bm_fv_clr');
  if (clr) clr.addEventListener('click', function() {
    var lg = document.getElementById('__bm_fv_log');
    if (lg) {
      lg.innerHTML = '<span id="__bm_fv_cur" style="color:#00bcd4;animation:fvBlink 1s step-end infinite">█</span>';
      _fv_cursor = document.getElementById('__bm_fv_cur');
      _fv_lineNo = 0;
    }
  });

  // ── Drag support ──
  var hd = document.getElementById('__bm_fv_h');
  var ov = document.getElementById('__bm_fv');
  if (hd && ov) {
    var _fv_ox = 0, _fv_oy = 0, _fv_left = 0, _fv_top = 0, _fv_drag = false;
    hd.addEventListener('mousedown', function(e) {
      if (e.target.tagName === 'BUTTON') return;
      _fv_drag = true;
      _fv_ox = e.clientX; _fv_oy = e.clientY;
      var r = ov.getBoundingClientRect();
      _fv_left = r.left; _fv_top = r.top;
      ov.style.transition = 'none';
      ov.style.transform  = 'none';
      ov.style.left       = _fv_left + 'px';
      ov.style.top        = _fv_top  + 'px';
      e.preventDefault();
    });
    document.addEventListener('mousemove', function(e) {
      if (!_fv_drag) return;
      var o = document.getElementById('__bm_fv');
      if (!o) { _fv_drag = false; return; }
      o.style.left = (_fv_left + e.clientX - _fv_ox) + 'px';
      o.style.top  = (_fv_top  + e.clientY - _fv_oy) + 'px';
    });
    document.addEventListener('mouseup', function() { _fv_drag = false; });
  }
}

// Update a matrix cell with the shot result
function _fv_setCellResult(productId, outcome, rtt, code, bizId) {
  var pos = _fv_ppos[productId];
  if (!pos) return;
  var cell = _fv_cells[pos.row + '_' + pos.col];
  if (!cell) return;
  var cfg = {
    success: { bg: 'rgba(46,204,113,.2)',   bc: 'rgba(46,204,113,.6)',   c: '#2ecc71', t: 'OK'  },
    busy:    { bg: 'rgba(243,156,18,.15)',   bc: 'rgba(243,156,18,.45)', c: '#f39c12', t: '555' },
    soldout: { bg: 'rgba(100,116,139,.08)', bc: 'rgba(100,116,139,.25)', c: '#64748b', t: '∅'   },
    error:   { bg: 'rgba(231,76,60,.15)',    bc: 'rgba(231,76,60,.45)',  c: '#e74c3c', t: 'ERR' },
    neterr:  { bg: 'rgba(231,76,60,.1)',     bc: 'rgba(231,76,60,.35)',  c: '#e74c3c', t: '⚡'  }
  };
  var s = cfg[outcome] || cfg.error;
  cell.style.background  = s.bg;
  cell.style.borderColor = s.bc;
  cell.style.color       = s.c;
  cell.textContent       = s.t;
  var tip = pos.name + ' ' + pos.billing + ' — ' + outcome;
  if (rtt)   tip += ' ' + rtt + 'ms';
  if (code)  tip += ' (code ' + code + ')';
  if (bizId) tip += ' bizId=' + String(bizId).slice(-8);
  cell.title = tip;
  if (outcome === 'success') {
    cell.style.animation = 'fvPulse .6s ease-out forwards';
    setTimeout(function() { if (cell) cell.style.animation = ''; }, 700);
  }
}

// Append a line to the terminal log
function _fv_addLine(text, color) {
  var lg = document.getElementById('__bm_fv_log');
  if (!lg) return;
  _fv_lineNo++;
  var now = new Date();
  var pad2 = function(n) { return n < 10 ? '0' + n : '' + n; };
  var pad3 = function(n) { return n < 10 ? '00' + n : n < 100 ? '0' + n : '' + n; };
  var ts = pad2(now.getHours()) + ':' + pad2(now.getMinutes()) + ':' +
           pad2(now.getSeconds()) + '.' + pad3(now.getMilliseconds());
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:5px;align-items:baseline';
  row.innerHTML =
    '<span style="color:#1e3a5f;font-size:9px;min-width:18px;text-align:right;flex-shrink:0">' + _fv_lineNo + '</span>' +
    '<span style="color:#1e293b;font-size:9px;flex-shrink:0">[' + ts + ']</span>' +
    '<span style="color:' + (color || '#4a9eff') + ';word-break:break-all">' + _fv_escHtml(text) + '</span>';
  var cur = document.getElementById('__bm_fv_cur');
  if (cur && cur.parentNode === lg) {
    lg.insertBefore(row, cur);
  } else {
    lg.appendChild(row);
  }
  if (_fv_autoScr) lg.scrollTop = lg.scrollHeight;
}

// Refresh stats bar and progress bar
function _fv_refreshStats() {
  var ss = document.getElementById('__bm_fv_ss'); if (ss) ss.textContent = '✓ ' + _fv_counts.s;
  var sb = document.getElementById('__bm_fv_sb'); if (sb) sb.textContent = '⚠ ' + _fv_counts.b;
  var se = document.getElementById('__bm_fv_se'); if (se) se.textContent = '✗ ' + _fv_counts.e;
  var sd = document.getElementById('__bm_fv_sd'); if (sd) sd.textContent = '⊘ ' + _fv_counts.d;
  var st = document.getElementById('__bm_fv_st'); if (st) st.textContent = (Date.now() - _fv_startMs) + 'ms';
  var cnt = document.getElementById('__bm_fv_cnt');
  if (cnt) cnt.textContent = _fv_done + '/' + _fv_total + ' shots';
  var pb = document.getElementById('__bm_fv_pb');
  if (pb && _fv_total > 0) pb.style.width = Math.round(_fv_done / _fv_total * 100) + '%';
}

// Central message handler
window.addEventListener('message', function(e) {
  if (!e.data || !e.data.__miaosha_overlay) return;
  var d = e.data;

  // ── Fire burst started: open/reset the viz overlay ──
  if (d.type === 'FIRE_BATCH_START') {
    var q     = (d.data && d.data.queue)      || [];
    var total = (d.data && d.data.totalShots) || q.length;
    var initialCount = (d.data && d.data.initialCount) || 0;
    var followUpCount = (d.data && d.data.followUpCount) || 0;
    _fv_show(q, total);
    if (initialCount > 0 || followUpCount > 0) {
      _fv_addLine('▶ Auto plan ' + total + ' shots · initial ' + initialCount + ' concurrent · follow-up ' + followUpCount + ' randomized', '#4a9eff');
    } else {
      _fv_addLine('▶ Burst ' + total + ' shots @ 50ms intervals', '#4a9eff');
    }
    return;
  }

  // ── Structured per-shot result: update matrix cell ──
  if (d.type === 'FIRE_SHOT_RESULT' && d.data) {
    var outcome = d.data.outcome || 'error';
    if      (outcome === 'success') _fv_counts.s++;
    else if (outcome === 'busy')    _fv_counts.b++;
    else if (outcome === 'soldout') _fv_counts.d++;
    else                            _fv_counts.e++;
    _fv_done++;
    _fv_setCellResult(d.data.productId, outcome, d.data.rtt, d.data.code, d.data.bizId);
    _fv_refreshStats();
    return;
  }

  // ── Plain text log line from fire execution ──
  if (d.type === 'FIRE_RESULT') {
    if (!document.getElementById('__bm_fv')) return; // viz not open
    var line = d.line || '';
    var lc = '#4a9eff';
    if (line.indexOf('ORDER') !== -1 || line.indexOf('bizId') !== -1) lc = '#2ecc71';
    else if (line.indexOf('sold-out') !== -1)                          lc = '#64748b';
    else if (line.indexOf('555') !== -1 || line.indexOf('busy') !== -1) lc = '#f39c12';
    else if (line.indexOf('err') !== -1 || line.indexOf('block') !== -1) lc = '#e74c3c';
    _fv_addLine('→ ' + line, lc);
    return;
  }

  // ── Order confirmed ──
  if (d.type === 'BURST_FIRE_SUCCESS') {
    if (!document.getElementById('__bm_fv')) return;
    var biz = (d.data && d.data.bizId) ? String(d.data.bizId).slice(-8) : '?';
    _fv_addLine('✔ ORDER SUCCESS — bizId=' + biz, '#2ecc71');
    // Freeze cursor as green
    var cur1 = document.getElementById('__bm_fv_cur');
    if (cur1) { cur1.style.color = '#2ecc71'; cur1.style.animation = ''; }
    return;
  }

  // ── All shots fired, no success ──
  if (d.type === 'BURST_FIRE_DEPLETED') {
    if (!document.getElementById('__bm_fv')) return;
    var tot = (d.data && d.data.total) || 0;
    _fv_addLine('⊘ Depleted — ' + tot + ' shots, no order', '#e74c3c');
    var cur2 = document.getElementById('__bm_fv_cur');
    if (cur2) { cur2.style.color = '#64748b'; cur2.style.animation = ''; }
    return;
  }

  // ── Auth/gate failure before fire ──
  if (d.type === 'PREFIRE_STATUS' && d.data && !d.data.ok) {
    if (!document.getElementById('__bm_fv')) return;
    _fv_addLine('⊘ Prefire blocked: ' + (d.data.reason || 'unknown'), '#e74c3c');
    var cur3 = document.getElementById('__bm_fv_cur');
    if (cur3) { cur3.style.color = '#e74c3c'; cur3.style.animation = ''; }
  }
});
