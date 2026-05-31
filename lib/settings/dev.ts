/**
 * DEV Environment Entity
 *
 * Entity: DevEnvironment
 * Type: Scalar Preference
 * Scope: global
 * Persistence: long-term settings store (WXT storage)
 * Operations: R/U
 *
 * Resolution chain:
 *   global default (production) > stored value
 *
 * Consumers:
 *   - options page (UI surface)
 *   - background script (behavior gating)
 *   - popup (status display)
 */

import { storage } from '#imports';

export type DevMode = 'development' | 'production';

const DEV_MODE_KEY = 'local:devMode';
const DEFAULT_MODE: DevMode = 'production';

export const devEnvironment = {
  async get(): Promise<DevMode> {
    const value = await storage.getItem<DevMode>(DEV_MODE_KEY);
    return value ?? DEFAULT_MODE;
  },

  async set(mode: DevMode): Promise<void> {
    await storage.setItem<DevMode>(DEV_MODE_KEY, mode);
  },

  async isDevelopment(): Promise<boolean> {
    const mode = await this.get();
    return mode === 'development';
  },

  async isProduction(): Promise<boolean> {
    const mode = await this.get();
    return mode === 'production';
  },

  default(): DevMode {
    return DEFAULT_MODE;
  },
};
