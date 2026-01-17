"use client";

import { useState } from "react";
import Link from "next/link";
import { estimateBreakdown, estimateNetEur, type PricingInput } from "../lib/pricing/calc";

export default function PricingCalculatorInline() {
  const [invoices, setInvoices] = useState(1);
  const [movements, setMovements] = useState(0);
  const [bankingEnabled, setBankingEnabled] = useState(false);
  const [error, setError] = useState("");

  const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });
  const invoiceLabel = (value: number) => {
    if (value <= 10) return "Incluido (hasta 10)";
    if (value <= 20) return "Hasta 20";
    if (value <= 30) return "Hasta 30";
    if (value <= 40) return "Hasta 40";
    if (value <= 50) return "Hasta 50";
    if (value <= 100) return "Hasta 100";
    if (value <= 200) return "Hasta 200";
    if (value <= 300) return "Hasta 300";
    if (value <= 400) return "Hasta 400";
    if (value <= 500) return "Hasta 500";
    return "Hasta 1.000";
  };
  const movementLabel = (value: number) => {
    if (!bankingEnabled || value <= 0) return "No aplica";
    if (value <= 20) return "Hasta 20";
    if (value <= 30) return "Hasta 30";
    if (value <= 40) return "Hasta 40";
    if (value <= 50) return "Hasta 50";
    if (value <= 100) return "Hasta 100";
    if (value <= 200) return "Hasta 200";
    if (value <= 300) return "Hasta 300";
    if (value <= 400) return "Hasta 400";
    if (value <= 500) return "Hasta 500";
    if (value <= 1000) return "Hasta 1.000";
    return "Hasta 2.000";
  };

  const input: PricingInput = { invoices, movements, bankingEnabled };
  const monthlyPrice = estimateNetEur(input);
  const breakdown = estimateBreakdown(input);
  const withVAT = Math.round(monthlyPrice * 1.21 * 100) / 100;

  const handleStartTrial = async () => {
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data = await response.json();
      if (!response.ok && data?.code === "QUOTE_REQUIRED" && data?.redirect) {
        window.location.href = data.redirect;
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data?.error || "No se pudo iniciar el pago");
    } catch (err) {
      console.error(err);
      setError("No se pudo iniciar el pago");
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-8">
        <div className="text-center">
          <h3 className="text-2xl font-semibold text-[#002060]">Calcula tu precio</h3>
          <p className="mt-2 text-sm text-lightbg-600">
            Base 19 EUR/mes + IVA. Incluye hasta 10 facturas/mes.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Pagas base + tramo de facturas + (opcional) tramo de movimientos.
          </p>
          <ul className="mt-3 space-y-1 text-xs text-slate-500">
            <li>Base 19 EUR incluye 1-10 facturas/mes.</li>
            <li>Conciliacion: si esta OFF, 0 EUR; si esta ON, pagas por tramo.</li>
            <li>Si superas limites, te damos presupuesto.</li>
          </ul>
        </div>

        <div>
          <label className="mb-3 flex items-center justify-between text-sm font-medium text-gray-700">
            <span>Facturas emitidas / mes</span>
            <span className="text-2xl font-bold text-[#0060F0]">{invoices}</span>
          </label>
          <input
            type="range"
            min="1"
            max="1000"
            step="1"
            value={invoices}
            onChange={(e) => setInvoices(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
            style={{
              background: `linear-gradient(to right, #0060F0 0%, #0060F0 ${((invoices - 1) / 999) * 100}%, #e5e7eb ${((invoices - 1) / 999) * 100}%, #e5e7eb 100%)`,
            }}
          />
          <p className="mt-2 text-xs text-gray-500">Incluye hasta 10 en la base.</p>
          <p className="mt-1 text-xs text-gray-500">Mas de 1.000 facturas/mes requiere presupuesto.</p>
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>1</span>
            <span>1.000</span>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={bankingEnabled}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  setBankingEnabled(enabled);
                  if (!enabled) setMovements(0);
                }}
                className="h-4 w-4 rounded border-gray-300 text-[#0060F0] focus:ring-[#0060F0]"
              />
              <span>Conciliacion bancaria</span>
            </label>
            {bankingEnabled && (
              <span className="text-2xl font-bold text-[#0060F0]">{movements}</span>
            )}
          </div>
          {bankingEnabled && (
            <>
              <input
                type="range"
                min="0"
                max="2000"
                step="1"
                value={movements}
                onChange={(e) => setMovements(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
                style={{
                  background: `linear-gradient(to right, #0060F0 0%, #0060F0 ${(movements / 2000) * 100}%, #e5e7eb ${(movements / 2000) * 100}%, #e5e7eb 100%)`,
                }}
              />
              <p className="mt-2 text-xs text-gray-500">
                0 movimientos = 0 EUR. Si activas conciliacion y procesas movimientos, se aplica un tramo.
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Mas de 2.000 movimientos/mes requiere presupuesto.
              </p>
              <div className="mt-1 flex justify-between text-xs text-gray-500">
                <span>0</span>
                <span>2.000</span>
              </div>
            </>
          )}
        </div>

        <div className="rounded-2xl bg-sky-50/70 p-5">
          <p className="text-sm text-gray-600">Cuota mensual estimada</p>
          <p className="mt-1 text-3xl font-bold text-[#0060F0]">
            {fmt(monthlyPrice)} EUR{" "}
            <span className="text-base text-gray-500">/mes + IVA</span>
          </p>
          <p className="mt-1 text-sm text-gray-500">Con IVA: {fmt(withVAT)} EUR</p>

          <div className="mt-4 space-y-1 text-xs text-gray-500">
            <div className="flex items-center justify-between">
              <span>Base</span>
              <span>{fmt(breakdown.base)} EUR</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Tramo facturas ({invoiceLabel(invoices)})</span>
              <span>{fmt(breakdown.invoiceAddon)} EUR</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Tramo movimientos ({movementLabel(movements)})</span>
              <span>{fmt(breakdown.movementAddon)} EUR</span>
            </div>
          </div>

          {error && (
            <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {error}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={handleStartTrial}
              className="rounded-lg bg-gradient-to-r from-[#0060F0] to-[#20B0F0] px-6 py-3 font-semibold text-white shadow-lg transition hover:from-[#0056D6] hover:to-[#1AA3DB]"
            >
              Empezar 1 mes gratis
            </button>
            <Link
              href="/politica-de-precios"
              className="inline-flex items-center justify-center rounded-lg border border-[#0060F0] px-6 py-3 text-sm font-semibold text-[#0060F0] underline underline-offset-4 hover:bg-[#0060F0]/10 hover:text-[#0080F0]"
            >
              Ver politica de medicion de uso
            </Link>
            <Link
              href="/presupuesto"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Pedir presupuesto
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-sm font-semibold text-[#002060]">Mini tabla de tramos</div>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <div className="text-[11px] font-semibold uppercase text-slate-500">Facturas</div>
              <ul className="mt-2 space-y-1">
                <li>1-10 incluido</li>
                <li>11-20 +5 EUR</li>
                <li>51-100 +25 EUR</li>
                <li>101-200 +35 EUR</li>
                <li>401-500 +65 EUR</li>
                <li>&gt;500 pedir presupuesto</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <div className="text-[11px] font-semibold uppercase text-slate-500">Movimientos</div>
              <ul className="mt-2 space-y-1">
                <li>0 incluido</li>
                <li>1-20 +5 EUR</li>
                <li>51-100 +25 EUR</li>
                <li>101-200 +35 EUR</li>
                <li>401-500 +65 EUR</li>
                <li>&gt;1000 pedir presupuesto</li>
              </ul>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            <Link href="/politica-de-precios" className="font-semibold text-[#0060F0] hover:text-[#0080F0]">
              Ver todos los tramos
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
