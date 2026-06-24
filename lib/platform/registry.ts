import type { IPlatformAdapter, IPlatformRegistry, PlatformId } from './types';

class PlatformRegistry implements IPlatformRegistry {
  private readonly adapters = new Map<PlatformId, IPlatformAdapter>();

  register(adapter: IPlatformAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  get(id: PlatformId): IPlatformAdapter | undefined {
    return this.adapters.get(id);
  }

  list(): readonly IPlatformAdapter[] {
    return Array.from(this.adapters.values());
  }

  forHost(host: string): IPlatformAdapter | undefined {
    return this.list().find((adapter) =>
      adapter.hostPatterns.some((pattern) => matchHost(pattern, host),
      ),
    );
  }
}

function matchHost(pattern: string, host: string): boolean {
  if (pattern.includes('*')) {
    const regex = new RegExp(
      '^' + pattern.replace(/\./g, '\\.').replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$',
    );
    return regex.test(host);
  }
  return host === pattern || host.endsWith('.' + pattern);
}

export const platformRegistry: IPlatformRegistry = new PlatformRegistry();

export function registerPlatform(adapter: IPlatformAdapter): void {
  platformRegistry.register(adapter);
}
