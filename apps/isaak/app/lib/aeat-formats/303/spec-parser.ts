// Parser CSV (OCA format) → FieldSpec[].
//
// Lee el diseño de registro publicado en spec/YYYY-MM-fields.csv y
// produce una lista de FieldSpec lista para renderRecord(). El CSV
// está inlineado en TS para evitar reads filesystem en serverless.
// Para regenerar tras update OCA, ver spec/README.md.

import type { FieldSpec } from '../format-engine';
import { SPEC_303_2024_10_CSV } from './spec/fields-2024-10';

// Resultado del parser: cada SpecLine corresponde a una fila del CSV.
export type SpecLine = {
  id: string;
  subconfigId: string;
  sequence: number;
  name: string;
  exportType: 'string' | 'integer' | 'float' | 'boolean';
  size: number;
  decimalSize: number;
  alignment: 'left' | 'right';
  applySign: boolean;
  negativeSign: string;
  positiveSign: string;
  boolNo: string;
  boolYes: string;
  expression: string | null;
  fixedValue: string | null;
};

// CSV parser — tolerante a comillas escapadas y comas dentro de comillas.
// No usamos una dependencia para mantener el deps lean.
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (c === ',' && !inQuotes) {
      out.push(current);
      current = '';
      continue;
    }
    current += c;
  }
  out.push(current);
  return out;
}

export function parseSpecCsv(csv: string): SpecLine[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const header = parseCsvLine(lines[0]!);
  const idx = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`Missing column "${name}" in spec CSV`);
    return i;
  };
  const cId = idx('id');
  const cSub = idx('export_config_id:id');
  const cSeq = idx('sequence');
  const cName = idx('name');
  const cType = idx('export_type');
  const cSize = idx('size');
  const cDec = idx('decimal_size');
  const cAlign = idx('alignment');
  const cSign = idx('apply_sign');
  const cNeg = idx('negative_sign');
  const cPos = idx('positive_sign');
  const cBoolN = idx('bool_no');
  const cBoolY = idx('bool_yes');
  const cExpr = idx('expression');
  const cFixed = idx('fixed_value');

  const out: SpecLine[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]!);
    if (row.length < header.length) continue;
    const type = row[cType] as SpecLine['exportType'];
    // Saltar "subconfig" rows (referencias a otros configs, no son
    // campos terminales).
    if ((type as string) === 'subconfig') continue;
    out.push({
      id: row[cId]!,
      subconfigId: row[cSub]!,
      sequence: Number.parseInt(row[cSeq]!, 10),
      name: row[cName]!,
      exportType: type,
      size: Number.parseInt(row[cSize]!, 10),
      decimalSize: Number.parseInt(row[cDec] ?? '0', 10) || 0,
      alignment: row[cAlign] as 'left' | 'right',
      applySign: row[cSign] === '1',
      negativeSign: row[cNeg] || 'N',
      positiveSign: row[cPos] || ' ',
      boolNo: row[cBoolN] || ' ',
      boolYes: row[cBoolY] || '1',
      expression: row[cExpr] || null,
      fixedValue: row[cFixed] || null,
    });
  }
  return out;
}

// Extrae el nombre del campo de una expresión Odoo simple:
//   ${object.company_vat}         → 'company_vat'
//   ${object.company_id.name}     → 'company_id.name'
//   ${object.tax_line_ids.filtered(...field_number==150).amount}
//     → 'casilla_150' (heurística por número entre paréntesis)
//   ${0 if X else Y}              → null (expresión compleja, calcular fuera)
export function extractFieldName(expression: string | null): string | null {
  if (!expression) return null;
  // Casilla con field_number tiene prioridad sobre el match dot-path
  // porque la expresión completa empieza con `${object.tax_line_ids...`
  const casilla = /field_number\s*==\s*(\d+)/.exec(expression);
  if (casilla) return `casilla_${casilla[1]}`;
  // Path simple: ${object.foo.bar.baz} → 'foo.bar.baz'
  const dotted = /^\$\{object\.([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)*)\}$/i.exec(expression);
  if (dotted) return dotted[1] ?? null;
  return null;
}

export function specLineToFieldSpec(line: SpecLine): FieldSpec {
  const fieldName = extractFieldName(line.expression);
  return {
    name: fieldName ?? line.id,
    description: line.name,
    size: line.size,
    decimalSize: line.exportType === 'float' ? line.decimalSize : undefined,
    alignment: line.alignment,
    applySign: line.applySign,
    negativeSign: line.negativeSign,
    positiveSign: line.positiveSign,
    type: line.exportType,
    boolYes: line.boolYes,
    boolNo: line.boolNo,
    fixedValue: line.fixedValue ?? undefined,
  };
}

// Devuelve el spec del año/versión indicado. v1 solo soporta 2024-10
// (vigente desde sept-2024 hasta nuevo aviso AEAT).
const CSV_BY_VERSION: Record<'2024-10', string> = {
  '2024-10': SPEC_303_2024_10_CSV,
};

export function loadSpec303(
  version: '2024-10' = '2024-10',
): { sub01: FieldSpec[]; sub03: FieldSpec[]; lines: SpecLine[] } {
  const csv = CSV_BY_VERSION[version];
  const lines = parseSpecCsv(csv);
  const sub01 = lines
    .filter((l) => l.subconfigId.includes('sub01'))
    .sort((a, b) => a.sequence - b.sequence)
    .map(specLineToFieldSpec);
  const sub03 = lines
    .filter((l) => l.subconfigId.includes('sub03'))
    .sort((a, b) => a.sequence - b.sequence)
    .map(specLineToFieldSpec);
  return { sub01, sub03, lines };
}
