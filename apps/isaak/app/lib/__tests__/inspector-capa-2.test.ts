import {
  buildCitations,
  buildInspectorPrompt,
  buildUserMessage,
  consultInspector,
  extractCitedNumbers,
} from '../inspector-capa-2';
import type { AeatCorpusHit } from '../aeat-corpus-search';
import type { TaxpayerProfileSnapshot } from '../inspector-aeat';

function hit(overrides: Partial<AeatCorpusHit> = {}): AeatCorpusHit {
  return {
    id: 'h1',
    sourceId: 'boe-liva',
    sourceType: 'boe',
    sourceUrl: 'https://boe.es/articulo-1',
    articleRef: 'Art. 1 LIVA',
    title: 'Hecho imponible',
    content: 'Estarán sujetas al impuesto las entregas de bienes y prestaciones de servicios...',
    chunkIndex: 0,
    ingestedAt: '2026-01-01',
    similarity: 0.85,
    ...overrides,
  };
}

const autonomoProfile: TaxpayerProfileSnapshot = {
  taxpayerType: 'autonomo',
  vatRegime: 'general',
  territory: 'comun',
};

describe('buildInspectorPrompt', () => {
  it('incluye el rol Inspector AEAT Capa 2', () => {
    const p = buildInspectorPrompt(null);
    expect(p).toContain('Inspector AEAT');
    expect(p).toContain('Capa 2');
  });

  it('incluye principios de citas con corchetes', () => {
    const p = buildInspectorPrompt(null);
    expect(p).toMatch(/\[1\].*\[2\]/);
  });

  it('inyecta el perfil fiscal cuando se proporciona', () => {
    const p = buildInspectorPrompt(autonomoProfile);
    expect(p).toContain('autonomo');
    expect(p).toContain('general');
    expect(p).toContain('comun');
  });

  it('cuando no hay perfil, indica que pregunte antes de responder', () => {
    const p = buildInspectorPrompt(null);
    expect(p).toMatch(/no configurado|pregúntalo/i);
  });
});

describe('buildUserMessage', () => {
  it('formatea cada hit con número [N] + articleRef + title + content', () => {
    const msg = buildUserMessage('¿Qué es el hecho imponible?', [hit()]);
    expect(msg).toContain('PREGUNTA DEL USUARIO');
    expect(msg).toContain('¿Qué es el hecho imponible?');
    expect(msg).toContain('[1] Art. 1 LIVA — Hecho imponible');
    expect(msg).toContain('Estarán sujetas al impuesto');
  });

  it('separa múltiples hits con "---"', () => {
    const msg = buildUserMessage('q', [hit(), hit({ articleRef: 'Art. 2' })]);
    expect(msg.split('---').length).toBe(2); // 1 separator entre 2 hits
    expect(msg).toContain('Art. 2');
  });

  it('hits sin articleRef usan el title', () => {
    const msg = buildUserMessage('q', [hit({ articleRef: null, title: 'Manual IVA' })]);
    expect(msg).toContain('[1] Manual IVA');
  });
});

describe('extractCitedNumbers', () => {
  it('extrae citas simples [1] [2] [3]', () => {
    expect(extractCitedNumbers('Esto es claro [1]. También [2].')).toEqual([1, 2]);
  });

  it('extrae citas combinadas [1,2]', () => {
    expect(extractCitedNumbers('Ver [1,2] para detalles.')).toEqual([1, 2]);
  });

  it('extrae citas combinadas con espacios [1, 2, 3]', () => {
    expect(extractCitedNumbers('Ver [1, 2, 3] para detalles.')).toEqual([1, 2, 3]);
  });

  it('deduplica y ordena', () => {
    expect(extractCitedNumbers('A [3] B [1] C [2] D [1]')).toEqual([1, 2, 3]);
  });

  it('ignora texto entre corchetes que no sean números', () => {
    expect(extractCitedNumbers('[NOTA] esto es [1] una [verbatim] cita')).toEqual([1]);
  });

  it('texto sin citas → array vacío', () => {
    expect(extractCitedNumbers('No hay citas aquí.')).toEqual([]);
  });
});

