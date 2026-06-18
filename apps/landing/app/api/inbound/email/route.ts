import { NextRequest, NextResponse } from 'next/server';
import { prisma, SupportChannelType, SupportMessageDirection } from '@verifactu/db';
import { Resend } from 'resend';

export const runtime = 'nodejs';

/**
 * POST /api/inbound/email
 *
 * Resend inbound webhook — receives emails sent to @isaak.app aliases:
 *   soporte@isaak.app  → appends SupportMessage to latest open ticket from the sender,
 *                        or creates a new ticket if none found
 *   hola@isaak.app     → notifies internal team of a direct contact email
 *
 * Resend inbound setup (resend.com → Inbound → add route):
 *   Domain: isaak.app
 *   Endpoint URL: https://verifactu.business/api/inbound/email
 *   (update to https://isaak.app/api/inbound/email once landing domain is migrated)
 *
 * Security: set RESEND_WEBHOOK_SECRET in Vercel env vars (Resend dashboard → Webhooks → signing secret).
 */

type ResendInboundPayload = {
  from: string;
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
  messageId?: string;
  inReplyTo?: string;
};

async function verifySignature(req: NextRequest, rawBody: string): Promise<boolean> {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.warn('[inbound/email] RESEND_WEBHOOK_SECRET not set — skipping signature check');
    return true;
  }

  const timestamp = req.headers.get('svix-timestamp') ?? req.headers.get('resend-timestamp');
  const signature = req.headers.get('svix-signature') ?? req.headers.get('resend-signature');
  if (!timestamp || !signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const signedPayload = `${timestamp}.${rawBody}`;
  const sigValue =
    signature
      .split(',')
      .find((s) => s.startsWith('v1,'))
      ?.slice(3) ?? signature;

  try {
    return await crypto.subtle.verify(
      'HMAC',
      key,
      Buffer.from(sigValue, 'base64'),
      encoder.encode(signedPayload)
    );
  } catch {
    return false;
  }
}

function extractText(payload: ResendInboundPayload): string {
  if (payload.text?.trim()) return payload.text.trim().slice(0, 8000);
  return (payload.html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000);
}

function extractEmail(from: string): string {
  const m = from.match(/<([^>]+)>/);
  return (m ? m[1] : from).trim().toLowerCase();
}

function matchesAlias(addresses: string[], alias: string): boolean {
  return addresses.some((a) => a.toLowerCase().includes(alias));
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const valid = await verifySignature(req, rawBody);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: ResendInboundPayload;
  try {
    payload = JSON.parse(rawBody) as ResendInboundPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const senderEmail = extractEmail(payload.from);
  const bodyText = extractText(payload);
  const subject = payload.subject || '(sin asunto)';

  if (matchesAlias(payload.to, 'soporte@isaak.app')) {
    await handleSupportReply({ senderEmail, subject, bodyText, payload }).catch((e) =>
      console.error('[inbound/email] support handler error:', e)
    );
    return NextResponse.json({ ok: true });
  }

  if (matchesAlias(payload.to, 'hola@isaak.app')) {
    await handleContactEmail({ senderEmail, subject, bodyText }).catch((e) =>
      console.error('[inbound/email] contact handler error:', e)
    );
    return NextResponse.json({ ok: true });
  }

  console.info('[inbound/email] unrouted', { to: payload.to, from: payload.from });
  return NextResponse.json({ ok: true });
}

// ── Support reply ─────────────────────────────────────────────────────────────

async function handleSupportReply({
  senderEmail,
  subject,
  bodyText,
  payload,
}: {
  senderEmail: string;
  subject: string;
  bodyText: string;
  payload: ResendInboundPayload;
}) {
  // Find latest open ticket matching sender
  const user = await prisma.user.findFirst({
    where: { email: senderEmail },
    select: { id: true, name: true },
  });

  const membership = user
    ? await prisma.membership.findFirst({
        where: { userId: user.id, status: 'active' },
        orderBy: { createdAt: 'desc' },
        select: { tenantId: true },
      })
    : null;

  if (user && membership) {
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        tenantId: membership.tenantId,
        openedByUserId: user.id,
        status: { in: ['open', 'waiting_client', 'waiting_ops'] },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, tenantId: true },
    });

    if (ticket) {
      await prisma.supportMessage.create({
        data: {
          ticketId: ticket.id,
          tenantId: ticket.tenantId,
          userId: user.id,
          direction: SupportMessageDirection.inbound,
          channelType: SupportChannelType.email,
          body: bodyText,
          metadataJson: {
            source: 'inbound_email',
            subject,
            messageId: payload.messageId ?? null,
            inReplyTo: payload.inReplyTo ?? null,
          },
        },
      });
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { lastMessageAt: new Date() },
      });
      console.info('[inbound/email] reply appended to ticket', ticket.id);
    } else {
      // No open ticket — create one
      const newTicket = await prisma.supportTicket.create({
        data: {
          tenantId: membership.tenantId,
          openedByUserId: user.id,
          channelType: SupportChannelType.email,
          subject,
          description: bodyText,
          priority: 'normal',
          lastMessageAt: new Date(),
          metadataJson: { source: 'inbound_email', fromEmail: senderEmail },
        },
        select: { id: true, tenantId: true },
      });
      console.info('[inbound/email] new ticket created from email', newTicket.id);
    }
  } else {
    console.info('[inbound/email] unrecognized sender', senderEmail);
  }

  void notifyTeam({
    subject: `[Soporte email] ${subject} — ${senderEmail}`,
    body: `De: ${senderEmail}\nAsunto: ${subject}\n\n${bodyText}`,
    variant: 'soporte',
  }).catch((e) => console.error('[inbound/email] team notify error:', e));
}

// ── Contact email ─────────────────────────────────────────────────────────────

async function handleContactEmail({
  senderEmail,
  subject,
  bodyText,
}: {
  senderEmail: string;
  subject: string;
  bodyText: string;
}) {
  console.info('[inbound/email] direct contact email', { from: senderEmail, subject });

  void notifyTeam({
    subject: `[Contacto directo] ${subject} — ${senderEmail}`,
    body: `De: ${senderEmail}\nAsunto: ${subject}\n\n${bodyText}`,
    variant: 'comercial',
  }).catch((e) => console.error('[inbound/email] team notify error:', e));
}

// ── Internal notification ─────────────────────────────────────────────────────

async function notifyTeam({
  subject,
  body,
  variant,
}: {
  subject: string;
  body: string;
  variant: 'soporte' | 'comercial';
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return;

  const recipients = [
    process.env.SUPPORT_EMAIL,
    process.env.LEAD_EMAIL,
    'soporte@verifactu.business',
  ]
    .flatMap((v) => (v || '').split(/[;,]/))
    .map((v) => v.trim())
    .filter(Boolean);
  if (!recipients.length) return;

  const sender =
    process.env.RESEND_FROM_ISAAK?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    'Isaak <noreply@isaak.app>';

  const label = variant === 'soporte' ? 'Soporte' : 'Contacto';
  const safeBody = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: sender,
    to: recipients,
    subject: `[${label} inbound] ${subject}`,
    text: body,
    html: `<div style="font-family:Arial,sans-serif;white-space:pre-wrap;font-size:14px;color:#0f172a;">${safeBody}</div>`,
  });
}
