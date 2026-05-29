// F5: streaming chat orchestrator.
//
// Returns a ReadableStream<Uint8Array> formatted as Server-Sent Events for
// the /api/chat/stream endpoint. Events emitted:
//
//   event: text-delta        data: { delta: "..." }
//   event: tool-use-start    data: { name: "...", id: "..." }
//   event: tool-use-result   data: { name: "...", id: "...", isError: bool }
//   event: done              data: { firstTokenMs, totalLatencyMs, usage,
//                                    toolNames, writeToolNames, iterations,
//                                    stopReason }
//   event: error             data: { message }
//
// Tool execution still uses the same registry + judge wiring as F2-F4.
// Reads stream straight to the user; writes still go through the F4 judge
// before execution (the judge call itself is NOT streamed — it's a quick
// blocking guard between turns).

import { resolveAIConfig, streamAnthropicMessages, AIError } from '@verifactu/utils';
import type {
  AIAssistantBlock,
  AnthropicStreamEvent,
  AIToolResultBlock,
  AITool,
} from '@verifactu/utils';
import { executeIsaakTool, isWriteToolName, type IsaakToolContext } from './isaak-tools-registry';
import { judgeWriteAction } from './isaak-judge';
import { evaluateContext } from './inspector-aeat';
import { AEAT_RULES } from './inspector-aeat-rules';
import { isInspectableWriteTool, toolUseToRuleContext } from './inspector-aeat-bridge';

const DEFAULT_MAX_ITERATIONS = 8;

export type ChatStreamInput = {
  systemPrompt: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  userMessage: string;
  tools: AITool[];
  context: IsaakToolContext;
  model: string;
  allowWrites?: boolean;
  maxIterations?: number;
  maxTokens?: number;
  temperature?: number;
};

export type ChatStreamMetrics = {
  text: string;
  firstTokenMs: number | null;
  totalLatencyMs: number;
  inputTokens: number;
  outputTokens: number;
  toolNames: string[];
  writeToolNames: string[];
  judgeInvocations: number;
  judgeBlocks: number;
  judgeTotalLatencyMs: number;
  // F11 fase 2: Inspector AEAT preventivo
  inspectorRuns: number;
  inspectorBlocks: number;
  inspectorWarnings: number;
  iterations: number;
  stopReason: string;
  isFallback: boolean;
};

type AnthropicMessage = { role: 'user' | 'assistant'; content: unknown };

type PendingToolUse = {
  id: string;
  name: string;
  jsonChunks: string[];
};

function sseChunk(event: string, data: object): Uint8Array {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  return new TextEncoder().encode(payload);
}

export type StreamRunResult = {
  stream: ReadableStream<Uint8Array>;
  metricsPromise: Promise<ChatStreamMetrics>;
};

