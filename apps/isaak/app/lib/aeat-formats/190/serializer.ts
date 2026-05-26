// Serializer Modelo 190 → BOE TXT (versión 2025).
//
// Estructura list-based:
//   * Registro tipo 1 (cabecera): datos declarante + totales anuales
//   * N x Registro tipo 2 (perceptor): clave (A/B/C/...), NIF, nombre,
//     base anual, retención anual
//
// Spec: github.com/OCA/l10n-spain/l10n_es_aeat_mod190/data/2025 (CSV).
// El CSV tiene main_config + sub_perceptor.

import type { Modelo190Result } from '../../isaak-modelo-190-ledger';
import { parseSpecCsv, specLineToFieldSpec } from '../303/spec-parser';
import { encodeIso8859_15, renderRecord, type FieldSpec } from '../format-engine';
import { type SerializeResult } from '../common';
import { SPEC_190_2025_CSV } from './spec/fields-2025';

export type Modelo190Context = {
  companyVat: string;
  companyName: string;
  programVersion?: string;
};

type SplitSpec = {
  cabecera: FieldSpec[];
  perceptor: FieldSpec[];
};

let cachedSpec: SplitSpec | null = null;
function getSpec(): SplitSpec {
  if (cachedSpec) return cachedSpec;
  const lines = parseSpecCsv(SPEC_190_2025_CSV);
  // El CSV del 190 tiene subconfig_id que apunta a "main" y "perceptor".
  // Buscamos las dos sub-configuraciones.
  const headerLines = lines.filter((l) => /header|cabecera|main_export/i.test(l.subconfigId));
  const perceptorLines = lines.filter(
    (l) => /perceptor|sub_perceptor/i.test(l.subconfigId),
  );
  // Si no encontramos por nombre, usar todas como cabecera única (fallback)
  const cabecera =
    headerLines.length > 0
      ? headerLines.sort((a, b) => a.sequence - b.sequence).map(specLineToFieldSpec)
      : lines.sort((a, b) => a.sequence - b.sequence).map(specLineToFieldSpec);
  const perceptor =
    perceptorLines.length > 0
      ? perceptorLines.sort((a, b) => a.sequence - b.sequence).map(specLineToFieldSpec)
      : [];
  cachedSpec = { cabecera, perceptor };
  return cachedSpec;
}

export function serialize190(
  result: Modelo190Result,
  ctx: Modelo190Context,
): SerializeResult {
  try {
    const { cabecera, perceptor } = getSpec();
    const cabeceraCtx: Record<string, unknown> = {
      company_vat: ctx.companyVat.toUpperCase().padEnd(9, ' '),
      'company_id.name': ctx.companyName,
      year: String(result.ejercicio),
      total_perceptor_records: result.lineas.length,
      total_amount: result.totalBase,
      total_withholdings: result.totalRetenciones,
      program_version: (ctx.programVersion ?? 'ISAK').slice(0, 4),
    };
    const cabeceraStr = renderRecord(cabecera, cabeceraCtx);

    const perceptorStrs = result.lineas.map((l) => {
      const pCtx: Record<string, unknown> = {
        company_vat: ctx.companyVat.toUpperCase().padEnd(9, ' '),
        year: String(result.ejercicio),
        perceptor_vat: l.nif,
        perceptor_name: l.nombre,
        perception_key: l.clave,
        base_amount: l.baseAnual,
        withholding_amount: l.retencionAnual,
      };
      return perceptor.length > 0 ? renderRecord(perceptor, pCtx) : '';
    });

    const text = cabeceraStr + perceptorStrs.join('');
    const bytes = encodeIso8859_15(text);
    return { ok: true, bytes, text };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
