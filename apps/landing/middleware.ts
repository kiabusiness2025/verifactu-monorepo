import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Redirigir /es/* a /*
  if (pathname.startsWith('/es/')) {
    const newPathname = pathname.slice(3); // Remover '/es'
    return NextResponse.redirect(new URL(newPathname, request.url), { status: 301 });
  }

  // Redirigir /es (sin barra) a /
  if (pathname === '/es') {
    return NextResponse.redirect(new URL('/', request.url), { status: 301 });
  }

  // Redirigir usuario autenticado desde landing (/) a dashboard
  if (pathname === '/') {
    const sessionCookie = request.cookies.get('__session');
    
    if (sessionCookie?.value) {
      // Usuario tiene sesión activa -> redirigir a dashboard
      return NextResponse.redirect(new URL('https://app.verifactu.business/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/es', '/es/:path*', '/'],
};
