'use client';

import { MessageCircleMore } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function IsaakFloatingChatButton() {
  const pathname = usePathname();

  if (pathname?.startsWith('/chat')) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <Link
        href="/chat"
        className="group inline-flex items-center gap-3 rounded-full border border-[#2361d8]/20 bg-[#011c67] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_-20px_rgba(1,28,103,0.85)] transition hover:-translate-y-0.5 hover:bg-[#0a2f96]"
        aria-label="Abrir chat de Isaak"
      >
        <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/12">
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(74,222,128,0.16)]" />
          <MessageCircleMore className="h-5 w-5" />
        </span>
        <span className="flex flex-col leading-tight">
          <span>Hablar con Isaak</span>
          <span className="text-[11px] font-medium text-white/75">Chat activo</span>
        </span>
      </Link>
    </div>
  );
}
