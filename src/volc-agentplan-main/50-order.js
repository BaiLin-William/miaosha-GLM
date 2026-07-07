// Order creation and message handling.
// Quarterly/yearly: auto-probe correct IndexKey, cache in codeOverrides.
// probeCode uses SignPay:false to avoid creating orders during probe.

function __volc_agentplan_normalizeConfigBody(raw) {
  const src = (raw && raw.configBody) || {};
  const code = src.ConfigurationCode;
  const duration = src.Duration || 1;
  if (duration === 1 || !code) return src;
  const override = __volc_agentplan_codeOverrides[code + '|' + duration];
  if (!override) return src;
  const b = {};
  for (const k in src) {
    if (Object.prototype.hasOwnProperty.call(src, k)) b[k] = src[k];
  }
  b.ConfigurationCode = override.ConfigurationCode;
  b.DurationUnit = 'monthly';
  b.Duration = duration;
  b.ChargeItemList = [{ ChargeItemCode: override.ChargeItemCode, Count: '1' }];
  if (b.PurchaseTimes != null) b.PurchaseTimes = duration;
  return b;
}

async function __volc_agentplan_probeCode(product) {
  const raw = product && product.raw;
  const base = raw && raw.configBody;
  if (!base) return null;
  const baseCode = base.ConfigurationCode;
  const duration = base.Duration || 1;
  if (duration === 1 || !baseCode) return null;
  const cacheKey = baseCode + '|' + duration;
  if (__volc_agentplan_codeOverrides[cacheKey]) return __volc_agentplan_codeOverrides[cacheKey];

  const cookies = __volc_agentplan_getCookies();
  const csrf = cookies['csrfToken'];
  const webId = cookies['monitor_huoshan_web_id'];
  if (!csrf || !webId) {
    console.warn('[volc-codingplan-main] probe skip (not logged in)');
    return null;
  }
  const hd = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'x-csrf-token': csrf,
    'monitor-huoshan-web-id': webId,
    'x-language': 'zh',
    'x-use-bff-version': '1',
  };
  if (cookies['monitor_utm']) hd['monitor-utm'] = cookies['monitor_utm'];

  const url = 'https://www.volcengine.com/api/v2/top/activity/bill_volc_provider/CommonBuy/2020-01-01/cn-beijing';
  const origCharge = (base.ChargeItemList && base.ChargeItemList[0] && base.ChargeItemList[0].ChargeItemCode) || (baseCode + '_cn-beijing');

  const ikSet = [];
  const own = (raw.indexKeyCandidates && raw.indexKeyCandidates.length) ? raw.indexKeyCandidates.slice() : [raw.indexKey];
  own.forEach(function(k) { if (k && ikSet.indexOf(k) === -1) ikSet.push(k); });
  __volc_agentplan_allIndexKeys.forEach(function(k) { if (k && ikSet.indexOf(k) === -1) ikSet.push(k); });

  console.log('[volc-codingplan-main] probe ' + __volc_agentplan_billingLabel(duration) + ' [code=' + baseCode + ' x keys=' + ikSet.length + ']...');

  async function send(ik) {
    const body = JSON.stringify({
      IndexKey: ik,
      ConfigList: [{
        Product: base.Product,
        ConfigurationCode: baseCode,
        Quantity: base.Quantity || 1,
        DurationUnit: 'monthly',
        Duration: duration,
        ChargeItemList: [{ ChargeItemCode: origCharge, Count: '1' }],
        RenewType: base.RenewType != null ? base.RenewType : 2,
        PurchaseTimes: duration,
      }],
      SignPay: false,
    });
    try {
      const res = await fetch(url, { method: 'POST', credentials: 'include', headers: hd, body: body });
      const data = await res.json();
      const err = data.ResponseMetadata && data.ResponseMetadata.Error;
      return { errCode: err ? err.Code : null, msg: err ? (err.Code + ' . ' + (err.Message || '')) : '', orderId: data.Result && data.Result.CustomerOrderID };
    } catch(e) {
      return { errCode: 'NETWORK', msg: String(e), orderId: null };
    }
  }

  for (let i = 0; i < ikSet.length; i++) {
    const ik = ikSet[i];
    const r = await send(ik);
    console.log('[volc-codingplan-main]   key=' + ik + ' -> ' + (r.orderId ? 'OK(orderId=' + r.orderId + ')' : (r.errCode || 'OK')) + (r.msg ? ' (' + r.msg + ')' : ''));
    if (r.errCode === 'TransferError') {
      const ov = { IndexKey: ik, ConfigurationCode: baseCode, ChargeItemCode: origCharge };
      __volc_agentplan_codeOverrides[cacheKey] = ov;
      console.log('[volc-codingplan-main] v ' + __volc_agentplan_billingLabel(duration) + ' valid (code + key=' + ik + ') [out of stock = config accepted]');
      return ov;
    }
    if (r.orderId) {
      const ov = { IndexKey: ik, ConfigurationCode: baseCode, ChargeItemCode: origCharge };
      __volc_agentplan_codeOverrides[cacheKey] = ov;
      console.log('[volc-codingplan-main] ! ' + __volc_agentplan_billingLabel(duration) + ' stock found during probe, order ignored (orderId=' + r.orderId + ')');
      return ov;
    }
  }
  console.warn('[volc-codingplan-main] x no valid IndexKey found for ' + __volc_agentplan_billingLabel(duration));
  return null;
}

