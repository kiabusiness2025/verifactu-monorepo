'use client';

/**
 * /connectors/isaak-tests
 *
 * Test runner para el copiloto Isaak Admin.
 *
 * Modo Live:    ejecuta cada pregunta contra la API real (Claude + BD).
 *              Muestra tools llamadas, keywords encontradas y la respuesta.
 *              Botón "Guardar fixture" descarga el JSON para commitear al repo.
 *
 * Modo Fixture: carga los JSON de e2e/fixtures/isaak/, re-ejecuta las mismas
 *              preguntas contra la API real y compara: tools llamadas + keywords.
 *              No depende del texto exacto → estable en CI aunque la respuesta varíe.
 */

import { adminPost } from '@/lib/adminApi';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type TopRated = {
  question: string;
  response: string;
  rating: string;
  count: number;
};

// ─── Tipos ───────────────────────────────────────────────────────────────────

type TestCase = {
  id: string;
  label: string;
  question: string;
  expected_tools: string[];
  expected_keywords: string[];
};

type SmokeResult = {
  question: string;
  tools_called: string[];
  tool_results: Record<string, unknown>;
  response_text: string;
  latency_ms: number;
  ok: boolean;
  error?: string;
  checks: {
    tools_match: boolean | null;
    keywords_found: string[];
    keywords_missing: string[];
  };
  recorded_at: string;
};

type IsaakFixture = TestCase & {
  recorded_at: string | null;
  recorded_response: string | null;
  recorded_tool_results: Record<string, unknown> | null;
};

type RunState = 'idle' | 'running' | 'done' | 'error';

type CaseRun = {
  state: RunState;
  result?: SmokeResult;
};

// ─── Casos predeterminados (siempre disponibles en modo Live) ─────────────────

const DEFAULT_CASES: TestCase[] = [
  {
    id: 'activity-stats',
    label: 'Estadísticas de actividad',
    question: '¿Cuántos tenants activos hay esta semana y cuántas queries se han hecho hoy?',
    expected_tools: ['get_activity_stats'],
    expected_keywords: ['tenant', 'activ'],
  },
  {
    id: 'dormant-tenants',
    label: 'Tenants dormidos (14 días)',
    question: '¿Qué tenants llevan más de 14 días sin usar el conector Holded?',
    expected_tools: ['list_dormant_tenants'],
    expected_keywords: ['tenant', 'días'],
  },
  {
    id: 'connector-errors',
    label: 'Conectores con error',
    question: '¿Hay conectores con error o revocados ahora mismo?',
    expected_tools: ['get_connector_errors'],
    expected_keywords: ['conector', 'error'],
  },
  {
    id: 'system-overview',
    label: 'Resumen completo del sistema',
    question: 'Dame un resumen del estado del sistema: actividad, tenants dormidos y errores.',
    expected_tools: ['get_activity_stats', 'list_dormant_tenants', 'get_connector_errors'],
    expected_keywords: ['tenant', 'conector'],
  },
  {
    id: 'anomaly-detection',
    label: 'Detección de anomalías',
    question: '¿Ves alguna anomalía o algo que requiera atención urgente ahora mismo?',
    expected_tools: ['get_activity_stats', 'get_connector_errors'],
    expected_keywords: ['atención', 'conector'],
  },
  {
    id: 'modelo-303',
    label: 'Modelo 303 estimado (requiere tenant real)',
    question:
      'Genera el resumen del Modelo 303 del trimestre actual para el tenant 00000000-0000-0000-0000-000000000001.',
    expected_tools: ['get_tenant_modelo_303'],
    expected_keywords: ['303', 'IVA', 'casilla'],
  },
  {
    id: 'fiscal-analysis',
    label: 'Análisis fiscal trimestral (requiere tenant real)',
    question:
      'Analiza la situación fiscal del trimestre actual del tenant 00000000-0000-0000-0000-000000000001. ¿Cuánto IVA tiene a pagar?',
    expected_tools: ['get_tenant_fiscal_analysis'],
    expected_keywords: ['IVA', 'trimestre'],
  },
  {
    id: 'unbooked-alerts',
    label: 'Alertas documentos pendientes (requiere tenant real)',
    question:
      'Muéstrame las facturas sin contabilizar y documentos pendientes del tenant 00000000-0000-0000-0000-000000000001.',
    expected_tools: ['get_tenant_unbooked_alerts'],
    expected_keywords: ['pendiente', 'factura'],
  },
  {
    id: 'period-comparison',
    label: 'Comparativa mensual (requiere tenant real)',
    question:
      'Compara los ingresos y gastos de este mes vs el mes pasado del tenant 00000000-0000-0000-0000-000000000001.',
    expected_tools: ['get_tenant_period_comparison'],
    expected_keywords: ['ingreso', 'mes'],
  },
];

