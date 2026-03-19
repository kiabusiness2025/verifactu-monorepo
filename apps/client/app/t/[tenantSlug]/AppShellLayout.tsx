'use client';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import ClientProfileMenu from '../../../components/ClientProfileMenu';
import { navClient } from '../../../src/navClient';
import { useCurrentTenant } from '../../../src/tenant/useCurrentTenant';
import { AppShell } from '../../../src/ui';

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const search = useSearchParams();
  const routeTenantSlug = params.tenantSlug as string | undefined;
  const {
    currentTenant,
    tenantId: currentTenantId,
    demoMode,
    loading,
  } = useCurrentTenant(routeTenantSlug);

  const resolvedNav = React.useMemo(() => {
    const slug = currentTenant?.slug ?? routeTenantSlug ?? 'demo';
    return navClient.map((item) => ({
      ...item,
      href: item.href.replace(':tenantSlug', slug),
    }));
  }, [currentTenant?.slug, routeTenantSlug]);

  React.useEffect(() => {
    if (loading || !routeTenantSlug || !currentTenant || routeTenantSlug === currentTenant.slug) {
      return;
    }

    const nextPath = pathname.replace(`/t/${routeTenantSlug}`, `/t/${currentTenant.slug}`);
    if (nextPath !== pathname) {
      router.replace(nextPath);
    }
  }, [currentTenant, loading, pathname, routeTenantSlug, router]);

  const demoParam = search.get('demo') === '1';
  const resolvedDemo = demoMode || demoParam;
  const resolvedTenantId = currentTenantId ?? 'demo';
  const isaakExtraContext = {
    tenantId: resolvedTenantId,
    demoMode: resolvedDemo,
    toneApiPath: `/api/preferences?tenantId=${encodeURIComponent(resolvedTenantId)}`,
  };

  const sidebarBrand = (
    <div className="flex items-center gap-3 min-w-0">
      {currentTenant.logoUrl ? (
        <img
          src={currentTenant.logoUrl}
          alt={currentTenant.name}
          className="h-9 w-9 rounded-xl object-cover border border-border"
        />
      ) : (
        <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center text-[11px] font-semibold text-primary">
          {currentTenant.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <div className="text-sm font-semibold leading-tight truncate">{currentTenant.name}</div>
        <div className="text-xs text-muted-foreground truncate">
          {currentTenant.isDemo ? 'Empresa Demo' : 'Panel de cliente'}
        </div>
      </div>
    </div>
  );

  return (
    <AppShell
      variant="client"
      nav={resolvedNav}
      pathname={pathname}
      sidebarBrand={sidebarBrand}
      showThemeToggle
      showIsaak
      isaakExtraContext={isaakExtraContext}
      headerLeft={<div className="text-sm text-muted-foreground">{currentTenant.name}</div>}
      headerRight={
        <ClientProfileMenu tenantSlug={currentTenant?.slug ?? routeTenantSlug ?? 'demo'} />
      }
    >
      {children}
    </AppShell>
  );
}
