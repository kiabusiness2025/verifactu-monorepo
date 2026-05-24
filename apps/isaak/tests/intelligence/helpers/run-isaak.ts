// Drive Isaak against a fixture using the same system prompt as production.
// Bypasses the HTTP layer and the @verifactu/utils callLLM wrapper to keep
// the test imports clean — calls the Anthropic API directly.

import {
  buildAuthenticatedSystemPrompt,
  buildPublicSystemPrompt,
  type AuthenticatedChatContext,
} from '../../../app/lib/isaak-chat-prompts';
import type { GoldenContext } from './types';

type AIMessage = { role: 'user' | 'assistant'; content: string };

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-sonnet-4-6';

const DEFAULT_TEST_CONTEXT: AuthenticatedChatContext = {
  tenantId: 'test-tenant',
  userId: 'test-user',
  preferredName: 'Marta',
  companyName: 'Acme SL',
  contextSummary:
    'Empresa pequeña en alta como SL en régimen general de IVA, ejercicio fiscal natural.',
  roleLabel: 'autónoma',
  sectorLabel: 'servicios profesionales',
  communicationStyle: 'spanish_clear_non_technical',
  knowledgeLevel: 'starter',
  goals: ['cumplir IVA trimestral', 'evitar sustos'],
  holdedConnected: true,
  workspaceSignalsBlock: 'No hay alertas activas. Próximo plazo: modelo 303 Q2 (20 de julio).',
};

function buildContextForFixture(context: GoldenContext | undefined): AuthenticatedChatContext {
  return {
    ...DEFAULT_TEST_CONTEXT,
    holdedConnected: context?.holdedConnected ?? DEFAULT_TEST_CONTEXT.holdedConnected,
  };
}

function getApiKey(): string {
  const key =
    process.env.ANTHROPIC_API_KEY ||
    process.env.ISAAK_ANTHROPIC_API_KEY ||
    process.env.ANTHROPIC_API_KEY_DEV;
  if (!key) {
    throw new Error(
      'Missing ANTHROPIC_API_KEY for golden tests. Set ISAAK_GOLDEN_LIVE=1 only with an API key available.'
    );
  }
  return key;
}

async function callAnthropic(input: {
  systemPrompt: string;
  messages: AIMessage[];
  model?: string;
}): Promise<{ text: string }> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getApiKey(),
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: input.model ?? DEFAULT_MODEL,
      max_tokens: 600,
      temperature: 0.45,
      system: input.systemPrompt,
      messages: input.messages,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Anthropic ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content?.find((b) => b.type === 'text')?.text ?? '';
  return { text };
}

export type IsaakRunResult = { text: string };

export async function runIsaakSingleTurn(input: {
  query: string;
  context?: GoldenContext;
  history?: AIMessage[];
}): Promise<IsaakRunResult> {
  const authenticated = input.context?.authenticated !== false;
  const ctx = buildContextForFixture(input.context);
  const systemPrompt = authenticated
    ? buildAuthenticatedSystemPrompt(ctx)
    : buildPublicSystemPrompt();

  const messages: AIMessage[] = [
    ...(input.history ?? []),
    { role: 'user', content: input.query },
  ];

  return callAnthropic({ systemPrompt, messages });
}

export async function runIsaakMultiTurn(input: {
  turns: Array<{ user: string }>;
  context?: GoldenContext;
}): Promise<{ turns: Array<{ user: string; assistant: string }> }> {
  const history: AIMessage[] = [];
  const completed: Array<{ user: string; assistant: string }> = [];

  for (const turn of input.turns) {
    const result = await runIsaakSingleTurn({
      query: turn.user,
      context: input.context,
      history,
    });
    completed.push({ user: turn.user, assistant: result.text });
    history.push({ role: 'user', content: turn.user });
    history.push({ role: 'assistant', content: result.text });
  }

  return { turns: completed };
}
