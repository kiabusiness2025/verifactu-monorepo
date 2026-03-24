import { NextRequest, NextResponse } from 'next/server';
import { sendHoldedLeadCommunication } from '@/app/lib/communications/holded-email-service';

type RateRecord = {
  count: number;
  resetAt: number;
};

const rateStore = new Map<string, RateRecord>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;

function getRequestIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') || 'unknown';
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const current = rateStore.get(ip);

  if (!current || current.resetAt <= now) {
    rateStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { limited: false, retryAfter: 0 };
  }

  if (current.count >= RATE_LIMIT) {
    return { limited: true, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
  }

  current.count += 1;
  rateStore.set(ip, current);
  return { limited: false, retryAfter: 0 };
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  const ip = getRequestIp(request);
  const rate = isRateLimited(ip);

  if (rate.limited) {
    return NextResponse.json(
      { error: 'Demasiados envíos. Inténtalo de nuevo en unos minutos.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const name = normalizeString(body?.name);
    const email = normalizeString(body?.email).toLowerCase();
    const companyName = normalizeString(body?.companyName);
    const phone = normalizeString(body?.phone);
    const source = normalizeString(body?.source) || 'holded_free_plan';
    const consent = body?.consent === true;

    if (!name) {
      return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'El email no es válido.' }, { status: 400 });
    }

    if (!companyName) {
      return NextResponse.json({ error: 'El nombre de empresa es obligatorio.' }, { status: 400 });
    }

    if (!consent) {
      return NextResponse.json(
        { error: 'Necesitamos tu consentimiento para continuar.' },
        { status: 400 }
      );
    }

    const sent = await sendHoldedLeadCommunication({
      name,
      email,
      companyName,
      phone: phone || undefined,
      source,
    });

    return NextResponse.json({
      ok: true,
      message: 'Perfecto, te hemos enviado la bienvenida y los siguientes pasos.',
      delivery: sent,
    });
  } catch (error) {
    console.error('[holded communications lead] failed', error);

    return NextResponse.json(
      { error: 'No hemos podido enviar la comunicación ahora mismo. Inténtalo de nuevo.' },
      { status: 500 }
    );
  }
}
