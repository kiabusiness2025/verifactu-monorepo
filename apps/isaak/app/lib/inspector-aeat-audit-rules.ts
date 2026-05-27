// F11 fase 2c — Audit-time rules.
//
// Reglas que NO se evalúan al crear un asiento, sino al revisar el
// estado completo de la contabilidad: cruces modelo ↔ facturas,
// saldos negativos, bancos sin conciliar, facturas pendientes, etc.
//
// Las reglas son PURAS: consumen `AuditLedgerSnapshot` y no tocan
// Prisma. La construcción del snapshot vive en
// `inspector-aeat-audit.ts` y es separable de la evaluación.

import type {
  AeatRule,
  AuditLedgerSnapshot,
  LegalBasis,
  PresentedTaxModel,
  RuleContext,
  RuleEvaluation,
} from './inspector-aeat';

const NO_APPLY: RuleEvaluation = { applies: false };

function auditOf(ctx: RuleContext): AuditLedgerSnapshot | null {
  if (ctx.action !== 'audit') return null;
  return ctx.data.snapshot;
}

function modelDeclared(
  presented: ReadonlyArray<PresentedTaxModel>,
  model: string
): boolean {
  return presented.some((p) => p.model === model);
}

function modelDeclaredAmount(
  presented: ReadonlyArray<PresentedTaxModel>,
  model: string
): number {
  let sum = 0;
  for (const p of presented) {
    if (p.model !== model) continue;
    const v = Number.parseFloat(p.amountDeclared);
    if (Number.isFinite(v)) sum += v;
  }
  return sum;
}

const URL_LIVA = 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740';
const URL_LIRPF = 'https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764';
const URL_LGT = 'https://www.boe.es/buscar/act.php?id=BOE-A-2003-23186';
const URL_CDGO_COMERCIO = 'https://www.boe.es/buscar/act.php?id=BOE-A-1885-6627';

// ─── Cruces modelo ↔ facturas/asientos ──────────────────────────────────

// R086 — Modelo 111 con base retenida inferior a las retenciones
// detectadas en facturas/nóminas del periodo.
export const R086_111_VS_FACTURAS: AeatRule = {
  id: 'R086',
  category: 'plazos_presentacion',
  description:
    'Cruce modelo 111 ↔ retenciones detectadas en facturas y nóminas del periodo.',
  appliesTo: { actions: ['audit'] },
  check: (ctx: RuleContext): RuleEvaluation => {
    const a = auditOf(ctx);
    if (!a) return NO_APPLY;
    const expected =
      Number.parseFloat(a.retentionsToProfessionals) +
      Number.parseFloat(a.retentionsToEmployees);
    if (!Number.isFinite(expected) || expected <= 0) return NO_APPLY;
    const declared = modelDeclaredAmount(a.presentedModels, '111');
    const tolerance = expected * 0.005;
    if (declared >= expected - tolerance) return NO_APPLY;
    const gap = expected - declared;
    return {
      applies: true,
      severity: 'error',
      message: `Modelo 111 con base retenida inferior a las retenciones detectadas: declarado ${declared.toFixed(2)}€, esperado ${expected.toFixed(2)}€ (gap ${gap.toFixed(2)}€). Sugiere infradeclaración.`,
      legalBasis: [{ law: 'LIRPF', article: 'Art. 99/101', url: URL_LIRPF }],
      recommendation:
        'Revisa las facturas de profesionales y nóminas del periodo. Si hay retenciones no incluidas en 111, presenta autoliquidación complementaria.',
    };
  },
};

// R087 — Modelo 115 incoherente con alquileres contabilizados
export const R087_115_VS_ALQUILERES: AeatRule = {
  id: 'R087',
  category: 'plazos_presentacion',
  description: 'Cruce modelo 115 ↔ retenciones por alquileres del periodo.',
  appliesTo: { actions: ['audit'] },
  check: (ctx: RuleContext): RuleEvaluation => {
    const a = auditOf(ctx);
    if (!a) return NO_APPLY;
    const expected = Number.parseFloat(a.retentionsToLandlords);
    if (!Number.isFinite(expected) || expected <= 0) return NO_APPLY;
    const declared = modelDeclaredAmount(a.presentedModels, '115');
    const tolerance = expected * 0.005;
    if (declared >= expected - tolerance) return NO_APPLY;
    return {
      applies: true,
      severity: 'error',
      message: `Modelo 115 incoherente: alquileres con retención en libros ${expected.toFixed(2)}€, declarado ${declared.toFixed(2)}€. Faltan retenciones por declarar.`,
      legalBasis: [{ law: 'Reglamento IRPF', article: 'Art. 100.2' }],
      recommendation: 'Presenta complementaria del 115 cubriendo el gap.',
    };
  },
};

