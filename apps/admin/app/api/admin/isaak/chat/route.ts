/**
 * POST /api/admin/isaak/chat
 * Copiloto Isaak para el panel de administración — llama a Claude con herramientas de análisis.
 */

import {
  ANTHROPIC_API_URL,
  ANTHROPIC_VERSION,
  MAX_TOOL_ROUNDS,
  MAX_TOKENS,
  MODEL,
  SYSTEM_PROMPT,
  TOOLS,
  runTool,
  type AnthropicContentBlock,
  type AnthropicMessage,
  type AnthropicResponse,
  type ToolInput,
} from '@/lib/isaakTools';
import { requireAdmin } from '@/lib/adminAuth';
import { checkCopilotRateLimit } from '@/lib/isaakCopilotAudit';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Message = { role: 'user' | 'assistant'; content: string };
type DocumentContext = { filename: string; text: string };

function buildSystemPrompt(doc?: DocumentContext, tenantId?: string): string {
  let prompt = SYSTEM_PROMPT;
  if (tenantId) {
    prompt += `\n\nCONTEXTO ACTUAL: El administrador está viendo el tenant ID \`${tenantId}\`. Cuando uses la herramienta get_tenant_holded_data, usa siempre este tenant_id a menos que el usuario especifique uno diferente.`;
  }
  if (doc?.text) {
    prompt += `\n\nDOCUMENTO ADJUNTO — "${doc.filename}":\n${doc.text}\n\nCuando el usuario pregunte por datos del documento, extrae y presenta en tabla Markdown: número de factura/ticket, fecha, proveedor/emisor, concepto, base imponible, IVA (tipo y cuota), total. Si algún campo no aparece en el documento, indícalo como "—".`;
  }
  return prompt;
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);

    // V3.4 — Rate limit: max 60 mensajes/h por admin (in-memory).
    const rl = checkCopilotRateLimit(admin.email);
    if (!rl.allowed) {
      const resetIn = Math.ceil((rl.resetAt - Date.now()) / 60_000);
      return NextResponse.json(
        {
          role: 'assistant',
          content: `Has alcanzado el límite de mensajes del copiloto (60/hora). Vuelve a intentarlo en ${resetIn} min.`,
        },
        { status: 429 },
      );
    }

    const body = (await req.json()) as {
      messages?: Message[];
      document?: DocumentContext;
      tenantId?: string;
    };
    const userMessages: Message[] = Array.isArray(body.messages) ? body.messages : [];
    const document = body.document?.text ? body.document : undefined;
    const tenantId = typeof body.tenantId === 'string' ? body.tenantId : undefined;

    if (!userMessages.length) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        role: 'assistant',
        content: 'Isaak no está configurado (falta ANTHROPIC_API_KEY).',
      });
    }

    let anthropicMessages: AnthropicMessage[] = userMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let finalText = '';

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: buildSystemPrompt(document, tenantId),
          tools: TOOLS,
          messages: anthropicMessages,
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error('[isaak/chat] Anthropic error', response.status, errText);
        return NextResponse.json({
          role: 'assistant',
          content: 'Lo siento, no pude conectarme a la IA en este momento.',
        });
      }

      const data = (await response.json()) as AnthropicResponse;

      if (data.error) {
        return NextResponse.json({
          role: 'assistant',
          content: `Error de IA: ${data.error.message}`,
        });
      }

      const textBlocks = data.content.filter((b) => b.type === 'text') as {
        type: 'text';
        text: string;
      }[];
      if (textBlocks.length > 0) finalText = textBlocks.map((b) => b.text).join('\n');

      if (data.stop_reason !== 'tool_use') break;

      const toolUseBlocks = data.content.filter((b) => b.type === 'tool_use') as {
        type: 'tool_use';
        id: string;
        name: string;
        input: ToolInput;
      }[];

      anthropicMessages = [...anthropicMessages, { role: 'assistant', content: data.content }];

      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block) => ({
          type: 'tool_result' as const,
          tool_use_id: block.id,
          content: await runTool(block.name, block.input, {
            adminEmail: admin.email,
            adminUserId: admin.userId,
            tenantId: tenantId ?? null,
          }),
        }))
      );

      anthropicMessages = [
        ...anthropicMessages,
        { role: 'user', content: toolResults as unknown as AnthropicContentBlock[] },
      ];
    }

    return NextResponse.json({ role: 'assistant', content: finalText || 'Sin respuesta.' });
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    console.error('[isaak/chat]', error);
    return NextResponse.json({
      role: 'assistant',
      content: 'Error interno al procesar la solicitud.',
    });
  }
}
