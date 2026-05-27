// AEAT formats — capa de serialización al formato oficial AEAT.
//
// Cada modelo AEAT tiene un "diseño de registro" publicado en:
//   https://sede.agenciatributaria.gob.es/Sede/ayuda/disenos-registro/modelos.html
//
// Hay dos familias de formatos en AEAT:
//
//   * BOE TXT (fixed-width):
//     Cada línea es un "registro" de longitud variable según el modelo
//     (típicamente 250-500 chars). Campos en posiciones específicas con
//     padding (ceros para numéricos, espacios para texto). Encoding
//     ISO-8859-15. Usado por 303, 130, 111, 115, 180, 190, 347, 349
//     (formato legacy).
//
//   * XML (XSD-validado):
//     Tags estructurados según un XSD publicado por AEAT. Usado en
//     SII, Verifactu, y modelos modernos. La presentación SOAP usa
//     este formato dentro del envelope.
//
// Para v1 implementamos el formato BOE TXT, que es el que acepta el
// servicio de "presentación por fichero" para todos nuestros 8 modelos.
//
// Fuente de verdad (referencia auditable):
//   github.com/OCA/l10n-spain (Odoo localization, LGPL/AGPL)
//
// Cada serializer expone:
//   * spec: descripción del modelo (versión, registros, total bytes)
//   * serialize(internal): string en formato fixed-width
//   * validate(line): array de errores (longitud, charset, etc.)

// ─── Especificación de un campo del fichero fixed-width ────────────────

export type FieldSpec = {
  // Nombre interno + descripción humana del campo
  name: string;
  description: string;
  // Tamaño en caracteres (no bytes; ISO-8859-15 es 1 char = 1 byte
  // para todos los caracteres permitidos en el subset AEAT).
  size: number;
  // Decimal places (solo para tipo 'float'). El tamaño total incluye
  // los decimales SIN punto: 17 con decimal_size=2 = 15 enteros + 2
  // decimales codificados como '00000000000012345' (= 123.45).
  decimalSize?: number;
  // Alineación al rellenar al tamaño total.
  alignment: 'left' | 'right';
  // Cómo codificar el signo en numéricos:
  //   * applySign=true: prefija positiveSign (default ' ') o negativeSign (default 'N')
  //   * applySign=false: solo magnitud
  applySign: boolean;
  positiveSign?: string;
  negativeSign?: string;
  // Para tipo string: relleno con espacios (default) o ceros
  padChar?: string;
  // Tipo del valor de entrada
  type: 'string' | 'integer' | 'float' | 'boolean' | 'date';
  // Para boolean: cómo codificar
  boolYes?: string;
  boolNo?: string;
  // Si fixedValue está definido, ignora el input y emite este literal
  fixedValue?: string;
  // Si conditional devuelve false, emite blanco completo (padding)
  conditional?: (input: unknown) => boolean;
};

// ─── Renderizador puro de un campo ─────────────────────────────────────

export function renderField(spec: FieldSpec, value: unknown): string {
  // Si hay fixedValue, usar literal
  if (spec.fixedValue !== undefined) {
    return pad(spec.fixedValue, spec);
  }
  // Si hay conditional y devuelve false, emitir blanco
  if (spec.conditional && !spec.conditional(value)) {
    return ' '.repeat(spec.size);
  }
  // Si value es null/undefined, emitir blanco/cero según tipo
  if (value === null || value === undefined) {
    if (spec.type === 'string') return ' '.repeat(spec.size);
    if (spec.type === 'integer' || spec.type === 'float') {
      return renderNumeric(0, spec);
    }
    if (spec.type === 'boolean') return spec.boolNo ?? ' '.repeat(spec.size);
    return ' '.repeat(spec.size);
  }

  if (spec.type === 'string') {
    return pad(String(value), spec);
  }
  if (spec.type === 'integer') {
    const n = typeof value === 'number' ? value : Number(value);
    return renderNumeric(Number.isFinite(n) ? Math.trunc(n) : 0, spec);
  }
  if (spec.type === 'float') {
    const n = typeof value === 'number' ? value : Number(value);
    return renderNumeric(Number.isFinite(n) ? n : 0, spec);
  }
  if (spec.type === 'boolean') {
    const truthy = Boolean(value);
    return truthy ? (spec.boolYes ?? '1') : (spec.boolNo ?? '0');
  }
  if (spec.type === 'date') {
    // Fecha en formato DDMMAAAA (8 chars sin separadores)
    if (value instanceof Date) {
      const d = String(value.getDate()).padStart(2, '0');
      const m = String(value.getMonth() + 1).padStart(2, '0');
      const y = String(value.getFullYear());
      return `${d}${m}${y}`;
    }
    return ' '.repeat(spec.size);
  }
  return ' '.repeat(spec.size);
}

