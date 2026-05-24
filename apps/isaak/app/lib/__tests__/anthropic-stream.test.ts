// Direct relative import avoids pulling @verifactu/utils' index (which
// transitively imports session.ts with TS syntax babel-jest can't handle).
import {
  parseAnthropicSSE,
  type AnthropicStreamEvent,
} from '../../../../../packages/utils/ai/anthropic-stream';

function sseStreamFrom(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(enc.encode(c));
      controller.close();
    },
  });
}

async function drain(stream: ReadableStream<AnthropicStreamEvent>) {
  const events: AnthropicStreamEvent[] = [];
  const reader = stream.getReader();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    events.push(value);
  }
  return events;
}

function event(name: string, data: object): string {
  return `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
}

describe('parseAnthropicSSE', () => {
  it('extracts text_delta events from content_block_delta', async () => {
    const chunks = [
      event('message_start', { type: 'message_start', message: { usage: { input_tokens: 12 } } }),
      event('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text' } }),
      event('content_block_delta', {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: 'Hola ' },
      }),
      event('content_block_delta', {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: 'Marta' },
      }),
      event('content_block_stop', { type: 'content_block_stop', index: 0 }),
      event('message_delta', {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn' },
        usage: { output_tokens: 8 },
      }),
      event('message_stop', { type: 'message_stop' }),
    ];

    const out = await drain(parseAnthropicSSE(sseStreamFrom(chunks)));
    const text = out
      .filter((e) => e.type === 'text_delta')
      .map((e) => (e.type === 'text_delta' ? e.text : ''))
      .join('');
    expect(text).toBe('Hola Marta');

    const stop = out.find((e) => e.type === 'message_stop');
    expect(stop?.type).toBe('message_stop');
    if (stop && stop.type === 'message_stop') {
      expect(stop.stopReason).toBe('end_turn');
      expect(stop.usage?.inputTokens).toBe(12);
      expect(stop.usage?.outputTokens).toBe(8);
    }
  });

  it('emits tool_use_start, input_json_delta, tool_use_end in order', async () => {
    const chunks = [
      event('message_start', { type: 'message_start', message: { usage: { input_tokens: 50 } } }),
      event('content_block_start', {
        type: 'content_block_start',
        index: 0,
        content_block: { type: 'tool_use', id: 'toolu_01', name: 'holded_list_documents' },
      }),
      event('content_block_delta', {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'input_json_delta', partial_json: '{"docTy' },
      }),
      event('content_block_delta', {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'input_json_delta', partial_json: 'pe":"invoice"}' },
      }),
      event('content_block_stop', { type: 'content_block_stop', index: 0 }),
      event('message_delta', {
        type: 'message_delta',
        delta: { stop_reason: 'tool_use' },
        usage: { output_tokens: 5 },
      }),
      event('message_stop', { type: 'message_stop' }),
    ];

    const out = await drain(parseAnthropicSSE(sseStreamFrom(chunks)));
    const types = out.map((e) => e.type);
    expect(types).toEqual([
      'tool_use_start',
      'input_json_delta',
      'input_json_delta',
      'tool_use_end',
      'message_stop',
    ]);

    const start = out[0];
    if (start && start.type === 'tool_use_start') {
      expect(start.id).toBe('toolu_01');
      expect(start.name).toBe('holded_list_documents');
    }

    const json = out
      .filter((e) => e.type === 'input_json_delta')
      .map((e) => (e.type === 'input_json_delta' ? e.partialJson : ''))
      .join('');
    expect(json).toBe('{"docType":"invoice"}');
  });

  it('handles SSE chunks split mid-event', async () => {
    const full = event('message_start', { type: 'message_start', message: {} }) +
      event('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text' } }) +
      event('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'A' } }) +
      event('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'B' } }) +
      event('message_stop', { type: 'message_stop' });

    // Split bytes in awkward places to ensure buffering works.
    const split = [
      full.slice(0, 30),
      full.slice(30, 80),
      full.slice(80, 200),
      full.slice(200),
    ];
    const out = await drain(parseAnthropicSSE(sseStreamFrom(split)));
    const text = out
      .filter((e) => e.type === 'text_delta')
      .map((e) => (e.type === 'text_delta' ? e.text : ''))
      .join('');
    expect(text).toBe('AB');
  });

  it('emits error event when upstream sends one', async () => {
    const chunks = [
      event('error', {
        type: 'error',
        error: { type: 'overloaded_error', message: 'Servers overloaded' },
      }),
    ];
    const out = await drain(parseAnthropicSSE(sseStreamFrom(chunks)));
    expect(out.length).toBe(1);
    expect(out[0].type).toBe('error');
    if (out[0].type === 'error') {
      expect(out[0].error.kind).toBe('overloaded_error');
    }
  });

  it('ignores non-data lines and [DONE] sentinels', async () => {
    const chunks = [
      ': keepalive\n\n',
      event('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text' } }),
      event('content_block_delta', {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: 'X' },
      }),
      'data: [DONE]\n\n',
      event('message_stop', { type: 'message_stop' }),
    ];
    const out = await drain(parseAnthropicSSE(sseStreamFrom(chunks)));
    const text = out
      .filter((e) => e.type === 'text_delta')
      .map((e) => (e.type === 'text_delta' ? e.text : ''))
      .join('');
    expect(text).toBe('X');
    expect(out.find((e) => e.type === 'message_stop')).toBeTruthy();
  });

  it('drops malformed JSON inside data lines without crashing', async () => {
    const chunks = [
      'data: not-json\n\n',
      event('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text' } }),
      event('content_block_delta', {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: 'ok' },
      }),
      event('message_stop', { type: 'message_stop' }),
    ];
    const out = await drain(parseAnthropicSSE(sseStreamFrom(chunks)));
    expect(out.length).toBeGreaterThanOrEqual(2);
    expect(out.some((e) => e.type === 'text_delta')).toBe(true);
  });
});
