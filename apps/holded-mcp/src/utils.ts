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
 *
 * Bug adicional (18-may-2026, soporte audit `list_documents`):
 *   Esta variante era originalmente una constante exportada compartida entre
 *   `starttmp` y `endtmp` de varias tools. Con Zod v3, `zod-to-json-schema`
 *   deduplica schemas que referencian la MISMA instancia y emite un
 *   `$ref` apuntando al primero — generando, p.ej.:
 *     `endtmp: { "$ref": "#/properties/starttmp", "description": "End date" }`
 *   En la mayoría de clientes MCP el `$ref` se respeta sin más, pero la UI de
 *   ChatGPT (y posiblemente otros) renderiza ambos campos colapsados como un
 *   solo input — el usuario no puede sobrescribir `endtmp` independientemente.
 *
 * Solución: convertir el export en una factory que devuelva una NUEVA instancia
 * en cada llamada. Cada campo construye su propio sub-schema → cero
 * deduplicación → ambos quedan inlined con su `description` propia.
 */
export function dateInputOptional() {
  return z
    .union([z.string(), z.number()])
    .nullish()
    .transform((v) => (v == null ? undefined : v));
}

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
  pageSize: number = 250
): PaginationMeta {
  // V3.G (auditoría 2026-06-01): default era 500 con un comentario equivocado
  // ("Holded /dailyledger devuelve por defecto hasta ~500 por pagina"). En
  // realidad Holded devuelve hasta ~250 por pagina en /dailyledger (testeado
  // contra Nova Gestion: pagina 1 = 250, pagina 2 = 219 más). El default 500
  // hacia que `itemsInPage >= pageSize` evaluase a false cuando la pagina
  // venia con 250 (la realidad), el modelo dejaba de paginar y se perdia
  // medio diario — exactamente el bug reportado por el usuario en una
  // consulta de inmovilizado + cierres 2025.
  //
  // Heuristica corregida: si la pagina llego "llena" (itemsInPage >= 250)
  // asumimos que hay mas. Falsos positivos siguen siendo OK (una llamada
  // extra y lista vacia). Falsos negativos = aggregates a la mitad sin avisar.
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
 * V3.G (auditoría 2026-06-01): orden estable client-side de asientos del
 * libro diario y entradas similares. Holded `/dailyledger` devuelve los
 * registros en el orden interno de Mongo (insertion order, sin garantías),
 * lo que para una vista contable es inutilizable — el usuario reporto
 * asientos saliendo en orden "122-129, luego 280, 356, 384..., 660-677,
 * 137 al final", imposible de cuadrar.
 *
 * Ordenamos por `date` ASC (oldest first, como espera un libro diario)
 * y rompemos empates por `number` (numero de asiento) ASC. Si alguno de
 * estos campos falta, lo movemos al final manteniendo la posicion entre
 * ellos (sort estable).
 */
export function sortJournalEntries<T extends Record<string, unknown>>(entries: T[]): T[] {
  const withIndex = entries.map((entry, idx) => ({ entry, idx }));
  withIndex.sort((a, b) => {
    const dateA = toComparableNumber((a.entry as { date?: unknown }).date);
    const dateB = toComparableNumber((b.entry as { date?: unknown }).date);
    if (dateA !== dateB) {
      // null/NaN al final
      if (dateA === null) return 1;
      if (dateB === null) return -1;
      return dateA - dateB;
    }
    const numA = toComparableNumber(
      (a.entry as { number?: unknown }).number ?? (a.entry as { docNumber?: unknown }).docNumber
    );
    const numB = toComparableNumber(
      (b.entry as { number?: unknown }).number ?? (b.entry as { docNumber?: unknown }).docNumber
    );
    if (numA !== numB) {
      if (numA === null) return 1;
      if (numB === null) return -1;
      return numA - numB;
    }
    return a.idx - b.idx;
  });
  return withIndex.map((w) => w.entry);
}

function toComparableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) return parsed;
    // Soporta formato "001", "A-002", etc. — extraemos solo los digitos.
    const digits = trimmed.match(/\d+/);
    if (digits) {
      const parsedDigits = Number(digits[0]);
      if (Number.isFinite(parsedDigits)) return parsedDigits;
    }
  }
  return null;
}

