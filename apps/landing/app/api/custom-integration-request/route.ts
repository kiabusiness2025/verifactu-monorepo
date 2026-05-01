import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@verifactu/db';
import { verifySessionToken, readSessionSecret, SESSION_COOKIE_NAME } from '@verifactu/utils';
import { checkRateLimit, getRequestIp } from '../../lib/security/rate-limit';

/**
 * POST /api/custom-integration-request
 *
 * Saves a CustomIntegrationRequest to the database.
 * Called from /integraciones when a user fills the "integracion personalizada" form.
 */

const schema = z.object({
  contactName: z.string().min(1).max(120),
  contactEmail: z.string().email(),
  contactPhone: z.string().max(30).optional(),
  companyName: z.string().max(120).optional(),
  title: z.string().min(3).max(200),
  summary: z.string().min(10).max(2000),
  requestedSystems: z.array(z.string().max(80)).max(20).optional(),
  businessGoals: z.array(z.string().max(200)).max(10).optional(),
  budgetRange: z.enum(['<1000', '1000-5000', '5000-20000', '>20000']).optional(),
  urgency: z.enum(['low', 'medium', 'high']).optional(),
});

async function getUserFromSession(req: NextRequest) {
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
  if (!m) return null;
  const token = decodeURIComponent(m[1]);
  try {
    const secret = readSessionSecret();
    const payload = await verifySessionToken(token, secret);
    return payload ? { uid: payload.uid || '', email: payload.email || null } : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const ip = getRequestIp(req);
  const rate = await checkRateLimit({
    key: `custom-integration-request:${ip}`,
    limit: 3,
    windowSeconds: 60 * 60, // 1 request per hour per IP
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const data = parsed.data;
  const sessionUser = await getUserFromSession(req);

  try {
    const record = await prisma.customIntegrationRequest.create({
      data: {
        contactEmail: data.contactEmail,
        contactName: data.contactName,
        contactPhone: data.contactPhone ?? null,
        companyName: data.companyName ?? null,
        title: data.title,
        summary: data.summary,
        requestedSystems: data.requestedSystems ?? [],
        businessGoals: data.businessGoals ?? [],
        budgetRange: data.budgetRange ?? null,
        urgency: data.urgency ?? null,
        sourceChannel: 'landing',
        status: 'submitted',
        userId: sessionUser?.uid ?? null,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: record.id }, { status: 201 });
  } catch (err) {
    console.error('[api/custom-integration-request] error:', err);
    return NextResponse.json({ error: 'Error al guardar la solicitud' }, { status: 500 });
  }
}
