'use client';

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

  if (!captureMode) {
    return null;
  }

  return (
    <div className="flex min-h-[100svh] items-center justify-center bg-white px-4 py-6">
      <div className="w-full max-w-sm rounded-[28px] border border-neutral-200 bg-white p-6 text-center shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
        <a
          href={loginHref}
          className="inline-flex items-center justify-center rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          Continuar
        </a>
        <p className="mt-3 text-xs text-neutral-500">
          {holdedMode ? 'Continuar con Holded' : 'Continuar'}
        </p>
      </div>
    </div>
  );
}
