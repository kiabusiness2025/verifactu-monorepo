"use client";

import { usePathname } from "next/navigation";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { AppShell, type NavItem } from "@verifactu/ui";

const nav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Tenants", href: "/tenants" },
  { label: "Usuarios", href: "/users" },
  { label: "Soporte", href: "/support-sessions" },
  { label: "Auditoria", href: "/audit-log" },
  { label: "Settings", href: "/settings" },
  { label: "Stripe", href: "/integrations/stripe" },
  { label: "Resend", href: "/integrations/resend" },
  { label: "Bancos", href: "/integrations/banking" },
  { label: "VeriFactu", href: "/integrations/verifactu" },
  { label: "Overview", href: "/operations" },
  { label: "Jobs", href: "/operations/jobs" },
  { label: "Webhooks", href: "/operations/webhooks" },
  { label: "Errores", href: "/operations/errors" },
];

export default function AdminControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <AppShell
      variant="admin"
      nav={nav}
      pathname={pathname}
      showThemeToggle={false}
      showIsaak={false}
      headerLeft={
        <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs text-rose-700 ring-1 ring-rose-200">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span className="font-semibold">Modo admin activo</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
            <AlertTriangle className="h-3 w-3" />
            Alto riesgo
          </span>
        </div>
      }
    >
      {children}
    </AppShell>
  );
}
