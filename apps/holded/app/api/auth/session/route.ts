import admin from 'firebase-admin';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { recordUsageEvent } from '@verifactu/integrations';
import {
  buildHoldedAccessReadyEmail,
  buildHoldedOnboardingGuideEmail,
} from '@/app/lib/communications/holded-email-templates';
import { writeHoldedActivity } from '@/app/lib/holded-activity';
import { prisma } from '@/app/lib/prisma';
import {
  buildSessionCookieOptions,
  readSessionSecret,
  signSessionToken,
  type SessionPayload,
} from '@/app/lib/session';

export const runtime = 'nodejs';

const DEFAULT_SHARED_COOKIE_DOMAIN = '.verifactu.business';
const DEFAULT_SHARED_COOKIE_SAMESITE = 'none';
const DEFAULT_SHARED_COOKIE_SECURE = 'true';

const DEFAULT_ADMIN_APP_NAME = '[DEFAULT]';

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

function envOrNull(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function cleanEnv(value: string | undefined) {
  return value?.replace(/[\r\n]/g, '').trim();
}

function readOptionalEnv(name: string, fallback: string) {
  return cleanEnv(process.env[name]) || fallback;
}

async function sendVerifiedAccessEmails(input: { email: string; source: string }) {
  const resendApiKey = cleanEnv(process.env.RESEND_API_KEY);
  if (!resendApiKey) return;

  const holdedSite = readOptionalEnv(
    'NEXT_PUBLIC_HOLDED_SITE_URL',
    'https://holded.verifactu.business'
  );
  const accessUrl = new URL(`${holdedSite}/auth/holded`);
  accessUrl.searchParams.set('source', input.source);
  const onboardingUrl = new URL(`${holdedSite}/onboarding/holded`);
  onboardingUrl.searchParams.set('source', input.source);
  accessUrl.searchParams.set('next', onboardingUrl.toString());

  const resend = new Resend(resendApiKey);
  const from = readOptionalEnv(
    'RESEND_FROM',
    'Holded for Isaak <no-reply@holded.verifactu.business>'
  );
  const replyTo = readOptionalEnv('RESEND_REPLY_TO', 'soporte@verifactu.business');

  const accessReady = buildHoldedAccessReadyEmail({
    email: input.email,
    accessUrl: accessUrl.toString(),
    dashboardUrl: onboardingUrl.toString(),
  });
  const guide = buildHoldedOnboardingGuideEmail({
    name: input.email.split('@')[0] || '',
    email: input.email,
    companyName: 'tu empresa',
    source: input.source,
  });

  await Promise.all([
    resend.emails.send({
      from,
      to: [input.email],
      subject: accessReady.subject,
      html: accessReady.html,
      text: accessReady.text,
      replyTo,
    }),
    resend.emails.send({
      from,
      to: [input.email],
      subject: guide.subject,
      html: guide.html,
      text: guide.text,
      replyTo,
    }),
  ]);
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

  return admin.initializeApp(
    {
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKeyRaw.replace(/\\n/g, '\n'),
      }),
    },
    appName
  );
}

function initFirebaseAdminApps() {
  const apps: admin.app.App[] = [];
  const defaultApp = ensureAdminApp(DEFAULT_ADMIN_APP_NAME, 'FIREBASE_ADMIN_', true);
  if (defaultApp) apps.push(defaultApp);
  return apps;
}

async function verifyIdToken(idToken: string) {
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

  if (user.isBlocked) {
    const error = new Error('Tu acceso esta bloqueado temporalmente. Contacta con soporte.');
    error.name = 'HoldedBlockedUserError';
    throw error;
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, status: 'active' },
    select: { tenantId: true },
  });

  if (membership?.tenantId) {
    return { tenantId: membership.tenantId, user };
  }

  const created = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: `${userName} - Holded`,
        legalName: `${userName} - Holded`,
      },
      select: { id: true },
    });

    await tx.membership.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        role: 'owner',
        status: 'active',
      },
    });

    await tx.userPreference.upsert({
      where: { userId: user.id },
      update: { preferredTenantId: tenant.id },
      create: {
        userId: user.id,
        preferredTenantId: tenant.id,
      },
    });

    return { tenantId: tenant.id, user };
  });

  return created;
}

