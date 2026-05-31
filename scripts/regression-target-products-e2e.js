#!/usr/bin/env node
/*
 * Live-runtime gate for Target Products.
 *
 * This script opens a real bigmodel page, injects the built bm-main runtime,
 * and asserts Target Products in overlay is rendered (not "No products loaded").
 *
 * To keep this gate deterministic across environments, it intercepts
 * /api/biz/pay/batch-preview and fulfills a known-good payload.
 */

const fs = require('fs');
const path = require('path');

let chromium;
try {
  ({ chromium } = require('playwright-core'));
} catch {
  console.error('[target-products-e2e] FAIL: playwright-core is not installed. Run `pnpm add -D playwright-core`.');
  process.exit(1);
}

const ROOT = path.join(__dirname, '..');
const BUILT_MAIN = path.join(ROOT, 'output', 'chrome-mv3', 'bm-main.js');
const URL = process.env.TARGET_PRODUCTS_GATE_URL || 'https://bigmodel.cn/glm-coding';
const CHROME_PATH = process.env.TARGET_PRODUCTS_GATE_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TIMEOUT_MS = Number(process.env.TARGET_PRODUCTS_GATE_TIMEOUT_MS || 45_000);
const HEADLESS = process.env.TARGET_PRODUCTS_GATE_HEADLESS === '1';
const FAIL_SHOT = path.join(ROOT, 'output', 'target-products-e2e-fail.png');

function fail(message, detail) {
  if (detail) {
    console.error('[target-products-e2e] FAIL:', message, '\n', detail);
  } else {
    console.error('[target-products-e2e] FAIL:', message);
  }
  process.exit(1);
}

function ok(message) {
  console.log('[target-products-e2e] OK  :', message);
}

