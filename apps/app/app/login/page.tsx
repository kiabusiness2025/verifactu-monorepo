'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getLandingUrl } from '@/lib/urls';

export default function LoginPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const landingUrl = getLandingUrl();
    const next = searchParams.get('next')?.trim();
    const loginUrl = new URL('/auth/login', landingUrl);
    if (next) {
      loginUrl.searchParams.set('next', next);
    }
    window.location.href = loginUrl.toString();
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_40%,#ffffff_100%)] px-6">
      <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Isaak for Holded</div>
        <h1 className="mt-4 text-2xl font-bold text-slate-950">Redirigiendo al acceso seguro</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Estamos preparando tu acceso para conectar Holded con Isaak. Te llevamos al login central de Verifactu y,
          al terminar, volverás automáticamente al flujo de autorización.
        </p>
      </div>
    </div>
  );
}
