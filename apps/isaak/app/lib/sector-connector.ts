// Generic API-key connector for sector software (HotelGest, Revo, Loyverse, etc.)
// Uses ExternalConnection model — same encryption as Holded (AES-256-GCM via HOLDED_KEY_SECRET).

import { decryptHoldedSecret, encryptHoldedSecret, maskSecret } from './holded-integration';
import { prisma } from './prisma';

export const SECTOR_PROVIDERS = [
  'hotelgest',
  'revo',
  'inmovilla',
  'nubimed',
  'loyverse',
  'woocommerce',
  'prestashop',
  'mindbody',
  'teamup',
  'gesden',
  'glofox',
] as const;

export type SectorProvider = (typeof SECTOR_PROVIDERS)[number];

export function isSectorProvider(p: string): p is SectorProvider {
  return (SECTOR_PROVIDERS as readonly string[]).includes(p);
}

export type SectorConnectionStatus = {
  connected: boolean;
  keyMasked: string | null;
  connectedAt: string | null;
  lastValidatedAt: string | null;
};

export async function getSectorStatus(
  tenantId: string,
  provider: SectorProvider
): Promise<SectorConnectionStatus> {
  const conn = await prisma.externalConnection
    .findFirst({
      where: { tenantId, provider, connectionStatus: 'connected', channelKey: 'dashboard' },
      select: { apiKeyEnc: true, connectedAt: true, lastValidatedAt: true },
    })
    .catch(() => null);

  if (!conn) return { connected: false, keyMasked: null, connectedAt: null, lastValidatedAt: null };

  const raw = conn.apiKeyEnc ? decryptHoldedSecret(conn.apiKeyEnc) : '';
  return {
    connected: true,
    keyMasked: raw ? maskSecret(raw) : null,
    connectedAt: conn.connectedAt?.toISOString() ?? null,
    lastValidatedAt: conn.lastValidatedAt?.toISOString() ?? null,
  };
}

export async function connectSector(
  tenantId: string,
  userId: string,
  provider: SectorProvider,
  apiKey: string
): Promise<void> {
  const apiKeyEnc = encryptHoldedSecret(apiKey);

  const existing = await prisma.externalConnection.findFirst({
    where: { tenantId, provider, channelKey: 'dashboard' },
    select: { id: true },
  });

  if (existing) {
    await prisma.externalConnection.update({
      where: { id: existing.id },
      data: {
        apiKeyEnc,
        connectionStatus: 'connected',
        connectedAt: new Date(),
        connectedByUserId: userId,
        disconnectedAt: null,
        lastError: null,
      },
    });
  } else {
    await prisma.externalConnection.create({
      data: {
        tenantId,
        provider,
        channelKey: 'dashboard',
        credentialType: 'api_key',
        apiKeyEnc,
        connectionStatus: 'connected',
        connectedAt: new Date(),
        connectedByUserId: userId,
      },
    });
  }
}

export async function disconnectSector(tenantId: string, provider: SectorProvider): Promise<void> {
  await prisma.externalConnection.updateMany({
    where: { tenantId, provider, channelKey: 'dashboard', connectionStatus: 'connected' },
    data: {
      connectionStatus: 'disconnected',
      disconnectedAt: new Date(),
      apiKeyEnc: null,
      lastError: null,
    },
  });
}
