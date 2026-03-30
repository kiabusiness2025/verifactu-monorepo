import {
  decryptHoldedSecret,
  disconnectHoldedConnection as disconnectSharedHoldedConnection,
  encryptHoldedSecret,
  fetchHoldedSnapshot,
  getHoldedConnection as getSharedHoldedConnection,
  type HoldedConnectionChannel,
  maskSecret,
  probeHoldedConnection,
  saveHoldedConnection as saveSharedHoldedConnection,
  type HoldedConnectionRecord,
  type HoldedProbeResult,
} from '@verifactu/integrations';
import { prisma } from './prisma';

export {
  decryptHoldedSecret,
  encryptHoldedSecret,
  fetchHoldedSnapshot,
  maskSecret,
  probeHoldedConnection,
};

export type { HoldedConnectionRecord, HoldedProbeResult };
export type { HoldedConnectionChannel };

export async function saveHoldedConnection(input: {
  tenantId: string;
  apiKey: string;
  userId?: string | null;
  probe: HoldedProbeResult;
  channel?: HoldedConnectionChannel;
}) {
  return saveSharedHoldedConnection({
    prisma,
    ...input,
  });
}

export async function disconnectHoldedConnection(input: {
  tenantId: string;
  userId?: string | null;
  channel?: HoldedConnectionChannel;
}) {
  return disconnectSharedHoldedConnection({
    prisma,
    ...input,
  });
}

export async function getHoldedConnection(
  tenantId: string,
  channel?: HoldedConnectionChannel
): Promise<HoldedConnectionRecord | null> {
  return getSharedHoldedConnection({
    prisma,
    tenantId,
    channel,
  });
}
