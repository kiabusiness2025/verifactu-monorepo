'use client';

import { useParams } from 'next/navigation';
import * as React from 'react';
import { useClientWorkspace } from '../../../../../src/account/useClientWorkspace';
import { useCurrentTenant } from '../../../../../src/tenant/useCurrentTenant';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../../../../../src/ui';

export default function ProfileSettingsPage() {
  const params = useParams();
  const routeTenantSlug = params.tenantSlug as string | undefined;
  const { currentTenant, userProfile, refreshUserProfile } = useCurrentTenant(routeTenantSlug);
  const { updateProfile } = useClientWorkspace(userProfile, currentTenant.id);
  const [form, setForm] = React.useState({
    name: userProfile?.name ?? '',
    email: userProfile?.email ?? '',
    phone: userProfile?.phone ?? '',
    position: userProfile?.position ?? '',
    recoveryEmail: userProfile?.recoveryEmail ?? '',
  });
  const [feedback, setFeedback] = React.useState<string | null>(null);

  React.useEffect(() => {
    setForm({
      name: userProfile?.name ?? '',
      email: userProfile?.email ?? '',
      phone: userProfile?.phone ?? '',
      position: userProfile?.position ?? '',
      recoveryEmail: userProfile?.recoveryEmail ?? '',
    });
  }, [userProfile]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateProfile(form);
    refreshUserProfile();
    setFeedback('Perfil actualizado.');
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Mi perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Gestiona aquí tu perfil, tus datos de acceso y la información visible dentro de la
            cuenta.
          </p>

          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <label className="space-y-2">
              <span className="text-sm font-medium">Nombre completo</span>
              <input
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Correo principal</span>
              <input
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Teléfono</span>
              <input
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Cargo o rol</span>
              <input
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                value={form.position}
                onChange={(event) => setForm((prev) => ({ ...prev, position: event.target.value }))}
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">Correo de recuperación</span>
              <input
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                value={form.recoveryEmail}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, recoveryEmail: event.target.value }))
                }
              />
            </label>

            <div className="md:col-span-2 flex items-center justify-between gap-3">
              {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : <div />}
              <Button type="submit">Guardar perfil</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Resumen de acceso</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-border p-4">
            <div className="text-xs text-muted-foreground">Empresa activa</div>
            <div className="mt-1 text-sm font-semibold">{currentTenant.name}</div>
          </div>
          <div className="rounded-2xl border border-border p-4">
            <div className="text-xs text-muted-foreground">Correo de acceso</div>
            <div className="mt-1 text-sm font-semibold">{userProfile?.email ?? 'Sin definir'}</div>
          </div>
          <div className="rounded-2xl border border-border p-4">
            <div className="text-xs text-muted-foreground">Rol actual</div>
            <div className="mt-1 text-sm font-semibold">Owner</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
