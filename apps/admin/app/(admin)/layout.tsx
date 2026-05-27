'use client';

import { AppShell } from '@verifactu/ui';
import type { NavItem } from '@verifactu/ui';
import InstallPwaButton from '@/components/pwa/InstallPwaButton';
import { ExternalLink, User } from 'lucide-react';
import { usePathname } from 'next/navigation';

const ISAAK_URL = process.env.NEXT_PUBLIC_ISAAK_URL ?? 'https://isaak.verifactu.business';
import { useEffect, useMemo, useState } from 'react';
import { navAdmin } from '../../src/navAdmin';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  const [connectorErrors, setConnectorErrors] = useState(0);
  const tenantIdMatch = pathname.match(
    /\/tenants\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
  );
  const currentTenantId = tenantIdMatch?.[1] ?? null;

  useEffect(() => {
    fetch('/api/admin/connectors/health', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (typeof d?.errors === 'number') setConnectorErrors(d.errors);
      })
      .catch(() => null);
  }, [pathname]);

  const nav: NavItem[] = useMemo(
    () =>
      navAdmin.map((item) =>
        item.href === '/connectors' && connectorErrors > 0
          ? { ...item, badge: connectorErrors }
          : item
      ),
    [connectorErrors]
  );

  return (
    <AppShell
      variant="admin"
      nav={nav}
      pathname={pathname}
      showThemeToggle={false}
      showIsaak={true}
      isaakExtraContext={{
        moduleKey: 'admin',
        role: 'admin',
        context: 'backoffice',
        chatApiPath: '/api/admin/isaak/chat',
        feedbackApiPath: '/api/admin/isaak/feedback',
        exportApiPath: '/api/admin/isaak/export',
        uploadApiPath: '/api/admin/isaak/upload',
        ...(currentTenantId ? { tenantId: currentTenantId } : {}),
      }}
      sidebarIcon={
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#011c67] text-sm font-semibold text-white">
          VB
        </div>
      }
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
      headerRight={
        <div className="flex items-center gap-2">
          <a
            href={`${ISAAK_URL}/chat`}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir Isaak como usuario"
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <User size={12} />
            <span className="hidden sm:inline">Ver como usuario</span>
            <ExternalLink size={10} className="text-slate-400" />
          </a>
          <InstallPwaButton />
        </div>
      }
    >
      {children}
    </AppShell>
  );
}
