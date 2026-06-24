import type { IOrderPipeline, OperationResult, OrderContext, PaymentSession, PlatformAuth } from '../../types';
import { isVolcengineAuthValid } from '../volcengine-shared/auth-probe';
import type { VolcengineCommonBuyRequest, VolcengineCommonBuyResponse } from '../volcengine-shared/types';
import { xhrRequest } from '../volcengine-shared/request';
import { getVolcengineCodingplanConfigItem, getVolcengineCodingplanIndexKey } from './product-probe';

const PLATFORM = 'volcengine-codingplan';
const ORDER_URL = 'https://www.volcengine.com/api/v2/top/activity/bill_volc_provider/CommonBuy/2020-01-01/cn-beijing';

export class VolcengineCodingplanOrderPipeline implements IOrderPipeline {
  readonly platform = PLATFORM;

  async run(
    ctx: OrderContext,
    auth: PlatformAuth,
  ): Promise<OperationResult<PaymentSession>> {
    if (!isVolcengineAuthValid(auth)) {
      return { success: false, error: 'volcengine auth invalid' };
    }

    const productId = ctx.productId;
    const item = getVolcengineCodingplanConfigItem(productId);
    if (!item) {
      // Fallback: reconstruct from productId
      const [configCode, durationPart] = productId.split('|');
      const duration = parseInt(durationPart?.replace('duration:', '') || '1', 10);
      if (!configCode || !Number.isFinite(duration)) {
        return { success: false, error: `unknown ${PLATFORM} product ${productId}` };
      }
      const indexKey = getVolcengineCodingplanIndexKey(configCode, duration);
      if (!indexKey) {
        return { success: false, error: `${PLATFORM} index key not found for ${productId}` };
      }
      const fallbackBody = {
        Product: 'ark_bd',
        ConfigurationCode: configCode,
        Quantity: 1,
        Duration: duration,
        DurationUnit: 'monthly',
        ChargeItemList: [{ ChargeItemCode: `${configCode}_cn-beijing`, Count: '1' }],
        RenewType: 2,
        PurchaseTimes: duration,
      };
      return this.placeOrder(indexKey, fallbackBody, productId, auth.headers);
    }

    return this.placeOrder(item.indexKey, item.configBody, productId, auth.headers, item.indexKeyCandidates);
  }

  private async placeOrder(
    indexKey: string,
    configBody: VolcengineCommonBuyRequest['ConfigList'][number],
    productId: string,
    authHeaders: Record<string, string>,
    indexKeyCandidates?: string[],
  ): Promise<OperationResult<PaymentSession>> {
    const candidates = indexKeyCandidates?.length ? indexKeyCandidates.slice() : [indexKey];

    for (let i = 0; i < candidates.length; i++) {
      const result = await this.tryOrder(candidates[i], configBody, productId, authHeaders);
      if (result.success) return result;
      const errCode = result.error?.match(/^\[([^\]]+)\]/)?.[1];
      if (errCode !== 'InvalidParameter.Configuration' || i === candidates.length - 1) {
        return result;
      }
    }
    return { success: false, error: `${PLATFORM} exhausted index key candidates` };
  }

  private async tryOrder(
    indexKey: string,
    configBody: VolcengineCommonBuyRequest['ConfigList'][number],
    productId: string,
    authHeaders: Record<string, string>,
  ): Promise<OperationResult<PaymentSession>> {
    const body: VolcengineCommonBuyRequest = {
      IndexKey: indexKey,
      ConfigList: [configBody],
      SignPay: true,
    };

    try {
      const res = await xhrRequest<VolcengineCommonBuyResponse>({
        method: 'POST',
        url: ORDER_URL,
        withCredentials: true,
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(body),
      });

      const data = res.data;
      const error = data.ResponseMetadata?.Error;
      if (error) {
        return {
          success: false,
          error: `[${error.Code}] ${error.Message}`,
          metadata: { raw: data },
        };
      }

      const orderId = data.Result?.CustomerOrderID;
      if (!orderId) {
        return { success: false, error: `${PLATFORM} CommonBuy did not return CustomerOrderID`, metadata: { raw: data } };
      }

      const session: PaymentSession = {
        platform: PLATFORM,
        productId,
        amount: 0,
        currency: 'CNY',
        orderId,
        bizId: orderId,
        payUrl: `https://www.volcengine.com/activity/codingplan?i_f=1&o_n=${encodeURIComponent(orderId)}&tik=${encodeURIComponent(indexKey)}`,
        raw: { indexKey, configBody, response: data },
      };

      return { success: true, data: session };
    } catch (e: any) {
      return { success: false, error: e?.message || `${PLATFORM} CommonBuy network error` };
    }
  }
}
