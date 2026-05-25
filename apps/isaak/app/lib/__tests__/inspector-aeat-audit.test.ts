// Tests for F11 fase 2c — audit-time rules + snapshot aggregator.

import {
  AUDIT_RULES,
  R086_111_VS_FACTURAS,
  R087_115_VS_ALQUILERES,
  R100_303_EXPECTED,
  R101_111_EXPECTED,
  R102_115_EXPECTED,
  R106_349_EXPECTED,
  R128_PARTIDAS_PENDIENTES,
  R129_CAJA_NEGATIVA,
  R130_BANCOS_SIN_CONCILIAR,
  R131_FACTURAS_SIN_CONTABILIZAR,
} from '../inspector-aeat-audit-rules';
import {
  aggregateLedgerSnapshot,
  runAudit,
  runAuditWithAllRules,
} from '../inspector-aeat-audit';
import {
  evaluateContext,
  type AuditLedgerSnapshot,
  type RuleContext,
} from '../inspector-aeat';

function emptySnapshot(overrides: Partial<AuditLedgerSnapshot> = {}): AuditLedgerSnapshot {
  return {
    periodFrom: '2026-04-01',
    periodTo: '2026-06-30',
    vatRepercutidoTotal: '0.00',
    vatSoportadoTotal: '0.00',
    retentionsToProfessionals: '0.00',
    retentionsToLandlords: '0.00',
    retentionsToEmployees: '0.00',
    intracomOperationsCount: 0,
    presentedModels: [],
    cashBalance: '0.00',
    partnersBalance: '0.00',
    pendingAccountsBalance: '0.00',
    bankAccounts: [],
    unaccountedInvoicesInWithVat: 0,
    ...overrides,
  };
}

function auditCtx(snapshot: AuditLedgerSnapshot, now?: Date): RuleContext {
  return {
    action: 'audit',
    data: { scope: 'quarterly_close', snapshot },
    now,
  };
}

describe('R086 — 111 vs facturas profesionales/empleados', () => {
  it('error si gap entre lo retenido y lo declarado >0,5%', () => {
    const snap = emptySnapshot({
      retentionsToProfessionals: '1000.00',
      retentionsToEmployees: '500.00',
      presentedModels: [{ model: '111', period: 'Q2-2026', amountDeclared: '1000.00' }],
    });
    const r = evaluateContext([R086_111_VS_FACTURAS], auditCtx(snap));
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]?.message).toMatch(/gap/);
  });

  it('no aplica si declarado coincide', () => {
    const snap = emptySnapshot({
      retentionsToProfessionals: '500.00',
      retentionsToEmployees: '300.00',
      presentedModels: [{ model: '111', period: 'Q2-2026', amountDeclared: '800.00' }],
    });
    expect(evaluateContext([R086_111_VS_FACTURAS], auditCtx(snap)).errors).toHaveLength(0);
  });

  it('no aplica si no hay retenciones', () => {
    expect(evaluateContext([R086_111_VS_FACTURAS], auditCtx(emptySnapshot())).errors).toHaveLength(0);
  });
});

describe('R087 — 115 vs alquileres', () => {
  it('error si retenciones alquiler > declarado', () => {
    const snap = emptySnapshot({
      retentionsToLandlords: '760.00',
      presentedModels: [{ model: '115', period: 'Q2-2026', amountDeclared: '500.00' }],
    });
    expect(evaluateContext([R087_115_VS_ALQUILERES], auditCtx(snap)).errors).toHaveLength(1);
  });

  it('no aplica si declarado coincide', () => {
    const snap = emptySnapshot({
      retentionsToLandlords: '760.00',
      presentedModels: [{ model: '115', period: 'Q2-2026', amountDeclared: '760.00' }],
    });
    expect(evaluateContext([R087_115_VS_ALQUILERES], auditCtx(snap)).errors).toHaveLength(0);
  });
});

