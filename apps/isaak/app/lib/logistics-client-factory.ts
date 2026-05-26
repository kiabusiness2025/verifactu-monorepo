// Factory: returns the right LogisticsClient for a tenant based on their active ExternalConnection.

import { decryptHoldedSecret } from './holded-integration';
import type { LogisticsClient } from './logistics-client';
import { LOGISTICS_PROVIDERS } from './logistics-client';
import { prisma } from './prisma';

export type { LogisticsClient };

export class LogisticsNotConnectedError extends Error {
  constructor(public readonly tenantId: string) {
    super(`No logistics carrier connected for tenant ${tenantId}`);
    this.name = 'LogisticsNotConnectedError';
  }
}

export async function getLogisticsClient(tenantId: string): Promise<LogisticsClient> {
  const conn = await prisma.externalConnection.findFirst({
    where: {
      tenantId,
      provider: { in: [...LOGISTICS_PROVIDERS] },
      connectionStatus: 'connected',
    },
    orderBy: { connectedAt: 'desc' },
  });

  if (!conn) throw new LogisticsNotConnectedError(tenantId);

  const apiKey = conn.apiKeyEnc ? decryptHoldedSecret(conn.apiKeyEnc) : '';
  switch (conn.provider) {
    case 'correos': {
      const { CorreosLogisticsClient } = await import('./correos-logistics-client');
      return new CorreosLogisticsClient(apiKey);
    }
    case 'mrw': {
      const { MrwLogisticsClient } = await import('./mrw-logistics-client');
      return new MrwLogisticsClient(apiKey);
    }
    case 'seur': {
      const { SeurLogisticsClient } = await import('./seur-logistics-client');
      return new SeurLogisticsClient(apiKey);
    }
    case 'gls': {
      const { GlsLogisticsClient } = await import('./gls-logistics-client');
      return new GlsLogisticsClient(apiKey);
    }
    case 'dhl': {
      const { DhlLogisticsClient } = await import('./dhl-logistics-client');
      return new DhlLogisticsClient(apiKey);
    }
    case 'sendcloud': {
      const { SendcloudLogisticsClient } = await import('./sendcloud-logistics-client');
      return new SendcloudLogisticsClient(apiKey);
    }
    default:
      throw new Error(`Logistics provider ${conn.provider} not yet implemented`);
  }
}

export async function hasLogisticsConnected(tenantId: string): Promise<boolean> {
  const count = await prisma.externalConnection.count({
    where: {
      tenantId,
      provider: { in: [...LOGISTICS_PROVIDERS] },
      connectionStatus: 'connected',
    },
  });
  return count > 0;
}
