// F11 Inspector AEAT — Capa 1 starter ruleset (con scoping de fase 2).
//
// Reglas codificadas desde BOE/LIVA/LIRPF/Reglamento Facturación y
// alineadas con el nuevo schema HaciendaRule:
//   * appliesTo con dimensiones (action / taxpayerType / regime /
//     territory / sector) — cuando una regla no restringe una
//     dimensión, aplica universalmente
//   * legalBasis array (law + article + url) en vez de citation plana
//   * recommendation + evidenceRequired para que el LLM pueda dar
//     pasos concretos al usuario
//
// Política de severidades:
//   * error  → bloquea la operación (incumplimiento objetivo sin
//     prueba en contrario)
//   * warning → permite tras confirmación + aviso (presunción legal
//     o caso típico que el usuario puede justificar)
//   * info → educa, no bloquea

import type {
  AeatRule,
  LegalBasis,
  RuleContext,
  RuleEvaluation,
  RuleScope,
} from './inspector-aeat';
import {
  decimalGT,
  decimalGTE,
  descriptionContainsAny,
} from './inspector-aeat';

const NO_APPLY: RuleEvaluation = { applies: false };

// Helper: scope universal por defecto. Reglas que aplican a todo
// régimen / territorio / tipo de contribuyente solo declaran actions.
function scopeFor(actions: RuleScope['actions']): RuleScope {
  return { actions };
}

// URLs BOE canónicas usadas en las citas — centralizadas para que un
// cambio del BOE no requiera tocar 30 reglas. Aliases via consts.
const URL_LIVA = 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740';
const URL_LIRPF = 'https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764';
const URL_RD_FACT = 'https://www.boe.es/buscar/act.php?id=BOE-A-2012-14696';
const URL_LEY_7_2012 = 'https://www.boe.es/buscar/act.php?id=BOE-A-2012-13416';
const URL_RD_VERIFACTU = 'https://www.boe.es/buscar/act.php?id=BOE-A-2023-24840';
const URL_RDL_15_2025 = 'https://www.boe.es/buscar/act.php?id=BOE-A-2025-15052';
const URL_LIS = 'https://www.boe.es/buscar/act.php?id=BOE-A-2014-12328';
const URL_LGT = 'https://www.boe.es/buscar/act.php?id=BOE-A-2003-23186';
const URL_RGAT = 'https://www.boe.es/buscar/act.php?id=BOE-A-2007-15984';

// ─── IVA deducibilidad ───────────────────────────────────────────────────

// R001 Atenciones a clientes / hostelería NO deducibles (Art. 96 LIVA)
const R001: AeatRule = {
  id: 'R001',
  category: 'iva_deducibilidad',
  description:
    'IVA de servicios de hostelería destinados a atenciones a clientes, asalariados o terceros: NO deducible.',
  appliesTo: scopeFor(['invoice_in', 'expense']),
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
        'El IVA de servicios de hostelería destinados a atenciones a clientes, asalariados o terceros NO es deducible. Excepción: hostelería como parte directa de la actividad económica del contribuyente (p. ej. comercial en visita justificada).',
      legalBasis: [
        { law: 'LIVA', article: 'Art. 96.Uno.5º', url: URL_LIVA },
      ],
      recommendation:
        'Si no encaja en la excepción, regístralo como gasto sin IVA deducible. Si encaja, conserva justificación (visita comercial documentada, agenda con cliente, etc.).',
      evidenceRequired: ['factura', 'visita comercial documentada'],
      suggestedAction:
        '¿Esta comida está vinculada directamente al ejercicio de tu actividad?',
    };
  },
};

// R002 Combustible vehículo turismo — 50% deducible (Art. 95.3.2º LIVA)
const R002: AeatRule = {
  id: 'R002',
  category: 'iva_deducibilidad',
  description:
    'IVA de gasolina/gasoil/diésel de vehículo turismo: presunción de afectación 50%.',
  appliesTo: scopeFor(['invoice_in', 'expense']),
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_in' && ctx.action !== 'expense') return NO_APPLY;
    const d = ctx.data.description ?? '';
    const triggers = ['gasolina', 'gasoil', 'gasoleo', 'gasóleo', 'diesel', 'diésel', 'combustible', 'repostaje'];
    if (!descriptionContainsAny(d, triggers)) return NO_APPLY;
    const exceptions = ['furgoneta', 'camion', 'camión', 'industrial', 'mixto adaptable', 'vehiculo industrial', 'vehículo industrial'];
    if (descriptionContainsAny(d, exceptions)) return NO_APPLY;
    return {
      applies: true,
      severity: 'warning',
      message:
        'Combustible de vehículo turismo: la ley presume afectación del 50%, por lo que solo es deducible el 50% del IVA salvo que se acredite afectación exclusiva al negocio.',
      legalBasis: [{ law: 'LIVA', article: 'Art. 95.Tres.2ª', url: URL_LIVA }],
      recommendation:
        '¿Es un vehículo turismo de uso mixto? Regístralo con IVA deducible al 50%. Si tienes prueba de afectación exclusiva, mantén el 100% y documenta la justificación.',
      evidenceRequired: ['factura combustible', 'libro de viajes si aplica'],
    };
  },
};

// R003 Vehículo turismo (adquisición) — 50% por defecto (Art. 95.3 LIVA)
const R003: AeatRule = {
  id: 'R003',
  category: 'iva_deducibilidad',
  description: 'Adquisición de vehículo turismo: presunción de afectación 50% salvo prueba en contrario.',
  appliesTo: scopeFor(['invoice_in', 'expense']),
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_in' && ctx.action !== 'expense') return NO_APPLY;
    const d = ctx.data.description ?? '';
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
        'Adquisición de vehículo turismo: presunción legal de afectación al negocio del 50%. Solo cabe deducir el 100% del IVA si se acredita afectación exclusiva al negocio (taxi, autoescuela, alquiler, vehículos comerciales, agentes comerciales).',
      legalBasis: [{ law: 'LIVA', article: 'Art. 95.Tres', url: URL_LIVA }],
      recommendation:
        'Documenta el uso del vehículo si pretendes deducir más del 50%. Conserva libro de viajes, kilometraje y justificación de actividad.',
    };
  },
};

