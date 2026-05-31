import { storage } from '#imports';
import type { PaymentState } from './types';
import { PAYMENT_STORAGE_KEY } from './types';

const DEFAULT: PaymentState = {
  qrCode: null,
  bizId: null,
  amount: null,
  productId: null,
  status: 'waiting',
  updatedAt: 0,
};

export const paymentStore = {
  async get(): Promise<PaymentState> {
    return (await storage.getItem<PaymentState>(PAYMENT_STORAGE_KEY)) ?? { ...DEFAULT };
  },

  async set(state: PaymentState): Promise<void> {
    await storage.setItem<PaymentState>(PAYMENT_STORAGE_KEY, state);
  },

  async update(patch: Partial<PaymentState>): Promise<void> {
    const current = await this.get();
    await this.set({ ...current, ...patch, updatedAt: Date.now() });
  },

  async reset(): Promise<void> {
    await this.set({ ...DEFAULT, updatedAt: Date.now() });
  },
};
