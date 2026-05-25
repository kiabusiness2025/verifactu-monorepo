import {
  AEAT_SOURCES,
  findSourceById,
  listSourcesByType,
} from '../aeat-corpus-sources';
import { chunkText } from '../aeat-corpus-chunker';
import {
  COUNT_BY_SOURCE_SQL,
  DELETE_BY_SOURCE_SQL,
  UPSERT_CHUNK_SQL,
  buildCorpusWhereClause,
  buildSearchCorpusSQL,
} from '../aeat-corpus-sql';

describe('AEAT_SOURCES registry', () => {
  it('all sources have unique ids', () => {
    const ids = AEAT_SOURCES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all sources have a valid type and a https URL', () => {
    const validTypes = new Set(['manual_aeat', 'boe', 'informa', 'sede_faq', 'doctrina_dgt']);
    for (const s of AEAT_SOURCES) {
      expect(validTypes.has(s.type)).toBe(true);
      expect(s.url.startsWith('https://')).toBe(true);
      expect(s.name.length).toBeGreaterThan(5);
      expect(s.tags.length).toBeGreaterThan(0);
    }
  });

  it('findSourceById returns the source or undefined', () => {
    expect(findSourceById('boe_liva')?.type).toBe('boe');
    expect(findSourceById('nonexistent')).toBeUndefined();
  });

  it('listSourcesByType filters correctly', () => {
    const manuals = listSourcesByType('manual_aeat');
    expect(manuals.length).toBeGreaterThanOrEqual(2);
    expect(manuals.every((m) => m.type === 'manual_aeat')).toBe(true);

    const boes = listSourcesByType('boe');
    expect(boes.length).toBeGreaterThanOrEqual(4); // LIVA, LIRPF, LIS, LGT, RDs
    expect(boes.every((b) => b.type === 'boe')).toBe(true);
  });
});

describe('chunkText', () => {
  it('returns no chunks for empty input', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('  \n\n  ')).toEqual([]);
  });

  it('returns one chunk if text is short', () => {
    const text = 'Esto es un párrafo corto sobre IVA pero suficiente para superar el mínimo de cien caracteres del chunker. La idea es que un texto breve quede como un solo chunk.';
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.content).toBe(text);
    expect(chunks[0]!.index).toBe(0);
    expect(chunks[0]!.estimatedTokens).toBeGreaterThan(0);
  });

  it('splits long text into multiple chunks with overlap', () => {
    const para = 'Artículo del manual práctico de IVA. '.repeat(80); // ~3000 chars
    const chunks = chunkText(para + '\n\n' + para, { targetChars: 1500, overlapChars: 100 });
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    for (const c of chunks) {
      expect(c.content.length).toBeLessThanOrEqual(2000); // some slack from overlap
    }
  });

  it('keeps paragraph structure when target is generous', () => {
    const text = ['Párrafo uno sobre IVA y deducción del 50 por ciento.', 'Párrafo dos sobre IRPF y retenciones del 15 por ciento aplicables a profesionales en estimación directa.', 'Párrafo tres sobre VERIFACTU y la obligación desde 2026 para sistemas informáticos de facturación.'].join('\n\n');
    const chunks = chunkText(text, { targetChars: 5000 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.content).toMatch(/IVA[\s\S]+IRPF[\s\S]+VERIFACTU/);
  });

  it('detects a short first line as title', () => {
    const text = 'Artículo 96. Exclusiones del derecho a deducir.\n\nNo podrán ser objeto de deducción, en ninguna proporción, las cuotas soportadas por adquisiciones o importaciones de bienes o servicios destinadas a atenciones a clientes, asalariados o a terceras personas.';
    const chunks = chunkText(text);
    expect(chunks[0]!.title).toBe('Artículo 96. Exclusiones del derecho a deducir.');
  });

  it('discards trailing remainder below MIN_CHUNK_CHARS', () => {
    const big = 'X'.repeat(1500);
    const tail = 'corto';
    const chunks = chunkText(`${big}\n\n${tail}`, { targetChars: 1500, overlapChars: 100 });
    // Tail is too short on its own — but overlap from previous chunk
    // may still produce a second chunk. The invariant we assert: every
    // emitted chunk respects MIN_CHUNK_CHARS.
    for (const c of chunks) {
      expect(c.content.length).toBeGreaterThanOrEqual(100);
    }
  });

  it('handles oversized single sentence by hard-splitting', () => {
    const huge = 'a'.repeat(8000);
    const chunks = chunkText(huge, { targetChars: 1500, overlapChars: 100 });
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });
});

describe('SQL builders', () => {
  describe('buildCorpusWhereClause', () => {
    it('always filters by embedding IS NOT NULL', () => {
      const out = buildCorpusWhereClause({});
      expect(out.whereClause).toMatch(/embedding IS NOT NULL/);
      expect(out.nextParamIndex).toBe(2);
    });

    it('adds source_type filter when provided', () => {
      const out = buildCorpusWhereClause({ sourceTypes: ['boe', 'informa'] });
      expect(out.whereClause).toMatch(/source_type = ANY\(\$2::text\[\]\)/);
      expect(out.nextParamIndex).toBe(3);
    });
  });

  describe('buildSearchCorpusSQL', () => {
    it('exposes cosine similarity, orders by distance ASC, limits via dynamic param', () => {
      const sql = buildSearchCorpusSQL({});
      expect(sql).toMatch(/1 - \(embedding <=> \$1::vector\) \/ 2 AS similarity/);
      expect(sql).toMatch(/ORDER BY embedding <=> \$1::vector ASC/);
      expect(sql).toMatch(/LIMIT \$2::int/);
    });

    it('shifts LIMIT param when filtering by source_type', () => {
      const sql = buildSearchCorpusSQL({ sourceTypes: ['boe'] });
      expect(sql).toMatch(/LIMIT \$3::int/);
      expect(sql).toMatch(/source_type = ANY\(\$2::text\[\]\)/);
    });

    it('selects citation-friendly columns', () => {
      const sql = buildSearchCorpusSQL({});
      expect(sql).toMatch(/source_url\s+AS "sourceUrl"/);
      expect(sql).toMatch(/article_ref\s+AS "articleRef"/);
      expect(sql).toMatch(/ingested_at\s+AS "ingestedAt"/);
    });
  });

  it('UPSERT_CHUNK_SQL uses ON CONFLICT (source_id, chunk_index)', () => {
    expect(UPSERT_CHUNK_SQL).toMatch(/INSERT INTO isaak_aeat_corpus/);
    expect(UPSERT_CHUNK_SQL).toMatch(/ON CONFLICT \(source_id, chunk_index\)/);
    expect(UPSERT_CHUNK_SQL).toMatch(/embedding\s*=\s*EXCLUDED\.embedding/);
    expect(UPSERT_CHUNK_SQL).toMatch(/RETURNING id/);
  });

  it('COUNT_BY_SOURCE_SQL groups by source_id and source_type', () => {
    expect(COUNT_BY_SOURCE_SQL).toMatch(/GROUP BY source_id, source_type/);
    expect(COUNT_BY_SOURCE_SQL).toMatch(/MAX\(ingested_at\)/);
  });

  it('DELETE_BY_SOURCE_SQL targets a single source_id', () => {
    expect(DELETE_BY_SOURCE_SQL).toMatch(/DELETE FROM isaak_aeat_corpus/);
    expect(DELETE_BY_SOURCE_SQL).toMatch(/WHERE source_id = \$1/);
  });
});