// R004 Tipo de IVA fuera de los oficiales (0/4/5/10/21) — aviso
const R004: AeatRule = {
  id: 'R004',
  category: 'iva_repercutido',
  description: 'Tipos de IVA reconocidos en España: 0%, 4%, 5%, 10%, 21%. Otros valores requieren revisión.',
  appliesTo: scopeFor(['invoice_in', 'invoice_out', 'expense']),
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action === 'payroll' || ctx.action === 'tax_payment' || ctx.action === 'journal' || ctx.action === 'profile_check' || ctx.action === 'audit') return NO_APPLY;
    const rateStr = ctx.data.vatRate;
    if (rateStr === null || rateStr === undefined || rateStr === '') return NO_APPLY;
    const rate = Number.parseFloat(rateStr);
    const valid = [0, 4, 5, 10, 21];
    if (valid.includes(rate)) return NO_APPLY;
    return {
      applies: true,
      severity: 'warning',
      message: `El tipo de IVA "${rateStr}%" no coincide con los tipos generales españoles (0/4/5/10/21). Revisa: puede ser un error de captura o un caso especial (intracomunitario, ISP, IGIC si Canarias).`,
      legalBasis: [
        { law: 'LIVA', article: 'Art. 90', url: URL_LIVA },
        { law: 'LIVA', article: 'Art. 91', url: URL_LIVA },
      ],
    };
  },
};

// ─── IRPF retenciones ────────────────────────────────────────────────────

// R010 Honorarios profesional sin retención — alerta
const R010: AeatRule = {
  id: 'R010',
  category: 'irpf_retenciones',
  description:
    'Honorarios pagados a profesional persona física: retención obligatoria 15% (7% primeros 3 años).',
  appliesTo: scopeFor(['invoice_in', 'expense']),
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
        'Pago a profesional persona física: requiere retención IRPF del 15% (7% en los 3 primeros años de actividad). La retención la practica el pagador y se ingresa con el modelo 111 trimestral + resumen anual 190.',
      legalBasis: [
        { law: 'Reglamento IRPF (RD 439/2007)', article: 'Art. 95.1.a' },
        { law: 'Reglamento IRPF', article: 'Art. 101.5' },
      ],
      recommendation:
        'Verifica que la factura del profesional incluye la retención y se va a incluir en el próximo modelo 111. Si la factura no la trae, debes retener y comunicarlo al profesional.',
      evidenceRequired: ['factura con retención visible', 'modelo 111'],
    };
  },
};

// R011 Alquiler local persona física — retención obligatoria 19%
const R011: AeatRule = {
  id: 'R011',
  category: 'irpf_retenciones',
  description:
    'Alquiler de local de negocio a persona física: retención IRPF 19% (modelo 115).',
  appliesTo: scopeFor(['invoice_in', 'expense']),
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_in' && ctx.action !== 'expense') return NO_APPLY;
    const d = ctx.data.description ?? '';
    const triggers = ['alquiler', 'arrendamiento', 'renta local', 'renta del local', 'arriendo'];
    if (!descriptionContainsAny(d, triggers)) return NO_APPLY;
    return {
      applies: true,
      severity: 'warning',
      message:
        'Alquiler de inmueble urbano destinado a actividad económica: si el arrendador es persona física, debe practicarse retención del 19% e ingresarla con el modelo 115 trimestral (resumen anual 180). Excepciones: alquiler de vivienda y rendimientos de sociedades.',
      legalBasis: [
        { law: 'Reglamento IRPF', article: 'Art. 100.2' },
        { law: 'Reglamento IRPF', article: 'Art. 75.3' },
      ],
      recommendation:
        '¿El arrendador es persona física? Retén el 19% sobre la renta neta y declara en 115.',
      evidenceRequired: ['contrato de arrendamiento', 'modelo 115'],
    };
  },
};

// R012 Dividendos sin retención — alerta
const R012: AeatRule = {
  id: 'R012',
  category: 'irpf_retenciones',
  description: 'Reparto de dividendos: retención obligatoria 19%.',
  appliesTo: scopeFor(['journal', 'expense']),
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'journal' && ctx.action !== 'expense') return NO_APPLY;
    const d = (ctx.action === 'journal' ? ctx.data.description : ctx.data.description) ?? '';
    if (!descriptionContainsAny(d, ['dividendo', 'dividendos', 'reparto de beneficios'])) return NO_APPLY;
    return {
      applies: true,
      severity: 'warning',
      message:
        'Reparto de dividendos: el pagador debe practicar retención del 19% e ingresarla con el modelo 123 (resumen anual 193).',
      legalBasis: [{ law: 'Reglamento IRPF', article: 'Art. 76' }],
    };
  },
};

// ─── Facturación electrónica / efectivo ──────────────────────────────────

// R030 Pago en efectivo entre empresarios >=1000€ prohibido
const R030: AeatRule = {
  id: 'R030',
  category: 'tesoreria',
  description:
    'Pago en efectivo de operaciones entre empresarios/profesionales: prohibido si igual o superior a 1.000€.',
  appliesTo: scopeFor(['invoice_in', 'invoice_out', 'expense']),
  check: (ctx: RuleContext): RuleEvaluation => {
    if (
      ctx.action === 'payroll' ||
      ctx.action === 'tax_payment' ||
      ctx.action === 'journal' ||
      ctx.action === 'profile_check' || ctx.action === 'audit'
    )
      return NO_APPLY;
    const data = ctx.data;
    if (data.paymentMethod !== 'cash') return NO_APPLY;
    if (!decimalGTE(data.amount, '1000')) return NO_APPLY;
    return {
      applies: true,
      severity: 'error',
      message:
        'Pago en efectivo de 1.000€ o más entre empresarios/profesionales: prohibido por la Ley 7/2012 (umbral reducido desde 2.500€ por la Ley 11/2021). Sanción: multa del 25% del importe.',
      legalBasis: [{ law: 'Ley 7/2012', article: 'Art. 7.Uno', url: URL_LEY_7_2012 }],
      recommendation: 'Cambia el método de pago a transferencia, tarjeta u otro medio bancario.',
      evidenceRequired: ['justificante bancario'],
    };
  },
};

// R031 Factura simplificada importe excesivo (RD 1619/2012 Art. 4)
const R031: AeatRule = {
  id: 'R031',
  category: 'facturacion_electronica',
  description:
    'Factura simplificada: importe máximo 400€ (3.000€ en sectores autorizados).',
  appliesTo: scopeFor(['invoice_out']),
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_out') return NO_APPLY;
    const data = ctx.data;
    if (data.docType !== 'simplified') return NO_APPLY;
    if (!decimalGT(data.amount, '400')) return NO_APPLY;
    return {
      applies: true,
      severity: 'warning',
      message:
        'Factura simplificada por importe superior a 400€: solo permitida en sectores específicos (hostelería, transporte de personas, peluquerías, aparcamientos, autopistas) y hasta 3.000€ IVA incluido.',
      legalBasis: [{ law: 'RD 1619/2012', article: 'Art. 4', url: URL_RD_FACT }],
      recommendation:
        'Verifica si tu actividad está en la lista del Art. 4. Si no, emite factura ordinaria con todos los datos del destinatario.',
    };
  },
};

