/**
 * Workflow steps para el sistema de emails de soporte
 * Estos pasos se ejecutan como parte de flujos de trabajo duraderos
 */

import { FatalError } from 'workflow';
import { Resend } from 'resend';
import { query } from '@/lib/db';
import { getPreferredFirstName } from '@/lib/personName';

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_NOTIFICATION_EMAIL =
  process.env.SUPPORT_NOTIFICATION_EMAIL?.trim() || 'support@verifactu.business';

function normalizeText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function buildTenantDisplayName(args: {
  tenantName?: string | null;
  tenantLegalName?: string | null;
}) {
  const tenantName = normalizeText(args.tenantName) || null;
  const tenantLegalName = normalizeText(args.tenantLegalName) || null;

  if (!tenantName && !tenantLegalName) return null;
  if (!tenantName) return tenantLegalName;
  if (!tenantLegalName || tenantLegalName.toLowerCase() === tenantName.toLowerCase()) {
    return tenantName;
  }

  return `${tenantLegalName} (${tenantName})`;
}

function renderDetailLine(label: string, value?: string | null) {
  const normalized = normalizeText(value);
  if (!normalized) return '';
  return `<p><strong>${label}:</strong> ${normalized}</p>`;
}

/**
 * Step: Enviar email de bienvenida a nuevo usuario
 * Marca: "use step"
 */
export async function sendWelcomeEmail(
  email: string,
  userName: string,
  context?: {
    tenantName?: string | null;
    tenantLegalName?: string | null;
    companyEmail?: string | null;
    contactPhone?: string | null;
  }
) {
  'use step';

  const tenantDisplayName = buildTenantDisplayName(context || {});
  const greetingName = getPreferredFirstName({ fullName: userName, email });

  try {
    const resp = await resend.emails.send({
      from: 'Soporte Verifactu <soporte@verifactu.business>',
      to: [email],
      subject: '¡Bienvenido a Verifactu!',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>¡Hola ${greetingName}!</h2>
          <p>Gracias por registrarte en <strong>Verifactu</strong>.</p>
          ${tenantDisplayName ? `<p>Tu espacio para <strong>${tenantDisplayName}</strong> ya está preparado.</p>` : ''}
          ${renderDetailLine('Correo de empresa', context?.companyEmail)}
          ${renderDetailLine('Telefono de contacto', context?.contactPhone)}
          <p>Tu cuenta está lista. Puedes acceder a tu dashboard en cualquier momento.</p>
          <p>Si tienes preguntas, nos encuentras en <strong>soporte@verifactu.business</strong></p>
          <p>¡Que disfrutes!</p>
        </div>
      `,
    });

    if (resp.error) {
      throw new FatalError(`Failed to send welcome email: ${resp.error.message}`);
    }

    return { success: true, emailId: resp.data?.id };
  } catch (error) {
    if (error instanceof FatalError) throw error;
    throw new FatalError(`Unexpected error in sendWelcomeEmail: ${String(error)}`);
  }
}

/**
 * Step: Enviar aviso interno de bienvenida a soporte
 */
export async function sendWelcomeAdminNotification(
  email: string,
  userName: string,
  context?: {
    tenantName?: string | null;
    tenantLegalName?: string | null;
    companyEmail?: string | null;
    contactPhone?: string | null;
  }
) {
  'use step';

  const tenantDisplayName = buildTenantDisplayName(context || {});

  try {
    const resp = await resend.emails.send({
      from: 'Soporte Verifactu <soporte@verifactu.business>',
      to: [ADMIN_NOTIFICATION_EMAIL],
      subject: 'Nuevo usuario en Verifactu',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>Nuevo usuario registrado</h2>
          <p><strong>Nombre:</strong> ${userName}</p>
          <p><strong>Email:</strong> ${email}</p>
          ${tenantDisplayName ? `<p><strong>Empresa:</strong> ${tenantDisplayName}</p>` : ''}
          ${renderDetailLine('Correo de empresa', context?.companyEmail)}
          ${renderDetailLine('Telefono de contacto', context?.contactPhone)}
        </div>
      `,
    });

    if (resp.error) {
      throw new FatalError(`Failed to send welcome admin notification: ${resp.error.message}`);
    }

    return { success: true, emailId: resp.data?.id };
  } catch (error) {
    if (error instanceof FatalError) throw error;
    throw new FatalError(`Unexpected error in sendWelcomeAdminNotification: ${String(error)}`);
  }
}

/**
 * Step: Procesar email entrante y guardar en base de datos
 */
export async function processIncomingEmail(data: {
  from: string;
  subject: string;
  text: string;
  html?: string;
  messageId: string;
}) {
  'use step';

  try {
    const result = await query(
      `INSERT INTO admin_emails (from_email, subject, body, html_body, message_id, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id`,
      [data.from, data.subject, data.text, data.html || null, data.messageId, 'unread']
    );

    if (!result[0]) {
      throw new FatalError('Failed to insert email into database');
    }

    return { success: true, emailId: (result[0] as any).id };
  } catch (error) {
    if (error instanceof FatalError) throw error;
    throw new FatalError(`Error processing incoming email: ${String(error)}`);
  }
}

/**
 * Step: Enviar respuesta automática a email recibido
 */
export async function sendAutoReplyEmail(toEmail: string, senderName: string) {
  'use step';

  try {
    const resp = await resend.emails.send({
      from: 'Soporte Verifactu <soporte@verifactu.business>',
      to: [toEmail],
      subject: 'Re: Tu mensaje fue recibido',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <p>Hola ${senderName},</p>
          <p>Gracias por contactarnos. Recibimos tu mensaje y nos pondremos en contacto pronto.</p>
          <p>Nuestro equipo está revisando tu solicitud.</p>
          <p>Cordialmente,<br/>Equipo Verifactu</p>
        </div>
      `,
    });

    if (resp.error) {
      throw new FatalError(`Failed to send auto-reply: ${resp.error.message}`);
    }

    return { success: true, emailId: resp.data?.id };
  } catch (error) {
    if (error instanceof FatalError) throw error;
    throw new FatalError(`Error sending auto-reply: ${String(error)}`);
  }
}

/**
 * Step: Enviar email de seguimiento después de N días
 */
export async function sendFollowUpEmail(email: string, subject: string, message: string) {
  'use step';

  try {
    const resp = await resend.emails.send({
      from: 'Soporte Verifactu <soporte@verifactu.business>',
      to: [email],
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          ${message}
        </div>
      `,
    });

    if (resp.error) {
      throw new FatalError(`Failed to send follow-up email: ${resp.error.message}`);
    }

    return { success: true, emailId: resp.data?.id };
  } catch (error) {
    if (error instanceof FatalError) throw error;
    throw new FatalError(`Error sending follow-up email: ${String(error)}`);
  }
}

/**
 * Step: Actualizar estado de email en la base de datos
 */
export async function updateEmailStatus(emailId: number, status: 'read' | 'archived' | 'replied') {
  'use step';

  try {
    const result = await query(
      `UPDATE admin_emails SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id`,
      [status, emailId]
    );

    if (!result[0]) {
      throw new FatalError(`Email with ID ${emailId} not found`);
    }

    return { success: true, emailId };
  } catch (error) {
    if (error instanceof FatalError) throw error;
    throw new FatalError(`Error updating email status: ${String(error)}`);
  }
}
