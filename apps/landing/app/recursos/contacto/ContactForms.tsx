'use client';

import Image from 'next/image';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileBadge2,
  LifeBuoy,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import {
  CNAE_SECTION_OPTIONS,
  HOLDED_ROLE_OPTIONS,
  isLikelySpanishPhone,
  isValidEmail,
  isValidSpanishTaxId,
} from '@verifactu/utils';
import { useAuth } from '../../context/AuthContext';

type FormStatus = 'idle' | 'loading' | 'success' | 'error';

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

type TicketFormState = {
  name: string;
  email: string;
  company: string;
  product: string;
  category: string;
  priority: string;
  subject: string;
  description: string;
  url: string;
  attachments: File[];
};

const MAX_FILES = 3;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const inputClassName =
  'rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-[#2361d8]';
const amberInputClassName =
  'rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-amber-500';
const fieldLabelClassName = 'grid gap-2 text-sm font-medium text-slate-700';

const emptyContact: ContactFormState = {
  name: '',
  email: '',
  companyName: '',
  phone: '',
};

const emptyTrial: TrialFormState = {
  name: '',
  email: '',
  taxId: '',
  roleInCompany: '',
  businessSectorCode: '',
};

const emptyTicket: TicketFormState = {
  name: '',
  email: '',
  company: '',
  product: 'Verifactu Business',
  category: 'Facturacion',
  priority: 'Media',
  subject: '',
  description: '',
  url: '',
  attachments: [],
};

function buildTicketDefaults(user: { displayName?: string | null; email?: string | null } | null) {
  return {
    ...emptyTicket,
    name: user?.displayName || '',
    email: user?.email || '',
  };
}

