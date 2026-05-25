'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Briefcase,
  BarChart3,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CreditCard,
  ExternalLink,
  FileBarChart2,
  Landmark,
  LifeBuoy,
  LogOut,
  Loader2,
  Mail,
  MessageSquare,
  MessageCircle,
  Monitor,
  Plug,
  Plus,
  Receipt,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  IdCard,
  TrendingUp,
  UserCircle2,
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

// ── Navigation groups (sidebar) ────────────────────────────────────────────
const NAV_GROUPS = [
  {
    items: [
      { href: '/chat', label: 'Chat', icon: MessageSquare },
      { href: '/resumen', label: 'Resumen', icon: BarChart3 },
    ],
  },
  {
    label: 'Contabilidad',
    items: [
      { href: '/ventas', label: 'Ventas', icon: TrendingUp },
      { href: '/gastos', label: 'Gastos', icon: Receipt },
      { href: '/informes', label: 'Informes', icon: FileBarChart2 },
      { href: '/auditoria', label: 'Auditoría', icon: ShieldAlert },
      { href: '/sede', label: 'Buzón AEAT', icon: Mail, badgeKind: 'aeat-pending' as const },
      { href: '/banking', label: 'Banking', icon: Landmark },
    ],
  },
  {
    label: 'Empresa',
    items: [
      { href: '/contactos', label: 'Contactos', icon: Users },
      { href: '/perfil-fiscal', label: 'Perfil fiscal', icon: IdCard },
      { href: '/equipo', label: 'Equipo', icon: Users2 },
      { href: '/whatsapp', label: 'WhatsApp', icon: MessageCircle },
      { href: '/fiscal', label: 'Fiscal', icon: ShieldCheck },
    ],
  },
] as const;

// ── Profile popover — Configuración ───────────────────────────────────────
const PROFILE_CONFIG = [
  { href: '/settings?section=profile', label: 'Perfil', icon: UserCircle2 },
  { href: '/settings?section=company', label: 'Empresa', icon: Building2 },
  { href: '/settings?section=isaak', label: 'Personalizar Isaak', icon: Sparkles },
  { href: '/settings?section=billing', label: 'Plan y facturación', icon: CreditCard },
] as const;