// R032 Plazo de emisión de facturas — info al emitir
const R032: AeatRule = {
  id: 'R032',
  category: 'facturacion_electronica',
  description:
    'Plazo emisión factura ordinaria: antes del día 16 del mes siguiente al devengo del IVA (a empresarios).',
  appliesTo: scopeFor(['invoice_out']),
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_out') return NO_APPLY;
    return {
      applies: true,
      severity: 'info',
      message:
        'Recuerda: si emites a otro empresario/profesional, la factura debe expedirse antes del día 16 del mes siguiente al devengo del IVA. Si emites a particular, en el momento.',
      legalBasis: [{ law: 'RD 1619/2012', article: 'Art. 11', url: URL_RD_FACT }],
    };
  },
};

// ─── Plazos de presentación (R020) ───────────────────────────────────────

function daysUntilModelDeadline(model: string, period: string, now: Date): number | null {
  const quarterly = ['303', '130', '111', '115', '202'];
  if (quarterly.includes(model)) {
    const m = period.match(/^Q([1-4])-(\d{4})$/);
    if (!m) return null;
    const q = Number.parseInt(m[1]!, 10);
    const year = Number.parseInt(m[2]!, 10);
    let deadline: Date;
    if (model === '130' && q === 4) {
      deadline = new Date(Date.UTC(year + 1, 0, 30));
    } else {
      const nextMonth = q === 4 ? 0 : q * 3;
      const dlYear = q === 4 ? year + 1 : year;
      deadline = new Date(Date.UTC(dlYear, nextMonth, 20));
    }
    const diff = deadline.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  return null;
}

const R020: AeatRule = {
  id: 'R020',
  category: 'plazos_presentacion',
  description:
    'Aviso cuando faltan ≤7 días para la fecha límite de un modelo trimestral.',
  appliesTo: scopeFor(['tax_payment']),
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'tax_payment') return NO_APPLY;
    const now = ctx.now ?? new Date();
    const days = daysUntilModelDeadline(ctx.data.model, ctx.data.period, now);
    if (days === null) return NO_APPLY;
    if (days < 0) {
      return {
        applies: true,
        severity: 'error',
        message: `El plazo de presentación del modelo ${ctx.data.model} (${ctx.data.period}) ya ha vencido (hace ${-days} días). Recargos: <3 meses 5%, 3-6m 10%, 6-12m 15%, >12m 20% + intereses.`,
        legalBasis: [{ law: 'Ley 58/2003 (LGT)', article: 'Art. 27', url: URL_LGT }],
        recommendation:
          'Presenta cuanto antes para minimizar recargo. Considera autoliquidación complementaria si ya presentaste algo previo.',
      };
    }
    if (days <= 7) {
      return {
        applies: true,
        severity: 'warning',
        message: `Quedan ${days} día(s) para el plazo del modelo ${ctx.data.model} (${ctx.data.period}).`,
        legalBasis: [{ law: 'Calendario fiscal AEAT', article: '' }],
      };
    }
    return NO_APPLY;
  },
};

// ─── Verifactu / SIF — fechas actualizadas RD-Ley 15/2025 ────────────────

// Fechas oficiales tras RD-Ley 15/2025:
//   * Sujetos pasivos IS:  obligatorio desde 1 enero 2027
//   * Resto obligados:     obligatorio desde 1 julio 2027
const VERIFACTU_DEADLINE_IS = new Date(Date.UTC(2027, 0, 1));
const VERIFACTU_DEADLINE_REST = new Date(Date.UTC(2027, 6, 1));

// R040A — Empresa IS adapta SIF antes 01-01-2027
const R040A: AeatRule = {
  id: 'R040A',
  category: 'verifactu_obligaciones',
  description:
    'Entidades sujetas a IS deben adaptar su SIF al RD 1007/2023 antes del 1 enero 2027 (RD-Ley 15/2025).',
  appliesTo: {
    actions: ['invoice_out'],
    taxpayerType: ['sl', 'sa', 'asociacion', 'fundacion'],
  },
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_out') return NO_APPLY;
    const now = ctx.now ?? new Date();
    const days = Math.ceil((VERIFACTU_DEADLINE_IS.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 0) {
      return {
        applies: true,
        severity: 'error',
        message:
          'El plazo para que las entidades sujetas al Impuesto sobre Sociedades adapten su SIF a VERI*FACTU expiró el 1 de enero de 2027. Emitir facturas con software no conforme constituye infracción tipificada (LGT 201 bis).',
        legalBasis: [
          { law: 'RD 1007/2023', article: 'Disposición Final', url: URL_RD_VERIFACTU },
          { law: 'RD-Ley 15/2025', article: 'Disposición transitoria', url: URL_RDL_15_2025 },
        ],
        recommendation:
          'Actualiza inmediatamente al software conforme. Isaak emite registros de facturación firmados encadenados por hash, cumpliendo el requisito de inalterabilidad.',
      };
    }
    if (days <= 90) {
      return {
        applies: true,
        severity: 'warning',
        message: `Quedan ${days} días para que tu SIF deba cumplir VERI*FACTU (sujetos IS, plazo 01-01-2027 por RD-Ley 15/2025).`,
        legalBasis: [
          { law: 'RD 1007/2023', url: URL_RD_VERIFACTU, article: '' },
          { law: 'RD-Ley 15/2025', url: URL_RDL_15_2025, article: '' },
        ],
        recommendation: 'Planifica la migración a Isaak (conforme nativamente) antes del 1 enero 2027.',
      };
    }
    return {
      applies: true,
      severity: 'info',
      message:
        'Recuerda: tu entidad (sujeta a IS) debe usar software VERI*FACTU desde el 1 de enero de 2027 (RD-Ley 15/2025). Isaak ya emite registros conformes.',
      legalBasis: [
        { law: 'RD 1007/2023', url: URL_RD_VERIFACTU, article: '' },
        { law: 'RD-Ley 15/2025', url: URL_RDL_15_2025, article: '' },
      ],
    };
  },
};

