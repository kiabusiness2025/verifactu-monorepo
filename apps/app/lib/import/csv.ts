export type ParsedCsv = {
  headers: string[];
  rows: string[][];
};

function parseLine(line: string): string[] {
  const cells: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let value = '';
      i++; // skip opening quote
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') {
          value += '"';
          i += 2;
        } else if (line[i] === '"') {
          i++; // skip closing quote
          break;
        } else {
          value += line[i++];
        }
      }
      cells.push(value);
      if (line[i] === ',') i++;
    } else {
      let j = i;
      while (j < line.length && line[j] !== ',') j++;
      cells.push(line.slice(i, j).trim());
      i = j + 1;
    }
  }
  // Trailing comma produces an extra empty cell
  if (line.endsWith(',')) cells.push('');
  return cells;
}

export function parseCsv(text: string): ParsedCsv {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0);

  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

export function normalizeNumber(value: string): number {
  // Accept both comma and period as decimal separator
  const normalized = value.trim().replace(/\./g, '').replace(',', '.');
  // Handle Spanish thousands separator (period) by trying both
  const simple = value.trim().replace(',', '.');
  const n = parseFloat(normalized) || parseFloat(simple);
  if (!Number.isFinite(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

export function normalizeDate(value: string): Date {
  const trimmed = value.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}T00:00:00.000Z`);
    if (!isNaN(d.getTime())) return d;
  }

  // DD/MM/YYYY
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (dmy) {
    const d = new Date(`${dmy[3]}-${dmy[2]}-${dmy[1]}T00:00:00.000Z`);
    if (!isNaN(d.getTime())) return d;
  }

  // DD-MM-YYYY
  const dmyDash = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
  if (dmyDash) {
    const d = new Date(`${dmyDash[3]}-${dmyDash[2]}-${dmyDash[1]}T00:00:00.000Z`);
    if (!isNaN(d.getTime())) return d;
  }

  throw new Error(`Fecha inválida: "${value}". Usa formato YYYY-MM-DD o DD/MM/YYYY`);
}