// R100 — Modelo 303 esperado pero no presentado
export const R100_303_EXPECTED: AeatRule = {
  id: 'R100',
  category: 'plazos_presentacion',
  description:
    'Modelo 303 obligatorio si hay IVA repercutido o soportado en régimen general durante el periodo.',
  appliesTo: { actions: ['audit'], regime: ['general', 'criterio_caja', 'prorrata', 'sii'] },
  check: (ctx: RuleContext): RuleEvaluation => {
    const a = auditOf(ctx);
    if (!a) return NO_APPLY;
    const rep = Number.parseFloat(a.vatRepercutidoTotal);
    const sop = Number.parseFloat(a.vatSoportadoTotal);
    if (!Number.isFinite(rep) || !Number.isFinite(sop)) return NO_APPLY;
    if (rep === 0 && sop === 0) return NO_APPLY;
    if (modelDeclared(a.presentedModels, '303')) return NO_APPLY;
    return {
      applies: true,
      severity: 'warning',
      message: `Has tenido IVA en el periodo (repercutido ${rep.toFixed(2)}€, soportado ${sop.toFixed(2)}€) pero NO consta presentado el modelo 303.`,
      legalBasis: [
        { law: 'LIVA', article: 'Art. 164.Uno.6º', url: URL_LIVA },
        { law: 'LGT', article: 'Art. 27 (recargo extemporánea)', url: URL_LGT },
      ],
      recommendation: 'Presenta el 303 cuanto antes para minimizar recargo.',
    };
  },
};

// R101 — Modelo 111 esperado pero no presentado
export const R101_111_EXPECTED: AeatRule = {
  id: 'R101',
  category: 'plazos_presentacion',
  description: 'Modelo 111 obligatorio si hay retenciones a profesionales o nóminas.',
  appliesTo: { actions: ['audit'] },
  check: (ctx: RuleContext): RuleEvaluation => {
    const a = auditOf(ctx);
    if (!a) return NO_APPLY;
    const expected =
      Number.parseFloat(a.retentionsToProfessionals) +
      Number.parseFloat(a.retentionsToEmployees);
    if (!Number.isFinite(expected) || expected <= 0) return NO_APPLY;
    if (modelDeclared(a.presentedModels, '111')) return NO_APPLY;
    return {
      applies: true,
      severity: 'error',
      message: `Hay retenciones por ${expected.toFixed(2)}€ (profesionales + nóminas) pero NO consta presentado el modelo 111.`,
      legalBasis: [{ law: 'Reglamento IRPF', article: 'Art. 108', url: URL_LIRPF }],
      recommendation: 'Presenta 111 antes del día 20 del mes siguiente al trimestre.',
    };
  },
};

// R102 — Modelo 115 esperado pero no presentado
export const R102_115_EXPECTED: AeatRule = {
  id: 'R102',
  category: 'plazos_presentacion',
  description: 'Modelo 115 obligatorio si hay alquileres urbanos con retención.',
  appliesTo: { actions: ['audit'] },
  check: (ctx: RuleContext): RuleEvaluation => {
    const a = auditOf(ctx);
    if (!a) return NO_APPLY;
    const expected = Number.parseFloat(a.retentionsToLandlords);
    if (!Number.isFinite(expected) || expected <= 0) return NO_APPLY;
    if (modelDeclared(a.presentedModels, '115')) return NO_APPLY;
    return {
      applies: true,
      severity: 'error',
      message: `Tienes retenciones por alquileres por ${expected.toFixed(2)}€ pero NO consta modelo 115 presentado.`,
      legalBasis: [{ law: 'Reglamento IRPF', article: 'Art. 100', url: URL_LIRPF }],
    };
  },
};

// R106 — Modelo 349 esperado si hay operaciones intracom
export const R106_349_EXPECTED: AeatRule = {
  id: 'R106',
  category: 'comercio_exterior',
  description: 'Modelo 349 obligatorio si hay operaciones intracomunitarias en el periodo.',
  appliesTo: { actions: ['audit'] },
  check: (ctx: RuleContext): RuleEvaluation => {
    const a = auditOf(ctx);
    if (!a) return NO_APPLY;
    if (a.intracomOperationsCount <= 0) return NO_APPLY;
    if (modelDeclared(a.presentedModels, '349')) return NO_APPLY;
    return {
      applies: true,
      severity: 'warning',
      message: `Detectadas ${a.intracomOperationsCount} operaciones intracomunitarias pero NO consta presentado el modelo 349.`,
      legalBasis: [{ law: 'Reglamento IVA', article: 'Art. 79bis', url: URL_LIVA }],
    };
  },
};

// ─── Calidad contable ────────────────────────────────────────────────────

// R129 — Caja negativa
export const R129_CAJA_NEGATIVA: AeatRule = {
  id: 'R129',
  category: 'contabilidad_pgc',
  description:
    'Saldo negativo en cuenta caja (570) — indicio de contabilidad incompleta.',
  appliesTo: { actions: ['audit'] },
  check: (ctx: RuleContext): RuleEvaluation => {
    const a = auditOf(ctx);
    if (!a) return NO_APPLY;
    const balance = Number.parseFloat(a.cashBalance);
    if (!Number.isFinite(balance) || balance >= 0) return NO_APPLY;
    return {
      applies: true,
      severity: 'error',
      message: `Saldo de caja negativo (${balance.toFixed(2)}€). La caja física NUNCA puede ser negativa. Indica pagos no registrados, retiradas sin asentar o contabilidad incompleta — riesgo de inspección.`,
      legalBasis: [
        { law: 'PGC 2007', article: 'Cuenta 570 Caja euros' },
        { law: 'Cdgo. Comercio', article: 'Art. 25', url: URL_CDGO_COMERCIO },
      ],
      recommendation:
        'Localiza ingresos en caja no asentados (cobros en efectivo, retiradas socio) o gastos contabilizados con fecha posterior al pago real. Regulariza con asientos de ajuste.',
    };
  },
};