// R040B — Resto de obligados adapta SIF antes 01-07-2027
const R040B: AeatRule = {
  id: 'R040B',
  category: 'verifactu_obligaciones',
  description:
    'Autónomos y resto de obligados deben adaptar su SIF al RD 1007/2023 antes del 1 julio 2027 (RD-Ley 15/2025).',
  appliesTo: {
    actions: ['invoice_out'],
    taxpayerType: ['autonomo', 'comunidad_bienes'],
  },
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_out') return NO_APPLY;
    const now = ctx.now ?? new Date();
    const days = Math.ceil((VERIFACTU_DEADLINE_REST.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 0) {
      return {
        applies: true,
        severity: 'error',
        message:
          'El plazo para que autónomos y resto de obligados adapten su SIF a VERI*FACTU expiró el 1 de julio de 2027. Emitir facturas con software no conforme constituye infracción (LGT 201 bis).',
        legalBasis: [
          { law: 'RD 1007/2023', url: URL_RD_VERIFACTU, article: '' },
          { law: 'RD-Ley 15/2025', url: URL_RDL_15_2025, article: '' },
        ],
        recommendation: 'Actualiza inmediatamente al software conforme.',
      };
    }
    if (days <= 90) {
      return {
        applies: true,
        severity: 'warning',
        message: `Quedan ${days} días para que tu SIF deba cumplir VERI*FACTU (autónomos, plazo 01-07-2027).`,
        legalBasis: [
          { law: 'RD 1007/2023', url: URL_RD_VERIFACTU, article: '' },
          { law: 'RD-Ley 15/2025', url: URL_RDL_15_2025, article: '' },
        ],
      };
    }
    return {
      applies: true,
      severity: 'info',
      message:
        'Recuerda: como autónomo/comunidad de bienes debes usar software VERI*FACTU desde el 1 de julio de 2027 (RD-Ley 15/2025). Isaak ya emite registros conformes.',
      legalBasis: [
        { law: 'RD 1007/2023', url: URL_RD_VERIFACTU, article: '' },
        { law: 'RD-Ley 15/2025', url: URL_RDL_15_2025, article: '' },
      ],
    };
  },
};

// R041 Conservación facturas
const R041: AeatRule = {
  id: 'R041',
  category: 'facturacion_electronica',
  description: 'Plazo legal de conservación de facturas: 4 años (IVA) / 6 años (contable).',
  appliesTo: scopeFor(['invoice_in', 'invoice_out']),
  check: (): RuleEvaluation => {
    return {
      applies: true,
      severity: 'info',
      message:
        'Conserva la factura y su justificante de pago al menos 4 años (IVA, Art. 165 LIVA) y 6 años a efectos contables (Art. 30 Código de Comercio).',
      legalBasis: [
        { law: 'LIVA', article: 'Art. 165', url: URL_LIVA },
        { law: 'Cdgo. Comercio', article: 'Art. 30' },
        { law: 'RD 1619/2012', article: 'Art. 19', url: URL_RD_FACT },
      ],
    };
  },
};

// ─── Operaciones vinculadas ──────────────────────────────────────────────

const R050: AeatRule = {
  id: 'R050',
  category: 'operaciones_vinculadas',
  description:
    'Operaciones con partes vinculadas: obligación de valoración a precio de mercado y documentación.',
  appliesTo: scopeFor(['invoice_in', 'invoice_out']),
  check: (ctx: RuleContext): RuleEvaluation => {
    if (
      ctx.action === 'payroll' ||
      ctx.action === 'tax_payment' ||
      ctx.action === 'journal' ||
      ctx.action === 'profile_check' || ctx.action === 'audit'
    )
      return NO_APPLY;
    const data = ctx.data;
    const fullDesc = `${data.description ?? ''} ${data.counterpartyName ?? ''}`;
    if (!descriptionContainsAny(fullDesc, ['socio', 'administrador', 'administradora', 'vinculad'])) return NO_APPLY;
    return {
      applies: true,
      severity: 'warning',
      message:
        'Operación con parte vinculada (socio/administrador/familiar): debe valorarse a precio de mercado y, según volumen, documentarse. Umbral mínimo de documentación: 250.000€/año por persona o entidad vinculada.',
      legalBasis: [
        { law: 'LIS', article: 'Art. 18', url: URL_LIS },
        { law: 'Reglamento IS', article: 'Arts. 13-16' },
      ],
      evidenceRequired: ['expediente operaciones vinculadas', 'valoración precio mercado'],
    };
  },
};

// ─── Régimen especial recargo equivalencia ──────────────────────────────

const R060: AeatRule = {
  id: 'R060',
  category: 'regimenes_especiales',
  description:
    'Régimen especial del recargo de equivalencia: aplicable a comerciantes minoristas persona física.',
  appliesTo: scopeFor(['invoice_out']),
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_out') return NO_APPLY;
    const d = ctx.data.description ?? '';
    if (!descriptionContainsAny(d, ['recargo de equivalencia', 'recargo equivalencia'])) return NO_APPLY;
    return {
      applies: true,
      severity: 'info',
      message:
        'Recargo de equivalencia: 5,2% si tipo general 21%, 1,4% si tipo 10%, 0,5% si tipo 4%. Lo repercute e ingresa el proveedor; el minorista en RE no presenta modelo 303.',
      legalBasis: [
        { law: 'LIVA', article: 'Art. 154', url: URL_LIVA },
        { law: 'Reglamento IVA', article: 'Art. 59' },
      ],
    };
  },
};

// ─── PGC partida doble ──────────────────────────────────────────────────

const R070: AeatRule = {
  id: 'R070',
  category: 'contabilidad_pgc',
  description: 'Asiento contable: el cargo (debe) debe ser igual al abono (haber).',
  appliesTo: scopeFor(['journal']),
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'journal') return NO_APPLY;
    const { accountDebit, accountCredit } = ctx.data;
    if (!accountDebit || !accountCredit) {
      return {
        applies: true,
        severity: 'warning',
        message:
          'Asiento contable incompleto: falta la cuenta de cargo (debe) o de abono (haber).',
        legalBasis: [{ law: 'PGC 2007', article: 'Principio partida doble' }],
        recommendation:
          'Indica las cuentas PGC implicadas (p.ej. 430 Clientes a 700 Venta de mercaderías).',
      };
    }
    return NO_APPLY;
  },
};

