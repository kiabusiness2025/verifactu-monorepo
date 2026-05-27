/**
 * GET /api/cron/platform-health
 *
 * Runs every 15 min. Checks all 5 platform apps (Isaak, Landing, Holded,
 * Claude MCP, ChatGPT connector) from outside. If any is down, sends a
 * WhatsApp message + Resend email to the admin.
 *
 * No dedup — if the cron fires and something is down, it always alerts.
 * At 15-min intervals that means max 4 alerts/hour per failure window,
 * which is acceptable to detect and resolve incidents quickly.
 *
 * Auth: Authorization: Bearer <CRON_SECRET>  (Vercel cron)
 *
 * Env vars used (all optional — alert is skipped if missing):
 *   ADMIN_WHATSAPP_PHONE   — phone number to send WA alert
 *   WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN — WA API creds
 *   ADMIN_ALERT_EMAIL      — email address for the alert
 *   RESEND_API_KEY         — Resend sending key
 */

import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const FROM = 'Verifactu Admin <soporte@verifactu.business>';

function authorizeCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const token = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

type AppCheck = {
  name: string;
  url: string;
  ok: boolean;
  status: number | null;
  latencyMs: number | null;
  error?: string;
};

async function checkUrl(name: string, url: string, timeoutMs = 8000): Promise<AppCheck> {
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return { name, url, ok: res.ok, status: res.status, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      name,
      url,
      ok: false,
      status: null,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function sendWhatsAppAlert(message: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const adminPhone = process.env.ADMIN_WHATSAPP_PHONE;
  if (!phoneNumberId || !token || !adminPhone) return;

  await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: adminPhone,
      type: 'text',
      text: { body: message },
    }),
  });
}

async function sendEmailAlert(downApps: AppCheck[], timestamp: string): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_ALERT_EMAIL;
  if (!resendKey || !adminEmail) return;

  const resend = new Resend(resendKey);

  const rows = downApps
    .map((a) => {
      const reason = a.error?.toLowerCase().includes('timeout')
        ? 'Timeout (>8 s)'
        : (a.error ?? (a.status ? `HTTP ${a.status}` : 'Sin respuesta'));
      return `<tr><td style="padding:6px 12px;border-bottom:1px solid #e2e8f0">${a.name}</td><td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;color:#dc2626">${reason}</td><td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;color:#64748b">${a.url}</td></tr>`;
    })
    .join('');

  await resend.emails.send({
    from: FROM,
    to: adminEmail,
    subject: `🚨 Plataforma DOWN — ${downApps.length} app${downApps.length > 1 ? 's' : ''} sin respuesta`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#dc2626;margin-bottom:8px">🚨 Plataforma Verifactu — incidencia detectada</h2>
        <p style="color:#475569;margin-bottom:16px">Detectado: <strong>${timestamp}</strong></p>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
          <thead><tr style="background:#f8fafc">
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase">App</th>
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase">Error</th>
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase">URL</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:20px">
          <a href="https://admin.verifactu.business/panel" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px">Ver panel →</a>
        </div>
      </div>
    `,
  });
}

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ISAAK_URL = process.env.NEXT_PUBLIC_ISAAK_URL ?? 'https://isaak.verifactu.business';
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.verifactu.business';

  const checks = await Promise.all([
    checkUrl('Isaak', `${ISAAK_URL}/api/health`),
    checkUrl('Landing', 'https://verifactu.business/api/health'),
    checkUrl('Holded site', 'https://holded.verifactu.business/api/health'),
    checkUrl(
      'Claude MCP',
      'https://claude.verifactu.business/.well-known/oauth-authorization-server'
    ),
    checkUrl('ChatGPT conector', `${APP_URL}/api/health`),
  ]);

  const downApps = checks.filter((c) => !c.ok);

  if (downApps.length > 0) {
    const timestamp = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
    const list = downApps.map((a) => a.name).join(', ');

    await Promise.allSettled([
      sendWhatsAppAlert(
        `🚨 *Plataforma Verifactu DOWN*\nApps caídas: ${list}\nDetectado: ${timestamp} (Madrid)\nVer panel: https://admin.verifactu.business/panel`
      ),
      sendEmailAlert(downApps, timestamp),
    ]);
  }

  return NextResponse.json({
    ok: downApps.length === 0,
    checked: checks.length,
    down: downApps.length,
    apps: checks,
    timestamp: new Date().toISOString(),
  });
}