async function __volc_agentplan_tryOrder(product, indexKey) {
  const cookies = __volc_agentplan_getCookies();
  const csrf = cookies['csrfToken'];
  const webId = cookies['monitor_huoshan_web_id'];
  if (!csrf || !webId) {
    __volc_agentplan_setStatus('not logged in');
    __volc_agentplan_stopRefresh('not logged in');
    return { ok: false, retryable: false };
  }

  const tag = __volc_agentplan_formatProductTag(product);
  const hd = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'x-csrf-token': csrf,
    'monitor-huoshan-web-id': webId,
    'x-language': 'zh',
    'x-use-bff-version': '1',
  };
  if (cookies['monitor_utm']) hd['monitor-utm'] = cookies['monitor_utm'];

  const configBody = __volc_agentplan_normalizeConfigBody(product.raw);
  const body = JSON.stringify({ IndexKey: indexKey, ConfigList: [configBody], SignPay: true });

  __volc_agentplan_setStatus(tag + 'ordering...');
  let res;
  try {
    res = await fetch('https://www.volcengine.com/api/v2/top/activity/bill_volc_provider/CommonBuy/2020-01-01/cn-beijing',
      { method: 'POST', credentials: 'include', headers: hd, body: body });
  } catch(e) {
    __volc_agentplan_setStatus(tag + 'network error');
    return { ok: false, retryable: false };
  }
  const data = await res.json();
  const error = data.ResponseMetadata?.Error;
  if (error) {
    const isConfigError = error.Code === 'InvalidParameter.Configuration';
    const isStockError = error.Code === 'TransferError';
    const detail = error.Code + (error.Message ? ' . ' + error.Message : '');
    const logFn = isStockError ? console.log : console.warn;
    logFn('[volc-codingplan-main] CommonBuy ' + (isStockError ? 'out of stock' : 'FAIL') + '\nkey=' + indexKey +
      '\nbody=' + JSON.stringify(configBody) + '\nerror=' + JSON.stringify(error));
    if (isStockError) { __volc_agentplan_setStatus(tag + 'out of stock'); }
    else if (isConfigError) { __volc_agentplan_setStatus(tag + 'config invalid [' + detail + ']'); }
    else { __volc_agentplan_setStatus(tag + 'unavailable [' + detail + ']'); }
    return { ok: false, retryable: isConfigError, error: error };
  }
  const orderId = data.Result?.CustomerOrderID;
  if (!orderId) {
    __volc_agentplan_setStatus(tag + 'no order returned');
    return { ok: false, retryable: false };
  }
  __volc_agentplan_stopRefresh('order ' + orderId + ' created');
  try { localStorage.setItem('__volc_purchased_at', String(Date.now())); } catch(e) {}
  const payUrl = 'https://www.volcengine.com/activity/' + __volc_agentplan_config.payPath + '?i_f=1&o_n=' +
    encodeURIComponent(orderId) + '&tik=' + encodeURIComponent(indexKey);
  __volc_agentplan_setStatus('order ' + orderId + ' created, redirecting...');
  __volc_agentplan_playBeeps(3);
  __volc_agentplan_postCmd('VOLC_PURCHASE_SUCCESS', {
    orderId: orderId, productId: product.id, productName: product.name,
    plan: __volc_agentplan_config.title, payUrl: payUrl,
  });
  return { ok: true, payUrl: payUrl };
}

async function __volc_agentplan_createOrder(productId) {
  if (!productId || !__volc_agentplan_catalogData) return false;
  const all = [].concat(
    __volc_agentplan_catalogData.groups.monthly,
    __volc_agentplan_catalogData.groups.quarterly,
    __volc_agentplan_catalogData.groups.yearly,
  );
  const product = all.find(function(p) { return p.id === productId; });
  if (!product || !product.raw) {
    __volc_agentplan_setStatus('config not found: ' + productId);
    return false;
  }
  const raw = product.raw;
  const ovKey = (raw.configBody.ConfigurationCode || '') + '|' + (raw.configBody.Duration || 1);
  const ov = __volc_agentplan_codeOverrides[ovKey];
  const candidates = ov && ov.IndexKey
    ? [ov.IndexKey]
    : (raw.indexKeyCandidates && raw.indexKeyCandidates.length
        ? raw.indexKeyCandidates.slice()
        : [raw.indexKey]);
  for (let i = 0; i < candidates.length; i++) {
    const result = await __volc_agentplan_tryOrder(product, candidates[i]);
    if (result.ok) return true;
    if (!result.retryable) return false;
    if (i < candidates.length - 1) {
      __volc_agentplan_setStatus(__volc_agentplan_formatProductTag(product) + 'config invalid, trying next key...');
    }
  }
  return false;
}

window.addEventListener('message', function(event) {
  if (event.source !== window) return;
  const data = event.data;
  if (!data?.__volc_overlay) return;
  if (data.type === 'VOLC_AUTH_STATUS') {
    __volc_agentplan_setStatus(data.data?.ok ? 'ready' : 'not logged in');
  }
  if (data.type === 'VOLC_ORDER_RESULT') {
    if (data.error) { __volc_agentplan_setStatus('order failed: ' + data.error); }
    else if (data.data) { __volc_agentplan_setStatus('order ' + data.data.orderId + ' created'); }
  }
});
