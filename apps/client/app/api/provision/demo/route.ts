import { prisma } from '@verifactu/db';
import { NextResponse } from 'next/server';
import { getSessionPayload } from '../../../../lib/session';
import { resolveSessionUser } from '../../../../src/server/workspace';

export async function POST(_req: Request) {
  try {
    const session = await getSessionPayload();
    if (!session?.uid) {
      return NextResponse.json({ ok: false, error: 'Sesión no disponible' }, { status: 401 });
    }

    const user = await resolveSessionUser(session);
    if (!user) throw new Error('User not found in DB');

    const existingTenant = await prisma.tenant.findFirst({
      where: {
        name: 'Empresa Demo SL',
        users: { some: { userId: user.id } },
      },
      select: { id: true },
    });
    if (existingTenant?.id) {
      return NextResponse.json({ ok: true, tenantId: existingTenant.id, already: true });
    }

    const tenantId = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: 'Empresa Demo SL',
          legalName: 'Empresa Demo SL',
          nif: 'B12345678',
          isDemo: true,
        },
      });

      await tx.membership.create({
        data: { tenantId: tenant.id, userId: user.id, role: 'OWNER', status: 'active' },
      });

      await tx.userPreference.upsert({
        where: { userId: user.id },
        create: { userId: user.id, preferredTenantId: tenant.id },
        update: { preferredTenantId: tenant.id },
      });

      return tenant.id;
    });

    return NextResponse.json({ ok: true, tenantId, already: false });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Unknown error' }, { status: 400 });
  }
}
