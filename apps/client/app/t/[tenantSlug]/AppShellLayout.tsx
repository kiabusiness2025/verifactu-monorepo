"use client";
import * as React from "react";
import { usePathname, useParams, useSearchParams } from "next/navigation";
import { AppShell } from "@verifactu/ui";
import { navClient } from "../../../src/navClient";
import { useCurrentTenant } from "../../../src/tenant/useCurrentTenant";

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const search = useSearchParams();
  const { tenantId: currentTenantId, demoMode } = useCurrentTenant();

  const tenantId = params.tenantSlug as string | undefined;
  const resolvedNav = React.useMemo(() => {
    const slug = tenantId ?? "demo";
    return navClient.map((item) => ({
      ...item,
      href: item.href.replace(":tenantSlug", slug),
    }));
  }, [tenantId]);

  const demoParam = search.get("demo") === "1";
  const resolvedDemo = demoMode || demoParam;
  const isaakExtraContext = {
    tenantId: currentTenantId ?? tenantId ?? "demo",
    demoMode: resolvedDemo,
  };

  return (
    <AppShell
      variant="client"
      nav={resolvedNav}
      pathname={pathname}
      showThemeToggle
      showIsaak
      isaakExtraContext={isaakExtraContext}
      headerLeft={<div className="text-sm text-muted-foreground">Panel Cliente</div>}
      headerRight={resolvedDemo ? <span className="text-xs text-muted-foreground">Modo demo</span> : null}
    >
      {children}
    </AppShell>
  );
}
