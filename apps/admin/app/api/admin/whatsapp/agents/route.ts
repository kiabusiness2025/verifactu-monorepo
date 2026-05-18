import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  await requireAdmin(req);

  const agents = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPPORT'] } },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ agents });
}
