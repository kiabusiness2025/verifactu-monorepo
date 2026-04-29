'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  ChevronRight,
  CreditCard,
  FileText,
  GripVertical,
  Layers,
  LogOut,
  MessageSquare,
  PenSquare,
  Settings,
  Sliders,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';

type Conversation = {
  id: string;
  title: string | null;
  lastActivity: Date;
  messageCount: number;
};

type Props = {
  user: { name: string; email: string; initials: string };
  conversations: Conversation[];
};

const NAV_SECTIONS = [
  {
    href: '/isaak/resumen',
    label: 'Resumen',
    icon: BarChart3,
    description: 'Estado de tu empresa',
  },
  { href: '/isaak/ventas', label: 'Ventas', icon: TrendingUp, description: 'Facturación y cobros' },
  { href: '/isaak/gastos', label: 'Gastos', icon: TrendingDown, description: 'Compras y pagos' },
  {
    href: '/isaak/contactos',
    label: 'Contactos',
    icon: Users,
    description: 'Clientes y proveedores',
  },
  { href: '/isaak/equipo', label: 'Equipo', icon: Layers, description: 'Empleados y proyectos' },
];

const SETTINGS_ITEMS = [
  { href: '/isaak/configuracion', label: 'Configuración', icon: Settings },
  { href: '/isaak/conectores', label: 'Conectores', icon: Zap },
  { href: '/isaak/integraciones', label: 'Integraciones', icon: GripVertical },
  { href: '/isaak/suscripcion', label: 'Facturación / Plan', icon: CreditCard },
  { href: '/isaak/personalizar', label: 'Personalizar Isaak', icon: Sliders },
];

function timeLabel(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  return new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export default function IsaakSidebar({ user, conversations }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function isActive(href: string) {
    return pathname === href || pathname?.startsWith(href + '/');
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    router.push('/');
  }

  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col border-r border-white/8 bg-slate-950 text-slate-200">
      {/* ── Brand + new chat ─────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <Link href="/isaak/chat" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 shadow-sm group-hover:bg-violet-500 transition-colors">
            <MessageSquare size={16} className="text-white" />
          </div>
          <span className="text-[15px] font-semibold text-white">Isaak</span>
        </Link>
        <Link
          href="/isaak/chat"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/8 hover:text-white transition-colors"
          title="Nuevo chat"
        >
          <PenSquare size={16} />
        </Link>
      </div>

      {/* ── Navigation sections ───────────────────── */}
      <nav className="mt-1 px-2">
        {NAV_SECTIONS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive(href)
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:bg-white/6 hover:text-slate-200'
            }`}
          >
            <Icon
              size={16}
              className={
                isActive(href) ? 'text-violet-400' : 'text-slate-500 group-hover:text-slate-400'
              }
            />
            {label}
            {isActive(href) && <ChevronRight size={14} className="ml-auto text-slate-500" />}
          </Link>
        ))}
      </nav>

      {/* ── Recent conversations ──────────────────── */}
      {conversations.length > 0 && (
        <div className="mt-4 flex-1 overflow-y-auto px-2">
          <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
            Recientes
          </p>
          <div className="space-y-0.5">
            {conversations.map((conv) => {
              const convPath = `/isaak/chat/${conv.id}`;
              const active = pathname === convPath;
              return (
                <Link
                  key={conv.id}
                  href={convPath}
                  className={`flex min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-slate-500 hover:bg-white/6 hover:text-slate-300'
                  }`}
                >
                  <FileText size={13} className="flex-shrink-0 text-slate-600" />
                  <span className="flex-1 truncate text-[13px]">
                    {conv.title || 'Conversación'}
                  </span>
                  <span className="flex-shrink-0 text-[11px] text-slate-700">
                    {timeLabel(conv.lastActivity)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Spacer if no conversations */}
      {conversations.length === 0 && <div className="flex-1" />}

      {/* ── Quick-access chat link ────────────────── */}
      <div className="px-2 pb-2">
        <Link
          href="/isaak/chat"
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            pathname === '/isaak/chat'
              ? 'bg-white/10 text-white'
              : 'text-slate-400 hover:bg-white/6 hover:text-slate-200'
          }`}
        >
          <Wallet size={16} className="text-slate-500" />
          Nuevo análisis
        </Link>
      </div>

      {/* ── User profile / settings ───────────────── */}
      <div className="border-t border-white/8 p-3 relative" ref={settingsRef}>
        <button
          onClick={() => setSettingsOpen((o) => !o)}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/6 transition-colors"
        >
          {/* Avatar */}
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-violet-700 text-xs font-bold text-white">
            {user.initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-slate-200">{user.name}</p>
            <p className="truncate text-[11px] text-slate-500">{user.email}</p>
          </div>
          <ChevronRight
            size={14}
            className={`flex-shrink-0 text-slate-600 transition-transform ${settingsOpen ? 'rotate-90' : ''}`}
          />
        </button>

        {/* Settings dropdown (opens upward) */}
        {settingsOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 rounded-xl border border-white/10 bg-slate-900 py-1.5 shadow-xl">
            {SETTINGS_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setSettingsOpen(false)}
                className="flex items-center gap-3 px-3 py-2 text-[13px] text-slate-300 hover:bg-white/6 hover:text-white transition-colors"
              >
                <Icon size={14} className="text-slate-500" />
                {label}
              </Link>
            ))}
            <div className="my-1.5 border-t border-white/8" />
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-3 py-2 text-[13px] text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
            >
              <LogOut size={14} />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
