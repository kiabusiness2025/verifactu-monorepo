import prisma from '@/lib/prisma';
import { getConfirmedCompanyNotificationEmail } from '@/lib/integrations/companyNotificationEmailStore';
import {
  buildConnectionStatusDto,
  buildDefaultAvailableActions,
  buildGovernanceFlags,
  type AccessRequestDTO,
  type ClaimCaseDTO,
  type ClaimResolutionDTO,
  type GovernanceFlagsDTO,
  type MembershipDTO,
  type MembershipRole,
  type MembershipSide,
  type RecipientDTO,
} from '@verifactu/integrations';

const OPEN_CLAIM_STATUSES = new Set([
  'submitted',
  'acknowledged',
  'under_review',
  'awaiting_response',
]);

type PrismaAny = typeof prisma & {
  externalConnection: any;
  connectionRecipient: any;
  accessRequest: any;
  claimCase: any;
  claimResolution: any;
  membership: any;
  user: any;
};

const prismaAny = prisma as PrismaAny;

function normalizeChannel(channel?: string | null) {
  return channel === 'chatgpt' ? 'chatgpt' : 'dashboard';
}

function normalizeEmail(value?: string | null) {
  const trimmed = value?.trim().toLowerCase();
  return trimmed || null;
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

function toMembershipDto(record: any): MembershipDTO {
  return {
    membershipId: record.id,
    userId: record.userId,
    name: record.user?.name ?? null,
    email: record.user?.email ?? '',
    role: (record.role ?? 'viewer') as MembershipRole,
    side: (record.side ?? null) as MembershipSide | null,
    status: (record.status ?? 'active') as any,
    invitedAt: record.createdAt?.toISOString?.() ?? null,
    confirmedAt: record.confirmedAt?.toISOString?.() ?? null,
  };
}

function toRecipientDto(record: any): RecipientDTO {
  return {
    recipientId: record.id,
    email: record.email,
    recipientType: record.recipientType,
    isMandatory: record.isMandatory === true,
    isClientSide: record.isClientSide === true,
    isConfirmed: record.isConfirmed === true,
    createdByUserId: record.createdByUserId ?? null,
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

export async function getTenantHoldedConnection(tenantId: string, channel?: string | null) {
  return prismaAny.externalConnection.findFirst({
    where: {
      tenantId,
      provider: 'holded',
      channelKey: normalizeChannel(channel),
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getTenantHoldedContext(tenantId: string, channel?: string | null) {
  const connection = await getTenantHoldedConnection(tenantId, channel);
  const governanceFlags = connection ? buildGovernanceFlags(connection) : null;
  const availableActions = buildDefaultAvailableActions({
    status: connection?.connectionStatus,
    underClaimReview: governanceFlags?.underClaimReview,
    clientAdminGap: governanceFlags?.clientAdminGap,
    highGovernanceRisk: governanceFlags?.highGovernanceRisk,
  });

  return {
    connection: connection
      ? buildConnectionStatusDto({
          connectionId: connection.id,
          tenantId,
          status: connection.connectionStatus,
          keyMasked: null,
          providerAccountId: connection.providerAccountId ?? null,
          connectedAt: connection.connectedAt?.toISOString?.() ?? null,
          lastValidatedAt: connection.lastValidatedAt?.toISOString?.() ?? null,
          lastSyncAt: connection.lastSyncAt?.toISOString?.() ?? null,
          lastError: connection.lastError ?? null,
          originChannel: connection.originChannel ?? connection.channelKey ?? null,
          supportedModules: connection.scopesGranted ?? [],
        })
      : null,
    governanceFlags,
    availableActions,
  };
}

async function ensureLegacyRecipientSeed(input: {
  tenantId: string;
  connectionId: string;
  userId?: string | null;
}) {
  const existingCount = await prismaAny.connectionRecipient.count({
    where: {
      connectionId: input.connectionId,
      disabledAt: null,
    },
  });

  if (existingCount > 0) {
    return;
  }

  const legacyEmail = await getConfirmedCompanyNotificationEmail(input.tenantId);
  const email = normalizeEmail(legacyEmail);
  if (!email) {
    return;
  }

  await prismaAny.connectionRecipient.create({
    data: {
      connectionId: input.connectionId,
      tenantId: input.tenantId,
      email,
      recipientType: 'client_contact',
      isMandatory: true,
      isClientSide: true,
      isConfirmed: true,
      createdByUserId: input.userId ?? null,
    },
  });
}

export async function listRecipients(input: {
  tenantId: string;
  userId?: string | null;
  channel?: string | null;
}) {
  const connection = await getTenantHoldedConnection(input.tenantId, input.channel);
  if (!connection) {
    return { connection: null, items: [] as RecipientDTO[] };
  }

  await ensureLegacyRecipientSeed({
    tenantId: input.tenantId,
    connectionId: connection.id,
    userId: input.userId ?? null,
  });

  const rows = await prismaAny.connectionRecipient.findMany({
    where: {
      connectionId: connection.id,
      disabledAt: null,
    },
    orderBy: [{ isMandatory: 'desc' }, { createdAt: 'asc' }],
  });

  return {
    connection,
    items: rows.map(toRecipientDto),
  };
}

export async function createRecipient(input: {
  tenantId: string;
  userId?: string | null;
  channel?: string | null;
  email: string;
  recipientType: string;
  isMandatory: boolean;
  isClientSide: boolean;
}) {
  const connection = await getTenantHoldedConnection(input.tenantId, input.channel);
  if (!connection) {
    throw new Error('holded_connection_not_found');
  }

  const email = normalizeEmail(input.email);
  if (!email) {
    throw new Error('invalid_email');
  }

  const existing = await prismaAny.connectionRecipient.findFirst({
    where: {
      connectionId: connection.id,
      email,
      recipientType: input.recipientType,
      disabledAt: null,
    },
  });

  if (existing) {
    return toRecipientDto(existing);
  }

  const created = await prismaAny.connectionRecipient.create({
    data: {
      connectionId: connection.id,
      tenantId: input.tenantId,
      email,
      recipientType: input.recipientType,
      isMandatory: input.isMandatory,
      isClientSide: input.isClientSide,
      isConfirmed: false,
      createdByUserId: input.userId ?? null,
    },
  });

  return toRecipientDto(created);
}

export async function updateRecipient(input: {
  tenantId: string;
  recipientId: string;
  recipientType?: string;
  isMandatory?: boolean;
  isClientSide?: boolean;
  isConfirmed?: boolean;
}) {
  const existing = await prismaAny.connectionRecipient.findFirst({
    where: {
      id: input.recipientId,
      tenantId: input.tenantId,
      disabledAt: null,
    },
  });

  if (!existing) {
    throw new Error('recipient_not_found');
  }

  const updated = await prismaAny.connectionRecipient.update({
    where: { id: input.recipientId },
    data: {
      recipientType: input.recipientType ?? undefined,
      isMandatory: input.isMandatory ?? undefined,
      isClientSide: input.isClientSide ?? undefined,
      isConfirmed: input.isConfirmed ?? undefined,
    },
  });

  return toRecipientDto(updated);
}

export async function removeRecipient(input: { tenantId: string; recipientId: string }) {
  const existing = await prismaAny.connectionRecipient.findFirst({
    where: {
      id: input.recipientId,
      tenantId: input.tenantId,
      disabledAt: null,
    },
  });

  if (!existing) {
    throw new Error('recipient_not_found');
  }

  if (existing.isMandatory) {
    const mandatoryCount = await prismaAny.connectionRecipient.count({
      where: {
        connectionId: existing.connectionId,
        disabledAt: null,
        isMandatory: true,
      },
    });
    if (mandatoryCount <= 1) {
      throw new Error('last_mandatory_recipient');
    }
  }

  await prismaAny.connectionRecipient.update({
    where: { id: input.recipientId },
    data: {
      disabledAt: new Date(),
    },
  });

  return { removed: true };
}

export async function listMemberships(tenantId: string) {
  const rows = await prismaAny.membership.findMany({
    where: { tenantId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [{ createdAt: 'asc' }],
  });

  return rows.map(toMembershipDto);
}

export async function inviteMembership(input: {
  tenantId: string;
  actorUserId?: string | null;
  email: string;
  role: MembershipRole;
  side?: MembershipSide | null;
}) {
  const email = normalizeEmail(input.email);
  if (!email) {
    throw new Error('invalid_email');
  }

  const user = await prismaAny.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    throw new Error('user_not_found');
  }

  const membership = await prismaAny.membership.upsert({
    where: {
      tenantId_userId: {
        tenantId: input.tenantId,
        userId: user.id,
      },
    },
    update: {
      role: input.role,
      side: input.side ?? undefined,
      status: 'invited',
      invitedBy: input.actorUserId ?? undefined,
      disabledAt: null,
    },
    create: {
      tenantId: input.tenantId,
      userId: user.id,
      role: input.role,
      side: input.side ?? null,
      status: 'invited',
      invitedBy: input.actorUserId ?? null,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return toMembershipDto(membership);
}

export async function updateMembership(input: {
  tenantId: string;
  membershipId: string;
  role?: MembershipRole;
  status?: 'active' | 'invited' | 'disabled';
}) {
  const existing = await prismaAny.membership.findFirst({
    where: { id: input.membershipId, tenantId: input.tenantId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!existing) {
    throw new Error('membership_not_found');
  }

  const updated = await prismaAny.membership.update({
    where: { id: input.membershipId },
    data: {
      role: input.role ?? undefined,
      status: input.status ?? undefined,
      disabledAt: input.status === 'disabled' ? new Date() : input.status ? null : undefined,
      confirmedAt: input.status === 'active' ? new Date() : undefined,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return toMembershipDto(updated);
}

export async function removeMembership(input: { tenantId: string; membershipId: string }) {
  const existing = await prismaAny.membership.findFirst({
    where: { id: input.membershipId, tenantId: input.tenantId },
  });

  if (!existing) {
    throw new Error('membership_not_found');
  }

  if (existing.role === 'company_admin' && existing.side === 'client') {
    const activeClientAdmins = await prismaAny.membership.count({
      where: {
        tenantId: input.tenantId,
        role: 'company_admin',
        side: 'client',
        status: { not: 'disabled' },
      },
    });
    if (activeClientAdmins <= 1) {
      throw new Error('last_company_admin');
    }
  }

  await prismaAny.membership.update({
    where: { id: input.membershipId },
    data: {
      status: 'disabled',
      disabledAt: new Date(),
    },
  });

  return { removed: true };
}

export async function listAccessRequests(input: { tenantId: string; channel?: string | null }) {
  const connection = await getTenantHoldedConnection(input.tenantId, input.channel);
  if (!connection) {
    return [] as AccessRequestDTO[];
  }

  const rows = await prismaAny.accessRequest.findMany({
    where: { connectionId: connection.id },
    include: {
      requesterUser: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  return rows.map(toAccessRequestDto);
}

export async function resolveAccessRequest(input: {
  tenantId: string;
  actorUserId?: string | null;
  accessRequestId: string;
  status: 'approved' | 'rejected';
}) {
  const existing = await prismaAny.accessRequest.findFirst({
    where: { id: input.accessRequestId, tenantId: input.tenantId },
    include: {
      requesterUser: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!existing) {
    throw new Error('access_request_not_found');
  }

  let membership: MembershipDTO | null = null;

  const updated = await prismaAny.accessRequest.update({
    where: { id: input.accessRequestId },
    data: {
      status: input.status,
      resolvedByUserId: input.actorUserId ?? null,
      resolvedAt: new Date(),
    },
    include: {
      requesterUser: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (input.status === 'approved') {
    const upserted = await prismaAny.membership.upsert({
      where: {
        tenantId_userId: {
          tenantId: input.tenantId,
          userId: existing.requesterUserId,
        },
      },
      update: {
        role: existing.requestedRole ?? 'viewer',
        status: 'active',
        side: 'client',
        confirmedAt: new Date(),
        disabledAt: null,
      },
      create: {
        tenantId: input.tenantId,
        userId: existing.requesterUserId,
        role: existing.requestedRole ?? 'viewer',
        status: 'active',
        side: 'client',
        invitedBy: input.actorUserId ?? null,
        confirmedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    membership = toMembershipDto(upserted);
  }

  return {
    accessRequest: toAccessRequestDto(updated),
    membership,
  };
}

function mapClaimReviewFlag(status: string) {
  return OPEN_CLAIM_STATUSES.has(status);
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

export async function listClaims(input: { tenantId: string; channel?: string | null }) {
  const connection = await getTenantHoldedConnection(input.tenantId, input.channel);
  if (!connection) {
    return [] as ClaimCaseDTO[];
  }

  const rows = await prismaAny.claimCase.findMany({
    where: { connectionId: connection.id },
    include: {
      createdByUser: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  return rows.map(toClaimDto);
}

export async function createClaim(input: {
  tenantId: string;
  actorUserId: string;
  channel?: string | null;
  claimType: 'control' | 'advisor_governance';
  reason: string;
  scope?: string | null;
}) {
  const connection = await getTenantHoldedConnection(input.tenantId, input.channel);
  if (!connection) {
    throw new Error('holded_connection_not_found');
  }

  const created = await prismaAny.claimCase.create({
    data: {
      connectionId: connection.id,
      tenantId: input.tenantId,
      createdByUserId: input.actorUserId,
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
      actorUserId: input.actorUserId,
      action: 'claim_created',
      previousStatus: null,
      nextStatus: 'submitted',
      notes: input.reason,
    },
  });

  await refreshConnectionClaimReview(connection.id);

  return toClaimDto(created);
}

export async function getClaimDetails(input: { tenantId: string; claimId: string }) {
  const claim = await prismaAny.claimCase.findFirst({
    where: { id: input.claimId, tenantId: input.tenantId },
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
    },
  });

  if (!claim) {
    throw new Error('claim_not_found');
  }

  return {
    claim: toClaimDto(claim),
    timeline: claim.resolutions.map(toClaimResolutionDto),
  };
}

export async function updateClaim(input: {
  tenantId: string;
  actorUserId?: string | null;
  claimId: string;
  status: string;
  resolutionNotes?: string | null;
  outcome?: string | null;
}) {
  const existing = await prismaAny.claimCase.findFirst({
    where: { id: input.claimId, tenantId: input.tenantId },
    include: {
      createdByUser: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!existing) {
    throw new Error('claim_not_found');
  }

  const updated = await prismaAny.claimCase.update({
    where: { id: input.claimId },
    data: {
      status: input.status,
      outcome: input.outcome ?? undefined,
      resolvedByUserId:
        mapClaimReviewFlag(input.status) || input.status === existing.status
          ? undefined
          : (input.actorUserId ?? null),
      resolvedAt:
        mapClaimReviewFlag(input.status) || input.status === existing.status
          ? undefined
          : new Date(),
    },
    include: {
      createdByUser: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  await prismaAny.claimResolution.create({
    data: {
      claimCaseId: input.claimId,
      actorUserId: input.actorUserId ?? null,
      action: 'claim_status_changed',
      previousStatus: existing.status,
      nextStatus: input.status,
      notes: input.resolutionNotes ?? null,
    },
  });

  await refreshConnectionClaimReview(existing.connectionId);

  return toClaimDto(updated);
}

export async function resetGovernanceOnDisconnect(input: {
  tenantId: string;
  connectionId?: string | null;
  channel?: string | null;
}) {
  const connection = input.connectionId
    ? await prismaAny.externalConnection.findFirst({
        where: {
          id: input.connectionId,
          tenantId: input.tenantId,
          provider: 'holded',
        },
      })
    : await getTenantHoldedConnection(input.tenantId, input.channel);

  if (!connection) {
    return {
      accessRequestsCancelled: 0,
      claimsClosed: 0,
      touchedConnection: false,
    };
  }

  const now = new Date();
  const openClaimStatuses = Array.from(OPEN_CLAIM_STATUSES);

  return prismaAny.$transaction(async (tx: any) => {
    const openAccessRequests = await tx.accessRequest.findMany({
      where: {
        connectionId: connection.id,
        status: { in: ['submitted', 'under_review'] },
      },
      select: { id: true },
    });

    const openClaims = await tx.claimCase.findMany({
      where: {
        connectionId: connection.id,
        status: { in: openClaimStatuses },
      },
      select: { id: true, status: true },
    });

    if (openAccessRequests.length > 0) {
      await tx.accessRequest.updateMany({
        where: { id: { in: openAccessRequests.map((item: { id: string }) => item.id) } },
        data: {
          status: 'cancelled',
          resolvedByUserId: null,
          resolvedAt: now,
        },
      });
    }

    if (openClaims.length > 0) {
      await tx.claimCase.updateMany({
        where: { id: { in: openClaims.map((item: { id: string }) => item.id) } },
        data: {
          status: 'closed',
          resolvedByUserId: null,
          resolvedAt: now,
          outcome: 'closed_by_disconnect',
        },
      });

      await tx.claimResolution.createMany({
        data: openClaims.map((claim: { id: string; status: string }) => ({
          claimCaseId: claim.id,
          actorUserId: null,
          action: 'claim_closed_by_disconnect',
          previousStatus: claim.status,
          nextStatus: 'closed',
          notes: 'Claim closed automatically after connector disconnect reset.',
          createdAt: now,
        })),
      });
    }

    await tx.externalConnection.update({
      where: { id: connection.id },
      data: {
        underClaimReview: false,
        governanceUpdatedAt: now,
      },
    });

    return {
      accessRequestsCancelled: openAccessRequests.length,
      claimsClosed: openClaims.length,
      touchedConnection: true,
    };
  });
}

export async function buildHoldedSummaries(input: { tenantId: string; channel?: string | null }) {
  const connection = await getTenantHoldedConnection(input.tenantId, input.channel);
  if (!connection) {
    return {
      membershipsSummary: null,
      recipientsSummary: null,
      claimsSummary: null,
      governanceFlags: null as GovernanceFlagsDTO | null,
      availableActions: buildDefaultAvailableActions({ status: 'disconnected' }),
    };
  }

  const [memberships, recipients, claims] = await Promise.all([
    prismaAny.membership.count({
      where: {
        tenantId: input.tenantId,
        status: { not: 'disabled' },
      },
    }),
    prismaAny.connectionRecipient.count({
      where: {
        connectionId: connection.id,
        disabledAt: null,
      },
    }),
    prismaAny.claimCase.count({
      where: {
        connectionId: connection.id,
        status: { in: Array.from(OPEN_CLAIM_STATUSES) },
      },
    }),
  ]);

  const governanceFlags = buildGovernanceFlags(connection);

  return {
    membershipsSummary: { total: memberships },
    recipientsSummary: { total: recipients },
    claimsSummary: { open: claims },
    governanceFlags,
    availableActions: buildDefaultAvailableActions({
      status: connection.connectionStatus,
      underClaimReview: governanceFlags.underClaimReview,
      clientAdminGap: governanceFlags.clientAdminGap,
      highGovernanceRisk: governanceFlags.highGovernanceRisk,
    }),
  };
}
