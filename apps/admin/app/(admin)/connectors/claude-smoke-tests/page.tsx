'use client';

import { adminPost } from '@/lib/adminApi';
import Link from 'next/link';
import { useCallback, useState } from 'react';

const ROUTINE_URL = 'https://claude.ai/code/routines/trig_014Tu48jx7ndzn7q7Av9NAUG';

type CheckResult = {
  name: string;
  category: 'server' | 'holded';
  ok: boolean;
  status: number;
  message: string;
};

type SmokeTestResponse = {
  results: CheckResult[];
  summary: { passed: number; failed: number; total: number };
  runAt: string;
};

const CHECK_LABELS: Record<string, { module: string; op: string }> = {
  'server.health': { module: 'Servidor', op: 'health' },
  'server.oauth_discovery': { module: 'Servidor', op: 'oauth discovery' },
  'server.resource_metadata': { module: 'Servidor', op: 'resource metadata' },
  'server.mcp_rejects_unauth': { module: 'Servidor', op: 'mcp 401' },
  'server.favicon': { module: 'Servidor', op: 'favicon.ico' },
  'server.logo': { module: 'Servidor', op: 'logo.png' },
  'holded.contacts': { module: 'Contactos', op: 'list' },
  'holded.invoices': { module: 'Facturas', op: 'list' },
  'holded.products': { module: 'Productos', op: 'list' },
  'holded.warehouses': { module: 'Almacenes', op: 'list' },
  'holded.taxes': { module: 'Impuestos', op: 'list' },
  'holded.numbering_invoice': { module: 'Numeración F', op: 'list' },
  'holded.numbering_estimate': { module: 'Numeración P', op: 'list' },
  'holded.treasury': { module: 'Tesorería', op: 'list' },
  'holded.crm_funnels': { module: 'CRM Embudos', op: 'list' },
  'holded.crm_leads': { module: 'CRM Leads', op: 'list' },
  'holded.projects': { module: 'Proyectos', op: 'list' },
  'holded.chart_of_accounts': { module: 'Plan Cuentas', op: 'list' },
  'holded.daily_ledger': { module: 'Libro Diario', op: 'list' },
  'holded.employees': { module: 'Empleados', op: 'list' },
};

function labelOf(name: string) {
  return CHECK_LABELS[name] ?? { module: name, op: 'check' };
}

