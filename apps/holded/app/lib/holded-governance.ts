import { createHash } from 'crypto';
import {
  buildDefaultAvailableActions,
  buildDefaultDuplicateConflict,
  buildGovernanceFlags,
  type AccessRequestDTO,
  type ClaimCaseDTO,
  type ClaimResolutionDTO,
  type DuplicateConflictDTO,
  type MembershipRole,
} from '@verifactu/integrations';
import { prisma } from './prisma';

const OPEN_ACCESS_REQUEST_STATUSES = ['submitted', 'under_review'] as const;
const OPEN_CLAIM_STATUSES = [
  'submitted',
  'acknowledged',
  'under_review',
  'awaiting_response',
] as const;

type PrismaAny = typeof prisma & {
  externalConnection: any;
  accessRequest: any;
  claimCase: any;
  claimResolution: any;
};

const prismaAny = prisma as PrismaAny;

function normalizeChannel(channel?: string | null) {
  return channel === 'chatgpt' ? 'chatgpt' : 'dashboard';
}

function buildApiKeyFingerprint(apiKey: string) {
  return createHash('sha256').update(apiKey.trim()).digest('hex').slice(0, 24);
}

function toLightweightActor(
  user?: { id?: string | null; name?: string | null; email?: string | null } | null
) {
  return {
    userId: user?.id ?? null,
    name: user?.name ?? null,
    email: user?.email ?? null,
  };
}

function toAccessRequestDto(record: any): AccessRequestDTO {
  return {
    requestId: record.id,
    connectionId: record.connectionId,
    requester: toLightweightActor(record.requesterUser),
    status: record.status,
    requestedRole: record.requestedRole ?? null,
    message: record.message ?? null,
    createdAt: record.createdAt?.toISOString?.() ?? new Date().toISOString(),
    resolvedAt: record.resolvedAt?.toISOString?.() ?? null,
  };
}

function toClaimDto(record: any): ClaimCaseDTO {
  return {
    claimId: record.id,
    connectionId: record.connectionId,
    claimType: record.claimType,
    status: record.status,
    reason: record.reason,
    scope: record.scope ?? null,
    requiresInternalReview: record.requiresInternalReview === true,
    createdBy: toLightweightActor(record.createdByUser),
    createdAt: record.createdAt?.toISOString?.() ?? new Date().toISOString(),
    resolvedAt: record.resolvedAt?.toISOString?.() ?? null,
    outcome: record.outcome ?? null,
  };
}

function toClaimResolutionDto(record: any): ClaimResolutionDTO {
  return {
    resolutionId: record.id,
    action: record.action,
    previousStatus: record.previousStatus ?? null,
    nextStatus: record.nextStatus,
    notes: record.notes ?? null,
    createdAt: record.createdAt?.toISOString?.() ?? new Date().toISOString(),
    actor: record.actorUser ? toLightweightActor(record.actorUser) : null,
  };
}

async function refreshConnectionClaimReview(connectionId: string) {
  const openClaims = await prismaAny.claimCase.count({
    where: {
      connectionId,
      status: { in: Array.from(OPEN_CLAIM_STATUSES) },
    },
  });

  await prismaAny.externalConnection.update({
    where: { id: connectionId },
    data: {
      underClaimReview: openClaims > 0,
      governanceUpdatedAt: new Date(),
    },
  });
}

