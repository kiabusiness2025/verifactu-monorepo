import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requireAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';

// Force dynamic rendering (uses cookies for admin auth)
export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY);
const SUPPORT_EMAIL = 'Verifactu Business <soporte@verifactu.business>';

interface AttachmentInput {
  filename: string;
  content: string; // base64
}

interface TagInput {
  name: string;
  value: string;
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const {
      to,
      cc,
      bcc,
      replyTo,
      subject,
      text,
      html,
      tags,
      attachments,
    } = body;

    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json({ error: 'Missing recipients' }, { status: 400 });
    }
    if (!subject) {
      return NextResponse.json({ error: 'Missing subject' }, { status: 400 });
    }
    if (!text && !html) {
      return NextResponse.json({ error: 'Provide text or html' }, { status: 400 });
    }

    const cleanedTo = to.map((v: string) => v.trim()).filter(Boolean);
    const cleanedCc = Array.isArray(cc) ? cc.map((v: string) => v.trim()).filter(Boolean) : undefined;
    const cleanedBcc = Array.isArray(bcc) ? bcc.map((v: string) => v.trim()).filter(Boolean) : undefined;

    const sendPayload: any = {
      from: SUPPORT_EMAIL,
      to: cleanedTo,
      subject,
      text: text || undefined,
      html: html || text,
    };

    if (cleanedCc && cleanedCc.length) sendPayload.cc = cleanedCc;
    if (cleanedBcc && cleanedBcc.length) sendPayload.bcc = cleanedBcc;
    if (replyTo) sendPayload.reply_to = replyTo;

    // Tags
    if (Array.isArray(tags)) {
      const parsedTags = (tags as TagInput[]).filter((t) => t?.name && t?.value);
      if (parsedTags.length) {
        sendPayload.tags = parsedTags;
      }
    }

    // Attachments
    if (Array.isArray(attachments)) {
      const parsedAttachments = (attachments as AttachmentInput[])
        .filter((a) => a?.filename && a?.content)
        .map((a) => ({ filename: a.filename, content: a.content }));
      if (parsedAttachments.length) {
        sendPayload.attachments = parsedAttachments;
      }
    }

    const result = await resend.emails.send(sendPayload);

    if ((result as any).error) {
      console.error('[API] Resend error:', (result as any).error);
      return NextResponse.json(
        { error: 'Failed to send email', details: (result as any).error?.message },
        { status: 500 }
      );
    }

    const messageId = (result as any).data?.id || (result as any).id || '';

    // Registrar envío en admin_emails (opcional, como outbound)
    if (messageId) {
      try {
        await query(
          `INSERT INTO admin_emails (
            message_id,
            from_email,
            from_name,
            to_email,
            subject,
            text_content,
            html_content,
            priority,
            status,
            received_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'normal', 'responded', NOW())
          ON CONFLICT DO NOTHING` as string,
          [
            messageId,
            'soporte@verifactu.business',
            'Verifactu Business',
            cleanedTo.join(', '),
            subject,
            text || html || '',
            html || text || '',
          ]
        );
      } catch (err) {
        console.warn('[API] No se pudo registrar el envío en admin_emails:', err);
      }
    }

    return NextResponse.json({
      success: true,
      messageId,
      to: cleanedTo,
      cc: cleanedCc,
      bcc: cleanedBcc,
    });
  } catch (error) {
    console.error('[API] Error sending custom email:', error);
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
