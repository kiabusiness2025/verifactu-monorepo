'use client';

import { useState } from 'react';

export default function BetaInviteForm() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: '', firstName: '', companyName: '', notes: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/beta-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'Error desconocido');
        setStatus('error');
      } else {
        setStatus('ok');
        setForm({ email: '', firstName: '', companyName: '', notes: '' });
      }
    } catch {
      setErrorMsg('Error de red');
      setStatus('error');
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
      >
        + Invitar beta
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-indigo-900">Invitar usuario al programa beta</h3>
        <button
          onClick={() => {
            setOpen(false);
            setStatus('idle');
          }}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          ✕ Cerrar
        </button>
      </div>

      {status === 'ok' ? (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-700">
          ✓ Invitación enviada a {form.email || 'la dirección indicada'}
          <button
            onClick={() => setStatus('idle')}
            className="ml-3 text-xs font-normal text-emerald-600 underline"
          >
            Enviar otra
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Email *
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              placeholder="cliente@empresa.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Nombre
            </label>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              placeholder="Ana"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Empresa
            </label>
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              placeholder="Nombre de la empresa"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Mensaje personalizado (opcional)
            </label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              placeholder="Ej: Tu asesoría está en el grupo piloto de Isaak…"
            />
          </div>
          {status === 'error' && (
            <div className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {errorMsg}
            </div>
          )}
          <div className="sm:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={status === 'sending'}
              className="rounded-full bg-indigo-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {status === 'sending' ? 'Enviando…' : 'Enviar invitación'}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setStatus('idle');
              }}
              className="rounded-full border border-slate-200 px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
