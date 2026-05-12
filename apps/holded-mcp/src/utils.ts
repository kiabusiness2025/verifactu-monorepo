import { z } from 'zod';

/**
 * Schema Zod compartido para fechas que pueden venir como ISO 8601 o Unix seconds.
 * Centralizado para que los tools tengan exactamente la misma forma — y para
 * poder corregir bugs como la reinyección de `null` en un solo sitio.
 */
export const dateInput = z
  .union([z.string(), z.number()])
  .describe('Date as ISO 8601 (recommended) or Unix timestamp in seconds.');

/**
 * Versión opcional de `dateInput` que tolera `null` explícitamente.
 *
 * Bug original (12-may-2026, ver task #101 + auditoría side-by-side):
 *   Algunos modelos (Claude Opus 4.7, ChatGPT GPT-4 dev mode) envían `endtmp: null`
 *   por defecto cuando el campo es opcional y no quieren rellenarlo. Con un schema
 *   `dateInput.optional()` (que solo permite undefined, no null) Zod rechazaba la
 *   llamada con un error de validación; el modelo leía el error, volvía a intentar
 *   pasando otra vez `null`, y entraba en bucle hasta agotar reintentos.
 *
 * Solución: aceptar nullish y normalizar a undefined en el transform, para que el
 * handler reciba siempre `string | number | undefined` aunque el LLM mande null.
 */
export const dateInputOptional = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v) => (v == null ? undefined : v));

/**
 * Acepta una fecha como Unix timestamp (segundos), número en string, o ISO 8601,
 * y devuelve siempre un Unix timestamp en segundos como string. Lanza si no parsea.
 *
 * Holded espera Unix timestamps en segundos en sus query params y bodies, pero
 * pedirle a un LLM que produzca timestamps Unix es propenso a errores; aceptamos
 * ISO 8601 para que Claude pueda pasar valores naturales.
 */
export function toUnixSecondsString(input: string | number): string {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return Math.floor(input).toString();
  }

  const trimmed = String(input).trim();

  // Numérico puro: asumimos que ya viene en segundos. Si parece milisegundos
  // (>= 10^12) lo convertimos.
  if (/^-?\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    if (!Number.isFinite(n)) {
      throw new Error(`Invalid timestamp: ${trimmed}`);
    }
    return (n >= 1e12 ? Math.floor(n / 1000) : n).toString();
  }

  const ms = Date.parse(trimmed);
  if (!Number.isFinite(ms)) {
    throw new Error(`Invalid date: ${trimmed}. Use ISO 8601 or Unix timestamp.`);
  }

  return Math.floor(ms / 1000).toString();
}

/**
 * Variante numérica para campos que el JSON body de Holded pide como número.
 */
export function toUnixSecondsNumber(input: string | number): number {
  return Number(toUnixSecondsString(input));
}

/**
 * Metadata de paginación que se devuelve al modelo junto con el batch de items.
 *
 * Bug original (12-may-2026, ver task #103 + auditoria side-by-side):
 *   ChatGPT pregunto el balance contable del grupo 7 y dio 6.221 EUR — pero el
 *   valor real era 10.705 EUR (Claude lo obtuvo paginando el diario completo).
 *   ChatGPT recibio la primera pagina de Holded y se quedo ahi sin saber que
 *   faltaban paginas. Para una tool contable es un fallo critico.
 *
 * Solucion: devolver siempre un objeto `pagination` con un flag explicito
 * `likelyHasMorePages` y un `hint` natural que le diga al modelo "llama otra
 * vez con page=X". La heuristica es conservadora: si la pagina llego llena
 * (itemsInPage === pageSize) asumimos que hay mas. Falsos positivos son OK:
 * el modelo hara una llamada extra y vera lista vacia. Falsos negativos no:
 * darian datos a la mitad sin avisar.
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  itemsInPage: number;
  likelyHasMorePages: boolean;
  suggestedNextPage: number | null;
  hint: string | null;
}

export function buildPaginationMeta(
  itemsInPage: number,
  page: number = 1,
  pageSize: number = 500
): PaginationMeta {
  // Holded /dailyledger devuelve por defecto hasta ~500 entradas por pagina
  // (observado empiricamente; no documentado oficialmente). Si itemsInPage
  // iguala o supera ese umbral, asumimos que hay mas paginas.
  //
  // Bug arreglado (12-may-2026, task #107): antes el default era 100, lo que
  // hacia que el smoke test reportara pageSize=100 cuando Holded devolvia 250.
  // El modelo veia la discrepancia y se confundia.
  const likelyHasMorePages = itemsInPage >= pageSize;
  return {
    page,
    pageSize,
    itemsInPage,
    likelyHasMorePages,
    suggestedNextPage: likelyHasMorePages ? page + 1 : null,
    hint: likelyHasMorePages
      ? `Holded returned ${itemsInPage} items in page ${page} (matches expected pageSize=${pageSize}, page is full). MORE PAGES LIKELY EXIST. Call again with page=${page + 1} to continue, and merge results client-side. Do NOT report aggregate values (totals, sums, counts) until you have fetched every page or you will return a partial answer.`
      : null,
  };
}

/**
 * Helper para parsear el parametro `page` que llega como string desde el LLM.
 * Devuelve 1 si no parsea o es invalido.
 */