describe('R100 — Modelo 303 esperado', () => {
  it('warning si hay IVA y NO presentado', () => {
    const snap = emptySnapshot({
      vatRepercutidoTotal: '210.00',
      vatSoportadoTotal: '42.00',
    });
    expect(evaluateContext([R100_303_EXPECTED], auditCtx(snap)).warnings).toHaveLength(1);
  });

  it('no aplica si ya presentado', () => {
    const snap = emptySnapshot({
      vatRepercutidoTotal: '210.00',
      presentedModels: [{ model: '303', period: 'Q2-2026', amountDeclared: '210.00' }],
    });
    expect(evaluateContext([R100_303_EXPECTED], auditCtx(snap)).warnings).toHaveLength(0);
  });

  it('skipped si régimen recargo equivalencia (no presenta 303)', () => {
    const snap = emptySnapshot({ vatRepercutidoTotal: '210.00' });
    const ctx: RuleContext = {
      action: 'audit',
      data: { scope: 'quarterly_close', snapshot: snap },
      profile: { vatRegime: 'recargo_equivalencia' },
    };
    const r = evaluateContext([R100_303_EXPECTED], ctx);
    expect(r.skippedByScope).toContain('R100');
  });

  it('aplica si régimen general', () => {
    const snap = emptySnapshot({ vatRepercutidoTotal: '210.00' });
    const ctx: RuleContext = {
      action: 'audit',
      data: { scope: 'quarterly_close', snapshot: snap },
      profile: { vatRegime: 'general' },
    };
    expect(evaluateContext([R100_303_EXPECTED], ctx).warnings).toHaveLength(1);
  });
});

describe('R101 — Modelo 111 esperado', () => {
  it('error si retenciones >0 y no presentado', () => {
    const snap = emptySnapshot({ retentionsToProfessionals: '300.00' });
    expect(evaluateContext([R101_111_EXPECTED], auditCtx(snap)).errors).toHaveLength(1);
  });
  it('no aplica si presentado', () => {
    const snap = emptySnapshot({
      retentionsToEmployees: '300.00',
      presentedModels: [{ model: '111', period: 'Q2-2026', amountDeclared: '300.00' }],
    });
    expect(evaluateContext([R101_111_EXPECTED], auditCtx(snap)).errors).toHaveLength(0);
  });
});

describe('R102 — Modelo 115 esperado', () => {
  it('error si alquiler retención >0 y no presentado', () => {
    const snap = emptySnapshot({ retentionsToLandlords: '190.00' });
    expect(evaluateContext([R102_115_EXPECTED], auditCtx(snap)).errors).toHaveLength(1);
  });
});

describe('R106 — Modelo 349 esperado', () => {
  it('warning si hay operaciones intracom sin declarar', () => {
    const snap = emptySnapshot({ intracomOperationsCount: 3 });
    expect(evaluateContext([R106_349_EXPECTED], auditCtx(snap)).warnings).toHaveLength(1);
  });
  it('no aplica si declarado', () => {
    const snap = emptySnapshot({
      intracomOperationsCount: 3,
      presentedModels: [{ model: '349', period: 'Q2-2026', amountDeclared: '0' }],
    });
    expect(evaluateContext([R106_349_EXPECTED], auditCtx(snap)).warnings).toHaveLength(0);
  });
});

describe('R129 — Caja negativa', () => {
  it('error si saldo caja <0', () => {
    expect(evaluateContext([R129_CAJA_NEGATIVA], auditCtx(emptySnapshot({ cashBalance: '-50.00' }))).errors).toHaveLength(1);
  });
  it('no aplica si saldo >=0', () => {
    expect(evaluateContext([R129_CAJA_NEGATIVA], auditCtx(emptySnapshot({ cashBalance: '0.00' }))).errors).toHaveLength(0);
    expect(evaluateContext([R129_CAJA_NEGATIVA], auditCtx(emptySnapshot({ cashBalance: '500.00' }))).errors).toHaveLength(0);
  });
});

describe('R130 — Bancos sin conciliar', () => {
  it('warning si última conciliación >60 días', () => {
    const snap = emptySnapshot({
      bankAccounts: [{ account: 'BBVA', balance: '1000.00', lastReconciliationDate: '2026-01-01' }],
    });
    expect(
      evaluateContext([R130_BANCOS_SIN_CONCILIAR], auditCtx(snap, new Date('2026-06-01T00:00:00Z'))).warnings,
    ).toHaveLength(1);
  });
  it('warning si nunca conciliada', () => {
    const snap = emptySnapshot({
      bankAccounts: [{ account: 'Santander', balance: '500.00', lastReconciliationDate: null }],
    });
    expect(evaluateContext([R130_BANCOS_SIN_CONCILIAR], auditCtx(snap)).warnings).toHaveLength(1);
  });
  it('no aplica si conciliada recientemente', () => {
    const snap = emptySnapshot({
      bankAccounts: [{ account: 'BBVA', balance: '1000.00', lastReconciliationDate: '2026-05-15' }],
    });
    expect(
      evaluateContext([R130_BANCOS_SIN_CONCILIAR], auditCtx(snap, new Date('2026-06-01T00:00:00Z'))).warnings,
    ).toHaveLength(0);
  });
  it('no aplica si no hay cuentas', () => {
    expect(evaluateContext([R130_BANCOS_SIN_CONCILIAR], auditCtx(emptySnapshot())).warnings).toHaveLength(0);
  });
});

