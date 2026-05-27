'use client';

// F13 — Admin panel del corpus AEAT.
//
// Solo accesible para usuarios en ADMIN_EMAILS. Muestra el estado de
// las 14 fuentes (manuales AEAT, BOE, INFORMA, sede FAQs) con conteo
// de chunks ingestados, fecha del último update, y permite disparar
// reingestion manual de fuentes específicas o todo el corpus.

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  ExternalLink,
  Loader2,
  RefreshCw,
} from 'lucide-react';

type Source = {
  id: string;
  type: string;
  name: string;
  url: string;
  tags: string[];
  chunkCount: number;
  lastIngestedAt: string | null;
  status: 'ingested' | 'missing';
};

type StatsResponse = {
  ok: boolean;
  sources?: Source[];
  totals?: {
    sources: number;
    ingested: number;
    missing: number;
    chunks: number;
  };
  error?: string;
  message?: string;
};

const TYPE_LABEL: Record<string, string> = {
  manual_aeat: 'Manual AEAT',
  boe: 'BOE consolidado',
  informa: 'INFORMA DGT',
  sede_faq: 'Sede FAQ',
  doctrina_dgt: 'Doctrina DGT',
};

const TYPE_COLOR: Record<string, string> = {
  manual_aeat: 'bg-violet-50 text-violet-700 border-violet-200',
  boe: 'bg-blue-50 text-blue-700 border-blue-200',
  informa: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  sede_faq: 'bg-amber-50 text-amber-700 border-amber-200',
  doctrina_dgt: 'bg-pink-50 text-pink-700 border-pink-200',
};

function relativeTime(iso: string | null): string {
  if (!iso) return 'nunca';
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 30) return `hace ${days} días`;
  if (days < 365) return `hace ${Math.floor(days / 30)} meses`;
  return `hace ${Math.floor(days / 365)} años`;
}

export default function CorpusAdminPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [reingestingId, setReingestingId] = useState<string | null>(null);
  const [reingestingAll, setReingestingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchStats() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/isaak/sede/corpus/stats');
      const json = (await res.json()) as StatsResponse;
      if (!res.ok || !json.ok) {
        setError(json.message ?? json.error ?? 'No se pudo cargar el estado del corpus.');
      }
      setStats(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchStats();
  }, []);

  async function reingest(sourceId?: string) {
    if (sourceId) {
      setReingestingId(sourceId);
    } else {
      setReingestingAll(true);
    }
    try {
      const res = await fetch('/api/isaak/sede/corpus/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sourceId ? { sourceId, replaceAll: true } : { replaceAll: true }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(`Error: ${json.message ?? json.error}`);
      } else {
        alert(
          `Reingesta completada. Procesadas ${json.processed ?? '?'} fuentes, ${json.chunks ?? '?'} chunks.`,
        );
        await fetchStats();
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'unknown'}`);
    } finally {
      setReingestingId(null);
      setReingestingAll(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
          <Database size={20} className="text-violet-500" />
          Corpus AEAT — Admin
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Estado de las fuentes BOE/AEAT/INFORMA que alimentan el RAG del Inspector. El
          cron trimestral las refresca automáticamente; aquí puedes disparar reingestas
          manuales.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex gap-2 items-start text-sm text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !stats && (
        <div className="text-center py-12 text-slate-500">
          <Loader2 size={24} className="animate-spin inline" />
          <p className="text-sm mt-2">Cargando estado del corpus...</p>
        </div>
      )}

      {stats?.ok && stats.totals && (
        <>
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Fuentes totales" value={String(stats.totals.sources)} />
            <StatCard label="Ingestadas" value={String(stats.totals.ingested)} color="green" />
            <StatCard
              label="Sin ingestar"
              value={String(stats.totals.missing)}
              color={stats.totals.missing > 0 ? 'red' : 'slate'}
            />
            <StatCard label="Total chunks" value={stats.totals.chunks.toLocaleString('es-ES')} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Reingestar todo el corpus
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Equivalente al cron trimestral. Sustituye chunks de cada fuente. ~10-30 min
                según conexión y tamaño.
              </p>
            </div>
            <button
              type="button"
              onClick={() => reingest()}
              disabled={reingestingAll || reingestingId !== null}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 text-white px-4 py-2 text-sm font-semibold hover:bg-violet-700 disabled:opacity-50"
            >
              {reingestingAll ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <RefreshCw size={15} />
              )}
              Reingestar todo
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs">
                <tr>
                  <th className="text-left px-3 py-2">Tipo</th>
                  <th className="text-left px-3 py-2">Fuente</th>
                  <th className="text-right px-3 py-2">Chunks</th>
                  <th className="text-left px-3 py-2">Última ingesta</th>
                  <th className="text-right px-3 py-2">Acción</th>
                </tr>
              </thead>
              <tbody>
                {stats.sources?.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block rounded border px-2 py-0.5 text-[10px] font-medium ${TYPE_COLOR[s.type] ?? 'bg-slate-50 text-slate-700 border-slate-200'}`}
                      >
                        {TYPE_LABEL[s.type] ?? s.type}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <p className="text-slate-800 font-medium">{s.name}</p>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-500 hover:text-violet-600 inline-flex items-center gap-1"
                      >
                        {s.id} <ExternalLink size={10} />
                      </a>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {s.chunkCount.toLocaleString('es-ES')}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {s.status === 'ingested' ? (
                        <span className="inline-flex items-center gap-1 text-green-700">
                          <CheckCircle2 size={11} /> {relativeTime(s.lastIngestedAt)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600">
                          <AlertCircle size={11} /> nunca
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => reingest(s.id)}
                        disabled={reingestingId !== null || reingestingAll}
                        className="text-xs rounded border border-slate-300 px-2 py-1 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {reingestingId === s.id ? (
                          <Loader2 size={11} className="animate-spin inline" />
                        ) : (
                          'Reingestar'
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-400">
            Cron automático: <code>0 4 1 1,4,7,10 *</code> (4 AM del día 1 de ene, abr, jul,
            oct).
          </p>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color = 'slate',
}: {
  label: string;
  value: string;
  color?: 'slate' | 'green' | 'red';
}) {
  const colorClass =
    color === 'green'
      ? 'text-green-700'
      : color === 'red'
        ? 'text-red-700'
        : 'text-slate-900';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colorClass}`}>{value}</p>
    </div>
  );
}
