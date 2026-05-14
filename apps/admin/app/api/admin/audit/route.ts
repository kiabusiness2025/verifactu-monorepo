import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createAuthOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(createAuthOptions());
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    const auditLogs = await prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        actorUser: {
          select: { email: true, role: true },
        },
        targetUser: {
          select: { email: true },
        },
        targetCompany: {
          select: { name: true, taxId: true },
        },
      },
    });

    return NextResponse.json({ auditLogs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
