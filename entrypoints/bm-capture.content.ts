// ISOLATED world content script for bigmodel.cn
// Injects MAIN world XHR interceptor and relays payment/ticket data to WXT storage
// Also implements R3: Tab Audio+Visual reminder when user is on bigmodel.cn
import { storage } from '#imports';
import { buildStrikeQueue, type StrikeShot, type StrikeTarget } from '../lib/api/fire-plan';
import { fireStore, FIRE_CONFIG_DEFAULT, type FireConfig } from '../lib/settings/fire';
import { SALE_ALARM_MINUTES, SALE_TIME_DEFAULT, getNextSaleTime, saleTimeStore, type SaleTimeConfig } from '../lib/settings/sale-time';
import { captchaStore } from '../lib/settings/captcha';

const AUTH_KEY = 'local:authHeaders';
const BATCH_PREVIEW_KEY = 'local:batchPreview';
const TICKET_TTL_MS = 290 * 1000; // 290s per-ticket lifecycle
let TICKET_POOL_MAX = 100; // synced with captchaConfig.batchSessionLimit (single source of truth)
const REMINDER_PHASE_MINUTES_ASC = [...SALE_ALARM_MINUTES].sort((a, b) => a - b);

const PHASE_BEEPS: Record<number, number> = {
  60: 1,
  30: 1,
  15: 1,
  10: 3,
   5: 4,
};

// ── In-memory ticket pool, backed by page sessionStorage ──
let _ticketPool: any[] = [];
let _ticketStoreReadyPromise: Promise<void> | null = null;

function ensureTicketStoreReady(): Promise<void> {
  if (_ticketStoreReadyPromise) return _ticketStoreReadyPromise;
  _ticketStoreReadyPromise = (async () => {
    try {
      const stored: any[] = await readPageTicketStore();
      const now = Date.now();
      _ticketPool = stored
        .filter((t: any) => now - t.createdAt < TICKET_TTL_MS)
        .sort((a: any, b: any) => a.createdAt - b.createdAt);
      if (_ticketPool.length > TICKET_POOL_MAX) {
        _ticketPool.splice(0, _ticketPool.length - TICKET_POOL_MAX);
      }
      writePageTicketStore();
    } catch {
      _ticketPool = [];
    }
  })();
  return _ticketStoreReadyPromise;
}

function readPageTicketStore(): Promise<any[]> {
  return new Promise((resolve) => {
    const reqId = Math.random().toString(36).slice(2);
    function handler(ev: MessageEvent) {
      if (ev.source !== window || !ev.data?.__miaosha || ev.data.type !== 'TICKET_STORE_DATA' || ev.data.reqId !== reqId) return;
      window.removeEventListener('message', handler);
      resolve(ev.data.list || []);
    }
    window.addEventListener('message', handler);
    window.postMessage({ __miaosha_cmd: true, type: 'READ_TICKET_STORE', reqId }, '*');
    setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve([]);
    }, 800);
  });
}

function writePageTicketStore() {
  window.postMessage({ __miaosha_cmd: true, type: 'WRITE_TICKET_STORE', list: _ticketPool }, '*');
}

function clearPageTicketStore() {
  _ticketPool = [];
  window.postMessage({ __miaosha_cmd: true, type: 'CLEAR_TICKET_STORE' }, '*');
}

function isExtensionContextValid(): boolean {
  try {
    return !!(
      (chrome?.runtime?.id && chrome?.storage?.local) ||
      ((globalThis as any)?.browser?.runtime?.id && (globalThis as any)?.browser?.storage?.local)
    );
  } catch {
    return false;
  }
}

// ── Safe storage wrapper (module-scope so reminder helpers can use it) ────────
async function safeGet<T>(key: string): Promise<T | null> {
  if (!isExtensionContextValid()) return null;
  try { return await storage.getItem<T>(key); } catch { return null; }
}
async function safeSet(key: string, value: any): Promise<void> {
  if (!isExtensionContextValid()) return;
  try { await storage.setItem(key, value); } catch {}
}

// ── R3: Flash Sale Reminder ──────────────────────────────────────────────────

interface ReminderState {
  reminded: Record<string, boolean>;
  saleEpoch?: number;
}

async function getSaleConfig(): Promise<SaleTimeConfig> {
  try {
    if (!isExtensionContextValid()) return { ...SALE_TIME_DEFAULT };
    return await saleTimeStore.get();
  } catch {
    return { ...SALE_TIME_DEFAULT };
  }
}

