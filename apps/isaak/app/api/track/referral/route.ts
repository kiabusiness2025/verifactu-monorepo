// V1.8.4 — Tracking público de visitas con ?ref= en la URL.
//
// POST /api/track/referral  body: { ref: string, path?: string }
//
// Persiste un UsageEvent con type LEAD_CREATED + metadataJson.kind =
// 'referral_view' (sin migración — reusa el enum existente y discrimina
// por la metadata). Rate-limit in-process para evitar abusos triviales.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

const REF_REGEX = /^[a-z0-9-]{2,40}$/;
const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();
const MAX_PER_HOUR_PER_IP = 30;

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = RATE_LIMIT_MAP.get(ip);
  if (!entry || now > entry.resetAt) {
    RATE_LIMIT_MAP.set(ip, { count: 1, resetAt: now + 3600_000 });
    return true;
  }
  if (entry.count >= MAX_PER_HOUR_PER_IP) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  let body: { ref?: unknown; path?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const ref = typeof body.ref === 'string' ? body.ref.trim().toLowerCase() : '';
  if (!REF_REGEX.test(ref)) {
    return NextResponse.json({ error: 'invalid_ref' }, { status: 400 });
  }
  const path = typeof body.path === 'string' ? body.path.slice(0, 200) : '';

  try {
    await prisma.usageEvent.create({
      data: {
        type: 'LEAD_CREATED', // sintáctico — discriminamos por metadata
        source: 'referral_qr',
        path: path || null,
        metadataJson: {
          kind: 'referral_view',
          ref,
          userAgent: req.headers.get('user-agent')?.slice(0, 200) ?? null,
        },
      },
    });
  } catch (err) {
    console.error('[track/referral] insert failed', err);
    // No bloqueamos al cliente por un error de tracking.
  }

  return NextResponse.json({ ok: true });
}
