import { getAppUrl } from '@verifactu/utils';

import { sendCustomEmail } from '@/lib/email/emailService';
import { getPreferredFirstName, getPreferredFullName } from '@/lib/personName';
import prisma from '@/lib/prisma';

const SUPPORT_EMAIL =
  process.env.SUPPORT_NOTIFICATION_EMAIL?.trim() || 'soporte@verifactu.business';

export type HoldedSecurityAlertAction = 'connected' | 'disconnected';
export type HoldedSecurityAlertChannel = 'dashboard' | 'chatgpt';

export type HoldedSecurityRecipient = {
  email: string;
  name: string | null;
  source: 'membership' | 'tenant_profile' | 'actor';
};

function normalizeText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeEmail(value?: string | null) {
  const normalized = normalizeText(value)?.toLowerCase();
  return normalized || null;
}

function buildTenantDisplayName(args: { tenantName: string; tenantLegalName?: string | null }) {
  const tenantName = normalizeText(args.tenantName) || 'tu empresa';
  const tenantLegalName = normalizeText(args.tenantLegalName);

  if (!tenantLegalName || tenantLegalName.toLowerCase() === tenantName.toLowerCase()) {
    return tenantName;
  }

  return `${tenantLegalName} (${tenantName})`;
}

function renderActionLabel(action: HoldedSecurityAlertAction) {
  return action === 'connected' ? 'conexion activada' : 'conexion desconectada';
}

function renderChannelLabel(channel: HoldedSecurityAlertChannel) {
  return channel === 'chatgpt' ? 'ChatGPT' : 'tu area privada';
}

function renderChannelProductLabel(channel: HoldedSecurityAlertChannel) {
  return channel === 'chatgpt' ? 'ChatGPT' : 'Verifactu';
}

function formatOccurredAt(value: Date) {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Europe/Madrid',
    }).format(value);
  } catch {
    return value.toISOString();
  }
}

function buildSecurityAlertHtml(args: {
  recipientName: string;
  tenantDisplayName: string;
  action: HoldedSecurityAlertAction;
  channel: HoldedSecurityAlertChannel;
  actorName?: string | null;
  actorEmail?: string | null;
  occurredAt: Date;
  reviewUrl: string;
}) {
  const actionLabel = renderActionLabel(args.action);
  const channelLabel = renderChannelLabel(args.channel);
  const actorName = normalizeText(args.actorName);
  const actorEmail = normalizeEmail(args.actorEmail);
  const actorSummary =
    actorName || actorEmail
      ? `${actorName || 'Usuario identificado'}${actorEmail ? ` (${actorEmail})` : ''}`
      : 'No disponible';
  const holdedLogoUrl = new URL('/brand/holded/holded-diamond-logo.png', getAppUrl()).toString();
  const chatgptLogoUrl = new URL('/brand/chatgpt/chatgpt-logo.png', getAppUrl()).toString();
  const channelProductLabel = renderChannelProductLabel(args.channel);

  return `
    <div style="font-family: Arial, sans-serif; color: #1b2a3a; line-height: 1.6;">
      <div style="margin:0 0 18px 0;padding:18px;border-radius:20px;background:linear-gradient(135deg,#fff7ed 0%,#fff1f2 52%,#eef6ff 100%);border:1px solid #ffd7c2;">
        <table role="presentation" width="100%" style="border-collapse:collapse;">
          <tr>
            <td style="vertical-align:middle;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#7a1f2a;">Alerta de seguridad</div>
              <div style="margin-top:8px;font-size:18px;font-weight:700;color:#0d2b4a;">Holded + ${channelProductLabel}</div>
            </td>
            <td align="right" style="vertical-align:middle;white-space:nowrap;">
              <span style="display:inline-block;vertical-align:middle;background:#ffffff;border:1px solid #f1d4d9;border-radius:16px;padding:10px;">
                <img src="${holdedLogoUrl}" alt="Holded" width="28" height="28" style="display:block;border:0;outline:none;">
              </span>
              <span style="display:inline-block;vertical-align:middle;font-size:18px;font-weight:700;color:#7b8794;padding:0 8px;">+</span>
              <span style="display:inline-block;vertical-align:middle;background:#ffffff;border:1px solid #dbe7ff;border-radius:16px;padding:10px;">
                <img src="${chatgptLogoUrl}" alt="${channelProductLabel}" width="28" height="28" style="display:block;border:0;outline:none;">
              </span>
            </td>
          </tr>
        </table>
      </div>
      <h2 style="color:#0d2b4a; margin:0 0 16px 0;">Alerta de seguridad Holded</h2>
      <p>Hola ${args.recipientName},</p>
      <p>Se ha detectado una <strong>${actionLabel}</strong> para la empresa <strong>${args.tenantDisplayName}</strong>.</p>
      <p>Canal: <strong>${channelLabel}</strong>.</p>
      <p>Usuario que hizo el cambio: <strong>${actorSummary}</strong>.</p>
      <p>Fecha: <strong>${formatOccurredAt(args.occurredAt)}</strong>.</p>
      <div style="margin:18px 0;padding:16px;border-radius:18px;background:#fff7ed;border:1px solid #fdba74;">
        <div style="font-weight:700;margin:0 0 8px;">Si no has sido tu</div>
        <p style="margin:0 0 8px;">Revoca la API key o la integracion sospechosa desde tu panel de Holded y revisa los pasos recomendados en esta guia:</p>
        <p style="margin:0 0 8px;"><a href="${args.reviewUrl}" style="color:#b4233c;text-decoration:none;font-weight:600;">${args.reviewUrl}</a></p>
        <p style="margin:0;">Si necesitas ayuda, responde a este correo o escribe a <strong>${SUPPORT_EMAIL}</strong>.</p>
      </div>
    </div>
  `;
}

