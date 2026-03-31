/** @jest-environment node */

jest.mock('@/lib/oauth/mcp', () => ({
  applyOpenAiCorsHeaders: jest.fn((response, request) => {
    const origin = request.headers.get('origin');
    if (origin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'OPTIONS, POST');
      response.headers.set('Access-Control-Allow-Headers', 'content-type');
    }
    return response;
  }),
  ensureScopesAllowed: jest.fn(() => true),
  getDefaultScopes: jest.fn(() => ['mcp.read', 'holded.invoices.read']),
  validateRedirectUri: jest.fn(() => true),
}));

import { OPTIONS, POST } from './route';

describe('OAuth dynamic client registration route', () => {
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

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://chatgpt.com');
    expect(payload.client_id).toBe('openai-chatgpt-dc3910724e2c913016182543');
  });
});
