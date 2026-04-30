import { NextRequest, NextResponse } from 'next/server';
import { sendHoldedNotificationEmail } from '@/app/lib/communications/holded-email-service';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

type ConnectorId = 'chatgpt' | 'claude';

type RateRecord = {
  count: number;
  resetAt: number;
};

const rateStore = new Map<string, RateRecord>();
const RATE_LIMIT = 6;
const RATE_WINDOW_MS = 10 * 60 * 1000;

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeConnector(value: unknown): ConnectorId {
  return value === 'claude' ? 'claude' : 'chatgpt';
}

function getRequestIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') || 'unknown';
}

function isRateLimited(key: string) {
  const now = Date.now();
  const current = rateStore.get(key);

  if (!current || current.resetAt <= now) {
    rateStore.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { limited: false, retryAfter: 0 };
  }

  if (current.count >= RATE_LIMIT) {
    return { limited: true, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
  }

  current.count += 1;
  rateStore.set(key, current);
  return { limited: false, retryAfter: 0 };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function readEmailList(...values: Array<string | undefined | null>) {
  return Array.from(
    new Set(
      values
        .filter(Boolean)
        .flatMap((value) => String(value).split(/[\n,;]+/))
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

function resolveAdminRecipients() {
  const configured = readEmailList(
    process.env.HOLDED_SUPPORT_EMAIL,
    process.env.HOLDED_CONTACT_EMAIL,
    process.env.RESEND_ADMIN_EMAILS,
    process.env.RESEND_ADMIN_EMAIL,
    process.env.ADMIN_EMAILS
  );

  return configured.length > 0 ? configured : ['soporte@verifactu.business'];
}

function buildTicketHtml(input: {
  connector: ConnectorId;
  ticketId: string;
  userEmail: string;
  userName?: string | null;
  subject: string;
  message: string;
  source?: string | null;
}) {
  const aiName = input.connector === 'claude' ? 'Claude' : 'ChatGPT';
  return `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h2>Nuevo ticket de soporte - Holded para ${aiName}</h2>
      <p><strong>Ticket:</strong> ${escapeHtml(input.ticketId)}</p>
      <p><strong>Usuario:</strong> ${escapeHtml(input.userName || 'Usuario autenticado')} (${escapeHtml(
        input.userEmail
      )})</p>
      <p><strong>Origen:</strong> ${escapeHtml(input.source || `${input.connector}_support`)}</p>
      <p><strong>Asunto:</strong> ${escapeHtml(input.subject)}</p>
      <div style="margin-top:16px;padding:14px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc">
        ${escapeHtml(input.message).replace(/\n/g, '<br />')}
      </div>
    </div>
  `;
}

function buildConfirmationHtml(input: {
  connector: ConnectorId;
  ticketId: string;
  subject: string;
}) {
  const aiName = input.connector === 'claude' ? 'Claude' : 'ChatGPT';
  return `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h2>Hemos recibido tu consulta</h2>
      <p>Tu ticket sobre el conector Holded para ${aiName} ha quedado registrado.</p>
      <p><strong>Referencia:</strong> ${escapeHtml(input.ticketId)}</p>
      <p><strong>Asunto:</strong> ${escapeHtml(input.subject)}</p>
      <p>Si necesitas adjuntar archivos, responde a este correo o escribe a soporte@verifactu.business indicando la referencia del ticket.</p>
    </div>
  `;
}

export async function POST(request: NextRequest) {
  const session = await getHoldedSession();

  if (!session?.userId || !session?.tenantId || !session?.email) {
    return NextResponse.json(
      { error: 'Inicia sesion para crear un ticket de soporte.' },
      { status: 401 }
    );
  }

  const userEmail = session.email;
  const userName = session.name || null;
  const rateKey = `${session.userId}:${getRequestIp(request)}`;
  const rate = isRateLimited(rateKey);
  if (rate.limited) {
    return NextResponse.json(
      { error: 'Demasiadas consultas. Intentalo de nuevo en unos minutos.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } }
    );
  }

  const body = await request.json().catch(() => ({}));
  const connector = normalizeConnector(body?.connector);
  const message = normalizeString(body?.message);
  const source = normalizeString(body?.source) || `${connector}_connector_support_form`;
  const subject =
    normalizeString(body?.subject).slice(0, 140) ||
    `Soporte conector Holded para ${connector === 'claude' ? 'Claude' : 'ChatGPT'}`;

  if (!message || message.length < 10) {
    return NextResponse.json(
      { error: 'Describe la consulta con al menos 10 caracteres.' },
      { status: 400 }
    );
  }

  if (message.length > 4000) {
    return NextResponse.json(
      { error: 'El mensaje es demasiado largo. Maximo 4000 caracteres.' },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.supportTicket.create({
        data: {
          tenantId: session.tenantId,
          openedByUserId: session.userId,
          channelType: 'landing',
          status: 'open',
          priority: 'normal',
          subject,
          description: message.slice(0, 1000),
          lastMessageAt: new Date(),
          metadataJson: {
            connector,
            source,
            page: `/conectores/${connector}/soporte`,
          },
        },
        select: { id: true },
      });

      await tx.supportMessage.create({
        data: {
          ticketId: ticket.id,
          tenantId: session.tenantId,
          userId: session.userId,
          direction: 'inbound',
          channelType: 'landing',
          body: message,
          bodyFormat: 'text',
          metadataJson: { connector, source },
        },
      });

      return ticket;
    });

    const ticketId = result.id;
    const adminRecipients = resolveAdminRecipients();
    const aiName = connector === 'claude' ? 'Claude' : 'ChatGPT';

    let emailStatus: 'sent' | 'failed' = 'sent';
    try {
      const emailResults = await Promise.all([
        ...adminRecipients.map((to) =>
          sendHoldedNotificationEmail({
            to,
            subject: `[Holded ${aiName}] Nuevo ticket de soporte: ${subject}`,
            html: buildTicketHtml({
              connector,
              ticketId,
              userEmail,
              userName,
              subject,
              message,
              source,
            }),
            text: `Nuevo ticket ${ticketId}\nUsuario: ${userEmail}\nAsunto: ${subject}\n\n${message}`,
            replyTo: userEmail,
          })
        ),
        sendHoldedNotificationEmail({
          to: userEmail,
          subject: `Ticket recibido - Conector Holded para ${aiName}`,
          html: buildConfirmationHtml({ connector, ticketId, subject }),
          text: `Hemos recibido tu consulta.\nReferencia: ${ticketId}\nAsunto: ${subject}`,
        }),
      ]);
      if (emailResults.some((result) => !result.success)) {
        emailStatus = 'failed';
      }
    } catch (error) {
      emailStatus = 'failed';
      console.error('[holded support ticket] email notification failed', error);
    }

    return NextResponse.json({
      ok: true,
      ticketId,
      emailStatus,
    });
  } catch (error) {
    console.error('[holded support ticket] failed', error);
    return NextResponse.json(
      { error: 'No hemos podido crear el ticket ahora mismo.' },
      { status: 500 }
    );
  }
}
