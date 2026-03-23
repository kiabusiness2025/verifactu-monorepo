import { SESSION_COOKIE_NAME, buildSessionCookieOptions } from '@verifactu/utils';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // Prevent static optimization for routes using cookies

/**
 * API Route: /api/dashboard-redirect
 *
 * Purpose: Ensures session cookie is properly set with correct domain
 * before redirecting to client.verifactu.business
 *
 * Query params:
 * - target: Optional path within app to redirect to (default: /workspace)
 *
 * This solves the cross-subdomain cookie issue by:
 * 1. Reading the existing session cookie
 * 2. Re-setting it with explicit domain configuration
 * 3. Redirecting to app dashboard or specified target
 */
export async function GET(req: Request) {
  try {
    console.log('[🔄 Dashboard Redirect] START');

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) {
      console.log('[🔄 Dashboard Redirect] No session cookie found - redirecting to login');
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }

    console.log('[🔄 Dashboard Redirect] Session cookie found, re-setting with proper domain');

    // Get allowed base URLs and target path
    const url = new URL(req.url);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.verifactu.business';
    const clientUrl = process.env.NEXT_PUBLIC_CLIENT_URL || 'https://client.verifactu.business';
    const rawTarget = url.searchParams.get('target') || '/workspace';

    const appOrigin = new URL(appUrl).origin;
    const clientOrigin = new URL(clientUrl).origin;
    let dashboardUrl = `${appUrl}/workspace`;

    // Safe redirect policy:
    // 1) Relative targets are resolved against app origin.
    // 2) Absolute targets are accepted only for app/client origins.
    if (rawTarget.startsWith('/') && !rawTarget.startsWith('//') && !rawTarget.includes('://')) {
      dashboardUrl = `${appUrl}${rawTarget}`;
    } else {
      try {
        const parsedTarget = new URL(rawTarget);
        if (parsedTarget.origin === appOrigin || parsedTarget.origin === clientOrigin) {
          dashboardUrl = parsedTarget.toString();
        }
      } catch {
        dashboardUrl = `${appUrl}/workspace`;
      }
    }

    console.log('[🔄 Dashboard Redirect] Target URL:', dashboardUrl);

    // Create response with redirect
    const response = NextResponse.redirect(dashboardUrl);

    // Re-set the cookie with explicit domain configuration
    const host = req.headers.get('host');

    const cookieOpts = buildSessionCookieOptions({
      url: url.toString(),
      host,
      domainEnv: process.env.SESSION_COOKIE_DOMAIN || '.verifactu.business',
      secureEnv: process.env.SESSION_COOKIE_SECURE || 'true',
      sameSiteEnv: process.env.SESSION_COOKIE_SAMESITE || 'none',
      value: sessionCookie.value,
      maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
    });

    response.cookies.set(cookieOpts);

    console.log('[🔄 Dashboard Redirect] Cookie re-set, redirecting to:', dashboardUrl);
    console.log('[🔄 Dashboard Redirect] Cookie config:', {
      domain: cookieOpts.domain,
      sameSite: cookieOpts.sameSite,
      secure: cookieOpts.secure,
    });

    return response;
  } catch (error) {
    console.error('[🔄 Dashboard Redirect] Error:', error);
    // Fallback: redirect to login on error
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }
}
