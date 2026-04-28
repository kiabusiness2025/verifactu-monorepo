import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { getHoldedConnection } from '@/app/lib/holded-integration';
import { prisma } from '@/app/lib/prisma';
import { buildIsaakSystemPrompt } from '@/app/lib/isaak-chat-prompt';
import { HOLDED_TOOLS, executeHoldedTool } from '@/app/lib/holded-tools';
import { checkIsaakQuota } from '@/app/lib/isaak-quota';
import { formatResponsePayload, type ToolCallEntry } from '@/app/lib/isaak-response-formatter';

export const runtime = 'nodejs';

const MAX_TOOL_ITERATIONS = 8;

export async function POST(request: NextRequest) {
  // 1. Auth
  const session = await getHoldedSession();
  if (!session?.userId || !session?.tenantId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  // 2. Quota check
  if (!checkIsaakQuota(session.tenantId)) {
    return NextResponse.json(
      {
        error:
          'Has alcanzado el límite diario de consultas. Vuelve mañana o actualiza tu plan para continuar.',
      },
      { status: 429 }
    );
  }

  // 3. Parse body
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const conversationId = typeof body.conversationId === 'string' ? body.conversationId : null;
  const images: Array<{ mimeType: string; data: string }> = Array.isArray(body.images)
    ? (body.images as Array<{ mimeType: string; data: string }>).slice(0, 3)
    : [];

  if (!message && images.length === 0) {
    return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 });
  }
  if (message.length > 8000) {
    return NextResponse.json({ error: 'El mensaje es demasiado largo.' }, { status: 400 });
  }

  // 4. Load conversation history (last 30 messages)
  let history: Anthropic.MessageParam[] = [];
  if (conversationId) {
    const prior = await prisma.isaakConversationMsg.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 30,
      select: { role: true, content: true },
    });
    history = prior
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
  }

  // 5. Build user message content (text + optional images)
  const userContent: Anthropic.ContentBlockParam[] =
    images.length > 0
      ? [
          ...(message ? [{ type: 'text' as const, text: message }] : []),
          ...images.map((img) => ({
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: img.mimeType as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp',
              data: img.data,
            },
          })),
        ]
      : [{ type: 'text' as const, text: message }];

  // 6. Retrieve Holded credentials (already decrypted by getHoldedConnection)
  const holdedConn = await getHoldedConnection(session.tenantId).catch(() => null);
  const holdedApiKey = holdedConn?.apiKey ?? null;

  // 7. System prompt
  const systemPrompt = buildIsaakSystemPrompt({
    userName: session.name?.split(' ')[0] ?? null,
    hasHolded: !!holdedApiKey,
  });

  // 8. Claude tool_use loop
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Servicio no disponible.' }, { status: 503 });
  }

  const claude = new Anthropic({ apiKey });
  const toolCallLog: ToolCallEntry[] = [];
  let messages: Anthropic.MessageParam[] = [...history, { role: 'user', content: userContent }];

  let finalReply = '';
  let iteration = 0;

  while (iteration < MAX_TOOL_ITERATIONS) {
    iteration++;

    const response = await claude.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      tools: holdedApiKey ? HOLDED_TOOLS : [],
      messages,
    });

    if (response.stop_reason === 'end_turn') {
      finalReply = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
      break;
    }

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolCall of toolUseBlocks) {
        let result: unknown;
        try {
          result = await executeHoldedTool(toolCall.name, toolCall.input, holdedApiKey!);
        } catch (e) {
          result = { error: e instanceof Error ? e.message : 'Error al consultar Holded' };
        }

        toolCallLog.push({ name: toolCall.name, input: toolCall.input, result });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }

      messages = [
        ...messages,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults },
      ];
      continue;
    }

    // unexpected stop_reason
    finalReply =
      response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('') || 'No he podido procesar tu consulta.';
    break;
  }

  // 9. Detect chart / card payloads
  const { chartPayload, cardPayload } = formatResponsePayload(toolCallLog, finalReply);

  // 10. Persist to DB
  let activeConversationId = conversationId;

  if (!activeConversationId) {
    const convo = await prisma.isaakConversation.create({
      data: {
        tenantId: session.tenantId,
        userId: session.userId,
        title: message.slice(0, 80) || 'Consulta Isaak',
        context: 'holded_chat',
        lastActivity: new Date(),
      },
      select: { id: true },
    });
    activeConversationId = convo.id;
  }

  const userMsgContent = message || '[imagen adjunta]';
  const assistantMetadata: Record<string, unknown> = {};
  if (toolCallLog.length > 0) assistantMetadata.toolCalls = toolCallLog;
  if (chartPayload) assistantMetadata.chartPayload = chartPayload;
  if (cardPayload) assistantMetadata.cardPayload = cardPayload;

  await prisma.$transaction([
    prisma.isaakConversationMsg.create({
      data: {
        conversationId: activeConversationId,
        role: 'user',
        content: userMsgContent,
      },
    }),
    prisma.isaakConversationMsg.create({
      data: {
        conversationId: activeConversationId,
        role: 'assistant',
        content: finalReply,
        metadata: Object.keys(assistantMetadata).length > 0 ? assistantMetadata : undefined,
      },
    }),
    prisma.isaakConversation.update({
      where: { id: activeConversationId },
      data: {
        lastActivity: new Date(),
        messageCount: { increment: 2 },
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    reply: finalReply,
    conversationId: activeConversationId,
    chartPayload: chartPayload ?? null,
    cardPayload: cardPayload ?? null,
    toolsUsed: toolCallLog.map((t) => t.name),
  });
}
