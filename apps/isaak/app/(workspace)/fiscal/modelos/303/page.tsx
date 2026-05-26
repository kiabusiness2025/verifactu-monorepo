'use client';

// C-B1.b — UI dedicada del 303 con flujo Robot Contable.
//
// Diferencia con /fiscal/modelos (tab 303 legacy):
//   * Fuente: Isaak Ledger (no Holded directo)
//   * Persiste borrador como IsaakTaxReturn (status=draft)
//   * Botón "Confirmar y registrar como presentado" → crea
//     IsaakAeatSubmission (audit-log) y promueve el draft a 'presented'

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
import type { Modelo303Result, Trimestre } from '@/app/lib/fiscal-models';

type DraftResponse = {
  ok: boolean;
  output:
    | { skipped: true; reason: string; ejercicio: number; periodo: Trimestre }
    | { skipped: false; result: Modelo303Result };
  taxReturnId?: string | null;
  persistedAsDraft?: boolean;
  error?: string;
};

type SubmitResponse = {
  ok: boolean;
  submissionId?: string;
  taxReturnId?: string;
  payloadHash?: string;
  resultado?: number;
  ejercicio?: number;
  periodo?: Trimestre;
  error?: string;
  message?: string;
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);
const TRIMESTRES: Trimestre[] = ['1T', '2T', '3T', '4T'];
const TRIMESTRE_LABEL: Record<Trimestre, string> = {
  '1T': '1.er trimestre (ene–mar)',
  '2T': '2.º trimestre (abr–jun)',
  '3T': '3.er trimestre (jul–sep)',
  '4T': '4.º trimestre (oct–dic)',
};

function eur(n: number) {
  return (
    n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
  );
}

