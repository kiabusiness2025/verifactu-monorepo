'use client';

// C-B2 — UI dedicada del 130 con flujo Robot Contable.

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
import type { Modelo130Result, Trimestre } from '@/app/lib/fiscal-models';
import { DownloadFichero } from '../_components/DownloadFichero';

type DraftResponse = {
  ok: boolean;
  output:
    | { skipped: true; reason: string; ejercicio: number; periodo: Trimestre }
    | { skipped: false; result: Modelo130Result };
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
  '1T': '1.er trimestre (acum. ene–mar)',
  '2T': '2.º trimestre (acum. ene–jun)',
  '3T': '3.er trimestre (acum. ene–sep)',
  '4T': '4.º trimestre (acum. ene–dic)',
};

function eur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export default function Modelo130LedgerPage() {
  const [ejercicio, setEjercicio] = useState(CURRENT_YEAR);
  const [periodo, setPeriodo] = useState<Trimestre>('1T');
  const [retenciones, setRetenciones] = useState('');
  const [pagosPrevios, setPagosPrevios] = useState('');
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
      const res = await fetch('/api/isaak/modelos/130/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ejercicio,
          periodo,
          retencionesAcumuladas: retenciones ? Number(retenciones) : undefined,
          ingresosACuenta: pagosPrevios ? Number(pagosPrevios) : undefined,
          persist,
        }),
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
        `¿Confirmas presentar el modelo 130 ${periodo} ${ejercicio}? Esta acción creará un registro inmutable en el audit-log.`,
      )
    ) {
      return;
    }
    setLoadingSubmit(true);
    setError(null);
    try {
      const res = await fetch('/api/isaak/modelos/130/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ejercicio,
          periodo,
          retencionesAcumuladas: retenciones ? Number(retenciones) : undefined,
          ingresosACuenta: pagosPrevios ? Number(pagosPrevios) : undefined,
        }),
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
          Modelo 130 — Robot Contable
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Pago fraccionado IRPF para autónomos en estimación directa. Cálculo acumulado del año
          desde el Isaak Ledger. Confirma para registrar como inmutable en el audit-log.
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
        </div>
        <div className="grid sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Retenciones acumuladas (€)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={retenciones}
              onChange={(e) => setRetenciones(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              IRPF retenido en facturas profesionales (15%) o agrarias (2%).
            </p>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Pagos fraccionados previos (€)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={pagosPrevios}
              onChange={(e) => setPagosPrevios(e.target.value)}
              placeholder="Auto-detección del Ledger si se omite"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              130 ingresados en trimestres anteriores del mismo año.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
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
            <p className="font-semibold">No procede presentar 130 para este tenant</p>
            <p className="text-xs mt-1">
              Motivo: <code className="rounded bg-white/60 px-1">{skippedReason}</code>
              {skippedReason === 'no_aplica_no_autonomo' && (
                <span className="block mt-1">
                  Si eres sociedad (SL/SA), el modelo correspondiente es el 202, no el 130.
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {submitResult?.ok && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5 space-y-2">
          <div className="flex gap-2 items-center text-green-800">
            <CheckCircle2 size={18} />
            <p className="font-semibold text-sm">
              Modelo 130 {submitResult.periodo} {submitResult.ejercicio} registrado como presentado
            </p>
          </div>
          <p className="text-xs text-green-700">
            Submission id:{' '}
            <code className="rounded bg-white/60 px-1">{submitResult.submissionId}</code>
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

          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-1">
            <Row
              label={`Ingresos íntegros acumulados (1 ene → fin ${result.periodo})`}
              value={eur(result.ingresosAcumulados)}
            />
            <Row label="Gastos deducibles acumulados" value={eur(result.gastosAcumulados)} />
            <Row label="Rendimiento neto" value={eur(result.rendimientoNeto)} highlight />
            <Row label="Cuota previa (20% del rendimiento)" value={eur(result.cuotaPrevia)} />
            <Row
              label="Retenciones acumuladas (−)"
              value={eur(result.retencionesAcumuladas)}
            />
            <Row label="Pagos fraccionados previos (−)" value={eur(result.ingresosACuenta)} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col items-center gap-3">
            <p className="text-sm text-slate-500">Resultado a ingresar</p>
            <ResultBadge value={result.resultado} />
          </div>

          {isDraftPersisted ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 space-y-3">
                <p className="text-sm text-blue-900">
                  Borrador guardado como <code>IsaakTaxReturn (status=draft)</code>. Al confirmar la
                  presentación, se creará un registro inmutable en el audit-log
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
                  El envío real a AEAT (SOAP mTLS) se hará en una iteración posterior.
                </p>
              </div>
              <DownloadFichero modelo="130" body={{ ejercicio, periodo, retencionesAcumuladas: retenciones ? Number(retenciones) : undefined, ingresosACuenta: pagosPrevios ? Number(pagosPrevios) : undefined }} />
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

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`flex justify-between py-2 border-b border-slate-100 text-sm ${highlight ? 'font-semibold' : ''}`}
    >
      <span className="text-slate-600">{label}</span>
      <span className={highlight ? 'text-slate-900 text-base' : 'text-slate-800 font-mono'}>
        {value}
      </span>
    </div>
  );
}

function ResultBadge({ value }: { value: number }) {
  const color =
    value > 0
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-slate-50 text-slate-700 border-slate-200';
  const label = value > 0 ? 'A ingresar' : 'Resultado cero';
  return (
    <div className={`inline-flex flex-col items-center rounded-xl border px-6 py-3 ${color}`}>
      <span className="text-xs font-medium opacity-70">{label}</span>
      <span className="text-2xl font-bold">{eur(value)}</span>
    </div>
  );
}
