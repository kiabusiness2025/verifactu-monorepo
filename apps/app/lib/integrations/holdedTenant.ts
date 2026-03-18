import { resolveSharedHoldedConnectionForTenant } from '@/lib/integrations/holdedConnectionResolver';

export async function getHoldedApiKeyForTenant(tenantId: string) {
  const connection = await resolveSharedHoldedConnectionForTenant(tenantId);

  if (!connection) {
    return null;
  }

  return {
    apiKey: connection.apiKey,
    status: connection.status ?? null,
    source: connection.source,
    providerAccountId: connection.providerAccountId ?? null,
  };
}
