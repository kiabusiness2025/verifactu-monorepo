import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type ConnectionStatusFilter = 'all' | 'connected' | 'disconnected' | 'risk';
type SortFilter = 'updated_desc' | 'tenant_asc' | 'tenant_desc' | 'user_asc' | 'user_desc';
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

function parsePage(raw: string | null) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.trunc(value);
}

function parseStatus(raw: string | null): ConnectionStatusFilter {
  if (raw === 'connected' || raw === 'disconnected' || raw === 'risk') return raw;
  return 'all';
}

function parseSort(raw: string | null): SortFilter {
  if (
    raw === 'updated_desc' ||
    raw === 'tenant_asc' ||
    raw === 'tenant_desc' ||
    raw === 'user_asc' ||
    raw === 'user_desc'
  ) {
    return raw;
  }
  return 'updated_desc';
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
    const page = parsePage(url.searchParams.get('page'));
    const pageSize = parseLimit(url.searchParams.get('pageSize') || url.searchParams.get('limit'));
    const statusFilter = parseStatus(url.searchParams.get('status'));
    const sort = parseSort(url.searchParams.get('sort'));

    const where: any = {
      status: { not: 'disabled' },
    };

    if (q) {
      where.OR = [
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { tenant: { name: { contains: q, mode: 'insensitive' } } },
        { tenant: { legalName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    if (statusFilter === 'connected') {
      where.tenant = {
        ...(where.tenant || {}),
        externalConnections: {
          some: { provider: 'holded', connectionStatus: 'connected' },
        },
      };
    }

    if (statusFilter === 'disconnected') {
      where.tenant = {
        ...(where.tenant || {}),
        externalConnections: {
          none: { provider: 'holded', connectionStatus: 'connected' },
        },
      };
    }

    if (statusFilter === 'risk') {
      where.tenant = {
        ...(where.tenant || {}),
        externalConnections: {
          some: { provider: 'holded', highGovernanceRisk: true },
        },
      };
    }

    const orderBy: any[] =
      sort === 'tenant_asc'
        ? [{ tenant: { name: 'asc' } }, { createdAt: 'desc' }]
        : sort === 'tenant_desc'
          ? [{ tenant: { name: 'desc' } }, { createdAt: 'desc' }]
          : sort === 'user_asc'
            ? [{ user: { email: 'asc' } }, { createdAt: 'desc' }]
            : sort === 'user_desc'
              ? [{ user: { email: 'desc' } }, { createdAt: 'desc' }]
              : [{ createdAt: 'desc' }];

    const total = await prisma.membership.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * pageSize;

    const memberships = await prisma.membership.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
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
      .filter((row) => (statusFilter === 'risk' ? row.highGovernanceRisk : true));

    return NextResponse.json({
      items: rows,
      total,
      page: safePage,
      pageSize,
      totalPages,
      filters: {
        q,
        status: statusFilter,
        sort,
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
      membershipIds?: string[];
      role?: unknown;
      status?: unknown;
    } | null;

    const membershipId = body?.membershipId?.trim() || null;
    const membershipIds = Array.isArray(body?.membershipIds)
      ? body.membershipIds.map((item) => `${item}`.trim()).filter(Boolean)
      : [];

    if (!membershipId && membershipIds.length === 0) {
      return NextResponse.json(
        { error: 'membershipId or membershipIds required' },
        { status: 400 }
      );
    }

    const role = parseMembershipRole(body?.role);
    const status = parseMembershipStatus(body?.status);

    if (!role && !status) {
      return NextResponse.json(
        { error: 'role or status required (and must be valid)' },
        { status: 400 }
      );
    }

    const updateData: any = {
      role: role ?? undefined,
      status: status ?? undefined,
      disabledAt: status === 'disabled' ? new Date() : status === 'active' ? null : undefined,
    };

    if (membershipId) {
      const updated = await prisma.membership.update({
        where: { id: membershipId },
        data: updateData,
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
    }

    const result = await prisma.membership.updateMany({
      where: { id: { in: membershipIds } },
      data: updateData,
    });

    return NextResponse.json({
      ok: true,
      affected: result.count,
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
