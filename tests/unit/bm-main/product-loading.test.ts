/**
 * Regression tests: src/bm-main product loading orchestration
 *
 * These tests protect against the recurring bug where the Target Products
 * card stays in "No products loaded" / "Product not loaded" even though
 * auth is ready and the network works.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadBmMainModules, type BmMainScope } from './_harness';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const FIXTURE_PRODUCT_LIST = [
  { productId: 'y-pro', monthlyPayAmount: '119', payAmount: '1428', renewAmount: '1428', soldOut: false, campaignDiscountDetails: [] },
  { productId: 'q-pro', monthlyPayAmount: '139', payAmount: '417', renewAmount: '417', soldOut: false, campaignDiscountDetails: [] },
  { productId: 'm-pro', monthlyPayAmount: '159', payAmount: '159', renewAmount: '159', soldOut: false, campaignDiscountDetails: [] },
];

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function makeAuthSandbox(S: BmMainScope) {
  S.document.cookie = 'bigmodel_token_production=eyJhbGci.test.token';
  (S.localStorage as any).getItem = (key: string) => {
    if (key === 'Bigmodel-Organization') return 'org-test';
    if (key === 'Bigmodel-Project') return 'proj-test';
    return null;
  };
}

describe('loadProducts', () => {
  let S: BmMainScope;

  beforeEach(() => {
    S = loadBmMainModules(['01-utils', '02-state', '05-product']);
    makeAuthSandbox(S);
    // Give the sandbox real timers so retry/fallback timeouts can be tested.
    S.setTimeout = globalThis.setTimeout;
    S.clearTimeout = globalThis.clearTimeout;
  });

  it('updates product matrix and status on successful batch-preview fetch', async () => {
    S.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ code: 200, data: { productList: FIXTURE_PRODUCT_LIST } }),
    });

    (S.loadProducts as () => void)();
    await flushPromises();

    expect((S._productLoadStatus as any).status).toBe('loaded');
    expect((S._productLoadStatus as any).error).toBe('');
    expect(((S._productMatrix as any).yearly || []).length).toBe(1);
    expect(((S._productMatrix as any).quarterly || []).length).toBe(1);
    expect(((S._productMatrix as any).monthly || []).length).toBe(1);
  });

  it('caches the response in sessionStorage on success', async () => {
    const setItem = vi.fn();
    (S.sessionStorage as any).setItem = setItem;
    S.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ code: 200, data: { productList: FIXTURE_PRODUCT_LIST } }),
    });

    (S.loadProducts as () => void)();
    await flushPromises();

    expect(setItem).toHaveBeenCalledWith(
      'bm_batch_preview',
      expect.stringContaining('y-pro'),
    );
  });

  it('retries direct fetch on failure and falls back to content-script refresh', async () => {
    const postMessage = vi.fn();
    S.window.postMessage = postMessage;
    S.fetch = vi.fn().mockRejectedValue(new Error('net down'));

    (S.loadProducts as () => void)();
    await flushPromises();
    // First attempt fails immediately; retry is scheduled 1 s later.
    expect(S.fetch).toHaveBeenCalledTimes(1);

    await new Promise((resolve) => setTimeout(resolve, 1100));
    await flushPromises();

    // Second attempt also fails, then fallback message is sent.
    expect(S.fetch).toHaveBeenCalledTimes(2);
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ __miaosha_cmd: true, type: 'REFRESH_BATCH_PREVIEW' }),
      '*',
    );
  });

  it('shows auth error when no auth headers are available', () => {
    S.document.cookie = '';
    (S.localStorage as any).getItem = () => null;

    (S.loadProducts as () => void)();

    expect((S._productLoadStatus as any).status).toBe('error');
    expect((S._productLoadStatus as any).error).toBe('auth-missing');
  });
});

describe('BATCH_PREVIEW_DATA handler gate removal', () => {
  it('does not short-circuit on hasLocalAuthSignals in 08-overlay.js', () => {
    const sourcePath = path.resolve(__dirname, '../../../src/bm-main/08-overlay.js');
    const source = fs.readFileSync(sourcePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      sourcePath,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS,
    );

    // Find the window.addEventListener('message', ...) function.
    let handler: ts.FunctionLikeDeclaration | null = null;
    function findHandler(node: ts.Node) {
      if (handler) return;
      if (
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node) ||
        ts.isFunctionDeclaration(node)
      ) {
        const text = node.getText(sourceFile);
        if (text.includes("'BATCH_PREVIEW_DATA'") && text.includes("'message'")) {
          handler = node;
          return;
        }
      }
      ts.forEachChild(node, findHandler);
    }
    findHandler(sourceFile);
    expect(handler).toBeTruthy();

    const text = handler!.getText(sourceFile);
    // The handler must call updateProductMatrix for BATCH_PREVIEW_DATA.
    expect(text).toContain('updateProductMatrix');
    // It must NOT reject the message based on local auth state. That gate was
    // the cause of intermittent "products not loaded" when the content script
    // already had valid auth.
    expect(text).not.toContain('hasLocalAuthSignals');
  });
});

describe('buildProductMatrix with real-world shapes', () => {
  let S: BmMainScope;

  beforeAll(() => {
    S = loadBmMainModules(['01-utils', '02-state', '05-product']);
  });

  it('handles numeric amounts (not just strings)', () => {
    const matrix = (S.buildProductMatrix as (list: unknown[]) => Record<string, unknown[]>)([
      { productId: 'y-pro', monthlyPayAmount: 119, payAmount: 1428, renewAmount: 1428, soldOut: false, campaignDiscountDetails: [] },
    ]);
    expect(matrix.yearly).toHaveLength(1);
  });

  it('classifies billing via campaignDiscountDetails fallback', () => {
    const matrix = (S.buildProductMatrix as (list: unknown[]) => Record<string, unknown[]>)([
      { productId: 'x-lite', monthlyPayAmount: 0, payAmount: 0, campaignDiscountDetails: [{ campaignName: '连续包年 8 折' }] },
    ]);
    expect(matrix.yearly).toHaveLength(1);
  });

  it('returns empty groups for an empty list without throwing', () => {
    const matrix = (S.buildProductMatrix as (list: unknown[]) => Record<string, unknown[]>)([]);
    expect(matrix.monthly).toHaveLength(0);
    expect(matrix.quarterly).toHaveLength(0);
    expect(matrix.yearly).toHaveLength(0);
  });
});
