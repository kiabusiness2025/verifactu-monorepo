'use client';

import { LayoutDashboard, Users, Building2, ShieldCheck, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const dynamic = 'force-dynamic';

const adminNav = [
  {
    label: 'Panel',
    href: '/dashboard/admin/panel',
    icon: LayoutDashboard,
    accent: 'text-[#0b6cfb] bg-[#0b6cfb]/12',
  },
  {
    label: 'Usuarios',
    href: '/dashboard/admin/users',
    icon: Users,
    accent: 'text-indigo-600 bg-indigo-100',
  },
  {
    label: 'Tenants',
    href: '/dashboard/admin/tenants',
    icon: Building2,
    accent: 'text-cyan-700 bg-cyan-100',
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-6">
      <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-64 shrink-0 overflow-y-auto rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm md:block">
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 ring-1 ring-red-200">
          <span className="text-red-600">ADM</span>
          <span className="text-xs font-bold uppercase tracking-wider text-red-700">
            Acceso legacy
          </span>
        </div>

        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Admin Holded
        </div>
        <nav className="mt-4 space-y-1">
          {adminNav.map((item) => {
            const isActive =
              item.href === '/dashboard/admin/panel'
                ? pathname === item.href
                : pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-lg ${
                    isActive ? 'bg-white/20 text-white' : item.accent
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
                Vista de compatibilidad. El panel canonico vive en /panel, /users y /tenants.
              </div>
            </div>
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
              <AlertTriangle className="h-3 w-3" />
              Legacy
            </span>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto">
            {adminNav.map((item) => {
              const isActive =
                item.href === '/dashboard/admin/panel'
                  ? pathname === item.href
                  : pathname?.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    isActive ? 'bg-[#0b6cfb] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span
                    className={`inline-flex h-4 w-4 items-center justify-center rounded-full ${
                      isActive ? 'bg-white/20 text-white' : item.accent
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
