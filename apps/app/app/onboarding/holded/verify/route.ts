import { NextRequest, NextResponse } from 'next/server';
import { getAppUrl } from '@verifactu/utils';
import { consumeHoldedEmailVerificationTokenFromCode } from '@/lib/integrations/holdedEmailVerificationLinks';
import {
  mintHoldedOnboardingTokenForSubject,
  verifyHoldedEmailVerificationToken,
} from '@/lib/oauth/mcp';

export const runtime = 'nodejs';

function buildFallbackUrl() {
  return new URL('/onboarding/holded', getAppUrl());
}

function sanitizeReturnUrl(value: string | null | undefined) {
  const fallback = buildFallbackUrl();
  if (!value) return fallback;

  try {
    const parsed = new URL(value, getAppUrl());
    if (parsed.origin !== fallback.origin) return fallback;
    if (!parsed.pathname.startsWith('/onboarding/holded')) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')?.trim() || '';
  const token = (await consumeHoldedEmailVerificationTokenFromCode(code)) || '';
  const payload = token ? await verifyHoldedEmailVerificationToken(token) : null;

  const redirectUrl = sanitizeReturnUrl(payload?.returnUrl ?? null);

  if (!payload?.uid || !payload.email) {
    redirectUrl.searchParams.set('identity_error', 'invalid_verification_link');
    return NextResponse.redirect(redirectUrl);
  }

  const onboardingToken = await mintHoldedOnboardingTokenForSubject({
    uid: payload.uid,
    email: payload.email,
    name: payload.name ?? null,
    tenantId: payload.tenantId ?? null,
    tenantBound: payload.tenantBound === true,
    authMethod: 'email',
    emailVerified: true,
    firstName: payload.firstName ?? null,
    lastName: payload.lastName ?? null,
    verifiedAt: new Date().toISOString(),
  });

  redirectUrl.searchParams.set('onboarding_token', onboardingToken);
  redirectUrl.searchParams.set('identity_verified', '1');
  return NextResponse.redirect(redirectUrl);
}
