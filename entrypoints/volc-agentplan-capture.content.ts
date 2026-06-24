// ISOLATED world content script for www.volcengine.com/activity/agentplan
// Injects the Agent Plan MAIN-world overlay and bridges order commands.
import { volcengineAgentplanAdapter } from '../lib/platform';
import { seedVolcengineAgentplanCatalog } from '../lib/platform/adapters/volcengine-agentplan/product-probe';
import { createAuthStore, createProductCatalogStore } from '../lib/platform/shared/stores';
import type { PlatformAuth } from '../lib/platform';

const authStore = createAuthStore(true);
const productCatalogStore = createProductCatalogStore(true);

function postToOverlay(msg: any) {
  window.postMessage({ __volc_overlay: true, ...msg }, '*');
}

function log(stage: string, payload?: any) {
  console.log(`[volc-agentplan-capture] ${stage}`, payload ?? '');
}

async function getFreshAuth(): Promise<PlatformAuth | null> {
  const captured = await volcengineAgentplanAdapter.authProbe.capture();
  if (captured && (await volcengineAgentplanAdapter.authProbe.isAuthenticated(captured))) {
    await authStore.set(captured);
    return captured;
  }
  const cached = authStore.get();
  if (cached && (await volcengineAgentplanAdapter.authProbe.isAuthenticated(cached))) {
    return cached;
  }
  return null;
}

export default defineContentScript({
  matches: ['*://www.volcengine.com/activity/agentplan*'],
  runAt: 'document_idle',

  async main() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('/volc-agentplan-main.js');
    script.dataset.version = chrome.runtime.getManifest().version;
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);

    window.addEventListener('message', async (event) => {
      if (event.source !== window) return;
      const data = event.data;
      if (!data?.__volc_cmd) return;

      if (data.type === 'VOLC_GET_AUTH') {
        const auth = await getFreshAuth();
        postToOverlay({
          type: 'VOLC_AUTH_STATUS',
          data: auth
            ? { ok: true, signals: volcengineAgentplanAdapter.authProbe.getSignals(auth) }
            : { ok: false, reason: 'not-authenticated' },
        });
      }

      if (data.type === 'VOLC_CREATE_ORDER' && data.productId) {
        log('order start', data.productId);
        try {
          const auth = await getFreshAuth();
          if (!auth) {
            postToOverlay({ type: 'VOLC_ORDER_RESULT', error: '未登录或认证信息不足' });
            return;
          }

          const result = await volcengineAgentplanAdapter.orderPipeline.run(
            { platform: 'volcengine-agentplan', productId: data.productId },
            auth,
          );
          log('pipeline result', result);

          if (!result.success || !result.data) {
            postToOverlay({ type: 'VOLC_ORDER_RESULT', error: result.error || '下单失败' });
            return;
          }

          const launch = await volcengineAgentplanAdapter.paymentLauncher.launch(result.data, { window });
          postToOverlay({
            type: 'VOLC_ORDER_RESULT',
            data: {
              orderId: result.data.orderId,
              payUrl: result.data.payUrl,
              launched: launch.success,
              error: launch.error,
            },
          });
        } catch (e: any) {
          log('order exception', e?.message || String(e));
          postToOverlay({ type: 'VOLC_ORDER_RESULT', error: e?.message || '未知错误' });
        }
      }

      if (data.type === 'VOLC_PURCHASE_SUCCESS' && data.orderId) {
        try {
          chrome.runtime.sendMessage({
            type: 'VOLC_PURCHASE_SUCCESS',
            orderId: data.orderId,
            productId: data.productId,
            productName: data.productName,
            payUrl: data.payUrl,
          });
        } catch (e: any) {
          log('purchase success forward failed', e?.message || String(e));
        }
      }

      if (data.type === 'VOLC_CATALOG' && data.catalog) {
        try {
          log('catalog received', { groups: Object.keys(data.catalog.groups || {}) });
          seedVolcengineAgentplanCatalog(data.catalog);
          await productCatalogStore.set({ 'volcengine-agentplan': data.catalog });
          log('catalog seeded');
        } catch (e: any) {
          log('catalog store error', e?.message || String(e));
        }
      }
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes['local:platformCatalog']) return;
      const catalog = changes['local:platformCatalog'].newValue?.['volcengine-agentplan'];
      if (catalog) {
        postToOverlay({ type: 'VOLC_CATALOG', catalog });
      }
    });
  },
});
