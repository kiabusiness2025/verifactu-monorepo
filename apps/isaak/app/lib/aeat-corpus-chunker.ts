// F13 Inspector AEAT Capa 3 — text chunker.
//
// Pure. Toma un texto largo (un manual, un BOE consolidado, una página
// INFORMA) y lo trocea en chunks aptos para embedding:
//   * Tamaño objetivo: ~500 tokens (≈ 2.000 caracteres en español)
//   * Solapamiento: 50 tokens (≈ 200 caracteres) para no cortar
//     ideas a mitad y mantener contexto entre chunks vecinos
//   * Respeta fronteras semánticas: párrafos primero, luego oraciones
//
// El token-count exacto se calculará en F13 fase 2 con el tokenizador
// del modelo de embeddings. Aquí estimamos en caracteres (4 chars ≈ 1
// token para español) — suficientemente preciso para la decisión de
// corte.

const DEFAULT_TARGET_CHARS = 2000;
const DEFAULT_OVERLAP_CHARS = 200;
const MIN_CHUNK_CHARS = 100; // descarta restos vacíos / cabeceras sueltas
const CHARS_PER_TOKEN_ESTIMATE = 4;

export type ChunkOptions = {
  targetChars?: number;
  overlapChars?: number;
};

export type TextChunk = {
  content: string;
  index: number;
  estimatedTokens: number;
  title?: string; // párrafo cabecera detectado (línea corta seguida de salto)
};

// Segmenta por dobles saltos (párrafos). Si un párrafo excede el
// objetivo, se segmenta por oración. Si una oración aún excede, se
// trocea por caracteres (raro pero posible con BOEs sin puntuación).
function splitIntoSegments(text: string): string[] {
  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  const segments: string[] = [];
  for (const p of paragraphs) {
    if (p.length <= DEFAULT_TARGET_CHARS) {
      segments.push(p);
      continue;
    }
    // Párrafo demasiado largo → trocea por oración.
    const sentences = p
      .split(/(?<=[\.!?…])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const s of sentences) {
      if (s.length <= DEFAULT_TARGET_CHARS) {
        segments.push(s);
      } else {
        // Oración monstruosa: trocea cada targetChars sin desbordar.
        for (let i = 0; i < s.length; i += DEFAULT_TARGET_CHARS) {
          segments.push(s.slice(i, i + DEFAULT_TARGET_CHARS));
        }
      }
    }
  }
  return segments;
}

// Detecta un título tipo "Artículo 96. Exclusiones del derecho a deducir."
// como primer renglón corto del chunk seguido de un salto.
function detectTitle(content: string): string | undefined {
  const firstNewline = content.indexOf('\n');
  if (firstNewline === -1) return undefined;
  const firstLine = content.slice(0, firstNewline).trim();
  if (firstLine.length === 0 || firstLine.length > 160) return undefined;
  return firstLine;
}

export function chunkText(
  text: string,
  options: ChunkOptions = {}
): TextChunk[] {
  const target = Math.max(200, options.targetChars ?? DEFAULT_TARGET_CHARS);
  const overlap = Math.max(0, Math.min(target - 50, options.overlapChars ?? DEFAULT_OVERLAP_CHARS));

  const clean = text.trim();
  if (clean.length === 0) return [];

  const segments = splitIntoSegments(clean);
  const chunks: TextChunk[] = [];
  let buffer = '';
  let chunkIndex = 0;

  const flush = () => {
    const content = buffer.trim();
    if (content.length < MIN_CHUNK_CHARS) {
      buffer = '';
      return;
    }
    chunks.push({
      content,
      index: chunkIndex++,
      estimatedTokens: Math.ceil(content.length / CHARS_PER_TOKEN_ESTIMATE),
      title: detectTitle(content),
    });
    // Carry overlap into the next buffer (tail of current chunk).
    buffer = content.length > overlap ? content.slice(-overlap) : '';
  };

  for (const seg of segments) {
    if ((buffer + '\n\n' + seg).length > target && buffer.length > 0) {
      flush();
    }
    buffer = buffer.length === 0 ? seg : `${buffer}\n\n${seg}`;
  }
  if (buffer.trim().length > 0) {
    flush();
  }

  return chunks;
}
