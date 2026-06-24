import type {
  IAuthStore,
  IProductCatalogStore,
  ISelectedProductsStore,
  ITicketPoolStore,
  IRuntimeCalibrationStore,
  ISaleTimeStore,
  IPaymentBridge,
  PlatformAuth,
  PlatformId,
  ProductCatalog,
  ISelectedProducts,
  TicketPoolSnapshot,
  RuntimeCalibration,
  PaymentSession,
  Ticket,
} from '../../types';
import { MemoryStore } from './base';
import { ChromeStorageStore } from './storage-base';

const DEFAULT_TICKET_TTL_MS = 5 * 60 * 1000;
const DEFAULT_POOL_MAX = 100;

// =============================================================================
// Auth
// =============================================================================

export class MemoryAuthStore extends MemoryStore<PlatformAuth> implements IAuthStore {
  isReady(): boolean {
    const a = this.get();
    return !!a && !!a.headers.authorization;
  }
}

export class ChromeAuthStore extends ChromeStorageStore<PlatformAuth> implements IAuthStore {
  isReady(): boolean {
    const a = this.get();
    return !!a && !!a.headers.authorization;
  }
}

export function createAuthStore(useChrome = true): IAuthStore {
  return useChrome ? new ChromeAuthStore('local:platformAuth') : new MemoryAuthStore();
}

// =============================================================================
// Product Catalog
// =============================================================================

export class MemoryProductCatalogStore
  extends MemoryStore<Record<PlatformId, ProductCatalog>>
  implements IProductCatalogStore
{
  getPlatform(platform: PlatformId): ProductCatalog | null {
    const all = this.get();
    return all?.[platform] ?? null;
  }
}

export class ChromeProductCatalogStore
  extends ChromeStorageStore<Record<PlatformId, ProductCatalog>>
  implements IProductCatalogStore
{
  getPlatform(platform: PlatformId): ProductCatalog | null {
    const all = this.get();
    return all?.[platform] ?? null;
  }
}

export function createProductCatalogStore(useChrome = true): IProductCatalogStore {
  return useChrome
    ? new ChromeProductCatalogStore('local:platformCatalog')
    : new MemoryProductCatalogStore();
}

// =============================================================================
// Selected Products
// =============================================================================

export class MemorySelectedProductsStore
  extends MemoryStore<Record<PlatformId, ISelectedProducts>>
  implements ISelectedProductsStore
{
  getPlatform(platform: PlatformId): ISelectedProducts | null {
    const all = this.get();
    return all?.[platform] ?? null;
  }
}

export class ChromeSelectedProductsStore
  extends ChromeStorageStore<Record<PlatformId, ISelectedProducts>>
  implements ISelectedProductsStore
{
  getPlatform(platform: PlatformId): ISelectedProducts | null {
    const all = this.get();
    return all?.[platform] ?? null;
  }
}

export function createSelectedProductsStore(useChrome = true): ISelectedProductsStore {
  return useChrome
    ? new ChromeSelectedProductsStore('local:platformSelectedProducts')
    : new MemorySelectedProductsStore();
}

// =============================================================================
// Ticket Pool
// =============================================================================

function buildEmptyPool(): TicketPoolSnapshot {
  return { tickets: [], maxSize: DEFAULT_POOL_MAX, ttlMs: DEFAULT_TICKET_TTL_MS };
}

class BaseTicketPoolStore implements ITicketPoolStore {
  protected snapshot: TicketPoolSnapshot = buildEmptyPool();
  protected listeners = new Set<(value: TicketPoolSnapshot) => void>();

  get(): TicketPoolSnapshot {
    return this.snapshot;
  }

  watch(callback: (value: TicketPoolSnapshot) => void): () => void {
    this.listeners.add(callback);
    callback(this.snapshot);
    return () => this.listeners.delete(callback);
  }

  async set(value: TicketPoolSnapshot): Promise<void> {
    this.snapshot = value;
    this.notify();
  }

  async clear(): Promise<void> {
    this.snapshot = buildEmptyPool();
    this.notify();
  }

  add(ticket: Ticket): void {
    this.expire();
    const list = [...this.snapshot.tickets, ticket];
    if (list.length > this.snapshot.maxSize) {
      list.splice(0, list.length - this.snapshot.maxSize);
    }
    this.snapshot = { ...this.snapshot, tickets: list };
    this.notify();
  }

  consume(): Ticket | null {
    this.expire();
    const list = this.snapshot.tickets;
    if (list.length === 0) return null;
    const [first, ...rest] = list;
    this.snapshot = { ...this.snapshot, tickets: rest };
    this.notify();
    return first;
  }

