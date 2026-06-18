// Background Service Worker — handles R4 Badge + R1 Alarms
// IMPORTANT: chrome.alarms.onAlarm listener MUST be registered at top level (not async)

import { storage } from '#imports';
import {
  SALE_ALARM_MINUTES,
  createSaleAlarmStatusSnapshot,
  getNextSaleTime,
  saleTimeStore,
} from '../lib/settings/sale-time';

const BATCH_PREVIEW_KEY = 'local:batchPreview';
const AUTH_HEADERS_KEY = 'local:authHeaders';

interface AuthHeaders {
  authorization: string;
  bigmodelOrganization: string;
  bigmodelProject: string;
}

const BADGE_STYLES: Record<number, { text: string; color: string; desc: string }> = {
  60: { text: '60', color: '#0ea5e9', desc: '距秒杀 60 分钟' },
  30: { text: '30', color: '#6366f1', desc: '距秒杀 30 分钟' },
  15: { text: '15', color: '#f59e0b', desc: '距秒杀 15 分钟' },
  10: { text: '10', color: '#f97316', desc: '距秒杀 10 分钟' },
   5: { text: '5!', color: '#dc2626', desc: '距秒杀 5 分钟：立即录入验证码！' },
};

async function showFlashNotification(min: number) {
  const message = min >= 60
    ? `距秒杀开始还有 ${Math.floor(min / 60)} 小时${min % 60 ? min % 60 + ' 分钟' : ''}，数据已刷新`
    : min <= 5
      ? '距秒杀开始还有 5 分钟！请尽快录入验证码，越多越好。'
      : `距秒杀开始还有 ${min} 分钟！`;
  const title = min <= 5 ? '🔥 智谱秒杀提醒 · 验证码冲刺' : '🔥 智谱秒杀提醒';

  try {
    await chrome.notifications.create(`flash-${min}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title,
      message,
      priority: 2,
      buttons: [
        { title: '立即准备' },
        { title: '稍后提醒' },
      ],
    });
  } catch {
    // Fallback to a smaller icon + no buttons if the platform rejects image/button payload.
    await chrome.notifications.create(`flash-${min}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon16.png'),
      title,
      message,
      priority: 2,
    }).catch(() => undefined);
  }
}

