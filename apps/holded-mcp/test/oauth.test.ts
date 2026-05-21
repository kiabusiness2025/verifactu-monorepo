import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPkcePair,
  installTestEnv,
  startTestServer,
  withHoldedFetchMock,
  withVerifactuF1Mock,
} from './helpers.ts';

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
        // F3.1: el consent screen ahora exige email + T&C explícitos.
        personal_email: 'demo@example.com',
        accepted_terms: '1',
        accepted_privacy: '1',
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

test('OAuth registration rejects redirect_uri outside the Claude allowlist', async () => {
  const runtime = await startTestServer();

  try {
    const response = await fetch(`${runtime.baseUrl}/oauth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'Evil client',
        redirect_uris: ['https://evil.example/auth/callback'],
      }),
    });

    assert.equal(response.status, 400);
    const body = (await response.json()) as Record<string, unknown>;
    assert.equal(body.error, 'invalid_redirect_uri');
  } finally {
    await runtime.close();
  }
});

test('OAuth authorize rejects redirect_uri outside the Claude allowlist', async () => {
  const runtime = await startTestServer();

  try {
    const response = await fetch(
      `${runtime.baseUrl}/oauth/authorize?response_type=code&client_id=test&redirect_uri=${encodeURIComponent(
        'https://evil.example/auth/callback'
      )}`
    );

    assert.equal(response.status, 400);
    assert.match(await response.text(), /redirect_uri no autorizado/i);
  } finally {
    await runtime.close();
  }
});

test('OAuth authorize bridges to the holded-claude form without leaking unescaped state', async () => {
  const runtime = await startTestServer();

  try {
    // Desde 2026-05-18 GET /oauth/authorize ya no renderiza un consent screen
    // propio: siempre redirige (302) al form amber de holded-claude. El `state`
    // malicioso debe viajar URL-encoded dentro de `next`, nunca crudo.
    const state = `"><script>alert(1)</script>`;
    const response = await fetch(
      `${runtime.baseUrl}/oauth/authorize?response_type=code&client_id=test&redirect_uri=${encodeURIComponent(
        'https://claude.ai/api/mcp/auth_callback'
      )}&state=${encodeURIComponent(state)}`,
      { redirect: 'manual' }
    );

    assert.equal(response.status, 302);
    const location = response.headers.get('location') ?? '';
    assert.match(location, /\/auth\/holded-claude/);
    assert.doesNotMatch(location, /<script>/i);
    assert.doesNotMatch(location, /"><script>alert\(1\)<\/script>/);
  } finally {
    await runtime.close();
  }
});

test('invalid Holded API keys fail safely on authorization', async () => {
  const runtime = await startTestServer();
  // F3.1: el consent screen llama al endpoint común F1 antes de validar
  // contra Holded. Cuando F1 detecta `probe.ok=false` devuelve `invalid_api_key`.
  const f1 = withVerifactuF1Mock({ ok: false, reason: 'invalid_api_key', status: 422 });

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
        personal_email: 'demo@example.com',
        accepted_terms: '1',
        accepted_privacy: '1',
      }),
    });

    assert.equal(response.status, 400);
    const html = await response.text();
    assert.match(html, /API key no es valida|API key invalida/i);
    assert.equal(f1.calls.length, 1);
    const sentBody = JSON.parse(f1.calls[0].body) as Record<string, unknown>;
    assert.equal(sentBody.channel, 'claude');
    assert.equal(sentBody.source, 'claude_consent_screen');
    assert.equal(sentBody.personalEmail, 'demo@example.com');
  } finally {
    f1.restore();
    await runtime.close();
  }
});

