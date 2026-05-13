'use client';

import { useState } from 'react';

type ContactFormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
  consent: boolean;
};

const SUBJECT_OPTIONS = [
  { value: '', label: 'Selecciona un asunto' },
  { value: 'claude', label: 'Conector Claude (MCP)' },
  { value: 'chatgpt', label: 'Conector ChatGPT' },
  { value: 'servicios', label: 'Servicios y migración' },
  { value: 'formacion', label: 'Formación en Holded' },
  { value: 'demo', label: 'Demo gratuita de Holded' },
  { value: 'otro', label: 'Otro' },
];

const initialState: ContactFormState = {
  name: '',
  email: '',
  subject: '',
  message: '',
  consent: false,
};

export default function ContactForm() {
  const [form, setForm] = useState<ContactFormState>(initialState);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function set<K extends keyof ContactFormState>(field: K, value: ContactFormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const response = await fetch('/api/communications/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
      setErrorMsg('No hemos podido enviar el mensaje. Comprueba tu conexion.');
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
        <p className="text-base font-semibold text-emerald-800">Mensaje enviado</p>
        <p className="mt-1 text-sm leading-6 text-emerald-700">
          Te hemos enviado una confirmacion por email. Te responderemos lo antes posible.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="contact-subject"
          className="mb-1.5 block text-sm font-semibold text-slate-700"
        >
          Asunto <span className="text-[#ff5460]">*</span>
        </label>
        <select
          id="contact-subject"
          required
          value={form.subject}
          onChange={(event) => set('subject', event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-[#ff5460] focus:outline-none focus:ring-2 focus:ring-[#ff5460]/20"
        >
          {SUBJECT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.value === ''}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Nombre <span className="text-[#ff5460]">*</span>
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(event) => set('name', event.target.value)}
            placeholder="Ana Garcia"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#ff5460] focus:outline-none focus:ring-2 focus:ring-[#ff5460]/20"
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
            onChange={(event) => set('email', event.target.value)}
            placeholder="ana@empresa.com"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#ff5460] focus:outline-none focus:ring-2 focus:ring-[#ff5460]/20"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
          Mensaje <span className="text-[#ff5460]">*</span>
        </label>
        <textarea
          required
          rows={5}
          value={form.message}
          onChange={(event) => set('message', event.target.value)}
          placeholder="Dinos en que punto estas y que necesitas."
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
        {status === 'loading' ? 'Enviando...' : 'Enviar mensaje'}
      </button>
    </form>
  );
}
