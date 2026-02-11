"use client";

import { AlertTriangle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Force dynamic rendering for admin routes
export const dynamic = 'force-dynamic';

const adminNav = [
  { label: "Resumen", href: "/dashboard/admin" },
  { label: "Usuarios", href: "/dashboard/admin/users" },
  { label: "Empresas", href: "/dashboard/admin/companies" },
  { label: "Tenants", href: "/dashboard/admin/tenants" },
  { label: "Contabilidad", href: "/dashboard/admin/accounting" },
  { label: "Integraciones", href: "/dashboard/admin/integrations" },
  { label: "Stripe", href: "/integrations/stripe" },
  { label: "Emails", href: "/dashboard/admin/emails" },
  { label: "Incidencias", href: "/operations" },
  { label: "Soporte", href: "/support-sessions" },
  { label: "Isaak", href: "/dashboard/admin/chat" },
  { label: "Configuración", href: "/settings" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex gap-6">
      <aside className="hidden w-56 shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:block">
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
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
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
        <div className="lg:hidden">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm">
            <div className="flex items-center gap-2 overflow-x-auto">
              {adminNav.map((item) => {
                const isActive =
                  item.href === "/dashboard/admin"
                    ? pathname === item.href
                    : pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition ${
                      isActive
                        ? "bg-[#0b6cfb] text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
