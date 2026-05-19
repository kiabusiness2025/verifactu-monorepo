/** @jest-environment node */

import { NextRequest } from 'next/server';
import { GET } from './route';

describe('GET /.well-known/oauth-protected-resource/api/mcp/holded', () => {
  it('declares the MCP resource and the authorization server', async () => {
    const request = new NextRequest(
      'https://holded.verifactu.business/.well-known/oauth-protected-resource/api/mcp/holded'
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.resource).toBe('https://holded.verifactu.business/api/mcp/holded');
    expect(body.authorization_servers).toEqual(['https://holded.verifactu.business']);
    expect(body.bearer_methods_supported).toEqual(['header']);
  });

  it('exposes exactly the 6 scopes of the openai_review_invoicing_v1 preset', async () => {
    // Espejo de OPENAI_REVIEW_INVOICING_V1_SCOPE_SET en apps/app
    // (lib/integrations/holdedMcpScopes.ts). Si cambia el preset público en
    // apps/app, este test falla → forzar sincronización. Histórico
    // 2026-05-18: antes incluía accounts.write, crm.read, projects.read
    // (preset openai_review_v2 viejo, 14 tools); ahora estrechado a 6 scopes
    // para 10 tools (invoicing venta+compra + contactos + contabilidad).
    const request = new NextRequest(
      'https://holded.verifactu.business/.well-known/oauth-protected-resource/api/mcp/holded'
    );
    const response = await GET(request);
    const body = await response.json();

    expect(body.scopes_supported).toEqual([
      'mcp.read',
      'holded.invoices.read',
      'holded.invoices.write',
      'holded.documents.read',
      'holded.contacts.read',
      'holded.accounts.read',
    ]);

    // Defensa adicional: ningún scope eliminado del preset debe aparecer aquí.
    const REMOVED = ['holded.accounts.write', 'holded.crm.read', 'holded.projects.read'];
    for (const scope of REMOVED) {
      expect(body.scopes_supported).not.toContain(scope);
    }
  });
});
