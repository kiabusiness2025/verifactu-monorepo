/**
 * Generador de PDF de factura — autocontenido, sin dependencias externas.
 *
 * Produce un PDF en formato A4 con:
 *  - Cabecera corporativa (color + logo del tenant)
 *  - Datos del emisor y receptor
 *  - Tabla de líneas de factura
 *  - Totales (base imponible, IVA, total)
 *  - Sección VeriFactu: hash, CSV AEAT, estado, QR
 *  - Pie legal con texto de obligatoriedad VeriFactu
 */
import PDFDocument from 'pdfkit';

// ---------------------------------------------------------------------------
// Tipos de entrada
// ---------------------------------------------------------------------------

export interface InvoiceLineInput {
  description?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount?: number;
  lineTotal: number;
}

export interface InvoicePdfBranding {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  companyName?: string;
}

export interface InvoicePdfInput {
  // Identificación
  id: string;
  number?: string | null;
  issueDate?: string | Date | null;

  // Emisor (tenant)
  issuerName?: string;
  issuerNif?: string;
  issuerAddress?: string;

  // Receptor (cliente)
  customerName?: string | null;
  customerNif?: string | null;
  customerAddress?: string;

  // Importes
  amountNet: number;
  amountTax: number;
  amountGross: number;

  // Líneas
  lines?: InvoiceLineInput[];

  // Notas
  notes?: string | null;

  // VeriFactu
  verifactuStatus?: string | null;
  verifactuQr?: string | null;
  verifactuHash?: string | null;

  // Branding del tenant
  branding?: InvoicePdfBranding | null;
}

// ---------------------------------------------------------------------------
// Utilidades internas
// ---------------------------------------------------------------------------

function to2(value: unknown): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function normalizeHex(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const v = value.trim();
  return /^#[0-9A-Fa-f]{6}$/.test(v) ? v.toUpperCase() : fallback;
}

function parseDataUrl(dataUrl: unknown): Buffer | null {
  if (typeof dataUrl !== 'string') return null;
  const m = dataUrl.match(/^data:image\/(?:png|jpeg|jpg|gif|webp);base64,(.+)$/i);
  if (!m) return null;
  return Buffer.from(m[1], 'base64');
}