export function parsePageParam(page: unknown): number {
  if (typeof page === 'number' && Number.isFinite(page) && page >= 1) {
    return Math.floor(page);
  }
  if (typeof page === 'string') {
    const n = Number(page);
    if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  }
  return 1;
}

/**
 * Formatea un timestamp Unix (segundos) como fecha ISO en Europe/Madrid.
 *
 * Bug original (12-may-2026, task #104): la factura F0030 aparecia con fecha
 * 12/03/2026 en Claude y 11/03/2026 en ChatGPT — el mismo timestamp Unix
 * interpretado en zonas distintas. Para Holded (empresa espanola contable),
 * la zona contable correcta es Europe/Madrid; UTC da off-by-one por la noche.
 *
 * Devuelve "YYYY-MM-DD" en hora oficial espanola, o null si el input no parsea.
 */
export function formatDateMadrid(unixSeconds: unknown): string | null {
  let secs: number | null = null;
  if (typeof unixSeconds === 'number' && Number.isFinite(unixSeconds)) {
    secs = unixSeconds;
  } else if (typeof unixSeconds === 'string') {
    const n = Number(unixSeconds);
    if (Number.isFinite(n)) secs = n;
  }
  if (secs === null || secs <= 0) return null;

  // Holded usa segundos. Si por algun motivo llega en ms, lo detectamos.
  const ms = secs >= 1e12 ? secs : secs * 1000;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return null;

  // Intl.DateTimeFormat con timeZone es la forma fiable de obtener YYYY-MM-DD
  // localizado sin tirar de luxon/dayjs (cero deps externas).
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  // en-CA devuelve "YYYY-MM-DD" directamente.
  return parts;
}

/**
 * Anade campos `*Formatted` (Europe/Madrid) junto a los timestamps Unix de un
 * documento Holded. Mantiene el campo original para retrocompatibilidad y
 * para que el modelo pueda hacer aritmetica con timestamps si quiere.
 *
 * Campos enriquecidos: date -> dateFormatted, dueDate -> dueDateFormatted,
 * createdAt -> createdAtFormatted, updatedAt -> updatedAtFormatted.
 */
export function enrichDocumentDates<T extends Record<string, unknown>>(doc: T): T {
  if (!doc || typeof doc !== 'object') return doc;
  const out: Record<string, unknown> = { ...doc };
  const map: Array<[string, string]> = [
    ['date', 'dateFormatted'],
    ['dueDate', 'dueDateFormatted'],
    ['createdAt', 'createdAtFormatted'],
    ['updatedAt', 'updatedAtFormatted'],
  ];
  for (const [src, dest] of map) {
    if (src in out) {
      const f = formatDateMadrid(out[src]);
      if (f !== null) out[dest] = f;
    }
  }
  return out as T;
}

/**
 * Holded `/api/accounting/v1/dailyledger` requiere `starttmp` y `endtmp` como
 * mandatory. El schema Zod permite omitirlos para que el LLM no falle al
 * llamar (bug #101), pero el handler tiene que rellenarlos antes de la
 * llamada HTTP o Holded responde 400.
 *
 * Default conservador: rango del año fiscal en curso (1-enero hasta ahora).
 * Si el usuario quiere otro rango, debe pasar starttmp y endtmp explicitos.
 *
 * Bug original (12-may-2026, task #106): el smoke test post-deploy de #101
 * devolvio "Query params starttmp & endtmp are mandatory" del API de Holded.
 */
export function defaultDailyLedgerRange(): { starttmp: string; endtmp: string } {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  return {
    starttmp: String(Math.floor(yearStart.getTime() / 1000)),
    endtmp: String(Math.floor(now.getTime() / 1000)),
  };
}
