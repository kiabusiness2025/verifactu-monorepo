import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(req);
  const { id } = await params;

  const existing = await prisma.whatsAppTemplate.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  const body = (await req.json()) as {
    name?: string;
    category?: string;
    language?: string;
    body?: string;
    variables?: string;
    isActive?: boolean;
  };

  const template = await prisma.whatsAppTemplate.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.category !== undefined ? { category: body.category } : {}),
      ...(body.language !== undefined ? { language: body.language } : {}),
      ...(body.body !== undefined ? { body: body.body } : {}),
      ...(body.variables !== undefined ? { variables: body.variables } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    },
  });

  return NextResponse.json({ template });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(req);
  const { id } = await params;

  const existing = await prisma.whatsAppTemplate.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  await prisma.whatsAppTemplate.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
