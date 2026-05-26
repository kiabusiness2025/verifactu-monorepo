'use client';

// C-B5 — UI dedicada del 347 (anual operaciones con terceros > €3005.06).

import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  CheckCircle2,
  FileText,
  Loader2,
  Send,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import type {
  Modelo347Linea,
  Modelo347Result,
} from '@/app/lib/isaak-modelo-347-ledger';

type DraftResponse = {
  ok: boolean;
  output:
    | { skipped: true; reason: string; ejercicio: number }
    | { skipped: false; result: Modelo347Result };
  taxReturnId?: string | null;
  persistedAsDraft?: boolean;
  error?: string;
};

type SubmitResponse = {
  ok: boolean;
  submissionId?: string;
  taxReturnId?: string;
  payloadHash?: string;
  ejercicio?: number;
  lineasClientes?: number;
  lineasProveedores?: number;
  totalDeclarado?: number;
  error?: string;
  message?: string;
};

const CURRENT_YEAR = new Date().getFullYear();
// 347 se presenta en el año siguiente al ejercicio (entre 1-29 feb)
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 1 - i);

function eur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export default function Modelo347LedgerPage() {
  const [ejercicio, setEjercicio] = useState(CURRENT_YEAR - 1);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [draft, setDraft] = useState<DraftResponse | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function computeDraft(persist: boolean) {
    setLoadingDraft(true);
    setError(null);
    setSubmitResult(null);
    try {
      const res = await fetch('/api/isaak/modelos/347/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ejercicio, persist }),
      });
      const json = (await res.json()) as DraftResponse & { message?: string };
      if (!res.ok || !json.ok) {
        setError(json.message ?? json.error ?? 'No se pudo calcular el borrador.');
        setDraft(null);
        return;
      }
      setDraft(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión.');
    } finally {
      setLoadingDraft(false);
    }
  }

  async function submitDraft() {
    if (
      !confirm(
        `¿Confirmas presentar el modelo 347 del ejercicio ${ejercicio}? Esta acción crea un registro inmutable.`,
      )
    ) {
      return;
    }
    setLoadingSubmit(true);
    setError(null);
    try {
      const res = await fetch('/api/isaak/modelos/347/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ejercicio }),
      });
      const json = (await res.json()) as SubmitResponse;
      if (!res.ok || !json.ok) {
        setError(json.message ?? json.error ?? 'No se pudo registrar la presentación.');
        return;
      }
      setSubmitResult(json);
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión.');
    } finally {
      setLoadingSubmit(false);
    }
  }

  const result = draft && !draft.output.skipped ? draft.output.result : null;
  const isDraftPersisted = draft?.persistedAsDraft === true;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link
          href="/fiscal/modelos"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={12} /> Volver a Modelos
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">
          Modelo 347 — Operaciones con Terceros (Anual)
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Declaración informativa anual. Lista por contraparte cuya suma anual de operaciones (sin
          IVA) supere los <strong>€3.005,06</strong>. Excluye operaciones intracom (van al 349) y
          operaciones con retención.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Ejercicio a declarar</label>
            <select
              value={ejercicio}
              onChange={(e) => setEjercicio(Number(e.target.value))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => computeDraft(false)}
            disabled={loadingDraft || loadingSubmit}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loadingDraft ? <Loader2 size={15} className="animate-spin" /> : <Calculator size={15} />}
            Calcular
          </button>
          <button
            type="button"
            onClick={() => computeDraft(true)}
            disabled={loadingDraft || loadingSubmit}
            className="flex items-center gap-2 rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
          >
            {loadingDraft ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
            Guardar borrador
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex gap-2 items-start text-sm text-red-700">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {submitResult?.ok && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5 space-y-2">
          <div className="flex gap-2 items-center text-green-800">
            <CheckCircle2 size={18} />
            <p className="font-semibold text-sm">
              Modelo 347 ejercicio {submitResult.ejercicio} registrado como presentado
            </p>
          </div>
          <p className="text-xs text-green-700">
            Submission id:{' '}
            <code className="rounded bg-white/60 px-1">{submitResult.submissionId}</code>
          </p>
          <p className="text-xs text-green-700">
            {submitResult.lineasClientes} clientes + {submitResult.lineasProveedores} proveedores ·
            Total declarado: <strong>{eur(submitResult.totalDeclarado ?? 0)}</strong>
          </p>
        </div>
      )}

      {result && (
        <div className="space-y-5">
          {result.advertencias.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-1">
              {result.advertencias.map((w, i) => (
                <div key={i} className="flex gap-2 text-sm text-amber-800">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <Summary
              label="Clientes declarados"
              value={String(result.lineasClientes.length)}
              detalle={eur(result.totalDeclaradoClientes)}
            />
            <Summary
              label="Proveedores declarados"
              value={String(result.lineasProveedores.length)}
              detalle={eur(result.totalDeclaradoProveedores)}
            />
            <Summary
              label="Excluidos por umbral"
              value={String(result.contrapartesExcluidasPorUmbral)}
              detalle={`≤ ${eur(result.umbral)} anuales`}
            />
          </div>

          <TablaLineas titulo="Clientes" lineas={result.lineasClientes} />
          <TablaLineas titulo="Proveedores" lineas={result.lineasProveedores} />

          {isDraftPersisted &&
            (result.lineasClientes.length > 0 || result.lineasProveedores.length > 0) && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 space-y-3">
                <p className="text-sm text-blue-900">
                  Borrador guardado. Confirma para registrar en el audit-log.
                </p>
                <button
                  type="button"
                  onClick={submitDraft}
                  disabled={loadingSubmit}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {loadingSubmit ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Send size={15} />
                  )}
                  Confirmar y registrar como presentado
                </button>
              </div>
            )}
        </div>
      )}
    </div>
  );
}

function Summary({ label, value, detalle }: { label: string; value: string; detalle?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-900 mt-1">{value}</p>
      {detalle && <p className="text-xs text-slate-500 mt-0.5">{detalle}</p>}
    </div>
  );
}

function TablaLineas({ titulo, lineas }: { titulo: string; lineas: Modelo347Linea[] }) {
  if (lineas.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{titulo}</p>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs">
            <tr>
              <th className="text-left px-3 py-2">NIF</th>
              <th className="text-left px-3 py-2">Nombre</th>
              <th className="text-right px-3 py-2">T1</th>
              <th className="text-right px-3 py-2">T2</th>
              <th className="text-right px-3 py-2">T3</th>
              <th className="text-right px-3 py-2">T4</th>
              <th className="text-right px-3 py-2 font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((l, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-3 py-2 font-mono text-xs">{l.nif}</td>
                <td className="px-3 py-2 text-slate-700">{l.nombre || '—'}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {l.trimestres.T1 > 0 ? eur(l.trimestres.T1) : '—'}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {l.trimestres.T2 > 0 ? eur(l.trimestres.T2) : '—'}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {l.trimestres.T3 > 0 ? eur(l.trimestres.T3) : '—'}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {l.trimestres.T4 > 0 ? eur(l.trimestres.T4) : '—'}
                </td>
                <td className="px-3 py-2 text-right font-mono font-bold">{eur(l.totalAnual)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
