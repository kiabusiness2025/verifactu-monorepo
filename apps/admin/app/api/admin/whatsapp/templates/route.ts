import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  await requireAdmin(req);

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || undefined;
  const activeOnly = searchParams.get('active') !== 'false';

  const templates = await prisma.whatsAppTemplate.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(activeOnly ? { isActive: true } : {}),
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  await requireAdmin(req);

  const body = await req.json();
  const { name, category = 'general', language = 'es', body: templateBody, variables } = body;

  if (!name || !templateBody) {
    return NextResponse.json({ error: 'name and body are required' }, { status: 400 });
  }

  const template = await prisma.whatsAppTemplate.create({
    data: { name, category, language, body: templateBody, variables: variables ?? undefined },
  });

  return NextResponse.json({ template }, { status: 201 });
}