describe('R131 — Facturas recibidas sin contabilizar', () => {
  it('error si hay facturas pendientes', () => {
    expect(
      evaluateContext([R131_FACTURAS_SIN_CONTABILIZAR], auditCtx(emptySnapshot({ unaccountedInvoicesInWithVat: 3 }))).errors,
    ).toHaveLength(1);
  });
  it('no aplica si todo contabilizado', () => {
    expect(evaluateContext([R131_FACTURAS_SIN_CONTABILIZAR], auditCtx(emptySnapshot())).errors).toHaveLength(0);
  });
});

describe('R128 — Cuenta 555 saldo significativo', () => {
  it('warning si saldo |555| >= 100', () => {
    expect(evaluateContext([R128_PARTIDAS_PENDIENTES], auditCtx(emptySnapshot({ pendingAccountsBalance: '500.00' }))).warnings).toHaveLength(1);
    expect(evaluateContext([R128_PARTIDAS_PENDIENTES], auditCtx(emptySnapshot({ pendingAccountsBalance: '-250.00' }))).warnings).toHaveLength(1);
  });
  it('no aplica si saldo pequeño', () => {
    expect(evaluateContext([R128_PARTIDAS_PENDIENTES], auditCtx(emptySnapshot({ pendingAccountsBalance: '50.00' }))).warnings).toHaveLength(0);
  });
});

