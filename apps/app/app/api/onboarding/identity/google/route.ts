import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-admin';
import {
  resolveHoldedOnboardingSession,
  resolveHoldedOnboardingSessionFromHeaders,
} from '@/lib/integrations/holdedOnboardingSession';
import { rememberVerifiedHoldedEmailIdentity } from '@/lib/integrations/holdedVerifiedEmailIdentities';
import { buildFullName, normalizeMeaningfulPersonName, splitFullName } from '@/lib/personName';
import { mintHoldedOnboardingTokenForSubject } from '@/lib/oauth/mcp';

export const runtime = 'nodejs';

function readTenantIdHint(body: Record<string, unknown>) {
  return typeof body.tenantIdHint === 'string' ? body.tenantIdHint.trim() || null : null;
}

async function resolveIdentityOnboardingSession(
  request: NextRequest,
  body: Record<string, unknown>
) {
  const headerSession = await resolveHoldedOnboardingSessionFromHeaders(request.headers);
  if (headerSession?.uid) {
    return headerSession;
  }

  const bodyOnboardingToken =
    typeof body.onboardingToken === 'string' ? body.onboardingToken.trim() : '';
  if (bodyOnboardingToken) {
    const bodySession = await resolveHoldedOnboardingSession(bodyOnboardingToken);
    if (bodySession?.uid) {
      return bodySession;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const onboardingSession = await resolveIdentityOnboardingSession(request, body);
  if (!onboardingSession?.uid) {
    return NextResponse.json({ ok: false, error: 'onboarding session required' }, { status: 401 });
  }

  const idToken = typeof body?.idToken === 'string' ? body.idToken.trim() : '';
  if (!idToken) {
    return NextResponse.json({ ok: false, error: 'idToken required' }, { status: 400 });
  }

  const decoded = await verifyIdToken(idToken);
  const email = typeof decoded.email === 'string' ? decoded.email.trim().toLowerCase() : '';
  if (!email) {
    return NextResponse.json({ ok: false, error: 'Google account email missing' }, { status: 400 });
  }
  if (decoded.email_verified !== true) {
    return NextResponse.json(
      { ok: false, error: 'Google account email must be verified' },
      { status: 403 }
    );
  }

  const claims = decoded as Record<string, unknown>;
  const googleFirstName = normalizeMeaningfulPersonName(
    typeof claims.given_name === 'string' ? claims.given_name : null
  );
  const googleLastName = normalizeMeaningfulPersonName(
    typeof claims.family_name === 'string' ? claims.family_name : null
  );
  const googleFullName = normalizeMeaningfulPersonName(
    typeof claims.name === 'string' ? claims.name : null
  );
  const preservedOnboardingName =
    buildFullName({
      firstName: onboardingSession.firstName,
      lastName: onboardingSession.lastName,
    }) ?? normalizeMeaningfulPersonName(onboardingSession.name);
  const name =
    googleFullName ||
    buildFullName({ firstName: googleFirstName, lastName: googleLastName }) ||
    preservedOnboardingName;
  const nameParts = splitFullName(name);
  const verifiedAt = new Date().toISOString();
  const tenantId = onboardingSession.tenantId ?? readTenantIdHint(body);

  await rememberVerifiedHoldedEmailIdentity({
    uid: decoded.uid,
    email,
    authMethod: 'google',
    verifiedAt,
  }).catch((error) => {
    console.error('[onboarding identity google] failed to remember verified email', {
      uid: decoded.uid,
      email,
      message: error instanceof Error ? error.message : String(error),
    });
  });

  const onboardingToken = await mintHoldedOnboardingTokenForSubject({
    uid: decoded.uid,
    email,
    name,
    tenantId,
    tenantBound: onboardingSession.tenantBound,
    authMethod: 'google',
    emailVerified: decoded.email_verified === true,
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    verifiedAt,
  });

  return NextResponse.json({
    ok: true,
    onboardingToken,
    identity: {
      authMethod: 'google',
      email,
      emailVerified: true,
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      name,
      verifiedAt,
    },
  });
}
