import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const CustomerSchema = z.object({
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  nif: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const session = await getHoldedSession();
  if (!session?.tenantId) {
    return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 });
  }
  const customers = await prisma.customer.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({
    ok: true,
    data: customers.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      nif: c.nif,
      address: c.address,
      city: c.city,
      postalCode: c.postalCode,
      country: c.country,
      paymentTerms: c.paymentTerms,
      notes: c.notes,
      isActive: c.isActive,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
  });
}

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
  const parsed = CustomerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;
  const customer = await prisma.customer.create({
    data: {
      tenantId: session.tenantId,
      ...data,
    },
  });
  return NextResponse.json({ ok: true, data: customer });
}
