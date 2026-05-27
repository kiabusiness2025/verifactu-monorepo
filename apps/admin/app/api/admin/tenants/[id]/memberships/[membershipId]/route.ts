/**
 * PATCH  /api/admin/tenants/[id]/memberships/[membershipId] — cambiar rol
 * DELETE /api/admin/tenants/[id]/memberships/[membershipId] — revocar acceso
 *
 * Admin can change any role except owner (owner is always protected).
 * Admin can revoke any non-owner member.
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string; membershipId: string }> };

// ── PATCH: change role ────────────────────────────────────────────────────────

export async function PATCH(req: Request, { params }: RouteContext) {
  await requireAdmin(req);
  const { id: tenantId, membershipId } = await params;

  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, tenantId },
    select: { id: true, role: true, status: true },
  });

  if (!membership) {
    return NextResponse.json({ error: 'Miembro no encontrado.' }, { status: 404 });
  }
  if (membership.role === 'owner') {
    return NextResponse.json(
      { error: 'El rol del propietario no puede modificarse.' },
      { status: 400 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const role = typeof body.role === 'string' ? body.role : null;
  if (!role || !['admin', 'member'].includes(role)) {
    return NextResponse.json({ error: 'Rol no válido. Usa "admin" o "member".' }, { status: 400 });
  }

  const updated = await prisma.membership.update({
    where: { id: membershipId },
    data: { role },
    select: { id: true, role: true, status: true },
  });

  return NextResponse.json({ ok: true, membership: updated });
}

// ── DELETE: revoke access ─────────────────────────────────────────────────────

export async function DELETE(req: Request, { params }: RouteContext) {
  await requireAdmin(req);
  const { id: tenantId, membershipId } = await params;

  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, tenantId },
    select: { id: true, role: true, status: true },
  });

  if (!membership) {
    return NextResponse.json({ error: 'Miembro no encontrado.' }, { status: 404 });
  }
  if (membership.role === 'owner') {
    return NextResponse.json(
      { error: 'El propietario del espacio no puede ser eliminado.' },
      { status: 400 }
    );
  }

  await prisma.membership.update({
    where: { id: membershipId },
    data: { status: 'disabled', disabledAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
