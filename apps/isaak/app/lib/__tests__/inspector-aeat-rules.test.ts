// Per-rule unit tests for the F11 starter ruleset. Each rule gets:
//   * one POSITIVE scenario (rule fires with the expected severity)
//   * one NEGATIVE scenario (rule does not fire on a clean context)
//
// Rule logic lives in inspector-aeat-rules.ts; these tests are the
// safety net against silent regressions when adding more rules.

import { AEAT_RULES, findRuleById } from '../inspector-aeat-rules';
import { evaluateContext, type RuleContext } from '../inspector-aeat';

function withRule(id: string, ctx: RuleContext) {
  const rule = findRuleById(id);
  if (!rule) throw new Error(`Rule ${id} not found`);
  return evaluateContext([rule], ctx);
}

function invoiceInCtx(overrides: Partial<{
  description: string;
  amount: string;
  vatRate: string | null;
  paymentMethod: 'cash' | 'transfer' | 'card' | 'other';
  counterpartyName: string | null;
}> = {}): RuleContext {
  return {
    action: 'invoice_in',
    data: {
      description: 'Compra de papelería',
      amount: '50.00',
      vatRate: '21.00',
      paymentMethod: 'transfer',
      date: '2026-05-25',
      counterpartyName: null,
      ...overrides,
    },
  };
}

function invoiceOutCtx(overrides: Partial<{
  description: string;
  amount: string;
  vatRate: string | null;
  docType: 'invoice' | 'simplified';
}> = {}): RuleContext {
  return {
    action: 'invoice_out',
    data: {
      description: 'Servicios consultoría',
      amount: '1000.00',
      vatRate: '21.00',
      docType: 'invoice',
      date: '2026-05-25',
      ...overrides,
    },
  };
}

describe('R001 — Atenciones hostelería NO deducibles', () => {
  it('warns on restaurant expenses', () => {
    const r = withRule('R001', invoiceInCtx({ description: 'Comida con cliente en restaurante' }));
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]?.citation).toMatch(/96\./);
  });

  it('does not fire on unrelated expenses', () => {
    const r = withRule('R001', invoiceInCtx({ description: 'Material de oficina' }));
    expect(r.warnings).toHaveLength(0);
  });
});

describe('R002 — Combustible vehículo turismo 50%', () => {
  it('warns on diesel purchase', () => {
    const r = withRule('R002', invoiceInCtx({ description: 'Gasoil para coche' }));
    expect(r.warnings).toHaveLength(1);
  });

  it('does NOT warn on truck/industrial vehicle fuel', () => {
    const r = withRule('R002', invoiceInCtx({ description: 'Gasoil para camión de reparto' }));
    expect(r.warnings).toHaveLength(0);
  });

  it('does not fire on unrelated description', () => {
    const r = withRule('R002', invoiceInCtx({ description: 'Hosting AWS' }));
    expect(r.warnings).toHaveLength(0);
  });
});

describe('R003 — Adquisición vehículo turismo 50%', () => {
  it('warns when buying a passenger car', () => {
    const r = withRule('R003', invoiceInCtx({ description: 'Compra de coche para empresa' }));
    expect(r.warnings).toHaveLength(1);
  });

  it('does not fire for fuel (R002 territory)', () => {
    const r = withRule('R003', invoiceInCtx({ description: 'Gasolina coche' }));
    expect(r.warnings).toHaveLength(0);
  });
});

describe('R004 — Tipos IVA fuera del estándar', () => {
  it('warns on a non-standard rate', () => {
    const r = withRule('R004', invoiceInCtx({ vatRate: '15.50' }));
    expect(r.warnings).toHaveLength(1);
  });

  it('accepts 21, 10, 4, 0', () => {
    for (const rate of ['21.00', '10.00', '4.00', '0.00']) {
      const r = withRule('R004', invoiceInCtx({ vatRate: rate }));
      expect(r.warnings).toHaveLength(0);
    }
  });

  it('accepts the temporary 5% rate', () => {
    const r = withRule('R004', invoiceInCtx({ vatRate: '5.00' }));
    expect(r.warnings).toHaveLength(0);
  });

  it('skips when vatRate is null/missing', () => {
    const r = withRule('R004', invoiceInCtx({ vatRate: null }));
    expect(r.warnings).toHaveLength(0);
  });
});

