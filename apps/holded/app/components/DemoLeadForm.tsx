'use client';

import { useState } from 'react';

export default function DemoLeadForm() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    companyName: '',
    phone: '',
    consent: false,
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/communications/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'holded_demo_request' }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data?.error || 'Ha ocurrido un error. Inténtalo de nuevo.');
        setStatus('error');
        return;
      }

      setStatus('ok');
    } catch {
      setErrorMsg('No hemos podido registrar tu solicitud. Comprueba tu conexión.');
      setStatus('error');
    }
  }

  if (status === 'ok') {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 px-6 py-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-6 w-6 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-base font-semibold text-green-800">Solicitud registrada</p>
        <p className="mt-1 text-sm text-green-700">
          Hemos recibido tu solicitud. Nuestro equipo se pondrá en contacto para preparar tu entorno
          y fijar la demostración.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Nombre y apellidos <span className="text-[#ff5460]">*</span>
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Ana García López"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#ff5460] focus:outline-none focus:ring-2 focus:ring-[#ff5460]/20"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Email <span className="text-[#ff5460]">*</span>
          </label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="ana@empresa.com"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#ff5460] focus:outline-none focus:ring-2 focus:ring-[#ff5460]/20"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Nombre de empresa <span className="text-[#ff5460]">*</span>
          </label>
          <input
            type="text"
            required
            value={form.companyName}
            onChange={(e) => set('companyName', e.target.value)}
            placeholder="Mi empresa S.L."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#ff5460] focus:outline-none focus:ring-2 focus:ring-[#ff5460]/20"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Teléfono</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="+34 600 000 000"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#ff5460] focus:outline-none focus:ring-2 focus:ring-[#ff5460]/20"
          />
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          required
          checked={form.consent}
          onChange={(e) => set('consent', e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#ff5460]"
        />
        <span className="text-xs leading-5 text-slate-500">
          Acepto el tratamiento de mis datos para gestionar esta solicitud conforme a la{' '}
          <a href="/privacy" className="underline hover:text-slate-700">
            política de privacidad
          </a>
          .
        </span>
      </label>

      {status === 'error' && (
        <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="inline-flex w-full items-center justify-center rounded-full bg-[#ff5460] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#ef4654] disabled:opacity-60"
      >
        {status === 'loading' ? 'Enviando…' : 'Solicitar prueba gratuita'}
      </button>
    </form>
  );
}
