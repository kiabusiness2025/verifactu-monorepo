import {
  buildHoldedProbeSummary,
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
  type HoldedProbeModuleDiagnostic,
  type HoldedProbeSummary,
  type HoldedProbeResult,
  type HoldedSupportedModule,
} from '@verifactu/integrations';
import { prisma } from './prisma';

export {
  buildHoldedProbeSummary,
  decryptHoldedSecret,
  encryptHoldedSecret,
  fetchHoldedSnapshot,
  maskSecret,
  probeHoldedConnection,
};

export type {
  HoldedConnectionRecord,
  HoldedProbeModuleDiagnostic,
  HoldedProbeResult,
  HoldedProbeSummary,
  HoldedSupportedModule,
};
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
