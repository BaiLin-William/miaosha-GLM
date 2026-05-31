/**
 * Unit tests: src/bm-main/05-product.js — buildProductMatrix
 *
 * Requires 01-utils (inferBillingFromPreview, formatAmount, getPromoTag,
 * getRenewLabel) which 05-product calls internally.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { loadBmMainModules, type BmMainScope } from './_harness';

// Fixture: 9 products — 3 per billing cycle (monthly/quarterly/yearly),
// each representing Lite/Pro/Max tiers sorted by price.
const FIXTURE_PRODUCT_LIST = [
  // Yearly
  { productId: 'y-lite', monthlyPayAmount: '59',  payAmount: '708',  renewAmount: '708',  soldOut: false, campaignDiscountDetails: [] },
  { productId: 'y-pro',  monthlyPayAmount: '119', payAmount: '1428', renewAmount: '1428', soldOut: false, campaignDiscountDetails: [] },
  { productId: 'y-max',  monthlyPayAmount: '239', payAmount: '2868', renewAmount: '2868', soldOut: true,  campaignDiscountDetails: [] },
  // Quarterly
  { productId: 'q-lite', monthlyPayAmount: '69',  payAmount: '207',  renewAmount: '207',  soldOut: false, campaignDiscountDetails: [] },
  { productId: 'q-pro',  monthlyPayAmount: '139', payAmount: '417',  renewAmount: '417',  soldOut: false, campaignDiscountDetails: [] },
  { productId: 'q-max',  monthlyPayAmount: '279', payAmount: '837',  renewAmount: '837',  soldOut: false, campaignDiscountDetails: [] },
  // Monthly
  { productId: 'm-lite', monthlyPayAmount: '79',  payAmount: '79',   renewAmount: '79',   soldOut: false, campaignDiscountDetails: [] },
  { productId: 'm-pro',  monthlyPayAmount: '159', payAmount: '159',  renewAmount: '159',  soldOut: false, campaignDiscountDetails: [] },
  { productId: 'm-max',  monthlyPayAmount: '319', payAmount: '319',  renewAmount: '319',  soldOut: false, campaignDiscountDetails: [] },
];

let S: BmMainScope;

beforeAll(() => {
  // 02-state defines _planOrder, _productMatrix, _billing, _selectedProducts
  // which buildProductMatrix relies on. 01-utils provides inferBillingFromPreview.
  S = loadBmMainModules(['01-utils', '02-state', '05-product']);
});

describe('buildProductMatrix', () => {
  const buildMatrix = () =>
    (S.buildProductMatrix as (list: unknown[]) => unknown)(FIXTURE_PRODUCT_LIST);

  it('returns an object with monthly/quarterly/yearly keys', () => {
    const matrix = buildMatrix() as Record<string, unknown[]>;
    expect(matrix).toHaveProperty('monthly');
    expect(matrix).toHaveProperty('quarterly');
    expect(matrix).toHaveProperty('yearly');
  });

  it('puts exactly 3 products in each billing group', () => {
    const matrix = buildMatrix() as Record<string, unknown[]>;
    expect(matrix.monthly).toHaveLength(3);
    expect(matrix.quarterly).toHaveLength(3);
    expect(matrix.yearly).toHaveLength(3);
  });

  it('assigns Lite/Pro/Max plan keys in price-ascending order', () => {
    const matrix = buildMatrix() as Record<string, Array<{ planKey: string }>>;
    expect(matrix.monthly[0].planKey).toBe('Lite');
    expect(matrix.monthly[1].planKey).toBe('Pro');
    expect(matrix.monthly[2].planKey).toBe('Max');
  });

  it('preserves productId in each entry', () => {
    const matrix = buildMatrix() as Record<string, Array<{ id: string }>>;
    const monthlyIds = matrix.monthly.map((p) => p.id);
    expect(monthlyIds).toContain('m-lite');
  });

  it('marks soldOut correctly', () => {
    const matrix = buildMatrix() as Record<string, Array<{ soldOut: boolean }>>;
    const yearlyMax = matrix.yearly.find((_, i) => i === 2);
    expect(yearlyMax?.soldOut).toBe(true);
  });

  it('handles empty productList gracefully', () => {
    const matrix = (S.buildProductMatrix as (list: unknown[]) => Record<string, unknown[]>)([]);
    expect(matrix.monthly).toHaveLength(0);
    expect(matrix.quarterly).toHaveLength(0);
    expect(matrix.yearly).toHaveLength(0);
  });
});
