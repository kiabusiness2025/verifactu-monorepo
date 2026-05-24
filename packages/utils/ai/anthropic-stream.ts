// Anthropic Messages API streaming primitive.
//
// Parses the SSE protocol from /v1/messages?stream=true into typed events
// that callers (the tool loop) consume to drive UI updates and execute
// tool calls between turns.
//
// Event reference: https://docs.anthropic.com/en/api/messages-streaming

import { AIError, classifyHttpError } from './errors';

export type AnthropicStreamTextDelta = {
  type: 'text_delta';
  text: string;
};

export type AnthropicStreamToolUseStart = {
  type: 'tool_use_start';
  id: string;
  name: string;
};

export type AnthropicStreamInputJsonDelta = {
  type: 'input_json_delta';
  toolUseId: string;
  partialJson: string;
};

export type AnthropicStreamToolUseEnd = {
  type: 'tool_use_end';
  toolUseId: string;
};

export type AnthropicStreamMessageStop = {
  type: 'message_stop';
  stopReason: string | null;
  usage?: { inputTokens: number; outputTokens: number };
};

export type AnthropicStreamError = {
  type: 'error';
  error: { kind: string; message: string };
};

export type AnthropicStreamEvent =
  | AnthropicStreamTextDelta
  | AnthropicStreamToolUseStart
  | AnthropicStreamInputJsonDelta
  | AnthropicStreamToolUseEnd
  | AnthropicStreamMessageStop
  | AnthropicStreamError;

export type AnthropicStreamInput = {
  apiKey: string;
  model: string;
  system?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: unknown }>;
  tools?: Array<{ name: string; description?: string; input_schema: Record<string, unknown> }>;
  toolChoice?: { type: 'auto' } | { type: 'any' } | { type: 'tool'; name: string };
  temperature?: number;
  maxTokens?: number;
};

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// Index → { id, name } so we can correlate input_json_delta back to its tool_use block.
type ToolUseTrack = { id: string; name: string };

export async function streamAnthropicMessages(
  input: AnthropicStreamInput
): Promise<ReadableStream<AnthropicStreamEvent>> {
  const payload: Record<string, unknown> = {
    model: input.model,
    max_tokens: input.maxTokens ?? 1500,
    messages: input.messages,
    stream: true,
  };
  if (input.system) payload.system = input.system;
  if (typeof input.temperature === 'number') payload.temperature = input.temperature;
  if (input.tools?.length) {
    payload.tools = input.tools;
    payload.tool_choice = input.toolChoice ?? { type: 'auto' };
  }

  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': input.apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok || !response.body) {
    const body = response.body
      ? await new Response(response.body).text().catch(() => '')
      : '';
    throw new AIError(
      `Anthropic stream error ${response.status}: ${body.slice(0, 200)}`,
      'anthropic',
      classifyHttpError(response.status),
      response.status
    );
  }

  return parseAnthropicSSE(response.body);
}

export function parseAnthropicSSE(
  upstream: ReadableStream<Uint8Array>
): ReadableStream<AnthropicStreamEvent> {
  const decoder = new TextDecoder();
  const tracks = new Map<number, ToolUseTrack>();
  let buffer = '';

  return new ReadableStream<AnthropicStreamEvent>({
    async start(controller) {
      const reader = upstream.getReader();
      const usage = { inputTokens: 0, outputTokens: 0 };
      let stopReason: string | null = null;

      const handleEvent = (rawJson: string) => {
        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(rawJson);
        } catch {
          return;
        }
        const t = typeof payload.type === 'string' ? payload.type : '';

        if (t === 'message_start') {
          const message = payload.message as { usage?: { input_tokens?: number } } | undefined;
          if (message?.usage?.input_tokens) {
            usage.inputTokens = message.usage.input_tokens;
          }
        } else if (t === 'content_block_start') {
          const index = typeof payload.index === 'number' ? payload.index : -1;
          const block = payload.content_block as
            | { type?: string; id?: string; name?: string }
            | undefined;
          if (block?.type === 'tool_use' && block.id && block.name && index >= 0) {
            tracks.set(index, { id: block.id, name: block.name });
            controller.enqueue({ type: 'tool_use_start', id: block.id, name: block.name });
          }
        } else if (t === 'content_block_delta') {
          const index = typeof payload.index === 'number' ? payload.index : -1;
          const delta = payload.delta as
            | { type?: string; text?: string; partial_json?: string }
            | undefined;
          if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
            controller.enqueue({ type: 'text_delta', text: delta.text });
          } else if (delta?.type === 'input_json_delta' && typeof delta.partial_json === 'string') {
            const track = tracks.get(index);
            if (track) {
              controller.enqueue({
                type: 'input_json_delta',
                toolUseId: track.id,
                partialJson: delta.partial_json,
              });
            }
          }
        } else if (t === 'content_block_stop') {
          const index = typeof payload.index === 'number' ? payload.index : -1;
          const track = tracks.get(index);
          if (track) {
            controller.enqueue({ type: 'tool_use_end', toolUseId: track.id });
            tracks.delete(index);
          }
        } else if (t === 'message_delta') {
          const delta = payload.delta as { stop_reason?: string } | undefined;
          const u = payload.usage as { output_tokens?: number } | undefined;
          if (delta?.stop_reason) stopReason = delta.stop_reason;
          if (u?.output_tokens) usage.outputTokens = u.output_tokens;
        } else if (t === 'message_stop') {
          controller.enqueue({ type: 'message_stop', stopReason, usage });
        } else if (t === 'error') {
          const err = payload.error as { type?: string; message?: string } | undefined;
          controller.enqueue({
            type: 'error',
            error: {
              kind: err?.type ?? 'unknown',
              message: err?.message ?? 'Unknown Anthropic stream error',
            },
          });
        }
      };

      try {
        // SSE chunks: `event: <name>\ndata: <json>\n\n`
        // We only need the data lines; the type field is inside the JSON itself.
        // Process line-by-line buffering until \n\n boundary.
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let boundary = buffer.indexOf('\n\n');
          while (boundary !== -1) {
            const block = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            for (const line of block.split('\n')) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data:')) {
                const jsonText = trimmed.slice(5).trim();
                if (jsonText && jsonText !== '[DONE]') handleEvent(jsonText);
              }
            }
            boundary = buffer.indexOf('\n\n');
          }
        }
      } catch (err) {
        controller.enqueue({
          type: 'error',
          error: { kind: 'stream_aborted', message: String(err) },
        });
      } finally {
        controller.close();
      }
    },
  });
}
