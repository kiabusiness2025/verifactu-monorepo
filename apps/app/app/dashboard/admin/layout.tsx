"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminNav = [
  { label: "Resumen", href: "/dashboard/admin" },
  { label: "Usuarios", href: "/dashboard/admin/users" },
  { label: "Empresas", href: "/dashboard/admin/companies" },
  { label: "Contabilidad", href: "/dashboard/admin/accounting" },
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
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Admin
        </div>
        <nav className="mt-4 space-y-1">
          {adminNav.map((item) => {
            const isActive = pathname === item.href;
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
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
