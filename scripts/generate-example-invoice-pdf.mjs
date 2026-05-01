/**
 * generate-example-invoice-pdf.mjs
 *
 * Genera un PDF de factura de ejemplo según el formato VeriFactu / Verifactu.business
 * y lo guarda en docs/examples/factura-ejemplo-verifactu.pdf
 *
 * Uso:
 *   node scripts/generate-example-invoice-pdf.mjs
 */

import PDFDocument from 'pdfkit';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ---------------------------------------------------------------------------
// Datos de la factura de ejemplo
// ---------------------------------------------------------------------------

const EXAMPLE_INVOICE = {
  // Identificación
  id: 'EJEMPLO-001',
  number: 'VF-2026-0001',
  issueDate: '2026-05-01',

  // Emisor (empresa demo)
  issuerName: 'Empresas Demo S.L.',
  issuerNif: 'B12345678',
  issuerAddress: 'Calle Mayor 10, 28013 Madrid',

  // Receptor
  customerName: 'Cliente Ejemplo S.A.',
  customerNif: 'A87654321',
  customerAddress: 'Paseo de la Castellana 123, 28046 Madrid',

  // Importes
  amountNet: 1000.00,
  amountTax: 210.00,
  amountGross: 1210.00,

  // Líneas
  lines: [
    {
      description: 'Servicio de asesoría fiscal — Mayo 2026',
      quantity: 1,
      unitPrice: 500.00,
      taxRate: 0.21,
      discount: 0,
      lineTotal: 500.00,
    },
    {
      description: 'Gestión contable mensual',
      quantity: 2,
      unitPrice: 250.00,
      taxRate: 0.21,
      discount: 0,
      lineTotal: 500.00,
    },
  ],

  notes: 'Pago a 30 días. Transferencia bancaria: ES12 3456 7890 1234 5678 9012',

  // Campos VeriFactu (simulados para el ejemplo)
  verifactuStatus: 'registered',
  verifactuHash: 'SHA256:3a7f2b1c9d4e5f6a8b0c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3',
  verifactuQr: null, // Sin QR real en el ejemplo estático

  // Branding corporativo Verifactu.business
  branding: {
    primaryColor: '#2361D8',
    secondaryColor: '#0F172A',
    companyName: 'Verifactu.business',
  },
};

// ---------------------------------------------------------------------------
// Helpers (copia del builder TypeScript, en JS para el script independiente)
// ---------------------------------------------------------------------------

function to2(value) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function normalizeHex(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const v = value.trim();
  return /^#[0-9A-Fa-f]{6}$/.test(v) ? v.toUpperCase() : fallback;
}

