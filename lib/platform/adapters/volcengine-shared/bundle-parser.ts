import type { VolcengineConfigBody, VolcengineConfigItem } from './types';

function findObjectStart(src: string, pos: number): number {
  let depth = 0;
  let inString = false;
  let esc = false;
  for (let i = pos - 1; i >= 0; i--) {
    const c = src[i];
    if (inString) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"' || c === "'") inString = false;
      continue;
    }
    if (c === '"' || c === "'") { inString = true; continue; }
    if (c === '}' || c === ']' || c === ')') depth++;
    else if (c === '{' || c === '[' || c === '(') {
      if (c === '{') {
        if (depth === 0) return i;
        depth--;
      } else {
        depth--;
      }
    }
  }
  return -1;
}

function findMatchingBrace(src: string, start: number): number {
  let depth = 0;
  let inString = false;
  let esc = false;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (inString) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"' || c === "'") inString = false;
      continue;
    }
    if (c === '"' || c === "'") { inString = true; continue; }
    if (c === '{' || c === '[' || c === '(') depth++;
    else if (c === '}' || c === ']' || c === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function extractBalancedArray(src: string, pos: number): string | null {
  const bracket = src.indexOf('[', pos);
  if (bracket < 0) return null;
  const end = findMatchingBrace(src, bracket);
  if (end < 0) return null;
  return src.slice(bracket, end + 1);
}

function extractQuoted(src: string, key: string): string | undefined {
  // Anchor to word boundary so "templateIndexKey" does not match "IndexKey".
  const re = new RegExp(`\\b${key}:"([^"]+)"`);
  const m = src.match(re);
  return m?.[1];
}

export interface ExtractBundleOptions {
  globalName: string;
  productCode: string;
  excludeIndexKey?: (indexKey: string) => boolean;
}

export function extractConfigsFromBundle(opts: ExtractBundleOptions): VolcengineConfigItem[] {
  const factory = (window as any)[opts.globalName];
  if (typeof factory !== 'function') return [];

  const src = factory.toString();
  const seen = new Map<string, VolcengineConfigItem>();
  let idx = -1;

  while ((idx = src.indexOf('commonBuyOpenApi:', idx + 1)) !== -1) {
    const start = findObjectStart(src, idx);
    if (start < 0) continue;
    const end = findMatchingBrace(src, start);
    if (end < 0) continue;
    const objSrc = src.slice(start, end + 1);

    const indexKey = extractQuoted(objSrc, 'IndexKey');
    const arraySrc = extractBalancedArray(src, idx);
    if (!indexKey || !arraySrc) continue;
    if (opts.excludeIndexKey?.(indexKey)) continue;

    try {
      const jsonLike = arraySrc.replace(/([{,])([a-zA-Z_][a-zA-Z0-9_]*):/g, '$1"$2":');
      const configList: VolcengineConfigBody[] = JSON.parse(jsonLike);
      for (const body of configList) {
        if (body.Product !== opts.productCode) continue;
        const key = `${body.ConfigurationCode}|${body.Duration || 1}`;
        const existing = seen.get(key);
        const isBetter = !existing || (
          (body.RenewType != null && body.PurchaseTimes != null) &&
          (existing.configBody.RenewType == null || existing.configBody.PurchaseTimes == null)
        );
        if (isBetter) {
          const candidates = existing?.indexKeyCandidates ? existing.indexKeyCandidates.slice() : [];
          if (indexKey && !candidates.includes(indexKey)) {
            candidates.push(indexKey);
          }
          seen.set(key, { indexKey, configBody: body, indexKeyCandidates: candidates });
        } else if (existing && indexKey && !existing.indexKeyCandidates?.includes(indexKey)) {
          existing.indexKeyCandidates = existing.indexKeyCandidates || [];
          existing.indexKeyCandidates.push(indexKey);
        }
      }
    } catch {
      // ignore malformed literal
    }
  }

  return Array.from(seen.values());
}
