import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';
import { checkRateLimit, getRequestIp } from '../../lib/security/rate-limit';
import {
  renderCorporateBrandedEmail,
  renderCorporatePlainTextEmail,
} from '../../lib/emailTemplates';

const schema = z.object({
  email: z.string().email(),
  company: z.string().min(1).max(120),
  invoicesPerMonth: z.coerce.number().int().min(1),
  movementsPerMonth: z.coerce.number().int().min(1),
  integrations: z.array(z.string().max(80)).max(20).default([]),
  message: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  const ip = getRequestIp(req);
  const rate = await checkRateLimit({
    key: `quote-request:${ip}`,
    limit: 3,
    windowSeconds: 60 * 60,
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
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.error('[quote-request] RESEND_API_KEY not set');
    return NextResponse.json({ error: 'Servicio de correo no disponible.' }, { status: 503 });
  }

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

  const detailsHtml = `
    <p style="margin:0 0 8px;"><strong>Email:</strong> ${data.email}</p>
    <p style="margin:0 0 8px;"><strong>Empresa:</strong> ${data.company}</p>
    <p style="margin:0 0 8px;"><strong>Facturas/mes:</strong> ${data.invoicesPerMonth.toLocaleString('es-ES')}</p>
    <p style="margin:0 0 8px;"><strong>Movimientos/mes:</strong> ${data.movementsPerMonth.toLocaleString('es-ES')}</p>
    ${data.integrations.length ? `<p style="margin:0 0 8px;"><strong>Integraciones:</strong> ${data.integrations.join(', ')}</p>` : ''}
    ${data.message ? `<p style="margin:0 0 4px;"><strong>Mensaje:</strong></p><p style="margin:0;white-space:pre-line;">${data.message}</p>` : ''}
  `;

  const adminHtml = renderCorporateBrandedEmail({
    variant: 'comercial',
    title: 'Nueva solicitud de presupuesto Enterprise',
    intro: `${data.company} solicita presupuesto para ${data.invoicesPerMonth.toLocaleString('es-ES')} facturas/mes.`,
    bodyHtml: detailsHtml,
    footerNote: 'Solicitud desde isaak.app/presupuesto.',
  });

  const adminText = renderCorporatePlainTextEmail({
    variant: 'comercial',
    title: 'Nueva solicitud de presupuesto Enterprise',
    intro: `${data.company} solicita presupuesto para ${data.invoicesPerMonth.toLocaleString('es-ES')} facturas/mes.`,
    lines: [
      `Email: ${data.email}`,
      `Empresa: ${data.company}`,
      `Facturas/mes: ${data.invoicesPerMonth}`,
      `Movimientos/mes: ${data.movementsPerMonth}`,
      ...(data.integrations.length ? [`Integraciones: ${data.integrations.join(', ')}`] : []),
      ...(data.message ? [`Mensaje: ${data.message}`] : []),
    ],
    footerNote: 'Solicitud desde isaak.app/presupuesto.',
  });

  try {
    await resend.emails.send({
      from: sender,
      to: recipients,
      subject: `Presupuesto Enterprise: ${data.company}`,
      reply_to: data.email,
      html: adminHtml,
      text: adminText,
    });
  } catch (err) {
    console.error('[quote-request] admin email failed:', err);
    return NextResponse.json({ error: 'Error al enviar la solicitud.' }, { status: 502 });
  }

  // Acuse al usuario
  const ackHtml = renderCorporateBrandedEmail({
    variant: 'comercial',
    title: 'Solicitud de presupuesto recibida',
    intro:
      'Hemos recibido tu solicitud. Nuestro equipo comercial la revisará y te enviará una propuesta personalizada en 24-48 horas.',
    bodyHtml: `
      <p style="margin:0 0 8px;"><strong>Empresa:</strong> ${data.company}</p>
      <p style="margin:0 0 8px;"><strong>Volumen:</strong> ${data.invoicesPerMonth.toLocaleString('es-ES')} facturas/mes, ${data.movementsPerMonth.toLocaleString('es-ES')} movimientos/mes</p>
      <p style="margin:0;">Puedes responder a este correo si tienes alguna pregunta.</p>
    `,
    footerNote: 'isaak.app — Soluciones Enterprise.',
  });

  try {
    await resend.emails.send({
      from: sender,
      to: data.email,
      subject: 'Solicitud de presupuesto recibida · isaak.app',
      reply_to: 'soporte@isaak.app',
      html: ackHtml,
      text: `Hemos recibido tu solicitud de presupuesto para ${data.company}.\n\nNuestro equipo comercial te contactará en 24-48 horas.\n\nIsaak — isaak.app`,
    });
  } catch (err) {
    console.warn('[quote-request] ack email failed (non-critical):', err);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
