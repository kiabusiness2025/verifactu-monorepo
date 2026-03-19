'use client';

import { useParams } from 'next/navigation';
import { useClientWorkspace } from '../../../../../src/account/useClientWorkspace';
import { useCurrentTenant } from '../../../../../src/tenant/useCurrentTenant';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../../../../../src/ui';

export default function IntegrationsSettingsPage() {
  const params = useParams();
  const routeTenantSlug = params.tenantSlug as string | undefined;
  const { currentTenant, userProfile } = useCurrentTenant(routeTenantSlug);
  const { integrations, toggleIntegration } = useClientWorkspace(userProfile, currentTenant.id);

  return (
    <div className="space-y-6">
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Integraciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {integrations.map((integration) => (
            <div
              key={integration.id}
              className="rounded-2xl border border-border p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="text-sm font-semibold">{integration.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{integration.description}</div>
                <div className="text-xs text-muted-foreground mt-2">
                  {integration.connected && integration.connectedAt
                    ? `Conectada el ${new Date(integration.connectedAt).toLocaleString('es-ES')}`
                    : 'No conectada'}
                </div>
              </div>
              <Button
                variant={integration.connected ? 'secondary' : 'primary'}
                onClick={() => toggleIntegration(integration.id)}
              >
                {integration.connected ? 'Desconectar' : 'Conectar'}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
