import { storage } from '#imports';

export interface Ticket {
  ticket: string;
  randstr: string;
  createdAt: number;
}

const STORAGE_KEY = 'local:ticketPool';
const TICKET_TTL_MS = 5 * 60 * 1000; // 5 minutes per Tencent docs (CaptchaCode 8)

function isExpired(t: Ticket): boolean {
  return Date.now() - t.createdAt > TICKET_TTL_MS;
}

export const ticketStore = {
  async getAll(): Promise<Ticket[]> {
    const pool = (await storage.getItem<Ticket[]>(STORAGE_KEY)) ?? [];
    // Auto-prune expired tickets
    const valid = pool.filter((t) => !isExpired(t));
    if (valid.length !== pool.length) {
      await storage.setItem<Ticket[]>(STORAGE_KEY, valid);
    }
    return valid;
  },

  async add(ticket: string, randstr: string): Promise<number> {
    const pool = await this.getAll();
    // Deduplicate by ticket string
    if (pool.some((t) => t.ticket === ticket)) return pool.length;
    pool.push({ ticket, randstr, createdAt: Date.now() });
    await storage.setItem<Ticket[]>(STORAGE_KEY, pool);
    return pool.length;
  },

  async take(): Promise<Ticket | null> {
    const pool = await this.getAll();
    if (pool.length === 0) return null;
    const [first, ...rest] = pool;
    await storage.setItem<Ticket[]>(STORAGE_KEY, rest);
    return first;
  },

  async takeAll(): Promise<Ticket[]> {
    const pool = await this.getAll(); // auto-prunes expired
    await storage.setItem<Ticket[]>(STORAGE_KEY, []);
    return pool;
  },

  async count(): Promise<number> {
    return (await this.getAll()).length;
  },

  async clear(): Promise<void> {
    await storage.setItem<Ticket[]>(STORAGE_KEY, []);
  },

  /** Returns ms until the oldest ticket expires, or 0 if pool is empty */
  async oldestTtl(): Promise<number> {
    const pool = await this.getAll();
    if (pool.length === 0) return 0;
    const oldest = pool[0].createdAt;
    return Math.max(0, TICKET_TTL_MS - (Date.now() - oldest));
  },
};
