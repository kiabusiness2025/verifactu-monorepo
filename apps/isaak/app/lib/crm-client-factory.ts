// Factory: returns the right CrmClient for a tenant based on their active ExternalConnection.
// Supported providers: HubSpot (real), Salesforce + Pipedrive (stubs pending API access).

import { decryptHoldedSecret } from './holded-integration';
import type { CrmClient } from './crm-client';
import { prisma } from './prisma';

export type { CrmClient };

export const CRM_PROVIDERS = ['hubspot', 'salesforce', 'pipedrive'] as const;
export type CrmProvider = (typeof CRM_PROVIDERS)[number];

export class CrmNotConnectedError extends Error {
  constructor(public readonly tenantId: string) {
    super(`No CRM connected for tenant ${tenantId}`);
    this.name = 'CrmNotConnectedError';
  }
}

export async function getCrmClient(tenantId: string): Promise<CrmClient> {
  const conn = await prisma.externalConnection.findFirst({
    where: {
      tenantId,
      provider: { in: [...CRM_PROVIDERS] },
      connectionStatus: 'connected',
    },
    orderBy: { connectedAt: 'desc' },
  });

  if (!conn) throw new CrmNotConnectedError(tenantId);

  const apiKey = conn.apiKeyEnc ? decryptHoldedSecret(conn.apiKeyEnc) : '';
  switch (conn.provider) {
    case 'hubspot': {
      const { HubSpotCrmClient } = await import('./hubspot-crm-client');
      return new HubSpotCrmClient(apiKey);
    }
    case 'salesforce': {
      const { SalesforceCrmClient } = await import('./salesforce-crm-client');
      return new SalesforceCrmClient(apiKey);
    }
    case 'pipedrive': {
      const { PipedriveCrmClient } = await import('./pipedrive-crm-client');
      return new PipedriveCrmClient(apiKey);
    }
    default:
      throw new Error(`CRM provider ${conn.provider} not yet implemented`);
  }
}

export async function hasCrmConnected(tenantId: string): Promise<boolean> {
  const count = await prisma.externalConnection.count({
    where: {
      tenantId,
      provider: { in: [...CRM_PROVIDERS] },
      connectionStatus: 'connected',
    },
  });
  return count > 0;
}
