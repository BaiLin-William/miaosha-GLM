export interface StrikeTicket {
  ticket: string;
  randstr: string;
  createdAt: number;
}

export interface StrikeTarget {
  productId: string;
  priority: number; // 1, 2, 3
}

export interface StrikeShot {
  productId: string;
  ticket: string;
  randstr: string;
  createdAt: number;
  priority: number;
  shotIndex: number;
}

export interface StrikePlan {
  shots: StrikeShot[];
  targets: StrikeTarget[];
  allocation: number[];
}

interface BuildStrikeQueueInput {
  tickets: StrikeTicket[];
  targets: StrikeTarget[]; // ordered by priority ascending (P1 first), max 3
  allocation?: number[]; // percentages, length must match targets, sum 100
}

function normalizeAllocation(allocation: number[] | undefined, targetCount: number): number[] {
  const fallback: number[] =
    targetCount === 1 ? [100] :
    targetCount === 2 ? [70, 30] :
    [70, 20, 10];

  if (!Array.isArray(allocation) || allocation.length !== targetCount) return fallback;

  const cleaned = allocation.slice(0, targetCount).map((v) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
  });
  const sum = cleaned.reduce((a, b) => a + b, 0);
  if (sum === 0) return fallback;
  if (sum === 100) return cleaned;

  const normalized = cleaned.map((v) => Math.round((v / sum) * 100));
  const normSum = normalized.reduce((a, b) => a + b, 0);
  if (normSum !== 100 && normalized[0] != null) {
    normalized[0] += 100 - normSum;
  }
  return normalized;
}

/**
 * Distribute tickets across targets according to allocation percentages.
 * Order: all P1 tickets first, then P2, then P3. Within each target,
 * tickets are newest-first (highest createdAt first).
 */
function distributeTickets(
  tickets: StrikeTicket[],
  targets: StrikeTarget[],
  allocation: number[],
  shotIndexStart = 0,
): StrikeShot[] {
  const total = tickets.length;
  if (total === 0 || targets.length === 0) return [];

  const counts = allocation.map((pct) => Math.floor((total * pct) / 100));
  const allocated = counts.reduce((a, b) => a + b, 0);
  if (counts[0] != null && allocated < total) {
    counts[0] += total - allocated; // remainder to highest priority
  }

  const shots: StrikeShot[] = [];
  let ticketIdx = 0;
  let shotIndex = shotIndexStart;

  for (let t = 0; t < targets.length; t++) {
    const target = targets[t];
    const count = counts[t] ?? 0;
    for (let i = 0; i < count; i++) {
      const ticket = tickets[ticketIdx++];
      if (!ticket) break;
      shots.push({
        productId: target.productId,
        ticket: ticket.ticket,
        randstr: ticket.randstr,
        createdAt: ticket.createdAt,
        priority: target.priority,
        shotIndex: shotIndex++,
      });
    }
  }

  return shots;
}

export function buildStrikeQueue(input: BuildStrikeQueueInput): StrikePlan {
  // Sort tickets newest-first so the freshest ticket (furthest from expiry)
  // gets shot index 0. The first shot has no sliding-window baggage and the
  // highest chance of reaching business logic.
  const tickets = (input.tickets || []).slice().sort((a, b) => b.createdAt - a.createdAt);
  const targets = (input.targets || []).filter((t) => t && t.productId).slice(0, 3);

  if (tickets.length === 0 || targets.length === 0) {
    return { shots: [], targets: [], allocation: [] };
  }

  const allocation = normalizeAllocation(input.allocation, targets.length);
  const shots = distributeTickets(tickets, targets, allocation);

  return { shots, targets, allocation };
}

/**
 * Re-plan remaining tickets across still-alive targets.
 * Keeps ticket order immutable; only reassigns targets.
 */
export function replanStrikeQueue(
  remainingShots: StrikeShot[],
  aliveTargets: StrikeTarget[],
  originalAllocation: number[],
): StrikePlan {
  const tickets: StrikeTicket[] = remainingShots.map((s) => ({
    ticket: s.ticket,
    randstr: s.randstr,
    createdAt: s.createdAt,
  }));

  if (tickets.length === 0 || aliveTargets.length === 0) {
    return { shots: [], targets: aliveTargets, allocation: [] };
  }

  // Normalize original allocation to only alive targets, preserving ratios.
  const aliveIndices = aliveTargets.map((t) => t.priority - 1);
  const aliveRaw = aliveIndices.map((idx) => originalAllocation[idx] ?? 0);
  const rawSum = aliveRaw.reduce((a, b) => a + b, 0);
  const allocation = rawSum > 0
    ? normalizeAllocation(aliveRaw, aliveTargets.length)
    : aliveTargets.map((_, i) => (i === 0 ? 100 : 0));

  const startIndex = remainingShots[0]?.shotIndex ?? 0;
  const shots = distributeTickets(tickets, aliveTargets, allocation, startIndex);

  return { shots, targets: aliveTargets, allocation };
}