describe('R010 — Honorarios profesional retención 15%', () => {
  it('warns on professional fees', () => {
    const r = withRule('R010', invoiceInCtx({ description: 'Honorarios abogado por contrato laboral' }));
    expect(r.warnings).toHaveLength(1);
  });

  it('does not fire on supplier purchases', () => {
    const r = withRule('R010', invoiceInCtx({ description: 'Compra de mercaderías' }));
    expect(r.warnings).toHaveLength(0);
  });
});

describe('R011 — Alquiler local retención 19%', () => {
  it('warns when description mentions alquiler', () => {
    const r = withRule('R011', invoiceInCtx({ description: 'Alquiler de local mensual' }));
    expect(r.warnings).toHaveLength(1);
  });

  it('does not fire on unrelated', () => {
    const r = withRule('R011', invoiceInCtx({ description: 'Suministros oficina' }));
    expect(r.warnings).toHaveLength(0);
  });
});

describe('R012 — Dividendos retención 19%', () => {
  it('warns when journal mentions dividendo', () => {
    const ctx: RuleContext = {
      action: 'journal',
      data: { description: 'Reparto de dividendos a socios', amount: '5000.00' },
    };
    const r = withRule('R012', ctx);
    expect(r.warnings).toHaveLength(1);
  });

  it('does not fire on unrelated journal', () => {
    const ctx: RuleContext = {
      action: 'journal',
      data: { description: 'Asiento de regularización', amount: '100.00' },
    };
    const r = withRule('R012', ctx);
    expect(r.warnings).toHaveLength(0);
  });
});

describe('R020 — Plazo modelo trimestral', () => {
  it('error si el plazo ya vencido', () => {
    const ctx: RuleContext = {
      action: 'tax_payment',
      data: { model: '303', period: 'Q1-2026', amount: '500.00' },
      now: new Date('2026-05-01T10:00:00Z'), // Q1 cierra el 20 abril, ya vencido
    };
    const r = withRule('R020', ctx);
    expect(r.errors).toHaveLength(1);
  });

  it('warning si quedan ≤7 días', () => {
    const ctx: RuleContext = {
      action: 'tax_payment',
      data: { model: '303', period: 'Q2-2026', amount: '500.00' },
      now: new Date('2026-07-15T10:00:00Z'), // Q2 vence el 20 julio
    };
    const r = withRule('R020', ctx);
    expect(r.warnings).toHaveLength(1);
  });

  it('no aplica si plazo está lejos', () => {
    const ctx: RuleContext = {
      action: 'tax_payment',
      data: { model: '303', period: 'Q3-2026', amount: '500.00' },
      now: new Date('2026-08-01T10:00:00Z'), // Q3 vence el 20 octubre
    };
    const r = withRule('R020', ctx);
    expect(r.errors).toHaveLength(0);
    expect(r.warnings).toHaveLength(0);
  });

  it('modelo 130 Q4 vence el 30 enero (no el 20)', () => {
    const ctx: RuleContext = {
      action: 'tax_payment',
      data: { model: '130', period: 'Q4-2025', amount: '300.00' },
      now: new Date('2026-01-25T10:00:00Z'), // quedan 5 días
    };
    const r = withRule('R020', ctx);
    expect(r.warnings).toHaveLength(1);
  });
});

describe('R030 — Efectivo >=1000€ prohibido', () => {
  it('error si pago efectivo >=1000€', () => {
    const r = withRule('R030', invoiceInCtx({ amount: '1500.00', paymentMethod: 'cash' }));
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]?.citation).toMatch(/7\/2012/);
  });

  it('error exacto en 1000€', () => {
    const r = withRule('R030', invoiceInCtx({ amount: '1000.00', paymentMethod: 'cash' }));
    expect(r.errors).toHaveLength(1);
  });

  it('no aplica si <1000€', () => {
    const r = withRule('R030', invoiceInCtx({ amount: '999.99', paymentMethod: 'cash' }));
    expect(r.errors).toHaveLength(0);
  });

  it('no aplica si transferencia aunque >1000€', () => {
    const r = withRule('R030', invoiceInCtx({ amount: '5000.00', paymentMethod: 'transfer' }));
    expect(r.errors).toHaveLength(0);
  });
});

