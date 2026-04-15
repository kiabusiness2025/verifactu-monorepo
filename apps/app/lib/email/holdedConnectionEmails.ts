import { sendCustomEmail } from '@/lib/email/emailService';
import { getPreferredFirstName, getPreferredFullName } from '@/lib/personName';
import { getAppUrl } from '@verifactu/utils';

const ADMIN_NOTIFICATION_EMAIL =
  process.env.SUPPORT_NOTIFICATION_EMAIL?.trim() || 'soporte@verifactu.business';

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

function buildHoldedChatGptShell(input: { title: string; body: string }) {
  const holdedLogoUrl = new URL('/brand/holded/holded-diamond-logo.png', getAppUrl()).toString();
  const chatgptLogoUrl = new URL('/brand/chatgpt/chatgpt-logo.png', getAppUrl()).toString();

  return `
    <div style="font-family: Arial, sans-serif; color: #1b2a3a; line-height: 1.6; max-width: 640px; margin: 0 auto; padding: 24px; background: #f8fafc;">
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; box-shadow: 0 18px 40px rgba(15,23,42,0.08);">
        <div style="padding: 20px 24px; background: linear-gradient(135deg,#fff7ed 0%,#fff1f2 52%,#eef6ff 100%); border-bottom: 1px solid #f2dbe0;">
          <table role="presentation" width="100%" style="border-collapse: collapse;">
            <tr>
              <td style="vertical-align: middle; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; color: #7a1f2a;">Conector Holded</td>
              <td align="right" style="vertical-align: middle; white-space: nowrap;">
                <span style="display:inline-block;vertical-align:middle;background:#fff;border:1px solid #f1d4d9;border-radius:14px;padding:8px;">
                  <img src="${holdedLogoUrl}" alt="Holded" width="22" height="22" style="display:block;border:0;" />
                </span>
                <span style="display:inline-block;vertical-align:middle;font-size:16px;font-weight:700;color:#7b8794;padding:0 8px;">+</span>
                <span style="display:inline-block;vertical-align:middle;background:#fff;border:1px solid #dbe7ff;border-radius:14px;padding:8px;">
                  <img src="${chatgptLogoUrl}" alt="ChatGPT" width="22" height="22" style="display:block;border:0;" />
                </span>
              </td>
            </tr>
          </table>
        </div>
        <div style="padding: 24px;">
          <h2 style="color:#0d2b4a; margin:0 0 16px 0;">${input.title}</h2>
          ${input.body}
          <p style="margin:18px 0 0;color:#64748b;font-size:12px;">
            Powered by <a href="https://verifactu.business" style="color:#b4233c;">verifactu.business</a> ·
            <a href="https://holded.verifactu.business/legal" style="color:#b4233c;">Aviso legal</a> ·
            <a href="https://holded.verifactu.business/privacy" style="color:#b4233c;">Privacidad</a> ·
            <a href="https://holded.verifactu.business/terms" style="color:#b4233c;">Terminos</a>
          </p>
        </div>
      </div>
    </div>
  `;
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

  return buildHoldedChatGptShell({
    title: `Holded: ${actionLabel}`,
    body: `
      <p>Hola ${args.userFirstName},</p>
      <p>Te confirmamos que la ${actionLabel} para la empresa <strong>${args.tenantDisplayName}</strong> se ha realizado correctamente.</p>
      <p>Canal: <strong>${channelLabel}</strong>.</p>
      ${contactLine}
      <p>Si no reconoces este cambio, responde a este correo o escríbenos a <strong>soporte@verifactu.business</strong>.</p>
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

  return buildHoldedChatGptShell({
    title: `Holded: ${actionLabel}`,
    body: `
      <p>Usuario: <strong>${args.userName}</strong> (${args.userEmail})</p>
      <p>Empresa: <strong>${args.tenantDisplayName}</strong></p>
      ${renderDetailLine('Persona de contacto', args.contactName)}
      ${renderDetailLine('Correo de contacto', args.contactEmail)}
      ${renderDetailLine('Correo de empresa', args.companyEmail)}
      ${renderDetailLine('Telefono de contacto', args.contactPhone)}
      <p>Canal: <strong>${channelLabel}</strong></p>
      <p>Evento: <strong>${args.action}</strong></p>
    `,
  });
}

function buildWelcomeUserHtml(args: {
  userFirstName: string;
  tenantDisplayName: string;
  contactEmail?: string | null;
  companyEmail?: string | null;
  contactPhone?: string | null;
}) {
  return buildHoldedChatGptShell({
    title: 'Bienvenido al Conector Holded',
    body: `
      <p>Hola ${args.userFirstName},</p>
      <p>La conexion de Holded para <strong>${args.tenantDisplayName}</strong> ya esta lista.</p>
      <p>Desde este momento puedes continuar usando el conector directo con la empresa ya enlazada.</p>
      ${renderDetailLine('Correo de contacto', args.contactEmail)}
      ${renderDetailLine('Correo de empresa', args.companyEmail)}
      ${renderDetailLine('Telefono de contacto', args.contactPhone)}
      <p>Primer paso recomendado: vuelve a tu flujo en ChatGPT o entra en tu area de Verifactu para revisar que todo responde como esperas.</p>
      <p>Si necesitas ayuda, escríbenos a <strong>soporte@verifactu.business</strong>.</p>
    `,
  });
}

function buildWelcomeAdminHtml(args: {
  userName: string;
  userEmail: string;
  tenantDisplayName: string;
  companyEmail?: string | null;
  contactPhone?: string | null;
}) {
  return buildHoldedChatGptShell({
    title: 'Nueva empresa activada',
    body: `
      <p>Contacto principal: <strong>${args.userName}</strong> (${args.userEmail})</p>
      <p>Empresa: <strong>${args.tenantDisplayName}</strong></p>
      ${renderDetailLine('Correo de empresa', args.companyEmail)}
      ${renderDetailLine('Telefono de contacto', args.contactPhone)}
      <p>Evento: <strong>welcome</strong></p>
    `,
  });
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
        senderProfile: 'holded',
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
      senderProfile: 'holded',
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
        senderProfile: 'holded',
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
        senderProfile: 'holded',
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
