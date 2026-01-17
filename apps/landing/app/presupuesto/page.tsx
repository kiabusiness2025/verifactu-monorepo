"use client";

import { useState } from "react";

const INTEGRATIONS = [
  "ERP propio",
  "Sage",
  "A3",
  "SAP",
  "API custom",
  "Multiusuario/roles avanzados",
  "SLA",
];

export default function PresupuestoPage() {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [invoices, setInvoices] = useState("");
  const [movements, setMovements] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const toggleIntegration = (label: string) => {
    setSelected((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = "Solicitud de presupuesto Verifactu Business";
    const body = [
      `Email: ${email}`,
      `Empresa: ${company}`,
      `Facturas/mes: ${invoices}`,
      `Movimientos/mes: ${movements}`,
      `Integraciones: ${selected.join(", ") || "N/A"}`,
      `Mensaje: ${message}`,
    ].join("\n");
    const mailto = `mailto:soporte@verifactu.business?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold text-primary">Solicitar presupuesto</h1>
      <p className="mt-4 text-sm text-lightbg-600">
        Si superas 1.000 facturas/mes o 2.000 movimientos/mes, preparamos un plan a medida.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
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
              min={1001}
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
              min={2001}
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
            placeholder="Cuentalo en pocas lineas..."
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-primary px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-primary-light"
        >
          Enviar solicitud
        </button>
      </form>
    </main>
  );
}

