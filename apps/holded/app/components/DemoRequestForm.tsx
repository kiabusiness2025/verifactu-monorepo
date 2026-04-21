'use client';

import { useState } from 'react';

type FormState = {
  name: string;
  email: string;
  companyName: string;
  phone: string;
  taxId: string;
  role: string;
  usesHolded: boolean | '';
  objective: string;
  consent: boolean;
};

const initialState: FormState = {
  name: '',
  email: '',
  companyName: '',
  phone: '',
  taxId: '',
  role: '',
  usesHolded: '',
  objective: '',
  consent: false,
};

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#ff5460] focus:outline-none focus:ring-2 focus:ring-[#ff5460]/20';
const labelClass = 'mb-1.5 block text-sm font-semibold text-slate-700';

export default function DemoRequestForm({ source = 'holded_demo' }: { source?: string }) {
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const response = await fetch('/api/demo-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          companyName: form.companyName,
          phone: form.phone || undefined,
          taxId: form.taxId || undefined,
          role: form.role || undefined,
          usesHolded: form.usesHolded === true,
          objective: form.objective || undefined,
          source,
          consent: form.consent,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMsg(payload?.error || 'Ha ocurrido un error. Intentalo de nuevo.');
        setStatus('error');
        return;
      }

      setForm(initialState);
      setStatus('ok');
    } catch {
      setErrorMsg('No hemos podido enviar la solicitud. Comprueba tu conexion.');
      setStatus('error');
    }
  }

  if (status === 'ok') {
    return (
      <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 px-6 py-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <svg
            className="h-7 w-7 text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-lg font-bold text-emerald-800">Solicitud recibida</p>
        <p className="mt-2 text-sm leading-6 text-emerald-700">
          Te contactamos en las proximas 24 horas para confirmar fecha y preparar la demo con tu
          contexto.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Obligatorios */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>
            Nombre <span className="text-[#ff5460]">*</span>
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Ana Garcia"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>
            Email <span className="text-[#ff5460]">*</span>
          </label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="ana@empresa.com"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>
          Empresa <span className="text-[#ff5460]">*</span>
        </label>
        <input
          type="text"
          required
          value={form.companyName}
          onChange={(e) => set('companyName', e.target.value)}
          placeholder="Muebles Duran S.L."
          className={inputClass}
        />
      </div>

      {/* Opcionales */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Telefono</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="+34 600 000 000"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Rol en la empresa</label>
          <input
            type="text"
            value={form.role}
            onChange={(e) => set('role', e.target.value)}
            placeholder="Directora financiera, autonomo..."
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>CIF / NIF</label>
        <input
          type="text"
          value={form.taxId}
          onChange={(e) => set('taxId', e.target.value)}
          placeholder="B12345678"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>¿Usas Holded actualmente?</label>
        <div className="flex gap-3">
          {[
            { label: 'Sí', value: true as const },
            { label: 'No', value: false as const },
          ].map(({ label, value }) => (
            <label
              key={label}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                form.usesHolded === value
                  ? 'border-[#ff5460] bg-[#ff5460]/5 text-[#ff5460]'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="usesHolded"
                className="sr-only"
                checked={form.usesHolded === value}
                onChange={() => set('usesHolded', value)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass}>¿Que quieres ver en la demo?</label>
        <textarea
          rows={3}
          value={form.objective}
          onChange={(e) => set('objective', e.target.value)}
          placeholder="Por ejemplo: cobros pendientes, cierre de trimestre con el gestor, lecturas de IVA..."
          className={inputClass}
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3">
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
            politica de privacidad
          </a>
          .
        </span>
      </label>

      {status === 'error' ? (
        <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{errorMsg}</p>
      ) : null}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#ff5460] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#ef4654] disabled:opacity-60"
      >
        {status === 'loading' ? 'Enviando...' : 'Solicitar demo gratuita'}
      </button>
    </form>
  );
}
