import { prisma } from '@verifactu/db';
import {
    buildSessionCookieOptions,
    readSessionSecret,
    signSessionToken,
    type SessionPayload,
} from '@verifactu/utils';
import admin from 'firebase-admin';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) {
    console.error(`[API] Missing required env var: ${name}`);
    throw new Error(`Missing env var: ${name}`);
  }
  return v;
}

function initFirebaseAdmin() {
  if (admin.apps.length) return;

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: requireEnv('FIREBASE_ADMIN_PROJECT_ID'),
      clientEmail: requireEnv('FIREBASE_ADMIN_CLIENT_EMAIL'),
      privateKey: requireEnv('FIREBASE_ADMIN_PRIVATE_KEY').replace(/\\n/g, '\n'),
    }),
  });
}

async function getTenantForUser(uid: string, email: string, displayName?: string) {
  // Usar el nombre de Firebase si está disponible, sino el email
  const userName = displayName || email.split('@')[0];

  let user = await prisma.user.findFirst({
    where: { authSubject: uid },
  });

  if (!user && email) {
    user = await prisma.user.findFirst({
      where: { email },
    });
  }

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        email,
        name: userName,
        authProvider: 'FIREBASE',
        authSubject: uid,
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        email,
        name: userName,
        authProvider: 'FIREBASE',
        authSubject: uid,
      },
    });
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, status: 'active' },
    select: { tenantId: true },
  });

  return membership?.tenantId ?? null;
}

export async function POST(req: Request) {
  try {
    initFirebaseAdmin();

    const { idToken, rememberDevice } = await req.json().catch(() => ({}));
    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);

    // Obtener información del usuario de Firebase
    const userRecord = await admin.auth().getUser(decoded.uid);
    const displayName = userRecord.displayName || decoded.name || undefined;

    if (!decoded.email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    const tenantId = await getTenantForUser(decoded.uid, decoded.email, displayName);

    const rolesRaw = (decoded as any).roles ?? (decoded as any).role ?? [];
    const tenantsRaw = (decoded as any).tenants ?? (decoded as any).tenant ?? [];
    const roles = Array.isArray(rolesRaw)
      ? rolesRaw.map((role) => String(role))
      : rolesRaw
        ? [String(rolesRaw)]
        : [];
    const tenants = Array.isArray(tenantsRaw)
      ? tenantsRaw.map((tenant) => String(tenant))
      : tenantsRaw
        ? [String(tenantsRaw)]
        : [];

    const remember = rememberDevice !== false;
    const payload: SessionPayload = {
      uid: decoded.uid,
      email: decoded.email ?? null,
      tenantId: tenantId || undefined,
      role: roles[0] ?? 'member',
      roles,
      tenants,
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

    const res = NextResponse.json({ ok: true });
    res.cookies.set(cookieOpts);
    return res;
  } catch (error) {
    console.error('[API] Error in POST /api/auth/session:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
