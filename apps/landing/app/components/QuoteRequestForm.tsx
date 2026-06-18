'use client';

import { useState } from 'react';

const INTEGRATIONS = [
  'ERP propio',
  'Sage',
  'A3',
  'SAP',
  'API custom',
  'Multiusuario/roles avanzados',
  'SLA',
];

export default function QuoteRequestForm() {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [invoices, setInvoices] = useState('');
  const [movements, setMovements] = useState('');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const toggleIntegration = (label: string) => {
    setSelected((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/quote-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          company,
          invoicesPerMonth: Number(invoices),
          movementsPerMonth: Number(movements),
          integrations: selected,
          message: message || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMsg(body.error || 'Error al enviar la solicitud. Inténtalo de nuevo.');
        setStatus('error');
        return;
      }

      setStatus('success');
    } catch {
      setErrorMsg('Error de conexión. Inténtalo de nuevo.');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <div className="mb-3 text-3xl">✅</div>
        <h3 className="mb-2 text-lg font-bold text-slate-900">Solicitud enviada</h3>
        <p className="text-sm text-slate-600">
          Hemos recibido tu solicitud y te hemos enviado un acuse de recibo a{' '}
          <strong>{email}</strong>. Nuestro equipo comercial te contactará en 24–48 horas.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="text-sm font-semibold text-slate-700">Email</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          placeholder="tu@email.com"
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-slate-700">Empresa</label>
        <input
          required
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          placeholder="Nombre de la empresa"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold text-slate-700">Facturas/mes</label>
          <input
            required
            type="number"
            value={invoices}
            onChange={(e) => setInvoices(e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            placeholder="Ej: 800"
            min={1}
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Movimientos/mes</label>
          <input
            required
            type="number"
            value={movements}
            onChange={(e) => setMovements(e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            placeholder="Ej: 1500"
            min={1}
          />
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-slate-700">Integraciones</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {INTEGRATIONS.map((label) => (
            <label key={label} className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={selected.includes(label)}
                onChange={() => toggleIntegration(label)}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-slate-700">Mensaje</label>
        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          placeholder="Cuéntanos en pocas líneas..."
        />
      </div>

      {status === 'error' && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="rounded-lg bg-primary px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-primary-light disabled:opacity-60"
      >
        {status === 'loading' ? 'Enviando...' : 'Enviar solicitud'}
      </button>

      <p className="text-xs text-slate-500">
        Recibirás un acuse de recibo en tu email. Te responderemos en 24–48 horas.
      </p>
    </form>
  );
}
