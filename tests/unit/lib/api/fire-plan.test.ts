import { describe, expect, it } from 'vitest';

import { buildAutoFirePlan } from '../../../../lib/api/fire-plan';

describe('buildAutoFirePlan', () => {
  it('uses the most urgent tickets in the initial concurrent wave', () => {
    const startMs = 1_000_000;
    const plan = buildAutoFirePlan({
      tickets: [
        { ticket: 'late', randstr: 'r3', createdAt: 900_000 },
        { ticket: 'urgent', randstr: 'r1', createdAt: 710_000 },
        { ticket: 'middle', randstr: 'r2', createdAt: 800_000 },
      ],
      selectedIds: ['p1', 'p2'],
      startMs,
    });

    expect(plan.initialShots).toHaveLength(2);
    expect(plan.initialShots.map((shot) => shot.ticket)).toEqual(['urgent', 'middle']);
    expect(plan.initialShots.every((shot) => shot.scheduledAt === startMs)).toBe(true);
    expect(plan.followUpShots).toHaveLength(1);
    expect(plan.followUpShots[0].ticket).toBe('late');
  });

  it('schedules follow-up shots inside the last 45 seconds before expiry', () => {
    const startMs = 1_000_000;
    const ttlMs = 300_000;
    const safeWindowMs = 45_000;
    const bufferMs = 1_000;
    const tickets = [
      { ticket: 't1', randstr: 'r1', createdAt: 700_000 },
      { ticket: 't2', randstr: 'r2', createdAt: 760_000 },
      { ticket: 't3', randstr: 'r3', createdAt: 820_000 },
      { ticket: 't4', randstr: 'r4', createdAt: 880_000 },
    ];

    const randomValues = [0.2, 0.8, 0.4, 0.6];
    let index = 0;
    const plan = buildAutoFirePlan({
      tickets,
      selectedIds: ['p1', 'p2'],
      startMs,
      ticketTtlMs: ttlMs,
      safeWindowMs,
      latestFireBufferMs: bufferMs,
      random: () => randomValues[index++] ?? 0.5,
    });

    expect(plan.initialShots).toHaveLength(2);
    expect(plan.followUpShots).toHaveLength(2);

    for (const shot of plan.followUpShots) {
      expect(shot.scheduledAt).toBeGreaterThanOrEqual(Math.max(startMs + 1, shot.expiresAt - safeWindowMs));
      expect(shot.scheduledAt).toBeLessThanOrEqual(shot.expiresAt - bufferMs);
    }

    expect(plan.followUpShots[0].scheduledAt).toBeLessThan(plan.followUpShots[1].scheduledAt);
  });

  it('does not create follow-up shots when tickets are fewer than selected products', () => {
    const plan = buildAutoFirePlan({
      tickets: [
        { ticket: 't1', randstr: 'r1', createdAt: 100 },
        { ticket: 't2', randstr: 'r2', createdAt: 200 },
      ],
      selectedIds: ['p1', 'p2', 'p3'],
      startMs: 10_000,
    });

    expect(plan.initialShots).toHaveLength(2);
    expect(plan.followUpShots).toHaveLength(0);
  });
});