describe('AUDIT_RULES sanity', () => {
  it('todas las reglas tienen action audit en su scope', () => {
    for (const r of AUDIT_RULES) {
      expect(r.appliesTo.actions).toContain('audit');
    }
  });

  it('ids únicos', () => {
    const ids = AUDIT_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('runAudit', () => {
  it('corre el subset audit y devuelve un report con multiple violaciones', () => {
    const snap = emptySnapshot({
      cashBalance: '-100.00',
      pendingAccountsBalance: '500.00',
      unaccountedInvoicesInWithVat: 2,
      vatRepercutidoTotal: '210.00',
      bankAccounts: [{ account: 'BBVA', balance: '1000.00', lastReconciliationDate: null }],
    });
    const report = runAudit({ scope: 'quarterly_close', snapshot: snap, profile: { vatRegime: 'general' } });
    expect(report.errors.length).toBeGreaterThan(0);
    expect(report.warnings.length).toBeGreaterThan(0);
    // Inclusive: R100, R128, R129, R130, R131 deberían dispararse.
    const ids = [...report.errors, ...report.warnings].map((v) => v.ruleId);
    expect(ids).toContain('R129');
    expect(ids).toContain('R131');
    expect(ids).toContain('R130');
  });
});

describe('runAuditWithAllRules', () => {
  it('combina action-rules + audit-rules sin disparar las action-time en contexto audit', () => {
    const snap = emptySnapshot({ vatRepercutidoTotal: '100.00' });
    const report = runAuditWithAllRules({
      scope: 'quarterly_close',
      snapshot: snap,
      profile: { vatRegime: 'general', taxpayerType: 'sl' },
    });
    // No deberían firar reglas action-time como R001-R004
    const ids = [...report.errors, ...report.warnings, ...report.infos].map((v) => v.ruleId);
    expect(ids).not.toContain('R001');
    expect(ids).not.toContain('R030');
    // Sí debe fire R100 (303 expected)
    expect(ids).toContain('R100');
  });
});

describe('aggregateLedgerSnapshot', () => {
  it('suma IVA repercutido (invoice_out) y soportado (invoice_in)', () => {
    const out = aggregateLedgerSnapshot({
      ledgerRows: [
        { docType: 'invoice_out', amount: '1210.00', taxBase: '1000.00', vatAmount: '210.00', description: 'Venta', counterpartyNif: null, entryDate: '2026-05-01' },
        { docType: 'invoice_out', amount: '605.00', taxBase: '500.00', vatAmount: '105.00', description: 'Venta 2', counterpartyNif: null, entryDate: '2026-05-15' },
        { docType: 'invoice_in', amount: '121.00', taxBase: '100.00', vatAmount: '21.00', description: 'Compra', counterpartyNif: null, entryDate: '2026-05-20' },
      ],
      taxReturns: [],
      cashBalance: '0',
      partnersBalance: '0',
      pendingAccountsBalance: '0',
      bankAccounts: [],
      unaccountedInvoicesInWithVat: 0,
      periodFrom: '2026-04-01',
      periodTo: '2026-06-30',
    });
    expect(out.vatRepercutidoTotal).toBe('315.00');
    expect(out.vatSoportadoTotal).toBe('21.00');
  });

  it('infiere retenciones a profesionales por descripción + gap base+IVA-total', () => {
    const out = aggregateLedgerSnapshot({
      ledgerRows: [
        // Factura honorarios profesional: base 1000 + IVA 210 = 1210; total pagado 1060 → retención 150 (15%)
        {
          docType: 'invoice_in',
          amount: '1060.00',
          taxBase: '1000.00',
          vatAmount: '210.00',
          description: 'Honorarios abogado',
          counterpartyNif: null,
          entryDate: '2026-05-01',
        },
      ],
      taxReturns: [],
      cashBalance: '0',
      partnersBalance: '0',
      pendingAccountsBalance: '0',
      bankAccounts: [],
      unaccountedInvoicesInWithVat: 0,
      periodFrom: '2026-04-01',
      periodTo: '2026-06-30',
    });
    expect(Number.parseFloat(out.retentionsToProfessionals)).toBeCloseTo(150, 1);
  });

  it('detecta retención de alquileres', () => {
    const out = aggregateLedgerSnapshot({
      ledgerRows: [
        // Alquiler base 1000 + IVA 210 = 1210; total pagado 1020 → retención 190 (19%)
        {
          docType: 'invoice_in',
          amount: '1020.00',
          taxBase: '1000.00',
          vatAmount: '210.00',
          description: 'Alquiler local mensual',
          counterpartyNif: null,
          entryDate: '2026-05-01',
        },
      ],
      taxReturns: [],
      cashBalance: '0',
      partnersBalance: '0',
      pendingAccountsBalance: '0',
      bankAccounts: [],
      unaccountedInvoicesInWithVat: 0,
      periodFrom: '2026-04-01',
      periodTo: '2026-06-30',
    });
    expect(Number.parseFloat(out.retentionsToLandlords)).toBeCloseTo(190, 1);
  });

  it('cuenta operaciones intracom por keyword', () => {
    const out = aggregateLedgerSnapshot({
      ledgerRows: [
        { docType: 'invoice_out', amount: '500.00', taxBase: '500.00', vatAmount: '0', description: 'Servicio intracomunitario a DE', counterpartyNif: 'DE1', entryDate: '2026-05-01' },
        { docType: 'invoice_out', amount: '300.00', taxBase: '247.93', vatAmount: '52.07', description: 'Venta nacional', counterpartyNif: 'B1', entryDate: '2026-05-02' },
      ],
      taxReturns: [],
      cashBalance: '0',
      partnersBalance: '0',
      pendingAccountsBalance: '0',
      bankAccounts: [],
      unaccountedInvoicesInWithVat: 0,
      periodFrom: '2026-04-01',
      periodTo: '2026-06-30',
    });
    expect(out.intracomOperationsCount).toBe(1);
  });

  it('mapea tax returns a presentedModels', () => {
    const out = aggregateLedgerSnapshot({
      ledgerRows: [],
      taxReturns: [
        { model: '303', period: 'Q1-2026', amountDeclared: '500.00', presentedAt: '2026-04-15' },
      ],
      cashBalance: '0',
      partnersBalance: '0',
      pendingAccountsBalance: '0',
      bankAccounts: [],
      unaccountedInvoicesInWithVat: 0,
      periodFrom: '2026-01-01',
      periodTo: '2026-03-31',
    });
    expect(out.presentedModels).toHaveLength(1);
    expect(out.presentedModels[0]?.model).toBe('303');
  });
});
