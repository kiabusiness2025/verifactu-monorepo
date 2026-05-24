import { buildReadOnlyToolsForContext, type IsaakToolContext } from '../isaak-tools-registry';

function ctx(overrides: Partial<IsaakToolContext> = {}): IsaakToolContext {
  return {
    tenantId: 'tenant-1',
    userId: 'user-1',
    holdedApiKey: null,
    holdedConnected: false,
    bankConnected: false,
    googleConnected: false,
    microsoftConnected: false,
    ...overrides,
  };
}

describe('buildReadOnlyToolsForContext', () => {
  it('returns empty when no integration is connected', () => {
    expect(buildReadOnlyToolsForContext(ctx())).toEqual([]);
  });

  it('excludes Holded tools if no apiKey, even when holdedConnected=true', () => {
    const tools = buildReadOnlyToolsForContext(
      ctx({ holdedConnected: true, holdedApiKey: null })
    );
    expect(tools).toEqual([]);
  });

  it('includes Holded read-only tools when api key is present', () => {
    const tools = buildReadOnlyToolsForContext(
      ctx({ holdedConnected: true, holdedApiKey: 'sk-test' })
    );
    const names = tools.map((t) => t.name);
    expect(names).toContain('holded_list_documents');
    expect(names).toContain('holded_get_pnl');
    expect(names).toContain('holded_get_verifactu_status');
  });

  it('excludes Holded write tools (create_invoice, register_payment, ...)', () => {
    const tools = buildReadOnlyToolsForContext(
      ctx({ holdedConnected: true, holdedApiKey: 'sk-test' })
    );
    const names = tools.map((t) => t.name);
    expect(names).not.toContain('holded_create_invoice');
    expect(names).not.toContain('holded_register_payment');
    expect(names).not.toContain('holded_create_contact');
    expect(names).not.toContain('holded_send_document');
  });

  it('includes banking read tools when bankConnected=true', () => {
    const tools = buildReadOnlyToolsForContext(ctx({ bankConnected: true }));
    const names = tools.map((t) => t.name);
    expect(names).toContain('banking_list_accounts');
    expect(names).toContain('banking_list_transactions');
    expect(names).toContain('banking_get_cash_summary');
  });

  it('includes google read tools but no calendar create/update/delete', () => {
    const tools = buildReadOnlyToolsForContext(ctx({ googleConnected: true }));
    const names = tools.map((t) => t.name);
    expect(names).toContain('google_calendar_list_events');
    expect(names).toContain('google_gmail_scan_invoices');
    expect(names).not.toContain('google_calendar_create_event');
    expect(names).not.toContain('google_calendar_update_event');
    expect(names).not.toContain('google_calendar_delete_event');
    expect(names).not.toContain('google_gmail_archive');
  });

  it('includes microsoft read tools but no calendar create/update/delete or mail send', () => {
    const tools = buildReadOnlyToolsForContext(ctx({ microsoftConnected: true }));
    const names = tools.map((t) => t.name);
    expect(names).toContain('microsoft_calendar_list_events');
    expect(names).toContain('microsoft_mail_scan_invoices');
    expect(names).not.toContain('microsoft_calendar_create_event');
    expect(names).not.toContain('microsoft_mail_send');
    expect(names).not.toContain('microsoft_mail_archive');
  });

  it('filters by category list when options.only is provided', () => {
    const fullCtx = ctx({
      holdedConnected: true,
      holdedApiKey: 'sk',
      bankConnected: true,
      googleConnected: true,
      microsoftConnected: true,
    });
    const onlyBanking = buildReadOnlyToolsForContext(fullCtx, { only: ['banking'] });
    const names = onlyBanking.map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(['banking_list_accounts']));
    expect(names.every((n) => n.startsWith('banking_'))).toBe(true);
    expect(onlyBanking.length).toBe(6);
  });

  it('filtering across two categories returns sum of both', () => {
    const fullCtx = ctx({
      holdedConnected: true,
      holdedApiKey: 'sk',
      bankConnected: true,
      googleConnected: true,
      microsoftConnected: true,
    });
    const subset = buildReadOnlyToolsForContext(fullCtx, { only: ['holded', 'banking'] });
    expect(subset.length).toBe(13 + 6);
  });

  it('empty options.only is treated as no filter', () => {
    const fullCtx = ctx({
      holdedConnected: true,
      holdedApiKey: 'sk',
      bankConnected: true,
      googleConnected: true,
      microsoftConnected: true,
    });
    const allTools = buildReadOnlyToolsForContext(fullCtx);
    const withEmpty = buildReadOnlyToolsForContext(fullCtx, { only: [] });
    expect(withEmpty.length).toBe(allTools.length);
  });

  it('combines all categories when everything is connected', () => {
    const tools = buildReadOnlyToolsForContext(
      ctx({
        holdedConnected: true,
        holdedApiKey: 'sk',
        bankConnected: true,
        googleConnected: true,
        microsoftConnected: true,
      })
    );
    // 13 Holded + 6 banking + 4 google + 4 microsoft = 27
    expect(tools.length).toBe(27);
    // each tool exposes the Anthropic-compatible shape
    for (const t of tools) {
      expect(typeof t.name).toBe('string');
      expect(typeof t.input_schema).toBe('object');
    }
  });
});
