'use client';

import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileBadge2,
  Phone,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  CNAE_SECTION_OPTIONS,
  HOLDED_ROLE_OPTIONS,
  isLikelySpanishPhone,
  isValidEmail,
  isValidSpanishTaxId,
} from '@verifactu/utils';

type ModalType = 'contact' | 'holded_trial' | null;

type ContactFormState = {
  name: string;
  email: string;
  companyName: string;
  phone: string;
};

type TrialFormState = {
  name: string;
  email: string;
  taxId: string;
  roleInCompany: string;
  businessSectorCode: string;
};

const emptyContactForm: ContactFormState = {
  name: '',
  email: '',
  companyName: '',
  phone: '',
};

const emptyTrialForm: TrialFormState = {
  name: '',
  email: '',
  taxId: '',
  roleInCompany: '',
  businessSectorCode: '',
};

export default function HomeLeadSection() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [contactForm, setContactForm] = useState(emptyContactForm);
  const [trialForm, setTrialForm] = useState(emptyTrialForm);
  const [contactError, setContactError] = useState('');
  const [trialError, setTrialError] = useState('');
  const [contactSuccess, setContactSuccess] = useState('');
  const [trialSuccess, setTrialSuccess] = useState('');
  const [contactLoading, setContactLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);

  useEffect(() => {
    if (!activeModal) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveModal(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeModal]);

  const trialSectorLabel = useMemo(
    () =>
      CNAE_SECTION_OPTIONS.find((option) => option.value === trialForm.businessSectorCode)?.label ||
      '',
    [trialForm.businessSectorCode]
  );

  async function handleContactSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setContactError('');
    setContactSuccess('');

    const trimmedPhone = contactForm.phone.trim();
    if (!contactForm.name.trim()) {
      setContactError('Indica tu nombre y apellidos.');
      return;
    }
    if (!isValidEmail(contactForm.email.trim().toLowerCase())) {
      setContactError('Revisa el correo antes de continuar.');
      return;
    }
    if (!contactForm.companyName.trim()) {
      setContactError('Indica el nombre de la empresa.');
      return;
    }
    if (trimmedPhone && !isLikelySpanishPhone(trimmedPhone)) {
      setContactError('El telefono no parece valido para Espana.');
      return;
    }

    setContactLoading(true);
    try {
      const res = await fetch('/api/send-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'No he podido guardar tus datos.');
      }

      setContactSuccess('Hemos recibido tus datos. Te escribimos en breve.');
      setContactForm(emptyContactForm);
    } catch (error) {
      setContactError(error instanceof Error ? error.message : 'No he podido guardar tus datos.');
    } finally {
      setContactLoading(false);
    }
  }

  async function handleTrialSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTrialError('');
    setTrialSuccess('');

    const trimmedTaxId = trialForm.taxId.trim();
    if (!trialForm.name.trim()) {
      setTrialError('Indica tu nombre y apellidos.');
      return;
    }
    if (!isValidEmail(trialForm.email.trim().toLowerCase())) {
      setTrialError('Revisa el correo antes de continuar.');
      return;
    }
    if (trimmedTaxId && !isValidSpanishTaxId(trimmedTaxId)) {
      setTrialError('El CIF / NIF no es valido.');
      return;
    }

    setTrialLoading(true);
    try {
      const res = await fetch('/api/holded-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...trialForm,
          taxId: trimmedTaxId || null,
          roleInCompany: trialForm.roleInCompany || null,
          businessSectorCode: trialForm.businessSectorCode || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'No he podido registrar la solicitud.');
      }

      setTrialSuccess('Solicitud recibida. Revisamos tu caso y te contactamos enseguida.');
      setTrialForm(emptyTrialForm);
    } catch (error) {
      setTrialError(
        error instanceof Error ? error.message : 'No he podido registrar la solicitud.'
      );
    } finally {
      setTrialLoading(false);
    }
  }

  return (
    <>
      <section className="border-y border-slate-200 bg-[#f7fbff] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_40px_120px_-70px_rgba(15,23,42,0.45)] sm:p-8 lg:p-10">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr_0.9fr]">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#2361d8]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
                  <ShieldCheck className="h-4 w-4" />
                  Entrada guiada
                </div>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#011c67] sm:text-4xl">
                  Elige el camino que mejor encaja contigo
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-600">
                  Si quieres hablar con nosotros, deja tus datos. Si ya vienes por Holded, prepara
                  la solicitud y lo enlazamos con tu ficha desde el primer momento.
                </p>
                <div className="mt-6 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    Guardamos tu contacto y tu empresa en la base de trabajo.
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    Validamos correo, movil y CIF con la misma lógica del conector.
                  </div>
                </div>
              </div>

              <article className="rounded-[1.75rem] border border-slate-200 bg-[#fbfdff] p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2361d8]/10 text-[#2361d8]">
                    <Phone className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-[#011c67]">Hablar con el equipo</h3>
                    <p className="text-sm text-slate-500">
                      Contacto comercial o primera toma de datos
                    </p>
                  </div>
                </div>
                <ul className="mt-5 space-y-3 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-[#2361d8]" />
                    Nombre y apellidos
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Email
                  </li>
                  <li className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#2361d8]" />
                    Nombre de empresa
                  </li>
                  <li className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-[#2361d8]" />
                    Telefono
                  </li>
                </ul>
                <button
                  type="button"
                  onClick={() => setActiveModal('contact')}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2361d8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1f55c0]"
                >
                  Abrir formulario
                  <ArrowRight className="h-4 w-4" />
                </button>
              </article>

              <article className="rounded-[1.75rem] border border-slate-200 bg-[#fffaf4] p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <FileBadge2 className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-[#011c67]">
                      Solicitar prueba gratuita de Holded
                    </h3>
                    <p className="text-sm text-slate-500">Alta guiada con datos fiscales básicos</p>
                  </div>
                </div>
                <ul className="mt-5 space-y-3 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-amber-700" />
                    Nombre y apellidos
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Email
                  </li>
                  <li className="flex items-center gap-2">
                    <FileBadge2 className="h-4 w-4 text-amber-700" />
                    CIF / NIF
                  </li>
                  <li className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-amber-700" />
                    Rol y sector CNAE
                  </li>
                </ul>
                <button
                  type="button"
                  onClick={() => setActiveModal('holded_trial')}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-amber-300 bg-white px-5 py-3 text-sm font-semibold text-amber-800 transition hover:bg-amber-50"
                >
                  Solicitar prueba
                  <ArrowRight className="h-4 w-4" />
                </button>
              </article>
            </div>
          </div>
        </div>
      </section>

      {activeModal === 'contact' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-8"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="relative w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_55px_140px_-70px_rgba(15,23,42,0.6)] sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 rounded-full border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50"
              aria-label="Cerrar formulario"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
                Contacto inicial
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-[#011c67]">
                Cuéntanos quién eres y qué empresa representas
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Guardamos esta información en tu ficha para que el siguiente paso sea más directo.
              </p>
            </div>
            <form className="mt-6 grid gap-4" onSubmit={handleContactSubmit}>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Nombre y apellidos *
                <input
                  value={contactForm.name}
                  onChange={(event) => setContactForm({ ...contactForm, name: event.target.value })}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-[#2361d8]"
                  placeholder="Tu nombre completo"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Email *
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(event) =>
                    setContactForm({ ...contactForm, email: event.target.value })
                  }
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-[#2361d8]"
                  placeholder="nombre@empresa.com"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Nombre de empresa *
                <input
                  value={contactForm.companyName}
                  onChange={(event) =>
                    setContactForm({ ...contactForm, companyName: event.target.value })
                  }
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-[#2361d8]"
                  placeholder="Nombre legal o comercial"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Telefono
                <input
                  type="tel"
                  value={contactForm.phone}
                  onChange={(event) =>
                    setContactForm({ ...contactForm, phone: event.target.value })
                  }
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-[#2361d8]"
                  placeholder="600 123 123"
                />
              </label>
              {contactError ? <p className="text-sm text-rose-600">{contactError}</p> : null}
              {contactSuccess ? (
                <p className="text-sm font-medium text-emerald-600">{contactSuccess}</p>
              ) : null}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  disabled={contactLoading}
                  className="inline-flex items-center justify-center rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1f55c0] disabled:opacity-60"
                >
                  {contactLoading ? 'Guardando...' : 'Enviar datos'}
                </button>
                <p className="text-xs text-slate-500">
                  Solo te pedimos lo necesario para darte contexto desde el primer contacto.
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === 'holded_trial' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-8"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="relative w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_55px_140px_-70px_rgba(15,23,42,0.6)] sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 rounded-full border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50"
              aria-label="Cerrar formulario"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                Prueba gratuita de Holded
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-[#011c67]">
                Déjanos los datos fiscales básicos y preparamos tu entrada
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Usamos el mismo criterio de validación que el conector para evitar errores de base.
              </p>
            </div>
            <form className="mt-6 grid gap-4" onSubmit={handleTrialSubmit}>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Nombre y apellidos *
                <input
                  value={trialForm.name}
                  onChange={(event) => setTrialForm({ ...trialForm, name: event.target.value })}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-amber-500"
                  placeholder="Tu nombre completo"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Email *
                <input
                  type="email"
                  value={trialForm.email}
                  onChange={(event) => setTrialForm({ ...trialForm, email: event.target.value })}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-amber-500"
                  placeholder="nombre@empresa.com"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                CIF / NIF
                <input
                  value={trialForm.taxId}
                  onChange={(event) => setTrialForm({ ...trialForm, taxId: event.target.value })}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-amber-500"
                  placeholder="B12345678"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Rol en la empresa
                <select
                  value={trialForm.roleInCompany}
                  onChange={(event) =>
                    setTrialForm({ ...trialForm, roleInCompany: event.target.value })
                  }
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-amber-500"
                >
                  <option value="">Selecciona tu rol</option>
                  {HOLDED_ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Sector de actividad (categoria CNAE)
                <select
                  value={trialForm.businessSectorCode}
                  onChange={(event) =>
                    setTrialForm({ ...trialForm, businessSectorCode: event.target.value })
                  }
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-amber-500"
                >
                  <option value="">Selecciona tu sector</option>
                  {CNAE_SECTION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {trialSectorLabel ? (
                <p className="text-xs text-slate-500">Sector seleccionado: {trialSectorLabel}</p>
              ) : null}
              {trialError ? <p className="text-sm text-rose-600">{trialError}</p> : null}
              {trialSuccess ? (
                <p className="text-sm font-medium text-emerald-600">{trialSuccess}</p>
              ) : null}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  disabled={trialLoading}
                  className="inline-flex items-center justify-center rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:opacity-60"
                >
                  {trialLoading ? 'Guardando...' : 'Solicitar prueba'}
                </button>
                <p className="text-xs text-slate-500">
                  Si no indicas CIF o sector, podremos completar esos datos después.
                </p>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
