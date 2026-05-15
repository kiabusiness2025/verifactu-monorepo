import { requireAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@verifactu/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(sp.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
    );
    const search = sp.get('search')?.trim() ?? '';
    const status = sp.get('status') ?? 'all';
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(status === 'blocked' ? { isBlocked: true } : {}),
      ...(status === 'connected'
        ? {
            tenantMemberships: {
              some: {
                status: { not: 'disabled' },
                tenant: {
                  externalConnections: {
                    some: { provider: 'holded', connectionStatus: 'connected' },
                  },
                },
              },
            },
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          isBlocked: true,
          blockedReason: true,
          createdAt: true,
          tenantMemberships: {
            where: { status: { not: 'disabled' } },
            select: {
              tenant: {
                select: { id: true, name: true, legalName: true },
              },
              role: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const userIds = users.map((u) => u.id);
    type ConnectedRow = { user_id: string };
    const connectedRows: ConnectedRow[] =
      userIds.length > 0
        ? await prisma.$queryRaw<ConnectedRow[]>`
            SELECT DISTINCT m.user_id
            FROM memberships m
            INNER JOIN external_connections ec ON ec.tenant_id = m.tenant_id
            WHERE ec.provider = 'holded'
              AND ec.connection_status = 'connected'
              AND m.user_id = ANY(${userIds}::text[])
              AND COALESCE(m.status, 'active') <> 'disabled'
          `
        : [];
    const connectedSet = new Set(connectedRows.map((r) => r.user_id));

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.name,
        isBlocked: u.isBlocked,
        blockedReason: u.blockedReason,
        isConnected: connectedSet.has(u.id),
        createdAt: u.createdAt.toISOString(),
        tenants: u.tenantMemberships.map((m) => ({
          tenantId: m.tenant.id,
          legalName: m.tenant.legalName ?? m.tenant.name,
          role: m.role,
        })),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const isForbidden = message.includes('FORBIDDEN');
    return NextResponse.json(
      {
        error: isForbidden ? 'Forbidden' : 'Failed to fetch users',
        ...(process.env.NODE_ENV !== 'production' ? { details: message } : {}),
      },
      { status: isForbidden ? 403 : 500 }
    );
  }
}
