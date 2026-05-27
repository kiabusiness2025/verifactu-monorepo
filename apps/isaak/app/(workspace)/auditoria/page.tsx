'use client';

import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
  Loader2,
  Play,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { ExcelDownloadButton } from '../components/ExcelDownloadButton';
import { buildInspectorQueryFromViolation } from '@/app/lib/inspector-query-builder';

type LegalBasis = { law: string; article: string; url?: string };
type Violation = {
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  citation: string;
  legalBasis?: LegalBasis[];
  recommendation?: string;
  suggestedAction?: string;
};
type AuditSnapshot = {
  periodFrom: string;
  periodTo: string;
  vatRepercutidoTotal: string;
  vatSoportadoTotal: string;
  retentionsToProfessionals: string;
  retentionsToLandlords: string;
  retentionsToEmployees: string;
  intracomOperationsCount: number;
  cashBalance: string;
  bankAccounts: Array<{
    account: string;
    balance: string;
    lastReconciliationDate: string | null;
  }>;
};
type AuditReport = {
  passed: boolean;
  errors: Violation[];
  warnings: Violation[];
  infos: Violation[];
  evaluatedRuleIds: string[];
  skippedByScope: string[];
};

type PeriodPreset = { label: string; from: () => string; to: () => string };

function thisYear() {
  return new Date().getUTCFullYear();
}
function pad(n: number) {
  return String(n).padStart(2, '0');
}

