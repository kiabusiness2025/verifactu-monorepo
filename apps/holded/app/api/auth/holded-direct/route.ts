import { sanitizeHoldedReturnTarget } from '@/app/lib/holded-navigation';
import { prisma } from '@/app/lib/prisma';
import {
  SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  readSessionSecret,
  signSessionToken,
} from '@/app/lib/session';
import { encryptHoldedSecret, probeHoldedConnection } from '@verifactu/integrations';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const { email, apiKey, acceptedTerms, acceptedPrivacy, next } = body as Record<string, unknown>;

  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const normalizedApiKey = typeof apiKey === 'string' ? apiKey.trim() : '';
  const normalizedNext = typeof next === 'string' ? next.trim() : '';

  if (!normalizedEmail || !normalizedApiKey) {
    return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 });
  }

  if (!acceptedTerms || !acceptedPrivacy) {
    return NextResponse.json({ error: 'TERMS_NOT_ACCEPTED' }, { status: 400 });
  }

  // Validate email format at boundary
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return NextResponse.json({ error: 'INVALID_EMAIL' }, { status: 400 });
  }

  // Validate API key against Holded
  let probe: Awaited<ReturnType<typeof probeHoldedConnection>>;
  try {
    probe = await probeHoldedConnection(normalizedApiKey);
  } catch {
    return NextResponse.json({ error: 'PROBE_ERROR' }, { status: 502 });
  }

  if (!probe.ok) {
    return NextResponse.json({ error: 'INVALID_API_KEY' }, { status: 400 });
  }

  // Upsert User → Tenant → Membership → ExternalConnection
  let sessionUserId: string;
  let sessionTenantId: string;
  let sessionEmail: string;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Upsert user by email (authProvider=HOLDED_DIRECT)
      let user = await tx.user.findFirst({ where: { email: normalizedEmail } });
      if (!user) {
        user = await tx.user.create({
          data: {
            email: normalizedEmail,
            name: normalizedEmail.split('@')[0],
            authProvider: 'HOLDED_DIRECT',
            authSubject: `holded:${normalizedEmail}`,
          },
        });
      }

      // Find or create tenant
      const membership = await tx.membership.findFirst({
        where: { userId: user.id, status: 'active' },
      });

      let tenantId: string;
      if (membership) {
        tenantId = membership.tenantId;
      } else {
        const tenant = await tx.tenant.create({
          data: {
            name: normalizedEmail.split('@')[0],
            legalName: null,
          },
        });
        await tx.membership.create({
          data: {
            tenantId: tenant.id,
            userId: user.id,
            role: 'owner',
            status: 'active',
          },
        });
        tenantId = tenant.id;
      }

      // Upsert ExternalConnection (channelKey='mobile')
      const encryptedKey = encryptHoldedSecret(normalizedApiKey);
      await tx.externalConnection.upsert({
        where: {
          tenantId_provider_channelKey: {
            tenantId,
            provider: 'holded',
            channelKey: 'mobile',
          },
        },
        create: {
          tenantId,
          provider: 'holded',
          channelKey: 'mobile',
          apiKeyEnc: encryptedKey,
          connectionStatus: 'connected',
          connectedAt: new Date(),
          connectedByUserId: user.id,
          legalTermsAcceptedAt: new Date(),
          legalPrivacyAcceptedAt: new Date(),
          legalAcceptanceVersion: 'v1.0',
        },
        update: {
          apiKeyEnc: encryptedKey,
          connectionStatus: 'connected',
          connectedAt: new Date(),
        },
      });

      return { userId: user.id, email: user.email ?? normalizedEmail, tenantId };
    });

    sessionUserId = result.userId;
    sessionTenantId = result.tenantId;
    sessionEmail = result.email;
  } catch (err) {
    console.error('[holded-direct] DB transaction failed:', err);
    return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 });
  }

  // Mint session JWT
  let token: string;
  try {
    const secret = readSessionSecret();
    token = await signSessionToken({
      payload: {
        uid: sessionUserId,
        email: sessionEmail,
        tenantId: sessionTenantId,
        role: 'owner',
        roles: ['owner'],
        tenants: [sessionTenantId],
        ver: 1,
        rememberDevice: true,
      },
      secret,
      expiresIn: `${SESSION_MAX_AGE_SECONDS}s`,
    });
  } catch (err) {
    console.error('[holded-direct] Session sign failed:', err);
    return NextResponse.json({ error: 'SESSION_ERROR' }, { status: 500 });
  }

  const url = new URL(request.url);
  const host = request.headers.get('host');
  const cookieOptions = buildSessionCookieOptions({
    url: url.toString(),
    host,
    domainEnv: process.env.SESSION_COOKIE_DOMAIN || '.verifactu.business',
    secureEnv: process.env.SESSION_COOKIE_SECURE || 'true',
    sameSiteEnv: process.env.SESSION_COOKIE_SAMESITE || 'none',
    value: token,
    maxAgeSeconds: SESSION_MAX_AGE_SECONDS,
  });

  const redirectUrl = sanitizeHoldedReturnTarget(normalizedNext || undefined, '/dashboard');

  const response = NextResponse.json({ ok: true, redirectUrl });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: cookieOptions.value,
    httpOnly: cookieOptions.httpOnly,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    path: cookieOptions.path,
    domain: cookieOptions.domain,
    maxAge: cookieOptions.maxAge,
  });
  return response;
}
