import { prisma } from '@verifactu/db';
import { NextResponse } from 'next/server';
import { getSessionPayload } from '../../../../../lib/session';
import {
  ensureTenantAccess,
  getWorkspaceStateForUser,
  resolveSessionUser,
} from '../../../../../src/server/workspace';

export const runtime = 'nodejs';

function canManageTenant(role: string) {
  const normalized = role.toLowerCase();
  return normalized === 'owner' || normalized === 'admin';
}

export async function PATCH(req: Request, context: { params: Promise<{ tenantId: string }> }) {
  const session = await getSessionPayload();
  if (!session?.uid) {
    return NextResponse.json({ ok: false, error: 'Sesión no disponible' }, { status: 401 });
  }

  try {
    const { tenantId } = await context.params;
    const user = await resolveSessionUser(session);
    const membership = await ensureTenantAccess(user.id, tenantId);

    if (!canManageTenant(String(membership.role))) {
      return NextResponse.json(
        { ok: false, error: 'Sin permisos para editar la empresa' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const nextName = typeof body?.name === 'string' ? body.name.trim() : null;
    const nextLogoUrl =
      typeof body?.logoUrl === 'string'
        ? body.logoUrl.trim()
        : body?.logoUrl === null
          ? null
          : undefined;

    if (nextName) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          name: nextName,
          legalName: nextName,
        },
      });
    }

    if (nextLogoUrl !== undefined) {
      await prisma.$executeRaw`
        UPDATE tenants
        SET logo_url = ${nextLogoUrl}
        WHERE id = ${tenantId}::uuid
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[client/workspace/tenant] PATCH error', error);
    return NextResponse.json(
      { ok: false, error: 'No se pudo actualizar la empresa' },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ tenantId: string }> }) {
  const session = await getSessionPayload();
  if (!session?.uid) {
    return NextResponse.json({ ok: false, error: 'Sesión no disponible' }, { status: 401 });
  }

  try {
    const { tenantId } = await context.params;
    const user = await resolveSessionUser(session);
    const membership = await ensureTenantAccess(user.id, tenantId);

    if (!canManageTenant(String(membership.role))) {
      return NextResponse.json(
        { ok: false, error: 'Sin permisos para eliminar la empresa' },
        { status: 403 }
      );
    }

    const { tenants } = await getWorkspaceStateForUser(user.id, session.tenantId ?? null);
    if (tenants.length <= 1) {
      return NextResponse.json(
        { ok: false, error: 'Necesitas al menos una empresa visible.' },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.membership.deleteMany({ where: { tenantId, userId: user.id } });

      const remainingMemberships = await tx.membership.count({ where: { tenantId } });
      if (remainingMemberships === 0) {
        await tx.tenant.delete({ where: { id: tenantId } });
      }

      const nextMembership = await tx.membership.findFirst({
        where: { userId: user.id, status: 'active', tenantId: { not: tenantId } },
        orderBy: [{ createdAt: 'asc' }],
      });

      if (nextMembership) {
        await tx.userPreference.upsert({
          where: { userId: user.id },
          create: { userId: user.id, preferredTenantId: nextMembership.tenantId },
          update: { preferredTenantId: nextMembership.tenantId },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[client/workspace/tenant] DELETE error', error);
    return NextResponse.json(
      { ok: false, error: 'No se pudo eliminar la empresa' },
      { status: 500 }
    );
  }
}
