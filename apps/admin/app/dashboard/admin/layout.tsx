"use client";

import {
  AlertCircle,
  AlertTriangle,
  Bot,
  Building2,
  Calculator,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  Palette,
  Plug,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

// Force dynamic rendering for admin routes
export const dynamic = 'force-dynamic';

type NavItem = {
  label: string;
  href: string;
  section?: 'core' | 'operations' | 'integrations' | 'custom';
  hidden?: boolean;
  icon?: LucideIcon;
  accent?: string;
};

const baseAdminNav: NavItem[] = [
  { label: "Resumen", href: "/dashboard/admin", section: 'core', hidden: false, icon: LayoutDashboard, accent: "text-[#0b6cfb] bg-[#0b6cfb]/12" },
  { label: "Usuarios", href: "/dashboard/admin/users", section: 'core', hidden: false, icon: Users, accent: "text-indigo-600 bg-indigo-100" },
  { label: "Empresas", href: "/dashboard/admin/companies", section: 'core', hidden: false, icon: Building2, accent: "text-cyan-700 bg-cyan-100" },
  { label: "Vistas", href: "/dashboard/admin/views", section: 'core', hidden: false, icon: Palette, accent: "text-fuchsia-700 bg-fuchsia-100" },
  { label: "Contabilidad", href: "/dashboard/admin/accounting", section: 'operations', hidden: false, icon: Calculator, accent: "text-emerald-700 bg-emerald-100" },
  { label: "Integraciones", href: "/dashboard/admin/integrations", section: 'integrations', hidden: false, icon: Plug, accent: "text-violet-700 bg-violet-100" },
  { label: "Stripe", href: "/integrations/stripe", section: 'integrations', hidden: false, icon: CreditCard, accent: "text-blue-700 bg-blue-100" },
  { label: "Emails", href: "/dashboard/admin/emails", section: 'operations', hidden: false, icon: Mail, accent: "text-orange-700 bg-orange-100" },
  { label: "Incidencias", href: "/operations", section: 'operations', hidden: false, icon: AlertCircle, accent: "text-amber-700 bg-amber-100" },
  { label: "Soporte", href: "/support-sessions", section: 'operations', hidden: false, icon: LifeBuoy, accent: "text-rose-700 bg-rose-100" },
  { label: "Isaak", href: "/dashboard/admin/chat", section: 'operations', hidden: false, icon: Bot, accent: "text-sky-700 bg-sky-100" },
  { label: "Configuración", href: "/settings", section: 'core', hidden: false, icon: Settings, accent: "text-slate-700 bg-slate-100" },
];

function normalizePath(path: string) {
  const value = path.trim();
  if (!value) return "";
  return value.startsWith("/") ? value : `/${value}`;
}

function isAdminDashboardPath(path: string) {
  return path.startsWith("/dashboard/admin") || path.startsWith("/operations") || path.startsWith("/support-sessions") || path.startsWith("/settings") || path.startsWith("/integrations/");
}

function iconFromSection(section?: NavItem["section"]): LucideIcon {
  if (section === "integrations") return Plug;
  if (section === "operations") return AlertCircle;
  if (section === "custom") return FolderKanban;
  return LayoutDashboard;
}

function accentFromSection(section?: NavItem["section"]) {
  if (section === "integrations") return "text-violet-700 bg-violet-100";
  if (section === "operations") return "text-amber-700 bg-amber-100";
  if (section === "custom") return "text-fuchsia-700 bg-fuchsia-100";
  return "text-[#0b6cfb] bg-[#0b6cfb]/12";
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [savedNav, setSavedNav] = useState<NavItem[]>([]);

  useEffect(() => {
    let mounted = true;
    async function loadSavedViews() {
      try {
        const res = await fetch("/api/admin/views?scope=dashboard", {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const data = await res.json().catch(() => null);
        if (!mounted || !res.ok || !data?.ok || !Array.isArray(data.views)) return;
        const next: NavItem[] = data.views
          .map((item: { name?: string; path?: string; section?: NavItem['section']; hidden?: boolean }) => ({
            label: String(item?.name || "").trim(),
            href: normalizePath(String(item?.path || "")),
            section: item?.section || 'core',
            hidden: !!item?.hidden,
            icon: iconFromSection(item?.section || 'core'),
            accent: accentFromSection(item?.section || 'core'),
          }))
          .filter((item: NavItem) => item.label && item.href && isAdminDashboardPath(item.href));
        setSavedNav(next);
      } catch {
        setSavedNav([]);
      }
    }
    void loadSavedViews();
    return () => {
      mounted = false;
    };
  }, []);

  const adminNav = useMemo(() => {
    if (savedNav.length === 0) return baseAdminNav;

    const savedOrder = new Map(savedNav.map((item, index) => [item.href, index]));
    const baseSorted = [...baseAdminNav].sort((a, b) => {
      const ai = savedOrder.get(a.href);
      const bi = savedOrder.get(b.href);
      if (ai == null && bi == null) return 0;
      if (ai == null) return 1;
      if (bi == null) return -1;
      return ai - bi;
    });

    const existing = new Set(baseSorted.map((item) => item.href));
    const extras = savedNav.filter((item) => !existing.has(item.href));
    return [...baseSorted, ...extras].filter((item) => !item.hidden);
  }, [savedNav]);

  return (
    <div className="flex gap-6">
      <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-64 shrink-0 overflow-y-auto rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm md:block">
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 ring-1 ring-red-200">
          <span className="text-red-600">ADM</span>
          <span className="text-xs font-bold uppercase tracking-wider text-red-700">
            Modo Admin
          </span>
        </div>

        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Admin
        </div>
        <nav className="mt-4 space-y-1">
          {adminNav.map((item) => {
            const isActive =
              item.href === "/dashboard/admin"
                ? pathname === item.href
                : pathname?.startsWith(item.href);
            const Icon = item.icon || iconFromSection(item.section);
            const accent = item.accent || accentFromSection(item.section);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-lg ${
                    isActive ? "bg-white/20 text-white" : accent
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 space-y-4">
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs text-rose-900 shadow-sm sm:px-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-rose-600 text-white">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="font-semibold">Modo admin activo</div>
              <div className="text-[11px] text-rose-700">
                Acciones sensibles habilitadas. Revisa con atencion cada cambio.
              </div>
            </div>
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
              <AlertTriangle className="h-3 w-3" />
              Alto riesgo
            </span>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto">
            {adminNav.map((item) => {
              const isActive =
                item.href === "/dashboard/admin"
                  ? pathname === item.href
                  : pathname?.startsWith(item.href);
              const Icon = item.icon || iconFromSection(item.section);
              const accent = item.accent || accentFromSection(item.section);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    isActive
                      ? "bg-[#0b6cfb] text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span
                    className={`inline-flex h-4 w-4 items-center justify-center rounded-full ${
                      isActive ? "bg-white/20 text-white" : accent
                    }`}
                  >
                    <Icon className="h-2.5 w-2.5" />
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