function pad(s: string, spec: FieldSpec): string {
  const padChar = spec.padChar ?? ' ';
  if (s.length >= spec.size) return s.slice(0, spec.size);
  if (spec.alignment === 'right') return s.padStart(spec.size, padChar);
  return s.padEnd(spec.size, padChar);
}

function renderNumeric(n: number, spec: FieldSpec): string {
  const decimals = spec.decimalSize ?? 0;
  const isNegative = n < 0;
  const absN = Math.abs(n);
  // Convertir a entero multiplicando por 10^decimals
  const intValue = Math.round(absN * Math.pow(10, decimals));
  let body: string;
  if (spec.applySign) {
    // El signo va en el primer carácter, el resto es la magnitud
    // padding con ceros a la izquierda
    const signChar = isNegative
      ? (spec.negativeSign ?? 'N')
      : (spec.positiveSign ?? ' ');
    const magnitudeSize = spec.size - 1;
    const magnitudeStr = String(intValue).padStart(magnitudeSize, '0');
    body = signChar + magnitudeStr.slice(-magnitudeSize);
  } else {
    body = String(intValue).padStart(spec.size, '0');
    body = body.slice(-spec.size);
  }
  return body;
}

// ─── Serializa una lista de campos en un único registro ────────────────

export function renderRecord(
  fields: ReadonlyArray<FieldSpec>,
  ctx: Record<string, unknown>,
): string {
  const parts: string[] = [];
  for (const field of fields) {
    const value = ctx[field.name];
    parts.push(renderField(field, value));
  }
  return parts.join('');
}

// ─── Validador: comprueba que cada campo respeta su tamaño ─────────────

export type ValidationError = {
  field: string;
  message: string;
  position: number;
};

export function validateRecord(
  fields: ReadonlyArray<FieldSpec>,
  ctx: Record<string, unknown>,
): ValidationError[] {
  const errors: ValidationError[] = [];
  let position = 0;
  for (const field of fields) {
    const rendered = renderField(field, ctx[field.name]);
    if (rendered.length !== field.size) {
      errors.push({
        field: field.name,
        position,
        message: `Field "${field.name}" rendered ${rendered.length} chars, expected ${field.size}`,
      });
    }
    position += field.size;
  }
  return errors;
}

// ─── Encoding a ISO-8859-15 (bytes) ────────────────────────────────────
//
// AEAT requiere los ficheros en ISO-8859-15 (también conocido como
// Latin-9). Diferencias clave con UTF-8:
//   * 1 byte por carácter (los del subset Latin-9)
//   * El símbolo € en posición 0xA4
//
// Convertimos el string JS (UTF-16 interno) a Buffer ISO-8859-15.

const ISO_REPLACEMENTS: Record<string, number> = {
  // Caracteres específicos de Latin-9 que difieren de Latin-1
  '€': 0xa4,
  Š: 0xa6,
  š: 0xa8,
  Ž: 0xb4,
  ž: 0xb8,
  Œ: 0xbc,
  œ: 0xbd,
  Ÿ: 0xbe,
};

export function encodeIso8859_15(s: string): Buffer {
  const bytes: number[] = [];
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (code < 0x80) {
      bytes.push(code);
      continue;
    }
    if (ISO_REPLACEMENTS[ch] !== undefined) {
      bytes.push(ISO_REPLACEMENTS[ch]!);
      continue;
    }
    if (code <= 0xff) {
      bytes.push(code);
      continue;
    }
    // Carácter fuera de Latin-9 → '?'
    bytes.push(0x3f);
  }
  return Buffer.from(bytes);
}
