import { requireTenantContext } from '@/lib/api/tenantAuth';
import { normalizeDate, normalizeNumber, parseCsv } from '@/lib/import/csv';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const EXPECTED_HEADERS = [
  'Fecha expedición',
  'Número factura',
  'Destinatario',
  'NIF destinatario',
  'Base imponible',
  'Tipo IVA',
  'Cuota IVA repercutida',
  'Retención IRPF',
  'Total factura',
  'Clave operación',
  'Periodo liquidación',
  'Observaciones',
];

export async function POST(request: NextRequest) {
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let file: File | null = null;
  try {
    const formData = await request.formData();
    file = formData.get('file') as File | null;
  } catch {
    return NextResponse.json({ error: 'El cuerpo debe ser multipart/form-data con un campo "file"' }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: 'No se ha adjuntado ningún archivo' }, { status: 400 });
  }

  const text = await file.text();
  const { headers, rows } = parseCsv(text);

  // Validate column headers
  const normalized = headers.map((h) => h.trim());
  for (let i = 0; i < EXPECTED_HEADERS.length; i++) {
    if (normalized[i] !== EXPECTED_HEADERS[i]) {
      return NextResponse.json(
        {
          error: `Columna ${i + 1} incorrecta. Esperado: "${EXPECTED_HEADERS[i]}", recibido: "${normalized[i] ?? ''}"`,
        },
        { status: 400 }
      );
    }
  }

  const errors: { row: number; message: string }[] = [];
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed, +1 for header

    const rawDate = row[0] ?? '';
    const number = (row[1] ?? '').trim();
    const customerName = (row[2] ?? '').trim();
    const customerNif = (row[3] ?? '').trim() || null;
    const rawBase = row[4] ?? '0';
    const rawCuota = row[6] ?? '0';
    const rawTotal = row[8] ?? '0';
    const notes = (row[11] ?? '').trim() || null;

    // Skip blank rows silently
    if (!rawDate.trim() && !number) continue;

    if (!number) {
      errors.push({ row: rowNum, message: 'Número de factura vacío' });
      continue;
    }
    if (!customerName) {
      errors.push({ row: rowNum, message: 'Nombre del destinatario vacío' });
      continue;
    }

    let issueDate: Date;
    let amountNet: number;
    let amountTax: number;
    let amountGross: number;

    try {
      issueDate = normalizeDate(rawDate);
    } catch (e) {
      errors.push({ row: rowNum, message: e instanceof Error ? e.message : String(e) });
      continue;
    }

    try {
      amountNet = normalizeNumber(rawBase);
      amountTax = normalizeNumber(rawCuota);
      amountGross = normalizeNumber(rawTotal);
    } catch (e) {
      errors.push({ row: rowNum, message: e instanceof Error ? e.message : String(e) });
      continue;
    }

    // Dedup: skip if invoice with same number already exists for this tenant
    const existing = await prisma.invoice.findFirst({
      where: { tenantId: auth.tenantId, number },
      select: { id: true },
    });

    if (existing) {
      skipped++;
      continue;
    }

    try {
      await prisma.invoice.create({
        data: {
          tenantId: auth.tenantId,
          number,
          issueDate,
          customerName,
          customerNif,
          amountNet,
          amountTax,
          amountGross,
          status: 'imported',
          notes,
          createdBy: auth.session.uid,
        },
      });
      imported++;
    } catch (e) {
      errors.push({ row: rowNum, message: e instanceof Error ? e.message : 'Error al guardar la factura' });
    }
  }

  return NextResponse.json({ imported, skipped, errors });
}
