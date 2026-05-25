// Per-rule unit tests for the F11 starter ruleset.

import { AEAT_RULES, findRuleById } from '../inspector-aeat-rules';
import { evaluateContext, type RuleContext, type TaxpayerProfileSnapshot } from '../inspector-aeat';

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
  profile: TaxpayerProfileSnapshot | null;
}> = {}): RuleContext {
  const { profile, ...rest } = overrides;
  return {
    action: 'invoice_in',
    data: {
      description: 'Compra de papelería',
      amount: '50.00',
      vatRate: '21.00',
      paymentMethod: 'transfer',
      date: '2026-05-25',
      counterpartyName: null,
      ...rest,
    },
    profile: profile ?? null,
  };
}

function invoiceOutCtx(overrides: Partial<{
  description: string;
  amount: string;
  vatRate: string | null;
  docType: 'invoice' | 'simplified' | 'rectificativa';
  profile: TaxpayerProfileSnapshot | null;
  now: Date;
}> = {}): RuleContext {
  const { profile, now, ...rest } = overrides;
  return {
    action: 'invoice_out',
    data: {
      description: 'Servicios consultoría',
      amount: '1000.00',
      vatRate: '21.00',
      docType: 'invoice',
      date: '2026-05-25',
      ...rest,
    },
    profile: profile ?? null,
    now,
  };
}

describe('R001 — Atenciones hostelería NO deducibles', () => {
  it('warns on restaurant expenses', () => {
    const r = withRule('R001', invoiceInCtx({ description: 'Comida con cliente en restaurante' }));
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]?.citation).toMatch(/96/);
    expect(r.warnings[0]?.legalBasis?.[0]?.law).toBe('LIVA');
  });

  it('does not fire on unrelated expenses', () => {
    expect(withRule('R001', invoiceInCtx({ description: 'Material de oficina' })).warnings).toHaveLength(0);
  });
});

describe('R002 — Combustible vehículo turismo 50%', () => {
  it('warns on diesel purchase', () => {
    expect(withRule('R002', invoiceInCtx({ description: 'Gasoil para coche' })).warnings).toHaveLength(1);
  });
  it('does NOT warn on truck/industrial', () => {
    expect(withRule('R002', invoiceInCtx({ description: 'Gasoil para camión de reparto' })).warnings).toHaveLength(0);
  });
});

describe('R003 — Adquisición vehículo turismo 50%', () => {
  it('warns when buying a passenger car', () => {
    expect(withRule('R003', invoiceInCtx({ description: 'Compra de coche para empresa' })).warnings).toHaveLength(1);
  });
  it('does not fire for fuel (R002 territory)', () => {
    expect(withRule('R003', invoiceInCtx({ description: 'Gasolina coche' })).warnings).toHaveLength(0);
  });
});

describe('R004 — Tipos IVA fuera del estándar', () => {
  it('warns on a non-standard rate', () => {
    expect(withRule('R004', invoiceInCtx({ vatRate: '15.50' })).warnings).toHaveLength(1);
  });
  it('accepts 21, 10, 4, 5, 0', () => {
    for (const rate of ['21.00', '10.00', '4.00', '5.00', '0.00']) {
      expect(withRule('R004', invoiceInCtx({ vatRate: rate })).warnings).toHaveLength(0);
    }
  });
  it('skips when vatRate is null/missing', () => {
    expect(withRule('R004', invoiceInCtx({ vatRate: null })).warnings).toHaveLength(0);
  });
});

describe('R010 — Honorarios profesional retención 15%', () => {
  it('warns on professional fees', () => {
    expect(withRule('R010', invoiceInCtx({ description: 'Honorarios abogado por contrato' })).warnings).toHaveLength(1);
  });
  it('does not fire on supplier purchases', () => {
    expect(withRule('R010', invoiceInCtx({ description: 'Compra de mercaderías' })).warnings).toHaveLength(0);
  });
});

describe('R011 — Alquiler local retención 19%', () => {
  it('warns when description mentions alquiler', () => {
    expect(withRule('R011', invoiceInCtx({ description: 'Alquiler de local mensual' })).warnings).toHaveLength(1);
  });
});

describe('R012 — Dividendos retención 19%', () => {
  it('warns when journal mentions dividendo', () => {
    const ctx: RuleContext = {
      action: 'journal',
      data: { description: 'Reparto de dividendos a socios', amount: '5000.00' },
    };
    expect(withRule('R012', ctx).warnings).toHaveLength(1);
  });
});

describe('R020 — Plazo modelo trimestral', () => {
  it('error si vencido', () => {
    const ctx: RuleContext = {
      action: 'tax_payment',
      data: { model: '303', period: 'Q1-2026', amount: '500.00' },
      now: new Date('2026-05-01T10:00:00Z'),
    };
    expect(withRule('R020', ctx).errors).toHaveLength(1);
  });
  it('warning si ≤7 días', () => {
    const ctx: RuleContext = {
      action: 'tax_payment',
      data: { model: '303', period: 'Q2-2026', amount: '500.00' },
      now: new Date('2026-07-15T10:00:00Z'),
    };
    expect(withRule('R020', ctx).warnings).toHaveLength(1);
  });
  it('modelo 130 Q4 vence el 30 enero', () => {
    const ctx: RuleContext = {
      action: 'tax_payment',
      data: { model: '130', period: 'Q4-2025', amount: '300.00' },
      now: new Date('2026-01-25T10:00:00Z'),
    };
    expect(withRule('R020', ctx).warnings).toHaveLength(1);
  });
});

