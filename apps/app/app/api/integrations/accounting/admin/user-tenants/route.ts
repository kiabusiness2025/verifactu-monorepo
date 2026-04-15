import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type ConnectionStatusFilter = 'all' | 'connected' | 'disconnected' | 'risk';
type MembershipStatusInput = 'active' | 'invited' | 'disabled';
type MembershipRoleInput = 'company_admin' | 'operator' | 'viewer' | 'advisor_operator';

const ALLOWED_MEMBERSHIP_STATUSES = new Set<MembershipStatusInput>([
  'active',
  'invited',
  'disabled',
]);
const ALLOWED_MEMBERSHIP_ROLES = new Set<MembershipRoleInput>([
  'company_admin',
  'operator',
  'viewer',
  'advisor_operator',
]);

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

function parseMembershipStatus(raw: unknown): MembershipStatusInput | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim() as MembershipStatusInput;
  return ALLOWED_MEMBERSHIP_STATUSES.has(value) ? value : null;
}

function parseMembershipRole(raw: unknown): MembershipRoleInput | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim() as MembershipRoleInput;
  return ALLOWED_MEMBERSHIP_ROLES.has(value) ? value : null;
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

export async function PATCH(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN: Admin access required' }, { status: 403 });
  }

  try {
    const body = (await request.json().catch(() => null)) as {
      membershipId?: string;
      role?: unknown;
      status?: unknown;
    } | null;

    const membershipId = body?.membershipId?.trim();
    if (!membershipId) {
      return NextResponse.json({ error: 'membershipId required' }, { status: 400 });
    }

    const role = parseMembershipRole(body?.role);
    const status = parseMembershipStatus(body?.status);

    if (!role && !status) {
      return NextResponse.json(
        { error: 'role or status required (and must be valid)' },
        { status: 400 }
      );
    }

    const updated = await prisma.membership.update({
      where: { id: membershipId },
      data: {
        role: role ?? undefined,
        status: status ?? undefined,
        disabledAt: status === 'disabled' ? new Date() : status === 'active' ? null : undefined,
      },
      select: {
        id: true,
        role: true,
        status: true,
        disabledAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      item: {
        membershipId: updated.id,
        role: updated.role,
        status: updated.status,
        disabledAt: updated.disabledAt?.toISOString?.() ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'No se pudo actualizar la membership del tenant',
      },
      { status: 500 }
    );
  }
}
