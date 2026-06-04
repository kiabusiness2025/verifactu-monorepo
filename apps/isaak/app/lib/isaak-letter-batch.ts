// V1.9.3 — Generador de cartas masivas para asesores.
//
// Toma una plantilla con placeholders {{campo}} y una lista de filas
// (cada una un Record<string,string>), y produce un ZIP con N .docx,
// uno por fila. La sustitución es literal — sin interpretación.

import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import JSZip from 'jszip';
import type { CsvRow } from './isaak-csv';

export type LetterRow = CsvRow;

export type LetterBatchInput = {
  template: string;
  rows: LetterRow[];
  subject?: string;
  senderName?: string;
  senderNif?: string;
  filenameField?: string; // nombre de columna para el filename, p.ej. 'alias'
};

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function renderTemplate(template: string, row: LetterRow): string {
  return template.replace(PLACEHOLDER_RE, (_match, key: string) => {
    const raw = row[key];
    return typeof raw === 'string' ? raw : '';
  });
}

export function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'carta';
}

function paragraphsFromText(text: string): Paragraph[] {
  const blocks = text.split(/\n{2,}/);
  return blocks.map(
    (block) =>
      new Paragraph({
        children: [new TextRun({ text: block.replace(/\n/g, ' '), size: 22 })],
        spacing: { after: 200 },
        alignment: AlignmentType.JUSTIFIED,
      }),
  );
}

async function buildLetterDocx(input: {
  rendered: string;
  subject?: string;
  senderName?: string;
  senderNif?: string;
}): Promise<Buffer> {
  const now = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const children: Paragraph[] = [];

  if (input.senderName) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: input.senderName + (input.senderNif ? ` — NIF: ${input.senderNif}` : ''),
            size: 18,
            color: '64748B',
          }),
        ],
        spacing: { after: 40 },
      }),
    );
  }

  children.push(
    new Paragraph({
      children: [new TextRun({ text: now, size: 18, color: '64748B' })],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 240 },
    }),
  );

  if (input.subject) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Asunto: ${input.subject}`, bold: true, size: 22 }),
        ],
        heading: HeadingLevel.HEADING_3,
        spacing: { after: 200 },
      }),
    );
  }

  children.push(...paragraphsFromText(input.rendered));

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

export async function buildLettersZip(input: LetterBatchInput): Promise<Buffer> {
  const zip = new JSZip();
  const used = new Set<string>();

  for (let i = 0; i < input.rows.length; i += 1) {
    const row = input.rows[i];
    const rendered = renderTemplate(input.template, row);
    const buf = await buildLetterDocx({
      rendered,
      subject: input.subject,
      senderName: input.senderName,
      senderNif: input.senderNif,
    });

    const seed = input.filenameField ? row[input.filenameField] : undefined;
    let base = sanitizeFilename(seed && seed.trim() ? seed : `carta_${i + 1}`);
    let candidate = `${base}.docx`;
    let dedupe = 2;
    while (used.has(candidate)) {
      candidate = `${base}_${dedupe}.docx`;
      dedupe += 1;
    }
    used.add(candidate);
    zip.file(candidate, buf);
  }

  return zip.generateAsync({ type: 'nodebuffer' });
}

