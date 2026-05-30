'use client';

// V1.9.3 — Generador de cartas masivas (mail-merge) para asesores.
//
// El asesor pega un CSV (cabecera en la primera fila) + redacta una
// plantilla con placeholders {{campo}}. Al pulsar generar, el servidor
// devuelve un ZIP con N cartas .docx, una por fila del CSV.

import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Download,
  FileText,
  Loader2,
  Mail,
  Sparkles,
} from 'lucide-react';
import { parseCsv } from '@/app/lib/isaak-csv';

const EXAMPLE_CSV = `alias,nombre,nif,direccion
acme,ACME SL,B12345678,C/ Mayor 1 Madrid
beta,BETA SLU,B87654321,C/ Sol 2 Barcelona`;

const EXAMPLE_TEMPLATE = `Estimado/a {{nombre}}:

Le escribimos en relación con su modelo 303 del último trimestre. Tras revisar la documentación, hemos detectado que el importe de IVA repercutido necesita verificación.

Le rogamos contacte con nosotros antes del próximo 20 de cada mes para regularizar la situación.

Atentamente,
Su asesor fiscal`;

export default function CartasMasivasPage() {
  const [csv, setCsv] = useState('');
  const [template, setTemplate] = useState('');
  const [subject, setSubject] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderNif, setSenderNif] = useState('');
  const [filenameField, setFilenameField] = useState('alias');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => {
    if (!csv.trim()) return { headers: [], rows: [] };
    try {
      return parseCsv(csv);
    } catch {
      return { headers: [], rows: [] };
    }
  }, [csv]);

  const placeholders = useMemo(() => {
    const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
    const found = new Set<string>();
    for (const m of template.matchAll(re)) found.add(m[1]);
    return [...found];
  }, [template]);

  const missingPlaceholders = placeholders.filter(
    (p) => !parsed.headers.includes(p),
  );

  const handleGenerate = async () => {
    setError(null);
    if (parsed.rows.length === 0) {
      setError('Pega un CSV con cabecera y al menos una fila.');
      return;
    }
    if (!template.trim()) {
      setError('Escribe el texto de la carta con placeholders {{campo}}.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/isaak/advisor/letters/batch', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          template,
          rows: parsed.rows,
          subject: subject.trim() || undefined,
          senderName: senderName.trim() || undefined,
          senderNif: senderNif.trim() || undefined,
          filenameField: filenameField.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        setError(`Error ${res.status}: ${txt.slice(0, 200)}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cartas_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown_error');
    } finally {
      setLoading(false);
    }
  };

  const useExample = () => {
    setCsv(EXAMPLE_CSV);
    setTemplate(EXAMPLE_TEMPLATE);
    setSubject('Revisión del modelo 303');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-100 bg-[#fafbff] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2361d8]/10">
            <Mail size={16} className="text-[#2361d8]" />
          </div>
          <div className="flex-1">
            <h1 className="text-[16px] font-semibold text-[#011c67]">
              Cartas masivas
            </h1>
            <p className="text-[12px] text-slate-500">
              CSV de clientes + plantilla → ZIP con N cartas Word
            </p>
          </div>
          <button
            type="button"
            onClick={useExample}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
          >
            <Sparkles size={12} />
            Ejemplo
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="grid gap-4 md:grid-cols-2">
          <section className="space-y-2">
            <label className="block text-[12px] font-semibold text-slate-700">
              1. CSV de destinatarios (1ª fila = cabecera)
            </label>
            <textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              placeholder={EXAMPLE_CSV}
              className="h-44 w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-[11px] text-slate-700 focus:border-[#2361d8] focus:outline-none focus:ring-1 focus:ring-[#2361d8]/20"
            />
            <div className="text-[10px] text-slate-500">
              {parsed.rows.length > 0 ? (
                <>
                  <span className="font-semibold text-emerald-600">
                    {parsed.rows.length} filas
                  </span>{' '}
                  · Columnas:{' '}
                  {parsed.headers.map((h) => (
                    <span
                      key={h}
                      className="mr-1 inline-flex rounded bg-slate-100 px-1 font-mono"
                    >
                      {h}
                    </span>
                  ))}
                </>
              ) : (
                'Pega o escribe el CSV. Se admiten comillas dobles.'
              )}
            </div>
          </section>

          <section className="space-y-2">
            <label className="block text-[12px] font-semibold text-slate-700">
              2. Plantilla de la carta — usa {'{{campo}}'}
            </label>
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder={EXAMPLE_TEMPLATE}
              className="h-44 w-full rounded-xl border border-slate-200 bg-white p-3 text-[12px] text-slate-700 focus:border-[#2361d8] focus:outline-none focus:ring-1 focus:ring-[#2361d8]/20"
            />
            <div className="text-[10px] text-slate-500">
              {placeholders.length === 0 ? (
                'Sin placeholders. Inserta {{nombre}}, {{nif}}, etc.'
              ) : (
                <>
                  Usa:{' '}
                  {placeholders.map((p) => {
                    const missing = !parsed.headers.includes(p);
                    return (
                      <span
                        key={p}
                        className={`mr-1 inline-flex rounded px-1 font-mono ${
                          missing
                            ? 'bg-rose-50 text-rose-600'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {p}
                      </span>
                    );
                  })}
                </>
              )}
            </div>
            {missingPlaceholders.length > 0 && (
              <div className="flex items-start gap-1.5 rounded-lg bg-rose-50 px-2 py-1.5 text-[11px] text-rose-700">
                <AlertCircle size={12} className="mt-0.5 shrink-0" />
                <span>
                  Estos placeholders no existen en el CSV:{' '}
                  <strong>{missingPlaceholders.join(', ')}</strong>. Se sustituirán
                  por vacío.
                </span>
              </div>
            )}
          </section>
        </div>

        <section className="mt-4 grid gap-3 md:grid-cols-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700">
              Asunto (opcional)
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Revisión modelo 303"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] focus:border-[#2361d8] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700">
              Remitente (opcional)
            </label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Asesoría García"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] focus:border-[#2361d8] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700">
              NIF remitente
            </label>
            <input
              type="text"
              value={senderNif}
              onChange={(e) => setSenderNif(e.target.value)}
              placeholder="B12345678"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] focus:border-[#2361d8] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700">
              Columna para filename
            </label>
            <select
              value={filenameField}
              onChange={(e) => setFilenameField(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] focus:border-[#2361d8] focus:outline-none"
            >
              <option value="">(carta_1.docx, carta_2.docx…)</option>
              {parsed.headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        </section>

        {error && (
          <div className="mt-4 flex items-start gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2 text-[12px] text-slate-600">
            <FileText size={14} className="text-[#2361d8]" />
            {parsed.rows.length > 0 ? (
              <>
                Se generará un ZIP con{' '}
                <strong className="text-[#011c67]">
                  {parsed.rows.length} cartas
                </strong>{' '}
                en formato .docx
              </>
            ) : (
              'Pega un CSV para empezar.'
            )}
          </div>
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={loading || parsed.rows.length === 0 || !template.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-[#2361d8] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#1b4cbe] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            {loading ? 'Generando…' : 'Generar ZIP'}
          </button>
        </div>
      </div>
    </div>
  );
}
