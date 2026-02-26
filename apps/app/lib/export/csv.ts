export type CsvCell = string | number | boolean | null | undefined | Date;

function escapeCell(value: CsvCell): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  const str = String(value);
  const needsQuotes = /[",\n\r]/.test(str);
  const escaped = str.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export function toCsv(rows: CsvCell[][]): string {
  return rows.map((row) => row.map((cell) => escapeCell(cell)).join(',')).join('\n');
}
