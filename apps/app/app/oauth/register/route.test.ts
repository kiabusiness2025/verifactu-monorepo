/** @jest-environment node */

jest.mock('@/lib/oauth/mcp', () => ({
  applyOpenAiCorsHeaders: jest.fn((response, request, options) => {
    const origin = request.headers.get('origin');
    if (origin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set(
        'Access-Control-Allow-Methods',
        options?.methods?.join(', ') || 'GET, OPTIONS, POST'
      );
      response.headers.set('Access-Control-Allow-Headers', 'content-type');
    }
    return response;
  }),
  ensureScopesAllowed: jest.fn(() => true),
  getDefaultScopes: jest.fn(() => ['mcp.read', 'holded.invoices.read']),
  validateRedirectUri: jest.fn(() => true),
}));

import { GET, HEAD, OPTIONS, POST } from './route';

describe('OAuth dynamic client registration route', () => {
  it('returns an informative GET response so link validators do not fail on the DCR endpoint', async () => {
    const response = await GET(
      new Request('https://app.verifactu.business/oauth/register', {
        method: 'GET',
        headers: {
          origin: 'https://chatgpt.com',
        },
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://chatgpt.com');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    expect(payload.registration_endpoint).toBe('https://app.verifactu.business/oauth/register');
    expect(payload.registration_supported).toBe(true);
    expect(payload.token_endpoint_auth_methods_supported).toEqual(['none']);
    // Regresión 2026-05-18: el portal de OpenAI manda DCR con
    // grant_types=[authorization_code, refresh_token] al guardar los detalles
    // del MCP. Si el endpoint no anuncia refresh_token aquí, el cliente
    // pre-validaba en algunos clientes (no en el de OpenAI, pero
    // mantengámoslo consistente con la metadata global /.well-known).
    expect(payload.grant_types_supported).toEqual(['authorization_code', 'refresh_token']);
  });

  it('returns a successful HEAD response for strict link validators', async () => {
    const response = await HEAD(
      new Request('https://app.verifactu.business/oauth/register', {
        method: 'HEAD',
        headers: {
          origin: 'https://chatgpt.com',
        },
      }) as never
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://chatgpt.com');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('HEAD');
    expect(response.headers.get('Allow')).toContain('HEAD');
  });

  it('returns CORS headers for preflight requests from ChatGPT', async () => {
    const response = await OPTIONS(
      new Request('https://app.verifactu.business/oauth/register', {
        method: 'OPTIONS',
        headers: {
          origin: 'https://chatgpt.com',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type',
        },
      }) as never
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://chatgpt.com');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('HEAD');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('content-type');
  });

  it('returns CORS headers on successful DCR POST requests', async () => {
    const response = await POST(
      new Request('https://app.verifactu.business/oauth/register', {
        method: 'POST',
        headers: {
          origin: 'https://chatgpt.com',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          client_name: 'OpenAI ChatGPT',
          redirect_uris: ['https://chatgpt.com/connector/oauth/Py3iPxF981UJ'],
          grant_types: ['authorization_code'],
          response_types: ['code'],
          token_endpoint_auth_method: 'none',
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://chatgpt.com');
    expect(payload.client_id).toBe('openai-chatgpt-dc3910724e2c913016182543');
  });

  it('accepts DCR with grant_types=[authorization_code, refresh_token] (real OpenAI ChatGPT payload)', async () => {
    // Regresión 2026-05-18: OpenAI ChatGPT envía estos dos grant types al
    // crear el connector. Antes el handler rechazaba con
    // `400 invalid_client_metadata: Only authorization_code grant type is
    // supported.` y bloqueaba el guardado del form "MCP details".
    const response = await POST(
      new Request('https://app.verifactu.business/oauth/register', {
        method: 'POST',
        headers: {
          origin: 'https://chatgpt.com',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          client_name: 'OpenAI ChatGPT',
          redirect_uris: ['https://chatgpt.com/connector/oauth/abc123'],
          grant_types: ['authorization_code', 'refresh_token'],
          response_types: ['code'],
          token_endpoint_auth_method: 'none',
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    // El response debe reflejar los grant_types que el cliente pidió y
    // aceptamos, no sólo authorization_code hardcoded.
    expect(payload.grant_types).toEqual(['authorization_code', 'refresh_token']);
    expect(payload.token_endpoint_auth_method).toBe('none');
  });

  it('defaults grant_types to [authorization_code, refresh_token] when the client omits them', async () => {
    // RFC 7591 §2 permite que el cliente omita grant_types y que el server
    // aplique un default. Lo declaramos como ambos para que el cliente sepa
    // que puede usar refresh_token sin re-registrarse.
    const response = await POST(
      new Request('https://app.verifactu.business/oauth/register', {
        method: 'POST',
        headers: { origin: 'https://chatgpt.com', 'content-type': 'application/json' },
        body: JSON.stringify({
          client_name: 'OpenAI ChatGPT',
          redirect_uris: ['https://chatgpt.com/connector/oauth/abc456'],
          response_types: ['code'],
          token_endpoint_auth_method: 'none',
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.grant_types).toEqual(['authorization_code', 'refresh_token']);
  });

  it('rejects DCR with unsupported grant types (e.g. client_credentials)', async () => {
    // Sólo authorization_code + refresh_token. Cualquier otro grant
    // (client_credentials, password, jwt-bearer, etc.) debe seguir rechazado
    // con 400 invalid_client_metadata.
    const response = await POST(
      new Request('https://app.verifactu.business/oauth/register', {
        method: 'POST',
        headers: { origin: 'https://chatgpt.com', 'content-type': 'application/json' },
        body: JSON.stringify({
          client_name: 'BadClient',
          redirect_uris: ['https://example.com/callback'],
          grant_types: ['authorization_code', 'client_credentials'],
          response_types: ['code'],
          token_endpoint_auth_method: 'none',
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('invalid_client_metadata');
    expect(payload.error_description).toMatch(/authorization_code and refresh_token/);
  });
});
