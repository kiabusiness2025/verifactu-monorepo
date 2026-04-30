'use client';

import { useMemo, useState } from 'react';

type InvestorInterest =
  | 'Inversion'
  | 'Partnership'
  | 'Asesoria o piloto'
  | 'Integracion tecnologica'
  | 'Otro';

type InvestorFormState = {
  name: string;
  email: string;
  companyOrFund: string;
  interestType: InvestorInterest;
  ticketOrCollab: string;
  message: string;
  linkedinOrWeb: string;
};

const initialForm: InvestorFormState = {
  name: '',
  email: '',
  companyOrFund: '',
  interestType: 'Inversion',
  ticketOrCollab: '',
  message: '',
  linkedinOrWeb: '',
};

function isValidEmail(email: string): boolean {
  return /.+@.+\..+/.test(email);
}

export default function InvestorContactForm() {
  const [form, setForm] = useState<InvestorFormState>(initialForm);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const canSubmit = useMemo(() => {
    return Boolean(form.name.trim()) && isValidEmail(form.email.trim());
  }, [form.email, form.name]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || status === 'sending') return;

    setStatus('sending');
    setError('');

    const message = [
      'Interes de inversor / partner desde pagina publica de inversores',
      `Tipo de interes: ${form.interestType}`,
      `Empresa o fondo: ${form.companyOrFund || '-'}`,
      `Ticket o colaboracion: ${form.ticketOrCollab || '-'}`,
      `LinkedIn o web: ${form.linkedinOrWeb || '-'}`,
      `Mensaje: ${form.message || '-'}`,
    ].join('\n');

    try {
      const response = await fetch('/api/send-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          company: form.companyOrFund.trim() || undefined,
          message,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo enviar la solicitud.');
      }

      setStatus('success');
      setForm(initialForm);
    } catch (submitError) {
      setStatus('error');
      setError(
        submitError instanceof Error ? submitError.message : 'No se pudo enviar la solicitud.'
      );
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
          Nombre
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#2361d8]"
            placeholder="Nombre completo"
            autoComplete="name"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
          Email
          <input
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#2361d8]"
            placeholder="nombre@empresa.com"
            autoComplete="email"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
          Empresa / fondo
          <input
            value={form.companyOrFund}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, companyOrFund: event.target.value }))
            }
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#2361d8]"
            placeholder="Nombre de empresa o fondo"
            autoComplete="organization"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
          Tipo de interes
          <select
            value={form.interestType}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, interestType: event.target.value as InvestorInterest }))
            }
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#2361d8]"
          >
            <option>Inversion</option>
            <option>Partnership</option>
            <option>Asesoria o piloto</option>
            <option>Integracion tecnologica</option>
            <option>Otro</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
          Ticket aproximado / tipo de colaboracion
          <input
            value={form.ticketOrCollab}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, ticketOrCollab: event.target.value }))
            }
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#2361d8]"
            placeholder="Ej: ticket, partnership, piloto o advisory"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
          LinkedIn / web
          <input
            value={form.linkedinOrWeb}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, linkedinOrWeb: event.target.value }))
            }
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#2361d8]"
            placeholder="https://linkedin.com/... o web"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
          Mensaje
          <textarea
            value={form.message}
            onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
            className="min-h-32 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#2361d8]"
            placeholder="Comparte el contexto de tu interes"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={!canSubmit || status === 'sending' || status === 'success'}
        className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1f55c0] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'sending'
          ? 'Enviando solicitud...'
          : status === 'success'
            ? 'Solicitud recibida'
            : 'Solicitar investor brief'}
      </button>

      {status === 'error' ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      {status === 'success' ? (
        <p className="mt-3 text-sm text-emerald-700">
          Gracias. El equipo fundador revisara tu solicitud y te contactara.
        </p>
      ) : null}
    </form>
  );
}
