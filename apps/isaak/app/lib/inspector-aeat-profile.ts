// F11 fase 2 — R000 Perfil Fiscal Mínimo (capa transversal previa).
//
// Ninguna regla compleja del Inspector debería ejecutarse sin saber
// qué tipo de empresa se está inspeccionando. Este módulo:
//
//   1. Define los CAMPOS NÚCLEO del perfil de un contribuyente
//      (tipo, territorio, régimen IVA, sector, etc.) y para cada uno
//      indica si es "required" para producir asesoría fiable.
//
//   2. Expone `evaluateProfile(profile)` que devuelve un report con
//      qué campos faltan, qué reglas downstream pueden verse afectadas
//      y la severidad agregada del gap.
//
//   3. Registra la "regla R000" para que el engine la dispare cuando
//      se le pasa un contexto `action: 'profile_check'`.

import type {
  AeatRule,
  RuleContext,
  RuleEvaluation,
  TaxpayerProfileSnapshot,
  RuleSeverity,
} from './inspector-aeat';

export type ProfileFieldKey = keyof TaxpayerProfileSnapshot;

export type ProfileFieldSpec = {
  field: ProfileFieldKey;
  // required=true → la ausencia bloquea la asesoría fiable (warning)
  // required=false → solo info (recomendado completar, no crítico)
  required: boolean;
  label: string;
  recommendation: string;
};

// Catálogo de campos núcleo. Orden importa para la UX: primero los
// críticos. Cualquier nuevo campo de TaxpayerProfileSnapshot debe
// añadirse aquí para que R000 lo conozca.
export const CORE_PROFILE_FIELDS: ReadonlyArray<ProfileFieldSpec> = [
  {
    field: 'taxpayerType',
    required: true,
    label: 'Tipo de contribuyente (autónomo, SL, SA, comunidad de bienes, etc.)',
    recommendation:
      'Sin tipo no podemos distinguir reglas de IRPF (autónomo) vs IS (sociedad) ni aplicar las fechas Verifactu correctas.',
  },
  {
    field: 'territory',
    required: true,
    label: 'Territorio fiscal (común, Canarias, País Vasco, Navarra, Ceuta/Melilla)',
    recommendation:
      'Sin territorio podemos aplicar reglas peninsulares en lugar de IGIC (Canarias) o TicketBAI (País Vasco), produciendo falsos positivos.',
  },
  {
    field: 'vatRegime',
    required: true,
    label: 'Régimen de IVA (general, recargo equivalencia, criterio de caja, SII, prorrata, exento)',
    recommendation:
      'Sin régimen no detectamos correctamente el recargo equivalencia ni el criterio de caja. Con régimen general se asumen reglas estándar.',
  },
  {
    field: 'corporateTaxSubject',
    required: false,
    label: '¿Sujeto al Impuesto sobre Sociedades?',
    recommendation:
      'Determina el plazo Verifactu aplicable (1 enero 2027 IS vs 1 julio 2027 resto) y la obligación de modelo 200.',
  },
  {
    field: 'hasEmployees',
    required: false,
    label: '¿Tiene empleados con nómina?',
    recommendation:
      'Activa las reglas de retención IRPF, modelo 111 trimestral y resumen anual 190.',
  },
  {
    field: 'hasRentWithholding',
    required: false,
    label: '¿Paga alquileres a personas físicas con retención?',
    recommendation:
      'Activa modelo 115 trimestral y verificación de retención 19% (R011).',
  },
  {
    field: 'hasProfessionalInvoices',
    required: false,
    label: '¿Recibe facturas de profesionales con retención?',
    recommendation:
      'Activa modelo 111 (parte profesionales) y verificación de retención 15%/7% (R010).',
  },
  {
    field: 'hasIntraEUOperations',
    required: false,
    label: '¿Realiza operaciones intracomunitarias?',
    recommendation:
      'Activa modelo 349, verificación NIF-IVA/VIES y inversión sujeto pasivo.',
  },
  {
    field: 'hasRelatedParties',
    required: false,
    label: '¿Opera con partes vinculadas (socios, administradores, familiares)?',
    recommendation:
      'Activa reglas de valoración a precio de mercado (Art. 18 LIS) y expediente documental.',
  },
  {
    field: 'usesBillingSoftware',
    required: false,
    label: '¿Usa software de facturación de terceros?',
    recommendation:
      'Permite enfocar las alertas Verifactu sobre el SIF correcto. Si solo usa Isaak, ya es conforme.',
  },
  {
    field: 'annualTurnover',
    required: false,
    label: 'Cifra de negocio anual aproximada',
    recommendation:
      'Útil para umbrales SII (>6M obligatorio), régimen simplificado y módulos.',
  },
  {
    field: 'sector',
    required: false,
    label: 'Sector de actividad (CNAE o descripción)',
    recommendation:
      'Activa reglas sectoriales: hostelería, ecommerce, transporte, inmobiliario, formación, sanidad.',
  },
];

