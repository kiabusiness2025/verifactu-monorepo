'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  expenseId: string;
}

export default function MarkExpensePaidButton({ expenseId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMarkPaid() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/expenses/${expenseId}/mark-paid`, { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? 'No se pudo actualizar el gasto.');
        return;
      }

      router.refresh();
    } catch {
      setError('Error de red. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleMarkPaid}
        disabled={loading}
        className="inline-flex h-10 items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted/40 disabled:opacity-50"
      >
        {loading ? 'Actualizando…' : 'Marcar como pagado'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
