import type { IPlatformAdapter } from '../../types';
import { BigmodelAuthProbe } from './auth-probe';
import { BigmodelProductProbe } from './product-probe';
import { BigmodelOrderPipeline } from './order-pipeline';
import { BigmodelPaymentLauncher } from './payment-launcher';
import { BigmodelTicketProvider } from './ticket-provider';
import { BigmodelOverlayLayout } from './overlay-layout';

export const bigmodelAdapter: IPlatformAdapter = {
  id: 'bigmodel',
  displayName: '智谱 Coding Plan',
  hostPatterns: ['*://*.bigmodel.cn/*'],
  entryUrl: 'https://bigmodel.cn/glm-coding?plantype=personal',

  authProbe: new BigmodelAuthProbe(),
  productProbe: new BigmodelProductProbe(),
  ticketProvider: new BigmodelTicketProvider(),
  orderPipeline: new BigmodelOrderPipeline(),
  paymentLauncher: new BigmodelPaymentLauncher(),
  overlayLayout: new BigmodelOverlayLayout(),
};