export type ProfileGap = ProfileFieldSpec & {
  // Mensaje listo para mostrar al usuario sobre por qué falta este campo.
  description: string;
};

export type ProfileReport = {
  // Porcentaje de campos núcleo presentes (0..1). Pondera todos por igual.
  completeness: number;
  gaps: ProfileGap[];
  // True si ningún campo `required` está vacío.
  isComplete: boolean;
  // Severidad agregada: 'warning' si falta algún required, 'info' si solo
  // faltan opcionales, 'info' (con mensaje "OK") si está completo.
  severity: RuleSeverity;
  message: string;
  recommendation: string;
};

function isPresent<K extends ProfileFieldKey>(
  profile: TaxpayerProfileSnapshot,
  field: K
): boolean {
  const v = profile[field];
  if (v === null || v === undefined) return false;
  if (typeof v === 'string' && v.trim() === '') return false;
  return true;
}

export function evaluateProfile(
  profile: TaxpayerProfileSnapshot | null | undefined
): ProfileReport {
  if (!profile) {
    const gaps: ProfileGap[] = CORE_PROFILE_FIELDS.map((f) => ({
      ...f,
      description: `Falta: ${f.label}. ${f.recommendation}`,
    }));
    return {
      completeness: 0,
      gaps,
      isComplete: false,
      severity: 'warning',
      message:
        'Perfil fiscal sin completar. Isaak no puede dar asesoría precisa sin saber tu tipo de contribuyente, territorio y régimen de IVA.',
      recommendation:
        'Completa al menos los tres campos núcleo: tipo (autónomo/SL/...), territorio fiscal y régimen IVA. Sin ellos, las reglas pueden aplicarse incorrectamente.',
    };
  }

  let present = 0;
  const gaps: ProfileGap[] = [];
  for (const spec of CORE_PROFILE_FIELDS) {
    if (isPresent(profile, spec.field)) {
      present++;
    } else {
      gaps.push({
        ...spec,
        description: `Falta: ${spec.label}. ${spec.recommendation}`,
      });
    }
  }

  const completeness = present / CORE_PROFILE_FIELDS.length;
  const requiredGaps = gaps.filter((g) => g.required);
  const isComplete = requiredGaps.length === 0;

  if (!isComplete) {
    const fieldList = requiredGaps.map((g) => g.label).join('; ');
    return {
      completeness,
      gaps,
      isComplete: false,
      severity: 'warning',
      message: `Faltan datos críticos del perfil fiscal: ${fieldList}.`,
      recommendation:
        'Cumplimenta los campos críticos antes de pedir asesoría sobre obligaciones concretas. Sin ellos, las reglas pueden aplicarse incorrectamente.',
    };
  }

  if (gaps.length > 0) {
    return {
      completeness,
      gaps,
      isComplete: true,
      severity: 'info',
      message: `Perfil completo en lo esencial. Datos opcionales pendientes (${gaps.length}) ayudarán a Isaak a personalizar mejor las alertas.`,
      recommendation:
        'Completa los campos opcionales restantes en cualquier momento para mejorar la precisión de las alertas.',
    };
  }

  return {
    completeness: 1,
    gaps: [],
    isComplete: true,
    severity: 'info',
    message: 'Perfil fiscal completo. Todas las reglas del Inspector pueden aplicarse con contexto pleno.',
    recommendation: 'Mantén el perfil actualizado si cambia el tipo, régimen o territorio.',
  };
}

// R000 — la regla transversal del Inspector. Solo dispara cuando el
// orquestador pasa un contexto explícito `action: 'profile_check'`.
// Las reglas downstream usan profileMatchesScope para silenciarse en
// ausencia de datos, así que R000 sirve para que el usuario sepa que
// "Isaak está operando con información incompleta".
export const R000_PROFILE_CHECK: AeatRule = {
  id: 'R000',
  category: 'perfil_fiscal',
  description:
    'Perfil fiscal mínimo del contribuyente. Pinta los campos faltantes que limitan la asesoría.',
  appliesTo: { actions: ['profile_check'] },
  check: (ctx: RuleContext): RuleEvaluation => {
    if (ctx.action !== 'profile_check') return { applies: false };
    const report = evaluateProfile(ctx.profile ?? null);
    if (report.isComplete && report.gaps.length === 0) {
      // Perfil completo → no emitimos violación (sería ruido).
      return { applies: false };
    }
    return {
      applies: true,
      severity: report.severity,
      message: report.message,
      legalBasis: [
        // No es una regla legal en sí — citamos LGT como referencia
        // sobre la importancia del censo y del cumplimiento de
        // obligaciones formales (declaración censal modelo 036/037).
        { law: 'LGT', article: 'Art. 29 (obligaciones formales)' },
      ],
      recommendation: report.recommendation,
      evidenceRequired: report.gaps.map((g) => g.label),
    };
  },
};
