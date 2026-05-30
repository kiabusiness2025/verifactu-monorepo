'use client';

// V1.5.2 — Botón discreto en el header de cada conversación que descarga
// el PDF de toda la conversación.

import { useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';

export default function ExportConversationButton({
  conversationId,
  title,
}: {
  conversationId: string;
  title: string;
}) {
  void title; // reservado para tooltips futuros
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/isaak/chat/${conversationId}/export-pdf`, {
        credentials: 'include',
      });
      if (!res.ok) {
        // Devolvemos el control sin tirar, el usuario puede reintentar.
        console.error('[ExportConversationButton] failed', await res.text().catch(() => ''));
        return;
      }
      const blob = await res.blob();
      const filename =
        res.headers.get('Content-Disposition')?.match(/filename="?([^";]+)"?/)?.[1] ??
        `isaak_conversacion_${conversationId.slice(0, 8)}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      title="Descargar esta conversación como PDF"
      className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <FileText className="h-3 w-3 text-rose-600" />
      )}
      <span className="hidden sm:inline">Exportar PDF</span>
      <Download className="h-3 w-3 sm:hidden" />
    </button>
  );
}
