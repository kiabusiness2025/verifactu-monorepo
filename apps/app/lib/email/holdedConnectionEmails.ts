import { sendCustomEmail, type EmailSenderProfile } from '@/lib/email/emailService';
import { getPreferredFirstName, getPreferredFullName } from '@/lib/personName';
import { getAppUrl } from '@verifactu/utils';

function channelToSenderProfile(channel?: HoldedLifecycleChannel): EmailSenderProfile {
  if (channel === 'claude') return 'holded_claude';
  if (channel === 'chatgpt' || channel === 'mobile') return 'holded_chatgpt';
  return 'holded';
}

const ADMIN_NOTIFICATION_EMAIL =
  process.env.SUPPORT_NOTIFICATION_EMAIL?.trim() || 'soporte@verifactu.business';

type HoldedLifecycleAction = 'connected' | 'disconnected';
// Phase 1 of the Holded Connectors Unified Architecture extends the lifecycle
// channel union to include 'mobile' (ChatGPT mobile self-contained form) and
// 'claude' (Claude Desktop consent screen). The same email templates are reused
// for these new entry points so we only need new labels and CTA copy.
type HoldedLifecycleChannel = 'dashboard' | 'chatgpt' | 'mobile' | 'claude';

type TenantEmailContext = {
  userEmail: string | null;
  userName: string | null;
  tenantName: string;
  tenantLegalName?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  companyEmail?: string | null;
  contactPhone?: string | null;
  channel?: HoldedLifecycleChannel;
};

function renderActionLabel(action: HoldedLifecycleAction) {
  return action === 'connected' ? 'conexion activada' : 'conexion desconectada';
}

