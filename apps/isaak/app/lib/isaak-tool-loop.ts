import { callLLM, AIError } from '@verifactu/utils';
import type {
  AIAssistantBlock,
  AIRichMessage,
  AITool,
  AIToolResultBlock,
  AIToolUse,
  AIProvider,
} from '@verifactu/utils';
import { executeIsaakTool, type IsaakToolContext } from './isaak-tools-registry';

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
};

export type ToolLoopResult = {
  text: string;
  provider: AIProvider;
  model: string;
  toolNames: string[];
  iterations: number;
  totalLatencyMs: number;
  totalUsage: { inputTokens: number; outputTokens: number };
  stoppedReason: 'end_turn' | 'max_iterations' | 'no_text' | 'error';
  isFallback: boolean;
};

export async function runIsaakToolLoop(input: ToolLoopInput): Promise<ToolLoopResult> {
  const start = Date.now();
  const maxIter = input.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const toolNames: string[] = [];
  const totalUsage = { inputTokens: 0, outputTokens: 0 };
  let finalProvider: AIProvider = input.provider ?? 'anthropic';
  let finalModel = input.model;
  let isFallback = false;

  const richMessages: AIRichMessage[] = input.history.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  richMessages.push({ role: 'user', content: input.userMessage });

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
      return {
        text: '',
        provider: finalProvider,
        model: finalModel,
        toolNames,
        iterations: iter,
        totalLatencyMs: Date.now() - start,
        totalUsage,
        stoppedReason: 'error',
        isFallback,
      };
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
      return {
        text: response.text,
        provider: finalProvider,
        model: finalModel,
        toolNames,
        iterations: iter + 1,
        totalLatencyMs: Date.now() - start,
        totalUsage,
        stoppedReason: response.text ? 'end_turn' : 'no_text',
        isFallback,
      };
    }

    // Append assistant turn (text + tool_use blocks) and tool results.
    const assistantBlocks: AIAssistantBlock[] = [];
    if (response.text) assistantBlocks.push({ type: 'text', text: response.text });
    for (const tu of toolUses) {
      assistantBlocks.push({ type: 'tool_use', id: tu.id, name: tu.name, input: tu.input });
    }
    richMessages.push({ role: 'assistant', content: assistantBlocks });

    const executions = await Promise.all(
      toolUses.map((tu) => executeIsaakTool(tu, input.context))
    );
    for (const exec of executions) {
      toolNames.push(exec.toolName);
    }
    const resultBlocks: AIToolResultBlock[] = executions.map((exec) => ({
      type: 'tool_result',
      tool_use_id: exec.toolUseId,
      content: exec.content,
      is_error: exec.isError,
    }));
    richMessages.push({ role: 'user', content: resultBlocks });
  }

  return {
    text: '',
    provider: finalProvider,
    model: finalModel,
    toolNames,
    iterations: maxIter,
    totalLatencyMs: Date.now() - start,
    totalUsage,
    stoppedReason: 'max_iterations',
    isFallback,
  };
}
