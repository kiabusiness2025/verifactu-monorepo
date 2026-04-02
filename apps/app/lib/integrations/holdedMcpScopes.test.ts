/** @jest-environment node */

import {
  HOLDED_MCP_SUPPORTED_SCOPES,
  HOLDED_MCP_TOOL_SCOPES,
  buildScopeString,
  getAllowedHoldedMcpToolNames,
  getHoldedMcpScopePreset,
} from './holdedMcpScopes';
import { holdedMcpTools } from './holdedMcpTools';

describe('holdedMcpScopes', () => {
  it('keeps every referenced scope inside the supported scope catalog', () => {
    const supportedScopes = new Set<string>(HOLDED_MCP_SUPPORTED_SCOPES);

    for (const [toolName, requiredScopes] of Object.entries(HOLDED_MCP_TOOL_SCOPES)) {
      expect(requiredScopes[0]).toBe('mcp.read');

      for (const scope of requiredScopes) {
        expect(supportedScopes.has(scope)).toBe(true);
      }

      expect(requiredScopes.length).toBeGreaterThan(1);
      expect(toolName).toMatch(/^holded_/);
    }
  });

  it('keeps the full preset aligned with the published MCP tool catalog', () => {
    const fullScopeString = buildScopeString(getHoldedMcpScopePreset('full'));
    const fullToolNames = [...getAllowedHoldedMcpToolNames(fullScopeString)].sort();
    const catalogToolNames = [...holdedMcpTools.map((tool) => tool.name)].sort();

    expect(fullScopeString.split(' ')).toHaveLength(HOLDED_MCP_SUPPORTED_SCOPES.length);
    expect(fullToolNames).toEqual(catalogToolNames);
  });

  it('keeps the readonly preset limited to read-only tools', () => {
    const readonlyToolNames = new Set(
      getAllowedHoldedMcpToolNames(getHoldedMcpScopePreset('readonly'))
    );

    for (const [toolName, requiredScopes] of Object.entries(HOLDED_MCP_TOOL_SCOPES)) {
      const requiresWriteScope = requiredScopes.some((scope) => scope.endsWith('.write'));
      expect(readonlyToolNames.has(toolName)).toBe(!requiresWriteScope);
    }
  });

  it('keeps invoicing_accounting aligned with the extended operational scopes', () => {
    const scopes = getHoldedMcpScopePreset('invoicing_accounting');
    const toolNames = getAllowedHoldedMcpToolNames(scopes);

    expect(scopes).toEqual(
      expect.arrayContaining([
        'holded.contacts.attachments.read',
        'holded.accounts.write',
        'holded.products.media.read',
        'holded.payments.write',
      ])
    );
    expect(scopes).not.toContain('holded.crm.read');
    expect(scopes).not.toContain('holded.projects.read');
    expect(scopes).not.toContain('holded.saleschannels.read');
    expect(scopes).not.toContain('holded.warehouses.read');
    expect(scopes).not.toContain('holded.contactgroups.read');

    expect(toolNames).toEqual(
      expect.arrayContaining([
        'holded_send_document',
        'holded_pay_document',
        'holded_update_document_tracking',
        'holded_update_document_pipeline',
        'holded_ship_document_all_items',
        'holded_ship_document_by_lines',
        'holded_attach_document_file',
        'holded_list_contact_attachments',
        'holded_get_contact_attachment',
        'holded_get_product_main_image',
        'holded_list_product_images',
        'holded_get_product_secondary_image',
        'holded_update_product_stock',
        'holded_list_daily_ledger',
        'holded_create_daily_ledger_entry',
        'holded_create_accounting_account',
      ])
    );
    expect(toolNames).not.toContain('holded_list_bookings');
    expect(toolNames).not.toContain('holded_list_projects');
    expect(toolNames).not.toContain('holded_list_warehouse_stock');
    expect(toolNames).not.toContain('holded_create_contact_group');
  });
});
