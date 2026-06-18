/**
 * Unit tests: lib/settings/fire.ts
 */

import { describe, it, expect } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { FIRE_CONFIG_DEFAULT, fireStore } from '../../../../lib/settings/fire';

describe('FIRE_CONFIG_DEFAULT', () => {
  it('defaults to auto burst with Alipay and 2100ms interval', () => {
    expect(FIRE_CONFIG_DEFAULT.mode).toBe('auto');
    expect(FIRE_CONFIG_DEFAULT.payType).toBe('ALI');
    expect(FIRE_CONFIG_DEFAULT.burstIntervalMs).toBe(2100);
  });
});

describe('fireStore', () => {
  it('returns defaults when nothing is stored', async () => {
    const cfg = await fireStore.get();
    expect(cfg).toEqual(FIRE_CONFIG_DEFAULT);
  });

  it('persists a custom config', async () => {
    const custom = { mode: 'manual' as const, payType: 'WE_CHAT' as const, burstIntervalMs: 2300 };
    await fireStore.set(custom);
    const retrieved = await fireStore.get();
    expect(retrieved).toEqual(custom);
  });

  it('falls back unknown enum values to defaults', async () => {
    // Simulate legacy/corrupted storage values
    await fakeBrowser.storage.local.set({
      fireConfig: { mode: 'unknown', payType: 'unknown', burstIntervalMs: 400 },
    });

    const cfg = await fireStore.get();
    expect(cfg.mode).toBe('auto');
    expect(cfg.payType).toBe('ALI');
    expect(cfg.burstIntervalMs).toBe(400);
  });

  it('falls back to default interval when stored value is invalid', async () => {
    await fakeBrowser.storage.local.set({
      fireConfig: { mode: 'auto', payType: 'ALI', burstIntervalMs: 10 },
    });

    const cfg = await fireStore.get();
    expect(cfg.burstIntervalMs).toBe(2100);
  });
});
