import { callLLM, AIError } from '@verifactu/utils';
import type {
  AIAssistantBlock,
  AIRichMessage,
  AITool,
  AIToolResultBlock,
  AIToolUse,
  AIProvider,
} from '@verifactu/utils';
import {
  executeIsaakTool,
  isWriteToolName,
  type IsaakToolContext,
} from './isaak-tools-registry';
import { judgeWriteAction, type JudgeResult } from './isaak-judge';

const DEFAULT_MAX_ITERATIONS = 8;

export type ToolLoopInput = {
  systemPrompt: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  userMessage: string;
  tools: AITool[];
  context: IsaakToolContext;
  model: string;
  provider?: AIProvider;
  feature?: string;
  maxIterations?: number;
  temperature?: number;
  maxOutputTokens?: number;
  allowWrites?: boolean;
};

export type ToolLoopResult = {
  text: string;
  provider: AIProvider;
  model: string;
  toolNames: string[];
  writeToolNames: string[];
  judgeInvocations: number;
  judgeBlocks: number;
  judgeTotalLatencyMs: number;
  iterations: number;
  totalLatencyMs: number;
  totalUsage: { inputTokens: number; outputTokens: number };
  stoppedReason: 'end_turn' | 'max_iterations' | 'no_text' | 'error';
  isFallback: boolean;
};

async function judgeAndExecute(
  tu: AIToolUse,
  ctx: IsaakToolContext,
  recentTurns: { role: 'user' | 'assistant'; content: string }[],
  allowWrites: boolean
): Promise<{
  block: AIToolResultBlock;
  toolName: string;
  isWrite: boolean;
  judge?: JudgeResult;
}> {
  // Reads bypass the judge entirely — they don't mutate state.
  if (!isWriteToolName(tu.name)) {
    const exec = await executeIsaakTool(tu, ctx);
    return {
      block: {
        type: 'tool_result',
        tool_use_id: exec.toolUseId,
        content: exec.content,
        is_error: exec.isError,
      },
      toolName: exec.toolName,
      isWrite: false,
    };
  }

  // Write attempts ALWAYS go through the judge — even when allowWrites=true.
  const judge = await judgeWriteAction({
    toolName: tu.name,
    toolInput: tu.input,
    recentTurns,
  });

  if (judge.verdict !== 'allow' || !allowWrites) {
    const reason =
      judge.verdict === 'allow' && !allowWrites
        ? 'writes_disabled_in_session'
        : judge.verdict;
    return {
      block: {
        type: 'tool_result',
        tool_use_id: tu.id,
        content: JSON.stringify({
          error: 'judge_blocked',
          verdict: reason,
          reasoning: judge.reasoning,
          blockers: judge.blockers,
          message:
            reason === 'needs_confirmation'
              ? 'Resume al usuario exactamente lo que vas a hacer y pide confirmación explícita ("sí" o "confirma") antes de volver a invocar este tool.'
              : reason === 'block'
                ? 'No ejecutes esta acción. Explica al usuario por qué y pídele lo que falta.'
                : 'Esta sesión no permite escrituras. Pide al usuario que active la confirmación.',
        }),
        is_error: true,
      },
      toolName: tu.name,
      isWrite: true,
      judge,
    };
  }

  // Allowed write: execute.
  const exec = await executeIsaakTool(tu, ctx, { allowWrites: true });
  return {
    block: {
      type: 'tool_result',
      tool_use_id: exec.toolUseId,
      content: exec.content,
      is_error: exec.isError,
    },
    toolName: exec.toolName,
    isWrite: true,
    judge,
  };
}

export async function runIsaakToolLoop(input: ToolLoopInput): Promise<ToolLoopResult> {
  const start = Date.now();
  const maxIter = input.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const toolNames: string[] = [];
  const writeToolNames: string[] = [];
  const totalUsage = { inputTokens: 0, outputTokens: 0 };
  let judgeInvocations = 0;
  let judgeBlocks = 0;
  let judgeTotalLatencyMs = 0;
  let finalProvider: AIProvider = input.provider ?? 'anthropic';
  let finalModel = input.model;
  let isFallback = false;

  const richMessages: AIRichMessage[] = input.history.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  richMessages.push({ role: 'user', content: input.userMessage });

  const recentTurns = [...input.history.slice(-6), { role: 'user' as const, content: input.userMessage }];

  const baseResult = (overrides: Partial<ToolLoopResult>): ToolLoopResult => ({
    text: '',
    provider: finalProvider,
    model: finalModel,
    toolNames,
    writeToolNames,
    judgeInvocations,
    judgeBlocks,
    judgeTotalLatencyMs,
    iterations: 0,
    totalLatencyMs: Date.now() - start,
    totalUsage,
    stoppedReason: 'error',
    isFallback,
    ...overrides,
  });

  for (let iter = 0; iter < maxIter; iter++) {
    let response;
    try {
      response = await callLLM({
        provider: input.provider ?? 'anthropic',
        model: input.model,
        instructions: input.systemPrompt,
        richMessages,
        tools: input.tools,
        temperature: input.temperature ?? 0.45,
        maxOutputTokens: input.maxOutputTokens ?? 1200,
        feature: input.feature ?? 'isaak_tool_loop',
        enableFallback: false,
      });
    } catch (err) {
      if (err instanceof AIError) {
        console.error('[isaak-tool-loop] callLLM error', {
          provider: err.provider,
          kind: err.kind,
          message: err.message,
        });
      } else {
        console.error('[isaak-tool-loop] unexpected error', err);
      }
      return baseResult({ iterations: iter, stoppedReason: 'error' });
    }

    finalProvider = response.provider;
    finalModel = response.model;
    if (response.provider !== (input.provider ?? 'anthropic')) {
      isFallback = true;
    }
    if (response.usage) {
      totalUsage.inputTokens += response.usage.inputTokens;
      totalUsage.outputTokens += response.usage.outputTokens;
    }

    const toolUses: AIToolUse[] = response.toolUses ?? [];

    if (toolUses.length === 0 || response.stopReason === 'end_turn') {
      return baseResult({
        text: response.text,
        iterations: iter + 1,
        stoppedReason: response.text ? 'end_turn' : 'no_text',
      });
    }

    const assistantBlocks: AIAssistantBlock[] = [];
    if (response.text) assistantBlocks.push({ type: 'text', text: response.text });
    for (const tu of toolUses) {
      assistantBlocks.push({ type: 'tool_use', id: tu.id, name: tu.name, input: tu.input });
    }
    richMessages.push({ role: 'assistant', content: assistantBlocks });

    const executions = await Promise.all(
      toolUses.map((tu) =>
        judgeAndExecute(tu, input.context, recentTurns, input.allowWrites === true)
      )
    );

    const resultBlocks: AIToolResultBlock[] = [];
    for (const exec of executions) {
      toolNames.push(exec.toolName);
      if (exec.isWrite) writeToolNames.push(exec.toolName);
      if (exec.judge) {
        judgeInvocations += 1;
        judgeTotalLatencyMs += exec.judge.latencyMs;
        if (exec.judge.verdict !== 'allow') judgeBlocks += 1;
      }
      resultBlocks.push(exec.block);
    }
    richMessages.push({ role: 'user', content: resultBlocks });
  }

  return baseResult({ iterations: maxIter, stoppedReason: 'max_iterations' });
}
