import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { uploadInvoiceToDrive } from '@/app/lib/google-drive';

export const runtime = 'nodejs';

function esc(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function fmtEur(n: number | string | null | undefined) {
  const v = typeof n === 'string' ? parseFloat(n) : (n ?? 0);
  return `${v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`;
}

async function drawQrMatrix(url: string): Promise<string> {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'M' });
  const { size, data } = qr.modules;
  const mod = 3.5;
  const ox = 370;
  const oy = 680;
  const lines: string[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (data[r * size + c] & 1) {
        const x = ox + c * mod;
        const y = oy - r * mod;
        lines.push(`${x.toFixed(1)} ${y.toFixed(1)} ${mod} ${mod} re`);
      }
    }
  }
  return lines.join(' ') + ' f';
}

async function buildInvoicePdf(invoice: {
  id: string;
  number: string;
  issueDate: Date;
  status: string;
  customerName: string;
  customerNif: string | null;
  amountNet: number | string;
  amountTax: number | string;
  amountGross: number | string;
  notes: string | null;
  verifactuHash: string | null;
  verifactuStatus: string | null;
  verifactuQr: string | null;
  tenant: { name: string; legalName: string | null; nif: string | null };
}): Promise<Buffer> {
  const company = invoice.tenant.legalName || invoice.tenant.name;
  const nifEmisor = invoice.tenant.nif || '';
  const isVf = Boolean(invoice.verifactuHash);
  const qrUrl =
    invoice.verifactuQr || (isVf ? `https://verifactu.business/verify/${invoice.id}` : '');

  let qrOps = '';
  if (qrUrl) {
    try {
      qrOps = await drawQrMatrix(qrUrl);
    } catch {
      // QR generation failed — omit silently
    }
  }

  const taxRate =
    Number(invoice.amountNet) > 0
      ? Math.round((Number(invoice.amountTax) / Number(invoice.amountNet)) * 100)
      : 21;

  const stream = [
    // Navy header bar
    '0.133 0.110 0.384 rg',
    '0 792 595 50 re f',

    // Header text — white
    '1 1 1 rg',
    'BT /F1 20 Tf 45 806 Td (Verifactu Business) Tj ET',
    'BT /F1 10 Tf 45 794 Td (Factura con registro AEAT) Tj ET',

    // Reset to dark text
    '0 0 0 rg',

    // Invoice number + date block
    'BT /F2 16 Tf 45 755 Td (' + esc(invoice.number) + ') Tj ET',
    'BT /F1 10 Tf 45 740 Td (Fecha: ' +
      esc(invoice.issueDate.toISOString().slice(0, 10)) +
      ') Tj ET',
    'BT /F1 10 Tf 45 727 Td (Estado: ' +
      esc(invoice.status === 'issued' ? 'Emitida' : 'Borrador') +
      ') Tj ET',

    // Separator line
    '0.85 0.85 0.85 rg',
    '45 716 505 0.5 re f',
    '0 0 0 rg',

    // Sender block
    'BT /F2 9 Tf 45 703 Td (EMISOR) Tj ET',
    'BT /F1 10 Tf 45 691 Td (' + esc(company) + ') Tj ET',
    nifEmisor ? 'BT /F1 9 Tf 45 679 Td (NIF: ' + esc(nifEmisor) + ') Tj ET' : '',

    // Recipient block
    'BT /F2 9 Tf 320 703 Td (RECEPTOR) Tj ET',
    'BT /F1 10 Tf 320 691 Td (' + esc(invoice.customerName) + ') Tj ET',
    invoice.customerNif
      ? 'BT /F1 9 Tf 320 679 Td (NIF: ' + esc(invoice.customerNif) + ') Tj ET'
      : '',

    // Separator
    '0.85 0.85 0.85 rg',
    '45 668 505 0.5 re f',
    '0 0 0 rg',

    // Concept
    invoice.notes
      ? 'BT /F1 10 Tf 45 655 Td (Concepto: ' + esc(invoice.notes.slice(0, 80)) + ') Tj ET'
      : '',

    // Amounts table header
    '0.95 0.97 1 rg',
    '45 625 505 18 re f',
    '0 0 0 rg',
    'BT /F2 9 Tf 50 630 Td (Descripcion) Tj ET',
    'BT /F2 9 Tf 350 630 Td (Base) Tj ET',
    'BT /F2 9 Tf 410 630 Td (IVA ' + taxRate + '%) Tj ET',
    'BT /F2 9 Tf 470 630 Td (Total) Tj ET',

    // Amounts row
    'BT /F1 10 Tf 50 611 Td (' + esc((invoice.notes || 'Servicios').slice(0, 50)) + ') Tj ET',
    'BT /F1 10 Tf 350 611 Td (' + esc(fmtEur(invoice.amountNet)) + ') Tj ET',
    'BT /F1 10 Tf 410 611 Td (' + esc(fmtEur(invoice.amountTax)) + ') Tj ET',
    'BT /F1 10 Tf 470 611 Td (' + esc(fmtEur(invoice.amountGross)) + ') Tj ET',

    // Total line
    '0.85 0.85 0.85 rg',
    '45 600 505 0.5 re f',
    '0 0 0 rg',
    'BT /F2 11 Tf 400 587 Td (TOTAL: ' + esc(fmtEur(invoice.amountGross)) + ') Tj ET',

    // Verifactu section
    isVf
      ? [
          '0.133 0.110 0.384 rg',
          '45 555 230 18 re f',
          '1 1 1 rg',
          'BT /F2 8 Tf 50 560 Td (REGISTRADA EN AEAT ' + esc('(VeriFactu)') + ') Tj ET',
          '0 0 0 rg',
          invoice.verifactuHash
            ? 'BT /F1 7 Tf 45 548 Td (Hash: ' +
              esc((invoice.verifactuHash || '').slice(0, 60)) +
              ') Tj ET'
            : '',
          invoice.verifactuStatus
            ? 'BT /F1 8 Tf 45 538 Td (Estado AEAT: ' + esc(invoice.verifactuStatus) + ') Tj ET'
            : '',
          qrOps ? '0 0 0 rg ' + qrOps : '',
          qrUrl
            ? 'BT /F1 7 Tf 370 670 Td (Verificar en:) Tj ET BT /F1 7 Tf 370 661 Td (' +
              esc(qrUrl.slice(0, 55)) +
              ') Tj ET'
            : '',
        ].join('\n')
      : '',

    // Footer
    '0.6 0.6 0.6 rg',
    'BT /F1 8 Tf 45 30 Td (Generado por Isaak ' + esc('— isaak.verifactu.business') + ') Tj ET',
    '0 0 0 rg',
  ]
    .filter(Boolean)
    .join('\n');

  const objects: string[] = [];

  function addObj(body: string): number {
    objects.push(body);
    return objects.length;
  }

  const streamBytes = Buffer.byteLength(stream, 'latin1');

  addObj('<< /Type /Catalog /Pages 2 0 R >>');
  addObj('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  addObj(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>`
  );
  addObj(`<< /Length ${streamBytes} >>\nstream\n${stream}\nendstream`);
  addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${offsets.length} 0 obj\n${obj}\nendobj\n`;
  }

  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, 'latin1');
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const invoice = await prisma.invoice
    .findFirst({
      where: { id, tenantId: session.tenantId },
      include: { tenant: { select: { name: true, legalName: true, nif: true } } },
    })
    .catch(() => null);

  if (!invoice) {
    return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
  }

  const safeNum = invoice.number.replace(/[^a-zA-Z0-9-_]/g, '_');

  const pdf = await buildInvoicePdf({
    id: invoice.id,
    number: invoice.number,
    issueDate: invoice.issueDate,
    status: invoice.status,
    customerName: invoice.customerName,
    customerNif: invoice.customerNif,
    amountNet: invoice.amountNet.toString(),
    amountTax: invoice.amountTax.toString(),
    amountGross: invoice.amountGross.toString(),
    notes: invoice.notes,
    verifactuHash: (invoice as Record<string, unknown>).verifactuHash as string | null,
    verifactuStatus: (invoice as Record<string, unknown>).verifactuStatus as string | null,
    verifactuQr: (invoice as Record<string, unknown>).verifactuQr as string | null,
    tenant: invoice.tenant,
  });

  // Fire-and-forget: backup invoice PDF to Google Drive if connected
  if (session.userId) {
    void uploadInvoiceToDrive(
      session.tenantId,
      session.userId,
      `factura-${safeNum}.pdf`,
      pdf
    ).catch(() => null);
  }

  return new NextResponse(pdf.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="factura-${safeNum}.pdf"`,
      'Cache-Control': 'no-cache',
    },
  });
}
