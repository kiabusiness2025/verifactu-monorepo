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

// ────────────────────────────────────────────────────────────────────────
// F11 fase 2b — tests para las 18 reglas adicionales
// ────────────────────────────────────────────────────────────────────────

describe('R005 — IVA deducido sin factura válida', () => {
  it('error si description sugiere ticket/recibo y hay IVA', () => {
    const ctx: RuleContext = {
      action: 'invoice_in',
      data: {
        amount: '121.00',
        vatAmount: '21.00',
        description: 'Ticket de supermercado para comida oficina',
        date: '2026-05-01',
      },
    };
    expect(withRule('R005', ctx).errors).toHaveLength(1);
  });
  it('no aplica si no se menciona ticket/recibo', () => {
    const ctx: RuleContext = {
      action: 'invoice_in',
      data: {
        amount: '121.00',
        vatAmount: '21.00',
        description: 'Factura de hosting',
        date: '2026-05-01',
      },
    };
    expect(withRule('R005', ctx).errors).toHaveLength(0);
  });
});

describe('R006 — IVA deducido antes de recibir factura', () => {
  it('warning si recibida después de la operación', () => {
    const ctx: RuleContext = {
      action: 'invoice_in',
      data: {
        amount: '121.00',
        vatAmount: '21.00',
        description: 'Servicios',
        date: '2026-05-01',
        receivedDate: '2026-06-10',
      },
    };
    expect(withRule('R006', ctx).warnings).toHaveLength(1);
  });
  it('no aplica si no hay receivedDate', () => {
    expect(withRule('R006', invoiceInCtx()).warnings).toHaveLength(0);
  });
});

describe('R007 — Gasto descripción uso personal', () => {
  it('warning si description sugiere uso personal', () => {
    expect(
      withRule('R007', invoiceInCtx({ description: 'Compra material personal del socio' })).warnings,
    ).toHaveLength(1);
  });
  it('no aplica si description es profesional', () => {
    expect(withRule('R007', invoiceInCtx({ description: 'Software facturación' })).warnings).toHaveLength(0);
  });
});

describe('R009 — IVA fuera de plazo 4 años', () => {
  it('error si operación de hace más de 4 años con IVA', () => {
    const ctx: RuleContext = {
      action: 'invoice_in',
      data: {
        amount: '121.00',
        vatAmount: '21.00',
        description: 'Material',
        date: '2020-01-01',
      },
      now: new Date('2026-05-25T00:00:00Z'),
    };
    expect(withRule('R009', ctx).errors).toHaveLength(1);
  });
  it('no aplica si operación reciente', () => {
    const ctx: RuleContext = {
      action: 'invoice_in',
      data: { amount: '121.00', vatAmount: '21.00', description: 'x', date: '2025-12-01' },
      now: new Date('2026-05-25T00:00:00Z'),
    };
    expect(withRule('R009', ctx).errors).toHaveLength(0);
  });
});

describe('R016 — Servicio B2B sin IVA ni exención', () => {
  it('warning si emisión B2B con tipo 0 y sin justificación', () => {
    const ctx: RuleContext = {
      action: 'invoice_out',
      data: {
        amount: '500.00',
        description: 'Servicios consultoría',
        date: '2026-05-01',
        vatRate: '0',
        docType: 'invoice',
        recipientType: 'b2b',
      },
    };
    expect(withRule('R016', ctx).warnings).toHaveLength(1);
  });
  it('no aplica si la descripción menciona exención', () => {
    const ctx: RuleContext = {
      action: 'invoice_out',
      data: {
        amount: '500.00',
        description: 'Formación exenta Art. 20.Uno.9º LIVA',
        date: '2026-05-01',
        vatRate: '0',
        docType: 'invoice',
        recipientType: 'b2b',
      },
    };
    expect(withRule('R016', ctx).warnings).toHaveLength(0);
  });
});

