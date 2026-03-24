'use client';

import { MessageCircleMore } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ISAAK_SITE_URL = process.env.NEXT_PUBLIC_ISAAK_SITE_URL || 'https://isaak.verifactu.business';

export default function HoldedFloatingIsaakChatButton() {
  const pathname = usePathname();

  if (pathname?.startsWith('/auth/')) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <Link
        href={`${ISAAK_SITE_URL}/chat`}
        className="inline-flex items-center gap-3 rounded-full border border-[#ff5460]/25 bg-[#ff5460] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_-20px_rgba(239,70,84,0.8)] transition hover:-translate-y-0.5 hover:bg-[#ef4654]"
        aria-label="Hablar con Isaak"
      >
        <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_0_4px_rgba(110,231,183,0.2)]" />
          <MessageCircleMore className="h-5 w-5" />
        </span>
        <span className="flex flex-col leading-tight">
          <span>Hablar con Isaak</span>
          <span className="text-[11px] font-medium text-white/80">Chat activo</span>
        </span>
      </Link>
    </div>
  );
}
