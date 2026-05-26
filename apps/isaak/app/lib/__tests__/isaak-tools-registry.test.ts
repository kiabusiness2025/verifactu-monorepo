import {
  buildReadOnlyToolsForContext,
  isWriteToolName,
  type IsaakToolContext,
} from '../isaak-tools-registry';

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
  it('returns only the ledger reads (audit) when no external integration is connected', () => {
    // Ledger tools are internal infrastructure — they need no external
    // OAuth/API connection, only an authenticated tenant. After F11 fase 3
    // the audit read tool is always present.
    const tools = buildReadOnlyToolsForContext(ctx());
    const names = tools.map((t) => t.name);
    expect(names.sort()).toEqual([
      'inspector_search_aeat',
      'isaak_audit_ledger',
      'isaak_export_ledger_excel',
      'isaak_get_fiscal_profile',
      'isaak_ledger_get_balances',
      'isaak_list_aeat_census_changes',
      'isaak_list_aeat_notifications',
      'isaak_list_tax_returns',
      'isaak_summarize_aeat_inbox',
      'isaak_validate_vat_intracom',
    ]);
  });

  it('excludes Holded tools if no apiKey, even when holdedConnected=true (only ledger reads remain)', () => {
    const tools = buildReadOnlyToolsForContext(
      ctx({ holdedConnected: true, holdedApiKey: null })
    );
    expect(tools.map((t) => t.name).sort()).toEqual([
      'inspector_search_aeat',
      'isaak_audit_ledger',
      'isaak_export_ledger_excel',
      'isaak_get_fiscal_profile',
      'isaak_ledger_get_balances',
      'isaak_list_aeat_census_changes',
      'isaak_list_aeat_notifications',
      'isaak_list_tax_returns',
      'isaak_summarize_aeat_inbox',
      'isaak_validate_vat_intracom',
    ]);
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

  describe('writes (F4)', () => {
    it('isWriteToolName flags Holded write tools', () => {
      expect(isWriteToolName('holded_create_invoice')).toBe(true);
      expect(isWriteToolName('holded_register_payment')).toBe(true);
      expect(isWriteToolName('holded_create_contact')).toBe(true);
      expect(isWriteToolName('holded_send_document')).toBe(true);
    });

    it('isWriteToolName returns false for reads', () => {
      expect(isWriteToolName('holded_list_documents')).toBe(false);
      expect(isWriteToolName('banking_list_accounts')).toBe(false);
      expect(isWriteToolName('unknown_tool')).toBe(false);
    });

    it('allowWrites=false excludes write tools (default)', () => {
      const tools = buildReadOnlyToolsForContext(
        ctx({ holdedConnected: true, holdedApiKey: 'sk' })
      );
      const names = tools.map((t) => t.name);
      expect(names).not.toContain('holded_create_invoice');
      expect(names).not.toContain('holded_register_payment');
    });

    it('allowWrites=true includes Holded write tools', () => {
      const tools = buildReadOnlyToolsForContext(
        ctx({ holdedConnected: true, holdedApiKey: 'sk' }),
        { allowWrites: true }
      );
      const names = tools.map((t) => t.name);
      expect(names).toContain('holded_create_invoice');
      expect(names).toContain('holded_register_payment');
      expect(names).toContain('holded_create_contact');
      expect(names).toContain('holded_send_document');
    });

    it('allowWrites=true plus category filter still narrows correctly', () => {
      const tools = buildReadOnlyToolsForContext(
        ctx({
          holdedConnected: true,
          holdedApiKey: 'sk',
          bankConnected: true,
        }),
        { only: ['banking'], allowWrites: true }
      );
      const names = tools.map((t) => t.name);
      expect(names.every((n) => n.startsWith('banking_'))).toBe(true);
    });
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
    // 13 Holded + 6 banking + 4 google + 4 microsoft + 10 ledger reads
    // (audit + export + get_fiscal_profile + ledger_get_balances +
    // list_tax_returns + list_aeat_notifications + list_aeat_census_changes +
    // summarize_aeat_inbox + validate_vat_intracom + inspector_search_aeat)
    // = 37 (writes excluded)
    expect(tools.length).toBe(37);
    // each tool exposes the Anthropic-compatible shape
    for (const t of tools) {
      expect(typeof t.name).toBe('string');
      expect(typeof t.input_schema).toBe('object');
    }
  });

  describe('ledger (F9)', () => {
    it('isWriteToolName flags ledger writes', () => {
      expect(isWriteToolName('isaak_ledger_create_entry')).toBe(true);
      expect(isWriteToolName('isaak_ledger_import_holded')).toBe(true);
    });

    it('without allowWrites only exposes the 10 ledger READS', () => {
      const tools = buildReadOnlyToolsForContext(ctx(), { only: ['ledger'] });
      expect(tools.map((t) => t.name).sort()).toEqual([
        'inspector_search_aeat',
        'isaak_audit_ledger',
        'isaak_export_ledger_excel',
        'isaak_get_fiscal_profile',
        'isaak_ledger_get_balances',
        'isaak_list_aeat_census_changes',
        'isaak_list_aeat_notifications',
        'isaak_list_tax_returns',
        'isaak_summarize_aeat_inbox',
        'isaak_validate_vat_intracom',
      ]);
    });

    it('with allowWrites=true and only=["ledger"] exposes 10 reads + 6 writes', () => {
      const tools = buildReadOnlyToolsForContext(ctx(), {
        only: ['ledger'],
        allowWrites: true,
      });
      const names = tools.map((t) => t.name).sort();
      expect(names).toEqual([
        'inspector_search_aeat',
        'isaak_audit_ledger',
        'isaak_compute_303_draft',
        'isaak_export_ledger_excel',
        'isaak_get_fiscal_profile',
        'isaak_ledger_create_entry',
        'isaak_ledger_get_balances',
        'isaak_ledger_import_holded',
        'isaak_list_aeat_census_changes',
        'isaak_list_aeat_notifications',
        'isaak_list_tax_returns',
        'isaak_record_tax_return',
        'isaak_set_fiscal_profile',
        'isaak_summarize_aeat_inbox',
        'isaak_sync_aeat_sede',
        'isaak_validate_vat_intracom',
      ]);
    });

    it('ledger tools do not require any connection flag (gated only by auth)', () => {
      const tools = buildReadOnlyToolsForContext(ctx(), {
        only: ['ledger'],
        allowWrites: true,
      });
      expect(tools.length).toBe(16);
    });

    it('combining ledger + holded gates work independently', () => {
      const tools = buildReadOnlyToolsForContext(
        ctx({ holdedConnected: true, holdedApiKey: 'sk' }),
        { only: ['ledger', 'holded'], allowWrites: true }
      );
      const names = tools.map((t) => t.name);
      expect(names).toContain('isaak_ledger_create_entry');
      expect(names).toContain('isaak_ledger_import_holded');
      expect(names).toContain('holded_create_invoice');
      expect(names).toContain('holded_list_documents');
    });
  });
});
