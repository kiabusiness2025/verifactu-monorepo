'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { buildAuthUrl, HOLDED_PUBLIC_URL } from '../lib/holded-navigation';
import { IsaakWidget } from './IsaakWidget';

type Props = {
  children: React.ReactNode;
};

type ConnectorCtx = 'claude' | 'chatgpt' | null;

/**
 * Detects which connector page is active based on the current pathname.
 * Returns 'claude' for /conectores/claude/*, 'chatgpt' for /conectores/chatgpt/*,
 * or null for the generic hub /conectores or any other path.
 */
function detectConnectorContext(pathname: string | null): ConnectorCtx {
  if (!pathname) return null;
  if (pathname.startsWith('/conectores/claude')) return 'claude';
  if (pathname.startsWith('/conectores/chatgpt')) return 'chatgpt';
  return null;
}

/**
 * Builds nav and footer links scoped to the active connector when one is active,
 * falling back to generic /conectores/* selector pages otherwise.
 *
 * Bug fixed: the previous static navLinks hardcoded /conectores/{docs,privacy,dpa,soporte}
 * (generic selectors that list ChatGPT first), so on /conectores/claude users
 * were funneled toward ChatGPT instead of staying within the Claude flow.
 */
function buildConnectorLinks(ctx: ConnectorCtx) {
  const base = ctx ? `/conectores/${ctx}` : '/conectores';
  return {
    docs: ctx ? `${base}/docs` : '/conectores/docs',
    privacy: ctx ? `${base}/privacy` : '/conectores/privacy',
    dpa: ctx ? `${base}/dpa` : '/conectores/dpa',
    soporte: ctx ? `${base}/soporte` : '/conectores/soporte',
  };
}

export default function HoldedSiteChrome({ children }: Props) {
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith('/auth/') ?? false;
  const isIsaakApp = false;
  const isStandaloneSupportChat = pathname?.startsWith('/support/chat') ?? false;
  const [menuOpen, setMenuOpen] = useState(false);

  const connectorCtx = detectConnectorContext(pathname);
  const links = buildConnectorLinks(connectorCtx);

  // Nav: keep Hub + both connectors visible always, then context-aware secondary links.
  const navLinks = [
    { href: '/conectores', label: 'Conectores', dotClass: '' },
    { href: '/conectores/claude', label: 'Claude', dotClass: 'bg-[#D4570C]' },
    { href: '/conectores/chatgpt', label: 'ChatGPT', dotClass: 'bg-[#10a37f]' },
    { href: links.docs, label: 'Docs', dotClass: '' },
    { href: links.privacy, label: 'Privacidad', dotClass: '' },
    { href: links.dpa, label: 'DPA', dotClass: '' },
    { href: links.soporte, label: 'Soporte', dotClass: '' },
  ];
  const hubReturnUrl = `${HOLDED_PUBLIC_URL}/conectores`;

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (isAuthRoute || isIsaakApp || isStandaloneSupportChat) {
    return <>{children}</>;
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center justify-between gap-4 py-4">
            <Link href="/conectores" className="group flex items-center gap-3">
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
                <div className="text-xs font-medium text-slate-500">Hub vertical de conectores</div>
              </div>
            </Link>

            <nav className="hidden items-center gap-4 text-xs font-semibold text-slate-600 lg:flex xl:text-sm">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center gap-1.5 transition hover:text-slate-900"
                >
                  {link.dotClass && (
                    <span className={`h-1.5 w-1.5 rounded-full ${link.dotClass}`} />
                  )}
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
                href={buildAuthUrl('holded_nav_global', hubReturnUrl)}
                className="inline-flex items-center justify-center rounded-full bg-[#ff5460] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ef4654]"
              >
                Acceder
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
                      {link.dotClass && (
                        <span className={`h-1.5 w-1.5 rounded-full ${link.dotClass}`} />
                      )}
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href={buildAuthUrl('holded_mobile_nav', hubReturnUrl)}
                    onClick={() => setMenuOpen(false)}
                    className="mt-1 flex items-center justify-center rounded-full bg-[#ff5460] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ef4654]"
                  >
                    Acceder
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
                Integracion independiente sobre API de Holded. No somos Holded. Este dominio agrupa
                documentacion, privacidad, DPA y soporte de conectores publicados por Verifactu
                Business.
              </div>
              <div className="pt-1">
                <Link
                  href="/conectores"
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  ↗ hub de conectores Holded
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-4 text-xs">
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Conectores
                </div>
                <div className="flex flex-col gap-1.5 font-semibold text-slate-500">
                  <Link href="/conectores" className="hover:text-slate-900">
                    Hub de conectores
                  </Link>
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
                  <Link href={links.docs} className="hover:text-slate-900">
                    Documentacion
                  </Link>
                  <Link href={links.soporte} className="hover:text-slate-900">
                    Soporte
                  </Link>
                  <Link href="/contacto" className="hover:text-slate-900">
                    Contacto
                  </Link>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Legal
                </div>
                <div className="flex flex-col gap-1.5 font-semibold text-slate-500">
                  <Link href={links.privacy} className="hover:text-slate-900">
                    Privacidad
                  </Link>
                  <Link href={links.dpa} className="hover:text-slate-900">
                    DPA
                  </Link>
                  <Link href="/legal" className="hover:text-slate-900">
                    Aviso legal
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <IsaakWidget
        page={
          connectorCtx === 'claude'
            ? 'claude'
            : connectorCtx === 'chatgpt'
              ? 'chatgpt'
              : pathname === '/conectores' || pathname?.startsWith('/conectores')
                ? 'holded_hub'
                : 'generic'
        }
      />
    </>
  );
}
