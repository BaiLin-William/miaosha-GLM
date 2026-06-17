export interface AuthHeaders {
  authorization: string;
  bigmodelOrganization: string;
  bigmodelProject: string;
}

type HttpMethod = 'GET' | 'POST';

type EndpointRole =
  | 'Probe'
  | 'Reserve'
  | 'Commit'
  | 'Poll'
  | 'Route'
  | 'Informational'
  | 'Reject';

export interface ApiEndpoint {
  id: string;
  name: string;
  method: HttpMethod;
  path: string;
  description: string;
  role: EndpointRole;
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
