import {
  buildAccessRequestResolvedEmail,
  buildClaimCreatedEmail,
  buildClaimReceiptEmail,
  buildClaimResolvedEmail,
  buildHighGovernanceRiskInternalEmail,
} from '@verifactu/integrations';

import { sendCustomEmail } from '@/lib/email/emailService';
import { getPreferredFirstName, getPreferredFullName } from '@/lib/personName';
import prisma from '@/lib/prisma';

const SUPPORT_EMAIL =
  process.env.SUPPORT_NOTIFICATION_EMAIL?.trim().toLowerCase() || 'soporte@verifactu.business';

type PrismaAny = typeof prisma & {
  accessRequest: any;
  claimCase: any;
  connectionRecipient: any;
  membership: any;
  tenantProfile: any;
};

const prismaAny = prisma as PrismaAny;

function normalizeText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeEmail(value?: string | null) {
  return normalizeText(value)?.toLowerCase() ?? null;
}

function buildTenantDisplayName(args: {
  tenantName?: string | null;
  tenantLegalName?: string | null;
}) {
  const tenantName = normalizeText(args.tenantName) || 'tu empresa';
  const tenantLegalName = normalizeText(args.tenantLegalName);

  if (!tenantLegalName || tenantLegalName.toLowerCase() === tenantName.toLowerCase()) {
    return tenantName;
  }

  return `${tenantLegalName} (${tenantName})`;
}

function collectRecipientMap() {
  return new Map<string, { email: string; name: string | null }>();
}

function rememberRecipient(
  recipients: Map<string, { email: string; name: string | null }>,
  email?: string | null,
  name?: string | null
) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return;

  const current = recipients.get(normalizedEmail);
  recipients.set(normalizedEmail, {
    email: normalizedEmail,
    name: normalizeText(name) || current?.name || null,
  });
}

async function sendAllEmails(messages: Array<{ to: string; subject: string; html: string }>) {
  if (messages.length === 0) {
    return false;
  }

  const deliveries = await Promise.allSettled(
    messages.map((message) =>
      sendCustomEmail({
        to: message.to,
        subject: message.subject,
        html: message.html,
        senderProfile: 'holded',
      })
    )
  );

  return deliveries.every(
    (result) => result.status === 'fulfilled' && result.value?.success === true
  );
}

