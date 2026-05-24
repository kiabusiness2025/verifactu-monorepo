/**
 * GET /api/team/workspaces — list all tenants where the current user has an active membership
 *
 * Used to populate the workspace switcher UI.
 */

import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getHoldedSession();
  if (!session?.userId || !session.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: session.userId, status: 'active' },
    include: {
      tenant: {
        include: {
          profile: {
            select: { tradeName: true, legalName: true, taxId: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({
    workspaces: memberships.map((m) => ({
      tenantId: m.tenantId,
      role: m.role,
      name:
        m.tenant.profile?.tradeName ??
        m.tenant.profile?.legalName ??
        m.tenant.name ??
        'Espacio sin nombre',
      taxId: m.tenant.profile?.taxId ?? null,
      isCurrent: m.tenantId === session.tenantId,
    })),
  });
}