const PRESETS: PeriodPreset[] = [
  {
    label: 'Mes actual',
    from: () => {
      const d = new Date();
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-01`;
    },
    to: () => new Date().toISOString().slice(0, 10),
  },
  {
    label: 'Mes anterior',
    from: () => {
      const d = new Date();
      const prev = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
      return prev.toISOString().slice(0, 10);
    },
    to: () => {
      const d = new Date();
      const lastPrev = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 0));
      return lastPrev.toISOString().slice(0, 10);
    },
  },
  {
    label: `T1 ${thisYear()}`,
    from: () => `${thisYear()}-01-01`,
    to: () => `${thisYear()}-03-31`,
  },
  {
    label: `T2 ${thisYear()}`,
    from: () => `${thisYear()}-04-01`,
    to: () => `${thisYear()}-06-30`,
  },
  {
    label: `T3 ${thisYear()}`,
    from: () => `${thisYear()}-07-01`,
    to: () => `${thisYear()}-09-30`,
  },
  {
    label: `T4 ${thisYear()}`,
    from: () => `${thisYear()}-10-01`,
    to: () => `${thisYear()}-12-31`,
  },
  {
    label: `Año ${thisYear()}`,
    from: () => `${thisYear()}-01-01`,
    to: () => `${thisYear()}-12-31`,
  },
];

function formatEur(s: string): string {
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

type InspectorInlineResult = {
  answer: string;
  citations: Array<{
    index: number;
    articleRef: string | null;
    title: string | null;
    sourceUrl: string;
    snippet: string;
  }>;
};

function ViolationCard({ v }: { v: Violation }) {
  const palette = {
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', tag: 'bg-red-600' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', tag: 'bg-amber-500' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', tag: 'bg-blue-500' },
  }[v.severity];

  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InspectorInlineResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function askInspector() {
    setExpanded(true);
    if (result || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/isaak/inspector/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: buildInspectorQueryFromViolation(v) }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.message ?? json.error ?? 'Inspector no pudo responder.');
        return;
      }
      setResult({ answer: json.answer, citations: json.citations ?? [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`${palette.bg} ${palette.border} border rounded-lg p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`${palette.tag} text-white text-xs font-mono px-2 py-0.5 rounded`}>
              {v.ruleId}
            </span>
            <span className="text-xs text-slate-500">{v.category}</span>
          </div>
          <p className={`${palette.text} text-sm leading-snug`}>{v.message}</p>
          {v.recommendation && (
            <p className="text-sm text-slate-700 mt-2 italic">→ {v.recommendation}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1 text-xs">
            {v.legalBasis?.map((b, i) =>
              b.url ? (
                <a
                  key={i}
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 hover:border-blue-400"
                >
                  {b.article} {b.law}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span
                  key={i}
                  className="inline-flex items-center px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700"
                >
                  {b.article} {b.law}
                </span>
              ),
            )}
            {!v.legalBasis?.length && (
              <span className="text-slate-500">{v.citation}</span>
            )}
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={expanded ? () => setExpanded(false) : askInspector}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 hover:text-violet-900"
            >
              <Sparkles className="h-3 w-3" />
              {expanded ? (
                <>
                  Ocultar Inspector <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  Consultar al Inspector <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>
          </div>
          {expanded && (
            <div className="mt-3 bg-white border border-violet-200 rounded-lg p-3">
              {loading && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Inspector consultando corpus AEAT/BOE...
                </div>
              )}
              {error && (
                <div className="text-sm text-red-700 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
              {result && (
                <div className="space-y-3">
                  <div className="text-sm text-slate-700 whitespace-pre-wrap">
                    {result.answer}
                  </div>
                  {result.citations.length > 0 && (
                    <div className="border-t border-slate-200 pt-2">
                      <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                        <BookOpen className="h-3 w-3 inline mr-1" />
                        Fuentes
                      </p>
                      <ol className="space-y-1.5">
                        {result.citations.map((c) => (
                          <li key={c.index} className="text-xs text-slate-600">
                            <span className="font-mono font-bold text-violet-700">[{c.index}]</span>{' '}
                            <span className="font-semibold">
                              {c.articleRef ?? c.title ?? 'Fuente'}
                            </span>
                            <a
                              href={c.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-1 text-violet-600 hover:underline inline-flex items-center gap-0.5"
                            >
                              Ver BOE <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuditoriaPage() {
  const today = new Date();
  const initialQ =
    today.getUTCMonth() < 3
      ? 0
      : today.getUTCMonth() < 6
        ? 1
        : today.getUTCMonth() < 9
          ? 2
          : 3;
  const initialPreset = PRESETS[2 + initialQ];

  const [from, setFrom] = useState(initialPreset!.from());
  const [to, setTo] = useState(initialPreset!.to());
  const [label, setLabel] = useState(initialPreset!.label);
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<AuditSnapshot | null>(null);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (p: PeriodPreset) => {
    setFrom(p.from());
    setTo(p.to());
    setLabel(p.label);
    setReport(null);
    setSnapshot(null);
  };

  const runAudit = async () => {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch('/api/isaak/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodFrom: from, periodTo: to, scope: 'on_demand' }),
        credentials: 'include',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: 'unknown' }));
        throw new Error(j.message || j.error || `Error ${res.status}`);
      }
      const data = (await res.json()) as { snapshot: AuditSnapshot; report: AuditReport };
      setSnapshot(data.snapshot);
      setReport(data.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const errorCount = report?.errors.length ?? 0;
  const warningCount = report?.warnings.length ?? 0;
  const infoCount = report?.infos.length ?? 0;
  const statusColor = report?.passed
    ? 'text-emerald-600'
    : errorCount > 0
      ? 'text-red-600'
      : 'text-amber-600';
  const StatusIcon = report?.passed ? ShieldCheck : ShieldAlert;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <ShieldAlert className="h-7 w-7 text-blue-600" />
          <h1 className="text-2xl font-semibold text-slate-900">Auditoría Inspector AEAT</h1>
        </div>
        <p className="text-slate-600">
          45 reglas evaluadas sobre tu Isaak Ledger del periodo seleccionado. Cada violación cita
          la normativa aplicable y propone qué corregir.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 mb-6">
        <h2 className="font-medium text-slate-900 mb-3">Periodo a auditar</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                label === p.label
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-[140px]">
            <span className="text-xs text-slate-500 block mb-1">Desde</span>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setLabel('');
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </label>
          <label className="flex-1 min-w-[140px]">
            <span className="text-xs text-slate-500 block mb-1">Hasta</span>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setLabel('');
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </label>
          <button
            onClick={runAudit}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Auditando…
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Auditar
              </>
            )}
          </button>
        </div>
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
      </section>

      {report && snapshot && (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <StatusIcon className={`h-6 w-6 ${statusColor}`} />
                <h2 className="text-lg font-semibold text-slate-900">
                  {report.passed
                    ? 'Auditoría OK'
                    : `${errorCount} error${errorCount === 1 ? '' : 'es'} detectado${errorCount === 1 ? '' : 's'}`}
                </h2>
              </div>
              <div className="flex gap-3 text-sm">
                <span className="text-red-600">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  {errorCount} error{errorCount === 1 ? '' : 'es'}
                </span>
                <span className="text-amber-600">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  {warningCount} avisos
                </span>
                <span className="text-blue-600">
                  <Info className="h-4 w-4 inline mr-1" />
                  {infoCount} notas
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-slate-500 text-xs">IVA repercutido</div>
                <div className="font-semibold text-slate-900">
                  {formatEur(snapshot.vatRepercutidoTotal)}
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-slate-500 text-xs">IVA soportado</div>
                <div className="font-semibold text-slate-900">
                  {formatEur(snapshot.vatSoportadoTotal)}
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-slate-500 text-xs">Retenciones profesionales</div>
                <div className="font-semibold text-slate-900">
                  {formatEur(snapshot.retentionsToProfessionals)}
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-slate-500 text-xs">Operaciones intracom</div>
                <div className="font-semibold text-slate-900">
                  {snapshot.intracomOperationsCount}
                </div>
              </div>
            </div>
            {snapshot.bankAccounts.length > 0 && (
              <div className="mt-4">
                <div className="text-xs text-slate-500 mb-2">Cuentas bancarias</div>
                <ul className="space-y-1 text-sm">
                  {snapshot.bankAccounts.map((b) => (
                    <li key={b.account} className="flex items-center justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-700">{b.account}</span>
                      <span className="text-slate-500 text-xs">
                        {b.lastReconciliationDate
                          ? `Conciliada el ${b.lastReconciliationDate}`
                          : 'Sin conciliar'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {errorCount > 0 && (
            <section className="mb-6">
              <h3 className="text-base font-semibold text-red-700 mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" /> Errores ({errorCount})
              </h3>
              <div className="space-y-2">
                {report.errors.map((v, i) => <ViolationCard key={`${v.ruleId}-${i}`} v={v} />)}
              </div>
            </section>
          )}

          {warningCount > 0 && (
            <section className="mb-6">
              <h3 className="text-base font-semibold text-amber-700 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Avisos ({warningCount})
              </h3>
              <div className="space-y-2">
                {report.warnings.map((v, i) => <ViolationCard key={`${v.ruleId}-${i}`} v={v} />)}
              </div>
            </section>
          )}

          {infoCount > 0 && (
            <section className="mb-6">
              <h3 className="text-base font-semibold text-blue-700 mb-3 flex items-center gap-2">
                <Info className="h-5 w-5" /> Notas ({infoCount})
              </h3>
              <div className="space-y-2">
                {report.infos.map((v, i) => <ViolationCard key={`${v.ruleId}-${i}`} v={v} />)}
              </div>
            </section>
          )}

          {report.passed && warningCount === 0 && infoCount === 0 && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-center mb-6">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-2" />
              <p className="text-emerald-900 font-medium">
                Sin observaciones del Inspector para el periodo seleccionado.
              </p>
            </div>
          )}

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-semibold text-slate-900 mb-3">Descargar informes Excel</h3>
            <p className="text-sm text-slate-600 mb-4">
              Los datos están bloqueados (solo lectura). La columna de notas es la única editable.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ExcelDownloadButton reportType="libro_iva_emitidas" from={from} to={to} label={label || undefined} variant="card" />
              <ExcelDownloadButton reportType="libro_iva_recibidas" from={from} to={to} label={label || undefined} variant="card" />
              <ExcelDownloadButton reportType="libro_diario" from={from} to={to} label={label || undefined} variant="card" />
              <ExcelDownloadButton reportType="modelo_303" from={from} to={to} label={label || undefined} variant="card" />
            </div>
          </section>
        </>
      )}

      {!report && !loading && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <ShieldAlert className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">
            Selecciona un periodo y pulsa <b>Auditar</b> para que el Inspector revise tu contabilidad.
          </p>
        </div>
      )}
    </div>
  );
}
