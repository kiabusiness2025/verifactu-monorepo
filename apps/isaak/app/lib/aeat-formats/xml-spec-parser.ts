// XML spec parser para modelos AEAT (formato OCA).
//
// La mayoría de los modelos OCA tienen el spec en formato XML con
// records de `aeat.model.export.config.line`. Cada record es un campo
// con position, size, alignment, etc.
//
// Output: SpecLine[] compatible con specLineToFieldSpec del 303.

import type { SpecLine } from './303/spec-parser';
import type { FieldSpec } from './format-engine';
import { specLineToFieldSpec } from './303/spec-parser';

// Parser simple sin dependencias. Maneja los <record> y sus <field>.
// No es un parser XML completo — asume el formato OCA específico.

export function parseSpecXml(xml: string): SpecLine[] {
  const out: SpecLine[] = [];
  // Match <record id="..." model="aeat.model.export.config.line">...</record>
  const recordRegex =
    /<record\s+id="([^"]+)"\s+model="aeat\.model\.export\.config\.line"[^>]*>([\s\S]*?)<\/record>/g;
  let match: RegExpExecArray | null;
  while ((match = recordRegex.exec(xml)) !== null) {
    const id = match[1]!;
    const body = match[2]!;
    const line = parseRecordBody(id, body);
    if (line) out.push(line);
  }
  return out;
}

function parseRecordBody(id: string, body: string): SpecLine | null {
  const get = (name: string) => {
    // <field name="X">value</field>  OR  <field name="X" />  (self-closing)
    const reOpen = new RegExp(
      `<field\\s+name="${name}"(?:\\s+[^>]*)?\\s*/>`,
      'i',
    );
    if (reOpen.test(body)) return ''; // self-closing → vacío
    const re = new RegExp(
      `<field\\s+name="${name}"(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/field>`,
      'i',
    );
    const m = re.exec(body);
    return m?.[1]?.trim() ?? null;
  };
  const getRef = (name: string) => {
    // <field name="X" ref="..." />
    const re = new RegExp(`<field\\s+name="${name}"\\s+ref="([^"]+)"`, 'i');
    const m = re.exec(body);
    return m?.[1] ?? null;
  };

  const sequence = get('sequence');
  const exportType = get('export_type');
  const size = get('size');
  if (!sequence || !exportType || !size) return null;

  const subconfigId = getRef('export_config_id') ?? '';
  const name = get('name') ?? '';
  const alignment = (get('alignment') as 'left' | 'right') ?? 'left';
  const decimalSize = get('decimal_size');
  const expression = get('expression');
  const fixedValue = get('fixed_value');

  return {
    id,
    subconfigId,
    sequence: Number.parseInt(sequence, 10),
    name: decodeEntities(name),
    exportType: exportType as SpecLine['exportType'],
    size: Number.parseInt(size, 10),
    decimalSize: decimalSize ? Number.parseInt(decimalSize, 10) : 0,
    alignment,
    applySign: false, // OCA XML no incluye este flag; default a false
    negativeSign: 'N',
    positiveSign: ' ',
    boolNo: ' ',
    boolYes: '1',
    expression: expression ? decodeEntities(expression) : null,
    fixedValue: fixedValue ? decodeEntities(fixedValue) : null,
  };
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// Convenience: parse XML → FieldSpec[]
export function loadSpecXmlAsFields(xml: string): FieldSpec[] {
  return parseSpecXml(xml)
    .sort((a, b) => a.sequence - b.sequence)
    .map(specLineToFieldSpec);
}

// Convenience: parse multiple XMLs (e.g. main + partner) and merge them
// into a single array of FieldSpec, respecting their sequence.
export function loadSpecXmlsAsFields(xmls: ReadonlyArray<string>): FieldSpec[] {
  return xmls
    .flatMap((xml) => parseSpecXml(xml))
    .sort((a, b) => a.sequence - b.sequence)
    .map(specLineToFieldSpec);
}
