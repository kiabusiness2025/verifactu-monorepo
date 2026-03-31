/** @jest-environment node */

jest.mock('./accounting', () => ({
  holdedAdapter: {
    listDocuments: jest.fn(),
    createContact: jest.fn(),
    listProjectTasks: jest.fn(),
  },
}));

import { holdedAdapter } from './accounting';
import {
  HOLDED_MCP_TOOL_SCOPES,
  buildScopeString,
  getAllowedHoldedMcpToolNames,
  getHoldedMcpScopePreset,
} from './holdedMcpScopes';
import { callHoldedMcpTool, holdedMcpTools } from './holdedMcpTools';

const mockedHoldedAdapter = holdedAdapter as unknown as {
  listDocuments: jest.Mock;
  createContact: jest.Mock;
  listProjectTasks: jest.Mock;
};

describe('holdedMcpTools', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('includes the validated invoicing tools in the MCP catalog', () => {
    const names = holdedMcpTools.map((tool) => tool.name);

    expect(names).toEqual(
      expect.arrayContaining([
        'holded_list_documents',
        'holded_create_contact',
        'holded_list_treasury_accounts',
        'holded_list_expense_accounts',
        'holded_list_products',
        'holded_list_sales_channels',
        'holded_list_warehouses',
        'holded_list_payments',
        'holded_list_taxes',
        'holded_list_contact_groups',
        'holded_list_remittances',
        'holded_list_services',
      ])
    );
  });

  it('keeps the scope map aligned with the MCP tool catalog', () => {
    const toolNames = [...holdedMcpTools.map((tool) => tool.name)].sort();
    const scopedToolNames = [...Object.keys(HOLDED_MCP_TOOL_SCOPES)].sort();

    expect(scopedToolNames).toEqual(toolNames);
  });

  it('builds the full OpenAI scope string without duplicates', () => {
    const scopes = buildScopeString(getHoldedMcpScopePreset('full'));

    expect(scopes).toContain('mcp.read');
    expect(scopes).toContain('holded.documents.write');
    expect(scopes).toContain('holded.projects.read');
    expect(scopes.split(' ').length).toBe(new Set(scopes.split(' ')).size);
  });

  it('grants invoices and accounting by default without opening unrelated modules', () => {
    const scopes = getHoldedMcpScopePreset('invoicing_accounting');
    const toolNames = getAllowedHoldedMcpToolNames(scopes);

    expect(scopes).toEqual(
      expect.arrayContaining([
        'mcp.read',
        'holded.invoices.write',
        'holded.documents.write',
        'holded.accounts.read',
        'holded.treasury.write',
        'holded.expenses.write',
        'holded.numbering.write',
        'holded.payments.write',
      ])
    );
    expect(scopes).not.toContain('holded.crm.read');
    expect(scopes).not.toContain('holded.projects.read');
    expect(scopes).not.toContain('holded.saleschannels.write');
    expect(scopes).not.toContain('holded.warehouses.write');

    expect(toolNames).toEqual(
      expect.arrayContaining([
        'holded_list_documents',
        'holded_create_document',
        'holded_create_contact',
        'holded_list_accounts',
        'holded_update_treasury_account',
        'holded_create_expense_account',
        'holded_update_numbering_series',
        'holded_create_payment',
      ])
    );
    expect(toolNames).not.toContain('holded_list_bookings');
    expect(toolNames).not.toContain('holded_list_projects');
    expect(toolNames).not.toContain('holded_create_sales_channel');
    expect(toolNames).not.toContain('holded_update_warehouse');
    expect(toolNames).not.toContain('holded_create_contact_group');
  });

  it('routes list document calls through the shared Holded adapter', async () => {
    mockedHoldedAdapter.listDocuments.mockResolvedValue([{ id: 'doc-1' }]);

    const result = await callHoldedMcpTool('demo-key', 'holded_list_documents', {
      page: 2,
      limit: 10,
      docType: 'estimate',
    });

    expect(mockedHoldedAdapter.listDocuments).toHaveBeenCalledWith('demo-key', {
      page: 2,
      limit: 10,
      status: undefined,
      docType: 'estimate',
    });
    expect(result).toEqual({ items: [{ id: 'doc-1' }] });
  });

  it('requires confirm=true for write tools', async () => {
    await expect(
      callHoldedMcpTool('demo-key', 'holded_create_contact', {
        payload: { name: 'Demo Contact' },
      })
    ).rejects.toThrow('confirm=true is required for write operations');
  });

  it('requires projectId for project task listing', async () => {
    await expect(callHoldedMcpTool('demo-key', 'holded_list_project_tasks', {})).rejects.toThrow(
      'projectId is required'
    );
  });
});