export async function detectPublicDuplicateConflict(input: {
  tenantId: string;
  apiKey: string;
  channel?: string | null;
}): Promise<DuplicateConflictDTO> {
  const fingerprint = buildApiKeyFingerprint(input.apiKey);
  const channel = normalizeChannel(input.channel);
  const currentTenantConnection = await prismaAny.externalConnection.findFirst({
    where: {
      tenantId: input.tenantId,
      provider: 'holded',
      channelKey: channel,
      providerAccountId: fingerprint,
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (currentTenantConnection) {
    return {
      exists: true,
      connectionId: currentTenantConnection.id,
      tenantId: currentTenantConnection.tenantId,
      providerAccountId: currentTenantConnection.providerAccountId ?? fingerprint,
      userHasAccess: true,
      canRequestAccess: false,
      canOpenClaim: false,
      reason: 'Esta empresa ya esta conectada para tu tenant actual.',
    };
  }

  const conflictingConnection = await prismaAny.externalConnection.findFirst({
    where: {
      provider: 'holded',
      providerAccountId: fingerprint,
      tenantId: { not: input.tenantId },
      connectionStatus: { not: 'disconnected' },
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (!conflictingConnection) {
    return buildDefaultDuplicateConflict();
  }

  return {
    exists: true,
    connectionId: conflictingConnection.id,
    tenantId: conflictingConnection.tenantId,
    providerAccountId: conflictingConnection.providerAccountId ?? fingerprint,
    userHasAccess: false,
    canRequestAccess: true,
    canOpenClaim: true,
    reason:
      'Esta empresa ya esta conectada en otra organizacion. Puedes solicitar acceso o abrir una reclamacion.',
  };
}

export async function createPublicAccessRequest(input: {
  requesterUserId: string;
  connectionId: string;
  requestedRole?: MembershipRole | null;
  message?: string | null;
}) {
  const connection = await prismaAny.externalConnection.findUnique({
    where: { id: input.connectionId },
    include: {
      tenant: {
        select: { id: true },
      },
    },
  });

  if (!connection) {
    throw new Error('connection_not_found');
  }

  const existing = await prismaAny.accessRequest.findFirst({
    where: {
      connectionId: input.connectionId,
      requesterUserId: input.requesterUserId,
      status: { in: Array.from(OPEN_ACCESS_REQUEST_STATUSES) },
    },
    include: {
      requesterUser: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (existing) {
    return toAccessRequestDto(existing);
  }

  const created = await prismaAny.accessRequest.create({
    data: {
      connectionId: connection.id,
      tenantId: connection.tenantId,
      requesterUserId: input.requesterUserId,
      status: 'submitted',
      requestedRole: input.requestedRole ?? 'viewer',
      message: input.message ?? null,
    },
    include: {
      requesterUser: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return toAccessRequestDto(created);
}

export async function createPublicClaim(input: {
  requesterUserId: string;
  connectionId: string;
  claimType: 'control' | 'advisor_governance';
  reason: string;
  scope?: string | null;
}) {
  const connection = await prismaAny.externalConnection.findUnique({
    where: { id: input.connectionId },
  });

  if (!connection) {
    throw new Error('connection_not_found');
  }

  const existing = await prismaAny.claimCase.findFirst({
    where: {
      connectionId: connection.id,
      claimType: input.claimType,
      status: { in: Array.from(OPEN_CLAIM_STATUSES) },
    },
    include: {
      createdByUser: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (existing) {
    return toClaimDto(existing);
  }

  const created = await prismaAny.claimCase.create({
    data: {
      connectionId: connection.id,
      tenantId: connection.tenantId,
      createdByUserId: input.requesterUserId,
      claimType: input.claimType,
      status: 'submitted',
      reason: input.reason,
      scope: input.scope ?? null,
      requiresInternalReview: true,
    },
    include: {
      createdByUser: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  await prismaAny.claimResolution.create({
    data: {
      claimCaseId: created.id,
      actorUserId: input.requesterUserId,
      action: 'claim_created',
      previousStatus: null,
      nextStatus: 'submitted',
      notes: input.reason,
    },
  });

  await refreshConnectionClaimReview(connection.id);

  return toClaimDto(created);
}

export async function getPublicClaimDetails(input: {
  requesterUserId: string;
  tenantId: string;
  claimId: string;
}) {
  const claim = await prismaAny.claimCase.findFirst({
    where: {
      id: input.claimId,
      OR: [{ createdByUserId: input.requesterUserId }, { tenantId: input.tenantId }],
    },
    include: {
      createdByUser: {
        select: { id: true, name: true, email: true },
      },
      resolutions: {
        include: {
          actorUser: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      externalConnection: true,
    },
  });

  if (!claim) {
    throw new Error('claim_not_found');
  }

  const governanceFlags = buildGovernanceFlags(claim.externalConnection);
  const availableActions = buildDefaultAvailableActions({
    status: claim.externalConnection?.connectionStatus,
    underClaimReview: governanceFlags.underClaimReview,
    clientAdminGap: governanceFlags.clientAdminGap,
    highGovernanceRisk: governanceFlags.highGovernanceRisk,
  });

  return {
    claim: toClaimDto(claim),
    timeline: claim.resolutions.map(toClaimResolutionDto),
    availableActions,
  };
}
