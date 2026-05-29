// Word (DOCX) export builder using the docx library.
// Generates a formatted .docx from ledger rows (same data as Excel/PDF).

import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
  WidthType,
  AlignmentType,
  BorderStyle,
} from 'docx';

export type WordReportInput = {
  title: string;
  tenantName: string;
  tenantNif: string;
  period: { from: string; to: string; label?: string };
  headers: string[];
  rows: string[][];
  summary?: string;
};

const BRAND_BLUE = '0B2060';
const LIGHT_BLUE = 'F0F4FF';
const BORDER_NONE = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

function headerCell(text: string): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 18 })],
        alignment: AlignmentType.LEFT,
      }),
    ],
    shading: { fill: BRAND_BLUE, color: 'auto' },
    borders: BORDER_NONE,
    width: { size: 1, type: WidthType.AUTO },
  });
}

function dataCell(text: string, isAlt: boolean): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, size: 18 })],
        alignment: AlignmentType.LEFT,
      }),
    ],
    shading: isAlt ? { fill: 'F8FAFF', color: 'auto' } : undefined,
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    width: { size: 1, type: WidthType.AUTO },
  });
}

export async function buildWordReport(input: WordReportInput): Promise<Buffer> {
  const { title, tenantName, tenantNif, period, headers, rows, summary } = input;
  const now = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const periodStr = period.label ?? `${period.from} – ${period.to}`;

  const tableRows = [
    new TableRow({
      children: headers.map(headerCell),
      tableHeader: true,
    }),
    ...rows.map(
      (row, ri) =>
        new TableRow({
          children: row.map((cell) => dataCell(cell, ri % 2 !== 0)),
        })
    ),
  ];

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 36, color: BRAND_BLUE })],
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${tenantName}${tenantNif ? ` — NIF: ${tenantNif}` : ''}`,
          size: 20,
          color: '64748B',
        }),
      ],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Periodo: ${periodStr}`, size: 20, color: '64748B' })],
      spacing: { after: 200 },
    }),
    new Table({
      rows: tableRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
    }),
  ];

  if (summary) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: summary, size: 18, color: '1E3A8A', italics: true })],
        shading: { fill: LIGHT_BLUE, color: 'auto' },
        spacing: { before: 200, after: 80 },
        indent: { left: 200, right: 200 },
      })
    );
  }

  children.push(
    new Paragraph({
      children: [new TextRun({ text: `Generado por Isaak · ${now}`, size: 16, color: '94A3B8' })],
      spacing: { before: 200 },
    })
  );

  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
}
