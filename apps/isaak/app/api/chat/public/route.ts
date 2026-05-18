import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { checkPublicChatQuota } from '@/app/lib/isaak-quota';

export const runtime = 'nodejs';

function getIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip') || 'unknown';
}

function buildSystemPrompt(params: {
  companyName: string;
  tradeName: string | null;
  cnae: string | null;
  taxRegime: string | null;
  city: string | null;
  website: string | null;
}): string {
  const { companyName, tradeName, cnae, taxRegime, city, website } = params;
  const name = tradeName || companyName;

  const lines = [
    `Eres el asistente de IA de ${name}, una empresa española.`,
    cnae ? `Sector de actividad: ${cnae}.` : null,
    taxRegime ? `Régimen fiscal: ${taxRegime}.` : null,
    city ? `Ubicación: ${city}.` : null,
    website ? `Web: ${website}.` : null,
    '',
    'Tu función es atender a clientes y visitantes que llegan a través del chat público de esta empresa.',
    'Responde preguntas sobre la empresa, sus servicios, fiscalidad, contabilidad y gestión empresarial.',
    'Sé profesional, conciso y útil. Si no tienes información específica sobre la empresa, di que se pongan en contacto directo.',
    'No compartas información confidencial ni inventes datos que no te hayan proporcionado.',
    'Responde siempre en español.',
  ].filter((l) => l !== null);

  return lines.join('\n');
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  const quota = checkPublicChatQuota(ip);
  if (!quota.allowed) {
    return NextResponse.json({ error: quota.message, resetsAt: quota.resetsAt }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    slug?: unknown;
    message?: unknown;
  };

  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!slug) {
    return NextResponse.json({ error: 'Slug requerido.' }, { status: 400 });
  }

  if (!message) {
    return NextResponse.json({ error: 'El mensaje no puede estar vacío.' }, { status: 400 });
  }

  if (message.length > 2000) {
    return NextResponse.json({ error: 'Mensaje demasiado largo.' }, { status: 400 });
  }

  const tenant = await prisma.tenant.findFirst({
    where: { isaakPublicSlug: slug, isaakPublicEnabled: true },
    select: {
      id: true,
      name: true,
      profile: {
        select: {
          tradeName: true,
          cnae: true,
          taxRegime: true,
          city: true,
          website: true,
        },
      },
    },
  });

  if (!tenant) {
    return NextResponse.json({ error: 'Chat no disponible.' }, { status: 404 });
  }

  const systemPrompt = buildSystemPrompt({
    companyName: tenant.name,
    tradeName: tenant.profile?.tradeName ?? null,
    cnae: tenant.profile?.cnae ?? null,
    taxRegime: tenant.profile?.taxRegime ?? null,
    city: tenant.profile?.city ?? null,
    website: tenant.profile?.website ?? null,
  });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Servicio no disponible.' }, { status: 503 });
  }

  const claude = new Anthropic({ apiKey });

  const response = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: 'user', content: message }],
  });

  const reply =
    response.content[0]?.type === 'text'
      ? response.content[0].text
      : 'No he podido procesar tu consulta.';

  return NextResponse.json({ reply });
}
