import { sendCustomEmail } from '@/lib/email/emailService';
import { getPreferredFirstName, getPreferredFullName } from '@/lib/personName';

const ADMIN_NOTIFICATION_EMAIL =
  process.env.SUPPORT_NOTIFICATION_EMAIL?.trim() || 'support@verifactu.business';

type HoldedLifecycleAction = 'connected' | 'disconnected';
type HoldedLifecycleChannel = 'dashboard' | 'chatgpt';

type TenantEmailContext = {
  userEmail: string | null;
  userName: string | null;
  tenantName: string;
  tenantLegalName?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  companyEmail?: string | null;
  contactPhone?: string | null;
};

function renderActionLabel(action: HoldedLifecycleAction) {
  return action === 'connected' ? 'conexion activada' : 'conexion desconectada';
}

function renderChannelLabel(channel: HoldedLifecycleChannel) {
  return channel === 'chatgpt' ? 'ChatGPT' : 'tu area privada';
}

function normalizeText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function buildTenantDisplayName(args: Pick<TenantEmailContext, 'tenantName' | 'tenantLegalName'>) {
  const tenantName = normalizeText(args.tenantName) || 'tu empresa';
  const tenantLegalName = normalizeText(args.tenantLegalName);

  if (!tenantLegalName || tenantLegalName.toLowerCase() === tenantName.toLowerCase()) {
    return tenantName;
  }

  return `${tenantLegalName} (${tenantName})`;
}

function buildContactSummary(args: TenantEmailContext) {
  const name = normalizeText(args.contactName) || normalizeText(args.userName) || null;
  const email =
    normalizeText(args.contactEmail) ||
    normalizeText(args.userEmail) ||
    normalizeText(args.companyEmail);
  const phone = normalizeText(args.contactPhone);

  return { name, email, phone };
}

function buildCompanySummary(args: TenantEmailContext) {
  return {
    displayName: buildTenantDisplayName(args),
    companyEmail: normalizeText(args.companyEmail),
  };
}

function renderDetailLine(label: string, value?: string | null) {
  const normalized = normalizeText(value);
  if (!normalized) return '';
  return `<p style="margin:0 0 8px 0;"><strong>${label}:</strong> ${normalized}</p>`;
}

function buildUserHtml(args: {
  userFirstName: string;
  tenantDisplayName: string;
  contactName?: string | null;
  contactEmail?: string | null;
  companyEmail?: string | null;
  contactPhone?: string | null;
  action: HoldedLifecycleAction;
  channel: HoldedLifecycleChannel;
}) {
  const actionLabel = renderActionLabel(args.action);
  const channelLabel = renderChannelLabel(args.channel);
  const contactLine =
    normalizeText(args.contactName) || normalizeText(args.contactEmail)
      ? `<div style="margin:12px 0 4px 0;">${renderDetailLine('Contacto', args.contactName)}${renderDetailLine('Correo de contacto', args.contactEmail)}${renderDetailLine('Telefono de contacto', args.contactPhone)}${renderDetailLine('Correo de empresa', args.companyEmail)}</div>`
      : '';

  return `
    <div style="font-family: Arial, sans-serif; color: #1b2a3a; line-height: 1.6;">
      <h2 style="color:#0d2b4a; margin:0 0 16px 0;">Holded: ${actionLabel}</h2>
      <p>Hola ${args.userFirstName},</p>
      <p>Te confirmamos que la ${actionLabel} para la empresa <strong>${args.tenantDisplayName}</strong> se ha realizado correctamente.</p>
      <p>Canal: <strong>${channelLabel}</strong>.</p>
      ${contactLine}
      <p>Si no reconoces este cambio, responde a este correo o escríbenos a <strong>support@verifactu.business</strong>.</p>
    </div>
  `;
}

function buildAdminHtml(args: {
  userName: string;
  userEmail: string;
  tenantDisplayName: string;
  contactName?: string | null;
  contactEmail?: string | null;
  companyEmail?: string | null;
  contactPhone?: string | null;
  action: HoldedLifecycleAction;
  channel: HoldedLifecycleChannel;
}) {
  const actionLabel = renderActionLabel(args.action);
  const channelLabel = renderChannelLabel(args.channel);

  return `
    <div style="font-family: Arial, sans-serif; color: #1b2a3a; line-height: 1.6;">
      <h2 style="color:#0d2b4a; margin:0 0 16px 0;">Holded: ${actionLabel}</h2>
      <p>Usuario: <strong>${args.userName}</strong> (${args.userEmail})</p>
      <p>Empresa: <strong>${args.tenantDisplayName}</strong></p>
      ${renderDetailLine('Persona de contacto', args.contactName)}
      ${renderDetailLine('Correo de contacto', args.contactEmail)}
      ${renderDetailLine('Correo de empresa', args.companyEmail)}
      ${renderDetailLine('Telefono de contacto', args.contactPhone)}
      <p>Canal: <strong>${channelLabel}</strong></p>
      <p>Evento: <strong>${args.action}</strong></p>
    </div>
  `;
}