const FIXTURE = {
  code: 200,
  msg: 'Operation successful',
  success: true,
  data: {
    isSubscribed: false,
    isAuthenticated: null,
    productList: [
      { productId: 'product-02434c', originalAmount: 49, discountAmount: 49, payAmount: 49, monthlyOriginalAmount: 49, monthlyRenewAmount: 49, monthlyPayAmount: 49, renewAmount: 49, soldOut: false, forbidden: false, canPurchase: true, inCurrentPeriod: false, hasFirstTimeSubscriptionPromo: false, delay: false, campaignDiscountDetails: [] },
      { productId: 'product-1df3e1', originalAmount: 149, discountAmount: 149, payAmount: 149, monthlyOriginalAmount: 149, monthlyRenewAmount: 149, monthlyPayAmount: 149, renewAmount: 149, soldOut: false, forbidden: false, canPurchase: true, inCurrentPeriod: false, hasFirstTimeSubscriptionPromo: false, delay: false, campaignDiscountDetails: [] },
      { productId: 'product-2fc421', originalAmount: 469, discountAmount: 469, payAmount: 469, monthlyOriginalAmount: 469, monthlyRenewAmount: 469, monthlyPayAmount: 469, renewAmount: 469, soldOut: false, forbidden: false, canPurchase: true, inCurrentPeriod: false, hasFirstTimeSubscriptionPromo: false, delay: false, campaignDiscountDetails: [] },
      { productId: 'product-b8ea38', originalAmount: 147, discountAmount: 132.3, payAmount: 132.3, monthlyOriginalAmount: 49, monthlyRenewAmount: 49, monthlyPayAmount: 44.1, renewAmount: 147, soldOut: false, forbidden: false, canPurchase: true, inCurrentPeriod: false, hasFirstTimeSubscriptionPromo: false, delay: false, campaignDiscountDetails: [{ campaignName: '连续包季 9 折', rewardDetail: '连续包季 9 折' }] },
      { productId: 'product-fef82f', originalAmount: 447, discountAmount: 402.3, payAmount: 402.3, monthlyOriginalAmount: 149, monthlyRenewAmount: 149, monthlyPayAmount: 134.1, renewAmount: 447, soldOut: false, forbidden: false, canPurchase: true, inCurrentPeriod: false, hasFirstTimeSubscriptionPromo: false, delay: false, campaignDiscountDetails: [{ campaignName: '连续包季 9 折', rewardDetail: '连续包季 9 折' }] },
      { productId: 'product-5d3a03', originalAmount: 1407, discountAmount: 1266.3, payAmount: 1266.3, monthlyOriginalAmount: 469, monthlyRenewAmount: 469, monthlyPayAmount: 422.1, renewAmount: 1407, soldOut: false, forbidden: false, canPurchase: true, inCurrentPeriod: false, hasFirstTimeSubscriptionPromo: false, delay: false, campaignDiscountDetails: [{ campaignName: '连续包季 9 折', rewardDetail: '连续包季 9 折' }] },
      { productId: 'product-70a804', originalAmount: 588, discountAmount: 470.4, payAmount: 470.4, monthlyOriginalAmount: 49, monthlyRenewAmount: 49, monthlyPayAmount: 39.2, renewAmount: 588, soldOut: false, forbidden: false, canPurchase: true, inCurrentPeriod: false, hasFirstTimeSubscriptionPromo: false, delay: false, campaignDiscountDetails: [{ campaignName: '连续包年 8 折', rewardDetail: '连续包年 8 折' }] },
      { productId: 'product-5643e6', originalAmount: 1788, discountAmount: 1430.4, payAmount: 1430.4, monthlyOriginalAmount: 149, monthlyRenewAmount: 149, monthlyPayAmount: 119.2, renewAmount: 1788, soldOut: false, forbidden: false, canPurchase: true, inCurrentPeriod: false, hasFirstTimeSubscriptionPromo: false, delay: false, campaignDiscountDetails: [{ campaignName: '连续包年 8 折', rewardDetail: '连续包年 8 折' }] },
      { productId: 'product-d46f8b', originalAmount: 5628, discountAmount: 4502.4, payAmount: 4502.4, monthlyOriginalAmount: 469, monthlyRenewAmount: 469, monthlyPayAmount: 375.2, renewAmount: 5628, soldOut: false, forbidden: false, canPurchase: true, inCurrentPeriod: false, hasFirstTimeSubscriptionPromo: false, delay: false, campaignDiscountDetails: [{ campaignName: '连续包年 8 折', rewardDetail: '连续包年 8 折' }] },
    ],
  },
};

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (!fs.existsSync(BUILT_MAIN)) {
    fail('Built runtime not found at output/chrome-mv3/bm-main.js. Run `npm run build` first.');
  }
  if (!fs.existsSync(CHROME_PATH)) {
    fail('Chrome executable not found.', `Expected: ${CHROME_PATH}\nSet TARGET_PRODUCTS_GATE_CHROME_PATH to your Chrome binary.`);
  }

  let browser;
  let context;
  let page;
  let intercepted = 0;

  try {
    browser = await chromium.launch({
      headless: HEADLESS,
      executablePath: CHROME_PATH,
      args: ['--no-first-run', '--no-default-browser-check'],
    });

    context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

    await context.route('**/api/biz/pay/batch-preview**', async (route) => {
      intercepted += 1;
      await route.fulfill({
        status: 200,
        headers: {
          'content-type': 'application/json;charset=UTF-8',
          'access-control-allow-origin': 'https://bigmodel.cn',
          'access-control-allow-credentials': 'true',
          date: new Date().toUTCString(),
        },
        body: JSON.stringify(FIXTURE),
      });
    });

    page = await context.newPage();
    // Inject built runtime in real page context before navigation.
    await page.addInitScript({ path: BUILT_MAIN });
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });

    await page.waitForSelector('#__bm_overlay', { timeout: 60_000 });
    await page.waitForSelector('#__bm_overlay #_prodList', { timeout: 30_000 });

    const start = Date.now();
    let finalState = null;

    while (Date.now() - start < TIMEOUT_MS) {
      finalState = await page.evaluate(() => {
        const list = document.querySelector('#__bm_overlay #_prodList');
        if (!list) {
          return { cards: 0, noProducts: false, loading: true, text: 'list-not-found' };
        }
        const cards = list.querySelectorAll('.pr-t').length;
        const text = (list.textContent || '').replace(/\s+/g, ' ').trim();
        return {
          cards,
          noProducts: text.includes('No products loaded'),
          loading: text.includes('Loading products'),
          text,
        };
      });

      if (finalState.cards > 0 && !finalState.noProducts) {
        break;
      }

      await page.evaluate(() => {
        window.postMessage({ __miaosha_cmd: true, type: 'REFRESH_BATCH_PREVIEW' }, '*');
      });
      await sleep(500);
    }

    if (!finalState || finalState.cards <= 0 || finalState.noProducts) {
      try {
        await page.screenshot({ path: FAIL_SHOT, fullPage: true });
      } catch {}
      fail(
        'Target Products gate failed: overlay did not render product cards.',
        `state=${JSON.stringify(finalState)}\ninterceptedBatchPreview=${intercepted}\nscreenshot=${FAIL_SHOT}`
      );
    }

    if (intercepted < 1) {
      fail('No batch-preview request observed during runtime gate.');
    }

    ok(`Target Products rendered ${finalState.cards} cards; no "No products loaded" regression.`);
    ok(`Observed ${intercepted} batch-preview request(s).`);
    console.log('[target-products-e2e] PASS: live runtime gate is healthy.');
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

main().catch((err) => {
  fail('Unexpected runtime error.', err && (err.stack || err.message || String(err)));
});