function formatRunAt(iso: string) {
  try {
    return new Date(iso).toLocaleString('es-ES', {
      timeZone: 'Europe/Madrid',
      dateStyle: 'short',
      timeStyle: 'medium',
    });
  } catch {
    return iso;
  }
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-2xl border px-5 py-4 shadow-soft ${color}`}>
      <p className="text-xs font-semibold uppercase tracking-widest opacity-60">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export default function ClaudeSmokeTestsPage() {
  const [data, setData] = useState<SmokeTestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminPost<SmokeTestResponse>('/api/admin/claude-smoke-tests', {});
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al ejecutar los tests');
    } finally {
      setLoading(false);
    }
  }, []);

  const { passed = 0, failed = 0, total = 0 } = data?.summary ?? {};
  const allPassed = total > 0 && failed === 0;

  const serverResults = data?.results.filter((r) => r.category === 'server') ?? [];
  const holdedResults = data?.results.filter((r) => r.category === 'holded') ?? [];

  return (
    <main className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/admin/connectors/overview" className="hover:text-slate-700">
              Conectores
            </Link>
            <span>/</span>
            <span className="text-slate-700">Claude — Smoke Tests</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Conector Claude — Health Checks
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {total > 0
              ? `${total} checks verificados · última ejecución ${formatRunAt(data!.runAt)}`
              : '6 checks de infraestructura + 13 endpoints Holded usados por el conector Claude'}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/admin/connectors/smoke-tests"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-soft hover:bg-slate-50"
          >
            Tests ChatGPT →
          </Link>
          <a
            href={ROUTINE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-soft hover:bg-slate-50"
          >
            Rutina diaria →
          </a>
          <button
            type="button"
            onClick={runTests}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-soft hover:bg-amber-600 disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Ejecutando…
              </>
            ) : (
              'Ejecutar ahora'
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Summary */}
      {total > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <SummaryCard
            label="Pasados"
            value={passed}
            color="border-emerald-200 bg-emerald-50 text-emerald-800"
          />
          <SummaryCard
            label="Fallidos"
            value={failed}
            color={
              failed > 0
                ? 'border-rose-200 bg-rose-50 text-rose-800'
                : 'border-slate-200 bg-white text-slate-700'
            }
          />
          <SummaryCard
            label="Total"
            value={total}
            color="border-slate-200 bg-white text-slate-900"
          />
        </div>
      )}

      {/* Results */}
      {data && (
        <div className="space-y-4">
          {/* Servidor */}
          <ResultsTable
            title="Infraestructura del servidor"
            subtitle="claude.verifactu.business"
            results={serverResults}
            allPassed={allPassed && serverResults.every((r) => r.ok)}
            categoryColor="amber"
          />

          {/* Holded API */}
          <ResultsTable
            title="Holded API"
            subtitle="Endpoints usados por el conector Claude"
            results={holdedResults}
            allPassed={allPassed && holdedResults.every((r) => r.ok)}
            categoryColor="blue"
          />
        </div>
      )}

      {/* Empty state */}
      {!data && !loading && !error && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="text-sm font-medium text-slate-600">Sin resultados todavía</p>
          <p className="mt-1 text-xs text-slate-400">
            Pulsa «Ejecutar ahora» para lanzar los checks del conector Claude.
          </p>
          <button
            type="button"
            onClick={runTests}
            className="mt-4 rounded-lg bg-amber-500 px-5 py-2 text-sm font-medium text-white hover:bg-amber-600"
          >
            Ejecutar ahora
          </button>
        </div>
      )}

      <p className="text-xs text-slate-400">
        Checks read-only · timeout 8s por endpoint · rutina automática lunes–viernes a las 9:00 ·{' '}
        <a
          href={ROUTINE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-600"
        >
          ver en Claude Routines
        </a>
      </p>
    </main>
  );
}

function ResultsTable({
  title,
  subtitle,
  results,
  allPassed,
  categoryColor,
}: {
  title: string;
  subtitle: string;
  results: CheckResult[];
  allPassed: boolean;
  categoryColor: 'amber' | 'blue';
}) {
  if (results.length === 0) return null;

  const borderColor = categoryColor === 'amber' ? 'border-amber-100' : 'border-blue-100';
  const headerBg = categoryColor === 'amber' ? 'bg-amber-50' : 'bg-blue-50';
  const headerText = categoryColor === 'amber' ? 'text-amber-800' : 'text-blue-800';

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
      <div
        className={`flex items-center justify-between border-b ${borderColor} px-4 py-3 ${headerBg}`}
      >
        <div>
          <h2 className={`text-sm font-semibold ${headerText}`}>{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        {allPassed && (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            Todos OK
          </span>
        )}
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="px-4 py-2 text-left font-semibold text-slate-500">Módulo</th>
            <th className="px-4 py-2 text-left font-semibold text-slate-500">Check</th>
            <th className="px-4 py-2 text-left font-semibold text-slate-500">Estado</th>
            <th className="px-4 py-2 text-left font-semibold text-slate-500">Resultado</th>
            <th className="px-4 py-2 text-left font-semibold text-slate-500">Mensaje</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => {
            const { module, op } = labelOf(r.name);
            return (
              <tr
                key={r.name}
                className={`border-b border-slate-100 last:border-0 ${r.ok ? '' : 'bg-rose-50'}`}
              >
                <td className="px-4 py-2 font-medium text-slate-700">{module}</td>
                <td className="px-4 py-2 font-mono text-slate-500">{op}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                      r.status === 0
                        ? 'border-slate-200 bg-slate-50 text-slate-500'
                        : r.ok
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-rose-200 bg-rose-50 text-rose-700'
                    }`}
                  >
                    {r.status === 0 ? 'timeout' : r.status}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                      r.ok
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-rose-200 bg-rose-50 text-rose-700'
                    }`}
                  >
                    {r.ok ? 'PASS' : 'FAIL'}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-500">{r.message}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