function buildWelcomeUserHtml(args: {
  userFirstName: string;
  tenantDisplayName: string;
  contactEmail?: string | null;
  companyEmail?: string | null;
  contactPhone?: string | null;
}) {
  return `
    <div style="font-family: Arial, sans-serif; color: #1b2a3a; line-height: 1.6;">
      <h2 style="color:#0d2b4a; margin:0 0 16px 0;">Bienvenido a Verifactu Business</h2>
      <p>Hola ${args.userFirstName},</p>
      <p>Tu espacio para <strong>${args.tenantDisplayName}</strong> ya esta preparado.</p>
      ${renderDetailLine('Correo de contacto', args.contactEmail)}
      ${renderDetailLine('Correo de empresa', args.companyEmail)}
      ${renderDetailLine('Telefono de contacto', args.contactPhone)}
      <p>Si necesitas ayuda, escríbenos a <strong>support@verifactu.business</strong>.</p>
    </div>
  `;
}

function buildWelcomeAdminHtml(args: {
  userName: string;
  userEmail: string;
  tenantDisplayName: string;
  companyEmail?: string | null;
  contactPhone?: string | null;
}) {
  return `
    <div style="font-family: Arial, sans-serif; color: #1b2a3a; line-height: 1.6;">
      <h2 style="color:#0d2b4a; margin:0 0 16px 0;">Nueva empresa activada</h2>
      <p>Contacto principal: <strong>${args.userName}</strong> (${args.userEmail})</p>
      <p>Empresa: <strong>${args.tenantDisplayName}</strong></p>
      ${renderDetailLine('Correo de empresa', args.companyEmail)}
      ${renderDetailLine('Telefono de contacto', args.contactPhone)}
      <p>Evento: <strong>welcome</strong></p>
    </div>
  `;
}

export async function sendWelcomeLifecycleEmails(args: TenantEmailContext) {
  const deliveries: Array<Promise<unknown>> = [];
  const safeUserName = getPreferredFullName({
    fullName: normalizeText(args.userName) || normalizeText(args.contactName),
    email: normalizeText(args.userEmail) || normalizeText(args.contactEmail),
    fallback: 'equipo',
  });
  const safeUserEmail = normalizeText(args.userEmail) || normalizeText(args.contactEmail);
  const safeUserFirstName = getPreferredFirstName({
    fullName: safeUserName,
    email: safeUserEmail,
    fallback: 'equipo',
  });
  const company = buildCompanySummary(args);
  const contact = buildContactSummary(args);

  if (safeUserEmail) {
    deliveries.push(
      sendCustomEmail({
        to: safeUserEmail,
        subject: 'Bienvenido a Verifactu Business',
        html: buildWelcomeUserHtml({
          userFirstName: safeUserFirstName,
          tenantDisplayName: company.displayName,
          contactEmail: contact.email,
          companyEmail: company.companyEmail,
          contactPhone: contact.phone,
        }),
      })
    );
  }

  deliveries.push(
    sendCustomEmail({
      to: ADMIN_NOTIFICATION_EMAIL,
      subject: 'Admin: nueva empresa activada',
      html: buildWelcomeAdminHtml({
        userName: safeUserName,
        userEmail: safeUserEmail || 'sin-email',
        tenantDisplayName: company.displayName,
        companyEmail: company.companyEmail,
        contactPhone: contact.phone,
      }),
    })
  );

  return Promise.allSettled(deliveries);
}

export async function sendHoldedConnectionLifecycleEmails(args: {
  userEmail: string | null;
  userName: string | null;
  tenantName: string;
  tenantLegalName?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  companyEmail?: string | null;
  contactPhone?: string | null;
  action: HoldedLifecycleAction;
  channel: HoldedLifecycleChannel;
}) {
  const deliveries: Array<Promise<unknown>> = [];
  const safeUserName = getPreferredFullName({
    fullName: normalizeText(args.userName) || normalizeText(args.contactName),
    email: normalizeText(args.userEmail) || normalizeText(args.contactEmail),
    fallback: 'equipo',
  });
  const safeUserEmail = normalizeText(args.userEmail) || normalizeText(args.contactEmail);
  const safeUserFirstName = getPreferredFirstName({
    fullName: safeUserName,
    email: safeUserEmail,
    fallback: 'equipo',
  });
  const actionLabel = renderActionLabel(args.action);
  const company = buildCompanySummary(args);
  const contact = buildContactSummary(args);

  if (safeUserEmail) {
    deliveries.push(
      sendCustomEmail({
        to: safeUserEmail,
        subject: `Holded: ${actionLabel}`,
        html: buildUserHtml({
          userFirstName: safeUserFirstName,
          tenantDisplayName: company.displayName,
          contactName: contact.name,
          contactEmail: contact.email,
          companyEmail: company.companyEmail,
          contactPhone: contact.phone,
          action: args.action,
          channel: args.channel,
        }),
      })
    );
  }

  deliveries.push(
    sendCustomEmail({
      to: ADMIN_NOTIFICATION_EMAIL,
      subject: `Admin: Holded ${actionLabel}`,
      html: buildAdminHtml({
        userName: safeUserName,
        userEmail: safeUserEmail || 'sin-email',
        tenantDisplayName: company.displayName,
        contactName: contact.name,
        contactEmail: contact.email,
        companyEmail: company.companyEmail,
        contactPhone: contact.phone,
        action: args.action,
        channel: args.channel,
      }),
    })
  );

  return Promise.allSettled(deliveries);
}
