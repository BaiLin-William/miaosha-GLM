import type { IPlatformAdapter } from '../../types';
import { VolcengineAuthProbe } from '../volcengine-shared/auth-probe';
import { VolcenginePaymentLauncher } from '../volcengine-shared/payment-launcher';
import { VolcengineTicketProvider } from '../volcengine-shared/ticket-provider';
import { VolcengineOverlayLayout } from '../volcengine-shared/overlay-layout';
import { VolcengineCodingplanProductProbe } from './product-probe';
import { VolcengineCodingplanOrderPipeline } from './order-pipeline';

export const volcengineCodingplanAdapter: IPlatformAdapter = {
  id: 'volcengine-codingplan',
  displayName: '火山引擎 Coding Plan',
  hostPatterns: ['*://*.volcengine.com/*'],
  entryUrl: 'https://www.volcengine.com/activity/codingplan',

  authProbe: new VolcengineAuthProbe(),
  productProbe: new VolcengineCodingplanProductProbe(),
  ticketProvider: new VolcengineTicketProvider(),
  orderPipeline: new VolcengineCodingplanOrderPipeline(),
  paymentLauncher: new VolcenginePaymentLauncher(),
  overlayLayout: new VolcengineOverlayLayout(),
};
