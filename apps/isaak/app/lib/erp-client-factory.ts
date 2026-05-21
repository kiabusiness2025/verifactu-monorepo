// Factory: returns the right ErpClient for a tenant based on their active ExternalConnection.

import { decryptHoldedSecret, getHoldedConnection } from './holded-integration';

// Note: HoldedConnectionRecord.apiKey is already decrypted by getHoldedConnection.
// decryptHoldedSecret is still used for a3innuva subscriptionKey stored in apiKeyEnc.
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

export async function getErpClient(tenantId: string): Promise<ErpClient> {
  // 1. Try Holded (current sole provider)
  const holdedConn = await getHoldedConnection(tenantId);
  if (holdedConn?.apiKey) {
    return new HoldedErpClient(holdedConn.apiKey);
  }

  // 2. Try other providers stored in ExternalConnection (P3-4-A/B: Sage, a3innuva)
  const conn = await prisma.externalConnection.findFirst({
    where: {
      tenantId,
      provider: { in: ['sage_200c', 'a3innuva', 'hotelgest', 'chift'] },
      connectionStatus: 'connected',
    },
    orderBy: { connectedAt: 'desc' },
  });

  if (conn) {
    // Lazy-loaded to avoid bundling OAuth clients when not needed
    switch (conn.provider) {
      case 'sage_200c': {
        const { SageErpClient } = await import('./sage-erp-client');
        const { getErpOAuthToken } = await import('./erp-oauth-tokens');
        const token = await getErpOAuthToken(conn.id);
        return new SageErpClient(token);
      }
      case 'a3innuva': {
        const { A3ErpClient } = await import('./a3-erp-client');
        const { getErpOAuthToken } = await import('./erp-oauth-tokens');
        const token = await getErpOAuthToken(conn.id);
        const subscriptionKey = conn.apiKeyEnc ? decryptHoldedSecret(conn.apiKeyEnc) : '';
        return new A3ErpClient(token, subscriptionKey);
      }
      case 'hotelgest': {
        const { HotelgestErpClient } = await import('./hotelgest-erp-client');
        const apiKey = conn.apiKeyEnc ? decryptHoldedSecret(conn.apiKeyEnc) : '';
        return new HotelgestErpClient(apiKey);
      }
      case 'chift': {
        const { ChiftErpClient } = await import('./chift-erp-client');
        const consumerId = conn.apiKeyEnc ? decryptHoldedSecret(conn.apiKeyEnc) : '';
        return new ChiftErpClient(consumerId);
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
      provider: { in: ['sage_200c', 'a3innuva', 'hotelgest', 'chift'] },
      connectionStatus: 'connected',
    },
  });
  return count > 0;
}
