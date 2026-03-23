'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getLandingUrl } from '@/lib/urls';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const source = searchParams?.get('source')?.trim() || '';
  const next = searchParams?.get('next')?.trim() || '';
  const holdedMode =
    source.startsWith('holded') ||
    next.includes('/onboarding/holded') ||
    next.includes('holded.verifactu.business');

  useEffect(() => {
    const landingUrl = getLandingUrl();
    const loginUrl = new URL('/auth/login', landingUrl);
    if (next) {
      loginUrl.searchParams.set('next', next);
    }
    if (source) {
      loginUrl.searchParams.set('source', source);
    }
    window.location.href = loginUrl.toString();
  }, [next, source]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_40%,#ffffff_100%)] px-6">
      <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {holdedMode ? (
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
            <Image
              src="/brand/holded/holded-diamond-logo.png"
              alt="Isaak para Holded"
              width={52}
              height={52}
              className="h-[52px] w-[52px] object-contain"
              priority
            />
          </div>
        ) : null}
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          {holdedMode ? 'Isaak para Holded' : 'Acceso seguro'}
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-950">Redirigiendo al acceso seguro</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          {holdedMode
            ? 'Estamos preparando tu acceso para conectar Holded con Isaak. Primero iniciarás sesión y después continuarás con la conexión de tu cuenta.'
            : 'Estamos preparando tu acceso seguro. Al terminar el inicio de sesión volverás automáticamente.'}
        </p>
        <p className="mt-3 text-xs text-slate-500">Redirigiendo...</p>
      </div>
    </div>
  );
}