export function streamIsaakChat(input: ChatStreamInput): StreamRunResult {
  const config = resolveAIConfig(process.env);
  const apiKey = config.anthropicApiKey;
  const start = Date.now();
  const maxIter = input.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const allowWrites = input.allowWrites === true;

  const metrics: ChatStreamMetrics = {
    text: '',
    firstTokenMs: null,
    totalLatencyMs: 0,
    inputTokens: 0,
    outputTokens: 0,
    toolNames: [],
    writeToolNames: [],
    judgeInvocations: 0,
    judgeBlocks: 0,
    judgeTotalLatencyMs: 0,
    inspectorRuns: 0,
    inspectorBlocks: 0,
    inspectorWarnings: 0,
    iterations: 0,
    stopReason: '',
    isFallback: false,
  };

  let resolveMetrics!: (m: ChatStreamMetrics) => void;
  const metricsPromise = new Promise<ChatStreamMetrics>((resolve) => {
    resolveMetrics = resolve;
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const finish = (stopReason: string) => {
        metrics.stopReason = stopReason;
        metrics.totalLatencyMs = Date.now() - start;
        controller.enqueue(sseChunk('done', metrics));
        controller.close();
        resolveMetrics(metrics);
      };

      const emitError = (message: string) => {
        controller.enqueue(sseChunk('error', { message }));
      };

      if (!apiKey) {
        emitError('Missing ANTHROPIC_API_KEY');
        finish('error');
        return;
      }

      const messages: AnthropicMessage[] = input.history.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      messages.push({ role: 'user', content: input.userMessage });

      try {
        for (let iter = 0; iter < maxIter; iter++) {
          metrics.iterations = iter + 1;

          let upstream: ReadableStream<AnthropicStreamEvent>;
          try {
            upstream = await streamAnthropicMessages({
              apiKey,
              model: input.model,
              system: input.systemPrompt,
              messages,
              tools: input.tools.length ? input.tools : undefined,
              maxTokens: input.maxTokens ?? 1500,
              temperature: input.temperature ?? 0.45,
            });
          } catch (err) {
            const msg = err instanceof AIError ? `${err.kind}: ${err.message}` : String(err);
            emitError(msg);
            finish('error');
            return;
          }

          const assistantBlocks: AIAssistantBlock[] = [];
          const pending = new Map<string, PendingToolUse>();
          let textAcc = '';
          let stopReason = '';
          let inputTokensThisTurn = 0;
          let outputTokensThisTurn = 0;

          const reader = upstream.getReader();
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { done, value } = await reader.read();
            if (done || !value) break;

            if (value.type === 'text_delta') {
              if (metrics.firstTokenMs === null) {
                metrics.firstTokenMs = Date.now() - start;
              }
              textAcc += value.text;
              controller.enqueue(sseChunk('text-delta', { delta: value.text }));
            } else if (value.type === 'tool_use_start') {
              pending.set(value.id, { id: value.id, name: value.name, jsonChunks: [] });
              controller.enqueue(sseChunk('tool-use-start', { id: value.id, name: value.name }));
            } else if (value.type === 'input_json_delta') {
              const entry = pending.get(value.toolUseId);
              if (entry) entry.jsonChunks.push(value.partialJson);
            } else if (value.type === 'tool_use_end') {
              // No event to the client — tool execution result is emitted later.
            } else if (value.type === 'message_stop') {
              stopReason = value.stopReason ?? 'end_turn';
              if (value.usage) {
                inputTokensThisTurn = value.usage.inputTokens;
                outputTokensThisTurn = value.usage.outputTokens;
              }
            } else if (value.type === 'error') {
              emitError(`${value.error.kind}: ${value.error.message}`);
              finish('error');
              return;
            }
          }

          metrics.text += textAcc;
          metrics.inputTokens += inputTokensThisTurn;
          metrics.outputTokens += outputTokensThisTurn;

          if (textAcc) assistantBlocks.push({ type: 'text', text: textAcc });

          if (pending.size === 0 || stopReason === 'end_turn') {
            finish(stopReason || 'end_turn');
            return;
          }

          // Tool turn: assemble inputs, judge writes, execute, append results.
          const toolUses = Array.from(pending.values()).map((p) => {
            let parsed: Record<string, unknown> = {};
            try {
              parsed = JSON.parse(p.jsonChunks.join('')) as Record<string, unknown>;
            } catch {
              parsed = {};
            }
            return { id: p.id, name: p.name, input: parsed };
          });

          for (const tu of toolUses) {
            assistantBlocks.push({
              type: 'tool_use',
              id: tu.id,
              name: tu.name,
              input: tu.input,
            });
          }
          messages.push({ role: 'assistant', content: assistantBlocks });

          const resultBlocks: AIToolResultBlock[] = [];
          for (const tu of toolUses) {
            const isWrite = isWriteToolName(tu.name);
            if (isWrite) metrics.writeToolNames.push(tu.name);
            metrics.toolNames.push(tu.name);

            let resultContent: string = '';
            let isError = false;

            if (isWrite) {
              const judge = await judgeWriteAction({
                toolName: tu.name,
                toolInput: tu.input,
                recentTurns: [
                  ...input.history.slice(-6),
                  { role: 'user' as const, content: input.userMessage },
                ],
              });
              metrics.judgeInvocations += 1;
              metrics.judgeTotalLatencyMs += judge.latencyMs;
              if (judge.verdict !== 'allow' || !allowWrites) {
                metrics.judgeBlocks += 1;
                resultContent = JSON.stringify({
                  error: 'judge_blocked',
                  verdict:
                    judge.verdict === 'allow' && !allowWrites
                      ? 'writes_disabled_in_session'
                      : judge.verdict,
                  reasoning: judge.reasoning,
                  blockers: judge.blockers,
                });
                isError = true;
              } else {
                // F11 fase 2: Inspector AEAT runs after judge approval,
                // before execution. Errors block; warnings/infos are
                // appended to the tool result so the LLM surfaces them.
                let blockedByInspector = false;
                let inspectorAugmentation: { warnings: unknown[]; infos: unknown[] } | null = null;
                if (isInspectableWriteTool(tu.name)) {
                  const ruleCtx = toolUseToRuleContext({
                    toolName: tu.name,
                    toolInput: tu.input,
                  });
                  if (ruleCtx) {
                    const report = evaluateContext(AEAT_RULES, ruleCtx);
                    metrics.inspectorRuns += 1;
                    metrics.inspectorWarnings += report.warnings.length;
                    if (!report.passed) {
                      metrics.inspectorBlocks += 1;
                      blockedByInspector = true;
                      resultContent = JSON.stringify({
                        error: 'inspector_blocked',
                        verdict: 'block',
                        errors: report.errors,
                        warnings: report.warnings,
                        infos: report.infos,
                        message:
                          'Inspector AEAT detectó problemas que bloquean esta acción. Explica al usuario los errores citados, pídele que corrija los datos y vuelve a intentarlo.',
                      });
                      isError = true;
                    } else if (report.warnings.length > 0 || report.infos.length > 0) {
                      inspectorAugmentation = {
                        warnings: report.warnings,
                        infos: report.infos,
                      };
                    }
                  }
                }
                if (!blockedByInspector) {
                  const exec = await executeIsaakTool(tu, input.context, { allowWrites: true });
                  resultContent = exec.content;
                  isError = exec.isError;
                  if (inspectorAugmentation) {
                    try {
                      const parsed = JSON.parse(resultContent);
                      resultContent = JSON.stringify({
                        ...parsed,
                        inspector: inspectorAugmentation,
                      });
                    } catch {
                      // Non-JSON tool result; keep as-is.
                    }
                  }
                }
              }
            } else {
              const exec = await executeIsaakTool(tu, input.context);
              resultContent = exec.content;
              isError = exec.isError;
            }

            controller.enqueue(sseChunk('tool-use-result', { id: tu.id, name: tu.name, isError }));
            // Emit artifact event if tool returned one
            if (!isError) {
              try {
                const parsed = JSON.parse(resultContent) as Record<string, unknown>;
                if (parsed?.artifact && typeof parsed.artifact === 'object') {
                  controller.enqueue(sseChunk('artifact', parsed.artifact as object));
                }
              } catch {
                // Not JSON — no artifact
              }
            }
            resultBlocks.push({
              type: 'tool_result',
              tool_use_id: tu.id,
              content: resultContent,
              is_error: isError,
            });
          }

          messages.push({ role: 'user', content: resultBlocks });
        }

        // Hit max iterations without end_turn.
        finish('max_iterations');
      } catch (err) {
        emitError(err instanceof Error ? err.message : String(err));
        finish('error');
      }
    },
  });

  return { stream, metricsPromise };
}
