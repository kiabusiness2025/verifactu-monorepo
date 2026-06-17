import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let body: {
    name?: unknown;
    email?: unknown;
    company?: unknown;
    role?: unknown;
    type?: unknown;
    message?: unknown;
    consent?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const company = typeof body.company === 'string' ? body.company.trim() : '';
  const role = typeof body.role === 'string' ? body.role.trim() : undefined;
  const type = body.type === 'partner' ? 'partner' : 'investor';
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 1000) : undefined;
  const consent = body.consent === true;

  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'email_invalid' }, { status: 400 });
  }
  if (!company || company.length < 2) {
    return NextResponse.json({ error: 'company_required' }, { status: 400 });
  }
  if (!consent) {
    return NextResponse.json({ error: 'consent_required' }, { status: 400 });
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    null;

  try {
    const lead = await prisma.investorLead.create({
      data: {
        name,
        email,
        company,
        role: role || null,
        type,
        message: message || null,
        consent,
        downloadedAt: new Date(),
        ipAddress: ip,
      },
      select: { id: true },
    });

    console.info('[InvestorLead] new lead', { id: lead.id, email, type });

    return NextResponse.json({ ok: true, leadId: lead.id });
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
