import { NextResponse } from 'next/server';
import { prisma } from '@verifactu/db';
import { requireAdminSession } from '@/lib/auth';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  await requireAdminSession();

  const webhook = await prisma.webhookEvent.findUnique({
    where: { id: params.id },
    include: {
      attempts: { orderBy: { attemptNumber: 'asc' } },
      company: true,
      user: true
    }
  });

  if (!webhook) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
  }

  return NextResponse.json(webhook);
}
