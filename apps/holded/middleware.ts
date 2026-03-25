import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const REDIRECT_TARGETS: Record<string, string> = {
  '/capacidades': '/#beneficios',
  '/planes': '/#acceso-libre',
  '/demo-recording': '/#beneficios',
};

export function middleware(request: NextRequest) {
  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth/');
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard');
  const isOnboardingRoute = request.nextUrl.pathname.startsWith('/onboarding');
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
  const target = REDIRECT_TARGETS[request.nextUrl.pathname];

  if (
    (isDashboardRoute || isOnboardingRoute || isAdminRoute) &&
    !request.cookies.get('__session')?.value
  ) {
    const loginUrl = new URL('/auth/holded', request.url);
    loginUrl.searchParams.set(
      'source',
      isOnboardingRoute
        ? 'holded_onboarding_guard'
        : isAdminRoute
          ? 'holded_admin_guard'
          : 'holded_dashboard_guard'
    );
    loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search || ''}`);
    const response = NextResponse.redirect(loginUrl, 307);
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    return response;
  }

  if (!target) {
    const response = NextResponse.next();
    response.headers.set(
      'Cross-Origin-Opener-Policy',
      isAuthRoute ? 'same-origin-allow-popups' : 'same-origin'
    );
    return response;
  }

  const url = new URL(target, request.url);
  const response = NextResponse.redirect(url, 307);
  response.headers.set(
    'Cross-Origin-Opener-Policy',
    isAuthRoute ? 'same-origin-allow-popups' : 'same-origin'
  );
  return response;
}

export const config = {
  matcher: [
    '/capacidades',
    '/planes',
    '/support',
    '/demo-recording',
    '/admin/:path*',
    '/dashboard/:path*',
    '/onboarding/:path*',
  ],
};