export default function ContactForms() {
  const { user } = useAuth();
  const [contactForm, setContactForm] = useState<ContactFormState>(emptyContact);
  const [trialForm, setTrialForm] = useState<TrialFormState>(emptyTrial);
  const [ticketForm, setTicketForm] = useState<TicketFormState>(buildTicketDefaults(user));
  const [contactStatus, setContactStatus] = useState<FormStatus>('idle');
  const [trialStatus, setTrialStatus] = useState<FormStatus>('idle');
  const [ticketStatus, setTicketStatus] = useState<FormStatus>('idle');
  const [contactError, setContactError] = useState('');
  const [trialError, setTrialError] = useState('');
  const [ticketError, setTicketError] = useState('');
  const [attachmentError, setAttachmentError] = useState('');
  const isNameLocked = Boolean(user?.displayName);
  const isEmailLocked = Boolean(user?.email);

  useEffect(() => {
    if (!user) return;

    setContactForm((prev) => ({
      ...prev,
      name: prev.name || user.displayName || '',
      email: prev.email || user.email || '',
    }));
    setTrialForm((prev) => ({
      ...prev,
      name: prev.name || user.displayName || '',
      email: prev.email || user.email || '',
    }));
    setTicketForm((prev) => ({
      ...prev,
      name: user.displayName || prev.name,
      email: user.email || prev.email,
    }));
  }, [user]);

  const totalAttachmentBytes = ticketForm.attachments.reduce((sum, file) => sum + file.size, 0);

  const selectedSectorLabel = useMemo(
    () =>
      CNAE_SECTION_OPTIONS.find((option) => option.value === trialForm.businessSectorCode)?.label ||
      '',
    [trialForm.businessSectorCode]
  );

  async function handleContactSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setContactStatus('loading');
    setContactError('');

    const trimmedPhone = contactForm.phone.trim();

    if (!contactForm.name.trim()) {
      setContactStatus('error');
      setContactError('Indica tu nombre y apellidos.');
      return;
    }

    if (!isValidEmail(contactForm.email.trim().toLowerCase())) {
      setContactStatus('error');
      setContactError('Revisa el correo antes de continuar.');
      return;
    }

    if (!contactForm.companyName.trim()) {
      setContactStatus('error');
      setContactError('Indica el nombre de la empresa.');
      return;
    }

    if (trimmedPhone && !isLikelySpanishPhone(trimmedPhone)) {
      setContactStatus('error');
      setContactError('El telefono no parece valido para Espana.');
      return;
    }

    try {
      const res = await fetch('/api/send-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo enviar el formulario.');
      }

      setContactStatus('success');
      setContactForm((prev) => ({
        ...emptyContact,
        name: user?.displayName || '',
        email: user?.email || '',
        phone: '',
        companyName: '',
      }));
    } catch (error) {
      setContactStatus('error');
      setContactError(error instanceof Error ? error.message : 'No se pudo enviar el formulario.');
    }
  }

  async function handleTrialSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTrialStatus('loading');
    setTrialError('');

    const trimmedTaxId = trialForm.taxId.trim();

    if (!trialForm.name.trim()) {
      setTrialStatus('error');
      setTrialError('Indica tu nombre y apellidos.');
      return;
    }

    if (!isValidEmail(trialForm.email.trim().toLowerCase())) {
      setTrialStatus('error');
      setTrialError('Revisa el correo antes de continuar.');
      return;
    }

    if (trimmedTaxId && !isValidSpanishTaxId(trimmedTaxId)) {
      setTrialStatus('error');
      setTrialError('El CIF / NIF no es valido.');
      return;
    }

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
        throw new Error(data?.error || 'No se pudo registrar la solicitud.');
      }

      setTrialStatus('success');
      setTrialForm({
        ...emptyTrial,
        name: user?.displayName || '',
        email: user?.email || '',
      });
    } catch (error) {
      setTrialStatus('error');
      setTrialError(error instanceof Error ? error.message : 'No se pudo registrar la solicitud.');
    }
  }

  async function handleTicketSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTicketStatus('loading');
    setTicketError('');

    try {
      const formData = new FormData();
      formData.append('name', ticketForm.name);
      formData.append('email', ticketForm.email);
      formData.append('company', ticketForm.company);
      formData.append('product', ticketForm.product);
      formData.append('category', ticketForm.category);
      formData.append('priority', ticketForm.priority);
      formData.append('subject', ticketForm.subject);
      formData.append('description', ticketForm.description);
      formData.append('url', ticketForm.url);

      ticketForm.attachments.forEach((file) => {
        formData.append('attachments', file, file.name);
      });

      const res = await fetch('/api/support-ticket', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo enviar el ticket.');
      }

      setTicketStatus('success');
      setTicketForm(buildTicketDefaults(user));
    } catch (error) {
      setTicketStatus('error');
      setTicketError(error instanceof Error ? error.message : 'No se pudo enviar el ticket.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2361d8]/10 text-[#2361d8]">
              <Phone className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
                Contacto inicial
              </p>
              <h2 className="mt-1 text-xl font-semibold text-[#011c67]">Hablar con el equipo</h2>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Para una primera conversacion comercial o para ordenar tu caso antes de empezar.
          </p>
          <ul className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            <li className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
              <UserRound className="h-4 w-4 text-[#2361d8]" />
              Nombre y apellidos
            </li>
            <li className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Email validado
            </li>
            <li className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Building2 className="h-4 w-4 text-[#2361d8]" />
              Nombre de empresa
            </li>
            <li className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Phone className="h-4 w-4 text-[#2361d8]" />
              Telefono
            </li>
          </ul>

          <form className="mt-6 grid gap-4" onSubmit={handleContactSubmit}>
            <label className={fieldLabelClassName}>
              Nombre y apellidos *
              <input
                value={contactForm.name}
                onChange={(event) => setContactForm({ ...contactForm, name: event.target.value })}
                className={inputClassName}
                placeholder="Tu nombre completo"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={fieldLabelClassName}>
                Email *
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(event) =>
                    setContactForm({ ...contactForm, email: event.target.value })
                  }
                  className={inputClassName}
                  placeholder="nombre@empresa.com"
                />
              </label>
              <label className={fieldLabelClassName}>
                Telefono
                <input
                  type="tel"
                  value={contactForm.phone}
                  onChange={(event) =>
                    setContactForm({ ...contactForm, phone: event.target.value })
                  }
                  className={inputClassName}
                  placeholder="600 123 123"
                />
              </label>
            </div>
            <label className={fieldLabelClassName}>
              Nombre de empresa *
              <input
                value={contactForm.companyName}
                onChange={(event) =>
                  setContactForm({ ...contactForm, companyName: event.target.value })
                }
                className={inputClassName}
                placeholder="Nombre legal o comercial"
              />
            </label>
            {contactStatus === 'error' ? (
              <p className="text-sm text-rose-600">{contactError}</p>
            ) : null}
            {contactStatus === 'success' ? (
              <p className="text-sm font-medium text-emerald-600">
                Hemos recibido tus datos. Te escribimos en breve.
              </p>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={contactStatus === 'loading'}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1f55c0] disabled:opacity-60"
              >
                {contactStatus === 'loading' ? 'Guardando...' : 'Enviar datos'}
                <ArrowRight className="h-4 w-4" />
              </button>
              <p className="text-xs text-slate-500">
                Solo te pedimos lo necesario para darte contexto desde el primer contacto.
              </p>
            </div>
          </form>
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-[#fffaf4] p-6 shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <FileBadge2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                Prueba gratuita de Holded
              </p>
              <h2 className="mt-1 text-xl font-semibold text-[#011c67]">
                Preparar el alta con datos basicos
              </h2>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Si ya vienes con la intencion de empezar por Holded, dejamos tu ficha lista desde el
            primer paso.
          </p>
          <ul className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            <li className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-white/80 px-3 py-2">
              <UserRound className="h-4 w-4 text-amber-700" />
              Nombre y apellidos
            </li>
            <li className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-white/80 px-3 py-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Email validado
            </li>
            <li className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-white/80 px-3 py-2">
              <FileBadge2 className="h-4 w-4 text-amber-700" />
              CIF / NIF
            </li>
            <li className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-white/80 px-3 py-2">
              <Building2 className="h-4 w-4 text-amber-700" />
              Rol y sector
            </li>
          </ul>

          <form className="mt-6 grid gap-4" onSubmit={handleTrialSubmit}>
            <label className={fieldLabelClassName}>
              Nombre y apellidos *
              <input
                value={trialForm.name}
                onChange={(event) => setTrialForm({ ...trialForm, name: event.target.value })}
                className={amberInputClassName}
                placeholder="Tu nombre completo"
              />
            </label>
            <label className={fieldLabelClassName}>
              Email *
              <input
                type="email"
                value={trialForm.email}
                onChange={(event) => setTrialForm({ ...trialForm, email: event.target.value })}
                className={amberInputClassName}
                placeholder="nombre@empresa.com"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={fieldLabelClassName}>
                CIF / NIF
                <input
                  value={trialForm.taxId}
                  onChange={(event) => setTrialForm({ ...trialForm, taxId: event.target.value })}
                  className={amberInputClassName}
                  placeholder="B12345678"
                />
              </label>
              <label className={fieldLabelClassName}>
                Rol en la empresa
                <select
                  value={trialForm.roleInCompany}
                  onChange={(event) =>
                    setTrialForm({ ...trialForm, roleInCompany: event.target.value })
                  }
                  className={amberInputClassName}
                >
                  <option value="">Selecciona un rol</option>
                  {HOLDED_ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className={fieldLabelClassName}>
              Sector de actividad
              <select
                value={trialForm.businessSectorCode}
                onChange={(event) =>
                  setTrialForm({ ...trialForm, businessSectorCode: event.target.value })
                }
                className={amberInputClassName}
              >
                <option value="">Selecciona una categoria</option>
                {CNAE_SECTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {selectedSectorLabel ? (
              <p className="text-xs text-amber-800">Sector seleccionado: {selectedSectorLabel}</p>
            ) : null}
            {trialStatus === 'error' ? <p className="text-sm text-rose-600">{trialError}</p> : null}
            {trialStatus === 'success' ? (
              <p className="text-sm font-medium text-emerald-600">
                Solicitud recibida. Revisamos tu caso y te contactamos enseguida.
              </p>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={trialStatus === 'loading'}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-300 bg-white px-6 py-3 text-sm font-semibold text-amber-800 transition hover:bg-amber-50 disabled:opacity-60"
              >
                {trialStatus === 'loading' ? 'Registrando...' : 'Solicitar prueba'}
                <ArrowRight className="h-4 w-4" />
              </button>
              <p className="text-xs text-slate-500">
                Comprobamos correo y documento fiscal antes de guardar la solicitud.
              </p>
            </div>
          </form>
        </article>
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2361d8]/10 text-[#2361d8]">
            <LifeBuoy className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2361d8]">
              Soporte continuo
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[#011c67]">Abrir un ticket</h2>
          </div>
        </div>

        {user ? (
          <>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Si ya tienes cuenta, deja aqui el detalle del caso y adjunta capturas si te ayudan a
              explicarlo mejor.
            </p>
            <form onSubmit={handleTicketSubmit} className="mt-6 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={fieldLabelClassName}>
                  Nombre y apellidos *
                  <input
                    value={ticketForm.name}
                    onChange={(event) => setTicketForm({ ...ticketForm, name: event.target.value })}
                    className={inputClassName}
                    placeholder="Tu nombre"
                    required
                    readOnly={isNameLocked}
                  />
                </label>
                <label className={fieldLabelClassName}>
                  Email *
                  <input
                    type="email"
                    value={ticketForm.email}
                    onChange={(event) =>
                      setTicketForm({ ...ticketForm, email: event.target.value })
                    }
                    className={inputClassName}
                    placeholder="tu@email.com"
                    required
                    readOnly={isEmailLocked}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className={fieldLabelClassName}>
                  Empresa
                  <input
                    value={ticketForm.company}
                    onChange={(event) =>
                      setTicketForm({ ...ticketForm, company: event.target.value })
                    }
                    className={inputClassName}
                    placeholder="Empresa"
                  />
                </label>
                <label className={fieldLabelClassName}>
                  URL afectada
                  <input
                    value={ticketForm.url}
                    onChange={(event) => setTicketForm({ ...ticketForm, url: event.target.value })}
                    className={inputClassName}
                    placeholder="Pagina o zona afectada"
                  />
                </label>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <label className={fieldLabelClassName}>
                  Producto
                  <select
                    value={ticketForm.product}
                    onChange={(event) =>
                      setTicketForm({ ...ticketForm, product: event.target.value })
                    }
                    className={inputClassName}
                  >
                    <option>Verifactu Business</option>
                    <option>Isaak</option>
                    <option>Facturacion VeriFactu</option>
                  </select>
                </label>
                <label className={fieldLabelClassName}>
                  Categoria
                  <select
                    value={ticketForm.category}
                    onChange={(event) =>
                      setTicketForm({ ...ticketForm, category: event.target.value })
                    }
                    className={inputClassName}
                  >
                    <option>Facturacion</option>
                    <option>Documentos</option>
                    <option>Usuarios y accesos</option>
                    <option>Pagos</option>
                    <option>Integraciones</option>
                    <option>Otros</option>
                  </select>
                </label>
                <label className={fieldLabelClassName}>
                  Prioridad
                  <select
                    value={ticketForm.priority}
                    onChange={(event) =>
                      setTicketForm({ ...ticketForm, priority: event.target.value })
                    }
                    className={inputClassName}
                  >
                    <option>Baja</option>
                    <option>Media</option>
                    <option>Alta</option>
                    <option>Critica</option>
                  </select>
                </label>
              </div>

              <label className={fieldLabelClassName}>
                Asunto *
                <input
                  value={ticketForm.subject}
                  onChange={(event) =>
                    setTicketForm({ ...ticketForm, subject: event.target.value })
                  }
                  className={inputClassName}
                  placeholder="Resume el problema en una linea"
                  required
                />
              </label>

              <label className={fieldLabelClassName}>
                Descripcion *
                <textarea
                  value={ticketForm.description}
                  onChange={(event) =>
                    setTicketForm({ ...ticketForm, description: event.target.value })
                  }
                  className="min-h-[160px] rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-[#2361d8]"
                  placeholder="Describe el caso con el mayor detalle posible"
                  required
                />
              </label>

              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-xs text-slate-600">
                <label className="flex flex-col gap-3">
                  <span className="flex flex-wrap items-center justify-between gap-2 font-semibold text-slate-700">
                    <span>Adjuntar capturas o PDF</span>
                    <span className="text-[11px] text-slate-500">
                      {ticketForm.attachments.length}/{MAX_FILES} ·{' '}
                      {(totalAttachmentBytes / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={(event) => {
                      setAttachmentError('');
                      const files = Array.from(event.target.files || []);

                      if (files.length > MAX_FILES) {
                        setAttachmentError(`Maximo ${MAX_FILES} archivos.`);
                        return;
                      }

                      const invalidType = files.find((file) => !ALLOWED_TYPES.includes(file.type));
                      if (invalidType) {
                        setAttachmentError(
                          'Tipo de archivo no permitido. Usa JPG, PNG, WEBP o PDF.'
                        );
                        return;
                      }

                      const tooLarge = files.find((file) => file.size > MAX_FILE_BYTES);
                      if (tooLarge) {
                        setAttachmentError('Cada archivo debe pesar 5MB o menos.');
                        return;
                      }

                      const total = files.reduce((sum, file) => sum + file.size, 0);
                      if (total > MAX_TOTAL_BYTES) {
                        setAttachmentError('El tamano total supera 10MB.');
                        return;
                      }

                      setTicketForm({ ...ticketForm, attachments: files });
                    }}
                    className="text-xs"
                  />
                  {attachmentError ? (
                    <span className="text-[11px] text-rose-600">{attachmentError}</span>
                  ) : null}
                  {ticketForm.attachments.length > 0 ? (
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        {ticketForm.attachments.length} adjuntos ·{' '}
                        {(totalAttachmentBytes / 1024 / 1024).toFixed(2)} MB
                      </span>
                      <button
                        type="button"
                        onClick={() => setTicketForm({ ...ticketForm, attachments: [] })}
                        className="rounded-full px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        Limpiar adjuntos
                      </button>
                    </div>
                  ) : null}
                  {ticketForm.attachments.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {ticketForm.attachments.map((file) => {
                        const isImage = file.type.startsWith('image/');
                        const previewUrl = isImage ? URL.createObjectURL(file) : '';

                        return (
                          <div
                            key={`${file.name}-${file.size}`}
                            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3"
                          >
                            {isImage ? (
                              <Image
                                src={previewUrl}
                                alt={file.name}
                                width={40}
                                height={40}
                                unoptimized
                                className="h-10 w-10 rounded-md object-cover"
                                onLoad={() => URL.revokeObjectURL(previewUrl)}
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-[10px] font-semibold text-slate-600">
                                PDF
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="truncate text-[11px] font-semibold text-slate-700">
                                {file.name}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setTicketForm({
                                  ...ticketForm,
                                  attachments: ticketForm.attachments.filter(
                                    (item) => item !== file
                                  ),
                                });
                              }}
                              className="ml-auto rounded-full px-2 py-1 text-[10px] font-semibold text-rose-600 hover:bg-rose-50"
                              aria-label={`Eliminar ${file.name}`}
                            >
                              Quitar
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </label>
              </div>

              {ticketStatus === 'error' ? (
                <p className="text-sm text-rose-600">{ticketError}</p>
              ) : null}
              {ticketStatus === 'success' ? (
                <p className="text-sm font-medium text-emerald-600">
                  Ticket enviado correctamente.
                </p>
              ) : null}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  disabled={ticketStatus === 'loading'}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] transition hover:bg-[#2361d8]/10 disabled:opacity-60"
                >
                  {ticketStatus === 'loading' ? 'Creando ticket...' : 'Crear ticket'}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <p className="text-xs text-slate-500">
                  El ticket llega a soporte y queda trazado para seguimiento.
                </p>
              </div>
            </form>
          </>
        ) : (
          <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <ShieldCheck className="h-4 w-4" />
              Acceso necesario
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Inicia sesion para abrir un ticket. Asi podremos usar tus datos y tu cuenta para
              responder con mas contexto.
            </p>
            <div className="mt-4">
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#2361d8] px-5 py-3 text-sm font-semibold text-[#2361d8] transition hover:bg-[#2361d8]/10"
              >
                Acceder para soporte
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
