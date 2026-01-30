"use client";
import * as React from "react";
import { usePathname, useParams, useSearchParams } from "next/navigation";
import { AppShell } from "@verifactu/ui/app-shell/AppShell";
import { navClient } from "@/src/navClient";

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const search = useSearchParams();

  const tenantId = params.tenantSlug as string | undefined;
  const resolvedNav = React.useMemo(() => {
    const slug = tenantId ?? "demo";
    return navClient.map((item) => ({
      ...item,
      href: item.href.replace(":tenantSlug", slug),
    }));
  }, [tenantId]);

  const demoMode = search.get("demo") === "1";
  let moduleKey = "dashboard";
  if (pathname.startsWith(`/t/${tenantId}/erp/invoices`)) moduleKey = "invoices";
  else if (pathname.startsWith(`/t/${tenantId}/banking`)) moduleKey = "banking";
  else if (pathname.startsWith(`/t/${tenantId}/accounting`)) moduleKey = "accounting";

  return (
    <AppShell
      variant="client"
      nav={resolvedNav}
      pathname={pathname}
      showThemeToggle
      showIsaak
      headerLeft={<div className="text-sm text-muted-foreground">Panel Cliente</div>}
      headerRight={demoMode ? <span className="text-xs text-muted-foreground">Modo demo</span> : null}
    >
      {children}
    </AppShell>
  );
}
