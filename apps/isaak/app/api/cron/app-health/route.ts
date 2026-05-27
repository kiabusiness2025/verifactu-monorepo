/**
 * GET /api/cron/app-health
 *
 * Runs every 30 minutes. Checks DB connectivity and critical env vars.
 * Sends WhatsApp + email alert to admin if any service is down.
 * Alert cooldown: 1 alert per failure window (no dedup — if cron fires and fails, always alert).
 */

import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { sendWhatsAppText } from '@/app/lib/whatsapp';
import { sendAppHealthAlert } from '@/app/lib/communications/app-health-alert';

export const runtime = 'nodejs';
export const maxDuration = 30;

function authorizeCron(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const token = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

async function checkDatabase(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - start };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function checkConfig(): { ok: boolean; missing: string[] } {
  const required = [
    'ANTHROPIC_API_KEY',
    'DATABASE_URL',
    'FIREBASE_ADMIN_PROJECT_ID',
    'RESEND_API_KEY',
  ];
  const missing = required.filter((k) => !process.env[k]?.trim());
  return { ok: missing.length === 0, missing };
}

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [database, config] = await Promise.all([checkDatabase(), Promise.resolve(checkConfig())]);

  const failedServices: string[] = [];
  if (!database.ok) failedServices.push('database');
  if (!config.ok) failedServices.push('config');

  if (failedServices.length > 0) {
    const details = { database, config };
    const timestamp = new Date().toISOString();
    const adminPhone = process.env.ADMIN_WHATSAPP_PHONE;

    await Promise.allSettled([
      sendAppHealthAlert({ failedServices, details, timestamp }),
      adminPhone
        ? sendWhatsAppText(
            adminPhone,
            `🚨 *Isaak app DOWN*\nServicios caídos: ${failedServices.join(', ')}\nDetectado: ${timestamp}`
          )
        : Promise.resolve(),
    ]);
  }

  return NextResponse.json({
    ok: failedServices.length === 0,
    failedServices,
    services: { database, config },
    timestamp: new Date().toISOString(),
  });
}
