/**
 * Unit tests: lib/settings/dev.ts
 */

import { describe, it, expect } from 'vitest';
import { devEnvironment } from '../../../../lib/settings/dev';

describe('devEnvironment', () => {
  describe('default', () => {
    it('is "development"', () => {
      expect(devEnvironment.default()).toBe('development');
    });
  });

  describe('get (empty state)', () => {
    it('returns "development" when storage is empty', async () => {
      expect(await devEnvironment.get()).toBe('development');
    });
  });

  describe('set / get roundtrip', () => {
    it('persists "production"', async () => {
      await devEnvironment.set('production');
      expect(await devEnvironment.get()).toBe('production');
    });

    it('round-trips back to "development"', async () => {
      await devEnvironment.set('production');
      await devEnvironment.set('development');
      expect(await devEnvironment.get()).toBe('development');
    });
  });

  describe('isDevelopment / isProduction', () => {
    it('isDevelopment is true when mode is development', async () => {
      await devEnvironment.set('development');
      expect(await devEnvironment.isDevelopment()).toBe(true);
      expect(await devEnvironment.isProduction()).toBe(false);
    });

    it('isProduction is true when mode is production', async () => {
      await devEnvironment.set('production');
      expect(await devEnvironment.isProduction()).toBe(true);
      expect(await devEnvironment.isDevelopment()).toBe(false);
    });
  });
});
