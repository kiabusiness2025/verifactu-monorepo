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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getHoldedSession();
  if (!session?.tenantId) {
    return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 });
  }
  const customer = await prisma.customer.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  });
  if (!customer) {
    return NextResponse.json({ ok: false, error: 'No encontrado' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: customer });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
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
  const customer = await prisma.customer.update({
    where: { id: params.id, tenantId: session.tenantId },
    data,
  });
  return NextResponse.json({ ok: true, data: customer });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getHoldedSession();
  if (!session?.tenantId) {
    return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 });
  }
  await prisma.customer.delete({
    where: { id: params.id, tenantId: session.tenantId },
  });
  return NextResponse.json({ ok: true });
}