/**
 * Paginación client-side honesta para endpoints `/list_*` donde Holded
 * devuelve el array completo en una sola llamada (no acepta `?page=N`).
 *
 * Bug original (18-may-2026, soporte audit "291 facturas paginando"):
 *   `list_documents`, `list_contacts` y `list_products` truncaban a `limit`
 *   en el conector y forwardeaban `?page=N` a Holded — pero esos endpoints
 *   NO soportan paginación nativa, así que Holded devolvía siempre el mismo
 *   conjunto (la "primera página"), y page=2 retornaba [] o lo mismo. El
 *   modelo no podía avanzar: para obtener las 291 facturas tenía que
 *   inventar workarounds bizantinos (trocear por endtmp decreciente,
 *   deduplicar por ID en cliente).
 *
 * Fix: el conector hace UNA sola llamada a Holded, recibe el array completo,
 * y aplica `slice((page-1)*limit, page*limit)` localmente. NO forwardea
 * `page` a Holded. Esto convierte la paginación en una operación cliente
 * 100% predecible: page=N siempre funciona mientras N*limit < totalItems.
 *
 * El trade-off: cada call descarga el dataset completo. Para cuentas con
 * miles de docs eso es ineficiente, pero es lo único correcto mientras
 * Holded no exponga paginación real. La alternativa (truncar y mentir al
 * modelo diciéndole "use page=2") ya demostró ser peor — el modelo entraba
 * en loops y nunca obtenía datos completos.
 */
export interface ClientPagination<T> {
  items: T[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasMore: boolean;
    nextPage: number | null;
    hint: string | null;
  };
}

export function paginateInMemory<T>(
  all: T[],
  page: number,
  pageSize: number,
  options: { itemNoun?: string } = {}
): ClientPagination<T> {
  const totalItems = all.length;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);
  const safePage = Math.max(1, Math.floor(page));
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  const items = all.slice(start, end);
  const hasMore = safePage < totalPages;
  const noun = options.itemNoun ?? 'items';
  return {
    items,
    meta: {
      page: safePage,
      pageSize,
      totalItems,
      totalPages,
      hasMore,
      nextPage: hasMore ? safePage + 1 : null,
      hint: hasMore
        ? `Showing ${items.length} of ${totalItems} ${noun} (page ${safePage} of ${totalPages}). Call again with page=${safePage + 1} to get the next batch. Pagination is fully client-side — page=N always works deterministically while N <= totalPages.`
        : safePage > 1 && items.length === 0
          ? `No ${noun} on page ${safePage} — totalItems=${totalItems}, totalPages=${totalPages}. You may have paged past the end.`
          : null,
    },
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

/**
 * Default range para `/documents` cuando el caller no provee starttmp ni endtmp.
 *
 * Bug original (18-may-2026, soporte audit `list_documents`):
 *   El handler aplicaba `starttmp = 1-ene del año anterior` pero NO seteaba
 *   `endtmp`, asumiendo "Holded interpreta como hoy". Es falso: la API
 *   /documents rechaza con 400 si recibe solo uno de los dos timestamps.
 *
 * Solución: igual que `/dailyledger`, devolver SIEMPRE ambos. Cubrimos un rango
 * de ~24 meses ("1 de enero del año anterior" → ahora) para que la auditoría
 * fiscal vea el ejercicio en curso + el cerrado anterior sin que el modelo
 * tenga que pasar fechas explícitas.
 */
export function defaultDocumentsRange(): { starttmp: string; endtmp: string } {
  const now = new Date();
  const previousYear = now.getUTCFullYear() - 1;
  return {
    starttmp: String(Math.floor(Date.UTC(previousYear, 0, 1) / 1000)),
    endtmp: String(Math.floor(now.getTime() / 1000)),
  };
}
