"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";

type FormStatus = "idle" | "loading" | "success" | "error";

type ContactFormState = {
  name: string;
  email: string;
  company: string;
  message: string;
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
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const emptyContact: ContactFormState = {
  name: "",
  email: "",
  company: "",
  message: "",
};

const emptyTicket: TicketFormState = {
  name: "",
  email: "",
  company: "",
  product: "Verifactu Business",
  category: "Facturacion",
  priority: "Media",
  subject: "",
  description: "",
  url: "",
  attachments: [],
};

async function sendLead(payload: ContactFormState) {
  const res = await fetch("/api/send-lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "No se pudo enviar el formulario");
  }
  return data;
}

export default function ContactForms() {
  const { user } = useAuth();
  const [contactForm, setContactForm] = useState<ContactFormState>(emptyContact);
  const [ticketForm, setTicketForm] = useState<TicketFormState>(emptyTicket);
  const [contactStatus, setContactStatus] = useState<FormStatus>("idle");
  const [ticketStatus, setTicketStatus] = useState<FormStatus>("idle");
  const [contactError, setContactError] = useState("");
  const [ticketError, setTicketError] = useState("");
  const [attachmentError, setAttachmentError] = useState("");
  const isNameLocked = Boolean(user?.displayName);
  const isEmailLocked = Boolean(user?.email);

  useEffect(() => {
    if (!user) return;
    setTicketForm((prev) => ({
      ...prev,
      name: user.displayName || prev.name,
      email: user.email || prev.email,
    }));
  }, [user]);

  const totalAttachmentBytes = ticketForm.attachments.reduce(
    (sum, file) => sum + file.size,
    0
  );

  const handleContactSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setContactStatus("loading");
    setContactError("");
    try {
      await sendLead(contactForm);
      setContactStatus("success");
      setContactForm(emptyContact);
    } catch (error) {
      setContactStatus("error");
      setContactError(error instanceof Error ? error.message : "Error al enviar");
    }
  };

  const handleTicketSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTicketStatus("loading");
    setTicketError("");

    try {
      const formData = new FormData();
      formData.append("name", ticketForm.name);
      formData.append("email", ticketForm.email);
      formData.append("company", ticketForm.company);
      formData.append("product", ticketForm.product);
      formData.append("category", ticketForm.category);
      formData.append("priority", ticketForm.priority);
      formData.append("subject", ticketForm.subject);
      formData.append("description", ticketForm.description);
      formData.append("url", ticketForm.url);

      ticketForm.attachments.forEach((file) => {
        formData.append("attachments", file, file.name);
      });

      const res = await fetch("/api/support-ticket", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo enviar el ticket");
      }
      setTicketStatus("success");
      setTicketForm(emptyTicket);
    } catch (error) {
      setTicketStatus("error");
      setTicketError(error instanceof Error ? error.message : "Error al enviar");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        onSubmit={handleContactSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="text-sm font-semibold text-[#2361d8]">Contacto rapido</div>
        <p className="mt-2 text-sm text-slate-600">
          Para consultas comerciales, demos o dudas generales.
        </p>
        <div className="mt-5 grid gap-3">
          <input
            value={contactForm.name}
            onChange={(event) => setContactForm({ ...contactForm, name: event.target.value })}
            placeholder="Nombre y apellidos"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            required
          />
          <input
            value={contactForm.email}
            onChange={(event) => setContactForm({ ...contactForm, email: event.target.value })}
            placeholder="Email de trabajo"
            type="email"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            required
          />
          <input
            value={contactForm.company}
            onChange={(event) => setContactForm({ ...contactForm, company: event.target.value })}
            placeholder="Empresa (opcional)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <textarea
            value={contactForm.message}
            onChange={(event) => setContactForm({ ...contactForm, message: event.target.value })}
            placeholder="Cuentanos que necesitas"
            className="min-h-[120px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={contactStatus === "loading"}
            className="inline-flex items-center justify-center rounded-lg bg-[#2361d8] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1f55c0] disabled:opacity-60"
          >
            {contactStatus === "loading" ? "Enviando..." : "Enviar contacto"}
          </button>
          {contactStatus === "success" && (
            <span className="text-xs font-semibold text-emerald-600">Mensaje enviado</span>
          )}
          {contactStatus === "error" && (
            <span className="text-xs text-rose-600">{contactError}</span>
          )}
        </div>
      </form>

      {user ? (
        <form
          onSubmit={handleTicketSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="text-sm font-semibold text-[#2361d8]">Ticket de soporte</div>
          <p className="mt-2 text-sm text-slate-600">
            Para incidencias tecnicas o problemas con facturas y envios.
          </p>
          <div className="mt-5 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={ticketForm.name}
                onChange={(event) => setTicketForm({ ...ticketForm, name: event.target.value })}
                placeholder="Nombre y apellidos"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                required
                readOnly={isNameLocked}
              />
              <input
                value={ticketForm.email}
                onChange={(event) => setTicketForm({ ...ticketForm, email: event.target.value })}
                placeholder="Email"
                type="email"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                required
                readOnly={isEmailLocked}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={ticketForm.company}
                onChange={(event) => setTicketForm({ ...ticketForm, company: event.target.value })}
                placeholder="Empresa"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                value={ticketForm.url}
                onChange={(event) => setTicketForm({ ...ticketForm, url: event.target.value })}
                placeholder="URL afectada (opcional)"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <select
                value={ticketForm.product}
                onChange={(event) => setTicketForm({ ...ticketForm, product: event.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option>Verifactu Business</option>
                <option>Isaak</option>
                <option>Facturacion VeriFactu</option>
              </select>
              <select
                value={ticketForm.category}
                onChange={(event) => setTicketForm({ ...ticketForm, category: event.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option>Facturacion</option>
                <option>Documentos</option>
                <option>Usuarios y accesos</option>
                <option>Pagos</option>
                <option>Integraciones</option>
                <option>Otros</option>
              </select>
              <select
                value={ticketForm.priority}
                onChange={(event) => setTicketForm({ ...ticketForm, priority: event.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option>Baja</option>
                <option>Media</option>
                <option>Alta</option>
                <option>Critica</option>
              </select>
            </div>
            <input
              value={ticketForm.subject}
              onChange={(event) => setTicketForm({ ...ticketForm, subject: event.target.value })}
              placeholder="Asunto"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            />
            <textarea
              value={ticketForm.description}
              onChange={(event) => setTicketForm({ ...ticketForm, description: event.target.value })}
              placeholder="Describe el problema con el mayor detalle posible"
              className="min-h-[140px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            />
            <div className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-xs text-slate-600">
              <label className="flex flex-col gap-2">
                <span className="flex flex-wrap items-center justify-between gap-2 font-semibold text-slate-700">
                  <span>Adjuntar capturas o PDF (max 3 archivos, 5MB c/u)</span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {ticketForm.attachments.length}/{MAX_FILES} -{" "}
                    {(totalAttachmentBytes / 1024 / 1024).toFixed(2)} MB
                  </span>
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  onChange={(event) => {
                    setAttachmentError("");
                    const files = Array.from(event.target.files || []);
                    if (files.length > MAX_FILES) {
                      setAttachmentError(`Maximo ${MAX_FILES} archivos.`);
                      return;
                    }
                    const invalidType = files.find((file) => !ALLOWED_TYPES.includes(file.type));
                    if (invalidType) {
                      setAttachmentError("Tipo de archivo no permitido. Usa JPG, PNG, WEBP o PDF.");
                      return;
                    }
                    const tooLarge = files.find((file) => file.size > MAX_FILE_BYTES);
                    if (tooLarge) {
                      setAttachmentError("Cada archivo debe pesar 5MB o menos.");
                      return;
                    }
                    const total = files.reduce((sum, file) => sum + file.size, 0);
                    if (total > MAX_TOTAL_BYTES) {
                      setAttachmentError("El tamano total supera 10MB.");
                      return;
                    }
                    setTicketForm({ ...ticketForm, attachments: files });
                  }}
                  className="text-xs"
                />
                {attachmentError && (
                  <span className="text-[11px] text-rose-600">{attachmentError}</span>
                )}
                {ticketForm.attachments.length > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      {ticketForm.attachments.length} adjuntos ·{" "}
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
                )}
                {ticketForm.attachments.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ticketForm.attachments.map((file) => {
                      const isImage = file.type.startsWith("image/");
                      const previewUrl = isImage ? URL.createObjectURL(file) : "";
                      return (
                        <div
                          key={`${file.name}-${file.size}`}
                          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2"
                        >
                          {isImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={previewUrl}
                              alt={file.name}
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
                )}
              </label>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={ticketStatus === "loading"}
              className="inline-flex items-center justify-center rounded-lg border border-[#2361d8] px-5 py-2 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10 disabled:opacity-60"
            >
              {ticketStatus === "loading" ? "Enviando..." : "Crear ticket"}
            </button>
            {ticketStatus === "success" && (
              <span className="text-xs font-semibold text-emerald-600">Ticket enviado</span>
            )}
            {ticketStatus === "error" && (
              <span className="text-xs text-rose-600">{ticketError}</span>
            )}
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-[#2361d8]">Ticket de soporte</div>
          <p className="mt-2 text-sm text-slate-600">
            Inicia sesion para abrir un ticket. Usaremos tus datos para responder mas rapido.
          </p>
          <div className="mt-4">
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center rounded-lg border border-[#2361d8] px-5 py-2 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
            >
              Acceder para soporte
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}