async function resolveTenantReviewRecipients(input: { tenantId: string; connectionId: string }) {
  const [memberships, recipients, tenantProfile] = await Promise.all([
    prismaAny.membership.findMany({
      where: {
        tenantId: input.tenantId,
        status: { not: 'disabled' },
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    prismaAny.connectionRecipient.findMany({
      where: {
        connectionId: input.connectionId,
        disabledAt: null,
      },
    }),
    prismaAny.tenantProfile.findUnique({
      where: { tenantId: input.tenantId },
      select: { email: true },
    }),
  ]);

  const result = collectRecipientMap();

  for (const membership of memberships) {
    const fullName = getPreferredFullName({
      fullName:
        normalizeText(membership.user?.name) ||
        [membership.user?.firstName, membership.user?.lastName].filter(Boolean).join(' '),
      email: membership.user?.email ?? null,
      fallback: 'equipo',
    });
    rememberRecipient(result, membership.user?.email ?? null, fullName);
  }

  for (const recipient of recipients) {
    rememberRecipient(result, recipient.email, null);
  }

  rememberRecipient(result, tenantProfile?.email ?? null, null);
  rememberRecipient(result, SUPPORT_EMAIL, 'Soporte Verifactu');

  return Array.from(result.values());
}

export async function sendAccessRequestResolvedEmails(input: { accessRequestId: string }) {
  const accessRequest = await prismaAny.accessRequest.findUnique({
    where: { id: input.accessRequestId },
    include: {
      requesterUser: {
        select: {
          email: true,
          name: true,
          firstName: true,
          lastName: true,
        },
      },
      tenant: {
        select: {
          name: true,
          legalName: true,
        },
      },
    },
  });

  if (!accessRequest) {
    return false;
  }

  const requesterEmail = normalizeEmail(accessRequest.requesterUser?.email);
  if (!requesterEmail) {
    return false;
  }

  const requesterName = getPreferredFirstName({
    fullName:
      normalizeText(accessRequest.requesterUser?.name) ||
      [accessRequest.requesterUser?.firstName, accessRequest.requesterUser?.lastName]
        .filter(Boolean)
        .join(' '),
    email: requesterEmail,
    fallback: 'equipo',
  });
  const tenantDisplayName = buildTenantDisplayName({
    tenantName: accessRequest.tenant?.name,
    tenantLegalName: accessRequest.tenant?.legalName,
  });
  const email = buildAccessRequestResolvedEmail({
    requesterName,
    tenantDisplayName,
    status: accessRequest.status,
    requestedRole: accessRequest.requestedRole ?? null,
  });

  return sendAllEmails([{ to: requesterEmail, subject: email.subject, html: email.html }]);
}

export async function sendClaimCreatedEmails(input: { claimId: string }) {
  const claim = await prismaAny.claimCase.findUnique({
    where: { id: input.claimId },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          legalName: true,
        },
      },
      createdByUser: {
        select: {
          email: true,
          name: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!claim?.tenant) {
    return false;
  }

  const requesterEmail = normalizeEmail(claim.createdByUser?.email);
  const requesterFullName = getPreferredFullName({
    fullName:
      normalizeText(claim.createdByUser?.name) ||
      [claim.createdByUser?.firstName, claim.createdByUser?.lastName].filter(Boolean).join(' '),
    email: requesterEmail,
    fallback: 'equipo',
  });
  const requesterFirstName = getPreferredFirstName({
    fullName: requesterFullName,
    email: requesterEmail,
    fallback: 'equipo',
  });
  const tenantDisplayName = buildTenantDisplayName({
    tenantName: claim.tenant.name,
    tenantLegalName: claim.tenant.legalName,
  });
  const reviewRecipients = await resolveTenantReviewRecipients({
    tenantId: claim.tenantId,
    connectionId: claim.connectionId,
  });

  const messages: Array<{ to: string; subject: string; html: string }> = [];

  if (requesterEmail) {
    const receipt = buildClaimReceiptEmail({
      requesterName: requesterFirstName,
      tenantDisplayName,
      claimType: claim.claimType,
    });
    messages.push({ to: requesterEmail, subject: receipt.subject, html: receipt.html });
  }

  const adminMessage = buildClaimCreatedEmail({
    tenantDisplayName,
    requesterName: requesterFullName,
    requesterEmail: requesterEmail ?? 'sin-email',
    claimType: claim.claimType,
    reason: claim.reason,
    scope: claim.scope ?? null,
    createdAt: claim.createdAt,
  });

  for (const recipient of reviewRecipients) {
    if (recipient.email === requesterEmail) continue;
    messages.push({ to: recipient.email, subject: adminMessage.subject, html: adminMessage.html });
  }

  return sendAllEmails(messages);
}

export async function sendClaimResolvedEmails(input: {
  claimId: string;
  resolutionNotes?: string | null;
}) {
  const claim = await prismaAny.claimCase.findUnique({
    where: { id: input.claimId },
    include: {
      tenant: {
        select: {
          name: true,
          legalName: true,
        },
      },
      createdByUser: {
        select: {
          email: true,
          name: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!claim) {
    return false;
  }

  const requesterEmail = normalizeEmail(claim.createdByUser?.email);
  if (!requesterEmail) {
    return false;
  }

  const requesterName = getPreferredFirstName({
    fullName:
      normalizeText(claim.createdByUser?.name) ||
      [claim.createdByUser?.firstName, claim.createdByUser?.lastName].filter(Boolean).join(' '),
    email: requesterEmail,
    fallback: 'equipo',
  });
  const tenantDisplayName = buildTenantDisplayName({
    tenantName: claim.tenant?.name,
    tenantLegalName: claim.tenant?.legalName,
  });
  const email = buildClaimResolvedEmail({
    requesterName,
    tenantDisplayName,
    status: claim.status,
    claimType: claim.claimType,
    outcome: claim.outcome ?? null,
    resolutionNotes: input.resolutionNotes ?? null,
  });

  return sendAllEmails([{ to: requesterEmail, subject: email.subject, html: email.html }]);
}

export async function sendHighGovernanceRiskInternalAlertEmail(input: {
  tenantName?: string | null;
  tenantLegalName?: string | null;
  channel?: 'dashboard' | 'chatgpt' | null;
  actorName?: string | null;
  actorEmail?: string | null;
  companyEmail?: string | null;
  contactPhone?: string | null;
  ownershipStatus?: string | null;
  managedByThirdParty?: boolean;
  clientAdminGap?: boolean;
  underClaimReview?: boolean;
  detectedAt?: Date | string | null;
  reviewUrl?: string | null;
}) {
  const tenantDisplayName = buildTenantDisplayName({
    tenantName: input.tenantName,
    tenantLegalName: input.tenantLegalName,
  });
  const email = buildHighGovernanceRiskInternalEmail({
    tenantDisplayName,
    channel: input.channel,
    actorName: input.actorName,
    actorEmail: input.actorEmail,
    companyEmail: input.companyEmail,
    contactPhone: input.contactPhone,
    ownershipStatus: input.ownershipStatus,
    managedByThirdParty: input.managedByThirdParty,
    clientAdminGap: input.clientAdminGap,
    underClaimReview: input.underClaimReview,
    detectedAt: input.detectedAt,
    reviewUrl: input.reviewUrl,
  });

  return sendAllEmails([{ to: SUPPORT_EMAIL, subject: email.subject, html: email.html }]);
}
