import { prisma } from '@verifactu/db';
import { NextResponse } from 'next/server';
import { getSessionPayload } from '../../../../lib/session';
import { resolveSessionUser, setPreferredTenant } from '../../../../src/server/workspace';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const session = await getSessionPayload();
  if (!session?.uid) {
    return NextResponse.json({ ok: false, error: 'Sesión no disponible' }, { status: 401 });
  }

  try {
    const user = await resolveSessionUser(session);
    const body = await req.json().catch(() => ({}));
    const name = typeof body?.name === 'string' ? body.name.trim() : '';

    if (!name) {
      return NextResponse.json({ ok: false, error: 'name required' }, { status: 400 });
    }

    const tenant = await prisma.tenant.create({
      data: {
        name,
        legalName: name,
        isDemo: false,
        users: {
          create: {
            userId: user.id,
            role: 'OWNER',
            status: 'active',
          },
        },
      },
    });

    await setPreferredTenant(user.id, tenant.id);

    return NextResponse.json({ ok: true, tenantId: tenant.id });
  } catch (error) {
    console.error('[client/workspace/tenants] POST error', error);
    return NextResponse.json({ ok: false, error: 'No se pudo crear la empresa' }, { status: 500 });
  }
}
