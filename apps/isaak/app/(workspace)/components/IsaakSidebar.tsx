'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import {
  BarChart3,
  ChevronUp,
  ExternalLink,
  LogOut,
  Loader2,
  MessageSquare,
  Plus,
  Receipt,
  TrendingUp,
  Users,
  Users2,
} from 'lucide-react';

type ConversationItem = {
  id: string;
  title: string | null;
  lastActivity: Date | string;
};

type UserInfo = {
  name: string;
  email: string;
  initials: string;
};

const NAV_SECTIONS = [
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/resumen', label: 'Resumen', icon: BarChart3 },
  { href: '/ventas', label: 'Ventas', icon: TrendingUp },
  { href: '/gastos', label: 'Gastos', icon: Receipt },
  { href: '/contactos', label: 'Contactos', icon: Users },
  { href: '/equipo', label: 'Equipo', icon: Users2 },
];

const SETTINGS_ITEMS = [
  { href: '/settings?section=profile', label: 'Perfil' },
  { href: '/settings?section=connections', label: 'Conexiones' },
  { href: '/settings?section=isaak', label: 'Personalizar Isaak' },
  { href: '/settings?section=billing', label: 'Plan y facturación' },
  { href: '/support', label: 'Ayuda' },
];

function formatRelativeDate(value: Date | string) {
  try {
    const date = typeof value === 'string' ? new Date(value) : value;
    const diff = Date.now() - date.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'hoy';
    if (days === 1) return 'ayer';
    if (days < 7) return `hace ${days} días`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export default function IsaakSidebar({
  user,
  conversations,
}: {
  user: UserInfo;
  conversations: ConversationItem[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/';
    }
  };

  const isActive = (href: string) => {
    if (href === '/chat') return pathname === '/chat' || pathname?.startsWith('/chat/');
    return pathname === href || pathname?.startsWith(href + '/');
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-hidden border-r border-white/5">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl">
          <Image
            src="/Personalidad/isaak-avatar-2.png"
            alt="Isaak"
            fill
            sizes="36px"
            className="object-cover"
            priority
          />
        </div>
        <div>
          <div className="text-[15px] font-bold tracking-tight text-white">Isaak</div>
          <div className="text-[11px] text-slate-500">Tu copiloto de negocio</div>
        </div>
      </div>

      {/* New chat button */}
      <div className="px-3 pb-3">
        <Link
          href="/chat"
          onClick={() => router.refresh()}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#2361d8] text-[13px] font-semibold text-white transition hover:bg-[#1d55c2]"
        >
          <Plus size={15} />
          Nuevo chat
        </Link>
      </div>

      {/* Nav */}
      <nav className="px-2">
        <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
          Secciones
        </div>
        {NAV_SECTIONS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition ${
              isActive(href)
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="my-3 mx-3 border-t border-white/5" />

      {/* Conversation history */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2">
        {conversations.length > 0 && (
          <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
            Recientes
          </div>
        )}
        <div className="space-y-0.5">
          {conversations.slice(0, 20).map((conv) => (
            <Link
              key={conv.id}
              href={`/chat/${conv.id}`}
              className="flex flex-col rounded-lg px-2.5 py-2 transition hover:bg-white/5"
            >
              <span className="truncate text-[13px] text-slate-300">
                {conv.title ?? 'Nueva conversación'}
              </span>
              <span className="text-[11px] text-slate-600">
                {formatRelativeDate(conv.lastActivity)}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-auto">
        {/* Powered by footer */}
        <div className="px-4 pb-2 text-[11px] text-slate-600">
          Powered by{' '}
          <a
            href="https://verifactu.business"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-400 underline underline-offset-2"
          >
            verifactu.business
          </a>
        </div>

        {/* User profile */}
        <div className="relative border-t border-white/5 p-3">
          {settingsOpen && (
            <div
              ref={settingsRef}
              className="absolute bottom-full left-3 right-3 mb-2 overflow-hidden rounded-xl border border-white/10 bg-slate-900 py-1 shadow-2xl"
            >
              {SETTINGS_ITEMS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setSettingsOpen(false)}
                  className="flex items-center justify-between px-3 py-2 text-[13px] text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  {label}
                  <ExternalLink size={12} className="text-slate-600" />
                </Link>
              ))}
              <div className="mx-2 my-1 border-t border-white/5" />
              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={loggingOut}
                className="flex w-full items-center justify-between px-3 py-2 text-[13px] text-rose-400 transition hover:bg-white/5 disabled:opacity-50"
              >
                Cerrar sesión
                {loggingOut ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            className="flex w-full items-center gap-2.5 rounded-lg p-2 transition hover:bg-white/5"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2361d8] text-[12px] font-bold text-white">
              {user.initials}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="truncate text-[13px] font-medium text-slate-200">{user.name}</div>
              <div className="truncate text-[11px] text-slate-500">{user.email}</div>
            </div>
            <ChevronUp
              size={14}
              className={`shrink-0 text-slate-500 transition-transform ${settingsOpen ? '' : 'rotate-180'}`}
            />
          </button>
        </div>
      </div>
    </aside>
  );
}