test('F3.1 — rechaza submission sin email con error humano', async () => {
  const runtime = await startTestServer();
  const f1 = withVerifactuF1Mock({ ok: true });

  try {
    const response = await fetch(`${runtime.baseUrl}/oauth/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: 'client-x',
        redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
        response_type: 'code',
        state: 'state-x',
        holded_api_key: 'apikey',
        accepted_terms: '1',
        accepted_privacy: '1',
        // sin personal_email
      }),
    });

    assert.equal(response.status, 400);
    const html = await response.text();
    assert.match(html, /rellena email y API key|email/i);
    // Si el form rechaza por validación local, F1 NO se debe llamar.
    assert.equal(f1.calls.length, 0);
  } finally {
    f1.restore();
    await runtime.close();
  }
});

test('F3.1 — rechaza submission sin T&C con error humano', async () => {
  const runtime = await startTestServer();
  const f1 = withVerifactuF1Mock({ ok: true });

  try {
    const response = await fetch(`${runtime.baseUrl}/oauth/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: 'client-x',
        redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
        response_type: 'code',
        state: 'state-x',
        holded_api_key: 'apikey',
        personal_email: 'demo@example.com',
        // sin accepted_terms / accepted_privacy
      }),
    });

    assert.equal(response.status, 400);
    const html = await response.text();
    assert.match(html, /terminos|privacidad|conectar/i);
    assert.equal(f1.calls.length, 0);
  } finally {
    f1.restore();
    await runtime.close();
  }
});

test('F3.2 — happy path persiste authorization code llamando a F1 con channel=claude', async () => {
  const runtime = await startTestServer();
  const f1 = withVerifactuF1Mock({ ok: true, userId: 'real-user-007', tenantId: 'real-tenant-42' });

  try {
    const pkce = buildPkcePair();
    const registerResponse = await fetch(`${runtime.baseUrl}/oauth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'F3 happy-path test',
        redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
      }),
    });
    const client = (await registerResponse.json()) as Record<string, string>;

    const authorizeResponse = await fetch(`${runtime.baseUrl}/oauth/authorize`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: client.client_id,
        redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
        response_type: 'code',
        state: 'state-f3',
        scope: 'holded:read holded:write',
        holded_api_key: 'apikey-real',
        personal_email: 'Real@Example.com',
        accepted_terms: '1',
        accepted_privacy: '1',
        code_challenge: pkce.challenge,
        code_challenge_method: 'S256',
      }),
    });

    assert.equal(authorizeResponse.status, 302);
    const location = authorizeResponse.headers.get('location');
    assert.ok(location);
    const callbackUrl = new URL(location!);
    assert.ok(callbackUrl.searchParams.get('code'));

    // Verificamos que se llamó al endpoint F1 con el contrato correcto.
    assert.equal(f1.calls.length, 1);
    const sent = JSON.parse(f1.calls[0].body) as Record<string, unknown>;
    assert.equal(sent.channel, 'claude');
    assert.equal(sent.source, 'claude_consent_screen');
    assert.equal(sent.personalEmail, 'real@example.com');
    assert.equal(sent.holdedApiKey, 'apikey-real');
    assert.equal(sent.acceptedTerms, true);
    assert.equal(sent.acceptedPrivacy, true);
  } finally {
    f1.restore();
    await runtime.close();
  }
});

test('F3 refuses to issue a Claude OAuth code when F1 central registry is down', async () => {
  const runtime = await startTestServer();
  const f1 = withVerifactuF1Mock({ networkError: true });

  try {
    const pkce = buildPkcePair();
    const registerResponse = await fetch(`${runtime.baseUrl}/oauth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'F3 fallback test',
        redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
      }),
    });
    const client = (await registerResponse.json()) as Record<string, string>;

    const authorizeResponse = await fetch(`${runtime.baseUrl}/oauth/authorize`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: client.client_id,
        redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
        response_type: 'code',
        state: 'state-fallback',
        scope: 'holded:read holded:write',
        holded_api_key: 'apikey-real',
        personal_email: 'demo@example.com',
        accepted_terms: '1',
        accepted_privacy: '1',
        code_challenge: pkce.challenge,
        code_challenge_method: 'S256',
      }),
    });

    assert.equal(authorizeResponse.status, 503);
    const html = await authorizeResponse.text();
    assert.match(html, /registrar la conexion en Verifactu/i);
    assert.equal(authorizeResponse.headers.get('location'), null);

    assert.equal(f1.calls.length, 1);
  } finally {
    f1.restore();
    await runtime.close();
  }
});