async function fetchAndCacheBatchPreview(): Promise<boolean> {
  try {
    const auth = await storage.getItem<AuthHeaders>(AUTH_HEADERS_KEY);
    if (!auth?.authorization || !auth?.bigmodelOrganization || !auth?.bigmodelProject) {
      return false;
    }

    const res = await fetch('https://bigmodel.cn/api/biz/pay/batch-preview', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        authorization: auth.authorization,
        'bigmodel-organization': auth.bigmodelOrganization,
        'bigmodel-project': auth.bigmodelProject,
      },
      body: '{"invitationCode":""}',
    });
    const data = await res.json();
    if (data.code === 200 && data.data?.productList) {
      await storage.setItem(BATCH_PREVIEW_KEY, data);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export interface BadgeAlarmPlan {
  name: string;
  when: number;
  min?: number;
}

/**
 * Compute badge alarm times.
 * Each countdown badge (60/30/15/10/5) is shown for exactly one minute,
 * then hidden. The fire badge appears at sale time and stays.
 */
export function computeBadgeAlarmPlan(saleTime: number, now: number): { show: BadgeAlarmPlan[]; hide: BadgeAlarmPlan[] } {
  const show: BadgeAlarmPlan[] = [];
  const hide: BadgeAlarmPlan[] = [];

  for (const min of SALE_ALARM_MINUTES) {
    const showTime = saleTime - min * 60_000;
    const hideTime = showTime + 60_000;
    if (showTime > now) {
      show.push({ name: `badge-show-${min}`, when: showTime, min });
    }
    if (hideTime > now) {
      hide.push({ name: `badge-hide-${min}`, when: hideTime });
    }
  }

  if (saleTime > now) {
    show.push({ name: 'badge-fire', when: saleTime });
  }

  return { show, hide };
}

/**
 * If `now` falls inside a one-minute badge window, return that phase.
 * Otherwise the badge should be blank.
 */
export function getCurrentBadgePhase(saleTime: number, now: number): number | null {
  for (const min of SALE_ALARM_MINUTES) {
    const showTime = saleTime - min * 60_000;
    const hideTime = showTime + 60_000;
    if (now >= showTime && now < hideTime) {
      return min;
    }
  }
  return null;
}

export async function rescheduleSaleAlarms(reason = 'runtime') {
  const config = await saleTimeStore.get();
  const snapshot = createSaleAlarmStatusSnapshot(config, Date.now(), reason);

  await Promise.all(
    SALE_ALARM_MINUTES.map((minutesBefore) => chrome.alarms.clear(`flash-${minutesBefore}`)),
  );

  snapshot.items.forEach((item) => {
    if (item.status === 'pending') {
      chrome.alarms.create(item.name, { when: item.notificationTime });
    }
  });

  await saleTimeStore.setAlarmStatus(snapshot);
  return snapshot;
}

export default defineBackground(() => {
  function clearBadgeAlerts() {
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: '' });
  }

  function applyBadgeForMin(min: number) {
    const style = BADGE_STYLES[min];
    if (!style) return;
    chrome.action.setBadgeText({ text: style.text });
    chrome.action.setBadgeBackgroundColor({ color: style.color });
    chrome.action.setTitle({ title: style.desc });
  }

  // R1 / R4: chrome.alarms — TOP LEVEL registration (not inside async function!)
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    const { name } = alarm;

    if (name.startsWith('flash-')) {
      const min = parseInt(name.split('-')[1], 10);
      if (isNaN(min)) return;

      // Every alarm point: refresh batch preview data
      await fetchAndCacheBatchPreview();

      // Show notification at every alarm point.
      await showFlashNotification(min);
      return;
    }

    if (name.startsWith('badge-')) {
      const parts = name.split('-');
      const kind = parts[1];

      if (kind === 'show' && parts[2]) {
        const min = parseInt(parts[2], 10);
        if (!isNaN(min)) applyBadgeForMin(min);
      } else if (kind === 'hide') {
        clearBadgeAlerts();
      } else if (kind === 'fire') {
        chrome.action.setBadgeText({ text: '🔥' });
        chrome.action.setBadgeBackgroundColor({ color: '#dc2626' });
        chrome.action.setTitle({ title: '秒杀进行中！' });
      }
      return;
    }
  });

  // R4: Badge update — each countdown badge is shown for exactly one minute.
  async function scheduleBadgeAlerts() {
    clearBadgeAlerts();
    const config = await saleTimeStore.get();
    const saleTime = getNextSaleTime(config);
    const now = Date.now();

    // Clear stale badge alarms and re-schedule.
    await Promise.all([
      ...SALE_ALARM_MINUTES.map((min) => chrome.alarms.clear(`badge-show-${min}`)),
      ...SALE_ALARM_MINUTES.map((min) => chrome.alarms.clear(`badge-hide-${min}`)),
      chrome.alarms.clear('badge-fire'),
    ]);

    const { show, hide } = computeBadgeAlarmPlan(saleTime, now);
    for (const alarm of [...show, ...hide]) {
      chrome.alarms.create(alarm.name, { when: alarm.when });
    }

    // If we wake up inside a one-minute badge window, show it now.
    const currentPhase = getCurrentBadgePhase(saleTime, now);
    if (currentPhase) {
      applyBadgeForMin(currentPhase);
    }
  }

  // On extension install: schedule both
  chrome.runtime.onInstalled.addListener(() => {
    rescheduleSaleAlarms('installed');
    scheduleBadgeAlerts();
    fetchAndCacheBatchPreview();
  });

  // On Chrome startup: re-schedule (alarms don't persist across restart)
  chrome.runtime.onStartup.addListener(() => {
    rescheduleSaleAlarms('startup');
    scheduleBadgeAlerts();
    fetchAndCacheBatchPreview();
  });

  // Listen for sale time config updates from Options page
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'SALE_TIME_UPDATED') {
      saleTimeStore.set(msg.config)
        .then(() => rescheduleSaleAlarms('manual-confirm'))
        .then((alarmStatus) => {
          scheduleBadgeAlerts();
          fetchAndCacheBatchPreview();
          sendResponse({ ok: true, alarmStatus });
        });
      return true;
    }
    if (msg.type === 'OPEN_OPTIONS_PAGE') {
      chrome.runtime.openOptionsPage();
      sendResponse({ ok: true });
      return true;
    }
  });

  // R1: Handle notification button clicks
  chrome.notifications.onButtonClicked.addListener((notifId, btnIdx) => {
    if (!notifId.startsWith('flash-')) return;
    if (btnIdx === 0) {
      chrome.action.openPopup().catch(() => {
        chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
      });
    }
    chrome.notifications.clear(notifId);
  });

  chrome.notifications.onClicked.addListener((notifId) => {
    if (!notifId.startsWith('flash-')) return;
    chrome.action.openPopup().catch(() => {
      chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
    });
    chrome.notifications.clear(notifId);
  });
});