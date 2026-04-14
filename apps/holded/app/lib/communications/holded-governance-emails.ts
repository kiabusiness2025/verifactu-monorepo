import {
  buildAccessRequestCreatedEmail,
  buildAccessRequestReceiptEmail,
  buildClaimCreatedEmail,
  buildClaimReceiptEmail,
  buildHighGovernanceRiskInternalEmail,
} from '@verifactu/integrations';

import { sendHoldedNotificationEmail } from './holded-email-service';
import { prisma } from '../prisma';

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

function pickDisplayName(args: { name?: string | null; email?: string | null }) {
  const name = normalizeText(args.name);
  if (name) {
    return name;
  }

  const email = normalizeEmail(args.email);
  if (email) {
    return email.split('@')[0] || 'equipo';
  }

  return 'equipo';
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

  const result = new Map<string, { email: string; name: string | null }>();

  for (const membership of memberships) {
    const fullName =
      normalizeText(membership.user?.name) ||
      [membership.user?.firstName, membership.user?.lastName].filter(Boolean).join(' ') ||
      null;
    rememberRecipient(result, membership.user?.email ?? null, fullName);
  }

  for (const recipient of recipients) {
    rememberRecipient(result, recipient.email, null);
  }

  rememberRecipient(result, tenantProfile?.email ?? null, null);
  rememberRecipient(result, SUPPORT_EMAIL, 'Soporte Verifactu');

  return Array.from(result.values());
}

async function sendAllEmails(messages: Array<{ to: string; subject: string; html: string }>) {
  if (messages.length === 0) {
    return false;
  }

  const results = await Promise.allSettled(
    messages.map((message) =>
      sendHoldedNotificationEmail({
        to: message.to,
        subject: message.subject,
        html: message.html,
      })
    )
  );

  return results.every((result) => result.status === 'fulfilled' && result.value?.success === true);
}

export async function sendPublicAccessRequestCreatedEmails(input: { accessRequestId: string }) {
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
          id: true,
          name: true,
          legalName: true,
        },
      },
    },
  });

  if (!accessRequest?.tenant) {
    return false;
  }

  const requesterEmail = normalizeEmail(accessRequest.requesterUser?.email);
  const requesterFullName = pickDisplayName({
    name:
      normalizeText(accessRequest.requesterUser?.name) ||
      [accessRequest.requesterUser?.firstName, accessRequest.requesterUser?.lastName]
        .filter(Boolean)
        .join(' ') ||
      null,
    email: requesterEmail,
  });
  const requesterFirstName = requesterFullName.split(' ')[0] || requesterFullName;
  const tenantDisplayName = buildTenantDisplayName({
    tenantName: accessRequest.tenant.name,
    tenantLegalName: accessRequest.tenant.legalName,
  });
  const reviewRecipients = await resolveTenantReviewRecipients({
    tenantId: accessRequest.tenantId,
    connectionId: accessRequest.connectionId,
  });

  const messages: Array<{ to: string; subject: string; html: string }> = [];

  if (requesterEmail) {
    const receipt = buildAccessRequestReceiptEmail({
      requesterName: requesterFirstName,
      tenantDisplayName,
      requestedRole: accessRequest.requestedRole ?? null,
    });
    messages.push({ to: requesterEmail, subject: receipt.subject, html: receipt.html });
  }

  const adminEmail = buildAccessRequestCreatedEmail({
    tenantDisplayName,
    requesterName: requesterFullName,
    requesterEmail: requesterEmail ?? 'sin-email',
    requestedRole: accessRequest.requestedRole ?? null,
    message: accessRequest.message ?? null,
    createdAt: accessRequest.createdAt,
  });

  for (const recipient of reviewRecipients) {
    if (recipient.email === requesterEmail) continue;
    messages.push({ to: recipient.email, subject: adminEmail.subject, html: adminEmail.html });
  }

  return sendAllEmails(messages);
}

export async function sendPublicClaimCreatedEmails(input: { claimId: string }) {
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
  const requesterFullName = pickDisplayName({
    name:
      normalizeText(claim.createdByUser?.name) ||
      [claim.createdByUser?.firstName, claim.createdByUser?.lastName].filter(Boolean).join(' ') ||
      null,
    email: requesterEmail,
  });
  const requesterFirstName = requesterFullName.split(' ')[0] || requesterFullName;
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

  const adminEmail = buildClaimCreatedEmail({
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
    messages.push({ to: recipient.email, subject: adminEmail.subject, html: adminEmail.html });
  }

  return sendAllEmails(messages);
}

export async function sendPublicHighGovernanceRiskInternalAlertEmail(input: {
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
