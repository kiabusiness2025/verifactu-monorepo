import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPkcePair, installTestEnv, startTestServer, withHoldedFetchMock } from './helpers.ts';

installTestEnv();

test('dynamic client registration and token exchange work with valid Holded credentials', async () => {
  const runtime = await startTestServer();
  const restoreFetch = withHoldedFetchMock(true);

  try {
    const registerResponse = await fetch(`${runtime.baseUrl}/oauth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'Holded MCP test client',
        redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
      }),
    });

    assert.equal(registerResponse.status, 201);
    const client = (await registerResponse.json()) as Record<string, string>;
    assert.ok(client.client_id);
    assert.ok(client.client_secret);

    const pkce = buildPkcePair();
    const authorizeResponse = await fetch(`${runtime.baseUrl}/oauth/authorize`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: client.client_id,
        redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
        response_type: 'code',
        state: 'state-123',
        scope: 'holded:read holded:write',
        holded_api_key: 'valid-holded-key',
        code_challenge: pkce.challenge,
        code_challenge_method: 'S256',
      }),
    });

    assert.equal(authorizeResponse.status, 302);
    const location = authorizeResponse.headers.get('location');
    assert.ok(location);

    const callbackUrl = new URL(location);
    const code = callbackUrl.searchParams.get('code');
    assert.ok(code);
    assert.equal(callbackUrl.searchParams.get('state'), 'state-123');

    const tokenResponse = await fetch(`${runtime.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code!,
        client_id: client.client_id,
        client_secret: client.client_secret,
        redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
        code_verifier: pkce.verifier,
      }),
    });

    assert.equal(tokenResponse.status, 200);
    const tokenBody = (await tokenResponse.json()) as Record<string, string>;
    assert.ok(tokenBody.access_token);
    assert.ok(tokenBody.refresh_token);

    const revokeResponse = await fetch(`${runtime.baseUrl}/oauth/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: tokenBody.refresh_token }),
    });

    assert.equal(revokeResponse.status, 200);
  } finally {
    restoreFetch();
    await runtime.close();
  }
});

test('invalid Holded API keys fail safely on authorization', async () => {
  const runtime = await startTestServer();
  const restoreFetch = withHoldedFetchMock(false);

  try {
    const response = await fetch(`${runtime.baseUrl}/oauth/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: 'client-invalid',
        redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
        response_type: 'code',
        state: 'state-invalid',
        holded_api_key: 'invalid-key',
      }),
    });

    assert.equal(response.status, 400);
    const html = await response.text();
    assert.match(html, /API key invalida/i);
  } finally {
    restoreFetch();
    await runtime.close();
  }
});
