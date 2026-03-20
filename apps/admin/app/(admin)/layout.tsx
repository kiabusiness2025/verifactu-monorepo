'use client';

import { AppShell } from '@verifactu/ui';
import { usePathname } from 'next/navigation';
import { navAdmin } from '../../src/navAdmin';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AppShell
      variant="admin"
      nav={navAdmin}
      pathname={pathname}
      showThemeToggle={false}
      showIsaak
      isaakExtraContext={{ personaContext: 'admin', appVariant: 'admin', toneApiPath: '/api/admin/preferences' }}
      headerLeft={<div className="text-sm font-semibold">Verifactu Admin</div>}
    >
      {children}
    </AppShell>
  );
}
