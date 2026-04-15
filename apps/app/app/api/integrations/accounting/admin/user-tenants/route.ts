import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type ConnectionStatusFilter = 'all' | 'connected' | 'disconnected' | 'risk';

function parseLimit(raw: string | null) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return 200;
  return Math.min(Math.trunc(value), 500);
}

function parseStatus(raw: string | null): ConnectionStatusFilter {
  if (raw === 'connected' || raw === 'disconnected' || raw === 'risk') return raw;
  return 'all';
}

function normalizeText(value: string | null | undefined) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : '';
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN: Admin access required' }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    const limit = parseLimit(url.searchParams.get('limit'));
    const statusFilter = parseStatus(url.searchParams.get('status'));

    const memberships = await prisma.membership.findMany({
      where: {
        status: { not: 'disabled' },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            legalName: true,
            externalConnections: {
              where: { provider: 'holded' },
              orderBy: { updatedAt: 'desc' },
              take: 1,
              select: {
                id: true,
                connectionStatus: true,
                channelKey: true,
                updatedAt: true,
                lastValidatedAt: true,
                lastSyncAt: true,
                managedByThirdParty: true,
                clientAdminGap: true,
                highGovernanceRisk: true,
              },
            },
          },
        },
      },
    });

    const rows = memberships
      .map((membership) => {
        const connection = membership.tenant.externalConnections[0] || null;
        const connectionStatus = connection?.connectionStatus || 'disconnected';
        const tenantName = normalizeText(membership.tenant.name);
        const tenantLegalName = normalizeText(membership.tenant.legalName);
        const userEmail = normalizeText(membership.user?.email);
        const userName = normalizeText(membership.user?.name);

        return {
          membershipId: membership.id,
          userId: membership.userId,
          userEmail,
          userName,
          tenantId: membership.tenantId,
          tenantName,
          tenantLegalName,
          membershipRole: membership.role,
          membershipStatus: membership.status,
          membershipSide: membership.side,
          connectionId: connection?.id ?? null,
          connectionStatus,
          channelKey: connection?.channelKey ?? null,
          managedByThirdParty: connection?.managedByThirdParty === true,
          clientAdminGap: connection?.clientAdminGap === true,
          highGovernanceRisk: connection?.highGovernanceRisk === true,
          lastValidatedAt: connection?.lastValidatedAt?.toISOString?.() ?? null,
          lastSyncAt: connection?.lastSyncAt?.toISOString?.() ?? null,
          updatedAt: connection?.updatedAt?.toISOString?.() ?? null,
        };
      })
      .filter((row) => {
        if (statusFilter === 'connected' && row.connectionStatus !== 'connected') return false;
        if (statusFilter === 'disconnected' && row.connectionStatus === 'connected') return false;
        if (statusFilter === 'risk' && !row.highGovernanceRisk) return false;

        if (!q) return true;
        const haystack = [
          row.userEmail,
          row.userName,
          row.tenantName,
          row.tenantLegalName,
          row.connectionStatus,
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });

    return NextResponse.json({
      items: rows,
      total: rows.length,
      filters: {
        q,
        status: statusFilter,
        limit,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'No se pudo cargar el panel admin',
      },
      { status: 500 }
    );
  }
}
