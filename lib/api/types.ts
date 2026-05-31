export interface AuthHeaders {
  authorization: string;
  bigmodelOrganization: string;
  bigmodelProject: string;
}

export type HttpMethod = 'GET' | 'POST';

export interface ApiEndpoint {
  id: string;
  name: string;
  method: HttpMethod;
  path: string;
  description: string;
  hasBody: boolean;
  bodyTemplate: Record<string, unknown> | null;
  note?: string;
  errorCodes?: { code: number; meaning: string }[];
}

export interface TestResult {
  status: number;
  headers: Record<string, string>;
  body: unknown;
  durationMs: number;
  error?: string;
}

export const AUTH_STORAGE_KEY = 'local:authHeaders';

export type PaymentStatus = 'waiting' | 'pending' | 'success' | 'expired' | 'error';

export interface PaymentState {
  qrCode: string | null;
  bizId: string | null;
  amount: number | null;
  productId: string | null;
  status: PaymentStatus;
  updatedAt: number;
  errorMsg?: string;
}

export const PAYMENT_STORAGE_KEY = 'local:paymentState';
