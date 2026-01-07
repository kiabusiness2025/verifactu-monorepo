"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { estimateNetEur, type PricingInput } from "../lib/pricing/calc";

interface PricingCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PricingCalculatorModal({
  isOpen,
  onClose,
}: PricingCalculatorModalProps) {
  const [companies, setCompanies] = useState(1);
  const [invoices, setInvoices] = useState(50);
  const [movements, setMovements] = useState(0);
  const [bankingEnabled, setBankingEnabled] = useState(false);

  if (!isOpen) return null;

  const input: PricingInput = { companies, invoices, movements, bankingEnabled };
  const monthlyPrice = estimateNetEur(input);
  const withVAT = Math.round(monthlyPrice * 1.21 * 100) / 100;

  const handleStartTrial = () => {
    const params = new URLSearchParams({
      type: "calculator",
      companies: companies.toString(),
      invoices: invoices.toString(),
      movements: movements.toString(),
      bankingEnabled: bankingEnabled.toString(),
    });
    window.location.href = `/api/checkout?${params}`;
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

        <h2 className="mb-2 text-3xl font-bold text-gray-900">
          Calcula tu precio
        </h2>
        <p className="mb-8 text-gray-600">
          Ajusta los valores según tu actividad. El precio se calcula por uso real.
        </p>

        <div className="space-y-8">
          {/* Empresas */}
          <div>
            <label className="mb-3 flex items-center justify-between text-sm font-medium text-gray-700">
              <span>Empresas activas</span>
              <span className="text-2xl font-bold text-blue-600">{companies}</span>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={companies}
              onChange={(e) => setCompanies(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((companies - 1) / 9) * 100}%, #e5e7eb ${((companies - 1) / 9) * 100}%, #e5e7eb 100%)`,
              }}
            />
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>1</span>
              <span>10</span>
            </div>
          </div>

          {/* Facturas */}
          <div>
            <label className="mb-3 flex items-center justify-between text-sm font-medium text-gray-700">
              <span>Facturas emitidas / mes</span>
              <span className="text-2xl font-bold text-blue-600">{invoices}</span>
            </label>
            <input
              type="range"
              min="1"
              max="2000"
              step="10"
              value={invoices}
              onChange={(e) => setInvoices(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((invoices - 1) / 1999) * 100}%, #e5e7eb ${((invoices - 1) / 1999) * 100}%, #e5e7eb 100%)`,
              }}
            />
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>1</span>
              <span>2.000</span>
            </div>
          </div>

          {/* Movimientos */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={bankingEnabled}
                  onChange={(e) => setBankingEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Conciliación bancaria</span>
              </label>
              {bankingEnabled && (
                <span className="text-2xl font-bold text-blue-600">{movements}</span>
              )}
            </div>
            {bankingEnabled && (
              <>
                <input
                  type="range"
                  min="0"
                  max="5000"
                  step="50"
                  value={movements}
                  onChange={(e) => setMovements(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(movements / 5000) * 100}%, #e5e7eb ${(movements / 5000) * 100}%, #e5e7eb 100%)`,
                  }}
                />
                <div className="mt-1 flex justify-between text-xs text-gray-500">
                  <span>0</span>
                  <span>5.000</span>
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
        <div className="mt-8 rounded-lg bg-blue-50 p-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-gray-600">Cuota mensual estimada</p>
              <p className="mt-1 text-4xl font-bold text-blue-600">
                {monthlyPrice}€<span className="text-2xl text-gray-500">/mes</span>
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {withVAT}€/mes con IVA incluido
              </p>
            </div>
            <button
              onClick={handleStartTrial}
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-blue-700"
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
