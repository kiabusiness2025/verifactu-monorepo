'use client';

import { Menu, Sparkles, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { CONTACT_URL } from '../lib/isaak-navigation';

type Props = {
  children: React.ReactNode;
};

const NAV_LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/#demo', label: 'Demo' },
  { href: '/conectores', label: 'Conectores' },
  { href: '/asesorias', label: 'Asesorías' },
  { href: '/pricing', label: 'Precios' },
];

export default function IsaakSiteChrome({ children }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isWorkspaceRoute =
    pathname?.startsWith('/chat') ||
    pathname?.startsWith('/resumen') ||
    pathname?.startsWith('/ventas') ||
    pathname?.startsWith('/gastos') ||
    pathname?.startsWith('/contactos') ||
    pathname?.startsWith('/equipo') ||
    pathname?.startsWith('/auth');

  if (isWorkspaceRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-3">
            <div className="relative h-9 w-9 overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm transition group-hover:shadow-md sm:h-11 sm:w-11">
              <Image
                src="/Personalidad/isaak-avatar-verifactu.png"
                alt="Isaak"
                fill
                sizes="44px"
                className="object-cover"
                priority
              />
            </div>
            <div className="leading-tight">
              <div className="text-base font-semibold text-[#011c67]">Isaak</div>
              <div className="hidden text-xs font-medium text-slate-600 sm:block">
                Orquestador empresarial
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-5 text-sm font-semibold text-slate-600 md:flex">
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className="hover:text-slate-900">
                {label}
              </Link>
            ))}
            <a href={CONTACT_URL} className="hover:text-slate-900">
              Solicitar acceso
            </a>
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden items-center gap-2 md:flex">
            <Link
              href="/support"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Solicitar acceso
            </Link>
            <Link
              href="/chat"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f55c0]"
            >
              <Sparkles className="h-4 w-4" />
              Abrir Isaak
            </Link>
          </div>

          {/* Mobile: CTA + hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <Link
              href="/chat"
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#2361d8] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f55c0]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Abrir
            </Link>
            <button
              type="button"
              aria-label="Abrir menú"
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-3 md:hidden">
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {label}
                </Link>
              ))}
              <a
                href={CONTACT_URL}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Solicitar acceso
              </a>
              <div className="mt-2 border-t border-slate-100 pt-2">
                <Link
                  href="/support"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50"
                >
                  Soporte
                </Link>
              </div>
            </nav>
          </div>
        )}
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
              className="font-semibold text-[#011c67] hover:text-[#2361d8]"
            >
              verifactu.business
            </a>
          </div>

          <div className="flex flex-wrap gap-4 text-xs font-semibold sm:text-sm">
            <Link href="/" className="hover:text-slate-900">
              Inicio
            </Link>
            <Link href="/#demo" className="hover:text-slate-900">
              Demo
            </Link>
            <Link href="/conectores" className="hover:text-slate-900">
              Conectores
            </Link>
            <Link href="/asesorias" className="hover:text-slate-900">
              Asesorías
            </Link>
            <Link href="/pricing" className="hover:text-slate-900">
              Precios
            </Link>
            <Link href="/fiscal" className="hover:text-slate-900">
              Alertas fiscales
            </Link>
            <Link href="/privacy" className="hover:text-slate-900">
              Privacidad
            </Link>
            <Link href="/terms" className="hover:text-slate-900">
              Términos
            </Link>
            <Link href="/support" className="hover:text-slate-900">
              Soporte
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