function renderChannelLabel(channel: HoldedLifecycleChannel) {
  switch (channel) {
    case 'chatgpt':
      return 'ChatGPT';
    case 'mobile':
      return 'ChatGPT mobile';
    case 'claude':
      return 'Claude Desktop';
    case 'dashboard':
    default:
      return 'tu area privada';
  }
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

type EmailChannel = 'chatgpt' | 'mobile' | 'claude' | 'dashboard';

function buildConnectorShell(input: {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  timestamp?: string;
  channel?: EmailChannel;
}) {
  const isClaudeChannel = input.channel === 'claude';
  const appUrl = getAppUrl();
  const holdedLogoUrl = new URL('/brand/holded/holded-diamond-logo.png', appUrl).toString();
  const aiLogoUrl = isClaudeChannel
    ? new URL('/brand/claude-logo.svg', appUrl).toString()
    : new URL('/brand/chatgpt/chatgpt-logo.png', appUrl).toString();
  const aiAlt = isClaudeChannel ? 'Claude' : 'ChatGPT';
  const aiLogoBorder = isClaudeChannel ? '#fde68a' : '#dbe7ff';

  const accentColor = isClaudeChannel ? '#d97706' : '#ff5460';
  const headerGradient = isClaudeChannel
    ? 'linear-gradient(135deg,#fffbeb 0%,#fef3c7 52%,#ecfdf5 100%)'
    : 'linear-gradient(135deg,#fff7ed 0%,#fff1f2 52%,#eef6ff 100%)';
  const headerBorder = isClaudeChannel ? '#fde68a' : '#f2dbe0';
  const headerLabel = isClaudeChannel ? 'Conector Claude' : 'Conector Holded';
  const headerLabelColor = isClaudeChannel ? '#92400e' : '#7a1f2a';
  const holdedLogoBorder = isClaudeChannel ? '#fde68a' : '#f1d4d9';

  const timestamp =
    input.timestamp ??
    new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });

  const ctaBlock =
    input.ctaLabel && input.ctaUrl
      ? `<div style="margin:24px 0 8px 0;text-align:left;">
          <a href="${input.ctaUrl}"
            style="display:inline-block;background:${accentColor};color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:50px;letter-spacing:0.02em;">
            ${input.ctaLabel}
          </a>
        </div>`
      : '';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #1b2a3a; line-height: 1.6; max-width: 640px; margin: 0 auto; padding: 24px; background: #f8fafc;">
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; box-shadow: 0 18px 40px rgba(15,23,42,0.08);">

        <!-- Header -->
        <div style="padding: 20px 28px; background: ${headerGradient}; border-bottom: 1px solid ${headerBorder};">
          <table role="presentation" width="100%" style="border-collapse: collapse;">
            <tr>
              <td style="vertical-align: middle; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; color: ${headerLabelColor};">
                ${headerLabel}
              </td>
              <td align="right" style="vertical-align: middle; white-space: nowrap;">
                <span style="display:inline-block;vertical-align:middle;background:#fff;border:1px solid ${holdedLogoBorder};border-radius:14px;padding:8px;">
                  <img src="${holdedLogoUrl}" alt="Holded" width="22" height="22" style="display:block;border:0;" />
                </span>
                <span style="display:inline-block;vertical-align:middle;font-size:15px;font-weight:700;color:#7b8794;padding:0 8px;">+</span>
                <span style="display:inline-block;vertical-align:middle;background:#fff;border:1px solid ${aiLogoBorder};border-radius:14px;padding:8px;">
                  <img src="${aiLogoUrl}" alt="${aiAlt}" width="22" height="22" style="display:block;border:0;" />
                </span>
              </td>
            </tr>
          </table>
        </div>

        <!-- Body -->
        <div style="padding: 28px 28px 0 28px;">
          <h2 style="color:#0d2b4a; margin:0 0 16px 0; font-size:20px; font-weight:700; line-height:1.3;">${input.title}</h2>
          ${input.body}
          ${ctaBlock}
        </div>

        <!-- Timestamp bar -->
        <div style="margin: 24px 28px 0 28px; padding: 12px 16px; background:#f8fafc; border-radius:12px; border:1px solid #e2e8f0;">
          <span style="font-size:12px; color:#94a3b8;">&#128344; ${timestamp}</span>
        </div>

        <!-- Footer -->
        <div style="padding: 16px 28px 24px 28px;">
          <p style="margin:0;color:#94a3b8;font-size:11px; line-height:1.8;">
            Powered by <a href="https://verifactu.business" style="color:${accentColor};text-decoration:none;">verifactu.business</a>
            &nbsp;·&nbsp;
            <a href="https://holded.verifactu.business/legal" style="color:#94a3b8;text-decoration:none;">Aviso legal</a>
            &nbsp;·&nbsp;
            <a href="https://holded.verifactu.business/privacy" style="color:#94a3b8;text-decoration:none;">Privacidad</a>
            &nbsp;·&nbsp;
            <a href="https://holded.verifactu.business/terms" style="color:#94a3b8;text-decoration:none;">Términos</a>
          </p>
        </div>
      </div>
    </div>
  `;
}

// Legacy alias: keeps call sites that don't pass a channel unchanged
function buildHoldedChatGptShell(input: {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  timestamp?: string;
}) {
  return buildConnectorShell({ ...input, channel: 'chatgpt' });
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
      ? `<div style="margin:16px 0 4px 0; padding:12px 16px; background:#f8fafc; border-radius:12px; border:1px solid #e2e8f0;">${renderDetailLine('Contacto', args.contactName)}${renderDetailLine('Correo de contacto', args.contactEmail)}${renderDetailLine('Teléfono de contacto', args.contactPhone)}${renderDetailLine('Correo de empresa', args.companyEmail)}</div>`
      : '';

  const appUrl = getAppUrl();
  const ctaLabel = args.action === 'connected' ? 'Abrir mi dashboard' : 'Reconectar Holded';
  const ctaUrl =
    args.action === 'connected'
      ? new URL('/dashboard', appUrl).toString()
      : new URL('/dashboard/integrations/holded', appUrl).toString();

  const accentColor = args.channel === 'claude' ? '#d97706' : '#ff5460';
  return buildConnectorShell({
    title: `Holded: ${actionLabel}`,
    ctaLabel,
    ctaUrl,
    channel: args.channel,
    body: `
      <p style="margin:0 0 12px 0;">Hola <strong>${args.userFirstName}</strong>,</p>
      <p style="margin:0 0 12px 0;">Te confirmamos que la <strong>${actionLabel}</strong> para la empresa <strong>${args.tenantDisplayName}</strong> se ha realizado correctamente a través de <strong>${channelLabel}</strong>.</p>
      ${contactLine}
      <p style="margin:16px 0 0 0; font-size:13px; color:#64748b;">Si no reconoces este cambio, responde a este correo o escríbenos a <a href="mailto:soporte@verifactu.business" style="color:${accentColor};">soporte@verifactu.business</a>.</p>
    `,
  });
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

  return buildConnectorShell({
    title: `[Admin] Holded: ${actionLabel}`,
    channel: args.channel,
    body: `
      <div style="padding:12px 16px; background:#f8fafc; border-radius:12px; border:1px solid #e2e8f0; margin-bottom:12px;">
        ${renderDetailLine('Usuario', `${args.userName} (${args.userEmail})`)}
        ${renderDetailLine('Empresa', args.tenantDisplayName)}
        ${renderDetailLine('Persona de contacto', args.contactName)}
        ${renderDetailLine('Correo de contacto', args.contactEmail)}
        ${renderDetailLine('Correo de empresa', args.companyEmail)}
        ${renderDetailLine('Teléfono de contacto', args.contactPhone)}
      </div>
      <p style="margin:0 0 8px 0;">Canal: <strong>${channelLabel}</strong> &nbsp;·&nbsp; Evento: <strong>${args.action}</strong></p>
    `,
  });
}

function buildWelcomeUserHtml(args: {
  userFirstName: string;
  tenantDisplayName: string;
  contactEmail?: string | null;
  companyEmail?: string | null;
  contactPhone?: string | null;
  channel?: EmailChannel;
}) {
  const isClaudeChannel = args.channel === 'claude';
  const accentColor = isClaudeChannel ? '#d97706' : '#ff5460';
  const aiLabel = isClaudeChannel ? 'Claude' : 'ChatGPT';
  const appUrl = getAppUrl();
  const dashboardUrl = new URL('/dashboard', appUrl).toString();

  return buildConnectorShell({
    title: isClaudeChannel ? 'Bienvenido al Conector Claude' : 'Bienvenido al Conector Holded',
    ctaLabel: 'Abrir mi dashboard',
    ctaUrl: dashboardUrl,
    channel: args.channel,
    body: `
      <p style="margin:0 0 12px 0;">Hola <strong>${args.userFirstName}</strong>,</p>
      <p style="margin:0 0 12px 0;">La conexión de Holded para <strong>${args.tenantDisplayName}</strong> ya está lista. Desde este momento puedes usar el conector directo con la empresa ya enlazada.</p>
      ${
        normalizeText(args.contactEmail) ||
        normalizeText(args.companyEmail) ||
        normalizeText(args.contactPhone)
          ? `<div style="margin:16px 0; padding:12px 16px; background:#f8fafc; border-radius:12px; border:1px solid #e2e8f0;">
            ${renderDetailLine('Correo de contacto', args.contactEmail)}
            ${renderDetailLine('Correo de empresa', args.companyEmail)}
            ${renderDetailLine('Teléfono de contacto', args.contactPhone)}
          </div>`
          : ''
      }
      <p style="margin:16px 0 0 0; font-size:13px; color:#64748b;">Primer paso: vuelve a tu flujo en ${aiLabel} o entra en tu área de Verifactu para revisar que todo responde como esperas. Si necesitas ayuda escríbenos a <a href="mailto:soporte@verifactu.business" style="color:${accentColor};">soporte@verifactu.business</a>.</p>
    `,
  });
}

function buildWelcomeAdminHtml(args: {
  userName: string;
  userEmail: string;
  tenantDisplayName: string;
  companyEmail?: string | null;
  contactPhone?: string | null;
  channel?: EmailChannel;
}) {
  return buildConnectorShell({
    title: '[Admin] Nueva empresa activada',
    channel: args.channel,
    body: `
      <div style="padding:12px 16px; background:#f8fafc; border-radius:12px; border:1px solid #e2e8f0;">
        ${renderDetailLine('Contacto principal', `${args.userName} (${args.userEmail})`)}
        ${renderDetailLine('Empresa', args.tenantDisplayName)}
        ${renderDetailLine('Correo de empresa', args.companyEmail)}
        ${renderDetailLine('Teléfono de contacto', args.contactPhone)}
      </div>
      <p style="margin:12px 0 0 0;">Evento: <strong>welcome</strong></p>
    `,
  });
}

export async function sendWelcomeLifecycleEmails(args: TenantEmailContext) {
  const deliveries: Array<Promise<unknown>> = [];
  const safeUserName = getPreferredFullName({
    fullName: normalizeText(args.userName) || normalizeText(args.contactName),
    fallback: 'equipo',
  });
  const safeUserEmail = normalizeText(args.userEmail) || normalizeText(args.contactEmail);
  const safeUserFirstName = getPreferredFirstName({
    fullName: safeUserName,
    fallback: 'equipo',
  });
  const company = buildCompanySummary(args);
  const contact = buildContactSummary(args);

  if (safeUserEmail) {
    deliveries.push(
      sendCustomEmail({
        to: safeUserEmail,
        subject: 'Bienvenido a Verifactu Business',
        senderProfile: channelToSenderProfile(args.channel),
        html: buildWelcomeUserHtml({
          userFirstName: safeUserFirstName,
          tenantDisplayName: company.displayName,
          contactEmail: contact.email,
          companyEmail: company.companyEmail,
          contactPhone: contact.phone,
          channel: args.channel,
        }),
      })
    );
  }

  deliveries.push(
    sendCustomEmail({
      to: ADMIN_NOTIFICATION_EMAIL,
      subject: 'Admin: nueva empresa activada',
      senderProfile: 'holded',
      html: buildWelcomeAdminHtml({
        userName: safeUserName,
        userEmail: safeUserEmail || 'sin-email',
        tenantDisplayName: company.displayName,
        companyEmail: company.companyEmail,
        contactPhone: contact.phone,
        channel: args.channel,
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
    fallback: 'equipo',
  });
  const safeUserEmail = normalizeText(args.userEmail) || normalizeText(args.contactEmail);
  const safeUserFirstName = getPreferredFirstName({
    fullName: safeUserName,
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
        senderProfile: channelToSenderProfile(args.channel),
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

  const safeCompanyEmail = normalizeText(args.companyEmail);
  if (safeCompanyEmail && safeCompanyEmail.toLowerCase() !== (safeUserEmail || '').toLowerCase()) {
    deliveries.push(
      sendCustomEmail({
        to: safeCompanyEmail,
        subject: `Holded: ${actionLabel}`,
        senderProfile: channelToSenderProfile(args.channel),
        html: buildUserHtml({
          userFirstName: 'equipo',
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
      senderProfile: 'holded',
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
