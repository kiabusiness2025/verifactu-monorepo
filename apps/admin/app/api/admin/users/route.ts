import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const databaseUrl = process.env.DATABASE_URL || '';
    if (
      process.env.NODE_ENV !== 'production' &&
      (!databaseUrl || !/^postgres(ql)?:\/\//.test(databaseUrl))
    ) {
      return NextResponse.json(
        {
          error: 'Invalid DATABASE_URL',
          details: 'DATABASE_URL must start with postgres:// or postgresql://',
        },
        { status: 500 }
      );
    }

    await requireAdmin({} as Request);

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
        memberships: {
          select: {
            role: true,
            tenant: {
              select: {
                id: true,
                legalName: true,
                name: true,
              },
            },
          },
        },
      },
    });

    type UserRow = (typeof users)[number];
    type MembershipRow = UserRow["memberships"][number];

    return NextResponse.json({
      users: users.map((user: UserRow) => ({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt.toISOString(),
        tenants: user.memberships.map((membership: MembershipRow) => ({
          tenantId: membership.tenant.id,
          legalName: membership.tenant.legalName ?? membership.tenant.name,
          role: membership.role,
        })),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const isForbidden = message.includes('FORBIDDEN');
    const status = isForbidden ? 403 : 500;

    console.error('Error loading users:', error);
    return NextResponse.json(
      {
        error: isForbidden ? 'Forbidden' : 'Failed to fetch users',
        ...(process.env.NODE_ENV !== 'production' ? { details: message } : {}),
      },
      { status }
    );
  }
}
