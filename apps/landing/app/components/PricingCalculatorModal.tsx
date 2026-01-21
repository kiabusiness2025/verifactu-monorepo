"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { estimateBreakdown, estimateNetEur, type PricingInput } from "../lib/pricing/calc";

interface PricingCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PricingCalculatorModal({
  isOpen,
  onClose,
}: PricingCalculatorModalProps) {
  const [invoices, setInvoices] = useState(1);
  const [movements, setMovements] = useState(0);
  const [bankingEnabled, setBankingEnabled] = useState(false);

  if (!isOpen) return null;

  const fmt = (n: number) =>
    n.toLocaleString("es-ES", { maximumFractionDigits: 2 });
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
      } else {
        console.error("Error al crear sesión de pago");
      }
    } catch (error) {
      console.error("Error al iniciar trial:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          aria-label="Cerrar"
        >
          <X className="h-6 w-6" />
        </button>

        <h2 className="mb-2 text-3xl font-bold text-[#002060]">
          Calcula tu precio
        </h2>
        <p className="mb-8 text-lightbg-600">
          Ajusta los valores según tu actividad. El precio se calcula por uso real.
        </p>

        <div className="space-y-8">
          {/* Facturas */}
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
            <p className="mt-2 text-xs text-gray-500">
              Incluye hasta 10 facturas/mes en la cuota base.
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Más de 1.000 facturas/mes requiere presupuesto.
            </p>
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>1</span>
              <span>1.000</span>
            </div>
          </div>

          {/* Movimientos */}
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
                <span>Conciliación bancaria</span>
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
                  0 movimientos = 0 €. Si activas conciliación y procesas movimientos, se aplica un tramo.
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Más de 2.000 movimientos/mes requiere presupuesto.
                </p>
                <div className="mt-1 flex justify-between text-xs text-gray-500">
                  <span>0</span>
                  <span>2.000</span>
                </div>
              </>
            )}
            <p className="mt-2 text-xs text-gray-500">
              {bankingEnabled
                ? "Movimientos bancarios procesados al mes"
                : "Desactiva si no necesitas importar movimientos bancarios"}
            </p>
          </div>
        </div>

        {/* Resumen */}
        <div className="mt-8 rounded-lg bg-sky-50/70 p-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-gray-600">Cuota mensual estimada</p>
              <p className="mt-1 text-4xl font-bold text-[#0060F0]">
                {fmt(monthlyPrice)} € <span className="text-2xl text-gray-500">/mes + IVA</span>
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Con IVA: {fmt(withVAT)} €
              </p>
              <div className="mt-4 space-y-1 text-xs text-gray-500">
                <div className="flex items-center justify-between">
                  <span>Base</span>
                  <span>{fmt(breakdown.base)} €</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tramo facturas ({invoiceLabel(invoices)})</span>
                  <span>{fmt(breakdown.invoiceAddon)} €</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tramo movimientos ({movementLabel(movements)})</span>
                  <span>{fmt(breakdown.movementAddon)} €</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleStartTrial}
              className="rounded-lg bg-gradient-to-r from-[#0060F0] to-[#20B0F0] px-6 py-3 font-semibold text-white shadow-lg transition hover:from-[#0056D6] hover:to-[#1AA3DB]"
            >
              Empezar 1 mes gratis
            </button>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            Durante la prueba gratuita mediremos tu uso real. Te avisaremos del importe final antes de cobrar.
          </p>
        </div>
      </div>
    </div>
  );
}


