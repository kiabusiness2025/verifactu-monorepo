// Serializer Modelo 349 → BOE TXT.
//
// Estructura list-based:
//   * Registro tipo 1 (cabecera, fields.xml main): datos declarante + totales
//   * N x Registro tipo 2 (partner, fields.xml partner): una línea por
//     (NIF-IVA, clave) con importe agregado
//
// Cada registro tipo 2 incluye: NIF-IVA con prefijo país, nombre, clave
// (E/A/S/I/T/M/R/B/D/F/H/P/U/V/X), importe.
//
// Spec: github.com/OCA/l10n-spain/l10n_es_aeat_mod349 (XML).

import type { Modelo349Result } from '../../isaak-modelo-349-ledger';
import { loadSpecXmlAsFields } from '../xml-spec-parser';
import { renderAndEncode, type SerializeResult } from '../common';
import { SPEC_349_MAIN_XML } from './spec/fields-main';
import { SPEC_349_PARTNER_XML } from './spec/fields-partner';
import { encodeIso8859_15, renderRecord } from '../format-engine';

export type Modelo349Context = {
  companyVat: string;
  companyName: string;
  programVersion?: string;
};

let cachedMainFields: ReturnType<typeof loadSpecXmlAsFields> | null = null;
let cachedPartnerFields: ReturnType<typeof loadSpecXmlAsFields> | null = null;
function getMainFields() {
  if (!cachedMainFields) cachedMainFields = loadSpecXmlAsFields(SPEC_349_MAIN_XML);
  return cachedMainFields;
}
function getPartnerFields() {
  if (!cachedPartnerFields) {
    cachedPartnerFields = loadSpecXmlAsFields(SPEC_349_PARTNER_XML);
  }
  return cachedPartnerFields;
}

export function serialize349(
  result: Modelo349Result,
  ctx: Modelo349Context,
): SerializeResult {
  try {
    const mainFields = getMainFields();
    const partnerFields = getPartnerFields();
    // Render cabecera
    const mainCtx: Record<string, unknown> = {
      company_vat: ctx.companyVat.toUpperCase().padEnd(9, ' '),
      'company_id.name': ctx.companyName,
      year: String(result.ejercicio),
      period_type: result.periodo,
      total_partner_records: result.lineas.length,
      total_partner_amount:
        result.totalEntregas + result.totalAdquisiciones,
      program_version: (ctx.programVersion ?? 'ISAK').slice(0, 4),
    };
    const mainStr = renderRecord(mainFields, mainCtx);
    // Render una línea de partner por cada operación intracom
    const partnerStrs = result.lineas.map((linea) => {
      const partnerCtx: Record<string, unknown> = {
        company_vat: ctx.companyVat.toUpperCase().padEnd(9, ' '),
        year: String(result.ejercicio),
        period_type: result.periodo,
        partner_vat: linea.nifIva,
        partner_name: linea.nombre,
        operation_key: linea.clave,
        amount_untaxed: linea.importe,
      };
      return renderRecord(partnerFields, partnerCtx);
    });
    const text = mainStr + partnerStrs.join('');
    const bytes = encodeIso8859_15(text);
    return { ok: true, bytes, text };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
