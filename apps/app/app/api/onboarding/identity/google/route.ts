import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-admin';
import { resolveHoldedOnboardingSessionFromHeaders } from '@/lib/integrations/holdedOnboardingSession';
import { getPreferredFullName, splitFullName } from '@/lib/personName';
import { mintHoldedOnboardingTokenForSubject } from '@/lib/oauth/mcp';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const onboardingSession = await resolveHoldedOnboardingSessionFromHeaders(request.headers);
  if (!onboardingSession?.uid) {
    return NextResponse.json({ ok: false, error: 'onboarding session required' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const idToken = typeof body?.idToken === 'string' ? body.idToken.trim() : '';
  if (!idToken) {
    return NextResponse.json({ ok: false, error: 'idToken required' }, { status: 400 });
  }

  const decoded = await verifyIdToken(idToken);
  const email = typeof decoded.email === 'string' ? decoded.email.trim().toLowerCase() : '';
  if (!email) {
    return NextResponse.json({ ok: false, error: 'Google account email missing' }, { status: 400 });
  }

  const rawName = typeof decoded.name === 'string' ? decoded.name : onboardingSession.name;
  const name = getPreferredFullName({
    fullName: rawName,
    email,
    fallback: onboardingSession.name || 'Connector user',
  });
  const nameParts = splitFullName(name);
  const verifiedAt = decoded.email_verified ? new Date().toISOString() : null;

  const onboardingToken = await mintHoldedOnboardingTokenForSubject({
    uid: decoded.uid,
    email,
    name,
    tenantId: onboardingSession.tenantId,
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
      emailVerified: decoded.email_verified === true,
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      name,
      verifiedAt,
    },
  });
}
