'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { buildAuthUrl } from '../lib/holded-navigation';
import { IsaakWidget } from './IsaakWidget';

type Props = {
  children: React.ReactNode;
};

const navLinks = [
  { href: '/#solucion', label: 'Solución' },
  { href: '/#capacidades', label: 'Capacidades' },
  { href: '/conectores/claude', label: 'Claude' },
  { href: '/conectores/chatgpt', label: 'ChatGPT' },
  { href: '/contacto', label: 'Contacto' },
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
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center justify-between gap-4 py-4">
            <Link href="/" className="group flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 transition group-hover:shadow-md">
                <Image
                  src="/brand/holded/holded-diamond-logo.png"
                  alt="Holded"
                  width={22}
                  height={22}
                  className="h-[22px] w-[22px] object-contain"
                  priority
                />
              </div>
              <div className="leading-tight">
                <div className="text-base font-semibold text-slate-900">Holded</div>
                <div className="text-xs font-medium text-slate-500">
                  Conector conversacional para negocio real
                </div>
              </div>
            </Link>

            <nav className="hidden items-center gap-5 text-sm font-semibold text-slate-600 lg:flex">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className="transition hover:text-slate-900">
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Link
                href="/demo"
                className="hidden items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 md:inline-flex"
              >
                Solicitar demo
              </Link>

              <Link
                href={buildAuthUrl('holded_nav_global')}
                className="inline-flex items-center justify-center rounded-full bg-[#ff5460] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ef4654]"
              >
                Iniciar y conectar
              </Link>

              <button
                type="button"
                aria-label={menuOpen ? 'Cerrar menu' : 'Abrir menu'}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((value) => !value)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 lg:hidden"
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

          {menuOpen ? (
            <nav className="nav-slide-down border-t border-slate-100 pb-4 pt-3 lg:hidden">
              <ul className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                    >
                      {link.label}
                    </Link>
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
          ) : null}
        </div>
      </header>

      {children}

      <footer className="border-t border-slate-200 bg-white/92">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
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
              <div className="max-w-xl text-xs leading-5 text-slate-400">
                Solution Partner autorizado de Holded. No somos Holded. Esta experiencia usa la API
                de Holded para ofrecer una capa de lectura y operativa más clara.
              </div>
              <div className="pt-1">
                <a
                  href="https://verifactu.business"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  ↗ Hub principal — verifactu.business
                </a>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-4 text-xs">
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Conectores
                </div>
                <div className="flex flex-col gap-1.5 font-semibold text-slate-500">
                  <Link href="/conectores/claude" className="hover:text-slate-900">
                    Conector Claude
                  </Link>
                  <Link href="/conectores/chatgpt" className="hover:text-slate-900">
                    Conector ChatGPT
                  </Link>
                  <Link href="/conectores/claude/docs" className="hover:text-slate-900">
                    Docs Claude
                  </Link>
                  <Link href="/conectores/chatgpt/docs" className="hover:text-slate-900">
                    Docs ChatGPT
                  </Link>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Soporte
                </div>
                <div className="flex flex-col gap-1.5 font-semibold text-slate-500">
                  <Link href="/demo" className="hover:text-slate-900">
                    Demo gratuita
                  </Link>
                  <Link href="/contacto" className="hover:text-slate-900">
                    Contacto
                  </Link>
                  <Link href="/capacidades" className="hover:text-slate-900">
                    Capacidades
                  </Link>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Legal
                </div>
                <div className="flex flex-col gap-1.5 font-semibold text-slate-500">
                  <Link href="/dpa" className="hover:text-slate-900">
                    DPA
                  </Link>
                  <Link href="/legal" className="hover:text-slate-900">
                    Aviso legal
                  </Link>
                  <Link href="/privacy" className="hover:text-slate-900">
                    Privacidad
                  </Link>
                  <Link href="/terms" className="hover:text-slate-900">
                    Términos
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <IsaakWidget page="generic" />
    </>
  );
}
