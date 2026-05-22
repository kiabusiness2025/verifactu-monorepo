// Factory: returns the right ErpClient for a tenant based on their active ExternalConnection.
// Supported providers: Holded (direct API), Chift (covers Sage, Xero, QuickBooks, Cegid, +40 ERPs),
// Hotelgest (hotel management).

import { decryptHoldedSecret, getHoldedConnection } from './holded-integration';
import { HoldedErpClient } from './holded-erp-client';
import type { ErpClient } from './erp-client';
import { prisma } from './prisma';

export type { ErpClient };

export class ErpNotConnectedError extends Error {
  constructor(public readonly tenantId: string) {
    super(`No ERP connection for tenant ${tenantId}`);
    this.name = 'ErpNotConnectedError';
  }
}

const SECONDARY_PROVIDERS = ['hotelgest', 'chift'] as const;

export async function getErpClient(tenantId: string): Promise<ErpClient> {
  // 1. Holded (most common)
  const holdedConn = await getHoldedConnection(tenantId);
  if (holdedConn?.apiKey) {
    return new HoldedErpClient(holdedConn.apiKey);
  }

  // 2. Other providers (Chift = universal connector for Sage/Xero/QB/Cegid/…, Hotelgest)
  const conn = await prisma.externalConnection.findFirst({
    where: {
      tenantId,
      provider: { in: [...SECONDARY_PROVIDERS] },
      connectionStatus: 'connected',
    },
    orderBy: { connectedAt: 'desc' },
  });

  if (conn) {
    switch (conn.provider) {
      case 'chift': {
        const { ChiftErpClient } = await import('./chift-erp-client');
        const consumerId = conn.apiKeyEnc ? decryptHoldedSecret(conn.apiKeyEnc) : '';
        return new ChiftErpClient(consumerId);
      }
      case 'hotelgest': {
        const { HotelgestErpClient } = await import('./hotelgest-erp-client');
        const apiKey = conn.apiKeyEnc ? decryptHoldedSecret(conn.apiKeyEnc) : '';
        return new HotelgestErpClient(apiKey);
      }
    }
  }

  throw new ErpNotConnectedError(tenantId);
}

// Returns true when any ERP is connected — cheaper than getErpClient for guard checks.
export async function hasErpConnected(tenantId: string): Promise<boolean> {
  const holded = await getHoldedConnection(tenantId);
  if (holded?.apiKey) return true;

  const count = await prisma.externalConnection.count({
    where: {
      tenantId,
      provider: { in: [...SECONDARY_PROVIDERS] },
      connectionStatus: 'connected',
    },
  });
  return count > 0;
}
