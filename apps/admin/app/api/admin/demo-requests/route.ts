import { NextResponse } from 'next/server';
import { DemoRequestStatus } from '@verifactu/db';
import { requireAdmin } from '@/lib/adminAuth';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

const VALID_STATUSES = new Set(Object.values(DemoRequestStatus));

export async function GET(request: Request) {
  await requireAdmin(request);

  const { searchParams } = new URL(request.url);
  const rawStatus = searchParams.get('status')?.trim() || null;
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || 100), 1), 250);

  const where =
    rawStatus && VALID_STATUSES.has(rawStatus as DemoRequestStatus)
      ? { status: rawStatus as DemoRequestStatus }
      : {};

  const items = await prisma.demoRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      createdAt: true,
      name: true,
      email: true,
      companyName: true,
      phone: true,
      role: true,
      usesHolded: true,
      status: true,
      source: true,
    },
  });

  return NextResponse.json({ items });
}
