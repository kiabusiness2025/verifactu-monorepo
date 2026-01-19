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
  // Nota: Se desactiva el redireccionamiento automático al dashboard
  // para permitir que la landing funcione incluso si la app no está disponible.
  // Antes: si había cookie de sesión en '/', redirigía a app.verifactu.business/dashboard.
  // Ahora: no se realiza redirección en '/'.

  return NextResponse.next();
}

export const config = {
  matcher: ['/es', '/es/:path*', '/'],
};