async function syncCaptchaConfig(pushToOverlay = false) {
  if (!isExtensionContextValid()) return;
  try {
    const cfg = await captchaStore.get();
    const limit = Number(cfg.batchSessionLimit);
    if (limit > 0 && isFinite(limit)) {
      TICKET_POOL_MAX = Math.max(1, Math.round(limit));
      if (pushToOverlay) {
        postToOverlay({ type: 'CAPTCHA_CONFIG', data: { batchSessionLimit: TICKET_POOL_MAX } });
      }
    }
  } catch {
    // Extension context may have been invalidated; ignore.
  }
}

function getSalePhase(config: SaleTimeConfig): number | null {
  const now = Date.now();
  const sale = getNextSaleTime(config);
  const remaining = sale - now;
  if (remaining <= 0) return null;
  for (const minutesBefore of REMINDER_PHASE_MINUTES_ASC) {
    if (remaining <= minutesBefore * 60 * 1000) return minutesBefore;
  }
  return null;
}

function createOverlay(min: number) {
  const existing = document.getElementById('miaosha-flash-overlay');
  if (existing) existing.remove();

  const reminderText = min <= 5
    ? `🔥 距智谱秒杀还有 ${min} 分钟！请立刻录入验证码，越多越好`
    : `🔥 距智谱秒杀还有 ${min} 分钟`;
  const actionText = min <= 5 ? '去录入验证码' : '立即准备';

  const overlay = document.createElement('div');
  overlay.id = 'miaosha-flash-overlay';
  overlay.innerHTML = `
    <div style="
      position: fixed; top: 0; left: 0; right: 0; z-index: 2147483647;
      background: linear-gradient(135deg, #dc2626, #ef4444);
      color: #fff; padding: 12px 20px; font-size: 15px;
      font-weight: 800; text-align: center;
      display: flex; align-items: center; justify-content: center; gap: 12px;
      box-shadow: 0 4px 20px rgba(220,38,38,0.4);
      animation: miaoshaPulse 1s ease-in-out infinite alternate;
      cursor: pointer; font-family: system-ui, -apple-system, sans-serif;
    ">
      <span>${reminderText}</span>
      <button id="miaosha-open-btn" style="
        background: #fff; color: #dc2626; border: none;
        padding: 5px 14px; border-radius: 20px; font-weight: 700;
        cursor: pointer; font-size: 13px;
      ">${actionText}</button>
    </div>
    <style>
      @keyframes miaoshaPulse {
        from { opacity: 0.85; transform: scale(1); }
        to { opacity: 1; transform: scale(1.01); }
      }
    </style>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'miaosha-open-btn') return;
    overlay.remove();
  });
  document.getElementById('miaosha-open-btn')?.addEventListener('click', () => {
    overlay.remove();
  });
}

function playBeeps(count: number) {
  if (count <= 0) return;
  for (let i = 0; i < count; i++) {
    setTimeout(() => playBeep(), i * 350);
  }
}

function playBeep() {
  try {
    const audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') {
      audioCtx.close();
      return;
    }
    const buf = audioCtx.createBuffer(1, 44100, 44100);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.sin(2 * Math.PI * 880 * i / 44100) * 0.25;
    }
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);
    src.start();
    setTimeout(() => { src.stop(); audioCtx.close(); }, 200);
  } catch {}
}

function createReminderState(saleEpoch: number): ReminderState {
  return {
    reminded: Object.fromEntries(SALE_ALARM_MINUTES.map((minutesBefore) => [String(minutesBefore), false])),
    saleEpoch,
  };
}

async function loadReminderState(saleEpoch: number): Promise<ReminderState> {
  const defaultState = createReminderState(saleEpoch);
  const stored = await safeGet<ReminderState>('local:reminderState');
  if (!stored || stored.saleEpoch !== saleEpoch) return defaultState;
  return {
    ...defaultState,
    ...stored,
    reminded: {
      ...defaultState.reminded,
      ...(stored.reminded ?? {}),
    },
  };
}

async function saveReminderState(state: ReminderState) {
  await safeSet('local:reminderState', state);
}

async function checkAndRemind() {
  const config = await getSaleConfig();
  const saleEpoch = getNextSaleTime(config);
  const phase = getSalePhase(config);
  if (!phase) return;

  const state = await loadReminderState(saleEpoch);
  const key = String(phase);
  if (state.reminded[key]) return;

  createOverlay(phase);
  if (config.soundEnabled) {
    playBeeps(PHASE_BEEPS[phase] ?? 1);
  }

  state.reminded[key] = true;
  await saveReminderState(state);
}

async function initReminderLoop() {
  setInterval(checkAndRemind, 60_000);
  await checkAndRemind();
}
// ── End R3 ─────────────────────────────────────────────────────────────────

// ── Force-Stop Banner (shown during batch captcha mode) ────────────────────

function createForceStopBanner() {
  removeForceStopBanner();
  const el = document.createElement('div');
  el.id = 'miaosha-force-stop-banner';
  el.innerHTML = `
    <div style="
      position: fixed; top: 0; left: 0; right: 0; z-index: 2147483647;
      background: linear-gradient(135deg, #dc2626, #ef4444);
      color: #fff; padding: 10px 20px; font-size: 14px;
      font-weight: 800; text-align: center;
      display: flex; align-items: center; justify-content: center; gap: 10px;
      box-shadow: 0 4px 20px rgba(220,38,38,0.4);
      animation: miaoshaPulse 1s ease-in-out infinite alternate;
      font-family: system-ui, -apple-system, sans-serif;
    ">
      <span>&#9632; Batch Mode Active — solving captchas</span>
      <kbd style="
        padding: 2px 8px; background: rgba(255,255,255,0.25);
        border: 1px solid rgba(255,255,255,0.5); border-radius: 4px;
        font-size: 12px; font-weight: 700; font-family: monospace;
      ">Esc</kbd>
      <span>to force stop</span>
    </div>
    <style>
      @keyframes miaoshaPulse {
        from { opacity: 0.85; transform: scale(1); }
        to { opacity: 1; transform: scale(1.01); }
      }
    </style>
  `;
  document.body.appendChild(el);
}

function removeForceStopBanner() {
  document.getElementById('miaosha-force-stop-banner')?.remove();
}

function postToOverlay(msg: any) {
  window.postMessage({ __miaosha_overlay: true, ...msg }, '*');
}

function isAuthValid(auth: any): boolean {
  return !!(auth?.authorization && auth?.bigmodelOrganization && auth?.bigmodelProject);
}

function tokenSuffix(authz: string | undefined): string {
  if (!authz || typeof authz !== 'string') return '';
  const raw = authz.replace(/^Bearer\s+/i, '');
  return raw.slice(-6);
}

function maskTicket(ticket: string): string {
  if (!ticket || typeof ticket !== 'string') return '';
  if (ticket.length <= 8) return ticket;
  return 'tk_…' + ticket.slice(-4);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default defineContentScript({
  matches: ['*://*.bigmodel.cn/*'],
  runAt: 'document_idle',

  async main() {
    // Inject MAIN world script
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('/bm-main.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);

    async function captureAuthFromPage() {
      try {
        const cookies = document.cookie.split(';').reduce((acc, c) => {
          const [k, ...vParts] = c.trim().split('=');
          acc[k] = vParts.join('=');
          return acc;
        }, {} as Record<string, string>);
        const jwt = cookies.bigmodel_token_production;
        const org = localStorage.getItem('Bigmodel-Organization');
        const proj = localStorage.getItem('Bigmodel-Project');
        if (!jwt || !org || !proj) return null;
        const now = Date.now();
        const auth = {
          authorization: jwt.startsWith('Bearer ') ? jwt : `Bearer ${jwt}`,
          bigmodelOrganization: org,
          bigmodelProject: proj,
          capturedAt: now,
          source: 'live-page',
        };
        await safeSet(AUTH_KEY, auth);
        return auth;
      } catch {
        return null;
      }
    }

    async function getFreshAuthHeaders() {
      const captured = await captureAuthFromPage();
      if (isAuthValid(captured)) return captured;
      const cached = await safeGet<any>(AUTH_KEY);
      if (isAuthValid(cached)) return cached;
      return null;
    }

    async function getPrefireAuthStatus() {
      const auth = await getFreshAuthHeaders();
      if (!isAuthValid(auth)) {
        return {
          ok: false,
          reason: 'missing-auth',
        };
      }

      const capturedAt = typeof auth.capturedAt === 'number' ? auth.capturedAt : Date.now();
      return {
        ok: true,
        headers: auth,
        source: auth.source === 'live-page' ? 'live-page' : 'storage-fallback',
        capturedAt,
        ageMs: Math.max(0, Date.now() - capturedAt),
        org: auth.bigmodelOrganization,
        project: auth.bigmodelProject,
        tokenSuffix: tokenSuffix(auth.authorization),
      };
    }

    async function fetchBatchPreviewWithAuth() {
      const authHeaders = await getFreshAuthHeaders();
      if (!authHeaders?.authorization || !authHeaders?.bigmodelOrganization || !authHeaders?.bigmodelProject) {
        return null;
      }

      const t0 = performance.now();
      try {
        const res = await fetch('https://bigmodel.cn/api/biz/pay/batch-preview', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'content-type': 'application/json;charset=UTF-8',
            authorization: authHeaders.authorization,
            'bigmodel-organization': authHeaders.bigmodelOrganization,
            'bigmodel-project': authHeaders.bigmodelProject,
          },
          body: JSON.stringify({ invitationCode: '' }),
        });

        const data = await res.json();
        const rttMs = Math.round(performance.now() - t0);
        postToOverlay({ type: 'RUNTIME_CALIBRATION', data: { latencyMs: rttMs, calibratedAt: Date.now(), source: 'batch-preview' } });

        if (data?.code === 200 && data?.data?.productList) {
          await safeSet(BATCH_PREVIEW_KEY, data);
          return data.data.productList as any[];
        }
        return null;
      } catch {
        return null;
      }
    }

    // ── Batch Preview bridge: storage → MAIN world ──
    async function pushBatchPreviewToOverlay() {
      const authHeaders = await getFreshAuthHeaders();
      if (!isAuthValid(authHeaders)) return false;
      const cached = await safeGet<any>(BATCH_PREVIEW_KEY);
      if (cached?.data?.productList) {
        postToOverlay({ type: 'BATCH_PREVIEW_DATA', data: cached.data.productList });
        return true;
      }
      return false;
    }

    async function refreshBatchPreviewToOverlay() {
      const fresh = await fetchBatchPreviewWithAuth();
      if (fresh && fresh.length > 0) {
        postToOverlay({ type: 'BATCH_PREVIEW_DATA', data: fresh });
        return true;
      }
      return false;
    }

    pushBatchPreviewToOverlay().then((hasCached) => {
      if (!hasCached) {
        refreshBatchPreviewToOverlay();
      }
    });

    chrome.storage.onChanged.addListener(async (changes, area) => {
      if (area === 'local' && changes[BATCH_PREVIEW_KEY]) {
        const authHeaders = await getFreshAuthHeaders();
        if (!isAuthValid(authHeaders)) return;
        const newList = changes[BATCH_PREVIEW_KEY].newValue?.data?.productList;
        if (newList) postToOverlay({ type: 'BATCH_PREVIEW_DATA', data: newList });
      }
      if (area === 'local' && changes['local:captchaConfig']) {
        syncCaptchaConfig(true);
      }
    });

    // ── Helper: get current valid ticket count / list ──
    async function getTicketInfo() {
      await ensureTicketStoreReady();
      const now = Date.now();
      _ticketPool = _ticketPool.filter((t: any) => now - t.createdAt < TICKET_TTL_MS);
      const tickets = _ticketPool.map((t: any) => {
        const remainingMs = Math.max(0, TICKET_TTL_MS - (now - t.createdAt));
        return {
          ticket: t.ticket,
          randstr: t.randstr,
          createdAt: t.createdAt,
          remainingMs,
          expired: false,
        };
      });
      return { count: tickets.length, tickets };
    }

    async function getLaunchSnapshot() {
      await ensureTicketStoreReady();
      const now = Date.now();
      const valid = _ticketPool.filter((t: any) => now - t.createdAt < TICKET_TTL_MS);
      const selData = await safeGet<any>('local:selectedProducts');
      const targets: StrikeTarget[] = (selData?.priorityList || [])
        .filter((item: any) => item && item.productId)
        .slice(0, 3)
        .map((item: any, idx: number) => ({ productId: String(item.productId), priority: idx + 1 }));
      let fireConfig: FireConfig;
      try {
        fireConfig = isExtensionContextValid() ? await fireStore.get() : { ...FIRE_CONFIG_DEFAULT };
      } catch {
        fireConfig = { ...FIRE_CONFIG_DEFAULT };
      }
      return { valid, targets, fireConfig };
    }

    // ── Poll payment status ──
    async function pollPayCheck(
      authHeaders: any,
      bizId: string,
      onUpdate: (status: 'SUCCESS' | 'EXPIRE' | 'timeout') => void,
    ) {
      const MAX_MS = 5 * 60 * 1000;
      const INTERVAL_MS = 1500;
      const start = Date.now();
      while (Date.now() - start < MAX_MS) {
        try {
          const res = await fetch(`https://bigmodel.cn/api/biz/pay/check?bizId=${encodeURIComponent(bizId)}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              authorization: authHeaders.authorization,
              'bigmodel-organization': authHeaders.bigmodelOrganization,
              'bigmodel-project': authHeaders.bigmodelProject,
            },
          });
          const data = await res.json();
          const status = data?.data?.status ?? data?.data;
          if (status === 'SUCCESS' || status === 'success' || status === true || data?.code === 200) {
            onUpdate('SUCCESS');
            return;
          }
          if (status === 'EXPIRE' || status === 'expire' || status === 'FAILED' || status === 'failed') {
            onUpdate('EXPIRE');
            return;
          }
        } catch {}
        await sleep(INTERVAL_MS);
      }
      onUpdate('timeout');
    }

    async function updatePaymentState(patch: any) {
      const current = await safeGet<any>('local:paymentState');
      const next = { ...(current || {}), ...patch, updatedAt: Date.now() };
      await safeSet('local:paymentState', next);
      postToOverlay({ type: 'PAYMENT_STATE', data: next });
    }

    // ── Unified strike: preload → strike → native pay ──
    let currentStrikeCancel: (() => void) | null = null;

    async function strike(startMs: number, authOverride?: any) {
      const authHeaders = isAuthValid(authOverride) ? authOverride : await getFreshAuthHeaders();
      if (!isAuthValid(authHeaders)) {
        postToOverlay({ type: 'FIRE_RESULT', line: '> No auth headers' });
        return;
      }

      const { valid, targets, fireConfig } = await getLaunchSnapshot();
      if (valid.length === 0) {
        postToOverlay({ type: 'FIRE_RESULT', line: '> No valid tickets' });
        return;
      }
      if (targets.length === 0) {
        postToOverlay({ type: 'FIRE_RESULT', line: '> No products selected' });
        return;
      }

      const plan = buildStrikeQueue({ tickets: valid, targets });
      if (plan.shots.length === 0) {
        postToOverlay({ type: 'FIRE_RESULT', line: '> Strike queue empty' });
        return;
      }

      // Consume all tickets used in this strike.
      const usedKeys = new Set(plan.shots.map((s) => s.ticket + ':' + s.randstr + ':' + s.createdAt));
      _ticketPool = _ticketPool.filter((t: any) => !usedKeys.has(t.ticket + ':' + t.randstr + ':' + t.createdAt));
      writePageTicketStore();
      const remainingInfo = await getTicketInfo();
      postToOverlay({ type: 'TICKET_COUNT', count: remainingInfo.count, tickets: remainingInfo.tickets });

      const burstIntervalMs = Math.max(50, Math.round(fireConfig.burstIntervalMs) || 2100);
      postToOverlay({
        type: 'FIRE_RESULT',
        line: `> Strike ${plan.shots.length} shots · burst`,
      });
      postToOverlay({
        type: 'FIRE_BATCH_START',
        data: {
          queue: plan.shots.map((shot, idx) => ({
            shotIdx: idx,
            productId: shot.productId,
            priority: shot.priority,
            ticketMask: maskTicket(shot.ticket),
          })),
          totalShots: plan.shots.length,
          startMs,
          mode: fireConfig.mode === 'manual' ? 'manual' : 'auto',
          burstIntervalMs,
        },
      });

      const previewAbortCtrl = new AbortController();
      let cancelled = false;
      const timers: ReturnType<typeof setTimeout>[] = [];

      const cancelAll = () => {
        if (cancelled) return;
        cancelled = true;
        currentStrikeCancel = null;
        previewAbortCtrl.abort();
        for (const id of timers) clearTimeout(id);
        timers.length = 0;
      };
      currentStrikeCancel = cancelAll;

      const total = plan.shots.length;
      let succeeded = false;

      const fireOne = async (shot: StrikeShot, idx: number): Promise<string> => {
        if (cancelled) return 'cancelled';
        const tag = '>[#' + (idx + 1) + '/' + total + '][P' + shot.priority + '] ' + shot.productId.slice(-6);
        const t1 = Date.now();
        try {
          const res = await fetch('https://bigmodel.cn/api/biz/pay/preview', {
            method: 'POST',
            signal: previewAbortCtrl.signal,
            credentials: 'include',
            headers: {
              'content-type': 'application/json;charset=UTF-8',
              authorization: authHeaders.authorization,
              'bigmodel-organization': authHeaders.bigmodelOrganization,
              'bigmodel-project': authHeaders.bigmodelProject,
            },
            body: JSON.stringify({ productId: shot.productId, ticket: shot.ticket, randstr: shot.randstr }),
          });
          if (cancelled) return 'cancelled';
          const body = await res.json();
          const rtt = Date.now() - t1;

          if (body.code === 200 && body.data && !body.data.soldOut && body.data.bizId) {
            succeeded = true;
            cancelAll();
            const bizId = body.data.bizId as string;
            const amount = (body.data.thirdPartyAmount ?? body.data.payAmount) as number;
            const productId = (body.data.productId ?? shot.productId) as string;
            const ps = {
              bizId,
              amount,
              productId,
              qrCode: body.data.qrCode || null,
              payType: fireConfig.payType,
              status: 'pending' as const,
              updatedAt: Date.now(),
            };
            await updatePaymentState(ps);
            postToOverlay({ type: 'BURST_FIRE_SUCCESS', data: ps });
            postToOverlay({ type: 'FIRE_RESULT', line: tag + ': ORDER bizId=' + bizId + ' (' + rtt + 'ms)' });
            postToOverlay({
              type: 'FIRE_SHOT_RESULT',
              data: { shotIdx: idx, productId: shot.productId, priority: shot.priority, outcome: 'success', code: 200, rtt, sentAt: t1, bizId, ticketMask: maskTicket(shot.ticket), serverMsg: '' },
            });
            void pollPayCheck(authHeaders, bizId, (status) => {
              if (status === 'SUCCESS') {
                void updatePaymentState({ status: 'success' });
                postToOverlay({ type: 'STRIKE_PAYMENT_SUCCESS', data: { bizId, orderId: bizId } });
                postToOverlay({ type: 'FIRE_RESULT', line: '> Payment confirmed bizId=' + String(bizId).slice(-8) });
              } else if (status === 'EXPIRE') {
                void updatePaymentState({ status: 'expired' });
                postToOverlay({ type: 'STRIKE_PAYMENT_EXPIRED', data: { bizId, orderId: bizId } });
                postToOverlay({ type: 'FIRE_RESULT', line: '> Payment expired bizId=' + String(bizId).slice(-8) });
              } else {
                void updatePaymentState({ status: 'timeout' });
                postToOverlay({ type: 'STRIKE_PAYMENT_TIMEOUT', data: { bizId, orderId: bizId } });
                postToOverlay({ type: 'FIRE_RESULT', line: '> Payment status timeout bizId=' + String(bizId).slice(-8) });
              }
            });
            return 'success';
          } else if (body.code === 200 && body.data?.soldOut) {
            postToOverlay({ type: 'FIRE_RESULT', line: tag + ': sold-out today (' + rtt + 'ms)' });
            postToOverlay({ type: 'FIRE_SHOT_RESULT', data: { shotIdx: idx, productId: shot.productId, priority: shot.priority, outcome: 'soldout', code: 200, rtt, sentAt: t1, ticketMask: maskTicket(shot.ticket), serverMsg: body.msg || 'sold out' } });
            return 'soldout';
          } else if (body.code === 555) {
            postToOverlay({ type: 'FIRE_RESULT', line: tag + ': server-busy-555 (' + rtt + 'ms)' });
            postToOverlay({ type: 'FIRE_SHOT_RESULT', data: { shotIdx: idx, productId: shot.productId, priority: shot.priority, outcome: 'busy', code: 555, rtt, sentAt: t1, ticketMask: maskTicket(shot.ticket), serverMsg: body.msg || 'server busy' } });
            return 'busy';
          } else {
            postToOverlay({ type: 'FIRE_RESULT', line: tag + ': code=' + body.code + ' ' + (body.msg || '') + ' (' + rtt + 'ms)' });
            postToOverlay({ type: 'FIRE_SHOT_RESULT', data: { shotIdx: idx, productId: shot.productId, priority: shot.priority, outcome: 'error', code: body.code, rtt, sentAt: t1, ticketMask: maskTicket(shot.ticket), serverMsg: body.msg || '' } });
            return 'error';
          }
        } catch (e: any) {
          if (e?.name === 'AbortError' || cancelled) return 'cancelled';
          postToOverlay({ type: 'FIRE_RESULT', line: tag + ': net-err: ' + (e?.message || 'unknown') });
          postToOverlay({ type: 'FIRE_SHOT_RESULT', data: { shotIdx: idx, productId: shot.productId, priority: shot.priority, outcome: 'neterr', rtt: Date.now() - t1, sentAt: t1, ticketMask: maskTicket(shot.ticket), serverMsg: e?.message || 'unknown' } });
          return 'neterr';
        }
      };

      // Adaptive scheduling: after each shot, decide when to fire the next one.
      // - Consecutive 555s back off by +200ms (max 3000ms) to reduce wasted tickets.
      // - Consecutive soldouts stop early (>=3) since inventory is likely gone.
      const baseDelay = Math.max(0, startMs - Date.now());
      let currentInterval = burstIntervalMs;
      let consecutiveBusy = 0;
      let shotIdx = 0;
      const BUSY_BACKOFF_MS = 200;
      const MAX_INTERVAL_MS = 3000;

      const scheduleNext = () => {
        if (cancelled || succeeded || shotIdx >= total) {
          if (!succeeded && !cancelled) {
            cancelAll();
            postToOverlay({ type: 'FIRE_RESULT', line: '> Strike complete — ammo depleted (' + total + ' shots)' });
            postToOverlay({ type: 'BURST_FIRE_DEPLETED', data: { total } });
          }
          return;
        }

        const shot = plan.shots[shotIdx];
        const idx = shotIdx;
        shotIdx++;
        timers.push(
          setTimeout(async () => {
            const outcome = await fireOne(shot, idx);
            if (outcome === 'busy') {
              consecutiveBusy++;
              if (consecutiveBusy >= 2) {
                currentInterval = Math.min(MAX_INTERVAL_MS, currentInterval + BUSY_BACKOFF_MS);
                postToOverlay({ type: 'FIRE_RESULT', line: `> 555 backoff: interval increased to ${currentInterval}ms` });
              }
            } else {
              consecutiveBusy = 0;
            }

            scheduleNext();
          }, shotIdx === 1 ? baseDelay : currentInterval),
        );
      };

      scheduleNext();
    }

    async function prefireAndBurst(startMs: number, reason: string) {
      const authStatus = await getPrefireAuthStatus();
      if (!authStatus.ok) {
        postToOverlay({
          type: 'PREFIRE_STATUS',
          data: {
            ok: false,
            reason: authStatus.reason,
            fireReason: reason,
          },
        });
        postToOverlay({ type: 'FIRE_RESULT', line: '> Prefire blocked: auth unavailable' });
        return;
      }

      postToOverlay({
        type: 'PREFIRE_STATUS',
        data: {
          ok: true,
          source: authStatus.source,
          capturedAt: authStatus.capturedAt,
          ageMs: authStatus.ageMs,
          tokenSuffix: authStatus.tokenSuffix,
          org: authStatus.org,
          project: authStatus.project,
          fireReason: reason,
        },
      });

      await strike(startMs, authStatus.headers);
    }

    // ── Listen for messages from MAIN world script ──
    window.addEventListener('message', async (event) => {
      if (event.source !== window) return;

      // From overlay (MAIN world) — commands
      if (event.data?.__miaosha_cmd) {
        if (event.data.type === 'GET_TICKET_COUNT') {
          const info = await getTicketInfo();
          postToOverlay({ type: 'TICKET_COUNT', count: info.count, tickets: info.tickets });
        }
        if (event.data.type === 'PREFIRE_FIRE') {
          const startMs: number = (event.data.data?.startMs) ?? Date.now();
          const reason: string = event.data.data?.reason ?? 'prefire-fire';
          prefireAndBurst(startMs, reason);
        }
        if (event.data.type === 'GET_SALE_TIME') {
          const cfg = await getSaleConfig();
          const nst = getNextSaleTime(cfg);
          postToOverlay({ type: 'SALE_TIME_CONFIG', data: { config: cfg, nextSaleTime: nst } });
        }
        if (event.data.type === 'GET_FIRE_CONFIG') {
          try {
            const cfg = isExtensionContextValid() ? await fireStore.get() : { ...FIRE_CONFIG_DEFAULT };
            postToOverlay({ type: 'FIRE_CONFIG', data: cfg });
          } catch {
            postToOverlay({ type: 'FIRE_CONFIG', data: { ...FIRE_CONFIG_DEFAULT } });
          }
        }
        if (event.data.type === 'SET_FIRE_CONFIG' && event.data.data) {
          const incoming = event.data.data;
          let current: FireConfig;
          try {
            current = isExtensionContextValid() ? await fireStore.get() : { ...FIRE_CONFIG_DEFAULT };
          } catch {
            current = { ...FIRE_CONFIG_DEFAULT };
          }
          const next: FireConfig = {
            mode: incoming.mode === 'manual' ? 'manual' : 'auto',
            payType: incoming.payType === 'WE_CHAT' ? 'WE_CHAT' : 'ALI',
            burstIntervalMs: Number.isFinite(Number(incoming.burstIntervalMs))
              ? Math.max(50, Math.round(Number(incoming.burstIntervalMs)))
              : current.burstIntervalMs,
          };
          try {
            if (isExtensionContextValid()) await fireStore.set(next);
          } catch {}
          postToOverlay({ type: 'FIRE_CONFIG', data: next });
        }
        if (event.data.type === 'OPEN_OPTIONS_PAGE') {
          try { chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS_PAGE' }); } catch {}
        }
        if (event.data.type === 'REQUEST_BATCH_PREVIEW') {
          const pushed = await pushBatchPreviewToOverlay();
          if (!pushed) {
            await refreshBatchPreviewToOverlay();
          }
        }
        if (event.data.type === 'REFRESH_BATCH_PREVIEW') {
          await refreshBatchPreviewToOverlay();
        }
        if (event.data.type === 'CLEAR_BATCH_PREVIEW_CACHE') {
          try { await chrome.storage.local.remove(BATCH_PREVIEW_KEY); } catch {}
        }
        if (event.data.type === 'CLEAR_TICKET_POOL') {
          clearPageTicketStore();
          const info = await getTicketInfo();
          postToOverlay({ type: 'TICKET_COUNT', count: info.count, tickets: info.tickets });
        }
      }

      // From XHR interceptor (MAIN world) — events
      if (!event.data?.__miaosha) return;
      const { type, payload } = event.data;

      if (type === 'PRODUCT_SELECTION_CHANGED' && payload) {
        await safeSet('local:selectedProducts', payload);
      }

      if (type === 'CAPTCHA_PRODUCED' && payload?.ticket) {
        await ensureTicketStoreReady();
        if (!_ticketPool.some((t: any) => t.ticket === payload.ticket)) {
          const now = Date.now();
          _ticketPool.push({ ticket: payload.ticket, randstr: payload.randstr, createdAt: now });
          _ticketPool = _ticketPool
            .filter((t: any) => now - t.createdAt < TICKET_TTL_MS)
            .sort((a: any, b: any) => a.createdAt - b.createdAt);
          if (_ticketPool.length > TICKET_POOL_MAX) {
            _ticketPool.splice(0, _ticketPool.length - TICKET_POOL_MAX);
          }
          writePageTicketStore();
        }
        const info = await getTicketInfo();
        postToOverlay({ type: 'TICKET_COUNT', count: info.count, tickets: info.tickets });
      }

      if (type === 'CAPTCHA_ERROR' && payload) {
        postToOverlay({ type: 'FIRE_RESULT', line: '> Captcha error: ' + payload.msg });
      }

      if (type === 'BATCH_MODE_STATUS') {
        if (payload?.active) {
          createForceStopBanner();
        } else {
          removeForceStopBanner();
        }
      }
    });

    // ── Listen for commands from popup ──
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg.type === 'PRODUCE_CAPTCHA') {
        window.postMessage({ __miaosha_cmd: true, type: 'PRODUCE_CAPTCHA' }, '*');
        sendResponse({ ok: true });
      }
      if (msg.type === 'GET_TICKET_COUNT') {
        getTicketInfo().then((info) => sendResponse({ count: info.count }));
        return true;
      }
    });

    // Initial overlay sync
    setTimeout(async () => {
      try {
        const info = await getTicketInfo();
        postToOverlay({ type: 'TICKET_COUNT', count: info.count, tickets: info.tickets });
        const cfg = await getSaleConfig();
        const nst = getNextSaleTime(cfg);
        postToOverlay({ type: 'SALE_TIME_CONFIG', data: { config: cfg, nextSaleTime: nst } });
        await syncCaptchaConfig(true);
        try {
          const fireCfg = isExtensionContextValid() ? await fireStore.get() : { ...FIRE_CONFIG_DEFAULT };
          postToOverlay({ type: 'FIRE_CONFIG', data: fireCfg });
        } catch {
          postToOverlay({ type: 'FIRE_CONFIG', data: { ...FIRE_CONFIG_DEFAULT } });
        }
      } catch {}
    }, 2000);

    // R3: Start flash sale reminder loop
    initReminderLoop();
  },
});
