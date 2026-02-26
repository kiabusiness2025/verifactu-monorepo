import { requireTenantContext } from '@/lib/api/tenantAuth';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function buildSimplePdf(lines: string[]): Buffer {
  const safeLines = lines.map((line) => line.replace(/[()]/g, ''));
  const content = ['BT', '/F1 12 Tf', '50 770 Td'];
  safeLines.forEach((line, idx) => {
    if (idx > 0) content.push('0 -18 Td');
    content.push(`(${line}) Tj`);
  });
  content.push('ET');

  const stream = content.join('\n');
  const objects = [
    '1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj',
    '2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj',
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj',
    `4 0 obj<< /Length ${Buffer.byteLength(stream, 'utf8')} >>stream\n${stream}\nendstream endobj`,
    '5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${obj}\n`;
  }

  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id, tenantId: auth.tenantId },
    include: { customer: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const lines = [
    `Factura ${invoice.number}`,
    `Fecha: ${invoice.issueDate.toISOString().slice(0, 10)}`,
    `Cliente: ${invoice.customerName}`,
    `NIF: ${invoice.customerNif || '-'}`,
    `Base: ${invoice.amountNet.toString()} EUR`,
    `IVA: ${invoice.amountTax.toString()} EUR`,
    `Total: ${invoice.amountGross.toString()} EUR`,
    `Estado: ${invoice.status}`,
  ];

  const pdf = buildSimplePdf(lines);

  return new NextResponse(pdf, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${invoice.number}.pdf"`,
      'Cache-Control': 'no-cache',
    },
  });
}
