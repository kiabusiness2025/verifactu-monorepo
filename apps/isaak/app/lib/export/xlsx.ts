import { deflateRawSync } from 'zlib';

export type XlsxCell = string | number | boolean | null | undefined | Date;

export type WorkbookOptions = {
  sheetName?: string;
  headerRows?: number;
  moneyColumns?: number[];
  columnWidths?: number[];
};

const STYLE_DEFAULT = 0;
const STYLE_HEADER = 1;
const STYLE_MONEY = 2;

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function colName(index: number): string {
  let i = index;
  let out = '';
  do {
    out = String.fromCharCode(65 + (i % 26)) + out;
    i = Math.floor(i / 26) - 1;
  } while (i >= 0);
  return out;
}

function styleRef(styleIndex: number) {
  return styleIndex > 0 ? ` s="${styleIndex}"` : '';
}

function cellXml(
  rowIdx: number,
  colIdx: number,
  value: XlsxCell,
  styleIndex = STYLE_DEFAULT
): string {
  const ref = `${colName(colIdx)}${rowIdx + 1}`;
  if (value === null || value === undefined) return `<c r="${ref}"${styleRef(styleIndex)}/>`;
  if (value instanceof Date) {
    return `<c r="${ref}" t="inlineStr"${styleRef(styleIndex)}><is><t>${xmlEscape(value.toISOString())}</t></is></c>`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}"${styleRef(styleIndex)}><v>${value}</v></c>`;
  }
  if (typeof value === 'boolean') {
    return `<c r="${ref}" t="b"${styleRef(styleIndex)}><v>${value ? 1 : 0}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"${styleRef(styleIndex)}><is><t>${xmlEscape(String(value))}</t></is></c>`;
}

function buildCols(columnWidths: number[] | undefined): string {
  if (!columnWidths?.length) return '';
  const cols = columnWidths
    .map((width, index) => {
      const w = Number.isFinite(width) ? Math.max(6, Math.min(100, width)) : 12;
      const col = index + 1;
      return `<col min="${col}" max="${col}" width="${w}" customWidth="1"/>`;
    })
    .join('');
  return `<cols>${cols}</cols>`;
}

function resolveStyle(
  rowIdx: number,
  colIdx: number,
  value: XlsxCell,
  options: WorkbookOptions
): number {
  const headerRows = options.headerRows ?? 1;
  if (rowIdx < headerRows) return STYLE_HEADER;

  if (typeof value === 'number' && Number.isFinite(value)) {
    const moneyColumns = options.moneyColumns || [];
    if (moneyColumns.includes(colIdx)) return STYLE_MONEY;
  }

  return STYLE_DEFAULT;
}

function buildSheet(rows: XlsxCell[][], options: WorkbookOptions): string {
  const rowXml = rows
    .map((row, rowIdx) => {
      const cells = row
        .map((cell, colIdx) =>
          cellXml(rowIdx, colIdx, cell, resolveStyle(rowIdx, colIdx, cell, options))
        )
        .join('');
      return `<row r="${rowIdx + 1}">${cells}</row>`;
    })
    .join('');

  const colsXml = buildCols(options.columnWidths);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  ${colsXml}
  <sheetData>${rowXml}</sheetData>
</worksheet>`;
}

function buildStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1">
    <numFmt numFmtId="164" formatCode="#,##0.00"/>
  </numFmts>
  <fonts count="2">
    <font>
      <sz val="11"/>
      <name val="Calibri"/>
    </font>
    <font>
      <b/>
      <sz val="11"/>
      <name val="Calibri"/>
    </font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill>
      <patternFill patternType="solid">
        <fgColor rgb="FFF1F5F9"/>
        <bgColor indexed="64"/>
      </patternFill>
    </fill>
  </fills>
  <borders count="1">
    <border><left/><right/><top/><bottom/><diagonal/></border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="3">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="1" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`;
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(n: number): Buffer {
  const b = Buffer.allocUnsafe(2);
  b.writeUInt16LE(n & 0xffff, 0);
  return b;
}

function u32(n: number): Buffer {
  const b = Buffer.allocUnsafe(4);
  b.writeUInt32LE(n >>> 0, 0);
  return b;
}

type ZipEntry = { name: string; data: Buffer };

function zip(entries: ZipEntry[]): Buffer {
  const fileParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const compressed = deflateRawSync(entry.data);
    const crc = crc32(entry.data);

    const localHeader = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(8),
      u16(0),
      u16(0),
      u32(crc),
      u32(compressed.length),
      u32(entry.data.length),
      u16(nameBuf.length),
      u16(0),
      nameBuf,
    ]);

    fileParts.push(localHeader, compressed);

    const centralHeader = Buffer.concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(8),
      u16(0),
      u16(0),
      u32(crc),
      u32(compressed.length),
      u32(entry.data.length),
      u16(nameBuf.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBuf,
    ]);
    centralParts.push(centralHeader);

    offset += localHeader.length + compressed.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const localFiles = Buffer.concat(fileParts);
  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(centralDir.length),
    u32(localFiles.length),
    u16(0),
  ]);

  return Buffer.concat([localFiles, centralDir, end]);
}

export function buildWorkbookBuffer(
  rows: XlsxCell[][],
  sheetNameOrOptions: string | WorkbookOptions = 'Sheet1'
): Buffer {
  const options: WorkbookOptions =
    typeof sheetNameOrOptions === 'string' ? { sheetName: sheetNameOrOptions } : sheetNameOrOptions;

  const safeSheetName = xmlEscape((options.sheetName || 'Sheet1').slice(0, 31) || 'Sheet1');
  const worksheetXml = buildSheet(rows, options);
  const stylesXml = buildStylesXml();

  const files: ZipEntry[] = [
    {
      name: '[Content_Types].xml',
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`),
    },
    {
      name: '_rels/.rels',
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`),
    },
    {
      name: 'xl/workbook.xml',
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${safeSheetName}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`),
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`),
    },
    { name: 'xl/styles.xml', data: Buffer.from(stylesXml) },
    { name: 'xl/worksheets/sheet1.xml', data: Buffer.from(worksheetXml) },
  ];

  return zip(files);
}
