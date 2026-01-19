import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { Resend } from 'resend';
import { query } from '@/lib/db';

/**
 * POST - Enviar respuesta desde soporte@verifactu.business
 * 
 * Body:
 * {
 *   "originalEmailId": "uuid",  // Email al que responder
 *   "subject": "string",         // Asunto de la respuesta
 *   "message": "string",         // Mensaje de respuesta (texto plano)
 *   "html": "string",            // Mensaje HTML (opcional)
 * }
 */

const resend = new Resend(process.env.RESEND_API_KEY);
const SUPPORT_EMAIL = 'Verifactu Business <soporte@verifactu.business>';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación de admin
    await requireAdmin(request);

    const body = await request.json();
    const { originalEmailId, subject, message, html } = body;

    // Validaciones
    if (!originalEmailId || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: originalEmailId, subject, message' },
        { status: 400 }
      );
    }

    // Obtener el email original para responder
    const originalEmails = await query<any>(
      `SELECT id, from_email, subject as original_subject
       FROM admin_emails 
       WHERE id = $1`,
      [originalEmailId]
    );

    if (originalEmails.length === 0) {
      return NextResponse.json(
        { error: 'Original email not found' },
        { status: 404 }
      );
    }

    const originalEmail = originalEmails[0];
    const recipientEmail = originalEmail.from_email;

    // Preparar asunto con "Re:" si no lo tiene
    const finalSubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;

    // Enviar email con Resend
    const sendResult = await resend.emails.send({
      from: SUPPORT_EMAIL,
      to: recipientEmail,
      subject: finalSubject,
      text: message,
      html: html || message,
      headers: {
        'In-Reply-To': originalEmail.id,
        'References': originalEmail.id,
      }
    });

    if (sendResult.error) {
      console.error('[API] Error sending response email:', sendResult.error);
      return NextResponse.json(
        { 
          error: 'Failed to send email', 
          details: sendResult.error?.message || 'Unknown error'
        },
        { status: 500 }
      );
    }

    // Obtener el ID del mensaje enviado (Resend devuelve data.id)
    const messageId = (sendResult as any).data?.id || (sendResult as any).id || '';

    if (!messageId) {
      console.error('[API] No message ID returned from Resend');
      return NextResponse.json(
        { error: 'No message ID returned from API' },
        { status: 500 }
      );
    }

    // Actualizar estado del email a "respondido"
    await query(
      `UPDATE admin_emails 
       SET status = 'responded', 
           responded_at = NOW(),
           resend_data = jsonb_set(
             COALESCE(resend_data, '{}'::jsonb),
             '{response_email_id}',
             to_jsonb($1::text)
           )
       WHERE id = $2`,
      [messageId, originalEmailId]
    );

    // Guardar registro de respuesta enviada
    await query(
      `INSERT INTO admin_email_responses 
       (admin_email_id, response_email_id, sent_at, from_email, to_email, subject, content)
       VALUES ($1, $2, NOW(), $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [
        originalEmailId,
        messageId,
        SUPPORT_EMAIL,
        recipientEmail,
        finalSubject,
        message
      ]
    );

    return NextResponse.json({
      success: true,
      messageId: messageId,
      message: 'Email response sent successfully',
      recipient: recipientEmail,
      subject: finalSubject,
    });

  } catch (error) {
    console.error('[API] Error in send email endpoint:', error);
    
    // Diferenciar entre error de autenticación y otros errores
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json(
        { error: 'Unauthorized: Only admins can send emails' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to send email', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Obtener respuestas enviadas para un email
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const emailId = searchParams.get('emailId');

    if (!emailId) {
      return NextResponse.json(
        { error: 'Missing emailId parameter' },
        { status: 400 }
      );
    }

    const responses = await query(
      `SELECT * FROM admin_email_responses 
       WHERE admin_email_id = $1 
       ORDER BY sent_at DESC`,
      [emailId]
    );

    return NextResponse.json({
      emailId,
      responses,
      count: responses.length,
    });

  } catch (error) {
    console.error('[API] Error fetching responses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch responses' },
      { status: 500 }
    );
  }
}
