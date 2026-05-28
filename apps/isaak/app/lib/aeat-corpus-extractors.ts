// R2 — Extractores de texto puros para el ingester RAG.
//
// Reciben el blob bruto de una fuente AEAT/BOE y devuelven texto plano
// listo para chunkear. Diseño inyectable: el ingester acepta un
// extractor por tipo de fuente (`pdf` | `html`) para que los tests
// usen stubs sin librerías nativas (`pdf-parse`).

export type ExtractTextResult = {
  text: string;
  meta?: {
    title?: string;
    pageCount?: number;
    contentLength?: number;
  };
};

// ─── HTML → texto plano ──────────────────────────────────────────────

// Strips scripts/styles, decodifica entidades comunes y normaliza
// espacio. BOE consolidados son HTML bien estructurado por <p> y
// <h1>/<h2>; el output es legible sin necesidad de librería DOM.
export function extractTextFromHtml(html: string): ExtractTextResult {
  let s = html;
  // Captura el title antes de tirarlo
  const titleMatch = s.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? decodeHtmlEntities(titleMatch[1]!.trim()) : undefined;

  // Elimina script/style/comentarios
  s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');

  // Sustituye <br> y cierres de bloque por saltos de línea para preservar
  // la estructura (párrafos, listas, headers).
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<\/(p|div|li|h[1-6]|tr|article|section)>/gi, '\n');

  // Quita todo el resto de tags
  s = s.replace(/<[^>]+>/g, ' ');

  // Decodifica entidades comunes
  s = decodeHtmlEntities(s);

  // Normaliza espacios pero conserva saltos de línea como párrafos
  s = s.replace(/[ \t]+/g, ' ');
  s = s.replace(/\n[ \t]+/g, '\n');
  s = s.replace(/[ \t]+\n/g, '\n');
  s = s.replace(/\n{3,}/g, '\n\n');
  s = s.trim();

  return {
    text: s,
    meta: { title, contentLength: s.length },
  };
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d: string) => {
      const code = Number.parseInt(d, 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : '';
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => {
      const code = Number.parseInt(h, 16);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : '';
    });
}

// ─── PDF → texto plano (adapter pattern) ──────────────────────────────

// Interface inyectable. Implementación real con `pdf-parse` o
// `pdfjs-dist` se carga lazy en producción para evitar arrastrar binarios
// nativos a los tests del builder.
export type PdfTextExtractor = (buffer: Uint8Array) => Promise<ExtractTextResult>;

export function makeNoopPdfExtractor(): PdfTextExtractor {
  return async () => {
    throw new Error(
      'pdf_extractor_not_configured: instala pdf-parse y pásalo al ingester con `{ pdfExtractor: makePdfParseAdapter() }`.'
    );
  };
}

// Real adapter backed by pdf-parse. Lazy-loaded so tests that import this
// module don't pull in the library (and its test-file side-effects) unless
// they actually call the returned function.
export function makePdfParseAdapter(): PdfTextExtractor {
  return async (buffer: Uint8Array) => {
    // pdf-parse is a CJS module; dynamic import gives us the default export.
    const pdfParse = (await import('pdf-parse')).default as (
      buf: Buffer
    ) => Promise<{ text: string; numpages: number; info: Record<string, unknown> }>;
    const result = await pdfParse(Buffer.from(buffer));
    const title =
      typeof result.info?.Title === 'string' && result.info.Title.trim()
        ? result.info.Title.trim()
        : undefined;
    return {
      text: result.text,
      meta: { title, pageCount: result.numpages, contentLength: result.text.length },
    };
  };
}

// Pure normalizer aplicado tras la extracción (PDF o HTML). Limpia
// saltos múltiples, página-headers repetidos (ej. "Manual práctico
// IRPF — pág. 23 de 700") y normaliza guiones de fin de línea.
export function normalizeExtractedText(s: string): string {
  let out = s;
  // Une palabras partidas con guion al final de línea: "deduc-\ncible" → "deducible"
  out = out.replace(/(\w)-\n(\w)/g, '$1$2');
  // Elimina headers/footers repetidos tipo "Pág. X de N" o "Página X"
  out = out.replace(/^\s*P[áa]g(?:ina)?\.?\s*\d+(\s*de\s*\d+)?\s*$/gim, '');
  // Saltos de línea x3+ → doble
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}
