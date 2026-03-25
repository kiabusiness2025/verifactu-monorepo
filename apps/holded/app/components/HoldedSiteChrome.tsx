'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { buildAuthUrl, buildDashboardUrl, buildRegisterUrl } from '../lib/holded-navigation';

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
            <a href="#solucion" className="hover:text-slate-900">
              Inicio
            </a>
            <a href="#acceso-libre" className="hover:text-slate-900">
              Acceso
            </a>
            <a href="#beneficios" className="hover:text-slate-900">
              Beneficios
            </a>
            <a href="#faq" className="hover:text-slate-900">
              FAQ
            </a>
            <Link href={buildDashboardUrl('holded_nav_dashboard')} className="hover:text-slate-900">
              Dashboard
            </Link>
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={buildRegisterUrl('holded_nav_register')}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Crear acceso
            </Link>
            <Link
              href={buildAuthUrl('holded_nav_global')}
              className="inline-flex items-center justify-center rounded-full bg-[#ff5460] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ef4654]"
            >
              Iniciar y conectar
            </Link>
          </div>
        </div>
      </header>

      {children}

      <footer className="border-t border-slate-200 bg-white/95">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 text-xs sm:text-sm">
            <div>
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
            <div className="text-[11px] text-slate-500 sm:text-xs">
              Solucion desarrollada por verifactu.business, Solution Partner autorizado de Holded
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs font-semibold sm:text-sm">
            <Link href="/legal" className="hover:text-slate-900">
              Aviso legal
            </Link>
            <Link href="/privacy" className="hover:text-slate-900">
              Privacidad
            </Link>
            <Link href="/terms" className="hover:text-slate-900">
              Terminos
            </Link>
            <Link href="/cookies" className="hover:text-slate-900">
              Cookies
            </Link>
            <Link
              href={buildDashboardUrl('holded_footer_dashboard')}
              className="hover:text-slate-900"
            >
              Dashboard
            </Link>
            <Link href={buildAuthUrl('holded_footer_login')} className="hover:text-slate-900">
              Acceso
            </Link>
            <a href="#acceso-libre" className="hover:text-slate-900">
              Conectar Holded
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
