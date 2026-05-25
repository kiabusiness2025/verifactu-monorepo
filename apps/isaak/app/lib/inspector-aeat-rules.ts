// F11 Inspector AEAT — Capa 1 starter ruleset.
//
// Reglas codificadas desde BOE/LIVA/LIRPF/Reglamento Facturación. Son
// reglas "de manual" — cubren errores típicos detectables con los
// datos básicos de un asiento (importe, descripción, fecha, método de
// pago). Las reglas "de trinchera" (las que solo se aprenden llevando
// gestoría real) se añadirán encima en sucesivas iteraciones.
//
// Cada regla incluye:
//   * id estable (R001..)
//   * cita normativa (artículo + ley)
//   * severity razonada (error sólo si la conducta está claramente
//     prohibida o la presunción legal no admite prueba en contrario)
//   * suggestedAction concreto cuando aporta valor
//
// Política de severidades:
//   * error  → bloquea la operación (e.g. efectivo >1000€ Ley 7/2012)
//   * warning → permite tras confirmación + aviso (e.g. atenciones
//     a clientes — la regla general es no deducible pero hay
//     excepciones que el contribuyente puede invocar)
//   * info → educa, no bloquea (e.g. recordatorio plazo modelo 303)

import type {
  AeatRule,
  RuleContext,
  RuleEvaluation,
} from './inspector-aeat';
import {
  decimalGT,
  decimalGTE,
  descriptionContainsAny,
} from './inspector-aeat';

const NO_APPLY: RuleEvaluation = { applies: false };

// ─── IVA deducibilidad ───────────────────────────────────────────────────

// R001 Atenciones a clientes / hostelería NO deducibles (Art. 96.1.5 LIVA)
const R001: AeatRule = {
  id: 'R001',
  category: 'iva_deducibilidad',
  description:
    'IVA de servicios de hostelería destinados a atenciones a clientes, asalariados o terceros: NO deducible.',
  appliesTo: ['invoice_in', 'expense'],
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_in' && ctx.action !== 'expense') return NO_APPLY;
    const d = ctx.data.description ?? '';
    const triggers = [
      'restaurante', 'comida', 'cena', 'almuerzo', 'desayuno',
      'hotel', 'cafetería', 'cafeteria', 'bar', 'menú', 'menu',
      'catering', 'atención al cliente', 'atencion al cliente',
    ];
    if (!descriptionContainsAny(d, triggers)) return NO_APPLY;
    return {
      applies: true,
      severity: 'warning',
      message:
        'El IVA de servicios de hostelería destinados a atenciones a clientes, asalariados o terceros NO es deducible. Excepción: hostelería como parte directa de la actividad económica del contribuyente (p. ej. comercial en visita justificada). Si no encaja en la excepción, regístralo como gasto sin IVA deducible.',
      citation: 'Art. 96.Uno.5º LIVA',
      suggestedAction:
        '¿Esta comida está vinculada directamente al ejercicio de tu actividad (no es atención a cliente)? Si no estás seguro, regístralo sin deducir el IVA.',
    };
  },
};

// R002 Combustible vehículo turismo — 50% deducible (Art. 95.3.2º LIVA)
const R002: AeatRule = {
  id: 'R002',
  category: 'iva_deducibilidad',
  description:
    'IVA de gasolina/gasoil/diésel de vehículo turismo: presunción de afectación 50%. Solo deducible al 100% si se acredita afectación exclusiva al negocio.',
  appliesTo: ['invoice_in', 'expense'],
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_in' && ctx.action !== 'expense') return NO_APPLY;
    const d = ctx.data.description ?? '';
    const triggers = ['gasolina', 'gasoil', 'gasoleo', 'gasóleo', 'diesel', 'diésel', 'combustible', 'repostaje'];
    if (!descriptionContainsAny(d, triggers)) return NO_APPLY;
    // Si descripción menciona furgoneta/camión/industrial, no aplica la limitación.
    const exceptions = ['furgoneta', 'camion', 'camión', 'industrial', 'mixto adaptable', 'vehiculo industrial', 'vehículo industrial'];
    if (descriptionContainsAny(d, exceptions)) return NO_APPLY;
    return {
      applies: true,
      severity: 'warning',
      message:
        'Combustible de vehículo turismo: la ley presume afectación del 50%, por lo que solo es deducible el 50% del IVA salvo que se acredite afectación exclusiva al negocio (vehículo comercial, taxi, autoescuela, alquiler, transporte de personas/mercancías).',
      citation: 'Art. 95.Tres.2ª LIVA',
      suggestedAction:
        '¿Es un vehículo turismo de uso mixto? Regístralo con IVA deducible al 50%. Si tienes prueba de afectación exclusiva, mantén el 100% y documenta la justificación.',
    };
  },
};

