// F15 — Genera un link token de vinculación Telegram para el tenant autenticado.
// POST /api/isaak/telegram/link
// Devuelve { token, deepLink } — deepLink es t.me/<bot>?start=<token>

import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { createTelegramLinkToken } from '@/app/lib/telegram';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  void req;
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const token = await createTelegramLinkToken(session.tenantId);
  const botUsername = process.env.TELEGRAM_BOT_USERNAME?.trim() || 'IsaakBot';
  const deepLink = `https://t.me/${botUsername}?start=${token}`;

  return NextResponse.json({ ok: true, token, deepLink, expiresInHours: 24 });
}
