import test from 'node:test';
import assert from 'node:assert/strict';
import { installTestEnv, startTestServer } from './helpers.ts';

installTestEnv();

test('OAuth metadata returns canonical HTTPS URLs', async () => {
  const runtime = await startTestServer();

  try {
    const response = await fetch(`${runtime.baseUrl}/.well-known/oauth-authorization-server`);
    assert.equal(response.status, 200);

    const body = (await response.json()) as Record<string, string>;
    assert.equal(body.issuer, 'https://claude.verifactu.business');
    assert.equal(body.authorization_endpoint, 'https://claude.verifactu.business/oauth/authorize');
    assert.equal(body.token_endpoint, 'https://claude.verifactu.business/oauth/token');
    assert.equal(body.registration_endpoint, 'https://claude.verifactu.business/oauth/register');
    assert.equal(body.revocation_endpoint, 'https://claude.verifactu.business/oauth/revoke');
  } finally {
    await runtime.close();
  }
});

test('unauthenticated and invalid auth requests to /mcp fail safely', async () => {
  const runtime = await startTestServer();

  try {
    const unauthenticated = await fetch(`${runtime.baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    });
    assert.equal(unauthenticated.status, 401);

    const invalid = await fetch(`${runtime.baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer invalid-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    });
    assert.equal(invalid.status, 401);
  } finally {
    await runtime.close();
  }
});

test('CORS preflight for OAuth and MCP endpoints works for Claude origins', async () => {
  const runtime = await startTestServer();

  try {
    const oauthOptions = await fetch(`${runtime.baseUrl}/oauth/token`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://claude.ai',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,content-type',
      },
    });

    assert.equal(oauthOptions.status, 204);
    assert.equal(oauthOptions.headers.get('access-control-allow-origin'), 'https://claude.ai');

    const mcpOptions = await fetch(`${runtime.baseUrl}/mcp`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://claude.ai',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,content-type,mcp-session-id',
      },
    });

    assert.equal(mcpOptions.status, 204);
    assert.equal(mcpOptions.headers.get('access-control-allow-origin'), 'https://claude.ai');
  } finally {
    await runtime.close();
  }
});