// ════════════════════════════════════════════════════════════════════════
// F11 fase 2b — 18 reglas adicionales (Inspector → pyme útil)
// ════════════════════════════════════════════════════════════════════════

// ─── IVA deducibilidad / repercutido (continuación) ─────────────────────

// R005 IVA deducido sin factura válida
const R005: AeatRule = {
  id: 'R005',
  category: 'iva_deducibilidad',
  description:
    'IVA deducido en gasto sin factura completa: requiere documento justificativo (factura ordinaria) para ejercitar el derecho.',
  appliesTo: scopeFor(['invoice_in', 'expense']),
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_in' && ctx.action !== 'expense') return NO_APPLY;
    const data = ctx.data;
    if (!data.vatAmount || Number.parseFloat(data.vatAmount) === 0) return NO_APPLY;
    const d = (data.description ?? '').toLowerCase();
    const noInvoiceMarkers = ['ticket', 'recibo', 'sin factura', 'comprobante', 'tique'];
    if (!descriptionContainsAny(d, noInvoiceMarkers)) return NO_APPLY;
    return {
      applies: true,
      severity: 'error',
      message:
        'IVA deducido sobre un ticket/recibo simplificado: el derecho a deducir requiere factura ordinaria con identificación del destinatario. Solicita factura completa al proveedor.',
      legalBasis: [
        { law: 'LIVA', article: 'Art. 97', url: URL_LIVA },
        { law: 'RD 1619/2012', article: 'Art. 6', url: URL_RD_FACT },
      ],
      recommendation:
        'Pide al proveedor factura ordinaria con NIF, base, cuota y desglose. Hasta que llegue, registra el gasto sin IVA deducible.',
    };
  },
};

// R006 IVA deducido antes de recibir factura
const R006: AeatRule = {
  id: 'R006',
  category: 'iva_deducibilidad',
  description:
    'IVA solo puede deducirse desde la recepción de la factura. Si la fecha de operación es anterior pero la factura aún no se ha recibido, no es deducible todavía.',
  appliesTo: scopeFor(['invoice_in', 'expense']),
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_in' && ctx.action !== 'expense') return NO_APPLY;
    const data = ctx.data;
    if (!data.vatAmount || Number.parseFloat(data.vatAmount) === 0) return NO_APPLY;
    const opDate = data.date;
    const receivedDate = data.receivedDate;
    if (!receivedDate || !opDate) return NO_APPLY;
    const opMs = Date.parse(opDate);
    const recMs = Date.parse(receivedDate);
    if (!Number.isFinite(opMs) || !Number.isFinite(recMs)) return NO_APPLY;
    if (recMs <= opMs) return NO_APPLY;
    const daysAhead = Math.floor((recMs - opMs) / (1000 * 60 * 60 * 24));
    if (daysAhead < 1) return NO_APPLY;
    return {
      applies: true,
      severity: 'warning',
      message: `La operación es de ${opDate} pero la factura se recibió el ${receivedDate} (${daysAhead} días después). El IVA solo es deducible desde la recepción, no desde la operación.`,
      legalBasis: [{ law: 'LIVA', article: 'Art. 99', url: URL_LIVA }],
      recommendation:
        'Imputa la deducción al periodo en que se recibe la factura, no al del devengo.',
    };
  },
};

// R007 Gasto descripción sugiere uso personal/doméstico
const R007: AeatRule = {
  id: 'R007',
  category: 'iva_deducibilidad',
  description:
    'No son deducibles los bienes/servicios destinados a necesidades privadas o uso personal.',
  appliesTo: scopeFor(['invoice_in', 'expense']),
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_in' && ctx.action !== 'expense') return NO_APPLY;
    const d = ctx.data.description ?? '';
    const personalMarkers = [
      'personal', 'particular', 'domestico', 'doméstico', 'familiar',
      'casa', 'hogar', 'regalo cumpleanos', 'regalo cumpleaños',
      'vacaciones', 'colegio hijos', 'guarderia hijos',
    ];
    if (!descriptionContainsAny(d, personalMarkers)) return NO_APPLY;
    return {
      applies: true,
      severity: 'warning',
      message:
        'La descripción sugiere uso personal/doméstico. Los bienes y servicios destinados a necesidades privadas no son afectos a la actividad y su IVA NO es deducible.',
      legalBasis: [
        { law: 'LIVA', article: 'Art. 95.Uno', url: URL_LIVA },
        { law: 'LIVA', article: 'Art. 96.Uno', url: URL_LIVA },
      ],
      recommendation:
        'Si efectivamente es un gasto de la actividad, ajusta la descripción para reflejar el uso empresarial. Si es uso mixto, aplica la regla del 50% (vehículos).',
    };
  },
};

// R009 IVA fuera del plazo de 4 años para deducir
const R009: AeatRule = {
  id: 'R009',
  category: 'iva_deducibilidad',
  description:
    'El derecho a deducir caduca a los 4 años desde el devengo. Después solo cabe procedimiento extraordinario.',
  appliesTo: scopeFor(['invoice_in', 'expense']),
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_in' && ctx.action !== 'expense') return NO_APPLY;
    const data = ctx.data;
    if (!data.vatAmount || Number.parseFloat(data.vatAmount) === 0) return NO_APPLY;
    const opMs = Date.parse(data.date);
    const now = ctx.now ?? new Date();
    if (!Number.isFinite(opMs)) return NO_APPLY;
    const yearsAgo = (now.getTime() - opMs) / (1000 * 60 * 60 * 24 * 365.25);
    if (yearsAgo < 4) return NO_APPLY;
    return {
      applies: true,
      severity: 'error',
      message: `La operación tiene más de 4 años (${yearsAgo.toFixed(1)}). El derecho a deducir el IVA ha caducado salvo procedimiento extraordinario (rectificación de cuotas).`,
      legalBasis: [{ law: 'LIVA', article: 'Art. 99.Tres', url: URL_LIVA }],
      recommendation:
        'Registra el gasto sin IVA deducible. Si crees que cabe rectificación, consulta con un asesor antes de presentar.',
    };
  },
};

