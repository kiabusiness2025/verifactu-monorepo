"use client";

import React, { useMemo, useState } from "react";

type FormState = {
  name: string;
  email: string;
  company: string;
};

function isValidEmail(email: string) {
  return /.+@.+\..+/.test(email);
}

export function DemoLeadForm() {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    company: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit = useMemo(() => {
    return form.name.trim().length > 0 && isValidEmail(form.email.trim());
  }, [form.email, form.name]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!canSubmit || status === "sending") return;

    setStatus("sending");
    setErrorMessage("");

    try {
      const res = await fetch("/api/send-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          company: form.company.trim() || undefined,
          message: "Interes: demo",
        }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string };

      if (!res.ok) {
        throw new Error(data?.error || "No se pudo enviar");
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "No se pudo enviar");
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        Acceso a la demo
      </p>
      <h2 className="mt-1 text-lg font-semibold text-[#011c67]">
        Te aviso cuando este listo para tu caso?
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Dejame tu email y lo preparo con calma. Sin presion.
      </p>

      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Nombre</span>
          <input
            value={form.name}
            onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2361d8]/20"
            placeholder="Tu nombre"
            autoComplete="name"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            value={form.email}
            onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2361d8]/20"
            placeholder="tu@email.com"
            autoComplete="email"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Empresa (opcional)
          </span>
          <input
            value={form.company}
            onChange={(e) => setForm((v) => ({ ...v, company: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2361d8]/20"
            placeholder="Empresa Demo SL"
            autoComplete="organization"
          />
        </label>

        <button
          type="submit"
          disabled={!canSubmit || status === "sending" || status === "success"}
          className="w-full rounded-full bg-[#2361d8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1f55c0] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "sending"
            ? "Enviando..."
            : status === "success"
              ? "Recibido"
              : "Quiero acceso"}
        </button>

        {status === "error" ? (
          <p className="text-sm text-rose-600">{errorMessage}</p>
        ) : null}

        {status === "success" ? (
          <p className="text-sm text-emerald-700">
            Perfecto. Te escribo en cuanto lo tenga.
          </p>
        ) : null}

        <p className="text-xs leading-5 text-slate-500">
          Usaremos tu email solo para hablar de esta demo.
        </p>
      </form>
    </section>
  );
}



