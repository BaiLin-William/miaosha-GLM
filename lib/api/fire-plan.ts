export interface FirePlanTicket {
  ticket: string;
  randstr: string;
  createdAt: number;
}

export interface AutoFirePlanShot {
  wave: 'initial' | 'follow-up';
  productId: string;
  ticket: string;
  randstr: string;
  createdAt: number;
  expiresAt: number;
  scheduledAt: number;
}

export interface AutoFirePlan {
  initialShots: AutoFirePlanShot[];
  followUpShots: AutoFirePlanShot[];
  reservedTickets: FirePlanTicket[];
}

export interface BuildAutoFirePlanInput {
  tickets: FirePlanTicket[];
  selectedIds: string[];
  startMs: number;
  ticketTtlMs?: number;
  safeWindowMs?: number;
  latestFireBufferMs?: number;
  random?: () => number;
}

const DEFAULT_TICKET_TTL_MS = 5 * 60 * 1000;
const DEFAULT_SAFE_WINDOW_MS = 45 * 1000;
const DEFAULT_LATEST_FIRE_BUFFER_MS = 1000;

function clampRandom(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  if (value <= 0) return 0;
  if (value >= 1) return 0.999999;
  return value;
}

function sortByExpiryUrgency(tickets: FirePlanTicket[], ticketTtlMs: number): FirePlanTicket[] {
  return [...tickets].sort((left, right) => {
    const leftExpiry = left.createdAt + ticketTtlMs;
    const rightExpiry = right.createdAt + ticketTtlMs;
    if (leftExpiry !== rightExpiry) return leftExpiry - rightExpiry;
    if (left.createdAt !== right.createdAt) return left.createdAt - right.createdAt;
    return left.ticket.localeCompare(right.ticket);
  });
}

export function buildAutoFirePlan(input: BuildAutoFirePlanInput): AutoFirePlan {
  const ticketTtlMs = input.ticketTtlMs ?? DEFAULT_TICKET_TTL_MS;
  const safeWindowMs = input.safeWindowMs ?? DEFAULT_SAFE_WINDOW_MS;
  const latestFireBufferMs = input.latestFireBufferMs ?? DEFAULT_LATEST_FIRE_BUFFER_MS;
  const random = input.random ?? Math.random;
  const orderedTickets = sortByExpiryUrgency(input.tickets, ticketTtlMs);

  if (orderedTickets.length === 0 || input.selectedIds.length === 0) {
    return { initialShots: [], followUpShots: [], reservedTickets: [] };
  }

  const initialCount = Math.min(orderedTickets.length, input.selectedIds.length);
  const initialTickets = orderedTickets.slice(0, initialCount);
  const followUpTickets = orderedTickets.slice(initialCount);

  const initialShots = initialTickets.map((ticket, index) => ({
    wave: 'initial' as const,
    productId: input.selectedIds[index],
    ticket: ticket.ticket,
    randstr: ticket.randstr,
    createdAt: ticket.createdAt,
    expiresAt: ticket.createdAt + ticketTtlMs,
    scheduledAt: input.startMs,
  }));

  let previousScheduledAt = input.startMs;
  const followUpShots = followUpTickets.map((ticket, index) => {
    const expiresAt = ticket.createdAt + ticketTtlMs;
    const baseWindowStart = Math.max(input.startMs + 1, expiresAt - safeWindowMs);
    const windowStart = Math.max(baseWindowStart, previousScheduledAt + 1);
    const windowEnd = Math.max(windowStart, expiresAt - latestFireBufferMs);
    const ratio = clampRandom(random());
    const scheduledAt = Math.round(windowStart + (windowEnd - windowStart) * ratio);
    previousScheduledAt = scheduledAt;

    return {
      wave: 'follow-up' as const,
      productId: input.selectedIds[index % input.selectedIds.length],
      ticket: ticket.ticket,
      randstr: ticket.randstr,
      createdAt: ticket.createdAt,
      expiresAt,
      scheduledAt,
    };
  });

  return {
    initialShots,
    followUpShots,
    reservedTickets: orderedTickets,
  };
}