// R016 Servicio profesional B2B sin IVA ni exención indicada
const R016: AeatRule = {
  id: 'R016',
  category: 'iva_repercutido',
  description:
    'Factura emitida B2B de servicios sin IVA ni indicación de exención/no sujeción/ISP: requiere justificación.',
  appliesTo: { actions: ['invoice_out'] },
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_out') return NO_APPLY;
    const data = ctx.data;
    if (data.recipientType && data.recipientType !== 'b2b') return NO_APPLY;
    const rate = data.vatRate ? Number.parseFloat(data.vatRate) : null;
    if (rate === null || rate > 0) return NO_APPLY;
    const d = data.description ?? '';
    // Si la descripción ya menciona el supuesto, no avisamos.
    if (
      descriptionContainsAny(d, [
        'exento', 'exenta', 'no sujet', 'inversion sujeto pasivo', 'inversión sujeto pasivo',
        'isp', 'intracomunitar', 'exportacion', 'exportación', 'art. 20', 'art 20',
      ])
    )
      return NO_APPLY;
    return {
      applies: true,
      severity: 'warning',
      message:
        'Factura B2B emitida sin IVA: la operación debe justificarse como exención (Art. 20 LIVA), no sujeción, inversión sujeto pasivo o intracomunitaria. Sin justificación, lo normal es repercutir 21%.',
      legalBasis: [
        { law: 'LIVA', article: 'Art. 4', url: URL_LIVA },
        { law: 'LIVA', article: 'Art. 20', url: URL_LIVA },
        { law: 'RD 1619/2012', article: 'Art. 6.1.j', url: URL_RD_FACT },
      ],
      recommendation:
        'Indica en la descripción de la factura la base legal de la exención o ISP (p.ej. "Operación exenta Art. 20.Uno.21º LIVA — formación").',
    };
  },
};

// R017 Operación intracomunitaria sin NIF-IVA/VIES validado
const R017: AeatRule = {
  id: 'R017',
  category: 'comercio_exterior',
  description:
    'Operaciones intracomunitarias exentas requieren NIF-IVA del cliente validado en el VIES.',
  appliesTo: { actions: ['invoice_out'] },
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_out') return NO_APPLY;
    const d = ctx.data.description ?? '';
    if (!descriptionContainsAny(d, ['intracomunitar', 'cliente ue', 'entrega ue', 'servicio ue', 'cliente alemania', 'cliente francia', 'cliente italia', 'cliente portugal'])) return NO_APPLY;
    const nif = ctx.data.counterpartyNif ?? '';
    const looksLikeEUVat = /^[A-Z]{2}/.test(nif);
    if (looksLikeEUVat) return NO_APPLY;
    return {
      applies: true,
      severity: 'warning',
      message:
        'Operación intracomunitaria detectada: el NIF del cliente debe empezar por el código de país UE (DE, FR, IT, PT, NL...) y estar validado en el VIES. Sin VIES válido, la operación NO está exenta y debes repercutir IVA español.',
      legalBasis: [{ law: 'LIVA', article: 'Art. 25', url: URL_LIVA }],
      recommendation:
        'Valida el NIF-IVA del cliente en https://ec.europa.eu/taxation_customs/vies/ antes de emitir como exenta. Documenta el resultado.',
    };
  },
};

// R019 Inversión del sujeto pasivo no identificada en factura
const R019: AeatRule = {
  id: 'R019',
  category: 'iva_repercutido',
  description:
    'En supuestos de ISP la factura debe indicar expresamente "Inversión del sujeto pasivo" o referencia al Art. 84 LIVA.',
  appliesTo: { actions: ['invoice_out'] },
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_out') return NO_APPLY;
    const d = ctx.data.description ?? '';
    const ispMarkers = ['isp', 'inversion sujeto pasivo', 'inversión sujeto pasivo', 'art. 84', 'art 84'];
    const sectorMarkers = ['construccion', 'construcción', 'subcontrata', 'chatarra', 'oro inversion', 'oro inversión', 'inmueble afecto', 'rehabilitacion inmueble'];
    if (!descriptionContainsAny(d, sectorMarkers)) return NO_APPLY;
    if (descriptionContainsAny(d, ispMarkers)) return NO_APPLY;
    const rate = ctx.data.vatRate ? Number.parseFloat(ctx.data.vatRate) : null;
    if (rate !== null && rate > 0) return NO_APPLY; // si llevan IVA repercutido no hay ISP
    return {
      applies: true,
      severity: 'warning',
      message:
        'Operación en sector con frecuente inversión del sujeto pasivo (construcción/subcontratas/chatarra/oro inversión). Si aplica ISP, la factura DEBE indicar expresamente "Inversión del sujeto pasivo (Art. 84.Uno.2º LIVA)".',
      legalBasis: [{ law: 'LIVA', article: 'Art. 84.Uno.2º', url: URL_LIVA }],
      recommendation:
        'Añade la mención ISP explícita en la descripción de la factura o emite con IVA si no aplica el supuesto.',
    };
  },
};

// R022 Hostelería con tipo distinto del 10% sin causa
const R022: AeatRule = {
  id: 'R022',
  category: 'iva_repercutido',
  description: 'Servicios de hostelería tributan al 10% IVA; otros tipos requieren motivo (catering atípico, alcohol, etc.).',
  appliesTo: { actions: ['invoice_out'] },
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_out') return NO_APPLY;
    const d = ctx.data.description ?? '';
    if (!descriptionContainsAny(d, ['hostelería', 'hosteleria', 'restaurante', 'menu', 'menú', 'comida', 'catering', 'banquete'])) return NO_APPLY;
    const rate = ctx.data.vatRate ? Number.parseFloat(ctx.data.vatRate) : null;
    if (rate === null) return NO_APPLY;
    if (rate === 10) return NO_APPLY;
    return {
      applies: true,
      severity: 'warning',
      message: `Factura de hostelería con tipo IVA ${rate}%. El tipo aplicable a hostelería es el 10% reducido. Verifica.`,
      legalBasis: [{ law: 'LIVA', article: 'Art. 91.Uno.2.2º', url: URL_LIVA }],
    };
  },
};

// ─── Facturación electrónica / formato factura ──────────────────────────

// R033 Factura emitida sin número o serie correlativa
const R033: AeatRule = {
  id: 'R033',
  category: 'facturacion_electronica',
  description: 'Toda factura debe tener número y, en su caso, serie correlativa.',
  appliesTo: { actions: ['invoice_out'] },
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_out') return NO_APPLY;
    const num = ctx.data.docNumber;
    // Solo evaluamos si el campo está presente (no undefined) — undefined
    // significa "no tenemos el dato"; "" o falsy explícito es violación.
    if (num === undefined) return NO_APPLY;
    if (typeof num === 'string' && num.trim().length > 0) return NO_APPLY;
    return {
      applies: true,
      severity: 'error',
      message:
        'Factura sin número: el Reglamento de Facturación exige número (y serie cuando aplique) correlativo dentro de cada serie. Sin número, la factura no es válida fiscalmente.',
      legalBasis: [{ law: 'RD 1619/2012', article: 'Art. 6.1.b', url: URL_RD_FACT }],
    };
  },
};