describe('R017 — Intracom sin NIF-IVA', () => {
  it('warning si description menciona intracom y NIF sin prefijo país', () => {
    const ctx: RuleContext = {
      action: 'invoice_out',
      data: {
        amount: '1000.00',
        description: 'Entrega intracomunitaria a cliente Francia',
        date: '2026-05-01',
        vatRate: '0',
        counterpartyNif: 'B12345678',
        docType: 'invoice',
      },
    };
    expect(withRule('R017', ctx).warnings).toHaveLength(1);
  });
  it('no aplica si NIF parece NIF-IVA UE (DE...)', () => {
    const ctx: RuleContext = {
      action: 'invoice_out',
      data: {
        amount: '1000.00',
        description: 'Entrega intracomunitaria a cliente alemán',
        date: '2026-05-01',
        vatRate: '0',
        counterpartyNif: 'DE123456789',
        docType: 'invoice',
      },
    };
    expect(withRule('R017', ctx).warnings).toHaveLength(0);
  });
});

describe('R019 — ISP no identificada', () => {
  it('warning si sector con ISP típico y no mencionado en description', () => {
    const ctx: RuleContext = {
      action: 'invoice_out',
      data: {
        amount: '5000.00',
        description: 'Subcontrata obra de construcción residencial',
        date: '2026-05-01',
        vatRate: '0',
        docType: 'invoice',
      },
    };
    expect(withRule('R019', ctx).warnings).toHaveLength(1);
  });
  it('no aplica si description menciona ISP explícita', () => {
    const ctx: RuleContext = {
      action: 'invoice_out',
      data: {
        amount: '5000.00',
        description: 'Subcontrata construcción — Inversión sujeto pasivo Art. 84.Uno.2º',
        date: '2026-05-01',
        vatRate: '0',
        docType: 'invoice',
      },
    };
    expect(withRule('R019', ctx).warnings).toHaveLength(0);
  });
});

describe('R022 — Hostelería con tipo distinto del 10%', () => {
  it('warning si emisión hostelería al 21%', () => {
    expect(
      withRule('R022', invoiceOutCtx({ description: 'Menú hostelería del día', vatRate: '21' })).warnings,
    ).toHaveLength(1);
  });
  it('no aplica si tipo es 10%', () => {
    expect(
      withRule('R022', invoiceOutCtx({ description: 'Menú restaurante', vatRate: '10' })).warnings,
    ).toHaveLength(0);
  });
});

describe('R033 — Factura sin número', () => {
  it('error si docNumber es cadena vacía', () => {
    const r = withRule('R033', invoiceOutCtx());
    // docNumber undefined → skip
    expect(r.errors).toHaveLength(0);

    const r2 = withRule('R033', {
      ...invoiceOutCtx(),
      data: { ...(invoiceOutCtx() as { data: { amount: string } & Record<string, unknown> }).data, docNumber: '' as string },
    } as RuleContext);
    expect(r2.errors).toHaveLength(1);
  });
});

describe('R034 — NIF emisor', () => {
  it('error si emitterNif vacío', () => {
    const ctx: RuleContext = {
      action: 'invoice_out',
      data: {
        amount: '100.00',
        description: 'x',
        date: '2026-05-01',
        emitterNif: '',
        docType: 'invoice',
      },
    };
    expect(withRule('R034', ctx).errors).toHaveLength(1);
  });
  it('no aplica si emitterNif undefined (no tenemos el dato)', () => {
    expect(withRule('R034', invoiceOutCtx()).errors).toHaveLength(0);
  });
  it('no aplica si emitterNif válido (>=8 chars)', () => {
    const ctx: RuleContext = {
      action: 'invoice_out',
      data: {
        amount: '100.00',
        description: 'x',
        date: '2026-05-01',
        emitterNif: 'B12345678',
        docType: 'invoice',
      },
    };
    expect(withRule('R034', ctx).errors).toHaveLength(0);
  });
});

describe('R035 — NIF destinatario B2B', () => {
  it('error si B2B sin NIF del cliente', () => {
    const ctx: RuleContext = {
      action: 'invoice_out',
      data: {
        amount: '100.00',
        description: 'x',
        date: '2026-05-01',
        recipientType: 'b2b',
        docType: 'invoice',
      },
    };
    expect(withRule('R035', ctx).errors).toHaveLength(1);
  });
  it('no aplica a B2C', () => {
    const ctx: RuleContext = {
      action: 'invoice_out',
      data: {
        amount: '100.00',
        description: 'x',
        date: '2026-05-01',
        recipientType: 'b2c',
        docType: 'invoice',
      },
    };
    expect(withRule('R035', ctx).errors).toHaveLength(0);
  });
});

