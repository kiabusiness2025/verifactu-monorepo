import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@verifactu/db';
import { requireAdminSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  await requireAdminSession();
  
  const searchParams = req.nextUrl.searchParams;
  const provider = searchParams.get('provider');
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  const where: any = {};
  if (provider) where.provider = provider;
  if (status) where.status = status;

  const [webhooks, total] = await Promise.all([
    prisma.webhookEvent.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        attempts: { orderBy: { attemptNumber: 'desc' }, take: 1 },
        company: { select: { id: true, name: true } },
        user: { select: { id: true, email: true } }
      }
    }),
    prisma.webhookEvent.count({ where })
  ]);

  return NextResponse.json({
    webhooks,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}
