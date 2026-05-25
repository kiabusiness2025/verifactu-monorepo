import {
  canonicalJson,
  classifyNotificationSeverity,
  diffCensusSnapshots,
  hashCensusSnapshot,
  partitionNewVsKnown,
} from '../aeat-sede-diff';

describe('canonicalJson', () => {
  it('sorts object keys alphabetically for stability', () => {
    const a = canonicalJson({ b: 1, a: 2, c: 3 });
    const b = canonicalJson({ c: 3, a: 2, b: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":2,"b":1,"c":3}');
  });

  it('handles arrays and nested objects', () => {
    expect(canonicalJson({ x: [1, 2, { y: 'z' }] })).toBe('{"x":[1,2,{"y":"z"}]}');
  });

  it('handles null/undefined consistently', () => {
    expect(canonicalJson(null)).toBe('null');
    expect(canonicalJson(undefined)).toBe('null');
  });
});

describe('hashCensusSnapshot', () => {
  it('produces identical 64-char hex for equal data regardless of key order', () => {
    const h1 = hashCensusSnapshot({ b: 1, a: 2 });
    const h2 = hashCensusSnapshot({ a: 2, b: 1 });
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces different hashes for different content', () => {
    expect(hashCensusSnapshot({ a: 1 })).not.toBe(hashCensusSnapshot({ a: 2 }));
  });
});

describe('diffCensusSnapshots', () => {
  it('returns no changes when snapshots are identical', () => {
    const data = { nombre: 'Acme SL', domicilioFiscal: 'C/ Mayor 1' };
    expect(diffCensusSnapshots(data, data)).toEqual([]);
  });

  it('detects modified field (domicilio fiscal)', () => {
    const prev = { domicilioFiscal: 'C/ Mayor 1' };
    const curr = { domicilioFiscal: 'C/ Real 5' };
    const out = diffCensusSnapshots(prev, curr);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      field: 'domicilioFiscal',
      changeType: 'modified',
      oldValue: 'C/ Mayor 1',
      newValue: 'C/ Real 5',
    });
  });

  it('detects added field (IAE epígrafe nuevo)', () => {
    const prev = { nombre: 'Acme SL' };
    const curr = { nombre: 'Acme SL', iaeEpigrafe: '843.9' };
    const out = diffCensusSnapshots(prev, curr);
    expect(out).toEqual([
      { field: 'iaeEpigrafe', changeType: 'added', oldValue: null, newValue: '843.9' },
    ]);
  });

  it('detects removed field (fechaBaja apareció)', () => {
    const prev = { fechaBaja: '2026-04-01' };
    const curr = {};
    const out = diffCensusSnapshots(prev, curr);
    expect(out).toEqual([
      { field: 'fechaBaja', changeType: 'removed', oldValue: '2026-04-01', newValue: null },
    ]);
  });

  it('detects obligaciones añadidas y eliminadas', () => {
    const prev = { obligaciones: ['303', '111', '115'] };
    const curr = { obligaciones: ['303', '111', '349'] }; // se cae 115, entra 349
    const out = diffCensusSnapshots(prev, curr);
    const fields = out.map((c) => `${c.changeType}:${c.newValue ?? c.oldValue}`).sort();
    expect(fields).toEqual(['added:349', 'removed:115']);
  });

  it('handles null/undefined previous snapshot (first capture)', () => {
    const curr = { nombre: 'Acme SL', iaeEpigrafe: '843.9' };
    const out = diffCensusSnapshots(null, curr);
    expect(out).toHaveLength(2);
    expect(out.every((c) => c.changeType === 'added')).toBe(true);
  });

  it('ignores fields not in TRACKED_FIELDS', () => {
    const out = diffCensusSnapshots({ randomThing: 'A' }, { randomThing: 'B' });
    expect(out).toEqual([]);
  });
});

describe('partitionNewVsKnown', () => {
  const pulled = [
    { id: 'AEAT-001', title: 'A' },
    { id: 'AEAT-002', title: 'B' },
    { id: 'AEAT-003', title: 'C' },
  ];

  it('separates fresh from already-known by external id', () => {
    const known = new Set(['AEAT-001', 'AEAT-003']);
    const out = partitionNewVsKnown(pulled, known);
    expect(out.fresh.map((n) => n.id)).toEqual(['AEAT-002']);
    expect(out.alreadyKnown.map((n) => n.id)).toEqual(['AEAT-001', 'AEAT-003']);
  });

  it('returns all as fresh when known set is empty', () => {
    const out = partitionNewVsKnown(pulled, new Set());
    expect(out.fresh).toHaveLength(3);
    expect(out.alreadyKnown).toEqual([]);
  });

  it('returns all as known when all ids match', () => {
    const known = new Set(['AEAT-001', 'AEAT-002', 'AEAT-003']);
    const out = partitionNewVsKnown(pulled, known);
    expect(out.fresh).toEqual([]);
    expect(out.alreadyKnown).toHaveLength(3);
  });
});

describe('classifyNotificationSeverity', () => {
  it('marks requerimientos/sanciones as critical', () => {
    expect(classifyNotificationSeverity({ id: '1', title: 'Requerimiento información IVA', tipo: '' })).toBe('critical');
    expect(classifyNotificationSeverity({ id: '2', title: 'Propuesta de liquidación 303' })).toBe('critical');
    expect(classifyNotificationSeverity({ id: '3', title: 'Sanción' })).toBe('critical');
    expect(classifyNotificationSeverity({ id: '4', title: 'Providencia de apremio' })).toBe('critical');
  });

  it('marks liquidaciones/diligencias sin embargo como high', () => {
    expect(classifyNotificationSeverity({ id: '5', title: 'Liquidación provisional' })).toBe('high');
    expect(classifyNotificationSeverity({ id: '6', title: 'Diligencia de actuación inspectora' })).toBe('high');
    expect(classifyNotificationSeverity({ id: '7', title: 'Trámite de audiencia' })).toBe('high');
  });

  it('marca embargo (sea diligencia o no) como critical', () => {
    // El embargo es la palabra-clave más crítica: aunque venga dentro
    // de una "diligencia de embargo", la severidad correcta es critical.
    expect(classifyNotificationSeverity({ id: '6b', title: 'Diligencia de embargo previa' })).toBe('critical');
  });

  it('marks general communications as normal', () => {
    expect(classifyNotificationSeverity({ id: '8', title: 'Comunicación informativa', tipo: 'comunicacion' })).toBe('normal');
    expect(classifyNotificationSeverity({ id: '9', title: 'Recordatorio plazo modelo 347' })).toBe('normal');
  });

  it('handles accented and lowercase keywords (acento-insensitive)', () => {
    expect(classifyNotificationSeverity({ id: '10', title: 'Sanción tributaria firme' })).toBe('critical');
    expect(classifyNotificationSeverity({ id: '11', title: 'SANCION' })).toBe('critical');
  });
});