describe('R030 — Efectivo >=1000€ prohibido', () => {
  it('error si pago efectivo >=1000€', () => {
    const r = withRule('R030', invoiceInCtx({ amount: '1500.00', paymentMethod: 'cash' }));
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]?.legalBasis?.[0]?.law).toBe('Ley 7/2012');
  });
  it('error exacto en 1000€', () => {
    expect(withRule('R030', invoiceInCtx({ amount: '1000.00', paymentMethod: 'cash' })).errors).toHaveLength(1);
  });
  it('no aplica si transferencia', () => {
    expect(withRule('R030', invoiceInCtx({ amount: '5000.00', paymentMethod: 'transfer' })).errors).toHaveLength(0);
  });
});

describe('R031 — Factura simplificada >400€', () => {
  it('warning si simplificada >400€', () => {
    expect(withRule('R031', invoiceOutCtx({ amount: '500.00', docType: 'simplified' })).warnings).toHaveLength(1);
  });
  it('no aplica a factura ordinaria', () => {
    expect(withRule('R031', invoiceOutCtx({ amount: '5000.00', docType: 'invoice' })).warnings).toHaveLength(0);
  });
});

describe('R032 — Plazo emisión', () => {
  it('info siempre al emitir factura', () => {
    expect(withRule('R032', invoiceOutCtx()).infos).toHaveLength(1);
  });
});

describe('R040A — Verifactu IS (deadline 2027-01-01)', () => {
  function slCtx(now: Date) {
    return invoiceOutCtx({
      profile: { taxpayerType: 'sl' },
      now,
    });
  }

  it('info si faltan >90 días al 01-01-2027 (mucho margen)', () => {
    const r = withRule('R040A', slCtx(new Date('2026-06-01T00:00:00Z')));
    expect(r.infos).toHaveLength(1);
    expect(r.infos[0]?.citation).toMatch(/RD-Ley 15\/2025/);
  });

  it('warning si quedan ≤90 días al 01-01-2027', () => {
    const r = withRule('R040A', slCtx(new Date('2026-11-15T00:00:00Z')));
    expect(r.warnings).toHaveLength(1);
  });

  it('error si plazo IS vencido', () => {
    const r = withRule('R040A', slCtx(new Date('2027-02-01T00:00:00Z')));
    expect(r.errors).toHaveLength(1);
  });

  it('no aplica si el perfil no es SL/SA/asociación/fundación', () => {
    const r = withRule(
      'R040A',
      invoiceOutCtx({ profile: { taxpayerType: 'autonomo' }, now: new Date('2026-06-01T00:00:00Z') }),
    );
    expect(r.infos).toHaveLength(0);
    expect(r.warnings).toHaveLength(0);
    expect(r.errors).toHaveLength(0);
    expect(r.skippedByScope).toContain('R040A');
  });
});

describe('R040B — Verifactu resto (deadline 2027-07-01)', () => {
  function autonomoCtx(now: Date) {
    return invoiceOutCtx({
      profile: { taxpayerType: 'autonomo' },
      now,
    });
  }

  it('info si faltan >90 días al 01-07-2027', () => {
    expect(withRule('R040B', autonomoCtx(new Date('2026-06-01T00:00:00Z'))).infos).toHaveLength(1);
  });

  it('warning si quedan ≤90 días', () => {
    expect(withRule('R040B', autonomoCtx(new Date('2027-05-15T00:00:00Z'))).warnings).toHaveLength(1);
  });

  it('error si plazo vencido', () => {
    expect(withRule('R040B', autonomoCtx(new Date('2027-08-01T00:00:00Z'))).errors).toHaveLength(1);
  });

  it('no aplica a SL (esa va por R040A con plazo distinto)', () => {
    const r = withRule(
      'R040B',
      invoiceOutCtx({ profile: { taxpayerType: 'sl' }, now: new Date('2026-06-01T00:00:00Z') }),
    );
    expect(r.skippedByScope).toContain('R040B');
  });
});

describe('R041 — Conservación facturas', () => {
  it('info al registrar factura recibida', () => {
    expect(withRule('R041', invoiceInCtx()).infos).toHaveLength(1);
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
});

describe('R060 — Recargo equivalencia', () => {
  it('info si descripción menciona recargo de equivalencia', () => {
    expect(withRule('R060', invoiceOutCtx({ description: 'Venta con recargo de equivalencia' })).infos).toHaveLength(1);
  });
});

describe('R070 — Asiento PGC sin cuentas', () => {
  it('warning si asiento no incluye debe y haber', () => {
    const ctx: RuleContext = {
      action: 'journal',
      data: { description: 'Ajuste regularización', amount: '100.00' },
    };
    expect(withRule('R070', ctx).warnings).toHaveLength(1);
  });
});

describe('AEAT_RULES — sanity', () => {
  it('todas las reglas tienen id único', () => {
    const ids = AEAT_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('todas las reglas declaran al menos una acción en appliesTo', () => {
    for (const r of AEAT_RULES) {
      expect(Array.isArray(r.appliesTo.actions)).toBe(true);
      expect(r.appliesTo.actions.length).toBeGreaterThan(0);
    }
  });

  it('todas las violaciones citan normativa válida', () => {
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

  it('R040 ya no existe (se sustituye por R040A y R040B)', () => {
    expect(findRuleById('R040')).toBeUndefined();
    expect(findRuleById('R040A')).toBeDefined();
    expect(findRuleById('R040B')).toBeDefined();
  });
});