async function loadLogoBuffer(logoUrl: unknown): Promise<Buffer | null> {
  const inline = parseDataUrl(logoUrl);
  if (inline) return inline;
  if (typeof logoUrl !== 'string') return null;

  try {
    const parsed = new URL(logoUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    try {
      const res = await fetch(logoUrl, { signal: ctrl.signal });
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      return buf.length > 0 ? buf : null;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return new Date().toISOString().slice(0, 10);
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

// ---------------------------------------------------------------------------
// Constructor principal
// ---------------------------------------------------------------------------

export async function buildInvoicePdfBuffer(invoice: InvoicePdfInput): Promise<Buffer> {
  const branding = invoice.branding ?? {};
  const primary = normalizeHex(branding.primaryColor, '#2361D8');
  const secondary = normalizeHex(branding.secondaryColor, '#0F172A');
  const logoBuffer = await loadLogoBuffer(branding.logoUrl);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const PAGE_W = doc.page.width;
    const MARGIN = 50;
    const CONTENT_W = PAGE_W - MARGIN * 2;

    // -----------------------------------------------------------------------
    // 1. Cabecera con franja de color corporativo
    // -----------------------------------------------------------------------
    doc.save();
    doc.rect(0, 0, PAGE_W, 100).fill(primary);
    doc.restore();

    // Logo (esquina superior derecha)
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, PAGE_W - 180, 22, { fit: [130, 56] });
      } catch {
        // imagen no válida — continuar sin logo
      }
    }

    // Número y fecha sobre la franja
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(22).text('FACTURA', MARGIN, 28);
    doc
      .font('Helvetica')
      .fontSize(11)
      .text(`N.º ${invoice.number ?? invoice.id}`, MARGIN, 56);
    doc.text(`Fecha: ${formatDate(invoice.issueDate)}`, MARGIN, 70);

    // -----------------------------------------------------------------------
    // 2. Emisor y receptor en dos columnas
    // -----------------------------------------------------------------------
    const COL2 = MARGIN + CONTENT_W / 2;
    const ROW_INFO = 118;

    doc.fillColor(primary).font('Helvetica-Bold').fontSize(9).text('EMISOR', MARGIN, ROW_INFO);
    doc.fillColor(secondary).font('Helvetica').fontSize(10);
    doc.text(
      branding.companyName ?? invoice.issuerName ?? 'Empresa emisora',
      MARGIN,
      ROW_INFO + 12
    );
    if (invoice.issuerNif) doc.text(`NIF: ${invoice.issuerNif}`, MARGIN);
    if (invoice.issuerAddress)
      doc.text(invoice.issuerAddress, MARGIN, undefined, { width: CONTENT_W / 2 - 10 });

    doc.fillColor(primary).font('Helvetica-Bold').fontSize(9).text('CLIENTE', COL2, ROW_INFO);
    doc.fillColor(secondary).font('Helvetica').fontSize(10);
    doc.text(invoice.customerName ?? 'Cliente', COL2, ROW_INFO + 12);
    if (invoice.customerNif) doc.text(`NIF/NIE: ${invoice.customerNif}`, COL2);
    if (invoice.customerAddress)
      doc.text(invoice.customerAddress, COL2, undefined, { width: CONTENT_W / 2 });

    // -----------------------------------------------------------------------
    // 3. Tabla de líneas
    // -----------------------------------------------------------------------
    const TABLE_TOP = 220;
    const COL_WIDTHS = [200, 60, 80, 60, 80]; // desc, cant, precio, dto, total
    const HEADERS = ['Concepto', 'Cant.', 'P. unitario', 'Dto.%', 'Importe'];
    const COL_ALIGNS: Array<'left' | 'right'> = ['left', 'right', 'right', 'right', 'right'];

    // Cabecera de tabla
    doc.save();
    doc.rect(MARGIN, TABLE_TOP, CONTENT_W, 18).fill(primary);
    doc.restore();

    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
    let cx = MARGIN;
    HEADERS.forEach((h, i) => {
      doc.text(h, cx + 4, TABLE_TOP + 5, { width: COL_WIDTHS[i], align: COL_ALIGNS[i] });
      cx += COL_WIDTHS[i];
    });

    // Filas
    const lines = invoice.lines ?? [];
    let rowY = TABLE_TOP + 20;
    doc.font('Helvetica').fontSize(9).fillColor(secondary);

    lines.forEach((line, idx) => {
      if (idx % 2 === 0) {
        doc.save();
        doc.rect(MARGIN, rowY - 2, CONTENT_W, 16).fill('#F3F6FB');
        doc.restore();
        doc.fillColor(secondary);
      }

      cx = MARGIN;
      const vals = [
        line.description ?? `Línea ${idx + 1}`,
        to2(line.quantity),
        `${to2(line.unitPrice)} €`,
        `${to2(line.discount ?? 0)}%`,
        `${to2(line.lineTotal)} €`,
      ];
      vals.forEach((v, i) => {
        doc.text(v, cx + 4, rowY, { width: COL_WIDTHS[i], align: COL_ALIGNS[i] });
        cx += COL_WIDTHS[i];
      });

      rowY += 16;
    });

    // Línea separadora
    rowY += 4;
    doc.save();
    doc
      .moveTo(MARGIN, rowY)
      .lineTo(MARGIN + CONTENT_W, rowY)
      .strokeColor(primary)
      .lineWidth(0.5)
      .stroke();
    doc.restore();
    rowY += 8;

    // -----------------------------------------------------------------------
    // 4. Totales (alineados a la derecha)
    // -----------------------------------------------------------------------
    const TOTALS_X = MARGIN + CONTENT_W - 220;
    const TOTALS_W = 220;

    const taxPct =
      invoice.amountNet > 0 ? ((invoice.amountTax / invoice.amountNet) * 100).toFixed(0) : '21';

    doc.font('Helvetica').fontSize(10).fillColor(secondary);
    doc.text('Base imponible:', TOTALS_X, rowY, { width: 130 });
    doc.text(`${to2(invoice.amountNet)} €`, TOTALS_X + 130, rowY, { width: 90, align: 'right' });
    rowY += 14;

    doc.text(`IVA (${taxPct}%):`, TOTALS_X, rowY, { width: 130 });
    doc.text(`${to2(invoice.amountTax)} €`, TOTALS_X + 130, rowY, { width: 90, align: 'right' });
    rowY += 14;

    // Total destacado
    doc.save();
    doc.rect(TOTALS_X - 4, rowY - 2, TOTALS_W + 4, 20).fill(primary);
    doc.restore();
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#FFFFFF');
    doc.text('TOTAL:', TOTALS_X, rowY + 3, { width: 130 });
    doc.text(`${to2(invoice.amountGross)} €`, TOTALS_X + 130, rowY + 3, {
      width: 90,
      align: 'right',
    });
    rowY += 30;

    // -----------------------------------------------------------------------
    // 5. Notas
    // -----------------------------------------------------------------------
    if (invoice.notes) {
      doc.fillColor(primary).font('Helvetica-Bold').fontSize(9).text('Notas', MARGIN, rowY);
      doc
        .fillColor(secondary)
        .font('Helvetica')
        .fontSize(9)
        .text(invoice.notes, MARGIN, rowY + 12, { width: CONTENT_W });
      rowY += 30 + doc.heightOfString(invoice.notes, { width: CONTENT_W });
    }

    rowY += 10;

    // -----------------------------------------------------------------------
    // 6. Sección VeriFactu
    // -----------------------------------------------------------------------
    doc.save();
    doc.rect(MARGIN, rowY, CONTENT_W, 14).fill('#EEF2FF');
    doc.restore();
    doc
      .fillColor(primary)
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('INFORMACIÓN VERIFACTU', MARGIN + 4, rowY + 3);
    rowY += 16;

    doc.fillColor(secondary).font('Helvetica').fontSize(8);

    if (invoice.verifactuHash) {
      doc.text(`Huella registral: ${invoice.verifactuHash}`, MARGIN, rowY, {
        width: CONTENT_W - 140,
      });
      rowY += 12;
    } else {
      doc.text('Estado VeriFactu: Pendiente de registro en AEAT', MARGIN, rowY);
      rowY += 12;
    }

    if (invoice.verifactuStatus) {
      doc.text(`Estado: ${invoice.verifactuStatus}`, MARGIN, rowY);
      rowY += 12;
    }

    // QR VeriFactu (esquina inferior derecha de la sección)
    const qrBuffer = parseDataUrl(invoice.verifactuQr);
    if (qrBuffer) {
      const qrX = MARGIN + CONTENT_W - 120;
      const qrY = rowY - (invoice.verifactuHash ? 24 : 12);
      try {
        doc.image(qrBuffer, qrX, qrY, { width: 100, height: 100 });
        doc
          .fillColor(secondary)
          .font('Helvetica')
          .fontSize(7)
          .text('Verificar en AEAT', qrX, qrY + 102, { width: 100, align: 'center' });
      } catch {
        // QR no válido — continuar
      }
      rowY = Math.max(rowY, qrY + 116);
    }

    // -----------------------------------------------------------------------
    // 7. Pie legal
    // -----------------------------------------------------------------------
    const PIE_Y = doc.page.height - 60;
    doc.save();
    doc.rect(0, PIE_Y - 8, PAGE_W, 68).fill('#F8F9FA');
    doc.restore();
    doc
      .fillColor('#6B7280')
      .font('Helvetica')
      .fontSize(7)
      .text(
        'Esta factura ha sido generada a través de Verifactu.business conforme al Real Decreto 1007/2023 ' +
          '(Sistema VeriFactu). La integridad del documento queda garantizada mediante la huella registral ' +
          'incluida en este documento. Cualquier modificación posterior invalidará dicha huella.',
        MARGIN,
        PIE_Y,
        { width: CONTENT_W, align: 'center' }
      );

    doc.end();
  });
}