export async function resolveHoldedSecurityAlertRecipients(args: {
  tenantId: string;
  actorEmail?: string | null;
  actorName?: string | null;
}) {
  const [memberships, tenantProfile] = await Promise.all([
    prisma.membership.findMany({
      where: {
        tenantId: args.tenantId,
        status: 'active',
      },
      select: {
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
    prisma.tenantProfile.findUnique({
      where: { tenantId: args.tenantId },
      select: { email: true },
    }),
  ]);

  const recipients = new Map<string, HoldedSecurityRecipient>();

  const remember = (
    email: string | null | undefined,
    name: string | null | undefined,
    source: HoldedSecurityRecipient['source']
  ) => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return;

    const current = recipients.get(normalizedEmail);
    recipients.set(normalizedEmail, {
      email: normalizedEmail,
      name: normalizeText(name) || current?.name || null,
      source: current?.source === 'membership' ? 'membership' : source,
    });
  };

  memberships.forEach((membership) => {
    const fullName = getPreferredFullName({
      fullName:
        normalizeText(membership.user.name) ||
        [membership.user.firstName, membership.user.lastName].filter(Boolean).join(' '),
      email: membership.user.email,
      fallback: 'equipo',
    });

    remember(membership.user.email, fullName, 'membership');
  });

  remember(tenantProfile?.email ?? null, null, 'tenant_profile');
  remember(args.actorEmail ?? null, args.actorName ?? null, 'actor');

  return Array.from(recipients.values()).sort((left, right) =>
    left.email.localeCompare(right.email)
  );
}

export async function sendHoldedSecurityAlertEmails(args: {
  recipients: HoldedSecurityRecipient[];
  tenantName: string;
  tenantLegalName?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
  action: HoldedSecurityAlertAction;
  channel: HoldedSecurityAlertChannel;
  occurredAt?: Date;
}) {
  if (args.recipients.length === 0) {
    return [];
  }

  const tenantDisplayName = buildTenantDisplayName({
    tenantName: args.tenantName,
    tenantLegalName: args.tenantLegalName,
  });
  const actionLabel = renderActionLabel(args.action);
  const reviewUrl = new URL('/help/holded-security', getAppUrl()).toString();
  const occurredAt = args.occurredAt ?? new Date();

  return Promise.allSettled(
    args.recipients.map((recipient) => {
      const recipientDisplayName = getPreferredFirstName({
        fullName: normalizeText(recipient.name),
        email: recipient.email,
        fallback: 'equipo',
      });

      return sendCustomEmail({
        to: recipient.email,
        subject: `Seguridad Holded: ${actionLabel}`,
        senderProfile: 'holded',
        html: buildSecurityAlertHtml({
          recipientName: recipientDisplayName,
          tenantDisplayName,
          action: args.action,
          channel: args.channel,
          actorName: args.actorName,
          actorEmail: args.actorEmail,
          occurredAt,
          reviewUrl,
        }),
      });
    })
  );
}
