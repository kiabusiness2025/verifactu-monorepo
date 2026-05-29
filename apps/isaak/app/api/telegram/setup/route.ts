// F15 — Registro del webhook Telegram (one-time setup).
// GET /api/telegram/setup — requiere CRON_SECRET para auth.

import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { setTelegramWebhook } from '@/app/lib/telegram';

export const runtime = 'nodejs';

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const token = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://isaak.chat';
  const webhookUrl = `${appUrl}/api/telegram/webhook`;

  if (!process.env.TELEGRAM_BOT_TOKEN?.trim()) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not set' }, { status: 500 });
  }
  if (!process.env.TELEGRAM_WEBHOOK_SECRET?.trim()) {
    return NextResponse.json({ error: 'TELEGRAM_WEBHOOK_SECRET not set' }, { status: 500 });
  }

  await setTelegramWebhook(webhookUrl);
  return NextResponse.json({ ok: true, webhookUrl });
}
