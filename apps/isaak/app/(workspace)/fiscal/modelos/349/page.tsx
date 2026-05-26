'use client';

// C-B4 — UI dedicada del 349 (operaciones intracom).

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
import type { Trimestre } from '@/app/lib/fiscal-models';
import type { Modelo349Result } from '@/app/lib/isaak-modelo-349-ledger';
import { DownloadFichero } from '../_components/DownloadFichero';

type DraftResponse = {
  ok: boolean;
  output:
    | { skipped: true; reason: string; ejercicio: number; periodo: Trimestre }
    | { skipped: false; result: Modelo349Result };
  taxReturnId?: string | null;
  persistedAsDraft?: boolean;
  error?: string;
};

type SubmitResponse = {
  ok: boolean;
  submissionId?: string;
  taxReturnId?: string;
  payloadHash?: string;
  totalEntregas?: number;
  totalAdquisiciones?: number;
  ejercicio?: number;
  periodo?: Trimestre;
  error?: string;
  message?: string;
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);
const TRIMESTRES: Trimestre[] = ['1T', '2T', '3T', '4T'];

const CLAVE_LABEL: Record<'E' | 'A' | 'S' | 'I', string> = {
  E: 'Entregas (bienes)',
  A: 'Adquisiciones (bienes)',
  S: 'Servicios prestados',
  I: 'Servicios recibidos',
};

function eur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export default function Modelo349LedgerPage() {
  const [ejercicio, setEjercicio] = useState(CURRENT_YEAR);
  const [periodo, setPeriodo] = useState<Trimestre>('1T');
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
      const res = await fetch('/api/isaak/modelos/349/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ejercicio, periodo, persist }),
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
    if (!confirm(`¿Confirmas presentar el modelo 349 ${periodo} ${ejercicio}?`)) return;
    setLoadingSubmit(true);
    setError(null);
    try {
      const res = await fetch('/api/isaak/modelos/349/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ejercicio, periodo }),
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
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link
          href="/fiscal/modelos"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={12} /> Volver a Modelos
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">
          Modelo 349 — Operaciones Intracomunitarias
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Resumen recapitulativo de operaciones con la UE. Trimestral (o mensual si superas €50k).
          Detección automática de operaciones intra (NIF con prefijo país ≠ ES, IVA 0%).
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap gap-3">
          <select
            value={ejercicio}
            onChange={(e) => setEjercicio(Number(e.target.value))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
            title="Ejercicio"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as Trimestre)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
            title="Trimestre"
          >
            {TRIMESTRES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-3">
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
              Modelo 349 {submitResult.periodo} {submitResult.ejercicio} registrado como presentado
            </p>
          </div>
          <p className="text-xs text-green-700">
            Submission id:{' '}
            <code className="rounded bg-white/60 px-1">{submitResult.submissionId}</code>
          </p>
          <p className="text-xs text-green-700">
            Total entregas: <strong>{eur(submitResult.totalEntregas ?? 0)}</strong> · Total
            adquisiciones: <strong>{eur(submitResult.totalAdquisiciones ?? 0)}</strong>
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

          <div className="grid grid-cols-2 gap-3">
            <Summary label="Total entregas (E+S)" value={eur(result.totalEntregas)} />
            <Summary label="Total adquisiciones (A+I)" value={eur(result.totalAdquisiciones)} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs">
                <tr>
                  <th className="text-left px-3 py-2">Clave</th>
                  <th className="text-left px-3 py-2">NIF-IVA</th>
                  <th className="text-left px-3 py-2">Contraparte</th>
                  <th className="text-right px-3 py-2">Ops.</th>
                  <th className="text-right px-3 py-2">Importe</th>
                </tr>
              </thead>
              <tbody>
                {result.lineas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-slate-400 italic">
                      Sin operaciones intracomunitarias en el periodo.
                    </td>
                  </tr>
                ) : (
                  result.lineas.map((l, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-mono">
                        <span
                          className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold"
                          title={CLAVE_LABEL[l.clave]}
                        >
                          {l.clave}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{l.nifIva}</td>
                      <td className="px-3 py-2 text-slate-700">{l.nombre || '—'}</td>
                      <td className="px-3 py-2 text-right text-slate-500">{l.operaciones}</td>
                      <td className="px-3 py-2 text-right font-mono">{eur(l.importe)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {isDraftPersisted && result.lineas.length > 0 && (
            <div className="space-y-3">
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
                  {loadingSubmit ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  Confirmar y registrar como presentado
                </button>
              </div>
              <DownloadFichero modelo="349" body={{ ejercicio, periodo }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}
