'use client';

// C-B3 — UI dedicada del 111 (retenciones IRPF).

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
import type { Modelo111Result } from '@/app/lib/isaak-modelo-111-ledger';

type DraftResponse = {
  ok: boolean;
  output:
    | { skipped: true; reason: string; ejercicio: number; periodo: Trimestre }
    | { skipped: false; result: Modelo111Result };
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
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export default function Modelo111LedgerPage() {
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
      const res = await fetch('/api/isaak/modelos/111/draft', {
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
    if (!confirm(`¿Confirmas presentar el modelo 111 ${periodo} ${ejercicio}?`)) return;
    setLoadingSubmit(true);
    setError(null);
    try {
      const res = await fetch('/api/isaak/modelos/111/submit', {
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
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link
          href="/fiscal/modelos"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={12} /> Volver a Modelos
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">
          Modelo 111 — Robot Contable
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Retenciones IRPF practicadas a trabajadores y profesionales. Trimestral. Isaak detecta
          retenciones implícitas (bruto − líquido en nóminas, 15% en facturas profesionales).
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

      {submitResult?.ok && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5 space-y-2">
          <div className="flex gap-2 items-center text-green-800">
            <CheckCircle2 size={18} />
            <p className="font-semibold text-sm">
              Modelo 111 {submitResult.periodo} {submitResult.ejercicio} registrado como presentado
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
            Retenciones a ingresar: <strong>{eur(submitResult.resultado ?? 0)}</strong>
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
            <GrupoCard
              titulo="Trabajadores (nóminas)"
              perceptores={result.trabajadores.perceptores}
              bases={result.trabajadores.basesRetenciones}
              retenciones={result.trabajadores.importeRetenciones}
            />
            <GrupoCard
              titulo="Profesionales / otros"
              perceptores={result.profesionales.perceptores}
              bases={result.profesionales.basesRetenciones}
              retenciones={result.profesionales.importeRetenciones}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col items-center gap-3">
            <p className="text-sm text-slate-500">Total retenciones a ingresar</p>
            <div className="inline-flex flex-col items-center rounded-xl border border-red-200 bg-red-50 text-red-700 px-6 py-3">
              <span className="text-xs font-medium opacity-70">A ingresar</span>
              <span className="text-2xl font-bold">{eur(result.resultado)}</span>
            </div>
          </div>

          {isDraftPersisted ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 space-y-3">
              <p className="text-sm text-blue-900">
                Borrador guardado como <code>IsaakTaxReturn (status=draft)</code>. Confirma para
                registrar en el audit-log.
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
          ) : (
            <p className="text-xs text-slate-500 text-center">
              Para poder presentar, vuelve a calcular con "Calcular y guardar borrador".
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function GrupoCard({
  titulo,
  perceptores,
  bases,
  retenciones,
}: {
  titulo: string;
  perceptores: number;
  bases: number;
  retenciones: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</p>
      <Row label="Perceptores" value={String(perceptores)} />
      <Row label="Bases retención" value={eur(bases)} />
      <Row label="Importe retenciones" value={eur(retenciones)} highlight />
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`flex justify-between py-1.5 border-b border-slate-100 text-sm ${highlight ? 'font-semibold' : ''}`}
    >
      <span className="text-slate-600">{label}</span>
      <span className={highlight ? 'text-slate-900' : 'text-slate-800 font-mono'}>{value}</span>
    </div>
  );
}