// R034 Factura sin NIF del emisor
const R034: AeatRule = {
  id: 'R034',
  category: 'facturacion_electronica',
  description: 'Toda factura completa debe identificar al emisor con NIF.',
  appliesTo: { actions: ['invoice_out'] },
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_out') return NO_APPLY;
    const nif = ctx.data.emitterNif;
    if (nif === undefined) return NO_APPLY;
    if (typeof nif === 'string' && nif.trim().length >= 8) return NO_APPLY;
    return {
      applies: true,
      severity: 'error',
      message:
        'Factura sin NIF del emisor: dato obligatorio en factura completa según el Art. 6.1.c RD 1619/2012.',
      legalBasis: [{ law: 'RD 1619/2012', article: 'Art. 6.1.c', url: URL_RD_FACT }],
    };
  },
};

// R035 Factura B2B sin NIF/datos del destinatario
const R035: AeatRule = {
  id: 'R035',
  category: 'facturacion_electronica',
  description: 'En operaciones B2B la factura debe identificar al destinatario con NIF.',
  appliesTo: { actions: ['invoice_out'] },
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_out') return NO_APPLY;
    if (ctx.data.recipientType !== 'b2b') return NO_APPLY;
    const nif = ctx.data.counterpartyNif;
    if (typeof nif === 'string' && nif.trim().length >= 8) return NO_APPLY;
    return {
      applies: true,
      severity: 'error',
      message:
        'Factura B2B sin NIF/datos del destinatario: el destinatario empresario/profesional debe identificarse con NIF. Sin ese dato, la factura no permite la deducción al receptor.',
      legalBasis: [{ law: 'RD 1619/2012', article: 'Art. 6.1.d', url: URL_RD_FACT }],
      recommendation: 'Solicita NIF + razón social + dirección al destinatario antes de emitir.',
    };
  },
};

// R036 Factura emitida sin desglose base/tipo/cuota
const R036: AeatRule = {
  id: 'R036',
  category: 'facturacion_electronica',
  description: 'La factura completa debe desglosar base imponible, tipo y cuota de IVA.',
  appliesTo: { actions: ['invoice_out'] },
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_out') return NO_APPLY;
    const data = ctx.data;
    if (data.docType !== 'invoice' && data.docType !== 'rectificativa') return NO_APPLY;
    const missing: string[] = [];
    if (!data.vatBase) missing.push('base imponible');
    if (!data.vatRate) missing.push('tipo de IVA');
    if (!data.vatAmount) missing.push('cuota de IVA');
    if (missing.length === 0) return NO_APPLY;
    return {
      applies: true,
      severity: 'error',
      message: `Factura ordinaria sin desglose: faltan ${missing.join(', ')}. El Reglamento exige consignar separadamente la base, el tipo y la cuota.`,
      legalBasis: [
        { law: 'RD 1619/2012', article: 'Art. 6.1.g/h/i', url: URL_RD_FACT },
      ],
    };
  },
};

// R039 Factura rectificativa sin referencia a la rectificada
const R039: AeatRule = {
  id: 'R039',
  category: 'facturacion_electronica',
  description: 'Factura rectificativa debe identificar la factura que rectifica.',
  appliesTo: { actions: ['invoice_out'] },
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_out') return NO_APPLY;
    if (ctx.data.docType !== 'rectificativa') return NO_APPLY;
    const ref = ctx.data.rectifiesDocNumber;
    if (typeof ref === 'string' && ref.trim().length > 0) return NO_APPLY;
    return {
      applies: true,
      severity: 'error',
      message:
        'Factura rectificativa sin referencia a la factura original: el Art. 15 RD 1619/2012 exige identificar la rectificada (número, fecha) y la causa de la rectificación.',
      legalBasis: [{ law: 'RD 1619/2012', article: 'Art. 15', url: URL_RD_FACT }],
    };
  },
};

// R047 Factura electrónica B2B obligatoria — recordatorio
const R047: AeatRule = {
  id: 'R047',
  category: 'facturacion_electronica',
  description: 'La factura electrónica entre empresarios será obligatoria conforme entre en vigor el reglamento de la Ley 18/2022 (Ley Crea y Crece).',
  appliesTo: { actions: ['invoice_out'] },
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_out') return NO_APPLY;
    if (ctx.data.recipientType !== 'b2b') return NO_APPLY;
    return {
      applies: true,
      severity: 'info',
      message:
        'Factura B2B: la Ley 18/2022 (Crea y Crece) y su reglamento van a obligar a la factura electrónica entre empresarios. Mantén tu emisión en formato estructurado (Facturae/UBL/CII) para evitar adaptaciones posteriores.',
      legalBasis: [
        { law: 'Ley 18/2022', article: 'Art. 12' },
      ],
    };
  },
};

// ─── IRPF retenciones (continuación) ────────────────────────────────────

// R080 Administrador societario — retención general 35% (19% si pyme)
const R080: AeatRule = {
  id: 'R080',
  category: 'irpf_retenciones',
  description:
    'Retribuciones de administradores: retención 35% general; 19% si entidad con cifra de negocios < 100.000€ en el periodo anterior.',
  appliesTo: { actions: ['payroll'], taxpayerType: ['sl', 'sa'] },
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'payroll') return NO_APPLY;
    if (ctx.data.role !== 'administrator') return NO_APPLY;
    const withheld = ctx.data.irpfWithheld ? Number.parseFloat(ctx.data.irpfWithheld) : null;
    const gross = Number.parseFloat(ctx.data.grossAmount);
    if (!Number.isFinite(gross) || gross === 0) return NO_APPLY;
    if (withheld === null) {
      return {
        applies: true,
        severity: 'warning',
        message:
          'Pago a administrador sin retención IRPF informada. La normativa exige 35% (19% si cifra de negocios < 100.000€). Revisa el cálculo.',
        legalBasis: [{ law: 'LIRPF', article: 'Art. 101.2', url: URL_LIRPF }],
      };
    }
    const rate = (withheld / gross) * 100;
    if (rate < 18.5 || (rate > 19.5 && rate < 34.5)) {
      return {
        applies: true,
        severity: 'warning',
        message: `Retención al administrador del ${rate.toFixed(1)}%: tipos legales son 35% (general) o 19% (entidades con cifra de negocios < 100.000€). Confirma cuál procede.`,
        legalBasis: [{ law: 'LIRPF', article: 'Art. 101.2', url: URL_LIRPF }],
        recommendation: 'Verifica la cifra de negocios del periodo anterior para decidir entre 19% o 35%.',
      };
    }
    return NO_APPLY;
  },
};

