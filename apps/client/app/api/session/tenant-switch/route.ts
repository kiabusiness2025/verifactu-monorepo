import { buildSessionCookieOptions, readSessionSecret, signSessionToken } from '@verifactu/utils';
import { NextResponse } from 'next/server';
import { getSessionPayload } from '../../../../lib/session';
import {
  ensureTenantAccess,
  resolveSessionUser,
  setPreferredTenant,
} from '../../../../src/server/workspace';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const session = await getSessionPayload();
  if (!session?.uid) {
    return NextResponse.json({ ok: false, error: 'Sesión no disponible' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    const tenantId = typeof body?.tenantId === 'string' ? body.tenantId.trim() : '';
    if (!tenantId) {
      return NextResponse.json({ ok: false, error: 'tenantId required' }, { status: 400 });
    }

    const user = await resolveSessionUser(session);
    const membership = await ensureTenantAccess(user.id, tenantId);
    await setPreferredTenant(user.id, tenantId);

    const payload = {
      ...session,
      tenantId,
      role: String(membership.role).toLowerCase(),
      name: user.name ?? session.name ?? null,
    };

    const token = await signSessionToken({
      payload,
      secret: readSessionSecret(),
      expiresIn: session.rememberDevice === false ? '1d' : '30d',
    });

    const url = new URL(req.url);
    const host = req.headers.get('host');
    const cookieOpts = buildSessionCookieOptions({
      url: url.toString(),
      host,
      domainEnv: process.env.SESSION_COOKIE_DOMAIN,
      secureEnv: process.env.SESSION_COOKIE_SECURE,
      sameSiteEnv: process.env.SESSION_COOKIE_SAMESITE,
      value: token,
      maxAgeSeconds: session.rememberDevice === false ? 60 * 60 * 24 : 60 * 60 * 24 * 30,
    });

    const response = NextResponse.json({ ok: true, tenantId });
    response.cookies.set(cookieOpts);
    return response;
  } catch (error) {
    console.error('[client/session/tenant-switch] POST error', error);
    return NextResponse.json(
      { ok: false, error: 'No se pudo cambiar de empresa' },
      { status: 500 }
    );
  }
}
