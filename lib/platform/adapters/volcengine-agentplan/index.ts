import type { IPlatformAdapter } from '../../types';
import { VolcengineAuthProbe } from '../volcengine-shared/auth-probe';
import { VolcenginePaymentLauncher } from '../volcengine-shared/payment-launcher';
import { VolcengineTicketProvider } from '../volcengine-shared/ticket-provider';
import { VolcengineOverlayLayout } from '../volcengine-shared/overlay-layout';
import { VolcengineAgentplanProductProbe } from './product-probe';
import { VolcengineAgentplanOrderPipeline } from './order-pipeline';

export const volcengineAgentplanAdapter: IPlatformAdapter = {
  id: 'volcengine-agentplan',
  displayName: '火山引擎 Agent Plan',
  hostPatterns: ['*://*.volcengine.com/*'],
  entryUrl: 'https://www.volcengine.com/activity/agentplan',

  authProbe: new VolcengineAuthProbe(),
  productProbe: new VolcengineAgentplanProductProbe(),
  ticketProvider: new VolcengineTicketProvider(),
  orderPipeline: new VolcengineAgentplanOrderPipeline(),
  paymentLauncher: new VolcenginePaymentLauncher(),
  overlayLayout: new VolcengineOverlayLayout(),
};
