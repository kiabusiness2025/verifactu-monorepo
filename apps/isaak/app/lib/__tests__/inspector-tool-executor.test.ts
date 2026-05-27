// Tests del executor de la tool inspector_consult.
//
// Mockea `consultInspector` (módulo `inspector-capa-2`) para validar
// que el executor formatea correctamente la respuesta hacia el LLM
// que invoca la tool.

import { executeLedgerTool } from '../isaak-ledger-tools';

jest.mock('../inspector-capa-2', () => ({
  consultInspector: jest.fn(),
}));

import { consultInspector } from '../inspector-capa-2';

const mockedConsult = consultInspector as jest.MockedFunction<typeof consultInspector>;

const ctx = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  holdedApiKey: null,
};

describe('executeLedgerTool — inspector_consult', () => {
  beforeEach(() => {
    mockedConsult.mockReset();
  });

  it('rechaza query vacía con invalid_query', async () => {
    const r = await executeLedgerTool(ctx, 'inspector_consult', { query: '   ' });
    expect((r as { ok: boolean }).ok).toBe(false);
    expect((r as { error: string }).error).toBe('invalid_query');
    expect(mockedConsult).not.toHaveBeenCalled();
  });

  it('happy path: invoca consultInspector y formatea citas', async () => {
    mockedConsult.mockResolvedValue({
      ok: true,
      answer: 'La prorrata especial se aplica cuando [1] el tipo es...',
      citations: [
        {
          index: 1,
          sourceId: 'boe-liva-art-103',
          sourceUrl: 'https://boe.es/articulo-103',
          articleRef: 'Art. 103 LIVA',
          title: 'Prorrata especial',
          snippet: 'Texto del articulo...',
          similarity: 0.88,
        },
      ],
      profile: { taxpayerType: 'autonomo', vatRegime: 'general', territory: 'comun' },
      corpusHits: 5,
      model: 'claude-sonnet-mock',
      latencyMs: 123,
    });

    const r = await executeLedgerTool(ctx, 'inspector_consult', {
      query: '¿Cuándo aplico la prorrata especial?',
    });

    expect((r as { ok: boolean }).ok).toBe(true);
    const result = r as {
      ok: true;
      answer: string;
      citations: Array<{ index: number; articleRef: string | null; title: string | null; sourceUrl: string; snippet: string }>;
      corpusHits: number;
      model: string;
    };
    expect(result.answer).toContain('prorrata especial');
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]?.articleRef).toBe('Art. 103 LIVA');
    expect(result.citations[0]?.sourceUrl).toBe('https://boe.es/articulo-103');
    expect(result.citations[0]?.snippet).toBe('Texto del articulo...');
    expect(result.corpusHits).toBe(5);
    expect(result.model).toBe('claude-sonnet-mock');

    // El executor NO debe filtrar similarity (es info interna), pero
    // SÍ debe filtrar `sourceId` para no exponer detalles de impl.
    expect((result.citations[0] as Record<string, unknown>).similarity).toBeUndefined();
    expect((result.citations[0] as Record<string, unknown>).sourceId).toBeUndefined();
  });

  it('respeta topK pasado en args', async () => {
    mockedConsult.mockResolvedValue({
      ok: true,
      answer: 'ok',
      citations: [],
      profile: null,
      corpusHits: 0,
      model: 'm',
      latencyMs: 1,
    });
    await executeLedgerTool(ctx, 'inspector_consult', { query: 'q', topK: 10 });
    expect(mockedConsult).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1', query: 'q', topK: 10 }),
    );
  });

  it('cuando consultInspector devuelve no_corpus_hits, propaga el error', async () => {
    mockedConsult.mockResolvedValue({
      ok: false,
      error: 'no_corpus_hits',
      message: 'No hay corpus ingestado.',
    });
    const r = await executeLedgerTool(ctx, 'inspector_consult', { query: 'q' });
    expect((r as { ok: boolean }).ok).toBe(false);
    expect((r as { error: string }).error).toBe('no_corpus_hits');
    expect((r as { message: string }).message).toContain('No hay corpus');
  });

  it('cuando consultInspector devuelve llm_failed, propaga el error', async () => {
    mockedConsult.mockResolvedValue({
      ok: false,
      error: 'llm_failed',
      message: 'rate limit anthropic',
    });
    const r = await executeLedgerTool(ctx, 'inspector_consult', { query: 'q' });
    expect((r as { ok: boolean }).ok).toBe(false);
    expect((r as { error: string }).error).toBe('llm_failed');
  });

  it('cuando consultInspector throws, devuelve consult_failed', async () => {
    mockedConsult.mockRejectedValue(new Error('connection refused'));
    const r = await executeLedgerTool(ctx, 'inspector_consult', { query: 'q' });
    expect((r as { ok: boolean }).ok).toBe(false);
    expect((r as { error: string }).error).toBe('consult_failed');
    expect((r as { message: string }).message).toContain('connection refused');
  });

  it('respuesta incluye message human-readable con número de citas y modelo', async () => {
    mockedConsult.mockResolvedValue({
      ok: true,
      answer: '[1][2]',
      citations: [
        {
          index: 1,
          sourceId: 's1',
          sourceUrl: 'https://x',
          articleRef: 'A1',
          title: 'T1',
          snippet: 'X',
          similarity: 0.8,
        },
        {
          index: 2,
          sourceId: 's2',
          sourceUrl: 'https://y',
          articleRef: 'A2',
          title: 'T2',
          snippet: 'Y',
          similarity: 0.7,
        },
      ],
      profile: null,
      corpusHits: 2,
      model: 'claude-opus-4-7',
      latencyMs: 250,
    });
    const r = await executeLedgerTool(ctx, 'inspector_consult', { query: 'q' });
    expect((r as { ok: boolean }).ok).toBe(true);
    const msg = (r as { message: string }).message;
    expect(msg).toContain('2 citas');
    expect(msg).toContain('claude-opus-4-7');
  });
});
