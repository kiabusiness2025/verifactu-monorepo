'use client';

import { Loader2, MailCheck, PhoneCall, UserRound } from 'lucide-react';
import { FormEvent, useState } from 'react';

export default function HoldedLeadForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/communications/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          companyName,
          phone,
          consent,
          source: 'holded_home_free_flow',
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof payload?.error === 'string'
            ? payload.error
            : 'No hemos podido registrar tus datos ahora mismo.'
        );
      }

      setSuccess(
        typeof payload?.message === 'string'
          ? payload.message
          : 'Listo. Revisa tu correo para continuar con onboarding.'
      );
      setName('');
      setEmail('');
      setCompanyName('');
      setPhone('');
      setConsent(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No hemos podido guardar tu solicitud ahora mismo.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm font-semibold text-slate-800">Nombre</span>
          <div className="flex h-12 items-center gap-2 rounded-2xl border border-slate-300 bg-white px-3">
            <UserRound className="h-4 w-4 text-slate-400" />
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              placeholder="Tu nombre"
              className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none"
            />
          </div>
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-semibold text-slate-800">Email de trabajo</span>
          <div className="flex h-12 items-center gap-2 rounded-2xl border border-slate-300 bg-white px-3">
            <MailCheck className="h-4 w-4 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="tu@empresa.com"
              className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none"
            />
          </div>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm font-semibold text-slate-800">Empresa a conectar</span>
          <input
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            required
            placeholder="Nombre de tu empresa"
            className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#ff5460]"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-semibold text-slate-800">Teléfono (opcional)</span>
          <div className="flex h-12 items-center gap-2 rounded-2xl border border-slate-300 bg-white px-3">
            <PhoneCall className="h-4 w-4 text-slate-400" />
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+34 ..."
              className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none"
            />
          </div>
        </label>
      </div>

      <label className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#ff5460]"
        />
        <span>
          Acepto que verifactu.business me contacte para activar y dar soporte del onboarding.
        </span>
      </label>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5460] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ef4654] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {loading ? 'Enviando...' : 'Empezar gratis sin registro'}
      </button>
    </form>
  );
}