// ── Profile popover — Integraciones y herramientas ────────────────────────
const PROFILE_TOOLS = [
  { href: '/integrations', label: 'Integraciones', icon: Plug },
  { href: '/microsoft', label: 'Microsoft 365', icon: Monitor },
  { href: '/mail', label: 'Gmail Facturas', icon: Mail },
  { href: '/calendario', label: 'Calendario', icon: CalendarDays },
  { href: '/advisor', label: 'Modo Asesoría', icon: Briefcase },
  { href: '/sede', label: 'Sede Electrónica', icon: Shield },
] as const;

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

  // C-A — badge buzón AEAT: poll /api/isaak/sede/pending-count cada 5 min
  const [aeatPending, setAeatPending] = useState<{ pending: number; critical: number }>(
    { pending: 0, critical: 0 },
  );
  useEffect(() => {
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/isaak/sede/pending-count', {
          credentials: 'include',
        });
        if (!res.ok) return;
        const data = (await res.json()) as { pending?: number; critical?: number };
        if (!cancelled) {
          setAeatPending({
            pending: data.pending ?? 0,
            critical: data.critical ?? 0,
          });
        }
      } catch {
        // fail-silent — el badge no es crítico
      }
    };
    void fetchCount();
    const id = window.setInterval(fetchCount, 5 * 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('isaak-sidebar-collapsed');
    if (stored === 'true') setCollapsed(true);
  }, []);

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
        collapsed ? 'w-14' : 'w-56'
      }`}
      style={{ '--brand-color': brandColor } as React.CSSProperties}
    >
      {/* ── Logo + collapse toggle ────────────────────────── */}
      <div
        className={`flex items-center py-4 ${
          collapsed ? 'justify-center px-2' : 'justify-between px-3'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-lg">
            {whitelabel?.enabled && whitelabel.logoUrl ? (
              <img
                src={whitelabel.logoUrl}
                alt={appName}
                className="h-full w-full object-contain"
              />
            ) : (
              <Image
                src="/Personalidad/isaak-avatar-2.png"
                alt="Isaak"
                fill
                sizes="28px"
                className="object-cover"
                priority
              />
            )}
          </div>
          {!collapsed && (
            <span className="text-[14px] font-bold tracking-tight text-white">{appName}</span>
          )}
        </div>
        {!collapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            title="Plegar menú"
            className="rounded-md p-1 text-slate-600 transition hover:bg-white/5 hover:text-slate-400"
          >
            <ChevronLeft size={13} />
          </button>
        )}
      </div>

      {/* ── New chat ─────────────────────────────────────── */}
      <div className={`pb-3 ${collapsed ? 'px-2' : 'px-3'}`}>
        <Link
          href="/chat"
          onClick={() => router.refresh()}
          title={collapsed ? 'Nuevo chat' : undefined}
          className="flex h-8 w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand-color)] text-[12px] font-semibold text-white transition"
        >
          <Plus size={14} />
          {!collapsed && 'Nuevo chat'}
        </Link>
      </div>

      {/* ── Navigation ───────────────────────────────────── */}
      <nav className={`${collapsed ? 'px-1' : 'px-2'} space-y-0.5`}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {/* group divider + optional label */}
            {gi > 0 && (
              <div className={`my-1.5 ${collapsed ? 'mx-1' : 'mx-1'}`}>
                {'label' in group && !collapsed && group.label ? (
                  <span className="block px-1.5 pb-0.5 pt-1 text-[9px] font-semibold uppercase tracking-widest text-slate-600">
                    {group.label}
                  </span>
                ) : (
                  <div className="border-t border-white/5" />
                )}
              </div>
            )}
            {group.items.map((item) => {
              const { href, label, icon: Icon } = item;
              const badgeKind = 'badgeKind' in item ? item.badgeKind : undefined;
              const badgeCount =
                badgeKind === 'aeat-pending' ? aeatPending.pending : 0;
              const badgeUrgent =
                badgeKind === 'aeat-pending' && aeatPending.critical > 0;
              return (
                <Link
                  key={href}
                  href={href}
                  title={
                    collapsed
                      ? badgeCount > 0
                        ? `${label} · ${badgeCount} pendientes`
                        : label
                      : undefined
                  }
                  className={`flex h-8 items-center rounded-lg text-[12px] font-medium transition ${
                    collapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5'
                  } ${
                    isActive(href)
                      ? 'bg-white/10 text-white'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <span className="relative inline-flex items-center justify-center">
                    <Icon size={15} />
                    {collapsed && badgeCount > 0 && (
                      <span
                        className={`absolute -right-1.5 -top-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-1 text-[8px] font-bold text-white ${
                          badgeUrgent ? 'bg-rose-500' : 'bg-blue-500'
                        }`}
                      >
                        {badgeCount > 9 ? '9+' : badgeCount}
                      </span>
                    )}
                  </span>
                  {!collapsed && (
                    <>
                      <span className="flex-1">{label}</span>
                      {badgeCount > 0 && (
                        <span
                          className={`ml-auto inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1.5 text-[9px] font-bold text-white ${
                            badgeUrgent ? 'bg-rose-500' : 'bg-blue-500'
                          }`}
                        >
                          {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── Chat history ─────────────────────────────────── */}
      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pt-3">
          {conversations.length > 0 && (
            <div className="mb-1 px-1.5 text-[9px] font-semibold uppercase tracking-widest text-slate-600">
              Recientes
            </div>
          )}
          <div className="space-y-0.5">
            {conversations.slice(0, 30).map((conv) => (
              <Link
                key={conv.id}
                href={`/chat/${conv.id}`}
                className={`flex flex-col rounded-lg px-2 py-1.5 transition hover:bg-white/5 ${
                  pathname === `/chat/${conv.id}` ? 'bg-white/10' : ''
                }`}
              >
                <span className="truncate text-[12px] text-slate-300">
                  {conv.title ?? 'Nueva conversación'}
                </span>
                <span className="text-[10px] text-slate-600">
                  {formatRelativeDate(conv.lastActivity)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {collapsed && <div className="flex-1" />}

      {/* ── Collapse button (collapsed mode) ─────────────── */}
      {collapsed && (
        <div className="px-2 pb-1">
          <button
            type="button"
            onClick={toggleCollapsed}
            title="Expandir menú"
            className="flex h-7 w-full items-center justify-center rounded-lg text-slate-700 transition hover:bg-white/5 hover:text-slate-500"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      )}

      {/* ── Profile / Account area ───────────────────────── */}
      <div
        className={`relative border-t border-white/5 p-2 ${collapsed ? 'px-1.5' : ''}`}
        ref={profileRef}
      >
        {/* Profile popover */}
        {profileOpen && !collapsed && (
          <div className="absolute bottom-full left-2 right-2 mb-2 overflow-hidden rounded-2xl border border-white/10 bg-[#0d1e4a] shadow-2xl">
            {/* User header */}
            <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-color)] text-[13px] font-bold text-white">
                {user.initials}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-white">{user.name}</div>
                <div className="truncate text-[11px] text-slate-400">{user.email}</div>
              </div>
            </div>

            {/* Plan */}
            <div className="border-b border-white/5 px-4 py-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Plan actual</span>
                <PlanBadge plan={planInfo} />
              </div>
              <Link
                href="/settings?section=billing"
                onClick={() => setProfileOpen(false)}
                className="mt-0.5 text-[11px] font-medium text-[#2361d8]/80 transition hover:text-[#2361d8]"
              >
                Ver planes y facturación →
              </Link>
            </div>

            {/* Configuración */}
            <div className="border-b border-white/5 py-1">
              <div className="px-4 pb-1 pt-2 text-[9px] font-semibold uppercase tracking-widest text-slate-600">
                Configuración
              </div>
              {PROFILE_CONFIG.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-1.5 text-[12px] text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  <Icon size={13} className="shrink-0 text-slate-500" />
                  {label}
                </Link>
              ))}
            </div>

            {/* Integraciones y herramientas */}
            <div className="border-b border-white/5 py-1">
              <div className="px-4 pb-1 pt-2 text-[9px] font-semibold uppercase tracking-widest text-slate-600">
                Integraciones y herramientas
              </div>
              {PROFILE_TOOLS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-1.5 text-[12px] text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  <Icon size={13} className="shrink-0 text-slate-500" />
                  {label}
                </Link>
              ))}
            </div>

            {/* Help + logout */}
            <div className="py-1">
              <Link
                href="/support"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2.5 px-4 py-1.5 text-[12px] text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                <LifeBuoy size={13} className="shrink-0 text-slate-500" />
                Ayuda y soporte
                <ExternalLink size={10} className="ml-auto text-slate-600" />
              </Link>
              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={loggingOut}
                className="flex w-full items-center gap-2.5 px-4 py-1.5 text-[12px] text-rose-400 transition hover:bg-white/5 disabled:opacity-50"
              >
                {loggingOut ? (
                  <Loader2 size={13} className="shrink-0 animate-spin" />
                ) : (
                  <LogOut size={13} className="shrink-0" />
                )}
                Cerrar sesión
              </button>
            </div>
          </div>
        )}

        {/* Profile trigger button */}
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
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-color)] text-[11px] font-bold text-white">
            {user.initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 text-left">
              <div className="truncate text-[12px] font-medium text-slate-200">{user.name}</div>
              <PlanBadge plan={planInfo} />
            </div>
          )}
          {!collapsed && (
            <ChevronUp
              size={12}
              className={`shrink-0 text-slate-600 transition-transform ${profileOpen ? '' : 'rotate-180'}`}
            />
          )}
        </button>
      </div>
    </aside>
  );
}
