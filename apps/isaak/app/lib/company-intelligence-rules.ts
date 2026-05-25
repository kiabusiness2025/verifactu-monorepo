import type { CompanyProfile } from './company-intelligence-types';

// ── Rule engine types ─────────────────────────────────────────────────────────

export type RuleSeverity = 'ERROR' | 'WARNING' | 'INFO';

export type RuleResult = {
  ruleId: string;
  severity: RuleSeverity;
  message: string;
  remediation?: string;
};

export type CompanyIntelligenceRule = {
  id: string;
  severity: RuleSeverity;
  description: string;
  check: (profile: CompanyProfile) => RuleResult | null;
};

// ── Helper ────────────────────────────────────────────────────────────────────

function result(
  ruleId: string,
  severity: RuleSeverity,
  message: string,
  remediation?: string
): RuleResult {
  return { ruleId, severity, message, remediation };
}

// ── Rules C001–C007 ───────────────────────────────────────────────────────────

const C001: CompanyIntelligenceRule = {
  id: 'C001',
  severity: 'ERROR',
  description: 'NIF obligatorio',
  check(profile) {
    if (profile.fiscal.warningFlags.includes('MISSING_NIF')) {
      return result(
        'C001',
        'ERROR',
        'Falta el NIF/CIF de la empresa.',
        'Introduce el NIF o CIF para continuar.'
      );
    }
    return null;
  },
};

const C002: CompanyIntelligenceRule = {
  id: 'C002',
  severity: 'ERROR',
  description: 'Formato NIF inválido',
  check(profile) {
    if (profile.fiscal.warningFlags.includes('INVALID_NIF_FORMAT')) {
      return result(
        'C002',
        'ERROR',
        `El NIF "${profile.identity.nif}" no supera la validación de dígito de control.`,
        'Comprueba que has introducido el NIF/CIF correcto (8 dígitos + letra para particulares; letra + 7 dígitos + carácter para sociedades).'
      );
    }
    return null;
  },
};

const C003: CompanyIntelligenceRule = {
  id: 'C003',
  severity: 'WARNING',
  description: 'Forma jurídica no identificada',
  check(profile) {
    if (profile.fiscal.warningFlags.includes('MISSING_LEGAL_FORM')) {
      return result(
        'C003',
        'WARNING',
        'No se ha podido determinar la forma jurídica de la empresa.',
        'Indica si es S.L., S.A., autónomo, cooperativa, etc. Esto afecta a los modelos fiscales aplicables.'
      );
    }
    return null;
  },
};

const C004: CompanyIntelligenceRule = {
  id: 'C004',
  severity: 'WARNING',
  description: 'Régimen fiscal de IVA no declarado',
  check(profile) {
    if (profile.fiscal.warningFlags.includes('MISSING_VAT_REGIME')) {
      return result(
        'C004',
        'WARNING',
        'No se conoce el régimen de IVA aplicable.',
        'Declara el régimen: general, recargo de equivalencia, criterio de caja, exento o prorrata.'
      );
    }
    return null;
  },
};

const C005: CompanyIntelligenceRule = {
  id: 'C005',
  severity: 'WARNING',
  description: 'Territorio fiscal no declarado',
  check(profile) {
    if (profile.fiscal.warningFlags.includes('MISSING_TAX_RESIDENCE')) {
      return result(
        'C005',
        'WARNING',
        'No se ha declarado el territorio fiscal (régimen común, País Vasco, Navarra, Canarias, Ceuta/Melilla).',
        'El territorio fiscal determina qué hacienda gestiona tus obligaciones y puede cambiar los modelos aplicables.'
      );
    }
    return null;
  },
};

const C006: CompanyIntelligenceRule = {
  id: 'C006',
  severity: 'WARNING',
  description: 'Coincidencia mercantil de baja confianza',
  check(profile) {
    if (profile.fiscal.warningFlags.includes('LOW_CONFIDENCE_COMPANY_MATCH')) {
      return result(
        'C006',
        'WARNING',
        'Los datos encontrados en fuentes públicas coinciden con baja confianza con la empresa introducida.',
        'Verifica manualmente la razón social y el NIF consultando el BORME o el Registro Mercantil.'
      );
    }
    return null;
  },
};

