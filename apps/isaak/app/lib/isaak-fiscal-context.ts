// V1.6.1 — Contexto fiscal específico por régimen del tenant.
//
// Cuando el sub-agente fiscal se invoca, lee IsaakTaxpayerProfile y
// añade al system prompt un bloque que le dice EXACTAMENTE qué reglas
// debe aplicar: autónomo módulos vs estimación directa, IVA general
// vs recargo equivalencia, criterio caja, intracom, etc.
//
// Resultado: respuestas precisas al régimen del usuario sin que él
// tenga que repetirlo cada vez. Si el perfil está incompleto, el bloque
// avisa al agente para que pregunte antes de asumir.

import { prisma } from './prisma';

const TAXPAYER_TYPE_LABELS: Record<string, string> = {
  autonomo: 'Autónomo (persona física)',
  sl: 'Sociedad limitada (SL)',
  sa: 'Sociedad anónima (SA)',
  comunidad_bienes: 'Comunidad de bienes',
  asociacion: 'Asociación',
  fundacion: 'Fundación',
};

const TERRITORY_LABELS: Record<string, string> = {
  comun: 'Territorio común (AEAT)',
  canarias: 'Canarias (IGIC en lugar de IVA)',
  pais_vasco: 'País Vasco (Diputación Foral)',
  navarra: 'Navarra (Hacienda Foral)',
  ceuta_melilla: 'Ceuta o Melilla (IPSI en lugar de IVA)',
};

const VAT_REGIME_LABELS: Record<string, string> = {
  general: 'Régimen general de IVA',
  recargo_equivalencia: 'Recargo de equivalencia (comercio minorista — NO autoliquida IVA)',
  criterio_caja: 'Criterio de caja (IVA se devenga al cobro/pago efectivo)',
  simplificado: 'Régimen simplificado de IVA (módulos)',
  prorrata: 'Prorrata de IVA',
  sii: 'Suministro Inmediato de Información (SII)',
  exento: 'Exento de IVA',
};

const VAT_REGIME_RULES: Record<string, string[]> = {
  recargo_equivalencia: [
    'NO presenta modelo 303 ni 390 (excepto operaciones específicas).',
    'NO puede deducir IVA soportado.',
    'En las facturas que reciba aplicarán recargo de equivalencia (5.2%, 1.4% o 0.5%).',
    'Si te pide ayuda con el 303, recuérdale que NO le aplica.',
  ],
  criterio_caja: [
    'El IVA se devenga al cobro (emitidas) y al pago (recibidas), no en fecha de factura.',
    'Tope de facturación anual: 2.000.000 € (datos 2026, contrastar).',
    'En modelo 303 declara solo IVA realmente cobrado/pagado en el trimestre.',
    'Cuidado con clientes acogidos también al criterio de caja — coordinación.',
  ],
  simplificado: [
    'IVA por módulos: cuotas trimestrales fijas por unidad de módulo (empleado, m², etc.).',
    'Modelo 303 con casillas específicas; presenta también modelo 390.',
    'Compatible con estimación objetiva (módulos) en IRPF.',
  ],
  sii: [
    'Envío de libros de IVA a la AEAT en menos de 4 días.',
    'Modelo 390 NO se presenta (sustituido por el SII).',
    'Plazo modelo 303 ampliado hasta el 30 del mes siguiente.',
  ],
};

const TAXPAYER_RULES: Record<string, string[]> = {
  autonomo: [
    'Liquida IRPF (no Impuesto Sociedades).',
    'Modelos típicos: 303 (IVA), 130 (pago fraccionado IRPF en estimación directa), 100 (renta anual).',
    'Si está en estimación objetiva (módulos): modelo 131 en vez de 130.',
    'No tiene obligación de depositar cuentas en el Registro Mercantil.',
  ],
  sl: [
    'Liquida Impuesto sobre Sociedades (no IRPF como persona jurídica).',
    'Modelos típicos: 303 (IVA), 202 (pago fraccionado IS), 200 (declaración anual IS), 390 (resumen anual IVA).',
    'Si paga sueldos: 111 (retenciones), 190 (resumen anual).',
    'Si paga alquileres: 115 (retenciones), 180 (resumen anual).',
    'Obligación de depositar cuentas anuales en el Registro Mercantil.',
  ],
  sa: [
    'Mismo régimen tributario que la SL pero con requisitos mercantiles más estrictos.',
    'Capital mínimo 60.000 €, junta general anual obligatoria.',
  ],
  comunidad_bienes: [
    'NO es contribuyente del Impuesto sobre Sociedades — atribuye rentas a los comuneros.',
    'Modelos típicos: 303 (IVA por la CB), 184 (atribución de rentas a comuneros), 100 (cada comunero en su renta).',
  ],
};

