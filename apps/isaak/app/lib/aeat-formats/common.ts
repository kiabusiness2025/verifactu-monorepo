// Helpers comunes a todos los serializers de aeat-formats.

import type { FieldSpec } from './format-engine';
import { encodeIso8859_15, renderRecord } from './format-engine';

export type SerializeResult =
  | { ok: true; bytes: Buffer; text: string }
  | { ok: false; error: string };

// Renderiza una lista de campos y devuelve el resultado encoded.
export function renderAndEncode(
  fields: ReadonlyArray<FieldSpec>,
  ctx: Record<string, unknown>,
): SerializeResult {
  try {
    const text = renderRecord(fields, ctx);
    const bytes = encodeIso8859_15(text);
    return { ok: true, bytes, text };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// Construye el nombre canónico AEAT: NIF-modelo-año-periodo.modelo
export function aeatFilename(
  nif: string,
  modelo: string,
  ejercicio: number,
  periodo: string,
): string {
  return `${nif.toUpperCase()}-${modelo}-${ejercicio}-${periodo}.${modelo}`;
}
