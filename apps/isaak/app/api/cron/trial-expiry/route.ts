import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@verifactu/integrations';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';
export const maxDuration = 60;

function authorizeCron(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}

function windowFor(days: number, now: Date): { from: Date; to: Date } {
  const ms = days * 86_400_000;
  return {
    from: new Date(now.getTime() + ms),
    to: new Date(now.getTime() + ms + 86_400_000),
  };
}

function trialEmailHtml(daysLeft: number, tenantName: string, firstName: string) {
  const urgency =
    daysLeft === 0
      ? 'Tu prueba gratuita termina <strong>hoy</strong>.'
      : daysLeft === 1
        ? 'Tu prueba gratuita termina <strong>mañana</strong>.'
        : `Tu prueba gratuita termina en <strong>${daysLeft} días</strong>.`;

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Isaak — Prueba gratuita</title></head>
<body style="margin:0;padding:0;background:#f8faff;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faff;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(15,23,42,.07);">
        <tr><td style="background:linear-gradient(135deg,#081936,#0b2060);padding:28px 32px;">
          <span style="color:#ffffff;font-size:20px;font-weight:700;">Isaak</span>
          <span style="color:#8ba0cc;font-size:13px;margin-left:8px;">Asistente fiscal inteligente</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;font-size:15px;color:#64748b;">Hola${firstName ? ` ${firstName}` : ''},</p>
          <p style="margin:0 0 24px;font-size:22px;font-weight:700;color:#0f172a;">${urgency}</p>
          <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
            Tu espacio <strong>${tenantName || 'en Isaak'}</strong> tiene acceso completo hasta que termine la prueba.
            Para continuar usando Isaak sin interrupciones, activa un plan antes de que expire.
          </p>
          <a href="https://isaak.verifactu.business/settings?section=billing"
             style="display:inline-block;background:#2361d8;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 28px;border-radius:9999px;margin:8px 0 24px;">
            Ver planes y activar
          </a>
          <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;">
            Si tienes dudas, responde a este email o escríbenos a
            <a href="mailto:hola@verifactu.business" style="color:#2361d8;">hola@verifactu.business</a>.
          </p>
        </td></tr>
        <tr><td style="background:#f8faff;padding:16px 32px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">
            © 2026 Verifactu Business · <a href="https://isaak.verifactu.business" style="color:#94a3b8;">isaak.verifactu.business</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const windows = [
    { daysLeft: 7, ...windowFor(6, now) },
    { daysLeft: 3, ...windowFor(2, now) },
    { daysLeft: 0, from: now, to: new Date(now.getTime() + 86_400_000) },
  ];

  let sent = 0;
  let errors = 0;

  for (const { daysLeft, from, to } of windows) {
    const subscriptions = await prisma.tenantSubscription.findMany({
      where: {
        status: 'trial',
        trialEndsAt: { gte: from, lt: to },
      },
      include: {
        tenant: {
          include: {
            users: {
              where: { status: 'active' },
              orderBy: { createdAt: 'asc' },
              include: { user: { select: { email: true, firstName: true } } },
              take: 1,
            },
          },
        },
      },
    });

    for (const sub of subscriptions) {
      const member = sub.tenant.users[0];
      if (!member?.user?.email) continue;

      const { email, firstName } = member.user;
      try {
        await sendEmail({
          to: email,
          from: 'Isaak <hola@verifactu.business>',
          subject:
            daysLeft === 0
              ? 'Tu prueba gratuita de Isaak termina hoy'
              : daysLeft === 1
                ? 'Tu prueba gratuita de Isaak termina mañana'
                : `Tu prueba gratuita de Isaak termina en ${daysLeft} días`,
          html: trialEmailHtml(daysLeft, sub.tenant.name, firstName ?? ''),
        });
        sent++;
      } catch (err) {
        console.error('[trial-expiry] email error', { tenantId: sub.tenantId, err });
        errors++;
      }
    }
  }

  return NextResponse.json({ ok: true, sent, errors });
}
