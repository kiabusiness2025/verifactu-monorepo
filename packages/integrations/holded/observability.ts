import { randomUUID } from 'crypto';

type ResponseWithHeaders = {
  headers: Headers;
};

export type ConnectorEventLevel = 'info' | 'warn' | 'error';

export type ConnectorEvent = {
  requestId?: string | null;
  tenantId?: string | null;
  entryChannel?: string | null;
  stage?: string | null;
  outcome?: string | null;
  error?: string | null;
  [key: string]: unknown;
};

function normalizeHeader(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function getConnectorRequestId(input: { headers: Headers }) {
  return (
    normalizeHeader(input.headers.get('x-request-id')) ||
    normalizeHeader(input.headers.get('x-vercel-id')) ||
    `holded-${randomUUID()}`
  );
}

export function withConnectorRequestId<T extends ResponseWithHeaders>(
  response: T,
  requestId: string
) {
  response.headers.set('x-verifactu-request-id', requestId);
  return response;
}

export function buildConnectorEvent(event: ConnectorEvent) {
  return {
    ts: new Date().toISOString(),
    ...event,
  };
}

export function logConnectorEvent(
  scope: string,
  level: ConnectorEventLevel,
  event: ConnectorEvent
) {
  const payload = buildConnectorEvent(event);

  if (level === 'error') {
    console.error(`[${scope}]`, payload);
    return;
  }

  if (level === 'warn') {
    console.warn(`[${scope}]`, payload);
    return;
  }

  console.info(`[${scope}]`, payload);
}
