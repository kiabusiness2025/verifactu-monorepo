// V1.2 — Página dedicada del Asesor Legal de contratos.
//
// Dropzone para subir PDF → POST /api/isaak/legal/review-pdf → render del
// JSON estructurado (resumen, partes, riesgos, recomendaciones, etc.).
//
// El layout (workspace) ya valida sesión y aplica force-dynamic.
// La tool `isaak_review_contract` del chat sigue disponible para los que
// prefieran pegar el texto directamente en una conversación.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileText,
  Info,
  Loader2,
  Scale,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';

const CONTRACT_TYPE_OPTIONS = [
  { value: '', label: 'Detectar automáticamente' },
  { value: 'nda', label: 'NDA / Confidencialidad' },
  { value: 'servicios', label: 'Prestación de servicios' },
  { value: 'arrendamiento', label: 'Arrendamiento' },
  { value: 'compraventa', label: 'Compraventa' },
  { value: 'laboral', label: 'Laboral' },
  { value: 'licencia', label: 'Licencia / SaaS' },
  { value: 'distribucion', label: 'Distribución / Agencia' },
  { value: 'otro', label: 'Otro' },
];

type Risk = {
  severidad: 'alta' | 'media' | 'baja';
  clausula: string;
  riesgo: string;
  sugerencia: string;
  referenciaLegal?: string | null;
};

type ContractReview = {
  tipoDetectado: string;
  resumen: string;
  partes: { rol: string; identificacion: string }[];
  objetoPrincipal: string;
  duracion: string;
  riesgos: Risk[];
  clausulasFavorables: string[];
  recomendaciones: string[];
  proximosPasos: string[];
  disclaimer: string;
  model: string;
  latencyMs: number;
};

type ReviewResponse =
  | {
      ok: true;
      review: ContractReview;
      source: {
        filename: string;
        sizeKb: number;
        pages: number | null;
        textTruncated: boolean;
      };
    }
  | { ok: false; error: string; message: string };

const SEVERITY_META = {
  alta: { label: 'Riesgo alto', cls: 'border-rose-200 bg-rose-50 text-rose-900', dot: 'bg-rose-500' },
  media: {
    label: 'Riesgo medio',
    cls: 'border-amber-200 bg-amber-50 text-amber-900',
    dot: 'bg-amber-500',
  },
  baja: {
    label: 'Mejora menor',
    cls: 'border-sky-200 bg-sky-50 text-sky-900',
    dot: 'bg-sky-500',
  },
} as const;

