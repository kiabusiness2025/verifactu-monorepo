'use client';

import { useParams } from 'next/navigation';
import * as React from 'react';
import { useClientWorkspace } from '../../../../../src/account/useClientWorkspace';
import { useCurrentTenant } from '../../../../../src/tenant/useCurrentTenant';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../../../../../src/ui';

export default function SecuritySettingsPage() {
  const params = useParams();
  const routeTenantSlug = params.tenantSlug as string | undefined;
  const { currentTenant, userProfile, refreshUserProfile } = useCurrentTenant(routeTenantSlug);
  const { sessions, changeEmail, changePassword, closeSession, closeOtherSessions } =
    useClientWorkspace(userProfile, currentTenant.id);
  const [email, setEmail] = React.useState(userProfile?.email ?? '');
  const [password, setPassword] = React.useState('');
  const [feedback, setFeedback] = React.useState<string | null>(null);

  React.useEffect(() => {
    setEmail(userProfile?.email ?? '');
  }, [userProfile?.email]);

  const handleSecuritySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (email.trim()) {
      changeEmail(email.trim());
    }
    if (password.trim()) {
      changePassword();
      setPassword('');
    }
    refreshUserProfile();
    setFeedback('Datos de acceso actualizados.');
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Correo y contraseña</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSecuritySubmit}>
            <label className="space-y-2">
              <span className="text-sm font-medium">Cambiar correo</span>
              <input
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Nueva contraseña</span>
              <input
                type="password"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Introduce una nueva contraseña"
              />
            </label>
            <div className="md:col-span-2 flex items-center justify-between gap-3">
              {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : <div />}
              <Button type="submit">Guardar acceso</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Sesiones iniciadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-end">
            <Button variant="secondary" onClick={closeOtherSessions}>
              Cerrar otras sesiones
            </Button>
          </div>
          {sessions.map((session) => (
            <div
              key={session.id}
              className="rounded-2xl border border-border p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="text-sm font-semibold">{session.deviceLabel}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {session.current ? 'Sesión actual' : 'Sesión abierta'} · Última actividad:{' '}
                  {new Date(session.lastSeenAt).toLocaleString('es-ES')}
                </div>
              </div>
              <Button
                variant="secondary"
                disabled={session.current}
                onClick={() => closeSession(session.id)}
              >
                {session.current ? 'En uso' : 'Cerrar sesión'}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
