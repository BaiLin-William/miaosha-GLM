/**
 * Raw subscription configuration as it appears in the Volcengine activity bundle.
 */
export interface VolcengineConfigBody {
  Product: string;
  ConfigurationCode: string;
  Quantity: number;
  Duration: number;
  DurationUnit: string;
  ChargeItemList: Array<{ ChargeItemCode: string; Count: string }>;
  RenewType?: number;
  PurchaseTimes?: number;
}

export interface VolcengineConfigItem {
  indexKey: string;
  configBody: VolcengineConfigBody;
  indexKeyCandidates?: string[];
}

export interface VolcengineCalculatePriceItem {
  Product: string;
  ConfigurationCode: string;
  ChargeItems: Array<{ ChargeItemCode: string; AttrValue: string }>;
  Quantity: number;
  Period: string;
  Times: number;
  OrderType: number;
  SerialNo: string;
}

export interface VolcengineCalculatePriceResponse {
  ResponseMetadata?: {
    RequestId?: string;
    Error?: { Code?: string; Message?: string };
  };
  Result?: {
    TotalOriginalAmount?: string;
    TotalDiscountAmount?: string;
    QueryDiscountPrice?: boolean;
  };
}

export interface VolcengineCommonBuyConfigBody {
  Product: string;
  ConfigurationCode: string;
  Quantity: number;
  Duration: number;
  DurationUnit: string;
  ChargeItemList: Array<{ ChargeItemCode: string; Count: string }>;
  RenewType?: number;
  PurchaseTimes?: number;
}

export interface VolcengineCommonBuyRequest {
  IndexKey: string;
  ConfigList: VolcengineCommonBuyConfigBody[];
  SignPay: boolean;
}

export interface VolcengineCommonBuyResponse {
  ResponseMetadata?: {
    RequestId?: string;
    Error?: { Code?: string; Message?: string };
  };
  Result?: {
    CustomerOrderID?: string;
    OrderInfos?: Array<{ OrderID?: string; InstanceIDList?: string[] }>;
  };
}

export interface VolcengineAllowCreateSubscribeTradeResponse {
  ResponseMetadata?: {
    RequestId?: string;
    Error?: { Code?: string; Message?: string };
  };
  Result?: {
    ServiceOpened?: boolean;
    CanOrder?: boolean;
    CanUpgrade?: boolean;
    InstanceID?: string;
    IsPurchased?: boolean;
  };
}
