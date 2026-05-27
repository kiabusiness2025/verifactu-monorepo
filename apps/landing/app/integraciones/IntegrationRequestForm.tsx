'use client';

import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { useState } from 'react';

const KNOWN_SOFTWARE = [
  { id: 'revo', label: 'Revo XEF', sector: 'Restaurantes' },
  { id: 'gesden', label: 'Gesden', sector: 'Dental' },
  { id: 'mindbody', label: 'Mindbody', sector: 'Gimnasios' },
  { id: 'inmovilla', label: 'Inmovilla', sector: 'Inmobiliaria' },
  { id: 'cliniccloud', label: 'ClinicCloud', sector: 'Clínicas' },
  { id: 'loyverse', label: 'Loyverse', sector: 'Retail' },
  { id: 'prestashop', label: 'PrestaShop', sector: 'E-commerce' },
  { id: 'agora', label: 'Ágora POS', sector: 'Restaurantes' },
  { id: 'glofox', label: 'Glofox', sector: 'Gimnasios' },
  { id: 'avaibook', label: 'AvaiBook', sector: 'Alojamiento' },
  { id: 'teamup', label: 'TeamUp', sector: 'Deporte' },
  { id: 'witei', label: 'Witei', sector: 'Inmobiliaria' },
];

type FormState = 'idle' | 'submitting' | 'success' | 'error';

export default function IntegrationRequestForm() {
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [selectedSoftware, setSelectedSoftware] = useState<string[]>([]);
  const [otherSoftware, setOtherSoftware] = useState('');
  const [summary, setSummary] = useState('');
  const [state, setState] = useState<FormState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function toggleSoftware(id: string) {
    setSelectedSoftware((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState('submitting');
    setErrorMsg('');

    const systems = [
      ...KNOWN_SOFTWARE.filter((s) => selectedSoftware.includes(s.id)).map((s) => s.label),
      ...(otherSoftware.trim() ? [otherSoftware.trim()] : []),
    ];

    const softwareLabel = systems.length > 0 ? systems.join(', ') : 'Software personalizado';

    try {
      const res = await fetch('/api/custom-integration-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName,
          contactEmail,
          contactPhone: contactPhone || undefined,
          companyName: companyName || undefined,
          title: `Solicitud integración: ${softwareLabel}`,
          summary: summary || `Integración con ${softwareLabel}`,
          requestedSystems: systems,
          urgency: 'medium',
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Error ${res.status}`);
      }

      setState('success');
    } catch (err) {
      setState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Error inesperado');
    }
  }

  if (state === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-8 py-12 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        <h3 className="text-lg font-bold text-slate-900">Solicitud recibida</h3>
        <p className="max-w-sm text-sm text-slate-600">
          Te contactamos en menos de 48h para hablar de la integración. Si tienes urgencia,
          escríbenos a{' '}
          <a href="mailto:info@verifactu.business" className="font-medium text-[#2361d8]">
            info@verifactu.business
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {/* Software selector */}
      <div>
        <p className="text-sm font-semibold text-slate-800">¿Qué software usas?</p>
        <p className="mt-1 text-xs text-slate-500">
          Selecciona uno o varios. Si no aparece, escríbelo abajo.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {KNOWN_SOFTWARE.map((sw) => {
            const active = selectedSoftware.includes(sw.id);
            return (
              <button
                key={sw.id}
                type="button"
                onClick={() => toggleSoftware(sw.id)}
                className={`flex flex-col rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                  active
                    ? 'border-[#2361d8] bg-[#2361d8]/5 text-[#2361d8]'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <span className="font-semibold">{sw.label}</span>
                <span className={`mt-0.5 ${active ? 'text-[#2361d8]/70' : 'text-slate-400'}`}>
                  {sw.sector}
                </span>
              </button>
            );
          })}
        </div>
        <input
          type="text"
          value={otherSoftware}
          onChange={(e) => setOtherSoftware(e.target.value)}
          placeholder="Otro software (ej: Doctoralia, Agora...)"
          className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm placeholder-slate-400 focus:border-[#2361d8] focus:outline-none"
        />
      </div>

      {/* What do you need */}
      <div>
        <label className="text-sm font-semibold text-slate-800">
          ¿Qué necesitas de la integración?
        </label>
        <textarea
          rows={3}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Ej: Quiero que Isaak vea mis cierres de caja de Revo y me calcule el IVA trimestral automáticamente."
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm placeholder-slate-400 focus:border-[#2361d8] focus:outline-none"
        />
      </div>

      {/* Contact info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold text-slate-800">
            Nombre <span className="text-rose-500">*</span>
          </label>
          <input
            required
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Ana García"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm placeholder-slate-400 focus:border-[#2361d8] focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-800">
            Email <span className="text-rose-500">*</span>
          </label>
          <input
            required
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="ana@miempresa.es"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm placeholder-slate-400 focus:border-[#2361d8] focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-800">
            Empresa <span className="text-slate-400 font-normal">(opcional)</span>
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Restaurante El Patio S.L."
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm placeholder-slate-400 focus:border-[#2361d8] focus:outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-800">
            Teléfono <span className="text-slate-400 font-normal">(opcional)</span>
          </label>
          <input
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="+34 600 000 000"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm placeholder-slate-400 focus:border-[#2361d8] focus:outline-none"
          />
        </div>
      </div>

      {state === 'error' && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMsg || 'No se pudo enviar la solicitud. Inténtalo de nuevo.'}
        </p>
      )}

      <button
        type="submit"
        disabled={state === 'submitting'}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-[#2361d8] px-8 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#1f55c0] disabled:opacity-60 sm:w-auto"
      >
        {state === 'submitting' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Enviando…
          </>
        ) : (
          <>
            Solicitar integración
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      <p className="text-xs text-slate-400">
        Respondemos en menos de 48h · Sin compromiso · Te contactamos para evaluar el caso de uso.
      </p>
    </form>
  );
}
