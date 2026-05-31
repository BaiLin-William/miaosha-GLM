function produceCaptcha() {
  if (typeof window.TencentCaptcha === 'undefined') { postMsg('CAPTCHA_ERROR', { msg: 'SDK not loaded' }); return; }
  try {
    var c = new window.TencentCaptcha(CAPTCHA_APPID, function(res) {
      if (res.ret === 0 && res.ticket) {
        postMsg('CAPTCHA_PRODUCED', { ticket: res.ticket, randstr: res.randstr });
        // Batch mode: count and auto-stop at session limit
        if (_batchMode) {
          _batchCount++;
          if (_batchCount >= BATCH_SESSION_LIMIT) {
            setBatchMode(false);
            return;
          }
          setTimeout(produceCaptcha, 300);
        }
      }
      else {
        postMsg('CAPTCHA_ERROR', { msg: 'Failed (ret=' + res.ret + ')' });
        if (_batchMode) { setTimeout(produceCaptcha, 500); }
      }
    }, { mode: 'popup' });
    c.show();
  } catch(e) { postMsg('CAPTCHA_ERROR', { msg: e.message }); }
}

function setBatchMode(on) {
  _batchMode = on;
  if (on) _batchCount = 0;
  var btn = document.getElementById('_ab');
  if (btn) {
    if (on) {
      btn.innerHTML = '&#9632; Stop Batch <span style="font-size:7px;font-weight:600;opacity:.6;margin-left:4px">(Esc)</span>';
      btn.style.borderColor = '#dc2626';
      btn.style.color = '#dc2626';
      btn.style.background = 'rgba(220,38,38,0.03)';
    } else {
      btn.innerHTML = '+ Solve Captcha';
      btn.style.borderColor = '';
      btn.style.color = '';
      btn.style.background = '';
    }
  }
  if (on) produceCaptcha();
}

function toggleBatchMode() { setBatchMode(!_batchMode); }

// ── Keyboard shortcut: Escape to stop batch ──
function setupCaptchaKeyboard() {
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && _batchMode) {
      e.preventDefault();
      e.stopPropagation();
      setBatchMode(false);
    }
  }, true);
}
setupCaptchaKeyboard();
