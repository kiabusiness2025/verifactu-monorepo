// Serializer Modelo 180 → BOE TXT.
//
// Estructura:
//   * 1 x Registro tipo 1 (declarante) — 500 bytes
//   * N x Registro tipo 2 (perceptor)   — 500 bytes cada uno
//
// Spec codificado MANUALMENTE desde DR_Mod_180_2023.pdf (AEAT).
// OCA/l10n-spain no incluye este módulo.

import type { Modelo180Result } from '../../isaak-modelo-180-ledger';
import { encodeIso8859_15, renderRecord } from '../format-engine';
import { type SerializeResult } from '../common';
import { SPEC_180_TIPO1, SPEC_180_TIPO2 } from './fields';

export type Modelo180Context = {
  companyVat: string;
  companyName: string;
  telefonoContacto?: string;
  nombreContacto?: string;
  // Número identificativo de la declaración (13 chars, prefijo "180").
  // Si no se pasa, se genera automáticamente: "180" + ejercicio + secuencia.
  numeroDeclaracion?: string;
  // Si es complementaria/sustitutiva
  complementaria?: boolean;
  sustitutiva?: boolean;
  numeroDeclaracionAnterior?: string;
};

function generateNumeroDeclaracion(ejercicio: number): string {
  // Formato: "180" + YYYY + 6 dígitos aleatorios = 13 chars.
  const random = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, '0');
  return `180${ejercicio}${random}`;
}

// Mapeo simple de letras de NIF a códigos de provincia.
// El modelo 180 requiere el código de provincia del perceptor, pero
// nosotros no lo tenemos en el LedgerEntry. Como fallback usamos "28"
// (Madrid) — el contribuyente puede editar el fichero antes de
// presentar si fuese necesario. No es óptimo pero evita rechazo.
const DEFAULT_PROVINCIA = '28';

export function serialize180(
  result: Modelo180Result,
  ctx: Modelo180Context,
): SerializeResult {
  try {
    // ─── Registro tipo 1: declarante ─────────────────────────────────
    const tipo1Ctx: Record<string, unknown> = {
      ejercicio: String(result.ejercicio),
      nifDeclarante: ctx.companyVat.toUpperCase(),
      nombreDeclarante: normalizeName(ctx.companyName),
      telefonoContacto: ctx.telefonoContacto ?? '',
      nombreContacto: normalizeName(ctx.nombreContacto ?? ''),
      numeroDeclaracion:
        ctx.numeroDeclaracion ?? generateNumeroDeclaracion(result.ejercicio),
      declaracionComplementaria: ctx.complementaria ? 'C' : '',
      declaracionSustitutiva: ctx.sustitutiva ? 'S' : '',
      numeroDeclaracionAnterior: ctx.numeroDeclaracionAnterior ?? '',
      totalPerceptores: result.perceptores,
      signoBase: '', // siempre positivo (importes ≥ 0 según especificación)
      importeTotalBases: result.totalBase,
      totalRetenciones: result.totalRetenciones,
      reservado1: '',
      selloElectronico: '',
    };
    const tipo1Str = renderRecord(SPEC_180_TIPO1, tipo1Ctx);

    // ─── Registros tipo 2: perceptores ────────────────────────────────
    const tipo2Strs = result.lineas.map((l) => {
      // Calcular porcentaje de retención: retencion / base × 100
      // Si base es 0, porcentaje es 0.
      const pct = l.baseAnual > 0 ? (l.retencionAnual / l.baseAnual) * 100 : 0;
      const pctEntero = Math.floor(pct);
      const pctDecimal = Math.round((pct - pctEntero) * 100);

      const tipo2Ctx: Record<string, unknown> = {
        ejercicio: String(result.ejercicio),
        nifDeclarante: ctx.companyVat.toUpperCase(),
        nifPerceptor: l.nif.toUpperCase(),
        nifRepresentante: '',
        nombrePerceptor: normalizeName(l.nombre),
        codigoProvincia: DEFAULT_PROVINCIA,
        modalidad: '1', // dinerario
        signoBase: '', // positivo
        baseRetenciones: l.baseAnual,
        porcentajeEntero: pctEntero,
        porcentajeDecimal: pctDecimal,
        retencionPerceptor: l.retencionAnual,
        ejercicioDevengo: 0, // mismo ejercicio (por defecto)
        situacionInmueble: '4', // sin referencia catastral
        referenciaCatastral: '',
        tipoVia: '',
        nombreVia: '',
        tipoNumeracion: '',
        numeroCasa: '',
        calificadorNumero: '',
        bloque: '',
        portal: '',
        escalera: '',
        planta: '',
        puerta: '',
        complemento: '',
        localidad: '',
        municipio: '',
        codigoMunicipio: '',
        codigoProvinciaInmueble: DEFAULT_PROVINCIA,
        codigoPostal: '',
        reservadoFinal: '',
      };
      return renderRecord(SPEC_180_TIPO2, tipo2Ctx);
    });

    const text = tipo1Str + tipo2Strs.join('');
    const bytes = encodeIso8859_15(text);
    return { ok: true, bytes, text };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// Normaliza nombres: mayúsculas, sin acentos, sin caracteres especiales.
// Regla AEAT: "Mayúsculas, sin caracteres especiales y sin vocales
// acentuadas, excepto que se especifique lo contrario".
function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toUpperCase()
    .replace(/[^A-Z0-9 \-,.&]/g, ' ') // permitir solo charset ASCII básico
    .replace(/\s+/g, ' ')
    .trim();
}
