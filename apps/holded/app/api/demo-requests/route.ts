import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { sendHoldedDemoRequestNotification } from '@/app/lib/communications/holded-email-service';

type RateRecord = { count: number; resetAt: number };
const rateStore = new Map<string, RateRecord>();
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 15 * 60 * 1000;

function getIp(req: NextRequest) {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip') || 'unknown';
}

function checkRateLimit(ip: string): { limited: boolean; retryAfter: number } {
  const now = Date.now();
  const rec = rateStore.get(ip);
  if (!rec || rec.resetAt <= now) {
    rateStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { limited: false, retryAfter: 0 };
  }
  if (rec.count >= RATE_LIMIT) {
    return { limited: true, retryAfter: Math.ceil((rec.resetAt - now) / 1000) };
  }
  rec.count += 1;
  return { limited: false, retryAfter: 0 };
}

function str(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  const ip = getIp(request);
  const rate = checkRateLimit(ip);
  if (rate.limited) {
    return NextResponse.json(
      { error: 'Demasiados envíos. Inténtalo de nuevo en unos minutos.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Petición no válida.' }, { status: 400 });
  }

  const name = str(body.name);
  const email = str(body.email).toLowerCase();
  const companyName = str(body.companyName);
  const phone = str(body.phone) || undefined;
  const taxId = str(body.taxId) || undefined;
  const role = str(body.role) || undefined;
  const usesHolded = body.usesHolded === true;
  const objective = str(body.objective) || undefined;
  const source = str(body.source) || 'holded_demo';
  const consent = body.consent === true;

  if (!name) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });
  if (!isValidEmail(email))
    return NextResponse.json({ error: 'El email no es válido.' }, { status: 400 });
  if (!companyName)
    return NextResponse.json({ error: 'El nombre de empresa es obligatorio.' }, { status: 400 });
  if (!consent)
    return NextResponse.json(
      { error: 'Necesitamos tu consentimiento para continuar.' },
      { status: 400 }
    );

  try {
    const record = await prisma.demoRequest.create({
      data: {
        name,
        email,
        phone,
        companyName,
        taxId,
        role,
        usesHolded,
        objective,
        source,
        consent,
      },
    });

    sendHoldedDemoRequestNotification({
      id: record.id,
      name,
      email,
      companyName,
      phone,
      taxId,
      role,
      usesHolded,
      objective,
      source,
    }).catch((err) => console.error('[demo-requests] notification failed', err));

    return NextResponse.json({ ok: true, id: record.id });
  } catch (error) {
    console.error('[demo-requests] persist failed', error);
    return NextResponse.json(
      { error: 'No hemos podido registrar la solicitud. Inténtalo de nuevo.' },
      { status: 500 }
    );
  }
}
