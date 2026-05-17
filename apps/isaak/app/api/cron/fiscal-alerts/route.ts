import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/app/lib/prisma';
import { getFiscalDeadlines } from '@/app/lib/fiscal-calendar';
import { createAlert, fanOutAlert } from '@/app/lib/isaak-alert-service';
import { normalizePhone, sendWhatsAppTemplate } from '@/app/lib/whatsapp';
import { resolveAlertTemplate } from '@/app/lib/whatsapp-templates';

export const runtime = 'nodejs';
export const maxDuration = 60;

function authorizeCron(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

const ALERT_WINDOWS = [15, 7, 3, 1];

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const year = now.getFullYear();
  const deadlines = getFiscalDeadlines(year);

  // Include next-year January deadlines if we're in December
  if (now.getMonth() === 11) {
    deadlines.push(
      ...getFiscalDeadlines(year + 1).filter(
        (d) => d.date.getFullYear() === year + 1 && d.date.getMonth() === 0
      )
    );
  }

  const tenants = await prisma.tenant.findMany({
    where: { tenantSubscriptions: { some: { status: { in: ['trial', 'active'] } } } },
    include: {
      users: {
        where: { status: 'active' },
        orderBy: { createdAt: 'asc' },
        take: 1,
        include: { user: { select: { email: true, firstName: true } } },
      },
    },
  });

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const deadline of deadlines) {
    for (const daysLeft of ALERT_WINDOWS) {
      const alertDate = new Date(deadline.date.getTime() - daysLeft * 86_400_000);
      const alertDay = alertDate.toISOString().slice(0, 10);
      const today = now.toISOString().slice(0, 10);

      if (alertDay !== today) continue;

      const alertType = `fiscal_deadline_d${daysLeft}_${deadline.id}`;

      for (const tenant of tenants) {
        const recipientEmail = tenant.users[0]?.user?.email;
        if (!recipientEmail) {
          skipped++;
          continue;
        }

        // Deduplicate: skip if alert already sent today for this tenant+type
        const existing = await prisma.isaakAlert.findFirst({
          where: {
            tenantId: tenant.id,
            type: alertType,
            createdAt: { gte: new Date(now.toISOString().slice(0, 10)) },
          },
        });
        if (existing) {
          skipped++;
          continue;
        }

        try {
          const alert = await createAlert({
            tenantId: tenant.id,
            type: alertType,
            title: deadline.title,
            body: deadline.description,
            dueDate: deadline.date,
            channel: 'email',
            metadata: {
              modelo: deadline.modelo,
              category: deadline.category,
              daysLeft,
            } as Prisma.InputJsonObject,
          });

          await fanOutAlert({ ...alert, dueDate: alert.dueDate }, recipientEmail, daysLeft);

          // WA-III: enviar template HSM si el tenant tiene número WhatsApp vinculado
          await sendFiscalAlertWhatsApp({
            tenantId: tenant.id,
            firstName: tenant.users[0]?.user?.firstName ?? 'ahí',
            alertType,
            modelo: deadline.modelo ?? '',
            fechaVencimiento: deadline.date.toLocaleDateString('es-ES'),
            diasRestantes: daysLeft,
          }).catch((waErr) => {
            console.warn('[fiscal-alerts] WA template skipped', { tenantId: tenant.id, waErr });
          });

          sent++;
        } catch (err) {
          console.error('[fiscal-alerts] error', { tenantId: tenant.id, alertType, err });
          errors++;
        }
      }
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, errors });
}

// ── WA-III: envío de template HSM por WhatsApp ────────────────────────────────

async function sendFiscalAlertWhatsApp(input: {
  tenantId: string;
  firstName: string;
  alertType: string;
  modelo: string;
  fechaVencimiento: string;
  diasRestantes: number;
}): Promise<void> {
  const { tenantId, firstName, alertType, modelo, fechaVencimiento, diasRestantes } = input;

  // Buscar número WhatsApp activo del tenant
  const thread = await prisma.whatsAppThread.findFirst({
    where: { tenantId, status: 'open' },
    select: { phoneNumber: true },
    orderBy: { lastMessageAt: 'desc' },
  });
  if (!thread?.phoneNumber) return;

  const tmpl = resolveAlertTemplate({
    firstName,
    alertType,
    modelo,
    fechaVencimiento,
    diasRestantes,
    trimestre: modelo?.includes('303') ? inferTrimestre(fechaVencimiento) : undefined,
  });
  if (!tmpl) return;

  await sendWhatsAppTemplate(
    normalizePhone(thread.phoneNumber),
    tmpl.templateName,
    'es_ES',
    tmpl.components
  );
}

function inferTrimestre(fechaVencimiento: string): string {
  const date = new Date(fechaVencimiento.split('/').reverse().join('-'));
  const month = date.getMonth() + 1;
  if (month <= 4) return '1.º';
  if (month <= 7) return '2.º';
  if (month <= 10) return '3.º';
  return '4.º';
}