// ─── Helpers de UI ────────────────────────────────────────────────────────────

function pass(ok: boolean | null) {
  if (ok === null) return null;
  return ok ? (
    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
      PASS
    </span>
  ) : (
    <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
      FAIL
    </span>
  );
}

function ToolBadge({ name, called }: { name: string; called: boolean | null }) {
  const color =
    called === null
      ? 'border-slate-200 bg-slate-50 text-slate-500'
      : called
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-rose-200 bg-rose-50 text-rose-600';
  return (
    <span className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] ${color}`}>{name}</span>
  );
}

function downloadFixture(tc: TestCase, result: SmokeResult) {
  const fixture: IsaakFixture = {
    ...tc,
    recorded_at: result.recorded_at,
    recorded_response: result.response_text,
    recorded_tool_results: result.tool_results,
  };
  const blob = new Blob([JSON.stringify(fixture, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tc.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function overallPass(result: SmokeResult): boolean {
  if (!result.ok) return false;
  const { tools_match, keywords_missing } = result.checks;
  if (tools_match === false) return false;
  if (keywords_missing.length > 0) return false;
  return true;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function IsaakTestsPage() {
  const [mode, setMode] = useState<'live' | 'fixtures'>('live');
  const [cases, setCases] = useState<TestCase[]>(DEFAULT_CASES);
  const [runs, setRuns] = useState<Record<string, CaseRun>>({});
  const [globalState, setGlobalState] = useState<'idle' | 'running' | 'done'>('idle');
  const [fixturesLoaded, setFixturesLoaded] = useState(false);
  const [topRated, setTopRated] = useState<TopRated[]>([]);

  useEffect(() => {
    void fetch('/api/admin/isaak/feedback', { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { top_rated?: TopRated[] }) => {
        if (d.top_rated) setTopRated(d.top_rated);
      })
      .catch(() => null);
  }, []);

  // Cargar fixtures cuando se cambia a ese modo
  useEffect(() => {
    if (mode !== 'fixtures' || fixturesLoaded) return;
    void fetch('/api/admin/isaak/smoke/fixtures', { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { fixtures?: IsaakFixture[] }) => {
        if (d.fixtures && d.fixtures.length > 0) {
          setCases(d.fixtures);
        }
        setFixturesLoaded(true);
      })
      .catch(() => setFixturesLoaded(true));
  }, [mode, fixturesLoaded]);

  const runOne = useCallback(async (tc: TestCase) => {
    setRuns((prev) => ({ ...prev, [tc.id]: { state: 'running' } }));
    try {
      const result = await adminPost<SmokeResult>('/api/admin/isaak/smoke', {
        question: tc.question,
        expected_tools: tc.expected_tools,
        expected_keywords: tc.expected_keywords,
      });
      setRuns((prev) => ({ ...prev, [tc.id]: { state: 'done', result } }));
    } catch (e) {
      setRuns((prev) => ({
        ...prev,
        [tc.id]: {
          state: 'error',
          result: {
            question: tc.question,
            tools_called: [],
            tool_results: {},
            response_text: '',
            latency_ms: 0,
            ok: false,
            error: e instanceof Error ? e.message : 'Error desconocido',
            checks: {
              tools_match: null,
              keywords_found: [],
              keywords_missing: tc.expected_keywords,
            },
            recorded_at: new Date().toISOString(),
          },
        },
      }));
    }
  }, []);

  const runAll = useCallback(async () => {
    setGlobalState('running');
    setRuns({});
    for (const tc of cases) {
      await runOne(tc);
    }
    setGlobalState('done');
  }, [cases, runOne]);

  const doneCount = Object.values(runs).filter(
    (r) => r.state === 'done' || r.state === 'error'
  ).length;
  const passCount = Object.values(runs).filter(
    (r) => r.state === 'done' && r.result && overallPass(r.result)
  ).length;
  const failCount = doneCount - passCount;

  return (
    <main className="space-y-5 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/connectors" className="hover:text-slate-700">
              Conectores
            </Link>
            <span>/</span>
            <span className="text-slate-700">Isaak Tests</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Isaak — Smoke Tests</h1>
          <p className="mt-1 text-sm text-slate-500">
            Verifica que el copiloto llama las herramientas correctas y responde con contenido
            relevante.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Mode toggle */}
          <div className="flex rounded-lg border border-slate-200 bg-white text-sm font-medium overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setMode('live');
                setCases(DEFAULT_CASES);
                setRuns({});
                setGlobalState('idle');
              }}
              className={`px-3 py-1.5 transition ${mode === 'live' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Live
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('fixtures');
                setRuns({});
                setGlobalState('idle');
              }}
              className={`px-3 py-1.5 transition ${mode === 'fixtures' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Fixtures
            </button>
          </div>

          <button
            type="button"
            onClick={runAll}
            disabled={globalState === 'running'}
            className="flex items-center gap-2 rounded-lg bg-[#2361d8] px-4 py-2 text-sm font-medium text-white shadow-soft hover:bg-[#1a4db8] disabled:opacity-60"
          >
            {globalState === 'running' ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Ejecutando…
              </>
            ) : (
              `Ejecutar ${cases.length} tests`
            )}
          </button>
        </div>
      </div>

      {/* Mode description */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        {mode === 'live' ? (
          <>
            <span className="font-semibold text-slate-800">Modo Live:</span> llama a Claude API + BD
            en tiempo real. Después de ejecutar, descarga el JSON de cada test para guardarlo como
            fixture en <code className="rounded bg-slate-200 px-1">e2e/fixtures/isaak/</code> y
            commitear al repo.
          </>
        ) : (
          <>
            <span className="font-semibold text-slate-800">Modo Fixtures:</span> carga las preguntas
            guardadas en <code className="rounded bg-slate-200 px-1">e2e/fixtures/isaak/</code>, las
            re-ejecuta contra la API real y verifica que las{' '}
            <span className="font-medium">herramientas</span> y{' '}
            <span className="font-medium">keywords</span> esperadas estén presentes. Sin comparar
            texto exacto → estable aunque la respuesta varíe.
          </>
        )}
      </div>

      {/* Summary bar */}
      {doneCount > 0 && (
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-soft">
          <div className="text-sm text-slate-500">
            {doneCount}/{cases.length} ejecutados
          </div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {passCount} PASS
          </div>
          {failCount > 0 && (
            <div className="flex items-center gap-1.5 text-sm font-semibold text-rose-700">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              {failCount} FAIL
            </div>
          )}
          {globalState === 'done' && failCount === 0 && (
            <span className="ml-auto rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              Todos OK ✓
            </span>
          )}
        </div>
      )}

      {/* Test cards */}
      <div className="space-y-3">
        {cases.map((tc) => {
          const run = runs[tc.id];
          const result = run?.result;
          const isRunning = run?.state === 'running';
          const isDone = run?.state === 'done' || run?.state === 'error';
          const passed = result ? overallPass(result) : null;

          return (
            <div
              key={tc.id}
              className={`rounded-2xl border bg-white shadow-soft transition ${
                isDone && passed === false
                  ? 'border-rose-200'
                  : isDone && passed === true
                    ? 'border-emerald-200'
                    : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800">{tc.label}</span>
                    {isDone && pass(passed)}
                    {result?.latency_ms != null && (
                      <span className="text-[10px] text-slate-400">{result.latency_ms} ms</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{tc.question}</p>

                  {/* Expected tools */}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                      Tools esperadas:
                    </span>
                    {tc.expected_tools.map((t) => {
                      const wasCalled = result ? result.tools_called.includes(t) : null;
                      return <ToolBadge key={t} name={t} called={wasCalled} />;
                    })}
                    {/* Tools llamadas extra (no esperadas) */}
                    {result &&
                      result.tools_called
                        .filter((t) => !tc.expected_tools.includes(t))
                        .map((t) => (
                          <span
                            key={t}
                            className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-mono text-[10px] text-amber-700"
                            title="Tool no esperada"
                          >
                            {t} ⚠
                          </span>
                        ))}
                  </div>

                  {/* Keywords */}
                  {tc.expected_keywords.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                        Keywords:
                      </span>
                      {tc.expected_keywords.map((kw) => {
                        const found = result ? result.checks.keywords_found.includes(kw) : null;
                        const color =
                          found === null
                            ? 'border-slate-200 bg-slate-50 text-slate-500'
                            : found
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-rose-200 bg-rose-50 text-rose-600';
                        return (
                          <span
                            key={kw}
                            className={`rounded-md border px-1.5 py-0.5 text-[10px] ${color}`}
                          >
                            {kw}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex shrink-0 items-center gap-2">
                  {isDone && result && mode === 'live' && (
                    <button
                      type="button"
                      onClick={() => downloadFixture(tc, result)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      title="Descargar fixture JSON"
                    >
                      💾 Guardar fixture
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void runOne(tc)}
                    disabled={isRunning || globalState === 'running'}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {isRunning ? (
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                    ) : (
                      '▶ Run'
                    )}
                  </button>
                </div>
              </div>

              {/* Response preview */}
              {result && (
                <div
                  className={`border-t px-4 py-3 ${
                    passed === false
                      ? 'border-rose-100 bg-rose-50/40'
                      : 'border-slate-100 bg-slate-50/50'
                  }`}
                >
                  {result.error ? (
                    <p className="text-xs font-medium text-rose-700">{result.error}</p>
                  ) : (
                    <>
                      <p className="line-clamp-3 text-xs text-slate-600">{result.response_text}</p>
                      {result.checks.keywords_missing.length > 0 && (
                        <p className="mt-1 text-[10px] text-rose-600">
                          Keywords no encontradas:{' '}
                          {result.checks.keywords_missing.map((k) => `"${k}"`).join(', ')}
                        </p>
                      )}
                      {result.checks.tools_match === false && (
                        <p className="mt-1 text-[10px] text-rose-600">
                          Tools llamadas:{' '}
                          {result.tools_called.length > 0
                            ? result.tools_called.join(', ')
                            : '(ninguna)'}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Fixture mode: no fixtures loaded */}
      {mode === 'fixtures' && fixturesLoaded && cases.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="text-sm font-medium text-slate-600">Sin fixtures todavía</p>
          <p className="mt-1 text-xs text-slate-400">
            Ejecuta en modo Live, descarga los JSON y guárdalos en{' '}
            <code>apps/admin/e2e/fixtures/isaak/</code>
          </p>
          <button
            type="button"
            onClick={() => {
              setMode('live');
              setCases(DEFAULT_CASES);
              setRuns({});
              setGlobalState('idle');
            }}
            className="mt-4 rounded-lg bg-[#2361d8] px-5 py-2 text-sm font-medium text-white hover:bg-[#1a4db8]"
          >
            Ir a modo Live
          </button>
        </div>
      )}

      {/* Top-rated responses (G2) */}
      {topRated.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-800">
            Respuestas mejor valoradas
            <span className="ml-2 text-xs font-normal text-slate-400">(thumbs up del dock)</span>
          </h2>
          {topRated.map((item, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white shadow-soft">
              <div className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-700">{item.question}</p>
                  <p className="mt-1 line-clamp-3 text-xs text-slate-500">{item.response}</p>
                </div>
                <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                  👍 {item.count}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400">
        Fixtures en{' '}
        <code className="rounded bg-slate-100 px-1">apps/admin/e2e/fixtures/isaak/</code> ·{' '}
        <Link href="/connectors/smoke-tests" className="underline hover:text-slate-600">
          Smoke tests Holded API
        </Link>{' '}
        ·{' '}
        <Link href="/connectors/claude-smoke-tests" className="underline hover:text-slate-600">
          Smoke tests Claude
        </Link>
      </p>
    </main>
  );
}
