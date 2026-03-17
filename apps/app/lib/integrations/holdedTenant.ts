import { prisma } from '@/lib/prisma';
import { decryptIntegrationSecret } from '@/lib/integrations/secretCrypto';

export async function getHoldedApiKeyForTenant(tenantId: string) {
  const integration = await prisma.tenantIntegration.findUnique({
    where: {
      tenantId_provider: {
        tenantId,
        provider: 'accounting_api',
      },
    },
    select: {
      apiKeyEnc: true,
      status: true,
    },
  });

  if (!integration?.apiKeyEnc) {
    return null;
  }

  return {
    apiKey: decryptIntegrationSecret(integration.apiKeyEnc),
    status: integration.status ?? null,
  };
}