describe('R036 — Desglose base/tipo/cuota', () => {
  it('error si factura ordinaria sin base/tipo/cuota', () => {
    const ctx: RuleContext = {
      action: 'invoice_out',
      data: {
        amount: '121.00',
        description: 'x',
        date: '2026-05-01',
        docType: 'invoice',
        // sin vatBase / vatRate / vatAmount
      },
    };
    expect(withRule('R036', ctx).errors).toHaveLength(1);
  });
  it('no aplica si completo', () => {
    const ctx: RuleContext = {
      action: 'invoice_out',
      data: {
        amount: '121.00',
        vatBase: '100.00',
        vatRate: '21.00',
        vatAmount: '21.00',
        description: 'x',
        date: '2026-05-01',
        docType: 'invoice',
      },
    };
    expect(withRule('R036', ctx).errors).toHaveLength(0);
  });
});

describe('R039 — Rectificativa sin referencia', () => {
  it('error si rectificativa no indica factura origen', () => {
    const ctx: RuleContext = {
      action: 'invoice_out',
      data: {
        amount: '100.00',
        description: 'Anulación',
        date: '2026-05-01',
        docType: 'rectificativa',
      },
    };
    expect(withRule('R039', ctx).errors).toHaveLength(1);
  });
  it('no aplica si rectificativa con referencia', () => {
    const ctx: RuleContext = {
      action: 'invoice_out',
      data: {
        amount: '100.00',
        description: 'Anulación factura F-2025-100',
        date: '2026-05-01',
        docType: 'rectificativa',
        rectifiesDocNumber: 'F-2025-100',
      },
    };
    expect(withRule('R039', ctx).errors).toHaveLength(0);
  });
});

describe('R044 — Efectivo posiblemente fraccionado', () => {
  it('info si efectivo entre 900 y 999€', () => {
    expect(
      withRule('R044', invoiceInCtx({ amount: '950.00', paymentMethod: 'cash' })).infos,
    ).toHaveLength(1);
  });
  it('no aplica si <900€', () => {
    expect(
      withRule('R044', invoiceInCtx({ amount: '800.00', paymentMethod: 'cash' })).infos,
    ).toHaveLength(0);
  });
});

describe('R047 — Factura electrónica B2B (info)', () => {
  it('info siempre que emisor B2B', () => {
    const ctx: RuleContext = {
      action: 'invoice_out',
      data: {
        amount: '100.00',
        description: 'x',
        date: '2026-05-01',
        recipientType: 'b2b',
        docType: 'invoice',
      },
    };
    expect(withRule('R047', ctx).infos).toHaveLength(1);
  });
  it('no aplica a B2C', () => {
    const ctx: RuleContext = {
      action: 'invoice_out',
      data: {
        amount: '100.00',
        description: 'x',
        date: '2026-05-01',
        recipientType: 'b2c',
        docType: 'invoice',
      },
    };
    expect(withRule('R047', ctx).infos).toHaveLength(0);
  });
});

