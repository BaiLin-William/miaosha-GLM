#!/usr/bin/env node
/*
 * Regression gate: Target Products must stay available after each build.
 *
 * This script validates three invariants:
 * 1) src/bm-main/05-product.js can build a 3x3 matrix (monthly/quarterly/yearly)
 *    from a known-good batch-preview payload shape.
 * 2) entrypoints/bm-capture.content.ts contains authenticated batch-preview refresh
 *    handling for REQUEST_BATCH_PREVIEW / REFRESH_BATCH_PREVIEW.
 * 3) Generated artifacts still contain the product bootstrap hooks.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function fail(msg) {
  console.error('[target-products-regression] FAIL:', msg);
  process.exit(1);
}

function pass(msg) {
  console.log('[target-products-regression] OK  :', msg);
}

function mustContain(text, needle, fileLabel) {
  if (!text.includes(needle)) {
    fail(`${fileLabel} is missing required marker: ${needle}`);
  }
}

function runMatrixContractTest() {
  const utilsPath = path.join(ROOT, 'src', 'bm-main', '01-utils.js');
  const productPath = path.join(ROOT, 'src', 'bm-main', '05-product.js');
  const utilsCode = fs.readFileSync(utilsPath, 'utf8');
  const productCode = fs.readFileSync(productPath, 'utf8');

  const context = {
    _planOrder: ['Lite', 'Pro', 'Max'],
    _billing: 'quarterly',
    _productMatrix: { monthly: [], quarterly: [], yearly: [] },
    _selectedProducts: {},
    _ticketCount: 0,
    SELECTION_VERSION_KEY: 'bm_selected_products_v2',
    postMsg: () => {},
    cmdToOverlay: () => {},
    postToOverlay: () => {},
    document: {
      getElementById: () => null,
      querySelectorAll: () => [],
    },
    sessionStorage: {
      getItem: () => null,
      setItem: () => {},
    },
  };

  vm.createContext(context);
  vm.runInContext(utilsCode, context, { filename: utilsPath });
  vm.runInContext(productCode, context, { filename: productPath });

  if (typeof context.buildProductMatrix !== 'function') {
    fail('buildProductMatrix is not available after evaluating src modules');
  }

  const fixture = [
    { productId: 'product-02434c', monthlyPayAmount: 49, monthlyOriginalAmount: 49, payAmount: 49, renewAmount: 49, soldOut: false, canPurchase: true, forbidden: false, campaignDiscountDetails: [] },
    { productId: 'product-1df3e1', monthlyPayAmount: 149, monthlyOriginalAmount: 149, payAmount: 149, renewAmount: 149, soldOut: false, canPurchase: true, forbidden: false, campaignDiscountDetails: [] },
    { productId: 'product-2fc421', monthlyPayAmount: 469, monthlyOriginalAmount: 469, payAmount: 469, renewAmount: 469, soldOut: false, canPurchase: true, forbidden: false, campaignDiscountDetails: [] },

    { productId: 'product-b8ea38', monthlyPayAmount: 44.1, monthlyOriginalAmount: 49, payAmount: 132.3, renewAmount: 147, soldOut: false, canPurchase: true, forbidden: false, campaignDiscountDetails: [{ campaignName: '连续包季 9 折', rewardDetail: '连续包季 9 折' }] },
    { productId: 'product-fef82f', monthlyPayAmount: 134.1, monthlyOriginalAmount: 149, payAmount: 402.3, renewAmount: 447, soldOut: false, canPurchase: true, forbidden: false, campaignDiscountDetails: [{ campaignName: '连续包季 9 折', rewardDetail: '连续包季 9 折' }] },
    { productId: 'product-5d3a03', monthlyPayAmount: 422.1, monthlyOriginalAmount: 469, payAmount: 1266.3, renewAmount: 1407, soldOut: false, canPurchase: true, forbidden: false, campaignDiscountDetails: [{ campaignName: '连续包季 9 折', rewardDetail: '连续包季 9 折' }] },

    { productId: 'product-70a804', monthlyPayAmount: 39.2, monthlyOriginalAmount: 49, payAmount: 470.4, renewAmount: 588, soldOut: false, canPurchase: true, forbidden: false, campaignDiscountDetails: [{ campaignName: '连续包年 8 折', rewardDetail: '连续包年 8 折' }] },
    { productId: 'product-5643e6', monthlyPayAmount: 119.2, monthlyOriginalAmount: 149, payAmount: 1430.4, renewAmount: 1788, soldOut: false, canPurchase: true, forbidden: false, campaignDiscountDetails: [{ campaignName: '连续包年 8 折', rewardDetail: '连续包年 8 折' }] },
    { productId: 'product-d46f8b', monthlyPayAmount: 375.2, monthlyOriginalAmount: 469, payAmount: 4502.4, renewAmount: 5628, soldOut: false, canPurchase: true, forbidden: false, campaignDiscountDetails: [{ campaignName: '连续包年 8 折', rewardDetail: '连续包年 8 折' }] },
  ];

  const matrix = context.buildProductMatrix(fixture);
  const counts = {
    monthly: (matrix.monthly || []).length,
    quarterly: (matrix.quarterly || []).length,
    yearly: (matrix.yearly || []).length,
  };

  if (counts.monthly !== 3 || counts.quarterly !== 3 || counts.yearly !== 3) {
    fail(`matrix tier counts invalid: monthly=${counts.monthly}, quarterly=${counts.quarterly}, yearly=${counts.yearly}`);
  }

  pass('buildProductMatrix keeps 3x3 tier contract');
}

async function runAuthRecoveryContractTest() {
  const productPath = path.join(ROOT, 'src', 'bm-main', '05-product.js');
  const productCode = fs.readFileSync(productPath, 'utf8');

  const issuedCommands = [];
  let authErrorRendered = 0;
  const authBanner = { style: { display: 'block' } };

  const context = {
    _billing: 'quarterly',
    _productMatrix: { monthly: [], quarterly: [], yearly: [] },
    _selectedProducts: {},
    _ticketCount: 0,
    _planOrder: ['Lite', 'Pro', 'Max'],
    _authFailed: false,
    _rt: { latencyMs: 0, clockOffsetMs: 0 },
    SELECTION_VERSION_KEY: 'bm_selected_products_v2',
    updateRuntimeDisplay: () => {},
    postMsg: () => {},
    cmdToOverlay: (type) => issuedCommands.push(type),
    postToOverlay: () => {},
    document: {
      cookie: 'bigmodel_token_production=fake-token',
      getElementById: (id) => {
        if (id === '_authBanner') return authBanner;
        if (id === '_prodList') return { innerHTML: '' };
        if (id === '_prodTag') return { textContent: '', className: '' };
        return null;
      },
    },
    localStorage: {
      getItem: (key) => {
        if (key === 'Bigmodel-Organization') return 'org-id';
        if (key === 'Bigmodel-Project') return 'proj-id';
        return null;
      },
    },
    sessionStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    },
    fetch: () => Promise.resolve({
      headers: { get: () => null },
      json: () => Promise.resolve({ code: 1001, msg: 'missing auth headers' }),
    }),
  };

  vm.createContext(context);
  vm.runInContext(productCode, context, { filename: productPath });

  const originalRenderProductsAuthError = context.renderProductsAuthError;
  context.renderProductsAuthError = function() {
    authErrorRendered += 1;
    if (typeof originalRenderProductsAuthError === 'function') {
      return originalRenderProductsAuthError.apply(this, arguments);
    }
  };

  context.fetchBatchPreview();
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  if (!issuedCommands.includes('REFRESH_BATCH_PREVIEW')) {
    fail('auth-ready 1001 path did not request authenticated batch-preview refresh');
  }
  if (authErrorRendered !== 0) {
    fail('auth-ready 1001 path rendered login prompt instead of recovering via authenticated refresh');
  }
  if (context._authFailed) {
    fail('auth-ready 1001 path left _authFailed enabled after recovery');
  }

  pass('auth-ready 1001 path recovers via authenticated refresh without overwriting UI');
}

function runBridgeContractTest() {
  const capturePath = path.join(ROOT, 'entrypoints', 'bm-capture.content.ts');
  const captureCode = fs.readFileSync(capturePath, 'utf8');

  mustContain(captureCode, "REQUEST_BATCH_PREVIEW", 'bm-capture.content.ts');
  mustContain(captureCode, "REFRESH_BATCH_PREVIEW", 'bm-capture.content.ts');
  mustContain(captureCode, "fetch('https://bigmodel.cn/api/biz/pay/batch-preview'", 'bm-capture.content.ts');
  mustContain(captureCode, "'bigmodel-organization'", 'bm-capture.content.ts');
  mustContain(captureCode, "'bigmodel-project'", 'bm-capture.content.ts');
  mustContain(captureCode, "type: 'BATCH_PREVIEW_DATA'", 'bm-capture.content.ts');

  pass('bm-capture authenticated refresh bridge is present');
}

function runArtifactContractTest() {
  const publicMainPath = path.join(ROOT, 'public', 'bm-main.js');
  const builtMainPath = path.join(ROOT, 'output', 'chrome-mv3', 'bm-main.js');

  if (!fs.existsSync(publicMainPath)) {
    fail('public/bm-main.js not found (build-overlay step missing)');
  }

  const publicMain = fs.readFileSync(publicMainPath, 'utf8');
  mustContain(publicMain, "cmdToOverlay('REQUEST_BATCH_PREVIEW')", 'public/bm-main.js');
  mustContain(publicMain, "cmdToOverlay('REFRESH_BATCH_PREVIEW')", 'public/bm-main.js');
  mustContain(publicMain, 'function loadBatchPreviewFromCache()', 'public/bm-main.js');

  if (!fs.existsSync(builtMainPath)) {
    fail('output/chrome-mv3/bm-main.js not found (wxt build step missing)');
  }

  const builtMain = fs.readFileSync(builtMainPath, 'utf8');
  mustContain(builtMain, 'REQUEST_BATCH_PREVIEW', 'output/chrome-mv3/bm-main.js');
  mustContain(builtMain, 'REFRESH_BATCH_PREVIEW', 'output/chrome-mv3/bm-main.js');

  pass('generated artifacts keep product bootstrap hooks');
}

async function main() {
  runMatrixContractTest();
  await runAuthRecoveryContractTest();
  runBridgeContractTest();
  runArtifactContractTest();
  console.log('[target-products-regression] PASS: Target Products guardrail is healthy.');
}

main().catch((err) => {
  fail('Unexpected regression runtime error.', err && (err.stack || err.message || String(err)));
});
