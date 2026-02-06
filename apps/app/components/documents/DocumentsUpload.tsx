'use client';

import { useMemo, useState } from 'react';

export function DocumentsUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadedInfo, setUploadedInfo] = useState<{
    url: string;
    name: string;
    source: string;
  } | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const sourceHint = useMemo(() => {
    if (!file) return null;
    const name = file.name.toLowerCase();
    if (name.endsWith('.pdf')) return 'pdf';
    if (name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')) return 'excel';
    if (file.type.startsWith('image/')) return 'photo';
    return 'pdf';
  }, [file]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!file) {
      setError('Selecciona un PDF, una foto o un Excel para subir.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'documents');

      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo subir el archivo');
      }

      setUploadedInfo({
        url: data?.url || '',
        name: data?.file?.name || file.name,
        source: sourceHint || 'pdf',
      });
      setSuccess('Recibido. Isaak lo revisará y lo registrará si corresponde.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir el archivo');
    } finally {
      setLoading(false);
    }
  };

  const handleIntake = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!uploadedInfo) {
      setError('Sube un documento primero.');
      return;
    }

    if (!expenseForm.description || !expenseForm.amount || !expenseForm.date) {
      setError('Isaak necesita fecha, importe y descripción.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/expenses/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: expenseForm.date,
          description: expenseForm.description,
          amount: Number(expenseForm.amount),
          source: uploadedInfo.source,
          fileUrl: uploadedInfo.url,
          fileName: uploadedInfo.name,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo registrar el gasto');
      }

      setSuccess('Gasto registrado por Isaak.');
      setExpenseForm({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: '',
      });
      setUploadedInfo(null);
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar el gasto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Subir documento</h2>
      <p className="mt-1 text-xs text-slate-500">PDF, foto o Excel.</p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <input
          type="file"
          accept="application/pdf,image/*,.xlsx,.xls,.csv"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
        />

        {error && <p className="text-xs text-red-600">{error}</p>}
        {success && <p className="text-xs text-emerald-700">{success}</p>}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
        >
          {loading ? 'Subiendo…' : 'Subir documento'}
        </button>
      </form>

      {uploadedInfo && (
        <form
          onSubmit={handleIntake}
          className="mt-6 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
        >
          <p className="text-xs text-slate-600">
            Isaak necesita tres datos para registrar el gasto.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600">Fecha</label>
              <input
                type="date"
                value={expenseForm.date}
                onChange={(event) =>
                  setExpenseForm((prev) => ({ ...prev, date: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600">Importe</label>
              <input
                type="number"
                step="0.01"
                value={expenseForm.amount}
                onChange={(event) =>
                  setExpenseForm((prev) => ({ ...prev, amount: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-600">Descripción</label>
              <input
                type="text"
                value={expenseForm.description}
                onChange={(event) =>
                  setExpenseForm((prev) => ({ ...prev, description: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
          >
            {loading ? 'Registrando…' : 'Registrar con Isaak'}
          </button>
        </form>
      )}
    </div>
  );
}
