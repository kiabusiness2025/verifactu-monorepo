/**
 * Workflow steps para el sistema de emails de soporte
 * Estos pasos se ejecutan como parte de flujos de trabajo duraderos
 */

import { FatalError } from 'workflow';
import { Resend } from 'resend';
import { query } from '@/lib/db';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Step: Enviar email de bienvenida a nuevo usuario
 * Marca: "use step"
 */
export async function sendWelcomeEmail(email: string, userName: string) {
  "use step";

  try {
    const resp = await resend.emails.send({
      from: 'Soporte Verifactu <soporte@verifactu.business>',
      to: [email],
      subject: '¡Bienvenido a Verifactu!',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>¡Hola ${userName}!</h2>
          <p>Gracias por registrarte en <strong>Verifactu</strong>.</p>
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
 * Step: Procesar email entrante y guardar en base de datos
 */
export async function processIncomingEmail(data: {
  from: string;
  subject: string;
  text: string;
  html?: string;
  messageId: string;
}) {
  "use step";

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
  "use step";

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
export async function sendFollowUpEmail(
  email: string,
  subject: string,
  message: string
) {
  "use step";

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
  "use step";

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