function formatDate(d) {
  if (!d) return new Date().toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

// ---------------------------------------------------------------------------
// Generación del PDF
// ---------------------------------------------------------------------------

function buildPdf(invoice) {
  return new Promise((resolve, reject) => {
    const branding = invoice.branding ?? {};
    const primary = normalizeHex(branding.primaryColor, '#2361D8');
    const secondary = normalizeHex(branding.secondaryColor, '#0F172A');

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const PAGE_W = doc.page.width;
    const MARGIN = 50;
    const CONTENT_W = PAGE_W - MARGIN * 2;

    // 1. Cabecera
    doc.save();
    doc.rect(0, 0, PAGE_W, 100).fill(primary);
    doc.restore();

    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(22).text('FACTURA', MARGIN, 28);
    doc.font('Helvetica').fontSize(11).text(`N.º ${invoice.number ?? invoice.id}`, MARGIN, 56);
    doc.text(`Fecha: ${formatDate(invoice.issueDate)}`, MARGIN, 70);

    // Nombre de la empresa en cabecera derecha
    doc
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor('#FFFFFF')
      .text(branding.companyName ?? invoice.issuerName ?? '', PAGE_W - 250, 32, {
        width: 200,
        align: 'right',
      });
    doc
      .font('Helvetica')
      .fontSize(9)
      .text('verifactu.business', PAGE_W - 250, 52, { width: 200, align: 'right' });

    // 2. Emisor y receptor
    const COL2 = MARGIN + CONTENT_W / 2;
    const ROW_INFO = 118;

    doc.fillColor(primary).font('Helvetica-Bold').fontSize(9).text('EMISOR', MARGIN, ROW_INFO);
    doc.fillColor(secondary).font('Helvetica').fontSize(10);
    doc.text(invoice.issuerName ?? 'Empresa emisora', MARGIN, ROW_INFO + 12);
    if (invoice.issuerNif) doc.text(`NIF: ${invoice.issuerNif}`, MARGIN);
    if (invoice.issuerAddress)
      doc.text(invoice.issuerAddress, MARGIN, undefined, { width: CONTENT_W / 2 - 10 });

    doc.fillColor(primary).font('Helvetica-Bold').fontSize(9).text('CLIENTE', COL2, ROW_INFO);
    doc.fillColor(secondary).font('Helvetica').fontSize(10);
    doc.text(invoice.customerName ?? 'Cliente', COL2, ROW_INFO + 12);
    if (invoice.customerNif) doc.text(`NIF/NIE: ${invoice.customerNif}`, COL2);
    if (invoice.customerAddress)
      doc.text(invoice.customerAddress, COL2, undefined, { width: CONTENT_W / 2 });

    // 3. Tabla de líneas
    const TABLE_TOP = 220;
    const COL_WIDTHS = [210, 55, 80, 50, 80];
    const HEADERS = ['Concepto', 'Cant.', 'P. unitario', 'Dto.%', 'Importe'];
    const COL_ALIGNS = ['left', 'right', 'right', 'right', 'right'];

    doc.save();
    doc.rect(MARGIN, TABLE_TOP, CONTENT_W, 18).fill(primary);
    doc.restore();

    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
    let cx = MARGIN;
    HEADERS.forEach((h, i) => {
      doc.text(h, cx + 4, TABLE_TOP + 5, { width: COL_WIDTHS[i], align: COL_ALIGNS[i] });
      cx += COL_WIDTHS[i];
    });

    let rowY = TABLE_TOP + 20;
    doc.font('Helvetica').fontSize(9).fillColor(secondary);

    (invoice.lines ?? []).forEach((line, idx) => {
      if (idx % 2 === 0) {
        doc.save();
        doc.rect(MARGIN, rowY - 2, CONTENT_W, 16).fill('#F3F6FB');
        doc.restore();
        doc.fillColor(secondary);
      }

      cx = MARGIN;
      const taxPct = (Number(line.taxRate) * 100).toFixed(0);
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

    rowY += 4;
    doc.save();
    doc.moveTo(MARGIN, rowY).lineTo(MARGIN + CONTENT_W, rowY).strokeColor(primary).lineWidth(0.5).stroke();
    doc.restore();
    rowY += 8;

    // 4. Totales
    const TOTALS_X = MARGIN + CONTENT_W - 220;
    const taxPct = invoice.amountNet > 0
      ? ((invoice.amountTax / invoice.amountNet) * 100).toFixed(0)
      : '21';

    doc.font('Helvetica').fontSize(10).fillColor(secondary);
    doc.text('Base imponible:', TOTALS_X, rowY, { width: 130 });
    doc.text(`${to2(invoice.amountNet)} €`, TOTALS_X + 130, rowY, { width: 90, align: 'right' });
    rowY += 14;

    doc.text(`IVA (${taxPct}%):`, TOTALS_X, rowY, { width: 130 });
    doc.text(`${to2(invoice.amountTax)} €`, TOTALS_X + 130, rowY, { width: 90, align: 'right' });
    rowY += 14;

    doc.save();
    doc.rect(TOTALS_X - 4, rowY - 2, 224, 20).fill(primary);
    doc.restore();
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#FFFFFF');
    doc.text('TOTAL:', TOTALS_X, rowY + 3, { width: 130 });
    doc.text(`${to2(invoice.amountGross)} €`, TOTALS_X + 130, rowY + 3, { width: 90, align: 'right' });
    rowY += 30;

    // 5. Notas
    if (invoice.notes) {
      doc.fillColor(primary).font('Helvetica-Bold').fontSize(9).text('Notas', MARGIN, rowY);
      doc.fillColor(secondary).font('Helvetica').fontSize(9).text(invoice.notes, MARGIN, rowY + 12, { width: CONTENT_W });
      rowY += 30;
    }

    rowY += 10;

    // 6. Sección VeriFactu
    doc.save();
    doc.rect(MARGIN, rowY, CONTENT_W, 14).fill('#EEF2FF');
    doc.restore();
    doc.fillColor(primary).font('Helvetica-Bold').fontSize(9).text('INFORMACIÓN VERIFACTU (RD 1007/2023)', MARGIN + 4, rowY + 3);
    rowY += 18;

    doc.fillColor(secondary).font('Helvetica').fontSize(8);

    if (invoice.verifactuHash) {
      doc.text(`Huella registral:`, MARGIN, rowY);
      rowY += 10;
      doc.text(invoice.verifactuHash, MARGIN, rowY, { width: CONTENT_W });
      rowY += 12;
    }

    if (invoice.verifactuStatus) {
      const estadoLabel =
        invoice.verifactuStatus === 'registered'
          ? 'Registrado en AEAT'
          : invoice.verifactuStatus === 'pending'
          ? 'Pendiente de registro'
          : invoice.verifactuStatus;
      doc.text(`Estado AEAT: ${estadoLabel}`, MARGIN, rowY);
      rowY += 12;
    }

    doc
      .fillColor('#6B7280')
      .fontSize(7)
      .text(
        'Nota: Los datos VeriFactu de esta factura de ejemplo son simulados. ' +
          'En facturas reales, la huella registral y el QR son generados y verificables en la sede electrónica de la AEAT.',
        MARGIN,
        rowY,
        { width: CONTENT_W }
      );

    rowY += 24;

    // 7. Pie legal
    const PIE_Y = doc.page.height - 70;
    doc.save();
    doc.rect(0, PIE_Y - 8, PAGE_W, 78).fill('#F8F9FA');
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const outDir = join(ROOT, 'docs', 'examples');
  mkdirSync(outDir, { recursive: true });

  const outPath = join(outDir, 'factura-ejemplo-verifactu.pdf');

  console.log('Generando PDF de factura de ejemplo VeriFactu...');
  const buffer = await buildPdf(EXAMPLE_INVOICE);
  writeFileSync(outPath, buffer);

  console.log(`PDF guardado en: ${outPath}`);
  console.log(`Tamaño: ${(buffer.length / 1024).toFixed(1)} KB`);
  console.log('');
  console.log('Campos incluidos:');
  console.log('  ✓ Cabecera corporativa con colores Verifactu.business');
  console.log('  ✓ Datos del emisor y receptor con NIF');
  console.log('  ✓ Tabla de líneas con concepto, cantidad, precio, IVA, importe');
  console.log('  ✓ Totales: base imponible, IVA (21%), total');
  console.log('  ✓ Notas / condiciones de pago');
  console.log('  ✓ Sección VeriFactu: huella registral SHA-256, estado AEAT');
  console.log('  ✓ Pie legal con referencia al RD 1007/2023');
}

main().catch((err) => {
  console.error('Error generando PDF:', err);
  process.exit(1);
});