// R003 Vehículo turismo (adquisición) — 50% por defecto (Art. 95.3 LIVA)
const R003: AeatRule = {
  id: 'R003',
  category: 'iva_deducibilidad',
  description: 'Adquisición de vehículo turismo: presunción de afectación 50% salvo prueba en contrario.',
  appliesTo: ['invoice_in', 'expense'],
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_in' && ctx.action !== 'expense') return NO_APPLY;
    const d = ctx.data.description ?? '';
    // Solo dispara si la descripción sugiere compra del vehículo (no combustible).
    const vehicleTriggers = ['turismo', 'automovil', 'automóvil', 'coche', 'vehiculo turismo', 'vehículo turismo'];
    const purchaseTriggers = ['compra', 'adquisicion', 'adquisición', 'leasing', 'renting', 'matriculacion', 'matriculación'];
    const fuelExclusion = ['gasolina', 'gasoil', 'combustible', 'repostaje'];
    if (descriptionContainsAny(d, fuelExclusion)) return NO_APPLY;
    if (!descriptionContainsAny(d, vehicleTriggers)) return NO_APPLY;
    if (!descriptionContainsAny(d, purchaseTriggers)) return NO_APPLY;
    return {
      applies: true,
      severity: 'warning',
      message:
        'Adquisición de vehículo turismo: presunción legal de afectación al negocio del 50%. Solo cabe deducir el 100% del IVA si se acredita afectación exclusiva al negocio (taxi, autoescuela, alquiler, vehículos comerciales, transporte de mercancías/personas, agentes comerciales).',
      citation: 'Art. 95.Tres LIVA',
    };
  },
};

// R004 Tipo de IVA fuera de los oficiales (0/4/10/21) — aviso
const R004: AeatRule = {
  id: 'R004',
  category: 'iva_deducibilidad',
  description: 'Tipos de IVA reconocidos en España: 0%, 4%, 10%, 21%. Otros valores requieren revisión.',
  appliesTo: ['invoice_in', 'invoice_out', 'expense'],
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action === 'payroll' || ctx.action === 'tax_payment' || ctx.action === 'journal') return NO_APPLY;
    const rateStr = ctx.data.vatRate;
    if (rateStr === null || rateStr === undefined || rateStr === '') return NO_APPLY;
    const rate = Number.parseFloat(rateStr);
    const valid = [0, 4, 5, 10, 21]; // 5% se aplicó temporalmente en alimentos (2023-2024); marca info no error.
    if (valid.includes(rate)) return NO_APPLY;
    return {
      applies: true,
      severity: 'warning',
      message: `El tipo de IVA "${rateStr}%" no coincide con los tipos generales españoles (0/4/10/21). Revisa la factura: puede ser un error de captura o un caso especial (intracomunitario, inversión sujeto pasivo, régimen especial).`,
      citation: 'Art. 90 y 91 LIVA',
    };
  },
};

// ─── IRPF retenciones ────────────────────────────────────────────────────

// R010 Honorarios profesional sin retención — alerta
const R010: AeatRule = {
  id: 'R010',
  category: 'irpf_retenciones',
  description:
    'Honorarios pagados a profesional persona física en estimación directa: retención obligatoria 15% (7% primeros 3 años).',
  appliesTo: ['invoice_in', 'expense'],
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_in' && ctx.action !== 'expense') return NO_APPLY;
    const d = ctx.data.description ?? '';
    const triggers = [
      'honorarios', 'profesional', 'minuta', 'consultoría', 'consultoria',
      'asesoría', 'asesoria', 'abogado', 'abogada', 'arquitecto', 'arquitecta',
      'gestor', 'gestora', 'graduado social', 'auditoría', 'auditoria',
      'notario', 'notaria',
    ];
    if (!descriptionContainsAny(d, triggers)) return NO_APPLY;
    return {
      applies: true,
      severity: 'warning',
      message:
        'Pago a profesional persona física: requiere retención IRPF del 15% (7% en los 3 primeros años de actividad del profesional). La retención la practica el pagador y se ingresa con el modelo 111 trimestral + resumen anual 190.',
      citation: 'Art. 95 y 101 Reglamento IRPF (RD 439/2007)',
      suggestedAction:
        'Verifica que la factura del profesional incluye la retención y que se va a incluir en el próximo modelo 111. Si la factura no la trae, debes retener y comunicarlo al profesional.',
    };
  },
};

