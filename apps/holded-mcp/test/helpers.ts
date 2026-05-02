import { AddressInfo } from 'node:net';
import { createHash } from 'node:crypto';

export function installTestEnv() {
  process.env.NODE_ENV = 'test';
  process.env.PORT = process.env.PORT || '3000';
  process.env.BASE_URL = 'https://claude.verifactu.business';
  delete process.env.DATABASE_URL;
  process.env.OAUTH_JWT_SECRET = 'test-secret-1234567890-test-secret-1234567890';
  process.env.OAUTH_DATA_ENCRYPTION_SECRET = 'test-encryption-secret-1234567890-test-encryption';
  process.env.OAUTH_CLIENT_ID = 'holded-mcp-test-client';
  process.env.OAUTH_CLIENT_SECRET = 'holded-mcp-test-client-secret-123456';
  process.env.HOLDED_API_BASE = 'https://api.holded.com';
  process.env.CORS_ALLOWED_ORIGINS = 'https://claude.ai,https://app.claude.ai';
  process.env.LOG_LEVEL = 'error';
}

export async function startTestServer() {
  installTestEnv();
  const { createApp } = await import('../src/app.ts');

  const app = createApp();
  const server = await new Promise<import('node:http').Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    app,
    server,
    baseUrl,
    async close() {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    },
  };
}

export interface HoldedFetchCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

/**
 * Mock de fetch que graba todas las llamadas a https://api.holded.com/ y devuelve
 * la respuesta indicada. Útil para verificar URL, método y body sin red real.
 */
export function withHoldedFetchRecorder(
  options: {
    responseStatus?: number;
    responseBody?: unknown;
    responseHeaders?: Record<string, string>;
    responseBinary?: Buffer;
  } = {}
) {
  const calls: HoldedFetchCall[] = [];
  const originalFetch = global.fetch;

  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    if (url.startsWith('https://api.holded.com/')) {
      const headers: Record<string, string> = {};
      const initHeaders = init?.headers as Record<string, string> | undefined;
      if (initHeaders) {
        for (const [k, v] of Object.entries(initHeaders)) headers[k.toLowerCase()] = String(v);
      }
      const body =
        init?.body !== undefined && init.body !== null
          ? typeof init.body === 'string'
            ? init.body
            : JSON.stringify(init.body)
          : undefined;

      calls.push({
        url,
        method: (init?.method ?? 'GET').toUpperCase(),
        headers,
        body,
      });

      if (options.responseBinary) {
        return new Response(options.responseBinary, {
          status: options.responseStatus ?? 200,
          headers: { 'Content-Type': 'application/pdf', ...(options.responseHeaders ?? {}) },
        });
      }

      const payload = options.responseBody === undefined ? [] : options.responseBody;
      return new Response(JSON.stringify(payload), {
        status: options.responseStatus ?? 200,
        headers: { 'Content-Type': 'application/json', ...(options.responseHeaders ?? {}) },
      });
    }

    return originalFetch(input as RequestInfo, init);
  }) as typeof fetch;

  return {
    calls,
    restore() {
      global.fetch = originalFetch;
    },
  };
}

export function withHoldedFetchMock(valid: boolean) {
  const originalFetch = global.fetch;

  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    if (url.startsWith('https://api.holded.com/')) {
      if (!valid) {
        return new Response('unauthorized', { status: 401 });
      }

      return new Response('[]', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return originalFetch(input as RequestInfo, init);
  }) as typeof fetch;

  return () => {
    global.fetch = originalFetch;
  };
}

export function buildPkcePair() {
  const verifier = 'verifier-1234567890-verifier-1234567890-verifier-1234567890';
  const challenge = createHash('sha256').update(verifier).digest('base64url');

  return { verifier, challenge };
}
