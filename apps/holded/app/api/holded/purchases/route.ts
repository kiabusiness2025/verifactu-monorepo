import { z } from 'zod';
// Esquema de validación para alta de compra/gasto
const PurchaseSchema = z.object({
  date: z.string().or(z.date()),
  description: z.string(),
  category: z.string().optional(),
  amount: z.number(),
  iva: z.number().optional(),
  retenciones: z.string().optional(),
  subtotal: z.number().optional(),
  total: z.number().optional(),
  proveedor: z.object({
    id: z.string().optional(),
    name: z.string(),
    nif: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    paymentTerms: z.string().optional(),
    notes: z.string().optional(),
  }),
  status: z.string().optional(),
  canonicalStatus: z.string().optional(),
  docType: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  concepto: z.string().optional(),
});
export async function POST(req: NextRequest) {
  const session = await getHoldedSession();
  if (!session?.tenantId) {
    return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = PurchaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // Buscar o crear proveedor
  let supplierId = data.proveedor.id;
  if (!supplierId) {
    // Buscar por NIF y tenant, si no existe crear
    const existing = await prisma.supplier.findFirst({
      where: {
        tenantId: session.tenantId,
        nif: data.proveedor.nif ?? undefined,
        name: data.proveedor.name,
      },
    });
    if (existing) {
      supplierId = existing.id;
    } else {
      const created = await prisma.supplier.create({
        data: {
          tenantId: session.tenantId,
          name: data.proveedor.name,
          nif: data.proveedor.nif,
          email: data.proveedor.email,
          phone: data.proveedor.phone,
          address: data.proveedor.address,
          city: data.proveedor.city,
          postalCode: data.proveedor.postalCode,
          country: data.proveedor.country,
          paymentTerms: data.proveedor.paymentTerms,
          notes: data.proveedor.notes,
        },
      });
      supplierId = created.id;
    }
  }

  // Crear ExpenseRecord
  const expense = await prisma.expenseRecord.create({
    data: {
      tenantId: session.tenantId,
      supplierId,
      date: new Date(data.date),
      description: data.description,
      category: data.category ?? 'general',
      amount: data.amount,
      taxRate: data.iva ?? 0.21,
      taxCategory: data.retenciones ?? 'ninguna',
      canonicalStatus: data.canonicalStatus ?? 'draft',
      status: data.status ?? 'received',
      docType: data.docType ?? 'invoice',
      reference: data.reference,
      notes: data.notes,
    },
    include: { supplier: true },
  });

  return NextResponse.json({
    ok: true,
    data: {
      id: expense.id,
      date: expense.date,
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      iva: expense.taxRate,
      retenciones: expense.taxCategory,
      subtotal: expense.amount ? Number(expense.amount) / (1 + Number(expense.taxRate ?? 0)) : null,
      total: expense.amount,
      proveedor: expense.supplier
        ? {
            id: expense.supplier.id,
            name: expense.supplier.name,
            nif: expense.supplier.nif,
            email: expense.supplier.email,
            phone: expense.supplier.phone,
            address: expense.supplier.address,
            city: expense.supplier.city,
            postalCode: expense.supplier.postalCode,
            country: expense.supplier.country,
            paymentTerms: expense.supplier.paymentTerms,
            notes: expense.supplier.notes,
          }
        : null,
      status: expense.status,
      canonicalStatus: expense.canonicalStatus,
      docType: expense.docType,
      reference: expense.reference,
      notes: expense.notes,
      concepto: expense.description,
    },
  });
}
// Endpoint inicial para Compras / Gastos / Purchase Documents
// Fase 1: solo GET y estructura base
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const session = await getHoldedSession();
  if (!session?.tenantId) {
    return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 });
  }

  // Consulta todos los ExpenseRecord del tenant, incluyendo proveedor
  const expenses = await prisma.expenseRecord.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { date: 'desc' },
    include: {
      supplier: true,
    },
  });

  // Mapeo de campos requeridos
  const data = expenses.map((exp) => ({
    id: exp.id,
    date: exp.date,
    description: exp.description,
    category: exp.category,
    amount: exp.amount,
    iva: exp.taxRate,
    retenciones: exp.taxCategory,
    subtotal: exp.amount ? Number(exp.amount) / (1 + Number(exp.taxRate ?? 0)) : null,
    total: exp.amount,
    proveedor: exp.supplier
      ? {
          id: exp.supplier.id,
          name: exp.supplier.name,
          nif: exp.supplier.nif,
          email: exp.supplier.email,
          phone: exp.supplier.phone,
          address: exp.supplier.address,
          city: exp.supplier.city,
          postalCode: exp.supplier.postalCode,
          country: exp.supplier.country,
          paymentTerms: exp.supplier.paymentTerms,
          notes: exp.supplier.notes,
        }
      : null,
    status: exp.status,
    canonicalStatus: exp.canonicalStatus,
    docType: exp.docType,
    reference: exp.reference,
    notes: exp.notes,
    concepto: exp.description,
  }));

  return NextResponse.json({
    ok: true,
    data,
  });
}

// POST, PUT, DELETE se añadirán en siguientes iteraciones según el plan
