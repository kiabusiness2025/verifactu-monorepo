'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  invoiceId: string;
}

export default function IssueInvoiceButton({ invoiceId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleIssue() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/issue`, { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as { error?: string; details?: string };
      if (!res.ok) {
        setError(data.error ?? data.details ?? 'No se pudo emitir la factura.');
        return;
      }

      setSuccess('Factura emitida correctamente. Actualizando estado...');
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
        onClick={handleIssue}
        disabled={loading}
        className="inline-flex h-10 items-center justify-center rounded-md bg-foreground px-6 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? 'Emitiendo…' : 'Emitir factura'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-700">{success}</p>}
    </div>
  );
}
