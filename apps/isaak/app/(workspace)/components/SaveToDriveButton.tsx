'use client';

// V1.7.4 — Botón "Guardar en Drive" para conversaciones del chat.
//
// Solo se muestra si el usuario tiene Google conectado con scope drive.
// Hace POST al endpoint que genera el PDF y lo sube en background;
// devuelve viewUrl de Drive para abrir directamente.

import { useEffect, useState } from 'react';
import { Cloud, ExternalLink, Loader2 } from 'lucide-react';

type GoogleStatus = { connected?: boolean; hasDriveScope?: boolean };

export default function SaveToDriveButton({ conversationId }: { conversationId: string }) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/isaak/google/status', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: GoogleStatus | null) => {
        if (cancelled) return;
        setAvailable(!!(data?.connected && data?.hasDriveScope));
      })
      .catch(() => !cancelled && setAvailable(false));
    return () => {
      cancelled = true;
    };
  }, []);

  if (available === null || !available) return null;

  const onClick = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setSavedUrl(null);
    try {
      const res = await fetch(`/api/isaak/chat/${conversationId}/save-to-drive`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = (await res.json()) as { viewUrl?: string; error?: string; message?: string };
      if (!res.ok || !data.viewUrl) {
        setError(data.message ?? data.error ?? `Error ${res.status}`);
        return;
      }
      setSavedUrl(data.viewUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red.');
    } finally {
      setLoading(false);
    }
  };

  if (savedUrl) {
    return (
      <a
        href={savedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-800 transition hover:bg-emerald-100"
      >
        <Cloud className="h-3 w-3" />
        <span className="hidden sm:inline">Guardado en Drive</span>
        <ExternalLink className="h-3 w-3" />
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      title={error ?? 'Guardar esta conversación en tu Google Drive (carpeta "Isaak — Conversaciones")'}
      className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition disabled:opacity-50 ${
        error
          ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Cloud className={`h-3 w-3 ${error ? 'text-rose-600' : 'text-blue-600'}`} />
      )}
      <span className="hidden sm:inline">
        {error ? 'Reintentar Drive' : 'Guardar en Drive'}
      </span>
    </button>
  );
}
