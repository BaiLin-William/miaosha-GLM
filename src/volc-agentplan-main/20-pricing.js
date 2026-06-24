// Dynamic pricing via Volcengine calculatePriceV5 for Agent Plan.

async function __volc_agentplan_fetchPrice(configBody) {
  const cookies = __volc_agentplan_getCookies();
  const csrf = cookies['csrfToken'];
  const webId = cookies['monitor_huoshan_web_id'];
  if (!csrf || !webId) return null;

  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'x-csrf-token': csrf,
    'monitor-huoshan-web-id': webId,
    'x-language': 'zh',
    'x-use-bff-version': '1',
  };
  if (cookies['monitor_utm']) {
    headers['monitor-utm'] = cookies['monitor_utm'];
  }

  const chargeItems = (configBody.ChargeItemList || []).map(function (item) {
    return {
      ChargeItemCode: item.ChargeItemCode,
      AttrValue: String(item.Count || '1'),
    };
  });

  const body = JSON.stringify({
    ConfigItems: [{
      Product: configBody.Product,
      ConfigurationCode: configBody.ConfigurationCode,
      ChargeItems: chargeItems,
      Quantity: configBody.Quantity || 1,
      Period: configBody.DurationUnit || 'monthly',
      Times: configBody.Duration || 1,
      OrderType: 1,
      SerialNo: '0',
    }],
  });

  try {
    const res = await fetch('https://www.volcengine.com/api/sales/calculatePriceV5', {
      method: 'POST',
      credentials: 'include',
      headers: headers,
      body: body,
    });
    const data = await res.json();
    const error = data.ResponseMetadata?.Error;
    if (error) {
      console.warn('[volc-agentplan-main] calculatePriceV5 error', error);
      return null;
    }
    const result = data.Result || {};
    return {
      original: parseFloat(result.TotalOriginalAmount) || 0,
      current: parseFloat(result.TotalDiscountAmount) || 0,
    };
  } catch (e) {
    console.warn('[volc-agentplan-main] calculatePriceV5 failed', e);
    return null;
  }
}

async function __volc_agentplan_fetchAllPrices(items) {
  const prices = {};
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const key = item.configBody.ConfigurationCode + '|' + (item.configBody.Duration || 1);
    const price = await __volc_agentplan_fetchPrice(item.configBody);
    prices[key] = price || { original: 0, current: 0 };
  }
  return prices;
}
