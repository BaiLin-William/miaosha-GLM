/**
 * Unit tests: sale time baseline + background alarm rescheduling.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { rescheduleSaleAlarms } from '../../../entrypoints/background';
import {
  SALE_TIME_DEFAULT,
  createSaleAlarmStatusSnapshot,
  getNextSaleTime,
  saleTimeStore,
  type SaleTimeConfig,
} from '../../../lib/settings/sale-time';

const DEFAULT_CONFIG: SaleTimeConfig = SALE_TIME_DEFAULT;

function shanghaiParts(epochMs: number): Record<string, number> {
  const parts: Record<string, number> = {};
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    fractionalSecondDigits: 3,
    hour12: false,
  }).formatToParts(new Date(epochMs))
    .forEach((x) => { if (x.type !== 'literal') parts[x.type] = Number(x.value); });
  return parts;
}

function atUtc(iso: string): number {
  return new Date(iso).getTime();
}

afterEach(() => {
  vi.useRealTimers();
});

describe('getNextSaleTime', () => {
  it('returns a future timestamp', () => {
    const now = Date.now();
    const sale = getNextSaleTime(DEFAULT_CONFIG, now);
    expect(sale).toBeGreaterThan(now);
  });

  it('result is within the next 24h', () => {
    const now = Date.now();
    const sale = getNextSaleTime(DEFAULT_CONFIG, now);
    expect(sale - now).toBeLessThanOrEqual(86_400_000);
  });

  it('the sale epoch has the correct 09:54:59.999 wall-clock time in UTC+8', () => {
    const now = atUtc('2026-05-31T00:00:00.000Z');
    const sale = getNextSaleTime(DEFAULT_CONFIG, now);
    const parts = shanghaiParts(sale);

    expect(parts.hour % 24).toBe(9);
    expect(parts.minute).toBe(54);
    expect(parts.second).toBe(59);
    expect(parts.fractionalSecond).toBe(999);
  });

  it('advances by exactly one day when now is past today\'s sale time', () => {
    const refSale = getNextSaleTime(DEFAULT_CONFIG, atUtc('2026-05-31T00:00:00.000Z'));
    const afterSale = refSale + 60_000;
    const nextSale = getNextSaleTime(DEFAULT_CONFIG, afterSale);
    expect(nextSale - refSale).toBeCloseTo(86_400_000, -3);
  });
});

describe('createSaleAlarmStatusSnapshot', () => {
  it('marks every alarm interval pending when all notification times are still future', () => {
    const now = atUtc('2026-05-31T00:30:00.000Z'); // 08:30 UTC+8, before T-60
    const status = createSaleAlarmStatusSnapshot(DEFAULT_CONFIG, now, 'unit-test');

    expect(status.items.map((item) => item.name)).toEqual(['flash-60', 'flash-30', 'flash-15', 'flash-5']);
    expect(status.pendingCount).toBe(4);
    expect(status.expiredCount).toBe(0);
    expect(status.items.every((item) => item.status === 'pending')).toBe(true);
  });

  it('marks elapsed notification points expired while keeping later intervals pending', () => {
    const now = atUtc('2026-05-31T01:32:00.000Z'); // 09:32 UTC+8, after T-60/T-30, before T-15
    const status = createSaleAlarmStatusSnapshot(DEFAULT_CONFIG, now, 'unit-test');

    expect(status.items.find((item) => item.name === 'flash-60')?.status).toBe('expired');
    expect(status.items.find((item) => item.name === 'flash-30')?.status).toBe('expired');
    expect(status.items.find((item) => item.name === 'flash-15')?.status).toBe('pending');
    expect(status.items.find((item) => item.name === 'flash-5')?.status).toBe('pending');
    expect(status.pendingCount).toBe(2);
    expect(status.expiredCount).toBe(2);
  });
});

describe('rescheduleSaleAlarms', () => {
  it('clears stale flash alarms, schedules only pending intervals, and persists the status snapshot', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    // 09:47 UTC+8: T-60/T-30/T-15 have passed, but T-5 (09:49:59) is still future
    vi.setSystemTime(atUtc('2026-05-31T01:47:00.000Z'));

    chrome.alarms.create('flash-60', { when: atUtc('2026-05-30T00:00:00.000Z') });
    chrome.alarms.create('flash-30', { when: atUtc('2026-05-30T00:00:00.000Z') });
    await saleTimeStore.set(DEFAULT_CONFIG);

    const status = await rescheduleSaleAlarms('unit-test');
    const alarms = await fakeBrowser.alarms.getAll();

    expect(alarms.map((alarm) => alarm.name).sort()).toEqual(['flash-5']);
    expect(alarms.find((alarm) => alarm.name === 'flash-5')?.scheduledTime).toBe(
      status.items.find((item) => item.name === 'flash-5')?.notificationTime,
    );
    expect(status.items.find((item) => item.name === 'flash-60')?.status).toBe('expired');
    expect(status.items.find((item) => item.name === 'flash-30')?.status).toBe('expired');
    expect(status.items.find((item) => item.name === 'flash-15')?.status).toBe('expired');
    expect(status.items.find((item) => item.name === 'flash-5')?.status).toBe('pending');
    await expect(saleTimeStore.getAlarmStatus()).resolves.toEqual(status);
  });
});
