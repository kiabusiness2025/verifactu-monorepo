import PDFDocument from 'pdfkit';

function to2(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function parseQrDataUrl(qrDataUrl) {
  if (!qrDataUrl || typeof qrDataUrl !== 'string') return null;
  const match = qrDataUrl.match(/^data:(image\/(png|jpeg));base64,(.+)$/i);
  if (!match) return null;
  return Buffer.from(match[3], 'base64');
}

function parseImageDataUrl(imageDataUrl) {
  if (!imageDataUrl || typeof imageDataUrl !== 'string') return null;
  const match = imageDataUrl.match(/^data:(image\/(png|jpeg|jpg|webp|gif));base64,(.+)$/i);
  if (!match) return null;
  return Buffer.from(match[3], 'base64');
}

function normalizeHexColor(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim();
  return /^#[0-9A-Fa-f]{6}$/.test(normalized) ? normalized.toUpperCase() : fallback;
}

async function loadLogoBuffer(logoUrl) {
  const inline = parseImageDataUrl(logoUrl);
  if (inline) return inline;
  if (!logoUrl || typeof logoUrl !== 'string') return null;

  try {
    const parsed = new URL(logoUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(logoUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.length > 0 ? buffer : null;
  } catch {
    return null;
  }
}

export async function buildInvoicePdfBuffer(invoice) {
  const branding =
    invoice?.branding && typeof invoice.branding === 'object' ? invoice.branding : {};
  const primaryColor = normalizeHexColor(branding?.primaryColor, '#2361D8');
  const secondaryColor = normalizeHexColor(branding?.secondaryColor, '#0F172A');
  const logoBuffer = await loadLogoBuffer(branding?.logoUrl);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const number = invoice?.number || invoice?.id || 'SIN-SERIE';
    const issueDate = invoice?.issueDate || new Date().toISOString().slice(0, 10);
    const issuerName = invoice?.issuer?.name || 'Emisor no informado';
    const issuerNif = invoice?.issuer?.nif || '';
    const issuerAddress = invoice?.issuer?.address || '';
    const customerName = invoice?.customer?.name || 'Cliente no informado';
    const customerNif = invoice?.customer?.nif || '';
    const customerAddress = invoice?.customer?.address || '';
    const description = invoice?.description || `Factura ${number}`;

    const taxRate = Number(invoice?.tax?.rate || 0);
    const taxAmount = Number(invoice?.tax?.amount || 0);
    const total = Number(invoice?.total || 0);
    const baseAmount = total - taxAmount;

    // Header strip with corporate primary color
    doc.save();
    doc.rect(0, 0, doc.page.width, 98).fill(primaryColor);
    doc.restore();

    if (logoBuffer) {
      try {
        doc.image(logoBuffer, doc.page.width - 180, 24, { fit: [130, 56], align: 'right' });
      } catch {
        // Ignore invalid image formats and continue with plain header.
      }
    }

    doc.fillColor('#FFFFFF');
    doc.fontSize(24).text('Factura', 50, 32, { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Numero: ${number}`, 50, 66);
    doc.text(`Fecha: ${issueDate}`);

    doc.fillColor(secondaryColor);
    doc.moveDown(2);

    doc.moveDown();
    doc.fontSize(13).fillColor(primaryColor).text('Emisor');
    doc.fillColor(secondaryColor);
    doc.fontSize(11).text(issuerName);
    if (issuerNif) doc.text(`NIF/CIF: ${issuerNif}`);
    if (issuerAddress) doc.text(issuerAddress);

    doc.moveDown();
    doc.fontSize(13).fillColor(primaryColor).text('Cliente');
    doc.fillColor(secondaryColor);
    doc.fontSize(11).text(customerName);
    if (customerNif) doc.text(`NIF/NIE: ${customerNif}`);
    if (customerAddress) doc.text(customerAddress);

    doc.moveDown();
    doc.fontSize(13).fillColor(primaryColor).text('Concepto');
    doc.fillColor(secondaryColor);
    doc.fontSize(11).text(description);

    doc.moveDown();
    doc.fontSize(13).fillColor(primaryColor).text('Importes');
    doc.fillColor(secondaryColor);
    doc.fontSize(11).text(`Base imponible: ${to2(baseAmount)} EUR`);
    doc.text(`IVA (${to2(taxRate)}%): ${to2(taxAmount)} EUR`);
    doc
      .fillColor(primaryColor)
      .font('Helvetica-Bold')
      .text(`Total: ${to2(total)} EUR`);
    doc.font('Helvetica');
    doc.fillColor(secondaryColor);

    doc.moveDown();
    doc.fontSize(13).fillColor(primaryColor).text('Datos VeriFactu');
    doc.fillColor(secondaryColor);
    doc.fontSize(10).text(`Huella: ${invoice?.verifactu_hash || 'Pendiente'}`);
    if (invoice?.verifactu_csv) {
      doc.text(`CSV AEAT: ${invoice.verifactu_csv}`);
    }
    if (invoice?.verifactu_status) {
      doc.text(`Estado: ${invoice.verifactu_status}`);
    }

    const qrBuffer = parseQrDataUrl(invoice?.verifactu_qr);
    if (qrBuffer) {
      const y = Math.min(doc.y + 10, 650);
      doc.fontSize(10).text('QR VeriFactu', 420, y);
      doc.image(qrBuffer, 420, y + 14, { width: 120, height: 120 });
    }

    doc.end();
  });
}
