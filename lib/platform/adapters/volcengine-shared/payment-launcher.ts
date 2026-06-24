import type { IPaymentLauncher, LaunchContext, OperationResult, PaymentSession } from '../../types';

export class VolcenginePaymentLauncher implements IPaymentLauncher {
  readonly platform = 'volcengine';

  async launch(session: PaymentSession, ctx?: LaunchContext): Promise<OperationResult<void>> {
    if (!session.payUrl) {
      return { success: false, error: 'missing volcengine payment url' };
    }

    try {
      const win = ctx?.window ?? window;
      win.location.assign(session.payUrl);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'failed to launch volcengine payment UI' };
    }
  }
}
