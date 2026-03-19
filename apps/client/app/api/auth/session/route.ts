import { prisma } from '@verifactu/db';
import {
  buildSessionCookieOptions,
  readSessionSecret,
  signSessionToken,
  type SessionPayload,
} from '@verifactu/utils';
import { NextResponse } from 'next/server';
import { getFirebaseAuth } from '../../../../lib/firebase-admin';
import { upsertFirebaseUserIdentity } from '../../../../src/server/workspace';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { idToken, rememberDevice } = await req.json().catch(() => ({}));
    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    const auth = getFirebaseAuth();
    const decoded = await auth.verifyIdToken(idToken, true);
    const userRecord = await auth.getUser(decoded.uid);

    if (!decoded.email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    const user = await upsertFirebaseUserIdentity({
      uid: decoded.uid,
      email: decoded.email,
      name: userRecord.displayName ?? decoded.name ?? decoded.email.split('@')[0] ?? null,
      photoUrl: userRecord.photoURL ?? null,
    });

    const [memberships, preference] = await Promise.all([
      prisma.membership.findMany({
        where: { userId: user.id, status: 'active' },
        select: { tenantId: true, role: true },
        orderBy: [{ createdAt: 'asc' }],
      }),
      prisma.userPreference.findUnique({
        where: { userId: user.id },
        select: { preferredTenantId: true },
      }),
    ]);

    const preferredTenantId =
      (preference?.preferredTenantId &&
      memberships.some((membership) => membership.tenantId === preference.preferredTenantId)
        ? preference.preferredTenantId
        : null) ??
      memberships[0]?.tenantId ??
      null;

    const primaryRole = memberships[0]?.role ? String(memberships[0].role).toLowerCase() : 'member';
    const remember = rememberDevice !== false;
    const payload: SessionPayload = {
      uid: decoded.uid,
      email: decoded.email,
      name: user.name ?? userRecord.displayName ?? decoded.name ?? null,
      tenantId: preferredTenantId ?? undefined,
      role: primaryRole,
      roles: memberships.map((membership) => String(membership.role).toLowerCase()),
      tenants: memberships.map((membership) => membership.tenantId),
      ver: 1,
      rememberDevice: remember,
    };

    const secret = readSessionSecret();
    const token = await signSessionToken({ payload, secret, expiresIn: remember ? '30d' : '1d' });

    const url = new URL(req.url);
    const host = req.headers.get('host');
    const cookieOpts = buildSessionCookieOptions({
      url: url.toString(),
      host,
      domainEnv: process.env.SESSION_COOKIE_DOMAIN,
      secureEnv: process.env.SESSION_COOKIE_SECURE,
      sameSiteEnv: process.env.SESSION_COOKIE_SAMESITE,
      value: token,
      maxAgeSeconds: remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24,
    });

    const response = NextResponse.json({ ok: true, tenantId: preferredTenantId, userId: user.id });
    response.cookies.set(cookieOpts);
    return response;
  } catch (error) {
    console.error('[client/auth/session] Error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
