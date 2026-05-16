/**
 * POST /api/admin/isaak/smoke
 * Ejecuta una pregunta contra el copiloto Isaak con traza completa de tool calls.
 * Usado por la página /connectors/isaak-tests para grabar y reproducir fixtures.
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
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type SmokeResult = {
  question: string;
  tools_called: string[];
  tool_results: Record<string, unknown>;
  response_text: string;
  latency_ms: number;
  ok: boolean;
  error?: string;
  checks: {
    tools_match: boolean | null;
    keywords_found: string[];
    keywords_missing: string[];
  };
  recorded_at: string;
};

export async function POST(req: NextRequest) {
  const startMs = Date.now();

  try {
    await requireAdmin(req);

    const body = (await req.json()) as {
      question?: string;
      expected_tools?: string[];
      expected_keywords?: string[];
    };

    const question = body.question?.trim();
    if (!question) {
      return NextResponse.json({ error: 'question is required' }, { status: 400 });
    }

    const expectedTools: string[] = Array.isArray(body.expected_tools) ? body.expected_tools : [];
    const expectedKeywords: string[] = Array.isArray(body.expected_keywords)
      ? body.expected_keywords
      : [];

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      const result: SmokeResult = {
        question,
        tools_called: [],
        tool_results: {},
        response_text: '',
        latency_ms: Date.now() - startMs,
        ok: false,
        error: 'ANTHROPIC_API_KEY no configurada',
        checks: { tools_match: null, keywords_found: [], keywords_missing: expectedKeywords },
        recorded_at: new Date().toISOString(),
      };
      return NextResponse.json(result);
    }

    // Traza acumulada durante la ejecución
    const toolsCalled: string[] = [];
    const toolResults: Record<string, unknown> = {};

    const trackedRunTool = async (name: string, input: ToolInput): Promise<string> => {
      const raw = await runTool(name, input);
      toolsCalled.push(name);
      try {
        toolResults[name] = JSON.parse(raw);
      } catch {
        toolResults[name] = raw;
      }
      return raw;
    };

    let anthropicMessages: AnthropicMessage[] = [{ role: 'user', content: question }];
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
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages: anthropicMessages,
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        const result: SmokeResult = {
          question,
          tools_called: toolsCalled,
          tool_results: toolResults,
          response_text: '',
          latency_ms: Date.now() - startMs,
          ok: false,
          error: `Anthropic ${response.status}: ${errText}`.trim(),
          checks: { tools_match: null, keywords_found: [], keywords_missing: expectedKeywords },
          recorded_at: new Date().toISOString(),
        };
        return NextResponse.json(result);
      }

      const data = (await response.json()) as AnthropicResponse;

      if (data.error) {
        const result: SmokeResult = {
          question,
          tools_called: toolsCalled,
          tool_results: toolResults,
          response_text: '',
          latency_ms: Date.now() - startMs,
          ok: false,
          error: data.error.message,
          checks: { tools_match: null, keywords_found: [], keywords_missing: expectedKeywords },
          recorded_at: new Date().toISOString(),
        };
        return NextResponse.json(result);
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

      const toolResultBlocks = await Promise.all(
        toolUseBlocks.map(async (block) => ({
          type: 'tool_result' as const,
          tool_use_id: block.id,
          content: await trackedRunTool(block.name, block.input),
        }))
      );

      anthropicMessages = [
        ...anthropicMessages,
        { role: 'user', content: toolResultBlocks as unknown as AnthropicContentBlock[] },
      ];
    }

    // Evaluar checks
    const lowerResponse = finalText.toLowerCase();
    const keywordsFound = expectedKeywords.filter((kw) => lowerResponse.includes(kw.toLowerCase()));
    const keywordsMissing = expectedKeywords.filter(
      (kw) => !lowerResponse.includes(kw.toLowerCase())
    );

    const toolsMatch =
      expectedTools.length === 0
        ? null
        : expectedTools.every((t) => toolsCalled.includes(t)) &&
          toolsCalled.length === expectedTools.length;

    const result: SmokeResult = {
      question,
      tools_called: toolsCalled,
      tool_results: toolResults,
      response_text: finalText,
      latency_ms: Date.now() - startMs,
      ok: true,
      checks: {
        tools_match: toolsMatch,
        keywords_found: keywordsFound,
        keywords_missing: keywordsMissing,
      },
      recorded_at: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    console.error('[isaak/smoke]', error);
    const result: SmokeResult = {
      question: '',
      tools_called: [],
      tool_results: {},
      response_text: '',
      latency_ms: Date.now() - startMs,
      ok: false,
      error: error instanceof Error ? error.message : 'Error interno',
      checks: { tools_match: null, keywords_found: [], keywords_missing: [] },
      recorded_at: new Date().toISOString(),
    };
    return NextResponse.json(result);
  }
}
