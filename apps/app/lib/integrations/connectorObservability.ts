import { randomUUID } from 'crypto';

type ResponseWithHeaders = {
  headers: Headers;
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

export function logConnectorEvent(
  scope: string,
  level: 'info' | 'error',
  event: Record<string, unknown>
) {
  const payload = {
    ts: new Date().toISOString(),
    ...event,
  };

  if (level === 'error') {
    console.error(`[${scope}]`, payload);
    return;
  }

  console.info(`[${scope}]`, payload);
}