// R082 Curso/conferencia/seminario sin retención 15%
const R082: AeatRule = {
  id: 'R082',
  category: 'irpf_retenciones',
  description:
    'Rendimientos por impartir cursos, conferencias, coloquios, seminarios y similares: retención del 15%.',
  appliesTo: { actions: ['invoice_in', 'expense'] },
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'invoice_in' && ctx.action !== 'expense') return NO_APPLY;
    const d = ctx.data.description ?? '';
    if (!descriptionContainsAny(d, ['curso', 'conferencia', 'seminario', 'coloquio', 'ponencia', 'formacion impartida', 'formación impartida', 'masterclass'])) return NO_APPLY;
    return {
      applies: true,
      severity: 'warning',
      message:
        'Pago por curso/conferencia/seminario: cuando se paga a una persona física por impartir actividad formativa puntual, debe retenerse el 15% e ingresarlo en modelo 111.',
      legalBasis: [
        { law: 'LIRPF', article: 'Art. 17.2.c' },
        { law: 'Reglamento IRPF', article: 'Art. 101' },
      ],
    };
  },
};

// ─── Contabilidad / gasto no deducible ──────────────────────────────────

// R125 Multas/sanciones/donativos como gasto deducible
const R125: AeatRule = {
  id: 'R125',
  category: 'sociedades',
  description:
    'Multas y sanciones (administrativas y penales) y donativos no son gasto deducible en IS ni en estimación directa IRPF.',
  appliesTo: scopeFor(['invoice_in', 'expense', 'journal']),
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action === 'tax_payment' || ctx.action === 'payroll' || ctx.action === 'profile_check' || ctx.action === 'audit') return NO_APPLY;
    if (ctx.action === 'invoice_out') return NO_APPLY;
    const d = ctx.data.description ?? '';
    const markers = ['multa', 'sancion', 'sanción', 'recargo trafico', 'donativo', 'donacion', 'donación', 'penalizacion', 'penalización'];
    if (!descriptionContainsAny(d, markers)) return NO_APPLY;
    return {
      applies: true,
      severity: 'warning',
      message:
        'Multas/sanciones/donativos: NO son gasto deducible (Art. 15 LIS / Art. 28-30 LIRPF). Si lo registras como gasto, recuerda hacer el ajuste positivo al resultado contable en el modelo 200 o IRPF.',
      legalBasis: [
        { law: 'LIS', article: 'Art. 15.c', url: URL_LIS },
        { law: 'LIRPF', article: 'Art. 28-30', url: URL_LIRPF },
      ],
      recommendation:
        'Registra el gasto en cuenta diferenciada (p.ej. 678 Gastos excepcionales) y marca el ajuste extracontable.',
    };
  },
};

// R044 — Pago efectivo posiblemente fraccionado (placeholder hasta tener
// contexto de ledger agregado en F11 fase 2c).
const R044: AeatRule = {
  id: 'R044',
  category: 'tesoreria',
  description:
    'Pago en efectivo fraccionado por la misma operación: la suma debe respetarse para el límite de 1.000€.',
  appliesTo: scopeFor(['invoice_in', 'invoice_out', 'expense']),
  check: (ctx: RuleContext): RuleEvaluation => {
    if (
      ctx.action === 'payroll' ||
      ctx.action === 'tax_payment' ||
      ctx.action === 'journal' ||
      ctx.action === 'profile_check' || ctx.action === 'audit'
    )
      return NO_APPLY;
    const data = ctx.data;
    if (data.paymentMethod !== 'cash') return NO_APPLY;
    // Heurística action-time: si el importe está justo por debajo del
    // umbral (>=900 y <1000), avisamos por riesgo de fragmentación.
    if (!decimalGTE(data.amount, '900')) return NO_APPLY;
    if (decimalGTE(data.amount, '1000')) return NO_APPLY;
    return {
      applies: true,
      severity: 'info',
      message:
        'Pago en efectivo justo por debajo del umbral (1.000€): la Ley 7/2012 obliga a sumar pagos fraccionados de una misma operación. Si esta es la segunda parte de una operación previa, ya superas el límite y la operación entera es sancionable.',
      legalBasis: [{ law: 'Ley 7/2012', article: 'Art. 7.Uno.2', url: URL_LEY_7_2012 }],
      recommendation:
        '¿Ha habido un pago previo en efectivo por la misma operación? Si sí, regulariza usando otro medio de pago para los próximos.',
    };
  },
};

// ════════════════════════════════════════════════════════════════════════

// ─── Registro completo ───────────────────────────────────────────────────

import { R000_PROFILE_CHECK } from './inspector-aeat-profile';

export const AEAT_RULES: ReadonlyArray<AeatRule> = [
  // Transversal
  R000_PROFILE_CHECK,
  // IVA deducibilidad
  R001, R002, R003, R004,
  R005, R006, R007, R009,
  // IVA repercutido / comercio exterior
  R016, R017, R019, R022,
  // IRPF retenciones
  R010, R011, R012, R080, R082,
  // Plazos
  R020,
  // Facturación / efectivo / formato
  R030, R031, R032,
  R033, R034, R035, R036, R039,
  R044, R047,
  // Verifactu / conservación
  R040A, R040B, R041,
  // Vinculadas
  R050,
  // Régimen RE
  R060,
  // PGC / sociedades
  R070, R125,
];

export function findRuleById(id: string): AeatRule | undefined {
  return AEAT_RULES.find((r) => r.id === id);
}

// Re-export legal URLs so other modules (admin UI, docs) can reuse them
// without duplicating constants.
export const RULE_LEGAL_URLS = {
  LIVA: URL_LIVA,
  LIRPF: URL_LIRPF,
  RD_FACTURACION: URL_RD_FACT,
  LEY_7_2012: URL_LEY_7_2012,
  RD_VERIFACTU: URL_RD_VERIFACTU,
  RD_LEY_15_2025: URL_RDL_15_2025,
  LIS: URL_LIS,
  LGT: URL_LGT,
  RGAT: URL_RGAT,
} as const;

export type { LegalBasis };
