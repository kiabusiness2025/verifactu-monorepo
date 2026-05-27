'use client';

// F12 — Inspector AEAT Capa 2.
//
// Panel de consulta fiscal con citas BOE. El usuario escribe una
// pregunta, Isaak (Inspector Capa 2) busca en el corpus AEAT, llama
// al LLM y devuelve respuesta + lista de fuentes citadas.

import { useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  ExternalLink,
  Loader2,
  Search,
  Sparkles,
} from 'lucide-react';

type Citation = {
  index: number;
  articleRef: string | null;
  title: string | null;
  sourceUrl: string;
  snippet: string;
};

type ConsultResponse = {
  ok: boolean;
  answer?: string;
  citations?: Citation[];
  profile?: Record<string, unknown> | null;
  corpusHits?: number;
  model?: string;
  latencyMs?: number;
  error?: string;
  message?: string;
};

const SAMPLE_QUESTIONS = [
  '¿Cuándo aplico prorrata especial en el IVA?',
  '¿Qué retención IRPF aplicar a un alquiler de local comercial?',
  '¿El IVA de la gasolina de mi vehículo turismo es deducible al 100%?',
  '¿En qué plazo debo presentar el modelo 720?',
  '¿Cómo facturar a un cliente intracomunitario sin IVA?',
  '¿Qué obligaciones tengo si pierdo el régimen de criterio de caja?',
];

export default function InspectorPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConsultResponse | null>(null);

  async function consult() {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/isaak/inspector/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });
      const json = (await res.json()) as ConsultResponse;
      setResult({ ...json, ok: res.ok && json.ok === true });
    } catch (err) {
      setResult({
        ok: false,
        error: 'network',
        message: err instanceof Error ? err.message : 'Error de conexión.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
          <Sparkles size={20} className="text-violet-500" />
          Inspector AEAT — Consulta con citas BOE
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Pregunta fiscal compleja → Isaak busca en el corpus AEAT/BOE, considera tu perfil
          fiscal, y responde con citas específicas a normativa. Capa 2 del Inspector.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
          Tu pregunta fiscal
        </label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ej: ¿Cuándo aplico la prorrata especial?"
          rows={3}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-200"
        />
        <div className="flex justify-between items-center gap-3">
          <button
            type="button"
            onClick={consult}
            disabled={loading || !query.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 text-white px-4 py-2 text-sm font-semibold hover:bg-violet-700 disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            Consultar al Inspector
          </button>
          {result?.model && (
            <span className="text-xs text-slate-400">
              {result.model} · {result.corpusHits} pasajes · {result.latencyMs}ms
            </span>
          )}
        </div>
      </div>

      <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
          Preguntas de ejemplo
        </p>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_QUESTIONS.map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setQuery(q)}
              className="text-xs rounded-full border border-slate-300 bg-white px-3 py-1.5 text-slate-600 hover:border-violet-300 hover:text-violet-700"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {result && !result.ok && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex gap-2 items-start text-sm text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Error: {result.error}</p>
            <p className="text-xs mt-1">{result.message}</p>
          </div>
        </div>
      )}

      {result?.ok && result.answer && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Respuesta del Inspector
            </p>
            <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
              {result.answer}
            </div>
          </div>

          {result.citations && result.citations.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <BookOpen size={13} className="inline mr-1" /> Fuentes citadas
              </p>
              <ol className="space-y-3">
                {result.citations.map((c) => (
                  <li
                    key={c.index}
                    className="border-l-2 border-violet-200 pl-3 py-1 text-sm"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-xs font-bold text-violet-700">
                        [{c.index}]
                      </span>
                      <span className="font-semibold text-slate-800">
                        {c.articleRef ?? c.title ?? 'Fuente'}
                      </span>
                      <a
                        href={c.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-violet-600 hover:underline inline-flex items-center gap-1"
                      >
                        Ver BOE <ExternalLink size={10} />
                      </a>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 italic">
                      {c.snippet}
                      {c.snippet.length >= 240 ? '...' : ''}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <p className="text-xs text-slate-400 text-center">
            La respuesta del Inspector es informativa. Para casos complejos o de alto coste, contrasta con tu asesor antes de actuar.
          </p>
        </div>
      )}
    </div>
  );
}