// R011 Alquiler local persona física — retención obligatoria 19%
const R011: AeatRule = {
  id: 'R011',
  category: 'irpf_retenciones',
  description:
    'Alquiler de local de negocio a persona física: retención IRPF 19% (modelo 115).',
  appliesTo: ['invoice_in', 'expense'],
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_in' && ctx.action !== 'expense') return NO_APPLY;
    const d = ctx.data.description ?? '';
    const triggers = ['alquiler', 'arrendamiento', 'renta local', 'renta del local', 'arriendo'];
    if (!descriptionContainsAny(d, triggers)) return NO_APPLY;
    return {
      applies: true,
      severity: 'warning',
      message:
        'Alquiler de inmueble urbano destinado a actividad económica: si el arrendador es persona física, debe practicarse retención del 19% e ingresarla con el modelo 115 trimestral (resumen anual 180).',
      citation: 'Art. 100.2 Reglamento IRPF',
      suggestedAction:
        '¿El arrendador es persona física? Si sí, retén el 19% del alquiler base. Excepciones: alquiler de vivienda y rendimientos derivados de sociedades.',
    };
  },
};

// R012 Dividendos sin retención — alerta
const R012: AeatRule = {
  id: 'R012',
  category: 'irpf_retenciones',
  description: 'Reparto de dividendos: retención obligatoria 19%.',
  appliesTo: ['journal', 'expense'],
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'journal' && ctx.action !== 'expense') return NO_APPLY;
    const d = (ctx.action === 'journal' ? ctx.data.description : ctx.data.description) ?? '';
    if (!descriptionContainsAny(d, ['dividendo', 'dividendos', 'reparto de beneficios'])) return NO_APPLY;
    return {
      applies: true,
      severity: 'warning',
      message:
        'Reparto de dividendos: el pagador debe practicar retención del 19% e ingresarla con el modelo 123 (resumen anual 193).',
      citation: 'Art. 76 Reglamento IRPF',
    };
  },
};

// ─── Facturación electrónica / efectivo ──────────────────────────────────

// R030 Pago en efectivo entre empresarios >1000€ prohibido (Ley 7/2012)
const R030: AeatRule = {
  id: 'R030',
  category: 'facturacion_electronica',
  description:
    'Pago en efectivo de operaciones entre empresarios/profesionales: prohibido si igual o superior a 1.000€.',
  appliesTo: ['invoice_in', 'invoice_out', 'expense'],
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action === 'payroll' || ctx.action === 'tax_payment' || ctx.action === 'journal') return NO_APPLY;
    const data = ctx.data;
    if (data.paymentMethod !== 'cash') return NO_APPLY;
    if (!decimalGTE(data.amount, '1000')) return NO_APPLY;
    return {
      applies: true,
      severity: 'error',
      message:
        'Pago en efectivo de 1.000€ o más entre empresarios/profesionales: prohibido por la Ley 7/2012 (umbral antes era 2.500€ y se redujo a 1.000€ con la Ley 11/2021). Sanción: multa del 25% del importe. Cambia el método de pago a transferencia, tarjeta u otro medio bancario.',
      citation: 'Art. 7 Ley 7/2012 (modificado por Ley 11/2021)',
      suggestedAction:
        'Registra el pago como transferencia/tarjeta y conserva justificante bancario.',
    };
  },
};

// R031 Factura simplificada importe excesivo (RD 1619/2012 Art. 4)
const R031: AeatRule = {
  id: 'R031',
  category: 'facturacion_electronica',
  description:
    'Factura simplificada: importe máximo 400€ (3.000€ en sectores autorizados). Por encima, factura ordinaria.',
  appliesTo: ['invoice_out'],
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_out') return NO_APPLY;
    const data = ctx.data;
    if (data.docType !== 'simplified') return NO_APPLY;
    if (!decimalGT(data.amount, '400')) return NO_APPLY;
    return {
      applies: true,
      severity: 'warning',
      message:
        'Factura simplificada por importe superior a 400€: solo permitida en sectores específicos (hostelería, transporte de personas, peluquerías, aparcamientos, autopistas...) y hasta 3.000€ IVA incluido. Si no encaja en esos sectores debe emitirse factura ordinaria.',
      citation: 'Art. 4 RD 1619/2012 (Reglamento de Facturación)',
      suggestedAction:
        'Verifica si tu actividad está en la lista del Art. 4. Si no, emite factura ordinaria con todos los datos del destinatario.',
    };
  },
};

