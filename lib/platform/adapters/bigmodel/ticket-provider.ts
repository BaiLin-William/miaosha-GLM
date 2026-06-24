import type { ITicketProvider, Ticket } from '../../types';

const CAPTCHA_APPID = '196026326';

type CaptchaCallback = (ticket: Ticket | null) => void;

export class BigmodelTicketProvider implements ITicketProvider {
  readonly providerId = 'tencent-captcha';
  private batchMode = false;
  private batchCount = 0;
  private batchSessionLimit = 100;
  private activeCaptcha: any = null;
  private pendingResolve: CaptchaCallback | null = null;

  async produce(): Promise<Ticket | null> {
    if (typeof (window as any).TencentCaptcha === 'undefined') return null;

    return new Promise<Ticket | null>((resolve) => {
      this.pendingResolve = resolve;
      try {
        const c = new (window as any).TencentCaptcha(
          CAPTCHA_APPID,
          (res: any) => {
            this.activeCaptcha = null;
            if (res.ret === 0 && res.ticket) {
              const ticket: Ticket = {
                ticket: res.ticket,
                randstr: res.randstr,
                provider: this.providerId,
                createdAt: Date.now(),
              };
              this.resolve(ticket);
              if (this.batchMode) {
                this.batchCount++;
                if (this.batchCount >= this.batchSessionLimit) {
                  this.stopBatch();
                  return;
                }
                setTimeout(() => this.produce(), 300);
              }
            } else {
              this.resolve(null);
              if (this.batchMode) setTimeout(() => this.produce(), 500);
            }
          },
          { mode: 'popup' },
        );
        this.activeCaptcha = c;
        c.show();
      } catch {
        this.resolve(null);
      }
    });
  }

  startBatch(): void {
    this.batchMode = true;
    this.batchCount = 0;
    this.produce();
  }

  stopBatch(): void {
    this.batchMode = false;
    this.destroyActive();
  }

  destroyActive(): void {
    if (this.activeCaptcha && typeof this.activeCaptcha.destroy === 'function') {
      try { this.activeCaptcha.destroy(); } catch {}
    }
    this.activeCaptcha = null;
    this.resolve(null);
  }

  setBatchSessionLimit(limit: number): void {
    this.batchSessionLimit = Math.max(1, Math.round(limit));
  }

  private resolve(ticket: Ticket | null): void {
    if (this.pendingResolve) {
      this.pendingResolve(ticket);
      this.pendingResolve = null;
    }
  }
}