const C007: CompanyIntelligenceRule = {
  id: 'C007',
  severity: 'WARNING',
  description: 'VIES inválido para operaciones intracomunitarias',
  check(profile) {
    if (profile.fiscal.warningFlags.includes('VIES_INVALID')) {
      return result(
        'C007',
        'WARNING',
        'El número de VAT no está dado de alta en el sistema VIES de la UE.',
        'Para emitir facturas intracomunitarias sin IVA el cliente debe estar registrado en VIES. Verifica con la empresa destinataria.'
      );
    }
    return null;
  },
};

// ── Rules R040A / R040B — VeriFactu / SIF ────────────────────────────────────
// Fechas de entrada en vigor parametrizadas por tipo de contribuyente:
//   - Sociedades: 2027-01-01
//   - Resto (autónomos y entidades): 2027-07-01

const VERIFACTU_DATE_SOCIEDAD = new Date('2027-01-01T00:00:00Z');
const VERIFACTU_DATE_RESTO = new Date('2027-07-01T00:00:00Z');

const R040A: CompanyIntelligenceRule = {
  id: 'R040A',
  severity: 'INFO',
  description: 'Obligación VeriFactu/SIF próxima (sociedades)',
  check(profile) {
    if (profile.fiscal.likelyTaxpayerType !== 'SOCIEDAD') return null;
    if (!profile.fiscal.likelyObligations.includes('VERIFACTU_SIF')) return null;

    const now = new Date();
    const daysUntil = Math.ceil(
      (VERIFACTU_DATE_SOCIEDAD.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntil <= 0) {
      return result(
        'R040A',
        'ERROR',
        'Las sociedades están obligadas a VeriFactu/SIF desde el 1 de enero de 2027. La fecha ya ha pasado.',
        'Verifica que tu software de facturación está homologado como Sistema de Información de Facturación (SIF).'
      );
    }

    if (daysUntil <= 180) {
      return result(
        'R040A',
        'WARNING',
        `Faltan ${daysUntil} días para que las sociedades deban usar VeriFactu/SIF (1 enero 2027).`,
        'Consulta a tu proveedor de software de facturación si su sistema estará homologado como SIF.'
      );
    }

    return result(
      'R040A',
      'INFO',
      `Tu empresa deberá usar VeriFactu/SIF a partir del 1 de enero de 2027 (${daysUntil} días).`,
      'Verifica con tu proveedor de software de facturación que el sistema estará certificado.'
    );
  },
};

const R040B: CompanyIntelligenceRule = {
  id: 'R040B',
  severity: 'INFO',
  description: 'Obligación VeriFactu/SIF próxima (autónomos y entidades)',
  check(profile) {
    const type = profile.fiscal.likelyTaxpayerType;
    if (type !== 'AUTONOMO' && type !== 'ENTIDAD') return null;
    if (!profile.fiscal.likelyObligations.includes('VERIFACTU_SIF')) return null;

    const now = new Date();
    const daysUntil = Math.ceil(
      (VERIFACTU_DATE_RESTO.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntil <= 0) {
      return result(
        'R040B',
        'ERROR',
        'Los autónomos y entidades están obligados a VeriFactu/SIF desde el 1 de julio de 2027.',
        'Verifica que tu software de facturación está homologado como Sistema de Información de Facturación (SIF).'
      );
    }

    if (daysUntil <= 180) {
      return result(
        'R040B',
        'WARNING',
        `Faltan ${daysUntil} días para que autónomos y entidades deban usar VeriFactu/SIF (1 julio 2027).`,
        'Consulta a tu proveedor de software de facturación si el sistema estará homologado como SIF.'
      );
    }

    return result(
      'R040B',
      'INFO',
      `Tu empresa deberá usar VeriFactu/SIF a partir del 1 de julio de 2027 (${daysUntil} días).`,
      'Verifica con tu proveedor de software de facturación que el sistema estará certificado.'
    );
  },
};

// ── Rule registry ─────────────────────────────────────────────────────────────

export const COMPANY_INTELLIGENCE_RULES: CompanyIntelligenceRule[] = [
  C001,
  C002,
  C003,
  C004,
  C005,
  C006,
  C007,
  R040A,
  R040B,
];

export function runCompanyIntelligenceRules(profile: CompanyProfile): RuleResult[] {
  return COMPANY_INTELLIGENCE_RULES.flatMap((rule) => {
    const r = rule.check(profile);
    return r ? [r] : [];
  });
}
