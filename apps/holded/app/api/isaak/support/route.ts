import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { buildIsaakSupportSystemPrompt } from '@/app/lib/isaak-support-prompt';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

type RateRecord = { count: number; resetAt: number };
const anonRateStore = new Map<string, RateRecord>();
const ANON_LIMIT = 8;
const RATE_WINDOW_MS = 15 * 60 * 1000;

function getIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') || 'unknown';
}

function checkAnonRate(ip: string) {
  const now = Date.now();
  const rec = anonRateStore.get(ip);
  if (!rec || rec.resetAt <= now) {
    anonRateStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (rec.count >= ANON_LIMIT) return true;
  rec.count += 1;
  return false;
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

type ImageAttachment = { mimeType: string; data: string };

export async function POST(request: NextRequest) {
  const session = await getHoldedSession();
  const isRegistered = !!session?.userId;

  if (!isRegistered) {
    const ip = getIp(request);
    if (checkAnonRate(ip)) {
      return NextResponse.json(
        { error: 'Demasiadas consultas. Regístrate para continuar sin límites.' },
        { status: 429 }
      );
    }
  }

  const body = await request.json().catch(() => ({}));
  const message = normalizeString(body?.message);
  const page = normalizeString(body?.page) || 'generic';
  const conversationId = normalizeString(body?.conversationId) || null;
  const images: ImageAttachment[] = Array.isArray(body?.images) ? body.images : [];

  if (!message && images.length === 0) {
    return NextResponse.json({ error: 'Escribe tu consulta para continuar.' }, { status: 400 });
  }

  if (message.length > 4000) {
    return NextResponse.json({ error: 'El mensaje es demasiado largo.' }, { status: 400 });
  }

  const firstName = session?.name ? session.name.split(' ')[0] : null;

  const systemPrompt = buildIsaakSupportSystemPrompt({
    firstName,
    companyName: null,
    isRegistered,
    page: page as 'claude' | 'chatgpt' | 'holded_hub' | 'verifactu' | 'generic',
  });

  // Build conversation history for registered users
  type ApiMessage = { role: 'user' | 'assistant'; content: string };
  let history: ApiMessage[] = [];

  if (isRegistered && conversationId) {
    const prior = await prisma.isaakConversationMsg.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 30,
      select: { role: true, content: true },
    });
    history = prior.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
  }

  // Build user content (text + optional images)
  type TextBlock = { type: 'text'; text: string };
  type ImageBlock = {
    type: 'image';
    source: { type: 'base64'; media_type: string; data: string };
  };
  type ContentBlock = TextBlock | ImageBlock;

  const userContent: ContentBlock[] | string =
    images.length > 0
      ? [
          ...(message ? [{ type: 'text' as const, text: message }] : []),
          ...images.slice(0, 3).map(
            (img): ImageBlock => ({
              type: 'image',
              source: {
                type: 'base64',
                media_type: img.mimeType || 'image/png',
                data: img.data,
              },
            })
          ),
        ]
      : message;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Servicio no disponible ahora.' }, { status: 503 });
  }

  const claude = new Anthropic({ apiKey });

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      ...history,
      { role: 'user' as const, content: userContent as Anthropic.MessageParam['content'] },
    ],
  });

  const reply =
    response.content[0]?.type === 'text'
      ? response.content[0].text
      : 'No he podido procesar tu consulta.';

  // Persist for registered users
  let activeConversationId: string | null = conversationId;

  if (isRegistered && session?.userId && session?.tenantId) {
    if (!activeConversationId) {
      const convo = await prisma.isaakConversation.create({
        data: {
          tenantId: session.tenantId,
          userId: session.userId,
          title: message.slice(0, 80) || 'Consulta de soporte',
          context: 'connector_support',
          lastActivity: new Date(),
        },
        select: { id: true },
      });
      activeConversationId = convo.id;
    }

    const messageContent = message || '[imagen adjunta]';

    await prisma.$transaction([
      prisma.isaakConversationMsg.create({
        data: { conversationId: activeConversationId, role: 'user', content: messageContent },
      }),
      prisma.isaakConversationMsg.create({
        data: { conversationId: activeConversationId, role: 'assistant', content: reply },
      }),
      prisma.isaakConversation.update({
        where: { id: activeConversationId },
        data: { lastActivity: new Date(), messageCount: { increment: 2 } },
      }),
    ]);
  }

  return NextResponse.json({
    ok: true,
    reply,
    conversationId: activeConversationId,
  });
}
