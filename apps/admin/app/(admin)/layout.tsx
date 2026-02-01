"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@verifactu/ui";
import { navAdmin } from "../../src/navAdmin";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AppShell
      variant="admin"
      nav={navAdmin}
      pathname={pathname}
      showThemeToggle={false}
      showIsaak={false}
      headerLeft={<div className="text-sm font-semibold">Verifactu Admin</div>}
    >
      {children}
    </AppShell>
  );
}
