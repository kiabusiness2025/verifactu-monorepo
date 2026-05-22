'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Bell,
  Calculator,
  CalendarDays,
  ChevronLeft,
  Cloud,
  Landmark,
  Mail,
  ChevronRight,
  ChevronUp,
  CreditCard,
  ExternalLink,
  FileBarChart2,
  LifeBuoy,
  LogOut,
  Loader2,
  MessageSquare,
  Plus,
  PlugZap,
  Receipt,
  Settings,
  Sparkles,
  TrendingUp,
  UserCircle2,
  Building2,
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

type PlanInfo = {
  name: string;
  code: string;
  status: string;
  daysLeft: number | null;
};

type WhitelabelConfig = {
  enabled?: boolean;
  companyName?: string;
  logoUrl?: string;
  primaryColor?: string;
  faviconUrl?: string;
  supportEmail?: string;
  hidePoweredBy?: boolean;
};

const NAV_SECTIONS = [
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/resumen', label: 'Resumen', icon: BarChart3 },
  { href: '/ventas', label: 'Ventas', icon: TrendingUp },
  { href: '/gastos', label: 'Gastos', icon: Receipt },
  { href: '/informes', label: 'Informes', icon: FileBarChart2 },
  { href: '/contactos', label: 'Contactos', icon: Users },
  { href: '/equipo', label: 'Equipo', icon: Users2 },
  { href: '/calendario', label: 'Calendario Fiscal', icon: CalendarDays },
  { href: '/fiscal', label: 'Alertas Fiscales', icon: Bell },
  { href: '/fiscal/modelos', label: 'Modelos AEAT', icon: Calculator },
  { href: '/sede', label: 'Sede Electrónica', icon: PlugZap },
  { href: '/banking', label: 'Open Banking', icon: Landmark },
  { href: '/mail', label: 'Gmail Facturas', icon: Mail },
  { href: '/microsoft', label: 'Microsoft 365', icon: Cloud },
  { href: '/chift', label: 'ERP (Chift)', icon: PlugZap },
  { href: '/advisor', label: 'Mis clientes', icon: Building2 },
  { href: '/settings', label: 'Ajustes', icon: Settings },
];