export default function AsesorLegalPage() {
  const [file, setFile] = useState<File | null>(null);
  const [contractType, setContractType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewResponse | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePick = useCallback((picked: File | null) => {
    setError(null);
    setResult(null);
    if (!picked) return setFile(null);
    if (picked.type && picked.type !== 'application/pdf') {
      setError('Solo se aceptan archivos PDF.');
      return;
    }
    if (picked.size > 5 * 1024 * 1024) {
      setError('El PDF no puede superar 5 MB.');
      return;
    }
    setFile(picked);
  }, []);

  useEffect(() => {
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
    };
    const onDragOver = (e: DragEvent) => e.preventDefault();
    window.addEventListener('drop', onDrop);
    window.addEventListener('dragover', onDragOver);
    return () => {
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('dragover', onDragOver);
    };
  }, []);

  async function submit() {
    if (!file || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (contractType) fd.append('contractType', contractType);
      const res = await fetch('/api/isaak/legal/review-pdf', {
        method: 'POST',
        body: fd,
      });
      const data = (await res.json()) as ReviewResponse;
      if (!res.ok || !data.ok) {
        setError(
          data && 'message' in data && data.message
            ? data.message
            : `Error ${res.status}. Intenta de nuevo.`,
        );
        return;
      }
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red.');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setError(null);
    setContractType('');
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2361d8] text-white">
          <Scale className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Asesor legal de contratos</h1>
          <p className="text-sm text-slate-500">
            Sube un PDF (o pega el texto en el chat) y te devuelvo riesgos, sugerencias y próximos
            pasos. Orientativo — no sustituye a un abogado.
          </p>
        </div>
      </div>

      {/* Form */}
      {!result && (
        <div className="mt-6 space-y-4">
          <div
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const picked = e.dataTransfer.files?.[0] ?? null;
              handlePick(picked);
            }}
            onDragOver={(e) => e.preventDefault()}
            className={`rounded-3xl border-2 border-dashed p-10 text-center transition ${
              dragOver
                ? 'border-[#2361d8] bg-[#2361d8]/5'
                : file
                  ? 'border-emerald-300 bg-emerald-50/50'
                  : 'border-slate-200 bg-white'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => handlePick(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
                  <FileText className="h-6 w-6 text-emerald-700" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">{file.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {Math.round(file.size / 1024)} KB
                </p>
                <button
                  type="button"
                  onClick={reset}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700"
                >
                  <X className="h-3 w-3" /> Cambiar archivo
                </button>
              </div>
            ) : (
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                  <Upload className="h-6 w-6 text-slate-500" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">
                  Arrastra el PDF aquí o
                </p>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="mt-1.5 text-sm font-semibold text-[#2361d8] hover:underline"
                >
                  busca en tu equipo
                </button>
                <p className="mt-3 text-[11px] text-slate-400">
                  Máx 5 MB · Solo PDF · No guardamos el archivo
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-700">
                Tipo de contrato (opcional)
              </label>
              <select
                value={contractType}
                onChange={(e) => setContractType(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#2361d8]"
              >
                {CONTRACT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={!file || loading}
              className="inline-flex h-[42px] items-center justify-center gap-2 rounded-full bg-[#2361d8] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f55c0] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Revisando…
                </>
              ) : (
                <>
                  Revisar contrato
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          )}

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-xs leading-5 text-slate-500">
            <Info className="mr-1.5 inline h-3.5 w-3.5 text-slate-400" />
            La revisión es <strong>orientativa</strong>. Antes de firmar o
            iniciar acciones legales, contrasta con un abogado colegiado.
          </div>
        </div>
      )}

      {/* Result */}
      {result && result.ok && (
        <div className="mt-6 space-y-5">
          {/* File summary */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                <FileText className="h-4 w-4 text-slate-600" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{result.source.filename}</p>
                <p className="text-[11px] text-slate-500">
                  {result.source.pages ? `${result.source.pages} págs · ` : ''}
                  {result.source.sizeKb} KB · Tipo detectado:{' '}
                  <strong className="text-slate-700">{result.review.tipoDetectado}</strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={reset}
              className="text-xs font-medium text-[#2361d8] hover:underline"
            >
              Revisar otro contrato →
            </button>
          </div>

          {/* Resumen */}
          <Card title="Resumen">
            <p className="text-sm leading-6 text-slate-700">{result.review.resumen}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Objeto" value={result.review.objetoPrincipal} />
              <Field label="Duración" value={result.review.duracion} />
            </div>
          </Card>

          {/* Partes */}
          {result.review.partes.length > 0 && (
            <Card title="Partes contratantes">
              <ul className="space-y-2">
                {result.review.partes.map((p, i) => (
                  <li key={i} className="text-sm text-slate-700">
                    <strong className="text-slate-900">{p.rol}:</strong> {p.identificacion}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Riesgos */}
          {result.review.riesgos.length > 0 && (
            <Card title={`Riesgos detectados (${result.review.riesgos.length})`}>
              <ul className="space-y-3">
                {result.review.riesgos.map((r, i) => {
                  const meta = SEVERITY_META[r.severidad];
                  return (
                    <li key={i} className={`rounded-xl border p-3.5 ${meta.cls}`}>
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {meta.label}
                        </span>
                        {r.referenciaLegal && (
                          <span className="ml-auto text-[10px] font-medium opacity-70">
                            {r.referenciaLegal}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-wider opacity-60">
                        Cláusula
                      </p>
                      <p className="mt-0.5 text-sm leading-6">{r.clausula}</p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-wider opacity-60">
                        Por qué es problemático
                      </p>
                      <p className="mt-0.5 text-sm leading-6">{r.riesgo}</p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-wider opacity-60">
                        Sugerencia
                      </p>
                      <p className="mt-0.5 text-sm leading-6">{r.sugerencia}</p>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {/* Cláusulas favorables */}
          {result.review.clausulasFavorables.length > 0 && (
            <Card title="Cláusulas favorables">
              <ul className="space-y-1.5">
                {result.review.clausulasFavorables.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Recomendaciones */}
          {result.review.recomendaciones.length > 0 && (
            <Card title="Recomendaciones generales">
              <ul className="space-y-1.5">
                {result.review.recomendaciones.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#2361d8]" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Próximos pasos */}
          {result.review.proximosPasos.length > 0 && (
            <Card title="Próximos pasos sugeridos">
              <ol className="space-y-2">
                {result.review.proximosPasos.map((p, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#2361d8] text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          {/* Disclaimer */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
            <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5" />
            {result.review.disclaimer}
          </div>

          {result.source.textTruncated && (
            <p className="text-center text-[11px] text-slate-400">
              <Info className="mr-1 inline h-3 w-3" />
              El contrato es muy extenso — he revisado los primeros 30.000
              caracteres. Para una revisión completa, envía las secciones más
              relevantes por separado.
            </p>
          )}

          <p className="text-center text-[10px] text-slate-400">
            <ShieldCheck className="mr-1 inline h-3 w-3" />
            Generado en {Math.round(result.review.latencyMs / 1000)}s · No guardamos el PDF · El
            texto se procesa en tu sesión
          </p>
        </div>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-bold text-slate-900">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm leading-6 text-slate-800">{value || '—'}</p>
    </div>
  );
}
