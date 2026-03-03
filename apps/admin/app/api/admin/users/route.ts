import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toRoleLabel(role?: string | null): string {
  const normalized = String(role || '').trim().toLowerCase();
  if (normalized === 'owner') return 'owner';
  if (normalized === 'admin') return 'admin';
  if (normalized === 'assistant') return 'assistant';
  return 'usuario';
}

export async function GET(request: Request) {
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

    await requireAdmin(request);

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        tenantMemberships: {
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
    type MembershipRow = UserRow['tenantMemberships'][number];

    const deduped = new Map<
      string,
      {
        id: string;
        email: string;
        displayName: string | null;
        createdAt: string;
        role: string;
        tenants: Array<{ tenantId: string; legalName: string; role: string }>;
      }
    >();

    for (const user of users) {
      const emailKey = normalizeEmail(user.email);
      const memberships = user.tenantMemberships.map((membership: MembershipRow) => ({
        tenantId: membership.tenant.id,
        legalName: membership.tenant.legalName ?? membership.tenant.name,
        role: membership.role,
      }));

      const existing = deduped.get(emailKey);
      if (!existing) {
        deduped.set(emailKey, {
          id: user.id,
          email: user.email,
          displayName: user.name,
          createdAt: user.createdAt.toISOString(),
          role: toRoleLabel(user.tenantMemberships[0]?.role ?? user.role),
          tenants: memberships,
        });
        continue;
      }

      const mergedTenants = new Map(existing.tenants.map((tenant) => [tenant.tenantId, tenant]));
      for (const tenant of memberships) {
        mergedTenants.set(tenant.tenantId, tenant);
      }

      const existingDate = new Date(existing.createdAt).getTime();
      const currentDate = user.createdAt.getTime();
      const keepCurrent = currentDate >= existingDate;

      deduped.set(emailKey, {
        id: keepCurrent ? user.id : existing.id,
        email: keepCurrent ? user.email : existing.email,
        displayName: keepCurrent ? user.name ?? existing.displayName : existing.displayName ?? user.name,
        createdAt: keepCurrent ? user.createdAt.toISOString() : existing.createdAt,
        role: toRoleLabel(
          existing.tenants[0]?.role ?? memberships[0]?.role ?? (keepCurrent ? user.role : undefined)
        ),
        tenants: Array.from(mergedTenants.values()),
      });
    }

    const responseUsers = Array.from(deduped.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ users: responseUsers });
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