export default function Modelo303LedgerPage() {
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
      const res = await fetch('/api/isaak/modelos/303/draft', {
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
    if (!confirm(`¿Confirmas presentar el modelo 303 ${periodo} ${ejercicio}? Esta acción creará un registro inmutable en el audit-log.`)) {
      return;
    }
    setLoadingSubmit(true);
    setError(null);
    try {
      const res = await fetch('/api/isaak/modelos/303/submit', {
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

  const hasResult = draft && !draft.output.skipped;
  const skippedReason = draft && draft.output.skipped ? draft.output.reason : null;
  const result = hasResult && !draft.output.skipped ? draft.output.result : null;
  const isDraftPersisted = draft?.persistedAsDraft === true;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link
          href="/fiscal/modelos"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={12} /> Volver a Modelos
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">
          Modelo 303 — Robot Contable
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Borrador computado desde el Isaak Ledger (fuente de verdad contable). Confirma para
          registrar la presentación como inmutable en el audit-log.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap gap-3">
          <select
            value={ejercicio}
            onChange={(e) => setEjercicio(Number(e.target.value))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
            title="Ejercicio fiscal"
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
                {TRIMESTRE_LABEL[t]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => computeDraft(false)}
            disabled={loadingDraft || loadingSubmit}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loadingDraft ? <Loader2 size={15} className="animate-spin" /> : <Calculator size={15} />}
            Calcular (sin guardar)
          </button>
          <button
            type="button"
            onClick={() => computeDraft(true)}
            disabled={loadingDraft || loadingSubmit}
            className="flex items-center gap-2 rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
          >
            {loadingDraft ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
            Calcular y guardar borrador
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex gap-2 items-start text-sm text-red-700">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {skippedReason && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex gap-3 items-start">
          <AlertTriangle size={18} className="shrink-0 text-amber-500 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold">No procede presentar 303 para este tenant</p>
            <p className="text-xs mt-1">
              Motivo: <code className="rounded bg-white/60 px-1">{skippedReason}</code>
            </p>
          </div>
        </div>
      )}

      {submitResult?.ok && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5 space-y-2">
          <div className="flex gap-2 items-center text-green-800">
            <CheckCircle2 size={18} />
            <p className="font-semibold text-sm">
              Modelo 303 {submitResult.periodo} {submitResult.ejercicio} registrado como presentado
            </p>
          </div>
          <p className="text-xs text-green-700">
            Submission id: <code className="rounded bg-white/60 px-1">{submitResult.submissionId}</code>
          </p>
          <p className="text-xs text-green-700">
            Payload hash:{' '}
            <code className="rounded bg-white/60 px-1 font-mono text-[10px]">
              {submitResult.payloadHash}
            </code>
          </p>
          <p className="text-xs text-green-700">
            Resultado: <strong>{eur(submitResult.resultado ?? 0)}</strong>
          </p>
          <p className="text-xs text-green-600/80 mt-2">
            El envío SOAP a AEAT con certificado mTLS se hará en una iteración posterior (C-B1.c).
            El audit-log queda inmutable y ya consta como presentado en tu libro fiscal.
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

          <div className="grid md:grid-cols-2 gap-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                IVA repercutido (ventas)
              </p>
              {result.repercutido.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="text-slate-500 text-xs">
                    <tr>
                      <th className="text-left">Tipo</th>
                      <th className="text-right">Base</th>
                      <th className="text-right">Cuota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.repercutido.map((t) => (
                      <tr key={t.tipo} className="border-t border-slate-100">
                        <td className="py-1 font-medium">{t.tipo}%</td>
                        <td className="py-1 text-right font-mono">{eur(t.base)}</td>
                        <td className="py-1 text-right font-mono">{eur(t.cuota)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-slate-400 italic">Sin ventas en el periodo.</p>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-semibold">
                <span>Total devengado</span>
                <span className="font-mono">{eur(result.totalDevengado)}</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                IVA soportado (compras)
              </p>
              {result.soportado.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="text-slate-500 text-xs">
                    <tr>
                      <th className="text-left">Tipo</th>
                      <th className="text-right">Base</th>
                      <th className="text-right">Cuota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.soportado.map((t) => (
                      <tr key={t.tipo} className="border-t border-slate-100">
                        <td className="py-1 font-medium">{t.tipo}%</td>
                        <td className="py-1 text-right font-mono">{eur(t.base)}</td>
                        <td className="py-1 text-right font-mono">{eur(t.cuota)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-slate-400 italic">Sin compras en el periodo.</p>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-semibold">
                <span>Total soportado deducible</span>
                <span className="font-mono">{eur(result.totalSoportado)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col items-center gap-3">
            <p className="text-sm text-slate-500">
              Resultado liquidación ({result.facturas} facturas · {result.compras} compras)
            </p>
            {(() => {
              const v = result.resultado;
              const color =
                v > 0
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : v < 0
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200';
              const label = v > 0 ? 'A ingresar' : v < 0 ? 'A devolver' : 'Resultado cero';
              return (
                <div className={`inline-flex flex-col items-center rounded-xl border px-6 py-3 ${color}`}>
                  <span className="text-xs font-medium opacity-70">{label}</span>
                  <span className="text-2xl font-bold">{eur(Math.abs(v))}</span>
                </div>
              );
            })()}
          </div>

          {isDraftPersisted ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 space-y-3">
                <p className="text-sm text-blue-900">
                  Borrador guardado en tu libro fiscal como <code>IsaakTaxReturn (status=draft)</code>.
                  Cuando confirmes la presentación, se creará un registro inmutable en el audit-log
                  (<code>IsaakAeatSubmission</code>) y el borrador pasará a estado{' '}
                  <code>presented</code>.
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
                <p className="text-xs text-blue-700/80">
                  El envío real a AEAT (SOAP mTLS) se hará en una iteración posterior. De momento
                  esto solo registra la presentación en el audit-log interno.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2">
                <p className="text-sm font-semibold text-slate-800">
                  Descargar fichero AEAT (.303 BOE)
                </p>
                <p className="text-xs text-slate-500">
                  Genera el fichero en formato oficial AEAT (ISO-8859-15, 2024-10) para subirlo
                  manualmente a la sede electrónica vía &quot;Presentación por fichero&quot;.
                </p>
                <a
                  href={`/api/isaak/modelos/303/export`}
                  onClick={async (e) => {
                    e.preventDefault();
                    const res = await fetch('/api/isaak/modelos/303/export', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ ejercicio, periodo }),
                    });
                    if (!res.ok) {
                      const txt = await res.text();
                      setError(`Export falló: ${txt}`);
                      return;
                    }
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download =
                      res.headers
                        .get('Content-Disposition')
                        ?.match(/filename="([^"]+)"/)?.[1] ?? '303.txt';
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <FileText size={15} />
                  Descargar .303
                </a>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center">
              Para poder presentar este borrador, vuelve a calcular con la opción "Calcular y
              guardar borrador".
            </p>
          )}
        </div>
      )}
    </div>
  );
}
