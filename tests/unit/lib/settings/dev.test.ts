/**
 * Unit tests: lib/settings/dev.ts
 */

import { describe, it, expect } from 'vitest';
import { devEnvironment } from '../../../../lib/settings/dev';

describe('devEnvironment', () => {
  it('returns "production" when storage is empty', async () => {
    expect(await devEnvironment.get()).toBe('production');
  });

  it('persists and returns the configured mode', async () => {
    await devEnvironment.set('development');
    expect(await devEnvironment.get()).toBe('development');
    await devEnvironment.set('production');
    expect(await devEnvironment.get()).toBe('production');
  });
});
