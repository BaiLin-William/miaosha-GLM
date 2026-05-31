/**
 * Unit tests: src/bm-main/01-utils.js
 *
 * Pure formatting/inference functions — no DOM, no browser APIs.
 * Loaded via the vm harness and tested directly.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { loadBmMainModules, type BmMainScope } from './_harness';

let S: BmMainScope;

beforeAll(() => {
  S = loadBmMainModules(['01-utils']);
});

// ── getBillingLabel ────────────────────────────────────────────────────────

describe('getBillingLabel', () => {
  const fn = () => S.getBillingLabel as (b: string) => string;

  it('maps yearly to 年付', () => expect(fn()('yearly')).toBe('年付'));
  it('maps quarterly to 季付', () => expect(fn()('quarterly')).toBe('季付'));
  it('defaults to 月付', () => expect(fn()('monthly')).toBe('月付'));
  it('unknown keys fall back to 月付', () => expect(fn()('unknown')).toBe('月付'));
});

// ── formatAmount ──────────────────────────────────────────────────────────

describe('formatAmount', () => {
  const fn = () => S.formatAmount as (v: unknown) => string;

  it('strips trailing .00', () => expect(fn()(100)).toBe('100'));
  it('strips trailing trailing zero from single decimal', () => expect(fn()(9.1)).toBe('9.1'));
  it('keeps two meaningful decimals', () => expect(fn()(9.99)).toBe('9.99'));
  it('returns empty string for Infinity', () => expect(fn()(Infinity)).toBe(''));
  it('returns empty string for NaN', () => expect(fn()('not-a-number')).toBe(''));
  it('handles string numbers', () => expect(fn()('199.00')).toBe('199'));
});

// ── inferBillingFromPreview ───────────────────────────────────────────────

describe('inferBillingFromPreview', () => {
  const fn = () => S.inferBillingFromPreview as (item: unknown) => string;

  it('returns monthly for null', () => expect(fn()(null)).toBe('monthly'));

  it('infers yearly when total/monthly ratio > 6', () => {
    expect(fn()({ monthlyPayAmount: '99', payAmount: '1188' })).toBe('yearly');
  });

  it('infers quarterly when ratio is ~3', () => {
    expect(fn()({ monthlyPayAmount: '99', payAmount: '297' })).toBe('quarterly');
  });

  it('infers monthly when ratio ≈ 1', () => {
    expect(fn()({ monthlyPayAmount: '99', payAmount: '99' })).toBe('monthly');
  });

  it('falls back to campaign name "年" for yearly', () => {
    expect(fn()({
      monthlyPayAmount: '0',
      payAmount: '0',
      campaignDiscountDetails: [{ campaignName: '年付优惠' }],
    })).toBe('yearly');
  });
});

// ── getPromoTag ───────────────────────────────────────────────────────────

describe('getPromoTag', () => {
  const fn = () => S.getPromoTag as (item: unknown) => string;

  it('returns empty string when no discounts', () => {
    expect(fn()({ campaignDiscountDetails: [] })).toBe('');
  });

  it('returns rewardDetail from first discount', () => {
    expect(fn()({
      campaignDiscountDetails: [{ rewardDetail: '立省 ¥200', campaignName: 'other' }],
    })).toBe('立省 ¥200');
  });

  it('falls back to campaignName when rewardDetail is absent', () => {
    expect(fn()({
      campaignDiscountDetails: [{ campaignName: '活动优惠' }],
    })).toBe('活动优惠');
  });
});
