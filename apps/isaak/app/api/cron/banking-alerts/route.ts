/**
 * GET /api/cron/banking-alerts
 *
 * Runs daily at 07:30 UTC (08:30 CET). Proactive banking agent:
 *
 * 1. LOW BALANCE: for every tenant with active banking accounts, if the total
 *    balance (already synced in SeAccount) is below LOW_BALANCE_THRESHOLD (€),
 *    sends a WhatsApp + push notification. Deduplicated to one alert per 7 days.
 *
 * 2. EB EXPIRY (WA complement): connector-health already sends email alerts for
 *    expiring Enable Banking sessions. This cron adds a WhatsApp notification
 *    for the same condition (session expiring ≤7 days). Deduplicated separately.
 *
 * Auth: CRON_SECRET header (Vercel standard).
 */

import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { createAlert } from '@/app/lib/isaak-alert-service';
import { normalizePhone, sendWhatsAppTemplate } from '@/app/lib/whatsapp';
import { sendPushToTenant } from '@/app/lib/push-service';
import {
  TEMPLATE_SALDO_BAJO,
  buildSaldoBajoComponents,
  TEMPLATE_EB_EXPIRY,
  buildEbExpiryComponents,
} from '@/app/lib/whatsapp-templates';

export const runtime = 'nodejs';
export const maxDuration = 120;

// ── Deduplication helper (local, same logic as connector-health) ──────────────

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000);
}

async function alreadyAlertedRecently(
  tenantId: string,
  type: string,
  withinDays: number
): Promise<boolean> {
  const existing = await prisma.isaakAlert.findFirst({
    where: { tenantId, type, createdAt: { gte: daysAgo(withinDays) } },
  });
  return existing !== null;
}

// Default low-balance threshold — override per deployment if needed
const LOW_BALANCE_THRESHOLD =
  Number(process.env.BANKING_LOW_BALANCE_THRESHOLD_EUR ?? 1000);

// ── Auth ──────────────────────────────────────────────────────────────────────

function validateCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || token.length !== secret.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(secret));
  } catch {
    return false;
  }
}

// ── Helper: resolve first name from TenantProfile ────────────────────────────

function firstNameFromProfile(
  profile: { legalName?: string | null; tradeName?: string | null } | null
): string {
  const name = profile?.tradeName ?? profile?.legalName ?? '';
  return name.split(' ')[0] ?? 'equipo';
}

// ── Helper: WA phone for tenant ───────────────────────────────────────────────

async function getTenantWaPhone(tenantId: string): Promise<string | null> {
  const thread = await prisma.whatsAppThread.findFirst({
    where: { tenantId, status: 'open' },
    select: { phoneNumber: true },
    orderBy: { lastMessageAt: 'desc' },
  });
  return thread?.phoneNumber ?? null;
}

// ── Check 1: Low balance alert ────────────────────────────────────────────────

async function checkLowBalances(): Promise<{
  checked: number;
  alerted: number;
  errors: number;
}> {
  const result = { checked: 0, alerted: 0, errors: 0 };

  // Aggregate balances per tenant
  const balances = await prisma.seAccount.groupBy({
    by: ['tenantId'],
    where: { status: 'active' },
    _sum: { balance: true },
  });

  for (const row of balances) {
    result.checked++;
    const tenantId = row.tenantId;
    const totalBalance = Number(row._sum.balance ?? 0);
    if (totalBalance >= LOW_BALANCE_THRESHOLD) continue;

    try {
      const alertType = 'banking_low_balance';
      const alreadySent = await alreadyAlertedRecently(tenantId, alertType, 7);
      if (alreadySent) continue;

      const profile = await prisma.tenantProfile.findUnique({
        where: { tenantId },
        select: { legalName: true, tradeName: true },
      });
      const firstName = firstNameFromProfile(profile);
      const saldoFmt = totalBalance.toLocaleString('es-ES', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });

      // Record alert (deduplication)
      await createAlert({
        tenantId,
        type: alertType,
        title: 'Saldo bancario bajo',
        body: `Saldo total ${saldoFmt} € está por debajo del umbral de ${LOW_BALANCE_THRESHOLD} €.`,
      });

      // Push notification
      await sendPushToTenant(tenantId, {
        title: '⚠️ Saldo bancario bajo',
        body: `Tu saldo total es ${saldoFmt} €. Revisa tu tesorería en Isaak.`,
        url: '/banking',
      }).catch((err) => console.error('[banking-alerts] push error', { tenantId, err }));

      // WhatsApp notification
      const phone = await getTenantWaPhone(tenantId);
      if (phone) {
        await sendWhatsAppTemplate(
          normalizePhone(phone),
          TEMPLATE_SALDO_BAJO,
          'es_ES',
          buildSaldoBajoComponents(firstName, saldoFmt)
        ).catch((err) => console.error('[banking-alerts] WA error', { tenantId, err }));
      }

      result.alerted++;
    } catch (err) {
      console.error('[banking-alerts] low balance error', { tenantId, err });
      result.errors++;
    }
  }

  return result;
}

// ── Check 2: EB session expiry WA alert ───────────────────────────────────────

async function checkEbExpiryWa(): Promise<{
  checked: number;
  alerted: number;
  errors: number;
}> {
  const result = { checked: 0, alerted: 0, errors: 0 };
  const now = new Date();
  const in7Days = new Date(Date.now() + 7 * 86_400_000);

  const connections = await prisma.seConnection.findMany({
    where: {
      provider: 'enablebanking',
      status: 'active',
      expiresAt: { lte: in7Days, gte: now },
    },
    select: { id: true, tenantId: true, providerName: true, expiresAt: true },
  });

  for (const conn of connections) {
    result.checked++;
    const { tenantId, providerName, expiresAt } = conn;
    if (!expiresAt) continue;

    try {
      const alertType = `banking_eb_expiry_wa_${conn.id}`;
      const alreadySent = await alreadyAlertedRecently(tenantId, alertType, 7);
      if (alreadySent) continue;

      const profile = await prisma.tenantProfile.findUnique({
        where: { tenantId },
        select: { legalName: true, tradeName: true },
      });
      const firstName = firstNameFromProfile(profile);
      const fechaExpiracion = expiresAt.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      await createAlert({
        tenantId,
        type: alertType,
        title: `Renovar conexión ${providerName}`,
        body: `La sesión PSD2 con ${providerName} expira el ${fechaExpiracion}.`,
      });

      const phone = await getTenantWaPhone(tenantId);
      if (phone) {
        await sendWhatsAppTemplate(
          normalizePhone(phone),
          TEMPLATE_EB_EXPIRY,
          'es_ES',
          buildEbExpiryComponents(firstName, providerName, fechaExpiracion)
        ).catch((err) => console.error('[banking-alerts] WA EB expiry error', { tenantId, err }));
      }

      result.alerted++;
    } catch (err) {
      console.error('[banking-alerts] EB expiry WA error', { tenantId: conn.tenantId, err });
      result.errors++;
    }
  }

  return result;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [lowBalance, ebExpiry] = await Promise.allSettled([
    checkLowBalances(),
    checkEbExpiryWa(),
  ]);

  return NextResponse.json({
    ok: true,
    threshold: LOW_BALANCE_THRESHOLD,
    lowBalance:
      lowBalance.status === 'fulfilled'
        ? lowBalance.value
        : { error: String(lowBalance.reason) },
    ebExpiry:
      ebExpiry.status === 'fulfilled'
        ? ebExpiry.value
        : { error: String(ebExpiry.reason) },
  });
}
