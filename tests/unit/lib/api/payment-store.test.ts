/**
 * Unit tests: lib/api/payment-store.ts
 */

import { describe, it, expect } from 'vitest';
import { paymentStore } from '../../../../lib/api/payment-store';

describe('paymentStore', () => {
  describe('get (empty state)', () => {
    it('returns default state when storage is empty', async () => {
      const state = await paymentStore.get();
      expect(state.status).toBe('waiting');
      expect(state.qrCode).toBeNull();
      expect(state.bizId).toBeNull();
      expect(state.amount).toBeNull();
      expect(state.productId).toBeNull();
    });
  });

  describe('set / get roundtrip', () => {
    it('persists a complete payment state', async () => {
      const payload = {
        qrCode: 'data:image/png;base64,abc',
        bizId: 'biz-001',
        amount: 9900,
        productId: 'prod-xyz',
        status: 'pending' as const,
        updatedAt: 1700000000000,
      };
      await paymentStore.set(payload);
      const retrieved = await paymentStore.get();
      expect(retrieved.bizId).toBe('biz-001');
      expect(retrieved.status).toBe('pending');
      expect(retrieved.amount).toBe(9900);
    });
  });

  describe('update', () => {
    it('merges a partial patch into existing state', async () => {
      await paymentStore.set({
        qrCode: 'qr-initial',
        bizId: 'biz-002',
        amount: 100,
        productId: 'prod-a',
        status: 'waiting',
        updatedAt: 1000,
      });

      await paymentStore.update({ status: 'success' });

      const updated = await paymentStore.get();
      expect(updated.status).toBe('success');
      expect(updated.bizId).toBe('biz-002'); // unchanged fields preserved
      expect(updated.updatedAt).toBeGreaterThan(1000); // timestamp updated
    });
  });

  describe('reset', () => {
    it('restores default state and updates timestamp', async () => {
      await paymentStore.set({
        qrCode: 'qr-old',
        bizId: 'old-biz',
        amount: 500,
        productId: 'old-prod',
        status: 'success',
        updatedAt: 1000,
      });

      const before = Date.now();
      await paymentStore.reset();
      const state = await paymentStore.get();

      expect(state.qrCode).toBeNull();
      expect(state.bizId).toBeNull();
      expect(state.status).toBe('waiting');
      expect(state.updatedAt).toBeGreaterThanOrEqual(before);
    });
  });
});
