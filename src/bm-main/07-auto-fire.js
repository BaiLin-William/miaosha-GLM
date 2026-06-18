function scheduleAutoFire(nextSaleTime) {
  if (_rt.autoTimer) clearTimeout(_rt.autoTimer);
  if (_rt.countdownTimer) clearInterval(_rt.countdownTimer);
  _rt.autoFired = false;
  _rt.nextSaleTime = nextSaleTime;

  // If manual mode, do not schedule an automatic strike.
  if (_fireConfig && _fireConfig.mode === 'manual') {
    var manualEl = document.getElementById('_auto');
    if (manualEl) { manualEl.textContent = 'Manual mode — auto disabled'; manualEl.style.color = '#64748b'; }
    return;
  }

  // Auto-fire timing: we want the first request to *arrive* at the server as
  // close to sale time as possible. latencyMs is a round-trip measurement;
  // compensate for one-way delay (RTT/2) plus a small safety buffer for
  // setTimeout jitter and network variance.
  var EARLY_MS = 40;
  var oneWayLatency = Math.round((_rt.latencyMs || 0) / 2);
  var fireAtLocal = nextSaleTime - oneWayLatency - EARLY_MS;
  var delay = fireAtLocal - Date.now();

  var autoEl = document.getElementById('_auto');

  if (delay < -5000) {
    if (autoEl) autoEl.textContent = 'Expired';
    return;
  }

  if (delay <= 0) {
    dispatchAutoFire();
    return;
  }

  _rt.countdownTimer = setInterval(function() {
    var remaining = fireAtLocal - Date.now();
    var autoEl2 = document.getElementById('_auto');
    if (remaining <= 0) {
      clearInterval(_rt.countdownTimer);
      if (autoEl2) autoEl2.textContent = 'Firing…';
    } else {
      var secs = (remaining / 1000).toFixed(1);
      if (autoEl2) autoEl2.textContent = 'T−' + secs + 's';
    }
  }, 100);

  _rt.autoTimer = setTimeout(dispatchAutoFire, delay);
  if (autoEl) autoEl.textContent = 'Scheduled';
}

function dispatchAutoFire() {
  if (_rt.autoFired) return;

  if (_fireConfig && _fireConfig.mode === 'manual') {
    var mEl = document.getElementById('_auto');
    if (mEl) { mEl.textContent = 'Manual mode — auto disabled'; mEl.style.color = '#64748b'; }
    if (_rt.countdownTimer) clearInterval(_rt.countdownTimer);
    return;
  }

  _rt.autoFired = true;
  if (_rt.countdownTimer) clearInterval(_rt.countdownTimer);
  var ts = new Date().toISOString().replace('T', ' ').substring(0, 23);
  var autoEl = document.getElementById('_auto');
  if (autoEl) autoEl.textContent = 'Fired @ ' + ts.slice(11);
  var oneWayLatency = Math.round((_rt.latencyMs || 0) / 2);
  var startMs = _rt.nextSaleTime - oneWayLatency - 40;
  window.postMessage({ __miaosha_cmd: true, type: 'PREFIRE_FIRE', data: { startMs: startMs, reason: 'auto' } }, '*');
}

// Abort pending auto-fire if the user switches to manual mode.
window.addEventListener('message', function(ev) {
  if (ev.source !== window || !ev.data || !ev.data.__miaosha_overlay) return;
  if (ev.data.type === 'FIRE_CONFIG' && ev.data.data) {
    _fireConfig = ev.data.data;
    if (_fireConfig.mode === 'manual') {
      if (_rt.autoTimer) clearTimeout(_rt.autoTimer);
      if (_rt.countdownTimer) clearInterval(_rt.countdownTimer);
      var autoEl = document.getElementById('_auto');
      if (autoEl && !_rt.autoFired) { autoEl.textContent = 'Manual mode — auto disabled'; autoEl.style.color = '#64748b'; }
    } else if (!_rt.autoFired && _rt.nextSaleTime > 0) {
      scheduleAutoFire(_rt.nextSaleTime);
    }
  }
});
