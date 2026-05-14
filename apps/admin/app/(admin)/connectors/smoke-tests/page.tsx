'use client';

/**
 * /admin/connectors/smoke-tests
 *
 * Visor de smoke tests de la API de Holded. Ejecuta ~22 checks read-only
 * contra los endpoints usados por las MCP tools y muestra el resultado
 * en tiempo real. Tambien enlaza con la rutina diaria programada en Claude.
 */

import { adminPost } from '@/lib/adminApi';
import Link from 'next/link';
import { useCallback, useState } from 'react';

const ROUTINE_URL = 'https://claude.ai/code/routines/trig_01J3j1P2g2R3iEypg9n47qhY';

type CheckResult = {
  name: string;
  ok: boolean;
  status: number;
  message: string;
};

type SmokeTestResponse = {
  results: CheckResult[];
  summary: { passed: number; failed: number; total: number };
  runAt: string;
};

const MODULE_LABELS: Record<string, string> = {
  invoices: 'Facturas',
  purchases: 'Compras',
  estimates: 'Presupuestos',
  salesorders: 'Pedidos',
  contacts: 'Contactos',
  contact_groups: 'Grupos',
  products: 'Productos',
  services: 'Servicios',
  treasury: 'Tesorería',
  payments: 'Pagos',
  warehouses: 'Almacenes',
  saleschannels: 'Canales',
  expense_accounts: 'Gastos',
  taxes: 'Impuestos',
  numbering_invoice: 'Numeración F',
  numbering_estimate: 'Numeración P',
  chart_of_accounts: 'Plan Cuentas',
  daily_ledger: 'Libro Diario',
  crm_funnels: 'CRM Embudos',
  crm_bookings: 'CRM Citas',
  projects: 'Proyectos',
  employees: 'Empleados',
};

function moduleName(name: string) {
  const key = name.replace(/\.list$/, '');
  return MODULE_LABELS[key] ?? key;
}

function operationLabel(name: string) {
  return name.split('.').slice(1).join('.') || 'list';
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
      <p className="text-xs font-semibold uppercase tracking-widest text-inherit opacity-60">
        {label}
      </p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export default function SmokeTestsPage() {
  const [data, setData] = useState<SmokeTestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminPost<SmokeTestResponse>('/api/admin/smoke-tests', {});
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al ejecutar los tests');
    } finally {
      setLoading(false);
    }
  }, []);

  const { passed = 0, failed = 0, total = 0 } = data?.summary ?? {};
  const allPassed = total > 0 && failed === 0;

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
            <span className="text-slate-700">Smoke Tests</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">API Holded — Health Checks</h1>
          <p className="mt-1 text-sm text-slate-500">
            {total > 0
              ? `${total} endpoints verificados · última ejecución ${formatRunAt(data!.runAt)}`
              : '22 endpoints de la API de Holded usados por las MCP tools'}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <a
            href={ROUTINE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-soft hover:bg-slate-50"
          >
            Ver rutina diaria →
          </a>
          <button
            onClick={runTests}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-[#2361d8] px-4 py-2 text-sm font-medium text-white shadow-soft hover:bg-[#1a4db8] disabled:opacity-60"
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

      {/* Summary cards */}
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

      {/* Results table */}
      {data && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-700">Resultados</h2>
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
                <th className="px-4 py-2 text-left font-semibold text-slate-500">Operación</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-500">Estado</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-500">Resultado</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-500">Mensaje</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((r) => (
                <tr
                  key={r.name}
                  className={`border-b border-slate-100 last:border-0 ${r.ok ? '' : 'bg-rose-50'}`}
                >
                  <td className="px-4 py-2 font-medium text-slate-700">{moduleName(r.name)}</td>
                  <td className="px-4 py-2 font-mono text-slate-500">{operationLabel(r.name)}</td>
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
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Empty state */}
      {!data && !loading && !error && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="text-sm font-medium text-slate-600">Sin resultados todavía</p>
          <p className="mt-1 text-xs text-slate-400">
            Pulsa «Ejecutar ahora» para lanzar los checks contra la API de Holded.
          </p>
          <button
            onClick={runTests}
            className="mt-4 rounded-lg bg-[#2361d8] px-5 py-2 text-sm font-medium text-white hover:bg-[#1a4db8]"
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