  expire(): void {
    const now = Date.now();
    const ttl = this.snapshot.ttlMs;
    const filtered = this.snapshot.tickets.filter((t) => now - t.createdAt < ttl);
    if (filtered.length !== this.snapshot.tickets.length) {
      this.snapshot = { ...this.snapshot, tickets: filtered };
      this.notify();
    }
  }

  protected notify(): void {
    this.listeners.forEach((cb) => {
      try {
        cb(this.snapshot);
      } catch {
        // isolate
      }
    });
  }
}

export class MemoryTicketPoolStore extends BaseTicketPoolStore {}

export class ChromeTicketPoolStore extends BaseTicketPoolStore {
  constructor() {
    super();
    this.load();
  }

  private async load(): Promise<void> {
    try {
      const { storage } = await import('#imports');
      const stored = await storage.getItem<TicketPoolSnapshot>('local:ticketPool');
      if (stored) this.snapshot = stored;
    } catch {
      // ignore
    }
    this.notify();
  }

  override async set(value: TicketPoolSnapshot): Promise<void> {
    this.snapshot = value;
    try {
      const { storage } = await import('#imports');
      await storage.setItem<TicketPoolSnapshot>('local:ticketPool', value);
    } catch {
      // ignore
    }
    this.notify();
  }

  override add(ticket: Ticket): void {
    super.add(ticket);
    this.persist();
  }

  override consume(): Ticket | null {
    const ticket = super.consume();
    this.persist();
    return ticket;
  }

  private async persist(): Promise<void> {
    try {
      const { storage } = await import('#imports');
      await storage.setItem<TicketPoolSnapshot>('local:ticketPool', this.snapshot);
    } catch {
      // ignore
    }
  }
}

export function createTicketPoolStore(useChrome = true): ITicketPoolStore {
  return useChrome ? new ChromeTicketPoolStore() : new MemoryTicketPoolStore();
}

// =============================================================================
// Runtime Calibration
// =============================================================================

const DEFAULT_CALIBRATION: RuntimeCalibration = {
  latencyMs: 0,
  clockOffsetMs: 0,
  sampleCount: 0,
  calibratedAt: 0,
};

export class MemoryRuntimeCalibrationStore
  extends MemoryStore<RuntimeCalibration>
  implements IRuntimeCalibrationStore
{
  constructor() {
    super();
    this.set(DEFAULT_CALIBRATION);
  }

  apply(data: Partial<RuntimeCalibration>): void {
    const current = this.get() ?? DEFAULT_CALIBRATION;
    this.set({ ...current, ...data, calibratedAt: data.calibratedAt ?? Date.now() });
  }
}

export class ChromeRuntimeCalibrationStore
  extends ChromeStorageStore<RuntimeCalibration>
  implements IRuntimeCalibrationStore
{
  constructor() {
    super('local:runtimeCalibration');
  }

  apply(data: Partial<RuntimeCalibration>): void {
    const current = this.get() ?? DEFAULT_CALIBRATION;
    this.set({ ...current, ...data, calibratedAt: data.calibratedAt ?? Date.now() });
  }
}

export function createRuntimeCalibrationStore(useChrome = true): IRuntimeCalibrationStore {
  return useChrome
    ? new ChromeRuntimeCalibrationStore()
    : new MemoryRuntimeCalibrationStore();
}

// =============================================================================
// Sale Time
// =============================================================================

export class MemorySaleTimeStore extends MemoryStore<number> implements ISaleTimeStore {
  getNextSaleTime(): number | null {
    const v = this.get();
    return v && v > 0 ? v : null;
  }
}

export class ChromeSaleTimeStore extends ChromeStorageStore<number> implements ISaleTimeStore {
  constructor() {
    super('local:nextSaleTime');
  }

  getNextSaleTime(): number | null {
    const v = this.get();
    return v && v > 0 ? v : null;
  }
}

export function createSaleTimeStore(useChrome = true): ISaleTimeStore {
  return useChrome ? new ChromeSaleTimeStore() : new MemorySaleTimeStore();
}

// =============================================================================
// Payment Bridge
// =============================================================================

export class MemoryPaymentBridge extends MemoryStore<PaymentSession | null> implements IPaymentBridge {
  async push(session: PaymentSession): Promise<void> {
    await this.set(session);
  }
}

export class ChromePaymentBridge
  extends ChromeStorageStore<PaymentSession | null>
  implements IPaymentBridge
{
  constructor() {
    super('local:pendingPaymentSession');
  }

  async push(session: PaymentSession): Promise<void> {
    await this.set(session);
  }
}

export function createPaymentBridge(useChrome = true): IPaymentBridge {
  return useChrome ? new ChromePaymentBridge() : new MemoryPaymentBridge();
}
