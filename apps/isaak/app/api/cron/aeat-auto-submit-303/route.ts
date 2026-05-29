// C-C — Cron de presentación automática del 303 con veto-window de 48h.
//
// Lógica en dos pasadas:
//   Pass A: para cada tenant con autoSubmit303=true, si el plazo 303 está
//           a ≤5 días y no existe ya una entrada en la cola → computa el
//           borrador, crea la entrada y envía email con link de veto.
//   Pass B: para entradas con status='pending_veto' cuyo vetoExpiresAt
//           ya pasó → llama submit303ForTenant() automáticamente.
//
// Auth: Authorization: Bearer ${CRON_SECRET}
// Schedule: diario 08:00 UTC (vercel.json).

import { timingSafeEqual, randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { prisma } from '@/app/lib/prisma';
import { compute303ForTenant, submit303ForTenant } from '@/app/lib/isaak-modelo-303-repo';
import type { Trimestre } from '@/app/lib/fiscal-models';

export const runtime = 'nodejs';
export const maxDuration = 300;

function authorizeCron(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const token = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

// 303 quarterly deadlines: month is 1-indexed for readability.
// Returns the due date (UTC midnight) for a given quarter/year.
function get303DueDate(ejercicio: number, periodo: Trimestre): Date {
  const dueDates: Record<Trimestre, [number, number]> = {
    '1T': [ejercicio, 4], // April 20
    '2T': [ejercicio, 7], // July 20
    '3T': [ejercicio, 10], // October 20
    '4T': [ejercicio + 1, 1], // January 20 next year
  };
  const [year, month] = dueDates[periodo];
  return new Date(Date.UTC(year, month - 1, 20));
}

// For a given date, return the 303 period that has its deadline 2–5 days away.
// Returns null if no deadline is in that window today.
function findUpcomingDeadline(now: Date): {
  ejercicio: number;
  periodo: Trimestre;
  dueDate: Date;
} | null {
  const year = now.getFullYear();
  const candidates: { ejercicio: number; periodo: Trimestre }[] = [
    { ejercicio: year - 1, periodo: '4T' }, // Jan 20 of current year
    { ejercicio: year, periodo: '1T' }, // Apr 20
    { ejercicio: year, periodo: '2T' }, // Jul 20
    { ejercicio: year, periodo: '3T' }, // Oct 20
    { ejercicio: year, periodo: '4T' }, // Jan 20 next year
  ];
  const nowDay = now.toISOString().slice(0, 10);
  for (const c of candidates) {
    const dueDate = get303DueDate(c.ejercicio, c.periodo);
    const daysUntil = (dueDate.getTime() - now.getTime()) / 86_400_000;
    if (daysUntil >= 2 && daysUntil <= 5) {
      // Double-check: due date must be in the future relative to today.
      if (dueDate.toISOString().slice(0, 10) > nowDay) {
        return { ...c, dueDate };
      }
    }
  }
  return null;
}

function buildVetoEmailHtml(input: {
  firstName: string;
  ejercicio: number;
  periodo: Trimestre;
  dueDate: string;
  vetoUrl: string;
  totalDevengado: string;
  totalSoportado: string;
  resultado: string;
  facturas: number;
  compras: number;
}): string {
  const {
    firstName,
    ejercicio,
    periodo,
    dueDate,
    vetoUrl,
    totalDevengado,
    totalSoportado,
    resultado,
    facturas,
    compras,
  } = input;
  const resultadoNum = parseFloat(resultado);
  const resultadoLabel =
    resultadoNum > 0
      ? `<span style="color:#dc2626;">A ingresar: ${resultado}€</span>`
      : resultadoNum < 0
        ? `<span style="color:#16a34a;">A devolver: ${Math.abs(resultadoNum).toFixed(2)}€</span>`
        : `<span style="color:#6b7280;">Resultado: 0,00€</span>`;

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Isaak — Presentación automática 303 ${periodo} ${ejercicio}</title></head>
<body style="margin:0;padding:0;background:#f8faff;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faff;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(15,23,42,.07);">
        <tr><td style="background:linear-gradient(135deg,#1e3a5f,#1d4ed8);padding:28px 32px;">
          <span style="color:#fff;font-size:20px;font-weight:700;">Isaak · Presentación automática 303</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;color:#0f172a;">Hola <strong>${firstName}</strong>,</p>
          <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6;">
            Isaak ha calculado el borrador del <strong>Modelo 303 ${periodo} ${ejercicio}</strong>
            y lo presentará automáticamente a la AEAT antes del plazo del
            <strong>${dueDate}</strong>, salvo que lo canceles.
          </p>

          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
            <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#0369a1;text-transform:uppercase;letter-spacing:.5px;">Resumen del borrador</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#1e293b;">
              <tr><td style="padding:4px 0;">IVA devengado (ventas)</td><td align="right"><strong>${totalDevengado}€</strong></td></tr>
              <tr><td style="padding:4px 0;">IVA soportado (compras)</td><td align="right"><strong>${totalSoportado}€</strong></td></tr>
              <tr><td style="padding:8px 0 4px;border-top:1px solid #e2e8f0;">Resultado</td><td align="right" style="padding-top:8px;">${resultadoLabel}</td></tr>
              <tr><td style="padding:4px 0;color:#64748b;font-size:12px;">Facturas emitidas</td><td align="right" style="color:#64748b;font-size:12px;">${facturas}</td></tr>
              <tr><td style="padding:4px 0;color:#64748b;font-size:12px;">Facturas recibidas</td><td align="right" style="color:#64748b;font-size:12px;">${compras}</td></tr>
            </table>
          </div>

          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
            <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#dc2626;">¿Quieres cancelar esta presentación?</p>
            <p style="margin:0 0 16px;font-size:13px;color:#7f1d1d;line-height:1.5;">
              Tienes <strong>48 horas</strong> para cancelar. Después, Isaak presentará el 303 automáticamente con tu certificado digital.
            </p>
            <a href="${vetoUrl}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
              Cancelar presentación automática
            </a>
          </div>

          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
            Si el botón no funciona, copia este enlace en tu navegador:<br>
            <span style="color:#3b82f6;">${vetoUrl}</span>
          </p>
        </td></tr>
        <tr><td style="background:#f8faff;padding:16px 32px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">
            Isaak · Copiloto fiscal IA · <a href="https://isaak.chat" style="color:#3b82f6;">isaak.chat</a>
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
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();

  const summary = {
    passA: { scanned: 0, created: 0, emailsSent: 0, skipped: 0, errors: [] as string[] },
    passB: { scanned: 0, submitted: 0, failed: 0, errors: [] as string[] },
  };

  // ── Pass A: create queue entries for upcoming deadlines ───────────────
  const upcoming = findUpcomingDeadline(now);

  if (upcoming) {
    const { ejercicio, periodo, dueDate } = upcoming;

    const profiles = await prisma.isaakTaxpayerProfile.findMany({
      where: { autoSubmit303: true },
      select: {
        tenantId: true,
        tenant: {
          select: {
            users: {
              where: { status: 'active' },
              orderBy: { createdAt: 'asc' },
              take: 1,
              include: { user: { select: { email: true, firstName: true } } },
            },
          },
        },
      },
    });

    summary.passA.scanned = profiles.length;

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://isaak.chat';
    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    const fromEmail =
      process.env.RESEND_FROM_ISAAK?.trim() ||
      process.env.RESEND_FROM?.trim() ||
      'Isaak <hola@verifactu.business>';

    for (const profile of profiles) {
      const { tenantId } = profile;

      try {
        // Skip if already queued for this period
        const existing = await prisma.isaakAutoSubmit303Queue.findUnique({
          where: { tenantId_ejercicio_periodo: { tenantId, ejercicio, periodo } },
          select: { id: true },
        });
        if (existing) {
          summary.passA.skipped++;
          continue;
        }

        // Compute draft
        const computed = await compute303ForTenant({
          tenantId,
          ejercicio,
          periodo: periodo as Trimestre,
          persist: true,
          createdBy: 'isaak-auto',
        });
        if (!computed.ok || computed.output.skipped) {
          summary.passA.skipped++;
          continue;
        }

        const result = computed.output.result;
        const vetoToken = randomUUID();
        const vetoExpiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);

        const entry = await prisma.isaakAutoSubmit303Queue.create({
          data: {
            tenantId,
            ejercicio,
            periodo,
            dueDate,
            status: 'pending_veto',
            vetoToken,
            vetoExpiresAt,
            draftJson: {
              totalDevengado: result.totalDevengado,
              totalSoportado: result.totalSoportado,
              resultado: result.resultado,
              facturas: result.facturas,
              compras: result.compras,
            },
            updatedAt: now,
          },
        });

        summary.passA.created++;

        // Send veto email
        const recipientEmail = profile.tenant.users[0]?.user?.email;
        if (!recipientEmail || !resendApiKey) {
          continue;
        }

        const firstName = profile.tenant.users[0]?.user?.firstName || 'ahí';
        const vetoUrl = `${appUrl}/api/isaak/modelos/303/veto?token=${vetoToken}`;
        const dueDateLabel = dueDate.toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        });

        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: fromEmail,
          to: [recipientEmail],
          subject: `Isaak presentará tu 303 ${periodo} ${ejercicio} automáticamente — puedes cancelarlo`,
          html: buildVetoEmailHtml({
            firstName,
            ejercicio,
            periodo: periodo as Trimestre,
            dueDate: dueDateLabel,
            vetoUrl,
            totalDevengado: result.totalDevengado.toFixed(2),
            totalSoportado: result.totalSoportado.toFixed(2),
            resultado: result.resultado.toFixed(2),
            facturas: result.facturas,
            compras: result.compras,
          }),
          text: `Hola ${firstName},\n\nIsaak presentará tu Modelo 303 ${periodo} ${ejercicio} antes del ${dueDateLabel}.\n\nResultado: ${result.resultado.toFixed(2)}€\n\nSi quieres cancelarlo, entra en: ${vetoUrl}\n\nTienes 48 horas para cancelar.`,
          replyTo: 'soporte@verifactu.business',
        });

        await prisma.isaakAutoSubmit303Queue.update({
          where: { id: entry.id },
          data: { emailSentAt: new Date() },
        });

        summary.passA.emailsSent++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        summary.passA.errors.push(`${tenantId}: ${msg}`);
      }
    }
  }

  // ── Pass B: auto-submit entries past veto window ──────────────────────
  const expired = await prisma.isaakAutoSubmit303Queue.findMany({
    where: {
      status: 'pending_veto',
      vetoExpiresAt: { lt: now },
    },
    select: { id: true, tenantId: true, ejercicio: true, periodo: true },
  });

  summary.passB.scanned = expired.length;

  for (const entry of expired) {
    try {
      await prisma.isaakAutoSubmit303Queue.update({
        where: { id: entry.id },
        data: { status: 'submitting', updatedAt: now },
      });

      const result = await submit303ForTenant({
        tenantId: entry.tenantId,
        ejercicio: entry.ejercicio,
        periodo: entry.periodo as Trimestre,
        submittedBy: 'isaak-auto',
      });

      if (result.ok) {
        await prisma.isaakAutoSubmit303Queue.update({
          where: { id: entry.id },
          data: {
            status: 'submitted',
            submittedAt: new Date(),
            submissionId: result.submissionId,
            updatedAt: new Date(),
          },
        });
        summary.passB.submitted++;
      } else {
        await prisma.isaakAutoSubmit303Queue.update({
          where: { id: entry.id },
          data: {
            status: 'submit_failed',
            errorMessage: result.message,
            updatedAt: new Date(),
          },
        });
        summary.passB.failed++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await prisma.isaakAutoSubmit303Queue
        .update({
          where: { id: entry.id },
          data: { status: 'submit_failed', errorMessage: msg, updatedAt: new Date() },
        })
        .catch(() => null);
      summary.passB.errors.push(`${entry.tenantId}: ${msg}`);
      summary.passB.failed++;
    }
  }

  return NextResponse.json({ ok: true, ...summary });
}
