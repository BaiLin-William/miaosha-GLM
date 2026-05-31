/**
 * Unit tests: lib/api/ticket-store.ts
 *
 * ticketStore depends on WXT storage — fakeBrowser provides an in-memory
 * implementation. Tests are fully synchronous with respect to the test runner:
 * each async function is awaited, no real Chrome/browser needed.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { ticketStore } from '../../../../lib/api/ticket-store';

// fakeBrowser.reset() is called globally in tests/setup.ts before each test.
// The describe-level beforeEach below is intentionally left for any
// ticket-store-specific state that may need extra reset.

describe('ticketStore', () => {
  describe('add', () => {
    it('adds a ticket to the pool', async () => {
      const count = await ticketStore.add('ticket-abc', 'randstr-123');
      expect(count).toBe(1);
    });

    it('deduplicates identical tickets', async () => {
      await ticketStore.add('ticket-dup', 'randstr-1');
      const count = await ticketStore.add('ticket-dup', 'randstr-2');
      expect(count).toBe(1);
    });

    it('allows multiple distinct tickets', async () => {
      await ticketStore.add('t1', 'r1');
      await ticketStore.add('t2', 'r2');
      const count = await ticketStore.count();
      expect(count).toBe(2);
    });
  });

  describe('take', () => {
    it('returns null when pool is empty', async () => {
      const ticket = await ticketStore.take();
      expect(ticket).toBeNull();
    });

    it('returns and removes the first ticket', async () => {
      await ticketStore.add('t1', 'r1');
      await ticketStore.add('t2', 'r2');

      const taken = await ticketStore.take();
      expect(taken).not.toBeNull();
      expect(taken!.ticket).toBe('t1');

      const remaining = await ticketStore.count();
      expect(remaining).toBe(1);
    });
  });

  describe('takeAll', () => {
    it('returns all tickets and empties the pool', async () => {
      await ticketStore.add('t1', 'r1');
      await ticketStore.add('t2', 'r2');

      const all = await ticketStore.takeAll();
      expect(all).toHaveLength(2);
      expect(await ticketStore.count()).toBe(0);
    });
  });

  describe('clear', () => {
    it('empties the pool', async () => {
      await ticketStore.add('t1', 'r1');
      await ticketStore.clear();
      expect(await ticketStore.count()).toBe(0);
    });
  });

  describe('expired ticket pruning', () => {
    it('auto-prunes tickets past the 5-minute TTL', async () => {
      // Add a ticket with createdAt set 6 minutes in the past
      const SIX_MINUTES_AGO = Date.now() - 6 * 60 * 1000;

      // Manually seed storage to bypass the add() dedup logic
      await fakeBrowser.storage.local.set({
        'local:ticketPool': [
          { ticket: 'expired-t', randstr: 'expired-r', createdAt: SIX_MINUTES_AGO },
        ],
      });

      const pool = await ticketStore.getAll();
      expect(pool).toHaveLength(0); // expired ticket pruned
    });

    it('keeps tickets within TTL', async () => {
      await ticketStore.add('fresh-t', 'fresh-r');
      const pool = await ticketStore.getAll();
      expect(pool).toHaveLength(1);
    });
  });

  describe('oldestTtl', () => {
    it('returns 0 when pool is empty', async () => {
      expect(await ticketStore.oldestTtl()).toBe(0);
    });

    it('returns positive ms remaining for a fresh ticket', async () => {
      await ticketStore.add('t1', 'r1');
      const ttl = await ticketStore.oldestTtl();
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(5 * 60 * 1000);
    });
  });
});
