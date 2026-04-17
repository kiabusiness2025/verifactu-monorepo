/**
 * OAuth authorize redirect.
 *
 * ChatGPT may discover the authorization_endpoint as holded domain.
 * This route redirects to apps/app where the full authorize logic lives
 * (session, PKCE, onboarding flow, etc.).
 */

import { NextRequest, NextResponse } from 'next/server';
import { APP_PUBLIC_URL } from '@/app/lib/holded-navigation';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const target = new URL('/oauth/authorize', APP_PUBLIC_URL);
  // Forward all query params unchanged
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });
  return NextResponse.redirect(target, { status: 302 });
}
