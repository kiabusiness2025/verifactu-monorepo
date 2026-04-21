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
      showIsaak={false}
      sidebarBrand={
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
            H
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">Holded Admin</div>
            <div className="truncate text-xs text-slate-500">Usuarios y tenants</div>
          </div>
        </div>
      }
      headerLeft={
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">
            Panel del canal Holded
          </div>
          <div className="truncate text-xs text-slate-500">Usuarios y tenants</div>
        </div>
      }
      headerRight={<InstallPwaButton />}
    >
      {children}
    </AppShell>
  );
}
