import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@verifactu/db';
import { requireAdminSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  await requireAdminSession();
  
  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  const where: any = {};
  if (status) where.status = status;

  const [emails, total] = await Promise.all([
    prisma.emailEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        company: { select: { id: true, name: true } },
        user: { select: { id: true, email: true } }
      }
    }),
    prisma.emailEvent.count({ where })
  ]);

  return NextResponse.json({
    emails,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}
