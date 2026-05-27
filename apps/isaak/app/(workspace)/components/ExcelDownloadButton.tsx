'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';

export type ExcelReportType =
  | 'libro_iva_emitidas'
  | 'libro_iva_recibidas'
  | 'libro_diario'
  | 'modelo_303';

const LABELS: Record<ExcelReportType, string> = {
  libro_iva_emitidas: 'Libro IVA emitidas',
  libro_iva_recibidas: 'Libro IVA recibidas',
  libro_diario: 'Libro diario',
  modelo_303: 'Modelo 303',
};

const DESCRIPTIONS: Record<ExcelReportType, string> = {
  libro_iva_emitidas: 'Facturas emitidas con base, IVA y total (SII-compatible).',
  libro_iva_recibidas: 'Facturas recibidas con IVA deducible.',
  libro_diario: 'Asientos contables del periodo (PGC 2007).',
  modelo_303: 'Resumen IVA trimestral con detalle por tipo.',
};

type Props = {
  reportType: ExcelReportType;
  from: string;
  to: string;
  label?: string;
  variant?: 'button' | 'card';
};

export function ExcelDownloadButton({ reportType, from, to, label, variant = 'button' }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ reportType, from, to });
      if (label) params.set('label', label);
      const res = await fetch(`/api/isaak/export/excel?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(msg || `Error ${res.status}`);
      }
      const blob = await res.blob();
      const filename =
        res.headers.get('Content-Disposition')?.match(/filename="?([^";]+)"?/)?.[1] ??
        `isaak_${reportType}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de descarga');
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'card') {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-300 transition">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="h-8 w-8 text-emerald-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-slate-900">{LABELS[reportType]}</h3>
            <p className="text-sm text-slate-500 mt-1">{DESCRIPTIONS[reportType]}</p>
          </div>
        </div>
        <button
          onClick={download}
          disabled={loading}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generando…
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Descargar Excel
            </>
          )}
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <button
      onClick={download}
      disabled={loading}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition text-sm"
      title={DESCRIPTIONS[reportType]}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
      )}
      <span>{LABELS[reportType]}</span>
      {error && <span className="text-red-600 ml-2 text-xs">⚠ {error}</span>}
    </button>
  );
}