describe('R080 — Administrador IRPF 35%/19%', () => {
  it('warning si tipo intermedio (ej. 24%)', () => {
    const ctx: RuleContext = {
      action: 'payroll',
      data: {
        grossAmount: '5000.00',
        netAmount: '3800.00',
        irpfWithheld: '1200.00',
        period: '2026-05',
        role: 'administrator',
      },
      profile: { taxpayerType: 'sl' },
    };
    expect(withRule('R080', ctx).warnings).toHaveLength(1);
  });

  it('no aplica si retención = 35% (general)', () => {
    const ctx: RuleContext = {
      action: 'payroll',
      data: {
        grossAmount: '5000.00',
        netAmount: '3250.00',
        irpfWithheld: '1750.00',
        period: '2026-05',
        role: 'administrator',
      },
      profile: { taxpayerType: 'sl' },
    };
    expect(withRule('R080', ctx).warnings).toHaveLength(0);
  });

  it('no aplica si retención = 19% (entidad pequeña)', () => {
    const ctx: RuleContext = {
      action: 'payroll',
      data: {
        grossAmount: '5000.00',
        netAmount: '4050.00',
        irpfWithheld: '950.00',
        period: '2026-05',
        role: 'administrator',
      },
      profile: { taxpayerType: 'sl' },
    };
    expect(withRule('R080', ctx).warnings).toHaveLength(0);
  });

  it('no aplica a empleado normal', () => {
    const ctx: RuleContext = {
      action: 'payroll',
      data: {
        grossAmount: '2000.00',
        netAmount: '1700.00',
        irpfWithheld: '300.00',
        period: '2026-05',
        role: 'employee',
      },
      profile: { taxpayerType: 'sl' },
    };
    expect(withRule('R080', ctx).warnings).toHaveLength(0);
  });

  it('no aplica si perfil autónomo (regla scoped a SL/SA)', () => {
    const ctx: RuleContext = {
      action: 'payroll',
      data: {
        grossAmount: '5000.00',
        netAmount: '4500.00',
        irpfWithheld: '500.00',
        period: '2026-05',
        role: 'administrator',
      },
      profile: { taxpayerType: 'autonomo' },
    };
    const r = withRule('R080', ctx);
    expect(r.skippedByScope).toContain('R080');
  });
});

describe('R082 — Curso/conferencia retención 15%', () => {
  it('warning si description menciona conferencia', () => {
    expect(
      withRule('R082', invoiceInCtx({ description: 'Honorarios por conferencia en congreso' })).warnings,
    ).toHaveLength(1);
  });
});

describe('R125 — Multas/sanciones/donativos no deducibles', () => {
  it('warning si gasto menciona multa', () => {
    expect(
      withRule('R125', invoiceInCtx({ description: 'Multa de tráfico empresa' })).warnings,
    ).toHaveLength(1);
  });
  it('warning en asiento por donativo', () => {
    const ctx: RuleContext = {
      action: 'journal',
      data: { description: 'Donativo a fundación X', amount: '500.00' },
    };
    expect(withRule('R125', ctx).warnings).toHaveLength(1);
  });
  it('no aplica a gastos normales', () => {
    expect(
      withRule('R125', invoiceInCtx({ description: 'Material de oficina' })).warnings,
    ).toHaveLength(0);
  });
});

// ────────────────────────────────────────────────────────────────────────
// F11 fase 4b — sectoriales / territoriales
// ────────────────────────────────────────────────────────────────────────

describe('R220 — Construcción ISP obligatoria', () => {
  it('error si sector=construccion, B2B, IVA 0% y descripción sin ISP', () => {
    const ctx: RuleContext = {
      action: 'invoice_out',
      data: {
        amount: '5000.00',
        description: 'Subcontrata obra estructura edificio',
        date: '2026-05-01',
        vatRate: '0',
        recipientType: 'b2b',
        docType: 'invoice',
      },
      profile: { sector: 'construccion' },
    };
    expect(withRule('R220', ctx).errors).toHaveLength(1);
  });
  it('no aplica si la descripción incluye ISP explícita', () => {
    const ctx: RuleContext = {
      action: 'invoice_out',
      data: {
        amount: '5000.00',
        description: 'Subcontrata estructura — ISP Art. 84.Uno.2.f',
        date: '2026-05-01',
        vatRate: '0',
        recipientType: 'b2b',
        docType: 'invoice',
      },
      profile: { sector: 'construccion' },
    };
    expect(withRule('R220', ctx).errors).toHaveLength(0);
  });
  it('skipped si el perfil no es sector construcción', () => {
    const ctx: RuleContext = {
      action: 'invoice_out',
      data: {
        amount: '5000.00',
        description: 'Servicio',
        date: '2026-05-01',
        vatRate: '0',
        recipientType: 'b2b',
        docType: 'invoice',
      },
      profile: { sector: 'consultoria' },
    };
    expect(withRule('R220', ctx).skippedByScope).toContain('R220');
  });
});

