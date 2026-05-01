'use client';

import { AppShell } from '@verifactu/ui';
import InstallPwaButton from '@/components/pwa/InstallPwaButton';
import { usePathname } from 'next/navigation';
import { navAdmin } from '../../src/navAdmin';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';

  return (
    <AppShell
      variant="admin"
      nav={navAdmin}
      pathname={pathname}
      showThemeToggle={false}
      showIsaak={true}
      isaakExtraContext={{ moduleKey: 'admin', role: 'admin', context: 'backoffice' }}
      sidebarBrand={
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#011c67] text-sm font-semibold text-white">
            VB
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">Verifactu Business</div>
            <div className="truncate text-xs text-slate-500">Panel de administración</div>
          </div>
        </div>
      }
      headerLeft={
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">
            Verifactu Business Admin
          </div>
          <div className="truncate text-xs text-slate-500">Gestión interna del producto</div>
        </div>
      }
      headerRight={<InstallPwaButton />}
    >
      {children}
    </AppShell>
  );
}
