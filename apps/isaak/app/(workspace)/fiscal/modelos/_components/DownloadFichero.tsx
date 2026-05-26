'use client';

// Botón reutilizable para descargar el fichero BOE de un modelo.
// Usa el endpoint /api/isaak/modelos/{modelo}/export con body POST.

import { FileText, Loader2 } from 'lucide-react';
import { useState } from 'react';

export function DownloadFichero({
  modelo,
  body,
  label,
}: {
  modelo: '303' | '130' | '111' | '115' | '349' | '347' | '180' | '190';
  body: Record<string, unknown>;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/isaak/modelos/${modelo}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text();
        setError(`Export falló: ${res.status} ${txt.slice(0, 200)}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download =
        res.headers
          .get('Content-Disposition')
          ?.match(/filename="([^"]+)"/)?.[1] ?? `${modelo}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2">
      <p className="text-sm font-semibold text-slate-800">
        Descargar fichero AEAT (.{modelo} BOE)
      </p>
      <p className="text-xs text-slate-500">
        Genera el fichero en formato oficial AEAT (ISO-8859-15) para subirlo a la sede
        electrónica vía &quot;Presentación por fichero&quot;.
      </p>
      <button
        type="button"
        onClick={download}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
        {label ?? `Descargar .${modelo}`}
      </button>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
