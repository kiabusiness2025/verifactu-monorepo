import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@verifactu/db';
import { verifySessionToken, readSessionSecret, SESSION_COOKIE_NAME } from '@verifactu/utils';
import { checkRateLimit, getRequestIp } from '../../lib/security/rate-limit';
import { Resend } from 'resend';
import {
  renderCorporateBrandedEmail,
  renderCorporatePlainTextEmail,
} from '../../lib/emailTemplates';

/**
 * POST /api/custom-integration-request
 *
 * Saves a CustomIntegrationRequest to the database.
 * Called from /integraciones when a user fills the "integracion personalizada" form.
 */

const schema = z.object({
  contactName: z.string().min(1).max(120),
  contactEmail: z.string().email(),
  contactPhone: z.string().max(30).optional(),
  companyName: z.string().max(120).optional(),
  title: z.string().min(3).max(200),
  summary: z.string().min(10).max(2000),
  requestedSystems: z.array(z.string().max(80)).max(20).optional(),
  businessGoals: z.array(z.string().max(200)).max(10).optional(),
  budgetRange: z.enum(['<1000', '1000-5000', '5000-20000', '>20000']).optional(),
  urgency: z.enum(['low', 'medium', 'high']).optional(),
});

async function getUserFromSession(req: NextRequest) {
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
  if (!m) return null;
  const token = decodeURIComponent(m[1]);
  try {
    const secret = readSessionSecret();
    const payload = await verifySessionToken(token, secret);
    return payload ? { uid: payload.uid || '', email: payload.email || null } : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const ip = getRequestIp(req);
  const rate = await checkRateLimit({
    key: `custom-integration-request:${ip}`,
    limit: 3,
    windowSeconds: 60 * 60, // 1 request per hour per IP
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const data = parsed.data;
  const sessionUser = await getUserFromSession(req);

  try {
    const record = await prisma.customIntegrationRequest.create({
      data: {
        contactEmail: data.contactEmail,
        contactName: data.contactName,
        contactPhone: data.contactPhone ?? null,
        companyName: data.companyName ?? null,
        title: data.title,
        summary: data.summary,
        requestedSystems: data.requestedSystems ?? [],
        businessGoals: data.businessGoals ?? [],
        budgetRange: data.budgetRange ?? null,
        urgency: data.urgency ?? null,
        sourceChannel: 'landing',
        status: 'submitted',
        userId: sessionUser?.uid ?? null,
      },
      select: { id: true },
    });

    void sendIntegrationRequestEmails(data, record.id).catch((err) =>
      console.error('[api/custom-integration-request] email failed:', err)
    );

    return NextResponse.json({ ok: true, id: record.id }, { status: 201 });
  } catch (err) {
    console.error('[api/custom-integration-request] error:', err);
    return NextResponse.json({ error: 'Error al guardar la solicitud' }, { status: 500 });
  }
}

async function sendIntegrationRequestEmails(
  data: z.infer<typeof schema>,
  requestId: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return;

  const resend = new Resend(apiKey);
  const sender =
    process.env.RESEND_FROM_ISAAK?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    'Isaak <noreply@isaak.app>';

  const recipients = [
    process.env.LEAD_EMAIL,
    process.env.SUPPORT_EMAIL,
    'soporte@verifactu.business',
  ]
    .flatMap((v) => (v || '').split(/[;,]/))
    .map((v) => v.trim())
    .filter(Boolean);

  const urgencyLabel: Record<string, string> = { low: 'Baja', medium: 'Media', high: 'Alta' };
  const budgetLabel: Record<string, string> = {
    '<1000': 'Menos de 1.000 €',
    '1000-5000': '1.000 – 5.000 €',
    '5000-20000': '5.000 – 20.000 €',
    '>20000': 'Más de 20.000 €',
  };

  const detailsHtml = `
    <p style="margin:0 0 8px;"><strong>ID:</strong> ${requestId}</p>
    <p style="margin:0 0 8px;"><strong>Nombre:</strong> ${data.contactName}</p>
    <p style="margin:0 0 8px;"><strong>Email:</strong> ${data.contactEmail}</p>
    ${data.contactPhone ? `<p style="margin:0 0 8px;"><strong>Teléfono:</strong> ${data.contactPhone}</p>` : ''}
    ${data.companyName ? `<p style="margin:0 0 8px;"><strong>Empresa:</strong> ${data.companyName}</p>` : ''}
    <p style="margin:0 0 8px;"><strong>Título:</strong> ${data.title}</p>
    <p style="margin:0 0 8px;"><strong>Descripción:</strong></p>
    <p style="margin:0 0 8px;white-space:pre-line;">${data.summary}</p>
    ${data.requestedSystems?.length ? `<p style="margin:0 0 8px;"><strong>Sistemas:</strong> ${data.requestedSystems.join(', ')}</p>` : ''}
    ${data.budgetRange ? `<p style="margin:0 0 8px;"><strong>Presupuesto:</strong> ${budgetLabel[data.budgetRange] ?? data.budgetRange}</p>` : ''}
    ${data.urgency ? `<p style="margin:0;"><strong>Urgencia:</strong> ${urgencyLabel[data.urgency] ?? data.urgency}</p>` : ''}
  `;

  const adminHtml = renderCorporateBrandedEmail({
    variant: 'comercial',
    title: 'Nueva solicitud de integración personalizada',
    intro: `${data.contactName} de ${data.companyName || 'empresa no indicada'} ha enviado una solicitud de integración a medida.`,
    bodyHtml: detailsHtml,
    footerNote: 'Notificacion automatica desde isaak.app/integraciones.',
  });

  const adminText = renderCorporatePlainTextEmail({
    variant: 'comercial',
    title: 'Nueva solicitud de integración personalizada',
    intro: `${data.contactName} ha enviado una solicitud de integración a medida.`,
    lines: [
      `ID: ${requestId}`,
      `Nombre: ${data.contactName}`,
      `Email: ${data.contactEmail}`,
      ...(data.contactPhone ? [`Teléfono: ${data.contactPhone}`] : []),
      ...(data.companyName ? [`Empresa: ${data.companyName}`] : []),
      `Título: ${data.title}`,
      `Descripción: ${data.summary}`,
      ...(data.requestedSystems?.length ? [`Sistemas: ${data.requestedSystems.join(', ')}`] : []),
      ...(data.budgetRange
        ? [`Presupuesto: ${budgetLabel[data.budgetRange] ?? data.budgetRange}`]
        : []),
      ...(data.urgency ? [`Urgencia: ${urgencyLabel[data.urgency] ?? data.urgency}`] : []),
    ],
    footerNote: 'Notificacion automatica desde isaak.app/integraciones.',
  });

  await resend.emails.send({
    from: sender,
    to: recipients,
    subject: `Solicitud integración: ${data.title} — ${data.contactName}`,
    reply_to: data.contactEmail,
    html: adminHtml,
    text: adminText,
  });

  // Acuse al usuario
  const ackHtml = renderCorporateBrandedEmail({
    variant: 'comercial',
    title: 'Hemos recibido tu solicitud de integración',
    intro:
      'Gracias por tu interés. Nuestro equipo revisará los detalles y te contactará en breve para concretar los próximos pasos.',
    bodyHtml: `
      <p style="margin:0 0 8px;"><strong>Referencia:</strong> ${requestId}</p>
      <p style="margin:0 0 8px;"><strong>Título:</strong> ${data.title}</p>
      <p style="margin:0;">Puedes responder a este correo si tienes alguna pregunta adicional.</p>
    `,
    footerNote: 'isaak.app — Integraciones a medida.',
  });

  await resend.emails.send({
    from: sender,
    to: data.contactEmail,
    subject: 'Solicitud de integración recibida · isaak.app',
    reply_to: 'soporte@isaak.app',
    html: ackHtml,
    text: `Hola ${data.contactName},\n\nHemos recibido tu solicitud (ref: ${requestId}).\n\nNuestro equipo te contactará pronto.\n\nIsaak — isaak.app`,
  });
}
