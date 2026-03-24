'use client';

import Link from 'next/link';
import { Bot, Sparkles } from 'lucide-react';
import { APP_URL, CONTACT_URL, HOLDed_URL } from '../lib/isaak-navigation';

type Props = {
  children: React.ReactNode;
};

export default function IsaakSiteChrome({ children }: Props) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2361d8_0%,#011c67_100%)] text-white shadow-sm transition group-hover:shadow-md">
              <Bot className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-base font-semibold text-[#011c67]">Isaak</div>
              <div className="text-xs font-medium text-slate-600">Asistente fiscal inteligente</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-semibold text-slate-600 md:flex">
            <Link href="/" className="hover:text-slate-900">
              Qué es Isaak
            </Link>
            <a href={HOLDed_URL} className="hover:text-slate-900">
              Compatibilidad Holded
            </a>
            <a href={CONTACT_URL} className="hover:text-slate-900">
              Contacto
            </a>
          </nav>

          <a
            href={APP_URL}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f55c0]"
          >
            <Sparkles className="h-4 w-4" />
            Activar Isaak
          </a>
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
              className="font-semibold text-slate-800 hover:text-[#2361d8]"
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
            <Link href="/support" className="hover:text-slate-900">
              Soporte
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
