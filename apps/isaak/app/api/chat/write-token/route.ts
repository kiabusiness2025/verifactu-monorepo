// SEC C5 (2026) — Emisor del token de escritura.
//
// POST /api/chat/write-token
//   → { token, expiresAt }
//
// El cliente lo pide cuando el usuario activa el toggle "permitir
// escrituras" en el chat. El token tiene TTL de 1h y va firmado con
// HMAC sobre (userId, tenantId, expiresAt). El backend del chat lo
// valida antes de habilitar `allowWrites=true`.
//
// Importante: este endpoint es POST (no GET) precisamente para que el
// middleware C3 (Origin enforcement) lo proteja contra CSRF.

import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { issueWriteToken } from '@/app/lib/isaak-write-token';

export const runtime = 'nodejs';

export async function POST() {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.userId || !session?.tenantId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const issued = issueWriteToken({
    userId: session.userId,
    tenantId: session.tenantId,
  });
  if (!issued) {
    return NextResponse.json(
      { error: 'no_secret', message: 'WRITE_TOKEN_SECRET no configurado.' },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, token: issued.token, expiresAt: issued.expiresAt });
}
