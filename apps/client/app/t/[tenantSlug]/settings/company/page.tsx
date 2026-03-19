'use client';

import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';
import { useCurrentTenant } from '../../../../../src/tenant/useCurrentTenant';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../../../../../src/ui';

export default function CompanySettingsPage() {
  const params = useParams();
  const router = useRouter();
  const routeTenantSlug = params.tenantSlug as string | undefined;
  const {
    currentTenant,
    tenants,
    createManualTenant,
    removeTenant,
    setActiveTenant,
    updateTenant,
  } = useCurrentTenant(routeTenantSlug);
  const [companyName, setCompanyName] = React.useState('');
  const [currentCompanyName, setCurrentCompanyName] = React.useState(currentTenant.name);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setCurrentCompanyName(currentTenant.name);
  }, [currentTenant.name]);

  const handleCreateCompany = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSaving(true);

    try {
      const createdTenant = await createManualTenant(companyName);
      if (!createdTenant) {
        setFeedback('Escribe un nombre válido para la empresa.');
        return;
      }

      setCompanyName('');
      setFeedback(`Empresa creada: ${createdTenant.name}`);
      router.push(`/t/${createdTenant.slug}/settings/company`);
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : 'No se pudo crear la empresa.');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (tenantId: string, tenantSlug: string) => {
    setSaving(true);

    try {
      const nextTenant = await setActiveTenant(tenantId);
      router.push(`/t/${nextTenant?.slug ?? tenantSlug}/settings/company`);
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : 'No se pudo cambiar de empresa.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (tenantId: string) => {
    setSaving(true);

    try {
      const result = await removeTenant(tenantId);
      if (!result.ok) {
        setFeedback(result.error ?? 'No se pudo eliminar la empresa.');
        return;
      }

      setFeedback('Empresa eliminada.');

      if (result.nextTenantSlug) {
        router.push(`/t/${result.nextTenantSlug}/settings/company`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRenameCurrentCompany = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSaving(true);

    try {
      const updatedTenant = await updateTenant(currentTenant.id, {
        name: currentCompanyName.trim(),
      });
      if (!updatedTenant) {
        setFeedback('No se pudo actualizar el nombre de la empresa.');
        return;
      }

      setFeedback('Datos de empresa actualizados.');
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : 'No se pudo actualizar la empresa.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setSaving(true);

    try {
      const logoDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
        reader.readAsDataURL(file);
      });

      await updateTenant(currentTenant.id, { logoUrl: logoDataUrl });
      setFeedback('Logotipo actualizado.');
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : 'No se pudo actualizar el logotipo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Empresa activa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {currentTenant.logoUrl ? (
              <img
                src={currentTenant.logoUrl}
                alt={currentTenant.name}
                className="h-16 w-16 rounded-2xl object-cover border border-border"
              />
            ) : (
              <div className="h-16 w-16 rounded-2xl border border-border bg-muted/50 flex items-center justify-center text-xs text-muted-foreground text-center px-2">
                Sin logo
              </div>
            )}
            <div className="space-y-2">
              <label className="inline-flex">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <span className="inline-flex items-center rounded-xl border border-border px-3 py-2 text-sm cursor-pointer hover:bg-muted/60">
                  {saving ? 'Guardando…' : 'Subir logotipo'}
                </span>
              </label>
              <div className="text-xs text-muted-foreground">
                Usa una imagen cuadrada o con fondo limpio para el tenant.
              </div>
            </div>
          </div>

          <form className="space-y-3" onSubmit={handleRenameCurrentCompany}>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Nombre visible</span>
              <input
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={currentCompanyName}
                onChange={(event) => setCurrentCompanyName(event.target.value)}
              />
            </label>
            <Button type="submit" disabled={saving}>
              Guardar empresa activa
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Empresas visibles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Empresa Demo queda disponible por defecto. Puedes mantenerla para pruebas o borrarla
            cuando ya trabajes solo con tus propias empresas.
          </p>

          <div className="grid gap-3">
            {tenants.map((tenant) => {
              const isActive = tenant.id === currentTenant.id;

              return (
                <div
                  key={tenant.id}
                  className="rounded-2xl border border-border bg-background p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="text-sm font-semibold">{tenant.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {tenant.isDemo ? 'Empresa Demo' : 'Empresa manual'}
                      {isActive ? ' · Activa ahora' : ''}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!isActive ? (
                      <Button
                        variant="secondary"
                        disabled={saving}
                        onClick={() => handleActivate(tenant.id, tenant.slug)}
                      >
                        Usar esta empresa
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      disabled={saving}
                      onClick={() => handleRemove(tenant.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Añadir empresa manualmente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Aquí no llamamos a eInforma. Puedes crear tu empresa manualmente y empezar a trabajar al
            instante.
          </p>

          <form className="space-y-3" onSubmit={handleCreateCompany}>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Nombre de la empresa</span>
              <input
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Ej. Mi Empresa SL"
              />
            </label>

            <Button type="submit" disabled={saving}>
              Crear empresa
            </Button>
          </form>

          {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
