'use client';

// V1.2 — Bloque "Solicita prueba gratuita de Holded".
//
// Pensado para visitantes que aún no tienen Holded contratado y se topan
// con el plan Pro (que requiere Holded). El formulario llega por email
// a soporte vía /api/holded-trial; nosotros enlazamos al partner Holded.

import { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Mail,
  Sparkles,
  User,
} from 'lucide-react';

type FormState = {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  companySize: '' | 'solo' | '1-5' | '6-20' | '21-50' | '50+';
  notes: string;
};

const initial: FormState = {
  name: '',
  email: '',
  phone: '',
  companyName: '',
  companySize: '',
  notes: '',
};

const SIZE_OPTIONS = [
  { value: 'solo', label: 'Autónomo / unipersonal' },
  { value: '1-5', label: '1-5 empleados' },
  { value: '6-20', label: '6-20 empleados' },
  { value: '21-50', label: '21-50 empleados' },
  { value: '50+', label: 'Más de 50 empleados' },
];

export default function HoldedTrialFormSection() {
  const [form, setForm] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleChange = (key: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/holded-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'No pudimos enviar tu solicitud. Inténtalo más tarde.');
        return;
      }
      setDone(true);
    } catch {
      setError('Error de red. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="solicitar-holded"
      className="bg-[linear-gradient(180deg,#f5f9ff_0%,#ffffff_100%)] py-16 scroll-mt-16"
    >
      <div className="mx-auto max-w-3xl px-5">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/15 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
            <Sparkles className="h-3 w-3" />
            ¿No tienes Holded todavía?
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
            Solicita una prueba gratuita
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Holded es el ERP que usa Isaak para tu contabilidad y facturación.
            Si aún no lo tienes contratado, déjanos tus datos y te conectamos
            con su equipo para una <strong>prueba sin compromiso</strong>.
          </p>
        </div>

        {done ? (
          <div className="mx-auto mt-10 max-w-xl rounded-3xl border border-emerald-200 bg-emerald-50/60 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-[#011c67]">¡Solicitud recibida!</h3>
            <p className="mt-2 text-sm text-slate-600">
              Te contactaremos en menos de 24 horas con los pasos para activar tu
              prueba de Holded. Mientras tanto, puedes seguir explorando Isaak.
            </p>
            <button
              type="button"
              onClick={() => {
                setForm(initial);
                setDone(false);
              }}
              className="mt-5 text-xs font-medium text-[#2361d8] hover:underline"
            >
              Enviar otra solicitud
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-10 max-w-xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700">
                  Nombre <span className="text-rose-600">*</span>
                </label>
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-[#2361d8]">
                  <User className="h-4 w-4 flex-shrink-0 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={handleChange('name')}
                    placeholder="Tu nombre"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Email <span className="text-rose-600">*</span>
                </label>
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-[#2361d8]">
                  <Mail className="h-4 w-4 flex-shrink-0 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={handleChange('email')}
                    placeholder="tu@empresa.com"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Teléfono</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={handleChange('phone')}
                  placeholder="+34 600 000 000"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-[#2361d8]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Empresa</label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={handleChange('companyName')}
                  placeholder="Nombre de tu empresa"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-[#2361d8]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Tamaño</label>
                <select
                  value={form.companySize}
                  onChange={handleChange('companySize')}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#2361d8]"
                >
                  <option value="">— Selecciona —</option>
                  {SIZE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700">
                  ¿Algo que debamos saber?
                </label>
                <textarea
                  value={form.notes}
                  onChange={handleChange('notes')}
                  rows={3}
                  maxLength={1000}
                  placeholder="Cuéntanos brevemente tu situación (opcional)"
                  className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-[#2361d8]"
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2361d8] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f55c0] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando…
                </>
              ) : (
                <>
                  Solicitar prueba de Holded
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <p className="mt-3 text-center text-[11px] text-slate-500">
              Te respondemos en menos de 24h · Sin compromiso · No compartimos tus datos
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
