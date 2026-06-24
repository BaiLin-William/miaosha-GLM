import type { ITicketProvider, Ticket } from '../../types';

export class VolcengineTicketProvider implements ITicketProvider {
  readonly providerId = 'none';

  async produce(): Promise<Ticket | null> {
    return null;
  }

  startBatch(): void {}
  stopBatch(): void {}
  destroyActive(): void {}
}