describe('R230 — Alquiler vivienda exento IVA', () => {
  it('error si emisión de alquiler de vivienda con IVA repercutido', () => {
    expect(
      withRule(
        'R230',
        invoiceOutCtx({ description: 'Alquiler de vivienda mensual', vatRate: '21' }),
      ).errors,
    ).toHaveLength(1);
  });
  it('no aplica si tipo 0% (correcto)', () => {
    expect(
      withRule(
        'R230',
        invoiceOutCtx({ description: 'Alquiler de vivienda mensual', vatRate: '0' }),
      ).errors,
    ).toHaveLength(0);
  });
  it('no aplica si la descripción no menciona vivienda', () => {
    expect(
      withRule(
        'R230',
        invoiceOutCtx({ description: 'Alquiler local de negocio', vatRate: '21' }),
      ).errors,
    ).toHaveLength(0);
  });
});

describe('R300 — Canarias debe usar IGIC, no IVA peninsular', () => {
  it('error si tenant Canarias emite con IVA 21%', () => {
    const ctx: RuleContext = {
      action: 'invoice_out',
      data: {
        amount: '121.00',
        description: 'Servicio',
        date: '2026-05-01',
        vatRate: '21',
        docType: 'invoice',
      },
      profile: { territory: 'canarias' },
    };
    expect(withRule('R300', ctx).errors).toHaveLength(1);
  });
  it('no aplica si IVA 0 (no es claramente peninsular)', () => {
    const ctx: RuleContext = {
      action: 'invoice_out',
      data: {
        amount: '100.00',
        description: 'Servicio',
        date: '2026-05-01',
        vatRate: '0',
        docType: 'invoice',
      },
      profile: { territory: 'canarias' },
    };
    expect(withRule('R300', ctx).errors).toHaveLength(0);
  });
  it('skipped si tenant no es Canarias', () => {
    const ctx: RuleContext = {
      action: 'invoice_out',
      data: {
        amount: '121.00',
        description: 'Servicio',
        date: '2026-05-01',
        vatRate: '21',
        docType: 'invoice',
      },
      profile: { territory: 'comun' },
    };
    expect(withRule('R300', ctx).skippedByScope).toContain('R300');
  });
});

describe('R301 — País Vasco TicketBAI', () => {
  it('info siempre al emitir desde País Vasco', () => {
    const ctx: RuleContext = {
      action: 'invoice_out',
      data: {
        amount: '100.00',
        description: 'Servicio',
        date: '2026-05-01',
        vatRate: '21',
        docType: 'invoice',
      },
      profile: { territory: 'pais_vasco' },
    };
    expect(withRule('R301', ctx).infos).toHaveLength(1);
  });
  it('skipped si tenant no es País Vasco', () => {
    expect(
      withRule(
        'R301',
        invoiceOutCtx({ profile: { territory: 'comun' } }),
      ).skippedByScope,
    ).toContain('R301');
  });
});

describe('R302 — Navarra foral', () => {
  it('info si territorio Navarra emite factura', () => {
    const ctx: RuleContext = {
      action: 'invoice_out',
      data: {
        amount: '100.00',
        description: 'Servicio',
        date: '2026-05-01',
        vatRate: '21',
        docType: 'invoice',
      },
      profile: { territory: 'navarra' },
    };
    expect(withRule('R302', ctx).infos).toHaveLength(1);
  });
});

describe('R210 — Ecommerce B2C UE → OSS', () => {
  it('info si B2C y descripción menciona cliente UE', () => {
    const ctx: RuleContext = {
      action: 'invoice_out',
      data: {
        amount: '50.00',
        description: 'Venta UE a cliente Alemania',
        date: '2026-05-01',
        vatRate: '21',
        recipientType: 'b2c',
        docType: 'invoice',
      },
    };
    expect(withRule('R210', ctx).infos).toHaveLength(1);
  });
  it('no aplica si B2B (intracom va por VIES, no OSS)', () => {
    const ctx: RuleContext = {
      action: 'invoice_out',
      data: {
        amount: '500.00',
        description: 'Venta UE a cliente Alemania',
        date: '2026-05-01',
        vatRate: '0',
        recipientType: 'b2b',
        docType: 'invoice',
      },
    };
    expect(withRule('R210', ctx).infos).toHaveLength(0);
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
