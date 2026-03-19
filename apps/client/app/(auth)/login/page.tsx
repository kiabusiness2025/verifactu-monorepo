'use client';

import { Button, Card, CardContent, CardHeader, CardTitle } from '../../../src/ui';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { isFirebaseConfigComplete } from '../../../lib/firebase';
import { signInWithGoogle, type WorkspaceApiResponse } from '../../../src/auth/session';
import { getDefaultClientTenantSlug } from '../../../src/tenant/useCurrentTenant';

export default function LoginPage() {
  const router = useRouter();
  const nextTenantSlug = getDefaultClientTenantSlug();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleGoogleAccess = async () => {
    setPending(true);
    setError(null);

    try {
      const workspace = await signInWithGoogle();
      const nextSlug = (workspace as WorkspaceApiResponse | null)?.tenants?.find(
        (tenant) => tenant.id === workspace?.activeTenantId
      )?.slug;
      if (nextSlug) {
        router.replace(`/t/${nextSlug}/dashboard`);
        return;
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo completar el acceso.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-soft">
        <CardHeader>
          <CardTitle>Acceso al panel cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Continúa con tu cuenta para entrar en Verifactu Business y abrir tu empresa activa.
          </p>
          <Button
            className="w-full"
            onClick={handleGoogleAccess}
            disabled={pending || !isFirebaseConfigComplete}
          >
            {pending ? 'Conectando cuenta…' : 'Entrar con Google'}
          </Button>
          {!isFirebaseConfigComplete ? (
            <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Firebase no está configurado en este entorno. Puedes seguir con el modo local
              temporal.
            </div>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => router.push(`/t/${nextTenantSlug}/dashboard`)}
          >
            Entrar en modo local
          </Button>
          <p className="text-xs text-muted-foreground">
            Si el popup no está disponible, el acceso continuará mediante redirección y se retomará
            al volver.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
