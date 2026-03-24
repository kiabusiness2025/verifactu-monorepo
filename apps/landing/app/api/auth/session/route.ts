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

const DEFAULT_ADMIN_APP_NAME = '[DEFAULT]';
const HOLDED_ADMIN_APP_NAME = 'holded-admin';

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) {
    console.error(`[API] Missing required env var: ${name}`);
    throw new Error(`Missing env var: ${name}`);
  }
  return v;
}

function envOrNull(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function ensureAdminApp(appName: string, envPrefix: string, required: boolean) {
  const existing = admin.apps.find((app) => app?.name === appName);
  if (existing) return existing;

  const projectId = envOrNull(`${envPrefix}PROJECT_ID`);
  const clientEmail = envOrNull(`${envPrefix}CLIENT_EMAIL`);
  const privateKeyRaw = envOrNull(`${envPrefix}PRIVATE_KEY`);

  if (!projectId || !clientEmail || !privateKeyRaw) {
    if (required) {
      if (!projectId) requireEnv(`${envPrefix}PROJECT_ID`);
      if (!clientEmail) requireEnv(`${envPrefix}CLIENT_EMAIL`);
      if (!privateKeyRaw) requireEnv(`${envPrefix}PRIVATE_KEY`);
    }
    return null;
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
  return admin.initializeApp(
    {
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    },
    appName
  );
}

function initFirebaseAdminApps() {
  const apps: admin.app.App[] = [];
  const defaultApp = ensureAdminApp(DEFAULT_ADMIN_APP_NAME, 'FIREBASE_ADMIN_', true);
  if (defaultApp) apps.push(defaultApp);

  const holdedApp = ensureAdminApp(HOLDED_ADMIN_APP_NAME, 'HOLDED_FIREBASE_ADMIN_', false);
  if (holdedApp) apps.push(holdedApp);

  return apps;
}

async function verifyIdTokenAcrossProjects(idToken: string) {
  const apps = initFirebaseAdminApps();
  let lastError: unknown = null;

  for (const app of apps) {
    try {
      const decoded = await app.auth().verifyIdToken(idToken);
      return { decoded, app };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to verify Firebase ID token');
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
    initFirebaseAdminApps();

    const { idToken, rememberDevice } = await req.json().catch(() => ({}));
    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    const { decoded, app } = await verifyIdTokenAcrossProjects(idToken);

    // Obtener información del usuario de Firebase
    const userRecord = await app.auth().getUser(decoded.uid);
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
