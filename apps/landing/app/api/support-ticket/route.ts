import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { prisma, SupportChannelType, SupportMessageDirection } from '@verifactu/db';
import { isValidEmail, normalizeOptionalEmail } from '@verifactu/utils';
import { getSessionPayloadFromRequest } from '../../lib/sessionAuth';
import {
  renderCorporateBrandedEmail,
  renderCorporatePlainTextEmail,
} from '../../lib/emailTemplates';

const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

// MIME types permitidos para adjuntos de soporte
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/zip',
]);

function toSafeString(value: FormDataEntryValue | null): string {
  if (!value || typeof value !== 'string') return '';
  return value.trim();
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function resolveReplyToEmail(): string {
  return (
    process.env.LANDING_REPLY_TO_EMAIL?.trim() ||
    process.env.SUPPORT_EMAIL?.trim() ||
    'soporte@isaak.app'
  );
}

function parseEmailList(...values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => (value || '').split(/[;,]/))
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const session = await getSessionPayloadFromRequest(request);

    if (!session?.tenantId) {
      return NextResponse.json(
        { error: 'Necesitas iniciar sesion para crear tickets de soporte' },
        { status: 401 }
      );
    }

    const tenantId = session.tenantId;

    const name = toSafeString(formData.get('name'));
    const email = normalizeOptionalEmail(formData.get('email')) || '';
    const company = toSafeString(formData.get('company'));
    const product = toSafeString(formData.get('product'));
    const category = toSafeString(formData.get('category'));
    const priority = toSafeString(formData.get('priority'));
    const subject = toSafeString(formData.get('subject'));
    const description = toSafeString(formData.get('description'));
    const url = toSafeString(formData.get('url'));

    if (!name || !email || !subject || !description) {
      return NextResponse.json({ error: 'Completa los campos obligatorios' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'El correo no es valido' }, { status: 400 });
    }

    const user = session.uid
      ? await prisma.user.findFirst({
          where: { authSubject: session.uid },
          select: { id: true, email: true, name: true },
        })
      : await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, name: true },
        });

    if (!user) {
      return NextResponse.json({ error: 'No he podido identificar tu usuario' }, { status: 401 });
    }

    const membership = await prisma.membership.findFirst({
      where: {
        tenantId,
        userId: user.id,
        status: 'active',
      },
      select: { tenantId: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'No tienes acceso activo al tenant asociado a este ticket' },
        { status: 403 }
      );
    }

    const attachments: { filename: string; content: string; contentType?: string }[] = [];
    const attachmentMetadata: Array<{ name: string; type: string; size: number }> = [];
    const files = formData.getAll('attachments');
    for (const entry of files.slice(0, MAX_ATTACHMENTS)) {
      if (!(entry instanceof File)) continue;
      if (entry.size > MAX_ATTACHMENT_BYTES) {
        return NextResponse.json({ error: 'El archivo supera el limite de 5MB' }, { status: 400 });
      }
      // Validar tipo MIME para evitar subida de archivos ejecutables
      if (!ALLOWED_MIME_TYPES.has(entry.type)) {
        return NextResponse.json(
          { error: 'Tipo de archivo no permitido. Se aceptan: imágenes, PDF, texto y ZIP.' },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await entry.arrayBuffer());
      attachments.push({
        filename: entry.name || 'adjunto',
        content: buffer.toString('base64'),
        ...(entry.type ? { contentType: entry.type } : {}),
      });
      attachmentMetadata.push({
        name: entry.name || 'adjunto',
        type: entry.type || 'application/octet-stream',
        size: entry.size,
      });
    }

    const ticket = await prisma.$transaction(async (transaction) => {
      const createdTicket = await transaction.supportTicket.create({
        data: {
          tenantId,
          openedByUserId: user.id,
          channelType: SupportChannelType.landing,
          priority: priority || 'Media',
          subject,
          description,
          lastMessageAt: new Date(),
          metadataJson: {
            source: 'landing',
            requesterName: name,
            requesterEmail: email,
            company,
            product,
            category,
            url,
            attachments: attachmentMetadata,
          },
        },
        select: {
          id: true,
          subject: true,
          priority: true,
          status: true,
          createdAt: true,
        },
      });

      await transaction.supportMessage.create({
        data: {
          ticketId: createdTicket.id,
          tenantId,
          userId: user.id,
          direction: SupportMessageDirection.inbound,
          channelType: SupportChannelType.landing,
          body: description,
          attachmentsJson: attachmentMetadata.length > 0 ? attachmentMetadata : undefined,
        },
      });

      await transaction.user.update({
        where: { id: user.id },
        data: {
          ...(user.email?.toLowerCase() === email || !user.email ? { email } : {}),
          ...(user.name ? {} : { name }),
        },
      });

      return createdTicket;
    });

    const supportDetailsHtml = `
      <p style="margin:0 0 8px 0;"><strong>Ticket:</strong> ${escapeHtml(ticket.id)}</p>
      <p style="margin:0 0 8px 0;"><strong>Nombre:</strong> ${escapeHtml(name)}</p>
      <p style="margin:0 0 8px 0;"><strong>Email:</strong> ${escapeHtml(email)}</p>
      ${company ? `<p style="margin:0 0 8px 0;"><strong>Empresa:</strong> ${escapeHtml(company)}</p>` : ''}
      ${product ? `<p style="margin:0 0 8px 0;"><strong>Producto:</strong> ${escapeHtml(product)}</p>` : ''}
      ${category ? `<p style="margin:0 0 8px 0;"><strong>Categoria:</strong> ${escapeHtml(category)}</p>` : ''}
      ${priority ? `<p style="margin:0 0 8px 0;"><strong>Prioridad:</strong> ${escapeHtml(priority)}</p>` : ''}
      <p style="margin:0 0 8px 0;"><strong>Asunto:</strong> ${escapeHtml(subject)}</p>
      ${url ? `<p style="margin:0 0 8px 0;"><strong>URL:</strong> ${escapeHtml(url)}</p>` : ''}
      <p style="margin:0 0 8px 0;"><strong>Descripcion:</strong></p>
      <p style="margin:0;white-space:pre-line;">${escapeHtml(description)}</p>
    `;

    const emailContent = renderCorporateBrandedEmail({
      variant: 'soporte',
      title: `Nuevo ticket de soporte: ${subject}`,
      intro: 'Se ha generado un nuevo ticket de soporte desde la landing de isaak.app.',
      bodyHtml: supportDetailsHtml,
      footerNote: 'Notificacion automatica del flujo de soporte.',
    });

    const emailTextContent = renderCorporatePlainTextEmail({
      variant: 'soporte',
      title: `Nuevo ticket de soporte: ${subject}`,
      intro: 'Se ha generado un nuevo ticket de soporte desde la landing de isaak.app.',
      lines: [
        `Ticket: ${ticket.id}`,
        `Nombre: ${name}`,
        `Email: ${email}`,
        ...(company ? [`Empresa: ${company}`] : []),
        ...(product ? [`Producto: ${product}`] : []),
        ...(category ? [`Categoria: ${category}`] : []),
        ...(priority ? [`Prioridad: ${priority}`] : []),
        `Asunto: ${subject}`,
        ...(url ? [`URL: ${url}`] : []),
        `Descripcion: ${description}`,
      ],
      footerNote: 'Notificacion automatica del flujo de soporte.',
    });

    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    const supportRecipients = parseEmailList(
      process.env.SUPPORT_EMAIL,
      'soporte@verifactu.business'
    );
    const adminRecipients = parseEmailList(
      process.env.ADMIN_NOTIFICATION_EMAIL,
      process.env.ADMIN_EMAILS
    );

    if (resendApiKey && supportRecipients.length > 0) {
      const resend = new Resend(resendApiKey);
      try {
        await resend.emails.send({
          from:
            process.env.RESEND_FROM_ISAAK?.trim() ||
            process.env.RESEND_FROM?.trim() ||
            'Isaak <noreply@isaak.app>',
          to: supportRecipients,
          bcc: adminRecipients.length > 0 ? adminRecipients : undefined,
          subject: `Ticket soporte: ${escapeHtml(subject)}`,
          html: emailContent,
          text: emailTextContent,
          reply_to: resolveReplyToEmail(),
          attachments,
        });
      } catch (notificationError) {
        console.error('support ticket notification failed:', notificationError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Ticket creado correctamente',
      ticketId: ticket.id,
    });
  } catch (error) {
    console.error('Error processing ticket:', error);
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 });
  }
}
