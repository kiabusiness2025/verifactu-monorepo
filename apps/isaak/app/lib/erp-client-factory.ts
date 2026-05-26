// Factory: returns the right ErpClient for a tenant based on their active ExternalConnection.
// Supported providers: Holded (direct API), sector-specific software (HotelGest, Revo, Loyverse, WooCommerce, PrestaShop, Mindbody, Inmovilla, Nubimed…)

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

const SECTOR_PROVIDERS = [
  'hotelgest',
  'revo',
  'loyverse',
  'woocommerce',
  'prestashop',
  'mindbody',
  'inmovilla',
  'nubimed',
] as const;

export async function getErpClient(tenantId: string): Promise<ErpClient> {
  // 1. Holded (legacy — existing clients)
  const holdedConn = await getHoldedConnection(tenantId);
  if (holdedConn?.apiKey) {
    return new HoldedErpClient(holdedConn.apiKey);
  }

  // 2. Sector-specific software connectors
  const conn = await prisma.externalConnection.findFirst({
    where: {
      tenantId,
      provider: { in: [...SECTOR_PROVIDERS] },
      connectionStatus: 'connected',
    },
    orderBy: { connectedAt: 'desc' },
  });

  if (conn) {
    const apiKey = conn.apiKeyEnc ? decryptHoldedSecret(conn.apiKeyEnc) : '';
    switch (conn.provider) {
      case 'hotelgest': {
        const { HotelgestErpClient } = await import('./hotelgest-erp-client');
        return new HotelgestErpClient(apiKey);
      }
      case 'revo': {
        const { RevoErpClient } = await import('./revo-erp-client');
        return new RevoErpClient(apiKey);
      }
      case 'loyverse': {
        const { LoyverseErpClient } = await import('./loyverse-erp-client');
        return new LoyverseErpClient(apiKey);
      }
      case 'woocommerce': {
        const { WooCommerceErpClient } = await import('./woocommerce-erp-client');
        return new WooCommerceErpClient(apiKey);
      }
      case 'prestashop': {
        const { PrestaShopErpClient } = await import('./prestashop-erp-client');
        return new PrestaShopErpClient(apiKey);
      }
      case 'mindbody': {
        const { MindbodyErpClient } = await import('./mindbody-erp-client');
        return new MindbodyErpClient(apiKey);
      }
      // Inmovilla, Nubimed — stubs pending API docs
      default:
        throw new Error(`Sector provider ${conn.provider} not yet implemented`);
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
      provider: { in: [...SECTOR_PROVIDERS] },
      connectionStatus: 'connected',
    },
  });
  return count > 0;
}