describe('R031 — Factura simplificada >400€', () => {
  it('warning si simplificada >400€', () => {
    const r = withRule('R031', invoiceOutCtx({ amount: '500.00', docType: 'simplified' }));
    expect(r.warnings).toHaveLength(1);
  });

  it('no aplica a factura ordinaria', () => {
    const r = withRule('R031', invoiceOutCtx({ amount: '5000.00', docType: 'invoice' }));
    expect(r.warnings).toHaveLength(0);
  });

  it('no aplica si simplificada <=400€', () => {
    const r = withRule('R031', invoiceOutCtx({ amount: '400.00', docType: 'simplified' }));
    expect(r.warnings).toHaveLength(0);
  });
});

describe('R032 — Plazo emisión factura', () => {
  it('info siempre al emitir factura', () => {
    const r = withRule('R032', invoiceOutCtx());
    expect(r.infos).toHaveLength(1);
  });
});

describe('R040 — Verifactu obligación desde 2026', () => {
  it('info si fecha actual >= 2026', () => {
    const ctx: RuleContext = { ...invoiceOutCtx(), now: new Date('2026-06-01T00:00:00Z') };
    const r = withRule('R040', ctx);
    expect(r.infos).toHaveLength(1);
  });

  it('no aplica en 2025 (antes de la obligación)', () => {
    const ctx: RuleContext = { ...invoiceOutCtx(), now: new Date('2025-06-01T00:00:00Z') };
    const r = withRule('R040', ctx);
    expect(r.infos).toHaveLength(0);
  });
});

describe('R041 — Conservación facturas 4/6 años', () => {
  it('info al registrar factura recibida', () => {
    const r = withRule('R041', invoiceInCtx());
    expect(r.infos).toHaveLength(1);
  });
});

describe('R050 — Operaciones vinculadas', () => {
  it('warning si counterparty menciona socio/administrador', () => {
    const r = withRule(
      'R050',
      invoiceInCtx({ description: 'Servicios prestados por socio', counterpartyName: 'Juan Pérez (socio)' }),
    );
    expect(r.warnings).toHaveLength(1);
  });

  it('no aplica a counterparty externo', () => {
    const r = withRule(
      'R050',
      invoiceInCtx({ description: 'Servicios diseño web', counterpartyName: 'Acme SL' }),
    );
    expect(r.warnings).toHaveLength(0);
  });
});

describe('R060 — Recargo de equivalencia', () => {
  it('info si descripción menciona recargo de equivalencia', () => {
    const r = withRule('R060', invoiceOutCtx({ description: 'Factura venta con recargo de equivalencia' }));
    expect(r.infos).toHaveLength(1);
  });
});

describe('R070 — Asiento PGC sin cuentas', () => {
  it('warning si asiento no incluye debe y haber', () => {
    const ctx: RuleContext = {
      action: 'journal',
      data: { description: 'Ajuste regularización', amount: '100.00' },
    };
    const r = withRule('R070', ctx);
    expect(r.warnings).toHaveLength(1);
  });

  it('no aplica si ambas cuentas están informadas', () => {
    const ctx: RuleContext = {
      action: 'journal',
      data: { description: 'Venta', amount: '100.00', accountDebit: '430', accountCredit: '700' },
    };
    const r = withRule('R070', ctx);
    expect(r.warnings).toHaveLength(0);
  });
});

describe('AEAT_RULES — sanity', () => {
  it('todas las reglas tienen id único', () => {
    const ids = AEAT_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('todas las reglas citan normativa no vacía cuando aplican', () => {
    // Probamos con contextos sintéticos por cada action.
    const contexts: RuleContext[] = [
      invoiceInCtx({ description: 'Comida con cliente' }),
      invoiceOutCtx({ amount: '500.00', docType: 'simplified' }),
      { action: 'tax_payment', data: { model: '303', period: 'Q1-2026', amount: '100.00' }, now: new Date('2026-05-01T10:00:00Z') },
      { action: 'journal', data: { description: 'Reparto de dividendos', amount: '1000.00' } },
    ];
    for (const ctx of contexts) {
      const report = evaluateContext(AEAT_RULES, ctx);
      for (const v of [...report.errors, ...report.warnings, ...report.infos]) {
        expect(v.citation.length).toBeGreaterThan(3);
        expect(v.message.length).toBeGreaterThan(20);
      }
    }
  });

  it('cobertura de categorías: al menos 3 categorías cubiertas hoy', () => {
    const cats = new Set(AEAT_RULES.map((r) => r.category));
    expect(cats.size).toBeGreaterThanOrEqual(3);
  });
});
