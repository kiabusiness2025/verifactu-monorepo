'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { buildAuthUrl } from '../lib/holded-navigation';

type Props = {
  children: React.ReactNode;
};

const navLinks = [
  { href: '/#solucion', label: 'Inicio' },
  { href: '/#capacidades', label: 'Capacidades' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/#contacto', label: 'Contacto' },
];

export default function HoldedSiteChrome({ children }: Props) {
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith('/auth/') ?? false;
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center justify-between gap-4 py-4">
            <Link href="/" className="group flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 transition group-hover:shadow-md">
                <Image
                  src="/brand/holded/holded-diamond-logo.png"
                  alt="Holded"
                  width={20}
                  height={20}
                  className="h-5 w-5 object-contain"
                  priority
                />
              </div>
              <div className="leading-tight">
                <div className="text-base font-semibold text-slate-900">Holded</div>
                <div className="text-xs font-medium text-slate-500">
                  Solution Partner autorizado
                </div>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-5 text-sm font-semibold text-slate-600 md:flex">
              {navLinks.map((link) => (
                <a key={link.href} href={link.href} className="transition hover:text-slate-900">
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Link
                href={buildAuthUrl('holded_nav_global')}
                className="inline-flex items-center justify-center rounded-full bg-[#ff5460] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ef4654]"
              >
                Iniciar y conectar
              </Link>

              {/* Hamburger — mobile only */}
              <button
                type="button"
                aria-label={menuOpen ? 'Cerrar menu' : 'Abrir menu'}
                aria-expanded={menuOpen ? 'true' : 'false'}
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 md:hidden"
              >
                {menuOpen ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M4 4l8 8M12 4l-8 8"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M2 4h12M2 8h12M2 12h12"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {menuOpen && (
            <nav className="nav-slide-down border-t border-slate-100 pb-4 pt-3 md:hidden">
              <ul className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
                <li>
                  <Link
                    href={buildAuthUrl('holded_mobile_nav')}
                    onClick={() => setMenuOpen(false)}
                    className="mt-1 flex items-center justify-center rounded-full bg-[#ff5460] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ef4654]"
                  >
                    Iniciar y conectar
                  </Link>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </header>

      {children}

      <footer className="border-t border-slate-200 bg-white/95">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="text-sm text-slate-600">
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
            <div className="text-xs text-slate-400">
              Solution Partner autorizado de Holded · No somos Holded S.L.
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-500 sm:text-sm">
            <Link href="/legal" className="hover:text-slate-900">
              Aviso legal
            </Link>
            <Link href="/privacy" className="hover:text-slate-900">
              Privacidad
            </Link>
            <Link href="/terms" className="hover:text-slate-900">
              Terminos
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
