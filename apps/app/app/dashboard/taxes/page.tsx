'use client';

import { useEffect, useMemo, useState } from 'react';

type PreviewResponse = {
  ok: boolean;
  summary?: Record<string, unknown>;
  error?: string;
};

function currentQuarterPeriod() {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  return `${now.getFullYear()}-Q${quarter}`;
}

export default function TaxesPage() {
  const [period303, setPeriod303] = useState(currentQuarterPeriod);
  const [period130, setPeriod130] = useState(currentQuarterPeriod);
  const [loading, setLoading] = useState(false);
  const [preview303, setPreview303] = useState<Record<string, unknown> | null>(null);
  const [preview130, setPreview130] = useState<Record<string, unknown> | null>(null);
  const [booksFrom, setBooksFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [booksTo, setBooksTo] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  const loadPreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const [r303, r130] = await Promise.all([
        fetch(`/api/aeat/preview/303?period=${encodeURIComponent(period303)}`),
        fetch(`/api/aeat/preview/130?period=${encodeURIComponent(period130)}`),
      ]);
      const d303 = (await r303.json().catch(() => ({}))) as PreviewResponse;
      const d130 = (await r130.json().catch(() => ({}))) as PreviewResponse;

      if (!r303.ok) throw new Error(d303.error || 'No se pudo cargar preview 303');
      if (!r130.ok) throw new Error(d130.error || 'No se pudo cargar preview 130');

      setPreview303(d303.summary ?? null);
      setPreview130(d130.summary ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el resumen fiscal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exports = useMemo(
    () => ({
      model303Csv: `/api/aeat/export/303?period=${encodeURIComponent(period303)}&format=csv`,
      model303Xlsx: `/api/aeat/export/303?period=${encodeURIComponent(period303)}&format=xlsx`,
      model130Csv: `/api/aeat/export/130?period=${encodeURIComponent(period130)}&format=csv`,
      model130Xlsx: `/api/aeat/export/130?period=${encodeURIComponent(period130)}&format=xlsx`,
      salesBookCsv: `/api/aeat/books/sales?from=${encodeURIComponent(booksFrom)}&to=${encodeURIComponent(
        booksTo
      )}&format=csv`,
      purchasesBookCsv: `/api/aeat/books/purchases?from=${encodeURIComponent(booksFrom)}&to=${encodeURIComponent(
        booksTo
      )}&format=csv`,
    }),
    [booksFrom, booksTo, period130, period303]
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Impuestos</h1>
        <p className="mt-1 text-sm text-slate-600">Exportación y preview de IVA (303) e IRPF (130).</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">IVA (Modelo 303)</h2>
          <div className="mt-3 flex gap-2">
            <input
              value={period303}
              onChange={(e) => setPeriod303(e.target.value.toUpperCase())}
              placeholder="YYYY-Qn o YYYY-MM"
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
            />
            <button
              onClick={loadPreview}
              className="rounded-lg bg-[#0b6cfb] px-4 text-sm font-semibold text-white hover:bg-[#095edb]"
            >
              Cargar
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={exports.model303Csv} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
              Exportar CSV
            </a>
            <a href={exports.model303Xlsx} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
              Exportar XLSX
            </a>
          </div>
          <pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
            {JSON.stringify(preview303, null, 2)}
          </pre>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">IRPF (Modelo 130)</h2>
          <div className="mt-3 flex gap-2">
            <input
              value={period130}
              onChange={(e) => setPeriod130(e.target.value.toUpperCase())}
              placeholder="YYYY-Qn"
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
            />
            <button
              onClick={loadPreview}
              className="rounded-lg bg-[#0b6cfb] px-4 text-sm font-semibold text-white hover:bg-[#095edb]"
            >
              Cargar
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={exports.model130Csv} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
              Exportar CSV
            </a>
            <a href={exports.model130Xlsx} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
              Exportar XLSX
            </a>
          </div>
          <pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
            {JSON.stringify(preview130, null, 2)}
          </pre>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Libros AEAT</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input
            type="date"
            value={booksFrom}
            onChange={(e) => setBooksFrom(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
          />
          <input
            type="date"
            value={booksTo}
            onChange={(e) => setBooksTo(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={exports.salesBookCsv} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
            Libro ventas CSV
          </a>
          <a
            href={exports.purchasesBookCsv}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700"
          >
            Libro gastos CSV
          </a>
        </div>
        {loading ? <p className="mt-3 text-xs text-slate-500">Cargando preview...</p> : null}
        {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
      </section>
    </div>
  );
}
