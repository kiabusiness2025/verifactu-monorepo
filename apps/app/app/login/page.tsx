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
    const loginPath = holdedMode ? '/auth/holded' : '/auth/login';
    const loginUrl = new URL(loginPath, landingUrl);
    if (next) {
      loginUrl.searchParams.set('next', next);
    }
    if (source) {
      loginUrl.searchParams.set('source', source);
    }
    window.location.href = loginUrl.toString();
  }, [next, source]);

  return (
    <div className="min-h-screen bg-white px-4 py-10 text-black sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
        <div className="w-full rounded-[30px] border border-neutral-200 bg-white p-8 text-center shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-10">
          <div className="flex justify-center">
            {holdedMode ? (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                <Image
                  src="/brand/holded/holded-diamond-logo.png"
                  alt="Isaak para Holded"
                  width={52}
                  height={52}
                  className="h-[52px] w-[52px] object-contain"
                  priority
                />
              </div>
            ) : (
              <div className="h-4 w-4 animate-pulse rounded-full bg-neutral-700" />
            )}
          </div>

          <div className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
            {holdedMode ? 'Isaak for Holded' : 'Acceso seguro'}
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-black sm:text-3xl">
            Preparando tu conexión
          </h1>

          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-neutral-600 sm:text-base">
            {holdedMode
              ? 'Estamos conectando tu acceso para que puedas continuar con Holded en el siguiente paso.'
              : 'Estamos validando tu acceso para continuar al panel.'}
          </p>

          <div className="mx-auto mt-8 h-2 w-28 overflow-hidden rounded-full bg-neutral-200">
            <div className="h-full w-1/2 animate-[pulse_1.1s_ease-in-out_infinite] rounded-full bg-neutral-700" />
          </div>

          <p className="mt-4 text-xs text-neutral-500">Redirigiendo...</p>
        </div>
      </div>
    </div>
  );
}
