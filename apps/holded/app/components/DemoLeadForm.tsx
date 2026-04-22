'use client';

import { useState } from 'react';

type DemoLeadFormState = {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  cif: string;
  sector: string;
  role: string;
  message: string;
  consent: boolean;
};

const initialState: DemoLeadFormState = {
  name: '',
  email: '',
  phone: '',
  companyName: '',
  cif: '',
  sector: '',
  role: '',
  message: '',
  consent: false,
};

export default function DemoLeadForm() {
  const [form, setForm] = useState<DemoLeadFormState>(initialState);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function set<K extends keyof DemoLeadFormState>(field: K, value: DemoLeadFormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const response = await fetch('/api/communications/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          source: 'holded_demo_request',
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMsg(
          payload?.error || 'Ha ocurrido un error al registrar la solicitud. Intentalo de nuevo.'
        );
        setStatus('error');
        return;
      }

      setForm(initialState);
      setStatus('ok');
    } catch {
      setErrorMsg('No hemos podido registrar tu solicitud. Comprueba tu conexion.');
      setStatus('error');
    }
  }

  if (status === 'ok') {
    return (
      <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 px-6 py-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <svg
            className="h-6 w-6 text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-base font-semibold text-emerald-800">Solicitud registrada</p>
        <p className="mt-1 text-sm leading-6 text-emerald-700">
          Ya tenemos los datos de perfil y empresa. El equipo te contactara para preparar la demo
          con contexto real y definir el siguiente paso.
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
            onChange={(event) => set('name', event.target.value)}
            placeholder="Ana Garcia Lopez"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#ff5460] focus:outline-none focus:ring-2 focus:ring-[#ff5460]/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Email de trabajo <span className="text-[#ff5460]">*</span>
          </label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(event) => set('email', event.target.value)}
            placeholder="ana@empresa.com"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#ff5460] focus:outline-none focus:ring-2 focus:ring-[#ff5460]/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Empresa <span className="text-[#ff5460]">*</span>
          </label>
          <input
            type="text"
            required
            value={form.companyName}
            onChange={(event) => set('companyName', event.target.value)}
            placeholder="Mi empresa S.L."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#ff5460] focus:outline-none focus:ring-2 focus:ring-[#ff5460]/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Telefono directo
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(event) => set('phone', event.target.value)}
            placeholder="+34 600 000 000"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#ff5460] focus:outline-none focus:ring-2 focus:ring-[#ff5460]/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            CIF / NIF <span className="text-[#ff5460]">*</span>
          </label>
          <input
            type="text"
            required
            value={form.cif}
            onChange={(event) => set('cif', event.target.value)}
            placeholder="B12345678"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#ff5460] focus:outline-none focus:ring-2 focus:ring-[#ff5460]/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Rol en la empresa <span className="text-[#ff5460]">*</span>
          </label>
          <input
            type="text"
            required
            value={form.role}
            onChange={(event) => set('role', event.target.value)}
            placeholder="Direccion, finanzas, operaciones..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#ff5460] focus:outline-none focus:ring-2 focus:ring-[#ff5460]/20"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
          Sector de actividad <span className="text-[#ff5460]">*</span>
        </label>
        <input
          type="text"
          required
          value={form.sector}
          onChange={(event) => set('sector', event.target.value)}
          placeholder="Servicios, retail, construccion, agencia..."
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#ff5460] focus:outline-none focus:ring-2 focus:ring-[#ff5460]/20"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
          Que quieres validar en la prueba <span className="text-[#ff5460]">*</span>
        </label>
        <textarea
          required
          rows={4}
          value={form.message}
          onChange={(event) => set('message', event.target.value)}
          placeholder="Cuadros de mando, lectura contable, cobros, validacion del flujo con tu equipo..."
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#ff5460] focus:outline-none focus:ring-2 focus:ring-[#ff5460]/20"
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3">
        <input
          type="checkbox"
          required
          checked={form.consent}
          onChange={(event) => set('consent', event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#ff5460]"
        />
        <span className="text-xs leading-5 text-slate-500">
          Acepto el tratamiento de mis datos para gestionar esta solicitud conforme a la{' '}
          <a href="/privacy" className="underline hover:text-slate-700">
            politica de privacidad
          </a>{' '}
          y el{' '}
          <a href="/dpa" className="underline hover:text-slate-700">
            DPA
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
        className="inline-flex w-full items-center justify-center rounded-full bg-[#ff5460] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#ef4654] disabled:opacity-60"
      >
        {status === 'loading' ? 'Enviando...' : 'Solicitar prueba gratuita'}
      </button>
    </form>
  );
}