// R130 — Bancos sin conciliar (>60 días o nunca)
export const R130_BANCOS_SIN_CONCILIAR: AeatRule = {
  id: 'R130',
  category: 'contabilidad_pgc',
  description: 'Cuentas bancarias con conciliación obsoleta o nunca conciliadas.',
  appliesTo: { actions: ['audit'] },
  check: (ctx: RuleContext): RuleEvaluation => {
    const a = auditOf(ctx);
    if (!a) return NO_APPLY;
    if (a.bankAccounts.length === 0) return NO_APPLY;
    const now = ctx.now ?? new Date();
    const stale: string[] = [];
    for (const acc of a.bankAccounts) {
      if (!acc.lastReconciliationDate) {
        stale.push(`${acc.account} (nunca conciliada)`);
        continue;
      }
      const recMs = Date.parse(acc.lastReconciliationDate);
      if (!Number.isFinite(recMs)) {
        stale.push(`${acc.account} (fecha inválida)`);
        continue;
      }
      const daysAgo = Math.floor((now.getTime() - recMs) / (1000 * 60 * 60 * 24));
      if (daysAgo > 60) {
        stale.push(`${acc.account} (${daysAgo} días sin conciliar)`);
      }
    }
    if (stale.length === 0) return NO_APPLY;
    return {
      applies: true,
      severity: 'warning',
      message: `Cuentas bancarias sin conciliar recientemente: ${stale.join('; ')}. Conciliar mensualmente es la única forma de detectar errores y movimientos no contabilizados.`,
      legalBasis: [{ law: 'Cdgo. Comercio', article: 'Art. 25', url: URL_CDGO_COMERCIO }],
      recommendation:
        'Concilia mensualmente. Isaak puede importar movimientos vía Enable Banking PSD2 y cruzarlos automáticamente con el ledger.',
    };
  },
};

// R131 — Facturas recibidas con IVA sin contabilizar
export const R131_FACTURAS_SIN_CONTABILIZAR: AeatRule = {
  id: 'R131',
  category: 'contabilidad_pgc',
  description:
    'Facturas recibidas con IVA deducible sin asiento contable: riesgo de descuadre libro IVA ↔ contabilidad.',
  appliesTo: { actions: ['audit'] },
  check: (ctx: RuleContext): RuleEvaluation => {
    const a = auditOf(ctx);
    if (!a) return NO_APPLY;
    if (a.unaccountedInvoicesInWithVat <= 0) return NO_APPLY;
    return {
      applies: true,
      severity: 'error',
      message: `Hay ${a.unaccountedInvoicesInWithVat} facturas recibidas con IVA en el periodo sin contabilizar. El libro de IVA y la contabilidad deben coincidir; el descuadre se detecta automáticamente en una inspección.`,
      legalBasis: [
        { law: 'LIVA', article: 'Art. 165', url: URL_LIVA },
        { law: 'Cdgo. Comercio', article: 'Art. 25', url: URL_CDGO_COMERCIO },
      ],
      recommendation: 'Contabiliza las facturas pendientes antes del cierre del periodo.',
    };
  },
};

// R128 — Cuenta 555 (Partidas pendientes) con saldo significativo
export const R128_PARTIDAS_PENDIENTES: AeatRule = {
  id: 'R128',
  category: 'contabilidad_pgc',
  description:
    'Cuenta 555 (Partidas pendientes de aplicación) con saldo significativo: señal de contabilidad incompleta.',
  appliesTo: { actions: ['audit'] },
  check: (ctx: RuleContext): RuleEvaluation => {
    const a = auditOf(ctx);
    if (!a) return NO_APPLY;
    const abs = Math.abs(Number.parseFloat(a.pendingAccountsBalance));
    if (!Number.isFinite(abs) || abs < 100) return NO_APPLY;
    return {
      applies: true,
      severity: 'warning',
      message: `Cuenta 555 (Partidas pendientes) con saldo ${a.pendingAccountsBalance}€. Esta cuenta debe usarse como tránsito; un saldo persistente indica movimientos no clasificados.`,
      legalBasis: [{ law: 'PGC 2007', article: 'Cuenta 555 Partidas pendientes' }],
      recommendation:
        'Revisa los movimientos en 555 y reclasifícalos a su cuenta definitiva (clientes, proveedores, etc.).',
    };
  },
};

// ─── Export del bloque audit ─────────────────────────────────────────────

export const AUDIT_RULES: ReadonlyArray<AeatRule> = [
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
];

export type { LegalBasis };