const PROFILE_MENU = [
  { href: '/settings?section=profile', label: 'Perfil', icon: UserCircle2 },
  { href: '/settings?section=company', label: 'Empresa', icon: Building2 },
  { href: '/settings?section=isaak', label: 'Personalizar Isaak', icon: Sparkles },
  { href: '/settings?section=billing', label: 'Facturación', icon: CreditCard },
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

function PlanBadge({ plan }: { plan: PlanInfo }) {
  if (plan.status === 'trial') {
    const label = plan.daysLeft !== null ? `Trial · ${plan.daysLeft}d` : 'Trial';
    return (
      <span className="inline-block rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
        {label}
      </span>
    );
  }
  if (plan.status === 'cancelled' || plan.status === 'past_due') {
    return (
      <span className="inline-block rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
        Cancelado
      </span>
    );
  }
  return (
    <span className="inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
      {plan.name}
    </span>
  );
}

const DEFAULT_BRAND = '#2361d8';

export default function IsaakSidebar({
  user,
  conversations,
  planInfo,
  holdedConnected,
  whitelabel,
}: {
  user: UserInfo;
  conversations: ConversationItem[];
  planInfo: PlanInfo;
  holdedConnected: boolean;
  whitelabel?: WhitelabelConfig | null;
}) {
  const brandColor = whitelabel?.enabled
    ? (whitelabel.primaryColor ?? DEFAULT_BRAND)
    : DEFAULT_BRAND;
  const appName = whitelabel?.enabled ? (whitelabel.companyName ?? 'Isaak') : 'Isaak';
  const pathname = usePathname();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('isaak-sidebar-collapsed');
    if (stored === 'true') setCollapsed(true);
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!profileOpen) return;
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [profileOpen]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('isaak-sidebar-collapsed', String(next));
    if (next) setProfileOpen(false);
  };

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
    <aside
      className={`hidden shrink-0 flex-col overflow-hidden border-r border-white/5 bg-gradient-to-b from-[#081936] via-[#0b1a40] to-[#0b2060] transition-all duration-200 md:flex ${
        collapsed ? 'w-14' : 'w-64'
      }`}
    >
      {/* ── Logo ───────────────────────────────────────────── */}
      <div className={`flex items-center gap-3 py-5 ${collapsed ? 'justify-center px-2' : 'px-4'}`}>
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl">
          {whitelabel?.enabled && whitelabel.logoUrl ? (
            <img src={whitelabel.logoUrl} alt={appName} className="h-full w-full object-contain" />
          ) : (
            <Image
              src="/Personalidad/isaak-avatar-2.png"
              alt="Isaak"
              fill
              sizes="36px"
              className="object-cover"
              priority
            />
          )}
        </div>
        {!collapsed && (
          <div>
            <div className="text-[15px] font-bold tracking-tight text-white">{appName}</div>
            {!whitelabel?.enabled && (
              <div className="text-[11px] text-slate-400">Asistente fiscal inteligente</div>
            )}
          </div>
        )}
      </div>

      {/* ── New chat ───────────────────────────────────────── */}
      <div className={`pb-3 ${collapsed ? 'px-2' : 'px-3'}`}>
        <Link
          href="/chat"
          onClick={() => router.refresh()}
          title={collapsed ? 'Nuevo chat' : undefined}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-lg text-[13px] font-semibold text-white transition"
          style={{ backgroundColor: brandColor }}
        >
          <Plus size={15} />
          {!collapsed && 'Nuevo chat'}
        </Link>
      </div>

      {/* ── Navigation ─────────────────────────────────────── */}
      <nav className={collapsed ? 'px-1' : 'px-2'}>
        {!collapsed && (
          <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
            Secciones
          </div>
        )}
        {NAV_SECTIONS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            className={`flex h-9 items-center rounded-lg text-[13px] font-medium transition ${
              collapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5'
            } ${
              isActive(href)
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            <Icon size={16} />
            {!collapsed && label}
          </Link>
        ))}
      </nav>

      {/* ── Separator ──────────────────────────────────────── */}
      <div className={`my-2 border-t border-white/5 ${collapsed ? 'mx-2' : 'mx-3'}`} />

      {/* ── Integraciones ──────────────────────────────────── */}
      <div className={collapsed ? 'px-1' : 'px-2'}>
        {!collapsed && (
          <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
            Plataforma
          </div>
        )}
        <Link
          href="/integrations"
          title={collapsed ? 'Integraciones' : undefined}
          className={`flex h-9 items-center rounded-lg text-[13px] font-medium transition ${
            collapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5'
          } ${
            isActive('/integrations')
              ? 'bg-white/10 text-white'
              : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <PlugZap size={16} />
            {holdedConnected && (
              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
            )}
          </div>
          {!collapsed && (
            <span className="flex flex-1 items-center justify-between">
              Integraciones
              {holdedConnected && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                  <span className="h-1 w-1 rounded-full bg-emerald-400" />
                  Activo
                </span>
              )}
            </span>
          )}
        </Link>
      </div>

      {/* ── Separator ──────────────────────────────────────── */}
      {!collapsed && <div className="mx-3 my-2 border-t border-white/5" />}

      {/* ── Conversation history ───────────────────────────── */}
      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-y-auto px-2">
          <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
            <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Pendientes
            </div>
            <div className="space-y-1">
              <Link
                href="/settings?section=profile"
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[12px] text-slate-300 transition hover:bg-white/5"
              >
                <span>Completar perfil</span>
                <span className="text-[10px] text-amber-300">pendiente</span>
              </Link>
              <Link
                href="/settings?section=company"
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[12px] text-slate-300 transition hover:bg-white/5"
              >
                <span>Completar empresa</span>
                <span className="text-[10px] text-amber-300">pendiente</span>
              </Link>
              <Link
                href="/integrations"
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[12px] text-slate-300 transition hover:bg-white/5"
              >
                <span>Integrar herramientas</span>
                <span
                  className={`text-[10px] font-semibold ${holdedConnected ? 'text-emerald-300' : 'text-amber-300'}`}
                >
                  {holdedConnected ? 'activo' : 'pendiente'}
                </span>
              </Link>
            </div>
          </div>

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
      )}

      {collapsed && <div className="flex-1" />}

      {/* ── Support link ───────────────────────────────────── */}
      <div className={`${collapsed ? 'px-1 pb-1' : 'px-2 pb-1'}`}>
        <Link
          href="/support"
          title="Ayuda y soporte"
          className={`flex h-8 items-center rounded-lg text-[12px] text-slate-600 transition hover:bg-white/5 hover:text-slate-400 ${
            collapsed ? 'justify-center' : 'gap-2 px-2.5'
          }`}
        >
          <LifeBuoy size={14} />
          {!collapsed && 'Ayuda y soporte'}
        </Link>
      </div>

      {/* ── Collapse toggle ────────────────────────────────── */}
      <div className={`${collapsed ? 'px-2' : 'px-3'} pb-1`}>
        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? 'Expandir menú' : 'Plegar menú'}
          className="flex h-7 w-full items-center justify-center rounded-lg text-slate-700 transition hover:bg-white/5 hover:text-slate-500"
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* ── Profile / Plan area ────────────────────────────── */}
      <div
        className={`relative border-t border-white/5 p-2 ${collapsed ? 'px-1.5' : ''}`}
        ref={profileRef}
      >
        {/* Dropdown */}
        {profileOpen && !collapsed && (
          <div className="absolute bottom-full left-2 right-2 mb-2 overflow-hidden rounded-2xl border border-white/10 bg-[#0d1e4a] shadow-2xl">
            {/* User header */}
            <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
                style={{ backgroundColor: brandColor }}
              >
                {user.initials}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-white">{user.name}</div>
                <div className="truncate text-[11px] text-slate-400">{user.email}</div>
              </div>
            </div>

            {/* Plan badge */}
            <div className="border-b border-white/5 px-4 py-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Plan actual</span>
                <PlanBadge plan={planInfo} />
              </div>
              <Link
                href="/settings?section=billing"
                onClick={() => setProfileOpen(false)}
                className="mt-1 text-[11px] font-medium text-[#2361d8]/80 transition hover:text-[#2361d8]"
              >
                Ver planes y facturación →
              </Link>
            </div>

            {/* Settings links */}
            <div className="py-1">
              {PROFILE_MENU.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  <Icon size={14} className="shrink-0 text-slate-500" />
                  {label}
                </Link>
              ))}
            </div>

            {/* Divider + logout */}
            <div className="border-t border-white/5 py-1">
              <Link
                href="/support"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                <LifeBuoy size={14} className="shrink-0 text-slate-500" />
                Ayuda y soporte
                <ExternalLink size={11} className="ml-auto text-slate-600" />
              </Link>
              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={loggingOut}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] text-rose-400 transition hover:bg-white/5 disabled:opacity-50"
              >
                {loggingOut ? (
                  <Loader2 size={14} className="shrink-0 animate-spin" />
                ) : (
                  <LogOut size={14} className="shrink-0" />
                )}
                Cerrar sesión
              </button>
            </div>
          </div>
        )}

        {/* Profile trigger */}
        <button
          type="button"
          onClick={() => {
            if (!collapsed) setProfileOpen((v) => !v);
          }}
          title={collapsed ? `${user.name} · Cuenta` : undefined}
          className={`flex w-full items-center rounded-xl p-2 transition hover:bg-white/5 ${
            collapsed ? 'justify-center' : 'gap-2.5'
          }`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2361d8] text-[12px] font-bold text-white">
            {user.initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 text-left">
              <div className="truncate text-[13px] font-medium text-slate-200">{user.name}</div>
              <PlanBadge plan={planInfo} />
            </div>
          )}
          {!collapsed && (
            <ChevronUp
              size={13}
              className={`shrink-0 text-slate-600 transition-transform ${profileOpen ? '' : 'rotate-180'}`}
            />
          )}
        </button>
      </div>
    </aside>
  );
}