// R032 Plazo de emisión de facturas — info al emitir con fecha pasada
const R032: AeatRule = {
  id: 'R032',
  category: 'facturacion_electronica',
  description:
    'Plazo emisión factura ordinaria: antes del día 16 del mes siguiente al devengo del IVA (a empresarios). A particulares: al hacer la operación.',
  appliesTo: ['invoice_out'],
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_out') return NO_APPLY;
    return {
      applies: true,
      severity: 'info',
      message:
        'Recuerda: si emites a otro empresario/profesional, la factura debe expedirse antes del día 16 del mes siguiente al devengo del IVA (la operación). Si emites a particular, en el momento.',
      citation: 'Art. 11 RD 1619/2012',
    };
  },
};

// ─── Plazos de presentación (info contextual) ────────────────────────────

function daysUntilModelDeadline(model: string, period: string, now: Date): number | null {
  // Modelo 303 / 130 / 111 / 115 trimestrales: día 20 del mes siguiente
  // al trimestre. Excepción: T4 130 → día 30 enero.
  const quarterly = ['303', '130', '111', '115'];
  if (quarterly.includes(model)) {
    const m = period.match(/^Q([1-4])-(\d{4})$/);
    if (!m) return null;
    const q = Number.parseInt(m[1]!, 10);
    const year = Number.parseInt(m[2]!, 10);
    let deadline: Date;
    if (model === '130' && q === 4) {
      deadline = new Date(Date.UTC(year + 1, 0, 30)); // 30 enero
    } else {
      const nextMonth = q === 4 ? 0 : q * 3; // Q1->mes 3 (abril), Q2->6, Q3->9, Q4->12 (enero año sig.)
      const dlYear = q === 4 ? year + 1 : year;
      deadline = new Date(Date.UTC(dlYear, nextMonth, 20));
    }
    const diff = deadline.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  return null;
}

// R020 Plazo modelo trimestral próximo
const R020: AeatRule = {
  id: 'R020',
  category: 'plazos_presentacion',
  description:
    'Aviso cuando faltan ≤7 días para la fecha límite de un modelo trimestral.',
  appliesTo: ['tax_payment'],
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'tax_payment') return NO_APPLY;
    const now = ctx.now ?? new Date();
    const days = daysUntilModelDeadline(ctx.data.model, ctx.data.period, now);
    if (days === null) return NO_APPLY;
    if (days < 0) {
      return {
        applies: true,
        severity: 'error',
        message: `El plazo de presentación del modelo ${ctx.data.model} (${ctx.data.period}) ya ha vencido (hace ${-days} días). Si presentas fuera de plazo se aplican recargos: <3 meses 5%, 3-6m 10%, 6-12m 15%, >12m 20% + intereses.`,
        citation: 'Art. 27 Ley 58/2003 (LGT) — Recargos por declaración extemporánea',
        suggestedAction:
          'Presenta cuanto antes para minimizar recargo. Considera autoliquidación complementaria si ya presentaste algo previo.',
      };
    }
    if (days <= 7) {
      return {
        applies: true,
        severity: 'warning',
        message: `Quedan ${days} día(s) para el plazo del modelo ${ctx.data.model} (${ctx.data.period}). Prepara la presentación antes del vencimiento.`,
        citation: 'Calendario fiscal AEAT',
      };
    }
    return NO_APPLY;
  },
};

// ─── Verifactu / SII ─────────────────────────────────────────────────────

// R040 Obligación Verifactu desde 2026
const R040: AeatRule = {
  id: 'R040',
  category: 'verifactu_obligaciones',
  description:
    'Sistemas informáticos de facturación: deben cumplir el RD 1007/2023 (VERI*FACTU) desde 2026.',
  appliesTo: ['invoice_out'],
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_out') return NO_APPLY;
    const now = ctx.now ?? new Date();
    if (now.getUTCFullYear() < 2026) return NO_APPLY;
    return {
      applies: true,
      severity: 'info',
      message:
        'Recuerda: desde 2026 el software que emite facturas debe cumplir VERI*FACTU (RD 1007/2023). Isaak emite el registro de facturación firmado y lo encadena por hash, cumpliendo el requisito de inalterabilidad.',
      citation: 'RD 1007/2023, Orden HAC/1177/2024',
    };
  },
};

