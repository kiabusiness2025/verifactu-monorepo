import { NextRequest, NextResponse } from 'next/server';

function isHoldedHost(host: string | null) {
  if (!host) return false;
  const normalized = host.toLowerCase();
  return normalized === 'holded.verifactu.business' || normalized.startsWith('holded.');
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const host = request.headers.get('host');

  if (isHoldedHost(host) && pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/holded';
    return NextResponse.rewrite(url);
  }

  // Redirigir /es/* a /*
  if (pathname.startsWith('/es/')) {
    const newPathname = pathname.slice(3);
    return NextResponse.redirect(new URL(newPathname, request.url), { status: 301 });
  }

  // Redirigir /es (sin barra) a /
  if (pathname === '/es') {
    return NextResponse.redirect(new URL('/', request.url), { status: 301 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/es', '/es/:path*'],
};