export async function POST(req: Request) {
  try {
    const { idToken, rememberDevice } = await req.json().catch(() => ({}));
    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    const { decoded, app } = await verifyIdToken(idToken);
    let userRecord: admin.auth.UserRecord;
    try {
      userRecord = await app.auth().getUser(decoded.uid);
    } catch (firebaseUserError) {
      const code =
        firebaseUserError && typeof firebaseUserError === 'object' && 'code' in firebaseUserError
          ? String((firebaseUserError as { code?: unknown }).code || '')
          : '';

      if (code.includes('user-not-found')) {
        return NextResponse.json(
          {
            error:
              'Tu acceso anterior ya no existe en Firebase. Vuelve a registrarte o inicia sesion otra vez.',
          },
          { status: 401 }
        );
      }

      throw firebaseUserError;
    }
    const displayName = userRecord.displayName || decoded.name || undefined;
    const source = new URL(req.url).searchParams.get('source')?.trim() || 'holded_login';

    if (!decoded.email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    const tenantResult = await getTenantForUser(decoded.uid, decoded.email, displayName);
    const tenantId = tenantResult.tenantId;
    const user = tenantResult.user;
    const emailVerifiedAt =
      userRecord.emailVerified && !user.emailVerified ? new Date() : user.emailVerified;

    if (emailVerifiedAt !== user.emailVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: emailVerifiedAt },
      });
      try {
        await sendVerifiedAccessEmails({
          email: decoded.email,
          source,
        });
      } catch (emailError) {
        console.error('[holded] verified welcome emails failed', {
          error: emailError instanceof Error ? emailError.message : String(emailError),
        });
      }
      await Promise.allSettled([
        writeHoldedActivity({
          tenantId,
          userId: user.id,
          action: 'email_verified',
          resourceType: 'auth',
          responsePayload: {
            email: decoded.email,
          },
        }),
        recordUsageEvent({
          prisma,
          tenantId,
          userId: user.id,
          type: 'EMAIL_VERIFIED',
          source,
          path: '/api/auth/session',
          metadataJson: {
            email: decoded.email,
          },
        }),
      ]);
    }
    const rolesRaw =
      (decoded as { roles?: unknown; role?: unknown }).roles ??
      (decoded as { roles?: unknown; role?: unknown }).role ??
      [];
    const tenantsRaw =
      (decoded as { tenants?: unknown; tenant?: unknown }).tenants ??
      (decoded as { tenants?: unknown; tenant?: unknown }).tenant ??
      [];
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

    const token = await signSessionToken({
      payload,
      secret: readSessionSecret(),
      expiresIn: remember ? '30d' : '1d',
    });

    const url = new URL(req.url);
    const host = req.headers.get('host');
    const cookieOpts = buildSessionCookieOptions({
      url: url.toString(),
      host,
      domainEnv: process.env.SESSION_COOKIE_DOMAIN || DEFAULT_SHARED_COOKIE_DOMAIN,
      secureEnv: process.env.SESSION_COOKIE_SECURE || DEFAULT_SHARED_COOKIE_SECURE,
      sameSiteEnv: process.env.SESSION_COOKIE_SAMESITE || DEFAULT_SHARED_COOKIE_SAMESITE,
      value: token,
      maxAgeSeconds: remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(cookieOpts);
    await Promise.allSettled([
      writeHoldedActivity({
        tenantId,
        userId: user.id,
        action: 'login_completed',
        resourceType: 'auth',
        responsePayload: {
          email: decoded.email,
          rememberDevice: remember,
        },
      }),
      recordUsageEvent({
        prisma,
        tenantId,
        userId: user.id,
        type: 'LOGIN_COMPLETED',
        source,
        path: '/api/auth/session',
        metadataJson: {
          email: decoded.email,
          rememberDevice: remember,
        },
      }),
    ]);
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'HoldedBlockedUserError') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('[holded] Error in POST /api/auth/session:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