function asBullets(items: string[], indent = '  '): string {
  return items.map((s) => `${indent}- ${s}`).join('\n');
}

/**
 * Genera un bloque de contexto fiscal específico del tenant para añadir
 * al system prompt del agente fiscal. Cadena vacía si no hay perfil
 * relevante o si el perfil indica que el tenant aún no ha respondido.
 */
export async function buildFiscalContextBlock(tenantId: string): Promise<string> {
  const profile = await prisma.isaakTaxpayerProfile
    .findUnique({
      where: { tenantId },
      select: {
        taxpayerType: true,
        territory: true,
        vatRegime: true,
        sector: true,
        corporateTaxSubject: true,
        hasEmployees: true,
        hasRentWithholding: true,
        hasProfessionalInvoices: true,
        hasIntraEUOperations: true,
        usesBillingSoftware: true,
        annualTurnover: true,
        confirmedByUser: true,
      },
    })
    .catch(() => null);

  if (!profile) {
    return [
      '== Perfil fiscal del tenant ==',
      'El usuario NO ha completado el perfil fiscal todavía. Cuando la pregunta',
      'dependa del régimen (modelos, retenciones, deducciones), pregunta primero',
      'qué tipo de contribuyente es (autónomo / SL / CB) y en qué régimen de IVA.',
      'NO asumas el régimen general por defecto.',
    ].join('\n');
  }

  const lines: string[] = ['== Perfil fiscal del tenant =='];

  if (profile.taxpayerType) {
    const label = TAXPAYER_TYPE_LABELS[profile.taxpayerType] ?? profile.taxpayerType;
    lines.push(`Tipo de contribuyente: ${label}`);
    const rules = TAXPAYER_RULES[profile.taxpayerType];
    if (rules) {
      lines.push('Reglas que aplican:');
      lines.push(asBullets(rules));
    }
  }

  if (profile.territory) {
    const label = TERRITORY_LABELS[profile.territory] ?? profile.territory;
    lines.push(`Territorio: ${label}`);
    if (profile.territory !== 'comun') {
      lines.push(
        '  NOTA: las referencias normativas de la AEAT no aplican directamente. Adapta a la hacienda foral correspondiente.',
      );
    }
  }

  if (profile.vatRegime) {
    const label = VAT_REGIME_LABELS[profile.vatRegime] ?? profile.vatRegime;
    lines.push(`Régimen de IVA: ${label}`);
    const rules = VAT_REGIME_RULES[profile.vatRegime];
    if (rules) {
      lines.push('Particularidades del régimen:');
      lines.push(asBullets(rules));
    }
  }

  if (profile.sector) lines.push(`Sector: ${profile.sector}`);

  const flags: string[] = [];
  if (profile.corporateTaxSubject === true)
    flags.push('sujeto a Impuesto de Sociedades');
  if (profile.hasEmployees === true)
    flags.push('tiene empleados (revisar retenciones IRPF 111 y resumen 190)');
  if (profile.hasRentWithholding === true)
    flags.push('paga alquileres con retención (modelo 115 trimestral + 180 anual)');
  if (profile.hasProfessionalInvoices === true)
    flags.push(
      'recibe facturas de profesionales (retención 15% IRPF declarada en 111 + 190 modulares)',
    );
  if (profile.hasIntraEUOperations === true)
    flags.push(
      'opera con UE (modelo 349 trimestral + verificar NIF VIES con isaak_validate_vat_intracom)',
    );

  if (flags.length > 0) {
    lines.push(`Circunstancias relevantes: ${flags.join(' · ')}.`);
  }

  if (profile.annualTurnover) {
    lines.push(
      `Facturación anual aproximada: ${Number(profile.annualTurnover).toLocaleString('es-ES')} €.`,
    );
  }

  if (!profile.confirmedByUser) {
    lines.push(
      'NOTA: los datos vienen pre-rellenos del censo AEAT, no han sido confirmados por el usuario. Si surge ambigüedad, contrasta.',
    );
  }

  return lines.join('\n');
}
