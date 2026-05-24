/**
 * PATCH /api/team/members/[id] — change a member's role
 * DELETE /api/team/members/[id] — remove (disable) a member
 *
 * Auth: Firebase session. Requires admin/owner role.
 * Owners cannot be removed or have their role changed.
 */

import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

function canManageTeam(role: string): boolean {
  return role === 'owner' || role === 'admin' || role === 'company_admin';
}

type RouteContext = { params: Promise<{ id: string }> };

async function resolveCallerAndTarget(
  tenantId: string,
  callerId: string,
  membershipId: string
) {
  const [caller, target] = await Promise.all([
    prisma.membership.findUnique({
      where: { tenantId_userId: { tenantId, userId: callerId } },
      select: { role: true },
    }),
    prisma.membership.findFirst({
      where: { id: membershipId, tenantId },
      select: { id: true, userId: true, role: true, status: true },
    }),
  ]);
  return { caller, target };
}

// ── PATCH: change role ────────────────────────────────────────────────────────

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

  const session = await getHoldedSession();
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { caller, target } = await resolveCallerAndTarget(
    session.tenantId,
    session.userId,
    id
  );

  if (!caller || !canManageTeam(caller.role)) {
    return NextResponse.json({ error: 'Permisos insuficientes.' }, { status: 403 });
  }

  if (!target) {
    return NextResponse.json({ error: 'Miembro no encontrado.' }, { status: 404 });
  }

  if (target.role === 'owner') {
    return NextResponse.json(
      { error: 'El rol del propietario no puede cambiarse.' },
      { status: 400 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const role = typeof body.role === 'string' ? body.role : null;
  if (!role || !['admin', 'member'].includes(role)) {
    return NextResponse.json({ error: 'Rol no válido.' }, { status: 400 });
  }

  const updated = await prisma.membership.update({
    where: { id },
    data: { role },
    select: { id: true, role: true, status: true },
  });

  return NextResponse.json({ ok: true, membership: updated });
}

// ── DELETE: remove member ─────────────────────────────────────────────────────

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const session = await getHoldedSession();
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { caller, target } = await resolveCallerAndTarget(
    session.tenantId,
    session.userId,
    id
  );

  if (!caller || !canManageTeam(caller.role)) {
    return NextResponse.json({ error: 'Permisos insuficientes.' }, { status: 403 });
  }

  if (!target) {
    return NextResponse.json({ error: 'Miembro no encontrado.' }, { status: 404 });
  }

  if (target.role === 'owner') {
    return NextResponse.json(
      { error: 'El propietario del espacio no puede ser eliminado.' },
      { status: 400 }
    );
  }

  // Disallow removing yourself (use leave flow instead — not implemented yet)
  if (target.userId === session.userId) {
    return NextResponse.json(
      { error: 'No puedes eliminarte a ti mismo.' },
      { status: 400 }
    );
  }

  await prisma.membership.update({
    where: { id },
    data: { status: 'disabled', disabledAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
