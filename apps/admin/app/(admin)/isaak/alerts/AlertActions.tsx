'use client';

import { useState } from 'react';

export function AlertActions({ alertId }: { alertId: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function markSent() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/isaak/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_sent' }),
      });
      if (res.ok) setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (done)
    return <span className="text-xs font-semibold text-emerald-600">✓ Marcada como enviada</span>;

  return (
    <button
      onClick={markSent}
      disabled={loading}
      className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
    >
      {loading ? 'Enviando…' : 'Marcar enviada'}
    </button>
  );
}
