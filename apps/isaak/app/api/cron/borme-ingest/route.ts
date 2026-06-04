// V2.D.1 — Cron diario que ingesta el BORME del día.
//
// GET /api/cron/borme-ingest
//
// Auth: Bearer CRON_SECRET.
//
// Ingesta el sumario de ayer (los publica BOE por la mañana) y, si
// también está disponible, el de hoy. Idempotente: si ya está
// ingestado, el upsert no inserta nada (unique constraint).

import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ingestBormeForDate } from '@/app/lib/borme-scraper';

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

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);

  const results = [];
  for (const d of [yesterday, today]) {
    try {
      results.push(await ingestBormeForDate(d));
    } catch (err) {
      results.push({
        date: d.toISOString().slice(0, 10),
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  }

  return NextResponse.json({ ok: true, results });
}
