import { storage } from '#imports';

export interface FireConfig {
  /** Auto-fire at sale time, or manual FIRE button only */
  mode: 'auto' | 'manual';
  /** Payment method passed to create-sign */
  payType: 'ALI' | 'WE_CHAT';
  /** Delay between sequential burst shots (ms) */
  burstIntervalMs: number;

  // --- advanced strike strategy ---
  /** Offset relative to target sale time for the first shot (ms). Negative = early. */
  firstShotOffsetMs: number;
  /** Jitter window added to the first shot (ms). Actual first shot = target + offset + random(0, window). */
  staggerWindowMs: number;
  /** Ticket allocation percentages per selected product, in priority order. Sum must be 100. */
  allocation: number[];
  /** Additional backoff when hitting Tencent verify-service overload (code=500) */
  backoff500Ms: number;
  /** Additional backoff when hitting Zhipu rate limit (code=555) */
  backoff555Ms: number;
  /** Upper cap for dynamic shot interval (ms) */
  maxBackoffMs: number;
  /** Consecutive soldout responses before a product is removed from rotation */
  soldoutStopThreshold: number;
  /** Master toggle for dynamic target switching and ticket reallocation */
  enableDynamicSwitch: boolean;
}

export const FIRE_CONFIG_DEFAULT: FireConfig = {
  mode: 'auto',
  payType: 'ALI',
  burstIntervalMs: 2100,

  firstShotOffsetMs: 0,
  staggerWindowMs: 0,
  allocation: [100],
  backoff500Ms: 1200,
  backoff555Ms: 200,
  maxBackoffMs: 4000,
  soldoutStopThreshold: 2,
  enableDynamicSwitch: true,
};

const STORAGE_KEY = 'local:fireConfig';

function clampNumber(value: number, min: number, max: number, fallback: number): number {
  const n = Math.round(value);
  if (!Number.isFinite(n) || n < min || n > max) return fallback;
  return n;
}

function clampInterval(value: number, fallback: number): number {
  return clampNumber(value, 50, 10000, fallback);
}

function clampAllocation(value: unknown): number[] {
  if (!Array.isArray(value) || value.length === 0) return [...FIRE_CONFIG_DEFAULT.allocation];
  const limited = value.slice(0, 3).map((v) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
  });
  const sum = limited.reduce((a, b) => a + b, 0);
  if (sum === 0) return [...FIRE_CONFIG_DEFAULT.allocation];
  if (sum === 100) return limited;
  // Normalize to 100 while preserving zero entries
  const normalized = limited.map((v) => Math.round((v / sum) * 100));
  const normSum = normalized.reduce((a, b) => a + b, 0);
  if (normSum !== 100 && normalized[0] != null) {
    normalized[0] += 100 - normSum;
  }
  return normalized;
}

export const fireStore = {
  async get(): Promise<FireConfig> {
    try {
      const stored = await storage.getItem<Partial<FireConfig>>(STORAGE_KEY);
      if (!stored) return { ...FIRE_CONFIG_DEFAULT };
      return {
        mode: stored.mode === 'manual' ? 'manual' : FIRE_CONFIG_DEFAULT.mode,
        payType: stored.payType === 'WE_CHAT' ? 'WE_CHAT' : FIRE_CONFIG_DEFAULT.payType,
        burstIntervalMs: clampInterval(stored.burstIntervalMs ?? FIRE_CONFIG_DEFAULT.burstIntervalMs, FIRE_CONFIG_DEFAULT.burstIntervalMs),

        firstShotOffsetMs: clampNumber(stored.firstShotOffsetMs ?? FIRE_CONFIG_DEFAULT.firstShotOffsetMs, -5000, 5000, FIRE_CONFIG_DEFAULT.firstShotOffsetMs),
        staggerWindowMs: clampNumber(stored.staggerWindowMs ?? FIRE_CONFIG_DEFAULT.staggerWindowMs, 0, 3000, FIRE_CONFIG_DEFAULT.staggerWindowMs),
        allocation: clampAllocation(stored.allocation ?? FIRE_CONFIG_DEFAULT.allocation),
        backoff500Ms: clampNumber(stored.backoff500Ms ?? FIRE_CONFIG_DEFAULT.backoff500Ms, 500, 5000, FIRE_CONFIG_DEFAULT.backoff500Ms),
        backoff555Ms: clampNumber(stored.backoff555Ms ?? FIRE_CONFIG_DEFAULT.backoff555Ms, 0, 2000, FIRE_CONFIG_DEFAULT.backoff555Ms),
        maxBackoffMs: clampNumber(stored.maxBackoffMs ?? FIRE_CONFIG_DEFAULT.maxBackoffMs, 2100, 8000, FIRE_CONFIG_DEFAULT.maxBackoffMs),
        soldoutStopThreshold: clampNumber(stored.soldoutStopThreshold ?? FIRE_CONFIG_DEFAULT.soldoutStopThreshold, 1, 5, FIRE_CONFIG_DEFAULT.soldoutStopThreshold),
        enableDynamicSwitch: typeof stored.enableDynamicSwitch === 'boolean' ? stored.enableDynamicSwitch : FIRE_CONFIG_DEFAULT.enableDynamicSwitch,
      };
    } catch {
      return { ...FIRE_CONFIG_DEFAULT };
    }
  },

  async set(config: FireConfig): Promise<void> {
    await storage.setItem(STORAGE_KEY, {
      mode: config.mode === 'manual' ? 'manual' : 'auto',
      payType: config.payType === 'WE_CHAT' ? 'WE_CHAT' : 'ALI',
      burstIntervalMs: clampInterval(config.burstIntervalMs, FIRE_CONFIG_DEFAULT.burstIntervalMs),

      firstShotOffsetMs: clampNumber(config.firstShotOffsetMs, -5000, 5000, FIRE_CONFIG_DEFAULT.firstShotOffsetMs),
      staggerWindowMs: clampNumber(config.staggerWindowMs, 0, 3000, FIRE_CONFIG_DEFAULT.staggerWindowMs),
      allocation: clampAllocation(config.allocation),
      backoff500Ms: clampNumber(config.backoff500Ms, 500, 5000, FIRE_CONFIG_DEFAULT.backoff500Ms),
      backoff555Ms: clampNumber(config.backoff555Ms, 0, 2000, FIRE_CONFIG_DEFAULT.backoff555Ms),
      maxBackoffMs: clampNumber(config.maxBackoffMs, 2100, 8000, FIRE_CONFIG_DEFAULT.maxBackoffMs),
      soldoutStopThreshold: clampNumber(config.soldoutStopThreshold, 1, 5, FIRE_CONFIG_DEFAULT.soldoutStopThreshold),
      enableDynamicSwitch: !!config.enableDynamicSwitch,
    });
  },
};
