'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { buildOnboardingUrl } from '../lib/holded-navigation';

const ISAAK_SITE_URL = process.env.NEXT_PUBLIC_ISAAK_SITE_URL || 'https://isaak.verifactu.business';

type Props = {
  children: React.ReactNode;
};

export default function HoldedSiteChrome({ children }: Props) {
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith('/auth/') ?? false;

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 transition group-hover:shadow-md">
              <Image
                src="/brand/holded/holded-diamond-logo.png"
                alt="Isaak para Holded"
                width={20}
                height={20}
                className="h-5 w-5 object-contain"
                priority
              />
            </div>
            <div className="leading-tight">
              <div className="text-base font-semibold text-slate-900">Isaak para Holded</div>
              <div className="text-xs font-medium text-slate-600">Compatibilidad oficial</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-semibold text-slate-600 md:flex">
            <Link href="/" className="hover:text-slate-900">
              Inicio
            </Link>
            <Link href="/capacidades" className="hover:text-slate-900">
              Capacidades
            </Link>
            <a href={ISAAK_SITE_URL} className="hover:text-slate-900">
              Qué es Isaak
            </a>
            <Link href="/planes" className="hover:text-slate-900">
              Planes
            </Link>
            <Link href="/support" className="hover:text-slate-900">
              Soporte
            </Link>
            <Link href="/demo-recording" className="hover:text-slate-900">
              Demo
            </Link>
          </nav>

          <Link
            href={buildOnboardingUrl('holded_nav_global')}
            className="inline-flex items-center justify-center rounded-full bg-[#ff5460] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ef4654]"
          >
            Iniciar y conectar
          </Link>
        </div>
      </header>

      {children}

      <footer className="border-t border-slate-200 bg-white/95">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs sm:text-sm">
            Powered by{' '}
            <a
              href="https://verifactu.business"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-slate-800 hover:text-[#ff5460]"
            >
              verifactu.business
            </a>
          </div>

          <div className="flex flex-wrap gap-4 text-xs font-semibold sm:text-sm">
            <Link href="/privacy" className="hover:text-slate-900">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-slate-900">
              Terms
            </Link>
            <Link href="/capacidades" className="hover:text-slate-900">
              Capacidades
            </Link>
            <Link href="/support" className="hover:text-slate-900">
              Soporte
            </Link>
            <a href={ISAAK_SITE_URL} className="hover:text-slate-900">
              Isaak
            </a>
            <Link href="/planes" className="hover:text-slate-900">
              Planes
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
