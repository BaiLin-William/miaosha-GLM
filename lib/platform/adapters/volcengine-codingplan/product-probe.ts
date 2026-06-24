import type { BillingPeriod, IProductProbe, PlatformAuth, Product, ProductCatalog } from '../../types';
import { extractConfigsFromBundle } from '../volcengine-shared/bundle-parser';
import type { VolcengineConfigBody, VolcengineConfigItem } from '../volcengine-shared/types';

const PLATFORM = 'volcengine-codingplan';
const GLOBAL_NAME = '__activity__codingplan__';
const PRODUCT_CODE = 'ark_bd';

const DISPLAY_NAMES: Record<string, string> = {
  'Coding_Plan_Lite_monthly': 'Lite',
  'Coding_Plan_Pro_monthly': 'Pro',
};

const indexKeyByConfig = new Map<string, string>();
const configBodyByProductId = new Map<string, VolcengineConfigItem>();
let seededCatalog: ProductCatalog | null = null;

function productIdFor(configCode: string, duration: number): string {
  return `${configCode}|duration:${duration}`;
}

function durationToBillingPeriod(duration: number, unit: string): BillingPeriod {
  if (unit === 'monthly') {
    if (duration === 1) return 'monthly';
    if (duration === 3) return 'quarterly';
    if (duration === 12) return 'yearly';
  }
  if (duration >= 12) return 'yearly';
  if (duration >= 3) return 'quarterly';
  return 'monthly';
}

function billingLabel(duration: number): string {
  if (duration === 1) return '连续包月';
  if (duration === 3) return '连续包季';
  if (duration === 12) return '连续包年';
  return `${duration}个月`;
}

function buildCatalog(items: VolcengineConfigItem[]): ProductCatalog {
  const groups: ProductCatalog['groups'] = {
    monthly: [],
    quarterly: [],
    yearly: [],
  };

  for (const item of items) {
    const body = item.configBody;
    const configCode = body.ConfigurationCode;
    const duration = body.Duration || 1;
    const billing = durationToBillingPeriod(duration, body.DurationUnit);
    const id = productIdFor(configCode, duration);

    indexKeyByConfig.set(`${configCode}|${duration}`, item.indexKey);
    configBodyByProductId.set(id, item);

    const product: Product = {
      id,
      name: DISPLAY_NAMES[configCode] || configCode,
      billingPeriod: billing,
      price: 0,
      currentAmount: 0,
      renewAmount: 0,
      originalPrice: 0,
      soldOut: false,
      description: `${duration}个月 · ${billingLabel(duration)}`,
      raw: item,
    };

    groups[billing].push(product);
  }

  for (const billing of Object.keys(groups) as BillingPeriod[]) {
    groups[billing].sort((a, b) => a.currentAmount - b.currentAmount);
  }

  return {
    platform: PLATFORM,
    updatedAt: Date.now(),
    groups,
  };
}

export function getVolcengineCodingplanIndexKey(configCode: string, duration: number): string | undefined {
  return indexKeyByConfig.get(`${configCode}|${duration}`);
}

export function getVolcengineCodingplanConfigItem(productId: string): VolcengineConfigItem | undefined {
  return configBodyByProductId.get(productId);
}

/** Seed the in-memory lookup maps from a catalog produced by the MAIN world overlay. */
export function seedVolcengineCodingplanCatalog(catalog: ProductCatalog): void {
  seededCatalog = catalog;
  try {
    for (const group of Object.values(catalog.groups)) {
      for (const product of group) {
        const raw = (product as any).raw as VolcengineConfigItem | undefined;
        if (!raw?.indexKey || !raw?.configBody) continue;
        const body = raw.configBody;
        const id = productIdFor(body.ConfigurationCode, body.Duration || 1);
        indexKeyByConfig.set(`${body.ConfigurationCode}|${body.Duration || 1}`, raw.indexKey);
        configBodyByProductId.set(id, raw);
      }
    }
  } catch (e) {
    console.warn('[volcengine-codingplan] seed catalog failed', e);
  }
}

export class VolcengineCodingplanProductProbe implements IProductProbe {
  readonly platform = PLATFORM;

  extractFromPage(): ProductCatalog | null {
    try {
      const items = extractConfigsFromBundle({ globalName: GLOBAL_NAME, productCode: PRODUCT_CODE });
      if (items.length === 0) return null;
      return buildCatalog(items);
    } catch {
      return null;
    }
  }

  async fetch(_auth: PlatformAuth): Promise<ProductCatalog> {
    if (seededCatalog) return seededCatalog;
    const catalog = this.extractFromPage();
    if (catalog) return catalog;
    throw new Error(`${PLATFORM}: product catalog not seeded`);
  }
}
