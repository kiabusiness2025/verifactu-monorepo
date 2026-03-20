'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useCurrentTenant } from '../src/tenant/useCurrentTenant';
import { Button } from '../src/ui';

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

type Props = {
  tenantSlug: string;
};

export default function ClientProfileMenu({ tenantSlug }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [pendingTenantId, setPendingTenantId] = React.useState<string | null>(null);
  const { currentTenant, tenants, userProfile, displayName, setActiveTenant, loading } =
    useCurrentTenant(tenantSlug);

  const goToTenant = async (nextTenantSlug: string) => {
    setPendingTenantId(nextTenantSlug);

    try {
      const nextTenant = await setActiveTenant(nextTenantSlug);
      setIsOpen(false);
      router.push(`/t/${nextTenant?.slug ?? nextTenantSlug}/dashboard`);
    } finally {
      setPendingTenantId(null);
    }
  };

  const avatarNode = userProfile?.photoUrl ? (
    <Image
      src={userProfile.photoUrl}
      alt={displayName}
      width={36}
      height={36}
      unoptimized
      className="h-9 w-9 rounded-full object-cover border border-border"
    />
  ) : (
    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary border border-primary/15 flex items-center justify-center text-xs font-semibold">
      {getInitials(displayName)}
    </div>
  );

  const companyLogo = currentTenant.logoUrl ? (
    <Image
      src={currentTenant.logoUrl}
      alt={currentTenant.name}
      width={44}
      height={44}
      unoptimized
      className="h-11 w-11 rounded-2xl object-cover border border-border"
    />
  ) : (
    <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary border border-primary/15 flex items-center justify-center text-xs font-semibold">
      {getInitials(currentTenant.name)}
    </div>
  );

  return (
    <div className="relative">
      <button
        type="button"
        className="flex items-center gap-3 rounded-full border border-border bg-card px-2 py-1.5 hover:bg-muted/60 transition"
        onClick={() => setIsOpen((value) => !value)}
      >
        <div className="hidden sm:block text-right">
          <div className="text-xs font-semibold leading-tight">{displayName}</div>
          <div className="text-[11px] text-muted-foreground leading-tight truncate max-w-[160px]">
            {currentTenant.name}
          </div>
        </div>
        {avatarNode}
      </button>

      {isOpen ? (
        <>
          <button
            type="button"
            aria-label="Cerrar panel de cuenta"
            className="fixed inset-0 z-40 bg-black/35"
            onClick={() => setIsOpen(false)}
          />
          <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-border bg-background shadow-2xl">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <div className="text-sm font-semibold">Cuenta y empresas</div>
                  <div className="text-xs text-muted-foreground">
                    Perfil, accesos y marca activa
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-border px-3 py-1 text-sm hover:bg-muted/60"
                  onClick={() => setIsOpen(false)}
                >
                  Cerrar
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
                <section className="rounded-3xl border border-border bg-card p-4">
                  <div className="flex items-center gap-4">
                    {avatarNode}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{displayName}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {userProfile?.email ?? 'Sin correo configurado'}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-border bg-card p-4 space-y-4">
                  <div className="flex items-center gap-4">
                    {companyLogo}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{currentTenant.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {currentTenant.isDemo ? 'Empresa Demo activa' : 'Empresa activa'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Selector de empresas
                    </div>
                    <div className="space-y-2">
                      {tenants.map((tenant) => {
                        const active = tenant.id === currentTenant.id;
                        const tenantLogo = tenant.logoUrl ? (
                          <Image
                            src={tenant.logoUrl}
                            alt={tenant.name}
                            width={40}
                            height={40}
                            unoptimized
                            className="h-10 w-10 rounded-2xl object-cover border border-border"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary border border-primary/15 flex items-center justify-center text-[11px] font-semibold">
                            {getInitials(tenant.name)}
                          </div>
                        );

                        return (
                          <button
                            key={tenant.id}
                            type="button"
                            onClick={() => goToTenant(tenant.slug)}
                            disabled={loading || pendingTenantId === tenant.slug}
                            className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                              active
                                ? 'border-primary/20 bg-primary/10'
                                : 'border-border hover:bg-muted/60'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {tenantLogo}
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium truncate">{tenant.name}</div>
                                <div className="text-[11px] text-muted-foreground">
                                  {tenant.isDemo ? 'Demo' : 'Empresa propia'}
                                </div>
                              </div>
                              {active ? (
                                <span className="text-[11px] font-medium">Actual</span>
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Link
                    href={`/t/${currentTenant.slug}/settings/company`}
                    className="block text-sm text-primary hover:underline"
                    onClick={() => setIsOpen(false)}
                  >
                    Gestionar empresas y logotipo
                  </Link>
                </section>

                <section className="rounded-3xl border border-border bg-card p-4 space-y-2">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Ajustes de cuenta
                  </div>
                  <Link
                    href={`/t/${currentTenant.slug}/settings/profile`}
                    className="block rounded-2xl px-3 py-2 text-sm hover:bg-muted/60"
                    onClick={() => setIsOpen(false)}
                  >
                    Mi perfil y datos de acceso
                  </Link>
                  <Link
                    href={`/t/${currentTenant.slug}/settings/members`}
                    className="block rounded-2xl px-3 py-2 text-sm hover:bg-muted/60"
                    onClick={() => setIsOpen(false)}
                  >
                    Usuarios e invitaciones
                  </Link>
                  <Link
                    href={`/t/${currentTenant.slug}/settings/security`}
                    className="block rounded-2xl px-3 py-2 text-sm hover:bg-muted/60"
                    onClick={() => setIsOpen(false)}
                  >
                    Seguridad y sesiones
                  </Link>
                  <Link
                    href={`/t/${currentTenant.slug}/settings/integrations`}
                    className="block rounded-2xl px-3 py-2 text-sm hover:bg-muted/60"
                    onClick={() => setIsOpen(false)}
                  >
                    Integraciones
                  </Link>
                </section>
              </div>

              <div className="border-t border-border px-5 py-4">
                <Button
                  variant="secondary"
                  className="w-full justify-center rounded-2xl"
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/logout');
                  }}
                >
                  Cerrar sesión
                </Button>
              </div>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