// R041 Conservación de facturas (Art. 165 LIVA + Art. 30 RD 1619/2012)
const R041: AeatRule = {
  id: 'R041',
  category: 'facturacion_electronica',
  description: 'Plazo legal de conservación de facturas: 4 años (IVA) / 6 años (contable / Código Comercio).',
  appliesTo: ['invoice_in', 'invoice_out'],
  check: (ctx: RuleContext): RuleEvaluation => {
    // Solo info, dispara una vez por documento. No es alerta de cumplimiento.
    return {
      applies: true,
      severity: 'info',
      message:
        'Conserva la factura y su justificante de pago al menos 4 años (a efectos de IVA, Art. 165 LIVA) y 6 años a efectos contables (Art. 30 Código de Comercio).',
      citation: 'Art. 165 LIVA + Art. 30 Cdgo. Comercio + Art. 30 RD 1619/2012',
    };
  },
};

// ─── Operaciones vinculadas ──────────────────────────────────────────────

// R050 Operaciones vinculadas (Art. 18 LIS) — alerta si counterparty parece socio
const R050: AeatRule = {
  id: 'R050',
  category: 'operaciones_vinculadas',
  description:
    'Operaciones con partes vinculadas (socio >25%, administrador, cónyuge, etc.): obligación de valoración a precio de mercado y documentación.',
  appliesTo: ['invoice_in', 'invoice_out'],
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action === 'payroll' || ctx.action === 'tax_payment' || ctx.action === 'journal') return NO_APPLY;
    const data = ctx.data;
    const fullDesc = `${data.description ?? ''} ${data.counterpartyName ?? ''}`;
    if (!descriptionContainsAny(fullDesc, ['socio', 'administrador', 'administradora', 'vinculad'])) return NO_APPLY;
    return {
      applies: true,
      severity: 'warning',
      message:
        'Operación con parte vinculada (socio/administrador/familiar): debe valorarse a precio de mercado y, según volumen, documentarse en el expediente de operaciones vinculadas. Umbral mínimo de documentación: 250.000€/año por persona o entidad vinculada (master file/local file si grupo).',
      citation: 'Art. 18 LIS + Art. 13 a 16 Reglamento IS',
    };
  },
};

// ─── Régimen simplificado / módulos ──────────────────────────────────────

// R060 Recargo de equivalencia — info al emitir factura
const R060: AeatRule = {
  id: 'R060',
  category: 'regimenes_especiales',
  description:
    'Régimen especial del recargo de equivalencia: aplicable a comerciantes minoristas persona física (5,2% sobre el tipo general 21%).',
  appliesTo: ['invoice_out'],
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_out') return NO_APPLY;
    const d = ctx.data.description ?? '';
    if (!descriptionContainsAny(d, ['recargo de equivalencia', 'recargo equivalencia'])) return NO_APPLY;
    return {
      applies: true,
      severity: 'info',
      message:
        'Recargo de equivalencia: 5,2% si tipo general 21%, 1,4% si tipo 10%, 0,5% si tipo 4%. El proveedor lo repercute en factura y lo ingresa el proveedor (NO el minorista). El minorista en RE no presenta modelo 303.',
      citation: 'Art. 154 LIVA + Art. 59 Reglamento IVA',
    };
  },
};

// ─── PGC / contabilidad ──────────────────────────────────────────────────

// R070 Asiento con debe ≠ haber (clásico) — solo aplica si ambos están
const R070: AeatRule = {
  id: 'R070',
  category: 'contabilidad_pgc',
  description: 'Asiento contable: el cargo (debe) debe ser igual al abono (haber).',
  appliesTo: ['journal'],
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'journal') return NO_APPLY;
    const { accountDebit, accountCredit } = ctx.data;
    if (!accountDebit || !accountCredit) {
      return {
        applies: true,
        severity: 'warning',
        message:
          'Asiento contable incompleto: falta la cuenta de cargo (debe) o de abono (haber). Todo asiento de partida doble debe indicar ambas cuentas del PGC.',
        citation: 'PGC 2007 — Principio de partida doble',
        suggestedAction:
          'Indica las cuentas PGC implicadas (p.ej. 430 Clientes a 700 Venta de mercaderías).',
      };
    }
    return NO_APPLY;
  },
};

// ─── Registro completo ───────────────────────────────────────────────────

export const AEAT_RULES: ReadonlyArray<AeatRule> = [
  // IVA deducibilidad
  R001, R002, R003, R004,
  // IRPF retenciones
  R010, R011, R012,
  // Plazos
  R020,
  // Facturación / efectivo
  R030, R031, R032,
  // Verifactu / conservación
  R040, R041,
  // Vinculadas
  R050,
  // Regímenes
  R060,
  // PGC
  R070,
];

export function findRuleById(id: string): AeatRule | undefined {
  return AEAT_RULES.find((r) => r.id === id);
}
