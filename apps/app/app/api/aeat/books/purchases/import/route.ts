import { requireTenantContext } from '@/lib/api/tenantAuth';
import { normalizeDate, normalizeNumber, parseCsv } from '@/lib/import/csv';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const EXPECTED_HEADERS = [
  'Fecha factura',
  'Fecha registro',
  'Número factura proveedor',
  'Proveedor',
  'NIF proveedor',
  'Base imponible',
  'Tipo IVA',
  'Cuota IVA soportado',
  'IVA deducible (SI/NO)',
  'Total factura',
  'Clave gasto',
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
    const reference = (row[2] ?? '').trim() || null;
    const supplierName = (row[3] ?? '').trim();
    const supplierNif = (row[4] ?? '').trim().toUpperCase() || null;
    const rawBase = row[5] ?? '0';
    const rawTipoIva = row[6] ?? '0';
    const rawCuota = row[7] ?? '0';
    const ivaDeducibleRaw = (row[8] ?? 'SI').trim().toUpperCase();
    const rawTotal = row[9] ?? '0';
    const claveGasto = (row[10] ?? '').trim();
    const notes = (row[11] ?? '').trim() || null;

    // Skip blank rows silently
    if (!rawDate.trim() && !supplierName) continue;

    if (!supplierName) {
      errors.push({ row: rowNum, message: 'Nombre del proveedor vacío' });
      continue;
    }

    let expenseDate: Date;
    let amountTotal: number;
    let tipoIva: number;

    try {
      expenseDate = normalizeDate(rawDate);
    } catch (e) {
      errors.push({ row: rowNum, message: e instanceof Error ? e.message : String(e) });
      continue;
    }

    try {
      normalizeNumber(rawBase); // validate
      tipoIva = normalizeNumber(rawTipoIva);
      normalizeNumber(rawCuota); // validate
      amountTotal = normalizeNumber(rawTotal);
    } catch (e) {
      errors.push({ row: rowNum, message: e instanceof Error ? e.message : String(e) });
      continue;
    }

    // Dedup: skip if expense with same reference + date already exists
    if (reference) {
      const existing = await prisma.expenseRecord.findFirst({
        where: { tenantId: auth.tenantId, reference, date: expenseDate },
        select: { id: true },
      });
      if (existing) {
        skipped++;
        continue;
      }
    }

    // Find or create supplier by NIF
    let supplierId: string | null = null;
    if (supplierNif) {
      let supplier = await prisma.supplier.findFirst({
        where: { tenantId: auth.tenantId, nif: supplierNif },
        select: { id: true },
      });
      if (!supplier) {
        supplier = await prisma.supplier.create({
          data: { tenantId: auth.tenantId, name: supplierName, nif: supplierNif },
          select: { id: true },
        });
      }
      supplierId = supplier.id;
    }

    const ivaDeducible = ivaDeducibleRaw !== 'NO';
    const taxCategory = ivaDeducible ? 'iva_deducible' : 'iva_no_deducible';

    try {
      await prisma.expenseRecord.create({
        data: {
          tenantId: auth.tenantId,
          supplierId,
          date: expenseDate,
          description: supplierName,
          category: claveGasto || 'importado',
          amount: amountTotal,
          taxRate: tipoIva / 100,
          taxCategory,
          docType: 'invoice',
          reference,
          notes,
          status: 'received',
          canonicalStatus: 'confirmed',
        },
      });
      imported++;
    } catch (e) {
      errors.push({ row: rowNum, message: e instanceof Error ? e.message : 'Error al guardar el gasto' });
    }
  }

  return NextResponse.json({ imported, skipped, errors });
}