describe('buildCitations', () => {
  it('mapea cada número a su hit correspondiente', () => {
    const hits = [
      hit({ sourceId: 's1' }),
      hit({ sourceId: 's2' }),
      hit({ sourceId: 's3' }),
    ];
    const citations = buildCitations(hits, [1, 3]);
    expect(citations).toHaveLength(2);
    expect(citations[0]?.index).toBe(1);
    expect(citations[0]?.sourceId).toBe('s1');
    expect(citations[1]?.index).toBe(3);
    expect(citations[1]?.sourceId).toBe('s3');
  });

  it('descarta números que no mapean a un hit', () => {
    const hits = [hit()];
    const citations = buildCitations(hits, [1, 5, 9]);
    expect(citations).toHaveLength(1);
  });

  it('snippet truncado a 240 chars', () => {
    const longHit = hit({
      content: 'x'.repeat(500),
    });
    const citations = buildCitations([longHit], [1]);
    expect(citations[0]?.snippet.length).toBe(240);
  });
});

describe('consultInspector — orquestación con mocks', () => {
  it('happy path: query → corpus search → LLM → respuesta con citas', async () => {
    const corpusSearcher = jest.fn(async () => [
      hit({ articleRef: 'Art. 1 LIVA' }),
      hit({ id: 'h2', articleRef: 'Art. 2 LIVA' }),
    ]);
    const llmCaller = jest.fn(async () => ({
      text: 'La respuesta es X según [1] y también [2].',
      model: 'claude-sonnet-mock',
      latencyMs: 123,
    }));

    const result = await consultInspector({
      tenantId: 't1',
      query: '¿Qué es el hecho imponible?',
      profile: autonomoProfile,
      corpusSearcher,
      llmCaller,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.answer).toContain('[1]');
    expect(result.answer).toContain('[2]');
    expect(result.citations).toHaveLength(2);
    expect(result.citations[0]?.articleRef).toBe('Art. 1 LIVA');
    expect(result.citations[1]?.articleRef).toBe('Art. 2 LIVA');
    expect(result.model).toBe('claude-sonnet-mock');
    expect(result.corpusHits).toBe(2);
    expect(corpusSearcher).toHaveBeenCalledWith('¿Qué es el hecho imponible?', 5);
  });

  it('query vacía → invalid_input', async () => {
    const r = await consultInspector({
      tenantId: 't1',
      query: '   ',
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('invalid_input');
  });

  it('tenantId vacío → invalid_input', async () => {
    const r = await consultInspector({
      tenantId: '',
      query: 'algo',
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('invalid_input');
  });

  it('sin hits en corpus → no_corpus_hits', async () => {
    const r = await consultInspector({
      tenantId: 't1',
      query: 'pregunta sin respuesta',
      profile: null,
      corpusSearcher: async () => [],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('no_corpus_hits');
  });

  it('LLM throws → llm_failed', async () => {
    const r = await consultInspector({
      tenantId: 't1',
      query: 'pregunta',
      profile: autonomoProfile,
      corpusSearcher: async () => [hit()],
      llmCaller: async () => {
        throw new Error('rate limit');
      },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('llm_failed');
    expect(r.message).toContain('rate limit');
  });

  it('respeta topK personalizado', async () => {
    const corpusSearcher = jest.fn(async () => [hit()]);
    await consultInspector({
      tenantId: 't1',
      query: 'q',
      profile: null,
      topK: 10,
      corpusSearcher,
      llmCaller: async () => ({ text: '[1]', model: 'm', latencyMs: 1 }),
    });
    expect(corpusSearcher).toHaveBeenCalledWith('q', 10);
  });

  it('respuesta del LLM sin citas → citations array vacío', async () => {
    const r = await consultInspector({
      tenantId: 't1',
      query: 'q',
      profile: autonomoProfile,
      corpusSearcher: async () => [hit()],
      llmCaller: async () => ({ text: 'Respuesta sin citas.', model: 'm', latencyMs: 1 }),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.citations).toHaveLength(0);
  });

  it('passes profile=null al prompt cuando se pasa explícitamente null', async () => {
    let promptUsed = '';
    await consultInspector({
      tenantId: 't1',
      query: 'q',
      profile: null,
      corpusSearcher: async () => [hit()],
      llmCaller: async ({ instructions }) => {
        promptUsed = instructions;
        return { text: '[1]', model: 'm', latencyMs: 1 };
      },
    });
    expect(promptUsed).toMatch(/no configurado|pregúntalo/i);
  });
});
