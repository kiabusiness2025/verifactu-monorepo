/** @jest-environment node */

import { NextRequest } from 'next/server';
import { GET } from './route';

describe('GET /.well-known/oauth-authorization-server (holded.verifactu.business)', () => {
  it('declares the issuer, all OAuth endpoints, and the revocation endpoint', async () => {
    const request = new NextRequest(
      'https://holded.verifactu.business/.well-known/oauth-authorization-server'
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.issuer).toBe('https://holded.verifactu.business');
    expect(body.authorization_endpoint).toBe('https://holded.verifactu.business/oauth/authorize');
    expect(body.token_endpoint).toBe('https://holded.verifactu.business/oauth/token');
    expect(body.registration_endpoint).toBe('https://holded.verifactu.business/oauth/register');
    expect(body.revocation_endpoint).toBe('https://holded.verifactu.business/oauth/revoke');
  });

  it('advertises both authorization_code AND refresh_token grant types', async () => {
    // Regresión 2026-05-18: OpenAI ChatGPT DCR envía
    // grant_types=[authorization_code, refresh_token] al guardar el form
    // del connector. Si la metadata solo declara authorization_code, un
    // cliente estricto refuerza client-side y rechaza el refresh_token.
    // Mantener alineado con apps/app/app/.well-known/oauth-authorization-server.
    const request = new NextRequest(
      'https://holded.verifactu.business/.well-known/oauth-authorization-server'
    );
    const response = await GET(request);
    const body = await response.json();

    expect(body.grant_types_supported).toEqual(['authorization_code', 'refresh_token']);
    expect(body.response_types_supported).toEqual(['code']);
    expect(body.code_challenge_methods_supported).toEqual(['S256']);
    expect(body.token_endpoint_auth_methods_supported).toEqual(['none']);
  });

  it('exposes default_scopes aligned with the openai_review_invoicing_v1 preset', async () => {
    // Estos 6 scopes son el espejo de OPENAI_REVIEW_INVOICING_V1_SCOPE_SET
    // en apps/app/lib/integrations/holdedMcpScopes.ts. Cubren las 10 tools
    // expuestas en submission v2 a OpenAI (invoicing + contabilidad). Si
    // cambia el preset público en apps/app, este test falla y obliga a
    // sincronizar.
    const request = new NextRequest(
      'https://holded.verifactu.business/.well-known/oauth-authorization-server'
    );
    const response = await GET(request);
    const body = await response.json();

    expect(body.default_scopes).toEqual([
      'mcp.read',
      'holded.invoices.read',
      'holded.invoices.write',
      'holded.documents.read',
      'holded.contacts.read',
      'holded.accounts.read',
    ]);
  });

  it('returns Cache-Control: no-store so OAuth metadata changes propagate immediately', async () => {
    const request = new NextRequest(
      'https://holded.verifactu.business/.well-known/oauth-authorization-server'
    );
    const response = await GET(request);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});
