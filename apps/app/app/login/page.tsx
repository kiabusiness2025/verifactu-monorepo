'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getLandingUrl } from '@/lib/urls';

const HOLDED_SITE_URL =
  process.env.NEXT_PUBLIC_HOLDED_SITE_URL || 'https://holded.verifactu.business';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const source = searchParams?.get('source')?.trim() || '';
  const next = searchParams?.get('next')?.trim() || '';
  const holdedMode =
    source.startsWith('holded') ||
    next.includes('/onboarding/holded') ||
    next.includes('holded.verifactu.business');
  const captureMode = searchParams?.get('capture') === '1' || /(?:\?|&)capture=1(?:&|$)/.test(next);
  const landingUrl = getLandingUrl();
  const loginPath = holdedMode ? '/auth/holded' : '/auth/login';
  const loginBase = holdedMode ? HOLDED_SITE_URL : landingUrl;
  const loginUrl = new URL(loginPath, loginBase);
  if (next) {
    loginUrl.searchParams.set('next', next);
  }
  if (source) {
    loginUrl.searchParams.set('source', source);
  }
  const loginHref = loginUrl.toString();

  useEffect(() => {
    if (captureMode) return;
    window.location.href = loginHref;
  }, [captureMode, loginHref]);

  return (
    <div className="min-h-[100svh] bg-white px-3 py-4 text-black sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto flex min-h-[72svh] max-w-2xl items-center justify-center">
        <div className="w-full rounded-[30px] border border-neutral-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-8 lg:p-10">
          <div className="grid gap-6 md:grid-cols-[176px_minmax(0,1fr)] md:items-center">
            <div className="mx-auto w-full max-w-[176px] rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white ring-1 ring-slate-200">
                {holdedMode ? (
                  <Image
                    src="/brand/holded/holded-diamond-logo.png"
                    alt="Isaak para Holded"
                    width={40}
                    height={40}
                    className="h-10 w-10 object-contain"
                    priority
                  />
                ) : (
                  <div className="h-4 w-4 animate-pulse rounded-full bg-neutral-700" />
                )}
              </div>
              <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                {holdedMode ? 'Conexion Holded' : 'Acceso seguro'}
              </div>
              <div className="mt-2 text-sm font-semibold text-black">Preparando tu acceso</div>
            </div>

            <div className="text-center md:text-left">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                {holdedMode ? 'Isaak for Holded' : 'Acceso seguro'}
              </div>

              <h1 className="mt-4 text-2xl font-bold tracking-tight text-black sm:text-3xl">
                Preparando tu conexión
              </h1>

              <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-neutral-600 sm:text-base md:mx-0">
                {holdedMode
                  ? 'Estamos conectando tu acceso para que puedas continuar con Holded en el siguiente paso.'
                  : 'Estamos validando tu acceso para continuar al panel.'}
              </p>

              <div className="mx-auto mt-6 h-2 w-28 overflow-hidden rounded-full bg-neutral-200 md:mx-0">
                <div className="h-full w-1/2 animate-[pulse_1.1s_ease-in-out_infinite] rounded-full bg-neutral-700" />
              </div>

              {captureMode ? (
                <div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start">
                  <a
                    href={loginHref}
                    className="inline-flex items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
                  >
                    Continuar
                  </a>
                </div>
              ) : (
                <p className="mt-4 text-xs text-neutral-500">Redirigiendo...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
